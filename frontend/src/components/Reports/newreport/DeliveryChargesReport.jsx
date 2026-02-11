import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaTruck, FaMoneyCheckAlt, FaCalendarDay, FaStore } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";

export default function DeliveryChargesReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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
      const res = await axios.get(`${link}/api/reports/delivery-charges-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
            startDate, 
            endDate, 
            warehouse:selectedWarehouses.length > 0?  selectedWarehouses.map(w => w.value) : options.warehouses.map(w => w.value) 
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
            <h1 className="text-2xl font-bold text-gray-800">Delivery Charges Report</h1>
            <p className="text-sm text-gray-500">Monitor logistics revenue collected from customers</p>
          </header>

          {/* Filters */}
          <div className="p-5 mb-6 bg-white border-t-4 border-orange-500 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Warehouse</label>
                <Select isMulti options={options.warehouses} onChange={setSelectedWarehouses} className="mt-1" />
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
            <button onClick={fetchReport} className="px-6 py-2 mt-4 font-bold text-white bg-orange-600 rounded hover:bg-orange-700">
              Generate Report
            </button>
          </div>

          {/* Warehouse Wise Summary */}
          {reportData.map((wh, idx) => (
            <div key={idx} className="mb-8 overflow-hidden bg-white border rounded-lg shadow-sm">
              <div className="flex items-center justify-between p-4 border-b bg-orange-50">
                <h3 className="flex items-center gap-2 font-bold text-orange-800">
                  <FaStore /> {wh.warehouseName}
                </h3>
                <div className="text-right">
                  <p className="text-xs font-bold text-orange-600 uppercase">Total Collected</p>
                  <p className="text-xl font-black text-orange-700">₹{wh.totalCollected.toLocaleString()}</p>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 bg-gray-50">
                  <tr>
                    <th className="p-3">Order Info</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Order Total</th>
                    <th className="p-3 text-right">Delivery Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {wh.details.map((order, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="font-bold text-gray-700">{order.orderNumber}</div>
                        <div className="text-[10px] text-gray-400">{new Date(order.date).toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-gray-600">{order.customerName}</td>
                      <td className="p-3 text-gray-600">₹{order.totalOrderAmount}</td>
                      <td className="p-3 font-bold text-right text-orange-600">₹{order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}