const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const PDFService = require('../services/pdfService');

const router = express.Router();

// Sale validation rules
const saleValidation = [
  body('customer_id').optional().isInt(),
  body('items').isArray({ min: 1 }),
  body('items.*.product_id').isInt(),
  body('items.*.quantity').isInt({ min: 1 }),
  body('items.*.price').isFloat({ min: 0 }),
  body('discount_amount').optional().isFloat({ min: 0 }),
  body('payment_method').isIn(['cash', 'card', 'bank_transfer', 'other'])
];

// Get all sales with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC',
      start_date,
      end_date,
      payment_method,
      customer_id
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['id', 'total_amount', 'created_at', 'customer_name'];
    const validSortOrder = ['ASC', 'DESC'];
    
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortOrder = validSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(s.id LIKE ? OR CONCAT(c.first_name, " ", c.last_name) LIKE ? OR s.receipt_number LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (start_date) {
      whereConditions.push('DATE(s.created_at) >= ?');
      queryParams.push(start_date);
    }

    if (end_date) {
      whereConditions.push('DATE(s.created_at) <= ?');
      queryParams.push(end_date);
    }

    if (payment_method) {
      whereConditions.push('s.payment_method = ?');
      queryParams.push(payment_method);
    }

    if (customer_id) {
      whereConditions.push('s.customer_id = ?');
      queryParams.push(parseInt(customer_id));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get sales with customer info
    const sales = await executeQuery(`
      SELECT s.id, CONCAT('RC-', LPAD(s.id, 6, '0')) as receipt_number, 
             s.total_amount, s.discount_amount, s.final_amount,
             s.payment_method, s.created_at, s.customer_id,
             CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             COUNT(si.id) as items_count
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN sale_items si ON s.id = si.sale_id
      ${whereClause}
      GROUP BY s.id
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    // Get total count for pagination
    const countResult = await executeQuery(`
      SELECT COUNT(DISTINCT s.id) as total 
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ${whereClause}
    `, queryParams);

    const totalSales = countResult[0].total;
    const totalPages = Math.ceil(totalSales / parseInt(limit));

    res.json({
      sales,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalSales,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get sales error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle vendite' });
  }
});

// Get single sale with items
router.get('/:id', param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const saleId = req.params.id;

    // Get sale details
    const saleResult = await executeQuery(`
      SELECT s.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             c.email as customer_email, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [saleId]);

    if (saleResult.length === 0) {
      return res.status(404).json({ error: 'Vendita non trovata' });
    }

    // Get sale items
    const items = await executeQuery(`
      SELECT si.*, p.description as product_name, p.sku, p.barcode
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [saleId]);

    const sale = {
      ...saleResult[0],
      items
    };

    res.json(sale);

  } catch (error) {
    console.error('Get sale error:', error);
    res.status(500).json({ error: 'Errore nel recupero della vendita' });
  }
});

// Create new sale
router.post('/', saleValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customer_id, items, discount_amount = 0, payment_method } = req.body;

    // Calculate total
    let subtotal = 0;
    for (const item of items) {
      subtotal += item.price * item.quantity;
    }
    const total_amount = subtotal - discount_amount;

    // Generate receipt number
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = date.getTime().toString().slice(-4);
    const receipt_number = `${dateStr}${timeStr}`;

    // Create sale
    const saleResult = await executeQuery(`
      INSERT INTO sales (customer_id, user_id, total_amount, discount_amount, final_amount, payment_method)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [customer_id || null, req.user.id, subtotal, discount_amount, total_amount, payment_method]);

      const saleId = saleResult.insertId;

      // Create sale items
      for (const item of items) {
        await executeQuery(`
          INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?)
        `, [saleId, item.product_id, item.quantity, item.price, item.price * item.quantity]);

        // Update product stock
        await executeQuery(`
          UPDATE products SET quantity = quantity - ? WHERE id = ?
        `, [item.quantity, item.product_id]);
      }

      // Update customer loyalty points and total spent if customer exists
      if (customer_id) {
        const loyaltyPoints = Math.floor(total_amount / 10); // 1 point per 10 EUR
        await executeQuery(`
          UPDATE customers 
          SET loyalty_points = loyalty_points + ?, 
              total_spent = total_spent + ?,
              last_purchase = NOW()
          WHERE id = ?
        `, [loyaltyPoints, total_amount, customer_id]);
      }

      // Get complete sale data
      const completeSale = await executeQuery(`
        SELECT s.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name
        FROM sales s
        LEFT JOIN customers c ON s.customer_id = c.id
        WHERE s.id = ?
      `, [saleId]);

      res.status(201).json({
        sale: completeSale[0],
        message: 'Vendita creata con successo'
      });

    } catch (error) {
      console.error('Create sale error:', error);
      res.status(500).json({ error: 'Errore nella creazione della vendita' });
    }
});

