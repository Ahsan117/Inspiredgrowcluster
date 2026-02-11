import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaBars } from "react-icons/fa";
import Select from "react-select";
import axios, { all } from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";
export default function ItemWiseProfitReport() {
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
        suppliers:[ ...supplierRes.data.data.map(w => ({ label: w.supplierName, value: w._id }))]
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      // console.log({
      //   warehouse:selectedWarehouse.length>0?selectedWarehouse.map(i => i.value):options.warehouses.map(i =>{
           
      //       return i.value
           
      //   }),
      //   supplier:selectedSupplier.length > 0?selectedSupplier.map(i=>i.label):options.suppliers.map(i=>i.label),
      //   search:search
      // })
      const response = await axios.get(`${link}/api/reports/expiredstock-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params:{
          warehouse:selectedWarehouse.length>0?selectedWarehouse.map(i => i.value):options.warehouses.map(i =>i.value),
        supplier:selectedSupplier.length > 0?selectedSupplier.map(i=>i.label):options.suppliers.map(i=>i.label),
        search:search
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
    if (!allItems || allItems.length === 0) {
      alert("No data available to export");
      return;
    }
  
    const data = allItems.map((item, index) => {
      const stock = item.currentStock || 0;
      const pPrice = item.purchasePrice || 0;
      const stockValue = stock * pPrice;
  
      return {
        "#": index + 1,
        "Item Code": item.itemCode,
        "Item Name": item.itemName,
        "Brand": item.brand?.brandName || "N/A",
        "Category": item.category?.name || "N/A",
        "MRP": item.mrp || 0,
        "Purchase Price": pPrice,
        "Sales Price": item.salesPrice || 0,
        "Current Stock": stock,
        // "Unit Profit/Loss": (item.salesPrice - pPrice).toFixed(2)
      };
    });
  
    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // Set column widths for better readability
    const wscols = [
      { wch: 5 },  { wch: 15 }, { wch: 30 }, { wch: 15 }, 
      { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, 
      { wch: 12 }, { wch: 15 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;
  
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Report");
    
    // Generate filename with timestamp
    const fileName = `ExpiredStockITem_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  
  // --- Export PDF ---
  const exportToPDF = () => {
    if (!allItems || allItems.length === 0) {
      alert("No data available to export");
      return;
    }
  
    const doc = new jsPDF({ orientation: "landscape" });
    
    // Add Title and Date
    doc.setFontSize(18);
    doc.text("Consolidated Stock Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
    const tableColumn = [
      "#", "Code", "Item Name", "Brand", "Category", 
      "MRP", "Sales", "Purchase", "Stock"
    ];
    
    const tableRows = allItems.map((item, i) => {
      const stock = item.currentStock || 0;
      const pPrice = item.purchasePrice || 0;
      const stockValue = (stock * pPrice).toFixed(2);
  
      return [
        i + 1,
        item.itemCode,
        item.itemName,
        item.brand?.brandName || "-",
        item.category?.name || "-",
        item.mrp || 0,
        item.salesPrice || 0,
        pPrice,
        stockValue,
        // (item.salesPrice - pPrice).toFixed(2)
      ];
    });
  
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [0, 120, 150], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { halign: 'center' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'center', fontStyle: 'bold' },
        // 9: { halign: 'right', fontStyle: 'bold' },
      },
      didDrawPage: (data) => {
        // Add page number at bottom
        const str = "Page " + doc.internal.getNumberOfPages();
        doc.setFontSize(10);
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });
  
    doc.save(`ExpiredStockItem_Report_${new Date().getTime()}.pdf`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex ">
        <div className="w-auto">
          
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
 {
  loading && <LoadingScreen />
 }
        {/* Main Content */}
        <div className="flex flex-col w-full max-h-screen min-h-screen p-6 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col items-start justify-between mb-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Expired Stock Item Report</h1>
            <nav className="flex items-center gap-2 text-sm text-gray-600">
              <NavLink to="/dashboard" className="flex items-center hover:text-cyan-600">
                <FaTachometerAlt className="mr-2" /> Home
              </NavLink>
              <span>&gt;</span>
              <span className="text-cyan-600">Expired Stock Report</span>
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
                <Select isMulti
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
                    <th className="p-2">Stock</th>
                    <th className="p-2">Purchase Price</th>
                    <th className="p-2">Sales Price</th>
                    {/* <th className="p-2">Profit/Loss</th> */}
                  </tr>
                </thead>
                <tbody>
                  {allItems.length > 0 && (
                    allItems.map((item, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="p-2 text-center">{i + 1}</td>
                        <td className="p-2 text-center">{item.itemCode}</td>
                        <td className="p-2 text-center">{item.itemName}</td>
                        <td className="p-2 text-center">{item.brand?.brandName}</td>
                        <td className="p-2 text-center">{item.category?.name}</td>
                        <td className="p-2 text-center">{item.mrp}</td>
                        <td className="p-2 text-center">{item.currentStock}</td>
                        <td className="p-2 text-center">{item.purchasePrice}</td>
                        <td className="p-2 text-center">{item.salesPrice}</td>
                        {/* <td className={`p-2 text-center ${(item.salesPrice-item.purchasePrice)>=0?"text-green-600":"text-red-600"}`}>{(item.salesPrice-item.purchasePrice).toFixed(2)}</td> */}
                      </tr>
                    ))
                  ) 
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
