try {
    const ChutesProvider = require('./backend/services/translation/providers/ChutesProvider');
    console.log('Chutes loaded');
    new ChutesProvider();
    console.log('Chutes instantiated');
} catch (e) {
    console.error('Chutes FAIL:', e);
}
