import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaChartLine, FaArrowTrendUp, FaCalendarCheck, FaStore, FaGlobe, FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function SalesTrendReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState({ posTrend: [], onlineTrend: [] });
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ start: "", end: "", warehouse: [], interval: "day" });

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
      const res = await axios.get(`${link}/api/reports/salestrend-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          startDate: filters.start, 
          endDate: filters.end, 
          warehouse: filters.warehouse.map(w => w.value),
          interval: filters.interval 
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const calculateTotal = (trend) => trend.reduce((acc, curr) => acc + curr.revenue, 0);

  // --- Export Logic ---

  const exportToExcel = () => {
    // Prepare flattened data for Excel
    const posData = reportData.posTrend.map(item => ({ Channel: "POS", Period: item._id, Orders: item.orderCount, Revenue: item.revenue }));
    const onlineData = reportData.onlineTrend.map(item => ({ Channel: "Online", Period: item._id, Orders: item.orderCount, Revenue: item.revenue }));
    
    const combinedData = [...posData, ...onlineData];
    const ws = XLSX.utils.json_to_sheet(combinedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales Trend");
    XLSX.writeFile(wb, `Sales_Trend_Report_${filters.interval}.xlsx`);
    setShowExport(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Sales Trend Analysis Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Interval: ${filters.interval} | Date: ${new Date().toLocaleDateString()}`, 14, 28);

    // POS Table
    doc.setTextColor(40);
    doc.setFontSize(12);
    doc.text("POS Sales Trend", 14, 40);
    autoTable(doc, {
      startY: 45,
      head: [["Period", "Orders", "Revenue"]],
      body: reportData.posTrend.map(row => [row._id, row.orderCount, `Rs. ${row.revenue.toLocaleString()}`]),
      theme: 'grid',
      headStyles: { fillColor: [34, 197, 94] } // Emerald color
    });

    // Online Table
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.text("Online Sales Trend", 14, finalY);
    autoTable(doc, {
      startY: finalY + 5,
      head: [["Period", "Orders", "Revenue"]],
      body: reportData.onlineTrend.map(row => [row._id, row.orderCount, `Rs. ${row.revenue.toLocaleString()}`]),
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] } // Blue color
    });

    doc.save(`Sales_Trend_Report_${filters.interval}.pdf`);
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
              <h1 className="text-2xl font-bold text-gray-800">Sales Trend Analysis</h1>
              <p className="text-sm text-gray-500">Identify revenue peaks and growth cycles</p>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 font-bold text-white transition rounded shadow-md bg-emerald-600 hover:bg-emerald-700"
              >
                <FaDownload /> Export Report
              </button>
              {showExport && (
                <div className="absolute right-0 z-50 mt-2 bg-white border rounded shadow-xl w-44">
                  <button onClick={exportToExcel} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFileExcel className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={exportToPDF} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFilePdf className="text-red-600" /> PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Filter Bar (Same as before) */}
          <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border-t-4 rounded-lg shadow-sm border-emerald-500 md:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">View By</label>
              <select className="w-full p-2 mt-1 border rounded" onChange={(e) => setFilters({...filters, interval: e.target.value})}>
                <option value="day">Daily</option>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
              </select>
            </div>
            <Select isMulti options={options.warehouses} placeholder="Warehouses" onChange={(v) => setFilters({...filters, warehouse: v})} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, start: e.target.value})} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, end: e.target.value})} />
            <button onClick={fetchReport} className="py-2 font-bold text-white rounded md:col-span-4 bg-emerald-600 hover:bg-emerald-700">Apply Analysis</button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2">
            <div className="p-6 bg-white border-l-4 border-green-500 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-gray-500"><FaStore /> POS Revenue</span>
                <FaArrowTrendUp className="text-green-500" />
              </div>
              <h2 className="mt-2 text-3xl font-black text-gray-800">₹{calculateTotal(reportData.posTrend).toLocaleString()}</h2>
            </div>
            <div className="p-6 bg-white border-l-4 border-blue-500 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-gray-500"><FaGlobe /> Online Revenue</span>
                <FaArrowTrendUp className="text-blue-500" />
              </div>
              <h2 className="mt-2 text-3xl font-black text-gray-800">₹{calculateTotal(reportData.onlineTrend).toLocaleString()}</h2>
            </div>
          </div>

          {/* Trend Analysis Sections */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* POS Trend Table */}
            <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-2 p-4 border-b bg-green-50">
                <FaStore className="text-green-600" />
                <h3 className="font-bold text-green-800">POS Sales Trend</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">Period</th>
                    <th className="p-4 text-center">Orders</th>
                    <th className="p-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.posTrend.length > 0 ? reportData.posTrend.map((row, i) => (
                    <tr key={i} className="transition border-b hover:bg-green-50">
                      <td className="p-4 font-bold text-gray-700">{row._id}</td>
                      <td className="p-4 text-center text-gray-500">{row.orderCount}</td>
                      <td className="p-4 font-black text-right text-green-600">₹{row.revenue.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="p-10 text-center text-gray-400">No POS data found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Online Trend Table */}
            <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
              <div className="flex items-center gap-2 p-4 border-b bg-blue-50">
                <FaGlobe className="text-blue-600" />
                <h3 className="font-bold text-blue-800">Online Sales Trend</h3>
              </div>
              <table className="w-full text-sm">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">Period</th>
                    <th className="p-4 text-center">Orders</th>
                    <th className="p-4 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.onlineTrend.length > 0 ? reportData.onlineTrend.map((row, i) => (
                    <tr key={i} className="transition border-b hover:bg-blue-50">
                      <td className="p-4 font-bold text-gray-700">{row._id}</td>
                      <td className="p-4 text-center text-gray-500">{row.orderCount}</td>
                      <td className="p-4 font-black text-right text-blue-600">₹{row.revenue.toLocaleString()}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" className="p-10 text-center text-gray-400">No Online data found</td></tr>
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