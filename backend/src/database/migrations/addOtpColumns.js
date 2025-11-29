const { executeQuery } = require('../connection');

async function migrate() {
  try {
    console.log('🔄 Adding OTP columns to users table...');
    
    // Add otp_code and otp_expires_at columns
    await executeQuery(`
      ALTER TABLE users 
      ADD COLUMN otp_code VARCHAR(6) NULL,
      ADD COLUMN otp_expires_at TIMESTAMP NULL;
    `);

    console.log('✅ OTP columns added successfully.');
    process.exit(0);
  } catch (error) {
    // Ignore error if columns already exist (duplicate column name)
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('ℹ️ Columns already exist.');
      process.exit(0);
    }
    console.error('❌ Error adding columns:', error);
    process.exit(1);
  }
}

migrate();
