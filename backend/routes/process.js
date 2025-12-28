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
    const uploadsDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadsDir);
    const fileName = files.find(file => file.startsWith(`${id}-`));

    if (!fileName) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }

    const filePath = path.join(uploadsDir, fileName);

    processingStatus.set(id, {
      status: 'processing',
      progress: 5,
      message: 'Iniciando procesamiento...',
      step: 'extraction'
    });

    res.json({
      success: true,
      message: 'Procesamiento iniciado',
      processId: id
    });

    setImmediate(async () => {
      console.log(`[DEBUG] Starting background processing for ${id}`);
      try {
        let extractedData;
        let fileExt = path.extname(fileName).toLowerCase();

        // Step 1: Extract text
        updateStatus(id, 15, 'Extrayendo texto del documento...', 'extraction');

        if (fileExt === '.pdf') {
          try {
            extractedData = await extractTextFromPDF(filePath);
          } catch (error) {
            console.log('PDF text extraction failed, trying OCR...', error.message);
            updateStatus(id, 25, 'Usando OCR para PDF escaneado...', 'extraction');
            const ocrResult = await extractTextFromScannedPDF(filePath);
            extractedData = {
              text: ocrResult.text,
              items: ocrResult.items || [], // Propagate coordinates if OCR can find them
              source: 'ocr'
            };
          }
        } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'].includes(fileExt)) {
          updateStatus(id, 20, 'Procesando imagen con IA de visión...', 'extraction');
          const ocrResult = await extractTextFromImage(filePath);
          extractedData = {
            text: ocrResult.text,
            items: ocrResult.items, // Now containing coordinates!
            source: 'ocr'
          };
        } else if (['.txt'].includes(fileExt)) {
          const text = await fs.readFile(filePath, 'utf-8');
          extractedData = { text: text, source: 'text' };
        } else if (['.docx'].includes(fileExt)) {
          const mammoth = require('mammoth');
          const result = await mammoth.extractRawText({ path: filePath });
          extractedData = { text: result.value, source: 'docx' };
        } else {
          throw new Error(`Formato de archivo no soportado: ${fileExt}`);
        }

        if (!extractedData.text || extractedData.text.trim().length === 0) {
          throw new Error('El archivo no contiene texto extraíble.');
        }

        updateStatus(id, 35, `Texto extraído (${extractedData.text.length} caracteres)`, 'extraction');

        // Step 2: Translate text
        const srcName = langNames[sourceLang] || sourceLang;
        const tgtName = langNames[targetLang] || targetLang;
        updateStatus(id, 50, `Traduciendo de ${srcName} a ${tgtName}...`, 'translation');

        const translateOptions = { provider, apiKey };
        let translatedItems = [];
        let translatedFullText = "";

        if (extractedData.items && format === 'pdf') {
          // Process individual items for layout preservation
          // We'll translate groups of items to maintain context and speed
          // Use a very unique separator that AI models are less likely to "fix" or translate
          const SEPARATOR = `###_ITEM_SEP_${Math.floor(Math.random() * 100000)}_###`;
          const CHUNK_SIZE = provider === 'free' ? 50 : 10;

          for (let i = 0; i < extractedData.items.length; i += CHUNK_SIZE) {
            const chunk = extractedData.items.slice(i, i + CHUNK_SIZE);
            const combinedText = chunk.map(item => item.text).join(`\n${SEPARATOR}\n`);

            console.log(`[DEBUG] Enviando chunk ${i} a traducción (${chunk.length} items)...`);
            const translatedChunkText = await TranslationService.translate(combinedText, sourceLang, targetLang, translateOptions);

            // Split carefully, handling potential whitespace issues from AI
            const translatedParts = translatedChunkText.split(SEPARATOR).map(p => p.trim());

            chunk.forEach((item, idx) => {
              // Only replace if we got a valid part, otherwise keep original
              let translated = translatedParts[idx];

              // Smartcat Quality Clean
              translated = cleanSpanishText(translated);

              translatedItems.push({
                ...item,
                text: (translated && translated.length > 0) ? translated : item.text
              });
            });

            const progress = 50 + Math.floor((i / extractedData.items.length) * 30);
            updateStatus(id, progress, `Traduciendo... (${Math.floor((i / extractedData.items.length) * 100)}%)`, 'translation');
          }
        } else {
          translatedFullText = await TranslationService.translate(extractedData.text, sourceLang, targetLang, translateOptions);
          translatedFullText = cleanSpanishText(translatedFullText);
        }

        updateStatus(id, 80, `¡Traducido a ${tgtName}!`, 'translation');

        // Step 3: Generate output file
        updateStatus(id, 90, 'Generando archivo final...', 'generation');

        const outputDir = path.join(__dirname, '../uploads');
        await fs.ensureDir(outputDir);

        let outputFilePath;

        if (format === 'docx') {
          outputFilePath = path.join(outputDir, `traducido-${id}.docx`);
          await generateTranslatedDOCX(translatedFullText || translatedItems.map(i => i.text).join(' '), outputFilePath);
        } else {
          outputFilePath = path.join(outputDir, `traducido-${id}.pdf`);
          if (translatedItems.length > 0) {
            try {
              await generateTranslatedPDF(translatedItems, filePath, outputFilePath);
            } catch (genError) {
              console.error('[CRITICAL] Smartcat Generation failed, using secure fallback...', genError.message);
              const { generateTranslatedPDF: legacyGenerate } = require('../utils/pdfGenerator_v1');
              const combinedText = translatedFullText || translatedItems.map(i => i.text).join('\n');
              await legacyGenerate(combinedText, filePath, outputFilePath);
              updateStatus(id, 100, '¡Traducción completada! (Modo Seguro Activo)', 'completed', outputFilePath);
              return;
            }
          } else {
            // Fallback for OCR or plain text conversion to PDF
            const { generateTranslatedPDF: legacyGenerate } = require('../utils/pdfGenerator_v1');
            await legacyGenerate(translatedFullText, filePath, outputFilePath);
          }
        }

        updateStatus(id, 100, '¡Traducción completada!', 'completed', outputFilePath, extractedData.text, translatedFullText || "Layout-preserved PDF");

        try {
          // await fs.unlink(filePath); // Keep for now to debug
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

  const ext = path.extname(filePath);
  const downloadName = `traducido-${id}${ext}`;

  res.download(filePath, downloadName, (err) => {
    if (err) {
      console.error('Error downloading file:', err);
    } else {
      // Aggressive cleanup disabled as per plan
      // We will let the background cleanup handles it after 1 hour
    }
  });
});

async function generateTranslatedDOCX(content, outputPath) {
  const doc = new Document();
  const paragraphs = content.split('\n\n').filter(line => line.trim().length > 0);
  paragraphs.forEach(paragraphText => {
    doc.addSection({
      children: [
        new Paragraph(paragraphText)
      ]
    });
  });
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

  if (outputPath) status.outputPath = outputPath;
  if (originalText) status.originalText = originalText.substring(0, 1000);
  if (translatedText) status.translatedText = translatedText.substring(0, 1000);

  processingStatus.set(id, status);

  // Set a cleanup timeout for finished/failed processes (1 hour)
  if (status.status === 'completed' || status.status === 'error') {
    setTimeout(() => {
      cleanupFiles(id);
    }, 60 * 60 * 1000);
  }
}

function cleanupFiles(id) {
  const uploadsDir = path.join(__dirname, '../uploads');
  try {
    const files = fs.readdirSync(uploadsDir);
    files.forEach(file => {
      if (file.includes(id)) {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
        } catch (err) { }
      }
    });
    processingStatus.delete(id);
  } catch (err) {
    console.error('Error in cleanup:', err);
  }
}

// Final check and cleaning of translated text to ensure "Smartcat" elegance
// This aggressively removes non-standard diacritics (dots below, etc) 
// while preserving legitimate Spanish characters.
function cleanSpanishText(text) {
  if (!text) return text;

  // 1. Normalize to NFD to separate diacritics
  let normalized = text.normalize('NFD');

  // 2. Strict Whitelist: Only allow base characters + Spanish-approved diacritics
  // Standard Spanish: á, é, í, ó, ú, ü (diaeresis), ñ (tilde)
  const allowedMarks = ['\u0301', '\u0308', '\u0303']; // acute, diaeresis, tilde

  let cleaned = "";
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    // If it's a combining mark
    if (charCode >= 0x0300 && charCode <= 0x036F) {
      if (allowedMarks.includes(normalized[i])) {
        cleaned += normalized[i];
      }
      // Else skip it (the weird dot under/over)
    } else {
      cleaned += normalized[i];
    }
  }

  return cleaned.normalize('NFC')
    // 3. Final safety: remove anything that isn't a standard character for Spanish/English
    .replace(/[^\x20-\x7E\xA0-\xFF\u2010-\u201D\u00BF\u00A1]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = router;