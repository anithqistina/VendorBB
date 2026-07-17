const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");

router.get("/daily", reportController.getDailyReport);
router.get("/weekly", reportController.getWeeklyReport);
router.get("/monthly", reportController.getMonthlyReport);

module.exports = router;
