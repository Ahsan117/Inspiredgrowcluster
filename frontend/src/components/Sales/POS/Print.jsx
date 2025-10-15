import React, { useEffect, useState, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { FaTachometerAlt, FaDownload, FaPrint, FaShareAlt, FaBluetooth } from 'react-icons/fa';
import jsPDF from 'jspdf';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import html2pdf from 'html2pdf.js';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FaTimes,FaEdit } from 'react-icons/fa';
import LoadingScreen from '../../../pages/LoadingScreen';
import {Browser} from '@capacitor/browser';
import BluetoothDevicesPage from '../../../pages/BluetoothDevicesPage';
import { App } from '@capacitor/app';
const ReceiptPage = ({
    setActiveTab,
    print
}) => {

  const Navigate = useNavigate();
   useEffect(() => {
      const backHandler = App.addListener('backButton', () => {
        Navigate("/dashboard");
      });
  
      return () => backHandler.remove();
    }, []);
  
    // Intercept swipe back or browser back
    useEffect(() => {
      const unblock = Navigate((_, action) => {
        if (action === 'POP') {
          
        Navigate("/dashboard")
          return false; // Prevent actual navigation
        }
      });
  
      return unblock;
    }, [Navigate]);
    
    const[loading,setLoading]=useState(false);
    const [device,setDevice]=useState(false)
    const mockData = print;
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [receiptHtml, setReceiptHtml] = useState('');
    const receiptRef = useRef(null);
    
    // --- Bluetooth State ---
    const [platform, setPlatform] = useState('web');
    const [connectedDevice, setConnectedDevice] = useState(null);
    const [btError, setBtError] = useState('');

    // --- Initial Setup ---
    useEffect(() => {
        generateReceiptHtml(); // Generate the visual receipt first
    }, []);
    
    // --- Bluetooth Functions ---

const generatePlainTextReceipt = () => {
  const { order, customer, store, payments ,exclusiveDiscount} = mockData;
  //  console.log("Mock Data",mockData)
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
  // console.log("Item in formatItemRow",item)
  const lines = wrapText(item.itemName, col.item).slice(0, 4); // up to 4 lines
  let txt = '';
  lines.forEach((ln, i) => {
    if (i === 0) {
      txt += padRight(idx + 1, col.sno) +
             padRight(ln,        col.item) +
             padLeft (item.quantity,               col.qty)   +
             padLeft (Number(item.mrp).toFixed(2),  col.mrp)  +
             padLeft (Number(item.salesPrice).toFixed(2),     col.rate) +
             padLeft ((item.quantity * item.salesPrice).toFixed(2), col.total) + '\n';
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
  text += centerText(store.storeName) + '\n';
  
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
  text +=`Invoice: #${order.saleCode}`+'\n';
  text+=`Customer: ${customer.customerName || 'walk-in customer'}`+'\n';
  text += line;
  // --- Items Table Header ---
 
  text += padRight("#", col.sno) +
          padRight("Item", col.item) +
          padLeft ("Qty",  col.qty)  +
          padLeft ("MRP",  col.mrp)  +
          padLeft ("Rate", col.rate) +
          padLeft ("Total",col.total) + "\n";
  
  // --- Items Table Body ---
  order.rows.forEach((item, index) => {
    // console.log("Item",item)
    text += formatItemRow(item, index);
  });
  text += line;

  // --- Full Summary Section ---
  const totalQuantity = order.rows.reduce((sum, item) => sum + item.quantity, 0);
                

        const rawTotal = order.rows.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);
                

        const disc = order.totalDiscount || 0;
        const taxAmt = order.taxAmount || 0;
                

        const netBeforeTax = rawTotal - disc;
        
const totalM=order.rows.reduce((sum, item) => sum + (item.quantity * item.mrp), 0);
const totalSales=order.rows.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);

 console.log("payments", payments)
 const paid = payments.reduce((sum, p) => sum + p.amount, 0);
 console.log("payments", paid)
      
const prevDue = order.previousBalance  || 0;
console.log("prevDue", prevDue)
console.log(netBeforeTax,taxAmt,paid)
const totalDue = prevDue + netBeforeTax + taxAmt - paid - exclusiveDiscount;
   const additionalCharges=order.additionalPayment.reduce((sum, p) => sum + p.amount, 0);
    
  const addSummaryLine = (label, value) => {
      return padRight(label, lineWidth - 16) + padLeft(value, 16) + '\n';
  };

  text += addSummaryLine('Total Quantity:', totalQuantity || 0);
  text += addSummaryLine('Before Tax:', totalM?.toFixed(2));
  text += addSummaryLine('Total Discount:', `-${(totalM-totalSales)?.toFixed(2)}`);
  text += addSummaryLine('Net Before Tax:', totalSales?.toFixed(2));
  text += addSummaryLine('Tax Amount:', taxAmt?.toFixed(2));
  text += addSummaryLine('Additional Charges:',additionalCharges?.toFixed(2) || 0);
  if(exclusiveDiscount > 0)
  text += addSummaryLine('Premium Membership Discount:',`-${exclusiveDiscount?.toFixed(2) || 0}`);
  
  text += addSummaryLine('TOTAL:', ((taxAmt || 0)+ totalSales+ additionalCharges - exclusiveDiscount)?.toFixed(2) || 0);
  text += addSummaryLine('Paid Payment:', (paid)?.toFixed(2));
  text += addSummaryLine('Previous Due:', prevDue?.toFixed(2));
  text += addSummaryLine('TOTAL DUE:', totalDue?.toFixed(2));
  text += line;
   payments.forEach((p, i) => {
        text += `Payment Type: ${p.paymentNote} ₹${p.amount?.toFixed(2)||0}\n`;
    });
  // --- Footer ---
  text += centerText('Thank You & Visit Again!') + '\n\n\n';
   console.log(text)
  return text;
};

const printinfo = generatePlainTextReceipt();


    // --- Action Handlers ---
   const handleBluetoothPrint = () => {
  try {
    setLoading(true);
    window.bluetoothSerial.isConnected(
      () => {
        // If connected, proceed with printing
        window.bluetoothSerial.write(
          printinfo,
          () => alert('✅ Print success'),
          (failure) => alert(`❌ Print failed: ${failure}`)
        );
      },
      () => {
        // If NOT connected
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



const handleShare  = async () => {
  const receiptElement = document.getElementById('hidden-receipt');

  if (!receiptElement) {
    console.error("Receipt element not found.");
    return;
  }

  const opt = {
    margin: 0.2,
    filename: 'receipt.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {},
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };

  try {
    setLoading(true);
    const pdfBlob = await html2pdf().from(receiptElement).set(opt).outputPdf('blob');

    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);

    reader.onloadend = async () => {
      const base64data = reader.result?.toString().split(',')[1];
      if (!base64data) {
        console.error('Failed to convert PDF to base64');
        return;
      }

      const fileName = `receipt-${Date.now()}.pdf`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64data,
        directory: Directory.Cache
      });

     const fileUri = await Filesystem.getUri({
  directory: Directory.Cache,
  path: fileName,
});

// 🔍 Ensure you're passing only the native URI
await Share.share({
  title: 'Receipt PDF',
  url: fileUri.uri, // this should be something like "content://..." or "file://..."
  dialogTitle: 'Share Receipt'
});

    };
  } catch (error) {
    console.error("Failed to generate or share PDF:", error);
  } finally {
    setLoading(false);
  }
};


const handleDownload = async () => {
  try {
    const receiptContainer = document.createElement('div');
    receiptContainer.innerHTML = receiptHtml;
    document.body.appendChild(receiptContainer);

    const opt = {
      margin: 0.2,
      filename: 'receipt.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const pdfBlob = await html2pdf().from(receiptContainer).set(opt).output('blob');

    const reader = new FileReader();
    reader.readAsDataURL(pdfBlob);

    reader.onloadend = async () => {
      document.body.removeChild(receiptContainer);

      const base64 = reader.result?.toString().split(',')[1];
      if (!base64) {
        alert('Failed to convert PDF to base64');
        return;
      }

      const fileName = `receipt-${Date.now()}.pdf`;

      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Documents,
      });

      const { uri } = await Filesystem.getUri({
        path: fileName,
        directory: Directory.Documents,
      });

      try {
        await Browser.open({ url: uri });
      } catch (err) {
        alert("Could not open PDF.");
      }
    };
  } catch (error) {
    console.error('PDF generation failed:', error);
    alert('Could not generate or open PDF');
  }
};
 
    
    // --- This function generates the on-screen view ---
    const generateReceiptHtml = () => {
        const { order, customer, seller, store, payments, dues ,exclusiveDiscount} = mockData;
         console.log("1")
         
        const totalQuantity = order.rows.reduce((sum, item) => sum + item.quantity, 0);
                 console.log("2")

        const rawTotal = order.rows.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);
                 console.log("3")

        const disc = order.totalDiscount || 0;
        const taxAmt = order.taxAmount || 0;
                 console.log("4")

        const netBeforeTax = rawTotal - disc;
        console.log(5)
console.log(6)

const paid = payments.reduce((sum, p) => sum + p.amount, 0);
      
const prevDue = order.previousBalance  || 0;

const totalDue = prevDue + netBeforeTax + taxAmt - paid - exclusiveDiscount;
 
const finalTotal = netBeforeTax + taxAmt;
        console.log(7)
     
const totalM=order.rows.reduce((sum, item) => sum + (item.quantity * item.mrp), 0);
const totalSales=order.rows.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);
   const additionalCharges=order.additionalPayment.reduce((sum, p) => sum + p.amount, 0);
        
console.log(8)
        const body = order.rows.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${r.itemName}</td>
                <td class="r">${r.quantity}</td>
                <td class="r">${r.mrp.toFixed(2)}</td>
                <td class="r">${r.salesPrice.toFixed(2)}</td>
                <td class="r">${(r.quantity * r.salesPrice).toFixed(2)}</td>
            </tr>`
        ).join("");
  console.log(12)
  
        const payRows = payments.map((p, i) => `
            <tr><td>${i + 1}</td><td>${p.paymentNote || "-"}</td><td class="r">${p.amount.toFixed(2)}</td></tr>`
        ).join("");
        console.log(13)
        
        const generatedHtml = `
            <div id="receipt-content">
                <style>
                    .receipt-container * { font-family: Arial, Helvetica, sans-serif; font-size: 12px; margin: 0; padding: 0; box-sizing: border-box; }
                    .receipt-container { padding: 10px; color: #000; background: #fff; }
                    .receipt-container h2 { font-size: 20px; margin: 5px 0; }
                    .receipt-container .center { text-align: center; }
                    .receipt-container .r { text-align: right; }
                    .receipt-container table { width: 100%; border-collapse: collapse; margin-top: 5px; }
                    .receipt-container th, .receipt-container td { border: 1px solid #ccc; padding: 5px; }
                    .receipt-container th { background: #f0f0f0; }
                    .receipt-container .no-border td { border: none; }
                    .receipt-container .sep { margin: 8px 0; border-top: 1px dashed #555; }
                </style>
                <div class="receipt-container">
                   <div className="flex flex-col items-center justify-center text-center">
<img src="./inspiredgrow.jpg" alt="logo" style="height: 40px; width: auto; margin-bottom: 8px;" />
  <h2 className="text-lg font-bold">${store.storeName}</h2>
  <strong>${store.tagline}</strong><br />
  <div style={{ whiteSpace: 'pre-line' }}>${store.address}</div>
  GST Number: ${store.gst}<br />
  Phone: ${store.phone}<br />
  ${store.email}
</div>

                    <div class="sep"></div>
                    <table class="no-border">
                        <tr><td><strong>Invoice</strong></td><td class="r">#${order.saleCode}</td></tr>
                        <tr><td><strong>Name</strong></td><td class="r">${customer.customerName || "–"}</td></tr>
                        <tr><td><strong>Seller</strong></td><td class="r">${seller.sellerName}</td></tr>
                        <tr><td><strong>Date</strong></td><td class="r">${new Date().toLocaleDateString()}</td></tr>
                        <tr><td><strong>Time</strong></td><td class="r">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td></tr>
                    </table>
                    <table>
                        <thead><tr><th>#</th><th>Description</th><th>Qty</th><th>MRP</th><th>Rate</th><th>Total</th></tr></thead>
                        <tbody>${body}</tbody>
                    </table>
                    <table class="no-border">
                        <tr><td>Total Quantity</td><td class="r">${totalQuantity}</td></tr>
                        <tr><td>Before Tax</td><td class="r">${totalM?.toFixed(2) || 0}</td></tr>
                        <tr><td>Total Discount</td><td class="r">−${(totalM-totalSales)?.toFixed(2) || 0}</td></tr>
                        <tr><td>Net Before Tax</td><td class="r">${totalSales?.toFixed(2) || 0}</td></tr>
                        <tr><td>Tax Amount</td><td class="r">${taxAmt?.toFixed(2) || 0}</td></tr>
                        <tr><td>Additional Charges</td><td class="r">${additionalCharges?.toFixed(2) || 0}</td></tr>
                        ${exclusiveDiscount > 0 && (`<tr><td>Premium Membership Discount</td><td class="r">−${exclusiveDiscount?.toFixed(2) || 0}</td></tr>`)}
                        <tr><td><strong>Total</strong></td><td class="r"><strong>${((taxAmt || 0)+totalSales+additionalCharges-exclusiveDiscount)?.toFixed(2) || 0}</strong></td></tr>
                        <tr><td>Paid Payment</td><td class="r">${(paid)?.toFixed(2) || 0}</td></tr>
                        <tr><td>Previous Due</td><td class="r">${prevDue?.toFixed(2) || 0}</td></tr>
                        <tr><td><strong>Total Due Amount</strong></td><td class="r"><strong>${totalDue?.toFixed(2) || 0}</strong></td></tr>
                    </table>
                    <p style="margin-top:8px"><strong>Payments:</strong></p>
                    <table><thead><tr><th>#</th><th>Payment Type</th><th>Amount</th></tr></thead>
                        <tbody>${payRows || `<tr><td colspan="3" class="center">–</td></tr>`}</tbody>
                    </table>
                    <div class="sep"></div>
                    <p class="center" style="margin-top:4px">----------Thank You. Visit Again!----------</p>
                </div>
            </div>
        `;
        setReceiptHtml(generatedHtml);
        setIsLoading(false); // Set loading to false after HTML is generated
       console.log(14)
    };
    

if(loading) return <LoadingScreen />;

    return (
                
              <div className="flex flex-col w-full p-2 mx-auto mb-20 transition-all duration-300">
              {
                  device && <BluetoothDevicesPage setDevice={setDevice} />
                }  
    <div className="w-full max-w-2xl mx-auto">
        {/* Top Action Buttons */}
        <div className="flex justify-between mb-4 bg-white border rounded-lg shadow-md">
            <button 
                onClick={()=>Navigate("/dashboard")} 
                className="flex items-center px-4 py-2 text-gray-700 rounded hover:bg-gray-200"
            >
                <FaTimes size={16} className="mr-2" />
                <span className="text-sm">Close</span>
            </button>
        </div>

        {/* Receipt Content */}
        <div id="hidden-receipt" ref={receiptRef} className="p-4 bg-white border rounded-lg shadow-md" dangerouslySetInnerHTML={{ __html: receiptHtml }} />

        {/* Bottom Action Buttons */}
        <div className="grid justify-between grid-cols-4 gap-2 p-2 bg-white border rounded-lg shadow-sm">
  <button 
    onClick={handleDownload} 
    className="flex flex-col items-center justify-center p-2 text-gray-700 transition-colors rounded-lg hover:bg-gray-100 active:bg-gray-200"
  >
    <FaDownload size={18} />
    <span className="mt-1 text-xs font-medium">Download</span>
  </button>
  
  <button 
    onClick={handleBluetoothPrint} 
    className="flex flex-col items-center justify-center p-2 text-blue-600 transition-colors rounded-lg hover:bg-blue-50 active:bg-blue-100"
  >
    <FaBluetooth size={18} />
    <span className="mt-1 text-xs font-medium">BT Print</span>
  </button>
  
  <button 
    onClick={handleShare} 
    className="flex flex-col items-center justify-center p-2 text-gray-700 transition-colors rounded-lg hover:bg-gray-100 active:bg-gray-200"
  >
    <FaShareAlt size={18} />
    <span className="mt-1 text-xs font-medium">Share</span>
  </button>
  
</div>
        {btError && <p className="mt-2 text-sm text-center text-red-500">{btError}</p>}
    </div>
</div>
    );
};

export default ReceiptPage;
