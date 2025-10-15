import React, { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import axios from "axios";
import { FixedSizeList as List } from "react-window";
import { InfiniteLoader } from "react-window-infinite-loader";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import * as XLSX from "xlsx";

const PremiumSalesReport = () => {
  const link = "https://pos.inspiredgrow.in/vps";
  const navigate = useNavigate();

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [allLoadedItems, setAllLoadedItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isItemLoadedMap, setIsItemLoadedMap] = useState({});
  const [options, setOptions] = useState({ warehouses: [], customers: [] });
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState("all");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const fetchSales = async () => {
    try {
      const res = await axios.get(`${link}/api/pos/club`, { headers });
      const data = res.data.data || [];
      setAllLoadedItems(data);
      setFilteredItems(data);
      setTotalCount(data.length);

      const loadedMap = {};
      data.forEach((_, i) => (loadedMap[i] = true));
      setIsItemLoadedMap(loadedMap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadOptionsAndSales = async () => {
      try {
        const warehousesRes = await axios.get(`${link}/api/warehouses?scope=mine`, { headers });
        setOptions({
          warehouses: [{ label: "All", value: "all" }, ...warehousesRes.data.data.map(w => ({ label: w.warehouseName, value: w._id }))],
          customers: [{ label: "All", value: "all" }, { label: "Premium Customer", value: "premium_customer" }]
        });
        await fetchSales();
      } catch (err) {
        console.error(err);
      }
    };
    loadOptionsAndSales();
  }, []);

  const applyFilter = () => {
    let filtered = [...allLoadedItems];
    if (selectedWarehouse !== "all") filtered = filtered.filter(sale => sale.warehouse?._id === selectedWarehouse);
    if (selectedCustomer !== "all") filtered = filtered.filter(sale => sale.premiumCard !== null);
    if (dateRange.from && dateRange.to) {
      const from = new Date(dateRange.from).setHours(0, 0, 0, 0);
      const to = new Date(dateRange.to).setHours(23, 59, 59, 999);
      filtered = filtered.filter(sale => {
        const saleDate = new Date(sale.saleDate).getTime();
        return saleDate >= from && saleDate <= to;
      });
    }
    setFilteredItems(filtered);
    setTotalCount(filtered.length);
    const loadedMap = {};
    filtered.forEach((_, i) => (loadedMap[i] = true));
    setIsItemLoadedMap(loadedMap);
  };

  const computeSummary = useMemo(() => {
    let totalInvoice = 0,
      totalProfit = 0,
      totalLoss = 0;
    filteredItems.forEach(sale => {
      const totalPurchase = (sale.items || []).reduce((sum, it) => sum + ((it.item?.purchasePrice || 0) * (it.quantity || 1)), 0);
      const totalSelling = sale.totalAmount || sale.grandTotal || sale.amount || 0;
      totalInvoice += totalSelling;
      if (totalSelling - totalPurchase >= 0) totalProfit += totalSelling - totalPurchase;
      else totalLoss += totalPurchase - totalSelling;
    });
    return { totalInvoice, totalProfit, totalLoss };
  }, [filteredItems]);

  const exportToExcel = () => {
    if (!filteredItems.length) return alert("No data to export.");
    const data = filteredItems.map(sale => {
      const totalPurchase = (sale.items || []).reduce((sum, it) => sum + ((it.item?.purchasePrice || 0) * (it.quantity || 1)), 0);
      const totalSelling = sale.totalAmount || sale.grandTotal || sale.amount || 0;
      return {
        "Sale Code": sale.saleCode,
        "Customer": sale.customer?.customerName || "N/A",
        "Date": new Date(sale.createdAt).toLocaleDateString(),
        "Total Purchase": totalPurchase.toFixed(2),
        "Total Bill": totalSelling.toFixed(2),
        "Profit/Loss": (totalSelling - totalPurchase).toFixed(2)
      };
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Premium Sales");
    XLSX.writeFile(workbook, "premium-sales.xlsx");
  };

  // Mobile-friendly row as card
  const Row = ({ index, style }) => {
    const sale = filteredItems[index];
    if (!sale) return <div style={style} className="p-3 text-gray-500 border-b">Loading...</div>;

    const totalPurchase = (sale.items || []).reduce((s, it) => s + ((it.item?.purchasePrice || 0) * (it.quantity || 1)), 0);
    const totalSelling = sale.totalAmount || sale.grandTotal || sale.amount || 0;
    const profitLoss = totalSelling - totalPurchase;

    return (
      <div style={style} className="p-3 mx-1 mb-2 bg-white border-b rounded shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold">Sale:</span>
          <span className="text-blue-700 truncate cursor-pointer" onClick={() => navigate(`/view-sale?id=${sale._id}&source=${sale.source}`)}>{sale.saleCode}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-semibold">Customer:</span>
          <span className="truncate">{sale.customer?.customerName || "N/A"}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-semibold">Date:</span>
          <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-semibold">Total Purchase:</span>
          <span>₹{totalPurchase.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span className="text-sm font-semibold">Total Bill:</span>
          <span>₹{totalSelling.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm font-semibold">Profit/Loss:</span>
          <span className={profitLoss >= 0 ? "text-green-600" : "text-red-600"}>₹{profitLoss.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1 w-full overflow-y-auto bg-gray-100">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <main className="w-full p-2 md:p-4">

          {/* Filters */}
          <div className="flex flex-col flex-wrap gap-2 mb-4 sm:flex-row">
            <div className="w-full sm:w-1/2 md:w-1/4 ">
              <label className="block mb-1 text-sm font-semibold">Warehouse</label>
              <Select
                options={options.warehouses}
                value={options.warehouses.find(o => o.value === selectedWarehouse)}
                onChange={option => setSelectedWarehouse(option.value)}
                className="z-50 w-full"
              />
            </div>
            <div className="w-full sm:w-1/2 md:w-1/4">
              <label className="block mb-1 text-sm font-semibold">Customer</label>
              <Select
                options={options.customers}
                value={options.customers.find(o => o.value === selectedCustomer)}
                onChange={option => setSelectedCustomer(option.value)}
                className="w-full"
              />
            </div>
            <div className="w-full sm:w-1/2 md:w-1/4">
              <label className="block mb-1 text-sm font-semibold">From Date</label>
              <input type="date" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} className="w-full px-2 py-1 border rounded"/>
            </div>
            <div className="w-full sm:w-1/2 md:w-1/4">
              <label className="block mb-1 text-sm font-semibold">To Date</label>
              <input type="date" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} className="w-full px-2 py-1 border rounded"/>
            </div>
            <button className="px-4 py-2 mt-2 text-white bg-blue-600 rounded hover:bg-blue-700" onClick={applyFilter}>Apply Filter</button>
            <button className="px-4 py-2 mt-2 text-white bg-green-600 rounded hover:bg-green-700" onClick={exportToExcel}>Export as Excel</button>
          </div>

          {/* Summary */}
          <div className="flex flex-col gap-2 mb-4 sm:flex-row">
            <div className="flex-1 px-3 py-2 text-sm text-center bg-green-100 rounded">Total Invoice: ₹{computeSummary.totalInvoice.toFixed(2)}</div>
            <div className="flex-1 px-3 py-2 text-sm text-center bg-blue-100 rounded">Total Profit: ₹{computeSummary.totalProfit.toFixed(2)}</div>
            <div className="flex-1 px-3 py-2 text-sm text-center bg-red-100 rounded">Total Loss: ₹{computeSummary.totalLoss.toFixed(2)}</div>
          </div>

          {/* Mobile-friendly list */}
          <div className="overflow-x-auto bg-white rounded-lg shadow-sm">
  {/* Table wrapper with fixed height for scrolling */}
  <div className="max-h-[60vh] overflow-y-auto mt-2">
    <table className="min-w-full text-sm divide-y divide-gray-200">
      <thead className="sticky top-0 z-20 text-white bg-blue-500">
        <tr>
          <th className="px-2 py-2 text-center">#</th>
          <th className="px-2 py-2 text-center">Sale Code</th>
          <th className="px-2 py-2 text-center">Customer</th>
          <th className="px-2 py-2 text-center">Date</th>
          <th className="px-2 py-2 text-center">Total Purchase</th>
          <th className="px-2 py-2 text-center">Total Bill</th>
          <th className="px-2 py-2 text-center">Profit/Loss</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {filteredItems.map((sale, index) => {
          const totalPurchase = (sale.items || []).reduce(
            (s, it) => s + ((it.item?.purchasePrice || 0) * (it.quantity || 1)),
            0
          );
          const totalSelling = sale.totalAmount || sale.grandTotal || sale.amount || 0;
          const profitLoss = totalSelling - totalPurchase;

          return (
            <tr key={sale._id} className="hover:bg-gray-50">
              <td className="px-2 py-1 text-center">{index + 1}</td>
              <td
                className="px-2 py-1 text-center text-blue-700 truncate cursor-pointer"
                onClick={() => navigate(`/view-sale?id=${sale._id}&source=${sale.source}`)}
              >
                {sale.saleCode}
              </td>
              <td className="px-2 py-1 text-center truncate">{sale.customer?.customerName || "N/A"}</td>
              <td className="px-2 py-1 text-center">{new Date(sale.createdAt).toLocaleDateString()}</td>
              <td className="px-2 py-1 text-center">{totalPurchase.toFixed(2)}</td>
              <td className="px-2 py-1 text-center">{totalSelling.toFixed(2)}</td>
              <td className={`px-2 py-1 text-center ${profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {profitLoss.toFixed(2)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
</div>



        </main>
      </div>
    </div>
  );
};

export default PremiumSalesReport;
