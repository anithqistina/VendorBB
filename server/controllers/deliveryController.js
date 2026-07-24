const db = require("../config/db");

// Get all vendors (optionally with delivery/closing status for a specific date)
exports.getVendors = (req, res) => {
    const { date } = req.query;

    if (date) {
        const sql = `
            SELECT 
                v.id, 
                v.vendor_name,
                d.id AS delivery_id,
                d.is_closed
            FROM vendors v
            LEFT JOIN deliveries d 
                ON v.id = d.vendor_id AND d.delivery_date = ?
            ORDER BY v.id ASC
        `;
        db.query(sql, [date], (err, result) => {
            if (err) return res.status(500).json(err);
            res.json(result);
        });
    } else {
        db.query(
            "SELECT id,vendor_name FROM vendors ORDER BY id ASC",
            (err, result) => {
                if (err) return res.status(500).json(err);
                res.json(result);
            }
        );
    }
};

// Get foods by vendor
exports.getFoodsByVendor = (req, res) => {

    const { vendorId } = req.params;

    const sql = `
    SELECT
    id,
    food_name,
    vendor_price
    FROM foods
    WHERE vendor_id=?
    ORDER BY food_name
    `;

    db.query(sql, [vendorId], (err, result) => {

        if (err)
            return res.status(500).json(err);

        res.json(result);

    });

};

exports.saveDelivery = (req, res) => {
    const { delivery_id, vendor_id, delivery_date, items } = req.body;

    if (delivery_id) {
        // Update existing delivery
        db.query(
            "UPDATE deliveries SET delivery_date = ?, is_closed = 0 WHERE id = ?",
            [delivery_date, delivery_id],
            (err) => {
                if (err) return res.status(500).json(err);

                // Fetch existing delivery items to know what to update/insert/delete
                db.query(
                    "SELECT id, food_id FROM delivery_items WHERE delivery_id = ?",
                    [delivery_id],
                    (err, existingItems) => {
                        if (err) return res.status(500).json(err);

                        const existingMap = {};
                        existingItems.forEach(item => {
                            existingMap[item.food_id] = item;
                        });

                        const newFoodIds = items.map(item => item.food_id);

                        if (items.length === 0) {
                            // If no items, delete all existing items for this delivery
                            db.query(
                                "DELETE FROM delivery_items WHERE delivery_id = ?",
                                [delivery_id],
                                (err) => {
                                    if (err) return res.status(500).json(err);
                                    return res.json({ message: "Delivery Updated Successfully" });
                                }
                            );
                            return;
                        }

                        // Delete items that are no longer in the new items list
                        db.query(
                            "DELETE FROM delivery_items WHERE delivery_id = ? AND food_id NOT IN (?)",
                            [delivery_id, newFoodIds],
                            (err) => {
                                if (err) return res.status(500).json(err);

                                let completed = 0;
                                items.forEach(item => {
                                    const existing = existingMap[item.food_id];
                                    if (existing) {
                                        // Update existing item, reset remaining / sold / payment to 0
                                        db.query(
                                            `UPDATE delivery_items 
                                             SET qty_delivered = ?, qty_remaining = 0, qty_sold = 0, payment = 0
                                             WHERE id = ?`,
                                            [item.qty, existing.id],
                                            (err) => {
                                                if (err) console.error(err);
                                                completed++;
                                                if (completed === items.length) {
                                                    res.json({ message: "Delivery Updated Successfully" });
                                                }
                                            }
                                        );
                                    } else {
                                        // Insert new item
                                        db.query(
                                            `INSERT INTO delivery_items (delivery_id, food_id, qty_delivered)
                                             VALUES (?, ?, ?)`,
                                            [delivery_id, item.food_id, item.qty],
                                            (err) => {
                                                if (err) console.error(err);
                                                completed++;
                                                if (completed === items.length) {
                                                    res.json({ message: "Delivery Updated Successfully" });
                                                }
                                            }
                                        );
                                    }
                                });
                            }
                        );
                    }
                );
            }
        );
    } else {
        // Insert new delivery
        const sql = `
            INSERT INTO deliveries (vendor_id, delivery_date)
            VALUES (?, ?)
        `;

        db.query(sql, [vendor_id, delivery_date], (err, result) => {
            if (err) return res.status(500).json(err);

            const deliveryId = result.insertId;

            if (!items || items.length === 0) {
                return res.json({
                    message: "Delivery Saved (No Items)"
                });
            }

            let completed = 0;
            items.forEach(item => {
                db.query(
                    `
                    INSERT INTO delivery_items
                    (delivery_id, food_id, qty_delivered)
                    VALUES (?, ?, ?)
                    `,
                    [
                        deliveryId,
                        item.food_id,
                        item.qty
                    ],
                    (err) => {
                        if (err) {
                            console.error(err);
                            return;
                        }

                        completed++;
                        if (completed === items.length) {
                            res.json({
                                message: "Delivery Saved Successfully"
                            });
                        }
                    }
                );
            });
        });
    }
};

