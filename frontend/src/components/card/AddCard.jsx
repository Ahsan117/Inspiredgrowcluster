import React, { useState, useEffect } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import axios from "axios";

const OTP_API = "https://pos.inspiredgrow.in/vps/api/card/otp-send"; // replace with your API

const CardFormPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [cardNo, setCardNo] = useState("");
 
  const [error, setError] = useState("");




  const handleSubmit = async () => {
    if (!cardNo ) {
      return setError("Card No is required");
    }
    console.log({ cardNo });
    try {
      await axios.post("https://pos.inspiredgrow.in/vps/api/card", {
        cardNo,
      });
      alert("Data saved successfully!");
      setCardNo("");
     
      setError("");
    } catch (err) {
      setError("Failed to save data");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <h1 className="mb-6 text-2xl font-bold">Card Form</h1>

          {error && <p className="mb-4 text-red-500">{error}</p>}

          <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
            {/* Card No */}
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Card No *</label>
              <input
                type="text"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>

              <button
                onClick={handleSubmit}
                className="w-full px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
              >
                Save
              </button>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardFormPage;
