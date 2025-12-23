const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

async function extractTextFromImage(imagePath) {
  try {
    const worker = await createWorker('eng+spa', 1, {
      logger: m => console.log(m)
    });

    const { data: { text } } = await worker.recognize(imagePath);
    await worker.terminate();

    if (!text || text.trim().length === 0) {
      throw new Error('No se pudo extraer texto de la imagen. Asegúrate de que la imagen tenga texto legible.');
    }

    return {
      text: text.trim(),
      source: 'ocr'
    };
  } catch (error) {
    console.error('Error extracting text from image with OCR:', error);
    throw new Error('No se pudo extraer texto de la imagen. Asegúrate de que la imagen tenga texto legible.');
  }
}

async function extractTextFromScannedPDF(pdfPath) {
  try {
    // For scanned PDFs, we need to convert pages to images first
    // This is a simplified version - in production you'd use pdf2pic or similar
    // For now, we'll try pdf-parse first, and if it fails with no text, suggest OCR

    const pdfParse = require('pdf-parse');
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);

    if (data.text && data.text.trim().length > 10) {
      // PDF has extractable text
      return {
        text: data.text,
        pages: data.numpages,
        source: 'pdf'
      };
    } else {
      // PDF appears to be scanned, suggest OCR
      throw new Error('El PDF parece ser escaneado. Para PDFs escaneados, sube las imágenes individuales (PNG/JPG) para usar OCR.');
    }
  } catch (error) {
    if (error.message.includes('escaneado')) {
      throw error;
    }
    console.error('Error extracting text from scanned PDF:', error);
    throw new Error('Error al procesar el PDF escaneado.');
  }
}

module.exports = {
  extractTextFromImage,
  extractTextFromScannedPDF
};