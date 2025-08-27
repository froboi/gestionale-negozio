const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { promisePool } = require('../database/connection');
const { logger, securityLogger } = require('../utils/logger');

class AuthService {
    // Generate JWT tokens
    generateTokens(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            surname: user.surname
        };

        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRY || '15m'
        });

        const refreshToken = jwt.sign(
            { id: user.id }, 
            process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
        });

        return { accessToken, refreshToken };
    }

    // Verify JWT token
    verifyToken(token, secret = process.env.JWT_SECRET) {
        try {
            return jwt.verify(token, secret);
        } catch (error) {
            throw new Error('Token non valido');
        }
    }

    // Hash password
    async hashPassword(password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Generate 2FA secret
    generate2FASecret(userEmail) {
        return speakeasy.generateSecret({
            name: `Gestionale Abbigliamento (${userEmail})`,
            issuer: 'Gestionale Abbigliamento',
            length: 32
        });
    }

    // Generate QR code for 2FA setup
    async generateQRCode(secret) {
        try {
            return await QRCode.toDataURL(secret.otpauth_url);
        } catch (error) {
            logger.error('Errore generazione QR Code:', error);
            throw new Error('Errore generazione QR Code');
        }
    }

    // Verify 2FA token
    verify2FAToken(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 2 // Allow 2 time steps tolerance
        });
    }

    // Login user
    async login(email, password, twoFAToken = null, ipAddress = null, userAgent = null) {
        try {
            // Get user from database
            const [users] = await promisePool.execute(
                'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
                [email]
            );

            if (users.length === 0) {
                securityLogger.warn('Tentativo login utente inesistente', {
                    email,
                    ipAddress,
                    userAgent
                });
                throw new Error('Credenziali non valide');
            }

            const user = users[0];

            // Verify password
            const passwordValid = await this.verifyPassword(password, user.password_hash);
            if (!passwordValid) {
                securityLogger.warn('Tentativo login password errata', {
                    userId: user.id,
                    email,
                    ipAddress,
                    userAgent
                });
                throw new Error('Credenziali non valide');
            }

            // Check 2FA if enabled
            if (user.two_fa_enabled) {
                if (!twoFAToken) {
                    return { 
                        requiresTwoFA: true,
                        userId: user.id 
                    };
                }

                const tokenValid = this.verify2FAToken(user.two_fa_secret, twoFAToken);
                if (!tokenValid) {
                    securityLogger.warn('Tentativo login 2FA errato', {
                        userId: user.id,
                        email,
                        ipAddress,
                        userAgent
                    });
                    throw new Error('Codice 2FA non valido');
                }
            }

            // Update last login
            await promisePool.execute(
                'UPDATE users SET last_login = NOW() WHERE id = ?',
                [user.id]
            );

            // Generate tokens
            const tokens = this.generateTokens(user);

            securityLogger.info('Login riuscito', {
                userId: user.id,
                email,
                role: user.role,
                ipAddress,
                userAgent
            });

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    surname: user.surname,
                    role: user.role,
                    two_fa_enabled: user.two_fa_enabled
                },
                ...tokens
            };

        } catch (error) {
            logger.error('Errore durante login:', error);
            throw error;
        }
    }

    // Setup 2FA for user
    async setup2FA(userId) {
        try {
            // Get user
            const [users] = await promisePool.execute(
                'SELECT email FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('Utente non trovato');
            }

            const user = users[0];
            const secret = this.generate2FASecret(user.email);
            const qrCode = await this.generateQRCode(secret);

            // Save secret (temporarily, will be confirmed later)
            await promisePool.execute(
                'UPDATE users SET two_fa_secret = ? WHERE id = ?',
                [secret.base32, userId]
            );

            return {
                secret: secret.base32,
                qrCode
            };

        } catch (error) {
            logger.error('Errore setup 2FA:', error);
            throw error;
        }
    }

    // Confirm 2FA setup
    async confirm2FA(userId, token) {
        try {
            // Get user secret
            const [users] = await promisePool.execute(
                'SELECT two_fa_secret FROM users WHERE id = ?',
                [userId]
            );

            if (users.length === 0 || !users[0].two_fa_secret) {
                throw new Error('Setup 2FA non inizializzato');
            }

            const secret = users[0].two_fa_secret;
            const tokenValid = this.verify2FAToken(secret, token);

            if (!tokenValid) {
                throw new Error('Codice 2FA non valido');
            }

            // Enable 2FA
            await promisePool.execute(
                'UPDATE users SET two_fa_enabled = TRUE WHERE id = ?',
                [userId]
            );

            securityLogger.info('2FA abilitato', { userId });

            return { success: true };

        } catch (error) {
            logger.error('Errore conferma 2FA:', error);
            throw error;
        }
    }

    // Disable 2FA
    async disable2FA(userId, token) {
        try {
            // Get user secret
            const [users] = await promisePool.execute(
                'SELECT two_fa_secret FROM users WHERE id = ? AND two_fa_enabled = TRUE',
                [userId]
            );

            if (users.length === 0) {
                throw new Error('2FA non abilitato per questo utente');
            }

            const secret = users[0].two_fa_secret;
            const tokenValid = this.verify2FAToken(secret, token);

            if (!tokenValid) {
                throw new Error('Codice 2FA non valido');
            }

            // Disable 2FA
            await promisePool.execute(
                'UPDATE users SET two_fa_enabled = FALSE, two_fa_secret = NULL WHERE id = ?',
                [userId]
            );

            securityLogger.info('2FA disabilitato', { userId });

            return { success: true };

        } catch (error) {
            logger.error('Errore disabilitazione 2FA:', error);
            throw error;
        }
    }

    // Refresh access token
    async refreshToken(refreshToken) {
        try {
            const decoded = this.verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
            
            // Get user
            const [users] = await promisePool.execute(
                'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
                [decoded.id]
            );

            if (users.length === 0) {
                throw new Error('Utente non trovato');
            }

            const user = users[0];
            const tokens = this.generateTokens(user);

            return tokens;

        } catch (error) {
            logger.error('Errore refresh token:', error);
            throw new Error('Token di refresh non valido');
        }
    }
}

module.exports = new AuthService();