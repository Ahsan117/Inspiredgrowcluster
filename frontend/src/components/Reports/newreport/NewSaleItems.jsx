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
export default function StockReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const navigate = useNavigate();
  const [expandedBill, setExpandedBill] = useState(null);

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
  const[itemwise,setItemWise]=useState([])
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

      const response = await axios.get(`${link}/api/reports/sales-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
       console.log(response)
      setAllItems(response.data);
      // Table render hone se pehle ye logic likhein
const itemWiseSales = response.data.flatMap((bill) => 
  bill.items.map((it) => ({
    ...it,
    saleDate: bill.saleDate,
    saleCode: bill.saleCode,
    customerName: bill.customer?.customerName || "Walk-in",
    warehouseName: bill.warehouse?.warehouseName,
    // Agar backend se totalAmount bill ka hai, toh item ka total yahan calculate hoga
    itemTotal: it.subtotal || (it.price * it.quantity) 
  }))
);
setItemWise(itemWiseSales)
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const rows = [];
  
    allItems.forEach((bill, index) => {
      bill.items?.forEach((it) => {
        rows.push({
          "#": rows.length + 1,
          "Sale Date": new Date(bill.saleDate).toLocaleDateString(),
          "Sale Code": bill.saleCode,
          "Customer": bill.customer?.customerName || "Walk-in",
          "Warehouse": bill.warehouse?.warehouseName,
          "Item Name": it.item?.itemName || "-",
          "Quantity": it.quantity,
          "Unit Price": it.price,
          "Subtotal": it.subtotal || (it.price * it.quantity),
          "Bill Total": bill.totalAmount // Optional: Reference for the whole bill
        });
      });
    });
  
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Item Wise Sales");
  
    // Column width auto-adjust (optional but helpful)
    worksheet["!cols"] = [{ wch: 5 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 15 }];
  
    XLSX.writeFile(workbook, "Item_Wise_Sales_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(18);
    doc.text("Item-Wise Sales Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
  
    const tableRows = [];
    allItems.forEach((bill) => {
      bill.items?.forEach((it) => {
        tableRows.push([
          tableRows.length + 1,
          new Date(bill.saleDate).toLocaleDateString(),
          bill.saleCode,
          bill.customer?.customerName || "Walk-in",
          bill.warehouse?.warehouseName,
          it.item?.itemName || "-",
          it.quantity,
          `Rs. ${it.price.toLocaleString()}`,
          `Rs. ${(it.subtotal || it.price * it.quantity).toLocaleString()}`
        ]);
      });
    });
  
    autoTable(doc, {
      startY: 30,
      head: [["#", "Date", "Code", "Customer", "Warehouse", "Item Name", "Qty", "Price", "Total"]],
      body: tableRows,
      theme: "grid",
      headStyles: { fillColor: [8, 145, 178] }, // Cyan-600 color to match your UI
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 10 },
        5: { cellWidth: 'auto' }, // Item name gets more space
        8: { fontStyle: 'bold' }
      }
    });
  
    doc.save("Item_Wise_Sales_Report.pdf");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex w-full">
      <div className="w-auto">
        <Sidebar isSidebarOpen={isSidebarOpen} />
      </div>
        
          {loading && <LoadingScreen />}
        <div className="flex flex-col w-full max-h-screen p-6 overflow-y-auto">
          <header className="flex flex-col items-start mb-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Sales Item Report</h1>
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
            <table className="w-full text-sm border shadow-sm">
  <thead className="text-white bg-cyan-600">
    <tr>
      <th className="p-3 border">#</th>
      <th className="p-3 border text-left">Sale Date</th>
      <th className="p-3 border text-left">Sale Code</th>
      <th className="p-3 border text-left">Customer</th>
      <th className="p-3 border text-left">Warehouse</th>
      <th className="p-3 border text-left">Item Name</th>
      <th className="p-3 border text-center">Purchase Price</th>
      <th className="p-3 border text-center">Sales Price</th>
      <th className="p-3 border text-center">Qty</th>
      <th className="p-3 border text-right">Total Amount</th>
    </tr>
  </thead>
  <tbody>
    {itemwise.length > 0 ? (
      itemwise.map((row, i) => (
        <tr key={i} className="border-b hover:bg-gray-50 transition-colors">
          <td className="p-3 text-center border text-gray-400">{i + 1}</td>
          <td className="p-3 border whitespace-nowrap">
            {new Date(row.saleDate).toLocaleDateString("en-GB")}
          </td>
          <td className="p-3 border font-bold text-blue-600 uppercase">
            {row.saleCode}
          </td>
          <td className="p-3 border text-gray-700">
            {row.customerName}
          </td>
          <td className="p-3 border text-gray-600">
            {row.warehouseName}
          </td>
          <td className="p-3 border font-medium text-gray-900">
            {row.item?.itemName}
          </td>
          <td className="p-3 border text-center text-gray-600">
            ₹{row.item?.purchasePrice || 0}
          </td>

          <td className="p-3 border text-center text-gray-600">
            ₹{row.price}
          </td>
          <td className="p-3 border text-center font-bold">
            {row.quantity}
          </td>
          <td className="p-3 border text-right font-black text-gray-800">
            ₹{row.itemTotal}
          </td>
        </tr>
      ))
    ) : (
      !loading && (
        <tr>
          <td colSpan="9" className="p-10 text-center text-gray-400 italic bg-white">
            No sales items found for the selected filters.
          </td>
        </tr>
      )
    )}
  </tbody>

</table>
            </div>

          </div>
        </div>


      </div>
    </div>
  );
}
