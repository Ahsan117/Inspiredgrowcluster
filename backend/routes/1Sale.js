const express = require('express');
const router = express.Router();
const saleController = require('../controllers/1Sale');

// POST: Create a new sale (handles auto-creation of customers/items)
router.post('/create', saleController.createSale);

// GET: Fetch all sales for the Sales List table
router.get('/all', saleController.getAllSales);


router.get('/:id', saleController.getSaleById); // GET /1sale/6765...
router.put('/update/:id', saleController.updateSale); // PUT /1sale/update/6765...

module.exports = router;