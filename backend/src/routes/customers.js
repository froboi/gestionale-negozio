const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeQuery } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const WhatsAppService = require('../services/whatsappService');

const router = express.Router();

// Customer validation rules
const customerValidation = [
  body('first_name').trim().isLength({ min: 1, max: 100 }).escape(),
  body('last_name').trim().isLength({ min: 1, max: 100 }).escape(),
  body('email').optional({ nullable: true }).isEmail().normalizeEmail(),
  body('phone').optional({ nullable: true }).trim().isMobilePhone('it-IT'),
  body('birth_date').optional({ nullable: true }).isISO8601().toDate(),
  body('address').optional().trim().escape(),
  body('city').optional().trim().isLength({ max: 100 }).escape(),
  body('postal_code').optional().trim().isLength({ max: 20 }).escape()
];

// Get all customers with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      sort_by = 'last_name',
      sort_order = 'ASC',
      birthday_month
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const validSortColumns = ['first_name', 'last_name', 'email', 'phone', 'birth_date', 'total_spent', 'loyalty_points', 'created_at'];
    const validSortOrder = ['ASC', 'DESC'];
    
    const sortBy = validSortColumns.includes(sort_by) ? sort_by : 'last_name';
    const sortOrder = validSortOrder.includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    let whereConditions = [];
    let queryParams = [];

    // Build WHERE conditions
    if (search) {
      whereConditions.push('(first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const searchTerm = `%${search}%`;
      queryParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (birthday_month) {
      whereConditions.push('MONTH(birth_date) = ?');
      queryParams.push(parseInt(birthday_month));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get customers
    const customers = await executeQuery(`
      SELECT id, first_name, last_name, email, phone, birth_date,
             address, city, postal_code, loyalty_points, total_spent,
             last_purchase, created_at, updated_at
      FROM customers 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `, queryParams);

    // Get total count for pagination
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM customers ${whereClause}
    `, queryParams);

    const totalCustomers = countResult[0].total;
    const totalPages = Math.ceil(totalCustomers / parseInt(limit));

    res.json({
      customers,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCustomers,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei clienti' });
  }
});

// Get single customer with purchase history
router.get('/:id', param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id;

    // Get customer details
    const customer = await executeQuery(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customer.length) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    // Get purchase history
    const purchases = await executeQuery(`
      SELECT s.id, s.total_amount, s.discount_amount, s.final_amount,
             s.payment_method, s.created_at, s.notes,
             COUNT(si.id) as item_count
      FROM sales s
      LEFT JOIN sale_items si ON s.id = si.sale_id
      WHERE s.customer_id = ?
      GROUP BY s.id
      ORDER BY s.created_at DESC
      LIMIT 20
    `, [customerId]);

    // Get favorite products (most purchased)
    const favoriteProducts = await executeQuery(`
      SELECT p.id, p.code, p.name, p.brand, p.category,
             SUM(si.quantity) as total_quantity,
             COUNT(DISTINCT si.sale_id) as purchase_count
      FROM products p
      JOIN sale_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      WHERE s.customer_id = ?
      GROUP BY p.id
      ORDER BY total_quantity DESC
      LIMIT 5
    `, [customerId]);

    res.json({
      customer: customer[0],
      purchases,
      favoriteProducts,
      stats: {
        totalPurchases: purchases.length,
        totalSpent: customer[0].total_spent,
        loyaltyPoints: customer[0].loyalty_points,
        lastPurchase: customer[0].last_purchase
      }
    });

  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({ error: 'Errore nel recupero del cliente' });
  }
});

// Create new customer
router.post('/', customerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      first_name, last_name, email, phone, birth_date,
      address, city, postal_code
    } = req.body;

    // Check if customer already exists (by email or phone)
    if (email || phone) {
      let existingCustomer = [];
      if (email && phone) {
        existingCustomer = await executeQuery(
          'SELECT id FROM customers WHERE email = ? OR phone = ?',
          [email, phone]
        );
      } else if (email) {
        existingCustomer = await executeQuery(
          'SELECT id FROM customers WHERE email = ?',
          [email]
        );
      } else if (phone) {
        existingCustomer = await executeQuery(
          'SELECT id FROM customers WHERE phone = ?',
          [phone]
        );
      }

      if (existingCustomer.length > 0) {
        return res.status(409).json({ error: 'Cliente già esistente con questa email o telefono' });
      }
    }

    // Validate phone number format if provided
    if (phone && !WhatsAppService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Formato numero di telefono non valido' });
    }

    // Create customer
    const result = await executeQuery(`
      INSERT INTO customers (
        first_name, last_name, email, phone, birth_date,
        address, city, postal_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      first_name, 
      last_name, 
      email || null, 
      phone || null, 
      birth_date || null,
      address || null, 
      city || null, 
      postal_code || null
    ]);

    const newCustomer = await executeQuery(
      'SELECT * FROM customers WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: 'Cliente creato con successo',
      customer: newCustomer[0]
    });

  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Errore nella creazione del cliente' });
  }
});

