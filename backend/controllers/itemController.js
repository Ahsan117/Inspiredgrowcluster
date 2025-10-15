const mongoose   = require('mongoose');
const Item       = require('../models/itemModel');
const Category   = require('../models/categoryModel');
const SubCategory= require('../models/subCategoryModel');
const SubSubCat  = require('../models/subSubCategoryModel');
const Brand      = require('../models/brandModel');
const Unit       = require('../models/unitModel');
const Tax        = require('../models/taxModel');
const Warehouse  = require('../models/warehouseModel');
const Inventory  = require('../models/inventoryModel');
const { updateInventory } = require('../helpers/inventory');
const StockAdjustment = require('../models/stockAdjustmentModel');
const StockTransfer   = require('../models/stockTransferModel');
const { fetchCurrentStockMap } = require('../services/inventoryService');
const Purchase        = require('../models/purchaseModel');
const PosOrder        = require('../models/PosOrder');
const Sales    = require('../models/Sales');
const SalesReturn = require('../models/SalesReturn');
const path = require("path");
const fs = require("fs");






// Lookup or create helper
async function lookupOrCreate(Model, lookup, data) {
  let doc = await Model.findOne(lookup);
  if (!doc) doc = await Model.create(data);
  return doc._id;
}

// helper to bump itemCode
function generateItemCode(lastCode) {
  const m = /^([A-Za-z]+)(\d+)$/.exec(lastCode || '');
  const prefix = m ? m[1].toUpperCase() : 'IT';
  const nextNum = m ? parseInt(m[2],10) + 1 : 1;
  const width = m ? m[2].length : 6;
  return prefix + String(nextNum).padStart(width, '0');
}


exports.changeOffer=async(req,res)=>{
      try{
        const {items}=req.body;
        Item.aggregation([
          {
            $match:{_id:{$in:items.map(id=>mongoose.Types.ObjectId(id))}}
          },
          {
            $set:{offer:true}
          }
        ])
        return res.status(200).json({success:true,message:"offer changed successfully"})
      }
      catch(error){
        console.log("error in changing offer",error)
        return res.status(500).json({success:false,message:"Failed to change offer"})
      }
}

// CREATE Item
exports.createItem = async (req, res) => {
  try {
    const files = req.files || [];
    
    let {
      itemCode,
      itemName,
      brand,
      category,
      subCategory,
      subSubCategory,
      unit,
      itemGroup,
      sku,
      hsn,
      barcodes = [],
      priceWithoutTax,
      purchasePrice,
      salesPrice,
      profitMargin,
      mrp,
      alertQuantity,
      sellerPoints,
      description,
      discountType,
      discount,
      discountPolicy,
      requiredQuantity,
      freeQuantity,
      tax,
      expiryDate,
      warehouse,
      openingStock,
      variants,
    } = req.body;

    // Parse JSON-stringified reference fields
    const referenceFields = [
      'brand',
      'category',
      'subCategory',
      'subSubCategory',
      'unit',
      'tax',
      'warehouse',
    ];

    referenceFields.forEach((field) => {
      if (req.body[field] && typeof req.body[field] === 'string') {
        try {
          const parsed = JSON.parse(req.body[field]);
          if (parsed._id) {
            req.body[field] = parsed._id;
          }
        } catch (e) {
          // Not a JSON string, assume it's already an ObjectId
        }
      }
    });

    // Parse variants if it's a string
    let parsedVariants = [];
    if (variants && typeof variants === 'string') {
      try {
        parsedVariants = JSON.parse(variants);
      } catch (e) {
        console.error('Failed to parse variants:', e.message);
        parsedVariants = [];
      }
    } else if (Array.isArray(variants)) {
      parsedVariants = variants;
    }

    // Ensure parsedVariants is an array
    if (!Array.isArray(parsedVariants)) {
      parsedVariants = [];
    }

    // Validate variants for Variant items
    if (itemGroup === 'Variant' && parsedVariants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Variant items must have at least one variant',
      });
    }

    // Generate itemCode if missing
    if (!itemCode) {
      const last = await Item.findOne().sort({ createdAt: -1 }).select('itemCode').lean();
      itemCode = generateItemCode(last?.itemCode);
    }

    // Normalize barcodes
    if (!Array.isArray(barcodes)) {
      barcodes = [];
    }

    // Build payload
    const payload = {
      itemCode,
      itemName,
      brand,
      category,
      subCategory,
      subSubCategory,
      unit,
      itemGroup,
      alertQuantity,
      sellerPoints,
      description,
      discountType,
      discount,
      discountPolicy,
      requiredQuantity,
      freeQuantity,
      tax,
      expiryDate,
      warehouse,
      openingStock,
      itemImages: files.map((f) => f.filename),
    };

    if (itemGroup === 'Single') {
      Object.assign(payload, {
        sku,
        hsn,
        barcodes,
        priceWithoutTax,
        purchasePrice,
        salesPrice,
        profitMargin,
        mrp,
        variants: [],
      });
    } else {
      Object.assign(payload, {
        sku: '',
        hsn: '',
        barcodes: [],
        priceWithoutTax: 0,
        purchasePrice: 0,
        salesPrice: 0,
        profitMargin: 0,
        mrp: 0,
        variants: parsedVariants.map((v) => ({
          variantId: v.variantId || v._id,
          sku: v.sku || '',
          hsn: v.hsn || '',
          barcodes: Array.isArray(v.barcodes) ? v.barcodes : [],
          priceWithoutTax: Number(v.priceWithoutTax) || 0,
          purchasePrice: Number(v.purchasePrice) || 0,
          salesPrice: Number(v.salesPrice) || 0,
          mrp: Number(v.mrp) || 0,
          profitMargin: Number(v.profitMargin) || 0,
          openingStock: Number(v.openingStock) || 0,
          discountPolicy: v.discountPolicy || 'None',
          requiredQuantity: Number(v.requiredQuantity) || 0,
          freeQuantity: Number(v.freeQuantity) || 0,
        })),
      });
    }

    const newItem = new Item(payload);
    await newItem.save();
    await updateInventory(newItem.warehouse, newItem._id, Number(newItem.openingStock) || 0);

    const item = await Item.findById(newItem._id)
      .populate('warehouse', 'warehouseName location')
      .populate('category', 'name description')
      .populate('subCategory', 'name description')
      .populate('subSubCategory', 'name description')
      .populate('brand', 'brandName')
      .populate('unit', 'unitName')
      .populate('tax', 'taxName taxPercentage')
      .populate('variants.variantId', 'variantName')
      .lean();

    return res.status(201).json({ success: true, message: 'Item created', data: item });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


