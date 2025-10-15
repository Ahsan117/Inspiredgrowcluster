import React from 'react'
import Select from 'react-select'
import { useState,useEffect } from 'react'
import axios, { all } from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from "../Navbar.jsx";
import Sidebar from '../Sidebar.jsx'
import Button from '../contact/Button.jsx'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt } from 'react-icons/fa'
import { FiEdit, FiTrash2 } from 'react-icons/fi'
import ItemsCompare from './ItemsCompare.jsx'
import AuditAuditors from "./AuditorView.jsx"

const  OpenAuditList=()=> {
  const link="https://pos.inspiredgrow.in/vps"
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [comparison,setComparison]=useState(false)
    const[items,setItems]=useState([])
    const [audits,setAudits]=useState([])
     useEffect(()=>{
        if(window.innerWidth < 768){
          setSidebarOpen(false)
        }
      },[window.innerWidth])
       const [pop,setPop]=useState(false)
      const [users,setUsers]=useState([])
      const  navigate=useNavigate();
      
    useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${link}/api/audit/compare-items`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        console.log("Fetched audits:");
        console.log(response);
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
        const response = await axios.get(`${link}/api/audit/compare-items`, {
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
    const conf= window.confirm("Do u want to delete customer")
    if(!conf){
      return ;
    }
  
   
    try {
      const response = await axios.delete(`${link}/api/audit/delete/${id}`,{
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
    
     alert("Deleted Successfully")
    
    } catch (error) {
      console.error( error.message);
    }
    finally{

      fetchData()
    }
  };

  const handleAuditEnd=async(id)=>{
    try {
        const token = localStorage.getItem("token");
        const response = await axios.put(`${link}/api/audit/end`,{
            auditId:id
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        console.log(response)
        fetchData();
        alert("Audit End sucessfully")
            
            return;
        
      } catch (err) {
        console.error("error in  audit  end :", err.message);
      }
  }

  const handleDeleteAudit=async(id)=>{
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
 fetchData();
     alert("Deleted Successfully")
    
    } catch (error) {
      console.error( error.message);
    }
    
  }



    
     
     
  return (

<div className="flex flex-col h-screen">
  {/* Navbar */}
  <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

  <div className="flex flex-1 bg-gray-50">
    {/* Sidebar */}
    <Sidebar isSidebarOpen={isSidebarOpen} />

    {/* Main Content */}
    <div className="flex flex-col flex-1 p-4 md:p-6">
      {/* Page Header */}
      <header className="flex flex-col p-4 mb-4 bg-white border rounded-lg shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Open Audit List
          </h1>
          <nav className="flex flex-wrap items-center text-xs text-gray-500 sm:text-sm">
            <NavLink
              to="/dashboard"
              className="flex items-center hover:text-cyan-600"
            >
              <FaTachometerAlt className="mr-1" /> Home
            </NavLink>
            <span className="mx-2">&gt;</span>
            <NavLink
              to="/audit"
              className="hover:text-cyan-600"
            >
              Start Audit
            </NavLink>
            <span className="mx-2">&gt;</span>
            <span className="font-medium text-gray-700">
              Open Audit List
            </span>
          </nav>
        </div>
      </header>
      {
              pop && <AuditAuditors auditors={users.users} onClose={() => {
                   fetchData();
                setPop(false)
              }} id={users._id}/>
      }

      {/* Items Comparison Modal */}
      {comparison && (
        <ItemsCompare
          audit={items}
          onClose={() => {
            setComparison(false);
            fetchData();
          }}
          sidebarOpen={isSidebarOpen}
        />
      )}

      {/* Table / Card Section */}
      <div className="bg-white border-t-4 rounded-lg shadow-sm border-cyan-500">
        <div className="p-4">
          {/* Desktop Table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full border border-gray-200 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">
                    Audit ID
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">
                    Total Items
                  </th>
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {audits.map((audit) => (
                  <tr
                    key={audit._id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 font-mono text-sm text-gray-800">
                      {audit._id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {audit.warehouseId?.warehouseName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {audit.items?.length || 0} items
                    </td>
                    <td className="px-6 py-4 text-sm">
                     <div className="flex space-x-3">
  {/* The rest of the buttons */}
  <button
    className="px-3 py-1 text-sm text-white transition bg-indigo-500 rounded-md hover:bg-indigo-600"
    onClick={() => {
      setItems(audit);
      setComparison(true);
    }}
  >
    View Items
  </button>
  <button
    className="px-3 py-1 text-sm text-white transition bg-green-500 rounded-md hover:bg-green-600"
    onClick={() => handleAuditEnd(audit._id)}
  >
    End Audit
  </button>
  <button
    className="px-3 py-1 text-sm text-white transition bg-red-500 rounded-md hover:bg-red-600"
    onClick={() => handleDeleteAudit(audit._id)}
  >
    Delete Audit
  </button>

  {/* New View Users Button */}
  <button
    className="px-3 py-1 text-sm text-white transition bg-gray-500 rounded-md hover:bg-gray-600"
    onClick={() => {
     
      setUsers(audit)
                        setPop(true);
    }}
  >
    View Users
  </button>
</div>
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
                <div className="mb-2 text-xs font-medium text-gray-500">
                  Audit ID
                </div>
                <div className="mb-3 font-mono text-sm font-semibold text-gray-800 break-all">
                  {audit._id}
                </div>
                <div className="mb-2 text-xs font-medium text-gray-500">
                  Warehouse
                </div>
                <div className="mb-3 font-mono text-sm font-semibold text-gray-800 break-all">
                  {audit.warehouseId?.warehouseName}
                </div>
                <div className="mb-4 text-sm text-gray-600">
                  Total Items:{" "}
                  <span className="font-medium">
                    {audit.items?.length || 0}
                  </span>
                </div>
               <div className="flex space-x-3">
  {/* The rest of the buttons */}
  <button
    className="px-3 py-1 text-sm text-white transition bg-indigo-500 rounded-md hover:bg-indigo-600"
    onClick={() => {
      setItems(audit);
      setComparison(true);
    }}
  >
    View Audit
  </button>
  <button
    className="px-3 py-1 text-sm text-white transition bg-green-500 rounded-md hover:bg-green-600"
    onClick={() => handleAuditEnd(audit._id)}
  >
    End Audit
  </button>
  <button
    className="px-3 py-1 text-sm text-white transition bg-red-500 rounded-md hover:bg-red-600"
    onClick={() => handleDeleteAudit(audit._id)}
  >
    Delete Audit
  </button>

  {/* New View Users Button */}
  <button
    className="px-3 py-1 text-sm text-white transition bg-gray-500 rounded-md hover:bg-gray-600"
    onClick={() => {
     setUsers(audit)
                        setPop(true);
    }}
  >
    View Users
  </button>
</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  
)
}

export default OpenAuditList
