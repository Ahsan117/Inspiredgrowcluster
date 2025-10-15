import React, { useState, useEffect } from "react";
import axios from "axios";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

const API_URL = "https://pos.inspiredgrow.in/vps/api/card-setting";

const CardDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Form states
  const [newCardAmount, setNewCardAmount] = useState(0);
  const [cardUsedAmount, setCardUsedAmount] = useState(0);
  const [cardPercentage, setCardPercentage] = useState(0);

  // Old card data
  const [result, setResult] = useState({});

  // Fetch old cards
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const res = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setResult(res.data[0] || {});
      } catch (err) {
        console.error("Failed to fetch cards:", err);
      }
    };
    fetchCards();
  }, []);

 

  // Save new card info
  const handleSave = async () => {
    try {
      const body = {
        newCardAmount,
        cardUsedAmount,
        cardPercentage,
      };

      await axios.put(API_URL, body, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      alert("Card info saved successfully!");
      setNewCardAmount(0);
      setCardUsedAmount(0);
      setCardPercentage(0);

      // Refresh cards
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setResult(res.data[0] || {});
    } catch (error) {
      console.error("Failed to save card:", error);
      alert("Failed to save card");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <header className="flex flex-col p-4 mb-6 bg-white rounded-lg shadow md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-700">Card Dashboard</h1>
          </header>

          {/* Form */}
         <div className="p-4 mb-6 bg-white rounded-lg shadow">
  <h2 className="mb-4 text-lg font-semibold">Add / Update Card Info</h2>
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    {/* New Card Amount Input */}
    <div className="flex flex-col">
  <label htmlFor="newCardAmount" className="mb-1 text-sm font-medium text-gray-700">
    New Card Amount
  </label>
  <input
    id="newCardAmount"
    type="number"
    placeholder="New Card Amount"
    value={newCardAmount}
    onChange={(e) => {
      let value = e.target.value;

      // Remove leading zeros if more than 1 digit
      if (value.length > 1 && value.startsWith("0")) {
        value = value.replace(/^0+/, "");
      }

      setNewCardAmount(value ? Number(value) : "");
    }}
    className="p-2 border rounded"
  />
</div>


    {/* Card Use Amount Input */}
   <div className="flex flex-col">
  <label htmlFor="cardUsedAmount" className="mb-1 text-sm font-medium text-gray-700">
    Card Used Amount
  </label>
  <input
    id="cardUsedAmount"
    type="number"
    placeholder="Card Use Amount"
    value={cardUsedAmount}
    onChange={(e) => {
      let value = e.target.value;
      // Remove leading zeros
      if (value.length > 1 && value.startsWith("0")) {
        value = value.replace(/^0+/, "");
      }
      setCardUsedAmount(value ? Number(value) : "");
    }}
    className="p-2 border rounded"
  />
</div>


    {/* Card Percentage Input */}
    <div className="flex flex-col">
  <label htmlFor="cardPercentage" className="mb-1 text-sm font-medium text-gray-700">
    Card Percentage
  </label>
  <input
    id="cardPercentage"
    type="text"
    placeholder="Card Percentage"
    value={cardPercentage}
    onChange={(e) => {
      let value = e.target.value;

      // Remove any non-digit characters
      value = value.replace(/\D/g, "");

      // Remove leading zeros
      if (value.length > 1 && value.startsWith("0")) {
        value = value.replace(/^0+/, "");
      }

      // Limit value to 100
      if (Number(value) > 100) {
        value = "100";
      }

      setCardPercentage(value ? Number(value) : "");
    }}
    className="p-2 bg-gray-100 border rounded"
  />
</div>



    
  </div>
  <button
    onClick={handleSave}
    className="px-4 py-2 mt-4 text-white bg-green-500 rounded hover:bg-green-600"
  >
    Save
  </button>
</div>

          {/* Previous Info */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <h2 className="p-4 text-lg font-bold border-b">Previous Card Info</h2>
            <table className="w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">New Card Amount</th>
                  <th className="p-2 border">Card Use Amount</th>
                  <th className="p-2 border">Bill Percentage</th>
                  <th className="p-2 border">Date</th>
                </tr>
              </thead>
              <tbody>
                    <tr  className="text-center border-t">
                      <td className="p-2 border">₹{result.newCardAmount}</td>
                      <td className="p-2 border">₹{result.cardUsedAmount}</td>
                      <td className="p-2 border">{result.cardPercentage}%</td>
                      <td className="p-2 border">
                        {new Date(result.updatedAt).toLocaleString()}
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
