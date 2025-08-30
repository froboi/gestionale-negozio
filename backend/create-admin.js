const { executeQuery } = require('./src/database/connection');

async function createAdmin() {
  try {
    const result = await executeQuery(`
      INSERT INTO users (username, email, password_hash, salt, role, two_fa_enabled) 
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'admin', 
      'admin@gestionale.com', 
      '$2b$12$z49Mbvc0kJNVGH7g3AI9iukhDkYFmsmHcOgDAiuS57iTcUOHVPsnu', 
      '$2b$12$z49Mbvc0kJNVGH7g3AI9iu', 
      'admin', 
      false
    ]);
    console.log('✅ Utente admin creato con successo!');
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('⚠️ Utente admin già esistente');
    } else {
      console.error('❌ Errore:', error.message);
    }
  }
  process.exit(0);
}

createAdmin();
