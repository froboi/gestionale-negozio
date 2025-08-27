const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { executeQuery } = require('../database/connection');
const { requireRole } = require('../middleware/auth');
const PDFService = require('../services/pdfService');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateCondition = '';
    switch (period) {
      case 'today':
        dateCondition = 'DATE(created_at) = CURDATE()';
        break;
      case 'week':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      case 'month':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case 'year':
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
        break;
      default:
        dateCondition = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    }

    // Sales statistics
    const salesStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(final_amount), 0) as total_revenue,
        COALESCE(AVG(final_amount), 0) as average_sale,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM sales 
      WHERE ${dateCondition}
    `);

    // Product statistics
    const productStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN quantity <= min_quantity THEN 1 END) as low_stock_products,
        COALESCE(SUM(quantity * price), 0) as inventory_value
      FROM products
    `);

    // Customer statistics
    const customerStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_customers,
        COUNT(CASE WHEN ${dateCondition} THEN 1 END) as new_customers
      FROM customers
    `);

    // Top selling products
    const topProducts = await executeQuery(`
      SELECT 
        p.id, p.code, p.name, p.brand,
        SUM(si.quantity) as total_sold,
        SUM(si.subtotal) as total_revenue
      FROM products p
      JOIN sale_items si ON p.id = si.product_id
      JOIN sales s ON si.sale_id = s.id
      WHERE ${dateCondition.replace('created_at', 's.created_at')}
      GROUP BY p.id
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Daily sales chart data (last 30 days)
    const dailySales = await executeQuery(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as sales_count,
        COALESCE(SUM(final_amount), 0) as daily_revenue
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date
    `);

    // Monthly comparison
    const monthlyComparison = await executeQuery(`
      SELECT 
        MONTH(created_at) as month,
        YEAR(created_at) as year,
        COUNT(*) as sales_count,
        COALESCE(SUM(final_amount), 0) as revenue
      FROM sales 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY YEAR(created_at), MONTH(created_at)
      ORDER BY year, month
    `);

    // Recent activities (audit logs)
    const recentActivities = await executeQuery(`
      SELECT 
        al.action, al.created_at, al.ip_address,
        u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 20
    `);

    res.json({
      period,
      salesStats: salesStats[0],
      productStats: productStats[0],
      customerStats: customerStats[0],
      topProducts,
      charts: {
        dailySales,
        monthlyComparison
      },
      recentActivities
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Errore nel caricamento delle statistiche' });
  }
});

// Get sales report
router.get('/reports/sales', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { start_date, end_date, format = 'json' } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Date di inizio e fine richieste' });
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato date non valido' });
    }

    // Get sales data
    const sales = await executeQuery(`
      SELECT 
        s.id, s.total_amount, s.discount_amount, s.final_amount,
        s.payment_method, s.created_at, s.notes,
        CONCAT(c.first_name, ' ', c.last_name) as customer_name,
        u.username as seller
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.user_id = u.id
      WHERE DATE(s.created_at) BETWEEN ? AND ?
      ORDER BY s.created_at DESC
    `, [start_date, end_date]);

    // Calculate summary
    const summary = {
      totalSales: sales.length,
      totalAmount: sales.reduce((sum, sale) => sum + parseFloat(sale.final_amount), 0),
      totalDiscounts: sales.reduce((sum, sale) => sum + parseFloat(sale.discount_amount || 0), 0),
      averageValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + parseFloat(sale.final_amount), 0) / sales.length : 0
    };

    if (format === 'pdf') {
      // Generate PDF report
      const reportData = {
        totalAmount: summary.totalAmount,
        totalTransactions: summary.totalSales,
        averageValue: summary.averageValue,
        sales: sales.map(sale => ({
          date: sale.created_at.toLocaleDateString('it-IT'),
          customer: sale.customer_name,
          total: parseFloat(sale.final_amount),
          paymentMethod: sale.payment_method
        }))
      };

      const pdfBuffer = await PDFService.generateSalesReport(reportData, {
        from: startDate.toLocaleDateString('it-IT'),
        to: endDate.toLocaleDateString('it-IT')
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${start_date}-${end_date}.pdf"`);
      return res.send(pdfBuffer);
    }

    res.json({
      dateRange: { start_date, end_date },
      summary,
      sales
    });

  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Errore nella generazione del report vendite' });
  }
});

