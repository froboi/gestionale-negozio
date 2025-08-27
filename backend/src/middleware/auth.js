const jwt = require('jsonwebtoken');
const { executeQuery } = require('../database/connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// JWT authentication middleware
async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token di accesso richiesto' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret');
    
    // Verify user still exists and is not locked
    const user = await executeQuery(
      'SELECT id, username, email, role, account_locked, two_fa_enabled FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (!user.length) {
      return res.status(401).json({ error: 'Utente non trovato' });
    }

    if (user[0].account_locked) {
      return res.status(401).json({ error: 'Account bloccato' });
    }

    req.user = user[0];
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Token non valido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Token scaduto' });
    }
    
    logger.error('JWT verification error:', error);
    return res.status(500).json({ error: 'Errore di autenticazione' });
  }
}

// Role-based authorization middleware
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Accesso non autorizzato' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permessi insufficienti' });
    }

    next();
  };
}

// 2FA verification middleware
function require2FA(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Accesso non autorizzato' });
  }

  // Skip 2FA for certain roles or if disabled
  if (req.user.role !== 'tech' || !req.user.two_fa_enabled) {
    return next();
  }

  const twoFAToken = req.headers['x-2fa-token'];
  if (!twoFAToken) {
    return res.status(402).json({ error: '2FA richiesto', requires2FA: true });
  }

  // 2FA verification logic would be implemented here
  // For now, we'll assume it's valid if present
  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  require2FA
};
