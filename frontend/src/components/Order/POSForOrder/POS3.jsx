
// Redesigned POS3 for Clean Mobile UI
import React, { useEffect, useState } from 'react';
import { App } from '@capacitor/app';
import { useNavigate } from 'react-router-dom';
import { FaBoxOpen, FaBox, FaPlus, FaMinus, FaTrash, FaChevronLeft, FaHandPaper, FaLayerGroup, FaMoneyBill, FaCreditCard } from 'react-icons/fa';
import { Keyboard } from '@capacitor/keyboard';
import axios from 'axios';
import { add, set } from 'date-fns';
// No changes needed for these sub-components
const Info = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-semibold text-gray-800 truncate">{value}</p>
  </div>
);

const Summary = ({ label, value, isGrandTotal = false }) => (
  <div className="flex justify-between py-1.5 text-sm">
    <span className={isGrandTotal ? "font-bold text-gray-800" : "text-gray-600"}>{label}</span>
    <span className={isGrandTotal ? "font-bold text-lg text-gray-900" : "font-medium text-gray-800"}>{value}</span>
  </div>
);

// --- COMPONENT REFACTORED FOR BETTER MOBILE UX ---
const ItemsList = ({editId,deliveryFee,processingFee,exclusiveDiscount, additionalCharges,items,couponCode,setCouponCode, updateItem, removeItem, setSelectedItem ,totalAmount ,totalDiscount,newNote,newAmount,additionalPaymentAmount,setAdditionalPaymentAmount,setNewNote,setNewAmount}) => (
  <section className="overflow-y-auto">
    <div className="divide-y divide-gray-200 ">
      {items.length === 0 ? (
        <div className="p-10 text-center">
          <FaBoxOpen size={40} className="mx-auto text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-800">Your Cart is Empty</h3>
          <p className="mt-1 text-sm text-gray-500">Add items to get started.</p>
        </div>
      ) : (
        items.map((item, idx) => (
          <div key={item.id || idx} className="flex items-center gap-4 p-3">
            {/* Item Name & Details */}
            <div className="flex-grow cursor-pointer" onClick={() => setSelectedItem(item)}>
              <p className="font-semibold leading-tight text-gray-800" title={item.itemName}>
                {item.itemName}
              </p>
              <p className="text-xs text-gray-500">
                @ ₹{item.salesPrice.toFixed(2)}
              </p>
            </div>
            {/* Quantity Stepper & Price */}
            <div className="flex flex-col items-end gap-2">
  <div className="flex items-center bg-gray-100 rounded-lg">
    <button 
      onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
      className="px-3 py-1 rounded-l-lg text-cyan-600 hover:bg-gray-200"
      aria-label="Decrease quantity"
    >
      <FaMinus size={12} />
    </button>

    <input
      type="text"
       onFocus={(e) => {
    e.target.focus(); // ensure input is focused
    setTimeout(() => {
      Keyboard.show(); // explicitly show the keyboard
    }, 100); // short delay helps trigger keyboard on some Androids
  }}
      value={item.quantity}
      onChange={(e) => {
        const val = parseInt(Number(e.target.value));
        updateItem(idx, 'quantity', val);
      }}
      className="w-12 text-base font-bold text-center bg-white border-none focus:ring-0"
    />

    <button 
      onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}
      className="px-3 py-1 rounded-r-lg text-cyan-600 hover:bg-gray-200"
      aria-label="Increase quantity"
    >
      <FaPlus size={12} />
    </button>
  </div>

  <p className="text-base font-bold text-gray-900">
    ₹{item.subtotal.toFixed(2)}
  </p>
</div>


            {/* Remove Button */}
            <button
              onClick={() => removeItem(idx)}
              className="p-2 text-gray-400 rounded-full hover:bg-red-50 hover:text-red-500"
              aria-label="Remove item"
            >
              <FaTrash size={16} />
            </button>
          </div>
        ))
      )}
    </div>
    
    <Summary 
  label="Subtotal" 
  value={`₹${items.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2)}`} 
