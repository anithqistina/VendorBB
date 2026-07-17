const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcryptjs");

const dbPath = path.join(__dirname, "../database.db");
let dbConn = new sqlite3.Database(dbPath);

const db = {
  query: function (sql, params, callback) {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }

    const isSelect = /^\s*(SELECT|SHOW|DESCRIBE|PRAGMA)/i.test(sql);

    if (isSelect) {
      dbConn.all(sql, params, (err, rows) => {
        if (err) {
          console.error("❌ SQLite SELECT Query Error:", err.message, "| SQL:", sql, "| Params:", params);
        }
        if (callback) callback(err, rows);
      });
    } else {
      dbConn.run(sql, params, function (err) {
        if (err) {
          console.error("❌ SQLite RUN Query Error:", err.message, "| SQL:", sql, "| Params:", params);
        }
        const result = {
          insertId: this ? this.lastID : null,
          affectedRows: this ? this.changes : null,
        };
        if (callback) callback(err, result);
      });
    }
  },

  close: function (callback) {
    dbConn.close(callback);
  },

  reconnect: function () {
    dbConn = new sqlite3.Database(dbPath);
    console.log("🔄 SQLite Database reconnected");
  },
  
  serialize: function (callback) {
    dbConn.serialize(callback);
  }
};

// Initialize database schema and tables
function initDb() {
  dbConn.run("PRAGMA busy_timeout = 10000;");
  dbConn.serialize(() => {
    // 1. Vendors
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_name TEXT NOT NULL,
        phone TEXT,
        whatsapp TEXT,
        bank_name TEXT,
        account_number TEXT,
        bank_holder_name TEXT
      )
    `);

    // 2. Foods
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        food_name TEXT NOT NULL,
        vendor_price REAL NOT NULL,
        status TEXT DEFAULT 'active',
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 3. Deliveries
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        delivery_date TEXT NOT NULL,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 4. Delivery Items
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        delivery_id INTEGER NOT NULL,
        food_id INTEGER NOT NULL,
        qty_delivered INTEGER DEFAULT 0,
        qty_remaining INTEGER DEFAULT 0,
        qty_sold INTEGER DEFAULT 0,
        payment REAL DEFAULT 0,
        FOREIGN KEY (delivery_id) REFERENCES deliveries (id) ON DELETE CASCADE,
        FOREIGN KEY (food_id) REFERENCES foods (id) ON DELETE CASCADE
      )
    `);

    // 5. Payments
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        week_start TEXT NOT NULL,
        week_end TEXT NOT NULL,
        total_payment REAL NOT NULL,
        paid_date TEXT NOT NULL,
        remarks TEXT,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
      )
    `);

    // 6. Users
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'admin'
      )
    `, () => {
      const hashedPassword = bcrypt.hashSync("admin123", 10);
      dbConn.run("DELETE FROM users WHERE username NOT IN ('bblotus', 'bbtunjung')");
      dbConn.run(
        "INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)",
        ["bblotus", hashedPassword, "admin"]
      );
      dbConn.run(
        "INSERT OR REPLACE INTO users (username, password, role) VALUES (?, ?, ?)",
        ["bbtunjung", hashedPassword, "admin"]
      );
      console.log("👥 Default admin users seeded/verified: bblotus/admin123 and bbtunjung/admin123");
    });

    // 7. Settings
    dbConn.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT UNIQUE PRIMARY KEY,
        value TEXT
      )
    `, () => {
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

      defaultSettings.forEach(s => {
        dbConn.run(
          "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
          [s.key, s.value]
        );
      });
      console.log("⚙️ Default settings seeded");
    });

    console.log("✅ SQLite Connected and Initialized Successfully");
  });
}

initDb();

module.exports = db;