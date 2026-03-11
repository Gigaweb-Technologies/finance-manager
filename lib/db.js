import sqlite3 from 'sqlite3';
import path from 'path';
import { createClient } from '@libsql/client';

const isTursoEnabled = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

let db;
let client;
let isInitialized = false;

async function initializeDatabase() {
    console.log('--- Database Initialization ---');
    console.log(`Mode: ${isTursoEnabled ? 'Turso (libSQL)' : 'Local SQLite'}`);

    const tables = [
        `CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            contact_person TEXT,
            photo_url TEXT,
            currency TEXT DEFAULT 'AED',
            balance_aed REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
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
        )`,
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            department TEXT,
            photo_url TEXT,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        `CREATE TABLE IF NOT EXISTS recipients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            name TEXT NOT NULL,
            bank_name TEXT,
            account_number TEXT,
            is_active INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )`
    ];

    if (isTursoEnabled) {
        try {
            console.log('Connecting to Turso...');
            for (const table of tables) {
                await client.execute(table);
            }
            // Add role column and currency column if missing
            try { await client.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'"); } catch (e) { /* already exists */ }
            try { await client.execute("ALTER TABLE clients ADD COLUMN currency TEXT DEFAULT 'USD'"); } catch (e) { /* already exists */ }
            // Promote first user to admin if none exists
            const adminCheck = await client.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'");
            if (adminCheck.rows[0]?.cnt === 0) {
                await client.execute("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)");
                console.log('✅ First Turso user promoted to admin.');
            }
            console.log('✅ Turso schema initialized successfully.');
            isInitialized = true;
        } catch (err) {
            console.error('❌ Error initializing Turso schema:', err.message);
            console.error('Check your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN.');
        }
    } else {
        db.serialize(() => {
            tables.forEach(table => {
                db.run(table);
            });

            // Local migrations
            const newClientColumns = ['email', 'phone', 'address', 'contact_person', 'photo_url', 'currency'];
            db.all("PRAGMA table_info(clients)", (err, rows) => {
                if (err) return;
                const existingColumns = rows.map(row => row.name);
                newClientColumns.forEach(column => {
                    if (!existingColumns.includes(column)) {
                        db.run(`ALTER TABLE clients ADD COLUMN ${column} TEXT`);
                    }
                });
            });

            const userCols = ['email', 'full_name', 'department', 'photo_url', 'role'];
            userCols.forEach(col => {
                db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`Error adding ${col} column:`, err.message);
                    }
                });
            });
            // Promote first user to admin if no admin exists yet
            db.get("SELECT COUNT(*) as cnt FROM users WHERE role = 'admin'", (err, row) => {
                if (!err && row && row.cnt === 0) {
                    db.run("UPDATE users SET role = 'admin' WHERE id = (SELECT MIN(id) FROM users)");
                    console.log('✅ First user promoted to admin.');
                }
            });
            console.log('✅ Local SQLite schema initialized.');
            isInitialized = true;
        });
    }
}

if (isTursoEnabled) {
    client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    initializeDatabase();
} else {
    const dbPath = path.resolve(process.cwd(), 'finance.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Error connecting to local database:', err.message);
        } else {
            console.log('Connected to local SQLite database.');
            initializeDatabase();
        }
    });
}

const serializeBigInt = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(serializeBigInt);
    if (typeof obj === 'object') {
        const newObj = {};
        for (const key in obj) {
            newObj[key] = serializeBigInt(obj[key]);
        }
        return newObj;
    }
    return obj;
};

const dbInterface = {
    query: async (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => serializeBigInt(res.rows));
        }
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getAsync: async (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => serializeBigInt(res.rows[0]));
        }
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    runAsync: async (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => ({
                lastID: serializeBigInt(res.lastInsertRowid),
                changes: res.rowsAffected
            }));
        }
        return new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ lastID: this.lastID, changes: this.changes });
            });
        });
    },

    isTurso: isTursoEnabled,
    isInitialized: () => isInitialized
};

export default dbInterface;
