import React, { useState, useEffect } from "react";
import Select from "react-select";
import { FaTrash } from "react-icons/fa";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import axios from "axios";

const API_URL = "https://pos.inspiredgrow.in/vps/api/items";

const ItemPickerDashboard = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [page, setPage] = useState(1);

  // Dropdown states
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [subSubCategories, setSubSubCategories] = useState([]);

  const [brand, setBrand] = useState(null);
  const [category, setCategory] = useState(null);
  const [subCategory, setSubCategory] = useState(null);
  const [subSubCategory, setSubSubCategory] = useState(null);

  // Fetch dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
      try {
        const [brandsRes, catRes, subCatRes, subSubRes] = await Promise.all([
          axios.get("https://pos.inspiredgrow.in/vps/api/brands", { headers }),
          axios.get("https://pos.inspiredgrow.in/vps/api/categories", { headers }),
          axios.get("https://pos.inspiredgrow.in/vps/api/subcategories", { headers }),
          axios.get("https://pos.inspiredgrow.in/vps/api/sub-subcategories", { headers }),
        ]);
        setBrands(brandsRes.data.data || []);
        setCategories(catRes.data.data || []);
        setSubCategories(subCatRes.data.data || []);
        setSubSubCategories(subSubRes.data.data || []);
      } catch (err) {
        console.error("Failed to fetch dropdowns:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch items
  useEffect(() => {
    const fetchItems = async () => {
      try {
        const response = await axios.get(API_URL, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setItems(response.data.data || []);
      } catch (error) {
        console.error("Failed to fetch items:", error);
      }
    };
    fetchItems();
  }, []);

  // Filter items
  useEffect(() => {
    let f = items
      .filter((item) => {
        const matchesSearch =
          item.itemName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.itemCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.barcodes?.some((barcode) =>
            barcode.toLowerCase().includes(searchTerm.toLowerCase())
          );

       
        return (
          matchesSearch &&
          !selectedItems.find((sel) => sel._id === item._id)
        );
      })
      .slice(0, page * 5);

    setFilteredItems(f);
  }, [items, searchTerm, brand, category, subCategory, subSubCategory, selectedItems, page]);

  // Auto-select items on dropdown change
  useEffect(() => {
    if (!brand && !category && !subCategory && !subSubCategory) return;
    
    let autoSelected = items.filter((item) => {
      const matchesBrand = brand && item.brand?._id === brand.value;
      const matchesCategory = category && item.category?._id === category.value;
      const matchesSubCategory = subCategory && item.subCategory?._id === subCategory.value;
      const matchesSubSubCategory = subSubCategory && item.subSubCategory?._id === subSubCategory.value;
      return matchesBrand || matchesCategory || matchesSubCategory || matchesSubSubCategory;
    });

    autoSelected = autoSelected.filter(
      (i) => !selectedItems.some((sel) => sel._id === i._id)
    );

    if (autoSelected.length > 0) {
      setSelectedItems((prev) => [...prev, ...autoSelected]);
    }
  }, [brand, category, subCategory, subSubCategory]);

  const handleAddItem = (itemToAdd) => {
    if (!selectedItems.some((item) => item._id === itemToAdd._id)) {
      setSelectedItems([...selectedItems, itemToAdd]);
    }
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter((item) => item._id !== id));
  };

  const handleSave = async () => {
    try {
      const f = selectedItems.map((i) => i._id);
      await axios.put(
        "/api/items/change-offer",
        { items: f },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      alert("Items saved successfully!");
      setSelectedItems([]);
    } catch (error) {
      console.error("Failed to save items:", error);
      alert("Failed to save items");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          <header className="flex flex-col p-4 mb-6 bg-white rounded-lg shadow md:flex-row md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-700">Item Picker</h1>
          </header>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Select
              options={brands.map(b => ({ value: b._id, label: b.brandName }))}
              value={brand}
              onChange={(val) => { setBrand(val); setCategory(null); setSubCategory(null); setSubSubCategory(null); }}
              placeholder="Select Brand"
              isClearable
            />
            <Select
              options={categories.map(c => ({ value: c._id, label: c.name }))}
              value={category}
              onChange={(val) => { setCategory(val); setSubCategory(null); setSubSubCategory(null); }}
              placeholder="Select Category"
              isClearable
            />
            <Select
              options={subCategories.map(sc => ({ value: sc._id, label: sc.name }))}
              value={subCategory}
              onChange={(val) => { setSubCategory(val); setSubSubCategory(null); }}
              placeholder="Select SubCategory"
              isClearable
            />
            <Select
              options={subSubCategories.map(ssc => ({ value: ssc._id, label: ssc.name }))}
              value={subSubCategory}
              onChange={setSubSubCategory}
              placeholder="Select SubSubCategory"
              isClearable
            />
          </div>

          {/* Search + Save */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="Search items..."
              className="w-full p-2 border border-gray-300 rounded shadow-sm md:w-1/3"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600"
            >
              Save
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">ItemCode</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => (
                    <tr key={item._id} className="text-center border-t">
                      <td className="p-2 border">{item.itemCode}</td>
                      <td className="p-2 border">{item.itemName}</td>
                      <td className="p-2 border">
                        <button
                          className="px-3 py-1 text-white rounded bg-cyan-500 hover:bg-cyan-600"
                          onClick={() => handleAddItem(item)}
                        >
                          Add
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-4 text-gray-500">No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredItems.length < items.length && (
              <div className="p-4 text-center">
                <button
                  onClick={() => setPage(page + 1)}
                  className="px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
                >
                  Load More
                </button>
              </div>
            )}
          </div>

          {/* Selected Items */}
          {selectedItems.length > 0 && (
            <div className="mt-6 overflow-x-auto bg-white rounded-lg shadow">
              <h2 className="p-4 text-lg font-bold border-b">My Selected Items</h2>
              <table className="w-full border">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="p-2 border">ItemCode</th>
                    <th className="p-2 border">Name</th>
                    <th className="p-2 border">Remove</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedItems.map((item) => (
                    <tr key={item._id} className="text-center border-t">
                      <td className="p-2 border">{item.itemCode}</td>
                      <td className="p-2 border">{item.itemName}</td>
                      <td className="p-2 border">
                        <button
                          className="flex items-center justify-center gap-1 px-2 py-1 text-white bg-red-500 rounded hover:bg-red-600"
                          onClick={() => handleRemoveItem(item._id)}
                        >
                          <FaTrash /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemPickerDashboard;
