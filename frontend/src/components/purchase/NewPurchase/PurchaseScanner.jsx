import { useRef, useEffect, useState, useCallback } from 'react';
import { FaPlus, FaMinus, FaSave ,FaTimes} from 'react-icons/fa';
import { App } from "@capacitor/app";
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import { Camera } from '@capacitor/camera';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import playSound from '../../../utility/sound';
import { BsBasket2 } from 'react-icons/bs';
import { add, sub } from 'date-fns';
const PurchaseScanner = ({ allItems, addItem, setItemScan, addItemsInBatch }) => {
  const [matchedItems, setMatchedItems] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const lastScannedRef = useRef({ value: "", timestamp: 0 });
  const navigate = useNavigate();
  const [multiMatchItems, setMultiMatchItems] = useState([]);
const [showMultiSelect, setShowMultiSelect] = useState(false);

  // Hardware back button handler
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
      setItemScan(false);
      setMatchedItems([]);
    }
    
  };

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

  const handleScanSuccess = useCallback((decodedText) => {
      const now = Date.now();

  // Avoid repeated scans of the same barcode within 1 second
  if (
    isScanningRef.current ||
    (decodedText === lastScannedRef.current.value &&
     now - lastScannedRef.current.timestamp < 1000)
  ) return;
    
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    lastScannedRef.current = { value: decodedText, timestamp: now };

    const m = allItems.filter(
      (it) =>
        it.barcodes?.includes(decodedText) ||
        it.barcode === decodedText ||
        it.itemCode === decodedText
    );
          console.log(m)
    
          if (m.length > 1) {
          
            playSound("/sounds/short-beep-tone-47916.mp3")
            setMultiMatchItems(m);
            setShowMultiSelect(true);
            isScanningRef.current = false; // allow next scan after choosing
            return;
          }
          
    
          const match = m[0]

    if (match) {
      setMatchedItems(prevItems => {
  const existingIndex = prevItems.findIndex(item => item.item === match._id);

  if (existingIndex !== -1) {
    const existingItem = prevItems[existingIndex];


    const updatedQty = existingItem.quantity + 1;

    const newItems = [...prevItems];
    newItems[existingIndex] = {
      ...existingItem,
      quantity: updatedQty,
      subtotal: updatedQty * match.salesPrice,
    };

    playSound("/sounds/item-exists.mp3");
    return newItems;
  } else {
    playSound("/sounds/item-added.mp3");
    return [
      
      {
        ...match,
        quantity: 1,
        item: match._id,
        subtotal: match.salesPrice * 1,
        stock: match.currentStock || 0,
      }, ...prevItems
    ];
  }
});

    }

    setTimeout(() => {
      isScanningRef.current = false;
    }, 300);
  }, [allItems, playBeep]);

  useEffect(() => {
    let html5Qrcode;
    let isMounted = true;

    const initializeScanner = async () => {
      try {
        const permission = await Camera.requestPermissions();
        if (permission.camera !== 'granted') {
          console.warn('Camera permission denied');
          return;
        }

        html5Qrcode = new Html5Qrcode("reader");
        
        const config = {
          fps: 10,
          qrbox: { width: 700, height: 700 },
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        await html5Qrcode.start(
          { facingMode: "environment" },
          config,
          handleScanSuccess,
          () => {} // Quiet error handling
        );

        if (isMounted) {
          scannerRef.current = html5Qrcode;
          setIsInitialized(true);
        }
      } catch (error) {
        console.error("Scanner initialization failed:", error);
        if (isMounted) {
          setIsInitialized(false);
        }
      }
    };

    initializeScanner();

    return () => {
      isMounted = false;
      if (html5Qrcode && html5Qrcode.isScanning) {
        html5Qrcode.stop().then(() => {
          html5Qrcode.clear();
        }).catch(err => {
          console.log("Scanner cleanup error:", err);
        });
      }
    };
  }, [handleScanSuccess]);

  const handleQuantity = (id, type) => {
    setMatchedItems(prevItems => 
      prevItems.map(item =>
        item.item === id &&item.quantity<item.stock ? {
          ...item,
          quantity: type === "plus" ? item.quantity + 1 : Math.max(1, item.quantity - 1)
        } : item
      ).filter(item => item.quantity > 0)
    );
  };

  const handleSave = () => {
    if (matchedItems.length === 0) {
      Swal.fire("Error", "At least one item is required", "error");
      return;
    }
    addItemsInBatch(matchedItems);
    setItemScan(false);
  };

  
  // useEffect(()=>{handleScanSuccess("IT/2025/0000009")},[])

  const handleMultiSelectItem = (selected) => {
    setShowMultiSelect(false);
    setMultiMatchItems([]);
  
    // Continue your normal code
    setMatchedItems(prevItems => {
      const existingIndex = prevItems.findIndex(item => item.item === selected._id);
  
      let updatedItems;
      if (existingIndex !== -1) {
        const currentItem = prevItems[existingIndex];
        const stockQty = currentItem.currentStock || currentItem.stock || 0;
  
        if (currentItem.quantity >= stockQty) {
          alert("No more stock available for this item.");
          return prevItems;
        }
  
        updatedItems = [...prevItems];
        updatedItems[existingIndex] = {
          ...currentItem,
          quantity: currentItem.quantity + 1,
          subtotal: (currentItem.quantity + 1)* currentItem.salesPrice,
        };
  
        playSound("/sounds/item-exists.mp3");
  
      } else {
        const newItem = {
          ...selected,
          quantity: 1,
        item: selected._id,
        subtotal: selected.salesPrice * 1,
        stock: selected.currentStock || 0,
        };
  
        updatedItems = [ newItem, ...prevItems ];
        playSound("/sounds/item-added.mp3");
      }
  
      return (updatedItems);
    });
  
    isScanningRef.current = false; // enable next scan
  };

  return (
  <div className="relative flex flex-col h-screen">
      {/* Scanner View */}
      <div className="relative overflow-hidden rounded-xl h-[35vh] ">
      {/* Back Button */}
      <button 
        onClick={() => setItemScan(false)}
        className="absolute z-10 p-2 text-white transition-all rounded-full top-3 left-3 bg-black/80 hover:bg-black/90 backdrop-blur-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Scanner Preview Box */}
      <div id="reader" className="w-full h-full border-2 border-gray-300 rounded-lg"></div>

      {/* Scan Line Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute w-full h-[3px] bg-gradient-to-r from-transparent via-green-400 to-transparent shadow-lg shadow-green-400/30 animate-scan"></div>
      </div>
    </div>

      {/* Scanned Items List */}
     <div className="flex-1 p-2 overflow-y-auto">
  {matchedItems.length === 0 ? (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <BsBasket2 className="mb-2 text-gray-400" size={32} />
      <p className="text-lg text-gray-500">Your cart is empty</p>
      <p className="text-sm text-gray-400">Scan items to add them here</p>
    </div>
  ) : (
    <div className="space-y-2">
      {matchedItems.map((item, index) => {
        const it = allItems.find(i => i._id === item.item);
        if (!it) return null;

        return (
             <div
      key={it._id}
      className="relative p-3 m-2 transition-all duration-300 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md"
    >
      <div className="flex gap-2.5 items-start">
        {/* Item Visual with Gradient */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 text-base font-bold text-white rounded-lg shadow-sm bg-gradient-to-br from-purple-600 to-indigo-600">
            {it.itemName?.charAt(0)?.toUpperCase() || "?"}
          </div>
          {it.currentStock <= 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] px-1 py-0.5 rounded-full font-medium">
              Out
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">{it.itemName}</h3>
            <span className="ml-2 text-sm font-bold text-purple-600 whitespace-nowrap">
              ₹{(it.salesPrice * item.quantity).toFixed(2)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
            {it.description || "No description available"}
          </p>

          {/* Interactive Quantity Controls */}
          <div className="flex items-center justify-between mt-2">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                it.currentStock > 10
                  ? "bg-green-100 text-green-800"
                  : it.currentStock > 0
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {it.currentStock || 0} available
            </span>

            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
              <button type="button"
                onClick={() => handleQuantity(it._id, "minus")}
                className="p-1 text-gray-600 transition-colors duration-200 rounded-full hover:text-purple-600 active:bg-gray-200 disabled:opacity-50"
                disabled={item.quantity <= 0}
              >
                <FaMinus className="w-3 h-3" />
              </button>
              <span className="text-sm font-medium text-gray-800 min-w-[18px] text-center">
                {item.quantity}
              </span>
              <button type="button"
                onClick={() => handleQuantity(it._id, "plus")}
                className="p-1 text-gray-600 transition-colors duration-200 rounded-full hover:text-purple-600 active:bg-gray-200 disabled:opacity-50"
              >
                <FaPlus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Price Breakdown (Subtle) */}
      <div className="flex justify-end pt-1.5 mt-1.5 text-[10px] text-gray-500 border-t border-gray-100">
        <span>₹{it.salesPrice} × {item.quantity}</span>
      </div>
    </div>
        );
      })}
    </div>
  )}
     </div>

     {showMultiSelect && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white w-[90%] max-w-md p-5 rounded-xl shadow-xl">
      
      <h2 className="mb-3 text-lg font-bold">Multiple Matches Found</h2>
      <p className="mb-3 text-sm text-gray-600">
        Select the correct item for barcode:
      </p>

      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {multiMatchItems.map(it => (
          <button
            key={it._id}
            onClick={() => handleMultiSelectItem(it)}
            className="w-full p-3 text-left border rounded-lg hover:bg-gray-100"
          >
            <div className="font-semibold">{it.itemName}</div>
            <div className="text-xs text-gray-500">{it.description}</div>
            <div className="text-xs text-blue-600">
  Barcode: {it.barcodes?.join(", ") || it.barcode || "-"}
</div>
<div className="text-xs text-blue-600">
  Price: {it.salesPrice}
</div>

          </button>
        ))}
      </div>

      <button
        className="w-full py-2 mt-4 text-white bg-red-500 rounded-lg"
        onClick={() => setShowMultiSelect(false)}
      >
        Cancel
      </button>
    </div>
  </div>
)}

      {/* Save Button */}
     <div className="fixed bottom-0 left-0 right-0 p-4 bg-opacity-90">
        <button
          onClick={handleSave}
          disabled={matchedItems.length === 0}
          className={`w-full py-3 rounded-lg font-medium ${
            matchedItems.length === 0
              ? 'bg-gray-300 text-gray-500'
              : 'bg-green-500 text-white hover:bg-green-600'
          }`}
        >
          <FaSave className="inline mr-2" />
          Save {matchedItems.length > 0 ? `(${matchedItems.length} items)` : ''}
        </button>
      </div>
      
    </div>
    
  );
};

export default PurchaseScanner;