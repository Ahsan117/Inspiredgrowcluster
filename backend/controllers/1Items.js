const Item = require('../models/1Items');

// 1. Get all items for the Item List page
exports.getItems = async (req, res) => {
  try {
    const items = await Item.find().sort({ name: 1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Error fetching items", error });
  }
};

// 2. Search items for the Billing Table (Search as you type)
exports.searchItems = async (req, res) => {
  const { query } = req.query;
  try {
    // Uses regex for partial matching (case-insensitive)
    const items = await Item.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { hsnCode: { $regex: query, $options: 'i' } }
      ]
    }).limit(10); // Limit results for better performance in dropdowns
    
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ message: "Search failed", error });
  }
};

// 3. Add a new item
exports.addItem = async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ message: "Error adding item", error });
  }
};


exports.deleteItem = async (req, res) => {
    try {
      const { id } = req.params;
  
      const deletedItem = await Item.findByIdAndDelete(id);
  
      if (!deletedItem) {
        return res.status(404).json({ 
          success: false, 
          message: "Item not found" 
        });
      }
  
      res.status(200).json({ 
        success: true, 
        message: "Item deleted successfully",
        data: deletedItem 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: "Error deleting item", 
        error: error.message 
      });
    }
  };



  // Bulk delete items
exports.bulkDeleteItems = async (req, res) => {
    try {
      const { ids } = req.body; // Expecting an array of IDs: ["id1", "id2"]
      
      if (!ids || ids.length === 0) {
        return res.status(400).json({ success: false, message: "No IDs provided" });
      }
  
      await Item.deleteMany({ _id: { $in: ids } });
  
      res.status(200).json({ 
        success: true, 
        message: `${ids.length} items deleted successfully` 
      });
    } catch (error) {
      res.status(500).json({ success: false, message: "Bulk delete failed", error: error.message });
    }
  };


  exports.bulkCreateItems = async (req, res) => {
    try {
      const { items } = req.body; // Expecting: { items: [{name, salesPrice, mrp}, ...] }
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid data provided" });
      }
  
      const createdItems = await Item.insertMany(items);
      res.status(201).json({ success: true, count: createdItems.length });
    } catch (error) {
      res.status(500).json({ success: false, message: "Bulk creation failed", error: error.message });
    }
  };