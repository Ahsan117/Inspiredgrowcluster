import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaCheck, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import locationService from '../services/locationService';
import { FaMapMarkerAlt, FaLocationArrow, FaStop } from 'react-icons/fa';
import { useGeolocated } from 'react-geolocated';
import { useNavigate } from 'react-router-dom';


const api = axios.create({ baseURL: 'https://pos.inspiredgrow.in/vps/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function RiderJobsPanel() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusSel, setStatusSel] = useState({});
  const [reportingId, setReportingId] = useState(locationService.getReportingId());
  const navigate = useNavigate();
  const [view, setView] = useState('active');
  // 1) Fetch assigned jobs on mount and sort by nearest time
  // useEffect(() => {
  //   setLoading(true);
  //   api.get('/bookings/assigned')
  //   .then(res => {
  //     const fetchedJobs = res.data.data || [];
  //     // Sort by nearest scheduled time or treat ASAP as current time
  //     fetchedJobs.sort((a, b) => {
  //       const now = new Date();
  //       const timeA = a.type === 'scheduled' ? new Date(a.scheduledFor || now) : now;
  //       const timeB = b.type === 'scheduled' ? new Date(b.scheduledFor || now) : now;
  //       return timeA - timeB;
  //     });
  //     console.log(fetchedJobs)
  //     setJobs(fetchedJobs);
  //     setError(null);
  //   })
  //   .catch(() => setError('Failed to load your assigned jobs'))
  //   api.get('/bookings/my-jobs')
  //     .then(res => {
  //       const fetchedJobs = res.data.data || [];
  //       // Sort by nearest scheduled time or treat ASAP as current time
  //       fetchedJobs.sort((a, b) => {
  //         const now = new Date();
  //         const timeA = a.type === 'scheduled' ? new Date(a.scheduledFor || now) : now;
  //         const timeB = b.type === 'scheduled' ? new Date(b.scheduledFor || now) : now;
  //         return timeA - timeB;
  //       });
  //       console.log(fetchedJobs)
  //       setJobs(prev =>([...prev,...fetchedJobs]));
  //       setError(null);
  //     })
  //     .catch(() => setError('Failed to load your assigned jobs'))
      
  //     api.get('/bookings/my-completed-jobs' )
  //     .then(res => {
  //       console.log('Fetched jobs:', res.data.data);
  //       console.log(res.data.data)
  //       setJobs(prev =>([...prev,...res.data.data]));
  //     })
  //     .catch(() => setError('Failed to load jobs'))
  //     .finally(() => setLoading(false));
      
  // }, []);

  
  /* ── geolocation ─────────────────────── */
  const { coords, isGeolocationAvailable, isGeolocationEnabled, positionError }
    = useGeolocated({
      positionOptions: { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
      watchPosition: true, userDecisionTimeout: 5_000
    });

  /* keep service in sync with coords and resume reporting */
  useEffect(() => {
    if (coords) {
      if (locationService.getReportingId()) {
        locationService.updateCoords(coords);
        if (!locationService.isReporting(locationService.getReportingId())) {
          locationService.initialize(coords);
        }
      } else {
        locationService.initialize(coords);
      }
      setReportingId(locationService.getReportingId());
    }
  }, [coords]);

  
  useEffect(() => {
    setLoading(true);
  
    const fetchAssigned = api.get('/bookings/assigned');
    const fetchMyJobs = api.get('/bookings/my-jobs');
    const fetchCompleted = api.get('/bookings/my-completed-jobs');
  
    Promise.all([fetchAssigned, fetchMyJobs, fetchCompleted])
      .then(([assignedRes, myJobsRes, completedRes]) => {
        console.log({assignedRes, myJobsRes, completedRes})
        const now = new Date();
  
        const sortJobs = (arr) => {
          return (arr || []).sort((a, b) => {
            const timeA = a.type === "scheduled" ? new Date(a.scheduledFor || now) : now;
            const timeB = b.type === "scheduled" ? new Date(b.scheduledFor || now) : now;
            return timeA - timeB;
          });
        };
  
        const assigned = sortJobs(assignedRes?.data?.data || []);
        const myJobs = sortJobs(myJobsRes?.data?.data || []);
        const completed = completedRes?.data?.data || [];
           console.log([...assigned, ...myJobs, ...completed])
        setJobs([...assigned, ...myJobs, ...completed]);
        setError(null);
      })
      .catch(err => {
        console.error(err);
        setError("Failed to load jobs");
      })
      .finally(() => setLoading(false));
  }, []);
  
  // 2) Claim a job
  const handleClaim = async (id) => {
    try {
      await api.patch(`/bookings/${id}/claim`, {});
      // remove from list
      setJobs(js => js.filter(j => j._id !== id));
    } catch (err) {
      alert('Claim failed: ' + (err.response?.data?.message || err.message));
    }
  };

   
  /* status helpers */
  const changeStatus = (id, s) => setStatusSel(p => ({ ...p, [id]: s }));
  const updateStatus = async (id) => {
    const status = statusSel[id];
    if (!status) return alert('Select status first');
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      setJobs(js => js.map(j => j._id === id ? { ...j, status } : j));
    } catch (e) {
      alert(e.response?.data?.message || e.message);
    }
  };

  /* live-location toggle */
  const toggleLocation = (vanId) => {
    if (locationService.isReporting(vanId)) {
      locationService.stopReporting();
      setReportingId(null);
    } else {
      if (!coords) return alert('Waiting for GPS…');
      if (!locationService.startReporting(vanId, coords)) return;
      setReportingId(vanId);
    }
  };

  const disableGeo = !coords || !isGeolocationAvailable || !isGeolocationEnabled;

  /* ── helper to extract lat/lng ─────────────────────── */
  const getLatLngFromPickup = (pickup = {}) => {
    try {
      // Case 1: GeoJSON { type: 'Point', coordinates: [lng, lat] }
      if (pickup.location?.coordinates?.length >= 2) {
        const [lng, lat] = pickup.location.coordinates.map(Number);
        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
      }
      // Case 2: flat lat/lng fields
      if (pickup.lat != null && pickup.lng != null) {
        const lat = Number(pickup.lat), lng = Number(pickup.lng);
        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
      }
      // Case 3: alternative naming
      if (pickup.latitude != null && pickup.longitude != null) {
        const lat = Number(pickup.latitude), lng = Number(pickup.longitude);
        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
      }
    } catch (err) {
      console.warn('Error extracting coords:', err);
    }
    return null;
  };

  
  useEffect(()=>console.log("job",jobs),[jobs])

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
    <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
  
    <div className="flex flex-1">
      <Sidebar isSidebarOpen={isSidebarOpen} />
  
      <main className="flex-1 w-full max-w-6xl p-4 mx-auto sm:p-6 md:p-8 lg:p-10">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 md:text-3xl">Your Assigned Jobs</h1>
  
        {error && (
          <div className="flex items-center p-4 mb-6 text-red-700 border-l-4 border-red-600 rounded-lg bg-red-50">
            <FaExclamationTriangle className="w-5 h-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
  
        {positionError && <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
          Geolocation error: {positionError.message}
        </div>}
  
        {!isGeolocationAvailable && (
          <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
            Geolocation not supported.
          </div>
        )}
  
        {!isGeolocationEnabled && (
          <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
            Geolocation disabled.
          </div>
        )}
  
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white border border-gray-200 rounded-lg shadow-sm">
            <FaSpinner className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="mt-2 font-medium text-gray-600">Loading jobs...</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-white border border-gray-200 rounded-lg shadow-sm">
            <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="font-medium text-gray-500">No jobs assigned to your van.</span>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto space-y-4">
  
            {jobs.map(j => {
              const vanId = j.van && typeof j.van === 'string' ? j.van : j.van?._id;
  
              const addr = [
                j.pickupAddress?.street,
                j.pickupAddress?.area,
                j.pickupAddress?.city,
                j.pickupAddress?.state,
                j.pickupAddress?.postalCode,
              ].filter(Boolean).join(', ');
  
              const coordsObj = getLatLngFromPickup(j.pickupAddress);
  
              const mapSrc = coordsObj
                ? `https://maps.google.com/maps?q=${coordsObj.lat},${coordsObj.lng}&z=18&output=embed`
                : `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=16&output=embed`;
  
              const mapsLink = coordsObj
                ? `https://www.google.com/maps?q=${coordsObj.lat},${coordsObj.lng}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
  
              return (
                <div
                  key={j._id}
                  className="p-6 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md"
                >
  
                  <div className="space-y-3">
                    {/* Customer */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {j.customer?.name}
                        <span className="text-base text-gray-500"> ({j.customer?.phone})</span>
                      </h3>
                    </div>
  
                    {/* Pickup */}
                    <div className="text-gray-600">
                      <strong className="font-medium">Pickup: </strong>
                      {j.pickupAddress?.street}, {j.pickupAddress?.area}, {j.pickupAddress?.city}
                    </div>
  
                    {/* When */}
                    <div className="text-gray-600">
                      <strong className="font-medium">When: </strong>
                      {j.type === "scheduled"
                        ? new Date(j.scheduledFor).toLocaleString()
                        : "ASAP"}
                    </div>
  
                    {/* Remark */}
                    <div className="text-gray-600">
                      <strong className="font-medium">Remark: </strong>
                      {j.remark || <span className="italic text-gray-400">none</span>}
                    </div>
  
                    {/* Claim button */}
                    {!j.acceptedBy && (
                      <button
                        onClick={() => handleClaim(j._id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600"
                      >
                        <FaCheck /> Claim
                      </button>
                    )}
  
                    {/* Job accepted sections */}
                    {j.acceptedBy && (
                      <>
                        {/* ACTIVE VIEW */}
                        {view === "active" && (
                          <>
                            <div className="text-sm text-green-600">
                              <strong>Status:</strong> {j.status}
                            </div>
  
                            <div className="flex items-center gap-2">
                              <select
                                className="flex-1 p-1 border rounded"
                                value={statusSel[j._id] || ""}
                                onChange={(e) => changeStatus(j._id, e.target.value)}
                              >
                                <option value="" disabled>Change status…</option>
                                <option value="in_transit">In Transit</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
  
                              <button
                                onClick={() => updateStatus(j._id)}
                                className="px-3 py-1 text-white bg-blue-500 rounded"
                              >
                                Update
                              </button>
                            </div>
  
                            {/* Start Stop location */}
                            <button
                              onClick={() => toggleLocation(vanId)}
                              disabled={disableGeo || !vanId}
                              className={`mt-2 px-4 py-2 rounded flex items-center gap-1 text-white ${
                                locationService.isReporting(vanId)
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              } ${disableGeo || !vanId ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              {locationService.isReporting(vanId)
                                ? (<><FaStop /> Stop</>)
                                : (<><FaLocationArrow /> Send location</>)}
                            </button>
  
                            {!vanId && (
                              <div className="mt-1 text-sm text-red-500">
                                Van not assigned — cannot send location
                              </div>
                            )}
  
                            {/* Start Sale if in transit */}
                            {j.status === "in_transit" && (
                              <button
                                onClick={() => navigate(
                                  `/pos-main?customer=${j.customer._id}&bookingId=${j._id}&customerModel=Customer`
                                )}
                                className="inline-block px-4 py-2 mt-2 text-white bg-indigo-600 rounded"
                              >
                                Start Sale
                              </button>
                            )}
                          </>
                        )}
  
                        {/* Completed View */}
                        {view === "completed" && j.order && (
                          <div className="pt-4 mt-4 border-t">
                            <strong>Items Sold:</strong>
                            <ul className="ml-6 list-disc">
                              {j.order.items.map((i, ix) => (
                                <li key={ix}>
                                  {i.quantity}× {i.item.itemName} @ ₹{i.price.toFixed(2)} =
                                  ₹{i.subtotal.toFixed(2)}
                                </li>
                              ))}
                            </ul>
  
                            <div className="mt-2">
                              <strong>Total Paid:</strong>{" "}
                              ₹{j.order.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                            </div>
                          </div>
                        )}
  
                        {/* MAP */}
                        <div className="w-full mt-3 overflow-hidden border rounded h-52">
                          <iframe
                            title={`map-${j._id}`}
                            src={mapSrc}
                            className="w-full h-full"
                            loading="lazy"
                          />
                          <div className="flex items-center gap-2 p-2 text-xs border-t bg-gray-50">
                            <button
                              onClick={() => window.open(mapsLink, '_blank')}
                              className="px-2 py-1 text-white bg-indigo-600 rounded"
                            >
                              Open in Maps
                            </button>
  
                            {coordsObj ? (
                              <span>Coords: {coordsObj.lat.toFixed(5)}, {coordsObj.lng.toFixed(5)}</span>
                            ) : (
                              <span>No saved coords — using text address</span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
  
          </div>
        )}
      </main>
    </div>
  </div>
  
  );
}


window.addEventListener('beforeunload', () => locationService.stopReporting());
