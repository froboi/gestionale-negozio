const { executeQuery } = require('../connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

async function createTables() {
  try {
    // Users table with security features
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        salt VARCHAR(255) NOT NULL,
        role ENUM('admin', 'manager', 'employee') NOT NULL DEFAULT 'employee',
        two_fa_secret VARCHAR(32),
        two_fa_enabled BOOLEAN DEFAULT FALSE,
        failed_login_attempts INT DEFAULT 0,
        last_failed_login TIMESTAMP NULL,
        account_locked BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username),
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB;
    `);

    // Products table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS products (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        brand VARCHAR(100),
        category VARCHAR(100),
        size VARCHAR(20),
        color VARCHAR(50),
        price DECIMAL(10,2) NOT NULL,
        cost DECIMAL(10,2),
        quantity INT NOT NULL DEFAULT 0,
        min_quantity INT DEFAULT 0,
        barcode VARCHAR(100) UNIQUE,
        supplier VARCHAR(200),
        season VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_code (code),
        INDEX idx_barcode (barcode),
        INDEX idx_category (category),
        INDEX idx_brand (brand),
        INDEX idx_size (size),
        INDEX idx_color (color),
        FULLTEXT idx_search (name, description, brand)
      ) ENGINE=InnoDB;
    `);

    // Customers table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE,
        phone VARCHAR(20),
        birth_date DATE,
        address TEXT,
        city VARCHAR(100),
        postal_code VARCHAR(20),
        loyalty_points INT DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0,
        last_purchase TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_phone (phone),
        INDEX idx_name (first_name, last_name),
        INDEX idx_birth_date (birth_date)
      ) ENGINE=InnoDB;
    `);

    // Sales table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sales (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        final_amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('cash', 'card', 'transfer', 'mixed') NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
        INDEX idx_customer (customer_id),
        INDEX idx_user (user_id),
        INDEX idx_date (created_at),
        INDEX idx_amount (final_amount)
      ) ENGINE=InnoDB;
    `);

    // Sale items table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sale_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        discount_percent DECIMAL(5,2) DEFAULT 0,
        subtotal DECIMAL(10,2) NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        INDEX idx_sale (sale_id),
        INDEX idx_product (product_id)
      ) ENGINE=InnoDB;
    `);

    // Audit log table
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT,
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(50),
        record_id INT,
        old_values JSON,
        new_values JSON,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_user (user_id),
        INDEX idx_action (action),
        INDEX idx_table (table_name),
        INDEX idx_date (created_at)
      ) ENGINE=InnoDB;
    `);

    // Birthday messages log
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS birthday_messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        message_sent BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP NULL,
        error_message TEXT,
        year_sent INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        INDEX idx_customer (customer_id),
        INDEX idx_year (year_sent),
        UNIQUE KEY unique_customer_year (customer_id, year_sent)
      ) ENGINE=InnoDB;
    `);

    // Sessions table for enhanced security
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR(128) PRIMARY KEY,
        user_id INT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        data TEXT,
        expires TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_expires (expires)
      ) ENGINE=InnoDB;
    `);

    logger.info('All database tables created successfully');
    
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
}

module.exports = { createTables };
