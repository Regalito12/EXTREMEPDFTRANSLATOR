// PDF Translator Application - Extreme Edition

class PDFTranslator {
    constructor() {
        this.fileId = null;
        this.selectedFile = null;
        this.pollingInterval = null;
        this.init();
    }

    init() {
        console.log('Inicializando Extreme Translator...');
        this.bindEvents();
    }

    bindEvents() {
        // Elements
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.processBtn = document.getElementById('process-btn');
        this.removeBtn = document.getElementById('remove-file');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');

        // Drag & Drop
        this.dropZone.addEventListener('click', () => this.fileInput.click());
        this.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropZone.classList.add('bg-white/20', 'scale-105');
        });
        this.dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('bg-white/20', 'scale-105');
        });
        this.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('bg-white/20', 'scale-105');
            if (e.dataTransfer.files.length) this.handleFile(e.dataTransfer.files[0]);
        });

        // File Input
        this.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFile(e.target.files[0]);
        });

        // Actions
        if (this.processBtn) this.processBtn.addEventListener('click', () => this.startProcessing());
        if (this.removeBtn) this.removeBtn.addEventListener('click', () => this.resetUI());
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.downloadFile());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetUI());
    }

    handleFile(file) {
        // Validation
        if (file.size > 50 * 1024 * 1024) return alert('El archivo es muy grande, mi loco. Máximo 50MB.');

        this.selectedFile = file;

        // Show File Info
        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    async startProcessing() {
        if (!this.selectedFile) return;

        // UI Updates
        this.processBtn.disabled = true;
        this.processBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        document.getElementById('progress-section').classList.remove('hidden');

        try {
            // 1. Upload
            const formData = new FormData();
            formData.append('file', this.selectedFile);

            const uploadRes = await fetch(`${CONFIG.API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) throw new Error(uploadData.error);
            this.fileId = uploadData.fileId;

            // 2. Get Settings from LocalStorage
            const settings = JSON.parse(localStorage.getItem('translatorSettings')) || {
                provider: 'free',
                format: 'pdf',
                sourceLang: 'en',
                targetLang: 'es'
            };

            // 3. Get languages from visible selectors (priority) or settings
            const mainSourceLang = document.getElementById('main-source-lang');
            const mainTargetLang = document.getElementById('main-target-lang');
            const sourceLang = mainSourceLang ? mainSourceLang.value : (settings.sourceLang || 'en');
            const targetLang = mainTargetLang ? mainTargetLang.value : (settings.targetLang || 'es');

            // 4. Start Process
            const processRes = await fetch(`${CONFIG.API_BASE_URL}/api/process/${this.fileId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: settings.provider,
                    apiKey: settings.apiKey,
                    format: settings.format,
                    sourceLang: sourceLang,
                    targetLang: targetLang
                })
            });
            const processData = await processRes.json();
            if (!processData.success) throw new Error(processData.error);

            // 4. Poll Status
            this.startPolling();

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
            this.resetUI();
        }
    }

    startPolling() {
        this.pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/api/process/${this.fileId}`);
                const status = await res.json();

                this.updateProgress(status);

                if (status.status === 'completed') {
                    clearInterval(this.pollingInterval);
                    this.showDownload();
                } else if (status.status === 'error') {
                    clearInterval(this.pollingInterval);
                    alert('Error en el proceso: ' + status.message);
                    this.resetUI();
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 1000);
    }

    updateProgress(status) {
        const bar = document.getElementById('progress-bar');
        const text = document.getElementById('progress-text');
        const percent = document.getElementById('progress-percent');

        // Smooth width transition handled by CSS
        bar.style.width = `${status.progress}%`;
        percent.textContent = `${status.progress}%`;
        text.textContent = status.message;

        // Step active states
        const steps = ['extraction', 'translation', 'generation'];
        steps.forEach(step => {
            const el = document.getElementById(`step-${step}`);
            if (el) {
                if (status.step === step || status.status === 'completed') {
                    el.classList.add('text-green-400', 'scale-110');
                    el.querySelector('.step-icon').classList.add('border-green-400', 'bg-green-400/20');
                }
            }
        });
    }

    showDownload() {
        document.getElementById('progress-section').classList.add('hidden');
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('download-section').classList.remove('hidden');
    }

    async downloadFile() {
        if (!this.fileId) return;

        // Use window.location for simplicity or fetch blob
        const settings = JSON.parse(localStorage.getItem('translatorSettings')) || { format: 'pdf' };
        const ext = settings.format === 'docx' ? 'docx' : 'pdf';

        // Direct download trigger
        window.location.href = `${CONFIG.API_BASE_URL}/api/download/${this.fileId}`;
    }

    resetUI() {
        this.selectedFile = null;
        this.fileId = null;
        clearInterval(this.pollingInterval);

        document.getElementById('upload-section').classList.remove('hidden');
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('progress-section').classList.add('hidden');
        document.getElementById('download-section').classList.add('hidden');
        document.getElementById('file-input').value = '';

        this.processBtn.disabled = false;
        this.processBtn.innerHTML = '<i class="fas fa-magic mr-3"></i> Traducir Ahora';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PDFTranslator();
});