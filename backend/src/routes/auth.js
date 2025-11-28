const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

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
    const clientIP = req.ip || req.connection.remoteAddress;

    // Get user with security checks
    const users = await executeQuery(`
      SELECT id, username, email, password_hash, salt, role, 
             two_fa_secret, two_fa_enabled, failed_login_attempts, 
             last_failed_login, account_locked
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
    const validPassword = await bcrypt.compare(password, user.password_hash);
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
      if (!twoFAToken) {
        return res.status(402).json({ 
          error: '2FA richiesto',
          requires2FA: true 
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.two_fa_secret,
        encoding: 'base32',
        token: twoFAToken,
        window: 2
      });

      if (!verified) {
        return res.status(401).json({ error: 'Codice 2FA non valido' });
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
    const saltRounds = 12;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordHash = await bcrypt.hash(password, salt);

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

// Setup 2FA
router.post('/setup-2fa', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: '2FA disponibile solo per amministratori' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Gestionale Abbigliamento (${req.user.username})`,
      issuer: 'Gestionale Abbigliamento'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (will be confirmed when user verifies)
    req.session.temp2FASecret = secret.base32;

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Verify and enable 2FA
router.post('/verify-2fa', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    const tempSecret = req.session.temp2FASecret;

    if (!tempSecret) {
      return res.status(400).json({ error: 'Setup 2FA non inizializzato' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: tempSecret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Codice 2FA non valido' });
    }

    // Enable 2FA for user
    await executeQuery(`
      UPDATE users 
      SET two_fa_secret = ?, two_fa_enabled = TRUE
      WHERE id = ?
    `, [tempSecret, req.user.id]);

    // Clear temporary secret
    delete req.session.temp2FASecret;

    res.json({ message: '2FA abilitato con successo' });

  } catch (error) {
    console.error('2FA verification error:', error);
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
