const db = require("../config/db");

// Get all vendors' weekly summary
exports.getWeeklySummary = (req, res) => {
  const { start, end } = req.params;

  // 1. Fetch all vendors
  const vendorsSql = "SELECT * FROM vendors ORDER BY id ASC";
  db.query(vendorsSql, (err, vendors) => {
    if (err) return res.status(500).json(err);
    if (vendors.length === 0) return res.json([]);

    let completed = 0;
    const summary = [];

    vendors.forEach((vendor) => {
      // 2. Fetch foods and closing status in that range
      const foodsSql = `
        SELECT 
          f.food_name, 
          f.vendor_price,
          SUM(di.qty_delivered) AS qty_delivered,
          SUM(di.qty_remaining) AS qty_remaining,
          SUM(di.qty_sold) AS qty_sold,
          SUM(di.payment) AS total_payment
        FROM delivery_items di
        JOIN deliveries d ON di.delivery_id = d.id
        JOIN foods f ON di.food_id = f.id
        WHERE d.vendor_id = ? AND d.delivery_date BETWEEN ? AND ?
        GROUP BY di.food_id, f.food_name, f.vendor_price
      `;

      db.query(foodsSql, [vendor.id, start, end], (err, foodsResult) => {
        if (err) return res.status(500).json(err);

        // 3. Check if already marked as paid
        const paidSql = "SELECT * FROM payments WHERE vendor_id = ? AND week_start = ? AND week_end = ?";
        db.query(paidSql, [vendor.id, start, end], (err, paidResult) => {
          if (err) return res.status(500).json(err);

          const isPaid = paidResult.length > 0;
          const paidDetails = isPaid ? paidResult[0] : null;

          const totalPayment = foodsResult.reduce(
            (sum, item) => sum + (Number(item.total_payment) || 0),
            0
          );

          summary.push({
            vendor,
            foods: foodsResult,
            total_payment: totalPayment,
            is_paid: isPaid,
            paid_details: paidDetails,
          });

          completed++;
          if (completed === vendors.length) {
            // Sort by vendor ID
            summary.sort((a, b) =>
              a.vendor.id - b.vendor.id
            );
            res.json(summary);
          }
        });
      });
    });
  });
};

// Mark vendor as paid
exports.savePayment = (req, res) => {
  const { vendor_id, week_start, week_end, total_payment, remarks } = req.body;
  const paid_date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const sql = `
    INSERT INTO payments (vendor_id, week_start, week_end, total_payment, paid_date, remarks)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [vendor_id, week_start, week_end, total_payment, paid_date, remarks || ""],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({
        message: "Payment saved successfully",
        paymentId: result.insertId,
      });
    }
  );
};

// Get payment history
exports.getPaymentHistory = (req, res) => {
  const sql = `
    SELECT p.*, v.vendor_name 
    FROM payments p
    JOIN vendors v ON p.vendor_id = v.id
    ORDER BY p.paid_date DESC, p.id DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

// Mark ALL vendors as paid for a given week (batch)
exports.markAllPaid = (req, res) => {
  const { vendor_ids, week_start, week_end, payments } = req.body;
  // payments = [{ vendor_id, total_payment }]
  const paid_date = new Date().toISOString().split("T")[0];

  if (!payments || payments.length === 0) {
    return res.status(400).json({ message: "No payments provided" });
  }

  let completed = 0;
  let errors = [];

  payments.forEach((p) => {
    // Only insert if not already paid
    const checkSql = "SELECT id FROM payments WHERE vendor_id = ? AND week_start = ? AND week_end = ?";
    db.query(checkSql, [p.vendor_id, week_start, week_end], (err, existing) => {
      if (err) { errors.push(err); }
      else if (!existing || existing.length === 0) {
        const insertSql = `INSERT INTO payments (vendor_id, week_start, week_end, total_payment, paid_date, remarks) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(insertSql, [p.vendor_id, week_start, week_end, p.total_payment, paid_date, ""], (err2) => {
          if (err2) errors.push(err2);
        });
      }
      completed++;
      if (completed === payments.length) {
        res.json({ message: `Marked ${payments.length} vendors as paid`, errors });
      }
    });
  });
};