// import React, { useEffect, useRef, useState } from "react";

// export default function ModernMembershipCard() {
//   const [cardNo, setCardNo] = useState("10002");
//   const barcodeRef = useRef(null);
//   const containerRef = useRef(null);

//   // Render barcode
//   useEffect(() => {
//     const JsBarcode = window.JsBarcode;
//     if (!JsBarcode || !barcodeRef.current) return;

//     barcodeRef.current.innerHTML = "";
//     const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//     barcodeRef.current.appendChild(svg);
    
//     // Barcode generation is dependent on cardNo
//     try {
//       JsBarcode(svg, String(cardNo), {
//         format: "CODE128",
//         width: 1, // Adjusted for thinner bars matching the image
//         height: 25, // Adjusted height
//         displayValue: false, // Hide the number under the barcode, we display it manually below
//         margin: 0, 
//         lineColor: "#FFFFFF", // White color for barcode on dark background
//       });
//     } catch (e) {
//       console.error("Barcode generation failed:", e);
//     }
//   }, [cardNo]);

//   // Utility functions for file download (unchanged)
//   const withRetry = async (fn, retries = 3, delay = 1000) => {
//     for (let i = 0; i < retries; i++) {
//       try {
//         return await fn();
//       } catch (error) {
//         if (i < retries - 1) {
//           await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
//         } else {
//           throw error;
//         }
//       }
//     }
//   };

//   const downloadPNG = async () => {
//     const html2canvas = window.html2canvas;
//     if (!html2canvas || !containerRef.current) {
//         console.error("html2canvas not loaded.");
//         return;
//     }
//     try {
//       const canvas = await withRetry(() => html2canvas(containerRef.current, { 
//         scale: 3, 
//         useCORS: true, 
//         backgroundColor: null 
//       }));

//       const link = document.createElement("a");
//       link.href = canvas.toDataURL("image/png");
//       link.download = `membership_card_${cardNo}.png`;
//       link.click();
//     } catch (error) {
//       console.error("PNG download failed:", error);
//     }
//   };

//   const downloadPDF = async () => {
//     const html2canvas = window.html2canvas;
//     const jsPDF = window.jspdf ? window.jspdf.jsPDF : null;
//     if (!html2canvas || !jsPDF || !containerRef.current) {
//         console.error("html2canvas or jsPDF not loaded.");
//         return;
//     }
//     try {
//       const canvas = await withRetry(() => html2canvas(containerRef.current, { 
//         scale: 3, 
//         useCORS: true, 
//         backgroundColor: "#ffffff" 
//       }));
      
//       const imgData = canvas.toDataURL("image/png");
      
//       const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      
//       const cardWidthMm = 90; // Increased card width slightly
//       const cardHeightMm = 54; 
//       const marginMm = 5; 
//       const totalWidthMm = (cardWidthMm * 2) + marginMm; 
//       const totalHeightMm = cardHeightMm; 

//       const x = (pdf.internal.pageSize.getWidth() - totalWidthMm) / 2;
//       const y = (pdf.internal.pageSize.getHeight() - totalHeightMm) / 2;

//       pdf.addImage(imgData, "PNG", x, y, totalWidthMm, totalHeightMm);
//       pdf.save(`membership_card_${cardNo}.pdf`);
      
//     } catch (error) {
//       console.error("PDF download failed:", error);
//     }
//   };

//   const memberName = "You're One of Us"; 
//   const contactNo = "090500 92092";

//   // Dynamic QR Code URL - Now correctly uses the API
//   const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${cardNo}&size=50x50&color=FFFFFF&bgcolor=FF7E5F&qzone=1`;

//   return (
//     <>
//       <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
//       <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
//       <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
//       <div className="flex flex-col items-center min-h-screen p-6 font-sans bg-gray-100">
//         <div className="flex flex-col items-center w-full max-w-4xl">
//           <h2 className="pb-2 mb-8 text-3xl font-extrabold tracking-tight text-gray-900 border-b-4 border-red-500">
//             Modern Membership Card Generator
//           </h2>

//           {/* Card Input/Control */}
//           <div className="w-full max-w-sm p-6 mb-8 bg-white shadow-xl rounded-2xl">
//             <label htmlFor="cardNo" className="block mb-2 text-base font-semibold text-gray-700">
//               Membership ID
//             </label>
//             <input
//               id="cardNo"
//               type="text"
//               value={cardNo}
//               onChange={(e) => setCardNo(e.target.value.replace(/\D/g, '').slice(0, 10))}
//               placeholder="Enter Card Number (max 10 digits)"
//               className="w-full p-3 text-gray-800 transition duration-150 border border-gray-300 shadow-inner rounded-xl bg-gray-50 focus:ring-red-500 focus:border-red-500"
//             />
//           </div>

