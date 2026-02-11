import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaUserTag, FaBox, FaChevronDown, FaChevronUp, FaFileExcel } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function PartyWiseSoldItemReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  
  const [options, setOptions] = useState({ warehouses: [], customers: [] });
  const [filters, setFilters] = useState({ warehouse: [], customer: null, start: "", end: "" });

  useEffect(() => { fetchFilters(); }, []);

  const fetchFilters = async () => {
    const token = localStorage.getItem("token");
    const [wRes, cRes] = await Promise.all([
      axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
      axios.get(`${link}/api/customer-data/all`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    setOptions({
      warehouses: wRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
      customers: cRes.data.map(c => ({ label: c.customerName, value: c._id }))
    });
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${link}/api/reports/partywise-item-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          startDate: filters.start, 
          endDate: filters.end, 
          warehouse: filters.warehouse.map(w => w.value),
          customerId: filters.customer?.value
        }
      });
      console.log(res.data.data);
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const exportExcel = () => {
    const flat = [];
    reportData.forEach(p => p.soldItems.forEach(i => {
      flat.push({ Party: p.customerName, Item: i.name, Code: i.code, Qty: i.quantity, Revenue: i.revenue });
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sold Items");
    XLSX.writeFile(wb, "PartyWise_SoldItems.xlsx");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex">
        <Sidebar isSidebarOpen={true} />
        {loading && <LoadingScreen />}
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-gray-800">Party-Wise Sold Item Report</h1>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 font-semibold text-white transition bg-green-600 rounded shadow-sm hover:bg-green-700">
              <FaFileExcel /> Export
            </button>
          </header>

          {/* Filters */}
          <div className="grid grid-cols-1 gap-4 p-5 mb-6 bg-white border-t-4 border-indigo-600 rounded-lg shadow-sm md:grid-cols-4">
            <Select isMulti placeholder="Warehouses" options={options.warehouses} onChange={(v) => setFilters({...filters, warehouse: v})} />
            <Select isClearable placeholder="Search Party" options={options.customers} onChange={(v) => setFilters({...filters, customer: v})} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, start: e.target.value})} />
            <input type="date" className="p-2 border rounded" onChange={(e) => setFilters({...filters, end: e.target.value})} />
            <button onClick={fetchReport} className="py-2 font-bold text-white transition bg-indigo-600 rounded md:col-span-4 hover:bg-indigo-700">Run Analysis</button>
          </div>

          {/* Data List */}
          <div className="space-y-3">
            {reportData.map((party) => (
              <div key={party._id} className="overflow-hidden bg-white border rounded shadow-sm">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(expandedId === party._id ? null : party._id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 text-indigo-600 bg-indigo-100 rounded-full"><FaUserTag /></div>
                    <div>
                      <h4 className="font-bold text-gray-800">{party.customerName}</h4>
                      <p className="text-xs text-gray-500">{party.mobile || 'No Mobile'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-gray-400 font-bold">Total Spent</p>
                      <p className="font-bold text-indigo-600">₹{party.grandTotal.toLocaleString()}</p>
                    </div>
                    {expandedId === party._id ? <FaChevronUp /> : <FaChevronDown />}
                  </div>
                </div>

                {expandedId === party._id && (
                  <div className="p-4 border-t bg-gray-50">
                    <table className="w-full text-sm">
                      <thead className="text-left text-gray-400 border-b">
                        <tr>
                          <th className="pb-2">Item Name</th>
                          <th className="pb-2 text-center">Qty</th>
                          <th className="pb-2 text-right">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {party.soldItems.map((item, i) => (
                          <tr key={i} className="border-b border-gray-100 last:border-0">
                            <td className="py-2 font-medium">{item.name} <span className="text-[10px] text-gray-400">({item.code})</span></td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 font-bold text-right">₹{item.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}