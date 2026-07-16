const express = require('express');
const Vendor = require('../models/Vendor');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply to become a vendor
router.post('/apply', auth('vendor'), async (req, res) => {
  const vendor = await Vendor.create({ ...req.body, user: req.user.id, approvalStatus: 'pending' });
  res.status(201).json(vendor);
});

// Admin: list pending vendor applications
router.get('/pending', auth('admin'), async (req, res) => {
  const pending = await Vendor.find({ approvalStatus: 'pending' }).populate('user', 'name phone city');
  res.json(pending);
});

// Admin: approve/reject a vendor
router.patch('/:id/status', auth('admin'), async (req, res) => {
  const { approvalStatus } = req.body; // 'approved' | 'rejected'
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, { approvalStatus }, { new: true });
  res.json(vendor);
});

module.exports = router;
