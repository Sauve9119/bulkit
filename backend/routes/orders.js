const express = require('express');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const auth = require('../middleware/auth');

module.exports = function (io) {
  const router = express.Router();

  // Place an order (store owner)
  router.post('/', auth('store_owner'), async (req, res) => {
    try {
      const { items, paymentMethod } = req.body; // items: [{productId, quantity}]
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const product = await Product.findById(item.productId);
        if (!product) continue;
        const lineTotal = product.price * item.quantity;
        totalAmount += lineTotal;
        orderItems.push({
          product: product._id,
          vendor: product.vendor,
          name: product.name,
          quantity: item.quantity,
          unitPrice: product.price,
          lineTotal
        });
      }

      const orderNumber = 'BLK-' + Date.now().toString().slice(-8);
      const order = await Order.create({
        orderNumber,
        storeOwner: req.user.id,
        items: orderItems,
        totalAmount,
        paymentMethod: paymentMethod || 'cod',
        statusHistory: [{ status: 'placed' }]
      });

      // Bump credit score slightly for consistent ordering behavior
      await User.findByIdAndUpdate(req.user.id, { $inc: { creditScore: 1 } });

      io.to(`vendor_room`).emit('new_order', order);
      res.status(201).json(order);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get orders for logged-in store owner
  router.get('/my', auth('store_owner'), async (req, res) => {
    const orders = await Order.find({ storeOwner: req.user.id }).sort({ createdAt: -1 });
    res.json(orders);
  });

  // Vendor/admin: update order status, broadcast live
  router.patch('/:id/status', auth('vendor'), async (req, res) => {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, $push: { statusHistory: { status } } },
      { new: true }
    );
    io.to(`order_${order._id}`).emit('order_status_update', { orderId: order._id, status });
    res.json(order);
  });

  return router;
};
