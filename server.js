// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { ethers } = require("ethers");
const { signToken, verifyToken } = require("./utils/auth");
const connectDB = require("./utils/db");
const Item = require("./models/Item");

const app = express();
const PORT = process.env.PORT || 3000;

// === Middleware ===
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ✅ Serve all static files from /public (index.html, dashboard.html, js, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ✅ Connect to MongoDB using your utils/db.js helper
connectDB();

// === In-memory nonce store (for MetaMask login) ===
const nonces = new Map();

// === Auth Routes ===

// Generate nonce
app.post("/auth/nonce", (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: "address required" });

  const nonce = `Sign this nonce to login: ${Math.floor(Math.random() * 1e9)} - ${Date.now()}`;
  nonces.set(address.toLowerCase(), nonce);
  return res.json({ nonce });
});

// Login: verify signature and issue JWT cookie
app.post("/auth/login", async (req, res) => {
  try {
    const { address, signature } = req.body;
    if (!address || !signature)
      return res.status(400).json({ error: "address and signature required" });

    const stored = nonces.get(address.toLowerCase());
    if (!stored)
      return res.status(400).json({ error: "no nonce for address; request a nonce first" });

    // Verify MetaMask signature
    const recovered = ethers.utils.verifyMessage(stored, signature);
    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({ error: "invalid signature" });
    }

    // Valid signature → issue JWT
    const token = signToken({ address: address.toLowerCase() }, { expiresIn: "6h" });
    nonces.delete(address.toLowerCase());

    // Set session cookie
    res.cookie("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 6 * 60 * 60 * 1000,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "server error" });
  }
});

// Logout
app.post("/auth/logout", (req, res) => {
  res.clearCookie("session", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  return res.json({ ok: true });
});

// === Auth Middleware ===
function requireAuth(req, res, next) {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "not authenticated" });

  const decoded = verifyToken(token);
  if (!decoded) return res.status(401).json({ error: "invalid token" });

  req.user = decoded;
  next();
}

// === Current user info ===
app.get("/api/me", requireAuth, (req, res) => {
  return res.json({ address: req.user.address });
});

// === CRUD Routes ===

// Create item
app.post("/api/items", requireAuth, async (req, res) => {
  try {
    const data = req.body;
    data.userId = req.user.address;
    const newItem = await Item.create(data);
    res.json(newItem);
  } catch (err) {
    console.error("Create item error:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

// Read all items for user
app.get("/api/items", requireAuth, async (req, res) => {
  try {
    const items = await Item.find({ userId: req.user.address });
    res.json(items);
  } catch (err) {
    console.error("Read items error:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

// Update item
app.put("/api/items/:id", requireAuth, async (req, res) => {
  try {
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.address },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error("Update item error:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

// Delete item
app.delete("/api/items/:id", requireAuth, async (req, res) => {
  try {
    const result = await Item.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.address,
    });
    if (!result) return res.status(404).json({ error: "Item not found" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete item error:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// === Fallback route for 404 ===
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "index.html"));
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
