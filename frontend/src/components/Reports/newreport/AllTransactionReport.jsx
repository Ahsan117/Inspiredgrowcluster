import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaBars, FaArrowUp, FaArrowDown, FaStore, FaGlobe } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function AllTransactionsReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [reportData, setReportData] = useState([]);
  const [options, setOptions] = useState({ warehouses: [] });
  
  // Filters
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const res = await axios.get(`${link}/api/warehouses?scope=mine`, { 
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } 
      });
      setOptions({
        warehouses: res.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
      });
    } catch (err) { console.error(err); }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        // Send array of IDs for multiple warehouse support
        warehouse: selectedWarehouses.map(w => w.value) 
      };

      const res = await axios.get(`${link}/api/reports/all-transactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Export Logic
  const exportToExcel = () => {
    const flatData = [];
    reportData.forEach(wh => {
      wh.transactions.forEach(trx => {
        flatData.push({
          "Warehouse": wh.warehouseName,
          "Date": new Date(trx.date).toLocaleString(),
          "Type": trx.type,
          "Reference": trx.code,
          "User/Customer": trx.creatorName,
          "Amount": trx.amount
        });
      });
    });
    const ws = XLSX.utils.json_to_sheet(flatData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Log");
    XLSX.writeFile(wb, "Master_Transaction_Report.xlsx");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Master Transaction Log</h1>
            <p className="text-sm text-gray-500">Combined view of POS, Online Orders, and Purchases</p>
          </header>

          {/* Filter Card */}
          <div className="p-5 mb-6 bg-white border-t-4 border-indigo-600 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Warehouses</label>
                <Select 
                  isMulti 
                  options={options.warehouses} 
                  value={selectedWarehouses} 
                  onChange={setSelectedWarehouses}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">From Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">To Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-3 py-2 mt-1 border rounded" />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={fetchReport} className="px-8 py-2 font-bold text-white transition bg-indigo-600 rounded hover:bg-indigo-700">
                Generate Report
              </button>
            </div>
          </div>

          {/* Grouped Warehouse Data */}
          {reportData.map((wh, idx) => (
            <div key={idx} className="mb-8 overflow-hidden bg-white border rounded-lg shadow-sm">
              {/* Warehouse Header Summary */}
              <div className="flex items-center justify-between p-4 bg-gray-100 border-b">
                <div className="flex items-center gap-2">
                  <FaStore className="text-indigo-600" />
                  <h3 className="font-bold tracking-wider text-gray-700 uppercase">{wh.warehouseName}</h3>
                </div>
                {/* <div className="text-right"> */}
                  {/* <span className="mr-2 text-xs text-gray-500">Net Warehouse Impact:</span> */}
                  {/* <span className={`font-bold text-lg ${wh.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}> */}
                    {/* ₹{wh.netAmount.toLocaleString()} */}
                  {/* </span> */}
                {/* </div> */}
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600 border-b bg-gray-50">
                    <tr>
                      <th className="p-3">Time</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Ref Code</th>
                      <th className="p-3">Party Name</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wh.transactions.map((trx, tIdx) => (
                      <tr key={tIdx} className="transition-colors border-b hover:bg-indigo-50">
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(trx.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                        </td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            trx.type === 'POS Sale' ? 'bg-green-100 text-green-700' :
                            trx.type === 'Online Order' ? 'bg-purple-100 text-purple-700' :
                            trx.type === 'Purchase'  ?'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                          }`}>
                            {trx.type === 'Online Order' ? <FaGlobe /> : <FaStore />}
                            {trx.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs font-semibold">{trx.code}</td>
                        <td className="p-3 font-medium text-gray-700">{trx.creatorName}</td>
                        <td className={`p-3 text-right font-bold ${trx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trx.amount >= 0 ? <FaArrowUp className="inline mr-1 text-[10px]" /> : <FaArrowDown className="inline mr-1 text-[10px]" />}
                          ₹{Math.abs(trx.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {reportData.length === 0 && !loading && (
            <div className="py-20 text-center bg-white border rounded">
              <p className="text-gray-400">No transactions found for the selected criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}