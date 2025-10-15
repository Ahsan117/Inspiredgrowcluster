import React, { useEffect, useState, useRef, useCallback } from "react";
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import axios from "axios";
import PurchaseOverview from "./ProductEdit.jsx";
export default function ProductListView() {
  const [isOverviewOpen, setOverviewOpen] = useState(false);
  const [sa,setSa]=useState({});
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [page, setPage] = useState(1); // pagination
  const [hasMore, setHasMore] = useState(true);

  const observer = useRef();

  // ✅ Infinite scroll handler
  const lastItemRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // ✅ Fetch Folders
  useEffect(() => {
    async function fetchFolders() {
      try {
        setLoading(true);
        const token = `bearer ${localStorage.getItem("token")}`;
        const res = await axios.get(
          `${link}/api/product/all?page=${page}&limit=20`,
          { headers: { Authorization: token } }
        );

      setFolders(res.data);
      console.log("📁 Folders fetched:", res.data);

       
      } catch (error) {
        console.error("❌ Error fetching folders:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFolders();
  }, [page]);
  
  const fetch=async()=>{
     try {
        setLoading(true);
        const token = `bearer ${localStorage.getItem("token")}`;
        const res = await axios.get(
          `${link}/api/product/all?page=${page}&limit=20`,
          { headers: { Authorization: token } }
        );

      setFolders(res.data);
      console.log("📁 Folders fetched:", res.data);

       
      } catch (error) {
        console.error("❌ Error fetching folders:", error);
      } finally {
        setLoading(false);
      }
  }
  // ✅ Delete Media
  const handleDelete = async (folderId, mediaId) => {
    try {
      const token = `bearer ${localStorage.getItem("token")}`;
      await axios.delete(`${link}/api/product/${folderId}/media/${mediaId}`, {
        headers: { Authorization: token },
      });

      // Update UI
      setFolders((prev) =>
        prev.map((f) =>
          f._id === folderId
            ? { ...f, media: f.media.filter((m) => m._id !== mediaId) }
            : f
        )
      );
    } catch (err) {
      console.error("❌ Delete failed:", err);
    }
  };

  // ✅ Edit Placeholder
  const handleEdit = (folderId, media) => {
    alert(`📝 Editing ${media.url} from folder ${folderId}`);
    // TODO: open modal with brand/category/items to edit
  };
    const[f,setf]=useState({});
  useEffect(() => {
    
const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  };
    const fetchAll = async () => {
      try {
        const [brandRes, categoryRes, subCatRes, subSubCatRes, itemRes] = await Promise.all([
          axios.get("https://pos.inspiredgrow.in/vps/api/brands", authHeader),
          axios.get("https://pos.inspiredgrow.in/vps/api/categories", authHeader),
          axios.get("https://pos.inspiredgrow.in/vps/api/subcategories", authHeader),
          axios.get("https://pos.inspiredgrow.in/vps/api/sub-subcategories", authHeader),
          axios.get("https://pos.inspiredgrow.in/vps/api/items", authHeader)
        ]);
        
        const Brands=(brandRes.data.data.map(b => ({ value: b._id, label: b.brandName })));
        const Categories=(categoryRes.data.data.map(c => ({ value: c._id, label: c.name })));
        const SubCategories=(subCatRes.data.data.map(s => ({ value: s._id, label: s.name })));
        const SubSubCategories=(subSubCatRes.data.data.map(ss => ({ value: ss._id, label: ss.name })));
        const setItems=(itemRes.data.data);
        setf({Brands,Categories,SubCategories,SubSubCategories,setItems});
        console.log("Fetched Data:", f);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAll();
  }, [folders]);

  return (
    <div className="flex flex-col bg-gray-50">
      {/* Navbar */}
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-grow">
        {/* Sidebar */}
        <div>
          
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-grow p-6 overflow-y-auto">
          <h1 className="flex items-center gap-2 mb-6 text-2xl font-bold text-gray-800">
            📂 Media Library
          </h1>

          {folders.length === 0 && !loading && (
            <p className="text-gray-600">No folders found.</p>
          )}

          {folders.filter((folder) => folder.media.length > 0).map((folder, fIdx) => (
            <div key={folder._id} className="mb-12">
              <h2 className="mb-4 text-lg font-semibold text-gray-700">
                📁 {folder.folderName}
              </h2>
{
                isOverviewOpen && <PurchaseOverview f={f} isOpen={isOverviewOpen} setIsOpen={setOverviewOpen} onClose={()=>{setOverviewOpen(false);fetch()}} sa={sa} />
}
              {/* Media Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {folder.media.map((m, idx) => {
                  
                  return (
                    <div
                      key={m._id}
                  
                      className="flex flex-col p-3 transition-all bg-white shadow rounded-2xl hover:shadow-lg"
                    >
                      {/* Image/Video */}
                      <div className="relative w-full h-40">
                        {m.url?.endsWith(".mp4") ? (
                          <video
                            src={`${link}${m.url}`}
                            controls
                            className="object-cover w-full h-full rounded-lg"
                          />
                        ) : (
                          <img
                            src={`${link}${m.url}`}
                            alt="media"
                            loading="lazy"
                            className="object-cover w-full h-full rounded-lg"
                          />
                        )}
                      </div>

                      {/* Meta Info */}
                      <div className="mt-3 text-sm text-gray-700">
                        <p>
                          <span className="font-semibold">Brand:</span>{" "}
                          {m.brand?.brandName || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Category:</span>{" "}
                          {m.category?.name || "N/A"}
                        </p>
                         <p>
                          <span className="font-semibold">Subcategory:</span>{" "}
                          {m.subCategory?.name || "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold">Sub-Subcategory:</span>{" "}
                          {m.subSubCategory?.name || "N/A"}
                        </p>
                        {m.items?.length > 0 ? (
                          <ul className="pl-4 mt-1 overflow-y-auto text-xs text-gray-600 list-disc max-h-16">
                            {m.items.map((it, i) => (
                              <li key={i}>{it.itemName}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400">No items</p>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => {setSa(m); setOverviewOpen(true);}}
                          className="flex-1 px-3 py-1 text-xs font-medium text-white transition bg-yellow-500 rounded hover:bg-yellow-600"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(folder._id, m._id)}
                          className="flex-1 px-3 py-1 text-xs font-medium text-white transition bg-red-600 rounded hover:bg-red-700"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Loader */}
          {loading && <p className="mt-4 text-center">Loading...</p>}
        </div>
      </div>
    </div>
  );
}




