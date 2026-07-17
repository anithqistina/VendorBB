const db = require("../config/db");

// Get all vendors
exports.getVendors = (req, res) => {

    db.query(
        "SELECT id,vendor_name FROM vendors ORDER BY id ASC",
        (err, result) => {

            if (err) return res.status(500).json(err);

            res.json(result);

        }
    );

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

    const { vendor_id, delivery_date, items } = req.body;

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
                        console.log(err);
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

};

exports.getTodayDelivery = (req, res) => {

    const { vendorId, date } = req.params;

    const sql = `

    SELECT

    di.id,

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

    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({
            message: "No data"
        });
    }

    let completed = 0;

    items.forEach(item => {

        const qtySold =
            item.qty_delivered - item.qty_remaining;

        const payment =
            qtySold * item.vendor_price;

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

                if (err)
                    return res.status(500).json(err);

                completed++;

                if (completed === items.length) {

                    res.json({
                        message: "Closing Saved"
                    });

                }

            }

        );

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