import React, { useEffect, useState, useRef, useCallback,useContext, use } from "react";
import {
  FaHandPaper,
  FaLayerGroup,
  FaMoneyBill,
  FaCreditCard,
  FaBarcode,
  FaList,
  FaUsers,
  FaBox,
  FaFileInvoice,
  FaBars,
  FaWindowMaximize,
} from "react-icons/fa";
import { Camera } from "@capacitor/camera";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { MdOutlineDashboard } from "react-icons/md";
import axios, { all } from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import PaymentModal from "./PaymentModal";
import LoadingScreen from "../../../Loading";
import POS1 from "./POS1";
import POS2 from "./POS2";
import POS3 from "./POS3";
import Swal from 'sweetalert2';
import playSound from "../../../utility/sound";
import Print from "./Print";
import {Geolocation} from "@capacitor/geolocation";
import { POSContext } from "../../../context/POSContext";
import { set } from "date-fns";


function buildInvoiceHTML(order, payments = [], store, cust, rows, sellerName = "–", setPrint, setActiveTab,exclusiveDiscount=0) {
  const {
    logo, storeName, tagline, address, gst, phone, email
  } = store;

  console.log({ order, payments, store, cust, rows, sellerName });
  const today = new Date(order.createdAt || Date.now());
  const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);

  // 2️⃣ “Before Tax” is pure quantity × rate, no discounts
  const rawTotal = rows.reduce((sum, r) => sum + (r.quantity * r.salesPrice), 0);

  // 3️⃣ Your existing order.totalDiscount and taxAmount
  const disc = order.totalDiscount || 0;
  const taxAmt = order.taxAmount || 0;

  // 4️⃣ Net total after discount, before adding tax
  const netBeforeTax = rawTotal - disc;

  // 5️⃣ Paid & previous due
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const prevDue = order.previousBalance || 0;

  // 6️⃣ Final due
  const totalDue = prevDue + netBeforeTax + taxAmt - paid;

  // build your rows as before…
  const body = rows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${r.itemName}</td>
      <td class="r">${r.quantity}</td>
      <td class="r">${r.mrp.toFixed(2)}</td>
      <td class="r">${r.salesPrice.toFixed(2)}</td>
      <td class="r">${(r.quantity * r.salesPrice).toFixed(2)}</td>
    </tr>`
  ).join("");

  const payRows = payments.map((p, i) => `
    <tr><td>${i + 1}</td><td>${p.paymentNote || "-"}</td><td class="r">${(p.amount-exclusiveDiscount)}</td></tr>`
  ).join("");
  
  // REMOVED THE ALERT
  // alert("asd") 
  
  // setPrint({
  //   order,
  //   payments,
  //   store: {
  //      storeName, tagline, address, gst, phone, email
  //   },
  //   customer: cust,
  //   items: rows,
  //   seller: sellerName,
  //   dues: { previousDue: totalDue }
  // });
     return({
    order:{  rows:rows,...order },
    payments:payments,
    store: {
      storeName, tagline, address, gst, phone, email
    },
    customer: {name: cust.name || "–"},
    seller: {sellerName: sellerName},
    dues: { previousDue: totalDue },
    exclusiveDiscount:exclusiveDiscount
  }); 
  // This will now correctly switch to the print view after the state has been set.
  // setActiveTab("print");
}

export default function POSM() {
  const [params] = useSearchParams();
  const link="https://pos.inspiredgrow.in/vps"
  const [location, setLocation] = useState(null);
  const {posData,loadPOSData}=useContext(POSContext);
  const [editId, setEditId] = useState(null);
let watchId=""
  
  
    const getLocation = async () => {
  try {
    const permission = await Geolocation.requestPermissions();
    // console.log("Permission:", permission);

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    if (position?.coords) {
      const { latitude, longitude } = position.coords;
      // console.log("Got location:", latitude, longitude);
      return [latitude,longitude]; // GeoJSON expects [lng, lat]
    }

    return [0, 0]; // fallback
  } catch (err) {
    console.error("Error getting location:", err);
    return [0, 0]; // fallback
  }
};


    

   
  const navigate = useNavigate();
 const[activeTab,setActiveTab]=useState("pos2")
 const [matchedItems, setMatchedItems] = React.useState([]);
  // ─── STATE ─────────────────────────────────────────────────────────
  const [user, setUser] = useState({ name: "Guest", role: "Guest" });
  const [loadingUser, setLoadingUser] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const[isSubmitting,setIsSubmitting]=useState(false)
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
 const[additionalCharges,setAdditionalCharges]=useState(0)
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");

  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [terminals, setTerminals] = useState([]);

  const [paymentTypes, setPaymentTypes] = useState([]);

  const [allItems, setAllItems] = useState([]);
  const [itemsG, setItemG] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchItemCode, setSearchItemCode] = useState("");
  const [scanning, setScanning] = useState(false);

  const [items, setItems] = useState([]);

  const [quantity, setQuantity] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalDiscount, setTotalDiscount] = useState(0);

  const [invoiceCode, setInvoiceCode] = useState(
    `SL/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, "0")}/`
  );

  const [deliveryFee,setDeliveryFee]=useState(0);
  const [processingFee,setProcessingFee]=useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [previousBalance, setPreviousBalance] = useState(0);

  const [couponCode, setCouponCode] = useState("");
  const [adjustAdvancePayment, setAdjustAdvancePayment] = useState(false);
  const [advancePaymentAmount, setAdvancePaymentAmount] = useState(0);
  const [additionalPaymentAmount, setAdditionalPaymentAmount] = useState([]);
  const [heldInvoices, setHeldInvoices] = useState([]);
  const [showHoldList, setShowHoldList] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState("");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState(""); // "cash" | "bank" | "multiple" | "hold"
  const [orderPaymentMode, setOrderPaymentMode] = useState(""); // Tracks payment mode of loaded order

  const [storeName, setStoreName] = useState("");
  const [orderToEdit, setOrderToEdit] = useState(null);
  const [defaultWarehouse, setDefaultWarehouse]   = useState("");
  const prevWarehouseRef = useRef();    
  const[print,setPrint]=useState({})
  const [exclusiveDiscount, setExclusiveDiscount] = useState(0);
  const[orderId,setOrderId]=useState(null)
   const[cart,setCart]=useState({})
    
  // ─── HELPERS ────────────────────────────────────────────────────────
  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  

 async function fetchLiveQty (warehouseId, invId) {
  // console.log("CAll",warehouseId)
  if (!warehouseId || !invId) return 0;
  const { data } = await axios.get(
    `${link}/api/stock/${invId}?warehouse=${warehouseId}`,
    authHeaders()
  );
  // console.log(data)
  /* fall back to openingStock if qty hasn’t moved yet */
  return (data.currentStock ?? data.openingStock ?? 0);
}



  
  const getPaymentTypeId = (name) =>
    paymentTypes.find((pt) => pt.paymentTypeName?.toLowerCase() === name.toLowerCase())?._id;


  useEffect(() => {
      const request = async () => {
        await Camera.requestPermissions({
              permissions: ['camera', 'photos']

        }); // Ask Android to show prompt
      };
      request();
      // setEditId(params.get("id") || null);
      setSelectedWarehouse(params.get("warehouse") || null)
      setSelectedCustomer(params.get("customer") || null)
      setOrderId(params.get("orderId") || null)
    }, []);

    useEffect(() => {
      // ✅ Check dependencies before doing anything
      if (!orderId || !Array.isArray(allItems) || allItems.length === 0) return;
    //  console.log(allItems)
      // console.log("Fetching order details for:", orderId);
    
      const fetchOrder = async () => {
        try {
          const token = localStorage.getItem("token");
          if (!token) {
            console.warn("No token found. Aborting order fetch.");
            return;
          }
    
          const { data } = await axios.get(
            `${link}/api/orders/particular-order/${orderId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
    
          const orderData = data?.data;
          if (!orderData) {
            console.error("Invalid order response:", data);
            return;
          }
    
          console.log("Fetched order data:", orderData);
            // console.log(allItems)
          // ✅ Merge items with stock info
          const itemsWithStock = await Promise.all(
            orderData.items.map(async (i) => {
              const itemDoc = allItems.find(
                (ai) =>
                  ai.parentId === i.item?._id &&
                  (!i.variant || ai._id === i.variant || ai.variantId === i.variant) &&
                  ai.warehouse?._id === orderData.warehouse
              );
                    // console.log(orderData.warehouse)
              if (!itemDoc) {
                console.warn("❌ Item not found in local stock:", {
                  itemId: i.item?._id,
                  itemName: i.item?.itemName,
                  warehouseId: orderData.warehouse,
                });
                return null;
              }
    
              // ✅ Fetch live quantity
              const liveQty = await fetchLiveQty(
                orderData.warehouse,
                i.variant || i.item._id
              );
    
              // ✅ Build enriched item object
              return {
                category: itemDoc.category || null,
                brand: itemDoc.brand || null,
                description: i.item.description || itemDoc.description || "",
                barcodes: itemDoc.barcodes || [],
                purchasePrice: itemDoc.purchasePrice || 0,
                item: i.item._id,
                variant: i.variant || null,
                itemName: itemDoc.itemName,
                itemCode: itemDoc.itemCode || "",
                openingStock: itemDoc.openingStock || 0,
                stock: liveQty,
                currentStock: liveQty,
                salesPrice: i.price || itemDoc.salesPrice || 0,
                quantity: i.quantity || 1,
                origQty: i.quantity || 1,
                discount: i.discount || 0,
                tax: i.tax?._id || itemDoc.tax?._id || null,
                taxRate: i.tax?.taxPercentage || itemDoc.tax?.taxPercentage || 0,
                unit: i.unit || itemDoc.unit || null,
                mrp: i.mrp || itemDoc.mrp || 0,
                expiryDate: itemDoc.expiryDate || null,
                subtotal:
                  i.subtotal ||
                  ((i.price || itemDoc.salesPrice || 0) * (i.quantity || 1) -
                    (i.discount || 0)),
              };
            })
          );
    
          // ✅ Filter out any null items (missing from local data)
          const validItems = itemsWithStock.filter(Boolean);
    
          console.log("✅ Final merged items:", validItems);
          setItems(validItems);
        } catch (err) {
          console.error("Error fetching order:", err);
        }
      };
    
      fetchOrder();
    }, [orderId, allItems]);

    
  useEffect(() => {
    if(editId){
      return;
    }
  // skip the very first render (prevWarehouseRef === undefined)
  if (
    prevWarehouseRef.current &&                     // we already had one before
    prevWarehouseRef.current !== selectedWarehouse  // AND it actually changed
  ) {
    if (items.length > 0) {
      // 👉 optional safety prompt; remove if you don’t want it
      const ok = window.confirm(
        "Changing the warehouse will clear the current cart. Continue?"
      );
      if (!ok) {
        // user aborted → roll back the <select>
        setSelectedWarehouse(prevWarehouseRef.current);
        return;
      }
    }

    // 🚿 flush everything that belongs to the old warehouse
    setItems([]);
    setSearchItemCode("");
  }

  // finally, remember this value for the next tick
  prevWarehouseRef.current = selectedWarehouse;
}, [selectedWarehouse, items.length]);


