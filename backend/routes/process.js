const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const TranslationService = require('../services/translation/TranslationService');
const { generateTranslatedPDF } = require('../utils/pdfGenerator');
const { extractTextFromImage, extractTextFromScannedPDF } = require('../utils/ocrExtractor');
const { extractTextFromPDF } = require('../utils/pdfExtractor');
const { Document, Packer, Paragraph } = require('docx');

const router = express.Router();
const processingStatus = new Map();

// Language names for better messages
const langNames = {
  'en': 'Inglés',
  'es': 'Español',
  'fr': 'Francés',
  'de': 'Alemán',
  'pt': 'Portugués',
  'it': 'Italiano',
  'auto': 'Auto-detectar'
};

// GET /api/process/:id - Get processing status (for polling)
router.get('/process/:id', (req, res) => {
  const { id } = req.params;
  const status = processingStatus.get(id);

  if (!status) {
    return res.status(404).json({
      error: 'Proceso no encontrado',
      status: 'not_found'
    });
  }

  res.json(status);
});

// POST /api/process/:id - Start processing
router.post('/process/:id', async (req, res) => {
  const { id } = req.params;
  const { format = 'pdf', provider = 'free', apiKey = '', sourceLang = 'en', targetLang = 'es' } = req.body;

  try {
    // Verify file exists first
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const fileName = files.find(file => file.startsWith(`${id}-`));

    if (!fileName) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const filePath = path.join(uploadsDir, fileName);

    // Initialize processing status
    processingStatus.set(id, {
      status: 'processing',
      progress: 5,
      message: 'Iniciando procesamiento...',
      step: 'extraction'
    });

    // Respond immediately - process will run in background
    res.json({
      success: true,
      message: 'Procesamiento iniciado',
      processId: id
    });

    // Run processing in background (non-blocking)
    setImmediate(async () => {
      console.log(`[DEBUG] Starting background processing for ${id}`);
      try {
        let extractedContent;
        let fileExt = path.extname(fileName).toLowerCase();
        console.log(`[DEBUG] File extension: ${fileExt}, File: ${fileName}`);

        // Step 1: Extract text
        updateStatus(id, 15, 'Extrayendo texto del documento...', 'extraction');
        console.log(`[DEBUG] Starting extraction...`);

        if (fileExt === '.pdf') {
          try {
            const result = await extractTextFromPDF(filePath);
            extractedContent = result.text;
          } catch (error) {
            console.log('PDF text extraction failed, trying OCR...', error.message);
            try {
              updateStatus(id, 25, 'Usando OCR para PDF escaneado...', 'extraction');
              const ocrResult = await extractTextFromScannedPDF(filePath);
              extractedContent = ocrResult.text;
            } catch (ocrError) {
              throw new Error('No se pudo extraer texto del PDF.');
            }
          }
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(fileExt)) {
          updateStatus(id, 20, 'Procesando imagen con OCR...', 'extraction');
          const ocrResult = await extractTextFromImage(filePath);
          extractedContent = ocrResult.text;
        } else if (['.txt'].includes(fileExt)) {
          // Support for plain text files
          extractedContent = await fs.readFile(filePath, 'utf-8');
        } else if (['.docx'].includes(fileExt)) {
          // DOCX support using mammoth
          try {
            const mammoth = require('mammoth');
            const result = await mammoth.extractRawText({ path: filePath });
            extractedContent = result.value;
          } catch (err) {
            throw new Error('No se pudo leer el archivo DOCX. Asegúrate de que no esté corrupto.');
          }
        } else {
          throw new Error(`Formato de archivo no soportado: ${fileExt}`);
        }

        if (!extractedContent || extractedContent.trim().length === 0) {
          throw new Error('El archivo no contiene texto extraíble.');
        }

        updateStatus(id, 35, `Texto extraído (${extractedContent.length} caracteres)`, 'extraction');

        // Step 2: Translate text
        const srcName = langNames[sourceLang] || sourceLang;
        const tgtName = langNames[targetLang] || targetLang;
        updateStatus(id, 50, `Traduciendo de ${srcName} a ${tgtName}...`, 'translation');

        const translateOptions = { provider, apiKey };
        const translatedText = await TranslationService.translate(extractedContent, sourceLang, targetLang, translateOptions);

        updateStatus(id, 80, `¡Traducido a ${tgtName}!`, 'translation');

        // Step 3: Generate output file
        updateStatus(id, 90, 'Generando archivo final...', 'generation');

        const outputDir = path.join(__dirname, '../uploads');
        await fs.ensureDir(outputDir);

        let outputFilePath;

        if (format === 'docx') {
          outputFilePath = path.join(outputDir, `traducido-${id}.docx`);
          await generateTranslatedDOCX(translatedText, outputFilePath);
        } else {
          outputFilePath = path.join(outputDir, `traducido-${id}.pdf`);
          await generateTranslatedPDF(translatedText, outputFilePath);
        }

        // Step 4: Complete
        updateStatus(id, 100, '¡Traducción completada!', 'completed', outputFilePath, extractedContent, translatedText);

        // Clean up input file
        try {
          await fs.unlink(filePath);
        } catch (err) {
          console.error('Error deleting original file:', err);
        }

      } catch (error) {
        console.error('Background processing error:', error);
        updateStatus(id, 0, `Error: ${error.message}`, 'error');
      }
    });

  } catch (error) {
    console.error('Error starting processing:', error);
    res.status(500).json({
      error: 'Error al iniciar el procesamiento',
      message: error.message
    });
  }
});

