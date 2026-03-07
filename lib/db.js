import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'finance.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database at:', dbPath);
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.serialize(() => {
        // Clients table
        db.run(`CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      address TEXT,
      contact_person TEXT,
      photo_url TEXT,
      balance_aed REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        // Ensure new client columns exist (Migration)
        const newClientColumns = ['email', 'phone', 'address', 'contact_person', 'photo_url'];
        db.all("PRAGMA table_info(clients)", (err, rows) => {
            if (err) return console.error('Error checking clients table info:', err.message);
            const existingColumns = rows.map(row => row.name);
            newClientColumns.forEach(column => {
                if (!existingColumns.includes(column)) {
                    db.run(`ALTER TABLE clients ADD COLUMN ${column} TEXT`, (err) => {
                        if (err) console.error(`Error adding ${column} to clients:`, err.message);
                    });
                }
            });
        });

        // Transactions table
        db.run(`CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      type TEXT CHECK(type IN ('IN', 'OUT')),
      amount_naira REAL,
      amount_aed REAL NOT NULL,
      exchange_rate REAL,
      recipient TEXT,
      description TEXT,
      transaction_unique_id TEXT UNIQUE,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients (id)
    )`);

        // Ensure transaction_unique_id exists (Migration)
        db.all("PRAGMA table_info(transactions)", (err, rows) => {
            if (err) {
                console.error('Error checking table info:', err.message);
                return;
            }
            const hasUniqueId = rows.some(row => row.name === 'transaction_unique_id');
            if (!hasUniqueId) {
                db.run('ALTER TABLE transactions ADD COLUMN transaction_unique_id TEXT', (err) => {
                    if (err) {
                        console.error('Error adding transaction_unique_id column:', err.message);
                    } else {
                        db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_transaction_unique_id ON transactions (transaction_unique_id)');
                    }
                });
            }
        });

        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT,
      full_name TEXT,
      department TEXT,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
            if (!err) {
                // Add new columns to existing databases
                const cols = ['email', 'full_name', 'department', 'photo_url'];
                cols.forEach(col => {
                    db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
                        if (err && !err.message.includes('duplicate column name')) {
                            console.error(`Error adding ${col} column:`, err.message);
                        }
                    });
                });
            }
        });
    });
}

// Promisified methods
db.query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

db.getAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

db.runAsync = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

export default db;
