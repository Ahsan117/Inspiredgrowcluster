import React from 'react'
import { useState,useRef,useEffect } from 'react'
import { App } from "@capacitor/app";
import { useLocation,useNavigate } from 'react-router-dom'

export default function POS1({
    selectedWarehouse,
    setSelectedWarehouse,
    warehouses,
    invoiceCode,
    selectedCustomer,
    setSelectedCustomer,
    customers,
    orderPaymentMode,
    setActiveTab
}) {

   const location=useLocation()
    const navigate=useNavigate()
      const initialLocationRef = useRef(location);
  
    // Hardware back
    useEffect(() => {
      const backHandler = App.addListener('backButton', () => {
        
        navigate("/dashboard")
      });
  
      return () => backHandler.remove();
    }, []);
  
    // Intercept swipe back or browser back
    useEffect(() => {
    const handlePopState = () => {
      // Whenever browser back is triggered
      navigate("/dashboard");
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate]);
  
  return (
    
 <div className="w-full min-h-screen p-4 bg-gradient-to-br from-cyan-50 to-white">
  {/* Card Container */}
  <div className="p-5 space-y-6 bg-white shadow-2xl rounded-2xl">
    {/* Header */}
    <h1 className="text-xl font-semibold text-gray-800">Create Invoice</h1>

    {/* Warehouse + Invoice Code */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <select
        className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:outline-none"
        value={selectedWarehouse}
        onChange={(e) => setSelectedWarehouse(e.target.value)}
      >
        <option value="">Select Warehouse</option>
        {warehouses
          .filter(w => w.status === "Active")
          .map((w) => (
            <option key={w._id} value={w._id}>
              {w.warehouseName}
            </option>
          ))}
      </select>

      <input
        className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:outline-none"
        readOnly
        value={invoiceCode}
        placeholder="Invoice Code"
      />
    </div>

    {/* Customer + Payment */}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <select
        className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:outline-none"
        value={selectedCustomer}
        onChange={(e) => setSelectedCustomer(e.target.value)}
      >
        <option value="">Select Customer</option>
        {customers.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
          </option>
        ))}
      </select>

      <input
        className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:outline-none"
        readOnly
        value={
          orderPaymentMode
            ? `Payment Method: ${orderPaymentMode.charAt(0).toUpperCase() + orderPaymentMode.slice(1)}`
            : ""
        }
        placeholder="Payment Method"
      />
    </div>

    {/* Action Button */}
    <div className="flex justify-end">
      <button
        onClick={() => setActiveTab("pos2")}
        className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white transition-all shadow-md bg-cyan-600 rounded-xl hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 disabled:opacity-50"
        disabled={!selectedWarehouse || !selectedCustomer}
      >
        Next
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  </div>
</div>


  )
}
