// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import Select from "react-select";
// import axios from "axios";
// import Navbar from "../../Navbar";
// import Sidebar from "../../Sidebar";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import * as XLSX from "xlsx";

// // Single source of truth for API host
// const LINK = "https://pos.inspiredgrow.in/vps";

// // small helpers
// const todayISO = () => {
//   const d = new Date();
//   return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
//     d.getDate()
//   ).padStart(2, "0")}`;
// };

// const buildImageUrl = (fn) => {
//   if (!fn || typeof fn !== "string") return null;
//   const s = fn.trim();
//   if (!s) return null;
//   if (s.startsWith("http://") || s.startsWith("https://")) return s;
//   if (s.startsWith("/uploads") || s.includes("/uploads/")) return s.startsWith("/") ? `${LINK}${s}` : `${LINK}/${s}`;
//   return `${LINK}/uploads/qr/items/${s}`;
// };

// // ---- Small presentational components ----
// const EmptyThumb = ({ alt = "no image" }) => (
//   <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No</div>
// );

// const Thumb = ({ src, alt }) => {
//   if (!src) return <EmptyThumb alt={alt} />;
//   return <img src={src} alt={alt} className="w-10 h-10 object-cover rounded" loading="lazy" />;
// };

// const Badge = ({ children }) => <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">{children}</span>;

// // Accessible button used across component
// const IconButton = ({ children, onClick, title }) => (
//   <button
//     onClick={onClick}
//     title={title}
//     className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
//   >
//     {children}
//   </button>
// );

// // Image grid modal (reusable)
// function ImageGridModal({ open, onClose, title, images = [] }) {
//   if (!open) return null;
//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
//       <div className="bg-white rounded shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
//         <div className="p-4 border-b flex items-center justify-between">
//           <h3 className="text-lg font-semibold">{title}</h3>
//           <IconButton onClick={onClose} title="Close">
//             <span className="text-xl font-bold">×</span>
//           </IconButton>
//         </div>

//         <div className="p-4">
//           {images.length ? (
//             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
//               {images.map((fn, i) => (
//                 <img key={`${fn}-${i}`} src={buildImageUrl(fn)} alt={`${title} ${i + 1}`} className="w-full h-56 object-cover rounded" loading="lazy" />
//               ))}
//             </div>
//           ) : (
//             <div className="text-sm text-gray-500">No images available</div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Item details modal (images, barcodes, stocks)
// function ItemDetailModal({ open, onClose, item = {}, stocks = {}, warehouses = [], defaultWarehouseId }) {
//   if (!open) return null;

//   const defaultWarehouseLabel = warehouses.find((w) => w.value === defaultWarehouseId)?.label || "Store (default)";

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
//       <div className="bg-white rounded shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
//         <div className="p-4 border-b flex items-center justify-between">
//           <div>
//             <h3 className="text-lg font-semibold">{item.itemName}</h3>
//             <div className="text-sm text-gray-500">{item.itemCode ? `Code: ${item.itemCode}` : null} {item.skuId ? ` · SKU: ${item.skuId}` : null}</div>
//           </div>
//           <IconButton onClick={onClose} title="Close">
//             <span className="text-xl font-bold">×</span>
//           </IconButton>
//         </div>

//         <div className="p-4 space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div className="md:col-span-2">
//               <h4 className="font-medium mb-2">Images</h4>
//               {item.itemImages && item.itemImages.length ? (
//                 <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
//                   {item.itemImages.map((fn, i) => (
//                     <img key={`${fn}-${i}`} src={buildImageUrl(fn)} alt={`${item.itemName} ${i + 1}`} className="w-full h-36 object-cover rounded" loading="lazy" />
//                   ))}
//                 </div>
//               ) : (
//                 <div className="text-sm text-gray-500">No images available</div>
//               )}

//               <div className="mt-4">
//                 <h4 className="font-medium mb-2">Barcodes</h4>
//                 {item.barcodes && item.barcodes.length ? (
//                   <div className="text-sm text-gray-700 space-y-1">
//                     {item.barcodes.map((b, i) => (
//                       <div key={`${b}-${i}`} className="flex items-center gap-3">
//                         <span className="font-mono text-sm">{b}</span>
//                       </div>
//                     ))}
//                   </div>
//                 ) : (
//                   <div className="text-sm text-gray-500">No barcodes</div>
//                 )}
//               </div>
//             </div>

