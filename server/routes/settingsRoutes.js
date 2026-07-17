const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");

router.get("/", settingsController.getSettings);
router.put("/", settingsController.updateSettings);
router.get("/backup", settingsController.backupDatabase);

// Use raw body parser to receive SQLite binary file streams directly
router.post(
  "/restore",
  express.raw({ type: "application/octet-stream", limit: "50mb" }),
  settingsController.restoreDatabase
);

module.exports = router;
