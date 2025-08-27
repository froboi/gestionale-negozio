const { executeQuery } = require('../database/connection');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Audit logging middleware
async function auditMiddleware(req, res, next) {
  // Store original methods
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Store request data
  const auditData = {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    userId: null,
    action: null,
    timestamp: new Date()
  };

  // Get user ID if authenticated
  if (req.user) {
    auditData.userId = req.user.id;
  }

  // Determine action based on method and URL
  auditData.action = determineAction(req.method, req.url);

  // Override response methods to capture status
  res.send = function(data) {
    auditData.statusCode = res.statusCode;
    logAuditEvent(auditData, req, res);
    originalSend.call(this, data);
  };

  res.json = function(data) {
    auditData.statusCode = res.statusCode;
    logAuditEvent(auditData, req, res);
    originalJson.call(this, data);
  };

  next();
}

function determineAction(method, url) {
  // Map HTTP methods and URLs to meaningful actions
  const actionMap = {
    'POST /api/auth/login': 'LOGIN_ATTEMPT',
    'POST /api/auth/logout': 'LOGOUT',
    'POST /api/products': 'CREATE_PRODUCT',
    'PUT /api/products': 'UPDATE_PRODUCT',
    'DELETE /api/products': 'DELETE_PRODUCT',
    'POST /api/customers': 'CREATE_CUSTOMER',
    'PUT /api/customers': 'UPDATE_CUSTOMER',
    'DELETE /api/customers': 'DELETE_CUSTOMER',
    'POST /api/sales': 'CREATE_SALE',
    'GET /api/admin': 'ACCESS_ADMIN_PANEL'
  };

  const key = `${method} ${url.split('?')[0]}`;
  return actionMap[key] || `${method}_${url.split('/')[2] || 'UNKNOWN'}`;
}

async function logAuditEvent(auditData, req, res) {
  // Only log important events or failed attempts
  const importantActions = [
    'LOGIN_ATTEMPT', 'LOGOUT', 'CREATE_PRODUCT', 'UPDATE_PRODUCT', 
    'DELETE_PRODUCT', 'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 
    'DELETE_CUSTOMER', 'CREATE_SALE', 'ACCESS_ADMIN_PANEL'
  ];

  const shouldLog = importantActions.includes(auditData.action) || 
                   auditData.statusCode >= 400;

  if (!shouldLog) return;

  try {
    const logEntry = {
      user_id: auditData.userId,
      action: auditData.action,
      ip_address: auditData.ip,
      user_agent: auditData.userAgent,
      status_code: auditData.statusCode,
      method: auditData.method,
      url: auditData.url,
      timestamp: auditData.timestamp
    };

    // Log to Winston for immediate visibility
    logger.info('Audit Log', logEntry);

    // Store in database for persistence
    await executeQuery(`
      INSERT INTO audit_logs (
        user_id, action, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      logEntry.user_id,
      logEntry.action,
      logEntry.ip_address,
      logEntry.user_agent,
      new Date()
    ]);

  } catch (error) {
    logger.error('Failed to log audit event:', error);
  }
}

module.exports = auditMiddleware;
