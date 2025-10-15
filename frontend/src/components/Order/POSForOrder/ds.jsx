import React ,{useState,useEffect,useRef}from 'react'
import Sidebar from '../Sidebar';
import Navbar from '../Navbar';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt } from 'react-icons/fa';
import { CameraIcon } from "@heroicons/react/solid";
import Select from 'react-select'
import { FaBars } from "react-icons/fa";
import axios from 'axios';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import autoTable from 'jspdf-autotable';
import { BrowserMultiFormatReader } from '@zxing/library';
export default function SaleItemsReport() {
    const link="https://pos.inspiredgrow.in/vps"
  const [showExportDropdown, setShowExportDropdown] = useState(false)
   const[isSidebarOpen,setSidebarOpen]=useState(true)
   const[loading,setLoading]=useState(true)
   const[options,setOptions]=useState({
    warehouses:[],
    categories:[],
    brands:[],
    items:[]
   })
   useEffect(()=>{
    if(window.innerWidth<768){
      setSidebarOpen(false)
    }
   },[])
   const[searchItemName,setSearchItemName]=useState("")
   const[SelectedWarehouse,setSelectedWarehouse]=useState("all")
   const[category,setCategory]=useState("all")
    const[searchItem,setSearchItem]=useState("all")
    const[dateFrom,setDateFrom]=useState("all")
    const[dateTo,setDateTo]=useState("all")
    const[result,setResult]=useState("")
  const [sale, setSales] = useState([]); 
  const[total,setTotal]=useState(0)
   const fetchWarehouses=async()=>{
    try {
      const response = await axios.get(`${link}/api/warehouses`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
     
  
     const warehouses =response.data.data.map((warehouse)=>({
      label:warehouse.warehouseName,
      value:warehouse._id
     }))
       setOptions((prev)=>({
        ...prev,
        warehouses:[{label:"All",value:"all"},...warehouses]
       }))
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
   }
   
   const fetchCategories=async()=>{
    try {
      const response = await axios.get(`${link}/api/categories`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
     
  
     const category =response.data.data.map((warehouse)=>({
      label:warehouse.name,
      value:warehouse._id
     }))
       setOptions((prev)=>({
        ...prev,
        categories:[{label:"All",value:"all"},...category]
       }))
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
   }
   
   

   
   const fetchItems=async()=>{
    try {
      const response = await axios.get(`${link}/api/items`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        }
      });
     
   
     setOptions((prev)=>({
      ...prev,
      items:response.data.data
     }))
    } catch (err) {
      console.log(err.message);
    } finally {
      setLoading(false);
    }
   }
   
   const fetchSale = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token");
      const response = await axios.get(`${link}/api/pos/invoices`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      console.log("sales")
      console.log (response.data)
      setSales(response.data);
    } catch (err) {
      console.log(err.message);
    } 
    finally{
      setLoading(false)
    }
  };

   useEffect(()=>{
    fetchWarehouses();
    fetchCategories();
    fetchItems();
    fetchSale();
   },[])

    const[scanning,setScanning]=useState(false)
          const videoRef = useRef(null);
           const codeReaderRef = useRef(null);
         
           useEffect(() => {
             if (!scanning) return;
         
             const startScanner = async () => {
               if (!videoRef.current) return;
         
               const codeReader = new BrowserMultiFormatReader();
               codeReaderRef.current = codeReader;
         
               const tryDecode = async (facingMode) => {
                 const constraints = {
                   video: {
                     facingMode,
                     advanced: [
                       { width: 1920 },
                       { height: 1080 },
                       { zoom: 2 }, // not all devices support this
                     ],
                   },
                 };
         
                 return codeReader.decodeFromConstraints(
                   constraints,
                   videoRef.current,
                   (result, error) => {
                     if (result) {
                       const text = result.getText();
                       alert(text);
                       setSearchItem(text)  
                       window.navigator.vibrate?.(200);
                       const beep = new Audio("/beep.mp3");
                       beep.play();
         
                       const stream = videoRef.current?.srcObject;
                       stream?.getTracks().forEach((track) => track.stop());
         
                       if (codeReaderRef.current?.reset && typeof codeReaderRef.current.reset === "function") {
                         codeReaderRef.current.reset();
                       }
         
                       setScanning(false);
                     }
         
                     if (error && error.name !== "NotFoundException") {
                       console.error("Scan error:", error);
                     }
                   }
                 );
               };
         
               try {
                 await tryDecode({ exact: "environment" });
               } catch (error) {
                 if (error.name === "OverconstrainedError" || error.name === "NotFoundError") {
                   console.warn("Back camera not found. Trying front camera...");
                   try {
                     await tryDecode("user");
                   } catch (fallbackError) {
                     console.error("Front camera also failed:", fallbackError);
                     alert("No camera found or accessible.");
                     setScanning(false);
                   }
                 } else {
                   console.error("Camera access error:", error);
                   alert("Camera access error: " + error.message);
                   setScanning(false);
                 }
               }
             };
         
             startScanner();
         
             return () => {
               const stream = videoRef.current?.srcObject;
               stream?.getTracks().forEach((track) => track.stop());
         
               if (codeReaderRef.current?.reset && typeof codeReaderRef.current.reset === "function") {
                 codeReaderRef.current.reset();
               }
             };
           }, [scanning]);

   const filteredTransfers = sale.filter((transfer) => {
    const {
      warehouse: warehouse,
      items,
      saleDate: date,
    } = transfer;
    // Basic string matches
    const warehouseMatch = SelectedWarehouse === "all" || warehouse._id===SelectedWarehouse;
     
    // Match at least one item inside items
    const categoryMatch =
      category === "all" ||
      items.some((it) => it.item?.category?._id === category);
   
      const itemMatch = 
      searchItem === "all" || searchItem === "" ||
      items.some((it) => 
        it.item?._id === searchItem || it.item?.barcode === searchItem || it.item?.itemName.toLowerCase().includes(searchItem.toLowerCase())
      );
      
    // Date range match
    const dateObj = new Date(date);
    const fromDateObj = dateFrom === "all" || dateFrom==="" ? null : new Date(dateFrom);
    const toDateObj = dateTo === "all" || dateTo==="" ? null : new Date(dateTo);
  
    const dateInRange =
      (!fromDateObj || dateObj >= fromDateObj) &&
      (!toDateObj || dateObj <= toDateObj);
     
    return warehouseMatch && categoryMatch  && itemMatch && dateInRange;
  });

   const filteredItems = result
           ? options.items.filter((item) => {
               const q = result.toLowerCase();
               return (
                 item.itemName?.toLowerCase().includes(q) ||
                 item.itemCode?.toLowerCase().includes(q) ||
                 (item.barcode && item.barcode.toLowerCase().includes(q))
               );
             })
           : [];
           useEffect(()=>{
             const filteredItems = result
             ? options.items.filter((item) => {
                 const q = result.toLowerCase();
                 return (
                   item.itemName?.toLowerCase().includes(q) ||
                   item.itemCode?.toLowerCase().includes(q) ||
                   (item.barcode && item.barcode.toLowerCase().includes(q))
                 );
               })
             : [];
           },[result])
  
           
           // Export to PDF function
           const exportToPDF = () => {
            const doc = new jsPDF();
            
            // Add title
            doc.text('Sale Item', 14, 15);
            
            // Prepare headers
            const headers = [
              '#', 
              'Sale Code', 
              'Date', 
              'Customer', 
              'Items', 
              'Categories', 
              'Quantities', 
              'Unit Prices', 
              'Total'
            ];
            
            // Prepare data
            const data = filteredTransfers.map((item, index) => [
              index + 1,
              item.saleCode || 'NA',
              new Date(item.saleDate).toDateString(),
              item.customer?.customerName || 'NA',
              item.items?.map(it => it.item?.itemName || 'NA').join(', '),
              item.items?.map(it => it.item?.category?.name || 'No category').join(', '),
              item.items?.map(it => it.quantity).join(', '),
              item.items?.map(it => it.unitPrice).join(', '),
              item.grandTotal?.toFixed(2) || '0.00'
            ]);
          
            // Add table using autoTable
            autoTable(doc, {
              head: [headers],
              body: data,
              startY: 20,
              styles: {
                fontSize: 8,
                cellPadding: 2,
                overflow: 'linebreak'
              },
              columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 20 },
                2: { cellWidth: 25 },
                3: { cellWidth: 25 },
                4: { cellWidth: 30 },
                5: { cellWidth: 25 },
                6: { cellWidth: 15 },
                7: { cellWidth: 15 },
                8: { cellWidth: 15 }
              }
            });
          
            // Save the PDF
            doc.save('sale_items.pdf');
          };
           
           // Export to Excel function
           const exportToExcel = () => {
             // Prepare data for Excel
             const excelData = filteredTransfers.map((item, index) => ({
               '#': index + 1,
               'Sale Code': item.saleCode || 'NA',
               'Date': new Date(item.saleDate).toDateString(),
               'Customer': item.customer?.customerName || 'NA',
               'Items': item.items?.map(it => it.item?.itemName || 'NA').join('\n'),
               'Categories': item.items?.map(it => it.item?.category?.name || 'No category').join('\n'),
               'Quantities': item.items?.map(it => it.quantity).join('\n'),
               'Unit Prices': item.items?.map(it => it.unitPrice).join('\n'),
               'Total': item.grandTotal?.toFixed(2) || '0.00'
             }));
           
             // Create worksheet
             const worksheet = XLSX.utils.json_to_sheet(excelData);
             
             // Create workbook
             const workbook = XLSX.utils.book_new();
             XLSX.utils.book_append_sheet(workbook, worksheet, 'saleItems');
             
             // Export to Excel file
             XLSX.writeFile(workbook, 'saleItems.xlsx');
           };

           
