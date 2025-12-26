import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import Select from 'react-select'; // Removed to fix build error
import axios, { all } from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Removed to fix build error
import * as XLSX from 'xlsx';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import autoTable from 'jspdf-autotable';
import ItemDetailsPopup from './ItemsView';
import ClubStockView from './ClubStockView';
// const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
// const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ExcelIcon = () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const PdfIcon = () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
// const CustomerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
// const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
// const CategoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V2l6 .05"></path><path d="M22 8h-6"></path><path d="M16 2v6"></path><path d="M12.55 8.5A2.5 2.5 0 0 1 15.05 6"></path><path d="M12.55 13.5A2.5 2.5 0 0 1 15.05 11"></path><path d="M12.55 18.5A2.5 2.5 0 0 1 15.05 16"></path></svg>;

// --- Custom Hook for Debouncing input ---
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}


// --- Main Page Component ---
const ClubReportPage = () => {
    const link = "https://pos.inspiredgrow.in/vps";

    // State Management
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [returns, setReturns] = useState([]);
    const [stock,setStock]=useState([]);
    const [total, setTotal] = useState(0);
    const [pop,setPop]=useState(false);
    const[view,setView]=useState(false);
    const [previewItem,setPreviewItem]=useState(null);
    // Filter States
    const [options, setOptions] = useState({ warehouses: [], categories: [], items: [] });
    const [selectedWarehouse, setSelectedWarehouse] = useState([]);
    const[selectedWarehouseName,setSelectedWarehouseName]=useState("All");
    const [category, setCategory] = useState([]);
    // const [searchItem, setSearchItem] = useState("all");
    const [searchItemName, setSearchItemName] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    // const [saleItems,setSaleItems] = useState([]); 
    const[report,setReport]=useState([]);
    const[finalReport,setFinalReport]=useState([]);  
    const[allItems,setAllItems]=useState([]);
    // UI States
    // const [result, setResult] = useState(""); // For item search dropdown
    // const [scanning, setScanning] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [filtersVisible, setFiltersVisible] = useState(false); // Filters collapsed by default on mobile
    // const debouncedSearchTerm = useDebounce(searchItemName, 500); // 500ms delay
// const [filteredTransfers, setFilteredTransfers] = useState([]);
const [selectedItem, setSelectedItem] = useState(null);
    // Refs
    // const videoRef = useRef(null);
    // const codeReaderRef = useRef(null);

/**
 * Calculates a daily stock report for a specific warehouse.
 * @param {object} data - An object containing arrays of transactions.
 * @param {string} currentWarehouseId - The ID of the warehouse to generate the report for.
 * @param {Map} itemDetailsMap - A map containing details for each item.
 * @returns {object} An object with the warehouse's daily stock movements.
 */
function generateFlatReport({ sales = [], saleReturns = [], stockTransfers = [] }, itemDetailsMap, warehouses) {

  const tempReport = {};
  const warehouseMap = new Map(warehouses.map(w => [w.value, w.label]));

  // Helper function to create a unique key for each item on a specific day in a specific warehouse.
  const getKey = (warehouseId, date, itemId) => `${warehouseId}-${date}-${itemId}`;

  // Process Sales
  sales.forEach(sale => {
    if (!sale.warehouse?._id) return;
    
    const day = sale.saleDate?.substring(0, 10);
    const warehouseId = sale.warehouse._id;

    for (const lineItem of sale.items) {
      if (lineItem.item?._id) {
        const itemId = lineItem.item._id;
        const key = getKey(warehouseId, day, itemId);

        if (!tempReport[key]) {
          const details = itemDetailsMap.get(itemId) || {};
          
          tempReport[key] = {
            warehouseId,
            warehouseName: warehouseMap.get(warehouseId) || 'Unknown Warehouse',
            date: day,
            itemCode:details.itemCode,
            itemId,
            itemName: details.itemName || 'Unknown Item',
            categoryId: details.categoryId,
            categoryName: details.categoryName,
            mrp: details.mrp || 0,
            salesPrice: details.salesPrice,
            barcodes: details.barcodes || [],
            itemImages: details.itemImages || [],
            sale: 0, saleReturn: 0, stockTransferIn: 0, stockTransferOut: 0
          };
          
        }
        tempReport[key].sale += lineItem.quantity;
      }
    }
  });

  // Process Sale Returns
  saleReturns.forEach(saleReturn => {
    if (!saleReturn.warehouse) return;
    const day = saleReturn.returnDate.substring(0, 10);
    const warehouseId = saleReturn.warehouse._id;

    for (const lineItem of saleReturn.items) {
        if (lineItem.item) {
            const itemId = (lineItem.item._id || lineItem.item).toString();
            const key = getKey(warehouseId, day, itemId);
            if (!tempReport[key]) { /* This case is rare but possible if an item is only ever returned */ continue; }
            tempReport[key].saleReturn += lineItem.quantity;
        }
    }
  });

  // Process Stock Transfers
  stockTransfers.forEach(transfer => {
    const day = transfer.transferDate.substring(0, 10);
    for (const lineItem of transfer.items) {
        if (lineItem.item?._id) {
            const itemId = lineItem.item._id;
            // Process IN-transfer
            if (transfer.toWarehouse?._id) {
                const keyIn = getKey(transfer.toWarehouse._id, day, itemId);
                if (!tempReport[keyIn]) { continue; }
                tempReport[keyIn].stockTransferIn += lineItem.quantity;
            }
            // Process OUT-transfer
            if (transfer.fromWarehouse?._id) {
                const keyOut = getKey(transfer.fromWarehouse._id, day, itemId);
                if (!tempReport[keyOut]) { continue; }
                tempReport[keyOut].stockTransferOut += lineItem.quantity;
            }
        }
    }
  });

  // Convert the aggregated object into a flat array
  return Object.values(tempReport);
}


const fetchInitialData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const [warehousesRes, categoriesRes] = await Promise.all([
                    axios.get(`${link}/api/warehouses?scope=mine`, { headers }),
                    axios.get(`${link}/api/categories`, { headers }),
                    
                    // axios.get(`${link}/api/items`, { headers })
                ]);
                // setAllItems(itemRes.data.data);
                const warehouses = warehousesRes.data.data.map(w => ({ label: w.warehouseName, value: w._id ,restricted:w.isRestricted}));
                const categories = categoriesRes.data.data.map(c => ({ label: c.name, value: c._id }));
               
                setOptions({
                    warehouses: [ ...warehouses],
                    categories: [ ...categories],
                    
                });
                
                
              
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            } finally {
                setLoading(false);
            }
        };

        
    // Initial data fetching
    useEffect(() => {
        fetchInitialData();
    }, []);


    useEffect(() => {
  
            // Step 1: Create a map of item details, now including category
            const itemDetailsMap = new Map();
          sales.forEach(sale => {
                sale.items.forEach(lineItem => {
                  if(lineItem.item===null) return;
                 let a=null;
                  if(lineItem.variant){
                     a= lineItem.item.variants.find(i=>i._id==lineItem.variant)
                   }
                    if (lineItem.item && !itemDetailsMap.has(lineItem.item._id)) {
                        itemDetailsMap.set(lineItem.item._id, {
                          itemCode: lineItem.item.itemCode,
                            itemName: `${lineItem.item.itemName} ${a?a.name:""}`,
                            mrp: a?a.mrp:lineItem.item.mrp,
                            categoryId: lineItem.item.category?._id,
                            categoryName: lineItem.item.category?.name,
                            salesPrice:a?a.salesPrice: lineItem.item.salesPrice,
                            barcodes: lineItem.item.barcodes || [],
                            itemImages: lineItem.item.itemImages || []
                        });
                    }


                    
                });
            });

            // Step 2: Call the new function to get the flat report
            const flatReport = generateFlatReport(
                { sales: sales, saleReturns: returns, stockTransfers: stock },
                itemDetailsMap,
                options.warehouses
            ).filter(item=>  (item.sale || 0) -
      (item.saleReturn || 0) -
      (item.stockTransferIn || 0) +
      (item.stockTransferOut || 0) > 0);

             
             
            setReport(flatReport);
            const catItem={};
            const catmap = category.map(i => i.label);

            flatReport.forEach(item => {
              if (catmap.length > 0 && !catmap.includes(item.categoryName)) return;
            
              if (!catItem[item.categoryName]) {
                catItem[item.categoryName] = [];
              }
              catItem[item.categoryName].push(item);
            });
            
            
            console.log("l",catmap)
             console.log("Categorized Items:", catItem);
             
            setFinalReport(catItem);
           
           
    },[options, sales, returns,stock]);

            

   const a = () => {
  const filterreport = report.filter((transfer) => {
    // console.log("Filtering Transfer:", transfer);
    const warehouseMatch = selectedWarehouse === "all" || transfer.warehouseId === selectedWarehouse;
    const categoryMatch = category === "all" || transfer.categoryId === category;

    const dateObj = new Date(transfer.date);
    const fromDateObj = dateFrom ? new Date(dateFrom) : null;
    const toDateObj = dateTo ? new Date(dateTo) : null;

    const dateInRange =
      (!fromDateObj || dateObj >= fromDateObj) &&
      (!toDateObj || dateObj <= toDateObj);

    return warehouseMatch && categoryMatch && dateInRange;
  });
  
const catItem={};
  filterreport.forEach(item => {
              if (!catItem[item.categoryName]) {
                catItem[item.categoryName] = [];
              }
              catItem[item.categoryName].push(item);
            });
            console.log("n",catItem)
  setFinalReport(catItem);
};



