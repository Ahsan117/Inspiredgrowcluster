import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FaMapMarkerAlt, FaLocationArrow, FaStop } from 'react-icons/fa';
import { useGeolocated } from 'react-geolocated';
import { useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import locationService from '../services/locationService';

const api = axios.create({ baseURL: 'https://pos.inspiredgrow.in/vps/api' });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function MyJobsPanel() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState('active');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statusSel, setStatusSel] = useState({});
  const [reportingId, setReportingId] = useState(locationService.getReportingId());
  const navigate = useNavigate();

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

  /* fetch jobs whenever tab changes */
  useEffect(() => {
    setLoading(true); setError(null);
    api.get(view === 'completed' ? '/bookings/my-completed-jobs' : '/bookings/my-jobs')
      .then(res => {
        console.log('Fetched jobs:', res.data.data.map(j => ({ _id: j._id, van: j.van })));
        console.log(res.data.data)
        setJobs(res.data.data);
      })
      .catch(() => setError('Failed to load jobs'))
      .finally(() => setLoading(false));
  }, [view]);

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

  /* ── JSX ─────────────────────────────── */
  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-1">
        <Sidebar isSidebarOpen={sidebarOpen} />
        <main className="flex-1 p-6 overflow-auto bg-gray-100">
          {/* view switch */}
          <div className="mb-4 space-x-2">
            {['active', 'completed'].map(v => (
              <button key={v}
                onClick={() => setView(v)}
                className={`px-4 py-2 rounded ${
                  view === v
                    ? (v === 'active' ? 'bg-blue-600' : 'bg-green-600') + ' text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {v === 'active' ? 'In-Progress' : 'Completed'}
              </button>
            ))}
          </div>

          <h1 className="mb-4 text-2xl font-semibold">
            {view === 'completed' ? 'My Completed Jobs' : 'My Claimed Jobs'}
          </h1>

          {error && <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">{error}</div>}
          {positionError && <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
            Geolocation error: {positionError.message}</div>}
          {!isGeolocationAvailable && <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
            Geolocation not supported.</div>}
          {!isGeolocationEnabled && <div className="p-2 mb-4 text-red-700 bg-red-100 rounded">
            Geolocation disabled.</div>}

          {loading ? 'Loading…' : jobs.length === 0 ? (
            <div className="text-gray-600">
              {view === 'completed' ? 'No completed jobs.' : 'No claimed jobs.'}
            </div>
          ) : (
            <div className="space-y-6">
              {jobs.map(j => {
                const vanId = j.van && typeof j.van === 'string' ? j.van : j.van?._id;
                const addr = [
                  j.pickupAddress?.street,
                  j.pickupAddress?.area,
                  j.pickupAddress?.city,
                  j.pickupAddress?.state,
                  j.pickupAddress?.postalCode
                ].filter(Boolean).join(', ');

                const coordsObj = getLatLngFromPickup(j.pickupAddress);
                const mapSrc = coordsObj
                  ? `https://maps.google.com/maps?q=${coordsObj.lat},${coordsObj.lng}&z=18&output=embed`
                  : `https://maps.google.com/maps?q=${encodeURIComponent(addr)}&z=16&output=embed`;
                const mapsLink = coordsObj
                  ? `https://www.google.com/maps?q=${coordsObj.lat},${coordsObj.lng}`
                  : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;

                console.log('Job:', j._id, 'Using coords:', coordsObj);

                return (
                  <div key={j._id}
                    className="flex flex-col gap-4 p-4 bg-white rounded shadow md:flex-row">
                    {/* left column */}
                    <div className="flex-1 space-y-2">
                      <div className="text-gray-800">
                        <strong>Customer:</strong> {j.customer?.name} ({j.customer?.phone})
                      </div>
                      <div className="flex items-center text-gray-700">
                        <FaMapMarkerAlt className="mr-1 text-red-500" /><span>{addr}</span>
                      </div>
                      <div className="text-gray-700">
                        <strong>When:</strong>{' '}
                        {j.type === 'scheduled'
                          ? new Date(j.scheduledFor).toLocaleString()
                          : 'ASAP'}
                      </div>
                      <div className="text-gray-700">
                        <strong>Remark:</strong> {j.remark || <em>none</em>}
                      </div>

                      {view === 'active' && (
                        <>
                          <div className="text-sm text-green-600">
                            <strong>Status:</strong> {j.status}
                          </div>

                          <div className="flex items-center gap-2">
                            <select className="flex-1 p-1 border rounded"
                              value={statusSel[j._id] || ''}
                              onChange={e => changeStatus(j._id, e.target.value)}>
                              <option value="" disabled>Change status…</option>
                              <option value="in_transit">In Transit</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            <button onClick={() => updateStatus(j._id)}
                              className="px-3 py-1 text-white bg-blue-500 rounded">
                              Update
                            </button>
                          </div>

                          <button
                            onClick={() => toggleLocation(vanId)}
                            disabled={disableGeo || !vanId}
                            className={`mt-2 px-4 py-2 rounded flex items-center gap-1 text-white ${
                              locationService.isReporting(vanId)
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } ${disableGeo || !vanId ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {locationService.isReporting(vanId)
                              ? (<><FaStop /> Stop</>)
                              : (<><FaLocationArrow /> Send location</>)}
                          </button>
                          {!vanId && (
                            <div className="mt-2 text-sm text-red-600">
                              Warning: Van not assigned (location reporting unavailable)
                            </div>
                          )}
                          {
                            j.status == "in_transit" && ( <button
                            onClick={() => navigate(
                              `/pos?customer=${j.customer._id}&bookingId=${j._id}&customerModel=Customer`)}
                            className="inline-block px-4 py-2 mt-2 text-white bg-indigo-600 rounded">
                            Start Sale
                          </button>)
                          }
                         
                        </>
                      )}

                      {view === 'completed' && j.order && (
                        <div className="pt-4 mt-4 border-t">
                          <strong>Items Sold:</strong>
                          <ul className="ml-6 list-disc">
                            {j.order.items.map((i, ix) => (
                              <li key={ix}>{i.quantity}× {i.item.itemName} @ ₹{i.price.toFixed(2)}
                                = ₹{i.subtotal.toFixed(2)}</li>))}
                          </ul>
                          <div className="mt-2">
                            <strong>Total Paid:</strong>{' '}
                            ₹{j.order.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* right column – mini map */}
                    <div className="w-full h-48 overflow-hidden border rounded md:w-64">
                      <iframe title={`map-${j._id}`}
                        src={mapSrc}
                        className="w-full h-full" loading="lazy" />
                      <div className="flex items-center gap-2 p-2 text-xs border-t bg-gray-50">
                        <button
                          onClick={() => window.open(mapsLink, '_blank')}
                          className="px-2 py-1 text-white bg-indigo-600 rounded">
                          Open in Maps
                        </button>
                        {coordsObj ? (
                          <span>Coords: {coordsObj.lat.toFixed(5)}, {coordsObj.lng.toFixed(5)}</span>
                        ) : (
                          <span>No saved coords — using text</span>
                        )}
                      </div>
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
