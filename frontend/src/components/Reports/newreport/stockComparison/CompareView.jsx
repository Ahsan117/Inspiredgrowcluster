import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';
import axios from 'axios';
const CompareView = ({ item,setView,warehouses ,warehouse1,warehouse2}) => {
    const [w1, set1] = React.useState(0);
    const [w2, set2] = React.useState(0);
    // Render nothing if the modal isn't open
    

  const auth = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  const link="https://pos.inspiredgrow.in/vps"
   
  
  
   const fetchItems=async(warehouseId)=>{
    try {
      
      const response = await axios.get(`${link}/api/items`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        params: {
            search: item.itemCode ,
          warehouse:warehouseId,
          inStock: true, // Fetch only items that are in stock
        }
      });
      console.log("Items fetched for warehouse:", warehouseId, response.data.data);
      
         return  response.data.data;
  //  setAllItems((prev)=>([...response.data.data,...prev]))
    } catch (err) {
      console.log(err.message);
    } 
   }
   useEffect(() => {
  const loadStocks = async () => {
    try {
      const items1 = await fetchItems(warehouse1);
      const items2 = await fetchItems(warehouse2);

      // pick first item's stock or 0
      set1(items1?.[0]?.currentStock || 0);
      set2(items2?.[0]?.currentStock || 0);
    } catch (err) {
      console.error(err);
    }
  };

  if (warehouse1 && warehouse2) {
    loadStocks();
  }
}, [warehouse1, warehouse2]);

    return (
        // Overlay
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-opacity-60 backdrop-blur-sm">
            
            {/* Modal Content */}
            <div className="relative w-full max-w-sm p-8 bg-white shadow-xl rounded-2xl">
                
                {/* Close Button */}
                <button 
                    onClick={() => setView(false)} 
                    className="absolute p-2 text-gray-400 rounded-full top-3 right-3 hover:bg-gray-100"
                    aria-label="Close"
                >
                    <FaTimes size={20} />
                </button>

                {/* Simplified Content */}
                <div className="text-center">
                   
                    <h2 className="mb-6 text-xl font-bold text-gray-800">{item.itemName}</h2>
                      {item.barcodes?.length > 0 && (
        <div className="mb-6">
            <p className="text-sm text-gray-500">Barcodes:</p>
            <div className="flex flex-wrap justify-center gap-2 mt-1">
                {item.barcodes.map((code, idx) => (
                    <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-gray-100 border rounded-md"
                    >
                        {code}
                    </span>
                ))}
            </div>
        </div>
    )}
                    <div className="flex justify-around">
                        {/* Required Quantity */}
                        <div>
                            <p className="text-sm text-gray-600">Warehouse1</p>
                            <p className="text-4xl font-bold">{w1}</p>
                        </div>
                        {/* Free Quantity */}
                        <div>
                            <p className="text-sm text-gray-600">Warehouse2</p>
                            <p className="text-4xl font-bold ">{w2}</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CompareView;