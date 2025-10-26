// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { ethers } = require('ethers');
const { signToken, verifyToken } = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for nonces (for demo only)
const nonces = new Map();

// === Routes ===

// 1️⃣ Generate a random nonce for a given address
app.post('/auth/nonce', (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'address required' });

  const nonce = `Sign this nonce to login: ${Math.floor(Math.random() * 1e9)} - ${Date.now()}`;
  nonces.set(address.toLowerCase(), nonce);

  return res.json({ nonce });
});

// 2️⃣ Login: verify signature and issue JWT cookie
app.post('/auth/login', async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature)
      return res.status(400).json({ error: 'address and signature required' });

    const stored = nonces.get(address.toLowerCase());
    if (!stored)
      return res.status(400).json({ error: 'no nonce for address; request a nonce first' });

    // Verify signature
    const recovered = ethers.utils.verifyMessage(stored, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: 'invalid signature' });
    }

    // Signature valid → issue JWT
    const token = signToken({ address: address.toLowerCase() }, { expiresIn: '6h' });
    nonces.delete(address.toLowerCase()); // remove nonce (prevent replay)

    // Send cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 6 * 60 * 60 * 1000, // 6 hours
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'server error' });
  }
});

// 3️⃣ Logout: clear session cookie
app.post('/auth/logout', (req, res) => {
  res.clearCookie('session');
  return res.json({ ok: true });
});

// 4️⃣ Protected route (check JWT)
app.get('/api/me', (req, res) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: 'not authenticated' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: 'invalid or expired token' });

  return res.json({ address: payload.address });
});

// 5️⃣ Serve dashboard page
app.get('/dashboard', (req, res) => {
  return res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 6️⃣ Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
