import { useState,useEffect} from "react";
import { X } from "lucide-react";
import axios from "axios";
import { set } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import autoTable from "jspdf-autotable";
export default function CreatePurchaseModal({ 
  isOpen, 
  onClose, 
  warehouseName, 
  items, 
  onSave 
}) {

const [allItems, setAllItems] = useState({});
const [noOfDays, setNoOfDays] = useState(1);
 const [finalMap,setFinalMap]=useState({});
const[loading,setLoading]=useState(false);


useEffect(()=>{
    const fetchAllItems = async () => {
  const token = localStorage.getItem("token");

  // build params dynamically
  const params = { inStock: true };

    params.warehouse = warehouseName?.value;
         
  const { data } = await axios.get("https://pos.inspiredgrow.in/vps/api/items/stock", {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
    console.log(data);
  const map = {};
  // console.log(data.data.find(i=>i._id==="689c5c684ebe358eb2"))
  
  data.data.forEach(element => {
    map[element._id] = {
      currentQuantity: element.currentStock || 0,
      mrp: element.mrp,
    };
  });

  // setAllItems(map); // update state
  return map;       // also return for immediate use
};

const run=async()=>{
  setLoading(true);
      const allItems=await fetchAllItems();
     const map={
     } 
     items.forEach(item =>{
        if(!map[item.party]){
          map[item.party]=[];
        }
        map[item.party].push({...item,...allItems[item.itemId] });
     })
     console.log(map);
      setFinalMap(map);
      setLoading(false);
}
    run();
},[])


    
  const [selectedItems, setSelectedItems] = useState(
    items.map((it) => ({ ...it, quantity: 0, price: it.price || 0 }))
  );


  const handleSave = () => {
    onSave({ warehouse: warehouseName, items: selectedItems });
    onClose();
  };


  // 📌 Export one supplier to Excel
const exportSupplierToExcel = (supplierName, items) => {
  const wb = XLSX.utils.book_new();

  const rows = items
    .filter((item) => item.avgPerDay * noOfDays - item.currentQuantity > 0)
    .map((item) => ({
      Item: item.itemName,
      "Purchasing Quantity": item.avgPerDay * noOfDays - item.currentQuantity,
      "Purchase Price": item.mrp,
    }));

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, supplierName);

  XLSX.writeFile(wb, `${supplierName}_purchase_plan.xlsx`);
};

// 📌 Export one supplier to PDF
const exportSupplierToPDF = (supplierName, items) => {
  const doc = new jsPDF();
  doc.text(`Supplier: ${supplierName}`, 14, 16);

  const rows = items
    .filter((item) => item.avgPerDay * noOfDays - item.currentQuantity > 0)
    .map((item) => [
      item.itemName,
      item.avgPerDay * noOfDays - item.currentQuantity,
      item.mrp,
    ]);

  autoTable(doc,{
    head: [["Item", "Purchasing Quantity", "Purchase Price"]],
    body: rows,
    startY: 20,
  });

  doc.save(`${supplierName}_purchase_plan.pdf`);
};

// 📌 Copy one supplier as text
const copySupplierAsText = (supplierName, items) => {
  let text = `📝 *Supplier:* ${supplierName}\n\n`;
  text += `📦 *Items to Order:*\n`;

  items
    .filter((item) => item.avgPerDay * noOfDays - item.currentQuantity > 0)
    .forEach((item) => {
      const neededQty = item.avgPerDay * noOfDays - item.currentQuantity;

      text += `\n🔹 *${item.itemName}*  
   ➤ Qty Needed: ${neededQty.toFixed(2)}  
   ➤ Price: ₹${item.mrp}`;
    });

  navigator.clipboard.writeText(text);
  alert(`Copied ${supplierName} items to clipboard!`);
};



  if (!isOpen) return null;

  return (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
  <div className="bg-white rounded-2xl shadow-xl w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
     {loading && (
        <div className="flex flex-col items-center justify-center p-4 bg-white bg-opacity-80">
          {/* Spinner */}
          <div className="w-12 h-12 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          <p className="mt-4 font-semibold text-gray-700">Creating Purchase…</p>
        </div>
      )}
    {/* Header */}
    {
       !loading && (
        <>
        <div className="flex items-center justify-between p-4 border-b ">
      <h2 className="text-xl font-semibold text-gray-800">
        Create Purchase – {warehouseName?.label || "NA"}
      </h2>
      <button onClick={onClose}>
        <X className="w-6 h-6 text-gray-500 hover:text-gray-700" />
      </button>
    </div>

    {/* Body */}
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Number of Days Input */}
      <div className="flex items-center gap-3">
        <label className="font-medium text-gray-700">No. of Days for Purchase:</label>
        <input
          type="number"
          min="1"
          className="px-2 py-1 border rounded w-28"
          value={noOfDays}
          onChange={(e) => setNoOfDays(Number(e.target.value))}
        />
      </div>

      {/* Items Table */}
      {Object.entries(finalMap).map(([supplierName, items]) => (
  <div className="mb-6">
    <h2 className="mb-2 text-lg font-semibold text-gray-800">
      Supplier: {supplierName}
    </h2>

    {/* Buttons per supplier */}
    <div className="flex gap-3 mb-3">
      <button
        onClick={() => exportSupplierToExcel(supplierName, items)}
        className="px-3 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700"
      >
        Export Excel
      </button>
      <button
        onClick={() => exportSupplierToPDF(supplierName, items)}
        className="px-3 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700"
      >
        Export PDF
      </button>
      <button
        onClick={() => copySupplierAsText(supplierName, items)}
        className="px-3 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
      >
        Copy Text
      </button>
    </div>

    <table className="w-full border-collapse">
      <thead>
        <tr className="text-sm text-gray-700 bg-gray-100">
          <th className="p-2 text-left">#</th>
          <th className="p-2 text-left">Item</th>
          <th className="p-2 text-left">CurrentStock</th>
          <th className="p-2 text-left">Purchasing Quantity</th>
          <th className="p-2 text-left">Purchase Price</th>
        </tr>
      </thead>
      <tbody>
        {items
          .filter((item) => item.avgPerDay * noOfDays - item.currentQuantity > 0)
          .map((item, index) => (
            <tr  className="border-b">
              <td className="p-2">{index+1}</td>
              <td className="p-2">{item.itemName}</td>
              <td className="p-2">
                {item.currentQuantity || 0}
              </td>
              <td className="p-2">
                {(item.avgPerDay * noOfDays - item.currentQuantity).toFixed(2)}
              </td>
              <td className="p-2">{item.mrp}</td>
            </tr>
          ))}
      </tbody>
    </table>
  </div>
))}

    </div>

    {/* Footer */}
    <div className="flex justify-end gap-3 p-4 border-t">
      <button
        onClick={onClose}
        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        className="px-4 py-2 text-white bg-purple-600 rounded-lg hover:bg-purple-700"
      >
        Save Purchase
      </button>
    </div>
        </>
       )
    }
    


    
  </div>
</div>

  );
}  