import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBars, FaPlus } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Preferences } from "@capacitor/preferences";
const Navbar = ({ isSidebarOpen, setSidebarOpen }) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [user, setUser] = useState(null);
  const [storeName, setStoreName] = useState("");        // ← keep store name here
  const [loading, setLoading] = useState(false);
  const [shortCut, setShortCut] = useState(false);

  /* --------------------------------------------------------------- */
  /*  FETCH PROFILE – now looks first for `storeName` from backend   */
  /* --------------------------------------------------------------- */
  useEffect(() => {
    const us=JSON.parse(localStorage.getItem("user"));
    if(!us) fetchUserProfile();
    else{
            const role  = (localStorage.getItem("role") || "guest").toLowerCase();
      setUser(us);
      if( us.storeName) {
        setStoreName(us.storeName);
      }
       else if (role !== "admin" && Array.isArray(us.Store) && us.Store.length) {
        /* fallback for older tokens / responses */
        setStoreName(us.Store[0].StoreName || "");
      }
    }
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const role  = (localStorage.getItem("role") || "guest").toLowerCase();

      if (!token) {
        setUser({ name: "Guest", role: "Guest" });
        return;
      }

      const url =
        role === "admin"
          ? "https://pos.inspiredgrow.in/vps/auth/profile"
          : "https://pos.inspiredgrow.in/vps/admiaddinguser/profile";

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
       console.log("Profile data:", data);
      setUser(data);
        localStorage.setItem("user", JSON.stringify(data));
        localStorage.setItem("warehouses", JSON.stringify(data.warehouses || []));
      /* NEW — preferred: server already sends storeName */
      if (data.storeName) {
        setStoreName(data.storeName);
      } else if (role !== "admin" && Array.isArray(data.Store) && data.Store.length) {
        /* fallback for older tokens / responses */
        setStoreName(data.Store[0].StoreName || "");
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser({ name: "Guest", role: "Guest" });
    } finally {
      setLoading(false);
    }
  };

const handleLogout = async () => {
  
  localStorage.clear();

    await Preferences.remove({ key: "token" });
  await Preferences.remove({ key: "role" });
  await Preferences.remove({ key: "permissions" });
  await Preferences.remove({ key: "userId" });
  await Preferences.remove({ key: "roleId" });
  await Preferences.remove({ key: "stores" });
  await Preferences.remove({ key: "storeId" });
  await Preferences.remove({ key: "deafultWarehouse" });
  navigate("/");

  window.location.reload();
};

  /* --------------------------------------------------------------- */
  /*  Decide heading text (NO layout alterations)                    */
  /* --------------------------------------------------------------- */
  const roleLower = (localStorage.getItem("role") || "guest").toLowerCase();
  const headerTitle =
    roleLower === "admin" ? "Admin Panel" : storeName || "Grocery On Wheel";

  return (
<nav className="sticky top-0 z-50 flex flex-col items-center justify-between gap-2 px-6 pt-2 text-white bg-gray-900 md:gap-0 md:flex-row">
  
      <div className="flex items-center justify-between w-full gap-2 md:w-auto md:bg-transparent">
        <div className={`w-screen text-center ${isSidebarOpen?"md:w-64":"w-auto"} md:text-center`}>
          <h2
            className="text-2xl font-bold text-center cursor-pointer md:w-auto"
            onClick={() => navigate("/dashboard")}
          >
            {/* only these three spans changed text source */}
            <span className="md:hidden">{headerTitle}</span>
            {isSidebarOpen ? (
              <span className="hidden md:flex">{headerTitle}</span>
            ) : (
              <span className="hidden md:flex">POS</span>
            )}
          </h2>
        </div>

        <div className="flex-col items-center hidden gap-2 md:flex md:flex-row">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="flex items-center "
          >
            <FaBars size={24} className="cursor-pointer hover:text-gray-400" />
          </button>

          {/* ───────────────── shortcut (+) button ───────────────── */}
          <div className="relative hidden md:inline-block">
            <div
              className="flex items-center justify-center w-10 h-10 text-white bg-green-500 rounded-md cursor-pointer hover:bg-green-600 "
              onClick={() => setShortCut(!shortCut)}
            >
              <FaPlus />
            </div>

            {shortCut && (
              <AnimatePresence>
                <motion.ul
                  className="absolute z-50 w-32 p-0 py-2 m-0 mt-2 text-gray-500 list-none bg-white rounded-md shadow-lg"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/add-sale")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Sales
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/newquotation")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Quotation
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/new-purchase")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Purchase
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/customer/add")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Customer
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/supplier/add")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Supplier
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/items/add")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Item
                  </li>
                  <li
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-200"
                    onClick={() => navigate("/add-expense")}
                  >
                    <FaPlus className="font-bold text-green-500" />
                    Expense
                  </li>
                </motion.ul>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────── right‑hand icons / profile ───────────────── */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="flex items-start justify-start md:hidden">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="flex items-center "
          >
            <FaBars size={24} className="cursor-pointer hover:text-gray-400" />
          </button>
        </div>

        <div className="relative flex items-center gap-4">
          <div>
            <button
              className="flex items-center px-2 hover:bg-gray-500"
              onClick={() => navigate("/pos-main")}
            >
              <FaPlus />
              POS
            </button>
          </div>

          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <img
              src="/userlogoprof.png"
              alt="Profile"
              className="w-10 h-10 border-2 border-gray-300 rounded-full hover:opacity-80"
            />
            <span className="text-sm">{user?.name || "Unknown User"}</span>
          </div>

          {showDropdown && (
            <div className="absolute right-0 z-10 w-64 p-4 mt-2 text-black bg-white rounded-md shadow-lg top-full">
              {loading ? (
                <p className="text-center text-gray-600">Loading...</p>
              ) : (
                <>
                  <div className="flex flex-col items-center">
                    <img
                      src="/userlogoprof.png"
                      alt="Profile"
                      className="w-16 h-16 border-2 border-gray-400 rounded-full"
                    />
                    <h3 className="mt-2 text-lg font-bold">
                      {user?.name || "Unknown User"}
                    </h3>
                    <p className="text-sm font-semibold text-blue-600">
                      Role: {user?.role || "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-col mt-4">
                    <button className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300" onClick={()=>navigate('/profile/edit')}>
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2 mt-2 text-white bg-red-500 rounded-md hover:bg-red-600"
                    >
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
