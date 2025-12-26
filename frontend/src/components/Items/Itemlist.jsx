// import React, { useState, useEffect, useMemo } from "react";
// import Sidebar from "../Sidebar";
// import Navbar from "../Navbar";
// import { BiChevronRight } from "react-icons/bi";
// import {
//   FaTachometerAlt,
//   FaEdit,
//   FaTrash,
//   FaSortUp,
//   FaSortDown,
//   FaEllipsisH,
// } from "react-icons/fa";
// import { Link, NavLink, useNavigate } from "react-router-dom";
// import axios from "axios";
// import Select from "react-select";
// import * as XLSX from "xlsx";
// import LoadingScreen from "../../Loading";

// const FILES_BASE = "/vps/uploads/qr/items";
// const escapeRegex = (str) =>
//   str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// /* ---------------- CSV / XLSX helpers ---------------- */
// const downloadCSV = (rows, file = "items_export.csv") => {
//   const ws = XLSX.utils.json_to_sheet(rows);
//   const blob = new Blob([XLSX.utils.sheet_to_csv(ws)], {
//     type: "text/csv;charset=utf-8;",
//   });
//   Object.assign(document.createElement("a"), {
//     href: URL.createObjectURL(blob),
//     download: file,
//   }).click();
// };
// const downloadXLSX = (rows, file = "items_export.xlsx") => {
//   const wb = XLSX.utils.book_new();
//   XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Items");
//   XLSX.writeFile(wb, file);
// };

// export default function ItemList() {
//   const navigate = useNavigate();

//   /* ---------------- basic state ---------------- */
//   const [isSidebarOpen, setSidebarOpen] = useState(true);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   /* full catalogue, NOT filtered by warehouse */
//   const [items, setItems] = useState([]);

//   /* live stocks for the currently-selected warehouse
//      (or total across all)  ->  { itemId: qty }            */
//   const [stockMap, setStockMap] = useState({});

//   /* dropdown look-ups */
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [categoryOptions, setCategoryOptions] = useState([]);

//   /* filters & sort */
//   const [warehouseFilter, setWarehouseFilter] = useState("all");
//   const [categoryFilter, setCategoryFilter] = useState("all");
//   const [searchTerm, setSearchTerm] = useState("");
//   const [sortField, setSortField] = useState("itemCode");
//   const [sortDir, setSortDir] = useState("asc");

//   /* pagination */
//   const [currentPage, setCurrentPage] = useState(1);
//   const perPage = 10;

//   /* misc pop-ups */
//   const [dropdownOpenFor, setDropdownOpenFor] = useState(null);
//   const [stockModal, setStockModal] = useState(null);
//   const [previewItem, setPreviewItem] = useState(null);
//   const [popupImage, setPopupImage] = useState(null);
//   const [popupIndex, setPopupIndex] = useState(null);

//   const auth = () => ({
//     headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//   });

//   /* ---------- 1. fetch full catalogue once ---------- */
//   const fetchCatalogue = async () => {
//     setLoading(true);
//     try {
//       const { data } = await axios.get("https://pos.inspiredgrow.in/vps/api/items", auth());
//       setItems(data.data || []);
//     } catch {
//       setError("Failed to fetch items — try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ---------- 2. fetch stocks for ONE warehouse ---------- */
//   const fetchWarehouseStocks = async (whId) => {
//     if (whId === "all") return {};
//     const { data } = await axios.get("https://pos.inspiredgrow.in/vps/api/items", {
//       ...auth(),
//       params: { warehouse: whId, page: 1, limit: 10000 },
//     });
//     const map = {};
//     (data.data || []).forEach(
//       (it) => (map[it._id] = it.currentStock ?? 0)
//     );
//     return map;
//   };

//   /* ---------- 3. compute TOTAL stock across all ---------- */
//   const fetchTotalsAcrossWarehouses = async () => {
//     const active = warehouseOptions.filter((w) => w.value !== "all");
//     if (active.length === 0) return {};
//     const reqs = active.map((w) =>
//       axios.get("https://pos.inspiredgrow.in/vps/api/items", {
//         ...auth(),
//         params: { warehouse: w.value, page: 1, limit: 10000 },
//       })
//     );
//     const res = await Promise.all(reqs);
//     const totals = {};
//     res.forEach(({ data }) => {
//       (data.data || []).forEach((it) => {
//         const id = it._id;
//         totals[id] = (totals[id] || 0) + (it.currentStock ?? 0);
//       });
//     });
//     return totals;
//   };

