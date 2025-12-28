const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function extractTextFromImage(imagePath) {
  try {
    const worker = await createWorker('eng+spa', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`[IA Visión] ${Math.round(m.progress * 100)}% completado...`);
        }
      }
    });

    // Recognize and get full data structure
    const { data } = await worker.recognize(imagePath);
    await worker.terminate();

    if (!data.text || data.text.trim().length === 0) {
      throw new Error('No se pudo extraer texto de la imagen. Asegúrate de que la imagen sea clara.');
    }

    // Map lines to items for better translation quality than words
    // Smartcat translates whole blocks/lines for context
    const items = data.lines.map(line => ({
      text: line.text.trim(),
      x: line.bbox.x0,
      y: line.bbox.y0,
      width: line.bbox.x1 - line.bbox.x0,
      height: line.bbox.y1 - line.bbox.y0,
      fontSize: (line.bbox.y1 - line.bbox.y0) * 0.75, // Adjusting for line height
      pageIndex: 0,
      color: [0, 0, 0] // Default black for OCR for now
    })).filter(item => item.text.length > 0);

    return {
      text: data.text.trim(),
      items: items,
      source: 'ocr'
    };
  } catch (error) {
    console.error('Error en IA de Visión (OCR):', error);
    throw new Error('No se pudo procesar la imagen con la calidad Smartcat requerida.');
  }
}

async function extractTextFromScannedPDF(pdfPath) {
  try {
    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    if (data.text && data.text.trim().length > 10) {
      return {
        text: data.text,
        pages: data.numpages,
        source: 'pdf'
      };
    } else {
      throw new Error('El PDF parece ser escaneado. Súbelo como imagen (screenshot) para una traducción de alta fidelidad.');
    }
  } catch (error) {
    console.error('Error en extracción básica de PDF:', error);
    throw error;
  }
}

module.exports = {
  extractTextFromImage,
  extractTextFromScannedPDF
};