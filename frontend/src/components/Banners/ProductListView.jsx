import React, { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import axios from "axios";
import PurchaseOverview from "./ProductEdit.jsx";
import { useNavigate } from "react-router-dom";
export default function ProductListView() {
  const navigate =useNavigate();
  const [isOverviewOpen, setOverviewOpen] = useState(false);
  const [sa, setSa] = useState({});
  const link = "https://pos.inspiredgrow.in/vps/"; // keep your base URL here if needed
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [folders, setFolders] = useState([]); // always keep this as array
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1); // pagination
  const [productId, setProductId] = useState(null);
 
      

 

  // helper: normalize API response to array
  const extractArrayFromResponse = (resData) => {
    if (Array.isArray(resData)) return resData;
    if (resData == null) return [];
    // common shapes:
    if (Array.isArray(resData.data)) return resData.data;
    if (Array.isArray(resData.folders)) return resData.folders;
    if (Array.isArray(resData.products)) return resData.products;
    // fallback: try to find first array property
    const firstArray = Object.values(resData).find((v) => Array.isArray(v));
    return firstArray || [];
  };

  useEffect(() => {
    async function fetchFolders() {
      try {
        setLoading(true);
        const token = `Bearer ${localStorage.getItem("token")}`;
        const res = await axios.get(
          `${link}/api/product/all?page=${page}&limit=20`,
          { headers: { Authorization: token } }
        );

        const newItems = extractArrayFromResponse(res.data);

        setFolders(newItems );
      } catch (error) {
        console.error("❌ Error fetching folders:", error);
      } finally {
          setLoading(false);
      }
    }
    fetchFolders();
  }, []);

  // Delete media (updates UI immutably)
  const handleDelete = async (folderId, mediaId) => {
    try {
      const token = `Bearer ${localStorage.getItem("token")}`;
      await axios.delete(`${link}/api/product/${folderId}/media/${mediaId}`, {
        headers: { Authorization: token },
      });

      setFolders((prev) =>
        prev.map((f) =>
          f._id === folderId
            ? { ...f, media: (f.media || []).filter((m) => m._id !== mediaId) }
            : f
        )
      );
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  };

  // fetch all support data once (brands, categories, etc.)
  const [f, setf] = useState({});
  useEffect(() => {
    const authHeader = {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    };

    const fetchAll = async () => {
      try {
        const [brandRes, categoryRes, subCatRes, subSubCatRes, itemRes] = await Promise.all([
          axios.get(`${link}/api/brands`, authHeader),
          axios.get(`${link}/api/categories`, authHeader),
          axios.get(`${link}/api/subcategories`, authHeader),
          axios.get(`${link}/api/sub-subcategories`, authHeader),
          axios.get(`${link}/api/items`, authHeader),
        ]);

        const Brands = (brandRes.data?.data || []).map((b) => ({ value: b._id, label: b.brandName }));
        const Categories = (categoryRes.data?.data || []).map((c) => ({ value: c._id, label: c.name }));
        const SubCategories = (subCatRes.data?.data || []).map((s) => ({ value: s._id, label: s.name }));
        const SubSubCategories = (subSubCatRes.data?.data || []).map((ss) => ({ value: ss._id, label: ss.name }));
        const setItems = itemRes.data?.data || [];

        setf({ Brands, Categories, SubCategories, SubSubCategories, setItems });
        console.log("Fetched support data (not state):", {
          BrandsLength: Brands.length,
          CategoriesLength: Categories.length,
          ItemsLength: setItems.length,
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, []); // run once

  return (
    <div className="flex flex-col bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-grow">
        <div>
          <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>

        <div className="flex flex-col flex-grow p-6 overflow-y-auto">
          <h1 className="flex items-center gap-2 mb-6 text-2xl font-bold text-gray-800">📂 Media Library</h1>

          {/* safe check: ensure folders is array */}
          {(!Array.isArray(folders) || folders.length === 0) && !loading && (
            <p className="text-gray-600">No folders found.</p>
          )}

          {(Array.isArray(folders) ? folders : []).filter((folder) => Array.isArray(folder.media) && folder.media.length > 0)
            .map((folder, fIdx) => (
              <div key={folder._id || fIdx} className="mb-12">
               <div className="flex items-center justify-between mb-6">
  {/* Folder Name Heading */}
  <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
    <span className="text-blue-500">📁</span> {folder.folderName}
  </h2>

  {/* Add Folder Button */}
  <button
    onClick={() => navigate(`/product/add?folderId=${folder._id}`)} // Aapka logic function yahan aayega
    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all"
  >
    <span className="text-lg">+</span>
    <span>New Folder</span>
  </button>
</div>
                {isOverviewOpen && (
                  <PurchaseOverview
                    f={f}
                    isOpen={isOverviewOpen}
                    setIsOpen={setOverviewOpen}
                    onClose={() => {
                      setOverviewOpen(false);
                      setPage(1); 
                    }}
                    sa={sa}
                  />
                )}

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                  {folder.media.map((m, idx) => (
                    <div key={m._id || idx} className="flex flex-col p-3 transition-all bg-white shadow rounded-2xl hover:shadow-lg">
                      <div className="relative w-full h-40">
                        {m.url?.endsWith(".mp4") ? (
                          <video src={`https://pos.inspiredgrow.in/vps/${m.url}`} controls className="object-cover w-full h-full rounded-lg" />
                        ) : (
                          <img src={`https://pos.inspiredgrow.in/vps/${m.url}`} alt="media" loading="lazy" className="object-cover w-full h-full rounded-lg" />
                        )}
                      </div>

                      <div className="mt-3 text-sm text-gray-700">
                        <p><span className="font-semibold">Brand:</span> {m.brand?.brandName || "N/A"}</p>
                        <p><span className="font-semibold">Category:</span> {m.category?.name || "N/A"}</p>
                        <p><span className="font-semibold">Subcategory:</span> {m.subCategory?.name || "N/A"}</p>
                        <p><span className="font-semibold">Sub-Subcategory:</span> {m.subSubCategory?.name || "N/A"}</p>
                        {Array.isArray(m.items) && m.items.length > 0 ? (
                          <ul className="pl-4 mt-1 overflow-y-auto text-xs text-gray-600 list-disc max-h-16">
                            {m.items.map((it) => (
                              <li key={it._id || it.itemName}>{it.itemName}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400">No items</p>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => { setSa(m); setOverviewOpen(true); }} className="flex-1 px-3 py-1 text-xs font-medium text-white transition bg-yellow-500 rounded hover:bg-yellow-600">✏️ Edit</button>
                        <button onClick={() => handleDelete(folder._id, m._id)} className="flex-1 px-3 py-1 text-xs font-medium text-white transition bg-red-600 rounded hover:bg-red-700">🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

          {loading && <p className="mt-4 text-center">Loading...</p>}
        </div>
      </div>
    </div>
  );
}