//           {/* Download Buttons */}
//           <div className="flex gap-4 mb-12">
//             <button
//               onClick={downloadPNG}
//               className="px-6 py-3 font-semibold text-white transition duration-300 transform bg-orange-500 shadow-lg hover:bg-orange-600 rounded-xl hover:scale-105 active:scale-95"
//             >
//               Download PNG
//             </button>
//             <button
//               onClick={downloadPDF}
//               className="px-6 py-3 font-semibold text-white transition duration-300 transform bg-red-600 shadow-lg hover:bg-red-700 rounded-xl hover:scale-105 active:scale-95"
//             >
//               Download PDF (CR80)
//             </button>
//           </div>

//           {/* MAIN CARD CONTAINER - Two standard CR80 cards side-by-side for export */}
//           <div
//             ref={containerRef}
//             className="flex gap-[5mm] p-2 bg-white rounded-3xl shadow-2xl overflow-hidden" 
//             style={{ width: 'fit-content' }}
//           >
//             {/* CARD 1: LEFT - BACK (90mm x 54mm) */} {/* Updated width */}
//             <div
//               className="relative flex flex-col justify-between p-4 overflow-hidden rounded-xl"
//               style={{ 
//                 width: "90mm", // Updated width
//                 height: "54mm", 
//                 background: "linear-gradient(120deg, #ff7e5f, #ef4444)", // Orange-Red gradient
//               }}
//             >
//               {/* Top Logo and Title (Replicated from image) */}
//               <div className="relative z-10 flex flex-col items-center gap-1.5 pt-2">
//                 {/* Logo using <img> tag */}
//                 <div className="flex items-center justify-center p-1 bg-white rounded-full shadow-md w-9 h-9">
//                     <img 
//                       src="./inspiredgrow.jpg" 
//                       alt="Grocery on Wheels Logo" 
//                       className="object-contain w-full h-full rounded-full" 
//                     />
//                 </div>
//                 <div className="text-2xl font-bold tracking-tight text-white">grocery</div>
//                 <div className="text-white text-base font-semibold tracking-wide border-t border-b border-white/70 px-2 py-0.5 mt-[-5px]">
//                   — on wheels —
//                 </div>
//               </div>

//               {/* Tagline */}
//               <div className="relative z-10 mx-auto mt-auto text-xl italic leading-tight text-center text-white">
//                 "wholesale ke rate, <br /> apke ghar ke gate..."
//               </div>

//               {/* Barcode Area - Dynamic based on cardNo */}
//               <div className="relative z-10 mx-auto mt-2 w-[80%] h-auto bg-transparent flex flex-col items-center">
//                 <div ref={barcodeRef} className="w-full h-[25px] overflow-hidden bg-transparent" />
//                 <div className="text-[10px] text-white font-mono tracking-widest mt-0.5">
//                     {cardNo.split('').join(' ')}
//                 </div>
//               </div>
//             </div>

//             {/* CARD 2: RIGHT - FRONT (90mm x 54mm) */} {/* Updated width */}
//             <div
//               className="relative flex flex-col justify-between p-4 overflow-hidden bg-white rounded-xl"
//               style={{ 
//                 width: "90mm", // Updated width
//                 height: "54mm", 
//               }}
//             >
//               {/* Gradient Header */}
             

//               <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-xl">
//   <svg viewBox="0 0 800 80" preserveAspectRatio="none" className="w-full h-full">
//     <defs>
//       <linearGradient id="cardFrontGradient" x1="0" y1="0" x2="1" y2="0">
//         <stop offset="0%" stopColor="#ff7e5f" />
//         <stop offset="100%" stopColor="#8B0000" />
//       </linearGradient>
//     </defs>

//     {/* Background gradient */}
//     <rect x="0" y="0" width="800" height="80" fill="url(#cardFrontGradient)" />

//     {/* Wave at bottom */}
//     <path
//       d="M0,60 C150,90 350,40 800,70 L800,80 L0,80 Z"
//       fill="white"
//       fillOpacity="0.3"
//     />
//   </svg>

//   {/* Text overlay */}
//   <div className="absolute text-2xl font-bold text-white left-4 top-3">
//     Premium Member
//   </div>
// </div>

//               {/* Main Content Area */}
//               <div className="z-10 mt-[27mm] flex flex-col justify-between flex-grow">
//                 <div className="mb-auto">
//                   <div className="mb-1 text-base font-semibold text-gray-800">
//                     {memberName}
//                   </div>
//                   <div className="text-sm text-gray-600">Card No: <span className="font-bold">{cardNo}</span></div>
//                   <div className="flex items-center gap-1 mt-2 text-sm text-gray-700">
//                     {/* Phone Icon */}
//                     <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4"/><path d="M12 18V6"/><path d="M15 9l-3-3-3 3"/></svg>
//                     <span>{contactNo}</span>
//                   </div>
//                 </div>

