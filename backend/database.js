const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'swachhcity',
    port: parseInt(process.env.MYSQL_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

async function initializeDatabase() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');
        connection.release();
    } catch (err) {
        console.error('Error connecting to database:', err.message);
    }
}

// Run initialization on import
initializeDatabase();

module.exports = pool;
