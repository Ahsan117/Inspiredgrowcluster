const mongoose = require('mongoose');

const SaleSchema = new mongoose.Schema({
    billId:{ type: String,
        required: true,
        unique: true, },
  date: { type: Date, default: Date.now },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: '1Customer' },
  items: [{
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: '1Item' },
    name: String,
    qty: Number,
    rate: Number,
    
    total: Number
  }],
  subtotal: Number,
  grandTotal: Number,
  coinAdjustment: { type: Number, default: 0 }
});

module.exports = mongoose.model('1Sale', SaleSchema);