useEffect(() => {
  const role = localStorage.getItem("role");
     
        const data = JSON.parse(localStorage.getItem("user"));
      setUser(data);
      setStoreName(data.storeName || "Grocery on Wheels");
      setDefaultWarehouse(data.defaultWarehouse || "");
},[])

  // ─── FETCHERS ───────────────────────────────────────────────────────
  useEffect(() => {
    fetchLookups();
    fetchHeld();
    if (editId) {
      setIsLoadingEdit(true);
      fetchPosById(editId)
  .then(async (inv) => {
    if (!inv) return;
    // 1️⃣ set the warehouse so that  kicks off for that warehouse
    setSelectedWarehouse(inv.warehouse._id);

    // 2️⃣ wait for the items to come back
     await fetchItems(inv.warehouse._id);

    // 3️⃣ only then remember the order to edit
    setOrderToEdit(inv);
  })

        .catch(console.error)
        .finally(() => setIsLoadingEdit(false));
    } 
    
    else {
      loadNextInvoiceCode();
      
      // setSelectedWarehouse(localStorage.getItem("deafultWarehouse") || null);
    }
  }, [editId]);

  
  useEffect(() => {
  fetchItems(selectedWarehouse, !!orderId); // Pass editId as isEditMode
}, [selectedWarehouse, orderId]);

 
 async function fetchLookups() {
  const cached = JSON.parse(localStorage.getItem("lookups"));
  if (cached) {
    setWarehouses(cached.warehouses || []);
    setCustomers(cached.customers || []);
    setAccounts(cached.accounts || []);
    setPaymentTypes(cached.paymentTypes || []);
    setTerminals(cached.terminals || []);
    setCart(cached.cartSettings)
  }

  try {
    const [wareRes, custRes, accRes, payRes, termRes,cartRes] = await Promise.all([
      axios.get(`${link}/api/warehouses?scope=mine`, authHeaders()),
      axios.get(`${link}/customer/customers`, authHeaders()),
      axios.get(`${link}/api/accounts`, authHeaders()),
      axios.get(`${link}/api/payment-types`, authHeaders()),
      axios.get(`${link}/api/terminals`, authHeaders()),
      axios.get(`${link}/deliverysettings/all`, authHeaders()),
    ]);
    // console.log(wareRes,custRes,accRes,payRes,termRes,cartRes)
    const lookups = {
      warehouses: wareRes.data.data || [],
      customers: custRes.data.data || [],
      accounts: accRes.data.data || [],
      paymentTypes: payRes.data.data || [],
      terminals: termRes.data.data || [],
      cartSettings:cartRes.data.data[0] || {}
    };
    console.log("lookups",lookups)
    // if (!editId && lookups.customers.length) { // find or default to the first customer
      // const walkIn = lookups.customers.find(c => c.name.toLowerCase() === "walk-in customer");
      // setSelectedCustomer((walkIn?._id) || lookups.customers[0]._id);
    // }
    // console.log(lookups)
    setWarehouses(lookups.warehouses);
    setCustomers(lookups.customers);
    setAccounts(lookups.accounts);
    setPaymentTypes(lookups.paymentTypes);
    setTerminals(lookups.terminals);
    setCart(lookups.cartSettings)
    localStorage.setItem("lookups", JSON.stringify(lookups));
  } catch (err) {
    console.error("❌ lookup fetch error", err);
  }
}




  async function fetchItems(warehouseId = selectedWarehouse, orderId) {
  if (!warehouseId) {
    setAllItems([]);
    return;
  }

  try {
    const params = {
      warehouse: warehouseId,
    };
    if (!orderId) {
      params.inStock = true;
    }

   const { data } = await axios.get(
      `${link}/api/items`,
      { headers: authHeaders().headers, params }
    );
    const rawItems = data.data || [];

    const flatItems = rawItems
      .filter(it => it._id && it.warehouse?._id)
      .map(it => {
        const isVariant = Boolean(it.parentItemId);
        return {
          ...it,
          parentId:   isVariant ? it.parentItemId : it._id,
          variantId:  isVariant ? it._id          : null,
          itemName:   isVariant ? `${it.itemName} / ${it.variantName || "Variant"}` : it.itemName,
          barcode:    it.barcode  || "",
          barcodes:   it.barcodes || [],
          itemCode:   it.itemCode || "",
          isPackLot: false                     // <— normal items
        };
      });

      console.log(flatItems)
    /* ---------------- combine & store ---------------- */
    setAllItems([...flatItems]);
  } catch (err) {
    console.error("Fetch items error:", err.message);
  }
}

