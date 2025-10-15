import React from 'react'
import Select from 'react-select'
import { useState,useEffect ,useCallback} from 'react'
import axios, { all } from 'axios'
import { useNavigate } from 'react-router-dom'
import Navbar from "../Navbar.jsx";
import AuditorSidebar from './AuditorSidebar.jsx'
import Button from '../contact/Button.jsx'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt } from 'react-icons/fa'
import { CameraIcon } from '@heroicons/react/solid'
import { BrowserMultiFormatReader } from "@zxing/library";
import { useRef } from 'react'
import AuditorNavbar from './AuditorNavBar.jsx'
import Scan from './Scan.jsx'
import playSound from "../../utility/sound"
import { useSearchParams } from 'react-router-dom'
const  BucketCreate=()=> {
  const link="https://pos.inspiredgrow.in/vps"
    const [searchParams] = useSearchParams();
    const [scan,setScan]=useState(false)
    
    const[id,setId]=useState(searchParams.get("id") || null)
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const[result,setResult]=useState("")
    const[scanning,setScanning]=useState(false)
    const[items,setItems]=useState([])
    const[selecteditemname,setSelecteditemName]=useState("")
    const[totalItems,setTotalItems]=useState(0) 
    const[totalQuantity,setTotalQuantity]=useState(0)
    const[selectedItem,setSelectedItem]=useState([])
     useEffect(()=>{
        if(window.innerWidth < 768){
          setSidebarOpen(false)
        }
      },[window.innerWidth])
    
    
     const [formData,setFormData] = useState({
        auditorId:localStorage.getItem("id"),
        items:[]
     })


  const playBeep = useCallback(() => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    gainNode.gain.setValueAtTime(2.0, audioContext.currentTime);
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.15);
  }, []);

  
     const fetchItems = async () => {
        try {
            const response = await axios.get(`${link}/api/audit/items`,{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }});

                  
                  console.log(("Items"))
            console.log(response.data);
              setItems(response.data.data)
        } catch (error) {
            console.error("Error fetching stores:", error);
        }
     }

      const fetchBucket=async(bid)=>{
           try {
            const response = await axios.get(`${link}/api/audit/bucket/auditor/${localStorage.getItem("id")}`,{
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                  }});

                 const bucketFind=response.data.data.find(ma=> ma._id===bid)
                 console.log(bucketFind)
                 setFormData(bucketFind)
                 setSelectedItem(bucketFind.items)
        } catch (error) {
            console.error("Error fetching stores:", error);
        }
        }

      useEffect(() => {
    let cleanupInstance = null;

    const loadData = async () => {
      // Fetch items
      await fetchItems();

      // If id is present, fetch bucket
      if (id) {
        cleanupInstance = await fetchBucket(id);
      }
    };

    loadData();

    return () => {
      // Cleanup safely if fetchBucket returned something with destroy()
      if (cleanupInstance && typeof cleanupInstance.destroy === "function") {
        cleanupInstance.destroy();
      }
    };
  }, [id]);

     

    const videoRef = useRef(null);
           const codeReaderRef = useRef(null);
         
           useEffect(() => {
             if (!scanning) return;
         
             const startScanner = async () => {
               if (!videoRef.current) return;
         
               const codeReader = new BrowserMultiFormatReader();
               codeReaderRef.current = codeReader;
         
               const tryDecode = async (facingMode) => {
                 const constraints = {
                   video: {
                     facingMode,
                     advanced: [
                       { width: 1920 },
                       { height: 1080 },
                       { zoom: 2 }, // not all devices support this
                     ],
                   },
                 };
         
                 return codeReader.decodeFromConstraints(
                   constraints,
                   videoRef.current,
                   (result, error) => {
                     if (result) {
                       const text = result.getText();
                       alert(text);
                       setResult(text)  
                       window.navigator.vibrate?.(200);
                       const beep = new Audio("/beep.mp3");
                       beep.play();
         
                       const stream = videoRef.current?.srcObject;
                       stream?.getTracks().forEach((track) => track.stop());
         
                       if (codeReaderRef.current?.reset && typeof codeReaderRef.current.reset === "function") {
                         codeReaderRef.current.reset();
                       }
         
                       setScanning(false);
                     }
         
                     if (error && error.name !== "NotFoundException") {
                       console.error("Scan error:", error);
                     }
                   }
                 );
               };
         
               try {
                 await tryDecode({ exact: "environment" });
               } catch (error) {
                 if (error.name === "OverconstrainedError" || error.name === "NotFoundError") {
                   console.warn("Back camera not found. Trying front camera...");
                   try {
                     await tryDecode("user");
                   } catch (fallbackError) {
                     console.error("Front camera also failed:", fallbackError);
                     alert("No camera found or accessible.");
                     setScanning(false);
                   }
                 } else {
                   console.error("Camera access error:", error);
                   alert("Camera access error: " + error.message);
                   setScanning(false);
                 }
               }
             };
         
             startScanner();
         
             return () => {
               const stream = videoRef.current?.srcObject;
               stream?.getTracks().forEach((track) => track.stop());
         
               if (codeReaderRef.current?.reset && typeof codeReaderRef.current.reset === "function") {
                 codeReaderRef.current.reset();
               }
             };
           }, [scanning]);

             useEffect(() => {
              setFormData((prev)=>({
                ...prev,
                items:selectedItem
              }))
             },[selectedItem])
    

             useEffect(() => {
              console.log("sss",selectedItem)
               setTotalItems(selectedItem.length);
               setTotalQuantity(selectedItem.reduce((sum, item) => sum + item.quantity, 0));
             }, [selectedItem]);

   const filteredItems = result
         ? items.filter((item) => {
             const q = result.toLowerCase();
             return (
               item.itemName?.toLowerCase().includes(q) ||
               item.itemCode?.toLowerCase().includes(q) ||
               (item.barcode && item.barcode.toLowerCase().includes(q))
             );
           })
         : [];
  let allow;

  
  useEffect(()=>{
    allow=result==""?false:true;
  },[result])

  useEffect(() => {
  if (!result || result.trim() === "" || !allow) return;

  const itemExist = items.find(
    item =>
      item._id === result ||
      item.itemName?.toLowerCase() === result.toLowerCase() ||
      item.barcodes?.includes(result)
  );

  if (!itemExist) return;

  setSelectedItem(prev => {
    const existingIndex = prev.findIndex(i => i.item_id === itemExist._id);

    if (existingIndex !== -1) {
      // safely update immutably
      const updated = [...prev];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      playSound("/sounds/item-exists.mp3");
      return updated;
    } else {
      playSound("/sounds/item-added.mp3");
      return [
        ...prev,
        {
          item_id: itemExist._id,
          quantity: 1,
          itemName: itemExist.itemName,
        },
      ];
    }
  });

  setSelecteditemName("");
  setResult("");
}, [result]);


 const handleChange=(e,index)=>{
  const {value}=e.target
  setSelectedItem((prevItems) => {
    const updatedItems = [...prevItems];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity:e.target.type==="number"?Number (value):value,
    };
    return updatedItems;
  });
 }



 
