const authService = require('../services/authService');
const { securityLogger } = require('../utils/logger');

// Authentication middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            error: 'Token di accesso richiesto' 
        });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = authService.verifyToken(token);
        req.user = decoded;
        next();
    } catch (error) {
        securityLogger.warn('Token non valido utilizzato', {
            token: token.substring(0, 20) + '...',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });
        
        return res.status(401).json({ 
            error: 'Token non valido' 
        });
    }
};

// Authorization middleware - check roles
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                error: 'Autenticazione richiesta' 
            });
        }

        if (!roles.includes(req.user.role)) {
            securityLogger.warn('Tentativo accesso non autorizzato', {
                userId: req.user.id,
                requiredRoles: roles,
                userRole: req.user.role,
                endpoint: req.originalUrl,
                ipAddress: req.ip
            });
            
            return res.status(403).json({ 
                error: 'Non hai i permessi per accedere a questa risorsa' 
            });
        }

        next();
    };
};

// Check if user is admin
const requireAdmin = authorize('admin');

// Check if user is admin or tecnico
const requireAdminOrTech = authorize('admin', 'tecnico');

// Check if user is at least operatore (all roles)
const requireAuth = authorize('admin', 'tecnico', 'operatore');

module.exports = {
    authenticate,
    authorize,
    requireAdmin,
    requireAdminOrTech,
    requireAuth
};