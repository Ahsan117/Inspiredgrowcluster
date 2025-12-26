import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingScreen from '../../Loading.jsx';

const PurchaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPurchaseDetail = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.log("No token found redirecting...");
        navigate("/");
        return;
      }
      try {
        const response = await axios.get(`https://pos.inspiredgrow.in/vps/api/purchases/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("API Response:", response.data);
        if (response.data.success) {
          setPurchase(response.data.data);
        } else {
          setError("Failed to fetch purchase details: " + response.data.message);
        }
      } catch (err) {
        console.error("API Error:", err);
        setError(err.message || "An error occurred while fetching purchase details");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseDetail();
  }, [id, navigate]);

  if (loading) return <LoadingScreen />;
  if (error) return <div className="p-4 text-red-500">{error}</div>;
  if (!purchase) return <div className="p-4">No purchase data available</div>;

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="mb-4 text-2xl font-semibold">Purchase Details - {purchase.purchaseCode || "N/A"}</h1>
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2">
          <div>
            <p><strong>Purchase Date:</strong> {new Date(purchase.purchaseDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {purchase.status || "N/A"}</p>
            <p><strong>Reference No:</strong> {purchase.referenceNo || "N/A"}</p>
            <p><strong>Warehouse:</strong> {purchase.warehouse?.warehouseName || "N/A"}</p>
            <p><strong>Supplier:</strong> {purchase.supplier?.supplierName || purchase.supplier?.email || "No supplier"}</p>
            <p><strong>Created By:</strong> {purchase.createdByModel} {purchase.createdBy?.name || `${purchase.createdBy?.FirstName} ${purchase.createdBy?.LastName}` || "N/A"}</p>
            <p><strong>Note:</strong> {purchase.note || "N/A"}</p>
          </div>
          <div>
            <p><strong>Grand Total:</strong> ₹{(purchase.grandTotal || 0).toFixed(2)}</p>
            <p><strong>Other Charges:</strong> ₹{(purchase.otherCharges || 0).toFixed(2)}</p>
            <p><strong>Discount on All:</strong> ₹{(purchase.discountOnAll || 0).toFixed(2)}</p>
            <p><strong>Paid Amount:</strong> ₹{(purchase.payments?.length > 0 ? purchase.payments[0].amount : 0).toFixed(2)}</p>
            <p><strong>Payment Status:</strong> {purchase.payments?.length > 0
              ? (purchase.grandTotal || 0) === (purchase.payments[0].amount || 0) ? "Paid"
              : (purchase.grandTotal || 0) > (purchase.payments[0].amount || 0) ? "Pending"
              : "Overpaid"
              : "Pending"}</p>
            <p><strong>Payment Note:</strong> {purchase.payments?.[0]?.paymentNote || "N/A"}</p>
          </div>
        </div>

        <h2 className="mb-2 text-xl font-semibold">Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300 shadow-sm">
            <thead className="bg-gray-200">
              <tr>
                {['Item Name', 'Quantity', 'Purchase Price', 'MRP', 'Discount', 'Total Amount'].map((header) => (
                  <th key={header} className="px-4 py-2 font-medium text-left border">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {purchase.items?.map((item, index) => (
                <tr key={index} className="bg-gray-100">
                  <td className="px-4 py-2 border">{item.item?.itemName || item.item?.name || "N/A"}</td>
{/*<td className="px-4 py-2 border">{item.variant ? "Yes" : "N/A"}</td>*/}
                  <td className="px-4 py-2 border">{item.quantity || "N/A"}</td>
                  <td className="px-4 py-2 border">₹{(item.purchasePrice || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border">₹{(item.mrp || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border">₹{(item.discount || 0).toFixed(2)}</td>
                  <td className="px-4 py-2 border">₹{(item.totalAmount || 0).toFixed(2)}</td>
                </tr>
              )) || <tr><td colSpan="7" className="px-4 py-2 text-center border">No items available</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-6 text-right">
          <button
            className="px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
            onClick={() => navigate(-1)}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDetail;