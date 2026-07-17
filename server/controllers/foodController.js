const db = require("../config/db");

// Get all foods
exports.getFoods = (req, res) => {
  const sql = `
    SELECT
      foods.*,
      vendors.vendor_name
    FROM foods
    JOIN vendors
    ON foods.vendor_id = vendors.id
    ORDER BY vendors.vendor_name ASC
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
};

// Add Food
exports.addFood = (req, res) => {

  const {
    vendor_id,
    food_name,
    vendor_price
  } = req.body;

  const sql = `
  INSERT INTO foods
  (vendor_id,food_name,vendor_price)
  VALUES(?,?,?)
  `;

  db.query(
    sql,
    [
      vendor_id,
      food_name,
      vendor_price
    ],
    (err) => {

      if (err)
        return res.status(500).json(err);

      res.json({
        message: "Food Added Successfully"
      });

    }
  );

};

// Update Food
exports.updateFood = (req, res) => {

  const { id } = req.params;

  const {
    vendor_id,
    food_name,
    vendor_price
  } = req.body;

  const sql = `
  UPDATE foods
  SET
  vendor_id=?,
  food_name=?,
  vendor_price=?
  WHERE id=?
  `;

  db.query(
    sql,
    [
      vendor_id,
      food_name,
      vendor_price,
      id
    ],
    (err) => {

      if (err)
        return res.status(500).json(err);

      res.json({
        message: "Food Updated"
      });

    }
  );

};

// Delete Food
exports.deleteFood = (req, res) => {

  const { id } = req.params;

  db.query(
    "DELETE FROM foods WHERE id=?",
    [id],
    (err) => {

      if (err)
        return res.status(500).json(err);

      res.json({
        message: "Food Deleted"
      });

    }
  );

};