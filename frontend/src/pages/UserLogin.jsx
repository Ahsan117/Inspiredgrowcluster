import { useState,useEffect,useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Preferences } from '@capacitor/preferences';
import SavedLoginsPage from "./SavedLoginPage";
import {POSContext} from "../context/POSContext";
// Icons ke liye placeholder (real project mein lucide-react jaisi library use karein)
const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-3 top-1/2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>
);



const storeToken = async (name,token) => {
  await Preferences.set({
    key: name,
    value: token,
  });
};

const UserLogin = () => {
  const [use, setUser] = useState({ username: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [rememberMe, setRememberMe] = useState(false);
 const [savedUsers, setSavedUsers] = useState([]);
 const[pop,setPop]=useState(false);
 const{ loadPOSData } = useContext(POSContext);

  const handleSavedLogins = () => {
    setPop(!pop);
  };

  useEffect(() => {
    const loadSavedLogins = async () => {
      const { value } = await Preferences.get({ key: 'previoususername' });
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setSavedUsers(parsed);
            console.log("Saved logins loaded:", parsed);
          }
        } catch (e) {
          console.error('Failed to parse saved logins:', e);
        }
      }
    };

    loadSavedLogins();
  }, []);
  
  useEffect(() => {
  const checkToken = async () => {
    const { value: token } = await Preferences.get({ key: "token" });
    const { value: role } = await Preferences.get({ key: "role" });
    const { value: permissions } = await Preferences.get({ key: "permissions" });
    const { value: userId } = await Preferences.get({ key: "userId" });
    const { value: roleId } = await Preferences.get({ key: "roleId" });
    const { value: stores } = await Preferences.get({ key: "stores" });
    const { value: storeId } = await Preferences.get({ key: "storeId" });
    const{value:deafultWarehouse}=await Preferences.get({ key: "deafultWarehouse" });

    if (token) {
      localStorage.setItem("deafultWarehouse",deafultWarehouse);
      localStorage.setItem("token", token);
    
      localStorage.setItem("role", role);
      localStorage.setItem("permissions", permissions);
      localStorage.setItem("userId", userId);
      localStorage.setItem("roleId", roleId);
      localStorage.setItem("storeId", storeId);
      localStorage.setItem("stores", stores || []);
      navigate("/dashboard");
    }
  };
  checkToken();
}, []);

  const handleChange = (e) => {
    setUser({ ...use, [e.target.name]: e.target.value });
  };


  

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      
      const res = await axios.post(
         "https://pos.inspiredgrow.in/vps/admiaddinguser/userloginByUserName",
        {
          username:use.username,
          password:use.password
        }
      );
      console.log("data:",res.data)
      const { token, user , permissions } = res.data;
      
//        if (rememberMe) {
//         alert("Saving user credentials for future logins");
//   const { value: previousUsername } = await Preferences.get({ key: "previoususername" });
//         console.log("Previous saved usernames:", previousUsername);
//   // Parse existing saved users or use an empty array
//   let arr = [];
//   try {
//     arr = previousUsername ? JSON.parse(previousUsername) : [];
//   } catch (e) {
//     console.warn("Error parsing saved usernames", e);
//   }

//   // Avoid duplicate entries
//   const alreadyExists = arr.some(u => u.username === user.username);
//    console.log("Already exists:", alreadyExists);
//   if (!alreadyExists) {
//     arr.push({
//       username: user.username,
//       password: user.password
//     });
//     console.log(arr)
//     await Preferences.set({
//       key: "previoususername",
//       value: JSON.stringify(arr),
//     });
//   }
// }

      // 1) Save JWT
      localStorage.setItem("token", token);
     await storeToken("token", token)
    
  await storeToken("deafultWarehouse",res.data.user.defaultWarehouse || null);
    localStorage.setItem("deafultWarehouse",res.data.user.defaultWarehouse || null);
     // 2) Decode token to pull out id, role id, and stores[]
     const decoded = JSON.parse(window.atob(token.split(".")[1]));
     
      localStorage.setItem("role", user.Role.roleName.toLowerCase());
      localStorage.setItem("userId", user.id);
      localStorage.setItem("roleId", user.Role._id);
      localStorage.setItem("stores", JSON.stringify(user.stores || []));
      // If exactly one store, save a convenience storeId
      // if (deores?.length === 1) {
        localStorage.setItem("storeId", user.stores[0] ||  "");
        await storeToken("storeId", user.stores[0] || "")
      // }

      // // 3) Save permissions array
      localStorage.setItem("permissions", JSON.stringify(permissions || []));
      await storeToken("permissions", JSON.stringify(permissions || []))

      // store for long login
      await storeToken("role", user.Role.roleName.toLowerCase());
      await storeToken("userId", user.id)
      await storeToken("roleId", user.Role._id)
      await storeToken("stores", JSON.stringify(user.stores || []))
      alert("User logged in successfully!");
      
      navigate("/dashboard");
    } catch (err) {
        setError(err.response?.data?.message || err.message || "Login failed");
      console.error("Login error:", err);
        const message =
        err.response?.data?.message || err.message || "Login failed";
      alert(message); // ✅ No more 'undefined'

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen px-4 font-sans bg-gray-100">
      
      {/* Login Card */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-xl">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 sm:text-4xl">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-600">Login to access your account</p>
        </div>
        {
          pop && <SavedLoginsPage savedUsers={savedUsers} />
        }

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <UserIcon />
            <input 
            
              type="text"
              name="username"
              placeholder="Username"
              value={use.username}
              onChange={handleChange}
              required
              className="w-full py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <LockIcon />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={use.password}
              onChange={handleChange}
              required
              className="w-full py-3 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 border border-gray-300 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="remember-me" className="block ml-2 text-sm text-gray-900">
                Remember me
              </label>
            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-sm text-center text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-sm font-bold text-white transition-all duration-300 bg-blue-600 rounded-lg sm:text-base hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>

      {/* Alternate Logins - Positioned at the bottom of the screen */}
      <div className="absolute w-full max-w-md text-center bottom-8">
        {/* Divider */}
        <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-gray-100">Or continue as</span>
            </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-center space-x-4">
            <button className="px-4 py-2 text-xs font-semibold text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 sm:text-sm" onClick={() => navigate("/admin-login")}>
                Login as Admin
            </button>
            <button className="px-4 py-2 text-xs font-semibold text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50 sm:text-sm" onClick={() => navigate("/audit-login")}>
                Login as Auditor
            </button>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
