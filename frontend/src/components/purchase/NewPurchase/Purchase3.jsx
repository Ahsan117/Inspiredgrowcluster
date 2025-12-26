import React, { useState, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import { Select } from 'antd';
import { FaChevronLeft, FaPlus, FaTrash, FaMinus, FaTimes, FaBox, FaEdit, FaBoxOpen, FaInfoCircle } from 'react-icons/fa';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import ItemEditPage from './ItemEditPage'; // Assuming this component exists
import { Keyboard } from '@capacitor/keyboard';
export default function Purchase3({loading,
    setActiveTab, allItems, options, formData, handleItemFieldChange, setFormData, handleRemoveItem,
    handleChange, setOtherCharges, discount, setDiscount, setDiscountType, discountType, subtotal,
    grandtotal, handlePayment, handlePaymentSelect, id, items,isCash,isBank,cashAccounts
}) {
    const navigate = useNavigate();
    const [edit, setEdit] = useState(false);
    const [itemEdit, setItemEdit] = useState(null);
    const [itemEditIndex, setItemEditIndex] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

 useEffect(() => {
  let backHandler;

  if (edit) {
    // Close modal when back is pressed
    backHandler = App.addListener('backButton', () => setEdit(false));
  } else {
    // Navigate back to previous tab if modal is not open
    backHandler = App.addListener('backButton', () => setActiveTab('p2'));
  }

  return () => {
    backHandler?.remove();
  };
}, [edit, setEdit, setActiveTab]);

const handleQuantity = (e, id, type) => {
  let updatedItems;

  if (type === "delete") {
    updatedItems = formData.items.filter(it => it._id !== id);
  } 
  
  else if (type === "change") {
    
    const inputVal = parseInt(e.target.value.replace(/^0+(?!$)/, ''));
    updatedItems = formData.items.map(item =>
      item.item === id
        ? {
            ...item,
            quantity:Math.max(0, isNaN(inputVal) ? 0 : inputVal),
          }
        : item
    );
  } 
  
  else {
    updatedItems = formData.items.map(item => {
      if (item._id === id) {
        if (type === "plus") {
          
            return { ...item, quantity: item.quantity + 1 };
        } else if (type === "minus") {
          const newQty = Math.max(1, item.quantity - 1);
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }); // optional cleanup
  }

  setFormData(prev => ({ ...prev, items: updatedItems }));
};


    return (
        <div className="min-h-screen bg-gray-50">
            {edit && <ItemEditPage edit={edit} setEdit={setEdit} setFormData={setFormData} formData={formData} item={itemEdit} id={itemEditIndex} />}
            {selectedItem && <ItemInfoPage allItems={options.items} selectedItem={selectedItem} onClose={() => setSelectedItem(null)} />}

          

            {/* REFINED DESIGN: Added pb-28 to prevent sticky footer from hiding content */}
            <main className="p-3 space-y-4 ">
                {/* REFINED DESIGN: Separated info into its own card */}
                <section className="pt-2">
                    <div className="grid grid-cols-2 text-sm gap-x-4 ">
                        <InfoField label="Warehouse" value={options.warehouse.find(opt => opt.value === formData.warehouse)?.label} />
                        <InfoField label="Supplier" value={options.suppliers.find(opt => opt.value === formData.supplier)?.label} />
                        <InfoField label="Reference No." value={formData.referenceNo || 'N/A'} />
                        <InfoField label="Purchase Date" value={formData.purchaseDate ? dayjs(formData.purchaseDate).format("DD MMM YYYY") : "N/A"} />
                    </div>
                    <div className="border-t ">
                        <button className='flex items-center justify-center w-full gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg bg-cyan-600 hover:bg-cyan-700' onClick={() => setActiveTab("p2")} type="button">
                            <FaPlus /> Add More Items
                        </button>
                    </div>
                </section>

                {/* REFINED DESIGN: ItemsList component is now cleaner */}
                <ItemsList
                    items={formData.items}
                    updateItem={handleQuantity}
                    removeItem={handleQuantity}
                    setSelectedItem={setSelectedItem}
                    setEdit={setEdit}
                    setItemEdit={setItemEdit}
                    setItemEditIndex={setItemEditIndex}
                />

                {/* Charges & Totals Card */}
                <section className="pt-2">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Subtotal</span>
                            <span className="font-medium text-gray-800">₹{subtotal?.toFixed(2)}</span>
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Other Charges</label>
                            <input type="number" step="any" min="0" name="otherCharges" value={formData.otherCharges} onChange={(e)=>{handleChange(e);setOtherCharges(e.target.value)}} className="w-full p-2 mt-1 text-sm border-gray-300 rounded-md" placeholder="₹0.00" />
                        </div>
                        <div>
                            <label className="text-sm text-gray-600">Discount</label>
                            <div className="flex mt-1 space-x-2">
                                <input type="number" min="0" step="any" name="discountOnAll" value={discount} onChange={(e) => setDiscount(e.target.value)} className="flex-1 p-2 text-sm border-gray-300 rounded-md" placeholder="Value" />
                                <select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="p-2 text-sm border-gray-300 rounded-md bg-gray-50">
                                    <option value="percent">%</option>
                                    <option value="amount">₹</option>
                                </select>
                            </div>
                        </div>
                        <div className="pt-3 mt-2 border-t border-dashed">
                            <div className="flex items-center justify-between">
                                <span className="text-base font-bold text-gray-800">Grand Total</span>
                                <span className="text-xl font-bold text-purple-600">₹{grandtotal?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Notes Card */}
                <section className="">
                    <label className="text-base font-semibold text-gray-800">Notes</label>
                    <textarea value={formData.note} name="note" onChange={handleChange} className="w-full p-2 mt-2 text-sm border-gray-300 rounded-md" rows="3" placeholder="Add any additional notes..."></textarea>
                </section>
                
                 {/* Payment Section */}
                <section className="">
                    <h2 className="mb-3 text-base font-semibold text-gray-800">Payment</h2>
                    <div className="space-y-2">
                        <div>
                            <label className="text-sm text-gray-600">Amount <span className="text-red-500">*</span></label>
                            <input type="number "  step="any" min="0" value={formData.payments[0]?.amount} name="amount" onChange={handlePayment} className="w-full p-2 mt-1 text-sm border-gray-300 rounded-md" placeholder="Enter amount" />
                        </div>
                         <div >
                  <label className="text-sm text-gray-600" >Payment Note</label>
                  <textarea
                    name="paymentNote"
                    value={formData.payments[0]?.paymentNote}
                    onChange={handlePayment}
                     className="w-full p-2 mt-1 text-sm border-gray-300 border-1 rounded-xl"
                    rows="3"
                    placeholder="Add a payment note"
                  />
                </div>
                         {/* REFINED DESIGN: Fixed Ant Design Select styling */}
                        <div>
                            <label className="text-sm text-gray-600">Payment Type <span className="text-red-500">*</span></label>
                            <Select
                                className="w-full mt-1"
                                options={options.paymentType}
                                onChange={(value) => handlePaymentSelect("paymentType")(value)}
                                value={formData.payments[0]?.paymentType}
                                placeholder="Select payment type"
                            />
                        </div>
                        {/* <div>
                            <label className="text-sm text-gray-600">Account</label>
                            <Select
                                className="w-full mt-1"
                                options={options.accounts} // Using all accounts, filter as needed
                                onChange={handlePaymentSelect("account")}
                                value={formData.payments[0]?.account}
                                placeholder="Select account"
                            />
                        </div> */}
                         {isCash && (
                                          <div >
                                            <label className="text-sm text-gray-600">Account</label>
                                            <Select
                                              options={cashAccounts}
                                               className="w-full mt-1"
                                              onChange={handlePaymentSelect("account")}
                                              value={cashAccounts.find(opt => opt.value === formData.payments[0]?.account) || null}
                                              placeholder="Select Account"
                                            />
                                          </div>
                                        )}
                                        
                                        {isBank && (
                                          <div >
                                            <label className="text-sm text-gray-600">Terminal</label>
                                            <Select
                                              options={options.terminals.filter(t => t.warehouse === formData.warehouse)}
                                               className="w-full mt-1"
                                              onChange={handlePaymentSelect("terminal")}
                                              value={options.terminals.find(opt => opt.value === formData.payments[0]?.terminal) || null}
                                              placeholder="Select Terminal"
                                            />
                                          </div>
                                        )}
                    </div>
                </section>

            </main>

            {/* Sticky Footer */}
            <footer className="sticky bottom-0 left-0 right-0 p-3 bg-white border-t">
                <div className="flex space-x-3">
                    <button type="button" onClick={() => navigate("/purchase-list")} className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
                        Cancel
                    </button>
                    <button type="submit" className="flex-1 px-4 py-3 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700" disabled={loading}>
                        {id ? "Update Purchase" : "Submit Purchase"}
                    </button>
                </div>
            </footer>
        </div>
    );
}

// --- REFINED ITEM LIST COMPONENT ---
const ItemsList = ({ items, updateItem, removeItem, setSelectedItem, setEdit, setItemEdit, setItemEditIndex }) => (
    <section className="space-y-2 overflow-y-auto max-h-96">
        {items.length === 0 ? (
            <div className="p-8 text-center bg-white shadow-sm rounded-xl">
                <FaBoxOpen className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="mt-3 text-base font-semibold text-gray-800">No Items Added</h3>
                <p className="mt-1 text-sm text-gray-500">Add items to your purchase list.</p>
            </div>
        ) : (
            items.map((item, index) => (
                <div key={index} className="p-3 bg-white shadow-sm rounded-xl">
                    <div className="flex items-center gap-3">
                        {/* Item Info (Clickable for details) */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedItem(item)}>
                            <p className="font-semibold text-gray-800 truncate">{item.itemName}</p>
                            <p className="text-xs text-gray-500">
                                Price: ₹{item.purchasePrice?.toFixed(2)}
                            </p>
                        </div>

                        {/* Quantity & Actions */}
                        <div className="flex flex-col items-end gap-2">
                            <p className="text-base font-bold text-gray-900">
                                ₹{(item.purchasePrice * item.quantity).toFixed(2)}
                            </p>
                            <div className="flex items-center gap-1">
                                <div className="flex items-center bg-gray-100 rounded-full">
                                    <button type="button" onClick={(e) => updateItem(e, item._id, 'minus')} className="p-2 text-gray-600">
                                        <FaMinus size={12} />
                                    </button>
                                    <input type="number" value={item.quantity}           onFocus={(e) => {
    e.target.focus(); // ensure input is focused
    setTimeout(() => {
      Keyboard.show(); // explicitly show the keyboard
    }, 100); // short delay helps trigger keyboard on some Androids
  }} onChange={(e) => updateItem(e, item.item, 'change')} className="w-10 text-base font-bold text-center bg-transparent border-none focus:ring-0" />
                                    <button type="button" onClick={(e) => updateItem(e, item._id, 'plus')} className="p-2 text-gray-600">
                                        <FaPlus size={12} />
                                    </button>
                                </div>
                                 <button onClick={() => { setEdit(true); setItemEdit(item); setItemEditIndex(item.item); }} type="button" className="p-2 text-gray-500 rounded-full hover:bg-blue-100 hover:text-blue-600">
                                    <FaEdit size={14} />
                                </button>
                                <button onClick={(e) => removeItem(e, item.item, 'delete')} type="button" className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-500">
                                    <FaTrash size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ))
        )}
    </section>
);

// Helper component for displaying info fields
const InfoField = ({ label, value }) => (
    <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-semibold text-gray-800 truncate">{value || 'N/A'}</p>
    </div>
);

// --- REFINED ITEM INFO PAGE (MODAL) ---
const ItemInfoPage = ({ selectedItem, onClose, allItems }) => {
    const itemDetails = allItems.find(it => it._id === selectedItem.item);
    if (!itemDetails) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
            <header className="flex items-center justify-between flex-shrink-0 p-4 bg-white border-b">
                <button type="button" onClick={onClose} className="p-2 -ml-2 text-gray-600"><FaChevronLeft size={20} /></button>
                <h2 className="text-lg font-semibold">Item Details</h2>
                <div className="w-6" />
            </header>

            <main className="flex-grow p-3 space-y-3 overflow-y-auto">
                <div className="flex items-center gap-4 p-4 bg-white rounded-xl">
                    <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-lg">
                        {itemDetails.image ? <img src={itemDetails.image} alt={itemDetails.itemName} className="object-cover w-full h-full rounded-lg" /> : <FaBox className="text-2xl text-gray-400" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{itemDetails.itemName}</h3>
                        <p className="text-sm text-gray-500">SKU: {itemDetails.sku || 'N/A'}</p>
                    </div>
                </div>
                <div className="p-4 bg-white rounded-xl">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <InfoField label="Category" value={itemDetails.category?.name} />
                        <InfoField label="Brand" value={itemDetails.brand?.brandName} />
                        <InfoField label="Sales Price" value={`₹${itemDetails.salesPrice?.toFixed(2)}`} />
                        <InfoField label="Current Stock" value={itemDetails.currentStock || '0'} />
                        <InfoField label="Barcode" value={itemDetails.barcode || itemDetails.barcodes?.[0]} />
                    </div>
                </div>
            </main>

            <footer className="flex-shrink-0 p-3 bg-white border-t">
                <button onClick={onClose} type="button" className="w-full py-3 font-semibold text-white rounded-xl bg-cyan-600 hover:bg-cyan-700">
                    Close
                </button>
            </footer>
        </div>
    );
};