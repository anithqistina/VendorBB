const db = require("../config/db");

// Get all vendors
exports.getVendors = (req, res) => {
  const sql = "SELECT * FROM vendors ORDER BY id ASC";

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);

    res.json(result);
  });
};

// Add vendor
exports.addVendor = (req, res) => {
  const {
    vendor_name,
    phone,
    whatsapp,
    bank_name,
    account_number,
    bank_holder_name
  } = req.body;

  const sql = `
  INSERT INTO vendors
  (vendor_name, phone, whatsapp, bank_name, account_number, bank_holder_name)
  VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      vendor_name,
      phone,
      whatsapp,
      bank_name,
      account_number,
      bank_holder_name
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Vendor added successfully",
        vendorId: result.insertId
      });
    }
  );
};

exports.updateVendor = (req, res) => {

    const { id } = req.params;

    const {
        vendor_name,
        phone,
        whatsapp,
        bank_name,
        account_number,
        bank_holder_name
    } = req.body;

    const sql = `
    UPDATE vendors
    SET
    vendor_name=?,
    phone=?,
    whatsapp=?,
    bank_name=?,
    account_number=?,
    bank_holder_name=?
    WHERE id=?
    `;

    db.query(sql, [
        vendor_name,
        phone,
        whatsapp,
        bank_name,
        account_number,
        bank_holder_name,
        id
    ], (err)=>{
        if(err) return res.status(500).json(err);
        res.json({
            message:"Vendor Updated"
        });
    });

}

exports.deleteVendor = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM vendors WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Vendor Deleted" });
  });
};

// Get single vendor by ID
exports.getVendorById = (req, res) => {
  const { id } = req.params;
  db.query("SELECT * FROM vendors WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result || result.length === 0) return res.status(404).json({ message: "Vendor not found" });
    res.json(result[0]);
  });
};

// Get foods for a specific vendor
exports.getVendorFoods = (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM foods WHERE vendor_id = ? ORDER BY food_name ASC";
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
};