//                 {/* QR Code and Socials */}
//                 <div className="flex items-end justify-between mt-auto">
//                   <div className="flex flex-col gap-1">
//                     <img src="https://via.placeholder.com/20x20/FF7E5F/FFFFFF?text=A" alt="App Store" className="w-5 h-5" />
//                     <img src="https://via.placeholder.com/20x20/FF7E5F/FFFFFF?text=G" alt="Google Play" className="w-5 h-5" />
//                   </div>
                  
//                   <div className="flex flex-col items-center">
//                     <div className="text-[8px] text-gray-500 font-semibold mb-0.5">Scan to Check Balance</div>
//                     {/* QR Code using <img> tag and dynamic URL */}
//                     <img 
//                       src={qrCodeUrl} // Correctly using the dynamic QR code URL
//                       alt={`QR Code for Card ${cardNo}`} 
//                       className="w-[18mm] h-[18mm] rounded-sm shadow-sm" 
//                     /> 
//                   </div>
                  
//                   <div className="flex flex-col items-end">
//                     <div className="text-[8px] text-gray-500">Follow us on</div>
//                     <div className="flex items-center gap-1 text-[8px] text-gray-700">
//                       {/* Instagram Icon */}
//                       <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-instagram"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
//                       <span className="font-semibold">/grocery_on_wheels_</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* Small Footer Text */}
//                 <div className="text-[6px] text-gray-500 mt-2 text-center leading-tight">
//                   This card is non-transferable. Terms & conditions apply. Valid only with Grocery on Wheels services.
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



// import React from "react";
// import { Phone } from "lucide-react";

// export default function PremiumMemberCard() {
//   return (
//     <div className="relative w-[120mm] h-[80mm] bg-white rounded-xl shadow-lg overflow-hidden font-sans text-[3.2mm] mx-auto mt-10">
//       {/* ===== Gradient Wave Header ===== */}
//       <div className="absolute top-0 left-0 w-full h-[42mm] overflow-hidden">
//         <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="w-full h-full">
//           <defs>
//             <linearGradient id="cardGradient" x1="0" y1="0" x2="1" y2="1">
//               <stop offset="0%" stopColor="#ff7e5f" />
//               <stop offset="50%" stopColor="#e03e3e" />
//               <stop offset="100%" stopColor="#8B0000" />
//             </linearGradient>
//           </defs>

//           {/* Gradient background */}
//           <rect x="0" y="0" width="800" height="150" fill="url(#cardGradient)" />

//           {/* Smooth wave bottom (now slightly higher to remove red line overlap) */}
//           <path
//             d="M0,130 C250,190 550,70 800,150 L800,200 L0,200 Z"
//             fill="white"
//           />
//         </svg>

//         {/* Text inside gradient */}
//         <div className="absolute leading-tight text-white left-6 top-6">
//           <h1 className="text-[7mm] font-extrabold">Premium</h1>
//           <h1 className="text-[7mm] font-extrabold -mt-1">Member</h1>
//         </div>
//       </div>

//       {/* ===== Main Content Below Wave ===== */}
//       <div className="absolute bottom-[7mm] left-0 w-full flex justify-between items-start px-6">
//         {/* Left Section */}
//         <div className="flex flex-col gap-[1.5mm]">
//           <p className="text-[6mm] font-medium opacity-90">You're One of Us</p>
//           <p className="text-[5mm]">
//             Card No: <span className="font-semibold">10001</span>
//           </p>

//           {/* Phone */}
//           <div className="flex items-center gap-1 font-semibold text-black mt-[1mm]">
//             <Phone size={15} />
//             <span className="text-[5mm]">090500 92092</span>
//           </div>
//         </div>

//         {/* Right Section */}
//         <div className="flex flex-col items-center text-center mt-[1mm]">
//           <p className="text-[2.8mm] font-semibold text-gray-700 mb-[1mm] leading-tight">
//             Scan to<br />Check Balance
//           </p>
//           <img src="/qr.png" alt="QR Code" className="w-[16mm] h-[16mm] mb-[1mm]" />

//           {/* <div className="flex flex-col items-center text-[2.5mm] text-gray-700">
//             <p>Follow us on</p>
//             <div className="flex items-center gap-1">
//               <img
//                 src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png"
//                 alt="Instagram"
//                 className="w-[3mm] h-[3mm]"
//               />
//               <span>@grocery_on_wheels_</span>
//             </div>
//           </div> */}
//         </div>
//       </div>

//       {/* ===== Footer Note ===== */}
//       <p className="absolute bottom-[1mm] left-0 w-full text-[3mm] text-center text-gray-500 leading-tight px-2">
//         ** This card is non-transferable. Terms & conditions apply. Valid only with Grocery on Wheels services.
//       </p>
//     </div>
//   );
// }
// <div className="......................................."></div>



// import React, { useEffect, useRef } from "react";
// import JsBarcode from "jsbarcode";