/>

          <Summary label="Discount" value={`- ₹${totalDiscount.toFixed(2)}`} />
         
         {
          deliveryFee > 0 && (
            <Summary label="DeliveryFee" value={`+ ₹${deliveryFee.toFixed(2)}`} />
          )
         } 
         {
            processingFee > 0 && (
              <Summary label="HandlingFee" value={`+ ₹${processingFee.toFixed(2)}`} />
            )
         }
          {editId && <Summary label="Premium Membership Discount" value={`- ₹${exclusiveDiscount.toFixed(2)}`} />}
        {/* Additional Charges Section */}
<div className="mt-3">
  <label className="block mb-1 text-xs font-medium text-gray-600">
    Additional Charges
  </label>

  {/* Input row: Note + Amount + Add button */}
  <div className="flex gap-2">
    <input
      type="text"
      value={newNote}
      onChange={(e) => setNewNote(e.target.value)}
      placeholder="Note (e.g. Delivery)"
      className="flex-1 p-2 text-sm border-2 border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
    />
    <input
      type="text"
      value={newAmount}
  onChange={(e) => {
    let val = e.target.value; // use let, so we can reassign

    // if user types "01", "02", ... remove leading zero
    if (val.length > 1 && val.startsWith("0")) {
      val = val.replace(/^0+/, ""); // strip all leading zeros
    }

    setNewAmount(val === "" ? "" : Number(val));
  }}
      placeholder="Amount"
      className="p-2 text-sm border-2 border-gray-300 rounded-md w-28 focus:ring-cyan-500 focus:border-cyan-500"
    />
    <button
      type="button"
      onClick={() => {
        if (!newAmount) return;
        setAdditionalPaymentAmount([
          ...additionalPaymentAmount,
          { note: newNote || "Other", amount: Number(newAmount) }
        ]);
        setNewNote("");
        setNewAmount("");
      }}
      className="px-3 py-2 text-sm font-bold text-white rounded-md bg-cyan-600 hover:bg-cyan-700"
    >
      +
    </button>
  </div>

  {/* Show previously added additional charges */}
  {additionalPaymentAmount.length > 0 && (
    <div className="mt-3 space-y-2">
      {additionalPaymentAmount.map((item, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-2 text-sm border rounded-md bg-gray-50"
        >
          <span className="text-gray-700">
            {item.note}  
          </span>
          <span className="font-semibold text-gray-900">₹{item.amount}</span>
        </div>
      ))}
    </div>
  )}
</div>

          <div className="my-2 border-t border-dashed" />
          <Summary label="Grand Total" value={`₹${(totalAmount - totalDiscount+additionalCharges - exclusiveDiscount).toFixed(2)}`} isGrandTotal={true} />

          <div >
            <label className="block mb-1 text-xs font-medium text-gray-600">Apply Coupon</label>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Enter coupon code"
              className="w-full p-2 text-sm border-2 border-gray-300 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
            />
          </div>
         <div className='h-44'></div>
  </section>
);


