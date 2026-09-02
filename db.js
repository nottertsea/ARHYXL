const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();

const client = (process.env.DB_CLIENT || 'sqlite').toLowerCase();
let pool;
let sqlite;

const schemaStatements = (file) => fs.readFileSync(path.join(__dirname, file), 'utf8')
    .split(';').map((statement) => statement.trim()).filter(Boolean);

const sqliteRun = (sql, params = []) => new Promise((resolve, reject) => {
    sqlite.run(sql, params, function onRun(error) {
        if (error) reject(error); else resolve({ lastInsertRowid: this.lastID, changes: this.changes });
    });
});
const sqliteAll = (sql, params = []) => new Promise((resolve, reject) => sqlite.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
const sqliteGet = async (sql, params = []) => (await sqliteAll(sql, params))[0];
const sqliteExec = (sql) => new Promise((resolve, reject) => sqlite.exec(sql, (error) => error ? reject(error) : resolve()));

const db = {
    client,
    async init() {
        if (client === 'mysql') {
            pool = mysql.createPool({
                host: process.env.MYSQL_HOST,
                port: Number(process.env.MYSQL_PORT || 3306),
                database: process.env.MYSQL_DATABASE,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASSWORD,
                ssl: process.env.MYSQL_SSL === 'true' ? {} : undefined,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                decimalNumbers: true
            });
            const connection = await pool.getConnection();
            try {
                for (const statement of schemaStatements('mysql-schema.sql')) await connection.query(statement);
                await connection.query('SELECT 1');
            } finally { connection.release(); }
            console.log('MySQL connected successfully.');
            return;
        }
        sqlite = new sqlite3.Database(path.join(__dirname, process.env.SQLITE_PATH || 'arhyxl.sqlite'));
        await sqliteExec('PRAGMA foreign_keys = ON');
        for (const statement of schemaStatements('schema.sql')) await sqliteExec(statement);
        await migrateSqlite();
        console.log('SQLite connected successfully.');
    },
    async all(sql, params = []) { return client === 'mysql' ? (await pool.execute(sql, params))[0] : sqliteAll(sql, params); },
    async get(sql, params = []) { return client === 'mysql' ? (await pool.execute(sql, params))[0][0] : sqliteGet(sql, params); },
    async run(sql, params = []) {
        if (client === 'mysql') { const [result] = await pool.execute(sql, params); return { lastInsertRowid: result.insertId, changes: result.affectedRows }; }
        return sqliteRun(sql, params);
    },
    async transaction(work) {
        if (client === 'mysql') {
            const connection = await pool.getConnection();
            const tx = {
                all: async (sql, params = []) => (await connection.execute(sql, params))[0],
                get: async (sql, params = []) => (await connection.execute(sql, params))[0][0],
                run: async (sql, params = []) => { const [result] = await connection.execute(sql, params); return { lastInsertRowid: result.insertId, changes: result.affectedRows }; }
            };
            try { await connection.beginTransaction(); const result = await work(tx); await connection.commit(); return result; }
            catch (error) { await connection.rollback(); throw error; }
            finally { connection.release(); }
        }
        await sqliteRun('BEGIN');
        try { const result = await work({ all: sqliteAll, get: sqliteGet, run: sqliteRun }); await sqliteRun('COMMIT'); return result; }
        catch (error) { await sqliteRun('ROLLBACK'); throw error; }
    },
    async close() { if (pool) await pool.end(); if (sqlite) await new Promise((resolve, reject) => sqlite.close((error) => error ? reject(error) : resolve())); }
};

async function migrateSqlite() {
    const columns = await sqliteAll('PRAGMA table_info(orders)');
    if (!columns.some((column) => column.name === 'idempotency_key')) {
        await sqliteRun('ALTER TABLE orders ADD COLUMN idempotency_key TEXT');
        await sqliteRun("UPDATE orders SET idempotency_key = 'legacy-' || id WHERE idempotency_key IS NULL");
        await sqliteExec('CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_idempotency ON orders(idempotency_key)');
    }
    if (!columns.some((column) => column.name === 'authorization_url')) await sqliteRun('ALTER TABLE orders ADD COLUMN authorization_url TEXT');
    if (!columns.some((column) => column.name === 'updated_at')) await sqliteRun("ALTER TABLE orders ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP");
    const itemColumns = await sqliteAll('PRAGMA table_info(order_items)');
    if (!itemColumns.some((column) => column.name === 'cart_item_id')) await sqliteRun('ALTER TABLE order_items ADD COLUMN cart_item_id INTEGER NOT NULL DEFAULT 0');
}

module.exports = db;
