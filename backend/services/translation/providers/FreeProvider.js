const BaseProvider = require('./BaseProvider');
const axios = require('axios');
const { translate } = require('google-translate-api-x');

class FreeProvider extends BaseProvider {
    constructor() {
        super();
    }

    async translate(text, sourceLang, targetLang) {
        // Google Translate API hack handles up to ~5000 chars decently
        // but 2000 is safer for stability and speed
        const chunks = this.splitTextIntoChunks(text, 2000);
        console.log(`[Free] Traduciendo ${chunks.length} chunks con Google Translate X...`);

        const translatedChunks = [];

        // Process chunks sequentially to avoid rate limits on free API
        for (const chunk of chunks) {
            try {
                // FORCE 'gtx' client which is more reliable for free usage
                const res = await translate(chunk, {
                    from: sourceLang,
                    to: targetLang,
                    client: 'gtx'
                });

                // Validate if translation actually happened
                if (res.text === chunk && sourceLang !== targetLang) {
                    console.warn('[Free] Alerta: El texto traducido es idéntico al original.');
                }

                translatedChunks.push(res.text);

                // Tiny delay to avoid 429 errors
                await new Promise(r => setTimeout(r, 500));
            } catch (err) {
                console.error('Google Translate Error Detallado:', err);
                // Fallback: return original text with warning if fails, to not break the whole doc
                console.warn('Chunk falló, usando original.');
                translatedChunks.push(chunk + ' [Error Traducción]');
            }
        }

        console.log(`[Free] ¡Traducción completada!`);
        return translatedChunks.join(' ');
    }
}

module.exports = FreeProvider;
