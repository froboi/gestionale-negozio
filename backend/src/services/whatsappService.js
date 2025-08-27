const axios = require('axios');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

class WhatsAppService {
  constructor() {
    this.apiUrl = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v17.0';
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  }

  static async sendMessage(phoneNumber, message) {
    const service = new WhatsAppService();
    return await service.sendTextMessage(phoneNumber, message);
  }

  async sendTextMessage(phoneNumber, message) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp API not configured. Check environment variables.');
      }

      // Format phone number (remove any non-numeric characters)
      const formattedPhone = phoneNumber.replace(/\D/g, '');
      
      // Add country code if not present (assuming Italy +39)
      const fullPhoneNumber = formattedPhone.startsWith('39') ? formattedPhone : `39${formattedPhone}`;

      const requestData = {
        messaging_product: 'whatsapp',
        to: fullPhoneNumber,
        type: 'text',
        text: {
          body: message
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp message sent successfully to ${fullPhoneNumber}`);
      return response.data;

    } catch (error) {
      logger.error('WhatsApp send message error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('WhatsApp API authentication failed');
      } else if (error.response?.status === 400) {
        throw new Error('Invalid phone number or message format');
      } else {
        throw new Error('Failed to send WhatsApp message');
      }
    }
  }

  async sendTemplateMessage(phoneNumber, templateName, templateParams = []) {
    try {
      if (!this.accessToken || !this.phoneNumberId) {
        throw new Error('WhatsApp API not configured');
      }

      const formattedPhone = phoneNumber.replace(/\D/g, '');
      const fullPhoneNumber = formattedPhone.startsWith('39') ? formattedPhone : `39${formattedPhone}`;

      const requestData = {
        messaging_product: 'whatsapp',
        to: fullPhoneNumber,
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: 'it'
          },
          components: templateParams.length > 0 ? [{
            type: 'body',
            parameters: templateParams.map(param => ({
              type: 'text',
              text: param
            }))
          }] : []
        }
      };

      const response = await axios.post(
        `${this.apiUrl}/${this.phoneNumberId}/messages`,
        requestData,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info(`WhatsApp template message sent to ${fullPhoneNumber}`);
      return response.data;

    } catch (error) {
      logger.error('WhatsApp template message error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp template message');
    }
  }

  async verifyWebhook(mode, token, challenge) {
    if (mode === 'subscribe' && token === this.verifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      return challenge;
    } else {
      logger.error('WhatsApp webhook verification failed');
      throw new Error('Webhook verification failed');
    }
  }

  async handleWebhook(data) {
    try {
      logger.info('WhatsApp webhook received:', JSON.stringify(data, null, 2));

      // Process incoming messages if needed
      if (data.object === 'whatsapp_business_account') {
        for (const entry of data.entry) {
          for (const change of entry.changes) {
            if (change.field === 'messages') {
              await this.processIncomingMessage(change.value);
            }
          }
        }
      }

    } catch (error) {
      logger.error('WhatsApp webhook processing error:', error);
    }
  }

  async processIncomingMessage(messageData) {
    try {
      if (messageData.messages) {
        for (const message of messageData.messages) {
          logger.info(`Received message from ${message.from}: ${message.text?.body || 'Non-text message'}`);
          
          // Here you could implement auto-responses or save messages to database
          // For example, if customer replies to birthday message
          if (message.text?.body.toLowerCase().includes('grazie')) {
            await this.sendAutoReply(message.from, 'Prego! Siamo felici di festeggiare con te! 🎉');
          }
        }
      }

      // Handle message status updates (delivered, read, etc.)
      if (messageData.statuses) {
        for (const status of messageData.statuses) {
          logger.info(`Message ${status.id} status: ${status.status}`);
          // Update message status in database if needed
        }
      }

    } catch (error) {
      logger.error('Process incoming message error:', error);
    }
  }

  async sendAutoReply(phoneNumber, message) {
    try {
      // Small delay to avoid appearing too automated
      setTimeout(async () => {
        await this.sendTextMessage(phoneNumber, message);
      }, 2000);
    } catch (error) {
      logger.error('Auto reply error:', error);
    }
  }

  static validatePhoneNumber(phoneNumber) {
    // Basic phone number validation for Italian numbers
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Italian mobile number
    const italianMobilePattern = /^(39)?3[0-9]{8,9}$/;
    return italianMobilePattern.test(cleanNumber);
  }

  static formatPhoneNumber(phoneNumber) {
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    if (cleanNumber.startsWith('39')) {
      return `+${cleanNumber}`;
    } else if (cleanNumber.startsWith('3')) {
      return `+39${cleanNumber}`;
    }
    
    return phoneNumber;
  }
}

module.exports = WhatsAppService;
