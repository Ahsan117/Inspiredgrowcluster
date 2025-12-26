import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import {
  FileText,
  TrendingUp,
  Package,
  ShoppingBag,
  RotateCcw,
  ArrowRightCircle,
  Search,
} from 'lucide-react';

const ReportsList = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const reports = [
    { name: 'Stock Report', path: '/reports/stock', icon: Package, color: 'bg-blue-100 text-blue-700' },
    { name: 'Sales Report', path: '/reports/sales-report', icon: TrendingUp, color: 'bg-green-100 text-green-700' },
    { name: 'Purchase Report', path: '/reports/purchase-report', icon: ShoppingBag, color: 'bg-yellow-100 text-yellow-700' },
    { name: 'Purchase Return Report', path: '/reports/purchase-return', icon: RotateCcw, color: 'bg-orange-100 text-orange-700' },
    { name: 'Sales Return Report', path: '/reports/sales-return', icon: RotateCcw, color: 'bg-red-100 text-red-700' },
    { name: 'Bill Wise Profit', path: '/reports/bill-wise-report', icon: FileText, color: 'bg-indigo-100 text-indigo-700' },
    { name: 'Item Wise Profit', path: '/reports/item-wise-profit-report', icon: FileText, color: 'bg-purple-100 text-purple-700' },
    { name: 'Stock Transfer Report', path: '/reports/stock-transfer-report', icon: FileText, color: 'bg-teal-100 text-teal-700' },
    { name: 'Customer Sale Report', path: '/reports/customer-sale-report', icon: FileText, color: 'bg-cyan-100 text-cyan-700' },
    { name: 'Sale Items Report', path: '/reports/sale-items-report', icon: FileText, color: 'bg-cyan-100 text-cyan-700' },
    { name: 'Item Stock (Date Wise)', path: '/reports/items-stock-history-report', icon: FileText, color: 'bg-pink-100 text-pink-700' },
    { name: 'Stock Comparison', path: '/reports/item-compare', icon: FileText, color: 'bg-lime-100 text-lime-700' },
    { name: 'Customer Report', path: '/reports/customer', icon: FileText, color: 'bg-gray-100 text-gray-700' },
    { name: 'Seller Point Report', path: '/reports/seller-point', icon: FileText, color: 'bg-amber-100 text-amber-700' },
    { name: 'Club Bill Report', path: '/reports/club-bill', icon: FileText, color: 'bg-emerald-100 text-emerald-700' },
    { name: 'All Transactions', path: '/reports/all-transactions', icon: FileText, color: 'bg-slate-100 text-slate-700' },
    { name: 'Expense Report', path: '/reports/expense', icon: FileText, color: 'bg-rose-100 text-rose-700' },
  ];

  // 🔍 Filter reports based on search term
  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar  isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1">
       
        <div className="">
          <Sidebar  isSidebarOpen={isSidebarOpen} />
        </div>

        

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto sm:p-6">
          {/* Mobile Header */}
          <div className="flex items-center justify-between mb-6 md:hidden">
            <h1 className="text-xl font-bold">Reports Dashboard</h1>
           
          </div>

          {/* Desktop Header */}
          <div className="items-center justify-between hidden mb-6 md:flex">
            <h1 className="text-2xl font-bold">Reports Dashboard</h1>
          </div>

          {/* Description */}
          <p className="mb-4 text-sm text-gray-600 sm:text-base">
            Select any report below to view detailed data and analytics.
          </p>

          {/* 🔍 Search Bar */}
          <div className="relative max-w-md mb-6">
            <Search className="absolute text-gray-400 left-3 top-3" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..."
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
          </div>

          {/* Reports Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredReports.length > 0 ? (
              filteredReports.map((report, i) => (
                <div
                  key={i}
                  onClick={() => navigate(report.path)}
                  className="flex items-center justify-between p-4 transition-transform transform bg-white border border-gray-200 shadow-sm cursor-pointer hover:scale-105 rounded-2xl sm:p-5 group active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${report.color}`}>
                      <report.icon size={26} />
                    </div>
                    <div className="flex flex-col">
                      <h2 className="text-sm font-semibold sm:text-base">
                        {report.name}
                      </h2>
                      <p className="text-xs text-gray-500 sm:text-sm">
                        View detailed report
                      </p>
                    </div>
                  </div>
                  <ArrowRightCircle
                    className="text-gray-400 transition-colors group-hover:text-blue-600"
                    size={22}
                  />
                </div>
              ))
            ) : (
              <div className="py-10 text-center text-gray-500 col-span-full">
                No reports found for “{searchTerm}”.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ReportsList;
