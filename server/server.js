require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const foodRoutes = require("./routes/foodRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const authMiddleware = require("./middleware/auth");

const db = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());

// Await database initialization on serverless function invoke
app.use(async (req, res, next) => {
  try {
    await db.initPromise();
    next();
  } catch (err) {
    console.error("❌ Database initialization error on request:", err);
    res.status(500).json({ message: "Database initialization failed", error: err.message });
  }
});

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Public Auth routes
app.use("/api/auth", authRoutes);

// Public Database Debug route
app.get("/api/debug-db", (req, res) => {
  const initErr = db.getInitError();
  if (initErr) {
    return res.status(500).json({
      message: "Database initialization failed during startup!",
      error: initErr.message,
      stack: initErr.stack
    });
  }

  db.query("SELECT id, username, role FROM users", (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message, stack: err.stack });
    }
    res.json({
      message: "Database connection and query successful!",
      usersCount: results ? results.length : 0,
      users: results,
      env: {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
      }
    });
  });
});

// Protected app routes
app.use(authMiddleware);
app.use("/api/vendors", vendorRoutes);
app.use("/api/foods", foodRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingsRoutes);

app.get("/", (req, res) => {
  res.send("🚀 VendorBB API Running (Protected)");
});

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;