//   /* ---------- 4. master “refreshStocks” ---------- */
//   const refreshStocks = async (whId) => {
//     setLoading(true);
//     try {
//       const map =
//         whId === "all"
//           ? await fetchTotalsAcrossWarehouses()
//           : await fetchWarehouseStocks(whId);
//       setStockMap(map);
//     } catch {
//       setError("Failed to fetch stock numbers.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ---------- initial load ---------- */
//   useEffect(() => {
//     if (window.innerWidth < 768) setSidebarOpen(false);
//     (async () => {
//       const [whRes, catRes] = await Promise.all([
//         axios.get("https://pos.inspiredgrow.in/vps/api/warehouses", auth()),
//         axios.get("https://pos.inspiredgrow.in/vps/api/categories", auth()),
//       ]);
//       setWarehouseOptions([
//         { label: "All Warehouses", value: "all" },
//         ...(whRes.data.data || []).map((w) => ({
//           label: w.warehouseName,
//           value: w._id,
//         })),
//       ]);
//       setCategoryOptions([
//         { label: "All Categories", value: "all" },
//         ...(catRes.data.data || []).map((c) => ({
//           label: c.name,
//           value: c._id,
//         })),
//       ]);
//       await fetchCatalogue();
//       await refreshStocks("all");
//     })();
//   }, []);

//   /* ---------- whenever warehouse changes ---------- */
//   useEffect(() => {
//     refreshStocks(warehouseFilter);
//     setCurrentPage(1);
//   }, [warehouseFilter]);

//   /* ---------- derive rows with rowStock ---------- */
//   const rows = useMemo(() => {
//     const result = items.map((it) => ({
//       ...it,
//       rowStock: stockMap[it._id] ?? 0,
//       presentInWh: stockMap.hasOwnProperty(it._id),
//     }));
//     return result;
//   }, [items, stockMap]);

//   /* ---------- filter / search / sort ---------- */
//   const filtered = useMemo(() => {
//     let data = [...rows];
//      // hide items that are not in the selected warehouse
//   if (warehouseFilter !== "all") {
//     data = data.filter(
//       (it) =>
//         stockMap.hasOwnProperty(it._id) ||
//         it.warehouse?._id === warehouseFilter
//     );
//   }
//     if (searchTerm.trim()) {
//       const safeTerm = escapeRegex(searchTerm.trim());
//  const re       = new RegExp(safeTerm, "i");
//       data = data.filter(
//         (it) =>
//           re.test(it.itemName) ||
//           re.test(it.itemCode) ||
//           (it.barcodes || []).some((b) => re.test(b))
//       );
//     }

//     if (categoryFilter !== "all")
//       data = data.filter((it) => it.category?._id === categoryFilter);

//     data.sort((a, b) => {
//       const get = (o) =>
//         sortField === "rowStock" ? o.rowStock : o[sortField] ?? "";
//       const v1 = get(a);
//       const v2 = get(b);
//       if (v1 < v2) return sortDir === "asc" ? -1 : 1;
//       if (v1 > v2) return sortDir === "asc" ? 1 : -1;
//       return 0;
//     });

//     return data;
//   }, [rows, searchTerm, categoryFilter, sortField, sortDir]);

//   /* ---------- pagination ---------- */
//   const totalPages = Math.ceil(filtered.length / perPage);
//   const pageStart = (currentPage - 1) * perPage;
//   const pageSlice = filtered.slice(pageStart, pageStart + perPage);

//   /* ---------- delete ---------- */
//   const handleDelete = async (id) => {
//     if (!window.confirm("Delete this item?")) return;
//     setLoading(true);
//     try {
//       await axios.delete(`https://pos.inspiredgrow.in/vps/api/items/${id}`, auth());
//       await fetchCatalogue();
//       await refreshStocks(warehouseFilter);
//     } catch {
//       setError("Delete failed — try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   /* ---------- visibility toggle ---------- */
//   const toggleVisibility = async (row) => {
//     setRowsOptimistic(row._id, { isOnline: !row.isOnline });
//     try {
//       await axios.put(
//         `https://pos.inspiredgrow.in/vps/api/items/${row._id}`,
//         { isOnline: !row.isOnline },
//         auth()
//       );
//     } catch {
//       setRowsOptimistic(row._id, { isOnline: row.isOnline });
//       alert("Could not update visibility.");
//     }
//   };
//   const setRowsOptimistic = (id, patch) =>
//     setItems((prev) =>
//       prev.map((it) => (it._id === id ? { ...it, ...patch } : it))
//     );

