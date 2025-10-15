import React, { useEffect, useState } from 'react';
import axios from 'axios';

const AssignRider = ({ orderId, onClose, setSidebarOpen,fetchusers }) => {
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [success, setSuccess] = useState(false);
   
  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  useEffect(() => {
    if (setSidebarOpen) setSidebarOpen(false);
    const fetchRiders = async () => {
      try {

        const res = await axios.get('https://pos.inspiredgrow.in/vps/api/rider/all',
          {headers}
        );
        const activeRiders = res.data.data.filter(rider => rider.status.toLowerCase() === "active");
        console.log("active")
        console.log(activeRiders)
        setRiders(activeRiders || []);
      } catch (err) {
        console.error('Error fetching riders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRiders();
  }, []);

  const handleAssign = async (riderId) => {
    try {
      const res = await axios.put(`https://pos.inspiredgrow.in/vps/api/orders/assign-rider`,{
        id:orderId,
        deliveryAgent:riderId,
        deliveryAgentModel:"Rider"
      },{headers});
      console.log(res)
      setAssigned(riderId);
      setSuccess(true);
      fetchusers();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign rider.');
    }
  };

  

  const filteredRiders = riders.filter(rider => 
    `${rider.firstname} ${rider.lastname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rider.mobile.includes(searchTerm)
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
            <button
              onClick={onClose}
              className="p-1 text-gray-400 transition-colors rounded-full hover:bg-gray-100 hover:text-gray-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              className="w-full py-2.5 pl-10 pr-4 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-3">
              <div className="w-10 h-10 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              <p className="text-gray-500">Loading available riders...</p>
            </div>
          ) : filteredRiders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-6 text-center">
              <svg className="w-16 h-16 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-700">No riders found</h3>
              <p className="mt-1 text-gray-500">
                {searchTerm ? "Try a different search term" : "No active riders available"}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')} 
                  className="px-4 py-2 mt-3 text-sm text-blue-600 hover:underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredRiders.map((rider) => (
                <li key={rider._id} className="px-5 py-4 transition-colors hover:bg-gray-50">
                  <div className="flex items-center">
                    <div className="relative flex-shrink-0 mr-4">
                      <div className="flex items-center justify-center w-12 h-12 text-lg font-medium text-white rounded-full bg-gradient-to-br from-blue-500 to-blue-600">
                        {rider.firstname.charAt(0)}{rider.lastname.charAt(0)}
                      </div>
                      {assigned === rider._id && (
                        <div className="absolute flex items-center justify-center w-6 h-6 bg-green-500 border-2 border-white rounded-full -bottom-1 -right-1">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">
                        {rider.firstname} {rider.lastname}
                      </h3>
                      <div className="flex items-center mt-1 text-sm text-gray-500">
                        <svg className="flex-shrink-0 mr-1.5 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span>{rider.mobile}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => !assigned && handleAssign(rider._id)}
                      disabled={assigned}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                        assigned === rider._id
                          ? 'bg-green-100 text-green-800'
                          : assigned
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                    >
                      {assigned === rider._id ? 'Assigned' : 'Assign'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Success Notification */}
        {success && (
          <div className="sticky bottom-0 left-0 right-0 p-4 border-t border-green-100 bg-green-50 animate-slide-up">
            <div className="flex items-center justify-center space-x-2 text-green-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Rider assigned successfully!</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssignRider;