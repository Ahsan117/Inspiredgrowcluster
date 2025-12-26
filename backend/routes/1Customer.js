
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/1Customer');

router.get('/search', customerController.searchCustomers);
// Base path: /api/items
// router.get('/', itemController.getItems);           // For the Item Inventory Page
// router.get('/search', itemController.searchItems);   // For the Billing Table search
// router.post('/add', itemController.addItem);        // To add items to the DB

module.exports = router;