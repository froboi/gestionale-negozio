const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery, executeTransaction } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const BarcodeService = require('../services/barcodeService');
const PDFService = require('../services/pdfService');

const router = express.Router();

// Product validation rules
const productValidation = [
  body('code').trim().isLength({ min: 1, max: 50 }).escape(),
  body('description').optional({ checkFalsy: true }).trim().escape(),
  body('category').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).escape(),
  body('size').isIn(['XS/40', 'S/42', 'M/44', 'L/46', 'XL/48', 'XXL/50', 'No']),
  body('color').optional({ checkFalsy: true }).trim().isLength({ max: 50 }).escape(),
  body('price').isFloat({ min: 0 }),
  body('cost').optional().custom((value) => {
    // Allow null, undefined, or empty string
    if (value === null || value === undefined || value === '') return true;
    // Allow valid numbers >= 0
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) return true;
    throw new Error('Cost must be a valid number >= 0');
  }),
  body('quantity').isInt({ min: 0 }),
  body('supplier').optional({ checkFalsy: true }).trim().isLength({ max: 200 }).escape(),
  body('season').optional({ checkFalsy: true }).trim().isLength({ max: 20 }).escape()
];

// Get all products with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      category,
      brand,
      size,
      color,
      low_stock,
      sort_by = 'code',
      sort_order = 'ASC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['code', 'price', 'quantity', 'created_at', 'brand', 'category'];
    const validSortOrder = ['ASC', 'DESC'];
    
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'code';
    const sortOrder = validSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(description LIKE ? OR code LIKE ? OR brand LIKE ? OR supplier LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }



    if (size) {
      whereConditions.push('size = ?');
      queryParams.push(size);
    }

    if (color) {
      whereConditions.push('color = ?');
      queryParams.push(color);
    }

    if (low_stock === 'true') {
      whereConditions.push('quantity <= 5'); // Soglia fissa a 5
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get products
    const limitValue = parseInt(limit);
    const offsetValue = parseInt(offset);
    
    const products = await executeQuery(`
      SELECT id, code, description, category, size, color, 
             price, cost, quantity, barcode, supplier, season,
             created_at, updated_at
      FROM products 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${limitValue} OFFSET ${offsetValue}
    `, queryParams);

    // Get total count for pagination
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM products ${whereClause}
    `, queryParams);

    const totalProducts = countResult[0].total;
    const totalPages = Math.ceil(totalProducts / parseInt(limit));

    res.json({
      products,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei prodotti' });
  }
});

// Get single product
router.get('/:id', param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product.length) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    res.json(product[0]);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Errore nel recupero del prodotto' });
  }
});

// Create new product
router.post('/', requireRole(['admin', 'manager']), productValidation, async (req, res) => {
  try {
    console.log('Received product data:', req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      code, description, category, size, color,
      price, cost, quantity, supplier, season
    } = req.body;

    // Check if product code already exists
    const existingProduct = await executeQuery(
      'SELECT id FROM products WHERE code = ?',
      [code]
    );

    if (existingProduct.length > 0) {
      return res.status(409).json({ error: 'Codice prodotto già esistente' });
    }

    // Generate barcode
    const barcode = await BarcodeService.generateBarcode(code);

    // Create product
    const result = await executeQuery(`
      INSERT INTO products (
        code, description, category, size, color,
        price, cost, quantity, barcode, supplier, season
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code, description || null, category || null, size || null, color || null,
      price, cost || null, quantity, barcode, supplier || null, season || null
    ]);

    const newProduct = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Prodotto creato con successo',
      product: newProduct[0]
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Errore nella creazione del prodotto' });
  }
});

