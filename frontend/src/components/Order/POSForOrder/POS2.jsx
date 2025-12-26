import {
  FaArrowLeft,
  FaSearch,
  FaPlus,
  FaQrcode,
  FaChevronDown,FaTimes,FaTrashAlt,
  FaEllipsisV,FaMinus
} from "react-icons/fa";
import Swal from "sweetalert2"
import POSScanner from "./POSScanner";
import { useState,useRef,useEffect, use } from "react";
import { App } from "@capacitor/app";
import { useLocation,useNavigate } from 'react-router-dom'
import MinimalOfferView from "./OfferView";
import { add } from "date-fns";
import { Keyboard } from '@capacitor/keyboard';
export default function POS2({
  searchItemCode,
  setSearchItemCode,
  allItems,
  filteredItems,
  addItem,
  items,
  setItems,
  setActiveTab,
  addItemsInBatch,updateItem
}) {
  
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
    setItems([])
      setActiveTab("pos1");
    } 
  };
  
  const [offerView, setOfferView] = useState(false);
  const [offerItem, setOfferItem] = useState(null);
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
    
  const[itemScan,setItemScan]=useState(false)


 const handleQuanity = (id, type) => {
 
 
  if (type === "remove") {
    const filtered = items.filter((it) => it.item !== id);
    const withOffer = applyOfferLogic(filtered);
    setItems(withOffer);
    return;
  }

  const updated = items.map((item) => {
    if (item.item === id) {
      let newQty = item.quantity;
      
      if (type === "plus") {
        newQty = item.quantity + 1;
      } else if (type === "minus") {
        newQty = Math.max(1, item.quantity - 1);
      } else if (typeof type === "number") {
        newQty =type; // remove leading zeros
      }
     if (newQty > item.currentStock) {
      newQty = item.currentStock; // cap it at stock
    }
      return {
        ...item,
        quantity: newQty,
        subtotal: newQty * item.salesPrice - (0),
      };
    }

    return {
      ...item,
      subtotal: item.quantity * item.salesPrice ,
    };
  });

  const withOffer = applyOfferLogic(updated);
  console.log(withOffer);
  setItems(withOffer);
};


function applyOfferLogic(itemList) {
  let count = 0;
  return itemList.map((item) => {
    if (
      item.discountPolicy === "BuyXGetY" &&
      item.quantity >= item.requiredQty
    ) {
      
      return {
        ...item,
        subtotal: item.subtotal - (item.salesPrice * item.freeQty), // or custom discount logic
      };
    }
    return item;
  });
}




const lastScanRef = useRef({ code: null, time: 0 });
// const debounceTimerRef = useRef(null);
// const SCAN_GAP = 3000; // Time between identical scans
// const DEBOUNCE_DELAY = 3000; // Time to wait after user stops typing

// const canScan = (code) => {
//     const now = Date.now();
//     if (
//         lastScanRef.current.code === code &&
//         now - lastScanRef.current.time < SCAN_GAP
//     ) {
//         return false; // recently scanned the same code
//     }
//     lastScanRef.current = { code, time: now };
//     return true;
// };

// useEffect(() => {
//     if (!searchItemCode) return;

//     // Clear previous debounce timer
//     if (debounceTimerRef.current) {
//         clearTimeout(debounceTimerRef.current);
//     }

//     // Start new debounce timer
//     debounceTimerRef.current = setTimeout(() => {
//         const exactMatches = allItems.filter((i) =>
//             i.barcodes?.some((barcode) => String(barcode) === String(searchItemCode))
//         );

//         if (exactMatches.length === 1 && canScan(searchItemCode)) {
//             addItem(exactMatches[0]);
//             setSearchItemCode("");
//         }
//     }, DEBOUNCE_DELAY);

