require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const csrf = require('csurf');
const { body, validationResult } = require('express-validator');
const winston = require('winston');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const customerRoutes = require('./routes/customers');
const salesRoutes = require('./routes/sales');
const adminRoutes = require('./routes/admin');

// Import middleware
const { authenticateToken, requireRole, require2FA } = require('./middleware/auth');
const auditMiddleware = require('./middleware/audit');

// Import services
const cronService = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'gestionale-backend' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Troppi tentativi, riprova più tardi',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Troppi tentativi di login, riprova più tardi',
  skipSuccessfulRequests: true,
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-super-secret-session-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Apply CSRF protection to state-changing operations (temporarily disabled for login)
app.use('/api', (req, res, next) => {
  // Skip CSRF for GET requests and login endpoint
  if (req.method === 'GET' || req.path === '/api/auth/login' || req.path === '/api/csrf-token') {
    return next();
  }
  // Temporarily disable CSRF protection for easier testing
  // csrfProtection(req, res, next);
  next();
});

// Audit logging middleware
app.use(auditMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// CSRF token endpoint
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/sales', authenticateToken, salesRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Server Error:', error);
  
  if (error.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Token CSRF non valido' });
  }
  
  const status = error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Errore interno del server' 
    : error.message;
    
  res.status(status).json({ error: message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint non trovato' });
});

// Start cron services
cronService.startBirthdayCheck();

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`🚀 Server sicuro avviato sulla porta ${PORT}`);
});

module.exports = app;
