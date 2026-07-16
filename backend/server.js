require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const twilio = require('twilio');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const insightRoutes = require('./routes/insights');
const vendorRoutes = require('./routes/vendors');
const buildOrderRoutes = require('./routes/orders');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || '*' } });

app.use(cors());
app.use(express.json());

// --- Socket.IO: real-time order tracking + vendor notifications ---
io.on('connection', (socket) => {
  socket.on('join_vendor_room', () => socket.join('vendor_room'));
  socket.on('track_order', (orderId) => socket.join(`order_${orderId}`));
  socket.on('driver_location', ({ orderId, lat, lng }) => {
    io.to(`order_${orderId}`).emit('driver_location_update', { lat, lng });
  });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/insights', insightRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/orders', buildOrderRoutes(io));

// --- Click-to-call: connect store owner to vendor without exposing numbers ---
app.post('/api/call/connect', async (req, res) => {
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const { fromNumber, toNumber } = req.body;
    const call = await client.calls.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: fromNumber,
      url: `https://handler.twilio.com/twiml/bridge-to?number=${encodeURIComponent(toNumber)}`
    });
    res.json({ sid: call.sid, status: call.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check must respond fast and independently of DB state —
// deploy platforms (Render/Railway/Heroku/etc.) hit this right after
// boot, before Mongo may have finished connecting.
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0=disconnected,1=connected,2=connecting,3=disconnecting
  res.status(200).json({
    status: 'ok',
    service: 'bulkit-backend',
    db: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState]
  });
});

// --- Start listening immediately — do NOT wait on Mongo to boot the server ---
// Binding to 0.0.0.0 (not just localhost) is required by most PaaS platforms.
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Bulk It API listening on ${HOST}:${PORT}`);
});

// --- Connect to Mongo separately, with retry, without blocking the server ---
function connectMongo(retries = 5, delayMs = 5000) {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set — set it in your environment/deploy config.');
    return;
  }
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
      if (retries > 0) {
        console.log(`Retrying MongoDB connection in ${delayMs / 1000}s... (${retries} left)`);
        setTimeout(() => connectMongo(retries - 1, delayMs), delayMs);
      }
    });
}
connectMongo();

process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(() => mongoose.connection.close(false, () => process.exit(0)));
});
