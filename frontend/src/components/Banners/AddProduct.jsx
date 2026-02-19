import React, { useState, useEffect } from "react";
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import Select from "react-select";
import axios from "axios";
import WindowedSelect from "react-windowed-select";
import { useSearchParams } from "react-router-dom";
export default function AddProduct() {
  const [searchParams] = useSearchParams();
  const [folderId,setFolderId] = useState(null);
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [productId, setProductId] = useState("");
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [allItems, setAllItems] = useState([]); // All items from API
  const [data, setData] = useState({
    brands: [],
    categories: [],
    subcategories: [],
    subSubcategories: [],
  });

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const token = `bearer ${localStorage.getItem("token")}`;
        axios.defaults.headers.common["Authorization"] = token;

        const [
          brandsRes,
          categoriesRes,
          subcategoriesRes,
          subSubcategoriesRes,
          itemRes,
        ] = await Promise.all([
          axios.get(`${link}/api/brands`),
          axios.get(`${link}/api/categories`),
          axios.get(`${link}/api/subcategories`),
          axios.get(`${link}/api/sub-subcategories`),
          axios.get(`${link}/api/product/items`),
        ]);

        setAllItems(itemRes.data.data || []);

        const brandFormat = brandsRes.data.data.map((brand) => ({
          label: brand.brandName,
          value: brand._id,
        }));
        const categoryFormat = categoriesRes.data.data.map((cat) => ({
          label: cat.name,
          value: cat._id,
        }));
        const subcategoryFormat = subcategoriesRes.data.data.map((sub) => ({
          label: sub.name,
          value: sub._id,
        }));
        const subSubcategoryFormat = subSubcategoriesRes.data.data.map(
          (subSub) => ({
            label: subSub.name,
            value: subSub._id,
          })
        );

        setData({
          brands: brandFormat,
          categories: categoryFormat,
          subcategories: subcategoryFormat,
          subSubcategories: subSubcategoryFormat,
        });
      } catch (error) {
        console.error("❌ Failed to fetch product data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  useEffect(()=>{
       const fId= searchParams.get("folderId")
       if(!fId) return;
       setFolderId(fId);
       const fetchProduct = async()=>{
           try{
            const token = `bearer ${localStorage.getItem("token")}`;
            const res = await axios.get(`${link}/api/product/${fId}`,{
                headers:{Authorization:token}
            });
            const product = res.data.data;
            console.log("Fetched product for editing:", product);
            setProductId(product.folderName);
            const mediaWithMeta = product.media.map((m) => ({
              url: m.url,
              type:  "image" ,
              brand: m.brand || null,
              category: m.category || null,
              subcategory: m.subcategory || null,
              subsubcategory: m.subsubcategory || null,
              relatedItems:m.items?.map((ri) => ({
                label: allItems.find(i=>i._id === ri)?.itemName || "Unknown Item",
                value: ri
              })) || [],
              availableRelatedItems: allItems
                .filter((i) =>
                  (!m.brand || i.brand === m.brand) &&
                  (!m.category || i.category === m.category) &&
                  (!m.subcategory || i.subcategory === m.subcategory) &&
                  (!m.subsubcategory || i.subsubcategory === m.subsubcategory)
                )
                .map((i) => ({ label: i.itemName, value: i._id })),
            }));
            console.log("Media with metadata for editing:", mediaWithMeta);
            setMedia(mediaWithMeta);
           }
           catch(err){
                console.error("❌ Failed to fetch product details:", err);
            }
       }
       fetchProduct();
  },[data])



  // File Upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map((file) => ({
      url: URL.createObjectURL(file),
      source:file,
      type: file.type.startsWith("video") ? "video" : "image",
      brand: null,
      category: null,
      subcategory: null,
      subsubcategory: null,
      items: [],
      relatedItems: [],
      availableRelatedItems: [],
    }));
    setMedia((prev) => [...prev, ...newFiles]);
  };


  // Update media properties
  const updateMediaData = (index, key, value) => {
    setMedia((prev) => {
      const updated = [...prev];
      updated[index][key] = value;

      // 🎯 Auto-filter related items when brand/category change
      if (key === "brand" || key === "category" || key === "subcategory" || key==="subsubcategory") {
        const selectedBrand = updated[index].brand?.value;
        const selectedCategory = updated[index].category?.value;
        const selectedSubcategory = updated[index].subcategory?.value;
        const selectedSubsubcategory = updated[index].subsubcategory?.value;

        const filteredItems = allItems
          .filter(
            (i) =>
              (!selectedBrand || i.brand === selectedBrand) &&
              (!selectedCategory || i.category === selectedCategory) &&
              (!selectedSubcategory || i.subcategory === selectedSubcategory) &&
              (!selectedSubsubcategory || i.subsubcategory === selectedSubsubcategory)
          )
          .map((i) => ({
            label: i.itemName,
            value: i._id,
          }));

        updated[index].relatedItems = []; // reset previous selection
        updated[index].availableRelatedItems = filteredItems;
      }

      return updated;
    });
  };
    