// export default function CardBack() {
//   const barcodeRef = useRef(null);

//   useEffect(() => {
//     JsBarcode(barcodeRef.current, "1001", {
//       format: "CODE128",
//       displayValue: false,
//       lineColor: "#fff",
//       background: "transparent",
//       width: 2,
//       height: 40,
//     });
//   }, []);

//   return (
//     <div className="relative w-[120mm] h-[80mm] rounded-xl shadow-lg overflow-hidden text-white font-sans mx-auto mt-10">
//       {/* ===== Gradient Background ===== */}
//       <svg
//         viewBox="0 0 800 500"
//         preserveAspectRatio="none"
//         className="absolute top-0 left-0 w-full h-full"
//       >
//         <defs>
//           <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
//             <stop offset="0%" stopColor="#ff9800" />
//             <stop offset="40%" stopColor="#ff5722" />
//             <stop offset="100%" stopColor="#c62828" />
//           </linearGradient>
//         </defs>

//         {/* Abstract layered curves for rich texture */}
//         <rect width="800" height="500" fill="url(#bgGradient)" />
//         <path
//           d="M0,300 C200,400 600,200 800,320 L800,500 L0,500 Z"
//           fill="rgba(255, 255, 255, 0.05)"
//         />
//         <path
//           d="M0,250 C250,350 550,150 800,280 L800,500 L0,500 Z"
//           fill="rgba(255, 255, 255, 0.08)"
//         />
//       </svg>

//       {/* ===== Logo Section ===== */}
//       <div className="relative flex flex-col items-center justify-center h-full px-6 text-center">
//         {/* Logo */}
//         <div className="flex flex-col items-center mb-2">
//           <img src="/inspiredgrow.jpg" alt="Logo" className="w-[18mm] h-[18mm]" />
//         </div>

//         {/* Brand Name */}
//         <h1 className="text-[10mm] font-extrabold leading-tight tracking-wide">
//           grocery
//         </h1>
//         <div className="flex items-center justify-center w-full mb-2">
//           <div className="flex-grow mx-2 border-t border-white opacity-60"></div>
//           <h2 className="text-[5mm] font-light tracking-wide italic">
//             on wheels
//           </h2>
//           <div className="flex-grow mx-2 border-t border-white opacity-60"></div>
//         </div>

//         {/* Tagline */}
//         <p className="italic text-[4.5mm] mb-3 opacity-90">
//           “ wholesale ke rate, <br /> apke ghar ke gate … ”
//         </p>

//         {/* Barcode */}
//         <svg ref={barcodeRef} className="w-[50mm] h-[12mm] mt-1" />
//       </div>
//     </div>
//   );
// }

// import React, { useRef, useEffect,useState } from "react";
// import JsBarcode from "jsbarcode";
// import html2canvas from "html2canvas";
// import { jsPDF } from "jspdf";

// export default function MembershipCard() {
//   const frontRef = useRef(null);
//   const backRef = useRef(null);
//   const barcodeRef = useRef(null);
//   // const barcodeSvgRef = useRef(null);
//   const [barcodeDataUrl, setBarcodeDataUrl] = useState(null);
//   // Example dynamic data
//   // const name = "Mayank Sharma";
//   const phone = "+91 9876543210";
//   const cardNo = "1001";

//   // Generate barcode
//   useEffect(() => {
//     const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//     JsBarcode(svg, cardNo, {
//       format: "CODE128",
//       lineColor: "#000",
//       displayValue: false,
//       width: 2,
//       height: 80,
//       margin: 0,
//     });

//     // Convert SVG → PNG for html2canvas
//     const svgData = new XMLSerializer().serializeToString(svg);
//     const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
//     const url = URL.createObjectURL(svgBlob);

//     const img = new Image();
//     img.onload = function () {
//       const canvas = document.createElement("canvas");
//       canvas.width = img.width;
//       canvas.height = img.height;
//       const ctx = canvas.getContext("2d");
//       ctx.drawImage(img, 0, 0);
//       const pngDataUrl = canvas.toDataURL("image/png");
//       setBarcodeDataUrl(pngDataUrl);
//       URL.revokeObjectURL(url);
//     };
//     img.src = url;
//   }, [cardNo]);

//   // Download both sides as PDF
//   const downloadPDF = async () => {
//     const frontCanvas = await html2canvas(frontRef.current, {
//       scale: 2,
//       useCORS: true,
//     });
//     const backCanvas = await html2canvas(backRef.current, {
//       scale: 2,
//       useCORS: true,
//     });

//     const frontImgData = frontCanvas.toDataURL("image/png");
//     const backImgData = backCanvas.toDataURL("image/png");

//     // Each side 600x400 px, total width 1200 px for side-by-side layout
//     const cardWidth = 600;
//     const cardHeight = 400;

