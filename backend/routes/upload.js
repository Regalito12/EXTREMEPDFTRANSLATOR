const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs-extra');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    cb(null, `${uniqueId}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/bmp',
      'image/webp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'text/plain' // TXT
    ];

    // Also check by extension for edge cases
    const allowedExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Formato no soportado: ${file.mimetype}. Usa PDF, DOCX, TXT o imágenes.`), false);
    }
  }
});

// POST /api/upload
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No se encontró ningún archivo'
      });
    }

    const fileId = path.parse(req.file.filename).name.split('-')[0];
    const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'pdf';

    res.json({
      success: true,
      fileId: fileId,
      message: `Archivo ${fileType === 'image' ? 'de imagen' : 'PDF'} subido exitosamente`,
      filename: req.file.originalname,
      size: req.file.size,
      type: fileType
    });
  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({
      error: 'Error al procesar el archivo',
      message: error.message
    });
  }
});

module.exports = router;