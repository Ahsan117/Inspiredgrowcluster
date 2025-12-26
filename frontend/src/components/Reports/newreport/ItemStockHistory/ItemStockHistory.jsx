import React, { useState, useEffect } from "react";
import Sidebar from "../../../Sidebar";
import Navbar from "../../../Navbar";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaBars } from "react-icons/fa";
import Select from "react-select";
import axios, { all } from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Modal } from "antd";

export default function StockReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);

  // --- Dropdown options ---
  const [options, setOptions] = useState({
    warehouses: [],
    suppliers:[],
  });

  // --- Selected filters ---
  const [selectedWarehouse, setSelectedWarehouse] = useState([]);
  const [selectedSupplier,setSelectedSupplier]=useState([])
  const [search,setSearch]=useState("")

  const [showHistoryModal, setShowHistoryModal] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [warehouseId, setWarehouseId] = useState("");
const [historyData, setHistoryData] = useState([]);
const [opening, setOpening] = useState(0);
const [loadingHistory, setLoadingHistory] = useState(false);
const[total,setTotal]=useState(0)

  // --- Data ---
  const [allItems, setAllItems] = useState([]);

  // --- Fetch dropdown data ---
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const [wareRes, supplierRes] = await Promise.all([
        axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/api/suppliers`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
        console.log(wareRes)
        console.log(supplierRes);
      setOptions({
        warehouses: [ ...wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id }))],
        suppliers:[  ...supplierRes.data.data.map(w => ({ label: w.supplierName, value: w._id }))]
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      console.log({
        warehouse:
          selectedWarehouse && selectedWarehouse.length > 0
            ? selectedWarehouse.map(i => i.value)
            : options.warehouses.map(i => i.value),
      
        supplier:
          selectedSupplier && selectedSupplier.length > 0
            ? selectedSupplier.map(i => i.label)
            : options.suppliers.map(i => i.label),
      
        search: search
      })
      const response = await axios.get(`${link}/api/reports/stock-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params:{
          warehouse:
          selectedWarehouse && selectedWarehouse.length > 0
            ? selectedWarehouse.map(i => i.value)
            : options.warehouses.map(i => i.value),
      
        supplier:
          selectedSupplier && selectedSupplier.length > 0
            ? selectedSupplier.map(i => i.label)
            : options.suppliers.map(i => i.label),
      
        search: search
        }
      });
      console.log(response)
      setAllItems(response.data.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  

  // --- Export Excel ---
  const exportToExcel = () => {
    
    const data = allItems.map((item, index) => ({
      "#": index + 1,
      "Item Code": item.itemCode,
      "Item Name": item.itemName,
      "Brand": item.brand?.brandName,
      "Category": item.category?.name,
      "MRP": item.mrp,
      "Purchase Price": item.purchasePrice,
      "Sales Price": item.salesPrice,
      "Stock": item.currentStock,
      "Stock Value":(item.currentStock * item.purchasePrice).toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Report");
    XLSX.writeFile(workbook, "Stock_Report.xlsx");
  };

  // --- Export PDF ---
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Stock Report", 14, 15);

    autoTable(doc, {
      head: [["#", "Item Code", "Name", "Brand", "Category", "MRP", "Sales Price", "Purchase Price", "Stock","StockValue"]],
      body: filteredItems.map((item, i) => [
        i + 1,
        item.itemCode,
        item.itemName,
        item.brand?.brandName,
        item.category?.name,
        item.mrp,
        item.salesPrice,
        item.purchasePrice,
        item.currentStock,
        (item.currentStock* item.purchasePrice)?.toFixed(2)
      ]),
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 102, 204] },
    });

    doc.save("Stock_Report.pdf");
  };


  const fetchStockHistory = async () => {
    if (!selectedItem) return;
  
    try {
      setLoadingHistory(true);
          console.log(selectedItem._id)
          console.log(warehouseId)
          console.log(selectedItem._id)
          const res = await axios.get(
            `https://pos.inspiredgrow.in/vps/api/reports/item-stock-history-report`,
            {
              params: {
                itemId: selectedItem._id,
                warehouseId: warehouseId
              }
            }
          );
          
       console.log(res)
      setOpening(res.data.opening || 0);
      setHistoryData(res.data.history || []);
      setTotal(res.data.total || 0)
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex w-full">
        <div className="w-auto">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>

        {/* Main Content */}
        <div className="flex flex-col w-full max-h-screen min-h-screen p-6 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col items-start justify-between mb-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Item Stock (Date-Wise) Report</h1>
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <NavLink to="/dashboard" className="flex items-center hover:text-cyan-600">
                <FaTachometerAlt className="mr-2" /> Home
              </NavLink>
              <span>&gt;</span>
              <span className="text-cyan-600">Item Stock (Date-Wise) Report</span>
            </nav>
          </header>

          {/* Filters Section */}
          <div className="p-5 mb-6 bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">
              Filter Options
            </h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Warehouse</label>
                <Select  isMulti
                  options={options.warehouses}
                 value={selectedWarehouse}
                 onChange={setSelectedWarehouse}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Supplier</label>
                <Select isMulti
                  options={options.suppliers}
                  value={selectedSupplier}
                  onChange={setSelectedSupplier}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Item Name/Item Code</label>
                <input type="text" name="" id="" className="w-full px-4 py-2 border border-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" onChange={(e)=>setSearch(e.target.value)} value={search}/>
              </div>

             
            </div>

            <div className="flex justify-end mt-6">
              <button
                 onClick={fetchItems}
                className="px-6 py-2 text-white rounded-lg bg-cyan-600 hover:bg-cyan-700"
              >
                Search
              </button>
            </div>
          </div>

          {/* Results Section */}
          <div className="p-5 bg-white border-t-4 border-gray-400 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-700">Records Table</h4>

              <div className="relative">
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="flex items-center px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  <FaBars className="mr-2" /> Export ▼
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 z-10 w-40 mt-2 bg-white rounded-md shadow-lg">
                    <button
                      onClick={() => {
                        exportToExcel();
                        setShowExportDropdown(false);
                      }}
                      className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                    >
                      Export as Excel
                    </button>
                    <button
                      onClick={() => {
                        exportToPDF();
                        setShowExportDropdown(false);
                      }}
                      className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                    >
                      Export as PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-gray-200 table-auto">
                <thead className="text-white bg-cyan-600">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Item Code</th>
                    <th className="p-2">Item Name</th>
                    <th className="p-2">Brand</th>
                    <th className="p-2">Category</th>
                    <th className="p-2">MRP</th>
                    <th className="p-2">Purchase Price</th>
                    <th className="p-2">Sales Price</th>
                    <th className="p-2">Stock</th>
                    <th className="p-2">Stock Value</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.length > 0 && (
                    allItems.map((item, i) => (
                      <tr key={i}
                      onClick={() => {
                        setSelectedItem(item);
                        setShowHistoryModal(true);
                        setHistoryData([]);
                      }}
                      className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center">{i + 1}</td>
                        <td className="p-2 text-center">{item.itemCode}</td>
                        <td className="p-2 text-center">{item.itemName}</td>
                        <td className="p-2 text-center">{item.brand?.brandName}</td>
                        <td className="p-2 text-center">{item.category?.name}</td>
                        <td className="p-2 text-center">{item.mrp}</td>
                        <td className="p-2 text-center">{item.purchasePrice}</td>
                        <td className="p-2 text-center">{item.salesPrice}</td>
                        <td className="p-2 text-center">{item.currentStock}</td>
                        <td className="p-2 text-center">{(item.currentStock* item.purchasePrice)?.toFixed(2)}</td>
                      </tr>
                    ))
                  ) 
                  }
                </tbody>
              </table>
              
              <Modal
  open={showHistoryModal}
  onCancel={() => setShowHistoryModal(false)}
  footer={null}
  width={800}
  title={
    selectedItem
      ? `Stock History – ${selectedItem.itemName} (${selectedItem.itemCode})`
      : "Stock History"
  }
>
  {/* Warehouse Select */}
  <div className="flex items-center gap-3 mb-4">
    <select
      className="px-3 py-2 border rounded w-60"
      value={warehouseId}
      onChange={e => setWarehouseId(e.target.value)}
    >
      <option value="">Select Warehouse</option>

      {options.warehouses?.map(w => (
        <option key={w.value} value={w.value}>
          {w.label}
        </option>
      ))}
    </select>

    <button
      onClick={fetchStockHistory}
      className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
    >
      Fetch
    </button>
  </div>

  {/* Opening Stock */}
  {historyData.length > 0 && (
    <div className="flex justify-evenly">
      <div className="mb-3 text-sm font-semibold text-gray-700">
      Opening Stock: {opening}
    </div>
    <div className="mb-3 text-sm font-semibold text-gray-700">
    Current Stock: {total}
  </div>
    </div>
    
  )}

  
  

  {/* Table */}
  <div className="border rounded max-h-[60vh] overflow-y-auto">
    <table className="w-full text-sm border">
      <thead className="bg-gray-200">
        <tr>
          <th className="p-2">Date</th>
          <th className="p-2">Type</th>
          <th className="p-2">Qty</th>
         
        </tr>
      </thead>

      <tbody>
        {loadingHistory && (
          <tr>
            <td colSpan="4" className="p-4 text-center">
              Loading...
            </td>
          </tr>
        )}

        {!loadingHistory &&
          historyData.map((h, i) => {
            
            return (
              <tr key={i} className="border-b">
                <td className="p-2">{new Date(h.date).toLocaleString()}</td>
                <td className="p-2 capitalize">{h.type}</td>
                <td
                  className={`p-2 text-center ${
                    h.quantity < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {h.quantity}
                </td>
                
              </tr>
            );
          })}

        {!loadingHistory && historyData.length === 0 && (
          <tr>
            <td colSpan="4" className="p-3 text-center text-gray-500">
              No stock history found
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</Modal>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