//     const pdf = new jsPDF({
//       orientation: "landscape",
//       unit: "pt",
//       format: [cardWidth * 2, cardHeight],
//     });

//     // Place front (left) and back (right)
//     pdf.addImage(frontImgData, "PNG", 0, 0, cardWidth, cardHeight);
//     pdf.addImage(backImgData, "PNG", cardWidth, 0, cardWidth, cardHeight);

//     pdf.save(`membership_card_${cardNo}.pdf`);
//   };


//   return (
//     <div className="flex flex-col items-center gap-4 p-4">
//       {/* -------- FRONT SIDE -------- */}
//       <div
//         ref={frontRef}
//         className="relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
//         style={{
//           backgroundImage: "url('/card-front.png')",
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//           width:"600px",
//           height:"400px"
//         }}
//       >
//         {/* Name */}
//         {/* <div className="absolute top-[29mm] left-[14mm] text-black font-semibold text-[4mm]">
//           {name}
//         </div> */}

//         {/* Phone */}
        

//         {/* Card No */}
//         <div className="absolute top-[70mm] left-[35mm] text-black text-xl">
//           {cardNo}
//         </div>

//         <div className="absolute top-[80mm] left-[20mm] text-black text-xl">
//           {phone}
//         </div>

//         {/* QR Code (top-right corner) */}
//         <img
//           src="/qr.png"
//           alt="QR"
//           className="absolute top-[43mm] right-[14mm] w-36"
//         />
//       </div>

//       {/* -------- BACK SIDE -------- */}
//       <div
//         ref={backRef}
//         className="relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
//         style={{
//           backgroundImage: "url('/card-back.png')",
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//           width:"600px",
//           height:"400px"
//         }}
//       >
//         {/* Barcode at bottom-right */}
//         {/* <svg */}
//           {/* // ref={barcodeRef} */}
//           {/* // className="absolute bottom-[17mm] right-[60mm]" */}
//           {/* // style={{ width: "38mm", height: "12mm" }} */}
//         {/* // ></svg> */}
//         {barcodeDataUrl && (
//           <img
//             src={barcodeDataUrl}
//             alt="Barcode"
//             className="absolute bottom-[50px] right-[220px] w-[180px] h-[60px]"
//           />
//         )}
//       </div>

//       {/* Download Button */}
//       <button
//         onClick={downloadPDF}
//         className="px-6 py-2 text-white bg-orange-600 rounded-lg shadow hover:bg-orange-700"
//       >
//         Download Card (PDF)
//       </button>
//     </div>
//   );
// }

import React, { useEffect, useState ,useRef} from "react";
import Navbar from "../Navbar";
import JsBarcode from "jsbarcode";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Sidebar from "../Sidebar";
import axios from "axios";

const API_BASE = "https://pos.inspiredgrow.in/vps/api";

