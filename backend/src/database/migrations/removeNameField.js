const { executeQuery } = require('../connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

async function removeNameField() {
  try {
    logger.info('Removing name field from products table...');
    
    // First, check if the column exists
    const columnExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestionale_abbigliamento' 
      AND TABLE_NAME = 'products' 
      AND COLUMN_NAME = 'name'
    `);

    if (columnExists[0].count > 0) {
      // Remove the name column
      await executeQuery(`
        ALTER TABLE products DROP COLUMN name
      `);
      logger.info('Successfully removed name field from products table');
    } else {
      logger.info('Name field does not exist in products table');
    }

    // Update the search index to remove name field
    await executeQuery(`
      DROP INDEX IF EXISTS idx_products_search
    `);
    
    await executeQuery(`
      CREATE INDEX idx_products_search ON products(brand, category, code)
    `);

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

module.exports = { removeNameField };

if (require.main === module) {
  removeNameField()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
