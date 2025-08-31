
import { useState,useEffect } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import MetricCard from "./MetricCard";
import Card from "./Card";
import axios from "axios";
import Select from "react-select";
import { FaCube,FaRegCalendarAlt ,FaMinusSquare,FaFileAlt,FaUsers,FaTruck,FaBriefcase,FaShoppingCart} from 'react-icons/fa';
// import BarChartComponent from "./BarChart";
// import TrendingItemsDonut from "./PieChart";
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { useLocation } from "react-router-dom";
import BluetoothConnector from "../../pages/BluetoothDevicesPage";
import Print from "./Print";
const Dashboard = () => {

   const [print,setPrint]=useState(null);
   const location = useLocation();
   const today = new Date().toISOString().slice(0, 10);
  useEffect(() => {
    const backListener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      // If there is no navigation history, close the app
      if (!canGoBack || location.pathname === "/dashboard") {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      backListener.remove();
    };
  }, [location]);


 
  const navigate = useNavigate();
  const link="https://pos.inspiredgrow.in/vps"
   const[data,setData]=useState([])
   const[items,setItems]=useState([])
   const[lowStock,setLowStock]=useState([])
   const[totalSale,setTotalSale]=useState(0)
   const[cashSale,setCashSale]=useState(0)
   const[bankSale,setBankSale]=useState(0)
   const[sales,setSales]=useState([])
   const[searchTerm,setSearchTerm]=useState("")
   const[entriesPerPage,setEntriesPerPage]=useState(10)
   const[currentPage,setCurrentPage]=useState(1)
   const [isSidebarOpen, setSidebarOpen] = useState(true);
   const[active,setActive]=useState("today")
   const [paymentTypes, setPaymentTypes] = useState([]);
     const [editPaymentModal, setEditPaymentModal] = useState(false);
     const [selectedInvoice, setSelectedInvoice] = useState(null);
     const [newPaymentType, setNewPaymentType] = useState(null);
    const [loading,setLoading] = useState(false);
  const [localPermissions, setLocalPermissions] = useState([]);
 const [actionMenu, setActionMenu] = useState(null);
   const [device,setDevice] = useState(false);
   const [selectedDate, setSelectedDate] = useState(""); // store date string YYYY-MM-DD

  const userRole = (localStorage.getItem("role") || "guest").toLowerCase();
  const isAdmin = userRole === "admin";




   useEffect(() => {
    const storedPermissions = localStorage.getItem("permissions");
    if (storedPermissions) {
      try {
        setLocalPermissions(JSON.parse(storedPermissions));
      } catch (error) {
        console.error("Error parsing permissions:", error);
        setLocalPermissions([]);
      }
    } else {
      setLocalPermissions([]);
    }
  }, []);

 const hasPermissionFor = (module, action) => {
    if (isAdmin) return true;
    return localPermissions.some(
      (perm) =>
        perm.module.toLowerCase() === module.toLowerCase() &&
        perm.actions.map((a) => a.toLowerCase()).includes(action.toLowerCase())
    );
  };


   
   useEffect(()=>{
    if(window.innerWidth < 768){
      setSidebarOpen(false)
    }
  },[window.innerWidth])
  
  const fetchDashboardSummary = async () => {
    try {
      const response = await axios.get(
        `${link}/api/dashboard-summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );
      setData(response.data.data); 
    } catch (err) {
      console.log(err.message);
    } 
  };


  
  const fetchRecentlyAdded = async () => {
    try {
      const response = await axios.get(
        `${link}/api/items/summary`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );
      setItems(response.data.data); 
    } catch (err) {
      console.log(err.message);
    } 
  };
  
  const fetchStockAlert = async () => {
    try {
      const response = await axios.get(
        `${link}/api/items/low-stock?threshold=10`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          }
        }
      );
      // Replace with actual API URL
      
      // console.log(response.data)
      setLowStock(response.data.data); 
    } catch (err) {
      console.log(err.message);
    } 
  };
  

  const fetchSale = async () => {
  try {
    const response = await axios.get(`${link}/api/pos/club`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      }
    });
  console.log(response)
   setSales(response.data.data);
  } catch (err) {
    console.error("Fetch Error:", err.message);
  }
};



  const handleEditPaymentType = (inv) => {
    const saleDate = new Date(inv.saleDate).toISOString().slice(0, 10);
    console.log(`Checking edit payment type for invoice ${inv._id}: saleDate=${saleDate}, today=${today}`);
    if (saleDate !== today) {
      alert("Editing payment type is only allowed for invoices from today.");
      return;
    }
    setSelectedInvoice(inv);
    setNewPaymentType(null);
    setEditPaymentModal(true);
  };

  // Save new payment type
    const savePaymentType = async () => {
      if (!newPaymentType) {
        alert("Please select a payment type.");
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const endpoint = selectedInvoice.source === "Sale"
          ? `${link}/api/sales/${selectedInvoice._id}/paymentType`
          : `${link}/api/pos/${selectedInvoice._id}/paymentType`;
        await axios.put(endpoint, { paymentType: newPaymentType.value }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setEditPaymentModal(false);
        setSelectedInvoice(null);
        setNewPaymentType(null);
        await fetchSale();
      } catch (error) {
        console.error("Error updating payment type:", error.message);
        alert(`Failed to update payment type: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    
    const fetchPaymentTypes = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found for payment types");
      return;
    }
    try {
      const response = await axios.get(`${link}/api/payment-types`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.data) {
        const formattedPaymentTypes = response.data.data.map(pt => ({
          label: pt.paymentTypeName,
          value: pt._id,
        }));
        setPaymentTypes(formattedPaymentTypes);
        console.log("Fetched payment types:", formattedPaymentTypes);
      }
    } catch (error) {
      console.error("Error fetching payment types:", error.message);
    }
  };
   useEffect(()=>
    {
      fetchSale();
      fetchDashboardSummary();
     // fetchRecentlyAdded();
      // fetchStockAlert();
      fetchPaymentTypes();
    },[])
   
// Filter the data based on search term
const filteredData = lowStock.filter(item => {
  const searchTermLower = searchTerm.toLowerCase();
  return item.itemName?.toLowerCase().includes(searchTermLower);
});

// Pagination calculations
const indexOfLastItem = currentPage * entriesPerPage;
const indexOfFirstItem = indexOfLastItem - entriesPerPage;
const totalPages = Math.ceil(filteredData.length / entriesPerPage);

// Get current page's items
const currentUsers = filteredData.slice(indexOfFirstItem, indexOfLastItem);

// Handle page change
const handlePageChange = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages) {
    setCurrentPage(newPage);
  }
};