const handleRemoveUser = (ind) => {
  setSelectedItem(selectedItem.filter((item,index)=> index !== ind))
};




const handleSubmit = async (e) => {
  e.preventDefault();
   try {
    console.log("Submitting audit with data:", formData);
        console.log(formData)
    if(!id){

       const response = await axios.post(`${link}/api/audit/bucket/create`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log("Bucket Created successfully:", response.data);
    setFormData((prev)=>({
      ...prev,
      items:[]
    }));
    setSelectedItem([]);
    id?alert("Bucket Updated successfully"):alert("Bucket Created successfully");;
    return;
    }

    

    
    const response = await axios.put(`${link}/api/audit/bucket/${id}`, formData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
    console.log("Bucket updated successfully:", response.data);
    setFormData((prev)=>({
      ...prev,
      items:[]
    }));
    setSelectedItem([]);
    id?alert("Bucket Updated successfully"):alert("Bucket Created successfully");;
   } catch (error) {
    console.log("Error creating Bucket:", error);
   }



}





if(scan) return <Scan setScan={setScan} allItems={items} setSelectedItem={setSelectedItem} />
  return (
    <div className="flex flex-col h-screen">
      <AuditorNavbar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex flex-grow ">

        <AuditorSidebar isSidebarOpen={isSidebarOpen} />
          
           {/* Content */}
         <div className={`w-full flex flex-col p-2 md:p-2  `}>
          <header className="flex flex-col items-center justify-between p-4 rounded-md shadow sm:flex-row">
            <div className="flex items-center gap-1 text-center sm:flex-row sm:text-left">
              <h1 className="text-lg font-semibold truncate sm:text-xl">New Bucket</h1>
              <span className="text-xs text-gray-600 sm:text-sm">Add/Update Bucket</span>
            </div>

            <nav className="flex flex-wrap items-center justify-center mt-2 text-xs text-gray-500 sm:justify-start sm:text-sm sm:mt-0">
   <NavLink to="/auditor-dashboard" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                            <FaTachometerAlt className="mr-2 text-gray-500 hover:text-cyan-600" /> Home
                          </NavLink>     
                          <NavLink to="/bucket-list" className="flex items-center text-gray-700 no-underline hover:text-cyan-600">
                           &gt; Bucket List
                          </NavLink>    
                          <NavLink to="/bucket-create" className="text-gray-700 no-underline hover:text-cyan-600">
                           &gt; Add Bucket
                          </NavLink>
              
            </nav>
          </header>

          <div className="p-4 mt-1 bg-white border-t-4 rounded-lg shadow-md border-cyan-500">
 
               
                 <div className="flex gap-5">

                    
                  <div className="relative flex flex-col w-full py-2">
                                     <label htmlFor="">Items</label>
                                     <label htmlFor="" className="flex">
                                     <input type="text" name="type" className="w-full px-2 py-1 border-2 rounded-md"  value={selecteditemname} onChange={(e)=>{setResult(e.target.value) ; setSelecteditemName(e.target.value)}}/>
                                     <button type="button"
                         className="p-2 ml-2 text-white rounded-full hover:bg-blue-600" 
                         onClick={() => setScan(true)}
                       >
                         <CameraIcon className="w-6 h-6 text-gray-500" />
                       </button>
                                     </label>
                                     {result !== "" && (
                   <div
                     className="absolute z-50 w-full overflow-y-auto bg-white border rounded-lg shadow-lg top-20 sm:w-96 max-h-60 touch-auto"
                     style={{ WebkitOverflowScrolling: 'touch' }} // enables momentum scrolling on iOS
                   >
                     <ul>
                       {filteredItems.map((list) => (
                         <li
                           key={list.itemCode}
                           onClick={() => {setResult(list._id)}}
                           className="p-2 cursor-pointer hover:bg-gray-100"
                         >
                           <strong>{list.itemCode}</strong> - {list.itemName} - {list.barcode}
                         </li>
                       ))}
                     </ul>
                   </div>
                 )}
                                     </div>


                  
                 </div>
          

 <div className='flex flex-col items-center justify-around w-full gap-2 mx-auto mt-4 sm:flex-row'>
                                                      <Button className="w-full text-white bg-green-500 rounded cursor-pointer hover:bg-green-600" type='submit' text={id?"Update":"Create"} onClick={handleSubmit} /> {/* Save button */}
                                                      <Button className="w-full text-white bg-orange-500 rounded cursor-pointer hover:bg-orange-600" text="Reset" />  {/* Close button  */}
                       </div> 

                       <div className="flex justify-between w-full p-4 mt-2 bg-gray-100 rounded-lg shadow-md">
  <span className="text-lg font-semibold text-gray-700">
    Total Items: {totalItems}
  </span>
  <span className="text-lg font-semibold text-gray-700">
    Total Quantity: {totalQuantity}
  </span>
</div>

                     <div className='w-full mt-4 overflow-x-auto min-h-16'>
  <table className='min-w-full border-2 divide-y divide-gray-200 min-h-48'>
    <thead className='bg-gray-200'>
      <tr>
    
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>ItemName</th>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Quantity</th>
        <th className='px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase'>Actions</th>
      </tr>
    </thead>
    <tbody className='bg-white divide-y divide-gray-200'>
      {selectedItem.map((user, index) => (
        <tr key={index}>

          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>{user.itemName || user.item_id?.itemName || "NA"}</td>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>
            
                 
                  <input type="number" min='1'  value={user.quantity} className='px-1 py-1 border-2 rounded-md'  onChange={(e)=>handleChange(e,index)}/>
            
          </td>
          <td className='px-6 py-4 text-sm text-gray-500 whitespace-nowrap'>
            <button 
              onClick={() => handleRemoveUser(index)}
              className='text-red-600 hover:text-red-900'
            >
              Remove
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

                
                 
            </div>
          </div>
        </div>
      </div>
  )
}

export default BucketCreate
