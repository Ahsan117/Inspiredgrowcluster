import React from 'react'
import { useState,useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from "../Navbar.jsx";
import Sidebar from '../Sidebar.jsx'

import { NavLink } from 'react-router-dom'
import { FaTachometerAlt } from 'react-icons/fa'

import ViewItems from './ViewItems.jsx'

const  AllAudits=()=> {
      const link="https://pos.inspiredgrow.in/vps"
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    const [comparison,setComparison]=useState(false)
    const[items,setItems]=useState([])
    const [audits,setAudits]=useState([])
  
     useEffect(()=>{
        if(window.innerWidth < 768){
          setSidebarOpen(false)
        }
      },[window.innerWidth])

      const  navigate=useNavigate();
      
    useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${link}/api/audit/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        console.log(response.data.data);
        setAudits(response.data.data);
      } catch (err) {
        console.error("Fetch audit error:", err.message);
      }
    };

    fetchData();
  }, []);
 
   const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${link}/api/audit/all`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        console.log(response.data.data);
        setAudits(response.data.data);
      } catch (err) {
        console.error("Fetch audit error:", err.message);
      }
    };
    
  const handleDelete = async (id) => {
    const conf= window.confirm("Do u want to delete audit")
    if(!conf){
      return ;
    }
  
   
    try {
      const response = await axios.delete(`${link}/api/audit/delete/${id}`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    console.log(response)
    } catch (error) {
      console.error( error.message);
    }
    finally{
      fetchData()
    }
  };

 



    
     
     
  return (
<div className="flex flex-col h-screen bg-gray-50">
  <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

  <div className="flex flex-1 w-full">
    {/* Sidebar */}
    <Sidebar isSidebarOpen={isSidebarOpen} />

    {/* Content */}
    <div className="flex-1 p-4 md:p-6">
      {/* Header */}
      <header className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit List</h1>
          <p className="text-sm text-gray-500">Manage and review audit records</p>
        </div>

        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <NavLink
            to="/dashboard"
            className="flex items-center hover:text-cyan-600"
          >
            <FaTachometerAlt className="mr-1" /> Home
          </NavLink>
          <span>{'>'}</span>
          <NavLink to="/audit" className="hover:text-cyan-600">
            Start Audit
          </NavLink>
          <span>{'>'}</span>
          <NavLink to="/audit/all" className="hover:text-cyan-600">
            Audit List
          </NavLink>
        </nav>
      </header>
      

      {/* Audit Table / Cards */}
      <div className="p-4 mt-4 bg-white border-t-4 rounded-lg shadow-md border-cyan-500">
        {/* Desktop Table */}
        <div className="hidden overflow-x-auto border border-gray-200 rounded-lg shadow-sm md:block">
          <table className="min-w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
              <tr>
                <th className="px-6 py-3">Audit ID</th>
                <th className="px-6 py-3">Warehouse</th>
                <th className="px-6 py-3">Total Items</th>
                <th className="px-6 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {audits.map((audit) => (
                <tr key={audit._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900 break-all">
                    {audit._id}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 break-all">
                    {audit.warehouseId?.warehouseName}
                  </td>
                  <td className="px-6 py-4">{audit.items?.length || 0} items</td>
                  <td className="px-6 py-4 space-x-3 text-center">
                    <button
                      className="px-3 py-1 text-sm text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-50"
                      onClick={() => {
                        setItems(audit);
                        setComparison(true);
                      }}
                    >
                      View
                    </button>
                    <button
                      className="px-3 py-1 text-sm text-red-600 border border-red-600 rounded hover:bg-red-50"
                       onClick={() => {
    if (window.confirm("Are you sure you want to delete this audit?")) {
      handleDelete(audit._id);
    }
  }}
                    >
                      Delete
                    </button>
                     
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="space-y-4 md:hidden">
          {audits.map((audit) => (
            <div
              key={audit._id}
              className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="text-xs font-semibold text-gray-500">Audit ID</div>
              <div className="mb-2 text-sm font-medium text-gray-900 break-all">
                {audit._id}
              </div>
              <div className="text-xs font-semibold text-gray-500">Warehouse</div>
              <div className="mb-2 text-sm font-medium text-gray-900 break-all">
                {audit.warehouseId?.warehouseName}
              </div>
              <div className="mb-3 text-xs text-gray-500">
                Total Items: {audit.items?.length || 0}
              </div>

              <div className="flex gap-3">
                <button
                  className="flex-1 px-3 py-1 text-sm text-center text-indigo-600 border border-indigo-600 rounded hover:bg-indigo-50"
                  onClick={() => {
                    setItems(audit);
                    setComparison(true);
                  }}
                >
                  View
                </button>
                <button
                  className="flex-1 px-3 py-1 text-sm text-center text-red-600 border border-red-600 rounded hover:bg-red-50"
                  onClick={() => handleDelete(audit._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Modal */}
      {comparison && (
        <ViewItems
          audit={items}
          onClose={() => setComparison(false)}
          sidebarOpen={isSidebarOpen}
        />
      )}
    </div>
  </div>
</div>
  
)
}

export default AllAudits
