// import React, { useEffect, useState,useRef } from 'react';
// import {  useNavigate, NavLink } from 'react-router-dom';
// import Navbar from '../../Navbar';
// import Sidebar from '../../Sidebar';
// import { FaTachometerAlt} from 'react-icons/fa';


// import axios from "axios";
// import CustomerProfile from './CustomerView';
// import PriceBreakdownPage from './PriceView';
// import AssignRider from './AssignRider';
// import AssignVan from './AssignVan';
// import ItemListPage from './ItemListPage';
//  import { utils as XLSXUtils, writeFile as writeXLSXFile } from 'xlsx';
// import { jsPDF } from 'jspdf';
// import  {autoTable} from 'jspdf-autotable';
// import Select from "react-select"
// import ChangeStatusModal from './ChangeStatusModal';
// const OrderList = () => {
//   const[users,setUsers]=useState([]);
//   const [loading, setLoading] = useState(false);
//   const [actionMenu, setActionMenu] = useState(null);
//   const [isSidebarOpen, setSidebarOpen] = useState(true)                     
//   const [currentPage, setCurrentPage] = useState(1);
//   const [itemsPerPage, setItemsPerPage] = useState(10);
//   const [permissions, setPermissions] = useState([]);
//   const navigate = useNavigate();
//   const [searchTerm, setSearchTerm] = useState('');
//   const[data,setData]=useState([])
//   const[pricedata,setPriceData]=useState([])
//   const[view,setView]=useState(false)
//   const[warehouses,setWarehouses]=useState([])
//   const[stores,setStores]=useState([])
//   const[viewPrice,setViewPrice]=useState(false)
//   const[assignRiderView,setAssignRiderView]=useState(false)
//   const[assignVanView,setAssignVanView]=useState(false)
//   const[ItemListView,setItemListView]=useState(false)
//   const[items,setItems]=useState([])
//   const[heading,setHeading]=useState("")
//   const[orderId,setOrderId]=useState(null)
//   const[orderStatus,setOrderStatus]=useState("all")
//   const [changeStatus,setChangeStatus]=useState(false)
//   const [nowStatus,setNowStatus]=useState("")
//   const statusOptions = [
//   { value: "all", label: "All", icon: "⏳", color: "orange" },
//   { value: "Pending", label: "Pending", icon: "⚙️", color: "orange" },
//   { value: "Processing", label: "Processing", icon: "⚙️", color: "purple" },
//     { value: "Shipped", label: "Shipped", icon: "🚚", color: "indigo" },
//     { value: "Rider Assigned", label: "Rider Assigned", icon: "🛵", color: "yellow" },
//     { value: "Van Assigned", label: "Van Assigned", icon: "🛵", color: "blue" },
//     { value: "Out for Delivery", label: "Out for Delivery", icon: "🛵", color: "teal" },
//     { value: "Delivered", label: "Delivered", icon: "✅", color: "green" },
//     { value: "Cancelled", label: "Cancelled", icon: "❌", color: "red" },
//     { value: "Returned", label: "Returned", icon: "🔄", color: "gray" },
//     { value: "Order Placed", label: "Order Placed", icon: "✅", color: "green" },
//     { value: "Arrived at Location", label: "Arrived at Location", icon: "✅", color: "purple" },
// ];

//   // load sidebar open/closed
//   useEffect(() => {
//     if (window.innerWidth < 768) setSidebarOpen(false);
//   }, []);

//   // load permissions
//   useEffect(() => {
//     const stored = localStorage.getItem("permissions");
//     setPermissions(stored ? JSON.parse(stored) : []);
//   }, []);

//   const fetchWarehouse=async ()=>{
//      setLoading(true)
//   const token=localStorage.getItem("token")
//   if(!token){
//     console.log ("No token found redirecting...")
//     navigate("/")
//     return ;
//   }
//   try {
//     const response = await axios.get("https://pos.inspiredgrow.in/vps/api/warehouses?scope=mine", {
//       headers: {
//         Authorization: `Bearer ${token}`,
//       },
//     });

//  setWarehouses(response.data.data)
//   } catch (error) {
//     alert(error.message)
//   }
// finally{
//   setLoading(false)
// }
//   }

