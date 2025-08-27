const { createTables } = require('./createTables');
const { testConnection } = require('../connection');

async function runMigrations() {
  console.log('🔄 Avvio migrazioni database...');
  
  try {
    // Test database connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Impossibile connettersi al database');
    }
    
    // Run migrations
    await createTables();
    
    console.log('✅ Migrazioni completate con successo!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Errore durante le migrazioni:', error);
    process.exit(1);
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
