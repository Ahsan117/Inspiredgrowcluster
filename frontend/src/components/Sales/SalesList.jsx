import React, { useState, useEffect } from 'react';
import { ShoppingBagIcon, CashIcon } from "@heroicons/react/outline";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoneyBill } from "@fortawesome/free-solid-svg-icons";
import { FaDollarSign, FaTachometerAlt } from 'react-icons/fa';
import { BiChevronRight } from 'react-icons/bi';
import { Link, useNavigate, NavLink } from 'react-router-dom';
import { faBuilding } from "@fortawesome/free-regular-svg-icons";
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import Select from 'react-select';
import axios from 'axios';
import LoadingScreen from "../../Loading";
import {Browser} from '@capacitor/browser';
import BluetoothDevicesPage from '../../pages/BluetoothDevicesPage.jsx';  
import CardOtpModal from '../Dashboard/CardApply.jsx';
const PurchaseOverview = () => {
  const [device, setDevice] = useState(false);
      const link="https://pos.inspiredgrow.in/vps"
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouse, setWarehouse] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [salesList, setSalesList] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [paidPayment, setPaidPayment] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionMenu, setActionMenu] = useState(null);
  const [paymentTypes, setPaymentTypes] = useState([]);
  const [editPaymentModal, setEditPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [newPaymentType, setNewPaymentType] = useState(null);
  const [cashSalesTotal, setCashSalesTotal] = useState(0);
  const [bankSalesTotal, setBankSalesTotal] = useState(0);

   const [showModal, setShowModal] = useState(false);
      const [sa, setSa] = useState(null);

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().slice(0, 10);

  // Fetch payment types
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

  // Handler for View Sales
  const handleViewSales = (inv) => {
    navigate(`/view-sale?id=${inv._id}&source=${inv.source}`);
  };

  // Navigate to Edit page (AddSale or POS) only if sale is from today
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

  // Edit payment type
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
      alert("Payment type updated successfully!");
      setEditPaymentModal(false);
      setSelectedInvoice(null);
      setNewPaymentType(null);
      await fetchInvoices();
    } catch (error) {
      console.error("Error updating payment type:", error.message);
      alert(`Failed to update payment type: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Navigate to "View Payments" page
  const handleViewPayments = (inv) => {
    navigate(`/view-payment?saleId=${inv._id}`);
  };

  // Navigate to "Receive Payment" form
  const handleReceivePayment = (inv) => {
    navigate(`/receive-payment?invoice=${inv.saleCode}`);
  };

  // Fetch invoice details and generate PDF
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

  // POS invoice only for pos-orders
  const handlePOSInvoice = (inv) => {
    navigate(`/pos-invoice/${inv._id}`);
  };

  // Sales return
  const handleSalesReturn = (inv) => {
    navigate(`/sales-return?saleId=${inv._id}`);
  };

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  // Fetch Warehouses and Payment Types
  const fetchWarehouses = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found redirecting...");
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${link}/api/warehouses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.data) {
        const newwarehouse = [
          { label: "All", value: "all" },
          ...response.data.data.map(warehouse => ({
            label: warehouse.warehouseName,
            value: warehouse._id,
          }))
        ];
        setWarehouses(newwarehouse);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unified Sales + POS orders
  const fetchInvoices = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found redirecting...");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${link}/api/pos/club`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log("Fetched invoices:", data);
      setSalesList(data.data);
    } catch (err) {
      alert(`Could not load invoices: ${err.message}`);
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
      fetchInvoices();
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
    fetchInvoices();
    fetchPaymentTypes();
  }, []);

  useEffect(() => {
    let cash = 0, bank = 0;
    salesList.forEach(inv => {
      const p = inv.payments?.[0];
      const name = p?.paymentType?.paymentTypeName;
      if (name === "Cash") cash += p.amount || p.paymentAmount || 0;
      if (name === "Bank") bank += p.amount || p.paymentAmount || 0;
    });
    setCashSalesTotal(cash);
    setBankSalesTotal(bank);
  }, [salesList]);
  
 const filteredData = salesList.filter(item => {
  const searchTermLower = searchTerm.toLowerCase();
  const creatorName = item.creatorName?.toLowerCase() || '';

  const customerMatch =
    creatorName.includes(searchTermLower) ||
    (typeof item.customer === 'string'
      ? item.customer.toLowerCase()
      : item.customer?.customerName?.toLowerCase()
    )?.includes(searchTermLower) ||
    item.customer?.mobile?.toLowerCase().includes(searchTermLower) ||
    item.saleCode?.toLowerCase().includes(searchTermLower);

  const createdAtTime = new Date(item.saleDate).getTime();

  let startDateTime = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
  let endDateTime   = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

  const dateMatch = createdAtTime >= startDateTime && createdAtTime <= endDateTime;
  const warehouseCondition =
    warehouse === "all" || warehouse === "" || item.warehouse?._id === warehouse;

  return (customerMatch && dateMatch) && warehouseCondition;
});

  const totalInvoices = filteredData.length;
