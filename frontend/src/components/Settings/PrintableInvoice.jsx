import React from 'react';

const PrintableInvoice = ({ data, onClose }) => {
  if (!data) return null;

  return (
    /* Full-screen Backdrop to focus on the Invoice */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/60 backdrop-blur-sm no-print">
      <div className="relative w-full max-w-[850px] bg-white rounded-lg shadow-2xl p-8 my-8">
        
        {/* Modal Controls - Hidden during print */}
        <div className="flex justify-between mb-6 no-print">
          <button 
            onClick={onClose}
            className="px-4 py-2 font-bold transition rounded text-slate-500 hover:bg-slate-100"
          >
            ← Back to List
          </button>
          <div className="flex gap-3">
            <button 
              onClick={() => window.print()}
              className="px-8 py-2 font-bold text-white transition rounded shadow-lg bg-slate-800 hover:bg-black"
            >
              Print Bill
            </button>
          </div>
        </div>

        {/* --- START OF ACTUAL INVOICE PRINT AREA --- */}
        <div id="invoice-content" className="border border-slate-300 p-6 text-[12px] text-black leading-normal">
          <div className="text-center font-bold text-[16px] uppercase mb-1">TAX INVOICE/BILL OF SUPPLY</div>
          <p className="text-center text-[10px] text-slate-500 mb-6 border-b pb-2">
            Original for Recipient | Duplicate for Transporter | Triplicate for Supplier
          </p>

          {/* Supplier & Customer Section */}
          <div className="grid grid-cols-2 mb-6 border border-black">
            <div className="p-3 border-r border-black">
              <h1 className="text-lg font-black">S.A. OFFSET</h1>
              <p>Near Shyam Mandir, Dhobi Ghat Road,</p>
              <p>Jagjeevan Pura (New Rishi Nagar), Hisar</p>
              <p><strong>GSTIN:</strong> 06AWJPS9461L1ZP</p>
              <p><strong>Phone:</strong> 93153-68381</p>
              <p><strong>Email:</strong> saoffsethisar@gmail.com</p>
            </div>
            <div className="p-3 bg-slate-50/50">
              <p className="font-bold text-slate-500 uppercase text-[10px]">Bill To:</p>
              <h2 className="font-bold uppercase text-md">{data.customer?.name || data.customerName}</h2>
              <p><strong>Mobile:</strong> {data.customer?.phone || data.phoneNumber || '-'}</p>
              <p><strong>GSTIN:</strong> {data.customer?.gstNumber || data.gstNumber || '-'}</p>
            </div>
          </div>

          {/* Details Bar */}
          <div className="grid grid-cols-3 p-3 mb-6 font-bold border border-black bg-slate-50">
            <div>Invoice No: {data.billId || 'SA08'}</div>
            <div className="text-center">Date: {new Date(data.date).toLocaleDateString('en-IN')}</div>
            <div className="text-right">Payment: Cash</div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse border border-black text-[11px] mb-6">
            <thead className="bg-slate-100">
              <tr>
                <th className="w-10 p-2 border border-black">SN.</th>
                <th className="p-2 text-left border border-black">ITEM NAME</th>
                <th className="w-16 p-2 text-center border border-black">QTY</th>
                <th className="w-20 p-2 text-right border border-black">MRP</th>
                <th className="w-20 p-2 text-right border border-black">RATE</th>
                <th className="w-24 p-2 text-right border border-black">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 text-center border border-black">{idx + 1}</td>
                  <td className="p-2 font-medium uppercase border border-black">{item.name}</td>
                  <td className="p-2 text-center border border-black">{item.qty}</td>
                  <td className="p-2 text-right border border-black">{item.mrp || item.rate}</td>
                  <td className="p-2 text-right border border-black">{item.rate}</td>
                  <td className="p-2 font-bold text-right border border-black">₹{(item.qty * item.rate).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Calculation Summary */}
          <div className="grid grid-cols-2 border border-t-0 border-black">
            <div className="p-4 border-r border-black text-[10px] italic text-slate-500">
              <p className="mb-1 not-italic font-bold text-black underline">Terms & Conditions:</p>
              <p>1. Goods once sold will not be taken back.</p>
              <p>2. All disputes subject to Hisar Jurisdiction.</p>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Sub-Total</span>
                <span>₹{data.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-black font-black text-[16px] text-blue-800">
                <span>GRAND TOTAL</span>
                <span>₹{data.grandTotal.toFixed(2)}</span>
              </div>
              <p className="text-[10px] font-bold text-right italic">
                (Rupees {data.grandTotal.toLocaleString('en-IN')} Only)
              </p>
            </div>
          </div>
        </div>
        {/* --- END OF PRINT AREA --- */}

      </div>

      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; margin: 0; padding: 0; }
          .fixed { position: static !important; display: block !important; }
          .shadow-2xl, .rounded-lg, .bg-black\/60 { 
            box-shadow: none !important; 
            background: transparent !important; 
            border: none !important; 
            margin: 0 !important;
            padding: 0 !important;
          }
          #invoice-content { border: 1px solid black !important; width: 100% !important; }
        }
      `}</style>
    </div>
  );
};

export default PrintableInvoice;