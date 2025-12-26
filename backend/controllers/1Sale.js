const Sale = require('../models/1Sale');
const Customer = require('../models/1Customer');
const Item = require('../models/1Items');

exports.createSale = async (req, res) => {
  try {
    const { partyDetails, billingItems, summary, billId } = req.body;

    // 1. Check or Create Customer
    let customer = await Customer.findOne({ name: partyDetails.customerName });
    if (!customer) {
      customer = new Customer({
        name: partyDetails.customerName,
      });
      await customer.save();
    }

    // 2. Process Items (Check or Create for each row)
    const processedItems = await Promise.all(billingItems.map(async (lineItem) => {
      let item = await Item.findOne({ name: lineItem.name });
      
      if (!item) {
        item = new Item({
          name: lineItem.name,
          salesPrice:lineItem.rate,
          mrp: lineItem.mrp,
        });
        await item.save();
      }

      return {
        itemId: item._id,
        name: lineItem.name,
        qty: lineItem.qty,
        rate: lineItem.rate,
        total: lineItem.total
      };
    }));

    // 3. Create the Sale
    const newSale = new Sale({
        billId,
      customer: customer._id,
      items: processedItems,
      subtotal: summary.subtotal,
      totalGst: summary.totalGst,
      grandTotal: summary.grandTotal,
      coinAdjustment: summary.coinAdjustment
    });

    await newSale.save();
    res.status(201).json({ success: true, data: newSale });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllSales = async (req, res) => {
  try {
    // Populate customer details to show name/phone in the Sales List
    const sales = await Sale.find().populate('customer').sort({ date: -1 });
    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get a single sale by ID for editing
exports.getSaleById = async (req, res) => {
    try {
      const sale = await Sale.findById(req.params.id).populate('customer items.itemId');
      if (!sale) return res.status(404).json({ success: false, message: "Sale not found" });
      res.status(200).json({ success: true, data: sale });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
  
  // Update existing sale
  exports.updateSale = async (req, res) => {
    try {
      const { id } = req.params;
      const { billingItems, summary, partyDetails } = req.body;
  
       // 2. Process Items (Check or Create for each row)
    const processedItems = await Promise.all(billingItems.map(async (lineItem) => {
        let item = await Item.findOne({ name: lineItem.name });
        
        if (!item) {
          item = new Item({
            name: lineItem.name,
            salesPrice:lineItem.rate,
            mrp: lineItem.mrp,
          });
          await item.save();
        }
  
        return {
          itemId: item._id,
          name: lineItem.name,
          qty: lineItem.qty,
          rate: lineItem.rate,
          total: lineItem.total
        };
      }));
  
      // Update the sale document
      const updatedSale = await Sale.findByIdAndUpdate(id, {
        items: processedItems,
        subtotal: summary.subtotal,
        grandTotal: summary.grandTotal,
        coinAdjustment: summary.coinAdjustment,
        // Optional: update customer if needed, usually handled in separate logic
      }, { new: true });
  
      res.status(200).json({ success: true, data: updatedSale });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  };