//    useEffect(() => {
//       const fetchStores = async () => {
//         const token = localStorage.getItem("token");
//         try {
//           // Adjust this endpoint if needed – using your provided URL.
//           const response = await fetch("https://pos.inspiredgrow.in/vps/admin/store/add/store", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//           if (!response.ok) {
//             throw new Error("Failed to fetch stores");
//           }
//           const data = await response.json();
//           // Assuming API returns an object with property "result" that is an array of store objects.
//           setStores(data.result || []);
//           console.log(data.result)
//         } catch (error) {
//           console.error("Error fetching stores:", error);
//         }
//       };
//       fetchStores();
//       fetchWarehouse();
//     }, []);

//   const fetchusers = async () => {
//     setLoading(true);
//     const token = localStorage.getItem("token");
//     if (!token) {
//       navigate("/");
//       return;
//     }

//     try {
//       const response = await fetch("https://pos.inspiredgrow.in/vps/api/orders/admin", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const payload = await response.json();
//          console.log("payload")
//          console.log(payload)
//       // unwrap into a flat array
//       const all = Array.isArray(payload)
//         ? payload
//         : Array.isArray(payload.data)
//           ? payload.data
//           : [];
//          console.log(all)
//       // **now just use what the backend sent you**
//       setUsers(all);
//     } catch (err) {
//       console.error("Error fetching users:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // delete
//   const deleteUser = async (id) => {
//     if (!window.confirm("Delete this order?")) return;
//     setLoading(true);
//     try {
//       await axios.delete(`https://pos.inspiredgrow.in/vps/api/orders/${id}`, {
//         headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
//       });
//       fetchusers();
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchusers();
//   }, []);



  
//   // filtering & paging
//   const filtered = users.filter(u => {
//   const t = searchTerm.toLowerCase().trim();
//   const matchesSearch = !t 
//     || u.userName?.toLowerCase().includes(t) 
//     || u.Email?.toLowerCase().includes(t);

//   const matchesStatus = orderStatus === "all" || u.status === orderStatus;

//   return matchesSearch && matchesStatus;
// });

//   useEffect(()=>{
//     const filtered = users.filter(u => {
//   const t = searchTerm.toLowerCase().trim();
//   const matchesSearch = !t 
//     || u.userName?.toLowerCase().includes(t) 
//     || u.Email?.toLowerCase().includes(t);

//   const matchesStatus = orderStatus === "all" || u.status === orderStatus;

//   return matchesSearch && matchesStatus;
// });
//   },[orderStatus])
//   const totalPages = Math.ceil(filtered.length / itemsPerPage);
//   const start = (currentPage - 1) * itemsPerPage;
//   const current = filtered.slice(start, start + itemsPerPage);

 


//   const exportToExcel = () => {
//     // Prepare data for Excel
//     const excelData = current.map((u, i) => ({
//       '#': start + i + 1,
//       'Order ID': u.orderId,
//       'Customer Name': u.customer?.customerName || 'N/A',
//       'Items Count': u.items.length,
//       'Unavailable Items Count': u.unAvailableItems.length,
//       'Total Amount': u.items.length === 0 ? 0 : u.finalAmount,
//       'Status': u.status,
//       'Delivery Agent': u.deliveryAgent?.username || u.deliveryAgent?.warehouseName || 'Not Assigned',
//       'Delivery Time':u.deliveryTime,
//       'Agent Type': u.deliveryAgentModel || 'N/A'
//     }));

//     const worksheet = XLSXUtils.json_to_sheet(excelData);
//     const workbook = XLSXUtils.book_new();
//     XLSXUtils.book_append_sheet(workbook, worksheet, "Orders");
//     writeXLSXFile(workbook, "orders.xlsx");
//   };

//   const exportToPDF = () => {
//     const doc = new jsPDF();
    
//     // Add title
//     doc.text("Orders Report", 14, 15);
    
//     // Prepare data for PDF
//     const pdfData = current.map((u, i) => [
//       start + i + 1,
//       u.orderId,
//       u.customer?.customerName || 'N/A',
//       u.items.length,
//       u.unAvailableItems.length,
//       u.items.length === 0 ? 0 : u.finalAmount,
//       u.status,
//       u.deliveryAgent?.username || u.deliveryAgent?.warehouseName || 'Not Assigned',
//       u.deliveryTime,
//       u.deliveryAgentModel || 'N/A'
//     ]);

