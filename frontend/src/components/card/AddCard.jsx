// import React, { useState, useEffect } from "react";
// import Navbar from "../Navbar";
// import Sidebar from "../Sidebar";
// import axios from "axios";

// const OTP_API = "https://pos.inspiredgrow.in/vps/api/card/otp-send"; // replace with your API

// const CardFormPage = () => {
//   const [isSidebarOpen, setSidebarOpen] = useState(true);
//   const [cardNo, setCardNo] = useState("");
 
//   const [error, setError] = useState("");




//   const handleSubmit = async () => {
//     if (!cardNo ) {
//       return setError("Card No is required");
//     }
//     console.log({ cardNo });
//     try {
//       await axios.post("https://pos.inspiredgrow.in/vps/api/card", {
//         cardNo,
//       });
//       alert("Data saved successfully!");
//       setCardNo("");
     
//       setError("");
//     } catch (err) {
//       setError("Failed to save data");
//     }
//   };

//   return (
//     <div className="flex flex-col h-screen">
//       <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
//       <div className="flex">
//         <Sidebar isSidebarOpen={isSidebarOpen} />
//         <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
//           <h1 className="mb-6 text-2xl font-bold">Card Form</h1>

//           {error && <p className="mb-4 text-red-500">{error}</p>}

//           <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
//             {/* Card No */}
//             <div className="mb-4">
//               <label className="block mb-1 font-semibold">Card No *</label>
//               <input
//                 type="text"
//                 value={cardNo}
//                 onChange={(e) => setCardNo(e.target.value)}
//                 className="w-full p-2 border border-gray-300 rounded"
//               />
//             </div>

//               <button
//                 onClick={handleSubmit}
//                 className="w-full px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
//               >
//                 Save
//               </button>
            
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default CardFormPage;



// import React, { useState,useEffect,useRef } from "react";
// import Navbar from "../Navbar";
// import Sidebar from "../Sidebar";
// import axios from "axios";
// import JsBarcode from "jsbarcode";
// import html2canvas from "html2canvas";
// import { jsPDF } from "jspdf";


// const API_SINGLE = "https://pos.inspiredgrow.in/vps/api/card";
// const API_BULK = "https://pos.inspiredgrow.in/vps/api/card/bulk"; // adjust if needed

// const CardFormPage = () => {
//   const [isSidebarOpen, setSidebarOpen] = useState(true);
//   const [mode, setMode] = useState("single"); // 'single' or 'bulk'

//   // single
//   const [cardNo, setCardNo] = useState("");

//   // bulk
//   const [startNo, setStartNo] = useState("");
//   const [endNo, setEndNo] = useState("");
//   const [cards, setCards] = useState([]);

//   // messages
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   // Generate bulk card list between start & end
//   const generateRange = () => {
//     const start = parseInt(startNo);
//     const end = parseInt(endNo);

//     if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0) {
//       return setError("Please enter valid numeric card numbers");
//     }
//     if (end < start) {
//       return setError("End number must be greater than or equal to start number");
//     }

//     const range = [];
//     for (let i = start; i <= end; i++) {
//       range.push(i.toString());
//     }
//     setCards(range);
//     setError("");
//   };

  


  

  

//   const cardRefs = useRef([]); // store front+back container refs

//   const [barcodes, setBarcodes] = useState({});
 
//  // Generate all barcodes once cards are loaded
//  useEffect(() => {
//    const generateBarcode = (cardNo) => {
//      return new Promise((resolve) => {
//        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
//        JsBarcode(svg, cardNo, {
//          format: "CODE128",
//          lineColor: "#000",
//          displayValue: false,
//          width: 2,
//          height: 80,
//          margin: 0,
//        });
 
//        const svgData = new XMLSerializer().serializeToString(svg);
//        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
//        const url = URL.createObjectURL(svgBlob);
 
