import React from 'react'
import Select from 'react-select'
import { useState,useEffect } from 'react'
import axios, { all } from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import Button from '../contact/Button.jsx'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt } from 'react-icons/fa'
import AuditorNavbar from './AuditorNavBar.jsx'



const  Audit=()=> {
   
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(()=>{
        if(window.innerWidth < 768){
          setSidebarOpen(false)
        }
      },[window.innerWidth])
    
    const [store,setStore] = useState([]);
    const [allstore,setAllStore] = useState([]);
    const [allwarehouse,setAllWarehouse] = useState([]);
    const [warehouseView,setWarehouseView] = useState([]);
     const [formData,setFormData] = useState({
        storeId:null,
        warehouseId:null,
        users:[],
        partial:false
     })

     const [userData, setUserData] = useState({
        username: '',
        password: '',
        employeeCode: ''
     });

     const fetchStores = async () => {
        try {
            const response = await axios.get('https://pos.inspiredgrow.in/vps/admin/store/add/store',{
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }});
                  console.log(("Store"))
            console.log(response.data);
            const storeFormat=response.data.result.map(st=>({
              label:st.StoreName,
              value:st._id
            }))
            setAllStore(response.data.result);
            setStore(storeFormat);
        } catch (error) {
            console.error("Error fetching stores:", error);
        }
     }

     const fetchWarehouses = async () => {
        try {
            const response = await axios.get('https://pos.inspiredgrow.in/vps/api/warehouses?scope=mine',{
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }});
                  console.log("warehouse")
            console.log(response.data);
            setAllWarehouse(response.data.data);
        } catch (error) {
            console.error("Error fetching warehouses:", error);
        }
     }
     useEffect(()=>{
      fetchStores();
      fetchWarehouses();
     },[])

     useEffect(() => {
         if(!formData.storeId) return;

             alert("Store ID changed, fetching warehouses...");

             console.log(allstore, formData.storeId);

             const storeExists=allstore.find(store => store._id === formData.storeId);


             
             if(!storeExists){
                 alert("Store not found, please select a valid store.");
                 return;} 
                 
         const filteredWarehouses = allwarehouse.filter(warehouse => warehouse.store === formData.storeId);
         
          if(filteredWarehouses.length === 0){
              alert("No warehouses found for the selected store.");
              return;
          }
          
         setWarehouseView(filteredWarehouses.map(warehouse=>({
              label: warehouse.warehouseName,
              value: warehouse._id
         })));
         console.log(filteredWarehouses)
      
     },[formData.storeId]);

const handleAdd = (e) => {
  e.preventDefault();
  if(userData.username === '' || userData.password === '' ){
    alert("Please fill all fields");
    return;
  }

  setFormData((prev) => ({...prev, users: [...prev.users, userData] }));
  setUserData({ username: '', password: '', employeeCode: '' }); // Reset userData after adding

}


const handleRemoveUser = (index) => {
  setFormData((prev) => ({
    ...prev,
    users: prev.users.filter((_, i) => i !== index)  
  }));
};