//     autoTable(doc,{
//       head: [
//         ['#', 'Order ID', 'Customer Name', 'Items', 'Unavailable Items', 'Total', 'Status', 'Delivery Agent','Delivery Time', 'Agent Type']
//       ],
//       body: pdfData,
//       startY: 20,
//       styles: {
//         fontSize: 8,
//         cellPadding: 2,
//         overflow: 'linebreak'
//       },
//       headStyles: {
//         fillColor: [229, 231, 235],
//         textColor: [0, 0, 0],
//         fontStyle: 'bold'
//       }
//     });

//     doc.save("orders.pdf");
//   };

    
// const handlePrint = () => {
//         window.print();
//     };


//     const exportToCSV = () => {
//   // Prepare headers
//   const headers = ["#", "Order ID", "Customer Name", "Items", "UnAvailable Items", "Total", "Status", "Delivery Agent","Delivery Time"];
  
//   // Prepare data rows
//   const rows = current.map((u, i) => [
//     start + i + 1,
//     u.orderId,
//     u.customer?.customerName || '',
//     u.items.length,
//     u.unAvailableItems.length,
//     u.items.length === 0 ? 0 : u.finalAmount,
//     u.status,
//     u.deliveryAgent?.username || u.deliveryAgent?.warehouseName || 'Not Assigned',
//     u.deliveryTime
//   ]);

//   // Convert to CSV format
//   let csvContent = headers.join(',') + '\n';
//   rows.forEach(row => {
//     csvContent += row.map(field => `"${field}"`).join(',') + '\n';
//   });

//   // Create blob and download
//   const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//   const url = URL.createObjectURL(blob);
//   const link = document.createElement('a');
//   link.setAttribute('href', url);
//   link.setAttribute('download', 'orders_data.csv');
//   link.style.visibility = 'hidden';
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// };




// const copyToClipboard = () => {
  
//   // Prepare headers
//   const headers = ["#", "Order ID", "Customer Name", "Items", "UnAvailable Items", "Total", "Status", "Delivery Agent","Delivery Time"];
  
//   // Prepare data rows
//   const rows = current.map((u, i) => [
//     start + i + 1,
//     u.orderId,
//     u.customer?.customerName || '',
//     u.items.length,
//     u.unAvailableItems.length,
//     u.items.length === 0 ? 0 : u.finalAmount,
//     u.status,
//     u.deliveryAgent?.username || u.deliveryAgent?.warehouseName || 'Not Assigned',
//     u.deliveryTime
//   ]);

//   // Convert to text format (tab-separated for better clipboard display)
//   let textContent = headers.join('\t') + '\n';
//   rows.forEach(row => {
//     textContent += row.join('\t') + '\n';
//   });

//   // Copy to clipboard
//   navigator.clipboard.writeText(textContent)
//     .then(() => {
//       alert('Table data copied to clipboard!');
//     })
//     .catch(err => {
//       console.error('Failed to copy: ', err);
//       alert('Failed to copy data to clipboard');
//     });
// };



//   return (
    
//     <div className="flex flex-col ">
//       <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
     
//       <div className="flex w-full min-h-screen">
//         <div className='w-auto'>
//           <Sidebar isSidebarOpen={isSidebarOpen} />
//         </div>
        
