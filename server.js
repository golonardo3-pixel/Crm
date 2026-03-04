import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// API routes
app.get('/api/config', (req, res) => {
    res.json({
        apiKey: process.env.GEMINI_API_KEY
    });
});

// Serve static files from the root directory
app.use(express.static(__dirname));

// Fallback to index.html for SPA behavior (optional but good for static apps)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
