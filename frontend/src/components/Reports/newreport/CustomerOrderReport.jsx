import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaUserCircle, FaShoppingCart, FaCalendarAlt, FaHistory, FaPhoneAlt, FaUser } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function CustomerOrderReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [reportData, setReportData] = useState([]);
  const [options, setOptions] = useState({ 
    warehouses: [],
    customers: [] // New options for customers
  });
  
  // Filters
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null); // New filter state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const [wareRes, custRes] = await Promise.all([
        axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/customer/customers`, { headers: { Authorization: `Bearer ${token}` } }) // Adjusted endpoint for all customers
      ]);
console.log(wareRes,custRes);
      setOptions({
        warehouses: wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
        customers: custRes.data.data.filter(c=> c.name).map(c => ({ label: c.name || c.name, value: c._id }))
      });
    } catch (err) { console.error("Error fetching filters", err); }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = {
        startDate,
        endDate,
        // Send array of IDs for warehouses
        warehouse: selectedWarehouses.length > 0 ? selectedWarehouses.map(w => w.value) : options.warehouses.map(w => w.value),
        // Send specific customer ID if selected
        customerId: selectedCustomer ? selectedCustomer.value : null
      };

      const res = await axios.get(`${link}/api/reports/customer-order-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
      setReportData(res.data.data);
    } catch (err) { console.error("Error fetching report", err); } finally { setLoading(false); }
  };

  const exportToExcel = () => {
    const data = reportData.map(cust => ({
      "Customer Name": cust.name,
      "Mobile": cust.mobile,
      "Email": cust.email,
      "Total Orders": cust.totalOrders,
      "Total Spent": cust.totalSpent,
      "Avg Order Value": cust.avgOrderValue,
      "Last Order Date": new Date(cust.lastOrderDate).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customer Analysis");
    XLSX.writeFile(wb, "Customer_Order_Report.xlsx");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Customer Order Report</h1>
              <p className="text-sm text-gray-500">Analyze customer lifetime value and purchasing habits</p>
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-4 py-2 text-white transition bg-green-600 rounded shadow hover:bg-green-700">
               Excel Export
            </button>
          </header>

          {/* Filter Card */}
          <div className="p-5 mb-6 bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Warehouse</label>
                <Select isMulti options={options.warehouses} value={selectedWarehouses} onChange={setSelectedWarehouses} className="mt-1" placeholder="All Warehouses" />
              </div>

              {/* New Customer Filter */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase">Customer</label>
                <Select 
                  options={options.customers} 
                  value={selectedCustomer} 
                  onChange={setSelectedCustomer} 
                  isClearable 
                  className="mt-1" 
                  placeholder="Select Customer..."
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
              <button onClick={fetchReport} className="px-8 py-2 font-bold text-white transition rounded bg-cyan-600 hover:bg-cyan-700">
                Show Report
              </button>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-600 border-b bg-gray-50">
                  <tr>
                    <th className="p-4 text-left">Customer Information</th>
                    <th className="p-4 text-center">Orders</th>
                    <th className="p-4 text-center">Avg. Order Value</th>
                    <th className="p-4 text-center">Last Purchase</th>
                    <th className="p-4 text-right">Lifetime Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.map((cust, idx) => (
                    <tr key={idx} className="transition-colors border-b hover:bg-cyan-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-cyan-100">
                            <FaUserCircle className="text-xl text-cyan-600" />
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{cust.name}</div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                                <FaPhoneAlt className="text-[10px]"/> {cust.mobile}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-3 py-1 font-semibold text-gray-700 bg-gray-100 rounded-full">
                          {cust.totalOrders}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-center text-gray-600">
                        ₹{cust.avgOrderValue?.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center text-xs text-gray-700">
                          <span className="font-semibold">{new Date(cust.lastOrderDate).toLocaleDateString()}</span>
                          <span className="text-gray-400 text-[10px] uppercase">
                            {new Date(cust.lastOrderDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-base font-bold text-cyan-700">
                          ₹{cust.totalSpent?.toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length === 0 && !loading && (
                <div className="py-20 text-center text-gray-400">
                  No customer records found for this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}