//        const img = new Image();
//        img.onload = function () {
//          const canvas = document.createElement("canvas");
//          canvas.width = img.width;
//          canvas.height = img.height;
//          const ctx = canvas.getContext("2d");
//          ctx.drawImage(img, 0, 0);
//          const pngDataUrl = canvas.toDataURL("image/png");
//          resolve(pngDataUrl);
//          URL.revokeObjectURL(url);
//        };
//        img.src = url;
//      });
//    };
 
//    // Generate all barcodes and store them by cardNo
//    const loadBarcodes = async () => {
//      const results = {};
//      for (const card of cards) {
//        results[card] = await generateBarcode(card);
//      }
//      setBarcodes(results);
//    };
 
//    loadBarcodes();
//  }, [cards]);
 
//  const downloadAllPDF = async () => {
//    const cardWidth = 600;
//    const cardHeight = 400;
//    const pdf = new jsPDF({
//      orientation: "landscape",
//      unit: "pt",
//      format: [cardWidth * 2, cardHeight],
//    });
 
//    for (let i = 0; i < cards.length; i++) {
//      const cardContainer = cardRefs.current[i];
//      if (!cardContainer) continue;
 
//      // Capture front & back separately
//      const frontCanvas = await html2canvas(cardContainer.querySelector(".card-front"), { scale: 2, useCORS: true });
//      const backCanvas = await html2canvas(cardContainer.querySelector(".card-back"), { scale: 2, useCORS: true });
 
//      const frontImgData = frontCanvas.toDataURL("image/png");
//      const backImgData = backCanvas.toDataURL("image/png");
 
//      // Add new page for each card (skip addPage for first)
//      if (i > 0) pdf.addPage([cardWidth * 2, cardHeight]);
 
//      pdf.addImage(frontImgData, "PNG", 0, 0, cardWidth, cardHeight);
//      pdf.addImage(backImgData, "PNG", cardWidth, 0, cardWidth, cardHeight);
//    }
 
//    pdf.save("all_membership_cards.pdf");
//  };
//  useEffect(()=>setCards([]),[mode])
//   return (
//     <div className="flex flex-col h-screen">
//       <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
//       <div className="flex">
//         <Sidebar isSidebarOpen={isSidebarOpen} />
//         <div className="flex-1 p-4 overflow-y-auto bg-gray-100">
//           <h1 className="mb-6 text-2xl font-bold">Card Form</h1>

//           {/* Mode Switch */}
//           <div className="flex mb-6 space-x-4">
//             <button
//               className={`px-4 py-2 rounded ${
//                 mode === "single"
//                   ? "bg-cyan-600 text-white"
//                   : "bg-gray-300 text-gray-700"
//               }`}
//               onClick={() => setMode("single")}
//             >
//               Single Add
//             </button>
//             <button
//               className={`px-4 py-2 rounded ${
//                 mode === "bulk"
//                   ? "bg-cyan-600 text-white"
//                   : "bg-gray-300 text-gray-700"
//               }`}
//               onClick={() => setMode("bulk")}
//             >
//               Bulk Generate
//             </button>
//           </div>

//           {/* Error & Success */}
//           {error && <p className="mb-4 text-red-500">{error}</p>}
//           {success && <p className="mb-4 text-green-600">{success}</p>}

//           {/* Single Mode */}
//           {mode === "single" && (
//             <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
//               <div className="mb-4">
//                 <label className="block mb-1 font-semibold">Card No *</label>
//                 <input
//                   type="text"
//                   value={cardNo}
//                   onChange={(e) => setCardNo(e.target.value)}
//                   className="w-full p-2 border border-gray-300 rounded"
//                 />
//               </div>
//               <button
//                 onClick={()=>setCards([cardNo])}
//                 className="w-full px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
//               >
//                 Generate Card
//               </button>
//             </div>
//           )}