useEffect(()=>{
  let sum=0;
           
             filteredTransfers.forEach(element => {
              sum=sum+element.grandTotal
             });
             console.log("Sum")
             setTotal(sum)
},[filteredTransfers])


  useEffect(()=>console.log(filteredTransfers),[filteredTransfers])
  useEffect(()=>console.log("sale"),[sale])

  
    return (
      <div className="flex flex-col h-screen">
        <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex flex-grow">
          <Sidebar isSidebarOpen={isSidebarOpen} />
    
          {/* Main Content */}
          <div className="relative flex flex-col flex-grow px-4 py-6 bg-gray-100">
            {/* Header */}
            <header className="flex flex-col items-center justify-between sm:flex-row">
              <div className="flex items-center gap-1 text-center sm:flex-row sm:text-left">
                <h1 className="text-lg font-semibold truncate sm:text-xl">Sale Item Report</h1>
              </div>
              <nav className="flex flex-wrap items-center justify-center mt-2 text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
                <NavLink to="/dashboard" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                  <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" /> Home
                </NavLink>
                
                <NavLink to="/reports/sale-item" className="text-gray-700 no-underline hover:text-cyan-600">
                  &gt; sale item Report
                </NavLink>
              </nav>
            </header>
            
            <div className='flex flex-col w-full mx-auto mt-4 bg-white border-t-4 rounded-lg shadow-md border-cyan-600'>
              <div className='w-full h-auto px-2 border-b-2 border-gray-200'>
                <h4 className='text-gray-700'>Please Enter Valid Information</h4>
              </div>
              <div className='py-4 '>


                {/* //first row */}
                <div className='flex w-full gap-5 px-4 mb-4'>
                  <div className='flex flex-col w-full'>
                    <label htmlFor="">Warehouse</label>
                    <Select className='w-full' options={options.warehouses} onChange={(option)=>setSelectedWarehouse(option.value)} value={options.warehouses.find(option => option.value===SelectedWarehouse)}/>
                  </div>
                  <div className='flex flex-col w-full'>
                    <label htmlFor="">Item Type</label>
                    <Select className='w-full' options={[{label:"Item",value:"item"},{label:"Services",value:"services"}]} />
                  </div>
                </div>

                {/* second row */}
                <div className='flex w-full gap-5 px-4 mb-4'>
                  <div className='flex flex-col w-full'>
                    <label htmlFor="">Category</label>
                    <Select className='w-full' options={options.categories} onChange={(option)=>setCategory(option.value)} value={options.categories.find(option => option.value===category) || null}/>
                  </div>
                  <div className='relative flex flex-col w-full'>
                    <label htmlFor="">Item Name</label>
                  <label htmlFor="" className="flex">
                                     <input type="text" name="type" className="w-full px-2 py-1 border-2 rounded-md"  value={searchItemName} onChange={(e)=>{setResult(e.target.value);setSearchItemName(e.target.value);setSearchItem(e.target.value)}}/>
                                     <button type="button"
                         className="p-2 ml-2 text-white rounded-full hover:bg-blue-600" 
                         onClick={() => setScanning(true)}
                       >
                         <CameraIcon className="w-6 h-6 text-gray-500" />
                       </button>
                                     </label>
                                     {result !== "" && (
                   <div
                     className="absolute z-50 w-full overflow-y-auto bg-white border rounded-lg shadow-lg top-20 sm:w-96 max-h-60 touch-auto"
                     style={{ WebkitOverflowScrolling: 'touch' }} // enables momentum scrolling on iOS
                   >
                     <ul>
                       {filteredItems.map((list) => (
                         <li
                           key={list.itemCode}
                           onClick={() => {setSearchItem(list._id); setResult("");setSearchItemName(list.itemName)}}
                           className="p-2 cursor-pointer hover:bg-gray-100"
                         >
                           <strong>{list.itemCode}</strong> - {list.itemName} - {list.barcode}
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                   {scanning && (
                   <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-50">
                     <div className="relative overflow-hidden border-4 border-white rounded-lg shadow-xl w-72 h-72">
                       <video
                         ref={videoRef}
                         className="absolute object-cover w-full h-full"
                         autoPlay
                         muted
                         playsInline
                       />
                       <div className="absolute w-full h-1 bg-red-500 animate-scan" />
                     </div>
                     <button
                       onClick={() => {
                         const stream = videoRef.current?.srcObject;
                         stream?.getTracks().forEach((track) => track.stop());
                 
                         if (codeReaderRef.current?.reset && typeof codeReaderRef.current.reset === "function") {
                           codeReaderRef.current.reset();
                         }
                 
                         setScanning(false);
                       }}
                       className="px-4 py-2 mt-6 text-white bg-red-600 rounded hover:bg-red-700"
                     >
                       Cancel
                     </button>
                   </div>
                 )}
                 
                  </div>
                </div>

                {/* third row */}
               



                {/* fourth row */}
                <div className='flex w-full gap-5 px-4'>
                  <div className='flex flex-col w-full'>
                    <label htmlFor="">From Date</label>
                    <input type="date" name="type" className="w-full px-2 py-1 border-2 rounded-md"  onChange={(e)=>setDateFrom(e.target.value)}/>
                  </div>
                  <div className='flex flex-col w-full'>
                    <label htmlFor="">To Date</label>
                    <input type="date" name="type" className="w-full px-2 py-1 border-2 rounded-md"  onChange={(e)=>setDateTo(e.target.value)}/>
                  </div>
                </div>

              </div>
            </div>

            <div className='flex flex-col w-full mt-5 bg-white border-t-4 border-gray-400'>
              

            
             <div className='flex w-full px-2 py-2'>
  <div className='w-full'>
    <h4 className='text-gray-700'>Records Table</h4>
  </div>
  <div className="relative">
    <button 
      onClick={() => setShowExportDropdown(!showExportDropdown)}
      className="flex items-center px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
    >
      <FaBars className="mr-2" />
      Export
      <span className="ml-2 text-sm">▼</span>
    </button>
    
    {/* Dropdown menu - now controlled by state */}
    {showExportDropdown && (
      <div 
        className="absolute right-0 z-10 w-40 mt-2 bg-white rounded-md shadow-lg"
        onMouseLeave={() => setShowExportDropdown(false)}
      >
        <div className="py-1">
          <button 
            onClick={() => {
              exportToExcel();
              setShowExportDropdown(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
          <button 
            onClick={() => {
              exportToPDF();
              setShowExportDropdown(false);
            }}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            PDF
          </button>
        </div>
      </div>
    )}
  </div>
</div>
{/* second row */}
              <div className='flex w-full px-2 py-2'>
                <div className='w-full'>
                  <table className="min-w-full gap-2 border-separate">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">#</th>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">Invoice No.</th>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">Sales Date</th>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">Customer Name</th>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">Items</th>
                        <th className="px-4 py-2 text-sm text-white bg-blue-500">Total(Rs.)</th>
                       
                      </tr>
                    </thead>
                    <tbody>
                      {/* Add your data rows here */}
                     
                      {
                        filteredTransfers.length>0 && filteredTransfers.map((item,index)=>(
                          <tr key={index} className='bg-gray-100 border-2 border-black'>
                            <td className="px-4 py-2">{index+1}</td>
                            <td className="px-4 py-2">{item.saleCode}</td>
                            <td className="px-4 py-2">{ new Date(item.saleDate).toDateString()}</td>
                            <td className="px-4 py-2">{item.customer?.customerName || "NA"}</td>
                            <td className="px-4 py-2">{item.items?.length || 0}</td>
                           
                                      <td className="px-4 py-2">{(item.grandTotal)?.toFixed(2)}</td>
                          </tr>
                        ))
                      }
                      {
                        filteredTransfers.length===0 && (
                          <tr className='bg-gray-100 border-2 border-black' >
                          <td className="px-4 py-2 text-center" colSpan='10'><h5>No Data Found</h5></td>
                        </tr>
                        )
                      }
                       {
                        filteredTransfers.length>0 && (
                          <tr className='bg-gray-100 border-2 border-black' >
                          <td className="px-4 py-2 text-right" colSpan='8'><h7 className="font-semibold">Total:</h7></td>
                          <td className="py-2 font-semibold text-center" >{(total).toFixed(2)}</td>
                        </tr>
                        )
                      }
                      
                      {/* Repeat for more rows */}
                    </tbody>
                  </table>

                </div>

              </div>
              
              
            </div>
            
    
        
           
            
          </div>
        </div>
      </div>
    );
}
      <div className="flex flex-col h-screen">
        <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex flex-grow">
          <Sidebar isSidebarOpen={isSidebarOpen} />
                <SaleItemReportPage />
                {/* Add padding to the bottom of the content to avoid overlap with the sticky footer */}
                <div className="h-16 md:hidden shrink-0"></div>
            </div>
             {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"></div>}
        </div>