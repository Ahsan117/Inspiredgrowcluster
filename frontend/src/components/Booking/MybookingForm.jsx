import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';

const MybookingForm = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    bookNumber: '',
    bookingDate: '',
    customerId: '',
    contactNumber: '',
    location: '',
    remark: ''
  });

  // 1️⃣ On mount: generate booking number + fetch items & customers
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      bookNumber: generateBookingNumber()
    }));
    fetchItems();
    fetchCustomers();
  }, []);

  const generateBookingNumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `BN${timestamp}${random}`;
  };

  // Fetch all items for a potential dropdown
  const fetchItems = async () => {
    try {
      const res = await axios.get(
        'https://pos.inspiredgrow.in/vps/api/items'
      );
      setItems(res.data);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  // Fetch all customers for selection
  const fetchCustomers = async () => {
    try {
      const res = await axios.get(
        'https://pos.inspiredgrow.in/vps/api/customer-data/all'
      );
      setCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    }
  };

  // Handle form field changes
  const handleChange = e => {
    const { name, value } = e.target;

    // When selecting a customer, auto-fill contactNumber
    if (name === 'customerId') {
      const cust = customers.find(c => c._id === value);
      setFormData(prev => ({
        ...prev,
        customerId: value,
        contactNumber: cust?.contactNumber || ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Submit booking
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const payload = {
        bookNumber: formData.bookNumber,
        bookingDate: formData.bookingDate,
        customerId: formData.customerId,
        contactNumber: formData.contactNumber,
        location: formData.location,
        remark: formData.remark
      };
      const res = await axios.post(
        'https://pos.inspiredgrow.in/vps/api/booking-orders',
        payload
      );
      toast.success(
        `Booking ${res.data.bookNumber} submitted successfully!`,
        { autoClose: 3000 }
      );

      // Reset form and regenerate number
      const newBN = generateBookingNumber();
      setFormData({
        bookNumber: newBN,
        bookingDate: '',
        customerId: '',
        contactNumber: '',
        location: '',
        remark: ''
      });
    } catch (error) {
      console.error('Error submitting booking:', error);
      toast.error('Something went wrong. Please try again.', {
        autoClose: 3000
      });
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar
        isSidebarOpen={isSidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      <div className="flex flex-1 pt-16">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <div
          className={`flex-1 p-4 sm:p-6 bg-gray-100 transition-all duration-300 ${
            isSidebarOpen ? 'ml-64' : 'ml-0'
          }`}
        >
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
          />
          <form
            onSubmit={handleSubmit}
            className="max-w-4xl p-6 mx-auto mb-6 text-white bg-gray-900 rounded shadow-lg"
          >
            <h2 className="mb-4 text-xl font-bold text-orange-400">
              New Booking
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Booking Number */}
              <input
                type="text"
                name="bookNumber"
                placeholder="Booking Number"
                value={formData.bookNumber}
                readOnly
                required
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded opacity-75 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              {/* Booking Date */}
              <input
                type="date"
                name="bookingDate"
                value={formData.bookingDate}
                onChange={handleChange}
                required
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              {/* Customer Selection */}
              <select
                name="customerId"
                value={formData.customerId}
                onChange={handleChange}
                required
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                <option value="">Select Customer</option>
                {customers.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Auto-filled Contact Number */}
              <input
                type="text"
                name="contactNumber"
                placeholder="Contact Number"
                value={formData.contactNumber}
                readOnly
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded opacity-75 cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              {/* Location */}
              <input
                type="text"
                name="location"
                placeholder="Location"
                value={formData.location}
                onChange={handleChange}
                required
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />

              {/* Remark */}
              <input
                type="text"
                name="remark"
                placeholder="Remark"
                value={formData.remark}
                onChange={handleChange}
                required
                className="p-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center w-full px-6 py-2 mx-auto mt-6 font-semibold text-white transition-colors duration-200 bg-orange-500 rounded hover:bg-orange-600 sm:w-auto"
            >
              Submit Booking
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MybookingForm;
