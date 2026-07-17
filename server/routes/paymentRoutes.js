const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");

router.get("/weekly-summary/:start/:end", paymentController.getWeeklySummary);
router.post("/pay", paymentController.savePayment);
router.post("/mark-all-paid", paymentController.markAllPaid);
router.get("/history", paymentController.getPaymentHistory);

module.exports = router;