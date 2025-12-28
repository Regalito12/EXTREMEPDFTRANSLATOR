const BaseProvider = require('./BaseProvider');
const axios = require('axios');
const { translate } = require('google-translate-api-x');

class FreeProvider extends BaseProvider {
    constructor() {
        super();
    }

    async translate(text, sourceLang, targetLang) {
        // We can push to ~4500 chars for fewer calls, but keep it safe for stability
        const chunks = this.splitTextIntoChunks(text, 4500);
        console.log(`[Free] Traduciendo ${chunks.length} chunks con Google Translate X...`);

        const translatedChunks = [];

        for (const chunk of chunks) {
            try {
                const res = await translate(chunk, {
                    from: sourceLang,
                    to: targetLang,
                    client: 'gtx'
                });

                translatedChunks.push(res.text);

                // Reduce delay slightly for speed, but keep it high enough to avoid 429s
                if (chunks.length > 1) await new Promise(r => setTimeout(r, 300));
            } catch (err) {
                console.error('Google Translate Error:', err);
                translatedChunks.push(chunk);
            }
        }

        console.log(`[Free] ¡Traducción completada!`);
        return translatedChunks.join(' ');
    }
}

module.exports = FreeProvider;
