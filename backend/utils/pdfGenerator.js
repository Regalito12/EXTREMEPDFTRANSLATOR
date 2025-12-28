const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function generateTranslatedPDF(translatedItems, originalFilePath, outputPath) {
  console.log(`[PRO] Iniciando generación de PDF Smartcat... Items a procesar: ${translatedItems ? translatedItems.length : 0}`);

  try {
    const fileExt = path.extname(originalFilePath).toLowerCase();
    const isImage = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(fileExt);

    let pdfDoc;
    let pages;

    if (isImage) {
      console.log('[PRO] Modo Imagen detectado.');
      pdfDoc = await PDFDocument.create();
      const imageBytes = fs.readFileSync(originalFilePath);
      let embeddedImage;

      if (fileExt === '.png') {
        embeddedImage = await pdfDoc.embedPng(imageBytes);
      } else {
        embeddedImage = await pdfDoc.embedJpg(imageBytes);
      }

      const { width, height } = embeddedImage.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, { x: 0, y: 0, width, height });
      pages = [page];
    } else {
      console.log(`[PRO] Cargando PDF original: ${path.basename(originalFilePath)} (Tamaño: ${(fs.statSync(originalFilePath).size / 1024 / 1024).toFixed(2)} MB)`);
      const existingPdfBytes = fs.readFileSync(originalFilePath);
      // We use ignoreEncryption to handle some restricted PDFs
      pdfDoc = await PDFDocument.load(existingPdfBytes, { ignoreEncryption: true });
      pages = pdfDoc.getPages();
      console.log(`[PRO] PDF cargado con ${pages.length} páginas.`);
    }

    const fontSans = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSerif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let processedCount = 0;
    for (const item of translatedItems) {
      if (!item || !item.text || item.text.trim() === '') continue;
      if (item.pageIndex >= pages.length || item.pageIndex < 0) {
        console.warn(`[PRO] Item con índice de página fuera de rango: ${item.pageIndex} de ${pages.length}`);
        continue;
      }

      try {
        const page = pages[item.pageIndex];
        const { width, height } = page.getSize();

        // Safe coordinates
        let x = item.x || 0;
        let y = isImage ? (height - item.y - (item.height || 10)) : item.y;

        x = Math.max(0, Math.min(x, width - 2));
        y = Math.max(0, Math.min(y, height - 2));

        const itemWidth = Math.max(1, Math.min(item.width || 50, width - x));
        const itemHeight = Math.max(1, Math.min(item.height || 12, height - y));

        // 1. Mask original text with high-precision padding to avoid "letras raras" leak
        const padding = 3.0;
        page.drawRectangle({
          x: x - padding / 2,
          y: y - padding / 2,
          width: itemWidth + padding,
          height: itemHeight + padding,
          color: rgb(1, 1, 1), // White mask
        });

        // 2. Select Font style based on metadata
        let font = item.isSerif ? fontSerif : fontSans;
        // Auto-bold for apparent titles
        if (item.text.length < 50 && item.fontSize > 16) font = fontBold;

        // 3. Auto-Scale
        let fontSize = Math.max(2, item.fontSize || 10);
        let textWidth = font.widthOfTextAtSize(item.text, fontSize);

        // Loop protection
        let attempts = 0;
        while (textWidth > itemWidth && fontSize > 4 && attempts < 20) {
          fontSize -= 0.5;
          textWidth = font.widthOfTextAtSize(item.text, fontSize);
          attempts++;
        }

        // 4. Draw
        const colorArr = item.color || [0, 0, 0];
        page.drawText(item.text, {
          x: x,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(
            Math.max(0, Math.min(1, colorArr[0] / 255)),
            Math.max(0, Math.min(1, colorArr[1] / 255)),
            Math.max(0, Math.min(1, colorArr[2] / 255))
          ),
        });
        processedCount++;
      } catch (itemError) {
        console.error(`[PRO] Error procesando item ${processedCount}:`, itemError.message);
        // Continue with next item instead of failing everything
      }
    }

    console.log(`[PRO] Procesados ${processedCount} de ${translatedItems.length} items exitosamente.`);
    console.log('[PRO] Guardando archivo final...');
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    console.log('[PRO] Documento generado en:', outputPath);
    return outputPath;
  } catch (error) {
    console.error('Error CRÍTICO en generateTranslatedPDF:', error);
    // Return the specific error to the user if possible
    throw new Error(`Error en Generación Pro: ${error.message}`);
  }
}

module.exports = {
  generateTranslatedPDF
};