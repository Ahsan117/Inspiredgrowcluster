import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

const API_URL = "https://pos.inspiredgrow.in/vps/api/last-otp";

const CardDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [result, setResult] = useState({});

  // Fetch last OTP data
  const fetchCards = async () => {
    try {
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setResult(res.data.data || {});
    } catch (err) {
      console.error("Failed to fetch otp info:", err);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />

        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
        <header className="flex flex-col p-4 mb-6 bg-white rounded-lg shadow md:flex-row md:items-center md:justify-between">
  <h1 className="text-2xl font-bold text-gray-700">OTP Dashboard</h1>

  <button
    onClick={fetchCards}
    className="px-4 py-2 mt-3 text-white bg-blue-600 rounded-lg md:mt-0 hover:bg-blue-700"
  >
    🔄 Refresh
  </button>
</header>


          {/* Previous Info */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <h2 className="p-4 text-lg font-bold border-b">
              Previous OTP Details
            </h2>
            
            <table className="w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">Card No</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Phone</th>
                  <th className="p-2 border">OTP</th>
                  <th className="p-2 border">Purpose</th>
                  <th className="p-2 border">Date</th>
                </tr>
              </thead>

              <tbody>
                <tr className="text-center border-t">
                  <td className="p-2 border">{result.cardNo || "-"}</td>
                  <td className="p-2 border">{result.name || "-"}</td>
                  <td className="p-2 border">{result.phoneNumber || "-"}</td>
                  <td className="p-2 border text-red-600 font-bold">
                    {result.otp || "-"}
                  </td>
                  <td className="p-2 border">
                    {result.purpose || "-"}
                  </td>
                  <td className="p-2 border">
                    {result.createdAt
                      ? new Date(result.createdAt).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardDashboard;