//           {/* Bulk Mode */}
//           {mode === "bulk" && (
//             <div className="max-w-lg p-6 bg-white rounded-lg shadow-md">
//               <div className="grid grid-cols-2 gap-4 mb-4">
//                 <div>
//                   <label className="block mb-1 font-semibold">Start Card No *</label>
//                   <input
//                     type="number"
//                     value={startNo}
//                     onChange={(e) => setStartNo(e.target.value)}
//                     className="w-full p-2 border border-gray-300 rounded"
//                   />
//                 </div>
//                 <div>
//                   <label className="block mb-1 font-semibold">End Card No *</label>
//                   <input
//                     type="number"
//                     value={endNo}
//                     onChange={(e) => setEndNo(e.target.value)}
//                     className="w-full p-2 border border-gray-300 rounded"
//                   />
//                 </div>
//               </div>

//               <button
//                 onClick={generateRange}
//                 className="w-full px-4 py-2 mb-4 text-white bg-blue-500 rounded hover:bg-blue-600"
//               >
//                 Generate Cards
//               </button>

//               {/* {bulkCards.length > 0 && (
//                 <>
//                   <p className="mb-2 text-sm text-gray-600">
//                     Generated {bulkCards.length} cards
//                   </p>
//                   <div className="overflow-y-auto border rounded max-h-48">
//                     <table className="min-w-full text-sm text-left">
//                       <thead className="bg-gray-100">
//                         <tr>
//                           <th className="px-3 py-2 border">#</th>
//                           <th className="px-3 py-2 border">Card No</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {bulkCards.map((num, i) => (
//                           <tr key={i}>
//                             <td className="px-3 py-1 border">{i + 1}</td>
//                             <td className="px-3 py-1 border">{num}</td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                   <button
//                     onClick={handleBulkSubmit}
//                     className="w-full px-4 py-2 mt-4 text-white rounded bg-cyan-500 hover:bg-cyan-600"
//                   >
//                     Save All
//                   </button>
//                 </>
//               )} */}
//             </div>
//           )}


          
//           {cards.length>0 &&( <button
//                 onClick={()=>setCards([cardNo])}
//                 className="w-full px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
//               >
//                 Save
//               </button>)}

//               <div >
//         {cards.map((card, i) => (
//           <div key={card} ref={(el) => (cardRefs.current[i] = el)}>
//             {/* Front */}
//                 <div className="flex items-center gap-4 p-4">
//       {/* -------- FRONT SIDE -------- */}
//        <div
      
//         className="card-front relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
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
//           {card}
//         </div>

//         <div className="absolute top-[80mm] left-[20mm] text-black text-xl">
//         090500 92092
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
        
//         className="card-back relative w-[86mm] h-[54mm] rounded-lg overflow-hidden shadow-lg"
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
        
//           {/* <img
//             src={generateBarcode(card.cardNo)}
//             alt="Barcode"
//             className="absolute bottom-[50px] right-[220px] w-[180px] h-[60px]"
//           /> */}
//          {barcodes[card] ? (
//                 <img
//                   src={barcodes[card]}
//                   alt="Barcode"
//                   className="absolute bottom-[50px] right-[220px] w-[180px] h-[60px] "
//                 />
//               ) : (
//                 <div className="absolute bottom-[50px] right-[220px] text-gray-500">
//                   Generating...
//                 </div>
//               )}
//       </div>

      
//     </div>
//           </div>
//         ))}
//       </div>
//         </div>
//       </div>
      
      

//     </div>
//   );
// };

// export default CardFormPage;

import React, { useState, useEffect, useRef } from "react";
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";
import axios from "axios";
import JsBarcode from "jsbarcode";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const API_SINGLE = "https://pos.inspiredgrow.in/vps/api/card";
const API_BULK = "https://pos.inspiredgrow.in/vps/api/card/bulk";

