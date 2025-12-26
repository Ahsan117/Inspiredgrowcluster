
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";
import { FaFileExport, FaChevronDown, FaSearch } from "react-icons/fa";
import axios from "axios";
import Select from "react-select";
import { jsPDF } from "jspdf";
import { utils as XLSXUtils, writeFile as writeXLSXFile } from "xlsx";
import autoTable from "jspdf-autotable";
import AssignRider from "./AssignRider"
import AssignVan from "./AssignVan"
import ItemListPage from "./ItemListPage"
import ChangeStatusModal from "./ChangeStatusModal"
import CustomerProfile from "./CustomerView"
import PriceBreakdownPage from "./PriceView"
export default function OrderList() {
  // ✅ Hooks & State Initialization
const navigate = useNavigate();

const userRole = (localStorage.getItem("role") || "guest").toLowerCase();
  const isAdmin = userRole === "store admin" || userRole === "admin";


// Sidebar + Layout
const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);

// Core Data
const [orders, setOrders] = useState([]);
const [users, setUsers] = useState([]); // if needed separately for admin users

// UI & Loading
const [loading, setLoading] = useState(false);
const [exportMenu, setExportMenu] = useState(false);
const [actionMenu, setActionMenu] = useState(null);

// Search & Filters
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState("Pending");
const [orderStatus, setOrderStatus] = useState("all");

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(10);

// Permissions
const [permissions, setPermissions] = useState([]);

// Data & Details Views
const [data, setData] = useState([]);
const [pricedata, setPriceData] = useState([]);
const [items, setItems] = useState([]);
const [warehouses, setWarehouses] = useState([]);
const [stores, setStores] = useState([]);

// Modals & Views
const [view, setView] = useState(false);
const [viewPrice, setViewPrice] = useState(false);
const [assignRiderView, setAssignRiderView] = useState(false);
const [assignVanView, setAssignVanView] = useState(false);
const [ItemListView, setItemListView] = useState(false);
const [changeStatus, setChangeStatus] = useState(false);

// Contextual Data for Modals
const [orderId, setOrderId] = useState(null);
const [nowStatus, setNowStatus] = useState("");
const [heading, setHeading] = useState("");

