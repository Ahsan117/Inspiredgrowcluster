import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { 
  FaTags, FaPercent, FaFileInvoiceDollar, FaDownload, 
  FaFileExcel, FaFilePdf, FaStore, FaGlobe 
} from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import LoadingScreen from "../../../Loading";

export default function DiscountImpactReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [data, setData] = useState({ online: {}, pos: {}, summary: {} });
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ start: "", end: "", warehouse: [] });

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
      const res = await axios.get(`${link}/api/reports/discount-impact-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          startDate: filters.start, 
          endDate: filters.end, 
          warehouse: filters.warehouse.map(w => w.value) 
        }
      });
      setData(res.data.data);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  // --- Export Functions ---
  const exportExcel = () => {
    const reportArray = [
      { Channel: "Online Store", Orders: data.online.orderCount, Gross: data.online.totalGrossRevenue, Discount: data.online.totalDiscountGiven, Net: data.online.totalGrossRevenue - data.online.totalDiscountGiven },
    //   { Channel: "POS In-Store", Orders: data.pos.orderCount, Gross: data.pos.totalGrossRevenue, Discount: data.pos.totalDiscountGiven, Net: data.pos.totalGrossRevenue - data.pos.totalDiscountGiven },
    //   { Channel: "TOTAL", Orders: data.online.orderCount + data.pos.orderCount, Gross: data.summary.totalGross, Discount: data.summary.totalDiscount, Net: data.summary.totalNet }
    ];
    const ws = XLSX.utils.json_to_sheet(reportArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Coupon Discount Impact");
    XLSX.writeFile(wb, "Coupon_Discount_Impact_Report.xlsx");
    setShowExport(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Coupon Discount Impact Analysis", 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${filters.start || 'All Time'} to ${filters.end || 'Today'}`, 14, 28);

    autoTable(doc, {
      startY: 35,
      head: [['Channel', 'Orders', 'Gross Revenue', 'Discount Given', 'Net Revenue']],
      body: [
        ['Online Store', data.online.orderCount, `Rs.${data.online.totalGrossRevenue}`, `Rs.${data.online.totalDiscountGiven}`, `Rs.${data.online.totalGrossRevenue - data.online.totalDiscountGiven}`],
        // ['POS Store', data.pos.orderCount, `Rs.${data.pos.totalGrossRevenue}`, `Rs.${data.pos.totalDiscountGiven}`, `Rs.${data.pos.totalGrossRevenue - data.pos.totalDiscountGiven}`],
        // ['TOTAL', data.online.orderCount + data.pos.orderCount, `Rs.${data.summary.totalGross}`, `Rs.${data.summary.totalDiscount}`, `Rs.${data.summary.totalNet}`]
      ],
      foot: [['', '', 'Impact %', `${data.summary.impactPercentage}%`, '']],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] } // Red-600
    });

    doc.save("Coupon_Discount_Impact_Report.pdf");
    setShowExport(false);
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
              <h1 className="text-2xl font-bold tracking-tight text-gray-800">Coupon Discount Impact Analysis</h1>
              <p className="text-sm text-gray-500">Measure revenue leakages from promotions and bill discounts</p>
            </div>

            <div className="relative">
              <button onClick={() => setShowExport(!showExport)} className="flex items-center gap-2 px-4 py-2 font-bold text-gray-700 transition bg-white border rounded shadow-sm hover:bg-gray-50">
                <FaDownload /> Export
              </button>
              {showExport && (
                <div className="absolute right-0 z-50 mt-2 bg-white border rounded shadow-xl w-44">
                  <button onClick={exportExcel} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100"><FaFileExcel className="text-green-600" /> Excel (.xlsx)</button>
                  <button onClick={exportPDF} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100"><FaFilePdf className="text-red-600" /> PDF (.pdf)</button>
                </div>
              )}
            </div>
          </header>

          {/* Impact Overview Stats */}
          {data.summary.totalGross !== undefined && (
            <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-4">
              <div className="p-5 bg-white border-l-4 border-red-500 shadow-sm rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase">Discount Impact</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-black text-red-600">{data.summary.impactPercentage}%</span>
                  <FaPercent className="text-red-300" />
                </div>
              </div>
              <div className="p-5 bg-white border-l-4 border-gray-800 shadow-sm rounded-xl">
                <p className="text-[10px] font-black text-gray-400 uppercase">Revenue Lost</p>
                <h2 className="mt-1 text-3xl font-black text-gray-800">₹{data.summary.totalDiscount?.toLocaleString()}</h2>
              </div>
              <div className="p-5 bg-white border-l-4 shadow-sm rounded-xl border-emerald-500 md:col-span-2">
                <p className="text-[10px] font-black text-gray-400 uppercase">Total Net Revenue</p>
                <div className="flex items-end justify-between">
                  <h2 className="mt-1 text-3xl font-black text-emerald-600">₹{data.summary.totalNet?.toLocaleString()}</h2>
                  <span className="text-xs italic text-gray-400">from {data.online.orderCount } orders</span>
                </div>
              </div>
            </div>
          )}

          {/* Filter Section */}
          <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border rounded-lg shadow-sm md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="text-[10px] font-bold text-gray-500 uppercase">Warehouses</label>
              <Select isMulti options={options.warehouses} placeholder="All Locations" onChange={(v) => setFilters({...filters, warehouse: v})} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">Start Date</label>
              <input type="date" className="w-full p-2 mt-1 text-sm border rounded outline-none focus:ring-2 focus:ring-red-100" onChange={(e) => setFilters({...filters, start: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase">End Date</label>
              <input type="date" className="w-full p-2 mt-1 text-sm border rounded outline-none focus:ring-2 focus:ring-red-100" onChange={(e) => setFilters({...filters, end: e.target.value})} />
            </div>
            <button onClick={fetchReport} className="py-2 font-bold text-white transition-colors bg-red-600 rounded shadow-lg hover:bg-red-700 shadow-red-100">Apply Filter</button>
          </div>

        
           
            {/* Online Channel */}
            <div className="overflow-hidden bg-white border shadow-sm rounded-xl">
              <div className="flex items-center justify-between p-4 border-b bg-blue-50">
                <h3 className="flex items-center gap-2 font-bold text-blue-800"><FaGlobe /> Online Store</h3>
                <span className="px-2 py-1 text-xs font-bold text-blue-800 bg-blue-200 rounded-full">{data.online.orderCount || 0} Orders</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Gross Sales:</span>
                  <span className="font-bold">₹{data.online.totalGrossRevenue?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between p-2 text-sm text-red-600 rounded bg-red-50">
                  <span>Total Discount:</span>
                  <span className="font-bold">- ₹{data.online.totalDiscountGiven?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-4 text-lg font-black text-gray-800 border-t">
                  <span>Net Collection:</span>
                  <span>₹{(data.online.totalGrossRevenue - data.online.totalDiscountGiven)?.toLocaleString()}</span>
                </div>
              </div>
            </div>
         
        </div>
      </div>
    </div>
  );
}