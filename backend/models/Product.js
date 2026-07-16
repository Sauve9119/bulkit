const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  brand: String,
  unit: { type: String, required: true }, // e.g. "per bag (50kg)"
  price: { type: Number, required: true },
  mrp: Number,
  stock: { type: Number, default: 0 },
  minOrderQty: { type: Number, default: 1 },
  imageUrl: String,
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

productSchema.index({ category: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