const CardTablePage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [cards, setCards] = useState([]);
  const [warehouses, setWarehouses] = useState([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);

  const [selectedCard, setSelectedCard] = useState(null);
  const [walletTxns, setWalletTxns] = useState([]);

  // Assign form states
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [sector, setSector] = useState("");
  const [details, setDetails] = useState("");
  const[houseNo,setHouseNo]=useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [serverOtp, setServerOtp] = useState("");
  const [error, setError] = useState("");

  // Remark form states
  const [remark, setRemark] = useState("");

  // Warehouse form state
  const [warehouse, setWarehouse] = useState("");

  useEffect(() => {
    fetchCards();
    fetchWarehouses();
  }, []);

  const fetchCards = async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/card`);
      console.log("Fetched cards:", data.cards);
      setCards(data.cards);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const { data } = await axios.get(`/api/warehouses?scope=mine`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      console.log("Fetched warehouses:", data.data);
      setWarehouses(data.data || []);
    } catch (err) {
      console.error("Failed to fetch warehouses:", err);
    }
  };

  const fetchWalletTransactions = async (cardNo) => {
    try {
      const { data } = await axios.get(`${API_BASE}/card/wallet/${cardNo}`);
      setWalletTxns(data.walletEntries || []);
      setShowWalletModal(true);
    } catch (err) {
      console.error(err);
      setWalletTxns([]);
      setShowWalletModal(true);
    }
  };

  const openAssignModal = (card) => {
    setSelectedCard(card);
    setName("");
    setMobile("");
    setSector("");
    setDetails("");
    setHouseNo("");
    setOtp("");
    setOtpSent(false);
    setOtpVerified(false);
    setServerOtp("");
    setError("");
    setShowAssignModal(true);
  };

  const openRemarkModal = (card) => {
    setSelectedCard(card);
    setRemark("");
    setShowRemarkModal(true);
  };

  const openWarehouseModal = (card) => {
    setSelectedCard(card);
    setWarehouse("");
    setShowWarehouseModal(true);
  };

  const handleSendOTP = async () => {
    if (!mobile) return setError("Mobile number is required");
    try {
      const { data } = await axios.post(`${API_BASE}/card/otp-send`, { phone: mobile });
      if (data.status !== 200) throw new Error("Failed to send OTP");
      setServerOtp(data.otp);
      setOtpSent(true);
      setError("");
      alert("OTP sent successfully!");
    } catch (err) {
      console.error(err);
      setError("Failed to send OTP");
    }
  };

  const handleVerifyOTP = () => {
    if (!otp) return setError("Enter OTP");
    if (otp === serverOtp) {
      setOtpVerified(true);
      setError("");
      alert("OTP verified successfully!");
    } else {
      setError("Invalid OTP");
    }
  };

  const handleAssignSave = async () => {
    if (!otpVerified) return setError("Verify OTP first!");
    try {
      await axios.post(`${API_BASE}/card/assign-info`, {
        cardNo: selectedCard.cardNo,
        name,
        mobile,
        sector,
        details,
        houseNo
      });
      alert("Card assigned successfully!");
      setShowAssignModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to save data");
    }
  };

  const handleRemarkSave = async () => {
    try {
      await axios.post(`${API_BASE}/card/assign-remark`, {
        cardNo: selectedCard.cardNo,
        remark,
      });
      alert("Remark added successfully!");
      setShowRemarkModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to save remark");
    }
  };

  const handleWarehouseSave = async () => {
    if (!warehouse) return setError("Select warehouse");
    console.log("Selected warehouse ID:", warehouse);
    try {
      await axios.post(`${API_BASE}/card/assign-warehouse`, {
        cardNo: selectedCard.cardNo,
        warehouseId: warehouse, // send warehouse _id
      });
      alert("Warehouse assigned successfully!");
      setShowWarehouseModal(false);
      fetchCards();
    } catch (err) {
      setError("Failed to assign warehouse");
    }
  };

  const handleClearDetails = async (card) => {
     if (window.confirm("Are you sure you want to clear details?")){
  try {
    await axios.put(`/api/card/clear-details`, {cardNo: card.cardNo}); // backend route to clear details
    alert("Card details cleared!");
    // refresh state here...
    fetchCards();
  } catch (err) {
    console.error(err);
    alert("Failed to clear card details");
  }
}
};

const handleDeleteCard = async (card) => {
  if (window.confirm("Are you sure you want to delete this card?")) {
    try {
     await axios.delete("/api/card", {
  data: { cardNo: card.cardNo }  // Must use `data` key
});

      alert("Card deleted successfully!");
      fetchCards();
      // refresh state here...
      fetchCards();
    } catch (err) {
      console.error(err);
      alert("Failed to delete card");
    }
  }
};

const cardRefs = useRef([]); // store front+back container refs

 const [barcodes, setBarcodes] = useState({});

// Generate all barcodes once cards are loaded
useEffect(() => {
  const generateBarcode = (cardNo) => {
    return new Promise((resolve) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, cardNo, {
        format: "CODE128",
        lineColor: "#000",
        displayValue: false,
        width: 2,
        height: 80,
        margin: 0,
      });

      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const pngDataUrl = canvas.toDataURL("image/png");
        resolve(pngDataUrl);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  };

  // Generate all barcodes and store them by cardNo
  const loadBarcodes = async () => {
    const results = {};
    for (const card of cards) {
      results[card.cardNo] = await generateBarcode(card.cardNo);
    }
    setBarcodes(results);
  };

  loadBarcodes();
}, [cards]);

const downloadAllPDF = async () => {
  const cardWidth = 600;
  const cardHeight = 400;
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: [cardWidth * 2, cardHeight],
  });

  for (let i = 0; i < cards.length; i++) {
    const cardContainer = cardRefs.current[i];
    if (!cardContainer) continue;

    // Capture front & back separately
    const frontCanvas = await html2canvas(cardContainer.querySelector(".card-front"), { scale: 2, useCORS: true });
    const backCanvas = await html2canvas(cardContainer.querySelector(".card-back"), { scale: 2, useCORS: true });

    const frontImgData = frontCanvas.toDataURL("image/png");
    const backImgData = backCanvas.toDataURL("image/png");

    // Add new page for each card (skip addPage for first)
    if (i > 0) pdf.addPage([cardWidth * 2, cardHeight]);

    pdf.addImage(frontImgData, "PNG", 0, 0, cardWidth, cardHeight);
    pdf.addImage(backImgData, "PNG", cardWidth, 0, cardWidth, cardHeight);
  }

  pdf.save("all_membership_cards.pdf");
};

  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
          
          <h1 className="mb-6 text-2xl font-bold">Card able</h1>
          
          <button
         onClick={downloadAllPDF}
        className="px-6 py-2 mt-6 text-white bg-orange-600 rounded-lg shadow hover:bg-orange-700"
      >
        Download All Cards (PDF)
      </button>
          <table className="w-full bg-white border border-collapse border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Card No</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Mobile</th>
                <th className="p-2 border">Sector</th>
                <th className="p-2 border">HouseNo</th>
                <th className="p-2 border">Details</th>
                <th className="p-2 border">Remark</th>
                <th className="p-2 border">Wallet</th>
                
                <th className="p-2 border">Warehouse</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card._id}>
                  <td
                    className="p-2 text-blue-600 border cursor-pointer hover:underline"
                    onClick={() => fetchWalletTransactions(card.cardNo)}
                  >
                    {card.cardNo}
                  </td>
                  <td className="p-2 border">{card.name?.customerName || "-"}</td>
                  <td className="p-2 border">{card.mobile || "-"}</td>
                  <td className="p-2 border">{card.sector || "-"}</td>
                  <td className="p-2 border">{card.houseNo || "-"}</td>
                  <td className="p-2 border">{card.details || "-"}</td>
                  <td className="p-2 border">
                    {card.remark?.length > 0 ? (
                      <ul className="text-left list-disc list-inside">
                        {card.remark.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2 border">{card.wallet || 0}</td>
                  <td className="p-2 border">{card.warehouseId?.warehouseName || "-"}</td>
                  <td className="p-2 space-x-2 border">
                    <button
                      onClick={() => openAssignModal(card)}
                      className="px-3 py-1 text-white bg-blue-500 rounded"
                    >
                      Assign
                    </button>
                    <button
                      onClick={() => openRemarkModal(card)}
                      className="px-3 py-1 text-white bg-green-500 rounded"
                    >
                      Add Remark
                    </button>
                    <button
                      onClick={() => openWarehouseModal(card)}
                      className="px-3 py-1 text-white bg-purple-500 rounded"
                    >
                      Assign Warehouse
                    </button>
                    <button
    onClick={() => handleClearDetails(card)}
    className="px-3 py-1 text-white bg-yellow-500 rounded"
  >
    Clear Details
  </button>
   <button
    onClick={() => handleDeleteCard(card)}
    className="px-3 py-1 text-white bg-red-600 rounded"
  >
    Delete
  </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Warehouse Modal */}
          {showWarehouseModal && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="p-6 bg-white rounded w-96">
                <h2 className="mb-4 text-lg font-bold">Assign Warehouse</h2>
                {error && <p className="mb-2 text-red-500">{error}</p>}

                <select
                  className="w-full p-2 mb-2 border rounded"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="">-- Select Warehouse --</option>
                  {warehouses.map((wh) => (
                    <option key={wh._id} value={wh._id}>
                      {wh.warehouseName}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowWarehouseModal(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleWarehouseSave}
                    className="px-3 py-1 text-white bg-purple-600 rounded"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

        
          
          
          
          
          
          
          
          {/* Existing Wallet Modal, Assign Modal & Remark Modal remain same */} {/* Wallet Transactions Modal */}
          
          {/* Wallet Transactions Modal */}
{showWalletModal && (
  <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
    <div className="p-6 bg-white rounded w-[600px] max-h-[80vh] overflow-y-auto">
      <h2 className="mb-4 text-lg font-bold">
        Wallet Transactions for {selectedCard?.cardNo}
      </h2>

      {walletTxns.length > 0 ? (
        <>
          <table className="w-full border border-collapse border-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">Date</th>
                <th className="p-2 border">SaleCode</th>
                <th className="p-2 border">Used</th>
                <th className="p-2 border">Earned</th>
                <th className="p-2 border">Total Pay</th>
              </tr>
            </thead>
            <tbody>
              {walletTxns.map((txn) => (
                <tr key={txn._id}>
                  <td className="p-2 border">
                    {new Date(txn.createdAt).toLocaleString()}
                  </td>
                  <td className="p-2 border">{txn.saleCode}</td>
                  <td className="p-2 border">{txn.debit}</td>
                  <td className="p-2 border">{txn.credit}</td>
                 
                  <td className="p-2 border">
                    {txn.totalAmount}
                  </td>
                </tr>
              ))}

              {/* Show Total at the bottom */}
              <tr className="font-bold bg-gray-100">
                <td className="p-2 text-right border" colSpan={2}>
                  Total Balance
                </td>
                <td className="p-2 border">
                  {walletTxns.reduce((acc, txn) => {
                    return acc - (txn.debit || 0) + (txn.credit || 0);
                  }, 0).toFixed(2)}
                </td>
                <td className="p-2 border" colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </>
      ) : (
        <p>No transactions found</p>
      )}

      <div className="flex justify-end mt-4">
        <button
          onClick={() => setShowWalletModal(false)}
          className="px-3 py-1 border rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

           
           
           
            {/* Existing Assign Modal & Remark Modal here... */} {/* (Keep your Assign and Remark modal code unchanged) */} {showAssignModal && ( <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"> <div className="p-6 bg-white rounded w-96"> <h2 className="mb-4 text-lg font-bold">Assign Card</h2> {error && <p className="mb-2 text-red-500">{error}</p>} <input type="text" placeholder="Name" className="w-full p-2 mb-2 border rounded" value={name} onChange={(e) => setName(e.target.value)} /> 
            <div className="flex gap-2 mb-2"> <input type="text" placeholder="Mobile" className="flex-1 p-2 border rounded" value={mobile} onChange={(e) => setMobile(e.target.value)} disabled={otpSent} /> {!otpSent && ( <button onClick={handleSendOTP} className="px-3 py-1 text-white rounded bg-cyan-500" > Send OTP </button> )} </div>
             {otpSent && !otpVerified && ( <div className="flex gap-2 mb-2"> <input type="text" placeholder="Enter OTP" className="flex-1 p-2 border rounded" value={otp} onChange={(e) => setOtp(e.target.value)} /> <button onClick={handleVerifyOTP} className="px-3 py-1 text-white bg-green-500 rounded" > Verify </button> </div> )}
              <input type="text" placeholder="Sector" className="w-full p-2 mb-2 border rounded" value={sector} onChange={(e) => setSector(e.target.value)} />
              <input type="text" placeholder="HouseNo" className="w-full p-2 mb-2 border rounded" value={houseNo} onChange={(e) => setHouseNo(e.target.value)} />
               <textarea placeholder="Details" className="w-full p-2 mb-2 border rounded" rows={3} value={details} onChange={(e) => setDetails(e.target.value)} /> <div className="flex justify-end gap-2"> <button onClick={() => setShowAssignModal(false)} className="px-3 py-1 border rounded" > Cancel </button> {otpVerified && ( <button onClick={handleAssignSave} className="px-3 py-1 text-white bg-blue-600 rounded" > Save </button> )} </div> </div> </div> )} {/* Remark Modal */} {showRemarkModal && ( <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"> <div className="p-6 bg-white rounded w-96"> <h2 className="mb-4 text-lg font-bold">Add Remark</h2> <textarea placeholder="Remark" className="w-full p-2 mb-2 border rounded" rows={3} value={remark} onChange={(e) => setRemark(e.target.value)} /> <div className="flex justify-end gap-2"> <button onClick={() => setShowRemarkModal(false)} className="px-3 py-1 border rounded" > Cancel </button> <button onClick={handleRemarkSave} className="px-3 py-1 text-white bg-green-600 rounded" > Save </button> </div> </div> </div> )}
        </div>
      </div>






      <div >
        {cards.map((card, i) => (
          <div key={card.cardNo} ref={(el) => (cardRefs.current[i] = el)}>
            {/* Front */}
                 <div className="flex  items-center gap-4 p-4">
      {/* -------- FRONT SIDE -------- */}
       <div
      
        className="card-front relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
        style={{
          backgroundImage: "url('/card-front.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          width:"600px",
          height:"400px"
        }}
      >
        {/* Name */}
        {/* <div className="absolute top-[29mm] left-[14mm] text-black font-semibold text-[4mm]">
          {name}
        </div> */}

        {/* Phone */}
        

        {/* Card No */}
        <div className="absolute top-[70mm] left-[35mm] text-black text-xl">
          {card.cardNo}
        </div>

        <div className="absolute top-[80mm] left-[20mm] text-black text-xl">
          090500 92092
        </div>

        {/* QR Code (top-right corner) */}
        <img
          src="/qr.png"
          alt="QR"
          className="absolute top-[43mm] right-[14mm] w-36"
        />
      </div>

      {/* -------- BACK SIDE -------- */}
      <div
        
        className="card-back relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
        style={{
          backgroundImage: "url('/card-back.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          width:"600px",
          height:"400px"
        }}
      >
        {/* Barcode at bottom-right */}
        {/* <svg */}
          {/* // ref={barcodeRef} */}
          {/* // className="absolute bottom-[17mm] right-[60mm]" */}
          {/* // style={{ width: "38mm", height: "12mm" }} */}
        {/* // ></svg> */}
        
          {/* <img
            src={generateBarcode(card.cardNo)}
            alt="Barcode"
            className="absolute bottom-[50px] right-[220px] w-[180px] h-[60px]"
          /> */}
         {barcodes[card.cardNo] ? (
                <img
                  src={barcodes[card.cardNo]}
                  alt="Barcode"
                  className="absolute bottom-[50px] right-[220px] w-[180px] h-[60px] "
                />
              ) : (
                <div className="absolute bottom-[50px] right-[220px] text-gray-500">
                  Generating...
                </div>
              )}
      </div>

      
    </div>
          </div>
        ))}
      </div>



      
    </div>
  );
};

export default CardTablePage;
