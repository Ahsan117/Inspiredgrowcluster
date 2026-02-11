import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaUsers, FaUserClock, FaUserMinus, FaCheckCircle, FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function CustomerRetentionReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [data, setData] = useState({ summary: {}, list: [] });
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ warehouse: [], churnDays: 90 });

  useEffect(() => { fetchFilters(); }, []);

  const fetchFilters = async () => {
    const res = await axios.get(`${link}/api/warehouses?scope=mine`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setOptions({ warehouses: res.data.data.map(w => ({ label: w.warehouseName, value: w._id })) });
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${link}/api/reports/customer-retention-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          warehouse: filters.warehouse.map(w => w.value),
          churnDays: filters.churnDays 
        }
      });
      setData({ summary: res.data.summary, list: res.data.data });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- Export Logic ---

  const exportExcel = () => {
    const exportData = data.list.map(cust => ({
      Customer: cust.name,
      Mobile: cust.mobile,
      Total_Orders: cust.orderCount,
      Total_Sale: cust.totalSale,
      Average_Sale: cust.avgSale,
      Total_Spent: cust.totalSpent,
      Last_Active: new Date(cust.lastOrderDate).toLocaleDateString(),
      Status: cust.hasChurned ? 'Churned' : cust.isRepeat ? 'Loyal' : 'One-Time'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Retention Data");
    XLSX.writeFile(wb, "Customer_Retention_Report.xlsx");
    setShowExport(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Customer Retention & Churn Audit", 14, 15);
    
    // Add Summary Section
    doc.setFontSize(10);
    doc.text(`Total Customers: ${data.summary.totalCustomers}`, 14, 25);
    doc.text(`Retention Rate: ${data.summary.retentionRate}%`, 14, 30);
    doc.text(`Churn Rate: ${data.summary.churnRate}%`, 14, 35);

    autoTable(doc, {
      startY: 45,
      head: [['Customer', 'Mobile', 'Orders','Total Sale','Average Sale', 'Last Active', 'Status']],
      body: data.list.map(cust => [
        cust.name,
        cust.mobile,
        cust.orderCount,
        cust.totalSale,
        cust.avgSale,
        new Date(cust.lastOrderDate).toLocaleDateString(),
        cust.hasChurned ? 'Churned' : cust.isRepeat ? 'Loyal' : 'One-Time'
      ]),
      headStyles: { fillColor: [79, 70, 229] } // Indigo-600
    });

    doc.save("Customer_Retention_Report.pdf");
    setShowExport(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex">
        <Sidebar isSidebarOpen={true} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customer Retention Audit</h1>
              <p className="text-sm text-gray-500">Track loyalty, repeat purchase rates, and churn risk</p>
            </div>

            {/* Export Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 font-bold text-white transition bg-gray-800 rounded shadow hover:bg-black"
              >
                <FaDownload /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 z-50 w-40 mt-2 bg-white border rounded shadow-xl">
                  <button onClick={exportExcel} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFileExcel className="text-green-600" /> Excel
                  </button>
                  <button onClick={exportPDF} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFilePdf className="text-red-600" /> PDF
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Stat Summary Cards */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
            <div className="p-6 bg-white border-l-4 border-blue-500 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2 text-blue-600">
                    <span className="text-xs font-bold uppercase">Total Customers</span>
                    <FaUsers />
                </div>
                <div className="text-3xl font-black">{data.summary.totalCustomers || 0}</div>
            </div>
            <div className="p-6 bg-white border-l-4 border-green-500 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2 text-green-600">
                    <span className="text-xs font-bold uppercase">Retention Rate</span>
                    <FaCheckCircle />
                </div>
                <div className="text-3xl font-black">{data.summary.retentionRate || 0}%</div>
            </div>
            <div className="p-6 bg-white border-l-4 border-red-500 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-2 text-red-600">
                    <span className="text-xs font-bold uppercase">Churn Rate</span>
                    <FaUserMinus />
                </div>
                <div className="text-3xl font-black">{data.summary.churnRate || 0}%</div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid items-end grid-cols-1 gap-6 p-5 mb-8 bg-white border rounded-lg shadow-sm md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-gray-600">Consider Churned After (Days)</label>
              <input type="number" value={filters.churnDays} onChange={(e) => setFilters({...filters, churnDays: e.target.value})} className="w-full p-2 mt-1 border rounded" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Warehouses</label>
              <Select isMulti options={options.warehouses} onChange={(v) => setFilters({...filters, warehouse: v})} />
            </div>
            <button onClick={fetchReport} className="py-2 font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700">Analyze Retention</button>
          </div>

          {/* Data Table */}
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            <table className="w-full text-sm">
                <thead className="text-gray-600 border-b bg-gray-50">
                    <tr>
                        <th className="p-4 text-left">Customer</th>
                        <th className="p-4 text-center">Orders</th>
                        <th className="p-4 text-center">Total Sale</th>
                        <th className="p-4 text-center">Average Sale</th>
                        <th className="p-4 text-center">Last Active</th>
                        <th className="p-4 text-right">Loyalty Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.list.map((cust, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                            <td className="p-4">
                                <div className="font-bold">{cust.name}</div>
                                <div className="text-xs text-gray-400">{cust.mobile}</div>
                            </td>
                            <td className="p-4 font-bold text-center">{cust.orderCount}</td>
                            <td className="p-4 font-bold text-center">{cust.totalSale}</td>
                            <td className="p-4 font-bold text-center">{cust.avgSale}</td>
                            <td className="p-4 text-center">
                                {new Date(cust.lastOrderDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                    cust.hasChurned ? 'bg-red-100 text-red-600' : 
                                    cust.isRepeat ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                    {cust.hasChurned ? 'Churned' : cust.isRepeat ? 'Loyal' : 'One-Time'}
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}