//   /* ---------- stock modal ---------- */
//   const openStockModal = async (item) => {
//     try {
//       const active = warehouseOptions.filter((w) => w.value !== "all");
//       const reqs = active.map((w) =>
//         axios.get("https://pos.inspiredgrow.in/vps/api/items", {
//           ...auth(),
//           params: { warehouse: w.value, search: item.itemCode, page: 1, limit: 1 },
//         })
//       );
//       const res = await Promise.allSettled(reqs);
//       const stocksByWh = res.map((r, i) => {
//         const wh = active[i];
//         if (r.status !== "fulfilled") return { id: wh.value, name: wh.label, stock: "N/A" };
//         const row = r.value.data.data?.[0];
//         return { id: wh.value, name: wh.label, stock: row ? row.currentStock ?? 0 : 0 };
//       });
//       setStockModal({ ...item, stocksByWh });
//     } catch {
//       alert("Failed to load stock breakdown.");
//     }
//   };
  
//   const handleRemoveImage = async (index) => {
//     if (!window.confirm("Remove this image?")) return;

//     // 1) Grab the code/filename of the image you’re removing
//     const removedImage = previewItem.itemImages[index];

//     // 2) Update local state immediately for snappy UI
//     setPreviewItem((prev) => {
//       const newImages = [...prev.itemImages];
//       newImages.splice(index, 1);
//       return { ...prev, itemImages: newImages };
//     });

//     // 3) Tell your backend to actually delete it
//     try {
//       // adjust this endpoint to match your API
//       await axios.delete(`https://pos.inspiredgrow.in/vps/items/${previewItem._id}/images/${removedImage}`); 
//       // or, if your API uses PATCH:
//       // await axios.patch(`/items/${previewItem._id}`, { removeImage });
//     } catch (err) {
//       console.error("Failed to remove image on server:", err);
//       // Optionally roll back UI state or show an error toast
//     }
//   };

//   /* ---------- render ---------- */
//   if (loading) return <LoadingScreen />;
//   if (error) return <div className="p-4 text-red-600">{error}</div>;

//   return (
//     <div className="flex flex-col h-screen">
//       <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
//       <div className="flex flex-grow">
//         <Sidebar isSidebarOpen={isSidebarOpen} />

//         <div className="flex-grow p-4 mt-20">
//           {/* header */}
//           <header className="flex flex-col justify-between mb-6 md:flex-row">
//             <h2 className="text-2xl font-bold">Items List</h2>
//             <nav className="flex gap-2 mt-2 text-gray-600 md:mt-0">
//               <NavLink to="/dashboard" className="flex items-center">
//                 <FaTachometerAlt /> Home
//               </NavLink>
//               <BiChevronRight />
//               <NavLink to="/item-list">Items List</NavLink>
//             </nav>
//           </header>

//           {/* filters */}
//           <div className="flex flex-wrap items-end gap-4 p-4 mb-4 bg-white rounded shadow">
//             <div className="w-48">
//               <label className="block mb-1">Warehouse</label>
//               <Select
//                 options={warehouseOptions}
//                 value={warehouseOptions.find((o) => o.value === warehouseFilter)}
//                 onChange={(o) => setWarehouseFilter(o.value)}
//               />
//             </div>

//             <div className="w-48">
//               <label className="block mb-1">Category</label>
//               <Select
//                 options={categoryOptions}
//                 value={categoryOptions.find((o) => o.value === categoryFilter)}
//                 onChange={(o) => {
//                   setCategoryFilter(o.value);
//                   setCurrentPage(1);
//                 }}
//               />
//             </div>

//             <div className="flex-1 min-w-[200px]">
//               <label className="block mb-1">Search</label>
//               <input
//                 value={searchTerm}
//                 onChange={(e) => {
//                   setSearchTerm(e.target.value);
//                   setCurrentPage(1);
//                 }}
//                 placeholder="Code / name / barcode"
//                 className="w-full px-3 py-2 border rounded"
//               />
//             </div>