// Handle change in entries per page dropdown/input
const handleEntriesChange = (e) => {
  setEntriesPerPage(Number(e.target.value));
  setCurrentPage(1); // Reset to first page when entries per page changes
};


    const handleCopy = () => {
        const data = currentPage.map(item => `${item.itemName}, ${item.category?.name}, ${item.brand?.brnadName}`).join('\n');
        navigator.clipboard.writeText(data);
        alert("Data copied to clipboard!");
    };

    const handleExcelDownload = () => {
        const ws = XLSX.utils.json_to_sheet(lowStock);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "LowStock");
        XLSX.writeFile(wb, "low_stock.xlsx");
    };

    const handlePdfDownload = () => {
        const doc = new jsPDF();
        doc.text("Low Stock List", 20, 20);
        const tableData = lowStock.map((item,index) => [index+1,item.itemName, item.category?.name, item.brand?.brandName]);
        autoTable(doc, {
            head: [['#','Item Name','Category Name','Brand Name']],
            body: tableData,
        });
        doc.save('lowStock.pdf');
    };

    const handlePrint = () => {
        window.print();
    };

    const handleCsvDownload = () => {
        const csvContent = "data:text/csv;charset=utf-8," + lowStock.map(item => Object.values(item).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "low_stock.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    useEffect(()=>{
     const invoices=sales;
      const period = active; // 'today', 'weekly', 'monthly', 'yearly', or 'all'
        const now = new Date();
  let start = null;
    console.log("active",invoices)
  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'weekly':
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay()); // Sunday as start
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'all':
      start = null; // don't filter by date
      break;
    default:
      throw new Error('Invalid period');
  }

  let totalSale = 0;
  let cashSale = 0;
  let bankSale = 0;

  invoices.forEach(inv => {
    const date = new Date(inv.createdAt);
    if (!start || date >= start) {
      const amount = inv.totalAmount || inv.grandTotal || 0;
      const p = inv.payments?.[0];
      const name = p?.paymentType?.paymentTypeName;
      const paymentAmount = p?.amount || p?.paymentAmount || 0;

      totalSale += amount;
      if (name === 'Cash') cashSale += paymentAmount;
      if (name === 'Bank') bankSale += paymentAmount;
    }
  });
   setTotalSale(totalSale.toFixed(2));
   setCashSale(cashSale);
   setBankSale(bankSale.toFixed(2));
    },[active])


    //for action menu functionality in recent sale
    const handleViewSales = (inv) => {
    navigate(`/view-sale?id=${inv._id}&source=${inv.source}`);
  };

  const handleEdit = (inv) => {
    const created = new Date(inv.saleDate);
    const now = new Date();
    const diffDays = (now - created) / (1000*60*60*24);
    if (diffDays > 2) {
      return alert("You can only edit invoices up to 7 days old.");
    }
    if (inv.source === "Sale") {
      navigate(`/add-sale?id=${inv._id}`);
    } else {
      navigate(`/pos-main?id=${inv._id}`);
    }
  };

  const handleViewPayments = (inv) => {
    navigate(`/view-payment?saleId=${inv._id}`);
  };
  
   const handleDownloadPDF = async (inv) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No token found, please log in");
        navigate('/login');
        return;
      }

      const endpoint = inv.source === "Sale" 
        ? `${link}/api/sales/${inv._id}` 
        : `${link}/api/pos/${inv._id}`;
      const { data } = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const paymentsResponse = await axios.get(`${link}/api/payments/${inv._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payments = paymentsResponse.data.payments || [];

      generateInvoicePDF(data, payments, inv.source);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert(`Failed to generate PDF: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Generate PDF for the invoice and open in new tab
    const generateInvoicePDF = (invoice, payments, source) => {
      const doc = new jsPDF();
  
      doc.setFontSize(20);
      doc.text("Invoice", 14, 20);
      doc.setFontSize(12);
      doc.text(`Invoice #: ${invoice.saleCode || 'N/A'}`, 14, 30);
      doc.text(`Date: ${new Date(invoice.saleDate).toLocaleDateString()}`, 14, 38);
      doc.text(`Source: ${source}`, 14, 46);
  
      doc.setFontSize(14);
      doc.text("Customer Information", 14, 60);
      doc.setFontSize(12);
      doc.text(`Name: ${invoice.customer?.customerName || 'N/A'}`, 14, 70);
      doc.text(`Mobile: ${invoice.customer?.mobile || 'N/A'}`, 14, 78);
      const addrObj = invoice.customer?.address || {};
      const addrStr = [
        addrObj.street,
        addrObj.city,
        addrObj.state,
        addrObj.zip,
        addrObj.country
      ].filter(part => part).join(', ');
      doc.text(`Address: ${addrStr || 'N/A'}`, 14, 86);
  
      doc.setFontSize(14);
      doc.text("Items", 14, 100);
      const items = invoice.items || [];
      const itemRows = items.map(item => [
        item.item?.itemName || 'N/A',
        item.quantity || 0,
        `Rs. ${(item.unitPrice || item.price || 0).toFixed(2)}`,
        `Rs. ${(item.discount || 0).toFixed(2)}`,
        `Rs. ${(item.subtotal || ((item.unitPrice || item.price || 0) * (item.quantity || 0) - (item.discount || 0))).toFixed(2)}`,
      ]);
  
      autoTable(doc, {
        startY: 106,
        head: [['Item Name', 'Quantity', 'Unit Price', 'Discount', 'Subtotal']],
        body: itemRows,
        theme: 'striped',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 123, 255] },
      });
  
      let finalY = doc.lastAutoTable.finalY || 106;
      doc.setFontSize(12);
      doc.text(`Subtotal: Rs. ${(invoice.subtotal || invoice.totalAmount || 0).toFixed(2)}`, 14, finalY + 10);
      if (invoice.discountOnBill || invoice.totalDiscount) {
        doc.text(`Discount: Rs. ${(invoice.discountOnBill || invoice.totalDiscount || 0).toFixed(2)}`, 14, finalY + 18);
      }
      doc.text(`Grand Total: Rs. ${(invoice.grandTotal || invoice.totalAmount || 0).toFixed(2)}`, 14, finalY + 26);
  
      if (payments.length > 0) {
        finalY = finalY + 34;
        doc.setFontSize(14);
        doc.text("Payments", 14, finalY);
        const paymentRows = payments.map(payment => [
          new Date(payment.paymentDate).toLocaleDateString(),
          payment.paymentType?.paymentTypeName || 'N/A',
          `Rs. ${(payment.amount || payment.paymentAmount || 0).toFixed(2)}`,
          payment.paymentNote || '-',
        ]);
  
        autoTable(doc, {
          startY: finalY + 6,
          head: [['Date', 'Payment Type', 'Amount', 'Note']],
          body: paymentRows,
          theme: 'striped',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [0, 123, 255] },
        });
  
        finalY = doc.lastAutoTable.finalY;
        const totalPaid = payments.reduce((sum, p) => sum + (p.amount || p.paymentAmount || 0), 0);
        doc.setFontSize(12);
        doc.text(`Total Paid: Rs. ${totalPaid.toFixed(2)}`, 14, finalY + 10);
        const dueAmount = (invoice.grandTotal || invoice.totalAmount || 0) - totalPaid;
        doc.text(`Due Amount: Rs. ${dueAmount.toFixed(2)}`, 14, finalY + 18);
      }
  
      finalY = payments.length > 0 ? finalY + 26 : finalY + 34;
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("Thank you for your business!", 14, finalY + 10);
      doc.text("Generated by Grocery on Wheels", 14, finalY + 16);
  
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
    };
    
    

