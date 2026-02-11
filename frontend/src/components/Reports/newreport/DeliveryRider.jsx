import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaMotorcycle, FaStar, FaDownload, FaFileExcel, FaFilePdf } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function RiderPerformanceReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  
  // Options for Dropdowns
  const [options, setOptions] = useState({ warehouses: [], riders: [] });
  
  // Filter States
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null); // New Rider Filter
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => { fetchFilters(); }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const [wareRes, riderRes] = await Promise.all([
        axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/api/rider/all`, { headers: { Authorization: `Bearer ${token}` } }) // Adjusted endpoint
      ]);
console.log(wareRes, riderRes);
      setOptions({ 
        warehouses: wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
        riders: riderRes.data.data.map(r => ({ label: r.name, value: r._id }))
      });
    } catch (err) { console.error("Error fetching filters", err); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${link}/api/reports/rider-performance-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
            startDate, 
            endDate, 
            warehouse: selectedWarehouses.map(w => w.value),
            riderId: selectedRider?.value // Passing Rider Filter to backend
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- EXPORT FUNCTIONS ---

  const exportExcel = () => {
    const data = reportData.map(r => ({
      "Rider Name": r.riderName,
      "Phone": r.riderPhone,
      "Assigned": r.totalAssigned,
      "Delivered": r.completedOrders,
      "Cancelled": r.cancelledOrders,
      "Success Rate (%)": r.successRate.toFixed(2),
      "Total Earnings": r.totalEarnings
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rider Performance");
    XLSX.writeFile(wb, "Rider_Performance_Report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Rider Performance Report", 14, 15);
    autoTable(doc, {
      startY: 20,
      head: [["Rider Name", "Phone", "Assigned", "Delivered", "Cancelled", "Success %"]],
      body: reportData.map(r => [
        r.riderName, r.riderPhone, r.totalAssigned, r.completedOrders, r.cancelledOrders, `${r.successRate.toFixed(2)}%`
      ]),
    });
    doc.save("Rider_Performance_Report.pdf");
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
              <h1 className="text-2xl font-bold text-gray-800">Rider Performance Report</h1>
              <p className="text-sm text-gray-500">Track delivery efficiency and completion rates</p>
            </div>
            
            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 text-white transition bg-blue-600 rounded shadow hover:bg-blue-700"
              >
                <FaDownload /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 z-10 w-40 mt-2 bg-white border rounded shadow-lg">
                  <button onClick={exportExcel} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <FaFileExcel className="text-green-600" /> Excel
                  </button>
                  <button onClick={exportPDF} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <FaFilePdf className="text-red-600" /> PDF
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Filters */}
          <div className="p-5 mb-6 bg-white border-t-4 border-yellow-500 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Warehouse</label>
                <Select isMulti options={options.warehouses} value={selectedWarehouses} onChange={setSelectedWarehouses} className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Rider</label>
                <Select isClearable options={options.riders} value={selectedRider} onChange={setSelectedRider} className="mt-1" placeholder="All Riders" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">From Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2 mt-1 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">To Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2 mt-1 border rounded" />
              </div>
            </div>
            <button onClick={fetchReport} className="px-6 py-2 mt-4 font-bold text-white bg-yellow-600 rounded hover:bg-yellow-700">
              Run Performance Audit
            </button>
          </div>

          {/* Rider Cards Rendering */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {reportData.map((rider, idx) => (
              <div key={idx} className="p-6 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 text-yellow-700 bg-yellow-100 rounded-full">
                      <FaMotorcycle size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{rider.riderName}</h3>
                      <p className="text-sm text-gray-500">{rider.riderPhone}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 font-bold text-yellow-500">
                       <FaStar /> {rider.successRate.toFixed(1)}% Score
                    </div>
                    <p className="text-xs text-gray-400">Completion Rate</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="p-2 rounded bg-gray-50">
                    <p className="text-xs text-gray-500 uppercase">Assigned</p>
                    <p className="text-xl font-bold">{rider.totalAssigned}</p>
                  </div>
                  <div className="p-2 rounded bg-green-50">
                    <p className="text-xs text-green-600 uppercase">Delivered</p>
                    <p className="text-xl font-bold text-green-700">{rider.completedOrders}</p>
                  </div>
                  <div className="p-2 rounded bg-red-50">
                    <p className="text-xs text-red-600 uppercase">Cancelled</p>
                    <p className="text-xl font-bold text-red-700">{rider.cancelledOrders}</p>
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${rider.successRate > 80 ? 'bg-green-600' : 'bg-yellow-500'}`} 
                    style={{ width: `${rider.successRate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}