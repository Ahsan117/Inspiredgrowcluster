import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt } from "react-icons/fa";
import { BiChevronRight } from "react-icons/bi";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
import Select from "react-select";
import axios from "axios";
import CreatePurchaseModal from "./PurchaseModal.jsx";
export default function StockAnalyzer() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [warehouse, setWarehouse] = useState(null);
  const [months, setMonths] = useState(3);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [warehouses, setWarehouses] = useState([]);
  useEffect(()=>{
   
     const fetchWarehouses = async () => {
        
       const token = localStorage.getItem("token");
       if (!token) {
         console.log("No token found redirecting...");
         return;
       }
       setLoading(true);
       try {
         const isElevated = ["admin", "ca", "saleanalyst"]
     .includes((localStorage.getItem("role") || "").toLowerCase());
   
   const response = await axios.get("https://pos.inspiredgrow.in/vps/api/warehouses", {
     headers: { Authorization: `Bearer ${token}` },
     ...(isElevated ? {} : { params: { scope: "mine" } })
   });
      console.log(response);
         if (response.data.data) {
           const newwarehouse = [
             { label: "All", value: "all" },
             ...response.data.data.map(warehouse => ({
               label: warehouse.warehouseName,
               value: warehouse._id,
             }))
           ];
           setWarehouses(newwarehouse);
         }
         
       } catch (error) {
         alert(error.message);
       } finally {
         setLoading(false);
       }
     };
     fetchWarehouses();
  },[])

  // API Call
  const fetchData = async () => {
    if (!warehouse) {
      setError("Please select a warehouse");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await axios.get("https://pos.inspiredgrow.in/vps/api/stock/analyse",
       { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: {
          warehouseId: warehouse,
          months,
        },
      });
      console.log(res.data)
      setData(res.data.itemsSummary || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };


 

  const handleSave = (purchaseData) => {
    console.log("✅ Purchase Saved:", purchaseData);
    alert("Purchase Saved! Check console for data.");
    // 👉 here you could send to your backend API
  };
  

  return (
    <div className="flex flex-col">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="box-border flex min-h-screen">
        <div className="w-auto">
          <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
        <div className="flex flex-col w-full p-2 mx-auto overflow-x-auto md:p-2">
          {/* Header */}
          <header className="flex flex-col items-center justify-between px-2 py-2 mb-2 bg-gray-100 rounded-md shadow md:flex-row">
            <div className="flex items-baseline gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">
                Stock Analyzer
              </h1>
              <span className="text-xs text-gray-600 sm:text-sm">
                Average items required based on sales
              </span>
            </div>
            <nav className="flex flex-wrap items-center justify-center text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
              <NavLink
                to="/dashboard"
                className="flex items-center text-gray-700 no-underline hover:text-cyan-600"
              >
                <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" />
                Home
              </NavLink>
              <BiChevronRight className="mx-1 sm:mx-2" />
              <NavLink
                to="/stock-analyzer"
                className="text-gray-700 no-underline hover:text-cyan-600"
              >
                Stock Analyzer
              </NavLink>
            </nav>
          </header>
            
            {
            showPurchaseModal && (
              <CreatePurchaseModal
                  isOpen={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        warehouseName={warehouses.find(wh => wh.value === warehouse)}
        items={data}
        onSave={handleSave}
              />
            )}
          {/* Filters */}
          <div className="p-4 mt-3 bg-white border-t-4 rounded-md shadow-md border-cyan-500">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block font-semibold text-gray-700">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <Select
                  options={warehouses}
                  onChange={(selectedOption) =>
                    setWarehouse(selectedOption.value)
                  }
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">
                  Months to Consider
                </label>
                <input
                  type="number"
                  min="1"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full px-4 py-2 text-white rounded-md bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50"
                >
                  {loading ? "Analyzing..." : "🔍 Analyze"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-4">
  <button
    onClick={() => setShowPurchaseModal(true)}
    className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700"
  >
    ➕ Create Purchase
  </button>
</div>

          {/* Error Message */}
          {error && (
            <div className="p-2 mt-4 text-red-600 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300 shadow-sm">
              <thead className="bg-gray-200">
                <tr>
                  {[
                    "Item",
                    "Total Sold",
                    "Working Days",
                    "Avg per Sale",
                    "Avg per Day",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-sm font-medium text-left border"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-4 text-center text-gray-500 border"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : data.length <= 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="p-4 text-center text-gray-500 border"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr className="bg-gray-100" key={item._id}>
                      <td className="px-2 py-1 border">{item.itemName}</td>
                      <td className="px-2 py-1 border">{item.totalSold}</td>
                      <td className="px-2 py-1 border">{item.workingDays}</td>
                      <td className="px-2 py-1 border">{item.avgPerSale}</td>
                      <td className="px-2 py-1 border">{item.avgPerDay}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