//             <div>
//               <h4 className="font-medium mb-2">Current Stock</h4>
//               <table className="w-full text-sm">
//                 <tbody>
//                   <tr>
//                     <td className="py-2 font-medium">Selected Warehouse</td>
//                     <td className="py-2 text-right">{stocks.selectedWarehouseLabel || "Selected"}</td>
//                   </tr>
//                   <tr>
//                     <td className="py-2">Stock</td>
//                     <td className="py-2 text-right">{stocks.selectedWarehouseStock == null ? <span className="text-gray-500">—</span> : <span className="font-semibold">{stocks.selectedWarehouseStock}</span>}</td>
//                   </tr>

//                   <tr>
//                     <td className="py-2 font-medium">{defaultWarehouseLabel}</td>
//                     <td className="py-2 text-right">{defaultWarehouseLabel}</td>
//                   </tr>
//                   <tr>
//                     <td className="py-2">Stock</td>
//                     <td className="py-2 text-right">{stocks.defaultWarehouseStock == null ? <span className="text-gray-500">—</span> : <span className="font-semibold">{stocks.defaultWarehouseStock}</span>}</td>
//                   </tr>
//                 </tbody>
//               </table>

//               <div className="mt-3">
//                 <button onClick={onClose} className="px-3 py-2 bg-cyan-600 text-white rounded">Close</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ---- Row component (keeps table tidy) ----
// const ItemRow = ({ it, idx, onOpen }) => {
//   const thumbSrc = it.itemImages && it.itemImages.length ? buildImageUrl(it.itemImages[0]) : null;
//   const pendingClass = it.pendingQty < 0 ? "text-green-600" : it.pendingQty > 0 ? "text-red-600" : "text-gray-700";

//   return (
//     <tr key={`${it.itemId || it.skuId || "unknown"}-${it.warehouseId || "wh"}-${idx}`} className="hover:bg-gray-50">
//       <td className="px-4 py-3 text-sm">{idx + 1}</td>
//       <td className="px-4 py-3 text-sm font-medium break-words">
//         <button className="flex items-center gap-3 w-full text-left" onClick={() => onOpen(it)}>
//           {thumbSrc ? <Thumb src={thumbSrc} alt={it.itemName} /> : <EmptyThumb />}
//           <div>
//             <div className="font-medium">{it.itemName}</div>
//             <div className="text-xs text-gray-500">
//               {it.itemCode ? `Code: ${it.itemCode}` : ""}
//               {it.barcodes && it.barcodes.length ? ` · ${it.barcodes[0]}` : ""}
//             </div>
//           </div>
//         </button>
//       </td>
//       <td className={`px-4 py-3 text-center text-sm font-semibold ${pendingClass}`}>{it.pendingQty}</td>
//     </tr>
//   );
// };

// // ---- Main component ----
// export default function ClubBillReport() {
//   const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);

//   // lookups / filters
//   const [warehouses, setWarehouses] = useState([]);
//   const [selectedWarehouse, setSelectedWarehouse] = useState(null);
//   const [defaultWarehouseId, setDefaultWarehouseId] = useState("");

//   const [dateFrom, setDateFrom] = useState(todayISO());
//   const [dateTo, setDateTo] = useState(todayISO());

//   // data
//   const [report, setReport] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   // modal state
//   const [modalItem, setModalItem] = useState(null);
//   const [modalStocks, setModalStocks] = useState({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: null });
//   const [modalLoading, setModalLoading] = useState(false);

//   // auth headers helper
//   const authHeaders = useCallback(() => {
//     const token = localStorage.getItem("token");
//     return token ? { Authorization: `Bearer ${token}` } : {};
//   }, []);

//   // fetch profile + warehouses on mount
//   useEffect(() => {
//     let mounted = true;
//     const load = async () => {
//       try {
//         // profile
//         const role = localStorage.getItem("role");
//         const profileUrl = role === "admin" ? "auth/profile" : "admiaddinguser/profile";
//         const [profileRes, whRes] = await Promise.all([
//           axios.get(`${LINK}/${profileUrl}`, { headers: authHeaders() }).catch(() => null),
//           axios.get(`${LINK}/api/warehouses?scope=mine`, { headers: authHeaders() }).catch(() => null),
//         ]);

//         if (!mounted) return;

//         const profileData = profileRes?.data || {};
//         const dw = profileData?.defaultWarehouse || profileData?.default_warehouse || profileData?.defaultWarehouseId || profileData?.warehouseId || (profileData?.warehouse && profileData.warehouse._id) || "";
//         setDefaultWarehouseId(dw || "");