// GET all items
// GET all items (flattening Variant‐group into separate entries)
// controllers/itemController.js


exports.getAllItems = async (req, res) => {
  try {
    const { warehouse: wId, search, page = 1, limit = 10 } = req.query;
    const warehouseOid = wId ? new mongoose.Types.ObjectId(wId) : null;
    const skip = (page - 1) * limit;

    // Build query with search filter only (no warehouse filter to include transferred items)
    let query = {};
    if (search) {
      const re = new RegExp(search, 'i');
      query.$or = [
        { itemName: re },
        { itemCode: re },
        { barcodes: re },
      ];
    }

    // Fetch warehouse name if provided
    let warehouseDoc = null;
    if (warehouseOid) {
      warehouseDoc = await Warehouse
        .findById(warehouseOid)
        .select('warehouseName')
        .lean();
    }

    // Fetch items with pagination
    const items = await Item.find(query)
      .skip(skip)
      .limit(limit)
      .populate('warehouse', 'warehouseName')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('brand', 'brandName')
      .populate('unit', 'unitName')
      .populate('tax', 'taxName taxPercentage')
      .populate('variants.variantId', 'variantName')
      .lean();

    // Function to calculate stock metrics for an item or variant
    async function sumsFor(itemId) {
      const whMatch = warehouseOid ? { warehouse: warehouseOid } : {};

      const [
        [{ totalAdjustment = 0 } = {}],
        [{ totalIn = 0 } = {}],
        [{ totalOut = 0 } = {}],
        [{ totalPurchased = 0 } = {}],
        [{ totalReturned = 0 } = {}],
        [{ totalSold = 0 } = {}],
        [{ totalSalesSold = 0 } = {}],
        [{ totalReturnedSold = 0 } = {}],
      ] = await Promise.all([
        StockAdjustment.aggregate([
          { $match: whMatch },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalAdjustment: { $sum: '$items.quantity' } } },
        ]),
        StockTransfer.aggregate([
          { $match: warehouseOid ? { toWarehouse: warehouseOid } : {} },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalIn: { $sum: '$items.quantity' } } },
        ]),
        StockTransfer.aggregate([
          { $match: warehouseOid ? { fromWarehouse: warehouseOid } : {} },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalOut: { $sum: '$items.quantity' } } },
        ]),
        Purchase.aggregate([
          { $match: { ...whMatch, isReturn: false } },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalPurchased: { $sum: '$items.quantity' } } },
        ]),
        Purchase.aggregate([
          { $match: { ...whMatch, isReturn: true } },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalReturned: { $sum: '$items.quantity' } } },
        ]),
        PosOrder.aggregate([
          {
            $match: {
              warehouse: warehouseOid,
              status: { $nin: ['OnHold', 'Cancelled'] },
              'items.item': itemId,
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalSold: { $sum: '$items.quantity' } } },
        ]),
        Sales.aggregate([
          {
            $match: {
              warehouse: warehouseOid,
              status: { $nin: ['Draft', 'Cancelled'] },
              'items.item': itemId,
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalSalesSold: { $sum: '$items.quantity' } } },
        ]),
        SalesReturn.aggregate([
          {
            $match: {
              ...whMatch,
              status: { $in: ['Return', 'CancelledReturn'] },
              'items.item': itemId,
            },
          },
          { $unwind: '$items' },
          { $match: { 'items.item': itemId } },
          { $group: { _id: null, totalReturnedSold: { $sum: '$items.quantity' } } },
        ]),
      ]);

      return { totalAdjustment, totalIn, totalOut, totalPurchased, totalReturned, totalSold, totalSalesSold, totalReturnedSold };
    }

    // Flatten items and variants with stock calculations
    const flatPromises = items.flatMap(item => {
      const homeWid = item.warehouse?._id.toString();

      if (item.itemGroup === 'Variant') {
        return item.variants.map(async v => {
          const sums = await sumsFor(v._id);
          const opening = (warehouseOid?.toString() || homeWid) === homeWid ? (v.openingStock || 0) : 0;
          const currentStock = opening + sums.totalPurchased - sums.totalReturned + sums.totalAdjustment + sums.totalIn - sums.totalOut - sums.totalSold - sums.totalSalesSold + sums.totalReturnedSold;

          return {
            _id: v._id,
            parentItemId: item._id,
            itemGroup: 'Variant',
            itemName: `${item.itemName} – ${v.variantId.variantName}`,
            itemCode: item.itemCode,
            barcodes: v.barcodes,
            salesPrice: v.salesPrice,
            purchasePrice: v.purchasePrice,
            priceWithoutTax: v.priceWithoutTax,
            discount: v.discount,
            mrp: v.mrp,
            sku: v.sku,
            hsn: v.hsn,
            expiryDate: v.expiryDate,
            openingStock: opening,
            ...sums,
            currentStock,
            warehouse: warehouseDoc || item.warehouse,
            category: item.category,
            brand: item.brand,
            itemImages: item.itemImages, 
          };
        });
      }

      return (async () => {
        const sums = await sumsFor(item._id);
        const opening = (warehouseOid?.toString() || homeWid) === homeWid ? (item.openingStock || 0) : 0;
        const currentStock = opening + sums.totalPurchased - sums.totalReturned + sums.totalAdjustment + sums.totalIn - sums.totalOut - sums.totalSold - sums.totalSalesSold + sums.totalReturnedSold;

        return {
          _id: item._id,
          itemGroup: 'Single',
          itemName: item.itemName,
          itemCode: item.itemCode,
          barcodes: item.barcodes,
          salesPrice: item.salesPrice,
          purchasePrice: item.purchasePrice,
          priceWithoutTax: item.priceWithoutTax,
          discount: item.discount,
          mrp: item.mrp,
          sku: item.sku,
          hsn: item.hsn,
          expiryDate: item.expiryDate,
          openingStock: opening,
          ...sums,
          currentStock,
          warehouse: warehouseDoc || item.warehouse,
          category: item.category,
          brand: item.brand,
          itemImages: item.itemImages, 
        };
      })();
    });

    let flattened = (await Promise.all(flatPromises)).flat();

    // Filter items with stock activity in the requested warehouse
    if (warehouseOid) {
      flattened = flattened.filter(
        r =>
          r.openingStock ||
          r.totalPurchased ||
          r.totalIn ||
          r.totalAdjustment ||
          r.totalSold ||
          r.totalSalesSold ||
          r.totalReturnedSold ||
          r.totalOut ||
          r.totalReturned
      );
    }

    // Apply search filter (already applied in query, but kept for compatibility)
    if (search) {
      const re = new RegExp(search, 'i');
      flattened = flattened.filter(
        r =>
          re.test(r.itemName) ||
          re.test(r.itemCode) ||
          (Array.isArray(r.barcodes) && r.barcodes.some(b => re.test(b)))
      );
    }

    // Count total items for pagination
    const totalItems = await Item.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: flattened,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    });
  } catch (err) {
    console.error('getAllItems error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

//get items for auditor
exports.getItems=async(req,res)=>{
  try {

    console.log("err")
       const items=await Item.find()
        .populate('warehouse', 'warehouseName')
      .populate('category', 'name')
      .populate('subCategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('brand', 'brandName')
      .populate('unit', 'unitName')
      .populate('tax', 'taxName taxPercentage')
      .populate('variants.variantId', 'variantName')

       if(!items){
        return res.status(400).json({
          message:"No item found"
        })
       }
       return res.status(200).json({
        success:true,
        message:"items fetched sucessfully",
        data:items
       })
       
  } catch (error) {
    console.log("fetching in error items",error)
    return res.status(500).json({
      message:"Internal server error",
      error:error
    })
  }
}






// GET item summaries
exports.getItemSummaries = async (req, res) => {
  try {
    const items = await Item.find()
      .select('itemImage itemName mrp salesPrice openingStock category description')
      .populate('warehouse', 'warehouseName location')
      .populate('category',  'name description');
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── GET related items ───────────────────────── */

exports.getRelatedItems = async (req, res) => {
  try {
    const mainItem = await Item.findById(req.params.id);
    if (!mainItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    const related = await Item.find({
      category: mainItem.category,
      _id: { $ne: mainItem._id }
    })
      .limit(4)
      .select('itemImage itemName mrp salesPrice category description')
      .populate('warehouse', 'warehouseName location')
      .populate('category',  'name description');

    res.status(200).json({ success: true, data: related });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── GET by ID ───────────────────────── */

exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('warehouse',        'warehouseName location')
      .populate('category',         'name description')
      .populate('subCategory',      'name description')
      .populate('subSubCategory',   'name description')
      .populate('tax',              'taxName taxPercentage')
      .populate('unit',             'unitName')
      .populate('variants.variantId', 'variantName description status');

    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── UPDATE ───────────────────────── */

exports.updateItem = async (req, res) => {
  try {
    // 1️⃣ Load the existing item so we can reverse its old openingStock
    const oldItem = await Item.findById(req.params.id).lean();
    if (!oldItem) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Reverse the old openingStock in the ledger
    await updateInventory(
      oldItem.warehouse,
      oldItem._id,
      -(oldItem.openingStock || 0)
    );

    // 2️⃣ Prepare the update payload
    let update = { ...req.body };
    const files = req.files || [];

    // Reference fields that may come in as JSON strings
    const referenceFields = [
      'brand',
      'category',
      'subCategory',
      'subSubCategory',
      'unit',
      'tax',
      'warehouse',
    ];
    referenceFields.forEach((field) => {
      if (update[field] && typeof update[field] === 'string') {
        try {
          const parsed = JSON.parse(update[field]);
          if (parsed._id) update[field] = parsed._id;
        } catch {
          // leave as-is
        }
      }
    });

    // Parse variants if provided as JSON string
    if (update.variants && typeof update.variants === 'string') {
      try {
        update.variants = JSON.parse(update.variants);
      } catch {
        update.variants = [];
      }
    }
    if (!Array.isArray(update.variants)) {
      update.variants = [];
    }
    // Normalize each variant
    if (update.variants.length) {
      update.variants = update.variants.map((v) => ({
        variantId:       v.variantId || v._id,
        sku:             v.sku || '',
        hsn:             v.hsn || '',
        barcodes:        Array.isArray(v.barcodes) ? v.barcodes : [],
        priceWithoutTax: Number(v.priceWithoutTax)  || 0,
        purchasePrice:   Number(v.purchasePrice)    || 0,
        salesPrice:      Number(v.salesPrice)       || 0,
        mrp:             Number(v.mrp)              || 0,
        profitMargin:    Number(v.profitMargin)     || 0,
        openingStock:    Number(v.openingStock)     || 0,
        discountPolicy:  v.discountPolicy || 'None',
        requiredQuantity:Number(v.requiredQuantity) || 0,
        freeQuantity:    Number(v.freeQuantity)     || 0,
      }));
    }

    // Append any newly uploaded images
    if (files.length) {
      const existing = (await Item.findById(req.params.id).select('itemImages').lean())
        ?.itemImages || [];
      update.itemImages = existing.concat(files.map((f) => f.filename));
    }

    // Ensure barcodes is always an array
    if (update.barcodes && !Array.isArray(update.barcodes)) {
      update.barcodes = [];
    }

    // 3️⃣ Perform the update
    const updated = await Item.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('warehouse',        'warehouseName location')
      .populate('category',         'name description')
      .populate('subCategory',      'name description')
      .populate('subSubCategory',   'name description')
      .populate('brand',            'brandName')
      .populate('unit',             'unitName')
      .populate('tax',              'taxName taxPercentage')
      .populate('variants.variantId','variantName')
      .lean();

    // 4️⃣ Apply the new openingStock to the ledger
    await updateInventory(
          // pass the actual ObjectId/string, not the populated object:
        updated.warehouse._id,
          updated._id,
          +(updated.openingStock || 0)
        );

    // 5️⃣ Return success
    return res.status(200).json({
      success: true,
      message: 'Item updated successfully',
      data: updated,
    });

  } catch (err) {
    console.error('Error in updateItem:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ───────────────────────── DELETE ───────────────────────── */

exports.deleteItem = async (req, res) => {
  try {
    const removed = await Item.findByIdAndDelete(req.params.id);
    if (!removed) return res.status(404).json({ success: false, message: 'Item not found' });
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/* ───────────────────────── extra GET routes (unchanged) ───────────────────────── */

exports.getItemsNearLocation = async (req, res) => {
  try {
    const { latitude, longitude, maxDistance } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'latitude and longitude are required' });
    }
    const lat  = parseFloat(latitude);
    const lng  = parseFloat(longitude);
    const dist = maxDistance ? parseInt(maxDistance) : 5000;

    const warehouses = await Warehouse.find({
      location: { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: dist } }
    }).select('_id');

    if (!warehouses.length) return res.status(200).json({ success: true, data: [] });
    const ids = warehouses.map(w => w._id);

    const items = await Item.find({ warehouse: { $in: ids } })
      .select('itemImage itemName mrp salesPrice openingStock category description')
      .populate('warehouse', 'warehouseName location')
      .populate('category',  'name description');

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopTrendingItems = async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const trending = await Sale.aggregate([
      { $unwind: '$items' },
      { $group: { _id: '$items.item', totalSold: { $sum: '$items.quantity' } } },
      { $lookup: { from: 'items', localField: '_id', foreignField: '_id', as: 'itemDetails' } },
      { $unwind: '$itemDetails' },
      {
        $project: {
          itemName:   '$itemDetails.itemName',
          totalSold:  1,
          salesPrice: '$itemDetails.salesPrice',
          itemCode:   '$itemDetails.itemCode',
          itemImage:  '$itemDetails.itemImage'
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit }
    ]);
    res.status(200).json({ success: true, data: trending });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockItems = async (req, res) => {
  const threshold = parseInt(req.query.threshold) || 10;
  try {
    const low = await Item.find({ openingStock: { $lte: threshold } })
      .select('itemName openingStock alertQuantity')
      .populate('category', 'name')
      .populate('brand',    'brandName');
    res.status(200).json({ success: true, data: low });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getItemsByCategory = async (req, res) => {
  try {
    const items = await Item.find({ category: req.params.categoryId })
      .populate('warehouse', 'warehouseName location')
      .populate('category',  'name description')
      .populate('brand',     'brandName description')
      .populate('tax',       'taxName taxPercentage')
      .populate('unit',      'unitName')
      .populate('variants.variantId', 'variantName description status');
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createItemsBulk = async (req, res) => {
  const items = req.body;
  try {
    const created = await Item.insertMany(items, { ordered: false });
    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err) {
    console.warn('Bulk import partial error:', err);
    const inserted = err.insertedDocs || [];
    res.status(207).json({ success: false, count: inserted.length, error: err.message, data: inserted });
  }
};

exports.getItemsByWarehouse = async (req, res) => {
  const { warehouse } = req.query;
  if (!warehouse) {
    return res.status(400).json({ success: false, message: 'warehouse query param is required' });
  }
  const items = await Item.find({ warehouse }).select('itemName itemCode barcodes');
  res.json(items);
};

// In itemController.js
exports.uploadImages = async (req, res) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files uploaded" });
    }
    const uploadedImages = {};
    files.forEach((file) => {
      uploadedImages[file.originalname] = file.filename;
    });
    res.status(200).json({ success: true, uploadedImages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteItemImage = async (req, res) => {
  try {
    const { id, filename } = req.params;

    // 1) Remove filename from the Item document
    await Item.findByIdAndUpdate(id, {
      $pull: { itemImages: filename }
    });

    // 2) Delete the physical file from disk
    const fullPath = path.join(
      __dirname,
      "..",
      "uploads",
      "qr",
      "items",
      filename
    );
    fs.unlink(fullPath, (err) => {
      if (err) console.error("Could not delete file:", fullPath, err);
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};



exports.compareWarehouseItems = async (req, res) => {

};


exports.assignMasterImage=async(req,res)=>{
  try {
      const{id,image}=req.body;
      if(!id || !image){
        return res.status(400).json({
          message:"All fields are required"
        })
      }


      const itemExist=await Item.findById(id)
      if(!itemExist){
        return res.status(404).json({
          message:"Item not found"
        })
      }
      const itemUpdate=await Item.findByIdAndUpdate(id,{
        masterImage:image
      })
      if(!itemUpdate){
        return res.status(400).json({
          message:"Unable to update"
        })
      }
      return res.status(200).json({
        success:true,
        message:"Master image assign successfully"
      })
  } catch (error) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}




exports.DifferentiateItemByCategory=async(req,res)=>{
   try {
    const items = await Item.find();

    const grouped = {};

    items.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });
    res.status(200).json({
      success: true,
      message: "Items grouped by category",
      data: grouped,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while grouping items",
      error: error.message,
    });
  }
}


// const Item = require("../models/Item"); // Adjust path to your Item model

exports.getCategoryWiseImages = async (req, res) => {
  try {
    const items = await Item.find({ masterImage: { $exists: true, $ne: "" } });

    const groupedImages = {};

    // Group images by category
    items.forEach(item => {
      const category = item.category || "Uncategorized";
      const imageUrl = `http://localhost:5000/uploads/${item.masterImage}`;

      if (!groupedImages[category]) {
        groupedImages[category] = [];
      }

      groupedImages[category].push(imageUrl);
    });

    const result = {};

    for (const category in groupedImages) {
      const images = groupedImages[category];
      
      // Limit to 20 images max
      const limitedImages = images.slice(0, 20);
      
      // Ensure even number of images
      const evenCount = limitedImages.length - (limitedImages.length % 2);
      const evenImages = limitedImages.slice(0, evenCount);
      
      // Split into pairs of 2
      const pairedImages = [];
      for (let i = 0; i < evenImages.length; i += 2) {
        pairedImages.push([evenImages[i], evenImages[i + 1]]);
      }

      result[category] = pairedImages;
    }

    return res.status(200).json({
      success: true,
      message: "Images grouped by category in pairs",
      data: result
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing items",
      error: error.message
    });
  }
};


const { mergeImages } = require("../helpers/imageMerger");


//category



exports.getMergedCategoryImages = async (req, res) => {
  try {
    const items = await Item.find({ masterImage: { $exists: true, $ne: "" } });

    const grouped = {};

    // Group items by category
    items.forEach(item => {
      const category = item.category || "Uncategorized";
      const imagePath = item.masterImage;
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push(imagePath);
    });

    const finalResult = {};

    for (const category in grouped) {
      const images = grouped[category];

      // Get up to 20, and ensure even number
      const trimmedImages = images.slice(0, 20);
      const evenCount = trimmedImages.length - (trimmedImages.length % 2);
      const imagePairs = trimmedImages.slice(0, evenCount);

      const mergedResults = [];

      for (let i = 0; i < imagePairs.length; i += 2) {
        // const image1 = path.join("uploads", imagePairs[i]);
        // const image2 = path.join("uploads", imagePairs[i + 1]);


const image1Path = path.resolve(__dirname, "../uploads", "1749384272616.jpg"); // image1 = '1749384272616.jpg'
const image2Path = path.resolve(__dirname, "../uploads", "1749384272623.jpg"); // image2 = '1748771691950.jpg'


        const outputFileName = `merged-${category.replace(/\s+/g, "_").toLowerCase()}-${i}.png`;
        const outputPath = path.join("uploads", "merged", outputFileName);

        fs.mkdirSync("uploads/merged", { recursive: true });

        const mergeResult = await mergeImages(image1Path, image2Path, { outputPath });
         console.log(mergeResult)
        mergedResults.push(`http://localhost:5000/${outputPath.replace(/\\/g, "/")}`);
      }

      finalResult[category] = mergedResults;
    }

    return res.status(200).json({
      success: true,
      message: "Merged category-wise item images returned in pairs",
      data: finalResult,
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
};


exports.generateMergedImagesForCategory = async (req, res) => {
  try {
    const { categoryId } = req.body;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 20;
    const skip = (page - 1) * limit;

    // Fetch paginated items with images
    const items = await Item.find({ 
      category: categoryId,
      masterImage: { $exists: true, $ne: "" }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    if (!items || items.length < 2) {
      return res.status(200).json([]);
    }

    const mergedUrls = [];

    for (let i = 0; i < items.length - 1; i += 2) {
      const img1 = path.resolve(__dirname, "../uploads", path.basename(items[i].masterImage));
      const img2 = path.resolve(__dirname, "../uploads", path.basename(items[i + 1].masterImage));

      if (!fs.existsSync(img1) || !fs.existsSync(img2)) continue;

      const outputPath = path.join("uploads/merged", `merged-${categoryId}-${page}-${i}.png`);
      await mergeImages(img1, img2, { outputPath });

      mergedUrls.push(`/uploads/merged/${path.basename(outputPath)}`);
    }

    return res.status(200).json(mergedUrls);

  } catch (error) {
    console.error("Error generating merged images:", error);
    return res.status(500).json([]);
  }
};








//sub 



exports.DifferentiateItemBysubCategory=async(req,res)=>{
   try {
    const items = await Item.find();

    const grouped = {};

    items.forEach((item) => {
      if (!grouped[item.subCategory]) {
        grouped[item.subCategory] = [];
      }
      grouped[item.subCategory].push(item);
    });
    res.status(200).json({
      success: true,
      message: "Items grouped by category",
      data: grouped,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while grouping items",
      error: error.message,
    });
  }
}

exports.getMergedSubCategoryImages=async(req,res)=>{
   try {
    const items = await Item.find({ masterImage: { $exists: true, $ne: "" } });

    const grouped = {};

    // Group items by category
    items.forEach(item => {
      const subcategory = item.subCategory || "Uncategorized";
      const imagePath = item.masterImage;
      if (!grouped[subcategory]) grouped[subcategory] = [];
      grouped[subcategory].push(imagePath);
    });

    const finalResult = {};

    for (const subcategory in grouped) {
      const images = grouped[subcategory];

      // Get up to 20, and ensure even number
      const trimmedImages = images.slice(0, 20);
      const evenCount = trimmedImages.length - (trimmedImages.length % 2);
      const imagePairs = trimmedImages.slice(0, evenCount);

      const mergedResults = [];

      for (let i = 0; i < imagePairs.length; i += 2) {
        // const image1 = path.join("uploads", imagePairs[i]);
        // const image2 = path.join("uploads", imagePairs[i + 1]);


const image1Path = path.resolve(__dirname, "../uploads", "1749384272616.jpg"); // image1 = '1749384272616.jpg'
const image2Path = path.resolve(__dirname, "../uploads", "1749384272623.jpg"); // image2 = '1748771691950.jpg'


        const outputFileName = `merged-${subcategory.replace(/\s+/g, "_").toLowerCase()}-${i}.png`;
        const outputPath = path.join("uploads", "merged", outputFileName);

        fs.mkdirSync("uploads/merged", { recursive: true });

        const mergeResult = await mergeImages(image1Path, image2Path, { outputPath });
         console.log(mergeResult)
        mergedResults.push(`http://localhost:5000/${outputPath.replace(/\\/g, "/")}`);
      }

      finalResult[subcategory] = mergedResults;
    }

    return res.status(200).json({
      success: true,
      message: "Merged category-wise item images returned in pairs",
      data: finalResult,
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
}



exports.generateMergedImagesForSubCategory = async (req, res) => {
  try {
    const { subcategoryId } = req.body;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 20;
    const skip = (page - 1) * limit;

    // Fetch paginated items with images
    const items = await Item.find({ 
      subCategory: subcategoryId,
      masterImage: { $exists: true, $ne: "" }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    if (!items || items.length < 2) {
      return res.status(200).json([]);
    }

    const mergedUrls = [];

    for (let i = 0; i < items.length - 1; i += 2) {
      const img1 = path.resolve(__dirname, "../uploads", path.basename(items[i].masterImage));
      const img2 = path.resolve(__dirname, "../uploads", path.basename(items[i + 1].masterImage));

      if (!fs.existsSync(img1) || !fs.existsSync(img2)) continue;

      const outputPath = path.join("uploads/merged", `merged-${subcategoryId}-${page}-${i}.png`);
      await mergeImages(img1, img2, { outputPath });

      mergedUrls.push(`/uploads/merged/${path.basename(outputPath)}`);
    }

    return res.status(200).json(mergedUrls);

  } catch (error) {
    console.error("Error generating merged images:", error);
    return res.status(500).json([]);
  }
};




//subsub


exports.DifferentiateItemBysubsubCategory=async(req,res)=>{
   try {
    const items = await Item.find();

    const grouped = {};

    items.forEach((item) => {
      if (!grouped[item.subSubCategory]) {
        grouped[item.subSubCategory] = [];
      }
      grouped[item.subSubCategory].push(item);
    });
    res.status(200).json({
      success: true,
      message: "Items grouped by category",
      data: grouped,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while grouping items",
      error: error.message,
    });
  }
}

exports.getMergedSubSubCategoryImages=async(req,res)=>{
   try {
    const items = await Item.find({ masterImage: { $exists: true, $ne: "" } });

    const grouped = {};

    // Group items by category
    items.forEach(item => {
      const subcategory = item.subSubCategory || "Unsubsubcategorized";
      const imagePath = item.masterImage;
      if (!grouped[subcategory]) grouped[subcategory] = [];
      grouped[subcategory].push(imagePath);
    });

    const finalResult = {};

    for (const subcategory in grouped) {
      const images = grouped[subcategory];

      // Get up to 20, and ensure even number
      const trimmedImages = images.slice(0, 20);
      const evenCount = trimmedImages.length - (trimmedImages.length % 2);
      const imagePairs = trimmedImages.slice(0, evenCount);

      const mergedResults = [];

      for (let i = 0; i < imagePairs.length; i += 2) {
        // const image1 = path.join("uploads", imagePairs[i]);
        // const image2 = path.join("uploads", imagePairs[i + 1]);


const image1Path = path.resolve(__dirname, "../uploads", "1749384272616.jpg"); // image1 = '1749384272616.jpg'
const image2Path = path.resolve(__dirname, "../uploads", "1749384272623.jpg"); // image2 = '1748771691950.jpg'


        const outputFileName = `merged-${subcategory.replace(/\s+/g, "_").toLowerCase()}-${i}.png`;
        const outputPath = path.join("uploads", "merged", outputFileName);

        fs.mkdirSync("uploads/merged", { recursive: true });

        const mergeResult = await mergeImages(image1Path, image2Path, { outputPath });
         console.log(mergeResult)
        mergedResults.push(`http://localhost:5000/${outputPath.replace(/\\/g, "/")}`);
      }

      finalResult[subcategory] = mergedResults;
    }

    return res.status(200).json({
      success: true,
      message: "Merged category-wise item images returned in pairs",
      data: finalResult,
    });

  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong",
      error: error.message,
    });
  }
}



exports.generateMergedImagesForSubSubCategory = async (req, res) => {
  try {
    const { subsubcategoryId } = req.body;
    const page = parseInt(req.query.page) || 1; // Default to page 1
    const limit = 20;
    const skip = (page - 1) * limit;

    // Fetch paginated items with images
    const items = await Item.find({ 
      subSubCategory: subsubcategoryId,
      masterImage: { $exists: true, $ne: "" }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

    if (!items || items.length < 2) {
      return res.status(200).json([]);
    }

    const mergedUrls = [];

    for (let i = 0; i < items.length - 1; i += 2) {
      const img1 = path.resolve(__dirname, "../uploads", path.basename(items[i].masterImage));
      const img2 = path.resolve(__dirname, "../uploads", path.basename(items[i + 1].masterImage));

      if (!fs.existsSync(img1) || !fs.existsSync(img2)) continue;

      const outputPath = path.join("uploads/merged", `merged-${subcategoryId}-${page}-${i}.png`);
      await mergeImages(img1, img2, { outputPath });

      mergedUrls.push(`/uploads/merged/${path.basename(outputPath)}`);
    }

    return res.status(200).json(mergedUrls);

  } catch (error) {
    console.error("Error generating merged images:", error);
    return res.status(500).json([]);
  }
};



exports.assignMasterImageForCategory=async(req,res)=>{
  try {
      const{id,image}=req.body;
      if(!id || !image){
        return res.status(400).json({
          message:"All fields are required"
        })
      }


      const CatExist=await Category.findById(id)
      if(!CatExist){
        return res.status(404).json({
          message:"Item not found"
        })
      }

      const CatUpdate=await Category.findByIdAndUpdate(id,{
        masterImage:image
      })
      
      if(!CatUpdate){
        return res.status(400).json({
          message:"Unable to update"
        })
      }
      return res.status(200).json({
        success:true,
        message:"Master image assign successfully"
      })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}









exports.assignMasterImageForSubCategory=async(req,res)=>{
  try {
      const{id,image}=req.body;
      if(!id || !image){
        return res.status(400).json({
          message:"All fields are required"
        })
      }


      const subCatExist=await SubCategory.findById(id)
      if(!subCatExist){
        return res.status(404).json({
          message:"Item not found"
        })
      }
      const subCatUpdate=await SubCategory.findByIdAndUpdate(id,{
        masterImage:image
      })
      if(!subCatUpdate){
        return res.status(400).json({
          message:"Unable to update"
        })
      }
      return res.status(200).json({
        success:true,
        message:"Master image assign successfully"
      })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}




exports.assignMasterImageForSubSubCategory=async(req,res)=>{
  try {
      const{id,image}=req.body;
      if(!id || !image){
        return res.status(400).json({
          message:"All fields are required"
        })
      }


      const subCatExist=await SubSubCat.findById(id)
      if(!subCatExist){
        return res.status(404).json({
          message:"Item not found"
        })
      }
      const subCatUpdate=await SubSubCat.findByIdAndUpdate(id,{
        masterImage:image
      })
      if(!subCatUpdate){
        return res.status(400).json({
          message:"Unable to update"
        })
      }
      return res.status(200).json({
        success:true,
        message:"Master image assign successfully"
      })
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: err.message });
  }
}






