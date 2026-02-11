import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaLayerGroup, FaBox, FaMoneyBillTrendUp, FaDownload, FaFileExcel, FaFilePdf } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from "../../../Loading";

export default function CategoryWiseReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ warehouse: [], start: "", end: "" });

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
      const res = await axios.get(`${link}/api/reports/categorywise-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          warehouse:filters.warehouse.length>0? filters.warehouse.map(w => w.value) : options.warehouses.map(w => w.value),
          startDate: filters.start,
          endDate: filters.end
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- Export Functions ---
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Category Report");
    XLSX.writeFile(wb, "Category_Sales_Stock_Report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Category-Wise Sales & Stock Report", 14, 15);
    autoTable(doc, {
      startY: 25,
      head: [['Category', 'Units Sold', 'Revenue', 'Current Stock', 'Stock Value']],
      body: reportData.map(r => [r.category, r.totalSold, `Rs.${r.revenue}`, r.totalStock, `Rs.${r.stockValue}`]),
      headStyles: { fillColor: [79, 70, 229] }
    });
    doc.save("Category_Report.pdf");
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
              <h1 className="text-2xl font-bold text-gray-800">Category Insights</h1>
              <p className="text-sm text-gray-500">Analyze sales performance and inventory depth by category</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="p-2 text-white bg-green-600 rounded shadow-sm hover:bg-green-700"><FaFileExcel /></button>
              <button onClick={exportPDF} className="p-2 text-white bg-red-600 rounded shadow-sm hover:bg-red-700"><FaFilePdf /></button>
            </div>
          </header>

          {/* Filters */}
          <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border-t-4 border-indigo-600 rounded-lg shadow-sm md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Warehouses</label>
              <Select isMulti options={options.warehouses} onChange={(v) => setFilters({...filters, warehouse: v})} />
            </div>
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, start: e.target.value})} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, end: e.target.value})} />
            <button onClick={fetchReport} className="py-2 font-bold text-white transition bg-indigo-600 rounded hover:bg-indigo-700">Analyze Categories</button>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportData.map((item, i) => (
              <div key={i} className="p-5 transition bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 text-indigo-600 rounded-lg bg-indigo-50"><FaLayerGroup /></div>
                  <h3 className="text-lg font-bold text-gray-800">{item.category}</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="font-bold text-gray-500 uppercase">Sales Performance</span>
                      <span className="font-bold text-indigo-600">₹{item.revenue.toLocaleString()}</span>
                    </div>
                    <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                        <div className="h-full bg-indigo-500" style={{ width: `${Math.min((item.revenue / 100000) * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{item.totalSold} Units Sold</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Inventory Qty</p>
                        <p className="font-bold text-gray-700">{item.totalStock} units</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-gray-400 uppercase font-bold">Stock Value</p>
                        <p className="font-bold text-emerald-600">₹{item.stockValue.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}