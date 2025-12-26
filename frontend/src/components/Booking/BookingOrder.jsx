import React, { useState, useEffect, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from "../Navbar";
import Sidebar from "../Sidebar";

const OrderForm = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [formData, setFormData] = useState({
    orderNumber: '',
    date: '',
    items: '',
    amount: '',
    status: '',
    location: '', // Will store "Remark" or "Address"
    customerName: '',
    customerNumber: ''
  });
  const [selectedItems, setSelectedItems] = useState([]); // Track selected item names
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Toggle items dropdown visibility
  const dropdownRef = useRef(null); // Ref to handle clicks outside items dropdown

  // Dummy grocery items with prices
  const groceryItems = [
    { id: 1, name: 'Apples', price: 2.5 },
    { id: 2, name: 'Bananas', price: 1.2 },
    { id: 3, name: 'Milk', price: 3.0 },
    { id: 4, name: 'Bread', price: 2.0 },
    { id: 5, name: 'Eggs', price: 4.5 }
  ];

  // Location options
  const locationOptions = ['Remark', 'Address'];

  // Function to generate a random order number
  const generateOrderNumber = () => {
    const prefix = 'ORD';
    const randomNum = Math.floor(100000 + Math.random() * 900000); // 6-digit random number
    return `${prefix}${randomNum}`; // e.g., ORD123456
  };

  // Set initial order number when component mounts
  useEffect(() => {
    setFormData((prevData) => ({
      ...prevData,
      orderNumber: generateOrderNumber(),
    }));
  }, []);

  // Update items count and amount whenever selectedItems changes
  useEffect(() => {
    const totalAmount = selectedItems.reduce((sum, itemName) => {
      const item = groceryItems.find((i) => i.name === itemName);
      return sum + (item ? item.price : 0);
    }, 0);

    setFormData((prevData) => ({
      ...prevData,
      items: selectedItems.length.toString(), // Auto-update items count
      amount: totalAmount.toFixed(2), // Auto-update amount with 2 decimal places
    }));
  }, [selectedItems]);

  // Close items dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle checkbox change in items dropdown
  const handleCheckboxChange = (itemName) => {
    setSelectedItems((prev) =>
      prev.includes(itemName)
        ? prev.filter((item) => item !== itemName)
        : [...prev, itemName]
    );
  };

  // Function to regenerate order number on button click
  const handleGenerateOrderNumber = () => {
    setFormData((prevData) => ({
      ...prevData,
      orderNumber: generateOrderNumber(),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      items: Number(formData.items), // Number of selected items
      amount: Number(formData.amount), // Total amount as a number
      selectedItems // Include selected items in payload
    };

    try {
      const response = await fetch('https://pos.inspiredgrow.in/vps/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        toast.success('Order created successfully!');
        setFormData({
          orderNumber: generateOrderNumber(),
          date: '',
          items: '',
          amount: '',
          status: '',
          location: '',
          customerName: '',
          customerNumber: ''
        });
        setSelectedItems([]); // Reset selected items
      } else {
        toast.error('Failed to create order. Please try again.');
      }
    } catch (error) {
      toast.error('Server error. Try again later.');
      console.error('Error:', error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Navbar */}
      <Navbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Layout with Sidebar and Content */}
      <div className="flex flex-1 pt-16">
        {/* Sidebar */}
        <Sidebar isSidebarOpen={isSidebarOpen} />

        {/* Main Content */}
        <div
          className={`flex-1 flex justify-center items-center py-4 sm:py-8 transition-all duration-300 ${
            isSidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md p-4 bg-gray-800 rounded-lg shadow-lg sm:max-w-lg sm:p-6"
          >
            <h2 className="mb-6 text-2xl font-bold text-center text-white sm:text-3xl">
              Create Order
            </h2>

            <div className="mb-4">
              <label className="block mb-1 text-sm font-semibold text-gray-200 sm:text-base">Order Number</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={handleChange}
                  placeholder="e.g., ORD123456"
                  className="w-full px-3 py-2 mt-1 text-sm text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base"
                  readOnly
                />
                <button
                  type="button"
                  onClick={handleGenerateOrderNumber}
                  className="px-2 py-0 text-sm text-white bg-blue-500 rounded hover:bg-blue-600 sm:text-base"
                >
                  Generate
                </button>
              </div>
            </div>

            <div className="mb-4" ref={dropdownRef}>
              <label className="block mb-1 text-sm font-semibold text-gray-200 sm:text-base">Select Items</label>
              <div className="relative">
                <input
                  type="text"
                  value={selectedItems.join(', ') || 'Select items...'}
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  readOnly
                  className="w-full px-3 py-2 mt-1 text-sm text-white bg-gray-700 border border-gray-600 rounded cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base"
                />
                {isDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 overflow-y-auto bg-gray-700 border border-gray-600 rounded max-h-40">
                    {groceryItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-center justify-between px-3 py-2 text-sm text-gray-200 hover:bg-gray-600 sm:text-base"
                      >
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedItems.includes(item.name)}
                            onChange={() => handleCheckboxChange(item.name)}
                            className="mr-2"
                          />
                          {item.name}
                        </div>
                        <span>${item.price.toFixed(2)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {[
              ['Items', 'items', 'number', 'Number of Items', true], // readOnly
              ['Amount', 'amount', 'number', 'Total Amount', true], // readOnly
              ['Date', 'date', 'date', 'MM/DD/YYYY'],
              ['Status', 'status', 'text', 'Accepted, Delay, etc.'],
              ['Location', 'location', 'select', 'Select Location'], // Changed to select
              ['Customer Name', 'customerName', 'text', 'Customer Name'],
              ['Customer Number', 'customerNumber', 'text', '+9145643533']
            ].map(([label, name, type, placeholder, readOnly], idx) => (
              <div key={idx} className="mb-4">
                <label className="block mb-1 text-sm font-semibold text-gray-200 sm:text-base">{label}</label>
                {type === 'select' ? (
                  <select
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    className="w-full px-3 py-2 mt-1 text-sm text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base"
                  >
                    <option value="">{placeholder}</option>
                    {locationOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={type}
                    name={name}
                    value={formData[name]}
                    onChange={handleChange}
                    placeholder={placeholder}
                    readOnly={readOnly}
                    className="w-full px-3 py-2 mt-1 text-sm text-white bg-gray-700 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-base"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              className="w-full py-2 text-sm text-white transition duration-200 bg-blue-600 rounded hover:bg-blue-700 sm:text-base"
            >
              Create Order
            </button>
          </form>

          {/* Toast Notification Container */}
          <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        </div>
      </div>
    </div>
  );
};

export default OrderForm;