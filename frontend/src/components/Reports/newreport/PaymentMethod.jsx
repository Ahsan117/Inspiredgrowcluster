import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaMoneyBillWave, FaCreditCard, FaDownload, FaFileExcel, FaFilePdf, FaMagnifyingGlass, FaWarehouse } from "react-icons/fa6";
import Select from "react-select"; // Ensure react-select is installed
import axios from "axios";
import LoadingScreen from "../../../Loading";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function PaymentMethodReport() {
  const [data, setData] = useState({ posPayments: [], onlinePayments: [] });
  const [loading, setLoading] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [filters, setFilters] = useState({ start: "", end: "", warehouse: [] });
  
  const link = "https://pos.inspiredgrow.in/vps";

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${link}/api/warehouses?scope=mine`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const options = res.data.data.map(w => ({ label: w.warehouseName, value: w._id }));
      setWarehouseOptions(options);
    } catch (err) {
      console.error("Error fetching warehouses:", err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${link}/api/reports/payment-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          startDate: filters.start, 
          endDate: filters.end,
          warehouse:filters.warehouse.length > 0? filters.warehouse.map(w => w.value) : warehouseOptions.map(i=>i.value) // Send array of IDs
        }
      });
      setData(res.data.data);
    } catch (err) {
      console.error("Error fetching payment report:", err);
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    const combined = [
      ...data.posPayments.map(p => ({ Method: p._id, Transactions: p.transactionCount, Amount: p.totalAmount, Source: 'POS' })),
      ...data.onlinePayments.map(p => ({ Method: p._id, Transactions: p.transactionCount, Amount: p.totalAmount, Source: 'Online' }))
    ];
    const ws = XLSX.utils.json_to_sheet(combined);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Methods");
    XLSX.writeFile(wb, `Payment_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Payment Method Breakdown Report", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${filters.start || 'Start'} to ${filters.end || 'End'}`, 14, 28);
    doc.text(`Warehouses: ${filters.warehouse.length > 0 ? filters.warehouse.map(w => w.label).join(", ") : "All"}`, 14, 34);

    const tableData = [
      ...data.posPayments.map(p => [p._id || 'N/A', 'POS', p.transactionCount, `Rs. ${p.totalAmount.toLocaleString()}`]),
      ...data.onlinePayments.map(p => [p._id || 'N/A', 'Online', p.transactionCount, `Rs. ${p.totalAmount.toLocaleString()}`])
    ];

    autoTable(doc, {
      startY: 40,
      head: [['Payment Method', 'Source', 'Transactions', 'Total Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save("Payment_Method_Report.pdf");
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={true} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isSidebarOpen={true} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {loading && <LoadingScreen />}

          <header className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-800">Payment Method Breakdown</h1>
              <p className="text-sm tracking-wide text-gray-500">Reconcile payments across warehouses and sales channels</p>
            </div>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white uppercase transition bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                <FaFileExcel /> Excel
              </button>
              <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white uppercase transition bg-red-600 rounded-lg shadow-sm hover:bg-red-700">
                <FaFilePdf /> PDF
              </button>
            </div>
          </header>

          {/* Filter Bar */}
          <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border border-t-4 border-indigo-600 shadow-sm md:grid-cols-4 rounded-xl">
            <div className="md:col-span-1">
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                <FaWarehouse /> Warehouse
              </label>
              <Select 
                isMulti 
                options={warehouseOptions} 
                className="text-sm" 
                placeholder="All Warehouses"
                value={filters.warehouse}
                onChange={(v) => setFilters({...filters, warehouse: v})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">From Date</label>
              <input 
                type="date" 
                className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.start}
                onChange={(e) => setFilters({...filters, start: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">To Date</label>
              <input 
                type="date" 
                className="w-full p-2 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                value={filters.end}
                onChange={(e) => setFilters({...filters, end: e.target.value})}
              />
            </div>
            <button 
              onClick={fetchReport} 
              className="flex items-center justify-center gap-2 px-6 py-2.5 font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition uppercase text-xs"
            >
              <FaMagnifyingGlass /> Apply Filter
            </button>
          </div>

          {/* Top 3 POS Stats Grid */}
          <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
            {data.posPayments.length > 0 ? (
              data.posPayments.slice(0, 3).map((pay, i) => (
                <div key={i} className="p-5 transition bg-white border-b-4 border-indigo-500 shadow-sm rounded-xl hover:shadow-md">
                  <div className="flex items-center justify-between mb-2 text-gray-400">
                    <span className="text-[10px] font-bold uppercase">{pay._id || "Other"} (POS)</span>
                    {pay._id?.toLowerCase().includes('cash') ? <FaMoneyBillWave /> : <FaCreditCard />}
                  </div>
                  <h2 className="text-2xl font-black text-gray-800">₹{pay.totalAmount.toLocaleString()}</h2>
                  <p className="text-[10px] text-gray-400 font-medium">{pay.transactionCount} Transactions</p>
                </div>
              ))
            ) : (
              <div className="col-span-3 p-10 font-medium text-center text-gray-400 bg-white border border-dashed rounded-xl">
                No payment data found for selected criteria.
              </div>
            )}
          </div>

          {/* Detailed Tables */}
          
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <PaymentTable title="In-Store (POS) Payments" list={data.posPayments} color="border-orange-500" />
            <PaymentTable title="Online Store Payments" list={data.onlinePayments} color="border-blue-500" />
          </div>
        </main>
      </div>
    </div>
  );
}

function PaymentTable({ title, list, color }) {
  const grandTotal = list.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalTxns = list.reduce((sum, item) => sum + item.transactionCount, 0);

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 ${color} overflow-hidden flex flex-col`}>
      <div className="flex items-center justify-between p-4 font-bold text-gray-700 border-b bg-gray-50">
        <span>{title}</span>
        <span className="text-[10px] bg-gray-200 px-2 py-1 rounded text-gray-600">{list.length} Methods</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b bg-gray-50">
            <tr>
              <th className="p-3 text-left">Method</th>
              <th className="p-3 text-center">TXNs</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {list.length > 0 ? (
              list.map((item, idx) => (
                <tr key={idx} className="transition border-b hover:bg-gray-50">
                  <td className="p-3 font-medium text-gray-700">{item._id || "Unspecified"}</td>
                  <td className="p-3 text-center text-gray-500">{item.transactionCount}</td>
                  <td className="p-3 font-bold text-right text-gray-800">₹{item.totalAmount.toLocaleString()}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="p-6 italic text-center text-gray-400">No records found</td>
              </tr>
            )}
          </tbody>
          {list.length > 0 && (
            <tfoot className="font-black bg-gray-50">
              <tr className="border-t-2">
                <td className="p-3 text-gray-800 uppercase text-[10px]">Grand Total</td>
                <td className="p-3 text-center text-gray-800">{totalTxns}</td>
                <td className="p-3 text-base font-black text-right text-indigo-600">₹{grandTotal.toLocaleString()}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}