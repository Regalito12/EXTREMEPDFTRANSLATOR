class BaseProvider {
    constructor(config = {}) {
        this.config = config;
    }

    async translate(text, sourceLang, targetLang) {
        throw new Error('El método translate() tiene que implementarse, mi loco.');
    }

    splitTextIntoChunks(text, chunkSize = 1000) {
        const chunks = [];
        let currentChunk = '';
        const sentences = text.split(/([.!?]+[\s\r\n]+)/).filter(s => s.trim().length > 0);

        for (const sentence of sentences) {
            if ((currentChunk + sentence).length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = sentence;
            } else {
                currentChunk += sentence;
            }
        }

        if (currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

module.exports = BaseProvider;
