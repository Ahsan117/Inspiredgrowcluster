import React, { useEffect, useState } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import axios from "axios";

const API_BASE = "https://pos.inspiredgrow.in/vps/api";

const CardTablePage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [cards, setCards] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  const [selectedCard, setSelectedCard] = useState(null);
  const [walletTxns, setWalletTxns] = useState([]);

  // Assign form states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sector, setSector] = useState("");
  const [details, setDetails] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [serverOtp, setServerOtp] = useState("");
  const [error, setError] = useState("");

  // Remark form states
  const [remark, setRemark] = useState("");

  // Warehouse form state
  const [warehouse, setWarehouse] = useState("");

  useEffect(() => {
    fetchCards();
    fetchWarehouses();
  }, []);

  const fetchCards = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/card`);
      console.log("Fetched cards:", data.cards);
      setCards(data.cards);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await axios.get(`https://pos.inspiredgrow.in/vps/api/warehouses?scope=mine`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Fetched warehouses:", data.data);
      setWarehouses(data.data || []);
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
    }
  };

  const fetchWalletTransactions = async (cardNo) => {
    try {
      const { data } = await axios.get(`${API_BASE}/card/wallet/${cardNo}`);
      setWalletTxns(data.transactions || []);
      setShowWalletModal(true);
    } catch (err) {
      console.error(err);
      setWalletTxns([]);
      setShowWalletModal(true);
    }
  };

  const openAssignModal = (card) => {
    setSelectedCard(card);
    setName("");
    setMobile("");
    setSector("");
    setDetails("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setServerOtp("");
    setError("");
    setShowAssignModal(true);
  };

  const openRemarkModal = (card) => {
    setSelectedCard(card);
    setRemark("");
    setShowRemarkModal(true);
  };

  const openWarehouseModal = (card) => {
    setSelectedCard(card);
    setWarehouse("");
    setShowWarehouseModal(true);
  };

  const handleSendOTP = async () => {
    if (!mobile) return setError("Mobile number is required");
    try {
      const { data } = await axios.post(`${API_BASE}/card/otp-send`, { phone: mobile });
      if (data.status !== 200) throw new Error("Failed to send OTP");
      setServerOtp(data.otp);
      setOtpSent(true);
      setError("");
      alert("OTP sent successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to send OTP");
    }
  };

  const handleVerifyOTP = () => {
    if (!otp) return setError("Enter OTP");
    if (otp === serverOtp) {
      setOtpVerified(true);
      setError("");
      alert("OTP verified successfully!");
    } else {
      setError("Invalid OTP");
    }
  };

  const handleAssignSave = async () => {
    if (!otpVerified) return setError("Verify OTP first!");
    try {
      await axios.post(`${API_BASE}/card/assign-info`, {
        cardNo: selectedCard.cardNo,
        name,
        mobile,
        sector,
        details,
      });
      alert("Card assigned successfully!");
      setShowAssignModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to save data");
    }
  };

  const handleRemarkSave = async () => {
    try {
      await axios.post(`${API_BASE}/card/assign-remark`, {
        cardNo: selectedCard.cardNo,
        remark,
      });
      alert("Remark added successfully!");
      setShowRemarkModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to save remark");
    }
  };

  const handleWarehouseSave = async () => {
    if (!warehouse) return setError("Select warehouse");
    console.log("Selected warehouse ID:", warehouse);
    try {
      await axios.post(`${API_BASE}/card/assign-warehouse`, {
        cardNo: selectedCard.cardNo,
        warehouseId: warehouse, // send warehouse _id
      });
      alert("Warehouse assigned successfully!");
      setShowWarehouseModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to assign warehouse");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <h1 className="mb-6 text-2xl font-bold">Card Table</h1>

          <table className="w-full bg-white border border-collapse border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Card No</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Mobile</th>
                <th className="p-2 border">Sector</th>
                <th className="p-2 border">Details</th>
                <th className="p-2 border">Remark</th>
                
                <th className="p-2 border">Warehouse</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card._id}>
                  <td
                    className="p-2 text-blue-600 border cursor-pointer hover:underline"
                    onClick={() => fetchWalletTransactions(card.cardNo)}
                  >
                    {card.cardNo}
                  </td>
                  <td className="p-2 border">{card.name || "-"}</td>
                  <td className="p-2 border">{card.mobile || "-"}</td>
                  <td className="p-2 border">{card.sector || "-"}</td>
                  <td className="p-2 border">{card.details || "-"}</td>
                  <td className="p-2 border">
                    {card.remark?.length > 0 ? (
                      <ul className="text-left list-disc list-inside">
                        {card.remark.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2 border">{card.warehouse?.warehouseName || "-"}</td>
                  <td className="p-2 space-x-2 border">
                    <button
                      onClick={() => openAssignModal(card)}
                      className="px-3 py-1 text-white bg-blue-500 rounded"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => openRemarkModal(card)}
                      className="px-3 py-1 text-white bg-green-500 rounded"
                    >
                      Add Remark
                    </button>
                    <button
                      onClick={() => openWarehouseModal(card)}
                      className="px-3 py-1 text-white bg-purple-500 rounded"
                    >
                      Assign Warehouse
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Warehouse Modal */}
          {showWarehouseModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="p-6 bg-white rounded w-96">
                <h2 className="mb-4 text-lg font-bold">Assign Warehouse</h2>
                {error && <p className="mb-2 text-red-500">{error}</p>}

                <select
                  className="w-full p-2 mb-2 border rounded"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.warehouseName}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowWarehouseModal(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWarehouseSave}
                    className="px-3 py-1 text-white bg-purple-600 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

        
          
          
          
          
          
          
          
          {/* Existing Wallet Modal, Assign Modal & Remark Modal remain same */} {/* Wallet Transactions Modal */}
          
          {/* Wallet Transactions Modal */}
{showWalletModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="p-6 bg-white rounded w-[600px] max-h-[80vh] overflow-y-auto">
      <h2 className="mb-4 text-lg font-bold">
        Wallet Transactions for {selectedCard?.cardNo}
      </h2>

      {walletTxns.length > 0 ? (
        <>
          <table className="w-full border border-collapse border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Txn ID</th>
                <th className="p-2 border">Type</th>
                <th className="p-2 border">Amount</th>
                <th className="p-2 border">Sale Code</th>
                <th className="p-2 border">Date</th>
              </tr>
            </thead>
            <tbody>
              {walletTxns.map((txn) => (
                <tr key={txn._id}>
                  <td className="p-2 border">{txn.transactionId}</td>
                  <td className="p-2 border">{txn.type}</td>
                  <td className="p-2 border">{txn.amount}</td>
                  <td className="p-2 border">
                    {txn.type === "Debited" ? txn.saleCode || "-" : "-"}
                  </td>
                  <td className="p-2 border">
                    {new Date(txn.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}

              {/* Show Total at the bottom */}
              <tr className="font-bold bg-gray-100">
                <td className="p-2 text-right border" colSpan={2}>
                  Total Balance
                </td>
                <td className="p-2 border">
                  {walletTxns.reduce((acc, txn) => {
                    return txn.type === "Credited"
                      ? acc + txn.amount
                      : acc - txn.amount;
                  }, 0)}
                </td>
                <td className="p-2 border" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p>No transactions found</p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={() => setShowWalletModal(false)}
          className="px-3 py-1 border rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

           
           
           
            {/* Existing Assign Modal & Remark Modal here... */} {/* (Keep your Assign and Remark modal code unchanged) */} {showAssignModal && ( <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"> <div className="p-6 bg-white rounded w-96"> <h2 className="mb-4 text-lg font-bold">Assign Card</h2> {error && <p className="mb-2 text-red-500">{error}</p>} <input type="text" placeholder="Name" className="w-full p-2 mb-2 border rounded" value={name} onChange={(e) => setName(e.target.value)} /> <div className="flex gap-2 mb-2"> <input type="text" placeholder="Mobile" className="flex-1 p-2 border rounded" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={otpSent} /> {!otpSent && ( <button onClick={handleSendOTP} className="px-3 py-1 text-white rounded bg-cyan-500" > Send OTP </button> )} </div> {otpSent && !otpVerified && ( <div className="flex gap-2 mb-2"> <input type="text" placeholder="Enter OTP" className="flex-1 p-2 border rounded" value={otp} onChange={(e) => setOtp(e.target.value)} /> <button onClick={handleVerifyOTP} className="px-3 py-1 text-white bg-green-500 rounded" > Verify </button> </div> )} <input type="text" placeholder="Sector" className="w-full p-2 mb-2 border rounded" value={sector} onChange={(e) => setSector(e.target.value)} /> <textarea placeholder="Details" className="w-full p-2 mb-2 border rounded" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /> <div className="flex justify-end gap-2"> <button onClick={() => setShowAssignModal(false)} className="px-3 py-1 border rounded" > Cancel </button> {otpVerified && ( <button onClick={handleAssignSave} className="px-3 py-1 text-white bg-blue-600 rounded" > Save </button> )} </div> </div> </div> )} {/* Remark Modal */} {showRemarkModal && ( <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"> <div className="p-6 bg-white rounded w-96"> <h2 className="mb-4 text-lg font-bold">Add Remark</h2> <textarea placeholder="Remark" className="w-full p-2 mb-2 border rounded" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} /> <div className="flex justify-end gap-2"> <button onClick={() => setShowRemarkModal(false)} className="px-3 py-1 border rounded" > Cancel </button> <button onClick={handleRemarkSave} className="px-3 py-1 text-white bg-green-600 rounded" > Save </button> </div> </div> </div> )}
        </div>
      </div>
    </div>
  );
};

export default CardTablePage;
