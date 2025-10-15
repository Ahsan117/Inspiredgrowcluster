const express = require("express");
const router = express.Router();
// controllers/customerController.js
const asyncHandler = require("express-async-handler");
const Customer = require("../models/customerModel");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const { sendSuccess, sendError } = require("../utils/responseHelper");

const {
  SMS_API_URL, SMS_USERNAME, SMS_PASSWORD, SMS_FROM, JWT_SECRET
} = process.env;

const generateToken = id => jwt.sign({ id }, JWT_SECRET, { expiresIn: "7d" });
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();



router.post("/otp-verify",async (req,res)=>{
     try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ status: 400, message: "Phone is required" });
    
        // Generate OTP
        const otp = generateOTP(); // your existing OTP generator function
    
        // Send SMS
        const msg = `Dear Customer, ${otp} is the OTP for your Card Addition. In case you have not requested this, please contact us at contact@inspiredgrow.in – INSPGD`;
        const smsUrl =
          `${SMS_API_URL}?username=${SMS_USERNAME}&password=${SMS_PASSWORD}` +
          `&from=${SMS_FROM}&to=${phone}&msg=${encodeURIComponent(msg)}&type=1&template_id=1707168662769323079`;
    
        await axios.get(smsUrl);

        return res.json({ status: 200, message: "OTP sent successfully", otp });
      } catch (error) {
        console.error(error);
        return res.status(500).json({ status: 500, message: "Failed to send OTP" });
      }
})


module.exports = router;