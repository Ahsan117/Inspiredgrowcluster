const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
 
  mrp: { type: Number, required: true, default: 0 },
  salesPrice: { type: Number, required: true, default: 0 },

},{timestamps:true,_id:true});

// Index for search performance
ItemSchema.index({ name: 'text' });

module.exports = mongoose.model('1Item', ItemSchema);