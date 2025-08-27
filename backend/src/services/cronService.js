const cron = require('node-cron');
const { executeQuery } = require('../database/connection');
const WhatsAppService = require('./whatsappService');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class CronService {
  static startBirthdayCheck() {
    // Run every day at 9:00 AM
    cron.schedule('0 9 * * *', async () => {
      logger.info('Starting birthday check...');
      await this.checkBirthdays();
    });

    // Also run at startup for testing (can be removed in production)
    if (process.env.NODE_ENV !== 'production') {
      logger.info('Running birthday check at startup...');
      setTimeout(() => this.checkBirthdays(), 5000);
    }
  }

  static async checkBirthdays() {
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');

      // Find customers with birthday today
      const birthdayCustomers = await executeQuery(`
        SELECT c.id, c.first_name, c.last_name, c.phone, c.birth_date
        FROM customers c
        WHERE MONTH(c.birth_date) = ? AND DAY(c.birth_date) = ?
        AND c.phone IS NOT NULL AND c.phone != ''
      `, [parseInt(month), parseInt(day)]);

      if (!birthdayCustomers.length) {
        logger.info('No birthdays today');
        return;
      }

      logger.info(`Found ${birthdayCustomers.length} customers with birthday today`);

      for (const customer of birthdayCustomers) {
        await this.processBirthdayMessage(customer, currentYear);
      }

    } catch (error) {
      logger.error('Birthday check error:', error);
    }
  }

  static async processBirthdayMessage(customer, year) {
    try {
      // Check if message already sent this year
      const existingMessage = await executeQuery(`
        SELECT id FROM birthday_messages 
        WHERE customer_id = ? AND year_sent = ?
      `, [customer.id, year]);

      if (existingMessage.length > 0) {
        logger.info(`Birthday message already sent to ${customer.first_name} ${customer.last_name} this year`);
        return;
      }

      // Calculate age
      const birthDate = new Date(customer.birth_date);
      const age = year - birthDate.getFullYear();

      // Generate birthday message with discount
      const discountPercent = this.calculateBirthdayDiscount(age);
      const message = this.generateBirthdayMessage(customer.first_name, age, discountPercent);

      // Send WhatsApp message
      let messageSent = false;
      let errorMessage = null;

      try {
        await WhatsAppService.sendMessage(customer.phone, message);
        messageSent = true;
        logger.info(`Birthday message sent to ${customer.first_name} ${customer.last_name}`);
      } catch (whatsappError) {
        errorMessage = whatsappError.message;
        logger.error(`Failed to send birthday message to ${customer.first_name} ${customer.last_name}:`, whatsappError);
      }

      // Log the attempt
      await executeQuery(`
        INSERT INTO birthday_messages (
          customer_id, message_sent, sent_at, error_message, year_sent
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        customer.id,
        messageSent,
        messageSent ? new Date() : null,
        errorMessage,
        year
      ]);

    } catch (error) {
      logger.error(`Error processing birthday message for customer ${customer.id}:`, error);
    }
  }

  static calculateBirthdayDiscount(age) {
    // Different discounts based on age groups
    if (age >= 65) return 20; // Senior discount
    if (age >= 50) return 15;
    if (age >= 30) return 10;
    if (age >= 18) return 10;
    return 5; // Young customers
  }

  static generateBirthdayMessage(firstName, age, discountPercent) {
    const messages = [
      `🎉 Buon compleanno ${firstName}! Oggi compi ${age} anni! 🎂\n\nPer festeggiare, abbiamo preparato uno sconto speciale del ${discountPercent}% solo per te! 🎁\n\nVieni a trovarci nel nostro negozio e approfitta di questa offerta esclusiva. Lo sconto è valido per 7 giorni.\n\nTanti auguri! 🥳`,
      
      `🎈 Tanti auguri ${firstName}! ${age} anni portati benissimo! 🎊\n\nCome regalo di compleanno, ti offriamo uno sconto del ${discountPercent}% su tutto il nostro assortimento! 🛍️\n\nL'offerta è valida fino al ${this.getExpiryDate()}. Non perdere questa occasione!\n\nBuon compleanno! 🎂`,
      
      `🌟 Felice compleanno ${firstName}! 🎉\n\n${age} anni di stile e eleganza meritano un regalo speciale: ${discountPercent}% di sconto su tutti i nostri capi! ✨\n\nVieni a scoprire le nostre ultime collezioni con questo sconto esclusivo.\n\nValido per una settimana. Tanti auguri! 🎁`
    ];

    // Randomly select a message template
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }

  static getExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toLocaleDateString('it-IT');
  }

  static startInventoryAlerts() {
    // Check for low stock every day at 8:00 AM
    cron.schedule('0 8 * * *', async () => {
      logger.info('Starting inventory check...');
      await this.checkLowStock();
    });
  }

  static async checkLowStock() {
    try {
      const lowStockProducts = await executeQuery(`
        SELECT id, code, name, quantity, min_quantity
        FROM products
        WHERE quantity <= min_quantity AND min_quantity > 0
      `);

      if (!lowStockProducts.length) {
        logger.info('No low stock products found');
        return;
      }

      logger.warn(`Found ${lowStockProducts.length} products with low stock`);

      // Here you could send notifications to managers/admins
      // For example, email alerts or internal notifications
      
      // Log the low stock products
      const productList = lowStockProducts.map(p => 
        `${p.code} - ${p.name}: ${p.quantity}/${p.min_quantity}`
      ).join('\n');

      logger.warn('Low stock products:\n' + productList);

    } catch (error) {
      logger.error('Low stock check error:', error);
    }
  }
}

module.exports = CronService;
