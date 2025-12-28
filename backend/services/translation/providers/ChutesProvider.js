const BaseProvider = require('./BaseProvider');
const axios = require('axios');
const path = require('path');
// Defensive path resolution
const configPath = path.resolve(__dirname, '../../../config.js');
const config = require(configPath);

class ChutesProvider extends BaseProvider {
    async translate(text, sourceLang, targetLang, options = {}) {
        // Use API key from options, or fall back to config
        const apiKey = options.apiKey || config.CHUTES_API_TOKEN;
        if (!apiKey) throw new Error('Necesito el Token de Chutes AI para esto.');

        // 2500 chars is a good balance for Gemma
        const chunks = this.splitTextIntoChunks(text, 2500);
        console.log(`[Chutes] Traduciendo ${chunks.length} chunks con Gemma 3...`);

        // Process in larger batches to improve speed
        const BATCH_SIZE = 5;
        const translatedChunks = new Array(chunks.length);

        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            const batchPromises = batch.map((chunk, idx) =>
                this.translateChunk(chunk, sourceLang, targetLang, apiKey)
                    .then(result => {
                        translatedChunks[i + idx] = result;
                        console.log(`[Chutes] Chunk ${i + idx + 1}/${chunks.length} completado`);
                        return result;
                    })
            );

            try {
                await Promise.all(batchPromises);
                // Tiny delay between batches to be nice to the API
                if (i + BATCH_SIZE < chunks.length) await new Promise(r => setTimeout(r, 1000));
            } catch (err) {
                console.error('[Chutes] Error en batch:', err.message);
                throw err;
            }
        }

        console.log(`[Chutes] ¡Traducción completada!`);
        return translatedChunks.join(' ');
    }

    async translateChunk(chunk, sourceLang, targetLang, apiKey) {
        try {
            const res = await axios.post('https://llm.chutes.ai/v1/chat/completions', {
                model: 'unsloth/gemma-3-4b-it', // Back to the working model
                messages: [
                    {
                        role: 'system',
                        content: `Translate the following text from ${sourceLang} to ${targetLang}. Keep the same format. Output ONLY the translation.`
                    },
                    { role: 'user', content: chunk }
                ],
                temperature: 0.3,
                max_tokens: 3000
            }, {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 120000 // 2 minutes timeout just in case
            });

            if (res.data.choices && res.data.choices[0]) {
                return res.data.choices[0].message.content.trim();
            }
            return chunk;
        } catch (err) {
            console.error('Chutes AI Error:', err.response ? err.response.data : err.message);
            // More user friendly error if quota exceeded
            if (err.response && err.response.data && JSON.stringify(err.response.data).includes('balance')) {
                throw new Error('Tu saldo de Chutes AI se agotó (Error: balance is $0.0).');
            }
            throw new Error('Error conectando con Chutes AI. Intenta de nuevo.');
        }
    }
}

module.exports = ChutesProvider;