const totalInvoiceAmt = filteredData.reduce(
  (sum, inv) => sum + ((inv.totalAmount || 0) ),
  0
);
  console.log(filteredData)
  console.log("Total Invoice Amount (after discounts):", totalInvoiceAmt);
  
  const totalReceivedAmt = filteredData.reduce(
    (sum, inv) =>
      sum +
      (inv.payments?.reduce(
        (pSum, payment) => pSum + (payment.amount || payment.paymentAmount || 0),
        0
      ) || 0),
    0
  );
  console.log("Total Received Amount:", totalReceivedAmt);
  const totalSalesDue = totalInvoiceAmt - totalReceivedAmt;
  console.log("Total Sales Due:", totalSalesDue);
  const handleCopy = () => {
    const data = filteredData
      .map(
        (inv) => {
          const totalPaid = inv.payments?.reduce(
            (sum, payment) => sum + (payment.amount || payment.paymentAmount || 0),
            0
          ) || 0;
          return `${new Date(inv.saleDate).toDateString()}, ${inv.saleCode}, ${
            typeof inv.customer === 'string' ? inv.customer : inv.customer?.customerName || "N/A"
          }, ${inv.amount.toFixed(2)}, ${totalPaid.toFixed(2)}, ${inv.source}`;
        }
      )
      .join('\n');
    navigator.clipboard.writeText(data);
    alert("Data copied to clipboard!");
  };

  const handleExcelDownload = () => {
    const data = filteredData.map(inv => ({
      Date: new Date(inv.saleDate).toDateString(),
      Code: inv.saleCode,
      Customer: typeof inv.customer === 'string' ? inv.customer : inv.customer?.customerName || "N/A",
      Amount: inv.amount.toFixed(2),
      "Amount Paid": (inv.payments?.reduce(
        (sum, payment) => sum + (payment.amount || payment.paymentAmount || 0),
        0
      ) || 0).toFixed(2),
      Source: inv.source
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices.xlsx");
  };

  const handlePdfDownload = () => {
    const doc = new jsPDF();
    doc.text("Invoices List", 20, 20);
    const tableData = filteredData.map(inv => [
      new Date(inv.saleDate).toDateString(),
      inv.saleCode,
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.customerName || "N/A",
      inv.amount.toFixed(2),
      (inv.payments?.reduce(
        (sum, payment) => sum + (payment.amount || payment.paymentAmount || 0),
        0
      ) || 0).toFixed(2),
      inv.source,
    ]);

    autoTable(doc, {
      head: [['Date', 'Code', 'Customer', 'Amount', 'Amount Paid', 'Source']],
      body: tableData,
    });

    doc.save("invoice_list.pdf");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCsvDownload = () => {
    const headers = ['Date', 'Code', 'Customer', 'Amount', 'Amount Paid', 'Source'];
    const data = filteredData.map(inv => [
      new Date(inv.saleDate).toDateString(),
      inv.saleCode,
      typeof inv.customer === 'string' ? inv.customer : inv.customer?.customerName || "N/A",
      inv.amount.toFixed(2),
      (inv.payments?.reduce(
        (sum, payment) => sum + (payment.amount || payment.paymentAmount || 0),
        0
      ) || 0).toFixed(2),
      inv.source
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + 
      headers.join(",") + "\n" + 
      data.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "invoices.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const totalPages = Math.ceil(filteredData.length / entriesPerPage);
  const currentUsers = filteredData.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleEntriesChange = (e) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const calculate = () => {
    const total = currentUsers.reduce((sum, inv) => sum + inv.totalAmount , 0);
    const paid = currentUsers.reduce(
      (sum, inv) =>
        sum +
        (inv.payments?.reduce(
          (pSum, payment) => pSum + (payment.amount || payment.paymentAmount || 0),
          0
        ) || 0),
      0
    );
    setGrandTotal(total);
    setPaidPayment(paid);
  };

  useEffect(() => {
    calculate();
  }, [currentUsers]);



const generatePlainTextReceipt = (data) => {
   const exclusiveDiscount=data.exclusiveDiscount ||0;
  const store={
        logo:        "/logo/inspiredgrow.jpg",                       //  40-50 px square looks right
  storeName:   data.warehouse.warehouseName,                                //  already in state
  tagline:     "GROCERY ON WHEELS",
  address:     "Basement 210-211 new Rishi Nagar near Shree Shyam Baba Mandir Gali No. 9, Hisar – 125001",
  gst:         "06AAGCI0630K1ZR",
  phone:       "9050092092",
  email:       "INSPIREDGROW@GMAIL.COM",
    }
   console.log("Mock Data",data)
  const lineWidth = 42; // Standard for 3-inch (80mm) Epson P80 printers
  const line = '-'.repeat(lineWidth) + '\n';

  // --- Helper Functions ---
  const padRight = (str, len, char = ' ') => (String(str) + char.repeat(len)).substring(0, len);
  const padLeft = (str, len, char = ' ') => (char.repeat(len) + String(str)).slice(-len);
  
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

  
  const col = { sno: 3, item: 13, qty: 4, mrp: 7, rate: 7, total: 8 }; // still 42

  
  // A single, reliable source for all column widths
  const colWidths = {
    sno: 3,
    item: 18, // Increased item width slightly for better wrapping
    qty: 4,
    mrp: 7,
    rate: 7,
    total: 3,
  };
  // Adjusted total to fit, let's recalculate: 3+18+4+7+7 = 39. Left for total = 3. Too small.
  // Let's use the previous stable widths.
  const finalColWidths = {
    sno: 3,
    item: 15,
    qty: 4,
    mrp: 7,
    rate: 7,
    total: 6,
  };

  // =================================================================
  // THIS IS THE NEW, SIMPLER, AND CORRECTED ITEM ROW FORMATTER
  // =================================================================
   
const formatItemRow = (item, idx) => {
  console.log("Item in formatItemRow",item.item.itemName)
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



  let text = '';

  // --- Header ---
  text += centerText(store.storeName || "Groceryon wheels") + '\n';
  
  wrapText(store.address, lineWidth).forEach(wrappedLine => {
      text += centerText(wrappedLine) + '\n';
  });

  text += centerText(`GST: ${store.gst}`) + '\n';
  text += centerText(`Phone: ${store.phone}`) + '\n';
  text += centerText(`Email: ${store.email}`) + '\n';
  text += line;

  // --- Order Info ---
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN');
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  text += twoColumn(`Date: ${dateStr}`, `Time: ${timeStr}`) + '\n';
  text +=`Invoice: #${data.saleCode}`+'\n';
  text+=`Customer: ${data.customer.customerName || 'walk-in customer'}`+'\n';
  text += line;
  // --- Items Table Header ---
 
  text += padRight("#", col.sno) +
          padRight("Item", col.item) +
          padLeft ("Qty",  col.qty)  +
          padLeft ("MRP",  col.mrp)  +
          padLeft ("Rate", col.rate) +
          padLeft ("Total",col.total) + "\n";
  
  // --- Items Table Body ---
  data.items.forEach((item, index) => {
    console.log("Item",item)
    text += formatItemRow(item, index);
  });
  text += line;

  // --- Full Summary Section ---
  const totalQuantity = data.items.reduce((sum, item) => sum + item.quantity, 0);

        const rawTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

        const disc = data.totalDiscount || 0;
        const taxAmt = data.taxAmount || 0;


        const netBeforeTax = rawTotal - disc;
        
const totalM=data.items.reduce((sum, item) => sum + (item.quantity * item.item.mrp), 0);
const totalSales=data.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

const additionalCharges=data.additionalPayment.reduce((sum, p) => sum + p.amount, 0);
    
const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
      
const prevDue = data.previousBalance  || 0;

const totalDue = prevDue + netBeforeTax + taxAmt - paid - exclusiveDiscount;


  const addSummaryLine = (label, value) => {
      return padRight(label, lineWidth - 16) + padLeft(value, 16) + '\n';
  };

  text += addSummaryLine('Total Quantity:', totalQuantity || 0);
  text += addSummaryLine('Before Tax:', totalM?.toFixed(2));
  text += addSummaryLine('Total Discount:', `-${(totalM-totalSales)?.toFixed(2)}`);
  text += addSummaryLine('Net Before Tax:', totalSales?.toFixed(2));
  text += addSummaryLine('Tax Amount:', taxAmt?.toFixed(2));
  text += addSummaryLine('Additional Charges:', additionalCharges?.toFixed(2));
  if(exclusiveDiscount > 0)
  text += addSummaryLine('Premium Membership Discount:',`-${exclusiveDiscount?.toFixed(2) || 0}`);
  
  text += addSummaryLine('TOTAL:', ((taxAmt || 0)+ totalSales + additionalCharges - exclusiveDiscount)?.toFixed(2) || 0);
  text += addSummaryLine('Paid Payment:', paid?.toFixed(2));
  text += addSummaryLine('Previous Due:', prevDue?.toFixed(2));
  text += addSummaryLine('TOTAL DUE:', totalDue?.toFixed(2));
  text += line;
   data.payments.forEach((p, i) => {
        text += `Payment Type: ${p.paymentType.paymentTypeName} ₹${p.amount?.toFixed(2)||0}\n`;
    });
  // --- Footer ---
  text += centerText('Thank You & Visit Again!') + '\n\n\n';
   console.log(text)
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



  if (loading) return (<LoadingScreen />);

  return (
    <div className="flex flex-col">
          
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="box-border flex min-h-screen">
        <div className="w-auto">
          <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
        {
                  device && <BluetoothDevicesPage setDevice={setDevice} />
                }  
        <div className="flex flex-col w-full p-2 mx-auto overflow-x-auto md:p-2">
          <header className="flex flex-col items-center justify-between px-2 py-2 mb-2 bg-gray-100 rounded-md shadow md:flex-row">
            <div className="flex items-baseline gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">Invoices List</h1>
              <span className="text-xs text-gray-600 sm:text-sm">View/Search Invoices</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
              <NavLink to="/dashboard" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" />
                Home
              </NavLink>
              <BiChevronRight className="mx-1 sm:mx-2" />
              <NavLink to="/sales-list" className="text-gray-700 no-underline hover:text-cyan-600">
                Invoices List
              </NavLink>
            </nav>
          </header>
           {
                    showModal && <CardOtpModal sa={sa} isOpen={showModal} onClose={() => {fetchInvoices();setShowModal(false)}}/>
                  }
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <ShoppingBagIcon className="w-16 text-white rounded bg-cyan-500" />
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">{totalInvoices}</h2>
                  <p className='font-bold'>Total Invoices</p>
                </div>
              </div>
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <FaDollarSign className='w-16 h-16 text-white rounded bg-cyan-500'/>
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">₹{totalInvoiceAmt.toFixed(2)}</h2>
                  <p className='font-bold'>Total Invoices Amount</p>
                </div>
              </div>
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <FontAwesomeIcon icon={faMoneyBill} className="w-16 h-16 text-white rounded bg-cyan-500" />
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">₹{totalReceivedAmt.toFixed(2)}</h2>
                  <p className='font-bold'>Total Received Amount</p>
                </div>
              </div>
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <CashIcon className="h-16 text-white rounded bg-cyan-500 w-18" />
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">₹{totalSalesDue.toFixed(2)}</h2>
                  <p className='font-bold'>Total Sales Due</p>
                </div>
              </div>
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <FontAwesomeIcon icon={faMoneyBill} className="w-16 h-16 text-white rounded bg-cyan-500" />
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">₹{cashSalesTotal.toFixed(2)}</h2>
                  <p className='font-bold'>Cash Sales</p>
                </div>
              </div>
              <div className="flex items-center text-black bg-white rounded-lg shadow-md">
                <FontAwesomeIcon icon={faBuilding} className="w-16 h-16 text-white rounded bg-cyan-500" />
                <div className="flex flex-col justify-center ml-4">
                  <h2 className="text-xl">₹{bankSalesTotal.toFixed(2)}</h2>
                  <p className='font-bold'>Bank Sales</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 mt-3 bg-white border-t-4 rounded-md shadow-md border-cyan-500">
            <div className='flex items-center justify-between mb-10'>
              <div></div>
              <div className="flex items-end">
                <button
                  className="w-full px-4 py-2 text-white rounded-md bg-cyan-500 hover:bg-cyan-600"
                  onClick={() => navigate('/add-sale')}
                >
                  + Create Invoice
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block font-semibold text-gray-700">
                  Warehouse <span className="text-red-500">*</span>
                </label>
                <Select
                  options={warehouses}
                  onChange={(selectedoption) => setWarehouse(selectedoption.value)}
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Customers</label>
                <input
                  type="text"
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Name/Mobile"
                  className="w-full p-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Users</label>
                <select className="w-full p-2 border rounded-md">
                  <option>All</option>
                  <option>Admin</option>
                  <option>Manager</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 mt-4 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-gray-700">From Date</label>
                <div className="flex items-center p-2 border rounded-md">
                  <span className="mr-2">📅</span>
                  <input
                    type="date"
                    className="w-full outline-none"
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-gray-700">To Date</label>
                <div className="flex items-center p-2 border rounded-md">
                  <span className="mr-2">📅</span>
                  <input
                    type="date"
                    className="w-full outline-none"
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-between mt-4 mb-4 space-y-2 md:flex-row md:space-y-0 md:items-center">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Show</span>
              <select
                className="p-2 text-sm border border-gray-300 rounded-md"
                value={entriesPerPage}
                onChange={handleEntriesChange}
              >
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
              <span className="text-sm">Entries</span>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <div className='flex items-center justify-between flex-1 gap-2'>
                <button onClick={handleCopy} className="px-3 py-2 text-sm text-white bg-cyan-500">Copy</button>
                <button onClick={handleExcelDownload} className="px-3 py-2 text-sm text-white bg-cyan-500">Excel</button>
                <button onClick={handlePdfDownload} className="px-3 py-2 text-sm text-white bg-cyan-500">PDF</button>
                <button onClick={handlePrint} className="px-3 py-2 text-sm text-white bg-cyan-500">Print</button>
                <button onClick={handleCsvDownload} className="px-3 py-2 text-sm text-white bg-cyan-500">CSV</button>
              </div>
              <input
                type="text"
                placeholder="Search"
                className="w-full p-2 text-sm border border-gray-300"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300 shadow-sm">
              <thead className="bg-gray-200">
                <tr>
                  {[
                    'Date', 'Code', 'Customer', 'Amount', 'Amount Paid', 'Source', 'Status', 'Action'
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-2 text-sm font-medium text-left border"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentUsers.length <= 0 ? (
                  <tr>
                    <td colSpan="8" className="p-4 text-center text-gray-500 border">
                      No data available in table
                    </td>
                  </tr>
                ) : (
                  currentUsers.map((inv) => {
                    const totalPaid = inv.payments?.reduce(
                      (sum, payment) => sum + (payment.amount || payment.paymentAmount || 0),
                      0
                    ) || 0;
                    return (
                      <tr className="bg-gray-100" key={inv._id}>
                        <td className="px-2 py-1 border">
                          {new Date(inv.saleDate).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1 border">{inv.saleCode}</td>
                        <td className="px-2 py-1 border">
                          {typeof inv.customer === 'string' ? inv.customer : inv.customer?.customerName || "N/A"}
                        </td>
                        <td className="px-2 py-1 border">₹{inv.totalAmount.toFixed(2)}</td>
                        <td className="px-2 py-1 border">₹{totalPaid.toFixed(2)}</td>
                        <td className="px-2 py-1 border">{inv.source}</td>
                        <td className="px-2 py-1 border" onClick={()=>handleEditPaymentType(inv)}>
                          <span
                             className={`inline-block px-2 py-1 text-xs font-semibold rounded
      ${
        inv.payments[0]?.paymentType?.paymentTypeName === 'Cash'
          ? 'bg-green-100 text-green-800'
          : inv.payments[0]?.paymentType?.paymentTypeName === 'Bank'
          ? 'bg-blue-100 text-blue-800'
          : inv.payments[0]?.paymentType?.paymentTypeName === 'Hold'
          ? 'bg-yellow-100 text-yellow-800'
          : 'bg-gray-100 text-gray-800'
      }`}
                          >
                            {inv.payments[0]?.paymentType?.paymentTypeName || "N/A"}
                          </span>
                        </td>
                        <td className="relative p-2 border">
                          <button
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-full shadow-sm 
                              hover:bg-cyan-700 active:scale-95 transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                            onClick={() => {
                              if (actionMenu) setActionMenu(null);
                              else setActionMenu(inv._id);
                            }}
                          >
                            <span>Action</span>
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${
                                actionMenu === inv._id ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {actionMenu === inv._id && (
                            <div className="absolute right-0 z-50 w-48 mt-2 bg-white border shadow-lg">
                              <button
                                className="w-full px-2 py-1 text-left text-blue-500 hover:bg-gray-100"
                                onClick={() => {handleViewSales(inv);setActionMenu(null);}}
                              >
                                📄 View Sales
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-green-500 hover:bg-gray-100"
                                onClick={() => {handleEdit(inv);setActionMenu(null);}}
                              >
                                ✏️ Edit
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-green-500 hover:bg-gray-100"
                                onClick={() => {

                                    if(inv.exclusiveDiscount > 0 || inv.premiumCard !== null){
                          setActionMenu(null)
                          alert("Exclusive Discount already used  for this invoice.")
                          return;
                        }
                        else{
                          
                          setActionMenu(null)
                          setShowModal(true)
                          setSa(inv)
                        }
                                }}
                              >
                                💵 Card Apply                      
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-teal-500 hover:bg-gray-100"
                                onClick={() => {handleEditPaymentType(inv); setActionMenu(null);}}
                              >
                                💵 Edit Payment Type
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-purple-500 hover:bg-gray-100"
                                onClick={() => {handleViewPayments(inv); setActionMenu(null);}}
                              >
                                💳 View Payments
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-indigo-500 hover:bg-gray-100"
                                onClick={() => {handleDownloadPDF(inv); setActionMenu(null);} }
                              >
                                📥 PDF
                              </button>
                               <button
                                className="w-full px-2 py-1 text-left text-blue-500 hover:bg-gray-100"
                                onClick={() => {handleBluetoothPrint(inv); setActionMenu(null);} }
                              >
                                📄 Print
                              </button>
                              <button
                                className="w-full px-2 py-1 text-left text-red-500 hover:bg-gray-100"
                                onClick={() => {handleDelete(inv._id, inv.source); setActionMenu(null);}}
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
                {currentUsers.length > 0 && (
                  <tr className="font-bold bg-gray-100">
                    <td colSpan="3" className="text-right border">Total :</td>
                    <td className="text-center border">{grandTotal.toFixed(2)}</td>
                    <td className="text-center border">
                      {currentUsers
                        .reduce(
                          (sum, inv) =>
                            sum +
                            (inv.payments?.reduce(
                              (pSum, payment) => pSum + (payment.amount || payment.paymentAmount || 0),
                              0
                            ) || 0),
                          0
                        )
                        .toFixed(2)}
                    </td>
                    <td className="text-center border"></td>
                    <td className="text-center border"></td>
                    <td className="text-center border"></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col items-start justify-between gap-2 p-2 md:justify-between md:flex-row">
            <span>
              <span>Showing {entriesPerPage * (currentPage - 1) + 1} to {Math.min(entriesPerPage * currentPage, filteredData.length)} of {filteredData.length} entries</ span>
            </span>
            <div className='flex justify-between w-full md:w-auto md:gap-2'>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
                  ${currentPage === 1 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"}`}
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
              <button
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
                  ${currentPage === totalPages 
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed" 
                    : "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"}`}
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
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
    </div>
  );
};

export default PurchaseOverview;