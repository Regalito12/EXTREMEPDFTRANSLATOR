const fs = require('fs');
const pdfParse = require('pdf-parse');

async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);

    // Clean and normalize the extracted text
    let cleanText = data.text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\n{3,}/g, '\n\n')  // Remove excessive line breaks
      .replace(/[^\x20-\x7E\n]/g, ' ')  // Remove non-printable characters except newlines
      .trim();

    // Check if PDF is likely scanned by analyzing content
    const isLikelyScanned = (
      cleanText.length < 100 || // Very short text
      (data.numpages > 1 && cleanText.split('\n').length / data.numpages < 2) // Few lines per page
    );

    if (isLikelyScanned) {
      console.warn('PDF appears to be scanned based on content analysis');
      throw new Error('El PDF parece ser escaneado. Para PDFs escaneados, sube las imágenes individuales (PNG/JPG) para usar OCR.');
    }

    return {
      text: cleanText,
      pages: data.numpages,
      info: data.info,
      source: 'pdf'
    };
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('No se pudo extraer el texto del PDF. El archivo podría estar corrupto o ser una imagen escaneada.');
  }
}

module.exports = {
  extractTextFromPDF
};