// useEffect(()=>{
//   if(!selectedWarehouse){
//     setAllItems([]);
//     return;
//   } 
  
//   const it=itemsG.filter((i) => i.warehouse?._id === selectedWarehouse);
//   console.log(it)
//   setAllItems(it);
// },[selectedWarehouse,itemsG]);


  async function loadNextInvoiceCode() {
    try {
      const year = new Date().getFullYear();
      // const [saleRes, posRes] = await Promise.all([
      //   axios.get(`${link}/api/sales`, authHeaders()),
      //   axios.get(`${link}/api/pos`, authHeaders()),
      // ]);
      // const sales = saleRes.data.sales || saleRes.data;
      // const poses = posRes.data.data || posRes.data;
       const {data} =await axios.get(`${link}/api/pos/invoice-code`, authHeaders());
      

let nextCode;

if (data) {
  // data = "SL/2025/00019240"
  const parts = data.split("/");  // ["SL", "2025", "00019240"]
  const seq = parseInt(parts[2], 10); 
  const padded = String(seq + 1).padStart(7, "0");
  nextCode = `SL/${year}/${padded}`;
} else {
  // First invoice of the year
  nextCode = `SL/${year}/0000001`;
}
      setInvoiceCode(nextCode);
    } catch (err) {
      console.error("Could not compute next code:", err);
      const year = new Date().getFullYear();
      setInvoiceCode(`SL/${year}/${String(new Date().getMonth() + 1).padStart(2, "0")}/`);
    }
  }

  async function fetchHeld() {
  
  }

  async function fetchPosById(id) {
    try {
      const { data } = await axios.get(`${link}/api/pos/${id}`, authHeaders());
      console.log("Fetched POS order:", data);
      return data.order || data;
    } catch (err) {
      console.error("Fetch POS by ID error:", err.message);
      alert(`Failed to load POS order: ${err.message}`);
      return null;
    }
  }

   
  

  async function deletePosTransaction(id) {
    try {
      await axios.delete(`${link}/api/pos/${id}`, authHeaders());
      setHeldInvoices((prev) => prev.filter((inv) => inv._id !== id));
      navigate("/sale-list");
    } catch (err) {
      console.error("Delete POS transaction error:", err.message);
      alert(`Failed to delete POS order: ${err.message}`);
    }
  }


  

  // ─── EDIT HYDRATION ─────────────────────────────────────────────────
 async function hydrateForEdit(inv) {
    console.log("Hydrating POS order:", inv);
        setExclusiveDiscount(inv.exclusiveDiscount || 0);
    let detectedPaymentMode = inv.paymentMode || "";
    if (!detectedPaymentMode) {
      if (inv.status === "OnHold") {
        detectedPaymentMode = "hold";
      } else if (inv.status === "Completed") {
        if (inv.payments?.length > 1) {
          detectedPaymentMode = "multiple";
        } else if (inv.payments?.length === 1) {
          const payment = inv.payments[0];
          const paymentType = paymentTypes.find((pt) => pt._id === payment.paymentType);
          if (paymentType?.paymentTypeName?.toLowerCase() === "cash") {
            detectedPaymentMode = "cash";
          } else if (paymentType?.paymentTypeName?.toLowerCase() === "bank" || payment.terminal) {
            detectedPaymentMode = "bank";
          } else {
            detectedPaymentMode = "multiple";
          }
        }
      }
    }

       const itemsWithLiveStock = await Promise.all(
    inv.items
      .map(async (i) => {
        const itemDoc = allItems.find(
          (ai) =>
            ai.parentId === i.item._id &&
            (!i.variant || ai._id === i.variant || ai.variantId === i.variant) &&
            ai.warehouse?._id === inv.warehouse?._id
        );
        if (!itemDoc) {
          console.warn("Invalid item in POS order:", {
            itemId: i.item?._id,
            variantId: i.variant,
            itemName: i.item?.itemName,
            warehouseId: inv.warehouse?._id,
          });
          return null;
        }
        const liveQty = await fetchLiveQty(inv.warehouse._id, i.variant || i.item._id);
        return {
          category: itemDoc.category || null,
          brand: itemDoc.brand || null,
          description: i.item.description || itemDoc.description || "",
          barcodes: itemDoc.barcodes || [],
          purchasePrice: itemDoc.purchasePrice || 0,
          item: i.item._id,
          variant: i.variant || null,
          itemName: itemDoc.itemName,
          itemCode: itemDoc.itemCode || "",
          openingStock: itemDoc.openingStock || 0,
          stock: liveQty,
          currentStock: liveQty,
          salesPrice: i.price || itemDoc.salesPrice || 0,
          quantity: i.quantity || 1,
          origQty: i.quantity || 1,
          discount: i.discount || 0,
          tax: i.tax?._id || itemDoc.tax?._id || null,
          taxRate: i.tax?.taxPercentage || itemDoc.tax?.taxPercentage || 0,
          unit: i.unit || itemDoc.unit || null,
          mrp: i.mrp || itemDoc.mrp || 0,
          expiryDate: itemDoc.expiryDate || null,
          subtotal:
            i.subtotal || (i.price || itemDoc.salesPrice || 0) * (i.quantity || 1) - (i.discount || 0),
        };
      })
  );

    setItems(itemsWithLiveStock);
    setInvoiceCode(inv.saleCode || "");
    setInvoiceCount(inv.invoiceCount || 0);
    setPreviousBalance(inv.previousBalance || 0);
    setCouponCode(inv.couponCode || "");
    setAdjustAdvancePayment(inv.advanceUsed > 0);
    setAdvancePaymentAmount(inv.advanceUsed || 0);

    // Validate and set customer
    const customerId = inv.customer?._id;
    if (!customerId || !customers.find((c) => c._id === customerId)) {
      console.warn("Invalid or missing customer ID:", customerId);
      const walkIn = customers.find((c) => c.customerName.toLowerCase() === "walk-in customer");
      setSelectedCustomer(walkIn?._id || "");
    } else {
      setSelectedCustomer(customerId);
    }

    // Validate and set warehouse
    const warehouseId = inv.warehouse?._id;
    if (!warehouseId || !warehouses.find((w) => w._id === warehouseId)) {
      console.warn("Invalid or missing warehouse ID:", warehouseId);
      setSelectedWarehouse(warehouses[0]?._id || "");
    } else {
      setSelectedWarehouse(warehouseId);
    }

    // Validate and set account
    const accountId = inv.account?._id;
    if (!accountId || !accounts.find((a) => a._id === accountId)) {
      console.warn("Invalid or missing account ID:", accountId);
      const warehouse = warehouses.find((w) => w._id === warehouseId);
      setSelectedAccount(warehouse?.cashAccount?._id || accounts[0]?._id || "");
    } else {
      setSelectedAccount(accountId);
    }

    setCurrentOrderId(inv._id);
    setOrderPaymentMode(detectedPaymentMode);
  }

  // calculate totals 
  useEffect(() => {
    let qty = 0,
      amt = 0,
      disc = 0;
    items.forEach((i) => {
      qty += i.quantity;
      amt += i.subtotal ;
      disc += i.discount || 0;
    });
   const df= amt <cart.deliveryThresholdAmount ? cart.deliveryFeeUnderThreshold : 0
    const totaladdititonal= additionalPaymentAmount.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    setAdditionalCharges(totaladdititonal);
    setQuantity(qty);
    setTotalAmount(amt + df + cart.handlingFee);
    setTotalDiscount(disc);
    setDeliveryFee((amt + totaladdititonal -exclusiveDiscount ) <cart.deliveryThresholdAmount ? cart.deliveryFeeUnderThreshold : 0);
    setProcessingFee(cart.handlingFee)
  }, [items,additionalPaymentAmount]);
  


  