// Update customer
router.put('/:id', customerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id;
    const {
      first_name, last_name, email, phone, birth_date,
      address, city, postal_code
    } = req.body;

    // Check if customer exists
    const existingCustomer = await executeQuery(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    if (!existingCustomer.length) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    // Check for conflicts with other customers
    if (email || phone) {
      let conflictCheck = [];
      if (email && phone) {
        conflictCheck = await executeQuery(
          'SELECT id FROM customers WHERE (email = ? OR phone = ?) AND id != ?',
          [email, phone, customerId]
        );
      } else if (email) {
        conflictCheck = await executeQuery(
          'SELECT id FROM customers WHERE email = ? AND id != ?',
          [email, customerId]
        );
      } else if (phone) {
        conflictCheck = await executeQuery(
          'SELECT id FROM customers WHERE phone = ? AND id != ?',
          [phone, customerId]
        );
      }

      if (conflictCheck.length > 0) {
        return res.status(409).json({ error: 'Email o telefono già in uso da un altro cliente' });
      }
    }

    // Validate phone number format if provided
    if (phone && !WhatsAppService.validatePhoneNumber(phone)) {
      return res.status(400).json({ error: 'Formato numero di telefono non valido' });
    }

    // Update customer
    await executeQuery(`
      UPDATE customers SET 
        first_name = ?, last_name = ?, email = ?, phone = ?, birth_date = ?,
        address = ?, city = ?, postal_code = ?, updated_at = NOW()
      WHERE id = ?
    `, [
      first_name, last_name, email, phone, birth_date,
      address, city, postal_code, customerId
    ]);

    const updatedCustomer = await executeQuery(
      'SELECT * FROM customers WHERE id = ?',
      [customerId]
    );

    res.json({
      message: 'Cliente aggiornato con successo',
      customer: updatedCustomer[0]
    });

  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del cliente' });
  }
});

// Delete customer
router.delete('/:id', requireRole(['admin']), param('id').isInt(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const customerId = req.params.id;

    // Check if customer exists
    const customer = await executeQuery(
      'SELECT id FROM customers WHERE id = ?',
      [customerId]
    );

    if (!customer.length) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    // Check if customer has purchases
    const purchasesCheck = await executeQuery(
      'SELECT id FROM sales WHERE customer_id = ? LIMIT 1',
      [customerId]
    );

    if (purchasesCheck.length > 0) {
      return res.status(409).json({ 
        error: 'Impossibile eliminare: cliente ha acquisti registrati' 
      });
    }

    // Delete customer
    await executeQuery('DELETE FROM customers WHERE id = ?', [customerId]);

    res.json({ message: 'Cliente eliminato con successo' });

  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({ error: 'Errore nell\'eliminazione del cliente' });
  }
});

// Get customers with birthdays this month
router.get('/birthdays/this-month', async (req, res) => {
  try {
    const currentMonth = new Date().getMonth() + 1;

    const customers = await executeQuery(`
      SELECT id, first_name, last_name, phone, birth_date,
             DAY(birth_date) as birthday_day
      FROM customers 
      WHERE MONTH(birth_date) = ? AND birth_date IS NOT NULL
      ORDER BY DAY(birth_date)
    `, [currentMonth]);

    res.json({ customers });

  } catch (error) {
    console.error('Birthday customers error:', error);
    res.status(500).json({ error: 'Errore nel recupero compleanni' });
  }
});

// Get customers with birthdays today
router.get('/birthdays/today', async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const customers = await executeQuery(`
      SELECT id, first_name, last_name, phone, birth_date
      FROM customers 
      WHERE MONTH(birth_date) = ? AND DAY(birth_date) = ?
      AND birth_date IS NOT NULL
    `, [month, day]);

    res.json({ customers });

  } catch (error) {
    console.error('Today birthday customers error:', error);
    res.status(500).json({ error: 'Errore nel recupero compleanni di oggi' });
  }
});

// Send birthday message manually
router.post('/:id/birthday-message', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const customerId = req.params.id;

    const customer = await executeQuery(`
      SELECT first_name, last_name, phone, birth_date
      FROM customers WHERE id = ?
    `, [customerId]);

    if (!customer.length) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    const customerData = customer[0];

    if (!customerData.phone) {
      return res.status(400).json({ error: 'Cliente non ha numero di telefono' });
    }

    if (!customerData.birth_date) {
      return res.status(400).json({ error: 'Cliente non ha data di nascita' });
    }

    // Calculate age
    const today = new Date();
    const birthDate = new Date(customerData.birth_date);
    const age = today.getFullYear() - birthDate.getFullYear();

    // Generate message
    const discountPercent = 10; // Fixed discount for manual messages
    const message = `🎉 Buon compleanno ${customerData.first_name}! 🎂\n\nPer festeggiare i tuoi ${age} anni, abbiamo preparato uno sconto speciale del ${discountPercent}% solo per te! 🎁\n\nVieni a trovarci nel nostro negozio e approfitta di questa offerta esclusiva.\n\nTanti auguri! 🥳`;

    // Send WhatsApp message
    await WhatsAppService.sendMessage(customerData.phone, message);

    res.json({ message: 'Messaggio di compleanno inviato con successo' });

  } catch (error) {
    console.error('Send birthday message error:', error);
    res.status(500).json({ error: 'Errore nell\'invio del messaggio' });
  }
});

// Add loyalty points
router.post('/:id/loyalty-points', requireRole(['admin', 'manager', 'employee']), async (req, res) => {
  try {
    const customerId = req.params.id;
    const { points, reason } = req.body;

    if (!points || typeof points !== 'number') {
      return res.status(400).json({ error: 'Punti validi richiesti' });
    }

    // Update customer loyalty points
    await executeQuery(`
      UPDATE customers 
      SET loyalty_points = loyalty_points + ?, updated_at = NOW()
      WHERE id = ?
    `, [points, customerId]);

    const updatedCustomer = await executeQuery(
      'SELECT loyalty_points FROM customers WHERE id = ?',
      [customerId]
    );

    if (!updatedCustomer.length) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    res.json({
      message: 'Punti fedeltà aggiornati con successo',
      loyaltyPoints: updatedCustomer[0].loyalty_points
    });

  } catch (error) {
    console.error('Add loyalty points error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento punti fedeltà' });
  }
});

module.exports = router;
