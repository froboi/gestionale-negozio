const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/authService');
const { authenticate, requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger, securityLogger } = require('../utils/logger');

const router = express.Router();

// Validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email non valida'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password deve essere di almeno 6 caratteri')
];

const changePasswordValidation = [
    body('current_password')
        .notEmpty()
        .withMessage('Password attuale richiesta'),
    body('new_password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('La nuova password deve contenere almeno 8 caratteri, una maiuscola, una minuscola, un numero e un carattere speciale')
];

// Login
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Dati non validi',
            details: errors.array()
        });
    }

    const { email, password, twoFAToken } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    const result = await authService.login(email, password, twoFAToken, ipAddress, userAgent);

    if (result.requiresTwoFA) {
        return res.status(200).json({
            success: true,
            requiresTwoFA: true,
            message: 'Inserisci il codice 2FA'
        });
    }

    res.status(200).json({
        success: true,
        data: result
    });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: 'Refresh token richiesto'
        });
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.status(200).json({
        success: true,
        data: tokens
    });
}));

// Logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
    securityLogger.info('Logout effettuato', {
        userId: req.user.id,
        email: req.user.email,
        ipAddress: req.ip
    });

    res.status(200).json({
        success: true,
        message: 'Logout effettuato con successo'
    });
}));

// Get current user profile
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    res.status(200).json({
        success: true,
        data: {
            id: req.user.id,
            email: req.user.email,
            name: req.user.name,
            surname: req.user.surname,
            role: req.user.role
        }
    });
}));

// Setup 2FA
router.post('/2fa/setup', authenticate, asyncHandler(async (req, res) => {
    const result = await authService.setup2FA(req.user.id);

    res.status(200).json({
        success: true,
        data: result
    });
}));

// Confirm 2FA setup
router.post('/2fa/confirm', authenticate, asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: 'Token 2FA richiesto'
        });
    }

    await authService.confirm2FA(req.user.id, token);

    res.status(200).json({
        success: true,
        message: '2FA abilitato con successo'
    });
}));

// Disable 2FA
router.post('/2fa/disable', authenticate, asyncHandler(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            success: false,
            error: 'Token 2FA richiesto per disabilitare'
        });
    }

    await authService.disable2FA(req.user.id, token);

    res.status(200).json({
        success: true,
        message: '2FA disabilitato con successo'
    });
}));

// Change password
router.post('/change-password', authenticate, changePasswordValidation, asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Dati non validi',
            details: errors.array()
        });
    }

    const { current_password, new_password } = req.body;
    const userId = req.user.id;

    // Get current user data
    const { promisePool } = require('../database/connection');
    const [users] = await promisePool.execute(
        'SELECT password_hash FROM users WHERE id = ?',
        [userId]
    );

    if (users.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Utente non trovato'
        });
    }

    // Verify current password
    const passwordValid = await authService.verifyPassword(current_password, users[0].password_hash);
    if (!passwordValid) {
        return res.status(400).json({
            success: false,
            error: 'Password attuale non corretta'
        });
    }

    // Hash new password
    const newPasswordHash = await authService.hashPassword(new_password);

    // Update password
    await promisePool.execute(
        'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
        [newPasswordHash, userId]
    );

    securityLogger.info('Password cambiata', {
        userId: userId,
        ipAddress: req.ip
    });

    res.status(200).json({
        success: true,
        message: 'Password cambiata con successo'
    });
}));

module.exports = router;