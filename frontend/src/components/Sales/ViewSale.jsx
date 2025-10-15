import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Navbar from "../Navbar.jsx";
import Sidebar from "../Sidebar.jsx";
import LoadingScreen from "../../Loading";

// Helper function to format address object into a string
const formatAddress = (address) => {
  if (!address || typeof address !== 'object') return "N/A";
  const parts = [
    address.street || "",
    address.city || "",
    address.state || "",
    address.zip || "",
    address.country || ""
  ].filter(part => part.trim() !== "");
  return parts.length > 0 ? parts.join(", ") : "N/A";
};

const ViewSale = () => {
      const link="https://pos.inspiredgrow.in/vps"
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const id = queryParams.get('id');
  const source = queryParams.get('source');

  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [invoiceData, setInvoiceData] = useState({
    warehouse: {},
    customer: {},
    items: [],
    payments: [],
    saleDate: '',
    saleCode: '',
    amount: 0,
    status: '',
    subtotal: 0,
    tax: 0,
    discount: 0,
    paymentStatus: '',
    notes: '',
    creatorName: '',
    shippingCost: 0,
  });
  const [downloadMessage, setDownloadMessage] = useState('');

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    script.onload = () => console.log('jsPDF loaded successfully');
    script.onerror = () => console.error('Failed to load jsPDF');
    document.body.appendChild(script);

    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
    fetchItems();
    fetchInvoiceDetails();

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const fetchItems = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await axios.get(`${link}/api/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawItems = response.data.data || [];
      const flatItems = rawItems
        .filter((it) => it._id && it.warehouse?._id)
        .map((it) => {
          const isVariant = Boolean(it.parentItemId);
          return {
            ...it,
            parentId: isVariant ? it.parentItemId : it._id,
            variantId: isVariant ? it._id : null,
            itemName: isVariant ? `${it.itemName} / ${it.variantName || "Variant"}` : it.itemName,
            barcode: it.barcode || "",
            barcodes: it.barcodes || [],
            itemCode: it.itemCode || "",
          };
        });
      setAllItems(flatItems);
      console.log("Fetched allItems:", flatItems.map(i => ({ _id: i._id, parentId: i.parentId, variantId: i.variantId, itemName: i.itemName, warehouseId: i.warehouse?._id })));
    } catch (err) {
      console.error("Fetch items error:", err.message);
    }
  };

  const fetchInvoiceDetails = async () => {
    if (!id || !source) {
      alert("Invalid invoice ID or source");
      navigate('/sale-list');
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;
    setLoading(true);
    try {
      const endpoint = source === "POS" ? `${link}/api/pos/${id}` : `${link}/api/sales/${id}`;
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("API Response:", response.data);
      if (response.data) {
        const totalPaid = (response.data.payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const amount = response.data.amount || response.data.total || response.data.totalAmount || 0;
        let paymentStatus = response.data.paymentStatus || response.data.payment_state || "N/A";
        if (paymentStatus === "N/A") {
          if (totalPaid >= amount && amount > 0) {
            paymentStatus = "Paid";
          } else if (totalPaid > 0) {
            paymentStatus = "Partially Paid";
          } else {
            paymentStatus = "Unpaid";
          }
        }

        const detailedItems = (response.data.items || []).map((i) => {
          console.log("Processing item:", {
            item: i.item,
            variant: i.variant,
            itemName: i.itemName,
            warehouseId: response.data.warehouse?._id || response.data.warehouse
          });

          const itemDoc = allItems.find((ai) => {
            const itemId = i.item?._id || i.item;
            const warehouseId = response.data.warehouse?._id || response.data.warehouse;
            const isVariantItem = i.variant && i.variant !== itemId;
            if (isVariantItem) {
              return (
                ai.parentId === itemId &&
                (ai._id === i.variant || ai.variantId === i.variant) &&
                ai.warehouse?._id === warehouseId
              );
            }
            return (
              ai._id === itemId &&
              ai.warehouse?._id === warehouseId
            );
          });

          console.log("Matched itemDoc:", itemDoc ? {
            _id: itemDoc._id,
            parentId: itemDoc.parentId,
            variantId: itemDoc.variantId,
            itemName: itemDoc.itemName,
            warehouseId: itemDoc.warehouse?._id
          } : "Not found");

          const unitPrice = i.price || i.unitPrice || (itemDoc?.salesPrice) || 0;
          const quantity = i.quantity || 1;
          const discount = i.discount || 0;
          const taxRate = i.tax?.taxPercentage || (i.taxAmount ? (i.taxAmount * 100) / (unitPrice * quantity - discount) : 0) || (itemDoc?.tax?.taxPercentage) || 0;
          const priceBeforeTax = unitPrice * quantity;
          const taxAmount = i.taxAmount || ((priceBeforeTax - discount) * taxRate) / 100 || 0;
          const subtotal = i.subtotal || (priceBeforeTax - discount + taxAmount);

          return {
            item: i.item?._id || i.item,
            variant: i.variant || null,
            itemName: i.itemName || (i.item && typeof i.item === 'object' ? i.item.itemName || i.item.name || i.item.productName || i.item.title : null) || (itemDoc?.itemName) || "N/A",
            itemCode: i.itemCode || (itemDoc?.itemCode) || "",
            unitPrice: unitPrice,
            quantity: quantity,
            price: priceBeforeTax,
            taxRate: taxRate,
            taxAmount: taxAmount,
            discount: discount,
            discountAmount: discount,
            unitCost: (itemDoc?.costPrice) || unitPrice,
            unit: i.unit || (itemDoc?.unit) || null,
            total: subtotal,
          };
        });

        setInvoiceData({
          warehouse: response.data.warehouse || {},
          customer: response.data.customer || {},
          items: detailedItems,
          payments: response.data.payments || [],
          saleDate: response.data.createdAt && !isNaN(new Date(response.data.createdAt).getTime())
            ? new Date(response.data.createdAt).toLocaleDateString()
            : "N/A",
          saleCode: response.data.saleCode || '',
          amount: amount,
          status: response.data.status || (source === "POS" ? "Completed" : "N/A"),
          subtotal: response.data.subtotal || 0,
          tax: response.data.tax || response.data.taxAmount || 0,
          discount: response.data.discount || response.data.discountAmount || 0,
          paymentStatus: paymentStatus,
          notes: response.data.notes || response.data.comments || "",
          creatorName: response.data.creatorName || "N/A",
          shippingCost: response.data.shippingCost || 0,
        });
      } else {
        throw new Error("No data returned from API");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      alert(`Could not load invoice details: ${error.message}`);
      navigate('/sale-list');
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) {
      console.error('jsPDF is not loaded');
      setDownloadMessage('Failed to generate PDF: jsPDF library not loaded.');
      setTimeout(() => setDownloadMessage(''), 5000);
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 15;

    const wrapText = (text, x, maxWidth, lineHeight, fontSize = 8) => {
      doc.setFontSize(fontSize);
      const words = text.split(' ');
      let line = '';
      const lines = [];
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + ' ';
        const testWidth = doc.getTextWidth(testLine);
        if (testWidth > maxWidth && line !== '') {
          lines.push(line.trim());
          line = words[i] + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());
      lines.forEach((l, index) => {
        doc.text(l, x, y + (index * lineHeight));
      });
      return lines.length * lineHeight;
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const title = source === "POS" ? "POS Order Invoice" : "Sale Invoice";
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, (pageWidth - titleWidth) / 2, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const subtitle = "Invoice Details";
    const subtitleWidth = doc.getTextWidth(subtitle);
    doc.text(subtitle, (pageWidth - subtitleWidth) / 2, y);
    y += 10;

    doc.setFontSize(10);
    const details = [
      `Warehouse: ${invoiceData.warehouse.warehouseName || "N/A"}`,
      `Customer: ${invoiceData.customer.customerName || "N/A"}`,
      `Sale Date: ${invoiceData.saleDate || "N/A"}`,
      `Sale Code: ${invoiceData.saleCode || "N/A"}`,
      `Tax: Rs. ${(invoiceData.tax || 0).toFixed(2)}`,
      `Discount: Rs. ${(invoiceData.discount || 0).toFixed(2)}`,
      `Payment Status: ${invoiceData.paymentStatus || "N/A"}`,
      ...(source === "POS" ? [`Status: ${invoiceData.status || "N/A"}`] : []),
      `Created By: ${invoiceData.creatorName || "N/A"}`,
      `Shipping Address: ${formatAddress(invoiceData.customer.shippingAddress)}`,
      `Shipping Cost: Rs. ${(invoiceData.shippingCost || 0).toFixed(2)}`,
      `Notes: ${invoiceData.notes || "N/A"}`,
    ];

    details.forEach(detail => {
      const [label, value] = detail.split(': ');
      doc.setFont('helvetica', 'bold');
      doc.text(label + ':', 15, y);
      doc.setFont('helvetica', 'normal');
      const maxWidth = pageWidth - 60;
      const linesHeight = wrapText(value, 55, maxWidth, 5, 10);
      y += linesHeight + 3;
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
    });

    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Items", 15, y);
    y += 7;

    const itemHeaders = [
      "Item", "Unit Price", "Qty", "Price", "Tax (%)", "Tax Amt", "Disc", "Disc Amt", "Unit Cost", "Total"
    ];
    const colWidths = [40, 18, 10, 18, 16, 16, 14, 16, 16, 16];
    let x = 15;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    itemHeaders.forEach((header, index) => {
      wrapText(header, x, colWidths[index], 4, 7);
      x += colWidths[index];
    });
    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 3;

    doc.setFont('helvetica', 'normal');
    if (invoiceData.items.length === 0) {
      doc.text("No items available", 15, y);
      y += 6;
    } else {
      invoiceData.items.forEach(item => {
        x = 15;
        const row = [
          item.itemName,
          `Rs. ${item.unitPrice.toFixed(2)}`,
          item.quantity.toString(),
          `Rs. ${item.price.toFixed(2)}`,
          `${item.taxRate.toFixed(2)}%`,
          `Rs. ${item.taxAmount.toFixed(2)}`,
          `Rs. ${item.discount.toFixed(2)}`,
          `Rs. ${item.discountAmount.toFixed(2)}`,
          `Rs. ${item.unitCost.toFixed(2)}`,
          `Rs. ${item.total.toFixed(2)}`,
        ];
        let maxLinesHeight = 0;
        row.forEach((cell, index) => {
          const linesHeight = wrapText(cell, x, colWidths[index], 4, 7);
          maxLinesHeight = Math.max(maxLinesHeight, linesHeight);
          x += colWidths[index];
        });
        y += maxLinesHeight + 2;
        if (y > 270) {
          doc.addPage();
          y = 15;
          x = 15;
          doc.setFont('helvetica', 'bold');
          itemHeaders.forEach((header, index) => {
            wrapText(header, x, colWidths[index], 4, 7);
            x += colWidths[index];
          });
          y += 5;
          doc.line(15, y, pageWidth - 15, y);
          y += 3;
          doc.setFont('helvetica', 'normal');
        }
      });
    }
    doc.line(15, y, pageWidth - 15, y);
    y += 10;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text("Payments", 15, y);
    y += 7;

    const paymentHeaders = ["Payment Type", "Amount", "Date"];
    const paymentColWidths = [80, 30, 40];
    x = 15;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    paymentHeaders.forEach((header, index) => {
      wrapText(header, x, paymentColWidths[index], 4, 7);
      x += paymentColWidths[index];
    });
    y += 5;
    doc.line(15, y, pageWidth - 15, y);
    y += 3;

    doc.setFont('helvetica', 'normal');
    if (invoiceData.payments.length === 0) {
      doc.text("No payments available", 15, y);
      y += 6;
    } else {
      invoiceData.payments.forEach(payment => {
        x = 15;
        const paymentType = typeof payment.paymentType === 'string' ? 
          (payment.paymentType.match(/^[0-9a-fA-F]{24}$/) ? "Cash" : payment.paymentType) : 
          (payment.paymentType?.paymentTypeName || "Cash");
        const row = [
          paymentType,
          `Rs. ${payment.amount.toFixed(2)}`,
          payment.paymentDate && !isNaN(new Date(payment.paymentDate).getTime())
            ? new Date(payment.paymentDate).toLocaleDateString()
            : "N/A"
        ];
        let maxLinesHeight = 0;
        row.forEach((cell, index) => {
          const linesHeight = wrapText(cell, x, paymentColWidths[index], 4, 7);
          maxLinesHeight = Math.max(maxLinesHeight, linesHeight);
          x += paymentColWidths[index];
        });
        y += maxLinesHeight + 2;
        if (y > 270) {
          doc.addPage();
          y = 15;
          x = 15;
          doc.setFont('helvetica', 'bold');
          paymentHeaders.forEach((header, index) => {
            wrapText(header, x, paymentColWidths[index], 4, 7);
            x += paymentColWidths[index];
          });
          y += 5;
          doc.line(15, y, pageWidth - 15, y);
          y += 3;
          doc.setFont('helvetica', 'normal');
        }
      });
    }
    doc.line(15, y, pageWidth - 15, y);

    const pdfBlob = doc.output('blob');
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Invoice-${invoiceData.saleCode || 'unknown'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadMessage('PDF has been downloaded successfully.');
    setTimeout(() => setDownloadMessage(''), 5000);
  };

  const handleDownloadPDF = () => {
    generatePDF();
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col">
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="box-border flex min-h-screen">
        <div className="w-auto">
          <Sidebar isSidebarOpen={isSidebarOpen} />
        </div>
        <div className="flex flex-col w-full p-2 mx-auto overflow-x-auto md:p-2">
          <header className="flex flex-col items-center justify-between px-2 py-2 mb-2 bg-gray-100 rounded-md shadow md:flex-row">
            <div className="flex items-baseline gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">
                View {source === "POS" ? "POS Order" : "Sale"}
              </h1>
              <span className="text-xs text-gray-600 sm:text-sm">
                Invoice Details
              </span>
            </div>
          </header>
          <div className="p-4 mt-3 bg-white border-t-4 rounded-md shadow-md border-cyan-500">
            {downloadMessage && (
              <div className="p-2 mb-4 text-green-700 bg-green-100 rounded-md">
                {downloadMessage}
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block font-semibold text-gray-700">Warehouse</label>
                <input
                  type="text"
                  value={invoiceData.warehouse.warehouseName || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Customer</label>
                <input
                  type="text"
                  value={invoiceData.customer.customerName || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Sale Date</label>
                <input
                  type="text"
                  value={invoiceData.saleDate || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Sale Code</label>
                <input
                  type="text"
                  value={invoiceData.saleCode || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Tax</label>
                <input
                  type="text"
                  value={`₹${(invoiceData.tax || 0).toFixed(2)}`}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Discount</label>
                <input
                  type="text"
                  value={`₹${(invoiceData.discount || 0).toFixed(2)}`}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Payment Status</label>
                <input
                  type="text"
                  value={invoiceData.paymentStatus || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              {source === "POS" && (
                <div>
                  <label className="block font-semibold text-gray-700">Status</label>
                  <input
                    type="text"
                    value={invoiceData.status || "N/A"}
                    className="w-full p-2 border rounded-md"
                    disabled
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-gray-700">Created By</label>
                <input
                  type="text"
                  value={invoiceData.creatorName || "N/A"}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Shipping Address</label>
                <input
                  type="text"
                  value={formatAddress(invoiceData.customer.shippingAddress)}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div>
                <label className="block font-semibold text-gray-700">Shipping Cost</label>
                <input
                  type="text"
                  value={`₹${(invoiceData.shippingCost || 0).toFixed(2)}`}
                  className="w-full p-2 border rounded-md"
                  disabled
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-semibold text-gray-700">Notes</label>
                <textarea
                  value={invoiceData.notes || "N/A"}
                  className="w-full p-2 border rounded-md"
                  rows="3"
                  disabled
                />
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Items</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-300 shadow-sm">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Item</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Unit Price</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Quantity</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Price</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Tax (%)</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Tax Amount</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Discount</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Discount Amount</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Unit Cost</th>
                      <th className="px-4 py-2 text-sm font-medium text-left border">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.items.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="p-4 text-center text-gray-500 border">
                          No items available
                        </td>
                      </tr>
                    ) : (
                      invoiceData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1 border">{item.itemName}</td>
                          <td className="px-2 py-1 border">₹{(item.unitPrice || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">{item.quantity || 0}</td>
                          <td className="px-2 py-1 border">₹{(item.price || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">{(item.taxRate || 0).toFixed(2)}%</td>
                          <td className="px-2 py-1 border">₹{(item.taxAmount || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">₹{(item.discount || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">₹{(item.discountAmount || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">₹{(item.unitCost || 0).toFixed(2)}</td>
                          <td className="px-2 py-1 border">₹{(item.total || 0).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-lg font-semibold">Payments</h3>
              <table className="min-w-full bg-white border border-gray-300 shadow-sm">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-sm font-medium text-left border">Payment Type</th>
                    <th className="px-4 py-2 text-sm font-medium text-left border">Amount</th>
                    <th className="px-4 py-2 text-sm font-medium text-left border">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceData.payments.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="p-4 text-center text-gray-500 border">
                        No payments available
                      </td>
                    </tr>
                  ) : (
                    invoiceData.payments.map((payment, index) => (
                      <tr key={index}>
                        <td className="px-2 py-1 border">
  {payment.paymentType?.paymentTypeName
    || payment.paymentTypeName
    || payment.paymentType
    || "N/A"}
</td>

                        <td className="px-2 py-1 border">₹{(payment.amount || 0).toFixed(2)}</td>
                        <td className="px-2 py-1 border">
                          {payment.paymentDate && !isNaN(new Date(payment.paymentDate).getTime())
                            ? new Date(payment.paymentDate).toLocaleDateString()
                            : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex mt-4 space-x-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-white rounded-md bg-cyan-500 hover:bg-cyan-600"
              >
                Back to List
              </button>
              <button
                onClick={handleDownloadPDF}
                className="px-4 py-2 text-white bg-green-500 rounded-md hover:bg-green-600"
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewSale;