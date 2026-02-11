// import React, { useState, useEffect } from "react";
// import Sidebar from "../../Sidebar";
// import Navbar from "../../Navbar";
// import { FaChartBar, FaExclamationTriangle, FaShoppingCart, FaTruckLoading } from "react-icons/fa";
// import Select from "react-select";
// import axios from "axios";
// import LoadingScreen from "../../../Loading";

// export default function ForecastingReport() {
//   const link = "https://pos.inspiredgrow.in/vps";
//   const [reportData, setReportData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [options, setOptions] = useState({ warehouses: [] });
//   const [filters, setFilters] = useState({ warehouse: [], forecastDays: 30, lookback: 30 });

//   useEffect(() => { fetchFilters(); }, []);

//   const fetchFilters = async () => {
//     const res = await axios.get(`${link}/api/warehouses?scope=mine`, {
//       headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
//     });
//     setOptions({ warehouses: res.data.data.map(w => ({ label: w.warehouseName, value: w._id })) });
//   };

//   const fetchReport = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get(`${link}/api/reports/forecasting-report`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//         params: { 
//           warehouse:filters.warehouse.length>0? filters.warehouse.map(w => w.value): options.warehouses.map(w => w.value),
//           forecastDays: filters.forecastDays,
//           lookbackDays: filters.lookback
//         }
//       });
//       setReportData(res.data.data);
//     } catch (err) { console.error(err); } finally { setLoading(false); }
//   };

//   return (
//     <div className="flex flex-col h-screen bg-gray-50">
//       <Navbar isSidebarOpen={true} />
//       <div className="flex">
//         <Sidebar isSidebarOpen={true} />
//         {loading && <LoadingScreen />}
        
//         <div className="flex flex-col w-full p-6 overflow-y-auto">
//           <header className="mb-6">
//             <h1 className="text-2xl font-bold text-gray-800">Demand Forecasting</h1>
//             <p className="text-sm text-gray-500">Predicted stock-out dates and replenishment suggestions</p>
//           </header>

//           {/* Forecast Controls */}
//           <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border-t-4 border-purple-600 rounded-lg shadow-sm md:grid-cols-4">
//             <div>
//               <label className="text-xs font-bold text-gray-500 uppercase">Look-back Period</label>
//               <select className="w-full p-2 mt-1 border rounded" onChange={(e)=>setFilters({...filters, lookback: e.target.value})}>
//                 <option value={7}>Last 7 Days</option>
//                 <option value={30}>Last 30 Days</option>
//                 <option value={90}>Last 90 Days</option>
//               </select>
//             </div>
//             <div>
//               <label className="text-xs font-bold text-gray-500 uppercase">Forecast For</label>
//               <select className="w-full p-2 mt-1 border rounded" onChange={(e)=>setFilters({...filters, forecastDays: e.target.value})}>
//                 <option value={30}>Next 30 Days</option>
//                 <option value={60}>Next 60 Days</option>
//               </select>
//             </div>
//             <div className="md:col-span-1">
//                <Select isMulti placeholder="Warehouses" options={options.warehouses} onChange={(v)=>setFilters({...filters, warehouse: v})} />
//             </div>
//             <button onClick={fetchReport} className="py-2 font-bold text-white transition bg-purple-600 rounded hover:bg-purple-700">Predict Demand</button>
//           </div>

//           {/* Forecasting Grid */}
//           <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
//             {reportData.map((item, i) => (
//               <div key={i} className={`bg-white p-5 rounded-xl border-2 shadow-sm ${
//                 item.urgency === 'Critical' ? 'border-red-200 bg-red-50/30' : 'border-gray-100'
//               }`}>
//                 <div className="flex items-start justify-between mb-4">
//                   <div className="max-w-[70%]">
//                     <h3 className="font-bold text-gray-800 truncate">{item.itemName}</h3>
//                     <p className="text-[10px] text-gray-400 font-mono uppercase">{item.itemCode}</p>
//                   </div>
//                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
//                     item.urgency === 'Critical' ? 'bg-red-600 text-white' : 
//                     item.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
//                   }`}>
//                     {item.urgency}
//                   </span>
//                 </div>

