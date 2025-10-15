import React, { useState, useEffect } from "react";
import { FaTrash, FaPlus } from "react-icons/fa";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import axios from "axios";

const API_URL = "https://pos.inspiredgrow.in/vps/api/items"; 
const OFFER_API = "https://inspiredgrow.in/vps/api/items/change-offer";

const OfferItemsDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [offerItems, setOfferItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch items with offer
  const fetchOfferItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}?offer=true`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const f=response.data.data.filter(item=>item.offer===false);
      console.log(f);
      setOfferItems(f || []);
    } catch (error) {
      console.error("Failed to fetch offer items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOfferItems();
  }, []);

  // Remove item from offer
  const handleRemoveOffer = async (id) => {
    try {
      await axios.put(
        OFFER_API,
        { item: id },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      setOfferItems((prev) => prev.filter((i) => i._id !== id));
      alert("Item removed from offer");
    } catch (error) {
      console.error("Failed to remove item from offer:", error);
      alert("Failed to remove item");
    }
  };

  // Add item back to offer
  const handleAddOffer = async (id) => {
    try {
      await axios.put(
        OFFER_API,
        { items: [...offerItems.map((i) => i._id), id] },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchOfferItems();
      alert("Item added to offer");
    } catch (error) {
      console.error("Failed to add item to offer:", error);
      alert("Failed to add item");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />

        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <h1 className="mb-6 text-2xl font-bold">Offer Items</h1>

          <div className="overflow-x-auto bg-white rounded-lg shadow">
            {loading ? (
              <p className="p-4 text-gray-500">Loading...</p>
            ) : offerItems.length > 0 ? (
              <table className="w-full border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2 border">Item Code</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {offerItems.map((item) => (
                    <tr key={item._id} className="text-center border-t">
                      <td className="p-2 border">{item.itemCode}</td>
                      <td className="p-2 border">{item.itemName}</td>
                      <td className="p-2 border">
                        <button
                          className="flex items-center justify-center gap-1 px-2 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                          onClick={() => handleRemoveOffer(item._id)}
                        >
                          <FaTrash /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-gray-500">No items with offers</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferItemsDashboard;
