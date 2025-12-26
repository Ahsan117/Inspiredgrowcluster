import React, { useState } from "react";
import Select from "react-select";
import axios from "axios";

const ChangeStatusModal = ({ orderId, currentStatus, onClose, fetchOrders }) => {
  const [status, setStatus] = useState(currentStatus);
  const statusOptions = [
    { value: "Pending", label: "Pending", icon: "⏳", color: "orange" },
    { value: "Confirmed", label: "Confirmed", icon: "✓", color: "blue" },
    { value: "Processing", label: "Processing", icon: "⚙️", color: "purple" },
    { value: "Shipped", label: "Shipped", icon: "🚚", color: "indigo" },
    { value: "Rider Assigned", label: "Rider Assigned", icon: "🛵", color: "yellow" },
    { value: "Van Assigned", label: "Van Assigned", icon: "🛵", color: "blue" },
    { value: "Out for Delivery", label: "Out for Delivery", icon: "🛵", color: "teal" },
    { value: "Delivered", label: "Delivered", icon: "✅", color: "green" },
    { value: "Cancelled", label: "Cancelled", icon: "❌", color: "red" },
    { value: "Returned", label: "Returned", icon: "🔄", color: "gray" },
    { value: "Order Placed", label: "Order Placed", icon: "✅", color: "green" },
    { value: "Arrived at Location", label: "Arrived at Location", icon: "✅", color: "purple" },
  ];

  const updateStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const {data} =await axios.get(`https://pos.inspiredgrow.in/vps/api/pos/invoice-code`, {
        headers:{
          Authorization:`Bearer ${localStorage.getItem("token")}`
        }
      });
      
      const year = new Date().getFullYear();
      let nextCode;
      
      if (data) {
        // data = "SL/2025/00019240"
        const parts = data.split("/");  // ["SL", "2025", "00019240"]
        const seq = parseInt(parts[2], 10); 
        const padded = String(seq + 1).padStart(7, "0");
        nextCode = `SL/${year}/${padded}`;
      } else {
        // First invoice of the year
        nextCode = `SL/${year}/0000001`;
      }


      
      await axios.put(
        `https://pos.inspiredgrow.in/vps/api/orders/update-status/${orderId}`,
        { status,nextCode,fromPos:false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchOrders(); // refresh order list
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="p-6 bg-white rounded-lg shadow-lg w-80">
        <h2 className="mb-4 text-lg font-semibold">Change Order Status</h2>
        <Select
          options={statusOptions}
          value={statusOptions.find(opt => opt.value === status)}
          onChange={(opt) => setStatus(opt.value)}
        />
        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
            onClick={updateStatus}
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeStatusModal;
