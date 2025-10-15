require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "2016Keshav@1",  // 👈 wahi password jo PHP me diya tha
  database: "db_catlouge",
   port: 3306
});
pool.getConnection()
  .then((connection) => {
    console.log("MySQL connected successfully!");
    connection.release();
  })
  .catch((error) => {
    console.error("Error connecting to MySQL:", error);
  });




const path = require("path");
const fs = require("fs");




// Import Routes
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const UsersRoutes = require("./routes/UsersRoutes");
const roleRoutes = require("./routes/roleRoutes");
const storeRoutes = require("./routes/storeRoutes");
const messageRoutes = require("./routes/messageRoutes");
const customerRoutes = require("./routes/customerRoutes");
const deliveryAgentRoutes = require("./routes/deliveryAgentRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const itemRoutes = require("./routes/itemRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const brandRoutes = require("./routes/brandRoutes");
const variantRoutes = require("./routes/variantRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const stockAdjustmentRoutes = require("./routes/stockAdjustmentRoutes");
const stockTransferRoutes = require("./routes/stockTransferRoutes");
const taxRoutes = require("./routes/taxRoutes");
const unitRoutes = require("./routes/unitRoutes");
const paymentTypeRoutes = require("./routes/paymentTypeRoutes");
const customerDataRoutes = require("./routes/customerDataRoutes");
const advancePaymentRoutes = require("./routes/advancePaymentRoutes");
const accountRoutes = require("./routes/accountRoutes");
const moneyTransferRoutes = require("./routes/moneyTransferRoutes");
const depositRoutes = require("./routes/depositRoutes");
const cashTransactionRoutes = require("./routes/cashTransactionRoutes.js");
const posRoutes = require("./routes/posRoutes");
const salesRoutes = require("./routes/salesRoutes");
const salesReturnRoutes = require("./routes/salesReturnRoutes");
const discountCouponRoutes = require("./routes/discountCouponRoutes");
const customerCouponRoutes = require("./routes/customerCouponRoutes");
const quotationRoutes = require("./routes/quotationRoutes");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const posSettingsRoutes = require("./routes/posSettingsRoutes");

const countryStateRoutes = require("./routes/countryStateRoutes");

const wishlistRoutes = require("./routes/wishlistRoutes");
const cartRoutes = require("./routes/cartRoutes");


const Add_deliveryBoyRoutes = require('./routes/AddDeliveryBoyRoutes');
const mybookingRoutes = require('./routes/mybookingRoutes');
const vandeliveryBoyRoutes = require('./routes/VandeliveryBoyRoutes');
const userslotpageRoutes = require("./routes/UserSlotPageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const subcategoryRoutes  = require("./routes/subcategoryRoutes");
const SubSubCategoryRoutes = require("./routes/SubSubCategoryRoutes");


const subscriptionRoutes = require("./routes/subscriptionRoutes");
const bannerRoutes=require("./routes/bannerRoutes.js")
const MarketingItemRoutes=require("./routes/marketingItemRoutes.js")
const ProductRoutes=require("./routes/ProductRoutes.js")
const NewCustomerRoutes=require("./routes/newCustomerRoutes")
const riderRoutes=require("./routes/RiderRoutes.js")
const locationRoutes=require("./routes/locationroutes.js")
const orderRoutes=require("./routes/OrderRoutes.js")
const deliveryslotRoutes=require("./routes/deliveryslotRoutes.js")
const app = express();
 const riderTransfer=require("./routes/RiderMoneyDepositRoutes.js")
   const ridercommission=require("./routes/riderCommissionRoutes")
   const riderAccount=require("./routes/riderAccountRoutes.js")
   const audit=require("./routes/AuditRoutes.js")
   const terminalRoutes = require("./routes/terminalRoutes");
const cashSummaryRoutes = require("./routes/cashSummaryRoutes");
// const path = require("path");
const ledgerRoutes = require('./routes/ledger');
const listEndpoints = require('./routes/listEndpoints');
// const deliverySlotRoutes= require('./routes/deliverySlotRoutes');
const printRoutes=require("./routes/printRoutes.js")
const orderPaymentRoutes = require('./routes/orderPaymentRoutes');
const checkout=require("./routes/checkoutRoutes.js")
const cardRoutes = require("./routes/cardRoutes.js");
 const location = require("./routes/location.js");




// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
//     // Reflect the origin back in the response
//     callback(null, origin);
//   },
//   credentials: true,
// }));


app.use(cors({
  // origin: 'http://localhost:3000',  // 👈 allow frontend origin
  origin: '*',  // 👈 allow frontend origin
  credentials: true                 // 👈 if using cookies/auth headers
}));






app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB Connection Error:", err));


console.log("🔑 JWT_SECRET:", process.env.JWT_SECRET);
// app.use('/public', express.static('public'));



app.use("/api/way",location);
app.use("/print",printRoutes)
app.use("/auth", authRoutes);
app.use("/api/card", cardRoutes);
app.use("/admin", userRoutes);
app.use("/admiaddinguser", UsersRoutes);
app.use("/admincreatingrole", roleRoutes);
app.use("/admin/store", storeRoutes);
app.use("/api/message", messageRoutes);
app.use("/customer", customerRoutes);
app.use("/delivery-agent", deliveryAgentRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api", itemRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api", warehouseRoutes);
app.use("/api/stock-adjustments", stockAdjustmentRoutes);
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api", taxRoutes);
app.use("/api", unitRoutes);
app.use("/api", paymentTypeRoutes);
app.use("/api/customer-data", customerDataRoutes);
app.use("/api/advance-payments", advancePaymentRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/money-transfers", moneyTransferRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/cash-transactions", cashTransactionRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/sales-return", salesReturnRoutes);
app.use("/api/discount-coupons", discountCouponRoutes);
app.use("/api/customer-coupons", customerCouponRoutes);
app.use("/api/quotation", quotationRoutes);
app.use("/api", dashboardRoutes);
app.use("/api/pos-settings", posSettingsRoutes);
app.use("/api", countryStateRoutes);
app.use("/api", subscriptionRoutes);



app.use("/wishlist", wishlistRoutes);
app.use("/cart", cartRoutes);
app.use('/api/orders', orderRoutes);

app.use('/api', Add_deliveryBoyRoutes);
app.use('/api', mybookingRoutes);
app.use('/api/van-delivery-boys',vandeliveryBoyRoutes);


// app.use('/api', deliverySlotRoutes);

app.use('/api/notification', notificationRoutes);
app.use("/api/userslot",userslotpageRoutes);
app.use("/api/subcategories",  subcategoryRoutes);
app.use("/api/sub-subcategories", SubSubCategoryRoutes);
app.use('/api', terminalRoutes);
app.use("/api", cashSummaryRoutes);
app.use("/api/payments", require("./routes/payments"));


app.use("/api/product", ProductRoutes);
app.use('/api/ledger', ledgerRoutes);
app.use("/api", listEndpoints);
app.use("/api", require("./routes/cashSaleDetails"));
app.use("/api/deletion-requests", require("./routes/deletionRequests"));
app.use("/api/push", require("./routes/pushRoutes"));
app.use("/api/chat", require("./routes/chatRoutes"));
app.use("/api/location", require("./routes/locationroutes.js"));
app.use("/customer",   require("./routes/publicItemRoutes"));
app.use('/customer/api', require('./routes/publicCategoryRoutes'));
app.use('/customer/api', require('./routes/publicSubcategoryRoutes'));
app.use('/customer/api', require('./routes/publicSubSubCategoryRoutes'));
app.use('/api/addresses', require('./routes/addressRoutes'));

app.use("/api/audit",audit)
app.use("/api/rider",riderRoutes)
app.use("/api/money-transfer",riderTransfer)
app.use("/api/rider-commission",ridercommission)
app.use("/api/rider-account",riderAccount)
app.use("/api/banner" ,bannerRoutes);
app.use("/api/marketing-item", MarketingItemRoutes);
app.use("/api/product", ProductRoutes);
app.use("/api/delivery/slot",deliveryslotRoutes)
app.use('/api/customer',NewCustomerRoutes)
app.use("/api",locationRoutes)
app.use("/api/order",orderRoutes)
app.get("/api/ping", (req, res) => res.json({ status: "ok" }));

// order payment routes
app.use('/api/order-payments', orderPaymentRoutes);


//checkout routes
app.use("/api/checkout",checkout)


// app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// app.use("/uploads", express.static(path.join(__dirname, "/uploads")));


app.use(
  "/api/warehouse-location",
  require("./routes/warehouseLocationRoutes")
);

// app.use(express.static(path.join(__dirname, "../frontend/build")));
// app.get("*", (req, res) =>
//   res.sendFile(path.join(__dirname, "../frontend/build/index.html"))
// );




const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});



// const express = require('express');
// const cors = require('cors');
// const multer = require('multer');
// const path = require('path');
// const { mergeImages } = require('./imageMerger');

// const app = express();
// const port = 3001;

// // Enable CORS
// app.use(cors({
//   origin: 'http://localhost:3000',
//   methods: ['GET', 'POST'],
//   allowedHeaders: ['Content-Type']
// }));

// // Configure multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   }
// });
// const upload = multer({ storage });

// // Create uploads directory if it doesn't exist
// const fs = require('fs');
// if (!fs.existsSync('uploads')) {
//   fs.mkdirSync('uploads');
// }

// // API endpoint to merge images
// app.post('/api/merge-images', upload.array('images', 2), async (req, res) => {
//   try {
//     console.log(req)
//     if (req.files.length !== 2) {
//       return res.status(400).json({ error: 'Please upload exactly two images' });
//     }

//     const [image1, image2] = req.files;
//     const options = {
//       outputPath: `uploads/merged-${Date.now()}.jpg`,
//       mode: req.body.mode || 'overlay',
//       top: parseInt(req.body.top) || 0,
//       left: parseInt(req.body.left) || 0,
//       opacity: parseFloat(req.body.opacity) || 1.0
//     };

//     const result = await mergeImages(image1.path, image2.path, options);
//     res.json(result);
//   } catch (error) {
//     console.error('Server Error:', error); // Log backend errors
//     res.status(500).json({ error: error.message });
//   }
// });

// // Serve the merged images
// app.use('/uploads', express.static('uploads'));

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}`);
// });