//                 <div className="grid grid-cols-2 gap-4 py-3 border-gray-200 border-dashed border-y">
//                   <div className="text-center border-r">
//                     <p className="text-[9px] text-gray-400 uppercase font-bold">Days to Empty</p>
//                     <p className={`text-xl font-black ${item.daysRemaining < 7 ? 'text-red-600' : 'text-gray-800'}`}>
//                       {item.daysRemaining > 365 ? '∞' : item.daysRemaining}
//                     </p>
//                   </div>
//                   <div className="text-center">
//                     <p className="text-[9px] text-gray-400 uppercase font-bold">Avg Sale/Day</p>
//                     <p className="text-xl font-black text-gray-800">{item.avgDailySales}</p>
//                   </div>
//                   <div className="text-center">
//                     <p className="text-[9px] text-gray-400 uppercase font-bold">Current Stock</p>
//                     <p className="text-xl font-black text-gray-800">{item.currentStock}</p>
//                   </div>
                  
//                 </div>

//                 <div className="flex items-center justify-between mt-4">
//                   <div className="flex items-center gap-2 text-indigo-600">
//                     <FaShoppingCart className="text-xs" />
//                     <span className="text-xs font-bold uppercase">Reorder Suggestion</span>
//                   </div>
//                   <span className="text-lg font-black text-indigo-700">{item.recommendedOrder} units</span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaDownload, FaFileExcel, FaFilePdf, FaArrowTrendUp, FaCircleExclamation } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function ForecastingReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ warehouse: [], forecastDays: 30, lookback: 30 });
  const [showExport, setShowExport] = useState(false);

  useEffect(() => { fetchFilters(); }, []);

  const fetchFilters = async () => {
    try {
      const res = await axios.get(`${link}/api/warehouses?scope=mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      setOptions({ warehouses: res.data.data.map(w => ({ label: w.warehouseName, value: w._id })) });
    } catch (err) { console.error(err); }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${link}/api/reports/forecasting-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          warehouse: filters.warehouse.length > 0 ? filters.warehouse.map(w => w.value) : options.warehouses.map(w => w.value),
          forecastDays: filters.forecastDays,
          lookbackDays: filters.lookback
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const exportExcel = () => {
    const data = reportData.map(item => ({
      "Item Name": item.itemName,
      "SKU": item.itemCode,
      "Avg Daily Sales": item.avgDailySales,
      "Current Stock": item.currentStock,
      "Days to Empty": item.daysRemaining > 365 ? '365+' : item.daysRemaining,
      "Recommendation": item.recommendedOrder,
      "Urgency": item.urgency
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demand Forecast");
    XLSX.writeFile(wb, "Demand_Forecast_Report.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Stock Replenishment & Demand Forecast", 14, 15);
    autoTable(doc, {
      head: [["Item", "SKU", "Avg Daily Sales", "Stock", "Days Left", "Suggested Order", "Urgency"]],
      body: reportData.map(i => [
        i.itemName, i.itemCode, i.avgDailySales, i.currentStock, i.daysRemaining, i.recommendedOrder, i.urgency
      ]),
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [147, 51, 234] } // Purple-600
    });
    doc.save("Demand_Forecast.pdf");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isSidebarOpen={true} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3">
                <FaArrowTrendUp className="text-purple-600" /> Demand Forecasting
              </h1>
              {/* <p className="text-sm text-gray-500">ML-driven stock-out predictions and replenishment logic</p> */}
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="bg-white border-2 border-gray-200 px-4 py-2 rounded-lg font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 transition"
              >
                <FaDownload /> Export Report
              </button>
              {showExport && (
                <div className="absolute right-0 mt-2 w-48 bg-white border rounded-xl shadow-2xl z-50 overflow-hidden">
                  <button onClick={exportExcel} className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-2 border-b">
                    <FaFileExcel className="text-green-600" /> Excel Spreadsheet
                  </button>
                  <button onClick={exportPDF} className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center gap-2">
                    <FaFilePdf className="text-red-600" /> PDF Document
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Forecast Controls */}
          <div className="grid items-end grid-cols-1 gap-6 p-6 mb-8 bg-white border-t-4 border-purple-600 rounded-xl shadow-sm md:grid-cols-4">
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Look-back Period</label>
              <select className="w-full p-2.5 mt-1 border rounded-lg bg-gray-50 font-medium" onChange={(e)=>setFilters({...filters, lookback: e.target.value})}>
                <option value={7}>Last 7 Days (Short Trend)</option>
                <option value={30}>Last 30 Days (Standard)</option>
                <option value={90}>Last 90 Days (Seasonal)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Forecast For</label>
              <select className="w-full p-2.5 mt-1 border rounded-lg bg-gray-50 font-medium" onChange={(e)=>setFilters({...filters, forecastDays: e.target.value})}>
                <option value={30}>Next 30 Days</option>
                <option value={60}>Next 60 Days</option>
              </select>
            </div>
            <div className="md:col-span-1">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Warehouses</label>
               <Select isMulti placeholder="All Warehouses" options={options.warehouses} onChange={(v)=>setFilters({...filters, warehouse: v})} className="mt-1" />
            </div>
            <button onClick={fetchReport} className="py-2.5 font-black text-white uppercase text-xs tracking-widest bg-purple-600 rounded-lg hover:bg-purple-700 transition shadow-lg shadow-purple-100">
              Run Predictive Analysis
            </button>
          </div>

          

          {/* Forecasting Table */}
          <div className="bg-white border rounded-xl shadow-sm overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left font-black text-gray-400 uppercase text-[10px]">Item / SKU</th>
                  <th className="p-4 text-center font-black text-gray-400 uppercase text-[10px]">Current Stock</th>
                  <th className="p-4 text-center font-black text-gray-400 uppercase text-[10px]">Daily Velocity</th>
                  <th className="p-4 text-center font-black text-gray-400 uppercase text-[10px]">Days Left</th>
                  <th className="p-4 text-right font-black text-gray-400 uppercase text-[10px]">Replenish Suggestion</th>
                  <th className="p-4 text-center font-black text-gray-400 uppercase text-[10px]">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.map((item, i) => (
                  <tr key={i} className={`hover:bg-gray-50 transition ${item.urgency === 'Critical' ? 'bg-red-50/20' : ''}`}>
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{item.itemName}</div>
                      <div className="text-[10px] font-mono text-gray-400 uppercase">{item.itemCode}</div>
                    </td>
                    <td className="p-4 text-center font-medium text-gray-600">{item.currentStock}</td>
                    <td className="p-4 text-center text-gray-600">{item.avgDailySales} units/day</td>
                    <td className="p-4 text-center">
                      <span className={`font-black ${item.daysRemaining < 7 ? 'text-red-600 animate-pulse' : 'text-gray-800'}`}>
                        {item.daysRemaining > 365 ? '365+' : item.daysRemaining} days
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="font-black text-purple-700 text-lg">+{item.recommendedOrder}</div>
                      <div className="text-[9px] text-gray-400 uppercase font-bold">Recommended</div>
                    </td>
                    <td className="p-4 text-center">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                        item.urgency === 'Critical' ? 'bg-red-600 text-white' : 
                        item.urgency === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.urgency === 'Critical' && <FaCircleExclamation />} {item.urgency}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reportData.length === 0 && !loading && (
                <div className="p-20 text-center text-gray-400 italic">
                    Run analysis to view stock-out predictions.
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}