//         const whList = (whRes?.data?.data || []).map((w) => ({ label: w.warehouseName, value: w._id, status: w.status, isRestricted: !!w.isRestricted }));
//         setWarehouses(whList);

//         // decide selected warehouse (mirror POS logic)
//         if (whList.length) {
//           if (dw) {
//             const found = whList.find((w) => w.value === dw);
//             if (found) {
//               setSelectedWarehouse(found);
//             } else {
//               const restricted = whList.find((w) => w.isRestricted && w.status === "Active");
//               const active = whList.find((w) => w.status === "Active");
//               setSelectedWarehouse(restricted || active || whList[0]);
//             }
//           } else {
//             const restricted = whList.find((w) => w.isRestricted && w.status === "Active");
//             const active = whList.find((w) => w.status === "Active");
//             setSelectedWarehouse(restricted || active || whList[0]);
//           }
//         }
//       } catch (err) {
//         console.error("init load failed", err);
//       }
//     };

//     load();
//     return () => { mounted = false; };
//   }, [authHeaders]);

//   // fetch item details helper (images / barcodes)
//   const fetchItemDetails = useCallback(async (itemId) => {
//     if (!itemId) return { itemImages: [], barcodes: [], itemCode: "" };
//     try {
//       const res = await axios.get(`${LINK}/api/items/${itemId}`, { headers: authHeaders() }).catch(() => null);
//       const payload = res?.data || {};
//       const itemData = payload?.data || payload?.item || payload || {};

//       let images = itemData.itemImages || itemData.images || payload.itemImages || payload.images || [];
//       if (!Array.isArray(images)) images = [];
//       images = images
//         .map((img) => {
//           if (!img) return null;
//           if (typeof img === "string") return img;
//           if (typeof img === "object") return img.fileName || img.filename || img.name || img.url || img.path || null;
//           return null;
//         })
//         .filter(Boolean);

//       let barcodes = itemData.barcodes || itemData.barcode || payload.barcodes || [];
//       if (!Array.isArray(barcodes)) {
//         if (typeof barcodes === "string" && barcodes.trim()) barcodes = [barcodes.trim()];
//         else barcodes = [];
//       }
//       barcodes = barcodes.map((b) => {
//         if (!b) return null;
//         if (typeof b === "string") return b;
//         if (typeof b === "object") return b.code || b.barcode || b.value || b.code_value || null;
//         return null;
//       }).filter(Boolean);

//       const itemCode = itemData.itemCode || itemData.code || itemData.sku || payload.itemCode || "";

//       return { itemImages: images, barcodes, itemCode };
//     } catch (err) {
//       console.warn("fetchItemDetails error", err);
//       return { itemImages: [], barcodes: [], itemCode: "" };
//     }
//   }, [authHeaders]);

//   // fetch stock helper
//   const fetchStockForItem = useCallback(async (invId, warehouseId) => {
//     if (!invId || !warehouseId) return null;
//     try {
//       const res = await axios.get(`${LINK}/api/stock/${invId}`, { headers: authHeaders(), params: { warehouse: warehouseId } });
//       const data = res?.data;
//       if (data == null) return null;
//       if (typeof data === "number") return data;
//       if (typeof data.currentStock === "number") return data.currentStock;
//       if (typeof data.openingStock === "number" && typeof data.currentStock !== "number") return data.openingStock;
//       if (data.data && typeof data.data.currentStock === "number") return data.data.currentStock;
//       if (data.data && typeof data.data.openingStock === "number") return data.data.openingStock;
//       return null;
//     } catch (err) {
//       console.warn("fetchStockForItem error", err);
//       return null;
//     }
//   }, [authHeaders]);

//   // fetch the report and enrich rows (called on Apply Filter)
//   const fetchReport = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const params = { start: dateFrom, end: dateTo };
//       if (selectedWarehouse?.value) params.warehouseId = selectedWarehouse.value;
//       const res = await axios.get(`${LINK}/club-bill-report/club-bill-report`, { headers: authHeaders(), params }).catch((e) => { throw e; });

//       const items = res.data?.items || [];
//       const mapped = (items || []).map((i) => ({
//         skuId: i.skuId,
//         itemId: i.itemId || (i.item && (i.item._id || i.item.id)) || null,
//         itemName: i.itemName || (i.item && i.item.itemName) || i.name || "Unnamed",
//         opening: Number(i.opening || 0),
//         closingStock: Number(i.closingStock || 0),
//         pendingQty: Number(typeof i.pendingQty === "number" ? i.pendingQty : (i.pendingQty || 0)),
//         warehouseId: i.warehouse?._id || i.warehouseId || (selectedWarehouse?.value || null),
//         warehouseName: i.warehouse?.warehouseName || (selectedWarehouse?.label || "All"),
//       }));

