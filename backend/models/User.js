const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['store_owner', 'vendor', 'admin', 'delivery'], default: 'store_owner' },
  language: { type: String, default: 'en' }, // en, hi, mwr (Marwari)
  storeName: String,
  city: String,
  address: String,
  location: {
    lat: Number,
    lng: Number
  },
  creditScore: { type: Number, default: 50 }, // 0-100, grows with consistent ordering
  creditLimit: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
