import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { FaBars, FaTimes } from "react-icons/fa"; // FaTimes for close button
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import LoadingScreen from "../../../Loading";

export default function CustomerReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerSales, setSelectedCustomerSales] = useState([]);
  const [currentCustomerName, setCurrentCustomerName] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  const [options, setOptions] = useState({ warehouses: [], customers: [] });
  const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);

  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      const [wareRes, cusRes] = await Promise.all([
        axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/api/customer-data/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setOptions({
        warehouses: wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
        customers: cusRes.data.map(c => ({ label: c.customerName, value: c._id })),
      });
    } catch (err) { console.error(err.message); }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedWarehouses.length > 0) params.warehouse = selectedWarehouses.map(i => i.value);
      if (selectedCustomers.length > 0) params.customer = selectedCustomers.map(i => i.value);

      const response = await axios.get(`${link}/api/reports/customer-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
      setAllItems(response.data.data);
    } catch (err) { console.error(err.message); } finally { setLoading(false); }
  };

  // --- Modal Logic: Fetch Specific Customer Sales ---
  const handleCustomerClick = async (customer) => {
    setCurrentCustomerName(customer.customerName);
    setIsModalOpen(true);
    setModalLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Note: Make sure this endpoint exists or adjust to your sale history API
      const res = await axios.get(`${link}/api/reports/customer-sale-history?customerId=${customer.customerId || customer._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCustomerSales(res.data.orders || []);
    } catch (err) {
      console.error("Error fetching sales:", err);
    } finally {
      setModalLoading(false);
    }
  };

  
  // Export Excel

  const exportToExcel = () => {

    const data = allItems.map((item, index) => ({

      "#": index + 1,

      "Customer Name": item.customerName,

      "Mobile": item.mobile,

      "Total Sale": item.totalSale,

      "Total Orders": item.totalOrders,

     

    }));



    const worksheet = XLSX.utils.json_to_sheet(data);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Customer Report");

    XLSX.writeFile(workbook, "Customer_Report.xlsx");

  };



  // Export PDF

  const exportToPDF = () => {

    const doc = new jsPDF({ orientation: "landscape" });

    doc.text("Customer Report", 14, 15);



    autoTable(doc, {

      head: [["#", "Cusotmer", "Mobile", "Total Sale", "Total Orders"]],

      body: allItems.map((item, i) => [

        i + 1,

        item.customerName,

        item.mobile,

        item.totalSale,

        item.totalOrders,

      ]),

      startY: 20

    });



    doc.save("Customer_Report.pdf");

  };
  // --- Export Logic for Modal ---
  const exportModalExcel = () => {
    const data = selectedCustomerSales.map((sale, i) => ({
      "#": i + 1,
      "Date": new Date(sale.createdAt).toLocaleDateString(),
      "Invoice No": sale.saleCode,
      "Amount": sale.totalAmount,
      "Warehouse": sale.warehouse.warehouseName,
      "PaymentType": sale.warehouse[0].paymentType.paymentTypeName,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `${currentCustomerName}_Sales.xlsx`);
  };

  const exportModalPDF = () => {
    const doc = new jsPDF();
    doc.text(`Sales Report: ${currentCustomerName}`, 14, 15);
    autoTable(doc, {
      head: [["#", "Date", "Invoice No", "Amount", "Warehouse", "PaymentType"]],
      body: selectedCustomerSales.map((s, i) => [i + 1, s.createdAt, s.saleCode, s.totalAmount, s.warehouse.warehouseName, s.payments[0].paymentType.paymentTypeName]),
      startY: 20
    });
    doc.save(`${currentCustomerName}_Sales.pdf`);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex w-full">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        {loading && <LoadingScreen />}
        
        <div className="flex flex-col w-full p-6 overflow-y-auto">
          <header className="mb-4"><h1 className="text-2xl font-semibold">Customer Report</h1></header>

          {/* Filter Section (Same as your code) */}
          <div className="p-5 mb-6 bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
             <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                <div>
                    <label className="text-sm font-medium">Warehouse</label>
                    <Select options={options.warehouses} value={selectedWarehouses} onChange={setSelectedWarehouses} isMulti />
                </div>
                <div>
                    <label className="text-sm font-medium">Customers</label>
                    <Select options={options.customers} value={selectedCustomers} onChange={setSelectedCustomers} isMulti />
                </div>
             </div>
             <div className="flex justify-end mt-4">
                <button onClick={fetchItems} className="px-6 py-2 text-white rounded bg-cyan-600">Search</button>
             </div>
          </div>

          {/* Main Table */}
          

          <div className="p-5 bg-white border rounded shadow">
            <div className="flex justify-between mb-3">
              <h4 className="text-lg font-semibold text-gray-700">Records</h4>

              <div className="relative">
                <button onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="px-4 py-2 text-white bg-blue-500 rounded">
                  <FaBars className="inline mr-2" /> Export ▼
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 w-40 bg-white rounded shadow">
                    <button className="block w-full px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => { exportToExcel(); setShowExportDropdown(false); }}>
                      Excel
                    </button>
                    <button className="block w-full px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => { exportToPDF(); setShowExportDropdown(false); }}>
                      PDF
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 bg-white border rounded shadow">
            <table className="w-full text-sm border">
              <thead className="text-white bg-cyan-600">
                <tr>
                  <th className="p-2">#</th>
                  <th className="p-2">Customer Name</th>
                  <th className="p-2">Mobile</th>
                  <th className="p-2">Total Orders</th>
                  <th className="p-2">Total Sale</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map((item, i) => (
                  <tr key={i} className="border-b cursor-pointer hover:bg-blue-50" onClick={() => handleCustomerClick(item)}>
                    <td className="p-2 text-center">{i + 1}</td>
                    <td className="p-2 font-medium text-center text-blue-600 underline">{item.customerName}</td>
                    <td className="p-2 text-center">{item.mobile}</td>
                    <td className="p-2 text-center">{item.totalOrders}</td>
                    <td className="p-2 text-center">{item.totalSale}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          </div>
        </div>
      </div>

      {/* --- SALE LIST MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Sales for {currentCustomerName}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500">
                <FaTimes size={20} />
              </button>
            </div>

            <div className="flex gap-2 p-4">
              <button onClick={exportModalExcel} className="px-3 py-1 text-sm text-white bg-green-600 rounded">Export Excel</button>
              <button onClick={exportModalPDF} className="px-3 py-1 text-sm text-white bg-red-600 rounded">Export PDF</button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              {modalLoading ? (
                <p className="text-center">Loading sales...</p>
              ) : (
                <table className="w-full text-sm text-left border">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-2 border">Date</th>
                      <th className="p-2 border">Invoice No</th>
                      <th className="p-2 border">Amount</th>
                      <th className="p-2 border">Warehouse</th>
                      <th className="p-2 border">PaymentType</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCustomerSales.length > 0 ? (
                        selectedCustomerSales.map((sale, idx) => (
                        <tr key={idx} className="border-b">
                            <td className="p-2">{new Date(sale.createdAt).toLocaleDateString()}</td>
                            <td className="p-2">{sale.saleCode}</td>
                            <td className="p-2">{sale.totalAmount}</td>
                            <td className="p-2">{sale.warehouse.warehouseName}</td>
                            <td className="p-2">{sale.payments[0].paymentType.paymentTypeName}</td>
                        </tr>
                        ))
                    ) : (
                        <tr><td colSpan="4" className="p-4 text-center">No sales found.</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}