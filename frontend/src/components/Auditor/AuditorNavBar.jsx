import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FaBars, FaPlus } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import { Preferences } from '@capacitor/preferences';
const AuditorNavbar = ({ isSidebarOpen, setSidebarOpen }) => {
  const link="https://pos.inspiredgrow.in/vps"
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
    if (!user) fetchUserProfile();
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

      const url =`${link}/api/audit/profile`
        

      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
       
      console.log(data.data)
      setUser(data.data);

      /* NEW — preferred: server already sends storeName */
    
    } catch (err) {
      console.error("Profile fetch error:", err);
      setUser({ name: "Guest", role: "Guest" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const logout=async()=>{
         localStorage.clear();
     await Preferences.remove({ key: "token" });
  await Preferences.remove({ key: "id" });
  await Preferences.remove({ key: "role" });
  await Preferences.remove({ key: "auditId" });
    }
    logout();
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
    <nav className="flex flex-col items-center justify-between gap-2 px-6 py-1 text-white bg-gray-900 md:gap-0 md:flex-row">
      <div className="flex items-center justify-between w-full gap-2 md:w-auto md:bg-transparent">
        

        <div className="flex-col items-center hidden gap-2 md:flex md:flex-row">
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="flex items-center "
          >
            <FaBars size={24} className="cursor-pointer hover:text-gray-400" />
          </button>

          {/* ───────────────── shortcut (+) button ───────────────── */}
        
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
          
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <img
              src="/userlogoprof.png"
              alt="Profile"
              className="w-10 h-10 border-2 border-gray-300 rounded-full hover:opacity-80"
            />
            <span className="text-sm">{user?.userName || "Unknown User"}</span>
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
                      {user?.userName || "Unknown User"}
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

export default AuditorNavbar;
