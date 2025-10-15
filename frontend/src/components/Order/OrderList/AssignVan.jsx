import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AssignVan = ({ orderId, onClose, setSidebarOpen, fetchusers }) => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(false);
  const [checkingStock, setCheckingStock] = useState(false);
  const [unavailableItems, setUnavailableItems] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

  useEffect(() => {
    if (setSidebarOpen) setSidebarOpen(false);
    const fetchWarehouse = async () => {
      try {
        const res = await axios.get("https://pos.inspiredgrow.in/vps/api/warehouses?scope=mine", { headers });
        setRiders(res.data.data.filter(w => !w.isRestricted));
      } catch (err) {
        console.error('Error fetching riders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchWarehouse();
  }, []);

  // STEP 1: Check stock first
  const handleCheckStock = async (riderId) => {
    setSelectedRider(riderId);
    setCheckingStock(true);
    setUnavailableItems([]);

    try {
      const res = await axios.put(
        `https://pos.inspiredgrow.in/vps/api/orders/stock-check`,
        { id:orderId, deliveryAgent: riderId },
        { headers }
      );

      const unavailable = res.data?.unavailableItems || [];
      console.log('Unavailable items:',unavailable);
      setUnavailableItems(unavailable);
    } catch (err) {
      console.error('Stock check error:', err);
      alert('Failed to check stock.');
    } finally {
      setCheckingStock(false);
    }
  };

  // STEP 2: Save if all items available
  const handleSaveAssign = async () => {
    try {
      const res = await axios.put(
        `https://pos.inspiredgrow.in/vps/api/orders/assign-van`,
        { deliveryAgent: selectedRider, id: orderId },
        { headers }
      );

      setAssigned(selectedRider);
      setSuccess(true);
      fetchusers();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign van.');
    }
  };

  const filteredRiders = riders.filter(rider =>
    `${rider.warehouseName}`?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
    `${rider.mobile}`.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-md h-[80vh] bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-100">
        {/* Header */}
        <div className="sticky top-0 z-10 p-5 bg-white border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign Delivery Partner</h2>
              <p className="mt-1 text-sm text-gray-500">Order #{orderId}</p>
            </div>
            <button onClick={onClose} className="p-1 text-gray-400 rounded-full hover:bg-gray-100">
              ✕
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-4">
            <input
              type="text"
              className="w-full py-2.5 pl-10 pr-4 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">Loading vans...</div>
          ) : filteredRiders.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">No vans found</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredRiders.map((rider) => (
                <li key={rider._id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                  <div>
                    <h3 className="text-sm font-semibold">{rider.warehouseName}</h3>
                    <p className="text-sm text-gray-500">{rider.mobile}</p>
                  </div>
                  <button
                    onClick={() => handleCheckStock(rider._id)}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Check Stock
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stock Check Result Section */}
        {selectedRider && (
          <div className="p-4 border-t bg-gray-50">
            {checkingStock ? (
              <p className="text-sm text-blue-600">Checking stock...</p>
            ) : unavailableItems.length === 0 ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-600">All items are available!</p>
                <button
                  onClick={handleSaveAssign}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Save
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2 font-medium text-red-600">
                  {unavailableItems.length} item(s) unavailable:
                </p>
                <ul className="overflow-y-auto text-sm text-gray-700 list-disc list-inside max-h-32">
                  {unavailableItems.map((item, i) => (
                    <li key={i}>{item.item?.itemName || item.name}-{item.quantity}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {success && (
          <div className="p-3 text-center text-green-800 border-t border-green-200 bg-green-50">
            Van assigned successfully!
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignVan;
