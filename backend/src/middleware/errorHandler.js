const { logger } = require('../utils/logger');

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    // Log error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user ? req.user.id : null
    });

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = 'Risorsa non trovata';
        error = { message, statusCode: 404 };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        const message = 'Risorsa duplicata';
        error = { message, statusCode: 400 };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message).join(', ');
        error = { message, statusCode: 400 };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        const message = 'Token non valido';
        error = { message, statusCode: 401 };
    }

    if (err.name === 'TokenExpiredError') {
        const message = 'Token scaduto';
        error = { message, statusCode: 401 };
    }

    // MySQL errors
    if (err.code === 'ER_DUP_ENTRY') {
        const message = 'Voce duplicata: questo valore esiste già';
        error = { message, statusCode: 400 };
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        const message = 'Riferimento non valido';
        error = { message, statusCode: 400 };
    }

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        const message = 'Impossibile eliminare: la risorsa è riferita da altri elementi';
        error = { message, statusCode: 400 };
    }

    // Rate limiting errors
    if (err.statusCode === 429) {
        const message = 'Troppe richieste, riprova più tardi';
        error = { message, statusCode: 429 };
    }

    // Default error
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Errore interno del server';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

// 404 handler
const notFound = (req, res, next) => {
    const error = new Error(`Risorsa non trovata - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    errorHandler,
    notFound,
    asyncHandler
};