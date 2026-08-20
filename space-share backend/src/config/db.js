const { Pool } = require('pg');
const config = require('./config');

let pool = null;
let isConnected = false;

const connectDB = async () => {
  try {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      host: config.PG_HOST,
      port: config.PG_PORT,
      user: config.PG_USER,
      password: config.PG_PASSWORD,
      database: config.PG_DATABASE,
      connectionTimeoutMillis: 3000
    });

    const client = await pool.connect();
    isConnected = true;
    console.log('[Database] PostgreSQL Connected successfully!');

    // Initialize Users Table schema if not exists
    const createUsersTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'renter',
        phone VARCHAR(50) DEFAULT '',
        avatar TEXT DEFAULT '',
        bio TEXT DEFAULT '',
        reset_password_token VARCHAR(255),
        reset_password_expire TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await client.query(createUsersTableQuery);
    client.release();
    console.log('[Database] PostgreSQL Schema verified (users table initialized)');
    return true;
  } catch (error) {
    isConnected = false;
    console.warn(`[Database] PostgreSQL connection bypassed (Fallback memory storage active): ${error.message}`);
    return false;
  }
};

const getPool = () => pool;
const getIsConnected = () => isConnected;

module.exports = { connectDB, getPool, getIsConnected };