// Get inventory report
router.get('/reports/inventory', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { format = 'json', category, low_stock_only } = req.query;

    let whereConditions = [];
    let queryParams = [];

    if (category) {
      whereConditions.push('category = ?');
      queryParams.push(category);
    }

    if (low_stock_only === 'true') {
      whereConditions.push('quantity <= min_quantity');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get inventory data
    const products = await executeQuery(`
      SELECT id, code, name, brand, category, size, color,
             quantity, min_quantity, price, cost,
             (quantity * price) as value
      FROM products
      ${whereClause}
      ORDER BY name
    `, queryParams);

    // Calculate summary
    const summary = {
      totalProducts: products.length,
      totalValue: products.reduce((sum, product) => sum + parseFloat(product.value || 0), 0),
      lowStockCount: products.filter(p => p.quantity <= p.min_quantity).length,
      totalQuantity: products.reduce((sum, product) => sum + parseInt(product.quantity), 0)
    };

    if (format === 'pdf') {
      // Generate PDF report
      const reportData = {
        totalProducts: summary.totalProducts,
        totalValue: summary.totalValue,
        lowStockCount: summary.lowStockCount,
        products: products.map(product => ({
          code: product.code,
          name: product.name,
          size: product.size,
          quantity: product.quantity,
          price: parseFloat(product.price)
        }))
      };

      const pdfBuffer = await PDFService.generateInventoryReport(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory-report.pdf"');
      return res.send(pdfBuffer);
    }

    res.json({
      summary,
      products
    });

  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ error: 'Errore nella generazione del report inventario' });
  }
});

// Get user management
router.get('/users', requireRole(['admin']), async (req, res) => {
  try {
    const users = await executeQuery(`
      SELECT id, username, email, role, two_fa_enabled, account_locked,
             failed_login_attempts, last_login, created_at
      FROM users
      ORDER BY created_at DESC
    `);

    res.json({ users });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Errore nel recupero degli utenti' });
  }
});

// Update user role
router.put('/users/:id/role', requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    const validRoles = ['admin', 'manager', 'employee', 'tech'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Ruolo non valido' });
    }

    // Check if user exists
    const user = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user.length) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Update role
    await executeQuery(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [role, userId]
    );

    res.json({ message: 'Ruolo utente aggiornato con successo' });

  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento del ruolo' });
  }
});

// Lock/unlock user account
router.put('/users/:id/lock', requireRole(['admin']), async (req, res) => {
  try {
    const userId = req.params.id;
    const { locked } = req.body;

    // Check if user exists
    const user = await executeQuery('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user.length) {
      return res.status(404).json({ error: 'Utente non trovato' });
    }

    // Update lock status
    await executeQuery(`
      UPDATE users 
      SET account_locked = ?, failed_login_attempts = 0, updated_at = NOW()
      WHERE id = ?
    `, [locked, userId]);

    res.json({ 
      message: locked ? 'Account bloccato con successo' : 'Account sbloccato con successo' 
    });

  } catch (error) {
    console.error('Lock user error:', error);
    res.status(500).json({ error: 'Errore nel blocco/sblocco dell\'account' });
  }
});

// Get audit logs
router.get('/audit-logs', requireRole(['admin', 'tech']), async (req, res) => {
  try {
    const { page = 1, limit = 50, user_id, action, start_date, end_date } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let queryParams = [];

    if (user_id) {
      whereConditions.push('al.user_id = ?');
      queryParams.push(user_id);
    }

    if (action) {
      whereConditions.push('al.action LIKE ?');
      queryParams.push(`%${action}%`);
    }

    if (start_date && end_date) {
      whereConditions.push('DATE(al.created_at) BETWEEN ? AND ?');
      queryParams.push(start_date, end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const logs = await executeQuery(`
      SELECT al.id, al.action, al.table_name, al.record_id,
             al.old_values, al.new_values, al.ip_address, al.user_agent,
             al.created_at, u.username
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, parseInt(limit), offset]);

    const countResult = await executeQuery(`
      SELECT COUNT(*) as total FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
    `, queryParams);

    const totalLogs = countResult[0].total;
    const totalPages = Math.ceil(totalLogs / parseInt(limit));

    res.json({
      logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalLogs,
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Errore nel recupero dei log di audit' });
  }
});

// Get system health
router.get('/system/health', requireRole(['admin', 'tech']), async (req, res) => {
  try {
    // Database health
    const dbTest = await executeQuery('SELECT 1 as test');
    const dbHealthy = dbTest.length > 0;

    // Get database size
    const dbSize = await executeQuery(`
      SELECT 
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
    `);

    // Get table row counts
    const tableCounts = await executeQuery(`
      SELECT 
        table_name,
        table_rows
      FROM information_schema.tables 
      WHERE table_schema = DATABASE()
      AND table_name IN ('users', 'products', 'customers', 'sales', 'audit_logs')
    `);

    // System uptime
    const uptime = process.uptime();

    // Memory usage
    const memoryUsage = process.memoryUsage();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        healthy: dbHealthy,
        size_mb: dbSize[0]?.size_mb || 0,
        tables: tableCounts
      },
      system: {
        uptime_seconds: uptime,
        memory_usage: {
          rss_mb: Math.round(memoryUsage.rss / 1024 / 1024),
          heap_used_mb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heap_total_mb: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        }
      }
    });

  } catch (error) {
    console.error('System health error:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Backup database (admin only)
router.post('/system/backup', requireRole(['admin']), async (req, res) => {
  try {
    // This would typically use mysqldump or similar
    // For security, this is just a placeholder
    res.json({ 
      message: 'Backup avviato',
      note: 'Il backup verrà elaborato in background'
    });

  } catch (error) {
    console.error('Backup error:', error);
    res.status(500).json({ error: 'Errore nell\'avvio del backup' });
  }
});

module.exports = router;
