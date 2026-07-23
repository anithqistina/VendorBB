const mysql = require("mysql2");
const bcrypt = require("bcryptjs");

const pool = mysql.createPool({
  host: (process.env.DB_HOST || "localhost").trim(),
  user: (process.env.DB_USER || "root").trim(),
  password: (process.env.DB_PASSWORD || "admincomel").trim(),
  database: (process.env.DB_NAME || "vendorbb").trim(),
  port: parseInt((String(process.env.DB_PORT) || "3306").trim(), 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false }
});
let initDbPromise = null;
let initError = null;

const db = {
  query: function (sql, params, callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    pool.query(sql, params, (err, results) => {
      if (err) {
        console.error("❌ MySQL Query Error:", err.message, "| SQL:", sql, "| Params:", params);
      }
      if (callback) callback(err, results);
    });
  },

  close: function (callback) {
    pool.end(callback);
  },

  reconnect: function () {
    console.log("🔄 MySQL Connection Pool manages connections automatically");
  },

  serialize: function (callback) {
    if (callback) callback();
  },

  initPromise: function () {
    if (!initDbPromise) {
      initDbPromise = initDb();
    }
    return initDbPromise;
  },

  getInitError: function () {
    return initError;
  }
};

// Initialize database schema and tables
async function initDb() {
  const promisePool = pool.promise();
  try {
    // 1. Vendors
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INT PRIMARY KEY AUTO_INCREMENT,
        vendor_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        bank_name VARCHAR(100),
        account_number VARCHAR(100),
        bank_holder_name VARCHAR(255)
      )
    `);

    // 2. Foods
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id INT PRIMARY KEY AUTO_INCREMENT,
        vendor_id INT NOT NULL,
        food_name VARCHAR(255) NOT NULL,
        vendor_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 3. Deliveries
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INT PRIMARY KEY AUTO_INCREMENT,
        vendor_id INT NOT NULL,
        delivery_date VARCHAR(50) NOT NULL,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 4. Delivery Items
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        delivery_id INT NOT NULL,
        food_id INT NOT NULL,
        qty_delivered INT DEFAULT 0,
        qty_remaining INT DEFAULT 0,
        qty_sold INT DEFAULT 0,
        payment DECIMAL(10, 2) DEFAULT 0,
        FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE CASCADE
      )
    `);

    // 5. Payments
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        vendor_id INT NOT NULL,
        week_start VARCHAR(50) NOT NULL,
        week_end VARCHAR(50) NOT NULL,
        total_payment DECIMAL(10, 2) NOT NULL,
        paid_date VARCHAR(50) NOT NULL,
        remarks TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 6. Users
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin'
      )
    `);

    // Seed/verify default users
    const hashedPassword = bcrypt.hashSync("admin123", 10);
    await promisePool.query("DELETE FROM users WHERE username NOT IN ('bblotus', 'bbtunjung')");
    await promisePool.query(
      "REPLACE INTO users (username, password, role) VALUES (?, ?, ?)",
      ["bblotus", hashedPassword, "admin"]
    );
    await promisePool.query(
      "REPLACE INTO users (username, password, role) VALUES (?, ?, ?)",
      ["bbtunjung", hashedPassword, "admin"]
    );
    console.log("👥 Default admin users seeded/verified: bblotus/admin123 and bbtunjung/admin123");

    // 7. Settings
    await promisePool.query(`
      CREATE TABLE IF NOT EXISTS settings (
        \`key\` VARCHAR(255) UNIQUE PRIMARY KEY,
        \`value\` TEXT
      )
    `);

    const defaultSettings = [
      { key: "company_name", value: "VendorBB" },
      { key: "company_logo", value: "" },
      { key: "default_week", value: "Mon-Sun" },
      { key: "whatsapp_template", value: `*Vendor Name*: {vendor_name}

Payment {week_start} - {week_end} 💚

Bank Details :
------------------
🏦 {bank_name}
{account_number}

*Food List*

{food_list}

*Total : RM{total_payment}*

Thank you ❤️` }
    ];

    for (const s of defaultSettings) {
      await promisePool.query(
        "INSERT IGNORE INTO settings (\`key\`, \`value\`) VALUES (?, ?)",
        [s.key, s.value]
      );
    }
    console.log("⚙️ Default settings seeded");
    console.log("✅ MySQL Connected and Initialized Successfully");
  } catch (err) {
    initError = err;
    console.error("❌ MySQL Initialization Error:", err.message);
  }
}

db.initPromise();

module.exports = db;