//         <div className="flex flex-col w-full p-2 mx-auto overflow-x-auto transition-all duration-300">
//           <header className="flex flex-col items-center justify-start px-2 py-2 mb-2 bg-gray-100 rounded-md shadow md:justify-between md:flex-row">
//             <div className="flex items-baseline gap-2 sm:text-left">
//               <h1 className="text-lg font-semibold">Orders List</h1>
//               <span className="text-xs text-gray-600">View/Search Orders</span>
//             </div>
//             <nav className="flex gap-2 text-xs text-gray-500">
//               <NavLink to="/dashboard" className="flex items-center text-gray-500 no-underline hover:text-gray-800">
//                 <FaTachometerAlt /> Home
//               </NavLink>
//               <NavLink to="/order.view" className="text-gray-500 no-underline hover:text-gray-800">
//                 &gt; Orders List
//               </NavLink>
//             </nav>
//           </header>
//          { view &&
//                 <CustomerProfile customerData={data} visible={view} onClose={()=>setView(false)}/>
//           }
//           {
//             viewPrice &&
//             <PriceBreakdownPage visible={viewPrice} onClose={()=>setViewPrice(false)} order={pricedata}/>
//           }
//           {
//             assignRiderView && 
//             <AssignRider orderId={orderId} onClose={()=>{setAssignRiderView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}}  setSidebarOpen={setSidebarOpen} fetchusers={fetchusers}/>
//           }
//           {
//             assignVanView &&
//             <AssignVan orderId={orderId}  onClose={()=>{setAssignVanView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}}  setSidebarOpen={setSidebarOpen} fetchusers={fetchusers}/>
//           }
//           {
//             ItemListView &&
//             <ItemListPage items={items} heading={heading} onClose={()=>setItemListView(false)}/>
//           }
//           {
//             changeStatus &&
//                  <ChangeStatusModal orderId={orderId} currentStatus={nowStatus} onClose={()=>{setChangeStatus(false);setOrderId(null);setNowStatus("")}} fetchOrders={fetchusers}/>
//           }
//           <div className="p-4 bg-white border rounded-lg shadow-md">
            
     
//      <div className='w-1/2 mb-4'>
//                   <div className='flex flex-col '>
//                     <label htmlFor="">Order Status</label>
//                     {/* <Select options={statusOptions} onChange={(option)=>setOrderStatus(option.value)}  value={statusOptions.find(status => status.value===orderStatus)}/> */}
//                     <Select options={statusOptions} onChange={(option)=>setOrderStatus(option.value)}  value={statusOptions.find(option => option.value === (orderStatus)) || null}/>
//                   </div>
//      </div>
//             {/* controls */}
//             <div className="flex flex-col w-full mb-4 md:flex-row md:items-center md:justify-between">
//               <div className="flex items-center gap-2 mb-2 md:mb-0">
//                 <span>Show</span>
//                 <select
//                   className="p-1 border rounded"
//                   value={itemsPerPage}
//                   onChange={e => { setItemsPerPage(+e.target.value); setCurrentPage(1); }}
//                 >
//                   {[10,20,50].map(n => <option key={n}>{n}</option>)}
//                 </select>
//                 <span>Entries</span>
//               </div>
//               <div className="flex gap-2">
//                <button onClick={copyToClipboard}  className="w-full px-3 py-2 text-sm text-white bg-cyan-500 lg:w-auto">Copy</button>
//                 <button onClick={exportToExcel} className="w-full px-3 py-2 text-sm text-white bg-cyan-500 lg:w-auto">Excel</button>
//                 <button onClick={exportToPDF} className="w-full px-3 py-2 text-sm text-white bg-cyan-500 lg:w-auto">PDF</button>
//                 <button onClick={handlePrint} className="w-full px-3 py-2 text-sm text-white bg-cyan-500 lg:w-auto">Print</button>
//                 <button onClick={exportToCSV} className="w-full px-3 py-2 text-sm text-white bg-cyan-500 lg:w-auto">CSV</button>
//                 {/* Copy / Excel / PDF / Print / CSV buttons */}
//                 <input
//                   className="w-full p-1 border rounded"
//                   placeholder="Search"
//                   onChange={e => setSearchTerm(e.target.value)}
//                 />
//               </div>
//             </div>

//             <div className="w-full overflow-x-auto overflow-y-visible">
//               <div className='min-w-full'>
//                    <table className="w-full overflow-x-auto border-gray-300 table-auto">
//                 <thead className="w-full bg-gray-200">
//                   <tr>
//                     {["#","Order ID"," Customer Name","Items","Total","Status","Assigned Van","Assigned Rider","Action"]
//                       .map(h => <th key={h} className="p-1 border">{h}</th>)}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {current.length === 0
//                     ? <tr><td colSpan="10" className="p-2 text-center">No data Available</td></tr>
//                     : current.map((u,i) => (
//                       <tr key={u._id} className="text-sm">
//                         <td className="p-1 border">{start + i + 1}</td>
//                         <td className="p-1 border">
//                           {u.orderNumber}
//                         </td>
//                        <td className="p-1 border ">
//   <span
//     className="cursor-pointer hover:text-cyan-400"
//     onClick={() => {
//       if (u.customer) {
//         setView(true);
//         setData(u.customer);
//       }
//     }}
//   >
//     {u.customer?.name}
//   </span>
// </td>