// --- COMPONENT REFACTORED FOR BETTER MOBILE UX ---
const ItemDetailModal = ({ selectedItem, allItems, onClose, onSave,setItems }) => {
  
  console.log(selectedItem)
  // const item = allItems.find(it => it._id === selectedItem.item);
  // console.log("aa",item)
  const [salesPrice, setSalesPrice] = useState( selectedItem.salesPrice || 0);
   console.log(selectedItem)
 

  const handlePriceChange = (e) => setSalesPrice(e.target.value);

  const handleSave = async () => {
    try {
      if(salesPrice<selectedItem.purchasePrice){
        alert("SALES PRICE CANNOT BE LESS THAN PURCHASE PRICE");
        return ;
      }
         setItems(prevItems => {
           return prevItems.map(it => {
             if (it.item === selectedItem.item) {
               return { ...it, salesPrice:Number(salesPrice),subtotal: Number(salesPrice)*it.quantity};
             }
             return it;
           });
         });
         onClose();
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white shadow-xl rounded-t-3xl">
      {/* Header */}
      <header className="flex items-center justify-between p-4 text-white border-b bg-cyan-600">
        <button onClick={onClose} className="p-2">
          <FaChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold">Item Details</h2>
        <div className="w-6" />
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 space-y-6 overflow-y-auto">
        {/* Image & Name */}
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center flex-shrink-0 w-20 h-20 bg-gray-100 rounded-xl">
            {selectedItem?.image ? (
              <img
                src={selectedItem.image}
                alt="item"
                className="object-cover w-full h-full rounded-xl"
              />
            ) : (
              <FaBox size={32} className="text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-xl font-bold text-gray-800">{selectedItem.itemName}</p>
            <p className="text-sm text-gray-500">SKU: {selectedItem.sku || "N/A"}</p>
          </div>
        </div>

        {/* Quick Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <Info label="Category" value={selectedItem.category?.name || "N/A"} />
          <Info label="Brand" value={selectedItem.brand?.brandName || "N/A"} />
          <Info label="Stock" value={selectedItem.currentStock || 0} />
          <Info label="Barcode" value={selectedItem.barcode || selectedItem.barcodes.join(", ") || "N/A"} />
        </div>

        {/* Description */}
        {selectedItem.description && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase">Description</p>
            <p className="mt-1 text-sm text-gray-700">{selectedItem.description}</p>
          </div>
        )}

        {/* Sales Price */}
        <div>
          <label className="text-sm font-semibold text-gray-500">Sales Price (₹)</label>
          <input
            type="number"
            value={salesPrice}
            onChange={handlePriceChange}
            className="w-full p-3 mt-1 text-lg font-semibold border rounded-xl text-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-shrink-0 gap-3 p-4 bg-white border-t">
        <button
          onClick={onClose}
          className="flex-1 py-3 font-semibold text-white transition bg-gray-400 rounded-xl hover:bg-gray-500"
        >
          Close
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-3 font-semibold text-white transition rounded-xl bg-cyan-600 hover:bg-cyan-700"
        >
          Save
        </button>
      </footer>
    </div>
  );
};



export default function POS3({isSubmitting,additionalCharges,setItems,additionalPaymentAmount,setAdditionalPaymentAmount,setIsSubmitting,
selectedCustomer, selectedWarehouse, exclusiveDiscount,editId,
 allItems,  warehouses, invoiceCode, customers,
  orderPaymentMode, items, updateItem, removeItem, onHold,  onOpenModal,
  totalAmount, totalDiscount, couponCode, setCouponCode, isPaymentModalOpen, setIsPaymentModalOpen,
  PaymentModal, paymentMode, paymentTypes, accounts, terminals, buildPayload, selectedAccount,
  advancePaymentAmount, paymentSummary, sendOrder, currentOrderId, setAdvancePaymentAmount,
  setSelectedAccount, setActiveTab, setAdjustAdvancePayment,deliveryFee,processingFee
}) {
  const [selectedItem, setSelectedItem] = useState(null);
 const [newNote, setNewNote] = useState("");
  const [newAmount, setNewAmount] = useState(0);
  const [card,setCard] =useState(0);
  useEffect(() => {
    const backHandler = App.addListener('backButton', () => setActiveTab('pos2'));
    return () => backHandler.remove();
  }, [setActiveTab]);
  useEffect(()=>{
    console.log("Ad")
    console.log(items)
  }, [items]);

  useEffect(()=>{
      console.log("selectedItem",items)
      let total=0;
      items.forEach(element => {
          if(!element.offer) return;
          console.log(element)
           total += element.quantity * element.salesPrice;
          });
          setCard(total * 0.05);    //  0.05 is percentage of card points
  },[items])
  return (
    // CHANGED: Added pb-32 for padding at the bottom so content isn't hidden by the sticky footer
    <div className="text-gray-900 ">
     

      {/* CHANGED: Adjusted padding and spacing for a cleaner look */}
      <main className="px-3 pt-2 space-y-4">
        {/* Invoice Info Section */}
        <section className="pt-2 ">
          <div className="grid grid-cols-2 text-sm gap-x-4 ">
            <Info label="Warehouse" value={warehouses.find(w => w._id === selectedWarehouse)?.warehouseName || 'N/A'} />
            <Info label="Invoice #" value={invoiceCode} />
            <Info label="Customer" value={customers.find(c => c._id === selectedCustomer)?.name || 'N/A'} />
            <Info label="Payment" value={orderPaymentMode || 'None'} />
          </div>
          <div className="border-t border-gray-200 ">
            <button onClick={() => setActiveTab('pos2')} className="w-full px-4 py-2 text-sm font-medium text-center rounded-lg text-cyan-600 bg-cyan-50 hover:bg-cyan-100">
              <FaPlus className="inline mb-px mr-1" /> Add More Items
            </button>
          </div>
        </section>

        {/* Items List */}
        <ItemsList deliveryFee={deliveryFee} processingFee={processingFee} exclusiveDiscount={exclusiveDiscount} editId={editId} additionalCharges={additionalCharges} items={items} setNewAmount={setNewAmount} setNewNote={setNewNote} newNote={newNote} newAmount={newAmount} additionalPaymentAmount={additionalPaymentAmount} setAdditionalPaymentAmount={setAdditionalPaymentAmount} couponCode={couponCode} setCouponCode={setCouponCode} totalAmount={totalAmount} totalDiscount={totalDiscount} updateItem={updateItem} removeItem={removeItem} setSelectedItem={setSelectedItem} />

      </main>

      {/* --- CHANGED: STICKY FOOTER FOR ACTIONS --- */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 p-3 bg-white border-t border-gray-200">
        <div className='flex justify-between gap-6 mb-3 text-lg font-bold text-gray-900'>
          <span>Grand Total:{`₹${(totalAmount - totalDiscount - exclusiveDiscount+ additionalCharges).toFixed(2)}`}</span>
          <span>Points:{`₹${card.toFixed(2)}`}</span>
        </div>
          <div className="grid grid-cols-2 gap-3">
  <button
    onClick={async () => {
      // Guard clause: Exit immediately if a submission is already in progress.
      if (isSubmitting) return;

      // Set state to true to prevent further clicks.
      setIsSubmitting(true);

      try {
        // Await the asynchronous function call.
        await onHold();
      } finally {
        // Always reset the state to false, regardless of success or failure.
        setIsSubmitting(false);
      }
    }}
    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-yellow-800 bg-yellow-400 rounded-lg"
    disabled={isSubmitting}
  >
    <FaHandPaper /> Hold
  </button>
  <button
    disabled={isSubmitting}
    onClick={async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onOpenModal("multiple");
      } finally {
        setIsSubmitting(false);
      }
    }}
    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white text-blue-800 bg-blue-400 rounded-lg"
  >
    <FaLayerGroup /> Multiple
  </button>
  <button
    disabled={isSubmitting}
    onClick={async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onOpenModal("cash");
      } finally {
         setTimeout(() => {
            setIsSubmitting(false);
          }, 1000);
      }
    }}
    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-green-600 rounded-lg"
  >
    <FaMoneyBill /> Cash
  </button>
  <button
    disabled={isSubmitting}
    onClick={async () => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        await onOpenModal("bank");
      } finally {
          setTimeout(() => {
            setIsSubmitting(false);
          }, 1000);
      }
    }}
    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-purple-600 rounded-lg"
  >
    <FaCreditCard /> Bank
  </button>
</div>
      </footer>


      {selectedItem && (
        <ItemDetailModal selectedItem={selectedItem} allItems={allItems}  onClose={() => setSelectedItem(null)} setItems={setItems} />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
          paymentMode={"multiple"}
          paymentTypes={paymentTypes}
          accounts={accounts}
          terminals={terminals}
          initialAdvance={advancePaymentAmount}
          initialAccount={selectedAccount}
          initialSummary={paymentSummary}
          selectedWarehouse={selectedWarehouse}
          onSubmit={({ paymentRows, couponCode, adjustAdvancePayment, advance, selectedAccount }) => {
            sendOrder(buildPayload({ status: 'Completed', payments: paymentRows, paymentMode }), currentOrderId ? 'put' : 'post', currentOrderId);
            setCouponCode(couponCode || '');
            setAdjustAdvancePayment(adjustAdvancePayment);
            setAdvancePaymentAmount(advance);
            setSelectedAccount(selectedAccount);
          }}
        />
      )}
    </div>
  );
}
