const express = require('express');
const path = require('path');
const app = express();

// Serve static files with proper cache headers
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }

        // Set cache control headers for static resources
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
    }
}));

// Disable 'Expires' header and prefer 'Cache-Control'
app.use((req, res, next) => {
    res.removeHeader('Expires');
    next();
});


app.listen(5000, () => {
    console.log('Backend server running on http://localhost:5000');
});