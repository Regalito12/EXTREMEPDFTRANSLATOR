const FreeProvider = require('./providers/FreeProvider');
const DeepLProvider = require('./providers/DeepLProvider');
const OpenAIProvider = require('./providers/OpenAIProvider');
const ChutesProvider = require('./providers/ChutesProvider');

class TranslationService {
    constructor() {
        this.providers = {
            'free': new FreeProvider(),
            'deepl': new DeepLProvider(),
            'openai': new OpenAIProvider(),
            'chutes': new ChutesProvider()
        };
        this.defaultProvider = 'chutes';
    }

    registerProvider(name, provider) {
        this.providers[name] = provider;
    }

    async translate(text, sourceLang, targetLang, options = {}) {
        const providerName = options.provider || this.defaultProvider;
        const provider = this.providers[providerName];

        if (!provider) {
            throw new Error(`Provider de traducción '${providerName}' no ta' activo.`);
        }

        console.log(`Usando el servicio de traducción: ${providerName}`);
        return await provider.translate(text, sourceLang, targetLang, options);
    }
}

module.exports = new TranslationService();