exports.getTodayDelivery = (req, res) => {
    const { vendorId, date } = req.params;

    const sql = `
    SELECT
    di.id,
    d.id AS delivery_id,
    d.is_closed,
    di.food_id,
    f.food_name,
    f.vendor_price,
    di.qty_delivered,
    di.qty_remaining,
    di.qty_sold,
    di.payment
    FROM delivery_items di
    JOIN deliveries d
    ON di.delivery_id=d.id
    JOIN foods f
    ON di.food_id=f.id
    WHERE
    d.vendor_id=?
    AND
    d.delivery_date=?
    ORDER BY f.food_name
    `;

    db.query(sql, [vendorId, date], (err, result) => {
        if (err)
            return res.status(500).json(err);
        res.json(result);
    });
}

exports.saveClosing = (req, res) => {
    const { delivery_id, delivery_date, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({
            message: "No data"
        });
    }

    // Step 1: Update the delivery status to closed (and potentially its date if edited)
    const updateDeliverySql = (delivery_date && delivery_id)
        ? "UPDATE deliveries SET delivery_date = ?, is_closed = 1 WHERE id = ?"
        : "UPDATE deliveries SET is_closed = 1 WHERE id = ?";
    
    const updateDeliveryParams = (delivery_date && delivery_id)
        ? [delivery_date, delivery_id]
        : [delivery_id];

    db.query(updateDeliverySql, updateDeliveryParams, (err) => {
        if (err) {
            console.error("Error setting delivery status to closed:", err);
            return res.status(500).json(err);
        }

        let completed = 0;
        items.forEach(item => {
            const qtySold = item.qty_delivered - item.qty_remaining;
            const payment = qtySold * item.vendor_price;

            const sql = `
            UPDATE delivery_items
            SET
            qty_remaining=?,
            qty_sold=?,
            payment=?
            WHERE id=?
            `;

            db.query(
                sql,
                [
                    item.qty_remaining,
                    qtySold,
                    payment,
                    item.id
                ],
                (err) => {
                    if (err) return res.status(500).json(err);

                    completed++;
                    if (completed === items.length) {
                        res.json({
                            message: "Closing Saved"
                        });
                    }
                }
            );
        });
    });
};

exports.getWeeklyPayment = (req, res) => {

    const { vendorId, startDate, endDate } = req.params;

    const sql = `

    SELECT

    d.delivery_date,

    SUM(di.payment) AS total

    FROM deliveries d

    JOIN delivery_items di

    ON d.id=di.delivery_id

    WHERE

    d.vendor_id=?

    AND

    d.delivery_date BETWEEN ? AND ?

    GROUP BY d.delivery_date

    ORDER BY d.delivery_date

    `;

    db.query(

        sql,

        [

            vendorId,

            startDate,

            endDate

        ],

        (err, result) => {

            if (err)
                return res.status(500).json(err);

            res.json(result);

        }

    );

}

exports.getVendorInfo = (req, res) => {

    const { id } = req.params;

    db.query(

        "SELECT * FROM vendors WHERE id=?",

        [id],

        (err, result) => {

            if (err) return res.status(500).json(err);

            res.json(result[0]);

        }

    );

}