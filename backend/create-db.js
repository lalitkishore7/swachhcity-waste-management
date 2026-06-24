const mysql = require('mysql2/promise');
require('dotenv').config();

async function createDb() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.MYSQL_HOST || 'localhost',
            user: process.env.MYSQL_USER || 'root',
            password: process.env.MYSQL_PASSWORD || '',
            port: parseInt(process.env.MYSQL_PORT || '3306')
        });
        
        await connection.query('CREATE DATABASE IF NOT EXISTS swachhcity');
        console.log('Database swachhcity created successfully');
        process.exit(0);
    } catch (err) {
        console.error('Error creating database:', err);
        process.exit(1);
    }
}

createDb();
