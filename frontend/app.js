// PDF Translator Application - Extreme Edition

class PDFTranslator {
    constructor() {
        this.fileId = null;
        this.selectedFile = null;
        this.pollingInterval = null;
        this.processingStatus = null;
        this.fluidProgress = 0;
        this.fluidInterval = null;
        this.init();
    }

    init() {
        console.log('Inicializando Extreme Translator...');
        this.bindEvents();
        this.checkExistingSession();
    }

    bindEvents() {
        this.dropZone = document.getElementById('drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.processBtn = document.getElementById('process-btn');
        this.removeBtn = document.getElementById('remove-file');
        this.downloadBtn = document.getElementById('download-btn');
        this.resetBtn = document.getElementById('reset-btn');

        if (this.dropZone) {
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
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) this.handleFile(e.target.files[0]);
            });
        }

        if (this.processBtn) this.processBtn.addEventListener('click', () => this.startProcessing());
        if (this.removeBtn) this.removeBtn.addEventListener('click', () => this.resetUI());
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.downloadFile());
        if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetUI());
    }

    checkExistingSession() {
        const savedFileId = localStorage.getItem('activeFileId');
        const savedFileName = localStorage.getItem('activeFileName');

        if (savedFileId) {
            console.log('Sesión encontrada, reanudando...', savedFileId);
            this.fileId = savedFileId;

            document.getElementById('upload-section').classList.add('hidden');
            document.getElementById('progress-section').classList.remove('hidden');
            document.getElementById('progress-text').textContent = 'Reconectando con el servidor...';

            if (savedFileName) {
                document.getElementById('file-info').classList.remove('hidden');
                document.getElementById('file-name').textContent = savedFileName;
            }

            this.startPolling();
        }
    }

    handleFile(file) {
        if (file.size > 50 * 1024 * 1024) return alert('El archivo es muy grande, mi loco. Máximo 50MB.');

        this.selectedFile = file;

        document.getElementById('upload-section').classList.add('hidden');
        document.getElementById('file-info').classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    async startProcessing() {
        if (!this.selectedFile) return;

        this.processBtn.disabled = true;
        this.processBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Procesando...';
        document.getElementById('progress-section').classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('file', this.selectedFile);

            const uploadRes = await fetch(`${CONFIG.API_BASE_URL}/api/upload`, { method: 'POST', body: formData });
            const uploadData = await uploadRes.json();

            if (!uploadData.success) throw new Error(uploadData.error);
            this.fileId = uploadData.fileId;

            localStorage.setItem('activeFileId', this.fileId);
            localStorage.setItem('activeFileName', this.selectedFile.name);

            const settings = JSON.parse(localStorage.getItem('translatorSettings')) || {
                provider: 'free',
                format: 'pdf',
                sourceLang: 'en',
                targetLang: 'es'
            };

            const mainSourceLang = document.getElementById('main-source-lang');
            const mainTargetLang = document.getElementById('main-target-lang');
            const sourceLang = mainSourceLang ? mainSourceLang.value : (settings.sourceLang || 'en');
            const targetLang = mainTargetLang ? mainTargetLang.value : (settings.targetLang || 'es');

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

            this.startPolling();

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
            this.resetUI();
        }
    }

    startPolling() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
        this.startFluidProgress();

        this.pollingInterval = setInterval(async () => {
            try {
                const res = await fetch(`${CONFIG.API_BASE_URL}/api/process/${this.fileId}`);
                if (!res.ok) {
                    if (res.status === 404) {
                        this.resetUI();
                        return;
                    }
                    throw new Error('Server error during polling');
                }

                const status = await res.json();
                this.processingStatus = status;
                this.updateServerProgress(status);

                if (status.status === 'completed') {
                    this.stopFluidProgress();
                    this.updateUIProgressBar(100);
                    const text = document.getElementById('progress-text');
                    if (text) text.textContent = status.message;
                    setTimeout(() => this.showDownload(), 800);
                } else if (status.status === 'error') {
                    this.stopFluidProgress();
                    alert('Error en el proceso: ' + status.message);
                    this.resetUI();
                }
            } catch (e) {
                console.error("Polling error", e);
            }
        }, 2000);
    }

    startFluidProgress() {
        if (this.fluidInterval) clearInterval(this.fluidInterval);
        this.fluidProgress = this.fluidProgress || 5;

        this.fluidInterval = setInterval(() => {
            // Slowly increment progress to keep user engaged
            // If we are near the actual server progress, slow down even more
            const serverProgress = this.processingStatus ? this.processingStatus.progress : 5;

            if (this.fluidProgress < serverProgress) {
                // Catch up slightly faster
                this.fluidProgress += 0.5;
            } else if (this.fluidProgress < 98) {
                // Creep forward slowly (simulated activity)
                this.fluidProgress += 0.03;
            }

            this.updateUIProgressBar(this.fluidProgress);
        }, 100);
    }

    stopFluidProgress() {
        if (this.fluidInterval) clearInterval(this.fluidInterval);
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }

    updateServerProgress(status) {
        // We let the fluid progress handle the bar width
        // But we update text and steps immediately
        const text = document.getElementById('progress-text');
        if (text) text.textContent = status.message;

        const steps = ['extraction', 'translation', 'generation'];
        steps.forEach(step => {
            const el = document.getElementById(`step-${step}`);
            if (el) {
                if (status.step === step || status.status === 'completed' || (steps.indexOf(step) < steps.indexOf(status.step))) {
                    el.classList.add('text-green-400', 'scale-110');
                    const icon = el.querySelector('.step-icon');
                    if (icon) icon.classList.add('border-green-400', 'bg-green-400/20');
                }
            }
        });
    }

    updateUIProgressBar(val) {
        const bar = document.getElementById('progress-bar');
        const percent = document.getElementById('progress-percent');
        const displayVal = Math.floor(val);

        if (bar) bar.style.width = `${val}%`;
        if (percent) percent.textContent = `${displayVal}%`;
    }

    setFinalProgress(val, msg) {
        this.updateUIProgressBar(val);
        const text = document.getElementById('progress-text');
        if (text) text.textContent = msg;
    }

    showDownload() {
        document.getElementById('progress-section').classList.add('hidden');
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('download-section').classList.remove('hidden');
        this.processBtn.disabled = false;
    }

    async downloadFile() {
        if (!this.fileId) return;
        window.location.href = `${CONFIG.API_BASE_URL}/api/download/${this.fileId}`;
    }

    resetUI() {
        this.stopFluidProgress();
        this.fileId = null;
        this.selectedFile = null;
        this.processingStatus = null;
        this.fluidProgress = 0;

        localStorage.removeItem('activeFileId');
        localStorage.removeItem('activeFileName');

        document.getElementById('upload-section').classList.remove('hidden');
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('progress-section').classList.add('hidden');
        document.getElementById('download-section').classList.add('hidden');

        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.value = '';

        if (this.processBtn) {
            this.processBtn.disabled = false;
            this.processBtn.innerHTML = '<i class="fas fa-magic mr-3"></i> Traducir Ahora';
        }

        const steps = ['extraction', 'translation', 'generation'];
        steps.forEach(step => {
            const el = document.getElementById(`step-${step}`);
            if (el) {
                el.classList.remove('text-green-400', 'scale-110');
                const icon = el.querySelector('.step-icon');
                if (icon) icon.classList.remove('border-green-400', 'bg-green-400/20');
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PDFTranslator();
});