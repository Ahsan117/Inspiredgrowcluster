const express = require('express');
const router = express.Router();
const itemController = require('../controllers/1Items');

// Base path: /api/items
router.get('/', itemController.getItems);           // For the Item Inventory Page
router.get('/search', itemController.searchItems);   // For the Billing Table search
router.post('/add', itemController.addItem);        // To add items to the DB
router.delete('/:id', itemController.deleteItem);
router.post('/bulk-delete', itemController.bulkDeleteItems);
router.post('/bulk-create', itemController.bulkCreateItems);

module.exports = router;


