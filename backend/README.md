# Bulk It — Backend API

Wholesale B2B ordering platform for kirana/retail stores. Node.js + Express + MongoDB + Socket.IO.

## Setup

```bash
npm install
cp .env.example .env   # fill in Mongo URI, JWT secret, Twilio, Maps key
npm run dev
```

## Structure

```
backend/
  models/       User, Vendor, Product, Order
  routes/       auth, products, orders, vendors, insights
  middleware/   auth.js (JWT + role check)
  server.js     Express app + Socket.IO + Twilio click-to-call
```

## Core endpoints

| Method | Route                              | Purpose                                   |
|--------|-------------------------------------|--------------------------------------------|
| POST   | /api/auth/register                  | Register store owner / vendor              |
| POST   | /api/auth/login                     | Login, returns JWT                          |
| GET    | /api/products                       | Browse catalog (filter by category/search)  |
| POST   | /api/products                       | Vendor: add product                         |
| POST   | /api/orders                         | Store owner: place order                    |
| GET    | /api/orders/my                      | Store owner: order history                  |
| PATCH  | /api/orders/:id/status               | Vendor: update order status (real-time push) |
| GET    | /api/insights/reorder-suggestions    | AI-style reorder nudges from order history   |
| POST   | /api/vendors/apply                   | Vendor onboarding application                |
| GET    | /api/vendors/pending                 | Admin: pending vendor approvals              |
| PATCH  | /api/vendors/:id/status               | Admin: approve/reject vendor                 |
| POST   | /api/call/connect                    | Click-to-call bridge via Twilio              |

## Real-time events (Socket.IO)

- `new_order` → pushed to `vendor_room` when a store places an order
- `order_status_update` → pushed to `order_<id>` room as status changes
- `driver_location_update` → live delivery tracking for a specific order

## Notes

- `insights.js` is currently a rule-based reorder-frequency model. Swap in an
  actual forecasting model (e.g. moving average or a small regression) once
  there's enough order history per store — the endpoint shape can stay the same.
- Multi-language: store the shop owner's `language` preference on `User` and
  serve translated product/category names from a separate `i18n` lookup table
  or a translation service, rather than hardcoding strings in the schema.
