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
    this.initTransporter();
  }

  initTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      logger.warn('SMTP configuration missing. Emails will be logged to console only.');
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

    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: process.env.SMTP_FROM || '"Gestionale Negozio" <noreply@gestionale.com>',
          to: email,
          subject,
          html
        });
        logger.info(`OTP sent to ${email}`);
        return true;
      } catch (error) {
        logger.error('Error sending email:', error);
        return false;
      }
    } else {
      // Dev mode: log OTP
      console.log('=================================================');
      console.log(`📧 MOCK EMAIL TO: ${email}`);
      console.log(`🔑 OTP CODE: ${otp}`);
      console.log('=================================================');
      return true;
    }
  }
}

module.exports = new EmailService();
