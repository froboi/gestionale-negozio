const { addSatispayPaymentMethod } = require('./src/database/migrations/addSatispayPayment');

async function runSatispayMigration() {
  try {
    console.log('🚀 Starting Satispay payment method migration...');
    await addSatispayPaymentMethod();
    console.log('✅ Satispay payment method migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runSatispayMigration();