// Status Options
const statusOptions = [
  { value: "all", label: "All" },
  { value: "Pending", label: "Pending" },
  { value: "Processing", label: "Processing" },
  { value: "Shipped", label: "Shipped" },
  { value: "Rider Assigned", label: "Rider Assigned" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];


  useEffect(() => {
    if (window.innerWidth >= 768) setSidebarOpen(true);
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get("https://pos.inspiredgrow.in/vps/api/orders/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(res.data)
      setOrders(res.data.data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.customer?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =  o.status === statusFilter ;
    const riderAssigned= o.assignRider || o.assignVan;
    return matchesSearch;
  });




    const deleteUser = async (id) => {
    if (!window.confirm("Delete this order?")) return;
    setLoading(true);
    try {
      await axios.delete(`https://pos.inspiredgrow.in/vps/api/orders/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // === EXPORT FUNCTIONS ===
  const exportToExcel = () => {
    const excelData = filteredOrders.map((o, i) => ({
      "#": i + 1,
      "Order ID": o.orderNumber,
      "Customer": o.customer?.name || "N/A",
      "Items": o.items?.length || 0,
      "Total": o.totalAmount || 0,
      "Status": o.status,
    }));
    const worksheet = XLSXUtils.json_to_sheet(excelData);
    const workbook = XLSXUtils.book_new();
    XLSXUtils.book_append_sheet(workbook, worksheet, "Orders");
    writeXLSXFile(workbook, "Orders(Rider Assigned).xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.text("Orders Report(Rider Assigned)", 14, 15);
    autoTable(doc, {
      head: [["#", "Order ID", "Customer", "Items", "Total", "Status"]],
      body: filteredOrders.map((o, i) => [
        i + 1,
        o.orderNumber,
        o.customer?.name,
        o.items?.length,
        o.totalAmount,
        o.status,
      ]),
      startY: 20,
    });
    doc.save("Orders.pdf");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-grow">
        <div>
          
        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
        { view && <CustomerProfile customerData={data} visible={view} onClose={()=>setView(false)}/> } 
          { viewPrice && <PriceBreakdownPage visible={viewPrice} onClose={()=>setViewPrice(false)} order={pricedata}/> } 
            { assignRiderView && <AssignRider orderId={orderId} onClose={()=>{setAssignRiderView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}} setSidebarOpen={setSidebarOpen} fetchusers={fetchOrders}/> }
               { assignVanView && <AssignVan orderId={orderId} onClose={()=>{setAssignVanView(false);setOrderId("");if(window.innerWidth>768)setSidebarOpen(true)}} setSidebarOpen={setSidebarOpen} fetchusers={fetchOrders}/> }
        { ItemListView && <ItemListPage items={items} heading={heading} onClose={()=>setItemListView(false)}/> }
           { changeStatus && <ChangeStatusModal orderId={orderId} currentStatus={nowStatus} onClose={()=>{setChangeStatus(false);setOrderId(null);setNowStatus("")}} fetchOrders={fetchOrders}/> }
        <main className="flex flex-col flex-grow p-4 overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-start justify-between mb-4 md:flex-row md:items-center">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 md:text-2xl">Orders(Rider Assigned)</h1>
              <p className="text-sm text-gray-500">Manage and monitor your orders</p>
            </div>

            <div className="relative mt-2 md:mt-0">
              <button
                onClick={() => setExportMenu(!exportMenu)}
                className="flex items-center px-4 py-2 text-white rounded-md bg-cyan-600 hover:bg-cyan-700"
              >
                <FaFileExport className="mr-2" /> Export
                <FaChevronDown className="ml-1 text-sm" />
              </button>
              {exportMenu && (
                <div className="absolute right-0 z-20 mt-2 bg-white rounded-md shadow-lg w-36">
                  <button
                    onClick={() => {
                      exportToExcel();
                      setExportMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      exportToPDF();
                      setExportMenu(false);
                    }}
                    className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 mb-5 bg-white border border-gray-100 shadow-sm rounded-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              
              <div className="w-full sm:w-1/3">
                <Select
                  options={statusOptions}
                  value={statusOptions.find((o) => o.value === statusFilter)}
                  onChange={(opt) => setStatusFilter(opt.value)}
                />
              </div>
            </div>
          </div> 

          {/* Orders Grid */}
          {loading ? (
            <div className="flex justify-center mt-10 text-gray-500">Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-6 text-center text-gray-500 bg-white shadow-sm rounded-xl">
              No orders found
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOrders.map((order) => (
                <div
                  key={order._id}
                  className="relative p-4 transition-all bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-base font-semibold text-gray-800">
                      #{order.orderNumber}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${
                        order.status === "Delivered"
                          ? "bg-green-100 text-green-800"
                          : order.status === "Pending"
                          ? "bg-orange-100 text-orange-800"
                          : order.status === "Cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                  <h2>{`${order.scheduledDeliveryDate || ""}  ${order.scheduledDeliveryTime || ""}`}</h2>

                  <div className="mt-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Customer:</span>{" "}
                      {order.customer?.name || "N/A"}
                    </p>
                    <p>
                      <span className="font-medium">Items:</span> {order.items?.length || 0}
                    </p>
                    <p>
                      <span className="font-medium">Total:</span> ₹
                      {order.totalAmount?.toFixed(2) || "0.00"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between mt-4">
                    <button
                      onClick={() => {
                        setViewPrice(true);
                           setPriceData(order)
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-white rounded-lg bg-cyan-600 hover:bg-cyan-700"
                    >
                      View Details
                    </button>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setActionMenu((prev) => (prev === order._id ? null : order._id))
                        }
                        className="px-3 py-1.5 text-xs font-medium text-cyan-600 border border-cyan-600 rounded-lg hover:bg-cyan-50 flex items-center"
                      >
                        Actions <FaChevronDown className="ml-1 text-xs" />
                      </button>

                      {actionMenu === order._id && (
                        <div className="absolute right-0 z-20 w-40 mt-2 bg-white border rounded-lg shadow-md animate-fadeIn">
                          {/* <button
                            onClick={() => {
                              setOrderId(order._id);
                              setAssignVanView(true);
                              setActionMenu(null);
                             
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                          >
                            🚚 Assign Van
                          </button> */}
                          {isAdmin && (
                            <button
                            onClick={() => {
                              setOrderId(order._id);
                                              setAssignRiderView(true);
                              setActionMenu(null);
                              
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                          >
                            🛵 Assign Rider
                          </button>
                          )}
                          
                          <button
                            onClick={() => {
                              setNowStatus(order.status);
    setOrderId(order._id);
     setChangeStatus(true);
                              setActionMenu(null);
                             
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-blue-50"
                          >
                            🔄 Change Status
                          </button>
                          
                          {isAdmin && (
                             <button
                             onClick={() => {
                               deleteUser(order._id);
                               setActionMenu(null);
                               
                             }}
                             className="w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
                           >
                             ❌ Delete
                           </button>
                          )}
                         
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
