const express = require('express');
const Product = require('../models/Product');
const auth = require('../middleware/auth');

const router = express.Router();

// Public: browse catalog, filter by category / search
router.get('/', async (req, res) => {
  const { category, search, city } = req.query;
  const filter = { isActive: true };
  if (category && category !== 'All') filter.category = category;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const products = await Product.find(filter).populate('vendor', 'businessName rating serviceAreas').limit(100);
  res.json(products);
});

// Vendor: add a product
router.post('/', auth('vendor'), async (req, res) => {
  const product = await Product.create({ ...req.body, vendor: req.body.vendorId });
  res.status(201).json(product);
});

// Vendor: update price/stock
router.patch('/:id', auth('vendor'), async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

module.exports = router;
