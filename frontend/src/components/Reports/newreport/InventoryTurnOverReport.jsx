// import React, { useState, useEffect } from "react";
// import Sidebar from "../../Sidebar";
// import Navbar from "../../Navbar";
// import { FaSyncAlt, FaClock, FaChartLine, FaExclamationCircle } from "react-icons/fa";
// import Select from "react-select";
// import axios from "axios";
// import LoadingScreen from "../../../Loading";

// export default function InventoryTurnoverReport() {
//   const link = "https://pos.inspiredgrow.in/vps";
//   const [reportData, setReportData] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [options, setOptions] = useState({ warehouses: [] });
//   const [selectedWarehouses, setSelectedWarehouses] = useState([]);

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
//       const res = await axios.get(`${link}/api/reports/inventoryturnover-report`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//         params: { warehouse:selectedWarehouses.length > 0? selectedWarehouses.map(w => w.value):options.warehouses.map(w => w.value) }
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
//             <h1 className="text-2xl font-bold text-gray-800">Inventory Turnover Report</h1>
//             <p className="text-sm text-gray-500">How quickly items are sold and replaced</p>
//           </header>

//           <div className="flex items-end gap-4 p-5 mb-6 bg-white border-t-4 border-blue-600 rounded-lg shadow-sm">
//             <div className="flex-1">
//               <label className="text-xs font-bold text-gray-600 uppercase">Select Warehouses</label>
//               <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" />
//             </div>
//             <button onClick={fetchReport} className="px-8 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700">
//               Analyze Turnover
//             </button>
//           </div>

//           <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
//             {reportData.map((item, idx) => (
//               <div key={idx} className="p-5 bg-white border border-gray-100 rounded-lg shadow-sm">
//                 <div className="flex items-start justify-between mb-4">
//                   <div>
//                     <h3 className="w-40 font-bold text-gray-800 truncate">{item.itemName}</h3>
//                     <p className="font-mono text-xs text-gray-400">{item.itemCode}</p>
//                   </div>
//                   <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
//                     item.status === 'Fast' ? 'bg-green-100 text-green-700' : 
//                     item.status === 'Moderate' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
//                   }`}>
//                     {item.status} Mover
//                   </span>
//                 </div>

//                 <div className="flex items-center justify-around py-4 mb-4 border-y border-gray-50">
//                   <div className="text-center">
//                     <p className="text-[10px] text-gray-400 uppercase">Ratio</p>
//                     <div className="flex items-center justify-center gap-1 font-bold text-indigo-600">
//                       <FaSyncAlt className="text-xs" /> {item.turnoverRatio}x
//                     </div>
//                   </div>
//                   <div className="text-center">
//                     <p className="text-[10px] text-gray-400 uppercase">Avg Days to Sell</p>
//                     <div className="flex items-center justify-center gap-1 font-bold text-gray-700">
//                       <FaClock className="text-xs" /> {item.daysToSell} Days
//                     </div>
//                   </div>
//                 </div>

//                 <div className="flex justify-between text-sm">
//                   <span className="italic text-gray-500">Total Units Sold:</span>
//                   <span className="font-bold text-gray-800">{item.totalSold}</span>
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
import { FaSyncAlt, FaClock, FaDownload, FaFileExcel, FaFilePdf, FaChevronDown } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function InventoryTurnoverReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);

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
      const res = await axios.get(`${link}/api/reports/inventoryturnover-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { warehouse: selectedWarehouses.length > 0 ? selectedWarehouses.map(w => w.value) : options.warehouses.map(w => w.value) }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- Export Logic ---

  const exportExcel = () => {
    const data = reportData.map(item => ({
      "Item Name": item.itemName,
      "Item Code": item.itemCode,
      "Turnover Ratio": `${item.turnoverRatio}x`,
      "Avg Days to Sell": item.daysToSell,
      "Total Sold": item.totalSold,
      "Movement Status": item.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Turnover");
    XLSX.writeFile(wb, "Inventory_Turnover_Report.xlsx");
    setShowExport(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Inventory Turnover Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Item Name', 'Code', 'Ratio', 'Days to Sell', 'Sold', 'Status']],
      body: reportData.map(i => [
        i.itemName,
        i.itemCode,
        `${i.turnoverRatio}x`,
        i.daysToSell,
        i.totalSold,
        i.status
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] } // Blue-600
    });

    doc.save("Inventory_Turnover_Report.pdf");
    setShowExport(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isSidebarOpen={true} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inventory Turnover Analysis</h1>
              <p className="text-sm text-gray-500">Measure efficiency in selling and replacing stock</p>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 font-bold text-white transition bg-blue-600 rounded shadow-md hover:bg-blue-700"
              >
                <FaDownload /> Export <FaChevronDown className="text-xs" />
              </button>
              {showExport && (
                <div className="absolute right-0 z-50 mt-2 bg-white border rounded shadow-xl w-44">
                  <button onClick={exportExcel} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100 border-b">
                    <FaFileExcel className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={exportPDF} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFilePdf className="text-red-600" /> PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Filter Bar */}
          <div className="flex items-end gap-4 p-5 mb-8 bg-white border-t-4 border-blue-600 rounded-lg shadow-sm">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Warehouses</label>
              <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" placeholder="All Warehouses" />
            </div>
            <button onClick={fetchReport} className="px-8 py-2.5 font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition shadow-lg shadow-blue-100">
              Analyze Turnover
            </button>
          </div>

          

          {/* Data Cards */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportData.map((item, idx) => (
              <div key={idx} className="p-5 transition bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="w-40 font-bold text-gray-800 truncate">{item.itemName}</h3>
                    <p className="font-mono text-[10px] text-gray-400 uppercase tracking-tight">{item.itemCode}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    item.status === 'Fast' ? 'bg-green-100 text-green-700' : 
                    item.status === 'Moderate' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.status} Mover
                  </span>
                </div>

                <div className="flex items-center justify-around py-4 mb-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Turnover Ratio</p>
                    <div className="flex items-center justify-center gap-1 font-black text-indigo-600">
                      <FaSyncAlt className="text-[10px]" /> {item.turnoverRatio}x
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Avg Sale Cycle</p>
                    <div className="flex items-center justify-center gap-1 font-black text-gray-700">
                      <FaClock className="text-[10px]" /> {item.daysToSell} Days
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-xs px-1">
                  <span className="text-gray-500 font-medium italic">Throughput (Units):</span>
                  <span className="font-black text-gray-800">{item.totalSold}</span>
                </div>
              </div>
            ))}
          </div>

          {reportData.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center py-20 bg-white border border-dashed rounded-xl">
               <p className="text-gray-400 italic">No data found. Select a warehouse and run analysis.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}