//     // Cleanup on unmount or re-run
//     return () => {
//         if (debounceTimerRef.current) {
//             clearTimeout(debounceTimerRef.current);
//         }
//     };
// }, [searchItemCode]); // ONLY depends on typing changes


   const [total,setTotal]=useState(0)
  useEffect(() => {
    const totalAmount = items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    setTotal(totalAmount);
  }, [items]);

  if(itemScan) return <POSScanner addItemsInBatch={addItemsInBatch}  allItems={allItems} items={items} handleQuanity={handleQuanity}  addItem={addItem} setItemScan={setItemScan}/>
  return (

    
<div className="relative min-h-screen bg-gray-50/50 pb-28">
  {/* Modern App Header with Glass Morphism */}
  <header className="p-4 border-b border-gray-100">
    <div className="flex items-center gap-3">
      <button 
        onClick={() => setActiveTab("pos1")}
        className="p-2 transition-all rounded-xl active:bg-gray-100 active:scale-95"
      >
        <FaArrowLeft className="text-xl text-gray-700" />
      </button>
      {
      offerView && offerItem && (
        <MinimalOfferView setOfferView={setOfferView}  offerItem={offerItem} />)
      }
      
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4">
          <FaSearch className="text-purple-500/80" />
        </div>
        <input
          type="text" 
  //          onFocus={(e) => {
  //   e.target.focus(); // ensure input is focused
  //   setTimeout(() => {
  //     Keyboard.show(); // explicitly show the keyboard
  //   }, 100); // short delay helps trigger keyboard on some Androids
  // }}
          value={searchItemCode}
          
          
       onChange={(e) => {
        const val = e.target.value;
        setSearchItemCode(val);
      }}


      
      onKeyDown={(e) => {
        if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = searchItemCode.trim();
      console.log("Bargun input (Enter):", trimmed); // Debug log

      
      const hit = allItems.find(i => i.barcodes?.includes(trimmed));
      if (hit) {
        console.log("Matched item:", hit.itemName, hit._id); // Debug log
        addItem(hit);
        lastScanRef.current = { code: trimmed, time: Date.now() };
        setSearchItemCode("");
      } else {
        console.log("No item found for barcode:", trimmed); // Debug log
      }
    }
      }}    
          className="w-full py-3.5 pl-12 pr-11 text-sm bg-white rounded-xl shadow-xs border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-purple-300/50 focus:border-transparent placeholder:text-gray-400"
          placeholder="Search or scan items..."
        />
        <button 
          onClick={() => setItemScan(true)}
          className="absolute inset-y-0 right-0 flex items-center pr-4 active:scale-95"
        >
          <FaQrcode className="text-purple-500" />
        </button>
      </div>
    </div>
  </header>

  {/* Floating Search Results (Neumorphism Style) */}
  {searchItemCode && filteredItems.length > 0 && (
    <div className="absolute z-30 w-[calc(100%-32px)] mx-4 mt-2 bg-white rounded-2xl shadow-lg border border-gray-100/80 overflow-hidden">
      <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
        {filteredItems.map((it) =>{
        
          const variantColors = [
          "text-green-600", // First variant
          "text-blue-600",  // Second variant
          "text-orange-600", // Third variant
          "text-purple-600", // Fourth variant
          "text-red-600",   // Fifth variant
          "text-pink-600",  // Sixth variant
        ];
        
         const variantsForParent = filteredItems
          .filter(item => item.parentItemId === it.parentItemId && item.itemGroup === "Variant")
          .sort((a, b) => a._id.localeCompare(b._id)); // Consistent order
        const variantIndex = it.itemGroup === "Variant"
          ? variantsForParent.findIndex(v => v._id === it._id)
          : -1;
        const mrpColor = it.itemGroup === "Variant"
          ? variantColors[variantIndex % variantColors.length] // Cycle through colors
          : "text-gray-600"; // Single items remain gray

          
        
        return(
          <div
            key={it._id}
            className={`p-3 transition-colors border-b border-gray-100 last:border-0 ${it.itemGroup=== "Variant "?"bg-blue-50":''}`}
            onClick={() => addItem(it)}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center flex-shrink-0 text-lg font-bold text-white shadow-xs w-11 h-11 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
                {it.itemName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 truncate">{it.itemName}</h4>
                  <span className={`ml-2 text-sm font-bold whitespace-nowrap ${mrpColor}`}>
                    ₹{it.mrp}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                    {it.itemCode}
                  </span>
                  <span className={`text-xs ${
                    it.currentStock > 10 ? "text-green-500" : 
                    it.currentStock > 0 ? "text-yellow-500" : "text-red-500"
                  }`}>
                    {it.currentStock || 0} in stock
                  </span>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>
      <div className="px-4 py-2.5 text-xs text-center text-gray-500 bg-gray-50/50 border-t border-gray-100">
        {filteredItems.length} item{filteredItems.length !== 1 && 's'} found
      </div>
    </div>
  )}

  {/* Main Content Area */}
  <main className="p-4">
    {/* Section Header with Micro-interactions */}
   

    {/* Modern Card Design with Hover Effects */}
    <div className="grid gap-3">
      {items.map((item,idx) => {
        const it = allItems.find(i => i._id === item.item);
        
        console.log(it);
        return (
          <div
            key={item.item}
            className="relative p-4 transition-all bg-white border shadow-xs rounded-2xl border-gray-200/70 hover:shadow-sm"
          >
            
            <div className="flex gap-3">
              {/* Item Visual with Gradient */}
              <div className="relative flex-shrink-0">
                <div className="flex items-center justify-center w-12 h-12 text-lg font-bold text-white shadow-xs bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl">
                  {item.itemName?.charAt(0)?.toUpperCase() || "?"}
                </div>
                {item.currentStock <= 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    Out
                  </div>
                )}
              </div>

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{item.itemName}</h3>
                  <span className="ml-1 text-sm font-bold text-purple-600 whitespace-nowrap">
                    ₹{(item.subtotal)?.toFixed(2) || 0}
                  </span>
                </div>
               
                <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                  {item.description || "No description available"}
                </p>

                {/* Interactive Quantity Controls */}
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full ${
                    item.currentStock > 10 ? "bg-green-50 text-green-700" :
                    item.currentStock > 0 ? "bg-yellow-50 text-yellow-700" :
                    "bg-red-50 text-red-700"
                  }`}>
                    {item.currentStock || 0} available
                  </span>

                  <div className="flex items-center gap-2 bg-gray-100/70 rounded-full p-0.5">
                    <button
                      onClick={() => updateItem(idx, "quantity", Math.max(item.quantity - 1, 1))}
                      className="p-1.5 text-gray-600 hover:text-purple-600 rounded-full active:bg-gray-200 transition-colors"
                      disabled={item.quantity <= 0}
                    >
                      <FaMinus className="w-3.5 h-3.5" />
                    </button>
                     <input
                      onFocus={(e) => {
    e.target.focus(); // ensure input is focused
    setTimeout(() => {
      Keyboard.show(); // explicitly show the keyboard
    }, 100); // short delay helps trigger keyboard on some Androids
  }}
  type="text"
  value={item.quantity}


  
  onChange={(e) => {
    const val = (Number(e.target.value));
    handleQuanity(item.item, val);
  }}
  className="w-12 text-sm font-medium text-center text-gray-800 bg-transparent border-none focus:ring-0 focus:outline-none"
/>
                    <button
                      onClick={() => updateItem(idx, "quantity", item.quantity + 1)}
                      className="p-1.5 text-gray-600 hover:text-purple-600 rounded-full active:bg-gray-200 transition-colors"
                      
                    >
                      <FaPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>




                  
                  <div className="flex items-start justify-between mt-3">
  <button
    onClick={() => handleQuanity(item.item, "remove")}
    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 rounded-full bg-red-50 hover:bg-red-100"
  >
    <FaTrashAlt className="w-4 h-4" />
  </button>
</div>

                </div>
              </div>
            </div>

            {/* Price Breakdown (Subtle) */}
           <div className="flex items-center justify-between pt-2 text-xs text-gray-500 border-t border-gray-100/70">
  
  {/* Offer Button */}


  {
    !item.discountPolicy=="None" && (
<button
    onClick={() => {
      setOfferView(true);
      setOfferItem({
        itemName: item.itemName,
        requiredQty: item.requiredQuantity || 0,
        freeQty: item.freeQuantity || 0

      });
    }}
    className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 transition-colors bg-blue-100 rounded-full hover:bg-blue-200"
  >
    <svg
      className="w-3.5 h-3.5 text-blue-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l.7 2.148a1 1 0 00.95.69h2.262c.969 0 1.371 1.24.588 1.81l-1.833 1.33a1 1 0 00-.364 1.118l.7 2.148c.3.921-.755 1.688-1.538 1.118l-1.834-1.33a1 1 0 00-1.175 0l-1.833 1.33c-.783.57-1.838-.197-1.538-1.118l.7-2.148a1 1 0 00-.364-1.118L3.55 7.575c-.783-.57-.38-1.81.588-1.81H6.4a1 1 0 00.95-.69l.7-2.148z" />
    </svg>
    View Offer
  </button>
    )
  }
  

  {/* Price Text */}
  <span className="font-medium text-gray-700">₹{item.salesPrice} × {item.quantity}</span>
</div>


          </div>
        );
      })}
    </div>
  </main>

  {/* Modern Floating Action Button (Sticky) */}
  <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/90 to-transparent backdrop-blur-sm">
    <button
      onClick={() => setActiveTab("pos3")}
      disabled={items.filter(i => i.quantity > 0).length === 0}
      className={`w-full py-4 px-6 text-sm font-bold text-white rounded-xl shadow-lg transition-all ${
        items.filter(i => i.quantity > 0).length === 0 
          ? "bg-gray-300 cursor-not-allowed" 
          : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-md active:scale-[0.98]"
      }`}
    >
      
      <div className="flex items-center justify-between">
  <span>Proceed to Payment</span>
  <div className="flex gap-2">
    <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs">
       {items.reduce((sum, item) => sum + (item.quantity || 0), 0)}  items
    </span>
    <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs">
      ₹{total.toFixed(2)}
    </span>
  </div>
</div>
    </button>
  </div>
</div>


  );
}