//                       <td 
//   className={`
//     p-3 border 
//     ${u.items.length > 0 
//       ? "text-blue-500 hover:text-blue-700 hover:bg-blue-50 cursor-pointer transition-colors duration-200" 
//       : "text-gray-400"}
//     ${u.items.length > 0 && "font-medium"}
//   `}
//   onClick={() => {
//     if (u.items.length > 0) {
//       setItemListView(true);
//       setItems(u.items);
//       setHeading("Available Items")
//     }
//   }}
// >
//   <div className="flex items-center justify-between">
//     <span>
//       {u.items.length > 0 ? "View items" : "No items available"}
//     </span>
//     {u.items.length > 0 && (
//       <svg 
//         xmlns="http://www.w3.org/2000/svg" 
//         className="w-4 h-4 ml-1" 
//         fill="none" 
//         viewBox="0 0 24 24" 
//         stroke="currentColor"
//       >
//         <path 
//           strokeLinecap="round" 
//           strokeLinejoin="round" 
//           strokeWidth={2} 
//           d="M9 5l7 7-7 7" 
//         />
//       </svg>
//     )}
//   </div>
// </td>
                            
                                
                        

     

                            
//                         <td className="p-1 border hover:text-blue-400 hover:cursor-pointer" onClick={()=>{
//                             setViewPrice(true);
//                             setPriceData(u)
//                         }}>{u.totalAmount}</td>
//                         {/* <td className="p-1 border">{u.status}</td> */}
//                           <td className="p-2 border border-gray-200">
//   {(() => {
//     const statusConfig = {
//       Pending: {
//         color: 'bg-orange-100 text-orange-800',
//         icon: '⏳',
//         label: 'Pending'
//       },
//       Confirmed: {
//         color: 'bg-blue-100 text-blue-800',
//         icon: '✓',
//         label: 'Confirmed'
//       },
//       Processing: {
//         color: 'bg-purple-100 text-purple-800',
//         icon: '⚙️',
//         label: 'Processing'
//       },
//       Shipped: {
//         color: 'bg-indigo-100 text-indigo-800',
//         icon: '🚚',
//         label: 'Shipped'
//       },
//       'Out for Delivery': {
//         color: 'bg-teal-100 text-teal-800',
//         icon: '🛵',
//         label: 'Out for Delivery'
//       },
//       Delivered: {
//         color: 'bg-green-100 text-green-800',
//         icon: '✅',
//         label: 'Delivered'
//       },
//       Cancelled: {
//         color: 'bg-red-100 text-red-800',
//         icon: '❌',
//         label: 'Cancelled'
//       },
//       Returned: {
//         color: 'bg-gray-100 text-gray-800',
//         icon: '🔄',
//         label: 'Returned'
//       },
//        'Rider Assigned': {
//     color: 'bg-yellow-100 text-yellow-800',
//     icon: '🛵',
//     label: 'Rider Assigned'
//   },
//    'Van Assigned': {
//     color: 'bg-blue-100 text-gray-800',
//     icon: '🛵',
//     label: 'Van Assigned'
//   }
//     };

//     const config = statusConfig[u.status] || {
//       color: 'bg-gray-100 text-gray-800',
//       icon: '❓',
//       label: u.status
//     };

//     return (
//       <div className="flex items-center">
//         <span
//           className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} transition-all duration-200 hover:shadow-sm`}
//         >
//           <span className="mr-2" aria-hidden="true">{config.icon}</span>
//           {config.label}
//         </span>
//       </div>
//     );
//   })()}
// </td> 

// <td className="p-1 text-gray-800 border">
//   {u.assignVan? u.assignVan.warehouseName : 'Not Assigned'}
// </td>
// <td className="p-1 text-gray-800 border">
//   {u.assignRider? u.assignRider.username : 'Not Assigned'}
// </td>




