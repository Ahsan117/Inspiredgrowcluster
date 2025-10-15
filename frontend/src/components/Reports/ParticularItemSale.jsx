// Updated /src/pages/StockReport.jsx
// Includes Navbar and Sidebar from your codebase (/src/components/Navbar.jsx and /src/components/Sidebar.jsx)
// Assumes App.js routes to this page, and Layout wraps it (or inline here for self-contained)

import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Your API utils
import Navbar from '../Navbar'; // Import existing Navbar
import Sidebar from '../Sidebar'; // Import existing Sidebar
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const StockReport = () => {
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ startDate: '2025-10-01', warehouseId: '' });
  const [sidebarOpen, setSidebarOpen] = useState(true); // For Sidebar toggle if needed

  useEffect(() => {
    fetchReport();
  }, [filters]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await axios.get('https://pos.inspiredgrow.in/vps/reports/stock-report', { params: filters });
      console.log('Stock report data:', res.data);  
      setData(res.data.data);
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Error fetching stock report:', err);
    }
    setLoading(false);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Chart config
  const chartData = {
    labels: data.slice(0, 10).map(d => d.itemName), // Top 10
    datasets: [{
      label: 'Quantity',
      data: data.slice(0, 10).map(d => d.quantity),
      backgroundColor: data.slice(0, 10).map(d => d.lowStock ? '#EF4444' : '#10B981'),
    }],
  };

  const options = {
    responsive: true,
    plugins: { legend: { position: 'top' }, title: { display: true, text: 'Top Stock Levels' } },
    scales: { y: { beginAtZero: true } },
  };

  if (loading) return (
    <div className="p-4">
      <Navbar /> {/* Always include Navbar */}
      <div className="flex">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 p-4">Loading stock report...</main>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar - Always visible */}
      <Navbar />

      {/* Main Layout with Sidebar */}
      <div className="flex">
        {/* Sidebar - Toggleable */}
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Toggle Sidebar Button if needed (e.g., in Navbar, but inline for demo) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 mb-4 bg-gray-200 rounded md:hidden"
          >
            Menu
          </button>

          <h1 className="mb-4 text-2xl font-bold">Stock Report</h1>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <input
              type="date"
              value={filters.startDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
              className="p-2 border rounded"
            />
            <button onClick={fetchReport} className="px-4 py-2 text-white bg-blue-500 rounded">Refresh</button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-white rounded shadow">Total Items: {summary.totalItems}</div>
            <div className="p-4 bg-white rounded shadow">Total Qty: {summary.totalQty}</div>
            <div className="p-4 bg-white rounded shadow">Total Value: ₹{summary.totalValue}</div>
            <div className="p-4 bg-red-100 rounded shadow">Low Stock: {summary.lowStockCount}</div>
          </div>

          {/* Chart */}
          <div className="mb-6">
            <Bar options={options} data={chartData} />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-200">
                  <th className="px-4 py-2 border">Item Name</th>
                  <th className="px-4 py-2 border">Code</th>
                  <th className="px-4 py-2 border">Warehouse</th>
                  <th className="px-4 py-2 border">Qty</th>
                  <th className="px-4 py-2 border">Alert Qty</th>
                  <th className="px-4 py-2 border">Low Stock</th>
                  <th className="px-4 py-2 border">Value (₹)</th>
                  <th className="px-4 py-2 border">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={row.lowStock ? 'bg-red-50' : ''}>
                    <td className="px-4 py-2 border">{row.itemName}</td>
                    <td className="px-4 py-2 border">{row.itemCode}</td>
                    <td className="px-4 py-2 border">{row.warehouse}</td>
                    <td className="px-4 py-2 border">{row.quantity}</td>
                    <td className="px-4 py-2 border">{row.alertQuantity}</td>
                    <td className="px-4 py-2 border">{row.lowStock ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 border">{row.value}</td>
                    <td className="px-4 py-2 border">{new Date(row.lastUpdated).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StockReport;