const generatePlainTextReceipt = (data) => {
  const store = {
    logo:      "/logo/inspiredgrow.jpg",
    storeName: "Grocery on Wheels",
    tagline:   "GROCERY ON WHEELS",
    address:   "Basement 210-211 new Rishi Nagar near\nShree Shyam Baba Mandir Gali No. 9,Hisar-125001",
    gst:       "06AAGCI0630K1ZR",
    phone:     "9050092092",
    email:     "INSPIREDGROW@GMAIL.COM",
  };

  const lineWidth = 42;
  const line      = "-".repeat(lineWidth) + "\n";

  /* ---------- helpers ---------- */
  const padRight = (str, len, ch = " ") => (String(str) + ch.repeat(len)).substring(0, len);
  const padLeft  = (str, len, ch = " ") => (ch.repeat(len) + String(str)).slice(-len);

  const wrapText = (txt, width) => {
    if (!txt || width <= 0) return [""];
    const words = txt.split(" ");
    const out   = [];
    let row = "";
    words.forEach(w => {
      if ((row + " " + w).trim().length <= width) {
        row = (row ? row + " " : "") + w;
      } else {
        if (row) out.push(row);
        row = w;
      }
    });
    if (row) out.push(row);
    return out;
  };

  const centerText = (txt) => {
    const space = Math.max(0, Math.floor((lineWidth - txt.length) / 2));
    return " ".repeat(space) + txt;
  };

  const twoColumn = (left, right) =>
    left + " ".repeat(Math.max(0, lineWidth - left.length - right.length)) + right;

  /* ---------- column widths ---------- */
const col = { sno: 3, item: 13, qty: 4, mrp: 7, rate: 7, total: 8 }; // still 42

  /* ---------- row formatter ---------- */
  
const formatItemRow = (item, idx) => {
  const lines = wrapText(item.item.itemName, col.item).slice(0, 4); // up to 4 lines
  let txt = '';
  lines.forEach((ln, i) => {
    if (i === 0) {
      txt += padRight(idx + 1, col.sno) +
             padRight(ln,        col.item) +
             padLeft (item.quantity,               col.qty)   +
             padLeft (Number(item.item.mrp).toFixed(2),  col.mrp)  +
             padLeft (Number(item.price).toFixed(2),     col.rate) +
             padLeft ((item.quantity * item.price).toFixed(2), col.total) + '\n';
    } else {
      txt += padRight('', col.sno) +
             padRight(ln, col.item) +
             padLeft('', col.qty)  +
             padLeft('', col.mrp)  +
             padLeft('', col.rate) +
             padLeft('', col.total) + '\n';
    }
  });
  return txt;
};


  /* ---------- build receipt ---------- */
  let text = "";

  text += centerText(data.warehouse.warehouseName) + "\n";
  store.address.split("\n").forEach(l => text += centerText(l) + "\n");
  text += line;

  text += twoColumn(`Date: ${data.saleDate.substring(0, 10)}`,
                    `Time: ${data.saleDate.substring(11, 16)}`) + "\n";
  text += `Customer: ${data.customer?.customerName || "walk-in customer"}\n`;
  text += line;

  text += padRight("#", col.sno) +
          padRight("Item", col.item) +
          padLeft ("Qty",  col.qty)  +
          padLeft ("MRP",  col.mrp)  +
          padLeft ("Rate", col.rate) +
          padLeft ("Total",col.total) + "\n";

  data.items.forEach((it, i) => text += formatItemRow(it, i));
  text += line;

  const totalQty   = data.items.reduce((s, it) => s + it.quantity, 0);
  const totalMRP   = data.items.reduce((s, it) => s + it.quantity * it.item.mrp,        0);
  const totalSale  = data.items.reduce((s, it) => s + it.quantity * it.item.salesPrice, 0);
  const taxAmt     = data.taxAmount   || 0;
  const otherChg   = data.otherCharges || 0;
  const paid       = data.payments.reduce((s, p) => s + p.amount, 0);
  const prevDue    = data.previousBalance || 0;
  const grandTotal = totalSale + taxAmt + otherChg;
  const totalDue   = prevDue + grandTotal - paid;

  const sumLine = (lbl, val) => `${padRight(lbl, 34)}${padLeft(val.toFixed(2), 8)}\n`;

  text += `${padRight("Total Quantity:", 34)}${padLeft(totalQty, 8)}\n`;
  text += sumLine("Before Tax:",      totalMRP);
  text += sumLine("Total Discount:",  totalMRP - totalSale);
  text += sumLine("Net Before Tax:",  totalSale);
  text += sumLine("Tax Amount:",      taxAmt);
  text += sumLine("Other Charges:",   otherChg);
  text += sumLine("Total:",           grandTotal);
  text += sumLine("Paid Payment:",    paid);
  text += sumLine("Previous Due:",    prevDue);
  text += sumLine("Total Due:",       totalDue);
  text += line;

  data.payments.forEach(p =>
    text += `Payment Type: ${p.paymentType.paymentTypeName} ₹${p.amount.toFixed(2)}\n`
  );
  text += line;

  text += centerText("------Thank You & Visit Again!------") + "\n\n\n";
  console.log(text);
  return text;
};


    // --- Action Handlers ---
   const handleBluetoothPrint = (sale) => {
  try {
    setLoading(true);

    const printinfo = generatePlainTextReceipt(sale);
    console.log(printinfo);

    window.bluetoothSerial.isConnected(
      () => {
        // ✅ Device is connected, proceed with print
        window.bluetoothSerial.write(
          printinfo,
          () => alert('✅ Print success'),
          (failure) => alert(`❌ Print failed: ${failure}`)
        );
      },
      () => {
        // ❌ No device connected
       setDevice(true);
      }
    );

  } catch (error) {
    console.error("Bluetooth print error:", error);
    alert("❌ Unexpected error occurred.");
  } finally {
    setLoading(false);
  }
};


  const handleDelete = async (id, source) => {
    const conf = window.confirm("Do you want to delete this sale?");
    if (!conf) {
      return;
    }
    setLoading(true);
    try {
      const endpoint = source === "POS" ? `${link}/api/pos/${id}` : `${link}/api/sales/${id}`;
      await axios.delete(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      alert("Deleted Successfully");
    } catch (error) {
      console.error(error.message);
      alert(`Error deleting: ${error.message}`);
    } finally {
      fetchSale();
      setLoading(false);
    }
  };

if(print) return <Print print={print} setPrint={setPrint} />

  return (
    <div className="flex flex-col ">
    {/* Navbar */}
    <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
        {/* Main Content */}
        <div className="box-border flex min-h-screen bg-gray-400">
          {/* Sidebar */}
          
        {/* Sidebar component with open state */}
          <div className="w-auto">
        <Sidebar isSidebarOpen={isSidebarOpen} />
            
          </div>
          
          {
                  device && <BluetoothConnector setDevice={setDevice} />
                } 

       
    <div className="flex flex-col w-full px-2 py-2 mx-auto overflow-x-auto bg-gray-200">


         {/* //Heading */}
         <header className="text-2xl font-semibold text-gray-700">DashBoard</header>
          
          
          
          {/* Set Day Buttons */}
         <div className="flex justify-end w-full mt-2">
         <button className={`px-2 py-2 border rounded-l-md ${active==="today"?"bg-cyan-500 text-white":"bg-blue-400"}`}  onClick={()=>setActive("today")}>Today</button>
  <button className={`px-2 py-2 border  ${active==="weekly"?"bg-cyan-500 text-white":"bg-blue-400"}`} onClick={()=>setActive("weekly")} onCLick={()=>setActive("weekly")}>Weekly</button> 
  <button className={`px-2 py-2 border  ${active==="monthly"?"bg-cyan-500 text-white":"bg-blue-400"}`} onClick={()=>setActive("monthly")}onCLick={()=>setActive("monthly")}>Monthly</button> 
  <button className={`px-2 py-2 border  ${active==="yearly"?"bg-cyan-500 text-white":"bg-blue-400"}`} onClick={()=>setActive("yearly")}onCLick={()=>setActive("yearly")}>Yearly</button> 
  <button className={`px-3 py-2 border rounded-r-md ${active==="all"?"bg-cyan-500 text-white":"bg-blue-400"}`} onClick={()=>setActive("all")}onCLick={()=>setActive("all")}>All</button> 
        </div>
<div className="w-full px-4 py-2">



    <div className="flex gap-3 mb-4">
    {
      hasPermissionFor("posorders","add") &&(
        <button
       onClick={() => navigate('/pos-main')}
      className="w-full h-12 text-white transition-transform duration-150 shadow rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105"
    >
      POS
    </button>
      )
    } 
  </div>
  
  {/* Shortcut Buttons */}
  <div className="flex gap-3 mb-4 ">
    {
      hasPermissionFor("report","View") &&(
        <button
       onClick={() => navigate('/reports/club-bill')}
      className="w-full h-12 text-white transition-transform duration-150 shadow rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105"
    >
      Club Bill
    </button>
      )
    }
   {
    hasPermissionFor("sales","View") && (
       <button
     onClick={() => navigate('/sale-list')}
      className="w-full h-12 text-white transition-transform duration-150 shadow rounded-xl bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105"
    >
      Sales List
    </button>
    )
   }
   
  </div>



   <div className="flex gap-3 mb-4 ">
     {hasPermissionFor("stocktransfers","Add") && (
       <button
       onClick={() => navigate('/stock-main')}
       className="w-full h-12 text-white transition-transform duration-150 shadow rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:scale-105"
       >
      Stock Transfer
    </button>
    )}
      {
        hasPermissionFor("accounts", "View") && (

          <button
          onClick={() => navigate('/account-list1')}
          className="w-full h-12 text-white transition-transform duration-150 shadow rounded-xl bg-gradient-to-r from-pink-500 to-red-500 hover:scale-105"
          >
      Account List
    </button>
    )
    }
  </div>

  {/* Metric Cards Grid */}
  <div className="grid grid-cols-2 gap-3">
    <MetricCard
      title="Total Sales"
      value={totalSale || '0'}
      icon={FaCube}
      className="flex flex-col justify-between h-24 p-3 text-white shadow rounded-xl bg-gradient-to-r from-purple-600 to-pink-500"
    />
    <MetricCard
      title="Seller Points"
      value={'0'}
      icon={FaRegCalendarAlt}
      className="flex flex-col justify-between h-24 p-3 text-white shadow rounded-xl bg-gradient-to-r from-orange-500 to-pink-600"
    />
    <MetricCard
      title="Cash Sales"
      value={cashSale?.toFixed(2) || '0'}
      icon={FaRegCalendarAlt}
      className="flex flex-col justify-between h-24 p-3 text-white shadow rounded-xl bg-gradient-to-r from-green-500 to-emerald-500"
    />
    <MetricCard
      title="Bank Sales"
      value={bankSale || '0'}
      icon={FaCube}
      className="flex flex-col justify-between h-24 p-3 text-white shadow rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500"
    />
  </div>
</div>


  <div className="flex flex-col ">
    <div className="flex items-center justify-between p-4 bg-white border-t-4 border-blue-700 rounded-t-lg">
  <h2 className="text-xl font-semibold">Recent Sales Invoices</h2>
  <input
    type="date"
    value={selectedDate}
    onChange={(e) => setSelectedDate(e.target.value)}
    className="px-3 py-1 text-sm border rounded"
  />
</div>
    <div className="w-full overflow-x-auto border border-gray-200 rounded-b-md ">
     {(()=>{
       
        const filteredSales = sales
  .filter((item) => {
    const saleDate = item.createdAt?.slice(0, 10); // format: YYYY-MM-DD
    if (!selectedDate) {
      const today = new Date().toISOString().slice(0, 10);
      return saleDate === today;
    }
    return saleDate === selectedDate;
  })
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 10);
         
     return ( <table className="w-full bg-white">
  <thead>
    <tr className="text-center bg-gray-100">
      <th className="text-sm text-center border-b">Sl.No</th>
      <th className="text-sm text-center border-b">Total</th>
      <th className="text-sm text-center border-b">Status</th>
    </tr>
  </thead>
  <tbody>
    {filteredSales.length > 0 ? (
      filteredSales
        .map((item, index) => (
          <tr key={item._id}>
            {/* Serial Number */}
           <td className="relative text-sm text-center border-b">
  <span
    className="text-blue-600 cursor-pointer hover:underline"
    onClick={() => setActionMenu(actionMenu === item._id ? null : item._id)}
  >
    {item.saleCode}
  </span>

  {actionMenu === item._id && (
    <div className="absolute right-0 z-50 w-48 mt-1 bg-white border rounded shadow-lg">
     
      <button
        className="w-full px-3 py-2 text-left text-blue-500 hover:bg-gray-100"
         onClick={() => { handleViewSales(item); setActionMenu(null); }}
      >
        📄 View Sales
      </button>
      <button
        className="w-full px-3 py-2 text-left text-green-500 hover:bg-gray-100"
         onClick={() => { handleEdit(item); setActionMenu(null); }}
      >
        ✏️ Edit
      </button>
      <button
        className="w-full px-3 py-2 text-left text-teal-500 hover:bg-gray-100"
         onClick={() => { handleEditPaymentType(item); setActionMenu(null); }}
      >
        💵 Edit Payment Type
      </button>
      <button
        className="w-full px-3 py-2 text-left text-purple-500 hover:bg-gray-100"
         onClick={() => { handleViewPayments(item); setActionMenu(null); }}
      >
        💳 View Payments
      </button>
      <button
        className="w-full px-3 py-2 text-left text-indigo-500 hover:bg-gray-100"
         onClick={() => { handleDownloadPDF(item); setActionMenu(null); }}
      >
        📥 PDF
      </button>
      <button
        className="w-full px-3 py-2 text-left text-blue-500 hover:bg-gray-100"
         onClick={() => { handleBluetoothPrint(item); setActionMenu(null); setPrint(item)}}
      >
        📄 Print
      </button>
      <button
        className="w-full px-3 py-2 text-left text-red-500 hover:bg-gray-100"
         onClick={() => { handleDelete(item._id, item.source); setActionMenu(null); }}
      >
        🗑️ Delete
      </button>
    </div>
  )}
</td>

            {/* Total */}
            <td className="text-sm text-center border-b">
              {item.totalAmount || "0"}
            </td>

            {/* Status */}
            <td
              className="px-2 py-2 text-sm text-center border-b cursor-pointer"
              onClick={() => handleEditPaymentType(item)}
            >
              <span
                className={`inline-block px-2 py-1 text-xs font-semibold rounded
                  ${
                    item.payments[0]?.paymentType?.paymentTypeName === "Cash"
                      ? "bg-green-100 text-green-800"
                      : item.payments[0]?.paymentType?.paymentTypeName === "Bank"
                      ? "bg-blue-100 text-blue-800"
                      : item.payments[0]?.paymentType?.paymentTypeName === "Hold"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
              >
                {item.payments[0]?.paymentType?.paymentTypeName || "N/A"}
              </span>
            </td>
          </tr>
        ))
    ) : (
      <tr>
        <td
          colSpan="3"
          className="px-4 py-4 text-sm text-center text-gray-500"
        >
          No Data Available
        </td>
      </tr>
    )}
  </tbody>
</table>)
      
     })()}


     
     

       {editPaymentModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="w-full max-w-md p-6 bg-white rounded-lg">
                <h2 className="mb-4 text-lg font-semibold">Edit Payment Type</h2>
                <p className="mb-4 text-sm text-gray-600">
                  Invoice: {selectedInvoice.saleCode} ({selectedInvoice.source})
                </p>
                <label className="block mb-2 font-semibold text-gray-700">
                  Select Payment Type
                </label>
                <Select
                  options={paymentTypes}
                  value={newPaymentType}
                  onChange={setNewPaymentType}
                  placeholder="Choose payment type"
                  className="mb-4"
                />
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2 text-sm text-gray-600 bg-gray-200 rounded hover:bg-gray-300"
                    onClick={() => {
                      setEditPaymentModal(false);
                      setSelectedInvoice(null);
                      setNewPaymentType(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2 text-sm text-white rounded bg-cyan-500 hover:bg-cyan-600"
                    onClick={savePaymentType}
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
    </div> 
  </div>

{/* //Metric Show       */} 
{/* <div className="grid w-full grid-cols-1 gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <MetricCard
    title="Purchase Due"
    // value={data.purchaseDue}
    value={data?.purchaseDue || '0'}
    icon={FaCube}
    className="flex items-center justify-between w-full p-4 text-white shadow-md rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 h-28"
  />
  <MetricCard
    title="Sales Due"
    value={data?.salesDue || '0'}
    icon={FaRegCalendarAlt}
    className="flex items-center justify-between w-full p-4 text-white shadow-md rounded-xl bg-gradient-to-r from-orange-500 to-pink-600 h-28"
  />
  <MetricCard
    title="Sales"
    value={data?.totalSales || '0'}
    icon={FaFileAlt}
    className="flex items-center justify-between w-full p-4 text-white shadow-md rounded-xl bg-gradient-to-r from-green-500 to-cyan-400 h-28"
  />
  <MetricCard
    title="Expense"
    value={data?.totalExpense || '0'}
    icon={FaMinusSquare}
    className="flex items-center justify-between w-full p-4 text-white shadow-md rounded-xl bg-gradient-to-r from-blue-900 to-sky-500 h-28"
  />
</div>  */}

{/* Card */}
<div className="grid grid-cols-1 gap-4 mt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  <Card title="Customers" value={data?.customerCount || '0'} icon={FaUsers} />
  <Card title="Suppliers" value={data?.supplierCount || '0'} icon={FaTruck} />
  <Card title="Purchases" value={data?.purchaseCount || '0'} icon={FaBriefcase} />
  <Card title="Invoices" value={data?.invoiceCount || '0'} icon={FaShoppingCart} />
</div>
{/* For chart and trending items */}
{/* <div className="flex flex-col w-full gap-4 p-2 mt-4 md:flex-row">
  <BarChartComponent active={active}/>
  <div className="w-full h-auto bg-white border-t-4 border-blue-700 rounded-md md:w-1/2 md:m-0">
    <h5 className="p-2 text-center border-b-2 border-gray-300">RECENTLY ADDED ITEMS</h5>
    <div className="h-50">
    <table className="w-full border-collapse table-auto h-50">
  <thead>
    <tr className="border-b-2 border-gray-300">
      <th className="px-2 py-1 text-left">Sl.No</th>
      <th className="px-2 text-left">Item Name</th>
      <th className="px-2 text-left">Item Sales Price</th>
    </tr>
  </thead>
  <tbody>
  {items?.slice(-12).map((item, index) => (
  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
    <td className="px-4 py-2">{index + 1}</td>
    <td className="px-4 py-2">{item.itemName}</td>
    <td className="px-4 py-2">{item.salesPrice}</td>
  </tr>
))}

   
  </tbody>
</table>
</div>
  </div>
</div> */}

{/* Stock alert */}
{/* <div className="flex flex-col w-full py-4 mt-3 bg-white border-t-4 border-blue-600 rounded-md">
  <h5 className="px-2 py-2">STOCK ALERT</h5>
  <div className="flex flex-col items-start justify-between w-full gap-2 px-2 md:items-center md:flex-row md:gap-0">
    <div>
      <span>show</span>
      <select className="px-2 py-1 ml-1 border" value={entriesPerPage} onChange={handleEntriesChange}>
        <option value="10">10</option>
        <option value="10">20</option>
        <option value="10">50</option>
      </select>
      <span>entries</span>
    </div>
    <div className="flex flex-col items-start gap-2 md:items-center md:flex-row">
    <div className='flex items-center w-full gap-2'>
    <button onClick={handleCopy} className="w-full px-3 py-2 text-sm text-white bg-cyan-500">Copy</button>
                <button onClick={handleExcelDownload} className="w-full px-3 py-2 text-sm text-white bg-cyan-500">Excel</button>
                <button onClick={handlePdfDownload} className="w-full px-3 py-2 text-sm text-white bg-cyan-500">PDF</button>
                <button onClick={handlePrint} className="w-full px-3 py-2 text-sm text-white bg-cyan-500">Print</button>
                <button onClick={handleCsvDownload} className="w-full px-3 py-2 text-sm text-white bg-cyan-500">CSV</button>
    </div>
    <label  htmlFor="">Search <input type="text" className="px-2 py-1 border " value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)}/></label>
    </div>
   
  </div>
  <div className="w-full mt-4 overflow-x-auto">
  <table className="min-w-full border border-gray-200">
  <thead>
    <tr className="text-sm font-semibold text-gray-700 bg-gray-50">
      <th className="w-12 px-4 py-2 text-left border">#</th>
      <th className="px-4 py-2 text-left border">Item Name</th>
      <th className="px-4 py-2 text-left border">Category Name</th>
      <th className="px-4 py-2 text-left border">Brand Name</th>
    </tr>
  </thead>
  <tbody className="text-sm text-gray-600">
    {currentUsers.length>0?currentUsers.map((item,index)=>(
       <tr>
       <td className="px-4 py-2 border">{index+1}</td>
       <td className="px-4 py-2 border">{item.itemName}</td>
       <td className="px-4 py-2 border">{item.category?.name}</td>
       <td className="px-4 py-2 border">{item.brand?.brandName || "NA"}</td>
     </tr>
    )):
    <tr>
      <td className="px-2 py-2 font-semibold text-center" colSpan='4'>
        No Data Available
      </td>
    </tr>
    }
  </tbody>
</table>

  </div>
  <div className="flex flex-col items-start justify-between gap-2 p-2 md:justify-between md:flex-row">
    <span>Showing {entriesPerPage * (currentPage - 1) + 1} to {Math.min(entriesPerPage * currentPage, lowStock.length)} of {lowStock.length} entries</span>           
              <div className='flex justify-between w-full md:w-auto md:gap-2'>
              <button
  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
    ${currentPage === 1 
      ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
      : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"}`}
      onClick={()=>handlePageChange(currentPage-1)}
  disabled={currentPage === 1}
>
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
  Previous
</button>

<button
  className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
    ${currentPage >= totalPages || totalPages === 0 
      ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
      : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"}`}
      disabled={currentPage >= totalPages || totalPages === 0 }  
      onClick={()=>handlePageChange(currentPage+1)}
>
  Next
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
</button>

              </div>
            </div>
  
  </div>  */}
  
  {/* Trending and Sales invoice */}
{/* <div className="flex flex-col w-full gap-4 mt-4 mb-2 md:flex-row">
  <div className="w-full bg-white border-t-4 border-blue-700 rounded-md">
    <TrendingItemsDonut />
  </div>
      <div className="flex flex-col ">
        <div className="p-4 bg-white border-t-4 border-blue-700 rounded-t-lg">
          <h2 className="text-xl font-semibold">Recent Sales Invoices</h2>
        </div>
        <div className="overflow-x-auto ">
        <table className="overflow-x-auto bg-white border border-gray-200">
          <thead>
            <tr className="text-left bg-gray-100">
              <th className="px-2 py-2 text-sm border-b ">Sl.No</th>
              <th className="px-4 py-2 text-sm border-b">Date</th>
              <th className="px-2 py-2 text-sm border-b">Invoice ID</th>
              <th className="px-2 py-2 text-sm border-b">Customer</th>
              <th className="px-2 py-2 text-sm border-b">Total</th>
              <th className="px-2 py-2 text-sm border-b">Status</th>
              <th className="px-2 py-2 text-sm border-b">Created by</th>
            </tr>
          </thead>
          <tbody>
            {sale.length>0?(
              sale.map((item,index)=>(
                <tr className="text-center">
                <td className="px-4 text-sm border-b ">{index+1}</td>
                <td className="py-2 text-sm border-b ">{new Date(item.createdAt).toDateString()}</td>
                <td className="px-2 py-2 text-sm border-b">{item.saleCode}</td>
                <td className="px-2 py-2 text-sm border-b">{item.customer?.email}</td>
                <td className="px-2 py-2 text-sm border-b">{item.grandTotal || '0'}</td>
                <td className="px-2 py-2 text-sm border-b">{item.status}</td>
                <td className="px-2 py-2 text-sm border-b">{item.createdBy?.name}</td>
              </tr>
              ))
            ):(
              <tr className="text-left bg-gray-100">
              <th className="px-2 py-2 text-sm border-b">No Data Available</th>
            </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
  
  </div>        */}
      <div className="flex flex-col w-full gap-4 mt-4 mb-2 overflow-x-auto md:flex-row">
  {/* <div className="w-full pb-2 bg-white border-t-4 border-blue-700 rounded-md">
    <TrendingItemsDonut />
  </div> */}

 
</div>

      </div> 
    
    </div>
    </div>
  );
};


export default Dashboard;