//             <div className="w-48">
//               <label className="block mb-1">Sort by</label>
//               <Select
//                 options={[
//                   { label: "Item Code ↑", value: "itemCode|asc" },
//                   { label: "Item Code ↓", value: "itemCode|desc" },
//                   { label: "Stock Low→High", value: "rowStock|asc" },
//                   { label: "Stock High→Low", value: "rowStock|desc" },
//                   { label: "Price Low→High", value: "salesPrice|asc" },
//                   { label: "Price High→Low", value: "salesPrice|desc" },
//                 ]}
//                 onChange={(o) => {
//                   const [f, d] = o.value.split("|");
//                   setSortField(f);
//                   setSortDir(d);
//                 }}
//               />
//             </div>

//             <div className="flex gap-2 ml-auto">
//               <button
//                 onClick={() => downloadCSV(filtered)}
//                 className="px-4 py-2 text-white bg-gray-500 rounded"
//               >
//                 CSV
//               </button>
//               <button
//                 onClick={() => downloadXLSX(filtered)}
//                 className="px-4 py-2 text-white bg-gray-700 rounded"
//               >
//                 XLSX
//               </button>
//               <Link to="/items/add">
//                 <button className="px-4 py-2 text-white rounded bg-cyan-500">
//                   + Create Item
//                 </button>
//               </Link>
//             </div>
//           </div>

