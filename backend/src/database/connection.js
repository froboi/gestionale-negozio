const mysql = require('mysql2');
const { logger } = require('../utils/logger');

// Create connection pool for better performance
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestionale_abbigliamento',
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    charset: 'utf8mb4',
    timezone: 'local',
    multipleStatements: false,
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false
});

// Promisify pool for async/await usage
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
    if (err) {
        logger.error('Errore connessione database:', err);
        return;
    }
    
    logger.info('Connessione database MySQL stabilita');
    
    // Test query
    connection.query('SELECT 1 + 1 AS solution', (error, results) => {
        if (error) {
            logger.error('Errore test query:', error);
        } else {
            logger.info('Test query database riuscito:', results[0].solution);
        }
        connection.release();
    });
});

// Handle pool errors
pool.on('error', (err) => {
    logger.error('Errore pool database:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.info('Riconnessione database in corso...');
    } else {
        throw err;
    }
});

// Export both pool and promise pool
module.exports = {
    pool,
    promisePool,
    // Legacy export for backwards compatibility
    query: (sql, params) => {
        return new Promise((resolve, reject) => {
            pool.query(sql, params, (error, results) => {
                if (error) {
                    logger.error('Query error:', error);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });
    },
    // Helper functions
    escape: mysql.escape,
    escapeId: mysql.escapeId,
    end: () => pool.end(),
    ping: (callback) => pool.getConnection((err, connection) => {
        if (err) return callback(err);
        connection.ping(callback);
        connection.release();
    })
};