const nodemailer = require('nodemailer');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class EmailService {
  constructor() {
    this.transporter = null;
    this.deliveryMode = process.env.OTP_DELIVERY_MODE || (
      process.env.NODE_ENV === 'production' ? 'smtp' : 'log'
    );
    this.initTransporter();
  }

  initTransporter() {
    if (!['log', 'smtp'].includes(this.deliveryMode)) {
      throw new Error('OTP_DELIVERY_MODE must be either "log" or "smtp"');
    }

    if (this.deliveryMode === 'log') {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('OTP log delivery is not allowed in production');
      }
      logger.info('OTP delivery configured for development logs');
      return;
    }

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      throw new Error('SMTP configuration is required when OTP_DELIVERY_MODE=smtp');
    }
  }

  async sendOTP(email, otp) {
    const subject = 'Codice di verifica 2FA - Gestionale Negozio';
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Verifica Accesso</h2>
        <p>Il tuo codice di verifica è:</p>
        <h1 style="color: #4a90e2; letter-spacing: 5px;">${otp}</h1>
        <p>Il codice scadrà tra 10 minuti.</p>
        <p>Se non hai richiesto questo codice, ignora questa email.</p>
      </div>
    `;

    if (this.deliveryMode === 'log') {
      logger.info('OTP generated for development login', {
        recipient: email,
        otp,
        expiresInMinutes: 10
      });
      return true;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Gestionale Negozio" <noreply@gestionale.com>',
        to: email,
        subject,
        html
      });
      logger.info('OTP sent by SMTP', { recipient: email });
      return true;
    } catch (error) {
      logger.error('OTP SMTP delivery failed', {
        code: error.code,
        responseCode: error.responseCode,
        message: error.message
      });
      throw error;
    }
  }
}

module.exports = new EmailService();