// <td className="relative p-2 overflow-visible border border-gray-200">
//   <div className="flex justify-center">
//     <div className="relative inline-block text-left">
//       {/* Action Button */}
//       <button
//         className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all duration-150"
//         onClick={() => setActionMenu(am => am === u._id ? null : u._id)}
//         aria-expanded={actionMenu === u._id}
//         aria-haspopup="true"
//       >
//         Actions
//         <svg 
//           className={`w-4 h-4 ml-2 transition-transform duration-200 ${actionMenu === u._id ? 'transform rotate-180' : ''}`}
//           xmlns="http://www.w3.org/2000/svg" 
//           viewBox="0 0 20 20" 
//           fill="currentColor"
//           aria-hidden="true"
//         >
//           <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
//         </svg>
//       </button>

//       {/* Dropdown Menu */}
//       {actionMenu === u._id && (
//         <div 
//           className="absolute right-0 z-50 w-48 mt-2 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-fade-in"
//           role="menu"
//           aria-orientation="vertical"
//           aria-labelledby="menu-button"
//         >
//           <div className="py-1" role="none">
//             {/* Edit Action */}



//             {/* //assign van */}
//             <button
//               className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 group"
//               role="menuitem"
//               onClick={() => {
//                 setOrderId(u._id);
//                 setAssignVanView(true);
//                 setActionMenu(null);
//               }}
//             >
//               <div className="p-1 mr-2 transition-colors rounded-md bg-blue-50 group-hover:bg-blue-100">
//                 <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
//                 </svg>
//               </div>
//               <span>Assign Van</span>
//             </button>

//             {/* //Assign rider */}
//             <button
//               className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 group"
//               role="menuitem"
//               onClick={() => {
//                 setOrderId(u._id);
//                 setAssignRiderView(true);
//                 setActionMenu(null);
//               }}
//             >
//               <div className="p-1 mr-2 transition-colors rounded-md bg-blue-50 group-hover:bg-blue-100">
//                 <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
//                   <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
//                 </svg>
//               </div>
//               <span>Assign Rider</span>
//             </button>

//             {/* View Details Action */}
          

//             {/* Divider */}
//             <div className="my-1 border-t border-gray-200"></div>


//             {/* Change Status Action */}
//             {/* Change Status Action */}
// <button
//   className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 transition-colors duration-150 hover:bg-blue-50 hover:text-blue-600 group"
//   role="menuitem"
//   onClick={() => {
//     setNowStatus(u.status);
//     setOrderId(u._id);
//     setChangeStatus(true);
//     setActionMenu(null);
//   }}
// >
//   <div className="p-1 mr-2 transition-colors rounded-md bg-blue-50 group-hover:bg-blue-100">
//     <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.75">
//       <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
//     </svg>
//   </div>
//   <span>Change Status</span>
// </button>

//             {/* Delete Action */}
//             <button
//               className="flex items-center w-full px-4 py-2 text-sm text-red-600 transition-colors duration-150 hover:bg-red-50"
//               role="menuitem"
//               onClick={() => {
//                 deleteUser(u._id);
//                 setActionMenu(null);
//               }}
//             >
//               <svg className="w-4 h-4 mr-2 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
//               </svg>
//               Delete
//             </button>
//           </div>
//         </div>
//       )}
//     </div>
//   </div>

//   {/* Confirmation Modal - Should be at the table level, not in each cell */}
// </td>


//                       </tr>
//                     ))
//                   }
//                 </tbody>
//               </table>
//               </div>
//             </div>



