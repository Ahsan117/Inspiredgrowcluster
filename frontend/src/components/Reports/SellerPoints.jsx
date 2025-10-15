import React, { useState, useEffect, useRef ,useMemo} from 'react';
import { NavLink } from 'react-router-dom';
import Select from 'react-select'; // Removed to fix build error
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Removed to fix build error
import * as XLSX from 'xlsx';
import { BrowserMultiFormatReader } from '@zxing/library';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';
import autoTable from 'jspdf-autotable';
import { FixedSizeList as List } from 'react-window';
import SaleBillItemsPopup from './ItemsView';
const MenuIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const CameraIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"></path><circle cx="12" cy="13" r="3"></circle></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const DownloadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;
const FilterIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>;
const ExcelIcon = () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const PdfIcon = () => <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>;
const CustomerIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const CalendarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
const CategoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-gray-500"><path d="M2 16.1A5 5 0 0 1 5.9 20M2 12.05A9 9 0 0 1 9.95 20M2 8V2l6 .05"></path><path d="M22 8h-6"></path><path d="M16 2v6"></path><path d="M12.55 8.5A2.5 2.5 0 0 1 15.05 6"></path><path d="M12.55 13.5A2.5 2.5 0 0 1 15.05 11"></path><path d="M12.55 18.5A2.5 2.5 0 0 1 15.05 16"></path></svg>;

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
const SellerPoints = () => {
    const link = "https://pos.inspiredgrow.in/vps";

    // State Management
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);
    const [total, setTotal] = useState(0);
    const [pop,setPop]=useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    // Filter States
    const [options, setOptions] = useState({ warehouses: [], categories: [], items: [] });
    const [selectedWarehouse, setSelectedWarehouse] = useState("all");
    const [category, setCategory] = useState("all");
    const [searchItem, setSearchItem] = useState("all");
    const [searchItemName, setSearchItemName] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState("all");
    // UI States
    const [result, setResult] = useState(""); // For item search dropdown
    const [scanning, setScanning] = useState(false);
    const [showExportDropdown, setShowExportDropdown] = useState(false);
    const [filtersVisible, setFiltersVisible] = useState(false); // Filters collapsed by default on mobile
    const debouncedSearchTerm = useDebounce(searchItemName, 500); // 500ms delay
    const[saleItems,setSaleItems]=useState([]);
    // Refs
    const videoRef = useRef(null);
    const codeReaderRef = useRef(null);
    
    // Initial data fetching
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem("token");
                const headers = { Authorization: `Bearer ${token}` };

                const [warehousesRes, categoriesRes, customerRes, salesRes] = await Promise.all([
                    axios.get(`${link}/api/warehouses`, { headers }),
                    axios.get(`${link}/api/categories`, { headers }),
                    axios.get(`${link}/api/customer-data/all`, { headers }),
                    axios.get(`${link}/api/pos/club`, { headers })
                ]);

                const warehouses = warehousesRes.data.data.map(w => ({ label: w.warehouseName, value: w._id }));
                const categories = categoriesRes.data.data.map(c => ({ label: c.name, value: c._id }));
                const cutomers=customerRes.data.map(c => ({ label: c.customerName, value: c._id }))
                setOptions({
                    warehouses: [{ label: "All", value: "all" }, ...warehouses],
                    categories: [{ label: "All", value: "all" }, ...categories],
                    customers : [{ label: "All", value: "all" }, ...cutomers]
                });
                setSales(salesRes.data.data);
            } catch (err) {
                console.error("Failed to fetch initial data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

   

    // Filtering Logic
  const [filteredTransfers, setFilteredTransfers] = useState([]);

       const applyfilter = () => {
  const result = sales.filter((transfer) => {
    const { warehouse, items, saleDate: date,customer } = transfer;

    const warehouseMatch = selectedWarehouse === "all" || warehouse._id === selectedWarehouse;

    const categoryMatch = category === "all" || items.some((it) => it.item?.category?._id === category);
    const customerMatch = selectedCustomer === "all" || customer._id === selectedCustomer;
    
    const itemMatch =
      searchItem === "all" || searchItem === "" ||
      items.some((it) =>
        it.item?._id === searchItem ||
        it.item?.barcode === searchItem ||
        it.item?.itemName.toLowerCase().includes(searchItem.toLowerCase())
      );

    const dateObj = new Date(date);
    const fromDateObj = dateFrom === "all" || dateFrom === "" ? null : new Date(dateFrom);
    const toDateObj = dateTo === "all" || dateTo === "" ? null : new Date(dateTo);

    const dateInRange = (!fromDateObj || dateObj >= fromDateObj) && (!toDateObj || dateObj <= toDateObj);

    return warehouseMatch && categoryMatch && itemMatch && dateInRange && customerMatch;
  });

  setFilteredTransfers(result); // Only updates on Apply
};

useEffect(()=>{
  applyfilter();
},[sales])
   


    
     // Export to PDF function
const handlePdfDownload = () => {
  if (!saleItems.length) {
    alert("No data to download!");
    return;
  }

  const doc = new jsPDF();

  doc.text("Seller Points Report", 14, 15);

  const tableColumn = ["Sale Code", "Customer", "Item", "Category", "Date", "Seller Points"];
  const tableRows = saleItems.map(item => [
    item.saleCode,
    item.customerName,
    item.item?.itemName,
    item.item?.category.name,
    new Date(item.saleDate).toLocaleDateString(),
    (item.item?.sellerPoints || 0) * (item.qty || 1),
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 20,
  });

  doc.save('seller-points-report.pdf');
};
              
              // Export to Excel function
          
const exportToExcel = () => {

  if (!saleItems.length) {
    alert("No data to download!");
    return;
  }

  // Flatten the nested data for easier sheet conversion
  const flattenedData = saleItems.map(item => ({
    'Sale Code': item.saleCode,
    'Customer Name': item.customerName,
    'Item Name': item.item?.itemName,
    'Category': item.item?.category.name,
    'Date': new Date(item.saleDate).toLocaleDateString(),
    'Seller Points': (item.item?.sellerPoints || 0) * (item.qty || 1),
  }));

  // Create a new worksheet from the flattened data
  const worksheet = XLSX.utils.json_to_sheet(flattenedData);

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Append the worksheet to the workbook with a name
  XLSX.utils.book_append_sheet(workbook, worksheet, "Seller Points Report");

  // Trigger the download
  XLSX.writeFile(workbook, 'seller-points-report.xlsx');
};



    
  useEffect(() => {
    console.log(filteredTransfers)
  const mappedItems = filteredTransfers.flatMap(sale => 
    sale.items.filter(item => item.item?.sellerPoints > 0).map(item => ({
      saleCode: sale.saleCode,
      ...item,
      saleId: sale._id,
      saleDate: sale.createdAt,
      customerName: sale.customer?.customerName || 'N/A',
    }))
  );

const totalSellerPoints = mappedItems.reduce((sum, item) => {
  const points = (item.item?.sellerPoints || 0) * (item.qty || 1);
  return sum + points;
}, 0);

        const sum = filteredTransfers.reduce((acc, curr) => acc + (curr.amount || 0), 0);
        setTotal(totalSellerPoints);
  setSaleItems(mappedItems);
}, [filteredTransfers]);



    return (
        <div className="flex flex-col flex-1 overflow-y-auto">
            <main className="flex-grow p-4 space-y-6 bg-gray-100 sm:p-6">
                {/* Page Header */}
                <header className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 sm:text-3xl">Seller Points Report</h1>
                        <nav className="flex items-center mt-1 text-sm text-gray-500" aria-label="Breadcrumb">
                            <NavLink to="/dashboard" className="flex items-center hover:text-blue-600"><HomeIcon className="w-4 h-4" /> <span className="hidden ml-1 sm:inline">Home</span></NavLink>
                            <ChevronRightIcon /><span>Reports</span><ChevronRightIcon />
                            <span className="font-medium text-gray-600">Seller Points</span>
                        </nav>
                    </div>
                </header>
                {
                  pop  && (
                    <SaleBillItemsPopup sale={selectedSale} onClose={() => setPop(false)} />
                  )
                }

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
                                   <Select className='w-full' options={options.warehouses} onChange={(option)=>setSelectedWarehouse(option.value)} value={options.warehouses.find(option => option.value===selectedWarehouse)}/>
                                </div>

                                 <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">Customers</label>
                                   <Select className='w-full' options={options.customers} onChange={(option)=>setSelectedCustomer(option.value)} value={options.customers.find(option => option.value===selectedCustomer)}/>
                                </div>
                                <div>
                                    <label className="block mb-1 text-sm font-medium text-gray-600">Category</label>
                                    <Select className='w-full' options={options.categories} onChange={(option)=>setCategory(option.value)} value={options.categories.find(option => option.value===category) || null}/>
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
                            <div className="flex justify-end mt-6">
                <button 
                    onClick={applyfilter} 
                    className="px-5 py-2 font-semibold text-white transition-colors duration-200 rounded-md bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500"
                >
                    Apply Filter
                </button>
            </div>
                        </div>
                    )}
                </div>

                {/* Records Section */}
                <div className="pb-20 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-700">Records</h3>
                        <div className="relative">
                            <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                <DownloadIcon className="w-4 h-4" />
                                <span className="hidden sm:inline">Export</span>
                                <ChevronDownIcon className="hidden w-4 h-4 sm:inline" />
                            </button>
                            {showExportDropdown && (
                                <div className="absolute right-0 z-10 w-40 mt-2 bg-white rounded-md shadow-lg" onMouseLeave={() => setShowExportDropdown(false)}>
                                    <button onClick={exportToExcel} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><ExcelIcon /> Excel</button>
                                    <button onClick={() => handlePdfDownload()} className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"><PdfIcon /> PDF</button>
                                </div>
                            )}
                        </div>
                    </div>
               <div className="overflow-x-auto">
  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
    <thead className="text-white bg-blue-500">
      <tr>
        <th className="py-3 text-xs font-medium tracking-wider text-center text-white uppercase">
          #
        </th>
        <th className="py-3 text-xs font-medium tracking-wider text-center text-white uppercase ">
          Date
        </th>
        <th className="py-3 text-xs font-medium tracking-wider text-center text-white uppercase ">
          Item Name
        </th>
         <th className="px-2 py-3 text-xs font-medium tracking-wider text-center text-white uppercase">
          SellerPoints
        </th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-200">
      {/* Example of looping through data in JSX */}
      {!loading && saleItems.length > 0 && saleItems.map((item, index) =>
      {

      if(item.item === null || item.item === undefined || item.item.SellerPoints<=0) {
        return null; 
      }
     return (
        <tr key={`${item.saleId}-${index}`}>
          <td className="px-2 py-4 text-sm text-center text-gray-800 border-1">{index+1}</td>
          <td className="px-2 py-4 text-sm text-center text-gray-800">{new Date(item.saleDate).toLocaleDateString()}</td>
          <td className="px-2 py-4 text-sm text-center text-gray-800">{item.item?.itemName}</td>
          <td className="px-2 py-4 text-sm font-medium text-center text-gray-800">{item.item.sellerPoints}</td>
        </tr>
      )})}

      {/* Loading State */}
      {loading && (
        <tr>
          <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
            Loading...
          </td>
        </tr>
      )}

      {/* No Records State */}
      {!loading && saleItems.length === 0 && (
        <tr>
          <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
            No records found
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>
                
                </div>
                {/* Sticky Footer for Mobile */}
                <div className="fixed bottom-0 left-0 right-0 items-center justify-between hidden p-4 bg-white border-t border-gray-200 md:flex">
                    <span className="text-sm font-medium text-gray-600"></span>
                    <span className="text-xl font-bold text-gray-900"><span className="text-sm font-medium text-gray-600">Total SellerPoints:</span> {total.toFixed(2)}</span>
                </div> 
                {/* Sticky Footer for Mobile */}
                <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between p-4 bg-white border-t border-gray-200 md:hidden">
                    <span className="text-sm font-medium text-gray-600">Total SellerPoints:</span>
                    <span className="text-xl font-bold text-gray-900">{total.toFixed(2)}</span>
                </div>
            </main>
            {/* Barcode Scanner Modal */}
            {scanning && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black bg-opacity-75">
                    <div className="relative w-full max-w-sm overflow-hidden rounded-lg h-72">
                        <video ref={videoRef} className="absolute object-cover w-full h-full" autoPlay muted playsInline />
                        <div className="absolute w-full h-1 bg-red-500 animate-scan" />
                    </div>
                    <button onClick={() => setScanning(false)} className="px-4 py-2 mt-6 text-white bg-red-600 rounded hover:bg-red-700">Cancel</button>
                </div>
            )}
        </div>
    );
};

// --- Main App Component to render the page ---
export default function App() {
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
                <SellerPoints />
                {/* Add padding to the bottom of the content to avoid overlap with the sticky footer */}
                <div className="h-16 mb-16 bg-black md:hidden shrink-0"></div>
            </div>
             {isSidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"></div>}
        </div>
    );
}
