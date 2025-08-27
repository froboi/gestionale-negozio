-- Gestionale Abbigliamento Database Schema
-- MySQL/MariaDB initialization script

CREATE DATABASE IF NOT EXISTS gestionale_abbigliamento CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gestionale_abbigliamento;

-- Users table with role-based access control
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    role ENUM('admin', 'tecnico', 'operatore') NOT NULL DEFAULT 'operatore',
    is_active BOOLEAN DEFAULT TRUE,
    two_fa_secret VARCHAR(32) NULL,
    two_fa_enabled BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
);

-- Products table for inventory management
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    size VARCHAR(20) NOT NULL,
    color VARCHAR(50) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    cost DECIMAL(10,2),
    barcode VARCHAR(255) NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0,
    min_quantity INT DEFAULT 5,
    category VARCHAR(100),
    brand VARCHAR(100),
    season VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_code (code),
    INDEX idx_barcode (barcode),
    INDEX idx_category (category),
    INDEX idx_active (is_active),
    INDEX idx_quantity (quantity),
    FULLTEXT idx_search (name, description, brand)
);

-- Customers table for client management
CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20),
    birth_date DATE,
    address TEXT,
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'Italia',
    notes TEXT,
    loyalty_points INT DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0.00,
    last_purchase DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_phone (phone),
    INDEX idx_birth_date (birth_date),
    INDEX idx_loyalty_points (loyalty_points),
    FULLTEXT idx_search (name, surname, email, phone)
);

-- Sales table for transaction management
CREATE TABLE sales (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id INT,
    user_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'bank_transfer', 'other') NOT NULL,
    status ENUM('pending', 'completed', 'cancelled', 'refunded') DEFAULT 'completed',
    notes TEXT,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_sale_number (sale_number),
    INDEX idx_customer (customer_id),
    INDEX idx_user (user_id),
    INDEX idx_sale_date (sale_date),
    INDEX idx_status (status)
);

-- Sale items table for detailed transaction items
CREATE TABLE sale_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_sale (sale_id),
    INDEX idx_product (product_id)
);

-- Discounts table for promotional management
CREATE TABLE discounts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    type ENUM('percentage', 'fixed_amount', 'birthday') NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    min_amount DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    usage_limit INT,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_active (is_active),
    INDEX idx_dates (start_date, end_date)
);

-- WhatsApp messages log
CREATE TABLE whatsapp_messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT NOT NULL,
    message_type ENUM('birthday', 'promotion', 'reminder', 'other') NOT NULL,
    message_content TEXT NOT NULL,
    status ENUM('pending', 'sent', 'failed', 'delivered', 'read') DEFAULT 'pending',
    whatsapp_message_id VARCHAR(255),
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    INDEX idx_customer (customer_id),
    INDEX idx_type (message_type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

-- Audit log for security tracking
CREATE TABLE audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created_at (created_at)
);

-- Inventory movements for stock tracking
CREATE TABLE inventory_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment', 'sale', 'return') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('sale', 'purchase', 'adjustment', 'return') NULL,
    reference_id INT NULL,
    notes TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_product (product_id),
    INDEX idx_type (movement_type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at)
);

-- System settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT,
    is_editable BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (setting_key)
);

-- Create triggers for inventory management
DELIMITER //

CREATE TRIGGER after_sale_item_insert 
AFTER INSERT ON sale_items
FOR EACH ROW
BEGIN
    -- Update product quantity
    UPDATE products 
    SET quantity = quantity - NEW.quantity 
    WHERE id = NEW.product_id;
    
    -- Log inventory movement
    INSERT INTO inventory_movements (product_id, movement_type, quantity, reference_type, reference_id, user_id)
    SELECT NEW.product_id, 'out', NEW.quantity, 'sale', NEW.sale_id, s.user_id
    FROM sales s WHERE s.id = NEW.sale_id;
END//

CREATE TRIGGER after_sale_update_customer_stats
AFTER INSERT ON sales
FOR EACH ROW
BEGIN
    IF NEW.customer_id IS NOT NULL THEN
        UPDATE customers 
        SET 
            total_spent = total_spent + NEW.final_amount,
            loyalty_points = loyalty_points + FLOOR(NEW.final_amount / 10),
            last_purchase = NEW.sale_date
        WHERE id = NEW.customer_id;
    END IF;
END//

DELIMITER ;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_editable) VALUES
('shop_name', 'Gestionale Abbigliamento', 'string', 'Nome del negozio', TRUE),
('shop_address', 'Via Roma 123, Milano', 'string', 'Indirizzo del negozio', TRUE),
('shop_phone', '+39 02 1234567', 'string', 'Telefono del negozio', TRUE),
('shop_email', 'info@negozio.com', 'string', 'Email del negozio', TRUE),
('currency', 'EUR', 'string', 'Valuta utilizzata', TRUE),
('tax_rate', '22', 'number', 'Aliquota IVA predefinita (%)', TRUE),
('loyalty_points_ratio', '10', 'number', 'Euro spesi per 1 punto fedeltà', TRUE),
('birthday_discount_percentage', '10', 'number', 'Sconto compleanno (%)', TRUE),
('birthday_message_template', 'Buon compleanno! Oggi hai diritto al 10% di sconto su tutti i prodotti. Valido fino a mezzanotte.', 'string', 'Template messaggio compleanno', TRUE),
('low_stock_threshold', '5', 'number', 'Soglia scorte basse', TRUE),
('backup_enabled', 'true', 'boolean', 'Backup automatici abilitati', TRUE),
('backup_schedule', '0 2 * * *', 'string', 'Schedule backup (cron format)', TRUE);