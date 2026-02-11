import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaExclamationTriangle, FaBoxOpen, FaWarehouse, FaMoneyBillWave } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";

export default function DeadStockReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [days, setDays] = useState(90);

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
      const res = await axios.get(`${link}/api/reports/deadstock-item-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
            days, 
            warehouse: selectedWarehouses.map(w => w.value) 
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex">
        <Sidebar isSidebarOpen={true} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Item Not Sold Report</h1>
            <p className="text-sm text-gray-500">Items with zero sales activity for {days}+ days</p>
          </header>

          <div className="grid grid-cols-1 gap-6 p-5 mb-6 bg-white border-t-4 border-orange-500 rounded-lg shadow-sm md:grid-cols-3">
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Aging Threshold</label>
              <select value={days} onChange={(e) => setDays(e.target.value)} className="w-full p-2 mt-1 border rounded">
                <option value={30}>30 Days (Slow Moving)</option>
                <option value={60}>60 Days (Stagnant)</option>
                <option value={90}>90 Days (Dead Stock)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase">Warehouses</label>
              <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" />
            </div>
            <div className="flex items-end">
              <button onClick={fetchReport} className="w-full py-2 font-bold text-white bg-orange-600 rounded hover:bg-orange-700">
                Generate Audit
              </button>
            </div>
          </div>

          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-600 bg-gray-100 border-b">
                <tr>
                  <th className="p-4">Item Name & Code</th>
                  <th className="p-4">Primary Warehouse</th>
                  <th className="p-4 text-center">Stock Quantity</th>
                  <th className="p-4 text-right">Blocked Capital</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((item, i) => (
                  <tr key={i} className="border-b hover:bg-orange-50">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{item.itemName}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.itemCode}</div>
                    </td>
                    <td className="flex items-center gap-1 p-4 text-gray-600">
                      <FaWarehouse className="text-xs" /> {item.warehouseName}
                    </td>
                    <td className="p-4 font-bold text-center text-gray-700">
                      {item.currentStock}
                    </td>
                    <td className="p-4 font-black text-right text-orange-600">
                      ₹{item.blockedCapital.toLocaleString()}
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