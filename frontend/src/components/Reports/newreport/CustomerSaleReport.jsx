import React, { useState, useEffect } from "react";
import Sidebar from "../../Sidebar";
import Navbar from "../../Navbar";
import { NavLink } from "react-router-dom";
import { FaTachometerAlt, FaBars } from "react-icons/fa";
import Select from "react-select";
import axios from "axios";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { Modal } from "antd";
import LoadingScreen from "../../../Loading";
export default function StockReport() {
  const link = "https://pos.inspiredgrow.in/vps";
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filteredItems, setFilteredItems] = useState([]);
  const navigate = useNavigate();

  // Dropdown options
  const [options, setOptions] = useState({
    // warehouses: [],
    customers: [],
  });

  // Selected filters
  // const [selectedWarehouses, setSelectedWarehouses] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data
  const [allItems, setAllItems] = useState([]);
// Calculate month-wise purchase amount for a customer
const computeMonthTotals = (cust, monthKeys) => {
  const totals = {};
  monthKeys.forEach(m => (totals[m] = 0));

  cust.items.forEach(item => {
    const price = item.price || 0;

    monthKeys.forEach(month => {
      const qty = item.months[month] || 0;
      totals[month] += qty * price;
    });
  });

  return totals;
};

// Modal state
const [selected, setSelected] = useState(null);

// Open modal with item list
const handleMonthClick = (cust, month) => {
  const items = cust.items
    .filter(i => (i.months[month] || 0) > 0)
    .map(i => ({
      name: i.itemName,
      qty: i.months[month],
      price: i.price || 0,
      amount: i.months[month] * (i.price || 0),
    }));

  setSelected({ customer: cust, month, items });
};

  // Fetch dropdown data
  useEffect(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
    fetchFilters();
  }, []);

  const fetchFilters = async () => {
    try {
      const token = localStorage.getItem("token");
      // const [wareRes, cusRes] = await Promise.all([
      const [ cusRes] = await Promise.all([
        // axios.get(`${link}/api/warehouses?scope=mine`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${link}/api/customer-data/all`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setOptions({
        // warehouses: wareRes.data.data.map(w => ({ label: w.warehouseName, value: w._id })),
        customers: cusRes.data.map(c => ({ label: c.customerName, value: c._id })),
      });
    } catch (err) {
      console.error(err.message);
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);

      const params = {
        search: search.toLowerCase() || null,
       month:startDate
      };

      // if (selectedWarehouses.length > 0) {
        // params.warehouseId = selectedWarehouses.map(i => i.value);
      // }

      if (selectedCustomers.length > 0) {
        params.customerId = selectedCustomers.map(i => i.value);
      }

      const response = await axios.get(`${link}/api/reports/customer-sales-report`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        params
      });
       console.log(response)
      setAllItems(response.data);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

 const [monthKeys,setM]=useState([])
  useEffect(()=>{
    const monthKeys = allItems.length > 0 
  ? Object.keys(allItems[0].items[0].months)
  : [];
      setM(monthKeys)
  },[allItems])

  // Export Excel
 // Export customer-month table to Excel