// Update sale (limited to status and notes)
router.put('/:id', [
  param('id').isInt(),
  body('status').optional().isIn(['completed', 'cancelled', 'refunded']),
  body('notes').optional().trim().escape()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const saleId = req.params.id;
    const { status, notes } = req.body;

    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nessun campo da aggiornare' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(saleId);

    await executeQuery(`
      UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?
    `, updateValues);

    res.json({ message: 'Vendita aggiornata con successo' });

  } catch (error) {
    console.error('Update sale error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento della vendita' });
  }
});

// Get sales statistics
router.get('/stats/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    
    // Today's sales
    const todaySales = await executeQuery(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales 
      WHERE DATE(created_at) = CURDATE()
    `);

    // Period sales
    const periodSales = await executeQuery(`
      SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
    `, [parseInt(period)]);

    // Best selling products
    const bestProducts = await executeQuery(`
      SELECT p.description as name, p.sku, SUM(si.quantity) as total_sold
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 5
    `, [parseInt(period)]);

    // Sales by payment method
    const paymentMethods = await executeQuery(`
      SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY payment_method
    `, [parseInt(period)]);

    res.json({
      today: todaySales[0],
      period: periodSales[0],
      bestProducts,
      paymentMethods
    });

  } catch (error) {
    console.error('Get sales stats error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche' });
  }
});

// Purchase statistics endpoint
router.get('/stats/purchases', async (req, res) => {
  try {
    // Today's purchases
    const todayPurchases = await executeQuery(`
      SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
      FROM sales 
      WHERE DATE(created_at) = CURDATE()
    `);

    // This month's purchases
    const monthPurchases = await executeQuery(`
      SELECT COUNT(*) as count, COALESCE(SUM(final_amount), 0) as total
      FROM sales 
      WHERE YEAR(created_at) = YEAR(NOW()) AND MONTH(created_at) = MONTH(NOW())
    `);

    // Average purchase amount
    const avgPurchase = await executeQuery(`
      SELECT COALESCE(AVG(final_amount), 0) as average
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Highest purchase amount
    const highestPurchase = await executeQuery(`
      SELECT COALESCE(MAX(final_amount), 0) as highest
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    res.json({
      todayPurchases: {
        count: todayPurchases[0].count,
        total: parseFloat(todayPurchases[0].total)
      },
      monthPurchases: {
        count: monthPurchases[0].count,
        total: parseFloat(monthPurchases[0].total)
      },
      averagePurchase: parseFloat(avgPurchase[0].average),
      highestPurchase: parseFloat(highestPurchase[0].highest)
    });

  } catch (error) {
    console.error('Get purchase stats error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle statistiche degli acquisti' });
  }
});

// Generate sale receipt PDF
router.get('/:id/receipt', param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const saleId = req.params.id;

    // Get sale with items
    const saleResult = await executeQuery(`
      SELECT s.*, CONCAT(c.first_name, ' ', c.last_name) as customer_name,
             c.email as customer_email, c.phone as customer_phone
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `, [saleId]);

    if (saleResult.length === 0) {
      return res.status(404).json({ error: 'Vendita non trovata' });
    }

    const items = await executeQuery(`
      SELECT si.*, p.description as product_name, p.sku
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = ?
    `, [saleId]);

    const sale = {
      ...saleResult[0],
      items
    };

    const pdfBuffer = await PDFService.generateReceipt(sale);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ricevuta-${sale.receipt_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Generate receipt error:', error);
    res.status(500).json({ error: 'Errore nella generazione della ricevuta' });
  }
});

module.exports = router;
