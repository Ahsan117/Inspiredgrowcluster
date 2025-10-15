import { useRef, useEffect, useState, useCallback } from 'react';
import { FaPlus, FaMinus, FaEllipsisV, FaSave,FaTrashAlt } from 'react-icons/fa';
import { App } from "@capacitor/app";
import { useNavigate } from 'react-router-dom';
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import { Camera } from '@capacitor/camera';
import { Html5QrcodeSupportedFormats } from 'html5-qrcode';
import playSound from "../../utility/sound"

const Scan = ({allItems,setScan,setSelectedItem}) => {

  const [matchedItems, setMatchedItems] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
   const [offerView, setOfferView] = useState(false);
  const [offerItem, setOfferItem] = useState(null);
  const scannerRef = useRef(null);
  const isScanningRef = useRef(false);
  const navigate = useNavigate();
   const lastScannedRef = useRef({ value: "", timestamp: 0 });
  
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
       setScan(false);
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

   const match = allItems.find(
  (it) =>
    it.barcodes?.includes(decodedText) ||
    it.barcode === decodedText ||
    it.itemCode === decodedText
);
if (match) {
  setMatchedItems(prevItems => {
    const existingIndex = prevItems.findIndex(item => item.item === match._id);

    let updatedItems;

    if (existingIndex !== -1) {
      // item already exists, increase qty
      const currentItem = prevItems[existingIndex];
      const currentQty = currentItem.quantity || 0;
      const updatedItem = {
        ...currentItem,
        quantity: currentQty + 1,
      };

      updatedItems = [...prevItems];
      updatedItems[existingIndex] = updatedItem;

      playSound("/sounds/item-exists.mp3");
    } else {
      // new item
      const newItem = {
        item_id: match._id,
        item: match._id,
        itemName: match.itemName,
        quantity: 1,
      };

      updatedItems = [...prevItems, newItem];
      playSound("/sounds/item-added.mp3");
    }

    return updatedItems; // ✅ only one return
  });
}

    setTimeout(() => {
      isScanningRef.current = false;
    }, 1000);
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


  
  const handleSave = () => {
    if (matchedItems.length === 0) {
      Swal.fire("Error", "At least one item is required", "error");
      return;
    }
    console.log(matchedItems)
     setSelectedItem(prev => {
    const updated = [...prev];

    matchedItems.forEach(matched => {
      const existingIndex = updated.findIndex(it => it.item_id === matched.item_id);
      if (existingIndex !== -1) {
        // same item already exists → merge quantity
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: (updated[existingIndex].quantity || 0) + (matched.quantity || 0),
        };
      } else {
        // new item → push
        updated.push(matched);
      }
    });

    return updated;
  });

//    addItemsInBatch(matchedItems);
     setScan(false);
  };



  return (
  <div className="relative flex flex-col h-screen">
      {/* Scanner View */}
      <div className="relative overflow-hidden h-[35vh] rounded-xl">
      {/* Back Button */}
      <button 
        onClick={() => setScan(false)}
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
      <div className="flex-1 p-4 overflow-y-auto">
        {matchedItems.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Scan items to see them here</p>
          </div>
        ) : (
        matchedItems.map((item, index) => {
  if (!item) return null;

  return (
    <div
      key={item.item_id}
      className="relative p-3 m-2 transition-all duration-300 bg-white border border-gray-100 shadow-sm rounded-xl hover:shadow-md"
    >
      <div className="flex gap-2.5 items-start">
        {/* Item Visual with Gradient */}
        <div className="relative flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 text-base font-bold text-white rounded-lg shadow-sm bg-gradient-to-br from-purple-600 to-indigo-600">
            {item.itemName?.charAt(0)?.toUpperCase() || "?"}
          </div>
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 line-clamp-1">
              {item.itemName}
            </h3>
            <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
              Qty: {item.quantity || 7}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
})
        )}
      </div>

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
  )
};

export default Scan;