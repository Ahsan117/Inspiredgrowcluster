import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";

const PurchaseOverview = ({ isOpen = true, onClose,f,sa }) => {
  const [brands, setBrands] = useState(f.Brands);
  const [categories, setCategories] = useState(f.Categories);
  const [subCategories, setSubCategories] = useState(f.SubCategories);
  const [subSubCategories, setSubSubCategories] = useState(f.SubSubCategories);
  const [items, setItems] = useState(f.setItems || []);
const authHeader = {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
  };
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(null);
  const [selectedSubCategories, setSelectedSubCategories] = useState(null);
  const [selectedSubSubCategories, setSelectedSubSubCategories] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
   
 const [filteredItems, setFilteredItems] = useState([]);
const [itemOptions, setItemOptions] = useState([]);

// 🔹 Update filtered items whenever filters or items change
useEffect(() => {
  const filtered = items.filter(item =>
    (!selectedBrand || selectedBrand.value === item.brand._id) &&
    (!selectedCategories || selectedCategories.value === item.category._id) &&
    (!selectedSubCategories || selectedSubCategories.value === item.subCategory._id) &&
    (!selectedSubSubCategories || selectedSubSubCategories.value === item.subSubCategory._id)
  );
  setFilteredItems(filtered);

  // Update react-select options (exclude already selected items)
  const options = filtered
    .filter(i => !selectedItems.some(si => si.value === i._id))
    .map(item => ({ value: item._id, label: item.itemName }));
  setItemOptions(options);
}, [items, selectedBrand, selectedCategories, selectedSubCategories, selectedSubSubCategories, selectedItems]);

  const handleSelectItem = (option) => {
    if (option && !selectedItems.some(i => i.value === option.value)) {
      setSelectedItems([...selectedItems, option]);
    }
  };

  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter(i => i.value !== id));
  };

  const handleSelectAllItems = () => {
    const allOptions = filteredItems.map(item => ({ value: item._id, label: item.itemName }));
    setSelectedItems([...selectedItems, ...allOptions]);
  };

  // 🔹 Handle Save
  const handleSave = async () => {
    
     console.log(selectedSubSubCategories)
    const payload = {
        id: sa._id,
      brand: selectedBrand?.value || null,
      category: selectedCategories?.value || null,
      subCategory: selectedSubCategories?.value || null,
      subSubCategory: selectedSubSubCategories?.value || null,
      items: selectedItems.map(i => i.value)
    };

    try {
      const res = await axios.put(
        "https://pos.inspiredgrow.in/vps/api/product/update-necessary", // replace with your API
        payload,
        authHeader
      );
    console.log(payload)
    //   alert("Data saved successfully!");
      console.log("Saved response:", res.data);
      onClose(); // optionally close popup
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save data!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-[650px] max-h-[80vh] overflow-y-auto shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Filter Items</h2>
         <div className="flex justify-end mt-6 space-x-2">
          <button onClick={handleSave} className="px-4 py-2 text-white bg-green-600 rounded-md">
            Save
          </button>
          <button onClick={onClose} className="px-4 py-2 text-white bg-gray-700 rounded-md">
            Close
          </button>
        </div>
        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">Brand</label>
          <Select options={f.Brands} value={selectedBrand} onChange={setSelectedBrand} placeholder="Select Brand" isClearable />
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">Category</label>
          <Select options={categories} value={selectedCategories} onChange={setSelectedCategories} placeholder="Select Category" isClearable />
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">Subcategory</label>
          <Select options={subCategories} value={selectedSubCategories} onChange={setSelectedSubCategories} placeholder="Select Subcategory" isClearable />
        </div>

        <div className="mb-3">
          <label className="block mb-1 text-sm font-medium">Sub-Subcategory</label>
          <Select options={subSubCategories} value={selectedSubSubCategories} onChange={setSelectedSubSubCategories} placeholder="Select Sub-Subcategory" isClearable />
        </div>

        {/* Item Select */}
        <div className="mt-4">
          <h3 className="flex items-center justify-between mb-2 font-medium">
            Select Items
            <button onClick={handleSelectAllItems} className="px-2 py-1 text-sm text-white bg-blue-500 rounded">
              Select All
            </button>
          </h3>

          <Select options={itemOptions} onChange={handleSelectItem} placeholder="Select item" />

          {selectedItems.length > 0 && (
            <ul className="mt-2 space-y-2">
              {selectedItems.map(item => (
                <li key={item.value} className="flex items-center justify-between p-2 border rounded-md shadow-sm bg-gray-50">
                  <span>{item.label}</span>
                  <button onClick={() => handleRemoveItem(item.value)} className="px-2 py-1 text-sm text-white bg-red-500 rounded">
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        
      </div>
    </div>
  );
};

export default PurchaseOverview;
