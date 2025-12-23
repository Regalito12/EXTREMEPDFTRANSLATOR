try {
    const TranslationService = require('./backend/services/translation/TranslationService');
    console.log('Service loaded');
} catch (e) {
    console.error('Service FAIL:', e);
}