//           {/* table */}
//           <div className="overflow-x-auto bg-white rounded shadow">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-200">
//                   {[
//                     { label: "Image", field: null },
//                     { label: "Code", field: "itemCode" },
//                     { label: "Name", field: null },
//                     //{ label: "Brand", field: null },
//                     { label: "Category", field: null },
//                     { label: "Stock", field: "rowStock" },
//                     { label: "Price", field: "salesPrice" },
//                     { label: "Visibility", field: null },
//                     { label: "Action", field: null },
//                   ].map(({ label, field }) => (
//                     <th key={label} className="px-2 py-1 border">
//                       <div className="flex items-center justify-center">
//                         {label}
//                         {field && (
//                           <span className="flex flex-col ml-1">
//                             <FaSortUp
//                               className={`cursor-pointer ${
//                                 sortField === field && sortDir === "asc"
//                                   ? "text-blue-600"
//                                   : "text-gray-400"
//                               }`}
//                               onClick={() => {
//                                 setSortField(field);
//                                 setSortDir("asc");
//                               }}
//                             />
//                             <FaSortDown
//                               className={`cursor-pointer ${
//                                 sortField === field && sortDir === "desc"
//                                   ? "text-blue-600"
//                                   : "text-gray-400"
//                               }`}
//                               onClick={() => {
//                                 setSortField(field);
//                                 setSortDir("desc");
//                               }}
//                             />
//                           </span>
//                         )}
//                       </div>
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {pageSlice.length ? (
//                   pageSlice.map((it) => {
//                     const img = it.itemImages?.[0]
//                       ? `${FILES_BASE}/${it.itemImages[0]}`
//                       : null;
//                     return (
//                       <tr key={it._id}>
//                         <td className="px-2 py-1 text-center border">
//                           {img ? (
//                             <img
//                               src={img}
//                               alt={it.itemName}
//                               className="object-cover w-10 h-10 mx-auto cursor-pointer"
//                               onClick={() => setPreviewItem(it)}
//                             />
//                           ) : (
//                             "—"
//                           )}
//                         </td>
//                         <td className="px-2 py-1 border">{it.itemCode}</td>
//                         <td className="px-2 py-1 border">{it.itemName}</td>
//                         {/*<td className="px-2 py-1 border">
//                           {it.brand?.brandName || "—"}
//                         </td>*/}
//                         <td className="px-2 py-1 border">
//                           {it.category?.name || "—"}
//                         </td>
//                         <td className="px-2 py-1 text-center border">
//                           {it.rowStock}
//                           <FaEllipsisH
//                             className="inline ml-1 cursor-pointer"
//                             onClick={() => openStockModal(it)}
//                           />
//                         </td>
//                         <td className="px-2 py-1 text-right border">
//                           {it.salesPrice}
//                         </td>
//                         <td className="px-2 py-1 text-center border">
//                           <span
//                             onClick={() => toggleVisibility(it)}
//                             className={`px-2 py-1 rounded text-xs cursor-pointer select-none ${
//                               it.isOnline
//                                 ? "bg-green-600 text-white hover:bg-green-700"
//                                 : "bg-red-500 text-white hover:bg-red-600"
//                             }`}
//                           >
//                             {it.isOnline ? "Online" : "Offline"}
//                           </span>
//                         </td>
//                         <td className="relative px-2 py-1 border">
//                           <button
//                             onClick={() =>
//                               setDropdownOpenFor(
//                                 dropdownOpenFor === it._id ? null : it._id
//                               )
//                             }
//                             className="px-2 py-1 text-white rounded bg-cyan-600"
//                           >
//                             Action ▼
//                           </button>
//                           {dropdownOpenFor === it._id && (
//                             <div className="absolute right-0 z-50 mt-1 bg-white border rounded shadow">
//                               <button
//                                 className="flex items-center w-full px-3 py-2 hover:bg-gray-100"
//                                 onClick={() =>
//                                   navigate(
//                                     `/items/add?id=${
//                                       it.parentItemId || it._id
//                                     }`
//                                   )
//                                 }
//                               >
//                                 <FaEdit className="mr-2" /> Edit
//                               </button>
//                               <button
//                                 className="flex items-center w-full px-3 py-2 text-red-600 hover:bg-gray-100"
//                                 onClick={() => handleDelete(it._id)}
//                               >
//                                 <FaTrash className="mr-2" /> Delete
//                               </button>
//                             </div>
//                           )}
//                         </td>
//                       </tr>
//                     );
//                   })
//                 ) : (
//                   <tr>
//                     <td colSpan="9" className="py-4 text-center">
//                       No data
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* pagination */}
//           <div className="flex items-center justify-between px-2 mt-4">
//             <span>
//               Showing {pageStart + 1}–
//               {Math.min(pageStart + perPage, filtered.length)} of{" "}
//               {filtered.length}
//             </span>
//             <div className="space-x-2">
//               <button
//                 onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
//                 disabled={currentPage === 1}
//                 className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
//               >
//                 Previous
//               </button>
//               <button
//                 onClick={() =>
//                   setCurrentPage((p) => Math.min(p + 1, totalPages))
//                 }
//                 disabled={currentPage === totalPages}
//                 className="px-3 py-1 bg-gray-300 rounded disabled:opacity-50"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* ---------------- Stock Modal ---------------- */}
//       {stockModal && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
//           onClick={() => setStockModal(null)}
//         >
//           <div
//             className="w-full max-w-md p-4 bg-white rounded-lg shadow-lg"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between mb-2">
//               <h3 className="text-lg font-semibold">Warehouse Wise Stock</h3>
//               <button
//                 className="text-2xl font-bold text-red-600"
//                 onClick={() => setStockModal(null)}
//               >
//                 ×
//               </button>
//             </div>
//             <div className="mb-2">
//               <p>
//                 <strong>Item Name:</strong>{" "}
//                 {stockModal.itemName || "N/A"}
//               </p>
//               <p>
//                 <strong>Sales Price:</strong>{" "}
//                 {stockModal.salesPrice || "N/A"}
//               </p>
//             </div>
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="text-white bg-blue-500">
//                   <th className="px-2 py-1 border">#</th>
//                   <th className="px-2 py-1 border">Warehouse</th>
//                   <th className="px-2 py-1 border">Stock</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stockModal.stocksByWh.map((row, i) => (
//                   <tr key={row.id} className="border">
//                     <td className="px-2 py-1 border">{i + 1}</td>
//                     <td className="px-2 py-1 border">{row.name}</td>
//                     <td className="px-2 py-1 border">{row.stock}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//             <button
//               className="px-4 py-2 mt-4 bg-gray-300 rounded hover:bg-gray-400"
//               onClick={() => setStockModal(null)}
//             >
//               Close
//             </button>
//           </div>
//         </div>
//       )}

//       {/* ---------------- Image Preview ---------------- */}
//       {previewItem && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
//           onClick={() => {
//             setPreviewItem(null);
//             setPopupImage(null);
//           }}
//         >
//           <div
//             className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] p-4 overflow-auto"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="text-lg font-semibold">
//                 {previewItem.itemName} – images
//               </h3>
//               <button
//                 className="text-2xl font-bold text-red-600"
//                 onClick={() => {
//                   setPreviewItem(null);
//                   setPopupImage(null);
//                 }}
//               >
//                 ×
//               </button>
//             </div>

//             <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
//               {previewItem.itemImages.map((fn, idx) => {
//                 const url = fn.startsWith("http")
//                   ? fn
//                   : `${FILES_BASE}/${fn}`;
//                 return (
//                   <div key={idx} className="relative group">
//                     <img
//                       src={url}
//                       alt={`${previewItem.itemName} ${idx + 1}`}
//                       className="object-cover w-full h-64 rounded cursor-pointer"
//                       onClick={() => {
//                         setPopupImage(fn);
//                         setPopupIndex(idx);
//                       }}
//                       onError={(e) => {
//                         e.currentTarget.src =
//                           "https://via.placeholder.com/150";
//                       }}
//                     />
//                   </div>
//                 );
//               })}
//             </div>

//             {/* confirm delete */}
//             {popupImage && (
//               <div
//                 className="fixed inset-0 flex items-center justify-center z-60 bg-black/50"
//                 onClick={() => setPopupImage(null)}
//               >
//                 <div
//                   className="w-full max-w-sm p-6 bg-white rounded-lg shadow-lg"
//                   onClick={(e) => e.stopPropagation()}
//                 >
//                   <h4 className="mb-4 text-lg font-semibold">
//                     Remove this image?
//                   </h4>
//                   <p className="mb-6 text-sm text-gray-700">
//                     Are you sure you want to remove{" "}
//                     <span className="font-medium">{popupImage}</span>?
//                   </p>
//                   <div className="flex justify-end gap-2">
//                     <button
//                       className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
//                       onClick={() => setPopupImage(null)}
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
//                       onClick={() => {
//                         handleRemoveImage(popupIndex);
//                         setPopupImage(null);
//                       }}
//                     >
//                       Yes, Remove
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
const BulkImportUI = () => {
  const [excelFile, setExcelFile] = useState(null);
  const [imageFiles, setImageFiles] = useState([]);
  const [finalData, setFinalData] = useState([]);
  const [message, setMessage] = useState("");

  const handleExcelChange = (e) => setExcelFile(e.target.files[0]);
  const handleFolderChange = (e) => setImageFiles([...e.target.files]);

  const handleImport = async () => {
    if (!excelFile) return setMessage("Please select Excel file");
    if (imageFiles.length === 0) return setMessage("Please select image folder");

    try {
      const buf = await excelFile.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });

      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: "A" });


      console.log("Excel rows:", rows);

      let output = [];

      rows.forEach((row) => {
        const itemName = row["A"];
        const excelFullPath = row["L"];

        if (!itemName || !excelFullPath) return;

        // Extract only the last folder name
        const folderName = excelFullPath.split("\\").pop().trim();

        // Find all uploaded images belonging to this folder
        const matchedImages = imageFiles.filter((file) =>
          file.webkitRelativePath.includes(folderName + "/")
        );

        const obj = {
          itemName,
          itemImages: matchedImages.map((file) => "15-11-25/" +folderName + "/" + file.name),
          imageCode:folderName
        };

        output.push(obj);
      });

      setFinalData(output);
      console.log("FINAL DATA:", output);
      await submit (output)
      setMessage("Imported successfully! Check console.");

    } catch (e) {
      console.error(e);
      setMessage("Error: " + e.message);
    }
  };

  async function submit(a){
    try {
      const r=await axios.post('https://pos.inspiredgrow.in/vps/api/categories/bulk-update', {a},{
        headers:{
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
      console.log(r.data);
      setMessage('Data uploaded successfully!');
    } catch (error) {
      console.error(error);
    }
}
  return (
    <div style={{ padding: 20 }}>
      <h2>Bulk Import (Excel + Image Folder)</h2>

      <input type="file" accept=".xlsx,.xls" onChange={handleExcelChange} />
      <br /><br />

      <input
        type="file"
        webkitdirectory="true"
        directory=""
        multiple
        onChange={handleFolderChange}
      />
      <br /><br />

      <button onClick={handleImport}>Process</button>
      <p>{message}</p>
    </div>
  );
};

export default BulkImportUI;
