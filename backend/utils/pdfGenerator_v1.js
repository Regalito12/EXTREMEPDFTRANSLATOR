const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');

async function generateTranslatedPDF(translatedText, originalFilePath, outputPath) {
  try {
    console.log('[FallbackGenerator] Iniciando generación con preservación de imágenes...');

    // 1. Load original PDF bytes
    const existingPdfBytes = fs.readFileSync(originalFilePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // 2. Add translation as a summary on the last page or new pages
    // Since we don't have coordinates in this fallback, we keep all original pages (images intact)
    // and append the text appropriately.

    // Strategy: Append the full translated text to the end of the document
    // This ensures NO images are lost from original pages.

    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const fontSize = 12;
    const margin = 50;

    page.drawText('Documento Traducido (Modo Fallback Pro) - Imágenes Preservadas:', {
      x: margin,
      y: height - margin,
      size: 16,
      font: font,
      color: rgb(0.1, 0.1, 0.1),
    });

    const lines = translatedText.split('\n');
    let currentY = height - margin - 40;

    for (const line of lines) {
      if (currentY < margin) {
        page = pdfDoc.addPage();
        currentY = height - margin;
      }

      // Basic line wrapping could be added here if needed
      page.drawText(line, {
        x: margin,
        y: currentY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      currentY -= fontSize + 5;
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    console.log('[FallbackGenerator] PDF generado exitosamente manteniendo originales.');
    return outputPath;
  } catch (error) {
    console.error('Error en FallbackGenerator:', error);
    throw new Error('No se pudo generar el PDF manteniendo el diseño original.');
  }
}

module.exports = { generateTranslatedPDF };