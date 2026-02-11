import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaChampagneGlasses, FaCalendarCheck, FaChartBar, FaDownload, FaFileExcel, FaFilePdf } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function SeasonalSalesReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);

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
      const res = await axios.get(`${link}/api/reports/seasonsales-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { warehouse:selectedWarehouses.length > 0? selectedWarehouses.map(w => w.value) : options.warehouses.map(w => w.value) }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Seasonal Analysis");
    XLSX.writeFile(wb, "Seasonal_Sales_Report.xlsx");
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
              <h1 className="text-2xl font-bold text-gray-800">Seasonal Performance</h1>
              <p className="text-sm text-gray-500">Compare revenue across major festivals and sales seasons</p>
            </div>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 font-bold text-white rounded shadow-md bg-amber-600 hover:bg-amber-700">
              <FaDownload /> Export Analysis
            </button>
          </header>

          {/* Filter Bar */}
          <div className="flex items-end gap-4 p-5 mb-8 bg-white border-t-4 rounded-lg shadow-sm border-amber-500">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Filter by Warehouse</label>
              <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" />
            </div>
            <button onClick={fetchReport} className="px-8 py-2 font-bold text-white rounded bg-amber-600 hover:bg-amber-700">
              Analyze Seasons
            </button>
          </div>

          {/* Seasonal Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {reportData.map((season, i) => (
              <div key={i} className="p-6 transition-transform bg-white border border-gray-100 shadow-sm rounded-xl hover:scale-105">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                    <FaChampagneGlasses size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                    {season.orders} Orders
                  </span>
                </div>
                <h3 className="text-lg font-black text-gray-800">{season.seasonName}</h3>
                <p className="text-[10px] text-gray-400 mb-4">{season.period}</p>
                
                <div className="space-y-1">
                  <p className="text-2xl font-black text-amber-600">₹{season.revenue.toLocaleString()}</p>
                  <p className="text-xs font-medium text-gray-500">Avg. Order: ₹{season.aov}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-dashed">
                    <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div 
                          className="h-full rounded-full bg-amber-500" 
                          style={{ width: `${Math.min((season.revenue / 500000) * 100, 100)}%` }}
                        ></div>
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