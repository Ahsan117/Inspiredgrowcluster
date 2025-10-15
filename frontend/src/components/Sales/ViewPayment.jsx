import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';

const ViewPayment = () => {
      const link="https://pos.inspiredgrow.in/vps"
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const saleId = queryParams.get('saleId');

  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState({
    customer: '',
    saleCode: '',
    saleDate: '',
    totalAmount: 0,
    totalPaid: 0,
    payments: []
  });

  useEffect(() => {
    if (!saleId) {
      alert("Invalid sale ID");
      navigate('/sale-list');
      return;
    }
    fetchPaymentDetails();
  }, [saleId, navigate]);

  const fetchPaymentDetails = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("No token found, please log in");
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Fetch payment details
      const paymentResponse = await axios.get(`${link}/api/payments/${saleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch invoices to get the correct totalAmount
      const invoicesResponse = await axios.get(`${link}/api/pos/club`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!paymentResponse.data || !invoicesResponse.data) {
        throw new Error("No data returned from API");
      }

      // Find the matching invoice by saleId
      const matchingInvoice = invoicesResponse.data.data.find(invoice => invoice._id.toString() === saleId);
      if (!matchingInvoice) {
        throw new Error("Invoice not found for this sale ID");
      }

      // Use the amount from the invoices API as totalAmount
      const totalAmount = matchingInvoice.amount || 0;
        console.log(paymentResponse.data)
      setPaymentData({
        customer: paymentResponse.data.customer || "N/A",
        saleCode: paymentResponse.data.saleCode || "N/A",
        saleDate: paymentResponse.data.saleDate && !isNaN(new Date(paymentResponse.data.saleDate).getTime())
          ? new Date(paymentResponse.data.saleDate).toLocaleDateString()
          : "N/A",
        totalAmount: totalAmount,
        totalPaid: paymentResponse.data.totalPaid || 0,
        payments: paymentResponse.data.payments || []
      });
    } catch (error) {
      console.error("Error fetching payment details:", error);
      alert(`Could not load payment details: ${error.message}`);
      navigate('/sale-list');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDelete = (payment) => {
    alert("Delete functionality not implemented. Please add a backend endpoint to handle payment deletion.");
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  // Calculate due amount, allowing negative values for overpayments
  const dueAmount = paymentData.totalAmount - paymentData.totalPaid;

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50">
      <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Payments</h2>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3">
          <div>
            <h3 className="font-semibold text-gray-700">Customer Details</h3>
            <p>{paymentData.customer}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Sales Details</h3>
            <p>Invoice #: {paymentData.saleCode}</p>
            <p>Date: {paymentData.createdAt}</p>
            <p>Grand Total: ₹{paymentData.totalAmount.toFixed(2)}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700">Payment</h3>
            <p>Paid Amount: ₹{paymentData.totalPaid.toFixed(2)}</p>
            <p>Due Amount: ₹{dueAmount.toFixed(2)}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 shadow-sm">
            <thead className="text-white bg-cyan-500">
              <tr>
                <th className="px-4 py-2 text-sm font-medium text-left border">#</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Payment Date</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Payment</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Payment Type</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Payment Note</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Created by</th>
                <th className="px-4 py-2 text-sm font-medium text-left border">Action</th>
              </tr>
            </thead>
            <tbody>
              {paymentData.payments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-4 text-center text-gray-500 border">
                    No payments available
                  </td>
                </tr>
              ) : (
                paymentData.payments.map((payment, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 border">{index + 1}</td>
                    <td className="px-4 py-2 border">
                      {payment.paymentDate && !isNaN(new Date(payment.paymentDate).getTime())
                        ? new Date(payment.paymentDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="px-4 py-2 border">₹{payment.paymentAmount.toFixed(2)}</td>
                    <td className="px-4 py-2 border">{payment.paymentType || "Cash"}</td>
                    <td className="px-4 py-2 border">{payment.paymentNote || "N/A"}</td>
                    <td className="px-4 py-2 border">{payment.creatorName || "N/A"}</td>
                    <td className="flex px-4 py-2 space-x-2 border">
                      <button onClick={handlePrint} className="text-blue-500 hover:text-blue-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path>
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(payment)} className="text-red-500 hover:text-red-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4h4a1 1 0 011 1v1H9V4a1 1 0 011-1zm-5 4h12"></path>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewPayment;