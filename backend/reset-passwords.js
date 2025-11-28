const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { executeQuery } = require('./src/database/connection');

async function resetUserPasswords() {
  try {
    console.log('🔄 Resetting user passwords...');
    
    // Nuove password per gli utenti
    const users = [
      { username: 'tommaso', password: 'tommaso123', email: 'casaletommi@gmail.com' },
      { username: 'Monica', password: 'monica123', email: 'indizidimoda@gmail.com' },
      { username: 'testuser', password: 'Test123!', email: 'test@example.com' }
    ];
    
    for (const user of users) {
      console.log(`Resetting password for: ${user.username}`);
      
      // Generate salt and hash password
      const salt = crypto.randomBytes(32).toString('hex');
      const saltedPassword = user.password + salt;
      const passwordHash = await bcrypt.hash(saltedPassword, 12);
      
      // Update user in database
      await executeQuery(`
        UPDATE users 
        SET password_hash = ?, salt = ? 
        WHERE username = ?
      `, [passwordHash, salt, user.username]);
      
      console.log(`✅ Password reset for ${user.username} - New password: ${user.password}`);
    }
    
    console.log('🎉 All passwords reset successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    process.exit(1);
  }
}

resetUserPasswords();