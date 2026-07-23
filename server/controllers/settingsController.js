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
    const sql = "REPLACE INTO settings (`key`, `value`) VALUES (?, ?)";
    
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
  res.status(400).send("Database backup is managed directly by your cloud MySQL database provider dashboard.");
};

// Upload Database Restore
exports.restoreDatabase = (req, res) => {
  res.status(400).json({ message: "Database restore is managed directly by your cloud MySQL database provider dashboard." });
};
