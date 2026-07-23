const db = require("../config/db");

// Get dashboard statistics
exports.getStats = (req, res) => {
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Total Vendors
  db.query("SELECT COUNT(*) AS count FROM vendors", (err, vendorsResult) => {
    if (err) return res.status(500).json(err);
    const totalVendors = vendorsResult[0]?.count || 0;

    // 2. Total Foods
    db.query("SELECT COUNT(*) AS count FROM foods", (err, foodsResult) => {
      if (err) return res.status(500).json(err);
      const totalFoods = foodsResult[0]?.count || 0;

      // 3. Today's Deliveries
      db.query(
        "SELECT COUNT(*) AS count FROM deliveries WHERE delivery_date = ?",
        [todayStr],
        (err, deliveriesResult) => {
          if (err) return res.status(500).json(err);
          const todaysDeliveries = deliveriesResult[0]?.count || 0;

          // 4. Weekly Payments Due (Unpaid deliveries total)
          const unpaidSql = `
            SELECT SUM(di.payment) AS unpaid_total 
            FROM delivery_items di
            JOIN deliveries d ON di.delivery_id = d.id
            WHERE NOT EXISTS (
              SELECT 1 FROM payments p 
              WHERE p.vendor_id = d.vendor_id 
              AND d.delivery_date BETWEEN p.week_start AND p.week_end
            )
          `;
          db.query(unpaidSql, (err, unpaidResult) => {
            if (err) return res.status(500).json(err);
            const weeklyPayment = unpaidResult[0]?.unpaid_total || 0;

            // 5. Monthly Spending (payments made this month)
            const monthlySql = `
              SELECT SUM(total_payment) AS paid_total 
              FROM payments 
              WHERE DATE_FORMAT(paid_date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
            `;
            db.query(monthlySql, (err, monthlyResult) => {
              if (err) return res.status(500).json(err);
              const monthlySpending = monthlyResult[0]?.paid_total || 0;

              res.json({
                totalVendors,
                totalFoods,
                todaysDeliveries,
                weeklyPayment,
                monthlySpending,
              });
            });
          });
        }
      );
    });
  });
};

// Get chart data
exports.getCharts = (req, res) => {
  // Weekly spending from payments: Group by week_start
  const weeklySql = `
    SELECT week_start, SUM(total_payment) AS amount 
    FROM payments 
    GROUP BY week_start 
    ORDER BY week_start DESC 
    LIMIT 6
  `;

  db.query(weeklySql, (err, weeklyData) => {
    if (err) return res.status(500).json(err);

    // Monthly spending: Group by month
    const monthlySql = `
      SELECT DATE_FORMAT(paid_date, '%Y-%m') AS month, SUM(total_payment) AS amount 
      FROM payments 
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `;

    db.query(monthlySql, (err, monthlyData) => {
      if (err) return res.status(500).json(err);

      // Reverse to show ascending timeline
      res.json({
        weekly: weeklyData.reverse(),
        monthly: monthlyData.reverse(),
      });
    });
  });
};

// Get recent activities
exports.getActivities = (req, res) => {
  // Latest 5 Deliveries
  const deliveriesSql = `
    SELECT d.id, d.delivery_date, v.vendor_name,
           (SELECT SUM(qty_delivered) FROM delivery_items WHERE delivery_id = d.id) AS total_qty
    FROM deliveries d
    JOIN vendors v ON d.vendor_id = v.id
    ORDER BY d.delivery_date DESC, d.id DESC
    LIMIT 5
  `;

  db.query(deliveriesSql, (err, deliveries) => {
    if (err) return res.status(500).json(err);

    // Latest 5 Closings (deliveries that have a positive qty_remaining or qty_sold populated)
    const closingsSql = `
      SELECT d.id, d.delivery_date, v.vendor_name,
             SUM(di.qty_sold) AS total_sold,
             SUM(di.payment) AS total_payment
      FROM delivery_items di
      JOIN deliveries d ON di.delivery_id = d.id
      JOIN vendors v ON d.vendor_id = v.id
      WHERE di.qty_sold > 0
      GROUP BY d.id, d.delivery_date, v.vendor_name
      ORDER BY d.delivery_date DESC, d.id DESC
      LIMIT 5
    `;

    db.query(closingsSql, (err, closings) => {
      if (err) return res.status(500).json(err);

      res.json({
        deliveries,
        closings,
      });
    });
  });
};