const saveFolder = async () => {
  console.log("📁 Saving full folder:", { productId, media });
  try {
    const formData = new FormData();
    formData.append("folderName", productId); // yeh hi save hoga DB me
    formData.append("media", JSON.stringify(media)); // metadata

    media.forEach((m) => {
      if (m.source instanceof File) {
        formData.append("media", m.source); // actual file bhi bhejo
      }
    });

    const token = `bearer ${localStorage.getItem("token")}`;
    console.log(formData)

    // const r = await axios.post(folderId?`${link}/api/product/upload`: `${link}/api/product/add-folder`, formData, {
    //   headers: {
    //     "Authorization": token,
    //     "Content-Type": "multipart/form-data"
    //   },
    // });

    // console.log("✅ Folder saved successfully:", r.data);
    // alert("✅ Full folder saved!");
    // setProductId("");
    // setMedia([]);
  } catch (error) {
    console.error("❌ Error saving folder:", error);
  }
};


  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-grow">
        <div>
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>

        <div className="flex flex-col flex-grow p-4">
          <h1 className="mb-4 text-xl font-bold">📂 Product Media Manager</h1>

          {/* Product ID + File Upload */}
          <div className="flex gap-4 p-4 mb-4 bg-white rounded shadow">
            <div>
              <label className="block text-sm font-medium">Folder Name</label>
              <input
                type="text"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-48 px-2 py-1 border rounded"
              />
            </div>
            <div className="flex items-end">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="px-2 py-1 border rounded"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={saveFolder}
                className="px-3 py-1 text-white bg-green-600 rounded"
              >
                💾 Save Folder
              </button>
            </div>
          </div>

          {/* Media Gallery */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {media.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col p-2 bg-white rounded shadow"
              >
                {item.type === "image" ? (
                  <img
                    src={folderId?`${link}/${item.url}`:item.url}
                    alt="preview"
                    className="object-cover w-full h-40 rounded"
                  />
                ) : (
                  <video
                    src={item.url}
                    controls
                    className="w-full h-40 rounded"
                  />
                )}

                {/* Brand */}
                <div className="mt-2">
                  <label className="text-sm">Brand</label>
                  <Select
                    options={data.brands}
                    value={data.brands.find(b=> b.value==item.brand) || null}
                    onChange={(val) => updateMediaData(idx, "brand", val.value)}
                  />
                </div>

                {/* Category */}
                <div className="mt-2">
                  <label className="text-sm">Category</label>
                  <Select
                    options={data.categories}
                    value={data.categories.find((c) => c.value === item.category) || null}
                    onChange={(val) => updateMediaData(idx, "category", val.value)}
                  />
                </div>

                {/* Subcategory */}
                <div className="mt-2">
                  <label className="text-sm">Subcategory</label>
                  <Select
                    options={data.subcategories}
                    value={data.subcategories.find((s) => s.value === item.subcategory) || null}
                    onChange={(val) => updateMediaData(idx, "subcategory", val.value)}
                  />
                </div>

                {/* Sub-subcategory */}
                <div className="mt-2">
                  <label className="text-sm">Sub-subcategory</label>
                  <Select
                    options={data.subSubcategories}
                    value={data.subSubcategories.find((s) => s.value === item.subsubcategory) || null}
                    onChange={(val) =>
                      updateMediaData(idx, "subsubcategory", val.value)
                    }
                  />
                </div>

                {/* Related Items (filtered by brand + category) */}
               {/* Related Items (filtered by brand + category) */}
<div className="mt-2">
  <label className="text-sm">Related Items</label>
<WindowedSelect
  className="overflow-y-auto"
  options={item.availableRelatedItems || []}
  isMulti
  value={item.relatedItems}
  onChange={(val) => updateMediaData(idx, "relatedItems", val.value)}
  menuPortalTarget={document.body} // dropdown body me render hoga (overflow issue fix)
  menuPosition="fixed"
  maxMenuHeight={300} // dropdown height ko 300px kar diya
  styles={{
    menuPortal: (base) => ({ ...base, zIndex: 9999 }), // dropdown hamesha upar dikhe
    menu: (base) => ({ ...base, fontSize: "14px" }),   // font thoda bada
    valueContainer: (base) => ({
      ...base,
      maxHeight: 150, // selected values ki height limit
      overflowY: "auto",
    }),
  }}
/>


  {/* Select All Button */}
  {item.availableRelatedItems?.length > 0 && (
    <button
      type="button"
      onClick={() =>
        updateMediaData(idx, "relatedItems", item.availableRelatedItems)
      }
      className="px-2 py-1 mt-2 text-xs text-white bg-blue-500 rounded"
    >
      Select All Items
    </button>
  )}
</div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