const handleSubmit = async (e) => {
  e.preventDefault();
   try {
    console.log("Submitting audit with data:", formData);
    const response = await axios.post('https://pos.inspiredgrow.in/vps/api/audit/create', formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log("Audit submitted successfully:", response.data);
    alert("Audit submitted successfully");
    setFormData({
      storeId: null,
      warehouseId: null,
      users: []
    });
    setUserData({
      username: '',
      password: '',
      employeeCode: ''
    });
   } catch (error) {
    console.log("Error submitting audit:", error);
   }



}
const [checked,setChecked] = useState(true);

  
  return (
    <div className="flex flex-col h-screen">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-grow ">

        <Sidebar isSidebarOpen={isSidebarOpen} />
          
           {/* Content */}
         <div className={`w-full flex flex-col p-2 md:p-2  `}>
          <header className="flex flex-col items-center justify-between p-4 rounded-md shadow sm:flex-row">
            <div className="flex items-center gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">New Audit</h1>
              <span className="text-xs text-gray-600 sm:text-sm">Add/Update Audit</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center mt-2 text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
   <NavLink to="/dashboard" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                            <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" /> Home
                          </NavLink>     
                          <NavLink to="/audit/view" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                           &gt; Audit List
                          </NavLink>    
                          <NavLink to="/audit" className="text-gray-700 no-underline hover:text-cyan-600">
                           &gt; Add Audit
                          </NavLink>
              
            </nav>
          </header>

          <div className="p-4 mt-1 bg-white border-t-4 rounded-lg shadow-md border-cyan-500">
 
               
                 <div className="flex flex-col gap-2 md:gap-5 md:flex-row">
                  <div className="w-full">
                    <label htmlFor="">Store</label>
<Select
  className="w-full"
  options={store}
  onChange={(option) =>
    setFormData((prev) => ({ ...prev, storeId: option.value }))
  }
  value={store.find((s) => s.value === formData.storeId) || null}
/>
                  </div>



                     <div className="w-full">
                    <label htmlFor="">Warehouse</label>
                    <Select className="w-full" options={warehouseView} onChange={(option)=>setFormData((prev)=>({...prev,warehouseId:option.value}))}  value={warehouseView.find((s) => s.value === formData.warehouseId) || null}/>
                  </div>
                 </div>


              
  
                   {/* //user add */}
                    <div className="flex flex-col mt-4 md:gap-5 md:flex-row">
                      
                  <div className="w-full">
                    <label htmlFor="">Username</label>
                    <input type="text" name="username" className='w-full px-2 py-2 border-2 rounded-md'  value={userData.username} onChange={e=>setUserData((prev)=>({...prev,username:e.target.value}))}/>
                                        {/* <Select className="w-full" options={store} onChange={(option)=>setFormData((prev)=>({...prev,storeId:option.value}))}/> */}
                  </div>



                     <div className="w-full">
                    <label htmlFor="">Password</label>
                    <input type="text" name="username" className='w-full px-2 py-2 border-2 rounded-md' value={userData.password} onChange={e=>setUserData((prev)=>({...prev,password:e.target.value}))}/>
                  </div>
                     <div className="w-full">
                    <label htmlFor="">Employee Code</label>
                    <input type="text" name="username" className='w-full px-2 py-2 border-2 rounded-md'  value={userData.employeeCode} onChange={e=>setUserData((prev)=>({...prev,employeeCode:e.target.value}))}/>
                  </div>

                  
                 </div>
                   <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={formData.partial}
        onChange={(e) => setFormData((prev) => ({ ...prev, partial: e.target.checked }))}
        className="w-5 h-5 rounded accent-green-500"
      />
      <span className="text-sm font-medium">
        {formData.partial ? "Partial" : "Not Partial"}
      </span>
    </label>
                      <div className='flex flex-col items-center justify-around w-full gap-2 mx-auto mt-4 sm:flex-row'>
                                                      <Button className="w-full text-white bg-green-500 rounded cursor-pointer hover:bg-green-600" type='submit' text="Add" onClick={handleAdd} /> {/* Save button */}
                                                      <Button className="w-full text-white bg-orange-500 rounded cursor-pointer hover:bg-orange-600" text="Reset"  onClick={()=>setUserData({
                        username: '',
                        password: '',
                        employeeCode: ''
                                                      })}/> {/* Close button */}
                      </div>

                     <div className='w-full mt-4 overflow-x-auto min-h-16'>
  <table className='min-w-full border-2 divide-y divide-gray-200 min-h-48'>
    <thead className='bg-gray-200'>
      <tr>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Username</th>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Password</th>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Employee Code</th>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Actions</th>
      </tr>
    </thead>
    <tbody className='bg-white divide-y divide-gray-200'>
      {formData.users.map((user, index) => (
        <tr key={index}>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>{user.username}</td>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>{user.password}</td>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>{user.employeeCode}</td>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>
            <button 
              onClick={() => handleRemoveUser(index)}
              className='text-red-600 hover:text-red-900'
            >
              Remove
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>


 <div className='flex flex-col items-center justify-around w-full gap-2 mx-auto mt-4 sm:flex-row'>
                                                      <Button className="w-full text-white bg-green-500 rounded cursor-pointer hover:bg-green-600" type='submit' text="Start" onClick={handleSubmit} /> {/* Save button */}
                                                      <Button className="w-full text-white bg-orange-500 rounded cursor-pointer hover:bg-orange-600" text="Reset" /> {/* Close button */}
                      </div>
                 
                 
            </div>
          </div>
        </div>
      </div>
  )
}

export default Audit