//             {/* pagination */}
//             <div className="flex flex-col items-center gap-2 p-2 md:flex-row md:justify-between">
//               <span>
//                 Showing {start+1} to {Math.min(start+itemsPerPage, filtered.length)} of {filtered.length} entries
//               </span>
//               <div className="flex gap-2">
//                 <button
//                   className={`px-3 py-1 rounded ${currentPage===1 ? "bg-gray-300" : "bg-blue-500 text-white"}`}
//                   disabled={currentPage===1}
//                   onClick={() => setCurrentPage(p => p-1)}
//                 >
//                   Previous
//                 </button>
//                 <button
//                   className={`px-3 py-1 rounded ${currentPage===totalPages ? "bg-gray-300" : "bg-blue-500 text-white"}`}
//                   disabled={currentPage===totalPages}
//                   onClick={() => setCurrentPage(p => p+1)}
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default OrderList;

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
import { FaFileExport, FaChevronDown, FaSearch } from "react-icons/fa";
import axios from "axios";
import Select from "react-select";
import { jsPDF } from "jspdf";
import { utils as XLSXUtils, writeFile as writeXLSXFile } from "xlsx";
import autoTable from "jspdf-autotable";
import AssignRider from "./AssignRider"
import AssignVan from "./AssignVan"
import ItemListPage from "./ItemListPage"
import ChangeStatusModal from "./ChangeStatusModal"
import CustomerProfile from "./CustomerView"
import PriceBreakdownPage from "./PriceView"
export default function OrderList() {
  // ✅ Hooks & State Initialization
const navigate = useNavigate();

// Sidebar + Layout
const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

// Core Data
const [orders, setOrders] = useState([]);
const [users, setUsers] = useState([]); // if needed separately for admin users

// UI & Loading
const [loading, setLoading] = useState(false);
const [exportMenu, setExportMenu] = useState(false);
const [actionMenu, setActionMenu] = useState(null);

// Search & Filters
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("Pending");
const [orderStatus, setOrderStatus] = useState("all");

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

// Permissions
const [permissions, setPermissions] = useState([]);

// Data & Details Views
const [data, setData] = useState([]);
const [pricedata, setPriceData] = useState([]);
const [items, setItems] = useState([]);
const [warehouses, setWarehouses] = useState([]);
const [stores, setStores] = useState([]);

// Modals & Views
const [view, setView] = useState(false);
const [viewPrice, setViewPrice] = useState(false);
const [assignRiderView, setAssignRiderView] = useState(false);
const [assignVanView, setAssignVanView] = useState(false);
const [ItemListView, setItemListView] = useState(false);
const [changeStatus, setChangeStatus] = useState(false);

// Contextual Data for Modals
const [orderId, setOrderId] = useState(null);
const [nowStatus, setNowStatus] = useState("");
const [heading, setHeading] = useState("");

// Status Options
const statusOptions = [
  { value: "all", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Shipped", label: "Shipped" },
  { value: "Rider Assigned", label: "Rider Assigned" },
  { value: "Van Assigned", label: "Van Assigned" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

const userRole = (localStorage.getItem("role") || "guest").toLowerCase();
  const isAdmin = userRole === "store admin" || userRole === "admin";


  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("https://pos.inspiredgrow.in/vps/api/orders/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res.data)
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });




    const deleteUser = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    setLoading(true);
    try {
      await axios.delete(`https://pos.inspiredgrow.in/vps/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // === EXPORT FUNCTIONS ===
  const exportToExcel = () => {
    const excelData = filteredOrders.map((o, i) => ({
      "#": i + 1,
      "Order ID": o.orderNumber,
      "Customer": o.customer?.name || "N/A",
      "Items": o.items?.length || 0,
      "Total": o.finalAmount || 0,
      "Status": o.status,
    }));
    const worksheet = XLSXUtils.json_to_sheet(excelData);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Orders");
    writeXLSXFile(workbook, "Orders.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Orders Report", 14, 15);
    autoTable(doc, {
      head: [["#", "Order ID", "Customer", "Items", "Total", "Status"]],
      body: filteredOrders.map((o, i) => [
        i + 1,
        o.orderNumber,
        o.customer?.name,
        o.items?.length,
        o.finalAmount,
        o.status,
      ]),
      startY: 20,
    });
    doc.save("Orders.pdf");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-grow">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        { view && <CustomerProfile customerData={data} visible={view} onClose={()=>setView(false)}/> } 
          { viewPrice && <PriceBreakdownPage visible={viewPrice} onClose={()=>setViewPrice(false)} order={pricedata}/> } 
            { assignRiderView && <AssignRider orderId={orderId} onClose={()=>{setAssignRiderView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}} setSidebarOpen={setSidebarOpen} fetchusers={fetchOrders}/> }
               { assignVanView && <AssignVan orderId={orderId} onClose={()=>{setAssignVanView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}} setSidebarOpen={setSidebarOpen} fetchusers={fetchOrders}/> }
        { ItemListView && <ItemListPage items={items} heading={heading} onClose={()=>setItemListView(false)}/> }
           { changeStatus && <ChangeStatusModal orderId={orderId} currentStatus={nowStatus} onClose={()=>{setChangeStatus(false);setOrderId(null);setNowStatus("")}} fetchOrders={fetchOrders}/> }
        <main className="flex flex-col flex-grow p-4 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-start justify-between mb-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 md:text-2xl">Orders</h1>
              <p className="text-sm text-gray-500">Manage and monitor your orders</p>
            </div>

            <div className="relative mt-2 md:mt-0">
              <button
                onClick={() => setExportMenu(!exportMenu)}
                className="flex items-center px-4 py-2 text-white rounded-md bg-cyan-600 hover:bg-cyan-700"
              >
                <FaFileExport className="mr-2" /> Export
                <FaChevronDown className="ml-1 text-sm" />
              </button>
              {exportMenu && (
                <div className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-lg w-36">
                  <button
                    onClick={() => {
                      exportToExcel();
                      setExportMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF();
                      setExportMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 mb-5 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center w-full gap-2 sm:w-1/2">
                <FaSearch className="text-gray-400" />
                <input
                  type="text"
                  placeholder="Search orders or customers..."
                  className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full sm:w-1/3">
                <Select
                  options={statusOptions}
                  value={statusOptions.find((o) => o.value === statusFilter)}
                  onChange={(opt) => setStatusFilter(opt.value)}
                />
              </div>
            </div>
          </div>

          {/* Orders Grid */}
          {loading ? (
            <div className="flex justify-center mt-10 text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-white shadow-sm rounded-xl">
              No orders found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="relative p-4 transition-all bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-800">
                      #{order.orderNumber}
                    </h3>
                    
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === "Delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "Pending"
                          ? "bg-orange-100 text-orange-800"
                          : order.status === "Cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
        
                  </div>
                    <h2>{`${order.scheduledDeliveryDate || ""}  ${order.scheduledDeliveryTime || ""}`}</h2>

                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Customer:</span>{" "}
                      {order.customer?.name || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Items:</span> {order.items?.length || 0}
                    </p>
                    <p>
                      <span className="font-medium">Total:</span> ₹
                      {order.totalAmount?.toFixed(2) || "0.00"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={() => {
                        setViewPrice(true);
                           setPriceData(order)
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-cyan-600 hover:bg-cyan-700"
                    >
                      View Details
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenu((prev) => (prev === order._id ? null : order._id))
                        }
                        className="px-3 py-1.5 text-xs font-medium text-cyan-600 border border-cyan-600 rounded-lg hover:bg-cyan-50 flex items-center"
                      >
                        Actions <FaChevronDown className="ml-1 text-xs" />
                      </button>

                      {actionMenu === order._id && (
                        <div className="absolute right-0 z-20 w-40 mt-2 bg-white border rounded-lg shadow-md animate-fadeIn">
                          {isAdmin && (
                             <button
                             onClick={() => {
                               setOrderId(order._id);
                               setAssignVanView(true);
                               setActionMenu(null);
                              
                             }}
                             className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                           >
                             🚚 Assign Van
                           </button>
                          )}

                          {isAdmin && (
                             <button
                             onClick={() => {
                               setOrderId(order._id);
                                               setAssignRiderView(true);
                               setActionMenu(null);
                               
                             }}
                             className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                           >
                             🛵 Assign Rider
                           </button>
                          )}
                         
                         
                          <button
                            onClick={() => {
                              setNowStatus(order.status);
    setOrderId(order._id);
     setChangeStatus(true);
                              setActionMenu(null);
                             
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                          >
                            🔄 Change Status
                          </button>
                          {isAdmin && (
                             <button
                             onClick={() => {
                               deleteUser(order._id);
                               setActionMenu(null);
                               
                             }}
                             className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                           >
                             ❌ Delete
                           </button>
                          )}
                         
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
