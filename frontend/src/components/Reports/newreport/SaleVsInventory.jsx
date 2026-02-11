import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaScaleBalanced, FaArrowTrendUp, FaBoxesStacked, FaDownload, FaFilePdf, FaFileExcel } from "react-icons/fa6";
import Select from "react-select";
import axios from "axios";
import LoadingScreen from "../../../Loading";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export default function SalesVsInventoryReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [options, setOptions] = useState({ warehouses: [] });
  const [filters, setFilters] = useState({ warehouse: [], start: "", end: "" });

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
      const res = await axios.get(`${link}/api/reports/salevsinventory-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { 
          warehouse: filters.warehouse.length > 0 ? filters.warehouse.map(w => w.value) : options.warehouses.map(w => w.value),
          startDate: filters.start,
          endDate: filters.end
        }
      });
      setReportData(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // --- Export Logic ---

  const exportToExcel = () => {
    const formattedData = reportData.map(item => ({
      "Product Name": item.itemName,
      "Category": item.category,
      "Units Sold": item.unitsSold,
      "Available Stock": item.availableStock,
      "Stock:Sales Ratio": `${item.varianceRatio}x`,
      "Inventory Status": item.status
    }));

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory Variance");
    XLSX.writeFile(wb, `Sales_vs_Inventory_${new Date().toLocaleDateString()}.xlsx`);
    setShowExport(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Sales vs. Inventory Variance Report", 14, 15);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Period: ${filters.start || 'Start'} to ${filters.end || 'End'}`, 14, 27);

    autoTable(doc, {
      startY: 35,
      head: [['Product', 'Sold', 'Stock', 'Ratio', 'Status']],
      body: reportData.map(item => [
        item.itemName,
        item.unitsSold,
        item.availableStock,
        `${item.varianceRatio}x`,
        item.status
      ]),
      headStyles: { fillColor: [8, 145, 178] }, // cyan-600
      theme: 'grid'
    });

    doc.save("Sales_vs_Inventory_Report.pdf");
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
              <h1 className="text-2xl font-bold tracking-tight text-gray-800">Sales vs. Inventory Variance</h1>
              <p className="text-sm text-gray-500">Identify overstock and stockout risks based on sales velocity</p>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center gap-2 px-4 py-2 font-bold text-white transition rounded shadow-md bg-cyan-600 hover:bg-cyan-700"
              >
                <FaDownload /> Export Report
              </button>
              {showExport && (
                <div className="absolute right-0 z-50 mt-2 bg-white border rounded shadow-xl w-44">
                  <button onClick={exportToExcel} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFileExcel className="text-green-600" /> Excel (.xlsx)
                  </button>
                  <button onClick={exportToPDF} className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left hover:bg-gray-100">
                    <FaFilePdf className="text-red-600" /> PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Filter Bar */}
          <div className="grid items-end grid-cols-1 gap-4 p-5 mb-8 bg-white border-t-4 rounded-lg shadow-sm md:grid-cols-4 border-cyan-600">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">Warehouses</label>
              <Select isMulti placeholder="All Warehouses" options={options.warehouses} onChange={(v)=>setFilters({...filters, warehouse: v})} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">From Date</label>
              <input type="date" className="w-full p-2 mt-1 border rounded outline-none focus:ring-2 focus:ring-cyan-100" onChange={(e)=>setFilters({...filters, start: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase">To Date</label>
              <input type="date" className="w-full p-2 mt-1 border rounded outline-none focus:ring-2 focus:ring-cyan-100" onChange={(e)=>setFilters({...filters, end: e.target.value})} />
            </div>
            <button onClick={fetchReport} className="py-2 font-bold text-white transition-colors rounded bg-cyan-600 hover:bg-cyan-700">Compare Variance</button>
          </div>

          {/* Data Table */}
          <div className="overflow-hidden bg-white border rounded-lg shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-gray-600 border-b bg-gray-50">
                <tr>
                  <th className="p-4 text-left">Product</th>
                  <th className="p-4 text-center">Units Sold</th>
                  <th className="p-4 text-center">Available Stock</th>
                  <th className="p-4 text-center">Stock:Sales Ratio</th>
                  <th className="p-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.length > 0 ? reportData.map((item, i) => (
                  <tr key={i} className="transition border-b hover:bg-cyan-50/30">
                    <td className="p-4">
                      <div className="font-bold text-gray-800">{item.itemName}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-mono">{item.category}</div>
                    </td>
                    <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 font-bold text-emerald-600">
                            <FaArrowTrendUp className="text-xs" /> {item.unitsSold}
                        </div>
                    </td>
                    <td className="p-4 font-bold text-center text-gray-700">
                        {item.availableStock}
                    </td>
                    <td className="p-4 text-center">
                        <span className="px-2 py-1 font-mono text-xs bg-gray-100 rounded">{item.varianceRatio}x</span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === 'Understocked' ? 'bg-red-100 text-red-700' : 
                        item.status === 'Overstocked' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="p-10 italic text-center text-gray-400">
                      No data found for the selected filters. Click "Compare Variance" to load data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}