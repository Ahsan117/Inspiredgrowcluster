import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { App } from '@capacitor/app';
import axios from 'axios';
const ItemEditPage = ({ item,edit,setEdit,id,setFormData,formData }) => {
  const [form, setForm] = useState({
    expiryDate: '',
    mrp: 0,
    purchasePrice: 0,
    discount: 0,
    salesPrice: 0,
  });


 
useEffect(() => {
  const handler = App.addListener('backButton', (event) => {
    if (edit) {
      event.preventDefault(); // stop default back behavior
      setEdit(false);         // close popup
    }
  });

  return () => {
    handler.remove();
  };
}, [edit]);


const hasPermissionFor = (module, action) => {
    const localPermissions = JSON.parse(localStorage.getItem('permissions')) || [];
    console.log("permisssion",localPermissions.some(
      (perm) =>
        perm.module.toLowerCase() === module.toLowerCase() &&
        perm.actions.map((a) => a.toLowerCase()).includes(action.toLowerCase())
    ))
    return localPermissions.some(
      (perm) =>
        perm.module.toLowerCase() === module.toLowerCase() &&
        perm.actions.map((a) => a.toLowerCase()).includes(action.toLowerCase())
    );
  };
  
    
  useEffect(() => {
    if (item) {
      setForm({
        expiryDate: item.expiryDate?.split('T')[0] || '',
        mrp: item.mrp || 0,
        purchasePrice: item.purchasePrice || 0,
        discount: item.discount || 0,
        salesPrice: item.salesPrice || 0,
      });
    }
  }, [item]);

  const handleChange = (field, value) => {
    if(field === 'expiryDate') {
       let updatedForm = { ...form, [field]: (value) };

    // Auto-calculate salesPrice if discount or MRP changes
    setForm(updatedForm);
    return;
    }
    let updatedForm = { ...form, [field]: Number(value) };

    // Auto-calculate salesPrice if discount or MRP changes
    setForm(updatedForm);
  };

  const handleSubmit =async (e) => {
    e.preventDefault();
    if(form.salesPrice<form.purchasePrice){
      alert("Sales Price cannot be less than Purchase Price");
      return;
    }
    const updateditem=formData.items.map(it=>
        it.item===id?{...it, ...form } : it 
    )
    console.log(updateditem)
    console.log(form)
  setFormData(prev=>({
    ...prev,
    items: updateditem, 
  }))
  
    // const res= await axios.put("https://pos.inspiredgrow.in/vps/api/items/updateFromPurchase",{
    //   itemId:id,
    //   ...form
    //  },{
    //   headers:{
    //     Authorization: `Bearer ${localStorage.getItem("token")}`,
    //   }
    //  })
    //      console.log("Item updated successfully:", res.data);
  setForm({
    expiryDate: '',
    mrp: 0,
    purchasePrice: 0,
    discount: 0,
    salesPrice: 0,
  })
  setEdit(false);
  };


  useEffect(() => {
    console.log("Form data updated:", formData.items);
  }, [formData.items]);
  return (
    <div
      className="absolute w-screen h-full p-4 space-y-3 transition-all duration-200 bg-white shadow-sm rounded-xl"
    >
        
      <h2 className="text-base font-semibold text-center text-gray-900 ">Edit Item</h2>

      <div>
        <label className="block mb-1 text-xs font-medium text-gray-600">Expiry Date</label>
        <input
          type="date"
        value={form.expiryDate}
          onChange={(e) => handleChange('expiryDate', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-200"
        />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-gray-600">MRP</label>
        <input
          type="number"
          value={form.mrp}
          onChange={(e) => handleChange('mrp', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-200"
          min="0"
        />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-gray-600">Purchase Price</label>
        <input
          type="number"
          value={form.purchasePrice}
          onChange={(e) => handleChange('purchasePrice', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-200"
          min="0"
        />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-gray-600">Discount (Rs.)</label>
        <input
          type="number"
          value={form.discount}
          onChange={(e) => handleChange('discount', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-200"
          min="0"
          max="100"
        />
      </div>

      <div>
        <label className="block mb-1 text-xs font-medium text-gray-600">Sales Price</label>
        <input
          type="number" readOnly={!hasPermissionFor('Items', 'Edit') || !hasPermissionFor('Sales', 'Edit') }
          value={form.salesPrice}
          onChange={(e) => handleChange('salesPrice', e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-colors duration-200"
          min="0"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-green-600 rounded-lg hover:bg-green-700"
      >
        Save Changes
      </button>
      <button
        type="button"
        onClick={() => setEdit(false)}
        className="w-full px-4 py-2 text-sm font-medium text-white transition-colors duration-200 bg-red-600 rounded-lg hover:bg-red-700"
      >
        Close
      </button>
      </div>
  );
};

export default ItemEditPage;