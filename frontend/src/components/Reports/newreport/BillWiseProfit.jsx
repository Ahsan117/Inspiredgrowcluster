import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaBars } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import LoadingScreen from "../../../Loading";
export default function BillWiseProfitReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const navigate = useNavigate();

  // Dropdown options
  const [options, setOptions] = useState({
    warehouses: [],
    customers: [],
  });

  // Selected filters
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data
  const [allItems, setAllItems] = useState([]);

  // Fetch dropdown data
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const [wareRes, cusRes] = await Promise.all([
        axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/api/customer-data/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setOptions({
        warehouses: wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
        customers: cusRes.data.map(c => ({ label: c.customerName, value: c._id })),
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      const params = {
        search: search.toLowerCase() || null,
        start: startDate || null,
        end: endDate || null,
      };

      if (selectedWarehouses.length > 0) {
        params.warehouseId = selectedWarehouses.map(i => i.value);
      }

      if (selectedCustomers.length > 0) {
        params.customerId = selectedCustomers.map(i => i.value);
      }

      const response = await axios.get(`${link}/api/reports/bill-wise-profit-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
       console.log(response)
      setAllItems(response.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Export Excel
  const exportToExcel = () => {
    const data = allItems.map((item, index) => ({
      "#": index + 1,
      "Sale Code": item.saleCode,
      "Sale Date": new Date(item.saleDate).toLocaleDateString(),
      "Customer": item.customer?.customerName,
      "Warehouse": item.warehouse?.warehouseName,
      "Bill Purchase Price": item.billPurchasePrice?.toFixed(2),
      "Bill Amount": item.Amount?.toFixed(2),
      "Profit/Loss": (item.Amount-item.billPurchasePrice)?.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "BillWise Profit Report");
    XLSX.writeFile(workbook, "BillWiseProfit_Report.xlsx");
  };

  // Export PDF
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("BillWiseProfit Report", 14, 15);

    autoTable(doc, {
      head: [["#", "Sale Code", "Sale Date", "Customer", "Warehouse", "BillPurchasePrice","Bill Amount","Profit/Loss"]],
      body: allItems.map((item, i) => [
        i + 1,
        item.saleCode,
        new Date(item.saleDate).toLocaleDateString(),
        item.customer?.customerName,
        item.warehouse?.warehouseName,
        item.billPurchasePrice,
        item.totalAmount,
        item.totalAmount-item.billPurchasePrice,
      ]),
      startY: 20
    });

    doc.save("BillWiseProfit_Report.pdf");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex ">
        <div className="w-auto">
          
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
{loading && <LoadingScreen />}
        <div className="flex flex-col w-full max-h-screen min-h-screen p-6 overflow-y-auto">
          <header className="flex flex-col items-start mb-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-800">BillWise Profit Report</h1>
          </header>

          {/* Filters */}
          <div className="p-5 mb-6 bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Filter Options</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              
              <div>
                <label className="text-sm font-medium text-gray-600">Warehouse</label>
                <Select
                  options={options.warehouses}
                  value={selectedWarehouses}
                  onChange={setSelectedWarehouses}
                  isMulti
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Customers</label>
                <Select
                  options={options.customers}
                  value={selectedCustomers}
                  onChange={setSelectedCustomers}
                  isMulti
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Item Name/Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  onChange={(e) => setSearch(e.target.value)}
                  value={search}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">From</label>
                <input type="date" onChange={(e) => setStartDate(e.target.value)} value={startDate}
                  className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">To</label>
                <input type="date" onChange={(e) => setEndDate(e.target.value)} value={endDate}
                  className="w-full px-3 py-2 border rounded" />
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={fetchItems} className="px-6 py-2 text-white rounded bg-cyan-600">
                Search
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="p-5 bg-white border rounded shadow">
            <div className="flex justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-700">Records</h4>

              <div className="relative">
                <button onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-4 py-2 text-white bg-blue-500 rounded">
                  <FaBars className="inline mr-2" /> Export ▼
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 w-40 bg-white rounded shadow">
                    <button className="block w-full px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => { exportToExcel(); setShowExportDropdown(false); }}>
                      Excel
                    </button>
                    <button className="block w-full px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => { exportToPDF(); setShowExportDropdown(false); }}>
                      PDF
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="text-white bg-cyan-600">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Sale Date</th>
                    <th className="p-2">Sale Code</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">Warehouse</th>
                    <th className="p-2">Bill Purchase Price</th>
                    <th className="p-2">Bill Amount</th>
                    <th className="p-2">Profit/loss</th>
                  </tr>
                </thead>
                <tbody>
                  {allItems.map((item, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50"
                      onClick={() => navigate(`/view-sale-report?id=${item._id}&source=${item.source}`)}>
                      <td className="p-2 text-center">{i + 1}</td>
                      <td className="p-2 text-center">{new Date(item.saleDate).toLocaleDateString()}</td>
                      <td className="p-2 text-center">{item.saleCode}</td>
                      <td className="p-2 text-center">{item.customer?.customerName}</td>
                      <td className="p-2 text-center">{item.warehouse?.warehouseName}</td>
                      <td className="p-2 text-center">{item.billPurchasePrice?.toFixed(2)}</td>
                      <td className="p-2 text-center">{item.totalAmount?.toFixed(2)}</td>
                      <td className={`p-2 text-center ${item.totalAmount - item.billPurchasePrice >= 0 ? 'text-green-600' : 'text-red-600'}`}>{(item.totalAmount - item.billPurchasePrice).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
