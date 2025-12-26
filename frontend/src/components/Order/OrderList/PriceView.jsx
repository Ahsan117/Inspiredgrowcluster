
import React, { useRef,useState } from "react";
import { Modal, Button, Tag, Divider, message } from "antd";
import {
  ShoppingCartOutlined,
  EditOutlined,
  PrinterOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useNavigate } from "react-router-dom";
import BluetoothDevicesPage from '../../../pages/BluetoothDevicesPage.jsx'; 
import Print from "./Print.jsx" 
import { Capacitor } from "@capacitor/core";


export default function PriceBreakdownModal({ visible, onClose, order, onEdit }) {
  const contentRef = useRef();
  const [device, setDevice] = useState(false);
  const navigate=useNavigate()
  const [loading,setLoading]=useState(false)
  const [print,setPrint]=useState(null)
  if (!order) return null;
  // ✅ Calculate Totals
  const breakdown = (() => {
    let subtotal = 0,
      totalDiscount = 0,
      totalTax = 0;
    order.items.forEach((item) => {
      const itemSubtotal = item.salesPrice * item.quantity;
      subtotal += itemSubtotal;
      totalDiscount += item.discount || 0;
      totalTax += ((itemSubtotal - (item.discount || 0)) * (order.tax || 0)) / 100;
    });
    const grandTotal = subtotal - totalDiscount + totalTax + (order.shippingFee || 0);
    return { subtotal, totalDiscount, totalTax, grandTotal };
  })();

  // ✅ Print
  const handlePrint = () => {
    const content = contentRef.current;
    const win = window.open("", "", "width=800,height=600");
    win.document.write(`<html><body>${content.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  const callNumber = (number) => {
    if (Capacitor.isNativePlatform()) {
      window.open(`tel:${number}`);
    } else {
      alert("Phone call only works on mobile");
    }
  };
  // ✅ Export PDF
  const handleExportPDF = async () => {
    const canvas = await html2canvas(contentRef.current);
    const pdf = new jsPDF("p", "mm", "a4");
    const imgData = canvas.toDataURL("image/png");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`order_${order.orderId}.pdf`);
  };

  
const generatePlainTextReceipt = (data) => {
    console.log(data)
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
 text +=`orderNumber: #${data.orderNumber}`+'\n';
 text+=`Customer: ${data.customer.name || '-'}`+'\n';
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

       const rawTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);

       const disc = data.discountApplied || 0;
       const taxAmt = data.tax || 0;


       const netBeforeTax = rawTotal - disc;
       
const totalM=data.items.reduce((sum, item) => sum + (item.quantity * item.item.mrp), 0);

const totalSales=data.items.reduce((sum, item) => sum + (item.quantity * item.salesPrice), 0);

const additionalCharges=data.additionalPayment?.reduce((sum, p) => sum + p.amount, 0);
   
// const paid = data.payments.reduce((sum, p) => sum + p.amount, 0);
     
// const prevDue = data.previousBalance  || 0;

// const totalDue = prevDue + netBeforeTax + taxAmt - paid;


 const addSummaryLine = (label, value) => {
     return padRight(label, lineWidth - 16) + padLeft(value, 16) + '\n';
 };

 text += addSummaryLine('Total Quantity:', totalQuantity || 0);
 text += addSummaryLine('Before Tax:', totalM?.toFixed(2));
 text += addSummaryLine('Total Discount:', `-${(totalM-totalSales )?.toFixed(2)}`);
 text += addSummaryLine('Net Before Tax:', totalSales?.toFixed(2));
 text += addSummaryLine('Tax Amount:', taxAmt?.toFixed(2));
 text += addSummaryLine('Delivery Fee:', (data.deliveryCharge || 0)?.toFixed(2));
 text += addSummaryLine('Processing Fee:', (data.processingFee || 0)?.toFixed(2));
 text += addSummaryLine('Coupon Discount:', `-${(data.discountApplied || 0)?.toFixed(2)}`);
 //text += addSummaryLine('Additional Charges:', additionalCharges?.toFixed(2));
 
 
 
 text += addSummaryLine('TOTAL:', ( data.totalAmount)?.toFixed(2) || 0);
//  text += addSummaryLine('Paid Payment:', paid?.toFixed(2));
//  text += addSummaryLine('Previous Due:', prevDue?.toFixed(2));
//  text += addSummaryLine('TOTAL DUE:', totalDue?.toFixed(2));
 text += line;
  // data.payments.forEach((p, i) => {
       text += `Payment Type: ${data.paymentMethod=="COD"?"Cash":"Bank"} ₹${data.totalAmount?.toFixed(2)||0}\n`;
  //  });
 // --- Footer ---
 text += centerText('Thank You & Visit Again!') + '\n\n\n';
  console.log(text)
 return text;
};


const handleBluetoothPrint = (sale) => {
  try {
    setLoading(true);
    setPrint(sale)
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
const openMap = (address) => {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  window.open(url, "_blank");
};

  return (
    // <Modal
    //   open={visible}
    //   onCancel={onClose}
    //   footer={null}
    //   width="100%"
    //   className="rounded-none mobile-modal"
    //   style={{ top: 0, padding: 0 }}
    //   bodyStyle={{
    //     padding: "0",
    //     height: "100%",
    //     overflow: "hidden",
    //     background: "#f8fafc",
    //   }}
    //   closable={false}
    // >
    //   {
    //     print &&  <Print print={print} setPrint={setPrint} setDevice={setDevice}/>
    //   }
    //   {/* Header */}
    //   <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b shadow-sm">
    //     <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
    //       <ShoppingCartOutlined />
    //       Order #{order.orderNumber}
    //     </div>
    //     <Tag color="blue" className="p-2 py-2 text-xs rounded-md" onClick={()=>onClose()}>
    //      x
    //     </Tag>
    //   </div>
    //   {
    //               device && <BluetoothDevicesPage setDevice={setDevice} />
    //             }  
    //   {/* Content */}
    //   <div
    //     ref={contentRef}
    //     className="overflow-y-auto pb-28 h-[calc(100vh-60px)] px-4 pt-3"
    //   >
    //     {/* Customer Info */}
    //     <div className="p-3 mb-3 bg-white shadow-sm rounded-xl">
    //       <p className="mb-1 text-sm text-gray-500">Customer</p>
    //       <p className="text-base font-medium text-gray-800">
    //         {order.customer?.name || "N/A"}
    //       </p>
    //       <p className="text-base font-medium text-gray-800" onClick={()=>callNumber(order.customer.phone)}>
    //         {order.customer?.phone || "N/A"}
    //       </p>
    //       <div className="flex justify-between mt-2 text-sm">
    //         <span>Payment:</span>
    //         <Tag color={order.paymentStatus === "Completed" ? "green" : "red"}>
    //           {order.paymentStatus}
    //         </Tag>
    //       </div>
    //       <div className="flex justify-between mt-2 text-sm">
    //         <span>Method:</span>
    //         <Tag color="purple">{order.paymentMethod}</Tag>
    //       </div>
    //       {order.assignRider && (
    //         <div className="flex justify-between mt-2 text-sm">
    //         <span>Assign Rider:</span>
    //         <span>{order.assignRider.username}</span>
    //       </div>
    //       )}
    //     </div>

    //     {/* Items */}
    //     <div className="p-3 mb-3 overflow-y-auto bg-white shadow-sm rounded-xl max-h-44">
    //       <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
    //         <ShoppingCartOutlined /> Items
    //       </h3>
    //       {order.items.map((item, i) => (
    //         <div
    //           key={i}
    //           className="flex items-center justify-between py-2 border-b last:border-b-0"
    //         >
    //           <div>
    //             <p className="text-sm font-medium text-gray-800">
    //               {item.item?.itemName || "Unnamed Item"}
    //             </p>
    //             <p className="text-xs text-gray-500">
    //               {item.quantity} × ₹{item.salesPrice?.toFixed(2)}
    //             </p>
    //           </div>
    //           <div className="text-sm font-semibold text-gray-700">
    //             ₹{(item.salesPrice * item.quantity).toFixed(2)}
    //           </div>
    //         </div>
    //       ))}
    //     </div>

    //     {/* Summary */}
    //     <div className="p-3 mb-3 bg-white shadow-sm rounded-xl">
    //       <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
    //         💰 Summary
    //       </h3>
    //       <div className="flex justify-between py-1 text-sm">
    //         <span>Subtotal</span>
    //         <span>₹{breakdown.subtotal.toFixed(2)}</span>
    //       </div>
    //       <div className="flex justify-between py-1 text-sm">
    //         <span>Discount</span>
    //         <span>-₹{breakdown.totalDiscount.toFixed(2)}</span>
    //       </div>
    //       <div className="flex justify-between py-1 text-sm">
    //         <span>Tax</span>
    //         <span>₹{breakdown.totalTax.toFixed(2)}</span>
    //       </div>
    //       <div className="flex justify-between py-1 text-sm">
    //         <span>Shipping</span>
    //         <span>₹{(order.shippingFee  || order.deliveryCharge || 0).toFixed(2)}</span>
    //       </div>
    //       <div className="flex justify-between py-1 text-sm">
    //         <span>Processing</span>
    //         <span>₹{(order.processingFee || 0).toFixed(2)}</span>
    //       </div>
    //       <Divider className="my-2" />
    //       <div className="flex justify-between text-base font-semibold text-gray-800">
    //         <span>Total</span>
    //         <span>₹{order.totalAmount.toFixed(2)}</span>
    //       </div>
    //     </div>

    //     {/* Shipping */}
    //     <div className="p-3 mb-3 bg-white shadow-sm rounded-xl">
    //       <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
    //         📦 Shipping Address
    //       </h3>
    //       {order.shippingAddress?.[0] ? (
    //         <div className="text-sm leading-relaxed text-gray-700" onClick={()=>openMap(`${order.shippingAddress[0].houseNo} ${order.shippingAddress[0].area} ${order.shippingAddress[0].city} ${order.shippingAddress[0].state} ${order.shippingAddress[0].country} ${order.shippingAddress[0].postalCode}`)}>
    //           {order.shippingAddress[0].houseNo},{" "}
    //           {order.shippingAddress[0].area},<br />
    //           {order.shippingAddress[0].city},{" "}
    //           {order.shippingAddress[0].state},{" "}
    //           {order.shippingAddress[0].country} -{" "}
    //           {order.shippingAddress[0].postalCode}
    //         </div>
    //       ) : (
    //         <p className="text-sm text-gray-500">No address available.</p>
    //       )}
    //     </div>


    //     {order.status!=="Completed" && !order.posCreated && (
    //         <Button
    //         type="text"
    //         icon={<EditOutlined />}
    //         onClick={() => {
    //           navigate(`/order/pos-create?orderId=${order._id}&warehouse=${order.warehouse._id}&customer=${order.customer._id}`);
    //       }}
    //       >
    //         Edit
    //       </Button>  
    //     )}
        
    //     <Button
    //       type="text"
    //       icon={<PrinterOutlined />}
    //       onClick={()=>handleBluetoothPrint(order)}
    //     >
    //       Print
    //     </Button>
    //   </div>

     

    //   <style jsx>{`
    //     .mobile-modal .ant-modal-content {
    //       border-radius: 0;
    //       box-shadow: none;
    //     }
    //     .mobile-modal .ant-modal-body {
    //       padding: 0 !important;
    //     }
    //   `}</style>
    // </Modal>
    <Modal
  open={visible}
  onCancel={onClose}
  footer={null}
  width="100%"
  className="rounded-none mobile-modal"
  style={{ top: 0, padding: 0 }}
  bodyStyle={{
    padding: "0",
    height: "100%",
    overflow: "hidden",
    background: "#f1f5f9",
  }}
  closable={false}
>
  {print && <Print print={print} setPrint={setPrint} setDevice={setDevice} />}

  {/* HEADER */}
  <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white shadow-md">
    <div className="flex items-center gap-2 text-base font-semibold text-gray-800">
      <ShoppingCartOutlined /> Order #{order.orderNumber}
    </div>

    <button
      onClick={onClose}
      className="flex items-center justify-center text-white bg-red-500 rounded-full w-7 h-7"
    >
      ✕
    </button>
  </div>

  {device && <BluetoothDevicesPage setDevice={setDevice} />}

  {/* BODY */}
  <div
    ref={contentRef}
    className="overflow-y-auto pb-28 h-[calc(100vh-60px)] px-4 pt-3 space-y-3"
  >

    {/* CUSTOMER CARD */}
    <div className="p-4 bg-white shadow rounded-xl">
      <p className="mb-1 text-xs text-gray-500">Customer</p>

      <p className="text-base font-semibold text-gray-800">
        {order.customer?.name || "N/A"}
      </p>

      {/* CALL BUTTON */}
      <button
        onClick={() => callNumber(order.customer.phone)}
        className="flex items-center gap-2 px-3 py-1 mt-1 text-sm font-medium text-white bg-green-600 rounded-lg"
      >
        📞 Call Customer
      </button>

      <div className="flex justify-between mt-3 text-sm">
        <span>Payment:</span>
        <Tag color={order.paymentStatus === "Completed" ? "green" : "red"}>
          {order.paymentStatus}
        </Tag>
      </div>

      <div className="flex justify-between mt-2 text-sm">
        <span>Method:</span>
        <Tag color="purple">{order.paymentMethod}</Tag>
      </div>

      {order.assignRider && (
        <div className="flex justify-between mt-2 text-sm">
          <span>Rider:</span>
          <span className="font-medium">{order.assignRider.username}</span>
        </div>
      )}
    </div>

    {/* ITEMS */}
    <div className="p-4 bg-white shadow rounded-xl">
      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
        <ShoppingCartOutlined /> Items
      </h3>

      <div className="pr-1 space-y-3 overflow-y-auto max-h-48">
        {order.items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between pb-2 border-b last:border-b-0"
          >
            <div>
              <p className="text-sm font-semibold text-gray-800">
                {item.item?.itemName || "Unnamed Item"}
              </p>
              <p className="text-xs text-gray-500">
                {item.quantity} × ₹{item.salesPrice?.toFixed(2)}
              </p>
            </div>
            <div className="text-sm font-semibold text-gray-900">
              ₹{(item.salesPrice * item.quantity).toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* SUMMARY */}
    <div className="p-4 bg-white shadow rounded-xl">
      <h3 className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700">
        💰 Summary
      </h3>

      <div className="flex justify-between py-1 text-sm">
        <span>Subtotal</span>
        <span>₹{breakdown.subtotal.toFixed(2)}</span>
      </div>

      <div className="flex justify-between py-1 text-sm">
        <span>Discount</span>
        <span>-₹{(breakdown.totalDiscount + order.discountApplied)?.toFixed(2) || 0}</span>
      </div>

      <div className="flex justify-between py-1 text-sm">
        <span>Tax</span>
        <span>₹{breakdown.totalTax.toFixed(2)}</span>
      </div>

      <div className="flex justify-between py-1 text-sm">
        <span>Shipping</span>
        <span>₹{(order.shippingFee || order.deliveryCharge || 0).toFixed(2)}</span>
      </div>

      <div className="flex justify-between py-1 text-sm">
        <span>Processing</span>
        <span>₹{(order.processingFee || 0).toFixed(2)}</span>
      </div>

      <Divider className="my-2" />

      <div className="flex justify-between text-base font-bold text-gray-900">
        <span>Total</span>
        <span>₹{order.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    {/* SHIPPING */}
    <div className="p-4 bg-white shadow rounded-xl">
      <h3 className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700">
        📦 Shipping Address
      </h3>

      {order.shippingAddress?.[0] ? (
        <div
          className="text-sm leading-relaxed text-gray-700 cursor-pointer"
          onClick={() =>
            openMap(
              `${order.shippingAddress[0].houseNo} ${order.shippingAddress[0].area} ${order.shippingAddress[0].city} ${order.shippingAddress[0].state} ${order.shippingAddress[0].country} ${order.shippingAddress[0].postalCode}`
            )
          }
        >
          {order.shippingAddress[0].houseNo},{" "}
          {order.shippingAddress[0].area},<br />
          {order.shippingAddress[0].city},{" "}
          {order.shippingAddress[0].state},{" "}
          {order.shippingAddress[0].country} -{" "}
          {order.shippingAddress[0].postalCode}
        </div>
      ) : (
        <p className="text-sm text-gray-500">No address available.</p>
      )}
    </div>

    {/* ACTION BUTTONS */}
    <div className="flex items-center gap-2 pt-2">
      {order.status !== "Completed" && !order.posCreated && (
        <Button
          type="primary"
          icon={<EditOutlined />}
          className="w-full"
          onClick={() => {
            navigate(
              `/order/pos-create?orderId=${order._id}&warehouse=${order.warehouse._id}&customer=${order.customer._id}`
            );
          }}
        >
          Edit Order
        </Button>
      )}

      <Button
        type="primary"
        icon={<PrinterOutlined />}
        className="w-full"
        onClick={() => handleBluetoothPrint(order)}
      >
        Print
      </Button>
    </div>
  </div>

  <style jsx>{`
    .mobile-modal .ant-modal-content {
      border-radius: 0;
      box-shadow: none;
    }
    .mobile-modal .ant-modal-body {
      padding: 0 !important;
    }
  `}</style>
</Modal>

  );
}
