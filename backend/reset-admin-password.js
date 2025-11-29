const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function resetPassword() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'database',
    user: process.env.DB_USER || 'gestionale_user',
    password: process.env.DB_PASSWORD || 'userpassword',
    database: process.env.DB_NAME || 'gestionale_abbigliamento'
  });

  const username = 'Tommaso';
  const newPassword = 'password123';
  
  try {
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    const [result] = await connection.execute(
      'UPDATE users SET password_hash = ?, salt = ? WHERE username = ?',
      [hashedPassword, salt, username]
    );

    if (result.affectedRows > 0) {
      console.log(`Password for user '${username}' has been reset to '${newPassword}'`);
    } else {
      console.log(`User '${username}' not found`);
    }
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetPassword();
