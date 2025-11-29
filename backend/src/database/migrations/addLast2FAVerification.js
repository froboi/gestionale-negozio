const { executeQuery } = require('../connection');

async function migrate() {
  try {
    console.log('🔄 Adding last_2fa_verification column to users table...');
    
    // Add last_2fa_verification column
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN last_2fa_verification TIMESTAMP NULL;
    `);

    console.log('✅ Column added successfully.');
    process.exit(0);
  } catch (error) {
    // Ignore error if columns already exist (duplicate column name)
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Column already exists.');
      process.exit(0);
    }
    console.error('❌ Error adding column:', error);
    process.exit(1);
  }
}

migrate();