const applyfilter = async ()=>{
  setLoading(true);
  try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const params = {
        start: dateFrom || null,
        end: dateTo || null,
      };
      
      if (selectedWarehouse.length > 0) {
        params.warehouseId = selectedWarehouse.map(i => i.value);
      }
      else {
        params.warehouseId = options.warehouses.map(i => i.value);
      }
      
      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        params
      };
      
      const [salesRes, stockRes, salesReturnRes] = await Promise.all([
        axios.get(`${link}/api/reports/sales-report`, config),
        axios.get(`${link}/api/reports/stock-transfer-report`, config),
        axios.get(`${link}/api/reports/sales-return-report`, config),
      ]);
      
    console.log(salesRes)
    console.log(stockRes)
    console.log(salesReturnRes)

      
      setStock(stockRes.data);
      setSales(salesRes.data);
      setReturns(salesReturnRes.data);
      
    
  } catch (err) {
      console.error("Failed to fetch initial data:", err);
  } finally {
      setLoading(false);
  }
}


              // Export to PDF function
             
const downloadAsPDF = () => {
  const doc = new jsPDF();
  doc.text("Pending Item Report", 14, 15);

  const headers = [["#", "Item Name", "Pending Qty", "MRP"]];

  const rows = finalReport.map((item, index) => [
    index + 1,
    item.itemName,
    (item.sale || 0) - (item.saleReturn || 0) + (item.stockTransferIn || 0) - (item.stockTransferOut || 0),
    item.salesPrice || 0
  ]);

  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 20
  });

  doc.save("PendingItems.pdf");
};
              
              // Export to Excel function
              const exportToExcel = () => {
                // Prepare data for Excel
                const excelData = finalReport.map((item, index) => ({
                   "#": index + 1,
              "Item Name": item.itemName,
              "Pending Qty": (item.sale || 0) - (item.saleReturn || 0) + (item.stockTransferIn || 0) - (item.stockTransferOut || 0),
              "MRP": item.salesPrice || 0,
                }));
              
                // Create worksheet
                const worksheet = XLSX.utils.json_to_sheet(excelData);
                
                // Create workbook
                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, 'penddingItems');
                
                // Export to Excel file
                XLSX.writeFile(workbook, 'pendingItems.xlsx');
              };


    return (
        <div className="flex flex-col flex-1 overflow-y-auto">
            <main className="flex-grow p-4 space-y-6 bg-gray-100 sm:p-6">
                
                {/* Page Header */}
                <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Club Item Report</h1>
                        <nav className="flex items-center mt-1 text-sm text-gray-500" aria-label="Breadcrumb">
                            <NavLink to="/dashboard" className="flex items-center hover:text-blue-600"><HomeIcon className="w-4 h-4" /> <span className="hidden ml-1 sm:inline">Home</span></NavLink>
                            <ChevronRightIcon /><span>Reports</span><ChevronRightIcon />
                            <span className="font-medium text-gray-600">Club Item Report</span>
                        </nav>
                    </div>
                </header>
                {
                  pop  && (
                    <ItemDetailsPopup selectedWarehouse={selectedWarehouse} item={selectedItem} onClose={() => setPop(false)} />
                  )
                }
               { view && (
                    <ClubStockView selectedWarehouse={selectedWarehouse} item={selectedItem} setView={setView} warehouses={options.warehouses} items={allItems} />
                )}
                {/* Filter Section (Collapsible) */}
                <div className="bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
    <button onClick={() => setFiltersVisible(!filtersVisible)} className="flex items-center justify-between w-full p-4 font-semibold text-left text-gray-700">
        <div className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5" />
            <span>Filter Report</span>
        </div>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${filtersVisible ? 'rotate-180' : ''}`} />
    </button>
    {filtersVisible && (
        <div className="p-4 border-t border-gray-200">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-600">Warehouse</label>
                    <Select className='w-full' options={options.warehouses} isMulti value={selectedWarehouse} onChange={setSelectedWarehouse} />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-600">Category</label>
                    <Select className='w-full' options={options.categories} onChange={setCategory} value={category} isMulti/>
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-600">From Date</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                    <label className="block mb-1 text-sm font-medium text-gray-600">To Date</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
            </div>
            
            {/* --- Button Added Here --- */}
            <div className="flex justify-end mt-6">
              
                <button 
                    onClick={() =>  applyfilter() } 
                    className="px-5 py-2 font-semibold text-white transition-colors duration-200 rounded-md bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                >
                    Apply Filter
                </button>
            </div>
        </div>
    )}
</div>

                {/* Records Section */}
              <div className="bg-white rounded-lg shadow-sm">
    {/* Main Header with Export Button */}
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-700">Records</h3>
         <button
      type="button"
      onClick={fetchInitialData}
      disabled={loading}
      // title={label}
      // aria-label={label}
      className={`inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm
                  bg-white border shadow-sm hover:bg-gray-50 active:scale-[0.98]
                  disabled:opacity-60 disabled:cursor-not-allowed `}
    >
      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <path d="M21 3v6h-6" />
      </svg>
      <span>{loading ? "Refreshing..." : "Refresh"}</span>
    </button>
        <div className="relative">
            <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <DownloadIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
                <ChevronDownIcon className="hidden w-4 h-4 sm:inline" />
            </button>
            {showExportDropdown && (
                <div className="absolute right-0 z-10 w-40 mt-2 bg-white rounded-md shadow-lg" onMouseLeave={() => setShowExportDropdown(false)}>
                    <button onClick={exportToExcel} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><ExcelIcon /> Excel</button>
                    <button onClick={downloadAsPDF} className="flex items-center w-full gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><PdfIcon /> PDF</button>
                </div>
            )}
        </div>
    </div>

    {/* --- Table 1: Pending Quantity Report --- */}
    <div className="border-t border-gray-200">
        <div className="p-4">
            <h4 className="font-semibold text-gray-700">Pending Quantity Report</h4>
            <p className="text-xs text-gray-500">
                {`Warehouse: ${selectedWarehouseName}, Date: ${!dateFrom ? new Date().toLocaleDateString() : dateFrom} ${dateTo ? `to ${dateTo}` : ''}`}
            </p>
        </div>
       <div className="overflow-x-auto">
  <table className="min-w-full bg-white">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">#</th>
        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Item Name</th>
        <th className="px-4 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase">Pending Qty</th>
        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">MRP</th>
      </tr>
    </thead>

    <tbody className="divide-y divide-gray-200">
      {!loading &&
        Object.entries(finalReport).map(([categoryName, items]) => (
          <React.Fragment key={categoryName}>
            {/* Category Header Row */}
            <tr className="bg-gray-100">
              <td colSpan="4" className="px-4 py-2 font-semibold text-gray-700">
                {categoryName}
              </td>
            </tr>

            {/* Items inside category */}
            {items.map((item, index) => {
              const pendingQty =
                (item.sale || 0) -
                (item.saleReturn || 0) -
                (item.stockTransferIn || 0) +
                (item.stockTransferOut || 0);

              if (pendingQty <= 0) return null;

              return (
                <tr
                  key={`${item.itemId}-${index}`}
                  className="hover:bg-gray-50"
                >
                  <td
                    className="px-4 py-3 text-sm font-medium text-gray-700"
                    onClick={() => setPreviewItem(item)}
                  >
                    {index + 1}
                    {item.itemImages?.length > 0 && (
                      <img
                        src={`${link}/uploads/qr/items/${item.itemImages[0]}`}
                        alt={item.itemName}
                        className="object-cover w-10 h-10"
                      />
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 text-sm font-medium ${
                      selectedItem?.itemName === item.itemName && selectedItem.warehouseId === item.warehouseId
                        ? "text-blue-400"
                        : "text-gray-400"
                    } break-words`}
                    onClick={() => {
                      setView(true);
                      setSelectedItem(item);
                    }}
                  >
                    {item.itemName}
                  </td>
                  <td
                    className="px-4 py-3 text-sm font-medium text-center text-gray-800"
                    onClick={() => {
                      setView(true);
                      setSelectedItem(item);
                    }}
                  >
                    {pendingQty}
                  </td>
                  <td
                    className="px-4 py-3 text-lg font-bold text-blue-600"
                    onClick={() => {
                      setView(true);
                      setSelectedItem(item);
                    }}
                  >
                    ₹{item.mrp || 0}
                  </td>
                </tr>
              );
            })}
          </React.Fragment>
        ))}

      {loading && (
        <tr>
          <td colSpan="4" className="p-4 text-center text-gray-500">
            Loading...
          </td>
        </tr>
      )}

      {!loading && Object.keys(finalReport).length === 0 && (
        <tr>
          <td colSpan="4" className="p-4 text-center text-gray-500">
            No records found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

    </div>

    {/* --- Table 2: Detailed Report --- */}
   

    {/* Total Sales Footer */}
    {/* <div className="p-4 font-bold text-right text-gray-800 border-t rounded-b-lg bg-gray-50">Total Sales: ₹{total.toFixed(2)}</div> */}
</div>
                
            
            </main>
            {/* Barcode Scanner Modal */}
           {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => {
            setPreviewItem(null);
          }}
        >
          <div
            className="bg-white rounded shadow-lg max-w-4xl w-full max-h-[90vh] p-4 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {previewItem.itemName} – images
              </h3>
              <button
                className="text-2xl font-bold text-red-600"
                onClick={() => {
                  setPreviewItem(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {previewItem.itemImages.map((fn, idx) => {
                const url = fn.startsWith("http")
                  ? fn
                  : `${link}/uploads/qr/items/${fn}`;
                return (
                  <div key={idx} className="relative group">
                    <img
                      src={url} loading="lazy"
                      alt={`${previewItem.itemName} ${idx + 1}`}
                      className="object-cover w-full h-64 rounded cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
        </div>
    );
};

export default function ClubBillReport() {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (window.innerWidth >= 1024) {
            setSidebarOpen(true);
        } else {
            setSidebarOpen(false);
        }
    }, [])

    return (
 <div className="flex flex-col h-screen">
        <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        <div className="flex flex-grow">
          <Sidebar isSidebarOpen={isSidebarOpen} />
                <ClubReportPage />
                {/* Add padding to the bottom of the content to avoid overlap with the sticky footer */}
                <div className="h-16 mb-16 bg-black md:hidden shrink-0"></div>
            </div>
             {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"></div>}
        </div>
    );
}