//       const onlyPending = mapped.filter((r) => r.pendingQty > 0);

//       // enrich with images/barcodes — limited parallelism (map in batches could be added if huge)
//       const enriched = await Promise.all(onlyPending.map(async (it) => {
//         if (!it.itemId) return { ...it, itemImages: [], barcodes: [], itemCode: "" };
//         const details = await fetchItemDetails(it.itemId);
//         return { ...it, itemImages: details.itemImages || [], barcodes: details.barcodes || [], itemCode: details.itemCode || "" };
//       }));

//       setReport(enriched);
//     } catch (err) {
//       console.error("fetchReport error", err);
//       setError(err?.response?.data?.message || "Failed to fetch report");
//       setReport([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [dateFrom, dateTo, selectedWarehouse, fetchItemDetails, authHeaders]);

//   // open modal and fetch stocks (selected + default)
//   const handleOpenItemModal = useCallback(async (item) => {
//     setModalItem(item);
//     setModalLoading(true);
//     setModalStocks({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: selectedWarehouse?.label || "Selected" });
//     try {
//       const invId = item.itemId || item.skuId || null;
//       const selectedWId = selectedWarehouse?.value || null;
//       const defWId = defaultWarehouseId || null;
//       const selPromise = selectedWId && invId ? fetchStockForItem(invId, selectedWId) : Promise.resolve(null);
//       const defPromise = defWId && invId ? fetchStockForItem(invId, defWId) : Promise.resolve(null);
//       const [selStock, defStock] = await Promise.all([selPromise, defPromise]);
//       setModalStocks({ selectedWarehouseStock: selStock, defaultWarehouseStock: defStock, selectedWarehouseLabel: selectedWarehouse?.label || "Selected" });
//     } catch (err) {
//       console.error("handleOpenItemModal error", err);
//     } finally {
//       setModalLoading(false);
//     }
//   }, [selectedWarehouse, defaultWarehouseId, fetchStockForItem]);

//   const closeModal = useCallback(() => {
//     setModalItem(null);
//     setModalStocks({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: null });
//     setModalLoading(false);
//   }, []);

//   // exports
//   const exportToExcel = useCallback(() => {
//     const rows = report.map((r, idx) => ({ "#": idx + 1, "Item Name": r.itemName, "Item Code": r.itemCode || "", "Pending": r.pendingQty, "Warehouse": r.warehouseName || "" }));
//     const ws = XLSX.utils.json_to_sheet(rows);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "ClubBill");
//     XLSX.writeFile(wb, `club-bill-${dateFrom}_${dateTo}.xlsx`);
//   }, [report, dateFrom, dateTo]);

//   const downloadAsPDF = useCallback(() => {
//     const doc = new jsPDF({ orientation: "landscape" });
//     doc.text(`Club Bill Report (${dateFrom} → ${dateTo})`, 14, 12);
//     const head = [["#", "Item Name", "Item Code", "Pending", "Warehouse"]];
//     const body = report.map((r, idx) => [idx + 1, r.itemName, r.itemCode || "-", r.pendingQty, r.warehouseName || "-"]);
//     autoTable(doc, { startY: 18, head, body, styles: { fontSize: 9 } });
//     doc.save(`club-bill-${dateFrom}_${dateTo}.pdf`);
//   }, [report, dateFrom, dateTo]);

//   // memoized rows (reduces render churn)
//   const rows = useMemo(() => report || [], [report]);

//   return (
//     <div className="flex flex-col min-h-screen">
//       <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
//       <div className="flex flex-grow">
//         <div className="w-auto"><Sidebar isSidebarOpen={isSidebarOpen} /></div>

//         <main className="flex-1 p-4 bg-gray-100">
//           <div className="mb-4">
//             <h1 className="text-2xl font-bold">Club Bill Report</h1>
//             <p className="text-sm text-gray-500">Select warehouse & date range → Apply Filter</p>
//           </div>

//           <div className="bg-white rounded shadow p-4 mb-4">
//             <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
//               <div>
//                 <label className="block text-xs text-gray-600 mb-1">Warehouse</label>
//                 <Select options={warehouses} value={selectedWarehouse} onChange={(v) => setSelectedWarehouse(v)} isClearable={false} />
//               </div>

//               <div>
//                 <label className="block text-xs text-gray-600 mb-1">From</label>
//                 <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded" />
//               </div>

