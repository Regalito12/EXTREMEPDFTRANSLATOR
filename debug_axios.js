try {
    console.log('Requiring axios...');
    require('axios');
    console.log('Axios found.');
    console.log('Requiring ChutesProvider...');
    require('./backend/services/translation/providers/ChutesProvider');
    console.log('ChutesProvider found.');
} catch (err) {
    console.error(err);
}
