const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateTranslatedPDF(translatedText, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const writeStream = fs.createWriteStream(outputPath);
      doc.pipe(writeStream);

      // Add title
      doc.fontSize(18).text('Documento Traducido', { align: 'center' });
      doc.moveDown(2);

      // Add translated text section
      doc.fontSize(12).text(translatedText, {
        align: 'left',
        lineGap: 5
      });

      // Add footer
      doc.moveDown(2);
      doc.fontSize(10).text('Generado por PDF Translator', { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve(outputPath);
      });

      writeStream.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateTranslatedPDF
};