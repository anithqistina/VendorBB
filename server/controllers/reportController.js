const db = require("../config/db");

// Get daily report
exports.getDailyReport = (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date parameter is required" });
  }

  const sql = `
    SELECT 
      v.vendor_name,
      f.food_name,
      di.qty_delivered,
      di.qty_remaining,
      di.qty_sold,
      f.vendor_price,
      di.payment
    FROM delivery_items di
    JOIN deliveries d ON di.delivery_id = d.id
    JOIN foods f ON di.food_id = f.id
    JOIN vendors v ON d.vendor_id = v.id
    WHERE d.delivery_date = ?
    ORDER BY v.vendor_name ASC, f.food_name ASC
  `;

  db.query(sql, [date], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

// Get weekly report
exports.getWeeklyReport = (req, res) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return res.status(400).json({ message: "Start and End dates are required" });
  }

  const sql = `
    SELECT 
      v.vendor_name,
      f.food_name,
      SUM(di.qty_delivered) AS qty_delivered,
      SUM(di.qty_remaining) AS qty_remaining,
      SUM(di.qty_sold) AS qty_sold,
      f.vendor_price,
      SUM(di.payment) AS total_payment
    FROM delivery_items di
    JOIN deliveries d ON di.delivery_id = d.id
    JOIN foods f ON di.food_id = f.id
    JOIN vendors v ON d.vendor_id = v.id
    WHERE d.delivery_date BETWEEN ? AND ?
    GROUP BY v.id, f.id, v.vendor_name, f.food_name, f.vendor_price
    ORDER BY v.vendor_name ASC, f.food_name ASC
  `;

  db.query(sql, [start, end], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};

// Get monthly report
exports.getMonthlyReport = (req, res) => {
  const { month } = req.query; // format: YYYY-MM

  if (!month) {
    return res.status(400).json({ message: "Month (YYYY-MM) is required" });
  }

  // Monthly summary: list vendors and their total earnings/closings for the month
  const sql = `
    SELECT 
      v.vendor_name,
      v.bank_name,
      v.account_number,
      SUM(di.payment) AS total_revenue,
      (SELECT SUM(total_payment) FROM payments WHERE vendor_id = v.id AND DATE_FORMAT(paid_date, '%Y-%m') = ?) AS total_paid
    FROM delivery_items di
    JOIN deliveries d ON di.delivery_id = d.id
    JOIN foods f ON di.food_id = f.id
    JOIN vendors v ON d.vendor_id = v.id
    WHERE DATE_FORMAT(d.delivery_date, '%Y-%m') = ?
    GROUP BY v.id, v.vendor_name, v.bank_name, v.account_number
    ORDER BY v.vendor_name ASC
  `;

  db.query(sql, [month, month], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
};