useEffect(() => {
  const q = searchItemCode.trim();
  if (!q || !selectedWarehouse) return setFilteredItems([]);

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  // console.log(allItems)
  console.log("Filtering items with query:", q, "in warehouse:", selectedWarehouse);
  const filtered = allItems
    .filter((it) => {
      const inWarehouse = it.warehouse?._id === selectedWarehouse;

      const nameMatch = rx.test(String(it.itemName || ""));
      const codeMatch = rx.test(String(it.itemCode || ""));
      // const barcodeMatch = it.barcodes?.some((b) => rx.test(String(b))) ?? false;
      const barcodeMatch = it.barcodes?.some((b) => rx.test(String(b))) ?? false;

      return inWarehouse && (nameMatch || codeMatch || barcodeMatch);
    })
    .slice(0,20)

  setFilteredItems(filtered);
  // console.log("Filtered items:", filtered);
}, [searchItemCode, selectedWarehouse, allItems]);


  
 //find customer previous balance
  useEffect(() => {
    const c = customers.find((c) => c._id === selectedCustomer);
    setPreviousBalance(c?.previousDue || 0);
  }, [selectedCustomer, customers]);



//for account when warehouse changes
  useEffect(() => {
    const w = warehouses.find((w) => w._id === selectedWarehouse);
    if (w?.cashAccount?._id) setSelectedAccount(w.cashAccount._id);
    else if (accounts.length) setSelectedAccount(accounts[0]?._id);
  }, [selectedWarehouse, warehouses, accounts]);



  //find total number of items customers etc  are  loaded before hydrating 
 useEffect(() => {
  const ready = 
    orderToEdit &&
    customers.length > 0 &&
    warehouses.length > 0 &&
    accounts.length > 0 &&
    paymentTypes.length > 0 &&
    allItems.length > 0;

  console.log("🔍 hydrate ready?", {
    order: !!orderToEdit,
    cust: customers.length,
    wh: warehouses.length,
    accts: accounts.length,
    ptypes: paymentTypes.length,
    items: allItems.length
  });

  if (!ready) return;

  hydrateForEdit(orderToEdit);
  setOrderToEdit(null);
}, [orderToEdit, customers, warehouses, accounts, paymentTypes, allItems]);





function applyOfferLogic(itemList) {
  return itemList.map((item) => {
    const { discountPolicy, quantity, requiredQty, freeQty, salesPrice, discount = 0 } = item;

    if (discountPolicy === "BuyXGetY" && quantity >= requiredQty) {
      const groups = Math.floor(quantity / requiredQty); // how many times requiredQty fits
      const totalFree = groups * freeQty;
      const discountAmount = totalFree * salesPrice;

      return {
        ...item,
        subtotal: quantity * salesPrice - discountAmount,
        effectiveFreeQty: totalFree // optional: if you want to show how many were free
      };
    }

    return {
      ...item,
      subtotal: quantity * salesPrice
    };
  });
}

  // ─── ITEM HANDLERS ─────────────────────────────────────────────────
async function addItem(it) {
 
  if (!it || !it.parentId) {
    console.error("Invalid item, missing parentId:", it);
    return;
  }


   const liveQty = await fetchLiveQty(selectedWarehouse, it.variantId || it._id);
   it.currentStock=liveQty;
    if (liveQty <= 0) {
    Swal.fire("Out of stock", `"${it.itemName}" is out of stock in this warehouse.`, "warning");
    return;
  }
  if (!it || !it.parentId) {
    console.error("Invalid item, missing parentId:", it);
    return;
  }

  
  const parentExists = allItems.some(
    (ai) => ai._id === it.parentId && !ai.variantId
  );
  if (!parentExists && !it.variantId) {
    console.error(`Parent item not found for parentId: ${it.parentId}`, it);
    return;
  }

  if (it.variantId) {
    const variantValid = allItems.some(
      (ai) => ai._id === it.variantId && ai.parentId === it.parentId
    );
    if (!variantValid) {
      console.error(
        `Invalid variantId: ${it.variantId} for parentId: ${it.parentId}`,
        it
      );
      return;
    }
  }

  const quantityToAdd = it.quantity || 1;

  const existingIdx = items.findIndex(
    (r) => r.item === it.parentId && r.variant === (it.variantId || null)
  );

  if (existingIdx !== -1) {
    // Item already exists → update quantity by quantityToAdd
    const updated = [...items];
    const existing = updated[existingIdx];
    const newQty = existing.quantity + quantityToAdd;

    if (newQty <= existing.currentStock) {
      playSound("/sounds/item-exists.mp3");
      updated[existingIdx] = {
        ...existing,
        quantity: newQty,
        subtotal: newQty * existing.salesPrice - ( 0),
      };

      const updatedWithOffer = applyOfferLogic(updated); // 🔁 OFFER HERE
      setItems(updatedWithOffer);
      setSearchItemCode("");
      return;
    }

    setSearchItemCode("");
    return;
  } else {
    playSound("/sounds/item-added.mp3");
    const newItem = {
      barcode: it.barcode || "",
      barcodes: it.barcodes || [],
      category: it.category || null,
      brand: it.brand || null,
      offer:it.offer,
      discountPolicy: it.discountPolicy || "None",
      requiredQty: it.requiredQuantity || 0,
      freeQty: it.freeQuantity || 0,
      stock: it.currentStock || 0,
      item: it.parentId,
      variant: it.variantId || null,
      itemName: it.itemName,
      itemCode: it.itemCode || "",
      openingStock: it.openingStock || 0,
      currentStock:
        it.currentStock != null ? it.currentStock : it.openingStock || 0,
      salesPrice: it.salesPrice || 0,
      quantity: quantityToAdd,
      discount:  0,
      tax: it.tax?._id || null,
      taxRate: it.tax?.taxPercentage || 0,
      unit: it.unit || null,
      mrp: it.mrp || 0,
      expiryDate: it.expiryDate || null,
      subtotal: quantityToAdd * (it.salesPrice || 0) - (0),
      description: it.description || "",
      purchasePrice: it.purchasePrice || 0,
    };

    if (newItem.salesPrice <= 0) {
      alert("Item sales price must be greater than zero.");
      return;
    }
  //  console.log(newItem)
    const updatedWithNewItem = [newItem,...items];
    const updatedWithOffer = applyOfferLogic(updatedWithNewItem); // 🔁 OFFER HERE
   
    setItems(updatedWithOffer);
    setSearchItemCode("");
  }
}




