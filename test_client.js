const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

async function runTest() {
    try {
        console.log('1. Subiendo archivo...');
        const form = new FormData();
        form.append('file', fs.createReadStream('test_doc.pdf'));

        const uploadRes = await axios.post('http://localhost:3000/api/upload', form, {
            headers: { ...form.getHeaders() }
        });

        if (!uploadRes.data.success) throw new Error('Upload falló');
        const fileId = uploadRes.data.fileId;
        console.log('   -> Archivo subido. ID:', fileId);

        console.log('2. Iniciando procesamiento (Chutes AI Default)...');
        const processRes = await axios.post(`http://localhost:3000/api/process/${fileId}`, {
            // No mandamos provider ni key, para probar el default config
        });

        if (!processRes.data.success) throw new Error('Start process falló');
        console.log('   -> Proceso iniciado.');

        console.log('3. Polling status...');
        let status = 'processing';
        while (status !== 'completed' && status !== 'error') {
            await new Promise(r => setTimeout(r, 2000));
            const statusRes = await axios.get(`http://localhost:3000/api/process/${fileId}`);
            status = statusRes.data.status;
            console.log(`   -> Status: ${status} (${statusRes.data.progress}%) - ${statusRes.data.message}`);
        }

        if (status === 'completed') {
            console.log('¡EXITO! Traducción completada.');
        } else {
            console.error('FRACASO. El proceso terminó en error.');
        }

    } catch (err) {
        console.error('ERROR TEST:', err.message);
        if (err.response) console.error('Data:', err.response.data);
    }
}

runTest();
