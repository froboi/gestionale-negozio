const JsBarcode = require('jsbarcode');
const { createCanvas } = require('canvas');

class BarcodeService {
  static async generateBarcode(code) {
    try {
      // Create a unique barcode based on product code and timestamp
      const timestamp = Date.now().toString().slice(-6);
      const barcode = `${code}${timestamp}`;
      
      return barcode;
    } catch (error) {
      console.error('Barcode generation error:', error);
      throw new Error('Errore nella generazione del barcode');
    }
  }

  static async generateBarcodeImage(barcode, options = {}) {
    try {
      const canvas = createCanvas(200, 100);
      
      JsBarcode(canvas, barcode, {
        format: 'CODE128',
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: 12,
        textMargin: 5,
        background: '#ffffff',
        lineColor: '#000000',
        ...options
      });

      return canvas.toBuffer('image/png');
    } catch (error) {
      console.error('Barcode image generation error:', error);
      throw new Error('Errore nella generazione dell\'immagine barcode');
    }
  }

  static validateBarcode(barcode) {
    // Basic validation for barcode format
    if (!barcode || typeof barcode !== 'string') {
      return false;
    }

    // Check if barcode contains only valid characters (alphanumeric)
    const validPattern = /^[A-Za-z0-9]+$/;
    return validPattern.test(barcode) && barcode.length >= 8 && barcode.length <= 20;
  }

  static async generateQRCode(data) {
    const QRCode = require('qrcode');
    try {
      return await QRCode.toBuffer(data, {
        type: 'png',
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (error) {
      console.error('QR Code generation error:', error);
      throw new Error('Errore nella generazione del QR Code');
    }
  }
}

module.exports = BarcodeService;
