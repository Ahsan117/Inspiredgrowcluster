import axios from 'axios';

/* ── axios helper ─────────────────────────── */
const api = axios.create({ baseURL: 'https://pos.inspiredgrow.in/vps' });

/* ── private module state ─────────────────── */
let reportingId = localStorage.getItem('reportingId') || null;
let reportTimer = null;
let currentCoords = null;

/* reject anything that is not a real ObjectId */
const isObjectId = (id) => /^[0-9a-fA-F]{24}$/.test(id || '');

/* cleanse persisted value on module load */
if (!isObjectId(reportingId)) {
  reportingId = null;
  localStorage.removeItem('reportingId');
}

/* one function that actually talks to the API */
const postLocation = () => {
  if (!currentCoords || !reportingId) return;

  api.post('https://pos.inspiredgrow.in/vps/api/warehouse-location', {
    warehouseId: reportingId,
    lat: currentCoords.latitude,
    lng: currentCoords.longitude
  }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
  .catch((err) => {
    console.error('Location update failed:', err.response?.data?.message || err.message);
  });
};

/* ── PUBLIC API ───────────────────────────── */
const locationService = {
  startReporting(warehouseId, coords) {
    if (!isObjectId(warehouseId)) {
      console.warn('Rejected startReporting – invalid van ID:', warehouseId);
      return false;
    }
    if (reportingId === warehouseId) return true; // already running
    this.stopReporting();                       // stop any prior one

    reportingId = warehouseId;
    currentCoords = coords;
    localStorage.setItem('reportingId', warehouseId);

    postLocation();                       // fire immediately
    reportTimer = setInterval(postLocation, 10_000); // every 10s
    console.log('Started reporting for', warehouseId);
    return true;
  },

  stopReporting() {
    if (reportTimer) clearInterval(reportTimer);
    reportTimer = null;
    reportingId = null;
    currentCoords = null;
    localStorage.removeItem('reportingId');
    console.log('Stopped location reporting');
  },

  updateCoords(coords) {
    currentCoords = coords;
    if (reportingId && !reportTimer) {
      // Resume reporting if coords are updated and not already running
      postLocation();
      reportTimer = setInterval(postLocation, 10_000);
      console.log('Resumed reporting for', reportingId);
    }
  },

  isReporting(id) { return id && reportingId === id; },

  getReportingId() { return reportingId; },

  initialize(coords) {
    if (!reportingId) return false;          // nothing to resume
    currentCoords = coords;
    if (!reportTimer) {
      postLocation();
      reportTimer = setInterval(postLocation, 10_000);
      console.log('Resumed reporting for', reportingId);
    }
    return true;
  }
};

export default locationService;