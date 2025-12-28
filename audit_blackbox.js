const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api';
const testPdfPath = path.join(__dirname, 'test_doc.pdf');

async function runBlackBoxAudit() {
    console.log('--- INICIANDO AUDITORÍA DE CAJA NEGRA (API Y FLUJO FUNCIONAL) ---');

    try {
        // 1. UPLOAD TEST
        console.log('\n1. Test: Subida de Archivo...');
        const FormData = require('form-data');
        const form = new FormData();
        form.append('file', fs.createReadStream(testPdfPath));

        const uploadRes = await axios.post(`${API_BASE}/upload`, form, {
            headers: form.getHeaders()
        });

        if (uploadRes.data.success && uploadRes.data.fileId) {
            console.log(`✅ Éxito: Archivo subido. ID: ${uploadRes.data.fileId}`);
        } else {
            throw new Error('Fallo en la subida del archivo.');
        }

        const fileId = uploadRes.data.fileId;

        // 2. PROCESS TEST
        console.log('\n2. Test: Inicio de Procesamiento...');
        const processRes = await axios.post(`${API_BASE}/process/${fileId}`, {
            provider: 'free',
            format: 'pdf',
            sourceLang: 'en',
            targetLang: 'es'
        });

        if (processRes.data.success) {
            console.log('✅ Éxito: Procesamiento iniciado correctamente.');
        } else {
            throw new Error('Fallo al iniciar el procesamiento.');
        }

        // 3. POLLING & PROGRESS TEST
        console.log('\n3. Test: Monitoreo de Progreso (Polling)...');
        let completed = false;
        let attempts = 0;
        while (!completed && attempts < 30) {
            attempts++;
            const statusRes = await axios.get(`${API_BASE}/process/${fileId}`);
            const status = statusRes.data;
            console.log(`   Progreso: ${status.progress}% - ${status.message}`);

            if (status.status === 'completed') {
                completed = true;
                console.log('✅ Éxito: Procesamiento completado en el servidor.');
            } else if (status.status === 'error') {
                throw new Error(`Error en el servidor: ${status.message}`);
            }

            await new Promise(r => setTimeout(r, 2000));
        }

        if (!completed) throw new Error('Tiempo de espera agotado para el procesamiento.');

        // 4. DOWNLOAD & PERSISTENCE TEST
        console.log('\n4. Test: Descarga y Persistencia...');
        const downloadRes = await axios.get(`${API_BASE}/download/${fileId}`, { responseType: 'stream' });
        if (downloadRes.status === 200) {
            console.log('✅ Éxito: Archivo disponible para descarga inmediata.');
        } else {
            throw new Error('No se pudo descargar el archivo.');
        }

        // Simulation of manual refresh / persistence (it should still be in memory for 1h)
        const persistenceRes = await axios.get(`${API_BASE}/process/${fileId}`);
        if (persistenceRes.status === 200 && persistenceRes.data.status === 'completed') {
            console.log('✅ Éxito: La sesión persiste después de la descarga (1h cleanup logic).');
        } else {
            throw new Error('La sesión se borró demasiado rápido (vulnerabilidad de persistencia).');
        }

        console.log('\n--- AUDITORÍA DE CAJA NEGRA COMPLETADA CON ÉXITO ---');
    } catch (error) {
        console.error('\n❌ AUDITORÍA FALLIDA:', error.response ? error.response.data : error.message);
        if (error.message.includes('ECONNREFUSED')) {
            console.error('   Pista: ¿Está el servidor corriendo en el puerto 3000?');
        }
    }
}

runBlackBoxAudit();
