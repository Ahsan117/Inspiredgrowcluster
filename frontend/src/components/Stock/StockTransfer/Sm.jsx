import React, { useState, useEffect,useCallback,useContext } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import Navbar from "../../Navbar.jsx";
import Sidebar from "../../Sidebar.jsx";
import LoadingScreen from "../../../Loading";
import { BiChevronRight } from "react-icons/bi";
import { FaTachometerAlt } from "react-icons/fa";
import S1 from "./S1.jsx";
import S2 from "./S2.jsx";
import S3 from "./S3.jsx";
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useRef } from "react";
import { Camera } from "@capacitor/camera";
import playSound from "../../../utility/sound.js";
import { set } from "date-fns";
import { POSContext } from "../../../context/POSContext.js";
/* Change this if your base URL differs */
const API = "";

function Sm() {
  const link="https://pos.inspiredgrow.in/vps"
   useEffect(() => {
    const request = async () => {
      await Camera.requestPermissions({
            permissions: ['camera', 'photos']
      }); // Ask Android to show prompt
    };
    request();
  }, []);
    
   const playBeep = useCallback(() => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(2.0, audioContext.currentTime);
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      }, []);
const codeReaderRef = useRef(null);
const videoRef = useRef(null);
const [scanning, setScanning] = useState(false);
const[matchedItems,setMatchedItems]=useState([])
    const [activeTab,setActiveTab]=useState("s1")
  const navigate = useNavigate();
  const[isSubmitting,setIsSubmitting]=useState(false)
  const [searchParams] = useSearchParams();
  const[id,setId]=useState(null)
  useEffect(()=>{
     setId(searchParams.get("id")); // editing?
  },[])

  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Collapse sidebar on small screens
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);
  const[secondWarehouseName,setSecondWarehouseName]=useState("")
  const [warehouses, setWarehouses] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [filteredItemsByWarehouse, setFilteredItemsByWarehouse] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const[secondItems,setSecondItems]=useState({});
  const [formData, setFormData] = useState({
    transferDate: new Date().toLocaleDateString("en-CA"), // YYYY-MM-DD for IST
    fromWarehouse: "", // ⬅️ will default to restricted if not editing
    toWarehouse: "",
    details: "",
    note: "",
  });
   const {posData}=useContext(POSContext)
  useEffect(()=>{ 
     setFormData((prev) => ({
      ...prev,
      fromWarehouse: localStorage.getItem("deafultWarehouse") || null,
    }));
  },[])
   
  // ─── FETCH WAREHOUSES ───────────────────────────────────────────────────
  const fetchWarehouses = async () => {
    try {
      // setLoading(true);
      // const token = localStorage.getItem("token");
      // const { data } = await axios.get(`${link}/api/warehouses?scope=mine`, {
      //   headers: { Authorization: `Bearer ${token}` },
      // });
      // console.log("da")
      // console.log(data)
      const list = posData.warehouses || [];  

      setWarehouses(posData.warehouses || []);

      // ⬅️ If we are NOT editing (id is falsey) and there are warehouses,
      // pick the restricted warehouse as default fromWarehouse:
      if (!id && list.length > 0) {
        const restricted = list.find((w) => w.isRestricted && w.status === "Active");
        const defaultFrom = restricted
          ? restricted._id
          : list.find((w) => w.status === "Active")?._id || "";
        // setFormData((prev) => ({ ...prev, fromWarehouse: localStorage.getItem("deafultWarehouse") || defaultFrom }));
      }
    } catch (err) {
      console.error("warehouses:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─── FETCH ITEMS WHEN fromWarehouse CHANGES ─────────────────────────────
  const fetchItems = async (warehouseId = formData.fromWarehouse) => {
    try {
     
      const {data} = await axios.get(`${link}/api/items`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params: { warehouse: warehouseId,inStock:true }
      });
      
      const items = data.data || [];
      const flattenedItems = items
        .map((item) => {
          const isVariant = Boolean(item.parentItemId);
          return {
            ...item,
            parentId: isVariant ? item.parentItemId : item._id,
            variantId: isVariant ? item._id : null,
            displayName: isVariant
              ? `${item.itemName} / ${item.variantName || "Variant"}`
              : item.itemName || "NA",
            itemCode: item.itemCode || "",
            barcodes: item.barcodes || [],
            barcodes: item.barcodes || [],
            isVariant,
            currentStock: item.currentStock || 0,
            warehouse: item.warehouse, // keep warehouse reference
          };
        })
        .filter((item) => item.currentStock > 0); // Only include items that have stock > 0

      setAllItems(flattenedItems);
    } catch (err) {
      console.error("items:", err.message);
      setAllItems([]);
      setFilteredItemsByWarehouse([]);
    } finally {
      setLoading(false);
    }
  };

    const fetchSecondWarehouseItems = async (warehouseId) => {
      try {
        
        const { data } = await axios.get(`${link}/api/items`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: { warehouse: warehouseId, inStock: true },
        });
        const items = data.data || [];
        const mapItems={}
        items.forEach((item) => {
          mapItems[item._id] = item.currentStock || 0; // Store current stock by item ID
        });
        console.log("Second warehouse items:", mapItems);
        setSecondItems(mapItems);
      } catch (err) {
        console.error("Second warehouse items:", err.message);
      } 
    };
     useEffect(()=>{
    if (formData.toWarehouse) {
      fetchSecondWarehouseItems(formData.toWarehouse);
    }
  }, [formData.toWarehouse]);
  // ─── LOAD EXISTING TRANSFER FOR EDIT ─────────────────────────────────────
  const loadStockTransfer = async (transferId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${link}/api/stock-transfers/${transferId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Loaded transfer data:", data);
      const tr = data.data;
      setFormData({
        transferDate: tr.transferDate?.split("T")[0] || "",
        fromWarehouse: tr.fromWarehouse?._id || "",
        toWarehouse: tr.toWarehouse?._id || "",
        details: tr.details || "",
        note: tr.note || "",
      });

      // Once we've set fromWarehouse from the fetched data, re-fetch items:
      if (tr.fromWarehouse?._id) {
        await fetchItems(tr.fromWarehouse._id);
      }
      
      // Map the existing items in this transfer into selectedItems
      const transformedItems = tr.items.map(it => {
  // Defensive find: handle missing item matches
  const idi=it.item._id;
  console.log("Item ID:", idi);
  const item = allItems.find(ai => ai._id === idi || ai.itemCode === it.item.itemCode);
  console.log(allItems)
         console.log("Transformed item:", it, item);
  if (!item) {
    // Return some fallback or skip item if not found
    return null;
  }

  return {
    currentStock: item.currentStock || 0,
    quantity: it.quantity || 0,
    discount:  0,
    item: item._id,
    itemCode: item.itemCode || "",
    itemName: item.itemName || "NA",
    mrp: item.mrp || 0,
    openingStock: item.openingStock || 0,
    salesPrice: item.salesPrice || 0,
    stock: item.openingStock || 0,
    tax: item.tax?._id || null,
    taxRate: item.tax?.taxPercentage || 0,
    unit: item.unit?._id || null,
    subtotal: (it.quantity || 0) * (item.salesPrice || 0) - ( 0),
  };
}).filter(Boolean); // removes any nulls if items not found

     console.log("Transformed items:", transformedItems);
     setSelectedItems(transformedItems);
         
    } catch (err) {
      console.error("load transfer:", err.message);
      alert("Error loading stock transfer");
    } finally {
      setLoading(false);
    }
  };

  // ─── EFFECT: When fromWarehouse changes, re-fetch items ───────────────
  useEffect(() => {
    fetchWarehouses();
  }, []); // only once on mount

  useEffect(() => {
    // If fromWarehouse is set (either via default or by user action), fetch items
    if (formData.fromWarehouse) {
      fetchItems(formData.fromWarehouse);
    } else {
      setAllItems([]);
      setFilteredItemsByWarehouse([]);
    }
  }, [formData.fromWarehouse]);

  // ─── EFFECT: If we are editing, load the existing transfer ──────────────
 useEffect(() => {
  if (id && allItems.length > 0 && selectedItems.length === 0) {
    loadStockTransfer(id);
  }
}, [id, allItems, selectedItems]);


  // ─── FILTER allItems TO filteredItemsByWarehouse ───────────────────────
  useEffect(() => {
    if (formData.fromWarehouse) {
      const filtered = allItems.filter(
        (item) => item.warehouse?._id === formData.fromWarehouse
      );
      setFilteredItemsByWarehouse(filtered);

      // Only clear selectedItems if we are NOT editing:
      if (!id) {

        setSelectedItems([]);
      }
    } else {
      setFilteredItemsByWarehouse([]);
      if (!id) {
        
        setSelectedItems([]);
      }
    }
  }, [formData.fromWarehouse, allItems, id]);


  
const startScanner = async () => {
  console.log("Starting scanner");

  if (!formData.fromWarehouse) {
    alert("Please select a warehouse before scanning");
    return;
  }
 const permission = await Camera.requestPermissions(); // or checkPermissions()
  console.log(permission)
  if (permission.camera !== 'granted') {
    alert('Camera permission is required');
    return ;
  }

  const codeReader = new BrowserMultiFormatReader();
  codeReaderRef.current = codeReader;

  const decode = (facingMode) =>
    
    codeReader.decodeFromConstraints(
      { video: { facingMode } },
      videoRef.current,
      async (result, err) => {
        if (result) {
           const text = result.getText();
        console.log("Scanned barcode:", text);

        const match = allItems.find(
          (i) =>
            i.itemCode === text ||
            i.barcodes?.includes(text) ||
            i.itemName?.toLowerCase() === text.toLowerCase()
        );

        if (match) {
          setMatchedItems((prev) => {
  const existingIndex = prev.findIndex((item) => item.item === match._id);

  if (existingIndex !== -1) {
    // Existing item: increment quantity and play different sound
    const updatedItems = [...prev];
    updatedItems[existingIndex] = {
      ...updatedItems[existingIndex],
      quantity: updatedItems[existingIndex].quantity + 1,
    };
    playSound("/sounds/item-exists.mp3");
    return updatedItems;
  } else {
    // New item: add and play add sound
    playSound("/sounds/item-added.mp3");
    return [
      ...prev,
      {
        ...match,
        quantity: 1,
        item: match._id,
      },
    ];
  }
});

         // Wait a bit then scan again
            setTimeout(() => {
              codeReader.reset(); // very important to reset before new scan
              decode(facingMode); // recursively call decode
            }, 5000); // 800ms delay before next scan
        }}

        if (err && err.name !== 'NotFoundException') {
          console.error("Scan error:", err);
        }
      }
    );
    
   console.log(videoRef)
  try {
    await decode({ exact: "environment" }); // Try back camera first
  } catch {
    try {
      await decode("user"); // Fallback to front camera
    } catch (e) {
      console.error("Camera error:", e);
      stopScanner();
    }
  }
};




 const stopScanner = () => {
  // Stop camera tracks
  const tracks = videoRef.current?.srcObject?.getTracks();
  if (tracks) {
    tracks.forEach((t) => t.stop());
  }

  codeReaderRef.current?.reset?.();
  setMatchedItems([]);
};

  // ─── SEARCH LOGIC FOR AUTOCOMPLETE DROPDOWN ────────────────────────────
  const filteredItems = searchQuery
  ? filteredItemsByWarehouse.filter((it) => {
      const q = searchQuery.toLowerCase();

      const displayMatch = it.displayName?.toLowerCase().includes(q);
      const codeMatch = it.itemCode?.toLowerCase().includes(q);
      const barcodeMatch = it.barcodes?.some((b) =>
        String(b).toLowerCase().includes(q)
      );

      return displayMatch || codeMatch || barcodeMatch;
    }).slice(0,15)
  : [];

  // ─── ADD ITEM TO SELECTED LIST ────────────────────────────────────────
  const handleAddItem = (it) => {
  console.log(it)
  if (!it || !it.parentId) {
    console.error("Invalid item, missing parentId:", it);
    return;
  }
  
  const parentExists = allItems.some((ai) => ai._id === it.parentId && !ai.variantId);
  if (!parentExists && !it.variantId) {
    console.error(`Parent item not found for parentId: ${it.parentId}`, it);
    return;
  }

  if (it.variantId) {
    const variantValid = allItems.some((ai) => ai._id === it.variantId && ai.parentId === it.parentId);
    if (!variantValid) {
      console.error(`Invalid variantId: ${it.variantId} for parentId: ${it.parentId}`, it);
      return;
    }
  }

  const quantityToAdd = it.quantity || 1;

  const existingIdx = selectedItems.findIndex(
    (r) => r.item === it.parentId && r.variant === (it.variantId || null)
  );

  if (existingIdx !== -1) {
    // Item already exists → update quantity by quantityToAdd
    const updated = [...selectedItems];
    const existing = updated[existingIdx];
    const newQty = existing.quantity + quantityToAdd;
    if(newQty > updated[existingIdx].currentStock){
      console.log("newQty",newQty)
      console.log(newQty => updated[existingIdx].currentStock)
      console.log(updated[existingIdx].currentStock)
      setSearchQuery("");
      return alert("No more stock available for this item.");
    }
     playSound("/sounds/item-exists.mp3");
    updated[existingIdx] = {
      ...existing,
      quantity: newQty,
      subtotal: newQty * existing.salesPrice - ( 0),
    };

    setSelectedItems(updated);
  } else {
    playSound("/sounds/item-added.mp3");
    // New item → add it to the list
    const newItem = {
      stock:it.openingStock || 0,
      item: it.parentId,
      variant: it.variantId || null,
      itemName: it.itemName || "NA",
      itemCode: it.itemCode || "",
      openingStock: it.openingStock || 0,
      currentStock: it.currentStock != null ? it.currentStock : (it.openingStock || 0),
      salesPrice: it.salesPrice || 0,
      quantity: quantityToAdd,
      discount:  0,
      tax: it.tax?._id || null,
      taxRate: it.tax?.taxPercentage || 0,
      unit: it.unit || null,
      mrp: it.mrp || 0,
      expiryDate: it.expiryDate || null,
      subtotal: quantityToAdd * (it.salesPrice || 0) -  0,
    };

    if (newItem.salesPrice <= 0) {
      alert("Item sales price must be greater than zero.");
      return;
    }

    setSelectedItems((prev) => [newItem,...prev]);
    
  }

 

  setSearchQuery("");
};

const handleAddItemsBatch = (itemsToAdd) => {
  setSelectedItems((prevItems) => {
    const updated = [...prevItems];

    itemsToAdd.forEach((it) => {
      if (!it || !it.parentId) return;

      const parentExists = allItems.some((ai) => ai._id === it.parentId && !ai.variantId);
      if (!parentExists && !it.variantId) return;

      if (it.variantId) {
        const variantValid = allItems.some((ai) => ai._id === it.variantId && ai.parentId === it.parentId);
        if (!variantValid) return;
      }

      const quantityToAdd = it.quantity || 1;
      const idx = updated.findIndex((r) => r.item === it.parentId && r.variant === (it.variantId || null));

      if (idx !== -1) {
        const existing = updated[idx];
        const newQty = existing.quantity + quantityToAdd;

        if (newQty >= existing.currentStock) {
          return; // Skip if exceeding stock
        }

        updated[idx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.salesPrice - ( 0),
        };
        playSound("/sounds/item-exists.mp3");
      } else {
        const newItem = {
          stock: it.openingStock || 0,
          item: it.parentId,
          variant: it.variantId || null,
          itemName: it.itemName || "NA",
          itemCode: it.itemCode || "",
          openingStock: it.openingStock || 0,
          currentStock: it.currentStock != null ? it.currentStock : (it.openingStock || 0),
          salesPrice: it.salesPrice || 0,
          quantity: quantityToAdd,
          discount:  0,
          tax: it.tax?._id || null,
          taxRate: it.tax?.taxPercentage || 0,
          unit: it.unit || null,
          mrp: it.mrp || 0,
          expiryDate: it.expiryDate || null,
          subtotal: quantityToAdd * (it.salesPrice || 0) - ( 0),
        };

        if (newItem.salesPrice > 0) {
          updated.unshift(newItem);
          playSound("/sounds/item-added.mp3");
        }
      }
    });

    return updated;
  });

  setSearchQuery("");
};




  // ─── REMOVE ITEM FROM SELECTED ────────────────────────────────────────
  const handleRemoveItem = (id) => {
    setSelectedItems(selectedItems.filter((it) => it.itemId !== id));
  };

  // ─── UPDATE QUANTITY IN SELECTED ──────────────────────────────────────
  const handleItemChange = (idx, field, val) => {
    
    const numericVal = Number(val);
  const row = selectedItems[idx];

  // ❗ Block salesPrice from ever exceeding MRP
  if (field === "salesPrice" && numericVal > row.mrp) {
    alert(`❗ Sales Price (${numericVal}) cannot exceed the MRP (${row.mrp})`);
    return;
  }

  // your existing non-zero check
  if ((field === "salesPrice") && numericVal <= 0) {
    alert(`${field.charAt(0).toUpperCase() + field.slice(1)} must be greater than zero.`);
    return;
  }

  setSelectedItems((prev) =>
    prev.map((r, i) =>
      i === idx
        ? {
            ...r,
             
                 [field]:val.replace(/^0+(?!$)/, '')
              
          }
        : r
    )
  );
  };

  // ─── SUBMIT TRANSFER ───────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.transferDate ||
      !formData.fromWarehouse ||
      !formData.toWarehouse
    ) {
      return alert("Fill date, From & To warehouse.");
    }
    if (formData.fromWarehouse === formData.toWarehouse) {
      return alert("Cannot transfer to the same warehouse.");
    }
    if (selectedItems.length === 0) {
      return alert("Add at least one item.");
    }

    setLoading(true);
    try {
      setIsSubmitting(true);
      const payload = {
        ...formData,
        items: selectedItems.map((it) => ({
          item: it.item,
          quantity: parseInt(it.quantity, 10) || 1,
        })),
      };
      console.log(selectedItems)
      console.log("Payload:", payload);
      const token = localStorage.getItem("token");
      if (id) {
        await axios.put(
          `${link}/api/stock-transfers/${id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Stock transfer updated!");
      } else {
        await axios.post(
          `${link}/api/stock-transfers`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        alert("Stock transfer created!");
      }
      navigate("/transfer-list");
    } catch (err) {
      console.error("submit:", err);
      alert(err.response?.data?.message || "Submit failed.");
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────
  

  return (
    <div className="flex flex-col h-screen ">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-grow">
        <Sidebar isSidebarOpen={isSidebarOpen} />

        <div className="w-full ">
          {/* Header */}
          

          {/* Form */}
          <form
             onSubmit={handleSubmit}
        
          >
            {/* ─── Row 1: Date / From / To ───────────────────────────────── */}
           {activeTab==="s1" && <S1 setSecondWarehouseName={setSecondWarehouseName} formData={formData} setActiveTab={setActiveTab} setFormData={setFormData} warehouses={warehouses}/>}
           {activeTab==="s2" && <S2 secondWarehouseName={secondWarehouseName} searchQuery={searchQuery} handleAddItemsBatch={handleAddItemsBatch}
  setSearchQuery={setSearchQuery} secondItems={secondItems}
  allItems={allItems} scanning={scanning} stopScanner={stopScanner} startScanner={startScanner}
  handleAddItem={handleAddItem}  matchedItems={matchedItems}
  formData={formData} videoRef={videoRef} codeReaderRef={codeReaderRef} setMatchedItems={setMatchedItems} setScanning={setScanning}
  filteredItems={filteredItems} setSelectedItems={setSelectedItems}
  selectedItems={selectedItems} setActiveTab={setActiveTab}
  handleItemChange={handleItemChange} addItem={handleAddItem}
  handleRemoveItem={handleRemoveItem}/>}

  {activeTab==="s3" && <S3  formData={formData} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting}
  setActiveTab={setActiveTab}
  setFormData={setFormData}
  selectedItems={selectedItems}
  handleItemChange={handleItemChange}
  setSelectedItems={setSelectedItems}
  handleRemoveItem={handleRemoveItem}
  
  allItems={allItems}
  warehouses={warehouses}
  id={id}
  navigate={navigate}/>}

  
            
          </form>
        </div>
      </div>
    </div>
  );
}

export default Sm;