// Create multiple products with sizes
router.post('/multi-size', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const {
      baseProduct,
      sizeQuantities,
      isSingleSize
    } = req.body;

    // Validate base product data
    if (!baseProduct) {
      return res.status(400).json({ error: 'Dati prodotto base richiesti' });
    }

    // Validate essential fields
    if (typeof baseProduct.price !== 'number' || baseProduct.price < 0) {
      return res.status(400).json({ error: 'Prezzo valido richiesto' });
    }

    // Validate size quantities
    if (!sizeQuantities || Object.keys(sizeQuantities).length === 0) {
      return res.status(400).json({ error: 'Almeno una taglia con quantità deve essere specificata' });
    }

    const validSizes = ['XS/40', 'S/42', 'M/44', 'L/46', 'XL/48', 'XXL/50', 'No'];
    const createdProducts = [];

    // Create products for each size
    for (const [size, quantity] of Object.entries(sizeQuantities)) {
      if (!validSizes.includes(size)) {
        return res.status(400).json({ error: `Taglia non valida: ${size}` });
      }

      if (quantity <= 0) continue; // Skip sizes with 0 quantity

      // Generate unique product code for this size
      const sizeCode = `${baseProduct.code || 'PROD'}-${size.replace('/', '')}`;

      // Check if product code already exists
      const existingProduct = await executeQuery(
        'SELECT id FROM products WHERE code = ?',
        [sizeCode]
      );

      if (existingProduct.length > 0) {
        return res.status(409).json({ error: `Codice prodotto già esistente: ${sizeCode}` });
      }

      // Generate barcode
      const barcode = await BarcodeService.generateBarcode(sizeCode);

      // Create product
      const result = await executeQuery(`
        INSERT INTO products (
          code, description, category, size, color,
          price, cost, quantity, barcode, supplier, season
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        sizeCode,
        baseProduct.description || null,
        baseProduct.category || null,
        size,
        baseProduct.color || null,
        baseProduct.price,
        baseProduct.cost || null,
        quantity,
        barcode,
        baseProduct.supplier || null,
        baseProduct.season || null
      ]);

      const newProduct = await executeQuery(
        'SELECT * FROM products WHERE id = ?',
        [result.insertId]
      );

      createdProducts.push(newProduct[0]);
    }

    res.status(201).json({
      message: `${createdProducts.length} prodotti creati con successo`,
      products: createdProducts
    });

  } catch (error) {
    console.error('Create multi-size products error:', error);
    res.status(500).json({ error: 'Errore nella creazione dei prodotti' });
  }
});

// Update product
router.put('/:id', requireRole(['admin', 'manager']), productValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.id;
    const {
      code, description, category, size, color,
      price, cost, quantity, supplier, season
    } = req.body;

    // Check if product exists
    const existingProduct = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    if (!existingProduct.length) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    // Check if new code conflicts with existing products
    if (code !== existingProduct[0].code) {
      const codeCheck = await executeQuery(
        'SELECT id FROM products WHERE code = ? AND id != ?',
        [code, productId]
      );

      if (codeCheck.length > 0) {
        return res.status(409).json({ error: 'Codice prodotto già esistente' });
      }
    }

    // Generate new barcode if code changed
    let barcode = existingProduct[0].barcode;
    if (code !== existingProduct[0].code) {
      barcode = await BarcodeService.generateBarcode(code);
    }

    // Update product
    await executeQuery(`
      UPDATE products SET 
        code = ?, description = ?, category = ?,
        size = ?, color = ?, price = ?, cost = ?, quantity = ?,
        barcode = ?, supplier = ?, season = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [
      code, description || null, category || null, size || null, color || null,
      price, cost || null, quantity, barcode, supplier || null, season || null, productId
    ]);

    const updatedProduct = await executeQuery(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );

    res.json({
      message: 'Prodotto aggiornato con successo',
      product: updatedProduct[0]
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del prodotto' });
  }
});

// Delete product
router.delete('/:id', requireRole(['admin']), param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const productId = req.params.id;

    // Check if product exists
    const product = await executeQuery(
      'SELECT id FROM products WHERE id = ?',
      [productId]
    );

    if (!product.length) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    // Check if product is used in sales
    const salesCheck = await executeQuery(
      'SELECT id FROM sale_items WHERE product_id = ? LIMIT 1',
      [productId]
    );

    if (salesCheck.length > 0) {
      return res.status(409).json({ 
        error: 'Impossibile eliminare: prodotto presente in vendite esistenti' 
      });
    }

    // Delete product
    await executeQuery('DELETE FROM products WHERE id = ?', [productId]);

    res.json({ message: 'Prodotto eliminato con successo' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del prodotto' });
  }
});

// Generate barcode label PDF
router.get('/:id/label', param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const product = await executeQuery(
      'SELECT code, description, size, barcode FROM products WHERE id = ?',
      [req.params.id]
    );

    if (!product.length) {
      return res.status(404).json({ error: 'Prodotto non trovato' });
    }

    const pdfBuffer = await PDFService.generateBarcodeLabel(product[0]);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="label-${product[0].code}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate label error:', error);
    res.status(500).json({ error: 'Errore nella generazione dell\'etichetta' });
  }
});

// Bulk generate labels
router.post('/labels/bulk', requireRole(['admin', 'manager', 'employee']), async (req, res) => {
  try {
    const { productIds } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'Lista prodotti richiesta' });
    }

    const placeholders = productIds.map(() => '?').join(',');
    const products = await executeQuery(`
      SELECT code, description, size, barcode FROM products 
      WHERE id IN (${placeholders})
    `, productIds);

    if (!products.length) {
      return res.status(404).json({ error: 'Nessun prodotto trovato' });
    }

    const pdfBuffer = await PDFService.generateBulkBarcodeLabels(products);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="bulk-labels.pdf"');
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate bulk labels error:', error);
    res.status(500).json({ error: 'Errore nella generazione delle etichette' });
  }
});

// Get low stock products
router.get('/reports/low-stock', async (req, res) => {
  try {
    const products = await executeQuery(`
      SELECT id, code, description, quantity, min_quantity
      FROM products 
      WHERE quantity <= min_quantity
      ORDER BY quantity ASC
    `);

    res.json({ products });

  } catch (error) {
    console.error('Low stock report error:', error);
    res.status(500).json({ error: 'Errore nel recupero prodotti con scorte basse' });
  }
});

module.exports = router;
