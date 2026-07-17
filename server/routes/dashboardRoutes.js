const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

router.get("/stats", dashboardController.getStats);
router.get("/charts", dashboardController.getCharts);
router.get("/activity", dashboardController.getActivities);
router.get("/activities", dashboardController.getActivities);

module.exports = router;