const CardFormPage = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [mode, setMode] = useState("single");
  const [cardNo, setCardNo] = useState("");
  const [startNo, setStartNo] = useState("");
  const [endNo, setEndNo] = useState("");
  const [cards, setCards] = useState([]);
  const [barcodes, setBarcodes] = useState({});
  const [popup, setPopup] = useState({ show: false, step: "Generating cards..." });
  const [error, setError] = useState("");

  const cardRefs = useRef([]);

  const generateRange =async () => {
    const start = parseInt(startNo);
    const end = parseInt(endNo);
    if (isNaN(start) || isNaN(end) || start <= 0 || end <= 0)
      return setError("Please enter valid numbers");
    if (end < start) return setError("End number must be greater than start");
    const range = [];
    for (let i = start; i <= end; i++) range.push(i.toString());
    setCards(range);
   await  generateAllBarcodes(range)
   
    setError("");
  };



  const singleCard=async()=>{
      setCards([cardNo])
      await  generateAllBarcodes([cardNo])
  }

  const generateBarcode = (cardNo) =>
    new Promise((resolve) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svg, cardNo, {
        format: "CODE128",
        lineColor: "#000",
        displayValue: false,
        width: 3,
        height: 60,
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

  const generateAllBarcodes = async (cards) => {
    const results = {};
    for (const card of cards) {
      console.log(card)
      results[card] = await generateBarcode(card);
    }
    setBarcodes(results);
    handleGenerateCards(results,cards);
  };

  const handleGenerateCards = async (results,cards) => {
    


    
   

   

    try {
      setPopup({ show: true, step: "Creating Cards..." });
        // await axios.post(API_SINGLE, { cards },{
        //   headers:{
        //     Authorization:`Bearer ${localStorage.getItem("token")}`
        //   }
        // });

        await downloadAllPDF(results,cards);

        setPopup({ show: true, step: "Saving cards..." });

    } catch (err) {
      console.error(err);
      setPopup({ show: false });
      return setError("Failed to save cards");
    }
    finally{
      setTimeout(() => {
        setPopup({ show: false });
      }, 1500);

      // setCards([])
      setCardNo("")
      setStartNo("")
      // setEndNo("");setBarcodes({})
    }
  
  };
  
  
  const downloadAllPDF = async (results, cards) => {
    // Card display size in pixels (same as your design)
    const cardWidth = 600;
    const cardHeight = 400;
  
    // Create high-quality landscape PDF
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: [cardWidth * 2, cardHeight], // side-by-side layout
      compress: false, // prevents quality loss
    });
  
    console.log("Generating cards:", cards);
       console.log("cardRefs",cardRefs)
    for (let i = 0; i < cards.length; i++) {
      const cardContainer = cardRefs.current[i];
      if (!cardContainer) continue;
  
      // Capture both sides at high DPI (scale = 4 for crisp output)
      const frontCanvas = await html2canvas(
        cardContainer.querySelector(".card-front"),
        {
          scale: 4, // render at 4× resolution
          useCORS: true,
          logging: false,
          backgroundColor: null,
        }
      );
  
      const backCanvas = await html2canvas(
        cardContainer.querySelector(".card-back"),
        {
          scale: 4,
          useCORS: true,
          logging: false,
          backgroundColor: null,
        }
      );
  
      const frontImgData = frontCanvas.toDataURL("image/png");
      const backImgData = backCanvas.toDataURL("image/png");
  
      // Add new page (except first)
      if (i > 0) pdf.addPage([cardWidth * 2, cardHeight]);
  
      // Add front + back to one page (side-by-side)
      pdf.addImage(
        frontImgData,
        "PNG",
        0,
        0,
        cardWidth,
        cardHeight,
        undefined,
        "SLOW" // ensures crisp scaling
      );
      pdf.addImage(
        backImgData,
        "PNG",
        cardWidth,
        0,
        cardWidth,
        cardHeight,
        undefined,
        "SLOW"
      );
    }
  
    // Save PDF
    pdf.save("all_membership_cards_highres.pdf");
  };

  useEffect(() => setCards([]), [mode]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div className="flex-1 p-4 overflow-y-auto">
          <h1 className="mb-6 text-2xl font-bold">Card Form</h1>

          {/* Mode Switch */}
          <div className="flex mb-6 space-x-4">
            <button
              className={`px-4 py-2 rounded ${
                mode === "single"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
              onClick={() => setMode("single")}
            >
              Single Add
            </button>
            <button
              className={`px-4 py-2 rounded ${
                mode === "bulk"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-300 text-gray-700"
              }`}
              onClick={() => setMode("bulk")}
            >
              Bulk Generate
            </button>
          </div>

          {error && <p className="mb-4 text-red-500">{error}</p>}

          {/* Single */}
          {mode === "single" && (
            <div className="max-w-md p-6 bg-white rounded-lg shadow-md">
              <label className="block mb-2 font-semibold">Card No *</label>
              <input
                type="text"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                className="w-full p-2 mb-4 border border-gray-300 rounded"
              />
              <button
                onClick={() => singleCard()}
                className="w-full px-4 py-2 text-white rounded bg-cyan-500 hover:bg-cyan-600"
              >
                Generate Card
              </button>
            </div>
          )}

          {/* Bulk */}
          {mode === "bulk" && (
            <div className="max-w-lg p-6 bg-white rounded-lg shadow-md">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block mb-1 font-semibold">
                    Start Card No *
                  </label>
                  <input
                    type="number"
                    value={startNo}
                    onChange={(e) => setStartNo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold">
                    End Card No *
                  </label>
                  <input
                    type="number"
                    value={endNo}
                    onChange={(e) => setEndNo(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </div>
              </div>

              <button
                onClick={generateRange}
                className="w-full px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600"
              >
                Generate Cards
              </button>
            </div>
          )}

        

          {/* Cards (Hidden while processing, only for rendering PDF) */}
        
            
            <div className="absolute -left-[9999px] top-0 visible opacity-100 pointer-events-none ">
            {cards.map((card, i) => (
  <div key={card} ref={(el) => (cardRefs.current[i] = el)}>
    <div className="flex items-center gap-4 p-4">
      {/* -------- FRONT SIDE -------- */}
      <div className="card-front relative w-[600px] h-[400px] rounded-lg overflow-hidden shadow-lg">
        {/* Background as <img> */}
        <img
          src="/card-front.png"
          alt="Front Background"
          className="absolute top-0 left-0 z-0 object-cover w-full h-full"
        />

        {/* Card No */}
        <div className="absolute top-[66mm] left-[36mm] text-black text-xl z-10">
          {card}
        </div>

        {/* Phone */}
        <div className="absolute top-[76mm] left-[21mm] text-black text-xl z-10">
          090500 92092
        </div>

        {/* QR Code */}
        <img
          src="/qr.png"
          alt="QR"
          className="absolute top-[44mm] right-[14mm] w-32 z-10"
        />
      </div>

      {/* -------- BACK SIDE -------- */}
      <div className="card-back relative w-[600px] h-[400px] rounded-lg overflow-hidden shadow-lg">
        {/* Background as <img> */}
        <img
          src="/card-back.png"
          alt="Back Background"
          className="absolute top-0 left-0 z-0 object-cover w-full h-full"
        />

        {/* Barcode */}
        {barcodes[card] ? (
          <img
            src={barcodes[card]}
            alt="Barcode"
            className="absolute bottom-[63px] right-[220px] w-[170px] h-[50px] z-10"
          />
        ) : (
          <div className="absolute bottom-[50px] right-[220px] text-gray-500 z-10">
            Generating...
          </div>
        )}
      </div>
    </div>
  </div>
))}

            </div>

        </div>
      </div>

      {/* Popup Modal */}
      {popup.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[350px] text-center">
            <div className="text-xl font-semibold text-gray-700 animate-pulse">
              {popup.step}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardFormPage;
