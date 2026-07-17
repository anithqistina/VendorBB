const db = require("../config/db");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "../database.db");

// Get all settings
exports.getSettings = (req, res) => {
  db.query("SELECT * FROM settings", (err, results) => {
    if (err) return res.status(500).json(err);
    
    // Convert array of {key, value} to an object {company_name: "VendorBB", ...}
    const settingsObj = {};
    results.forEach((row) => {
      settingsObj[row.key] = row.value;
    });
    
    res.json(settingsObj);
  });
};

// Update settings
exports.updateSettings = (req, res) => {
  const settingsObj = req.body; // e.g. { company_name: "VendorBB New", ... }
  const keys = Object.keys(settingsObj);
  
  if (keys.length === 0) {
    return res.status(400).json({ message: "No settings provided" });
  }

  let completed = 0;
  keys.forEach((key) => {
    const value = String(settingsObj[key]);
    const sql = "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)";
    
    db.query(sql, [key, value], (err) => {
      if (err) return res.status(500).json(err);
      
      completed++;
      if (completed === keys.length) {
        res.json({ message: "Settings updated successfully" });
      }
    });
  });
};

// Download Database Backup
exports.backupDatabase = (req, res) => {
  if (fs.existsSync(dbPath)) {
    res.download(dbPath, "vendorbb_backup.db", (err) => {
      if (err) {
        console.error("Backup download failed:", err);
        if (!res.headersSent) {
          res.status(500).send("Failed to download database backup");
        }
      }
    });
  } else {
    res.status(404).send("Database file not found");
  }
};

// Upload Database Restore
exports.restoreDatabase = (req, res) => {
  if (!req.body || req.body.length === 0) {
    return res.status(400).json({ message: "No file data uploaded" });
  }

  console.log("📥 Initiating database restore...");

  // 1. Close current connection
  db.close((err) => {
    if (err) {
      console.error("Error closing SQLite connection for restore:", err);
      // Even if it fails, try to overwrite
    }

    try {
      // 2. Overwrite file
      fs.writeFileSync(dbPath, req.body);
      console.log("💾 Database file replaced successfully");
      
      // 3. Reconnect to the database
      db.reconnect();
      
      res.json({ message: "Database restored successfully. Connections re-established." });
    } catch (writeErr) {
      console.error("Error writing database file:", writeErr);
      
      // Attempt reconnect anyway
      db.reconnect();
      
      res.status(500).json({ message: "Failed to write database file", error: writeErr.message });
    }
  });
};