async function addItemsInBatch(matchedItems) {
  let updated = [...items];

  for (const it of matchedItems) {
    if (!it || !it.parentId) {
      console.error("Invalid item, missing parentId:", it);
      continue;
    }


    const liveQty = await fetchLiveQty(selectedWarehouse, it.variantId || it._id);
   it.currentStock=liveQty;
    if(it.currentStock<=0){
      continue;
    }
    const parentExists = allItems.some(
      (ai) => ai._id === it.parentId && !ai.variantId
    );
    if (!parentExists && !it.variantId) {
      console.error(`Parent item not found for parentId: ${it.parentId}`, it);
      continue;
    }

    if (it.variantId) {
      const variantValid = allItems.some(
        (ai) => ai._id === it.variantId && ai.parentId === it.parentId
      );
      if (!variantValid) {
        console.error(
          `Invalid variantId: ${it.variantId} for parentId: ${it.parentId}`,
          it
        );
        continue;
      }
    }

    const quantityToAdd = it.quantity || 1;
    const existingIdx = updated.findIndex(
      (r) => r.item === it.parentId && r.variant === (it.variantId || null)
    );

    if (existingIdx !== -1) {
      const existing = updated[existingIdx];
      const newQty = existing.quantity + quantityToAdd;

      if (newQty <= existing.currentStock) {
        playSound("/sounds/item-exists.mp3");
        updated[existingIdx] = {
          ...existing,
          quantity: newQty,
          subtotal: newQty * existing.salesPrice - (0),
        };
      }
      continue;
    } else {
      playSound("/sounds/item-added.mp3");
      const newItem = {
        description: it.description || "",
        offer:it.offer ,
        discountPolicy: it.discountPolicy || "None",
        requiredQty: it.requiredQuantity || 0,
        freeQty: it.freeQuantity || 0,
        stock: it.currentStock || 0,
        item: it.parentId,
        variant: it.variantId || null,
        itemName: it.itemName,
        itemCode: it.itemCode || "",
        openingStock: it.openingStock || 0,
        currentStock:
          it.currentStock != null ? it.currentStock : it.openingStock || 0,
        salesPrice: it.salesPrice || 0,
        quantity: quantityToAdd,
        discount:  0,
        tax: it.tax?._id || null,
        taxRate: it.tax?.taxPercentage || 0,
        unit: it.unit || null,
        mrp: it.mrp || 0,
        expiryDate: it.expiryDate || null,
        purchasePrice: it.purchasePrice || 0,
        subtotal:
          quantityToAdd * (it.salesPrice || 0) - (0),
      };

      if (newItem.salesPrice <= 0) {
        alert("Item sales price must be greater than zero.");
        continue;
      }

      updated.unshift(newItem);

    }
  }

  const updatedWithOffer = applyOfferLogic(updated);
  setItems(updatedWithOffer);
  setSearchItemCode("");
}


