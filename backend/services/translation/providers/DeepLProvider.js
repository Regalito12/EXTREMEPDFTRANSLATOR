const BaseProvider = require('./BaseProvider');
const axios = require('axios');

class DeepLProvider extends BaseProvider {
    constructor() {
        super();
        this.apiUrl = 'https://api-free.deepl.com/v2/translate'; // Default to free, configurable
    }

    async translate(text, sourceLang, targetLang, options = {}) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('Se necesita una API Key para DeepL, miop.');

        const url = apiKey.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';

        // DeepL handles larger chunks better, but let's be safe with 128KB limit approx.
        // Our BaseProvider splits by 1000 chars, which is safe.
        const chunks = this.splitTextIntoChunks(text, 2000); // DeepL holds more
        const translatedChunks = [];

        for (const chunk of chunks) {
            const params = new URLSearchParams();
            params.append('auth_key', apiKey);
            params.append('text', chunk);
            params.append('source_lang', sourceLang.toUpperCase());
            params.append('target_lang', targetLang.toUpperCase());

            try {
                const res = await axios.post(url, params);
                if (res.data && res.data.translations && res.data.translations[0]) {
                    translatedChunks.push(res.data.translations[0].text);
                }
            } catch (err) {
                console.error('DeepL Error:', err.response ? err.response.data : err.message);
                throw new Error('DeepL no quiso cooperar. Chequea esa API Key.');
            }
        }

        return translatedChunks.join(' ');
    }
}

module.exports = DeepLProvider;
