import React, { useEffect, useState } from "react";
import { FaTachometerAlt } from "react-icons/fa";
import { NavLink } from "react-router-dom";
import axios from "axios";
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import LoadingScreen from "../../Loading.jsx";

const ItemList = () => {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [offer, setOffer] = useState(0);
  const [sortOrder, setSortOrder] = useState(""); // ⬅️ for sorting

  // Sidebar responsiveness
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [window.innerWidth]);

  // Fetch items
  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${link}/api/card-setting`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setOffer(res.data[0].offerPercentage);

      const response = await axios.get(`${link}/api/items`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setItems(response.data.data.filter((item) => item.offer === true) || []);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Handle remove offer
  const handleRemoveOffer = async (id) => {
    try {
      await axios.put(
        `${link}/api/items/change-offer`,
        { items: [id] },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      fetchItems(); // Refresh the item list
    } catch (error) {
      console.error("Failed to remove item from offer:", error);
      alert("Failed to remove item");
    }
  };

  // Sorting logic
  const sortedItems = [...items].sort((a, b) => {
  const profitA = (a.salesPrice - (a.salesPrice * offer / 100)) - a.purchasePrice;
  const profitB = (b.salesPrice - (b.salesPrice * offer / 100)) - b.purchasePrice;

  if (sortOrder === "lowToHigh") {
    return profitA - profitB;
  } else if (sortOrder === "highToLow") {
    return profitB - profitA;
  }
  return 0; // default (no sorting)
});


  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-grow">
        <Sidebar isSidebarOpen={isSidebarOpen} />

        {/* Content */}
        <div className="flex flex-col flex-grow p-2 md:p-2">
          <header className="flex flex-col items-center justify-between p-4 rounded-md shadow lg:flex-row">
            <div className="flex items-center gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">
                Item List
              </h1>
              <span className="text-xs text-gray-600 sm:text-sm">
                View all available items
              </span>
            </div>

            <nav className="flex flex-wrap items-center justify-center mt-2 text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
              <NavLink
                to="/dashboard"
                className="flex items-center text-gray-700 no-underline hover:text-cyan-600"
              >
                <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" />
                Home
              </NavLink>
              <NavLink
                to="/items"
                className="text-gray-700 no-underline hover:text-cyan-600"
              >
                &gt; Items
              </NavLink>
            </nav>
          </header>

          {/* Filter */}
          <div className="flex items-center justify-end mb-3">
            <label className="mr-2 text-sm font-medium">Sort by:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="px-2 py-1 border rounded-md"
            >
              <option value="">Default</option>
              <option value="lowToHigh">Price: Low → High</option>
              <option value="highToLow">Price: High → Low</option>
            </select>
          </div>

          {/* Item Table */}
          <div className="p-4 mt-1 overflow-x-auto bg-white border-t-4 rounded-lg shadow-md border-cyan-500">
            {sortedItems.length === 0 ? (
              <p className="text-center text-gray-500">No items found</p>
            ) : (
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 border">#</th>
                    <th className="px-4 py-2 border">Item Name</th>
                    <th className="px-4 py-2 border">Item Code</th>
                    <th className="px-4 py-2 border">Purchase Price</th>
                    <th className="px-4 py-2 border">Sales Price</th>
                    <th className="px-4 py-2 border">Profit / Loss</th>
                    <th className="px-4 py-2 border">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item, index) => {
                    const discountedPrice =
                      item.salesPrice - (item.salesPrice * offer) / 100;
                    const profit = discountedPrice - item.purchasePrice;

                    return (
                      <tr key={item._id} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-center border">
                          {index + 1}
                        </td>
                        <td className="px-4 py-2 border">{item.itemName}</td>
                        <td className="px-4 py-2 border">{item.itemCode}</td>
                        <td className="px-4 py-2 border">
                          ₹{item.purchasePrice}
                        </td>
                        <td className="px-4 py-2 border">₹{item.salesPrice}</td>

                        {/* Profit/Loss */}
                        <td
                          className={`px-4 py-2 border font-semibold ${
                            profit >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ₹{profit.toFixed(2)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-2 text-center border">
                          <button
                            onClick={() => handleRemoveOffer(item._id)}
                            className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
                          >
                            Exclude
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemList;
