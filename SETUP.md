# Bulk It — Complete Setup & Deployment Guide

## What's in this project

```
bulkit/
  backend/          Express + MongoDB + Socket.IO API
  frontend/          (in progress) React app talking to the backend
  bulkit-landing.html   Marketing site (standalone, no build needed)
  bulkit-app.html       Client-only ordering demo (standalone, no build needed)
  docker-compose.yml     Local full-stack run (backend + MongoDB)
  render.yaml            Render.com deploy config
```

---

## 1. Run it locally (fastest way — Docker)

If you have Docker installed, this is the least error-prone path:

```bash
docker compose up --build
```

This starts MongoDB and the backend together, wired correctly. Check:

```bash
curl http://localhost:5000/api/health
# → {"status":"ok","service":"bulkit-backend","db":"connected"}
```

If `db` says `"connecting"` for more than ~10 seconds, your `MONGO_URI` is wrong or Mongo isn't reachable — see troubleshooting below.

## 2. Run it locally (without Docker)

You need Node.js 18+ and either a local MongoDB or a free MongoDB Atlas cluster.

```bash
cd backend
npm install
cp .env.example .env
# edit .env — at minimum set MONGO_URI and JWT_SECRET
npm run dev
```

Verify: `curl http://localhost:5000/api/health` should return `status: ok` within a second — even before Mongo finishes connecting, since the fix below decouples the two.

---

## 3. The health-check issue — what was wrong and what changed

**Root cause:** the original `server.js` only called `server.listen(...)` *inside* the MongoDB connection's `.then()` callback. So if Mongo was slow, unreachable, or misconfigured on the deploy platform, the app never opened its port at all — and the platform's health check (which just pings the port/path shortly after boot) timed out and marked the deploy unhealthy.

**Fix applied** (already in `backend/server.js`):
- The HTTP server now calls `server.listen(PORT, '0.0.0.0', ...)` **immediately** on boot, independent of MongoDB.
- MongoDB connects separately in the background, with automatic retry (5 attempts, 5s apart) and clear console logging if `MONGO_URI` is missing or wrong.
- `/api/health` always responds `200 OK` right away, and now also reports live DB status (`connected` / `connecting` / `disconnected`) so you can see what's actually happening from the outside.
- The server binds to host `0.0.0.0` explicitly — binding only to `localhost`/`127.0.0.1` is a common reason containers fail platform health checks even when the app itself is running fine.

If you deploy again and still see a health-check failure, check in this order:
1. **Is `MONGO_URI` actually set** in your platform's environment variables? (Not just in your local `.env` — that file never leaves your machine.)
2. **Does your health check path match** `/api/health` exactly (not `/health` or `/`)?
3. **Is the platform pinging the right port?** It should read `process.env.PORT` — don't hardcode `5000` in the platform's dashboard if it auto-assigns a different port.
4. **MongoDB Atlas users:** whitelist `0.0.0.0/0` (or the platform's IP range) in Atlas's Network Access settings — a very common silent failure.

---

## 4. Deploying — Render (recommended, free tier available)

1. Push this project to a GitHub repo.
2. In Render: **New → Blueprint**, point it at your repo — it will read `render.yaml` automatically.
3. In the Render dashboard, fill in the environment variables marked `sync: false`:
   - `MONGO_URI` — use a free MongoDB Atlas connection string
   - `CLIENT_URL` — your frontend's deployed URL (or `*` while testing)
   - Twilio keys, if you're using click-to-call
4. Render already knows to check `/api/health` (set via `healthCheckPath` in `render.yaml`).

## 5. Deploying — Railway / Heroku-style platforms

- A `Procfile` is included (`web: node server.js`).
- Set the same environment variables as above in that platform's dashboard.
- Make sure the platform's health check (if it has one) is pointed at `/api/health`.

## 6. Deploying — plain VPS / your own server

```bash
cd backend
npm install --omit=dev
cp .env.example .env   # fill in real values
node server.js
```
Put it behind Nginx or Caddy as a reverse proxy, and use `pm2` or a systemd service to keep it alive across restarts.

---

## 7. Quick sanity checklist before every deploy

- [ ] `MONGO_URI` set in the deploy platform's env vars (not just locally)
- [ ] `JWT_SECRET` set to a real random value, not the placeholder
- [ ] MongoDB Atlas network access allows the platform's outbound IPs
- [ ] Health check path set to `/api/health`
- [ ] `PORT` left to the platform to inject — don't hardcode it
