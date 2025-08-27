const jsPDF = require('jspdf');
const BarcodeService = require('./barcodeService');

class PDFService {
  static async generateBarcodeLabel(product) {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [60, 40] // Label size: 60mm x 40mm
      });

      // Set font
      doc.setFont('helvetica', 'normal');
      
      // Product code
      doc.setFontSize(10);
      doc.text(`CODICE: ${product.code}`, 5, 8);
      
      // Product size
      if (product.size) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`TAGLIA: ${product.size}`, 5, 16);
      }

      // Generate barcode image
      const barcodeBuffer = await BarcodeService.generateBarcodeImage(product.barcode, {
        width: 1,
        height: 15,
        fontSize: 8
      });

      // Convert buffer to base64
      const barcodeBase64 = barcodeBuffer.toString('base64');
      
      // Add barcode to PDF
      doc.addImage(barcodeBase64, 'PNG', 5, 20, 50, 15);

      return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
      console.error('PDF label generation error:', error);
      throw new Error('Errore nella generazione dell\'etichetta PDF');
    }
  }

  static async generateBulkBarcodeLabels(products) {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const labelWidth = 60;
      const labelHeight = 40;
      const labelsPerRow = 3;
      const labelsPerColumn = 7;
      const marginX = 10;
      const marginY = 10;

      let currentPage = 1;
      let labelCount = 0;

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        // Calculate position
        const row = Math.floor(labelCount / labelsPerRow);
        const col = labelCount % labelsPerRow;
        
        // Check if we need a new page
        if (row >= labelsPerColumn) {
          doc.addPage();
          labelCount = 0;
          currentPage++;
        }

        const x = marginX + (col * labelWidth);
        const y = marginY + (Math.floor(labelCount / labelsPerRow) * labelHeight);

        // Draw label border
        doc.setDrawColor(200, 200, 200);
        doc.rect(x, y, labelWidth, labelHeight);

        // Product code
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.text(`CODICE: ${product.code}`, x + 2, y + 6);
        
        // Product size
        if (product.size) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(`TAGLIA: ${product.size}`, x + 2, y + 12);
        }

        // Generate and add barcode
        try {
          const barcodeBuffer = await BarcodeService.generateBarcodeImage(product.barcode, {
            width: 1,
            height: 12,
            fontSize: 6
          });
          
          const barcodeBase64 = barcodeBuffer.toString('base64');
          doc.addImage(barcodeBase64, 'PNG', x + 2, y + 16, 50, 12);
        } catch (barcodeError) {
          console.error(`Barcode error for product ${product.code}:`, barcodeError);
          // Continue with next product if barcode generation fails
        }

        labelCount++;
      }

      return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
      console.error('Bulk PDF generation error:', error);
      throw new Error('Errore nella generazione delle etichette bulk');
    }
  }

  static async generateSalesReport(salesData, dateRange) {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Report Vendite', 20, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Periodo: ${dateRange.from} - ${dateRange.to}`, 20, 30);

      // Summary
      let yPosition = 50;
      doc.setFont('helvetica', 'bold');
      doc.text('Riepilogo:', 20, yPosition);
      
      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      doc.text(`Totale Vendite: €${salesData.totalAmount.toFixed(2)}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Numero Transazioni: ${salesData.totalTransactions}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Valore Medio: €${salesData.averageValue.toFixed(2)}`, 20, yPosition);

      // Sales table
      yPosition += 20;
      doc.setFont('helvetica', 'bold');
      doc.text('Dettaglio Vendite:', 20, yPosition);

      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);

      // Table headers
      doc.text('Data', 20, yPosition);
      doc.text('Cliente', 50, yPosition);
      doc.text('Totale', 120, yPosition);
      doc.text('Pagamento', 150, yPosition);

      yPosition += 5;
      doc.line(20, yPosition, 190, yPosition); // Header line

      // Table data
      salesData.sales.forEach(sale => {
        yPosition += 8;
        
        // Check for page break
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(sale.date, 20, yPosition);
        doc.text(sale.customer || 'N/A', 50, yPosition);
        doc.text(`€${sale.total.toFixed(2)}`, 120, yPosition);
        doc.text(sale.paymentMethod, 150, yPosition);
      });

      return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
      console.error('Sales report generation error:', error);
      throw new Error('Errore nella generazione del report vendite');
    }
  }

  static async generateInventoryReport(inventoryData) {
    try {
      const doc = new jsPDF();

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('Report Inventario', 20, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 20, 30);

      // Summary
      let yPosition = 50;
      doc.setFont('helvetica', 'bold');
      doc.text('Riepilogo:', 20, yPosition);
      
      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      doc.text(`Totale Prodotti: ${inventoryData.totalProducts}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Valore Inventario: €${inventoryData.totalValue.toFixed(2)}`, 20, yPosition);
      
      yPosition += 8;
      doc.text(`Prodotti Sottoscorta: ${inventoryData.lowStockCount}`, 20, yPosition);

      // Products table
      yPosition += 20;
      doc.setFont('helvetica', 'bold');
      doc.text('Dettaglio Prodotti:', 20, yPosition);

      yPosition += 10;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      // Table headers
      doc.text('Codice', 20, yPosition);
      doc.text('Nome', 45, yPosition);
      doc.text('Taglia', 90, yPosition);
      doc.text('Qta', 110, yPosition);
      doc.text('Prezzo', 130, yPosition);
      doc.text('Valore', 155, yPosition);

      yPosition += 5;
      doc.line(20, yPosition, 190, yPosition);

      // Table data
      inventoryData.products.forEach(product => {
        yPosition += 6;
        
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(product.code, 20, yPosition);
        doc.text(product.name.substring(0, 25), 45, yPosition);
        doc.text(product.size || 'N/A', 90, yPosition);
        doc.text(product.quantity.toString(), 110, yPosition);
        doc.text(`€${product.price.toFixed(2)}`, 130, yPosition);
        doc.text(`€${(product.quantity * product.price).toFixed(2)}`, 155, yPosition);
      });

      return Buffer.from(doc.output('arraybuffer'));

    } catch (error) {
      console.error('Inventory report generation error:', error);
      throw new Error('Errore nella generazione del report inventario');
    }
  }
}

module.exports = PDFService;
