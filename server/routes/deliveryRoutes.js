const express = require("express");

const router = express.Router();

const deliveryController = require("../controllers/deliveryController");

router.get("/vendors", deliveryController.getVendors);

router.get("/foods/:vendorId", deliveryController.getFoodsByVendor);

router.post("/",deliveryController.saveDelivery);

router.get("/today/:vendorId/:date",deliveryController.getTodayDelivery);

router.put("/closing",deliveryController.saveClosing);

router.get("/weekly/:vendorId/:startDate/:endDate",deliveryController.getWeeklyPayment);

router.get("/vendor/:id",deliveryController.getVendorInfo);

module.exports = router;