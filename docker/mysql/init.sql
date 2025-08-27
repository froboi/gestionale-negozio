-- Initialize database with secure configuration
SET GLOBAL sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO';

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS gestionale_abbigliamento 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE gestionale_abbigliamento;

-- Create default admin user (password: Admin123!)
-- Note: This should be changed immediately after first login
INSERT IGNORE INTO users (
    username, 
    email, 
    password_hash, 
    salt, 
    role, 
    two_fa_enabled
) VALUES (
    'admin',
    'admin@gestionale.local',
    '$2b$12$LQv3c1yqBw0f/ahvgcGnKOi.aOYWAj1n7LJNDo7XdZ8Ld5z1QgTTG', -- Admin123!
    'salt_placeholder',
    'admin',
    FALSE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_search ON products(name, brand, category);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers(first_name, last_name, email);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_date ON audit_logs(created_at);

-- Set up proper permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON gestionale_abbigliamento.* TO 'gestionale_user'@'%';
FLUSH PRIVILEGES;
