
import React,{useState,useEffect,useRef} from 'react'
import {
  FaArrowLeft,
  FaSearch,
  FaPlus,
  FaQrcode,
  FaChevronDown,
  FaEllipsisV,FaMinus,FaTrashAlt
} from "react-icons/fa";
import StockScanner from './StockScanner';
import { App } from "@capacitor/app";
import { useLocation,useNavigate } from 'react-router-dom'
import Swal from "sweetalert2"
import { Keyboard } from '@capacitor/keyboard';


import playSound from "../../../utility/sound";
export default function S2({
     searchQuery,handleAddItemsBatch,
  setSearchQuery,secondItems,secondWarehouseName,
  allItems,
  handleAddItem,
  formData,
  filteredItems,
  selectedItems,setSelectedItems,
 
  handleRemoveItem,setActiveTab,
  handleItemInfo,scanning,startScanner,stopScanner,
  matchedItems,videoRef,setMatchedItems,codeReaderRef,addItem,setScanning,st
}) {
  console.log(selectedItems)
  const confirmBack = async () => {
      const result = await Swal.fire({
        title: "Go Back?",
        text: "Going back will remove all added items. Do you want to proceed?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, go back",
        cancelButtonText: "Cancel",
        reverseButtons: true,
        focusCancel: true,
      });
  
      if (result.isConfirmed) {
      setSelectedItems([])
        setActiveTab("s1");
      } 
    };
      
     const location=useLocation()
        const navigate=useNavigate()
          const initialLocationRef = useRef(location);
      
        // Hardware back
        useEffect(() => {
          const backHandler = App.addListener('backButton', () => {
            confirmBack()
          });
      
          return () => backHandler.remove();
        }, []);
      
        // Intercept swipe back or browser back
        useEffect(() => {
          const unblock = navigate((_, action) => {
            if (action === 'POP') {
    confirmBack();
              return false; // Prevent actual navigation
            }
          });
      
          return unblock;
        }, [navigate]);
        
    const [selectedItem, setSelectedItem] = useState(null);
    const [showInfoModal, setShowInfoModal] = useState(false);
    
  
        const[itemScan,setItemScan]=useState(false)

        
const handleQuanity = (id, variant , type) => {
  // Handle item removal
  if (type === "remove") {
    console.log(variant)
    const filtered = selectedItems.filter(it => !(it.item === id && it.variant === variant));
    setSelectedItems(filtered);
    return;
  }

  const updatedItems = selectedItems.map(item => {
    // console.log(item) 
    console.log(id)
    console.log(variant)
    if (!(item.item == id && item.variant == variant)) return item;

    console.log(item)
    let newQty = item.quantity;

    if (type === "plus") {
      newQty = item.quantity + 1;
      if (item.currentStock && newQty > item.currentStock) {
  
        return item;
      }
    } else if (type === "minus") {
      newQty = Math.max(1, item.quantity - 1);
    } else if (typeof type === "number") {
      const inputQty =type // prevent 0 or negative
      newQty = item.currentStock ? Math.min(inputQty, item.currentStock) : inputQty;
    }

    return {
      ...item,
      quantity: newQty,
      subtotal: newQty * item.salesPrice - (item.discount || 0),
    };
  });

  setSelectedItems(updatedItems);
};

const lastScanRef = useRef({ code: null, time: 0 });

  const SCAN_GAP = 400; // 1 second
const debounceTimerRef = useRef(null);
const DEBOUNCE_DELAY = 500; // Time to wait after user stops typing

  const canScan = (code) => {
    const now = Date.now();
    if (
      lastScanRef.current.code === code &&
      now - lastScanRef.current.time < SCAN_GAP
    ) {
      return false; // recently scanned
    }
    lastScanRef.current = { code, time: now };
    return true;
  };
  
useEffect(() => {
    // 1. Clear the previous timer on every keystroke
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
    }

    // 2. If the input is not empty, set a new timer
    if (searchQuery) {
        debounceTimerRef.current = setTimeout(() => {
            // 3. This code runs after the user has stopped typing for DEBOUNCE_DELAY ms
            const exactMatches = allItems.filter((i) =>
                i.barcodes?.some((barcode) => String(barcode) === String(searchQuery))
            );

            // 4. If we found exactly one item that is an exact match for the typed code...
            if (exactMatches.length === 1 && canScan(searchQuery)) {
                // ...add it and clear the input.
                addItem(exactMatches[0]);
                setSearchQuery("");
            }
        }, DEBOUNCE_DELAY);
    }

    // Cleanup function to clear the timer if the component unmounts
    return () => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
    };
}, [searchQuery, allItems, addItem]); // Dependencies for the effect
  useEffect(()=>{
    console.log("das")
    console.log(selectedItems)
  },[selectedItems])

  
  if(itemScan) return <StockScanner handleAddItemsBatch={handleAddItemsBatch} startScanner={startScanner} matchedItems={matchedItems} setMatchedItems={setMatchedItems} stopScanner={stopScanner} allItems={allItems} handleQuanity={handleQuanity}  videoRef={videoRef}    
 setItemScan={setItemScan}/>
  return (
  
<div className="relative min-h-screen p-2 pb-24 bg-white">
  {/* Top Bar */}
<h4 className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-purple-700 bg-purple-50 border border-purple-200 rounded-full shadow-sm">
  Transferring Warehouse: <span className="text-gray-800">{secondWarehouseName || "N/A"}</span>
</h4>
  <div className="flex items-center pt-4 space-x-3">
    <FaArrowLeft className="text-xl text-gray-600" onClick={() => setActiveTab("s1")} />
    
    <div className="flex items-center flex-grow px-3 py-2 bg-gray-100 rounded-full shadow-sm">
      <FaSearch className="mr-2 text-purple-600" />
      <input
        type="text"
        value={searchQuery}
         onFocus={(e) => {
    e.target.focus(); // ensure input is focused
    setTimeout(() => {
      // Keyboard.show(); // explicitly show the keyboard
    }, 100); // short delay helps trigger keyboard on some Androids
  }}
  
        onChange={(e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if(val =="" || val == " ") return ;
        
        const trimmed = val.trim();
        const hit = allItems.find(i => i.barcodes?.includes(trimmed) || i.itemCode==trimmed );
       console.log(hit)
        if(hit?.variantId) playSound("/sounds/beep-6-96243.mp3")
      }}
      onKeyDown={(e) => {
        // e.preventDefault();
        if (e.key === "Enter" ) {
          e.preventDefault();
          
          if(filteredItems.length >1) return;
          
          if(filteredItems[0]){
            addItem(filteredItems[0]);
            setSearchQuery("");
          }
          
        }
      }}
        className="flex-grow text-sm placeholder-gray-400 bg-transparent focus:outline-none"
        placeholder="Search by name or code"
      />
      <FaQrcode className="ml-2 text-purple-600" onClick={() => setItemScan(true)} />
    </div>
  </div>

  {/* Search Results Dropdown */}
  {searchQuery && filteredItems.length > 0 && (
   <div className="absolute z-40 w-[calc(100%-32px)] mx-4 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
    
    {/* Scrollable List */}
    <div className="max-h-[60vh] overflow-y-auto scroll-smooth custom-scrollbar">
      {filteredItems.map((it) => (
        <div
          key={it._id}
          className="flex items-center gap-3 px-4 py-3 transition-colors border-b border-gray-100 hover:bg-purple-50 active:bg-purple-100"
          onClick={() => addItem(it)}
        >
          {/* Icon */}
          <div className="flex items-center justify-center font-bold text-white shadow-sm w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500">
            {it.itemName?.charAt(0)?.toUpperCase()}
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900 truncate">{it.itemName}</h4>
              <span className="text-sm font-bold text-purple-600 whitespace-nowrap">₹{it.salesPrice}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span className="px-2 py-0.5 text-purple-700 bg-purple-50 rounded-full font-mono">
                {it.itemCode}
              </span>
              <span
                className={`font-medium ${
                  it.currentStock > 10
                    ? "text-green-600"
                    : it.currentStock > 0
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                {it.currentStock || 0} in stock
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className="px-4 py-2.5 text-xs text-center text-gray-500 bg-gray-50 border-t border-gray-100">
      {filteredItems.length} item{filteredItems.length !== 1 && 's'} found
    </div>
  </div>
  )}

  {/* Selected Items */}
  <div className="mt-4 space-y-4">
    {selectedItems?.map((item, index) => {
     
      const itemId = item.item && typeof item.item === "object" ? item.item._id : item.item;
      console.log("K",item)
const it = allItems.find(i => (i._id == itemId && i.variantId == item.variant));
 console.log(it)
      
      return (
         <div
                    key={it._id}
                    className="relative p-4 transition-all bg-white border shadow-xs rounded-2xl border-gray-200/70 hover:shadow-sm"
                  >
                    {/* Floating Action Menu (Contextual) */}
                    <div className="absolute flex gap-1 top-3 ">
                      <button 
                        onClick={() => handleQuanity(it?._id, "remove")}
                        className="p-1.5  text-gray-400 hover:text-red-500 rounded-full transition-colors"
                      >
                        <FaTrashAlt className="w-3.5 h-3.5" />
                      </button>
                    </div>
        
                    <div className="flex gap-3">
                      {/* Item Visual with Gradient */}
                      <div className="relative flex-shrink-0">
                        <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white shadow-xs bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
                          {it?.itemName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      </div>
        
                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{it?.itemName}</h3>
                          <span className="ml-1 text-sm font-bold text-purple-600 whitespace-nowrap">
                            ₹{(it?.salesPrice||0 * item?.quantity).toFixed(2)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                          {it?.description || "No description available"}
                        </p>
        
                        {/* Interactive Quantity Controls */}
                        <div className="flex items-center justify-between mt-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${
                            it.currentStock > 10 ? "bg-green-50 text-green-700" :
                            it.currentStock > 0 ? "bg-yellow-50 text-yellow-700" :
                            "bg-red-50 text-red-700"
                          }`}>
                            {it?.currentStock || 0} available
                          </span>
        
                          <div className="flex items-center gap-2 bg-gray-100/70 rounded-full p-0.5">
                            <button type="button"
                              onClick={() => handleQuanity(it._id, item.variant ,"minus")}
                              className="p-1.5 text-gray-600 hover:text-purple-600 rounded-full active:bg-gray-200 transition-colors"
                              disabled={item?.quantity <= 0}
                            >
                              <FaMinus className="w-3.5 h-3.5" />
                            </button>
                              <input           onFocus={(e) => {
                                  e.target.focus(); // ensure input is focused
                                  setTimeout(() => {
                                    Keyboard.show(); // explicitly show the keyboard
                                  }, 100); // short delay helps trigger keyboard on some Androids
                                }}
  type="text"
  value={item.quantity}
  onChange={(e) => {
    const val = (Number(e.target.value));
    handleQuanity(it._id, item.variant ,val);
  }}
  className="w-12 text-sm font-medium text-center text-gray-800 bg-transparent border-none focus:ring-0 focus:outline-none"
/>
                            <button type="button"
                              onClick={() => handleQuanity(it._id, item.variant , "plus")}
                              className="p-1.5 text-gray-600 hover:text-purple-600 rounded-full active:bg-gray-200 transition-colors"
                              disabled={it?.currentStock <= item?.quantity}
                            >
                              <FaPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex justify-end mt-3">
  <button type="button"
    onClick={() => handleQuanity(it?._id, item.variant , "remove")}
    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 rounded-full bg-red-50 hover:bg-red-100"
  >
    <FaTrashAlt className="w-4 h-4" />
  </button>
</div>

                        </div>
                      </div>
                    </div>
        
                    {/* Price Breakdown (Subtle) */}
                   <div className="flex items-center justify-between pt-2 mt-2 text-xs text-gray-600 border-t border-gray-200">
  {/* Quantity in transferring warehouse */}
  <span className="font-medium">
    Transferring Warehouse: {secondItems[it?._id] || 0} pcs
  </span>

  {/* Price × Quantity */}
  <span className="text-gray-500">
    ₹{it?.salesPrice} × {item?.quantity}
  </span>
</div>

                  </div> 
      );
    })}
  </div>

  {/* Fixed Save Button */}
 <div className="fixed inset-x-0 px-4 bottom-4">
  <button
    type="button"
    onClick={() => setActiveTab("s3")}
    className="flex items-center justify-center w-full gap-2 py-3 text-base font-semibold text-white transition bg-purple-600 rounded-full shadow-lg active:scale-95 hover:bg-purple-700"
  >
    <span>Save Items</span>
    <span className="bg-white text-purple-600 font-bold text-sm px-2 py-0.5 rounded-full">
      {selectedItems.reduce((sum, item) => sum + (item.quantity || 0), 0)}
    </span>
  </button>
</div>


</div>

  )
}
