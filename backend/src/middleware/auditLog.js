const { promisePool } = require('../database/connection');
const { logger } = require('../utils/logger');

// Audit logging middleware
const auditLogger = async (req, res, next) => {
    // Skip audit logging for certain routes
    const skipRoutes = ['/health', '/api/auth/refresh'];
    const skipMethods = ['GET'];
    
    if (skipRoutes.some(route => req.path.includes(route)) || 
        skipMethods.includes(req.method)) {
        return next();
    }

    // Store original res.json to capture response
    const originalJson = res.json;
    let responseData = null;

    res.json = function(data) {
        responseData = data;
        return originalJson.call(this, data);
    };

    // Store original req.body for logging
    const requestBody = { ...req.body };
    
    // Remove sensitive data from logging
    if (requestBody.password) requestBody.password = '***';
    if (requestBody.current_password) requestBody.current_password = '***';
    if (requestBody.new_password) requestBody.new_password = '***';

    // Continue with request
    res.on('finish', async () => {
        try {
            // Determine action based on method and path
            let action = `${req.method} ${req.path}`;
            let entityType = 'unknown';
            let entityId = null;

            // Extract entity info from path
            const pathParts = req.path.split('/');
            if (pathParts.length >= 3) {
                entityType = pathParts[2]; // e.g., /api/products -> products
            }

            // Extract entity ID from params
            if (req.params.id) {
                entityId = parseInt(req.params.id);
            }

            // Map actions to more descriptive names
            const actionMap = {
                'POST /api/products': 'CREATE_PRODUCT',
                'PUT /api/products': 'UPDATE_PRODUCT',
                'DELETE /api/products': 'DELETE_PRODUCT',
                'POST /api/customers': 'CREATE_CUSTOMER',
                'PUT /api/customers': 'UPDATE_CUSTOMER',
                'DELETE /api/customers': 'DELETE_CUSTOMER',
                'POST /api/sales': 'CREATE_SALE',
                'PUT /api/sales': 'UPDATE_SALE',
                'DELETE /api/sales': 'DELETE_SALE',
                'POST /api/auth/login': 'LOGIN',
                'POST /api/auth/logout': 'LOGOUT',
                'POST /api/admin/users': 'CREATE_USER',
                'PUT /api/admin/users': 'UPDATE_USER',
                'DELETE /api/admin/users': 'DELETE_USER',
            };

            action = actionMap[action] || action;

            // Only log if we have a user (authenticated requests)
            const userId = req.user ? req.user.id : null;
            const ipAddress = req.ip || req.connection.remoteAddress;
            const userAgent = req.get('User-Agent');

            // Log to database only for important actions
            const importantActions = [
                'CREATE_PRODUCT', 'UPDATE_PRODUCT', 'DELETE_PRODUCT',
                'CREATE_CUSTOMER', 'UPDATE_CUSTOMER', 'DELETE_CUSTOMER',
                'CREATE_SALE', 'UPDATE_SALE', 'DELETE_SALE',
                'LOGIN', 'LOGOUT',
                'CREATE_USER', 'UPDATE_USER', 'DELETE_USER'
            ];

            if (importantActions.includes(action) || res.statusCode >= 400) {
                const auditData = {
                    user_id: userId,
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    old_values: null,
                    new_values: req.method === 'GET' ? null : JSON.stringify(requestBody),
                    ip_address: ipAddress,
                    user_agent: userAgent
                };

                await promisePool.execute(
                    `INSERT INTO audit_logs 
                     (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        auditData.user_id,
                        auditData.action,
                        auditData.entity_type,
                        auditData.entity_id,
                        auditData.old_values,
                        auditData.new_values,
                        auditData.ip_address,
                        auditData.user_agent
                    ]
                );
            }

            // Log to file for all requests
            logger.info('Request processed', {
                method: req.method,
                path: req.path,
                statusCode: res.statusCode,
                userId: userId,
                ipAddress: ipAddress,
                userAgent: userAgent,
                responseTime: res.get('X-Response-Time')
            });

        } catch (error) {
            logger.error('Errore audit logging:', error);
            // Don't fail the request if audit logging fails
        }
    });

    next();
};

module.exports = {
    auditLogger
};