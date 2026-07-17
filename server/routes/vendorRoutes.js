const express = require("express");
const router = express.Router();

const vendorController = require("../controllers/vendorController");

router.get("/", vendorController.getVendors);
router.get("/:id", vendorController.getVendorById);
router.get("/:id/foods", vendorController.getVendorFoods);

router.post("/", vendorController.addVendor);

router.put("/:id", vendorController.updateVendor);

router.delete("/:id", vendorController.deleteVendor);

module.exports = router;