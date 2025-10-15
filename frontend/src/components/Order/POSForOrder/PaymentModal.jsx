import React, { useState, useEffect } from "react";
import { FaTimes,FaPlus } from "react-icons/fa";

/**
 * PaymentModal
 *
 * @param {Object}   props
 * @param {Function} props.onClose          – close the modal
 * @param {Function} props.onSubmit         – callback that receives { paymentRows, couponCode, adjustAdvancePayment, advance, selectedAccount }
 * @param {"cash"|"multiple"|"bank"} props.paymentMode
 * @param {Array}   props.paymentTypes      – [{ _id, paymentTypeName }]
 * @param {Array}   props.accounts          – [{ _id, accountName }]
 * @param {Array}   props.terminals         – [{ _id, tid, warehouse }]
 * @param {Number}  props.initialAdvance
 * @param {String}  props.initialAccount    – account id
 * @param {Object}  props.initialSummary    – { totalItems, totalPrice, discount, couponDiscount, totalPayable, totalPaying, balance, changeReturn }
 * @param {String}  props.selectedWarehouse – selected warehouse id
 */
const PaymentModal = ({
  onClose,
  onSubmit,
  paymentMode,
  paymentTypes = [],
  accounts = [],
  terminals = [],
  initialAdvance = 0,
  initialAccount = "",
  initialSummary = {
    totalItems: 0,
    totalPrice: 0,
    discount: 0,
    couponDiscount: 0,
    totalPayable: 0,
    totalPaying: 0,
    balance: 0,
    changeReturn: 0,
  },
  selectedWarehouse,
}) => {
  /* ------------------------------------------------------------------ */
  /* Helpers & initial state ------------------------------------------ */

  const getId = (name) =>
    paymentTypes.find(
      (pt) => pt.paymentTypeName?.toLowerCase() === name.toLowerCase()
    )?._id;

  const [couponCode, setCouponCode] = useState("");
  const [advance, setAdvance] = useState(initialAdvance);
  const [adjustAdvancePayment, setAdjustAdvancePayment] = useState(false);
  const [summary, setSummary] = useState(initialSummary);

  // Default row(s)
  const [paymentRows, setPaymentRows] = useState(() => {
    if (paymentMode === "cash") {
      return [
        {
          paymentType: getId("Cash") || "",
          amount: initialSummary.totalPayable,
          note: "",
          terminal: null,
          account: initialAccount || "", // Ensure account is set for cash
        },
      ];
    } else if (paymentMode === "bank") {
      return [
        {
          paymentType: getId("Bank") || "",
          amount: initialSummary.totalPayable,
          note: "",
          terminal: terminals.find((t) => t.warehouse === selectedWarehouse)?._id || "", // Default to first matching terminal
          account: null,
        },
      ];
    }
    return [
      {
        paymentType: "",
        amount: 0,
        note: "",
        terminal: null,
        account: null,
      },
    ];
  });

  /* ------------------------------------------------------------------ */
  /* Effects ----------------------------------------------------------- */

  useEffect(() => {
    // Calculate dynamic summary
    const totalPaying = paymentRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    );
    const couponDiscount = couponCode ? initialSummary.couponDiscount : 0; // Backend handles coupon calculation
    const advanceAmount = adjustAdvancePayment ? Number(advance) : 0;
    const totalPayable =
      initialSummary.totalPrice - initialSummary.discount - advanceAmount;
    const balance = totalPayable - totalPaying;
    const changeReturn =
      totalPaying > totalPayable ? totalPaying - totalPayable : 0;

    setSummary({
      totalItems: initialSummary.totalItems,
      totalPrice: initialSummary.totalPrice,
      discount: initialSummary.discount,
      couponDiscount,
      totalPayable,
      totalPaying,
      balance: balance > 0 ? balance : 0,
      changeReturn,
    });
  }, [
    paymentRows,
    couponCode,
    adjustAdvancePayment,
    advance,
    initialSummary.totalPrice,
    initialSummary.discount,
    initialSummary.couponDiscount,
    initialSummary.totalItems,
  ]);

  // Update terminal selection when selectedWarehouse changes
  useEffect(() => {
    setPaymentRows((rows) =>
      rows.map((row) => {
        if (row.paymentType === getId("Bank")) {
          const availableTerminals = terminals.filter(
            (t) => t.warehouse === selectedWarehouse
          );
          const newTerminal = availableTerminals.find(
            (t) => t._id === row.terminal
          )
            ? row.terminal
            : availableTerminals[0]?._id || "";
          return { ...row, terminal: newTerminal };
        }
        return row;
      })
    );
  }, [selectedWarehouse, terminals, paymentTypes]);

  /* ------------------------------------------------------------------ */
  /* Handlers ---------------------------------------------------------- */

  const addRow = () =>
    paymentMode === "multiple" &&
    setPaymentRows([
      ...paymentRows,
      {
        paymentType: "",
        amount: 0,
        note: "",
        terminal: null,
        account: null,
      },
    ]);

    const removeRow = (idx) => {
      setPaymentRows(rows => rows.filter((_, i) => i !== idx));
    };

    const handleChangeRow = (idx, field, value) => {
      setPaymentRows(rows =>
        rows.map((r, i) => {
          if (i !== idx) return r;
    
          // start with the raw update of the one field
          const updated = { ...r, [field]: value };
    
          // if they just changed the paymentType, auto-fill account/terminal
          if (field === "paymentType") {
            const isCash = value === getId("Cash");
            const isBank = value === getId("Bank");
    
            // for cash: assign the warehouse’s cash account
            if (isCash) {
              updated.account = initialAccount;
              updated.terminal = null;
            }
            // for bank: pick the first terminal for that warehouse
            else if (isBank) {
              updated.terminal =
                terminals.find((t) => t.warehouse === selectedWarehouse)?._id || "";
              updated.account = null;
            } else {
              // other types clear both
              updated.account = null;
              updated.terminal = null;
            }
          }
    
          return updated;
        })
      );
    };
    

  const handleSave = () => {
    const invalid = paymentRows.some(
      (r) =>
        !r.paymentType ||
        Number(r.amount) <= 0 ||
        (r.paymentType === getId("Bank") && !r.terminal) ||
        (r.paymentType === getId("Cash") && !r.account)
    );
    if (invalid) {
      alert(
        "Select a payment type, enter a positive amount, select a terminal for bank payments, and select an account for cash payments."
      );
      return;
    }
    onSubmit({
      paymentRows: paymentRows.map((r) => ({
        paymentType: r.paymentType,
        amount: Number(r.amount),
        note: r.note,
        terminal: r.terminal || undefined,
        account: r.account || undefined, // Include account in payload
      })),
      couponCode,
      adjustAdvancePayment,
      advance: Number(advance),
      selectedAccount: undefined, // No global selectedAccount
    });
    onClose();
  };

  /* ------------------------------------------------------------------ */
  /* Render ------------------------------------------------------------ */

  return (
    // <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    //   <div className="relative w-full max-w-4xl p-4 bg-white rounded shadow-lg">
    //     {/* Close button */}
    //     <button
    //       className="absolute text-gray-600 top-2 right-2 hover:text-gray-800"
    //       onClick={onClose}
    //     >
    //       <FaTimes size={18} />
    //     </button>

    //     <h2 className="mb-4 text-xl font-bold capitalize">
    //       {paymentMode === "multiple"
    //         ? "Multiple Payment"
    //         : paymentMode === "cash"
    //         ? "Cash Payment"
    //         : "Bank Payment"}
    //     </h2>

    //     <div className="flex flex-col gap-4 md:flex-row">
    //       {/* Left – settings */}
    //       <div className="flex-1 p-4 border rounded bg-gray-50">
    //         {/* Coupon */}
    //         <div className="mb-4">
    //           <label className="block mb-1 text-sm font-semibold">
    //             Discount Coupon Code
    //           </label>
    //           <input
    //             type="text"
    //             className="w-full p-2 border rounded"
    //             placeholder="Enter Coupon Code"
    //             value={couponCode}
    //             onChange={(e) => setCouponCode(e.target.value)}
    //           />
    //         </div>

    //         {/* Advance payment */}
    //         <div className="mb-4">
    //           <label className="block mb-1 text-sm font-semibold">
    //             Adjust Advance Payment
    //           </label>
    //           <div className="flex items-center gap-2">
    //             <input
    //               type="checkbox"
    //               checked={adjustAdvancePayment}
    //               onChange={(e) => setAdjustAdvancePayment(e.target.checked)}
    //             />
    //             <input
    //               type="number"
    //               className="w-full p-2 border rounded"
    //               placeholder="Enter Advance Amount"
    //               value={advance}
    //               onChange={(e) => setAdvance(Number(e.target.value))}
    //               disabled={!adjustAdvancePayment}
    //               min="0"
    //             />
    //           </div>
    //         </div>

    //         {/* Payment rows */}
    //         <div className="mb-4">
    //           <label className="block mb-2 text-sm font-semibold">
    //             Payment Details
    //           </label>

    //           {paymentRows.map((row, idx) => (
    //             <div key={idx} className="p-2 mb-2 border rounded">
    //               {/* Type */}
    //               <label className="block mb-1 text-xs font-medium">
    //                 Payment Type
    //               </label>
    //               <select
    //                 className="w-full p-2 mb-2 border rounded"
    //                 value={row.paymentType}
    //                 onChange={(e) =>
    //                   handleChangeRow(idx, "paymentType", e.target.value)
    //                 }
    //               >
    //                 <option value="">-- Select Payment Type --</option>
    //                 {paymentTypes.map((pt) => (
    //                   <option key={pt._id} value={pt._id}>
    //                     {pt.paymentTypeName}
    //                   </option>
    //                 ))}
    //               </select>

    //               {/* Account (for cash payments) */}
    //               {row.paymentType === getId("Cash") && (
    //                 <div className="mb-2">
    //                   <label className="block mb-1 text-xs font-medium">
    //                     Select Account
    //                   </label>
    //                   <select
    //                     className="w-full p-2 border rounded"
    //                     value={row.account || ""}
    //                     onChange={(e) =>
    //                       handleChangeRow(idx, "account", e.target.value)
    //                     }
    //                   >
    //                     <option value="">-- Select an Account --</option>
    //                     {accounts.map((acc) => (
    //                       <option key={acc._id} value={acc._id}>
    //                         {acc.accountName}
    //                       </option>
    //                     ))}
    //                   </select>
    //                 </div>
    //               )}

    //               {/* Terminal (for bank payments) */}
    //               {row.paymentType === getId("Bank") && (
    //                 <div className="mb-2">
    //                   <label className="block mb-1 text-xs font-medium">
    //                     Terminal
    //                   </label>
    //                   <select
    //                     className="w-full p-2 border rounded"
    //                     value={row.terminal || ""}
    //                     onChange={(e) =>
    //                       handleChangeRow(idx, "terminal", e.target.value)
    //                     }
    //                   >
    //                     <option value="">-- Select Terminal --</option>
    //                     {terminals
    //                       .filter((t) => t.warehouse === selectedWarehouse)
    //                       .map((t) => (
    //                         <option key={t._id} value={t._id}>
    //                           {t.tid}
    //                         </option>
    //                       ))}
    //                   </select>
    //                 </div>
    //               )}

    //               {/* Amount */}
    //               <label className="block mb-1 text-xs font-medium">Amount</label>
    //               <input
    //                 type="number"
    //                 className="w-full p-2 mb-2 border rounded"
    //                 value={row.amount}
    //                 onChange={(e) =>
    //                   handleChangeRow(idx, "amount", Number(e.target.value))
    //                 }
    //                 min="0"
    //               />

    //               {/* Note */}
    //               <label className="block mb-1 text-xs font-medium">
    //                 Payment Note
    //               </label>
    //               <input
    //                 type="text"
    //                 className="w-full p-2 border rounded"
    //                 placeholder="Enter Payment Note"
    //                 value={row.note}
    //                 onChange={(e) =>
    //                   handleChangeRow(idx, "note", e.target.value)
    //                 }
    //               />
    //             </div>
    //           ))}

    //           {paymentMode === "multiple" && (
    //             <button
    //               onClick={addRow}
    //               className="px-2 py-1 text-sm text-white bg-blue-600 rounded"
    //             >
    //               + Add Payment Row
    //             </button>
    //           )}
    //         </div>
    //       </div>

    //       {/* Right – summary */}
    //       <div className="flex-1 p-4 bg-white border rounded">
    //         <h3 className="mb-2 text-sm font-bold">Summary</h3>
    //         <div className="flex flex-col gap-1 text-sm">
    //           {[
    //             ["Total Items:", summary.totalItems],
    //             ["Total Price (₹):", summary.totalPrice],
    //             ["Discount (₹):", summary.discount],
    //             ["Coupon Discount (₹):", summary.couponDiscount],
    //             ["Advance Used (₹):", adjustAdvancePayment ? advance : 0],
    //             ["Total Payable (₹):", summary.totalPayable],
    //             ["Total Paying (₹):", summary.totalPaying],
    //             ["Balance (₹):", summary.balance],
    //             ["Change Return (₹):", summary.changeReturn],
    //           ].map(([label, value]) => (
    //             <div key={label} className="flex justify-between">
    //               <span>{label}</span>
    //               <span>{Number(value).toFixed(2)}</span>
    //             </div>
    //           ))}
    //         </div>

    //         <div className="flex justify-end mt-4">
    //           <button
    //             onClick={onClose}
    //             className="px-3 py-1 mr-2 text-gray-700 bg-gray-300 rounded"
    //           >
    //             Close
    //           </button>
    //           <button
    //             onClick={handleSave}
    //             className="px-3 py-1 text-white bg-green-600 rounded"
    //           >
    //             Save & Print
    //           </button>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // </div>
//     <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black bg-opacity-50">
//   <div className="relative w-full max-w-md p-4 mx-auto my-4 bg-white rounded-lg shadow-lg">
//     {/* Header */}
//     <div className="flex items-center justify-between mb-4">
//       <h2 className="text-base font-bold text-gray-800 capitalize">
//         {paymentMode === "multiple"
//           ? "Multiple Payment"
//           : paymentMode === "cash"
//           ? "Cash Payment"
//           : "Bank Payment"}
//       </h2>
//       <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
//         <FaTimes size={18} />
//       </button>
//     </div>

//     {/* Main content */}
//     <div className="flex flex-col gap-6">
//       {/* Payment Settings */}
//       <div className="p-4 space-y-4 border rounded-md bg-gray-50">
//         {/* Coupon */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Discount Coupon Code</label>
//           <input
//             type="text"
//             className="w-full p-2 text-sm border rounded-md"
//             placeholder="Enter Coupon Code"
//             value={couponCode}
//             onChange={(e) => setCouponCode(e.target.value)}
//           />
//         </div>

//         {/* Advance Payment */}
//         <div>
//           <label className="block mb-1 text-sm font-semibold">Adjust Advance Payment</label>
//           <div className="flex items-center gap-2">
//             <input
//               type="checkbox"
//               checked={adjustAdvancePayment}
//               onChange={(e) => setAdjustAdvancePayment(e.target.checked)}
//             />
//             <input
//               type="number"
//               className="flex-1 p-2 text-sm border rounded-md"
//               placeholder="Advance Amount"
//               value={advance}
//               onChange={(e) => setAdvance(Number(e.target.value))}
//               disabled={!adjustAdvancePayment}
//               min="0"
//             />
//           </div>
//         </div>

//         {/* Payment Rows */}
//         <div>
//           <label className="block mb-2 text-sm font-semibold">Payment Details</label>

//           {paymentRows.map((row, idx) => (
//             <div key={idx} className="p-3 mb-3 space-y-2 bg-white border rounded">
//               <div>
//                 <label className="block mb-1 text-xs font-medium">Payment Type</label>
//                 <select
//                   className="w-full p-2 text-sm border rounded"
//                   value={row.paymentType}
//                   onChange={(e) => handleChangeRow(idx, "paymentType", e.target.value)}
//                 >
//                   <option value="">-- Select Payment Type --</option>
//                   {paymentTypes.map((pt) => (
//                     <option key={pt._id} value={pt._id}>
//                       {pt.paymentTypeName}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Account */}
//               {row.paymentType === getId("Cash") && (
//                 <div>
//                   <label className="block mb-1 text-xs font-medium">Select Account</label>
//                   <select
//                     className="w-full p-2 text-sm border rounded"
//                     value={row.account || ""}
//                     onChange={(e) => handleChangeRow(idx, "account", e.target.value)}
//                   >
//                     <option value="">-- Select an Account --</option>
//                     {accounts.map((acc) => (
//                       <option key={acc._id} value={acc._id}>
//                         {acc.accountName}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               )}

//               {/* Terminal */}
//               {row.paymentType === getId("Bank") && (
//                 <div>
//                   <label className="block mb-1 text-xs font-medium">Terminal</label>
//                   <select
//                     className="w-full p-2 text-sm border rounded"
//                     value={row.terminal || ""}
//                     onChange={(e) => handleChangeRow(idx, "terminal", e.target.value)}
//                   >
//                     <option value="">-- Select Terminal --</option>
//                     {terminals
//                       .filter((t) => t.warehouse === selectedWarehouse)
//                       .map((t) => (
//                         <option key={t._id} value={t._id}>
//                           {t.tid}
//                         </option>
//                       ))}
//                   </select>
//                 </div>
//               )}

//               {/* Amount */}
//               <div>
//                 <label className="block mb-1 text-xs font-medium">Amount</label>
//                 <input
//                   type="number"
//                   className="w-full p-2 text-sm border rounded"
//                   value={row.amount}
//                   onChange={(e) =>
//                     handleChangeRow(idx, "amount", Number(e.target.value))
//                   }
//                   min="0"
//                 />
//               </div>

//               {/* Note */}
//               <div>
//                 <label className="block mb-1 text-xs font-medium">Note</label>
//                 <input
//                   type="text"
//                   className="w-full p-2 text-sm border rounded"
//                   placeholder="Payment Note"
//                   value={row.note}
//                   onChange={(e) => handleChangeRow(idx, "note", e.target.value)}
//                 />
//               </div>
//             </div>
//           ))}

//           {paymentMode === "multiple" && (
//             <button
//               onClick={addRow}
//               className="px-3 py-2 mt-2 text-sm text-white bg-blue-600 rounded"
//             >
//               + Add Payment Row
//             </button>
//           )}
//         </div>
//       </div>

//       {/* Summary Section */}
//       <div className="p-4 bg-white border rounded-md">
//         <h3 className="mb-2 text-sm font-semibold">Summary</h3>
//         <div className="space-y-1 text-sm">
//           {[
//             ["Total Items:", summary.totalItems],
//             ["Total Price (₹):", summary.totalPrice],
//             ["Discount (₹):", summary.discount],
//             ["Coupon Discount (₹):", summary.couponDiscount],
//             ["Advance Used (₹):", adjustAdvancePayment ? advance : 0],
//             ["Total Payable (₹):", summary.totalPayable],
//             ["Total Paying (₹):", summary.totalPaying],
//             ["Balance (₹):", summary.balance],
//             ["Change Return (₹):", summary.changeReturn],
//           ].map(([label, value]) => (
//             <div key={label} className="flex justify-between">
//               <span>{label}</span>
//               <span className="font-medium">{Number(value).toFixed(2)}</span>
//             </div>
//           ))}
//         </div>

//         <div className="flex justify-end gap-2 mt-4">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 text-sm text-gray-800 bg-gray-300 rounded"
//           >
//             Close
//           </button>
//           <button
//             onClick={handleSave}
//             className="px-4 py-2 text-sm text-white bg-green-600 rounded"
//           >
//             Save & Print
//           </button>
//         </div>
//       </div>
//     </div>
//   </div>
// </div>
<div className="fixed inset-0 z-50 flex items-start justify-center p-2 mt-5 bg-black bg-opacity-50 sm:items-center">
  <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-white rounded-lg shadow-lg sm:max-w-2xl">
    {/* Close button */}
    <button
      className="absolute p-1 text-gray-500 rounded-full top-2 right-2 hover:bg-gray-100"
      onClick={onClose}
    >
      <FaTimes size={20} />
    </button>

    <div className="p-4">
      <h2 className="mb-3 text-lg font-bold capitalize sm:text-xl">
        {paymentMode === "multiple"
          ? "Multiple Payment"
          : paymentMode === "cash"
          ? "Cash Payment"
          : "Bank Payment"}
      </h2>

      <div className="flex flex-col gap-4">
        {/* Summary (shown first on mobile) */}
        <div className="p-4 rounded-lg bg-gray-50">
          <h3 className="mb-3 text-sm font-semibold">Payment Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {[
              ["Total Items", summary.totalItems],
              ["Total Price", `₹${Number(summary.totalPrice).toFixed(2)}`],
              ["Discount", `-₹${Number(summary.discount).toFixed(2)}`],
              ["Coupon", `-₹${Number(summary.couponDiscount).toFixed(2)}`],
              ["Advance Used", adjustAdvancePayment ? `-₹${Number(advance).toFixed(2)}` : "₹0.00"],
              ["Payable", `₹${Number(summary.totalPayable).toFixed(2)}`],
              ["Paying", `₹${Number(summary.totalPaying).toFixed(2)}`],
              ["Balance", `₹${Number(summary.balance).toFixed(2)}`],
              ["Change", `₹${Number(summary.changeReturn).toFixed(2)}`],
            ].map(([label, value]) => (
              <div key={label} className={label === "Payable" || label === "Balance" ? "col-span-2 pt-2 border-t border-gray-200" : ""}>
                <span className="text-gray-600">{label}</span>
                <span className={`float-right font-medium ${label === "Payable" ? "text-green-600" : label === "Balance" ? "text-red-600" : "text-gray-800"}`}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment form */}
        <div className="space-y-4">
          {/* Coupon */}
          <div>
            <label className="block mb-1 text-sm font-medium">Discount Coupon</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 p-2 text-sm border rounded-lg"
                placeholder="Enter coupon code"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
              />
              <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg">
                Apply
              </button>
            </div>
          </div>

          {/* Advance payment */}
          <div>
            <label className="flex items-center gap-2 mb-1 text-sm font-medium">
              <input
                type="checkbox"
                className="text-blue-600 rounded"
                checked={adjustAdvancePayment}
                onChange={(e) => setAdjustAdvancePayment(e.target.checked)}
              />
              Use Advance Payment
            </label>
            <input
              type="number"
              className="w-full p-2 text-sm border rounded-lg"
              placeholder="Advance amount"
              value={advance}
              onChange={(e) => setAdvance(Number(e.target.value))}
              disabled={!adjustAdvancePayment}
              min="0"
            />
          </div>

          {/* Payment rows */}
          <div>
            <h3 className="mb-2 text-sm font-medium">Payment Methods</h3>
            <div className="space-y-3">
              {paymentRows.map((row, idx) => (
                <div key={idx} className="p-3 border rounded-lg">
                  <div className="mb-3">
                    <label className="block mb-1 text-xs font-medium">Payment Type</label>
                    <select
                      className="w-full p-2 text-sm border rounded-lg"
                      value={row.paymentType}
                      onChange={(e) =>
                        handleChangeRow(idx, "paymentType", e.target.value)
                      }
                    >
                      <option value="">Select payment type</option>
                      {paymentTypes.map((pt) => (
                        <option key={pt._id} value={pt._id}>
                          {pt.paymentTypeName}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Account (for cash payments) */}
                  {row.paymentType === getId("Cash") && (
                    <div className="mb-3">
                      <label className="block mb-1 text-xs font-medium">Account</label>
                      <select
                        className="w-full p-2 text-sm border rounded-lg"
                        value={row.account || ""}
                        onChange={(e) =>
                          handleChangeRow(idx, "account", e.target.value)
                        }
                      >
                        <option value="">Select account</option>
                        {accounts.map((acc) => (
                          <option key={acc._id} value={acc._id}>
                            {acc.accountName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Terminal (for bank payments) */}
                  {row.paymentType === getId("Bank") && (
                    <div className="mb-3">
                      <label className="block mb-1 text-xs font-medium">Terminal</label>
                      <select
                        className="w-full p-2 text-sm border rounded-lg"
                        value={row.terminal || ""}
                        onChange={(e) =>
                          handleChangeRow(idx, "terminal", e.target.value)
                        }
                      >
                        <option value="">Select terminal</option>
                        {terminals
                          .filter((t) => t.warehouse === selectedWarehouse)
                          .map((t) => (
                            <option key={t._id} value={t._id}>
                              {t.tid}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block mb-1 text-xs font-medium">Amount (₹)</label>
                    <input
                      type="number"
                      className="w-full p-2 text-sm border rounded-lg"
                      value={row.amount}
                      onChange={(e) =>
                        handleChangeRow(idx, "amount", Number(e.target.value))
                      }
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium">Note</label>
                    <input
                      type="text"
                      className="w-full p-2 text-sm border rounded-lg"
                      placeholder="Optional note"
                      value={row.note}
                      onChange={(e) =>
                        handleChangeRow(idx, "note", e.target.value)
                      }
                    />
                  </div>

                  {paymentMode === "multiple" && paymentRows.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="mt-2 text-xs text-red-600"
                    >
                      Remove this payment
                    </button>
                  )}
                </div>
              ))}
            </div>

            {paymentMode === "multiple" && (
              <button
                onClick={addRow}
                className="flex items-center justify-center w-full gap-1 p-2 mt-3 text-sm text-blue-600 border border-blue-600 rounded-lg"
              >
                <FaPlus size={12} /> Add Payment Method
              </button>
            )}
          </div>
        </div>
         {paymentMode === "multiple" && (
            <button
              onClick={addRow}
              className="px-3 py-2 mt-2 text-sm text-white bg-blue-600 rounded"
            >
              + Add Payment Row
            </button>
          )}
        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg"
          >
            Close
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg"
          >
            Confirm & Print
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
  );
};

export default PaymentModal;