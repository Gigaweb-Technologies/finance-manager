import sqlite3 from 'sqlite3';
import path from 'path';
import { createClient } from '@libsql/client';

const isTursoEnabled = process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN;

let db;
let client;

if (isTursoEnabled) {
    console.log('Turso Database detected. Connecting to libSQL...');
    client = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN,
    });
    initializeDatabase();
} else {
    const dbPath = path.resolve(process.cwd(), 'finance.db');
    db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
        } else {
            console.log('Connected to the SQLite database at:', dbPath);
            initializeDatabase();
        }
    });
}

async function initializeDatabase() {
    console.log('Initializing database schema...');
    
    const tables = [
        // Clients table
        `CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            contact_person TEXT,
            photo_url TEXT,
            balance_aed REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,
        // Transactions table
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
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            full_name TEXT,
            department TEXT,
            photo_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
    ];

    if (isTursoEnabled) {
        try {
            for (const table of tables) {
                await client.execute(table);
            }
            console.log('Turso schema initialized successfully.');
        } catch (err) {
            console.error('Error initializing Turso schema:', err.message);
        }
    } else {
        db.serialize(() => {
            tables.forEach(table => {
                db.run(table);
            });

            // Handle migrations/alterations for local SQLite
            const newClientColumns = ['email', 'phone', 'address', 'contact_person', 'photo_url'];
            db.all("PRAGMA table_info(clients)", (err, rows) => {
                if (err) return;
                const existingColumns = rows.map(row => row.name);
                newClientColumns.forEach(column => {
                    if (!existingColumns.includes(column)) {
                        db.run(`ALTER TABLE clients ADD COLUMN ${column} TEXT`);
                    }
                });
            });

            const userCols = ['email', 'full_name', 'department', 'photo_url'];
            userCols.forEach(col => {
                db.run(`ALTER TABLE users ADD COLUMN ${col} TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error(`Error adding ${col} column:`, err.message);
                    }
                });
            });
        });
    }
}

// Wrapper object to maintain interface compatibility
const dbInterface = {
    query: (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => res.rows);
        }
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    },

    getAsync: (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => res.rows[0]);
        }
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    },

    runAsync: (sql, params = []) => {
        if (isTursoEnabled) {
            return client.execute({ sql, args: params }).then(res => ({
                lastID: res.lastInsertRowid,
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

    // Helper for migrations or direct access if needed
    isTurso: isTursoEnabled
};

export default dbInterface;