//               <div>
//                 <label className="block text-xs text-gray-600 mb-1">To</label>
//                 <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded" />
//               </div>

//               <div className="flex items-end justify-end gap-2">
//                 <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-60">
//                   {loading ? "Loading..." : "Apply Filter"}
//                 </button>

//                 <div className="relative">
//                   <button onClick={() => {}} className="px-3 py-2 border rounded bg-white">Export</button>
//                   <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow p-1 hidden">{/* keep for future dropdown */}</div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="bg-white rounded shadow overflow-x-auto">
//             <div className="p-4 border-b flex items-center justify-between">
//               <div>
                
//                 <div className="text-sm text-gray-500">Warehouse: {selectedWarehouse?.label || "All"} · {dateFrom}{dateTo ? ` → ${dateTo}` : ""}</div>
//               </div>
//               <div className="text-sm text-gray-600">{rows.length} items</div>
//             </div>

//             <table className="min-w-full divide-y">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
//                   <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Item</th>
//                   <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Pending</th>
//                 </tr>
//               </thead>

//               <tbody className="bg-white divide-y">
//                 {!loading && rows.length === 0 && (
//                   <tr>
//                     <td colSpan={3} className="p-6 text-center text-gray-500">No records found</td>
//                   </tr>
//                 )}

//                 {rows.map((it, idx) => (
//                   <ItemRow key={`${it.itemId || it.skuId || "unknown"}-${it.warehouseId || "wh"}-${idx}`} it={it} idx={idx} onOpen={handleOpenItemModal} />
//                 ))}

//                 {loading && (
//                   <tr>
//                     <td colSpan={3} className="p-6 text-center text-gray-500">Loading...</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {error && <div className="mt-3 text-red-600">{error}</div>}
//         </main>
//       </div>

//       <ItemDetailModal open={!!modalItem} onClose={closeModal} item={modalItem || {}} stocks={modalStocks} warehouses={warehouses} defaultWarehouseId={defaultWarehouseId} />

//     </div>
//   );
// }




import React, { useState, useEffect, useCallback, useMemo } from "react";
import Select from "react-select";
import axios from "axios";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

// Single source of truth for API host
const LINK = "https://pos.inspiredgrow.in/vps";

// small helpers
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

const buildImageUrl = (fn) => {
  if (!fn || typeof fn !== "string") return null;
  const s = fn.trim();
  if (!s) return null;
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("/uploads") || s.includes("/uploads/")) return s.startsWith("/") ? `${LINK}${s}` : `${LINK}/${s}`;
  return `${LINK}/uploads/qr/items/${s}`;
};

// ---- Small presentational components ----
const EmptyThumb = ({ alt = "no image" }) => (
  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No</div>
);

const Thumb = ({ src, alt }) => {
  if (!src) return <EmptyThumb alt={alt} />;
  return <img src={src} alt={alt} className="w-10 h-10 object-cover rounded" loading="lazy" />;
};

// Accessible button used across component
const IconButton = ({ children, onClick, title }) => (
  <button
    onClick={onClick}
    title={title}
    className="inline-flex items-center justify-center p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
  >
    {children}
  </button>
);


