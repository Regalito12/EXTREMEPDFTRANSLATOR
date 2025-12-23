const modules = [
    'express',
    'cors',
    'multer',
    'pdf-parse',
    'pdfkit',
    'axios',
    'fs-extra',
    'google-translate-api',
    'docx',
    './backend/services/translation/providers/BaseProvider',
    './backend/services/translation/providers/FreeProvider',
    './backend/services/translation/providers/DeepLProvider',
    './backend/services/translation/providers/OpenAIProvider',
    './backend/services/translation/providers/ChutesProvider',
    './backend/services/translation/TranslationService',
    './backend/routes/process'
];

modules.forEach(mod => {
    try {
        require(mod);
        console.log(`PASS: ${mod}`);
    } catch (e) {
        console.error(`FAIL: ${mod} - ${e.message}`);
    }
});
