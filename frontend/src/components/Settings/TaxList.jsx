
import React, { useState,useEffect } from 'react';
import axios from 'axios';
import { Trash2, Search, Plus } from 'lucide-react';
import { useParams,useNavigate,useSearchParams } from 'react-router-dom';

const InvoiceSystem = () => {
  // --- State Management ---
  const [partyDetails, setPartyDetails] = useState({
    customerName: ''
  });
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Extract 'id' from http://localhost:3000/tax-list?id=69456...
  const id = searchParams.get('id');
  const [editId, setEditId] = useState(null);
  const [items, setItems] = useState([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [customerResults, setCustomerResults] = useState([]);
  const [coinAdjustment, setCoinAdjustment] = useState(0);

  // --- Search Customers ---
  const handleCustomerSearch = async (query) => {
    setPartyDetails(prev => ({ ...prev, customerName: query }));
    if (!query) return setCustomerResults([]);
    try {
      const { data } = await axios.get(`http://localhost:5000/1customer/search?query=${query}`);
      const exactMatch = data.find(c => c.name.toLowerCase() === query.toLowerCase());
      setCustomerResults(!exactMatch ? [...data, { _id: 'new', name: query, isNew: true }] : data);
    } catch (err) { console.error(err); }
  };

  // --- Global Item Search ---
  const handleGlobalItemSearch = async (query) => {
    setGlobalSearch(query);
    if (!query) return setItemResults([]);
    try {
      const { data } = await axios.get(`http://localhost:5000/1items/search?query=${query}`);
      const exactMatch = data.find(i => i.name.toLowerCase() === query.toLowerCase());
      setItemResults(!exactMatch ? [...data, { _id: 'new', name: query, isNew: true }] : data);
    } catch (err) { console.error(err); }
  };

  // --- Add/Update Item Logic ---
  const addOrUpdateItem = (product) => {
    const existingIndex = items.findIndex(item => item.name.toLowerCase() === product.name.toLowerCase());
  
    if (existingIndex > -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex].qty += 1;
      updatedItems[existingIndex].total = updatedItems[existingIndex].qty * updatedItems[existingIndex].rate;
      setItems(updatedItems);
    } else {
      // Initial calculation: rate is mrp minus any default discount if applicable
      const initialMrp = product.mrp || 0;
      const initialDiscount = 0;
      const initialRate = initialMrp - (initialMrp * initialDiscount / 100);
  
      const newItem = {
        id: Date.now(),
        name: product.name,
        qty: 1,
        mrp: initialMrp,
        discount: initialDiscount, // New Field
        rate: product.salesPrice || initialRate,
        total: product.salesPrice || initialRate
      };
      setItems([...items, newItem]);
    }
    setGlobalSearch('');
    setItemResults([]);
  };

  // --- Manual Row Edits ---
  const handleRowChange = (index, field, value) => {
    const updatedItems = [...items];
    const val = field === 'name' ? value : Number(value);
    updatedItems[index][field] = val;
  
    // Logic: If Discount changes, update Rate
    if (field === 'discount') {
      const mrp = updatedItems[index].mrp;
      const disPercent = val;
      updatedItems[index].rate = mrp - (mrp * disPercent / 100);
    }
  
    // Logic: If MRP changes, update Rate based on existing Discount
    if (field === 'mrp') {
      const mrp = val;
      const disPercent = updatedItems[index].discount;
      updatedItems[index].rate = mrp - (mrp * disPercent / 100);
    }
  
    // Recalculate row total
    updatedItems[index].total = updatedItems[index].qty * updatedItems[index].rate;
    setItems(updatedItems);
  };
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // --- Totals ---
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = subtotal ;
  const [billId, setBillId] = useState('');

  // Generate ID on Page Load
 // --- Fetch Sale Data if ID exists in URL ---
 useEffect(() => {
  if (id) {
    const fetchSaleForEdit = async () => {
      try {
        const { data } = await axios.get(`http://localhost:5000/1sale/${id}`);
        if (data.success) {
          const sale = data.data;
          setEditId(sale._id);
          setBillId(sale.billId);
          setPartyDetails({ customerName: sale.customer?.name || '' });
          setCoinAdjustment(sale.coinAdjustment || 0);
          console.log(sale)
          setItems(sale.items.map(item => ({
            id: item.itemId._id,
            name: item.name,
            qty: item.qty,
            rate: item.rate,
            mrp: item.itemId.mrp || 0,
            total: item.total
          })));
        }
      } catch (err) {
        console.error("Error loading sale:", err);
        alert("Could not load sale data");
      }
    };
    fetchSaleForEdit();
  } else {
    // Normal behavior: Generate new ID for fresh invoice
    setBillId(`SA${Date.now().toString().slice(-6)}`);
  }
}, [id]);

const handleSave = async () => {
  try {
    const payload = { 
      billId, 
      partyDetails, 
      billingItems: items, 
      summary: { 
        subtotal: items.reduce((sum, i) => sum + i.total, 0), 
        grandTotal: items.reduce((sum, i) => sum + i.total, 0) + Number(coinAdjustment), 
        coinAdjustment 
      } 
    };

    let response;
    if (editId) {
      response = await axios.put(`http://localhost:5000/1sale/update/${editId}`, payload);
    } else {
      response = await axios.post('http://localhost:5000/1sale/create', payload);
    }

    if (response.data.success) {
      alert(editId ? "Sale Updated!" : "Sale Saved!");
      navigate('/sales'); // Redirect back to list after save
    }
  } catch (err) {
    alert("Error saving sale");
  }
};
  // const handleSave = async () => {
  //   try {
  //     const payload = { billId,partyDetails, billingItems: items, summary: { subtotal, grandTotal, coinAdjustment } };
  //     const { data } = await axios.post('http://localhost:5000/1sale/create', payload);
  //     if (data.success) {
  //       alert("Sale saved successfully!");
        
  //     }
  //   } catch (err) { alert("Error saving sale"); }
  //   finally{
  //     setItems([])
  //     setCoinAdjustment(0)
  //     setGlobalSearch("")
  //     setPartyDetails({
  //        customerName: ''
  //     })
  //     const newId = `SA${Date.now().toString().slice(-6)}`; // Longer for better uniqueness
  //   setBillId(newId);
  //   }
  // };

  return (
    <div className="min-h-screen p-4 font-sans bg-slate-100 md:p-8">
      <div className="max-w-5xl mx-auto overflow-hidden bg-white shadow-lg rounded-xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">S.A. OFFSET</h1>
          <button className="flex items-center gap-2 px-4 py-2 transition rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
              <span>📋</span> Sales List
          </button>
        </div>

        <div className="p-8">
          <h2 className="mb-6 text-xl font-semibold text-slate-700">Invoice</h2>

          {/* Party Details Section */}
          <section className="mb-8">
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-500">Party Details</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  value={partyDetails.customerName}
                  onChange={(e) => handleCustomerSearch(e.target.value)}
                  className="w-full p-3 transition border rounded-md outline-none focus:ring-2 focus:ring-blue-400" 
                />
                {customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                    {customerResults.map(c => (
                      <div key={c._id} onClick={() => { setPartyDetails({...partyDetails, ...c, customerName: c.name}); setCustomerResults([]); }} className="flex justify-between p-2 cursor-pointer hover:bg-slate-100">
                        <span>{c.name}</span>
                        {c.isNew && <span className="text-xs font-bold text-blue-500">(new)</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* New Global Item Search Bar */}
          <section className="mb-8">
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-500">Add Item to Bill</h3>
            <div className="relative">
              <div className="flex items-center p-1 border rounded-md bg-slate-50">
                <Search className="ml-2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search and Select Item to Add..." 
                  className="w-full p-2 bg-transparent outline-none"
                  value={globalSearch}
                  onChange={(e) => handleGlobalItemSearch(e.target.value)}
                />
              </div>
              {itemResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                  {itemResults.map(p => (
                    <div key={p._id} onClick={() => addOrUpdateItem(p)} className="flex justify-between p-2 cursor-pointer hover:bg-slate-100">
                      <span>{p.name}</span>
                      {p.isNew ? <span className="text-xs font-bold text-blue-500">(new)</span> : <span className="text-xs text-slate-400">MRP: ₹{p.mrp}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Billing Table */}
         {/* Billing Table */}
<section className="mb-8">
  <div className="overflow-x-auto border rounded-lg">
    <table className="w-full text-sm text-left border-collapse">
      <thead className="border-b bg-slate-50 text-slate-600">
        <tr>
          <th className="w-12 p-3 border-r">#</th>
          <th className="w-20 p-3 text-center border-r">DISC %</th> {/* New Column */}
          <th className="p-3 border-r">ITEM NAME</th>
          <th className="w-20 p-3 text-center border-r">QTY</th>
          <th className="w-24 p-3 text-center border-r">MRP</th>
          <th className="w-24 p-3 text-center border-r">RATE</th>
          <th className="p-3 text-right w-28">TOTAL</th>
          <th className="w-10 p-3"></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => (
          <tr key={item.id} className="border-b">
            <td className="p-3 text-center border-r">{index + 1}</td>
            <td className="p-3 border-r">
               <input 
                 type="number" 
                 className="w-full font-medium text-center text-red-500 outline-none" 
                 placeholder="0"
                 value={item.discount} 
                 onChange={(e) => handleRowChange(index, 'discount', e.target.value)} 
               />
            </td>
            <td className="p-3 border-r">
              <input type="text" className="w-full bg-transparent outline-none" value={item.name} onChange={(e) => handleRowChange(index, 'name', e.target.value)} />
            </td>
            <td className="p-3 border-r">
              <input type="number" className="w-full text-center outline-none" value={item.qty} onChange={(e) => handleRowChange(index, 'qty', e.target.value)} />
            </td>
            <td className="p-3 border-r">
               <input type="number" className="w-full text-center outline-none" value={item.mrp} onChange={(e) => handleRowChange(index, 'mrp', e.target.value)} />
            </td>
            {/* Discount Input */}
           
            <td className="p-3 border-r">
               <input type="number" className="w-full font-bold text-center text-blue-600 outline-none" value={item.rate} onChange={(e) => handleRowChange(index, 'rate', e.target.value)} />
            </td>
            <td className="p-3 font-medium text-right text-slate-700">₹{item.total.toFixed(2)}</td>
            <td className="p-3 text-center">
              <button onClick={() => removeItem(index)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</section>

          {/* Invoice Summary Card */}
          <section className="p-6 border bg-slate-50/50 rounded-xl border-slate-100">
            <h3 className="mb-4 text-sm font-bold tracking-wider uppercase text-slate-500">Invoice Summary</h3>
            <div className="pb-4 space-y-3 text-sm border-b text-slate-600">
              <div className="flex justify-between"><span>Total Items:</span><span>{items.length}</span></div>
              <div className="flex justify-between"><span>Total Quantity:</span><span>{items.reduce((s, i) => s + i.qty, 0)}</span></div>
            </div>
            <div className="py-4 space-y-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold">Coin Adjustment:</span>
                <input 
                  type="number" 
                  value={coinAdjustment} 
                  onChange={(e) => setCoinAdjustment(e.target.value)}
                  className="w-24 p-2 text-right border rounded" 
                />
              </div>
              <div className="flex justify-between pt-4 text-xl font-extrabold text-blue-700 border-t">
                <span>Grand Total:</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </section>

          <div className="flex justify-center mt-8">
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-10 py-3 font-bold text-white transition rounded-lg shadow-lg bg-slate-700 hover:bg-slate-800"
            >
              <span>💾</span> Save & Print
            </button>
          </div>
        </div>

        <div className="py-4 text-sm text-center bg-slate-800 text-slate-300">
          © 2025 S.A. OFFSET. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default InvoiceSystem;






// import React, { useState, useEffect,useRef } from 'react';
// import axios from 'axios';
// import { Search, Filter, Eye, FilePlus,Edit2 } from 'lucide-react';
// import { useReactToPrint } from 'react-to-print';
// import PrintableInvoice from './PrintableInvoice'; // The component above

// const SalesList = () => {
//   const [salesData, setSalesData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedSale, setSelectedSale] = useState(null);
//   const invoiceRef = useRef();

//   // Handle Print Action
//   const handlePrint = useReactToPrint({
//     content: () => invoiceRef.current,
//   });

//   const handleView = (sale) => {
//     // Option 1: Set selected sale and show the PrintableInvoice component
//     setSelectedSale(sale);
//   };
//   // 1. Fetch Sales from API
//   useEffect(() => {
//     const fetchSales = async () => {
//       try {
//         setLoading(true);
//         // Using your specified port and endpoint
//         const response = await axios.get('http://localhost:5000/1sale/all');
//         console.log(response)
//         setSalesData(response.data);
//       } catch (err) {
//         console.error("Error fetching sales history:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchSales();
//   }, []);

//   // 2. Filter Logic for Search Bar
//   const filteredSales = salesData.filter(sale =>
//      sale.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
//       <div className="max-w-6xl mx-auto overflow-hidden bg-white border border-gray-100 shadow-sm rounded-3xl">
        
//         {/* Top Header */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-50">
//           <h1 className="text-3xl font-bold text-[#334155] tracking-tight">S.A. OFFSET</h1>
//           <button 
//             onClick={() => window.location.href = '/'} // Navigate to Invoice Page
//             className="flex items-center gap-2 font-medium transition text-slate-500 hover:text-slate-800"
//           >
//             <FilePlus size={18} />
//             Create Invoice
//           </button>
//         </div>
    
// {selectedSale && (
//   <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/50">
//     <div className="relative w-full max-w-4xl bg-white rounded-lg shadow-2xl">
//       <button 
//         onClick={() => setSelectedSale(null)} 
//         className="absolute font-bold text-red-500 top-2 right-2 no-print"
//       >
//         Close [X]
//       </button>
//       <PrintableInvoice data={selectedSale}  onClose={() => setSelectedSale(null)} />
//     </div>
//   </div>
// )}
//         {/* Sales List Sub-Header */}
//         <div className="flex items-center justify-between px-8 py-6">
//           <h2 className="text-xl font-bold text-slate-700">Sales List</h2>
         
//         </div>

//         <div className="px-8 pb-12">
//           {/* Search Box */}
//           <div className="mb-6">
//             <h3 className="mb-2 text-sm font-bold text-slate-700">Sales History</h3>
//             <p className="mb-2 text-xs text-slate-400">Search Sales</p>
//             <div className="relative">
//               <input 
//                 type="text" 
//                 placeholder="Search by Customer Name" 
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full p-3 transition border rounded-lg outline-none border-slate-300 focus:ring-2 focus:ring-slate-200 text-slate-600 placeholder:text-slate-300"
//               />
//             </div>
//           </div>

//           {/* Data Table */}
//           <div className="overflow-hidden border border-slate-100 rounded-xl">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-[#f1f5f9] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
//                   <th className="px-4 py-3 border-b border-slate-200">#</th>
//                   <th className="px-4 py-3 border-b border-slate-200">Bill Id</th>
//                   <th className="px-4 py-3 border-b border-slate-200">Date</th>
//                   <th className="px-4 py-3 border-b border-slate-200">Customer Name</th>
//                   <th className="px-4 py-3 border-b border-slate-200">Grand Total (₹)</th>
//                   <th className="px-4 py-3 text-center border-b border-slate-200">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="text-sm text-slate-600">
//                 {loading ? (
//                   <tr>
//                     <td colSpan="6" className="py-10 italic text-center text-slate-400">Loading sales history...</td>
//                   </tr>
//                 ) : filteredSales.length > 0 ? (
//                   filteredSales.map((sale, index) => (
//                     <tr key={index} className="transition-colors border-b hover:bg-slate-50 border-slate-100 last:border-0">
//                       <td className="px-4 py-4 font-medium">{index+1}</td>
//                       <td className="px-4 py-4 font-medium">{sale.billId}</td>
//                       <td className="px-4 py-4">{new Date(sale.date).toLocaleString()}</td>
//                       <td className="px-4 py-4">{sale.customer?.name || "N/A"}</td>
//                       <td className="px-4 py-4 font-bold text-slate-700">₹{sale.grandTotal?.toFixed(2)}</td>
//                       <td className="px-4 py-4 text-center">
//   <div className="flex justify-center gap-2">
//     <button 
//       onClick={() => handleView(sale)} 
//       className="bg-[#334155] text-white px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-slate-800 transition text-xs font-bold"
//     >
//       <Eye size={14} /> View
//     </button>
    
//     <button 
//       onClick={() => {
//         // Option: Store sale in localStorage and redirect to Invoice page
//         localStorage.setItem('editSale', JSON.stringify(sale));
//         window.location.href = '/'; 
//       }} 
//       className="bg-blue-600 text-white px-3 py-1.5 rounded-md flex items-center gap-1 hover:bg-blue-700 transition text-xs font-bold"
//     >
//       <Edit2 size={14} /> Edit
//     </button>
//   </div>
// </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="6" className="py-10 italic text-center text-slate-400">No sales found.</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//         {/* Hidden container for printing */}
//       <div style={{ display: 'none' }}>
//         <PrintableInvoice ref={invoiceRef} data={selectedSale} />
//       </div>

//         {/* Footer */}
//         <div className="bg-[#334155] py-4 text-center mt-auto">
//           <p className="text-xs text-white opacity-90">
//             © 2025 S.A. OFFSET. All rights reserved.
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default SalesList;







// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import { Search, Package, Trash2, CheckSquare, Square , Plus, X } from 'lucide-react';

// const ItemList = () => {
//   const [items, setItems] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [searchTerm, setSearchTerm] = useState('');
//   const [selectedItems, setSelectedItems] = useState([]); // Track selected IDs
//   const [showModal, setShowModal] = useState(false);
//   const [newItems, setNewItems] = useState([{ name: '', salesPrice: '', mrp: '' }]);
  
//   useEffect(() => {
//     fetchItems();
//   }, []);


//   const addModalRow = () => {
//     setNewItems([...newItems, { name: '', salesPrice: '', mrp: '' }]);
//   };

//   // Remove a row in the modal
//   const removeModalRow = (index) => {
//     setNewItems(newItems.filter((_, i) => i !== index));
//   };

//   // Handle input changes in modal
//   const handleModalChange = (index, field, value) => {
//     const updated = [...newItems];
//     updated[index][field] = value;
//     setNewItems(updated);
//   };

//   // Submit multiple items
//   const handleBulkCreate = async () => {
//     try {
//       // Filter out empty rows
//       const itemsToSave = newItems.filter(item => item.name.trim() !== '');
//       if (itemsToSave.length === 0) return alert("Please add at least one item name.");

//       await axios.post('http://localhost:5000/1items/bulk-create', { items: itemsToSave });
      
//       setShowModal(false);
//       setNewItems([{ name: '', salesPrice: '', mrp: '' }]);
//       fetchItems(); // Refresh main list
//     } catch (err) {
//       console.error("Bulk create failed", err);
//     }
//   };

//   const fetchItems = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get('http://localhost:5000/1items');
//       setItems(response.data);
//     } catch (err) {
//       console.error("Error fetching inventory items:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Toggle individual selection
//   const toggleSelectItem = (id) => {
//     setSelectedItems(prev => 
//       prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
//     );
//   };

//   // Toggle Select All
//   const toggleSelectAll = () => {
//     if (selectedItems.length === filteredItems.length) {
//       setSelectedItems([]);
//     } else {
//       setSelectedItems(filteredItems.map(item => item._id));
//     }
//   };

//   // Bulk Delete Function
//   const handleBulkDelete = async () => {
//     if (window.confirm(`Are you sure you want to delete ${selectedItems.length} items?`)) {
//       try {
//         await axios.post('http://localhost:5000/1items/bulk-delete', { ids: selectedItems });
//         setSelectedItems([]); // Clear selection
//         fetchItems(); // Refresh list
//       } catch (err) {
//         console.error("Bulk delete failed:", err);
//         alert("Failed to delete selected items");
//       }
//     }
//   };


  
// //   // 3. Delete Item Logic
//   const handleDelete = async (id) => {
//     if (window.confirm("Are you sure you want to delete this item?")) {
//       try {
//         // Assuming a delete endpoint exists at your base items route
//         await axios.delete(`http://localhost:5000/1items/${id}`);
//         fetchItems(); // Refresh the list
//       } catch (err) {
//         console.error("Error deleting item:", err);
//       }
//     }
//   };

//   const filteredItems = items.filter(item => 
//     item.name?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
//       <div className="max-w-6xl mx-auto overflow-hidden bg-white border border-gray-100 shadow-sm rounded-3xl">
        
//         {/* Header Section */}
//         <div className="flex items-center justify-between p-6 border-b border-gray-50">
//           <h1 className="text-3xl font-bold text-[#334155] tracking-tight">S.A. OFFSET</h1>
          
//           {selectedItems.length > 0 && (
//             <button 
//               onClick={handleBulkDelete}
//               className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white transition duration-200 bg-red-500 rounded-lg shadow-md hover:bg-red-600 animate-in fade-in zoom-in"
//             >
//               <Trash2 size={18} />
//               Delete Selected ({selectedItems.length})
//             </button>
//           )}
//           <button 
//               onClick={() => setShowModal(true)}
//               className="bg-[#334155] text-white px-5 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition text-sm font-bold shadow-md"
//             >
//               <Plus size={18} /> Add Multiple Items
//             </button>
//         </div>

//         <div className="px-8 py-6">
//           <div className="flex flex-col justify-between gap-4 mb-6 md:flex-row md:items-center">
//             <div>
//               <h2 className="text-xl font-bold text-slate-700">Inventory Items</h2>
//               <p className="mt-1 text-xs text-slate-400">Manage your product list and pricing</p>
//             </div>
//             <div className="relative w-full md:w-80">
//               <Search className="absolute -translate-y-1/2 left-3 top-1/2 text-slate-400" size={18} />
//               <input 
//                 type="text" 
//                 placeholder="Search Item Name" 
//                 value={searchTerm}
//                 onChange={(e) => setSearchTerm(e.target.value)}
//                 className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-100 transition text-sm text-slate-600"
//               />
//             </div>
//           </div>

//           <div className="overflow-hidden border shadow-sm border-slate-100 rounded-2xl">
//             <table className="w-full text-left border-collapse">
//               <thead>
//                 <tr className="bg-[#f1f5f9] text-[11px] font-bold text-slate-500 uppercase tracking-wider">
//                   <th className="w-10 px-6 py-4 border-b border-slate-200">
//                     <button onClick={toggleSelectAll} className="text-slate-400 hover:text-slate-600">
//                       {selectedItems.length === filteredItems.length && filteredItems.length > 0 
//                         ? <CheckSquare size={18} className="text-blue-600" /> 
//                         : <Square size={18} />
//                       }
//                     </button>
//                   </th>
//                   <th className="px-4 py-4 border-b border-slate-200">#</th>
//                   <th className="px-6 py-4 border-b border-slate-200">Item Name</th>
//                   <th className="px-6 py-4 border-b border-slate-200">Sales Rate</th>
//                   <th className="px-6 py-4 text-blue-700 border-b border-slate-200">MRP (₹)</th>
//                   <th className="px-6 py-4 text-blue-700 border-b border-slate-200">Action</th>
//                 </tr>
//               </thead>
//               <tbody className="text-sm text-slate-600">
//                 {loading ? (
//                   <tr>
//                     <td colSpan="5" className="py-10 italic text-center text-slate-400">Loading inventory...</td>
//                   </tr>
//                 ) : filteredItems.length > 0 ? (
//                   filteredItems.map((item, index) => (
//                     <tr 
//                       key={item._id} 
//                       className={`transition-colors border-b border-slate-50 last:border-0 ${selectedItems.includes(item._id) ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'}`}
//                     >
//                       <td className="px-6 py-4">
//                         <button onClick={() => toggleSelectItem(item._id)} className="text-slate-400">
//                           {selectedItems.includes(item._id) 
//                             ? <CheckSquare size={18} className="text-blue-600" /> 
//                             : <Square size={18} />
//                           }
//                         </button>
//                       </td>
//                       <td className="px-4 py-4 font-medium text-slate-400">{index + 1}</td>
//                       <td className="px-6 py-4 font-semibold text-slate-700">{item.name}</td>
//                       <td className="px-6 py-4">₹{item.salesPrice || 0}</td>
//                       <td className="px-6 py-4 font-bold text-slate-900">₹{item.mrp?.toFixed(2)}</td>
//                       <td className="px-6 py-4">
//                          <div className="flex justify-center gap-3 text-slate-400">
//                            {/* <button className="transition hover:text-blue-600"><Edit2 size={16} /></button> */}
//                            <button 
//                             onClick={() => handleDelete(item._id)}
//                             className="transition hover:text-red-500"
//                           >
//                             <Trash2 size={16} />
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr>
//                     <td colSpan="5" className="py-10 italic text-center text-slate-400">No items found.</td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>

//          {/* --- BULK CREATE MODAL --- */}
//         {showModal && (
//           <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
//             <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
//               <div className="flex items-center justify-between p-6 border-b">
//                 <h2 className="text-xl font-bold text-slate-700">Create Multiple Items</h2>
//                 <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
//                   <X size={24} />
//                 </button>
//               </div>

//               <div className="flex-1 p-6 overflow-y-auto">
//                 <table className="w-full text-left">
//                   <thead>
//                     <tr className="text-xs font-bold uppercase text-slate-400">
//                       <th className="pb-4 pr-4">Item Name</th>
//                       <th className="w-32 pb-4 pr-4">Sales Rate</th>
//                       <th className="w-32 pb-4 pr-4">MRP</th>
//                       <th className="w-10 pb-4"></th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {newItems.map((item, index) => (
//                       <tr key={index}>
//                         <td className="py-2 pr-4">
//                           <input 
//                             className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-100"
//                             placeholder="e.g. Glossy Paper"
//                             value={item.name}
//                             onChange={(e) => handleModalChange(index, 'name', e.target.value)}
//                           />
//                         </td>
//                         <td className="py-2 pr-4">
//                           <input 
//                             type="number"
//                             className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-100"
//                             placeholder="0.00"
//                             value={item.salesPrice}
//                             onChange={(e) => handleModalChange(index, 'salesPrice', e.target.value)}
//                           />
//                         </td>
//                         <td className="py-2 pr-4">
//                           <input 
//                             type="number"
//                             className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-100"
//                             placeholder="0.00"
//                             value={item.mrp}
//                             onChange={(e) => handleModalChange(index, 'mrp', e.target.value)}
//                           />
//                         </td>
//                         <td className="py-2 text-center">
//                           {newItems.length > 1 && (
//                             <button onClick={() => removeModalRow(index)} className="text-red-400 hover:text-red-600">
//                               <Trash2 size={18} />
//                             </button>
//                           )}
//                         </td>
//                       </tr>
//                     ))}
//                   </tbody>
//                 </table>
//                 <button 
//                   onClick={addModalRow}
//                   className="flex items-center gap-2 mt-4 text-sm font-bold text-blue-600 hover:text-blue-800"
//                 >
//                   <Plus size={16} /> Add Another Row
//                 </button>
//               </div>

//               <div className="flex justify-end gap-3 p-6 border-t bg-slate-50 rounded-b-3xl">
//                 <button onClick={() => setShowModal(false)} className="px-6 py-2 font-bold text-slate-500 hover:text-slate-700">Cancel</button>
//                 <button 
//                   onClick={handleBulkCreate}
//                   className="bg-[#334155] text-white px-8 py-2 rounded-xl font-bold hover:bg-slate-800 shadow-lg"
//                 >
//                   Save All Items
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//         <div className="bg-[#334155] py-4 text-center">
//           <p className="text-xs text-white opacity-90">© 2025 S.A. OFFSET. All rights reserved.</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ItemList;