// Item details modal (images, barcodes, stocks)
function ItemDetailModal({ open, onClose, item = {}, stocks = {}, warehouses = [], defaultWarehouseId }) {
  if (!open) return null;

  const defaultWarehouseLabel = warehouses.find((w) => w.value === defaultWarehouseId)?.label || "Store (default)";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white rounded shadow-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{item.itemName}</h3>
            <div className="text-sm text-gray-500">{item.itemCode ? `Code: ${item.itemCode}` : null}</div>
          </div>
          <IconButton onClick={onClose} title="Close">
            <span className="text-xl font-bold">×</span>
          </IconButton>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="mt-4">
                <h4 className="font-medium mb-2">Barcodes</h4>
                {item.barcodes && item.barcodes.length ? (
                  <div className="text-sm text-gray-700 space-y-1">
                    {item.barcodes.map((b, i) => (
                      <div key={`${b}-${i}`} className="flex items-center gap-3">
                        <span className="font-mono text-sm">{b}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No barcodes</div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Current Stock</h4>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-2 font-medium">Selected Warehouse</td>
                    <td className="py-2 text-right">{stocks.selectedWarehouseLabel || "Selected"}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Stock</td>
                    <td className="py-2 text-right">{stocks.selectedWarehouseStock == null ? <span className="text-gray-500">—</span> : <span className="font-semibold">{stocks.selectedWarehouseStock}</span>}</td>
                  </tr>

                  <tr>
                    <td className="py-2 font-medium">{defaultWarehouseLabel}</td>
                    <td className="py-2 text-right">{defaultWarehouseLabel}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Stock</td>
                    <td className="py-2 text-right">{stocks.defaultWarehouseStock == null ? <span className="text-gray-500">—</span> : <span className="font-semibold">{stocks.defaultWarehouseStock}</span>}</td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-3">
                <button onClick={onClose} className="px-3 py-2 bg-cyan-600 text-white rounded">Close</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Row component (keeps table tidy) ----
const ItemRow = ({ it, idx, onOpen ,setPreviewItem}) => {
  const thumbSrc = it.itemImages && it.itemImages.length ? buildImageUrl(it.itemImages[0]) : null;
  const pendingClass = it.pendingQty < 0 ? "text-green-600" : it.pendingQty > 0 ? "text-red-600" : "text-gray-700";

  return (
    <tr key={`${it.itemId || it.skuId || "unknown"}-${it.warehouseId || "wh"}-${idx}`} className="hover:bg-gray-50">
      <td className="px-4 py-3 text-sm">{idx + 1}</td>
      <td className="px-4 py-3 text-sm font-medium break-words">
        {/* <button className="flex items-center gap-3 w-full text-left"  onClick={() => setPreviewItem(it)}  >
          {thumbSrc ? <Thumb src={thumbSrc} alt={it.itemName} /> : <EmptyThumb />}
        </button>
          <div>
            <div className="font-medium">{it.itemName}</div>
            <div className="text-xs text-gray-500">
              {it.itemCode ? `Code: ${it.itemCode}` : ""}
              {it.barcodes && it.barcodes.length ? ` · ${it.barcodes[0]}` : ""}
            </div>
          </div> */}
          {thumbSrc && <img src={thumbSrc} onClick={()=>setPreviewItem(it)} alt={it.itemName} className="w-10 h-10 object-cover rounded inline-block mr-3" loading="lazy" />}
          {<div onClick={()=> onOpen(it)}>
            <div className="font-medium">{it.itemName}</div>
            <div className="text-xs text-gray-500">
              {it.itemCode ? `Code: ${it.itemCode}` : ""}
              {it.barcodes && it.barcodes.length ? ` · ${it.barcodes.join(", ")}` : ""}
            </div>
          </div>}
      </td>

      <td className={`px-4 py-3 text-center text-sm font-semibold `}>{it.mrp}</td>
      <td className={`px-4 py-3 text-center text-sm font-semibold ${pendingClass}`}>{it.pendingQty}</td>
    </tr>
  );
};

// ---- Main component ----
export default function ClubBillReport() {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
   const [previewItem,setPreviewItem]=useState(null);
  // lookups / filters
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [defaultWarehouseId, setDefaultWarehouseId] = useState("");

  const [dateFrom, setDateFrom] = useState(todayISO());
  const [dateTo, setDateTo] = useState(todayISO());

  // data
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // modal state
  const [modalItem, setModalItem] = useState(null);
  const [modalStocks, setModalStocks] = useState({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: null });
  const [modalLoading, setModalLoading] = useState(false);

  // auth headers helper
  const authHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // fetch profile + warehouses on mount
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // profile
        const role = localStorage.getItem("role");
        const profileUrl = role === "admin" ? "auth/profile" : "admiaddinguser/profile";
        const [profileRes, whRes] = await Promise.all([
          axios.get(`${LINK}/${profileUrl}`, { headers: authHeaders() }).catch(() => null),
          axios.get(`${LINK}/api/warehouses?scope=mine`, { headers: authHeaders() }).catch(() => null),
        ]);

        if (!mounted) return;

        const profileData = profileRes?.data || {};
        const dw = profileData?.defaultWarehouse || profileData?.default_warehouse || profileData?.defaultWarehouseId || profileData?.warehouseId || (profileData?.warehouse && profileData.warehouse._id) || "";
        setDefaultWarehouseId(dw || "");

        const whList = (whRes?.data?.data || []).map((w) => ({ label: w.warehouseName, value: w._id, status: w.status, isRestricted: !!w.isRestricted }));
        setWarehouses(whList);

        // decide selected warehouse (mirror POS logic)
        if (whList.length) {
          if (dw) {
            const found = whList.find((w) => w.value === dw);
            if (found) {
              setSelectedWarehouse(found);
            } else {
              const restricted = whList.find((w) => w.isRestricted && w.status === "Active");
              const active = whList.find((w) => w.status === "Active");
              setSelectedWarehouse(restricted || active || whList[0]);
            }
          } else {
            const restricted = whList.find((w) => w.isRestricted && w.status === "Active");
            const active = whList.find((w) => w.status === "Active");
            setSelectedWarehouse(restricted || active || whList[0]);
          }
        }
      } catch (err) {
        console.error("init load failed", err);
      }
    };

    load();
    return () => { mounted = false; };
  }, [authHeaders]);

  // fetch item details helper (images / barcodes)
  const fetchItemDetails = useCallback(async (itemId) => {
    if (!itemId) return { itemImages: [], barcodes: [], itemCode: "" };
    try {
      const res = await axios.get(`${LINK}/api/items/${itemId}`, { headers: authHeaders() }).catch(() => null);
      const payload = res?.data || {};
      const itemData = payload?.data || payload?.item || payload || {};

      let images = itemData.itemImages || itemData.images || payload.itemImages || payload.images || [];
      if (!Array.isArray(images)) images = [];
      images = images
        .map((img) => {
          if (!img) return null;
          if (typeof img === "string") return img;
          if (typeof img === "object") return img.fileName || img.filename || img.name || img.url || img.path || null;
          return null;
        })
        .filter(Boolean);

      let barcodes = itemData.barcodes || itemData.barcode || payload.barcodes || [];
      if (!Array.isArray(barcodes)) {
        if (typeof barcodes === "string" && barcodes.trim()) barcodes = [barcodes.trim()];
        else barcodes = [];
      }
      barcodes = barcodes.map((b) => {
        if (!b) return null;
        if (typeof b === "string") return b;
        if (typeof b === "object") return b.code || b.barcode || b.value || b.code_value || null;
        return null;
      }).filter(Boolean);

      const itemCode = itemData.itemCode || itemData.code || itemData.sku || payload.itemCode || "";

      return { itemImages: images, barcodes, itemCode };
    } catch (err) {
      console.warn("fetchItemDetails error", err);
      return { itemImages: [], barcodes: [], itemCode: "" };
    }
  }, [authHeaders]);

  // fetch stock helper
  const fetchStockForItem = useCallback(async (invId, warehouseId) => {
    if (!invId || !warehouseId) return null;
    try {
      const res = await axios.get(`${LINK}/api/stock/${invId}`, { headers: authHeaders(), params: { warehouse: warehouseId } });
      const data = res?.data;
      if (data == null) return null;
      if (typeof data === "number") return data;
      if (typeof data.currentStock === "number") return data.currentStock;
      if (typeof data.openingStock === "number" && typeof data.currentStock !== "number") return data.openingStock;
      if (data.data && typeof data.data.currentStock === "number") return data.data.currentStock;
      if (data.data && typeof data.data.openingStock === "number") return data.data.openingStock;
      return null;
    } catch (err) {
      console.warn("fetchStockForItem error", err);
      return null;
    }
  }, [authHeaders]);

  // fetch the report and enrich rows (called on Apply Filter)
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { start: dateFrom, end: dateTo };
      if (selectedWarehouse?.value) params.warehouseId = selectedWarehouse.value;
      const res = await axios.get(`${LINK}/club-bill-report/club-bill-report`, { headers: authHeaders(), params }).catch((e) => { throw e; });

      const items = res.data?.items || [];
      console.log("Fetched items", items);
      const mapped = (items || []).map((i) => ({
        mrp: i.mrp || 0,
        skuId: i.skuId,
        itemId: i.itemId || (i.item && (i.item._id || i.item.id)) || null,
        itemName: i.itemName || (i.item && i.item.itemName) || i.name || "Unnamed",
        opening: Number(i.opening || 0),
        closingStock: Number(i.closingStock || 0),
        pendingQty: Number(typeof i.pendingQty === "number" ? i.pendingQty : (i.pendingQty || 0)),
        warehouseId: i.warehouse?._id || i.warehouseId || (selectedWarehouse?.value || null),
        warehouseName: i.warehouse?.warehouseName || (selectedWarehouse?.label || "All"),
      }));

      const onlyPending = mapped.filter((r) => r.pendingQty > 0);

      // enrich with images/barcodes — limited parallelism (map in batches could be added if huge)
      const enriched = await Promise.all(onlyPending.map(async (it) => {
        if (!it.itemId) return { ...it, itemImages: [], barcodes: [], itemCode: "" };
        const details = await fetchItemDetails(it.itemId);
        return { ...it, itemImages: details.itemImages || [], barcodes: details.barcodes || [], itemCode: details.itemCode || "" };
      }));

      setReport(enriched);
    } catch (err) {
      console.error("fetchReport error", err);
      setError(err?.response?.data?.message || "Failed to fetch report");
      setReport([]);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, selectedWarehouse, fetchItemDetails, authHeaders]);

  // open modal and fetch stocks (selected + default)
  const handleOpenItemModal = useCallback(async (item) => {
    setModalItem(item);
    setModalLoading(true);
    setModalStocks({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: selectedWarehouse?.label || "Selected" });
    try {
      const invId = item.itemId || item.skuId || null;
      const selectedWId = selectedWarehouse?.value || null;
      const defWId = defaultWarehouseId || null;
      const selPromise = selectedWId && invId ? fetchStockForItem(invId, selectedWId) : Promise.resolve(null);
      const defPromise = defWId && invId ? fetchStockForItem(invId, defWId) : Promise.resolve(null);
      const [selStock, defStock] = await Promise.all([selPromise, defPromise]);
      setModalStocks({ selectedWarehouseStock: selStock, defaultWarehouseStock: defStock, selectedWarehouseLabel: selectedWarehouse?.label || "Selected" });
    } catch (err) {
      console.error("handleOpenItemModal error", err);
    } finally {
      setModalLoading(false);
    }
  }, [selectedWarehouse, defaultWarehouseId, fetchStockForItem]);

  const closeModal = useCallback(() => {
    setModalItem(null);
    setModalStocks({ selectedWarehouseStock: null, defaultWarehouseStock: null, selectedWarehouseLabel: null });
    setModalLoading(false);
  }, []);

  // memoized rows (reduces render churn)
  const rows = useMemo(() => report || [], [report]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-grow">
        <div className="w-auto"><Sidebar isSidebarOpen={isSidebarOpen} /></div>

        <main className="flex-1 p-4 bg-gray-100">
          <div className="mb-4">
            <h1 className="text-2xl font-bold">Club Bill Report</h1>
            <p className="text-sm text-gray-500">Select warehouse & date range → Apply Filter</p>
          </div>

          <div className="bg-white rounded shadow p-4 mb-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Warehouse</label>
                <Select options={warehouses} value={selectedWarehouse} onChange={(v) => setSelectedWarehouse(v)} isClearable={false} />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded" />
              </div>

              <div className="flex items-end justify-end gap-2">
                <button onClick={fetchReport} disabled={loading} className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 disabled:opacity-60">
                  {loading ? "Loading..." : "Apply Filter"}
                </button>

                <div className="relative">
                  <button onClick={() => {}} className="px-3 py-2 border rounded bg-white">Export</button>
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow p-1 hidden">{/* keep for future dropdown */}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded shadow overflow-x-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                
                <div className="text-sm text-gray-500">Warehouse: {selectedWarehouse?.label || "All"} · {dateFrom}{dateTo ? ` → ${dateTo}` : ""}</div>
              </div>
              <div className="text-sm text-gray-600">{rows.length} items</div>
            </div>

            <table className="min-w-full divide-y">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Item</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">MRP</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Pending</th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y">
                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-500">No records found</td>
                  </tr>
                )}

                {rows.map((it, idx) => (
                  <ItemRow  key={`${it.itemId || it.skuId || "unknown"}-${it.warehouseId || "wh"}-${idx}`} it={it} idx={idx} onOpen={handleOpenItemModal} setPreviewItem={setPreviewItem} />
                ))}

                {loading && (
                  <tr>
                    <td colSpan={3} className="p-6 text-center text-gray-500">Loading...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {error && <div className="mt-3 text-red-600">{error}</div>}
        </main>
      </div>

      <ItemDetailModal open={!!modalItem} onClose={closeModal} item={modalItem || {}} stocks={modalStocks} warehouses={warehouses} defaultWarehouseId={defaultWarehouseId} />
       {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => {
            setPreviewItem(null);
          }}
        >
          <div
            className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {previewItem.itemName} – images
              </h3>
              <button
                className="text-2xl font-bold text-red-600"
                onClick={() => {
                  setPreviewItem(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {previewItem.itemImages.map((fn, idx) => {
                const url = fn.startsWith("http")
                  ? fn
                  : `${LINK}/uploads/qr/items/${fn}`;
                return (
                  <div key={idx} className="relative group">
                    <img
                      src={url} loading="lazy"
                      alt={`${previewItem.itemName} ${idx + 1}`}
                      className="object-cover w-full h-64 rounded cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
