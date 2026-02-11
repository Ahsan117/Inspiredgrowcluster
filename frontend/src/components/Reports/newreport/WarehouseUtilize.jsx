import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaWarehouse, FaTruckLoading, FaChartPie, FaDownload } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";

export default function WarehouseUtilizationReport() {
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
      const res = await axios.get(`${link}/api/reports/warehouse-utilization-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { warehouse:selectedWarehouses.length > 0? selectedWarehouses.map(w => w.value) : options.warehouses.map(w => w.value) }
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
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Warehouse Utilization</h1>
              <p className="text-sm text-gray-500">Monitor storage capacity and order fulfillment load</p>
            </div>
          </header>

          {/* Filter Bar */}
          <div className="flex items-end gap-4 p-5 mb-8 bg-white border-t-4 border-orange-500 rounded-lg shadow-sm">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-600 uppercase">Select Warehouses</label>
              <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" />
            </div>
            <button onClick={fetchReport} className="px-8 py-2 font-bold text-white bg-orange-600 rounded hover:bg-orange-700">
              Generate Analysis
            </button>
          </div>

          {/* Utilization Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportData.map((wh, idx) => (
              <div key={idx} className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
                <div className="flex items-center justify-between p-5 border-b bg-gray-50">
                  <h3 className="flex items-center gap-2 font-bold text-gray-800"><FaWarehouse /> {wh.name}</h3>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                    wh.status === 'Full' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {wh.status}
                  </span>
                </div>
                
                <div className="p-5 space-y-6">
                  {/* Capacity Gauge */}
                  <div>
                    <div className="flex justify-between mb-2 text-xs font-bold">
                      <span className="text-gray-500 uppercase">Storage Capacity</span>
                      <span className="text-gray-800">{wh.occupancyRate}%</span>
                    </div>
                    <div className="w-full h-3 overflow-hidden bg-gray-200 rounded-full">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          wh.occupancyRate > 90 ? 'bg-red-500' : wh.occupancyRate > 70 ? 'bg-orange-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${wh.occupancyRate}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 italic">{wh.totalUnits} / {wh.maxCapacity} Units stored</p>
                  </div>

                  {/* Order Load Stats */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">POS Activity</p>
                      <p className="text-lg font-black text-orange-600">{wh.posOrders}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Online Activity</p>
                      <p className="text-lg font-black text-blue-600">{wh.onlineOrders}</p>
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