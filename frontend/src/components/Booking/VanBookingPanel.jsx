import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { FaCheck, FaMapMarkerAlt, FaExclamationTriangle, FaTrash, FaEllipsisV } from 'react-icons/fa';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const api = axios.create({ baseURL: 'https://pos.inspiredgrow.in/vps/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function AdminAssignPanel() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [vans, setVans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vanIds, setVanIds] = useState({});
  const [newRequestCount, setNewRequestCount] = useState(0);
  const [userWarehouses, setUserWarehouses] = useState([]);

  const [actionOpenId, setActionOpenId] = useState(null);
  const actionMenuRef = useRef(null);

  const lastCheckRef = useRef(new Date(0));
  const notifPollRef = useRef(null);
  const newRequestCountRef = useRef(newRequestCount);

  // Filters
  const [statusFilter, setStatusFilter] = useState('pending');
  const [vanFilter, setVanFilter] = useState(null);

  // Specific warehouse ID allowed to view and assign bookings
  const allowedWarehouseId = '689c23364ebe358ebc725d35'; // Replace with your specific warehouse ID

  // Endpoint mapping
  const getEndpoint = (status) => {
    switch (status) {
      case 'all': return 'https://pos.inspiredgrow.in/vps/api/bookings/all';
      case 'pending': return 'https://pos.inspiredgrow.in/vps/api/bookings/pending';
      case 'assigned': return 'https://pos.inspiredgrow.in/vps/api/bookings/assigned';
      case 'accepted': case 'in_transit': return 'https://pos.inspiredgrow.in/vps/api/bookings/my-jobs';
      case 'completed': return 'https://pos.inspiredgrow.in/vps/api/bookings/my-completed-jobs';
      case 'cancelled': return 'https://pos.inspiredgrow.in/vps/api/bookings/cancelled';
      default: return 'https://pos.inspiredgrow.in/vps/api/bookings/pending';
    }
  };

  // Build react-select-friendly options
  const vanOptions = [
    { value: null, label: 'All/Unassigned' },
    ...vans.map(v => ({ value: v._id, label: v.warehouseName || 'Unknown Van' }))
  ];

  // Fetch current user's warehouses from /admiaddinguser/profile
  useEffect(() => {
    axios.get('https://pos.inspiredgrow.in/vps/admiaddinguser/profile', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => {
        const warehouses = res.data.warehouses || [];
        setUserWarehouses(warehouses);
      })
      .catch(err => {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load user profile.');
      });
  }, []);

  useEffect(() => {
    const fetchBellNotifications = async () => {
      try {
        const res = await api.get('https://pos.inspiredgrow.in/vps/api/bookings/bell', {
          params: { lastCheck: lastCheckRef.current.toISOString() }
        });
        const count = res?.data?.data?.count ?? 0;
        if (count > 0 && userWarehouses.includes(allowedWarehouseId)) {
          setNewRequestCount(count);
          toast.info(`${count} new booking${count > 1 ? 's' : ''} received`, {
            autoClose: 5000,
            closeOnClick: true,
            draggable: true,
          });
        } else {
          setNewRequestCount(0);
        }
      } catch (err) {
        console.error('Error fetching bell notifications:', err?.message || err);
      }
    };

    fetchBellNotifications();
    notifPollRef.current = setInterval(fetchBellNotifications, 60000);

    return () => {
      if (notifPollRef.current) clearInterval(notifPollRef.current);
    };
  }, [userWarehouses]);

  // Fetch bookings and vans (only if user can access the allowed warehouse)
  useEffect(() => {
    if (!userWarehouses.includes(allowedWarehouseId)) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const endpoint = getEndpoint(statusFilter);
    api.get(endpoint)
      .then(bRes => {
        let fetchedBookings = bRes.data.data || [];

        // apply vanFilter if present
        if (vanFilter) {
          fetchedBookings = fetchedBookings.filter(b => {
            if (statusFilter === 'pending') {
              return !b.van && vanFilter === null; // show unassigned only when vanFilter null
            } else {
              return b.van && b.van._id === vanFilter;
            }
          });
        }

        fetchedBookings.sort((a, b) => new Date(a.scheduledFor || 0) - new Date(b.scheduledFor || 0));
        setBookings(fetchedBookings);
      })
      .catch(err => {
        if (err.response?.status === 404 && statusFilter === 'cancelled') {
          setBookings([]);
        } else {
          setError('Failed to load: ' + (err.response?.data?.message || err.message));
        }
      })
      .finally(() => setLoading(false));

    // Fetch vans
    api.get('https://pos.inspiredgrow.in/vps/api/warehouses')
      .then(wRes => {
        const list = wRes.data.data || wRes.data.warehouses || [];
        setVans(list);
      })
      .catch(() => { /* ignore */ });
  }, [statusFilter, vanFilter, userWarehouses]);

  // Toast reminder every 10 seconds
  const reminderIntervalRef = useRef();
  useEffect(() => {
    if (newRequestCount > 0 && userWarehouses.includes(allowedWarehouseId)) {
      if (!reminderIntervalRef.current) {
        reminderIntervalRef.current = setInterval(() => {
          const count = newRequestCountRef.current || 0;
          if (count > 0) {
            toast.info(`${count} new booking${count > 1 ? 's' : ''} pending`, {
              autoClose: 5000,
              closeOnClick: true,
              draggable: true,
              toastId: 'reminder-toast'
            });
          }
        }, 10000);
      }
    } else if (reminderIntervalRef.current) {
      clearInterval(reminderIntervalRef.current);
      reminderIntervalRef.current = null;
    }

    return () => {
      if (reminderIntervalRef.current) {
        clearInterval(reminderIntervalRef.current);
        reminderIntervalRef.current = null;
      }
    };
  }, [newRequestCount, userWarehouses]);

  useEffect(() => {
    newRequestCountRef.current = newRequestCount;
  }, [newRequestCount]);

  const handleAssign = async (bookingId) => {
    if (!userWarehouses.includes(allowedWarehouseId)) {
      toast.error('You are not authorized to assign bookings.');
      return;
    }
    const vanId = vanIds[bookingId];
    if (!vanId) {
      toast.error('Please select a van before assigning.');
      return;
    }
    try {
      await api.patch(`https://pos.inspiredgrow.in/vps/api/bookings/${bookingId}/assign`, { vanId });
      setBookings(bs => bs.filter(b => b._id !== bookingId));
      setNewRequestCount(prev => Math.max(0, prev - 1));
      toast.success('Van assigned successfully!');
    } catch (err) {
      toast.error('Assign failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (bookingId, soft = true) => {
    const action = soft ? 'soft-delete (mark as deleted)' : 'permanently delete';
    const ok = window.confirm(`Are you sure you want to ${action} booking ${bookingId}?`);
    if (!ok) return;

    try {
      const url = `https://pos.inspiredgrow.in/vps/api/bookings/${bookingId}` + (soft ? '?soft=true' : '');
      await api.delete(url);
      // update UI: remove booking
      setBookings(bs => bs.filter(b => b._id !== bookingId));
      setActionOpenId(null);
      toast.success(soft ? 'Booking soft-deleted' : 'Booking permanently deleted');
    } catch (err) {
      toast.error('Delete failed: ' + (err.response?.data?.message || err.message));
    }
  };

  // close action menu on outside click
  useEffect(() => {
    const onDocClick = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        setActionOpenId(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  const showAssignUI = statusFilter === 'pending';

  // Custom styles for react-select
  const selectStyles = {
    control: (provided) => ({
      ...provided,
      borderRadius: '8px',
      borderColor: '#e5e7eb',
      padding: '4px',
      boxShadow: 'none',
      backgroundColor: '#f9fafb',
      '&:hover': { borderColor: '#3b82f6' },
      '&:focus-within': { borderColor: '#3b82f6', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)' },
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      backgroundColor: '#ffffff',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f0f7ff' : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#1f2937',
      padding: '10px 12px',
      '&:hover': { backgroundColor: '#f0f7ff' },
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6b7280',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1f2937',
    }),
  };

  // Skeleton Loader for Bookings
  const SkeletonCard = () => (
    <div className="w-full h-48 p-6 bg-gray-100 border border-gray-200 rounded-lg shadow-sm animate-pulse"></div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <main className="flex-1 w-full max-w-6xl p-4 mx-auto sm:p-6 md:p-8 lg:p-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Van Assignment Dashboard</h1>
          </div>

          {/* Filters Section */}
          <div className="p-6 mb-6 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Filter Bookings</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Booking Status</label>
                <select
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-700 text-sm"
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="accepted">In-Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Van Filter</label>
                <Select
                  options={vanOptions}
                  value={vanOptions.find(v => v.value === vanFilter) || { value: null, label: 'All/Unassigned' }}
                  onChange={opt => setVanFilter(opt.value)}
                  placeholder="Select a van..."
                  isSearchable
                  styles={selectStyles}
                  className="w-full"
                />
              </div>
              
            </div>
            {showAssignUI && (
              <p className="mt-4 text-sm text-gray-500">Select a van to assign to pending bookings. Filters apply to the displayed list.</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center p-4 mb-6 text-red-700 border-l-4 border-red-600 rounded-lg bg-red-50">
              <FaExclamationTriangle className="w-5 h-5 mr-2" />
              <span>{error}</span>
            </div>
          )}

          {/* Unauthorized Message */}
          {userWarehouses.length > 0 && !userWarehouses.includes(allowedWarehouseId) && (
            <div className="flex items-center p-4 mb-6 text-yellow-700 border-l-4 border-yellow-600 rounded-lg bg-yellow-50">
              <FaExclamationTriangle className="w-5 h-5 mr-2" />
              <span>This store is not authorized to view or assign bookings.</span>
            </div>
          )}

          {/* Content Wrapper */}
          <div className="relative">
            {/* Bookings List with Scroll */}
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              {loading ? (
                <div className="grid grid-cols-1 gap-6">
                  {Array(3).fill().map((_, index) => <SkeletonCard key={index} />)}
                </div>
              ) : bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="font-medium text-gray-500">No {statusFilter} bookings match the current filters.</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {bookings.map(b => {
                    const addr = [b.pickupAddress?.street, b.pickupAddress?.area, b.pickupAddress?.city].filter(Boolean).join(', ');
                    return (
                      <div
                        key={b._id}
                        className="p-6 transition-shadow duration-200 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {b.customer?.name || 'Unknown'} <span className="text-base text-gray-500">({b.customer?.phone || 'N/A'})</span>
                            </h3>
                            <div className="relative flex items-center gap-3" ref={actionMenuRef}>
                              <span
                                className={`px-3 py-1 text-xs font-medium rounded-full ${
                                  b.van ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {b.van ? 'Assigned' : 'Unassigned'}
                              </span>

                              {/* Actions button */}
                              <button
                                onClick={(e) => { e.stopPropagation(); setActionOpenId(id => id === b._id ? null : b._id); }}
                                className="p-2 ml-2 border border-gray-200 rounded-md bg-gray-50 hover:bg-gray-100"
                                aria-haspopup="true"
                                aria-expanded={actionOpenId === b._id}
                                title="Actions"
                              >
                                <FaEllipsisV className="w-4 h-4 text-gray-600" />
                              </button>

                              {/* Dropdown */}
                              {actionOpenId === b._id && (
                                <div
                                  className="absolute right-0 z-20 w-56 mt-10 bg-white border border-gray-200 rounded-md shadow-lg"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => handleDelete(b._id, true)}
                                    className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left text-gray-700 hover:bg-gray-50"
                                  >
                                    <span className="text-yellow-600"><FaTrash /></span>
                                    Soft delete (mark as deleted)
                                  </button>
                                  <hr />
                                  <button
                                    onClick={() => handleDelete(b._id, false)}
                                    className="flex items-center w-full gap-3 px-4 py-3 text-sm text-left text-red-700 hover:bg-gray-50"
                                  >
                                    <span className="text-red-600"><FaTrash /></span>
                                    Delete permanently
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center text-gray-600">
                            <FaMapMarkerAlt className="w-4 h-4 mr-2 text-red-500" />
                            <span className="text-sm">{addr || 'Address unavailable'}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-2">
                            <div>
                              <strong>Type:</strong> {b.type || 'N/A'}
                            </div>
                            {b.type === 'scheduled' && (
                              <div>
                                <strong>When:</strong> {b.scheduledFor ? new Date(b.scheduledFor).toLocaleString() : 'N/A'}
                              </div>
                            )}
                          </div>

                          <div className="text-sm text-gray-600">
                            <strong>Van:</strong> {b.van ? b.van.warehouseName : 'Not Assigned'}
                          </div>

                          <div className="text-sm text-gray-600">
                            <strong>Remark:</strong> {b.remark || <span className="italic text-gray-400">None</span>}
                          </div>

                          {showAssignUI && (
                            <div className="flex items-center gap-3 pt-2">
                              <Select
                                options={vanOptions.slice(1)}
                                value={vanOptions.find(o => o.value === vanIds[b._id]) || null}
                                onChange={opt => setVanIds(m => ({ ...m, [b._id]: opt?.value || '' }))}
                                placeholder="Select a van…"
                                styles={selectStyles}
                                className="flex-1"
                                isSearchable
                              />
                              <button
                                onClick={() => handleAssign(b._id)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                              >
                                <FaCheck className="w-4 h-4" /> Assign
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <ToastContainer
            position="top-right"
            autoClose={5000}
            limit={3}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            theme="light"
            toastStyle={{
              backgroundColor: '#f8fafc',
              color: '#1f2937',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              fontSize: '14px',
              padding: '10px',
              maxWidth: '300px',
            }}
          />
        </main>
      </div>
    </div>
  );
}
