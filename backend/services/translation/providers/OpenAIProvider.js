const BaseProvider = require('./BaseProvider');
const axios = require('axios');

class OpenAIProvider extends BaseProvider {
    async translate(text, sourceLang, targetLang, options = {}) {
        const apiKey = options.apiKey;
        if (!apiKey) throw new Error('Dame la API Key de OpenAI para arrancar.');

        const chunks = this.splitTextIntoChunks(text, 1500); // Token limit safety
        const translatedChunks = [];

        for (const chunk of chunks) {
            try {
                const res = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: `You are a professional translator. Translate the following ${sourceLang} text to ${targetLang}. Preserve formatting and tone.` },
                        { role: 'user', content: chunk }
                    ]
                }, {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (res.data.choices && res.data.choices[0]) {
                    translatedChunks.push(res.data.choices[0].message.content.trim());
                }
            } catch (err) {
                console.error('OpenAI Error:', err.response ? err.response.data : err.message);
                throw new Error('OpenAI ta chivo. Revisa la key.');
            }
        }
        return translatedChunks.join(' ');
    }
}

module.exports = OpenAIProvider;
