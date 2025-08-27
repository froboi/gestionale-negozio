const { promisePool } = require('../database/connection');
const { logger } = require('../utils/logger');

class ProductService {
    // Generate unique barcode
    async generateBarcode() {
        // Generate 13-digit EAN-13 compatible barcode
        const prefix = '200'; // Internal use prefix
        const randomPart = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
        const barcode = prefix + randomPart;
        
        // Check if barcode already exists
        const [existing] = await promisePool.execute(
            'SELECT id FROM products WHERE barcode = ?',
            [barcode]
        );
        
        if (existing.length > 0) {
            // Recursively generate new barcode if exists
            return await this.generateBarcode();
        }
        
        return barcode;
    }

    // Get products with filters and pagination
    async getProducts(filters = {}, options = {}) {
        try {
            const {
                search,
                category,
                brand,
                size,
                color,
                minPrice,
                maxPrice,
                lowStock
            } = filters;

            const {
                page = 1,
                limit = 20,
                sortBy = 'name',
                sortOrder = 'asc'
            } = options;

            const offset = (page - 1) * limit;
            
            // Build WHERE clause
            let whereConditions = ['is_active = TRUE'];
            let params = [];

            if (search) {
                whereConditions.push('(MATCH(name, description, brand) AGAINST(? IN NATURAL LANGUAGE MODE) OR code LIKE ? OR barcode LIKE ?)');
                params.push(search, `%${search}%`, `%${search}%`);
            }

            if (category) {
                whereConditions.push('category = ?');
                params.push(category);
            }

            if (brand) {
                whereConditions.push('brand = ?');
                params.push(brand);
            }

            if (size) {
                whereConditions.push('size = ?');
                params.push(size);
            }

            if (color) {
                whereConditions.push('color = ?');
                params.push(color);
            }

            if (minPrice !== null) {
                whereConditions.push('price >= ?');
                params.push(minPrice);
            }

            if (maxPrice !== null) {
                whereConditions.push('price <= ?');
                params.push(maxPrice);
            }

            if (lowStock) {
                whereConditions.push('quantity <= min_quantity');
            }

            const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
            
            // Validate sort parameters
            const validSortFields = ['name', 'code', 'price', 'quantity', 'created_at', 'updated_at'];
            const validSortOrders = ['asc', 'desc'];
            
            const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
            const sortDirection = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toUpperCase() : 'ASC';

            // Get total count
            const countQuery = `SELECT COUNT(*) as total FROM products ${whereClause}`;
            const [countResult] = await promisePool.execute(countQuery, params);
            const total = countResult[0].total;

            // Get products
            const query = `
                SELECT 
                    id, code, name, description, size, color, price, cost,
                    barcode, quantity, min_quantity, category, brand, season,
                    is_active, created_at, updated_at
                FROM products 
                ${whereClause}
                ORDER BY ${sortField} ${sortDirection}
                LIMIT ? OFFSET ?
            `;

            const [products] = await promisePool.execute(query, [...params, limit, offset]);

            return {
                products,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1
                }
            };

        } catch (error) {
            logger.error('Errore recupero prodotti:', error);
            throw error;
        }
    }

    // Get product by ID
    async getProductById(id) {
        try {
            const [products] = await promisePool.execute(
                'SELECT * FROM products WHERE id = ? AND is_active = TRUE',
                [id]
            );

            return products.length > 0 ? products[0] : null;

        } catch (error) {
            logger.error('Errore recupero prodotto:', error);
            throw error;
        }
    }

    // Get product by barcode
    async getProductByBarcode(barcode) {
        try {
            const [products] = await promisePool.execute(
                'SELECT * FROM products WHERE barcode = ? AND is_active = TRUE',
                [barcode]
            );

            return products.length > 0 ? products[0] : null;

        } catch (error) {
            logger.error('Errore recupero prodotto per barcode:', error);
            throw error;
        }
    }

    // Create new product
    async createProduct(productData) {
        try {
            const {
                code,
                name,
                description = '',
                size,
                color,
                price,
                cost = 0,
                quantity = 0,
                min_quantity = 5,
                category = '',
                brand = '',
                season = ''
            } = productData;

            // Generate barcode if not provided
            const barcode = productData.barcode || await this.generateBarcode();

            const [result] = await promisePool.execute(
                `INSERT INTO products 
                 (code, name, description, size, color, price, cost, barcode, 
                  quantity, min_quantity, category, brand, season) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [code, name, description, size, color, price, cost, barcode,
                 quantity, min_quantity, category, brand, season]
            );

            // Log initial inventory if quantity > 0
            if (quantity > 0) {
                await promisePool.execute(
                    `INSERT INTO inventory_movements 
                     (product_id, movement_type, quantity, notes, user_id) 
                     VALUES (?, 'in', ?, 'Scorta iniziale', ?)`,
                    [result.insertId, quantity, productData.created_by || 1]
                );
            }

            return await this.getProductById(result.insertId);

        } catch (error) {
            logger.error('Errore creazione prodotto:', error);
            throw error;
        }
    }

    // Update product
    async updateProduct(id, productData) {
        try {
            const {
                code,
                name,
                description,
                size,
                color,
                price,
                cost,
                quantity,
                min_quantity,
                category,
                brand,
                season
            } = productData;

            // Get current product
            const currentProduct = await this.getProductById(id);
            if (!currentProduct) {
                return null;
            }

            const [result] = await promisePool.execute(
                `UPDATE products SET 
                 code = ?, name = ?, description = ?, size = ?, color = ?, 
                 price = ?, cost = ?, quantity = ?, min_quantity = ?, 
                 category = ?, brand = ?, season = ?, updated_at = NOW()
                 WHERE id = ?`,
                [code, name, description, size, color, price, cost, quantity,
                 min_quantity, category, brand, season, id]
            );

            if (result.affectedRows === 0) {
                return null;
            }

            // Log inventory movement if quantity changed
            if (quantity !== currentProduct.quantity) {
                const diff = quantity - currentProduct.quantity;
                const movementType = diff > 0 ? 'in' : 'out';
                const movementQuantity = Math.abs(diff);

                await promisePool.execute(
                    `INSERT INTO inventory_movements 
                     (product_id, movement_type, quantity, reference_type, notes, user_id) 
                     VALUES (?, ?, ?, 'adjustment', 'Modifica prodotto', ?)`,
                    [id, movementType, movementQuantity, productData.updated_by || 1]
                );
            }

            return await this.getProductById(id);

        } catch (error) {
            logger.error('Errore aggiornamento prodotto:', error);
            throw error;
        }
    }

    // Delete product (soft delete)
    async deleteProduct(id) {
        try {
            const [result] = await promisePool.execute(
                'UPDATE products SET is_active = FALSE, updated_at = NOW() WHERE id = ?',
                [id]
            );

            return result.affectedRows > 0;

        } catch (error) {
            logger.error('Errore eliminazione prodotto:', error);
            throw error;
        }
    }

    // Update product quantity
    async updateQuantity(id, quantity, operation = 'set', userId, notes = '') {
        try {
            const currentProduct = await this.getProductById(id);
            if (!currentProduct) {
                return null;
            }

            let newQuantity;
            let movementType;
            let movementQuantity;

            switch (operation) {
                case 'add':
                    newQuantity = currentProduct.quantity + quantity;
                    movementType = 'in';
                    movementQuantity = quantity;
                    break;
                case 'subtract':
                    newQuantity = Math.max(0, currentProduct.quantity - quantity);
                    movementType = 'out';
                    movementQuantity = quantity;
                    break;
                case 'set':
                default:
                    newQuantity = quantity;
                    const diff = quantity - currentProduct.quantity;
                    movementType = diff >= 0 ? 'in' : 'out';
                    movementQuantity = Math.abs(diff);
                    break;
            }

            // Update product quantity
            await promisePool.execute(
                'UPDATE products SET quantity = ?, updated_at = NOW() WHERE id = ?',
                [newQuantity, id]
            );

            // Log inventory movement
            if (movementQuantity > 0) {
                await promisePool.execute(
                    `INSERT INTO inventory_movements 
                     (product_id, movement_type, quantity, reference_type, notes, user_id) 
                     VALUES (?, ?, ?, 'adjustment', ?, ?)`,
                    [id, movementType, movementQuantity, notes || 'Modifica quantità', userId]
                );
            }

            return await this.getProductById(id);

        } catch (error) {
            logger.error('Errore aggiornamento quantità:', error);
            throw error;
        }
    }

    // Get low stock products
    async getLowStockProducts(threshold = null) {
        try {
            let query = `
                SELECT id, code, name, size, color, quantity, min_quantity, 
                       (min_quantity - quantity) as needed_quantity
                FROM products 
                WHERE is_active = TRUE AND quantity <= min_quantity
            `;
            let params = [];

            if (threshold !== null) {
                query += ' AND quantity <= ?';
                params.push(threshold);
            }

            query += ' ORDER BY quantity ASC';

            const [products] = await promisePool.execute(query, params);
            return products;

        } catch (error) {
            logger.error('Errore recupero prodotti scorte basse:', error);
            throw error;
        }
    }

    // Get product categories
    async getCategories() {
        try {
            const [categories] = await promisePool.execute(
                'SELECT DISTINCT category FROM products WHERE is_active = TRUE AND category IS NOT NULL AND category != "" ORDER BY category'
            );

            return categories.map(row => row.category);

        } catch (error) {
            logger.error('Errore recupero categorie:', error);
            throw error;
        }
    }

    // Get product brands
    async getBrands() {
        try {
            const [brands] = await promisePool.execute(
                'SELECT DISTINCT brand FROM products WHERE is_active = TRUE AND brand IS NOT NULL AND brand != "" ORDER BY brand'
            );

            return brands.map(row => row.brand);

        } catch (error) {
            logger.error('Errore recupero marche:', error);
            throw error;
        }
    }
}

module.exports = new ProductService();