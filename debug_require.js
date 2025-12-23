try {
    console.log('Attemping to require TranslationService...');
    const service = require('./backend/services/translation/TranslationService');
    console.log('Success!');
} catch (err) {
    console.error('CRASH!');
    console.error(err);
}
