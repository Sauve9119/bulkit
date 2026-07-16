const express = require('express');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// Simple rule-based "AI insight" for what to reorder — swap with a real
// forecasting model once enough order history exists per store.
router.get('/reorder-suggestions', auth('store_owner'), async (req, res) => {
  const orders = await Order.find({ storeOwner: req.user.id }).sort({ createdAt: -1 }).limit(20);

  const frequency = {}; // productName -> {count, totalQty, lastOrderedAt}
  orders.forEach(order => {
    order.items.forEach(item => {
      if (!frequency[item.name]) {
        frequency[item.name] = { count: 0, totalQty: 0, lastOrderedAt: order.createdAt };
      }
      frequency[item.name].count += 1;
      frequency[item.name].totalQty += item.quantity;
    });
  });

  const daysSinceFirstOrder = orders.length
    ? (Date.now() - new Date(orders[orders.length - 1].createdAt)) / 86400000
    : 1;

  const suggestions = Object.entries(frequency)
    .map(([name, stats]) => {
      const avgDaysBetweenOrders = daysSinceFirstOrder / stats.count;
      const daysSinceLastOrder = (Date.now() - new Date(stats.lastOrderedAt)) / 86400000;
      const dueSoon = daysSinceLastOrder >= avgDaysBetweenOrders * 0.8;
      return {
        product: name,
        timesOrdered: stats.count,
        avgQtyPerOrder: Math.round(stats.totalQty / stats.count),
        dueSoon
      };
    })
    .filter(s => s.dueSoon)
    .sort((a, b) => b.timesOrdered - a.timesOrdered);

  res.json({ suggestions });
});

module.exports = router;
