import React, { useState ,useEffect} from "react";
import axios from "axios";
import NewCardModal from "./NewCardModal";
const FETCH_CARD_API = "https://pos.inspiredgrow.in/vps/api/card/fetch"; // new API to fetch card details
const SEND_OTP_API = "https://pos.inspiredgrow.in/vps/api/card/apply/otp";
const VERIFY_OTP_API = "https://pos.inspiredgrow.in/vps/api/card/apply/verify-otp";
const API_URL = "https://pos.inspiredgrow.in/vps/api/card-setting";


 const percent=0.05
export default function CardOtpModal({ isOpen, onClose, sa }) {
  const [cardNo, setCardNo] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("input");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [showNewCard, setShowNewCard] = useState(false);
   const [resendTimer, setResendTimer] = useState(60);
   const [result1, setResult1] = useState({});
   const [creditAmount,setCreditAmount]=useState(0)
   


   
    useEffect(() => {
      
    const fetchC = async () => {
      try {
       const cre = await axios.get("https://pos.inspiredgrow.in/vps/api/card/get-credit-amount", {
  params: { saleCode: sa.saleCode },  // query params go here
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
});
        console.log("cre:", cre.data);
        setCreditAmount(Number(cre.data.creditAmount));
        const res = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log("res:", res.data);  
        setResult1(res.data[0] || {});
      } catch (err) {
        console.error("Failed to fetch cards:", err);
      }
    };
    fetchC();
  }, []);

   
   useEffect(() => {
    let interval = null;
    if (step === "otp" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prevTime => prevTime - 1);
      }, 1000);
    } else if (resendTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);


  

  // if (!isOpen) return null;

  

  // 🔹 Fetch card details
  const handleFetchDetails = async () => {
    setError("");
    setLoading(true);
    try {
      let payload ={}
      if(phoneNo.length < 10){
         payload={cardNo: phoneNo}; 
      }
      else{
         payload={ phone: phoneNo }; 
      }
      // const payload = { cardNo, phone: phoneNo };
      const res = await axios.post(FETCH_CARD_API, payload);
      setResult(res.data.card);
      setCardNo(res.data.card.cardNo || cardNo);
      setPhoneNo(res.data.card.mobile || phoneNo);
      console.log("Fetched card details:", res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch details");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Send OTP
  const handleSendOtp = async () => { 
    setError("");
    setLoading(true);
    try {
      const payload = { cardNo:result.cardNo, phone: result.mobile ,amount:sa.totalAmount  ,percent:result1.offerPercentage/100};
      console.log("Sending OTP with payload:", payload);
      await axios.post(SEND_OTP_API, payload);
      if(step !== "otp")
      setStep("otp");
    else setResendTimer(60);
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
      const payload = { cardNo, phone: phoneNo, otp };
      console.log("Verifying OTP with payload:", payload);
      const res = await axios.post(VERIFY_OTP_API, payload);
      setCardNo(res.data.card.cardNo || cardNo);
      setPhoneNo(res.data.card.mobile || phoneNo);
      setResult(res.data.card);
      setStep("result");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  useEffect(()=>console.log("result changed:",result),[result])
  const handleSubmit=async()=>{
    const payload={
        cardNo,
        creditAmount:Number(creditAmount).toFixed(2),
        debitAmount:sa.totalAmount > result1.cardUsedAmount ?Number(Math.min(result.wallet,sa.totalAmount*(result1.billPercentage/100))?.toFixed(2)) : 0,
        saleId:sa._id,
        totalAmount:sa.totalAmount,
    }
    try {
      console.log("Submitting card application with payload:", payload);
        const res = await axios.put("https://pos.inspiredgrow.in/vps/api/card/apply/exclusive-discount", payload);
        console.log("Card applied successfully:", res.data);
       onClose();
    } catch (error) {
        console.error("Error applying card:", error);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="relative w-full max-w-md p-8 bg-white shadow-xl rounded-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute text-gray-500 top-3 right-3 hover:text-gray-700"
        >
          ✖
        </button>

        <h2 className="mb-6 text-2xl font-bold text-center">
          Card Verification
        </h2>
         {
        showNewCard && (
          <NewCardModal
            isOpen={showNewCard}
            onClose={() => setShowNewCard(false)}
          />
        )}
        {error && <div className="mb-4 text-center text-red-500">{error}</div>}

        {/* Step 1: Input */}
        {step === "input"  && (
          <>
          {
            sa.totalAmount > result1.newCardAmount &&(
                  <button
  onClick={() => setShowNewCard(true)}
  className="w-full py-2 mt-4 mb-4 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50"
>
  ➕ Add New Card
</button>
            )
          }
        
            <input
              type="text"
              placeholder="Enter Phone Number/Card Number"
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              className="w-full p-3 mb-4 border rounded-lg"
            />

            <button
              onClick={handleFetchDetails}
              disabled={loading}
              className="w-full py-3 text-white transition bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              {loading ? "Fetching..." : "Fetch Details"}
            </button>

            {result && (
              <div className="p-4 mt-6 border rounded-lg bg-gray-50">
                <p><span className="font-bold">Card No:</span> {result.cardNo}</p>
                <p><span className="font-bold">Name:</span> {result.name?.customerName || "-"}</p>
                <p><span className="font-bold">Phone:</span> {result.mobile}</p>
                <p><span className="font-bold">Balance:</span> ₹{result.wallet}</p>
                <p>
                  <span className="font-bold">Amount to be Credited:</span> ₹
                  {(creditAmount).toFixed(2)}
                </p>
                 
                  
                     <p>
                  <span className="font-bold">Amount to be Reduced:</span>
                  {
                    sa.totalAmount > result1.cardUsedAmount ? Math.min(result.wallet,sa.totalAmount*(result1.billPercentage/100))?.toFixed(2) || 0 : `Amount should be greater than ${result1.cardUsedAmount} to use Rs.${result.wallet} on bill`
                  }
                </p>
                  
                 
                <button
                  onClick={() => {handleSendOtp();}}
                  disabled={loading}
                  className="w-full py-3 mt-4 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 2: OTP */}
       {step === "otp" && (
  <>
    <input
      type="text"
      placeholder="Enter OTP"
      value={otp}
      onChange={(e) => setOtp(e.target.value)}
      className="w-full p-3 mb-4 border rounded-lg"
    />
    <button
      onClick={handleVerifyOtp}
      disabled={loading}
      className="w-full py-3 text-white transition bg-green-600 rounded-lg hover:bg-green-700"
    >
      {loading ? "Verifying..." : "Verify OTP"}
    </button>
    
    {/* --- RESEND OTP OPTION START --- */}
    <div className="mt-4 text-center">
      {resendTimer > 0 ? (
        <p className="text-sm text-gray-500">
          Resend OTP in <span className="font-bold text-red-500">{resendTimer}s</span>
        </p>
      ) : (
        <button
           onClick={handleSendOtp}
          disabled={loading} // Optional: Disable while loading verification/resend
          className="text-sm font-semibold text-blue-600 transition hover:text-blue-800 disabled:opacity-50"
        >
          Resend OTP
        </button>
      )}
    </div>
    {/* --- RESEND OTP OPTION END --- */}

  </>
)}

        {/* Step 3: Result */}
        {step === "result" && result && (
          <div className="pt-4 mt-6 border-t">
            <p className="mb-2 text-lg font-semibold text-green-600">
              ✅ Verification Successful
            </p>
            <p><span className="font-bold">Card No:</span> {result.cardNo}</p>
            <p><span className="font-bold">Name:</span> {result.name?.customerName || "-"}</p>
            <p><span className="font-bold">Phone No:</span> {result.mobile}</p>
            <p><span className="font-bold">Amount Credited:</span> ₹{(creditAmount).toFixed(2)}</p>
            <p>
              <span className="font-bold">Debit from Bill:</span>{" "}
              {sa.totalAmount > result1.cardUsedAmount
                ? `₹${Math.min(result.wallet,sa.totalAmount*(result1.billPercentage/100)).toFixed(2) || 0}`
                : `Amount should be greater than ${result1.cardUsedAmount} to use Rs.${result.wallet} on bill`}
            </p>

            <button
              onClick={() => handleSubmit()}
              className="w-full py-3 mt-4 text-white transition bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}
