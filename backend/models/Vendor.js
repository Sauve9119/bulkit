const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  businessName: { type: String, required: true },
  category: [{ type: String }], // Groceries, FMCG, Household, Baby Care...
  gstNumber: String,
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  serviceAreas: [{ type: String }], // cities/pincodes served
  rating: { type: Number, default: 0 },
  onTimeDeliveryRate: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vendor', vendorSchema);
