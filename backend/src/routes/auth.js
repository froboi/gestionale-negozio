const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const EmailService = require('../services/emailService');

const router = express.Router();

// Login validation rules
const loginValidation = [
  body('username').trim().isLength({ min: 3 }).escape(),
  body('password').isLength({ min: 6 })
];

// Register validation rules
const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).isAlphanumeric().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('role').optional().isIn(['admin', 'manager', 'employee'])
];

// User login
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, twoFAToken } = req.body;

    // Get user with security checks
    const users = await executeQuery(`
      SELECT id, username, email, password_hash, salt, role, 
             two_fa_enabled, otp_code, otp_expires_at, last_2fa_verification,
             failed_login_attempts, last_failed_login, account_locked
      FROM users 
      WHERE username = ? OR email = ?
    `, [username, username]);

    if (!users.length) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = users[0];

    // Check if account is locked
    if (user.account_locked) {
      return res.status(423).json({ error: 'Account bloccato. Contatta l\'amministratore.' });
    }

    // Check for too many failed attempts
    if (user.failed_login_attempts >= 5) {
      const lockTime = new Date(user.last_failed_login);
      lockTime.setMinutes(lockTime.getMinutes() + 15);
      
      if (new Date() < lockTime) {
        return res.status(429).json({ 
          error: 'Troppi tentativi falliti. Riprova tra 15 minuti.' 
        });
      }
    }

    // Verify password
    let validPassword = false;
    
    // Try with salt appended (standard method for this app)
    if (user.salt) {
      validPassword = await bcrypt.compare(password + user.salt, user.password_hash);
    }
    
    // Fallback: try direct comparison (for legacy or differently hashed passwords)
    if (!validPassword) {
      validPassword = await bcrypt.compare(password, user.password_hash);
    }

    if (!validPassword) {
      // Increment failed attempts
      await executeQuery(`
        UPDATE users 
        SET failed_login_attempts = failed_login_attempts + 1,
            last_failed_login = NOW()
        WHERE id = ?
      `, [user.id]);

      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Check 2FA if enabled
    if (user.two_fa_enabled) {
      // Check if 2FA verification is needed (reset every Monday)
      let needsVerification = true;
      
      if (user.last_2fa_verification) {
        const lastVerification = new Date(user.last_2fa_verification);
        const now = new Date();
        
        // Calculate the start of the current week (Monday)
        const currentMonday = new Date(now);
        const day = currentMonday.getDay();
        const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        currentMonday.setDate(diff);
        currentMonday.setHours(0, 0, 0, 0);
        
        // If last verification was after the start of this week's Monday, no need to verify again
        if (lastVerification >= currentMonday) {
          needsVerification = false;
        }
      }

      if (needsVerification) {
        // If no token provided, generate and send OTP
        if (!twoFAToken) {
          // Generate 6-digit OTP
          const otp = crypto.randomInt(100000, 999999).toString();
          const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

          // Save OTP to DB
          await executeQuery(`
            UPDATE users 
            SET otp_code = ?, otp_expires_at = ?
            WHERE id = ?
          `, [otp, expiresAt, user.id]);

          // Send OTP via email
          await EmailService.sendOTP(user.email, otp);

          return res.status(402).json({ 
            error: '2FA richiesto',
            requires2FA: true,
            message: `Codice inviato a ${user.email}`
          });
        }

        // Verify provided token
        if (user.otp_code !== twoFAToken) {
          return res.status(401).json({ error: 'Codice 2FA non valido' });
        }

        if (new Date() > new Date(user.otp_expires_at)) {
          return res.status(401).json({ error: 'Codice 2FA scaduto' });
        }

        // Clear OTP and update last verification time after successful use
        await executeQuery(`
          UPDATE users 
          SET otp_code = NULL, otp_expires_at = NULL, last_2fa_verification = NOW()
          WHERE id = ?
        `, [user.id]);
      }
    }

    // Reset failed attempts and update last login
    await executeQuery(`
      UPDATE users 
      SET failed_login_attempts = 0,
          last_failed_login = NULL,
          last_login = NOW()
      WHERE id = ?
    `, [user.id]);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-super-secret-jwt-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login effettuato con successo',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        twoFAEnabled: user.two_fa_enabled
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// User registration (admin only)
router.post('/register', authenticateToken, registerValidation, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Solo gli amministratori possono registrare nuovi utenti' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password, role = 'employee' } = req.body;

    // Check if user already exists
    const existingUsers = await executeQuery(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username o email già in uso' });
    }

    // Hash password with salt
    const salt = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(password + salt, 12);

    // Create user
    const result = await executeQuery(`
      INSERT INTO users (username, email, password_hash, salt, role)
      VALUES (?, ?, ?, ?, ?)
    `, [username, email, passwordHash, salt, role]);

    res.status(201).json({
      message: 'Utente creato con successo',
      userId: result.insertId
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Enable 2FA
router.post('/enable-2fa', authenticateToken, async (req, res) => {
  try {
    // Enable 2FA for user
    await executeQuery(`
      UPDATE users 
      SET two_fa_enabled = TRUE
      WHERE id = ?
    `, [req.user.id]);

    res.json({ message: '2FA abilitato con successo. Al prossimo login riceverai un codice via email.' });

  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Disable 2FA
router.post('/disable-2fa', authenticateToken, async (req, res) => {
  try {
    // Disable 2FA for user
    await executeQuery(`
      UPDATE users 
      SET two_fa_enabled = FALSE, otp_code = NULL, otp_expires_at = NULL
      WHERE id = ?
    `, [req.user.id]);

    res.json({ message: '2FA disabilitato con successo' });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Logout
router.post('/logout', authenticateToken, (req, res) => {
  // In a production environment, you might want to blacklist the token
  res.json({ message: 'Logout effettuato con successo' });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      twoFAEnabled: req.user.two_fa_enabled
    }
  });
});

module.exports = router;