async function updateItem(idx, field, val) {
  const numericVal = Number(val);
  const row = items[idx];
  // console.log(row)
  // ❗ Prevent salesPrice > MRP
  if (field === "salesPrice" && numericVal > row.mrp) {
    alert(`❗ Sales Price (${numericVal}) cannot exceed the MRP (${row.mrp})`);
    return;
  }

  // ❗ Prevent salesPrice <= 0
  if (field === "salesPrice" && numericVal <= 0) {
    alert(`${field.charAt(0).toUpperCase() + field.slice(1)} must be greater than zero.`);
    return;
  }

  
  if (field === "quantity") {
      const liveQty = await fetchLiveQty(selectedWarehouse, row.variant || row.item);
    const available = (row.origQty || 0) + liveQty;
    if(numericVal > available) 
    return;
  }

  const updatedItems = items.map((r, i) =>
    i === idx
      ? {
          ...r,
          [field]: numericVal || 0,
        }
      : r
  );

  const withOffer = applyOfferLogic(updatedItems);

  // ✅ Ensure all subtotals are accurate after offer logic
  

  setItems(withOffer);
}




  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // ─── PDF GENERATION ────────────────────────────────────────────────
  const generateInvoicePDF = (order, payments) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text("Invoice", 14, 20);
    doc.setFontSize(12);
    doc.text(`Invoice #: ${order.saleCode || "N/A"}`, 14, 30);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 38);
    doc.text(`Source: POS`, 14, 46);

    // Customer Information
    const customer = customers.find((c) => c._id === selectedCustomer);
    doc.setFontSize(14);
    doc.text("Customer Information", 14, 60);
    doc.setFontSize(12);
    doc.text(`Name: ${customer?.customerName || "N/A"}`, 14, 70);
    doc.text(`Mobile: ${customer?.mobile || "N/A"}`, 14, 78);
    const addrObj = customer?.address || {};
    const addrStr = [
      addrObj.street,
      addrObj.city,
      addrObj.state,
      addrObj.zip,
      addrObj.country,
    ]
      .filter((part) => typeof part === "string" && part.trim() !== "")
      .join(", ");
    doc.text(`Address: ${addrStr || "N/A"}`, 14, 86);

    // Items Table
    doc.setFontSize(14);
    doc.text("Items", 14, 100);
    const itemRows = items.map((item) => [
      item.itemName || "N/A",
      item.quantity || 0,
      `Rs. ${(item.salesPrice || 0).toFixed(2)}`,
      `Rs. ${(item.discount || 0).toFixed(2)}`,
      `Rs. ${(item.subtotal || 0).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: 106,
      head: [["Item Name", "Quantity", "Unit Price", "Discount", "Subtotal"]],
      body: itemRows,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [0, 123, 255] },
    });

    // Totals
    let finalY = doc.lastAutoTable.finalY || 106;
    doc.setFontSize(12);
    doc.text(`Subtotal: Rs. ${(totalAmount || 0).toFixed(2)}`, 14, finalY + 10);
    doc.text(`Discount: Rs. ${(totalDiscount || 0).toFixed(2)}`, 14, finalY + 18);
    doc.text(`Grand Total: Rs. ${(totalAmount - totalDiscount).toFixed(2)}`, 14, finalY + 26);

    // Payments (if any)
    if (payments && payments.length > 0) {
      finalY = finalY + 34;
      doc.setFontSize(14);
      doc.text("Payments", 14, finalY);
      const paymentRows = payments.map((payment) => {
        const paymentType = paymentTypes.find((pt) => pt._id === payment.paymentType);
        return [
          new Date().toLocaleDateString(),
          paymentType?.paymentTypeName || "N/A",
          `Rs. ${(payment.amount || 0).toFixed(2)}`,
          payment.paymentNote || "-",
        ];
      });

      autoTable(doc, {
        startY: finalY + 6,
        head: [["Date", "Payment Type", "Amount", "Note"]],
        body: paymentRows,
        theme: "striped",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 123, 255] },
      });

      finalY = doc.lastAutoTable.finalY;
      const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      doc.setFontSize(12);
      doc.text(`Total Paid: Rs. ${totalPaid.toFixed(2)}`, 14, finalY + 10);
      const dueAmount = totalAmount - totalDiscount - totalPaid;
      doc.text(`Due Amount: Rs. ${dueAmount.toFixed(2)}`, 14, finalY + 18);
    }

    // Footer
    finalY = payments && payments.length > 0 ? finalY + 26 : finalY + 34;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your business!", 14, finalY + 10);
    doc.text(`Generated by ${storeName || "Grocery on Wheels"}`, 14, finalY + 16);

    // Open PDF in a new tab
    const pdfBlob = doc.output("blob");
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, "_blank");
  };

  // ─── PAYMENT / ORDER LOGIC ──────────────────────────────────────────
 async function buildPayload({l, status, payments, paymentMode }) {
    console.log("Building payload with:", {
      selectedWarehouse,
      selectedCustomer,
      selectedAccount,
      items,
      status,
      paymentMode,
    });

    if (!selectedWarehouse) {
      throw new Error("Warehouse is required");
    }
    if (!selectedCustomer) {
      throw new Error("Customer is required");
    }
    if (!selectedAccount) {
      throw new Error("Account is required");
    }
  //  console.log("Please fill all required fields");
   
   
   
  const validItems = items
    .map((it) => {
      const isValid = allItems.some(
        (ai) =>
          ai.parentId === it.item &&
          (!it.variant || ai._id === it.variant || ai.variantId === it.variant) &&
          ai.warehouse?._id === selectedWarehouse
      );
      if (!isValid) {
        console.error("Invalid item in payload:", {
          itemId: it.item,
          variantId: it.variant,
          itemName: it.itemName,
          itemCode: it.itemCode,
        });
        return null;
      }
      return {
        item: it.item,
        variant: it.variant || null,
        quantity: it.quantity,
        origQty: it.origQty,
        price: it.salesPrice,
        discount: it.discount || 0,
        unit: it.unit,
        tax: it.tax,
        subtotal: it.subtotal,
      }; 
    })
    .filter((it) => it !== null);
  
  
    if (validItems.length === 0) {
      throw new Error("No valid items to save. Please add valid items to the order.");
    }
 
    const stockErrors = [];

     for (const it of validItems) {
    const liveQty = await fetchLiveQty(selectedWarehouse, it.variant || it.item);
    const previousQty = it.origQty || 0;
    const liveAvailable = liveQty + previousQty;
    if (it.quantity > liveAvailable) {
      const name = items.find(r => r.item === it.item && r.variant === it.variant)?.itemName || "Item";
      stockErrors.push(
        `"${name}" – requested ${it.quantity}, available ${liveAvailable}`
      );
    }
  }

    if (validItems.length === 0) {
      throw new Error("No valid items to save. Please add valid items to the order.");
    }
    
     if (stockErrors.length) {

    throw new Error("Stock validation failed");
  }
    
    const payload = {
      orderId: orderId || null,
      customerModel:"Customer",
      location:l,
      warehouse: selectedWarehouse,
      customer: selectedCustomer,
      account: selectedAccount,
      items: validItems,
      additionalCharges: additionalCharges,
      additionalPayment: additionalPaymentAmount,
      exclusiveDiscount: exclusiveDiscount,
      totalAmount: totalAmount - totalDiscount+additionalCharges - exclusiveDiscount,
      totalDiscount,
      couponCode: couponCode || undefined,
      payments,
      status,
      paymentMode,
      invoiceCount,
      invoiceCode,
      previousBalance,
      adjustAdvancePayment,
      advancePaymentAmount,
     deliveryFee,
     processingFee
    };

    console.log("Generated payload:", payload);
    return payload;
  }

  async function sendOrder(payloadParams, method = "post", id) {
  try {
    const payload = await buildPayload(payloadParams);
    console.log("Sending order with payload:", payload);
    /* ---- 2️⃣ Save the order ---- */
    const url  = id ? `${link}/api/pos/${id}` : `${link}/api/pos/order`;
    const { data } = await axios[method](url, payload, authHeaders());
     console.log("Order saved:", data);
     await axios.put(`https://pos.inspiredgrow.in/vps/api/orders/update-status/${orderId}`,
      {status:"Delivered",fromPos:true},
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
     )
     await axios.put(`https://pos.inspiredgrow.in/vps/api/orders/update-items`,{
      orderId,items:payload.items
     },{
      headers:{
        Authorization:`Bearer ${localStorage.getItem("token")}`
      }
     })
    /* ---- 3️⃣ Build the final invoice HTML ---- */
    const custObj = customers.find(c => c._id === selectedCustomer) || {};
     
    const r= buildInvoiceHTML(
      data.order,
      payload.payments,
      storeInfo,
      custObj,
      items,
      sellerDisplayName(user),
      setActiveTab,setPrint,exclusiveDiscount          
    );
    console.log("Generated invoice HTML:", r);
    setPrint(r);
    setActiveTab("print")
    /* ---- 5️⃣ House-keeping ---- */
    setInvoiceCode(data.order.saleCode);
    resetForm();
    fetchHeld();
  } catch (err) {
    // if (previewWin) previewWin.close();   // don’t leave a blank tab
    console.error("Send order error details:", err);
    Swal.fire("Error", err.response?.data?.message || err.message, "error");
  }
  }

  function resetForm() {
    setItems([]);
    setAdditionalCharges(0);
    setAdditionalPaymentAmount([]);
    setQuantity(0);
    setTotalAmount(0);
    setTotalDiscount(0);
    loadNextInvoiceCode();
    setInvoiceCount(0);
    setPreviousBalance(0);
    setCouponCode("");
    setAdjustAdvancePayment(false);
    setAdvancePaymentAmount(0);
    setCurrentOrderId("");
    setSelectedCustomer(customers[0]?._id || "");
    setSelectedWarehouse(localStorage.getItem("defaultWarehouse") || null);
    setSelectedAccount(accounts[0]?._id || "");
    setOrderPaymentMode("");
  }

 async function onHold() {
  // 0️⃣  Fancy confirm dialog -----------------------
  const { isConfirmed } = await Swal.fire({
    title: "Put order on hold?",
    text: "Are you sure you want to add this order to held invoices?",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#d33",       // red – matches your Hold button
    cancelButtonColor: "#3085d6",     // blue
    confirmButtonText: "Yes, Hold",
  });
  if (!isConfirmed) return;           // user aborted
  // 1️⃣  Basic validation (unchanged) --------------
  if (!selectedWarehouse || !selectedCustomer || !selectedAccount) {
    Swal.fire("Missing data", "Warehouse, customer and account are required.", "warning");
    return;
  }
  
  // 2️⃣  Find Hold payment type --------------------
  const pt = getPaymentTypeId("Hold");
  if (!pt) {
    Swal.fire("Config error", "Payment type 'Hold' is missing.", "error");
    return;
  }

  
   
  const validItems = items
    .map((it) => {
      const isValid = allItems.some(
        (ai) =>
          ai.parentId === it.item &&
          (!it.variant || ai._id === it.variant || ai.variantId === it.variant) &&
          ai.warehouse?._id === selectedWarehouse
      );
      if (!isValid) {
        console.error("Invalid item in payload:", {
          itemId: it.item,
          variantId: it.variant,
          itemName: it.itemName,
          itemCode: it.itemCode,
        });
        return null;
      }
      return {
        item: it.item,
        variant: it.variant || null,
        quantity: it.quantity,
        origQty: it.origQty,
        price: it.salesPrice,
        discount: it.discount || 0,
        unit: it.unit,
        tax: it.tax,
        subtotal: it.subtotal,
      }; 
    })
    .filter((it) => it !== null);
  
    
  const a = await getLocation();;
  const totalOther=additionalPaymentAmount.reduce((sum, p) => sum + (p.amount || 0), 0);
    const shippingFee=totalAmount < cart.deliveryThresholdAmount? cart.deliveryFeeUnderThreshold : 0
  // 3️⃣  Build payload (your code) -----------------

  const payload = {
    location:a,
    warehouse: selectedWarehouse,
    orderId: orderId || null,
    customerModel:"Customer",
    customer: selectedCustomer,
    account: selectedAccount,
    items: validItems,
    additionalCharges: additionalCharges,
    additionalPayment: additionalPaymentAmount,
    exclusiveDiscount: exclusiveDiscount,
    totalAmount: totalAmount - totalDiscount+additionalCharges - exclusiveDiscount,
    totalDiscount,
    couponCode: couponCode || undefined,
    payments: [
      {
        paymentType: pt,
        amount: totalAmount - totalDiscount+additionalCharges - exclusiveDiscount,
        paymentNote: "Hold payment",
      },
    ],
    status: "OnHold",
    paymentMode: "hold",
    invoiceCount,
    invoiceCode,
    previousBalance,
    adjustAdvancePayment,
    advancePaymentAmount,
   deliveryFee,
   processingFee
  };
  
  // const payload = {
  //   location: a,
  //   warehouse: selectedWarehouse,
  //   customer: selectedCustomer,
  //   account: selectedAccount,
  //   items: items.map((it) => ({
  //     item: it.item,
  //     variant: it.variant || null,
  //     quantity: it.quantity,
  //     price: it.salesPrice,
  //     discount: it.discount || 0,
  //     unit: it.unit,
  //     tax: it.tax,
  //     subtotal: it.subtotal,
  //   })),
  //   totalAmount: totalAmount - totalDiscount,
  //   totalDiscount,
  //   payments: [
  //     {
  //       paymentType: pt,
  //       amount: totalAmount - totalDiscount ,
  //       paymentNote: "Hold payment",
  //     },
  //   ],
  //   status: "OnHold",
  //   paymentMode: "hold",
  //   invoiceCount,
  //   previousBalance,
  //   adjustAdvancePayment,
  //   advancePaymentAmount,
  //   couponCode: couponCode || undefined,
  // };
  
  // 4️⃣  POST / PUT exactly as before --------------
  try {
    console.log(payload)
    const token = localStorage.getItem("token");
    if (currentOrderId) {
      await axios.put(`${link}/api/pos/${currentOrderId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
    } else {
      await axios.post(`${link}/api/pos`, payload, { headers: { Authorization: `Bearer ${token}` } });
    }
    await fetchHeld();
    Swal.fire("Held!", "Order has been moved to held invoices.", "success");
  } catch (err) {
    console.error("Hold error:", err);
    Swal.fire("Error", err.response?.data?.message || err.message, "error");
  }
}

  
  async function onOpenModal(mode) {
    if (!editId || mode === "multiple") {
      if (!selectedWarehouse || !selectedCustomer || !selectedAccount) {
        alert("Please select a warehouse, customer, and account before proceeding with payment.");
        return;
      }
    }



    
    if (!items.length) {
      alert("Please add at least one item to the order.");
      return;
    }

    if (mode === "cash" || mode === "bank") {
      const paymentTypeId = getPaymentTypeId(mode);
      if (!paymentTypeId) {
        alert(
          `Missing payment type: ${mode.charAt(0).toUpperCase() + mode.slice(1)}. Please ensure it is configured.`
        );
        return;
      }

      const payment = {
        paymentType: paymentTypeId,
        amount: totalAmount - totalDiscount+additionalCharges-exclusiveDiscount,
        paymentNote: `${mode.charAt(0).toUpperCase() + mode.slice(1)} payment`,
      };

      if (mode === "bank") {
        if (terminals.length > 0) {
          payment.terminal = terminals[0]._id;
        }
      }
      const p=await getLocation();
      try {
        sendOrder(
          {status: "Completed", payments: [payment], paymentMode: mode, l:p},
          currentOrderId ? "put" : "post",
          currentOrderId
        );
      } catch (err) {
        alert(err.message);
      }
    
      
    } else {
      setPaymentMode(mode);
      setIsPaymentModalOpen(true);
    }
  }


  
  const sellerDisplayName = (u = {}) =>
  // ① show what’s in the navbar
  u.name?.trim() ||
  // ② otherwise try first + last
  [u.FirstName, u.LastName].filter(Boolean).join(" ").trim() ||
  // ③ fall back to email or phone
  u.userName || u.Mobile || "–";
  const storeInfo = {
  logo:        "/logo/inspiredgrow.jpg",                       //  40-50 px square looks right
  storeName:   storeName,                                //  already in state
  tagline:     "GROCERY ON WHEELS",
  address:     "Basement 210-211 new Rishi Nagar near Shree Shyam Baba Mandir Gali No. 9, Hisar – 125001",
  gst:         "06AAGCI0630K1ZR",
  phone:       "9050092092",
  email:       "INSPIREDGROW@GMAIL.COM",
};

  // ─── HELPER: Edit / Delete held invoices ─────────────────────────────
  async function handleEditInvoice(id) {
    const inv = await fetchPosById(id);
    if (!inv) return;
    hydrateForEdit(inv);
    setShowHoldList(false);
  }

  async function handleDeleteInvoice(id) {
    if (!window.confirm("Delete this held invoice?")) return;
    await deletePosTransaction(id);
  }


  function toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────
  const paymentSummary = {
    totalItems: quantity,
    totalPrice: totalAmount,
    discount: totalDiscount,
    couponDiscount: 0,
    totalPayable: totalAmount - totalDiscount + additionalCharges,
    totalPaying: 0,
    balance: totalAmount - totalDiscount + additionalCharges,
    changeReturn: 0,
  };

  const buttonStyles = {
    hold: orderPaymentMode === "hold" ? "border-4 border-yellow-400 shadow-lg" : "border border-gray-300",
    multiple: orderPaymentMode === "multiple" ? "border-4 border-yellow-400 shadow-lg" : "border border-gray-300",
    cash: orderPaymentMode === "cash" ? "border-4 border-yellow-400 shadow-lg" : "border border-gray-300",
    bank: orderPaymentMode === "bank" ? "border-4 border-yellow-400 shadow-lg" : "border border-gray-300",
  };


  
  if (isLoadingEdit) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex flex-col min-h-screen ">
      {/* Navbar */}
<nav className="sticky top-0 z-50 flex flex-col items-center justify-between gap-2 px-6 pt-4 text-white bg-gray-900 md:gap-0 md:flex-row">
        <div className="flex items-center gap-4">
          <h1
            className="text-xl font-bold transition-colors cursor-pointer hover:text-yellow-400"
            onClick={() => navigate("/dashboard")}
          >
            {storeName || "Grocery on Wheels"}
          </h1>
          <button
            className="text-2xl transition-colors md:hidden hover:text-yellow-400"
            onClick={() => setShowHoldList((v) => !v)}
          >
            <FaBars />
          </button>
        
        </div>
        <div className="items-center hidden gap-4 md:flex">
          <div
            className="relative text-sm transition-colors cursor-pointer hover:text-yellow-400"
            onClick={() => setShowHoldList((v) => !v)}
          >
            Hold List{" "}
            <span className="absolute px-2 py-1 text-xs bg-red-600 rounded-full -top-2 -right-3">
              {heldInvoices.length}
            </span>
          </div>
          <FaWindowMaximize
            className="text-xl transition-colors cursor-pointer hover:text-yellow-400"
            onClick={toggleFullScreen}
          />
          
        
        </div>
      </nav>

      {/* Held invoices */}
      {showHoldList && (
  <div className="absolute z-20 p-4 bg-white border border-gray-200 rounded-lg shadow-xl top-16 right-4 w-80">
    <h3 className="mb-3 text-lg font-bold text-gray-800">Held Invoices</h3>
    {heldInvoices.length ? (
      heldInvoices.map((inv) => (
        <div
          key={inv._id}
          className="flex items-center justify-between p-3 mb-2 transition bg-white border-l-4 rounded-lg border-cyan-500 hover:bg-gray-50"
        >
          {/* Show saleCode if available, otherwise first item name */}
          <div className="flex flex-col">
            <span className="font-semibold text-gray-800">
              {inv.saleCode || inv.items?.[0]?.itemName || inv._id.slice(0, 6)}
            </span>
            {inv.items?.length > 1 && (
              <span className="text-xs text-gray-500">
                +{inv.items.length - 1} more item{inv.items.length - 1 > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleEditInvoice(inv._id)}
              className="font-medium text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              onClick={() => handleDeleteInvoice(inv._id)}
              className="font-medium text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      ))
    ) : (
      <p className="text-sm text-gray-500">No held invoices</p>
    )}
  </div>
)}

      {/* Main content */}
      <div className="flex flex-col bg-white lg:flex-row">
           {activeTab==="pos1" && <POS1 selectedWarehouse={selectedWarehouse} setSelectedWarehouse={setSelectedWarehouse} warehouses={warehouses} invoiceCode={invoiceCode} selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer}
                       customers={customers} setActiveTab={setActiveTab}  
                           filteredItems={filteredItems} scanning={scanning} setScanning={setScanning}  orderPaymentMode={orderPaymentMode}    
                          previousBalance={previousBalance}
           />}
           {activeTab==="pos2" && <POS2 updateItem={updateItem} addItemsInBatch={addItemsInBatch} matchedItems={matchedItems} setMatchedItems={setMatchedItems}  searchItemCode={searchItemCode} setActiveTab={setActiveTab} setSearchItemCode={setSearchItemCode}  removeItem={removeItem} items={items} setItems={setItems} 
                                            allItems={allItems} addItem={addItem}  setScanning={setScanning} selectedWarehouse={selectedWarehouse}  filteredItems={filteredItems} scanning={scanning} orderPaymentMode={orderPaymentMode}    
           />}
           {activeTab==="pos3" && <POS3 deliveryFee={deliveryFee} processingFee={processingFee} exclusiveDiscount={exclusiveDiscount} editId={editId} additionalCharges={additionalCharges} additionalPaymentAmount={additionalPaymentAmount} setAdditionalPaymentAmount={setAdditionalPaymentAmount} setItems={setItems} isSubmitting={isSubmitting} setIsSubmitting={setIsSubmitting} allItems={allItems} showHoldList={showHoldList} heldInvoices={heldInvoices} handleEditInvoice={handleEditInvoice}
           handleDeleteInvoice={handleDeleteInvoice} selectedWarehouse={selectedWarehouse} warehouses={warehouses} setSelectedWarehouse={setSelectedWarehouse}  setActiveTab={setActiveTab}
           invoiceCode={invoiceCode} selectedCustomer={selectedCustomer} setSelectedCustomer={setSelectedCustomer} searchItemCode={searchItemCode} setSearchItemCode={setSearchItemCode}  addItem={addItem}
           filteredItems={filteredItems}  scanning={scanning} setScanning={setScanning} orderPaymentMode={orderPaymentMode} items={items} updateItem={updateItem} removeItem={removeItem}
           onHold={onHold} previousBalance={previousBalance} buttonStyles={buttonStyles} onOpenModal={onOpenModal} quantity={quantity} totalAmount={totalAmount} totalDiscount={totalDiscount} couponCode={couponCode} setCouponCode={setCouponCode}
           isPaymentModalOpen={isPaymentModalOpen} PaymentModal={PaymentModal} setIsPaymentModalOpen={setIsPaymentModalOpen} paymentTypes={paymentTypes} accounts={accounts} terminals={terminals} advancePaymentAmount={advancePaymentAmount} selectedAccount={selectedAccount} setSelectedAccount={setSelectedAccount}
           paymentSummary={paymentSummary} sendOrder={sendOrder} buildPayload={buildPayload} currentOrderId={currentOrderId} setAdjustAdvancePayment={setAdjustAdvancePayment} customers={customers}
/>}       
           {activeTab==="print" && <Print setActiveTab={setActiveTab} print={print}/>}
      </div>
    </div>
  );
}