// GET /api/download/:id - Download translated file
router.get('/download/:id', (req, res) => {
  const { id } = req.params;
  const status = processingStatus.get(id);

  if (!status || status.status !== 'completed') {
    return res.status(404).json({
      error: 'Archivo no disponible para descarga'
    });
  }

  const filePath = status.outputPath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error: 'Archivo no encontrado'
    });
  }

  // Use correct extension based on actual file
  const ext = path.extname(filePath);
  const downloadName = `traducido-${id}${ext}`;

  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
    } else {
      // Clean up files after download
      setTimeout(() => {
        cleanupFiles(id);
      }, 5000);
    }
  });
});

// Remove the processPDF function since we've integrated its logic into the POST endpoint

async function generateTranslatedDOCX(content, outputPath) {
  const doc = new Document();

  // Split content into paragraphs and add to document
  const paragraphs = content.split('\n\n').filter(line => line.trim().length > 0);
  paragraphs.forEach(paragraphText => {
    doc.addSection({
      children: [
        new Paragraph(paragraphText)
      ]
    });
  });

  // Save document
  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(outputPath, buffer);
}

function updateStatus(id, progress, message, step, outputPath = null, originalText = null, translatedText = null) {
  const status = {
    status: step === 'error' ? 'error' : step === 'completed' ? 'completed' : 'processing',
    progress,
    message,
    step,
    timestamp: new Date().toISOString()
  };

  if (outputPath) {
    status.outputPath = outputPath;
  }

  if (originalText) {
    status.originalText = originalText.substring(0, 1000) + (originalText.length > 1000 ? '...' : '');
  }

  if (translatedText) {
    status.translatedText = translatedText.substring(0, 1000) + (translatedText.length > 1000 ? '...' : '');
  }

  processingStatus.set(id, status);
}

function cleanupFiles(id) {
  const uploadsDir = path.join(__dirname, '../uploads');

  // Remove all files related to this process
  const files = fs.readdirSync(uploadsDir);
  files.forEach(file => {
    if (file.includes(id)) {
      try {
        fs.unlinkSync(path.join(uploadsDir, file));
      } catch (err) {
        console.error('Error cleaning up file:', err);
      }
    }
  });

  // Remove from memory
  processingStatus.delete(id);
}

module.exports = router;