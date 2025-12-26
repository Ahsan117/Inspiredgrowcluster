import React, { useState ,useEffect} from "react";
import axios from "axios";

const SEND_OTP_API = "https://pos.inspiredgrow.in/vps/api/card/otp-send";
const VERIFY_OTP_API = "https://pos.inspiredgrow.in/vps/api/card/new/verify-otp";
const CREATE_CARD_API = "https://pos.inspiredgrow.in/vps/api/card/mobile-create";

export default function NewCardModal({ isOpen, onClose }) {
  const [cardNo, setCardNo] = useState("");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [otp, setOtp] = useState("");
  const [cotp, setCOtp] = useState("");
  const [step, setStep] = useState("form"); // form → otp → save
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const[cards,setCards]=useState([])

  useEffect(()=>{
    const fetchCardno=async()=>{
              try {
        const {data} = await axios.get('https://pos.inspiredgrow.in/vps/api/card/assigned',{
            headers:{
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        })
        console.log(data)
        setCards(data.card || []);
       console.log(data);
    } catch (error) {
        console.log(error);
    }
}

fetchCardno();
  },[])
  
  if (!isOpen) return null;

  // 🔹 Send OTP
  const handleSendOtp = async () => {
    setError("");
    setLoading(true);
    try {
      const {data}= await axios.post(SEND_OTP_API, { phone: phoneNo ,cardNo:cardNo,name:name});
      console.log(data);
      setStep("otp");
      setCOtp(data.otp); // Auto-fill OTP for testing/demo
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Verify OTP
  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);
    try {
        if(otp === cotp) {
        //   await axios.post(VERIFY_OTP_API, { phone: phoneNo, otp });
          setStep("save");
        }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Save New Card
  const handleSaveCard = async () => {
    setError("");
    setLoading(true);
    if(!cardNo || !name || !phoneNo) {
        setError("All fields are required");
        setLoading(false);
        return;
    }
    try {
      const payload = { cardNo, name, sector, houseNo, mobile: phoneNo };
      await axios.post(CREATE_CARD_API, payload);
      alert("✅ New card created successfully!");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create card");
    } finally {
      setLoading(false);
    }
  };

  return (
   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
  <div className="relative w-full max-w-md p-6 mx-4 bg-white shadow-xl rounded-2xl">
    {/* Close */}
    <button
      onClick={onClose}
      className="absolute text-gray-400 top-3 right-3 hover:text-gray-600"
    >
      ✖
    </button>

    <h2 className="mb-6 text-2xl font-bold text-center text-gray-800">
      Add New Card
    </h2>

    {error && (
      <div className="mb-4 text-sm text-center text-red-500">{error}</div>
    )}

    {/* Step 1: Fill Details */}
    {step === "form" && (
      <>
        <select onChange={(e) => setCardNo(e.target.value)} value={cardNo}
          name="card"
          className="w-full p-3 mb-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">Select Card</option>
          {cards.map((card) => (
            <option key={card._id} value={card.cardNo}>
              {card.cardNo}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 mb-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Sector"
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="w-full p-3 mb-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="House No"
          value={houseNo}
          onChange={(e) => setHouseNo(e.target.value)}
          className="w-full p-3 mb-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />
        <input
          type="text"
          placeholder="Mobile Number"
          value={phoneNo}
          onChange={(e) => setPhoneNo(e.target.value)}
          className="w-full p-3 mb-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        />

        <button
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full py-3 font-medium text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </>
    )}

    {/* Step 2: OTP Verification */}
    {step === "otp" && (
      <>
        <input
          type="text"
          placeholder="Enter OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 mb-3 border rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <button
          onClick={handleVerifyOtp}
          disabled={loading}
          className="w-full py-3 font-medium text-white transition-colors bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </>
    )}

    {/* Step 3: Save Card */}
    {step === "save" && (
      <>
        <p className="mb-4 text-center text-green-600">
          ✅ Mobile Verified! You can now save the card.
        </p>
        <button
          onClick={handleSaveCard}
          disabled={loading}
          className="w-full py-3 font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Card"}
        </button>
      </>
    )}
  </div>
</div>

  );
}
