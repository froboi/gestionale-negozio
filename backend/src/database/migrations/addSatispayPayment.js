const { executeQuery } = require('../connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

async function addSatispayPaymentMethod() {
  try {
    // Aggiunge 'satispay' ai metodi di pagamento disponibili
    await executeQuery(`
      ALTER TABLE sales 
      MODIFY payment_method ENUM('cash', 'card', 'transfer', 'mixed', 'satispay') NOT NULL
    `);

    logger.info('✅ Satispay payment method added successfully to sales table');
    
  } catch (error) {
    logger.error('❌ Error adding Satispay payment method:', error);
    throw error;
  }
}

module.exports = { addSatispayPaymentMethod };