const mongoose = require('mongoose');

// Variant subdocument schema with barcodes and Buy X Get Y fields
const variantSubSchema = new mongoose.Schema({
  variantId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Variant', required: true },
  sku:              { type: String, default: '' },
  hsn:              { type: String, default: '' },
  barcodes:         { type: [String], default: [] },
  priceWithoutTax:  { type: Number, default: 0 },
  purchasePrice:    { type: Number, default: 0 },
  salesPrice:       { type: Number, default: 0 },
  mrp:              { type: Number, default: 0 },
  profitMargin:     { type: Number, default: 0 },
  openingStock:     { type: Number, default: 0 },
  active:           { type: Boolean, default: true },
  discountPolicy:   { type: String, enum: ['None','BuyXGetY'], default: 'None' },
  requiredQuantity: { type: Number, default: 0 },
  freeQuantity:     { type: Number, default: 0 }
}, { _id: true });

// Main item schema with support for multiple barcodes and Buy X Get Y
const itemSchema = new mongoose.Schema({
  itemCode:        { type: String, required: true, unique: true },
  itemName:        { type: String, required: true },
  brand:           { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  category:        { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory:     { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  subSubCategory:  { type: mongoose.Schema.Types.ObjectId, ref: 'SubSubCategory', required: false },
  unit:            { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  itemGroup:       { type: String, enum: ['Single','Variant'], required: true },
   
  // Single-group pricing & barcodes
  sku:             { type: String, default: '' },
  hsn:             { type: String, default: '' },
  barcodes:        { type: [String], default: [] },
  priceWithoutTax: { type: Number, default: 0 },
  purchasePrice:   { type: Number, default: 0 },
  salesPrice:      { type: Number, default: 0 },
  mrp:             { type: Number, default: 0 },
  profitMargin:    { type: Number, default: 0 },

  // Shared fields
  alertQuantity:   { type: Number, default: 0 },
  sellerPoints:    { type: Number, default: 0 },
  description:     { type: String, default: '' },
  discountType:    { type: String, enum: ['Percentage','Fixed'], default: 'Percentage' },
  discount:        { type: Number, default: 0 },
  discountPolicy:  { type: String, enum: ['None','BuyXGetY'], default: 'None' },
  requiredQuantity:{ type: Number, default: 0 },
  freeQuantity:    { type: Number, default: 0 },

  tax:             { type: mongoose.Schema.Types.ObjectId, ref: 'Tax', required: true },
  expiryDate:      { type: Date },
  warehouse:       { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  openingStock:    { type: Number, default: 0 },
  itemImages:      { type: [String], default: [] },
  masterImage:{type:String},
  offer:{type:Boolean,default:false},
  // Embedding variants
  variants:        [variantSubSchema]
}, { timestamps: true });

// Remove single-item fields when itemGroup is 'Variant'
itemSchema.set('toJSON', {
  transform(doc, ret) {
    if (ret.itemGroup === 'Variant') {
      ['sku','hsn','barcodes','priceWithoutTax','purchasePrice','salesPrice','mrp',
       'profitMargin','alertQuantity','sellerPoints','description','discountType','discount',
       'discountPolicy','requiredQuantity','freeQuantity']
        .forEach(f => delete ret[f]);
    }
    return ret;
  }
});

module.exports = mongoose.model('Item', itemSchema);