const exportToExcel = () => {
  if (!allItems?.length || !monthKeys?.length) return;

  const rows = allItems.map((cust, idx) => {
    const monthTotals = computeMonthTotals(cust, monthKeys);
    const row = {
      "#": idx + 1,
      "Customer": cust.customerName,
      "Phone": cust.phone,
      "Email": cust.email,
      "Card No": cust.cardNo || "NO CARD",
    };

    // add each month column
    let grand = 0;
    monthKeys.forEach(m => {
      const amt = +(monthTotals[m] || 0);
      row[m] = amt;
      grand += amt;
    });

    row["Grand Total"] = grand;
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Premium Customer Monthly Report");
  // optionally auto-width columns
  const cols = Object.keys(rows[0] || {}).map(k => ({ wch: Math.min(Math.max(10, String(k).length + 8), 40) }));
  worksheet["!cols"] = cols;
  XLSX.writeFile(workbook, "Premium_Customer_Monthly_Report.xlsx");
};

// Export customer-month table to PDF
const exportToPDF = () => {
  if (!allItems?.length || !monthKeys?.length) return;

  const doc = new jsPDF({ orientation: "landscape" });

  const head = [
    ["#", "Customer","Phone","Email", "Card No", ...monthKeys, "Grand Total"]
  ];

  const body = allItems.map((cust, idx) => {
    const monthTotals = computeMonthTotals(cust, monthKeys);
    let grand = 0;
    const row = [
      idx + 1,
      cust.customerName,
      cust.phone,
      cust.email,
      cust.cardNo || "NO CARD"
    ];
    monthKeys.forEach(m => {
      const amt = +(monthTotals[m] || 0);
      row.push(`₹${amt}`);
      grand += amt;
    });
    row.push(`₹${grand}`);
    return row;
  });

  doc.text("Premium Customer Monthly Purchase Report", 14, 14);
  autoTable(doc, {
    head,
    body,
    startY: 18,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [6, 182, 212] }, // cyan-ish
    theme: "grid",
    columnStyles: { 0: { cellWidth: 8 } } // small first column
  });

  doc.save("Premium_Customer_Monthly_Report.pdf");
};



// Export modal items to Excel (selected must be set by your modal)
const exportModalToExcel = () => {
  if (!selected?.items?.length) return;

  const rows = selected.items.map((it, i) => ({
    "#": i + 1,
    "Item": it.name,
    "Qty": it.qty,
    "Price": it.price,
    "Amount": it.amount
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${selected.customer.customerName}_${selected.month}`);
  XLSX.writeFile(workbook, `${selected.customer.customerName}_${selected.month}.xlsx`);
};

// Export modal items to PDF
const exportModalToPDF = () => {
  if (!selected?.items?.length) return;

  const doc = new jsPDF({ orientation: "portrait" });
  doc.text(`Items bought by ${selected.customer.customerName} in ${selected.month}`, 14, 14);

  const body = selected.items.map((it, i) => [
    i + 1,
    it.name,
    it.qty,
    `₹${it.price}`,
    `₹${it.amount}`
  ]);

  autoTable(doc, {
    head: [["#", "Item", "Qty", "Price", "Amount"]],
    body,
    startY: 20,
    styles: { fontSize: 10 },
    headStyles: { fillColor: [6, 182, 212] }
  });

  // add grand total
  const total = selected.items.reduce((s, it) => s + (it.amount || 0), 0);
  doc.setFontSize(11);
  doc.text(`Grand Total: ₹${total}`, 14, doc.lastAutoTable.finalY + 10 || 40);

  doc.save(`${selected.customer.customerName}_${selected.month}.pdf`);
};



  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex">
        <div className="w-auto">

        <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
 {loading && <LoadingScreen />}
        <div className="flex flex-col w-full max-h-screen min-h-screen p-6 overflow-y-auto">
          <header className="flex flex-col items-start mb-4 sm:flex-row sm:items-center">
            <h1 className="text-2xl font-semibold text-gray-800">Premium Member Sales Report</h1>
          </header>

          {/* Filters */}
          <div className="p-5 mb-6 bg-white border-t-4 rounded-lg shadow-sm border-cyan-600">
            <h2 className="mb-4 text-lg font-semibold text-gray-700">Filter Options</h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
             
              <div>
                <label className="text-sm font-medium text-gray-600 h-">Customers</label>
                <Select
                  options={options.customers}
                  value={selectedCustomers}
                  onChange={setSelectedCustomers}
                  isMulti
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Item Name/Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded"
                  onChange={(e) => setSearch(e.target.value)}
                  value={search}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Months</label>
                <input type="text" onChange={(e) => setStartDate(e.target.value)} value={startDate}
                  className="w-full px-3 py-2 border rounded" />
              </div>

              
            </div>

            <div className="flex justify-end mt-6">
              <button onClick={fetchItems} className="px-6 py-2 text-white rounded bg-cyan-600">
                Search
              </button>
            </div>
          </div>

          {/* Table */}
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
            <div className="overflow-x-auto ">
  <table className="w-full text-sm border">
    <thead className="text-white bg-cyan-600">
      <tr>
        <th className="p-2">#</th>
        <th className="p-2">Customer</th>
        <th className="p-2">Phone</th>
        <th className="p-2">Email</th>
        <th className="p-2">Card No</th>

        {monthKeys.map(m => (
          <th key={m} className="p-2 text-center">{m}</th>
        ))}
      </tr>
    </thead>

    <tbody>
      {allItems.map((cust, index) => {
        const monthTotals = computeMonthTotals(cust, monthKeys);

        return (
          <tr key={cust.customerId} className="border-b hover:bg-gray-50">
            <td className="p-2 text-center">{index + 1}</td>
            <td className="p-2 text-center">{cust.customerName}</td>
            <td className="p-2 text-center">{cust.phone || "-"}</td>
            <td className="p-2 text-center">{cust.email || "-"}</td>
            <td className="p-2 text-center">{cust.cardNo || "NO CARD"}</td>

            {monthKeys.map(month => (
              <td
                key={month}
                className="p-2 text-center text-blue-600 cursor-pointer hover:underline"
                onClick={() => handleMonthClick(cust, month)}
              >
                ₹{monthTotals[month]}
              </td>
            ))}
          </tr>
        );
      })}
    </tbody>
  </table>
</div>

<Modal
  open={!!selected}
  onCancel={() => setSelected(null)}
  footer={null}
  title={
    selected
      ? `Items bought by ${selected.customer.customerName} in ${selected.month}`
      : ""
  }
  bodyStyle={{
    maxHeight: "70vh",
    overflowY: "auto",
    padding: "16px",
    background: "#f9fafb",
  }}
>
  {/* Export Buttons */}
  <div className="flex justify-end gap-3 mb-4">
    <button
      onClick={exportModalToExcel}
      className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
    >
      Export Excel
    </button>

    <button
      onClick={exportModalToPDF}
      className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
    >
      Export PDF
    </button>
  </div>

  <div className="space-y-3">
    {selected?.items?.map((i, idx) => (
      <div
        key={idx}
        className="p-3 transition bg-white border border-gray-200 rounded shadow-sm hover:shadow-md"
      >
        <div className="flex justify-between">
          <div>
            <div className="text-sm font-semibold text-gray-800">
              {i.name}
            </div>
            <div className="text-xs text-gray-500">
              Quantity: <span className="font-medium">{i.qty}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">
              ₹{i.price} × {i.qty}
            </div>
            <div className="text-base font-bold text-gray-900">
              ₹{i.amount}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
</Modal>



          </div>
        </div>
      </div>
    </div>
  );
}
