const express = require("express");
const router = express.Router();

const foodController = require("../controllers/foodController");

router.get("/", foodController.getFoods);

router.post("/", foodController.addFood);

router.put("/:id", foodController.updateFood);

router.delete("/:id", foodController.deleteFood);

module.exports = router;