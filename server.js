const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
    origin: '*',
    methods: ['POST', 'GET'],
    allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve static frontend files (index.html, style.css, script.js)
app.use(express.static(__dirname));

// Serve index.html when visiting the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- KEEP-ALIVE HEALTH CHECK ENDPOINT ---
app.get('/ping', (req, res) => res.send('OK'));

// RAM-Based Storage
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

app.post('/api/compress/image', upload.single('file'), async (req, res) => {
    console.log(`\n[NETWORK] Incoming compression request...`);
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file detected by the server.' });
    }

    const targetSizeKB = parseInt(req.body.targetSize) || 500;
    const targetSizeBytes = targetSizeKB * 1024;
    const mimeType = req.file.mimetype;

    console.log(`[PROCESS] Analyzing: ${req.file.originalname} | Target: ${targetSizeKB}KB`);

    try {
        if (!mimeType.startsWith('image/')) {
            throw new Error('Unsupported format. Please upload a JPG or PNG.');
        }

        let quality = 95;
        let compressedBuffer;
        let isSuccess = false;

        // Compress directly from RAM to RAM
        while (quality > 5) {
            compressedBuffer = await sharp(req.file.buffer)
                .jpeg({ quality: quality, progressive: true, force: true })
                .toBuffer();
            
            if (compressedBuffer.length <= targetSizeBytes) {
                isSuccess = true;
                break;
            }
            quality -= (compressedBuffer.length > targetSizeBytes * 2) ? 15 : 5; 
        }

        console.log(`[SUCCESS] Compression finalized. Output size: ${Math.round(compressedBuffer.length/1024)}KB`);

        res.set('Content-Disposition', `attachment; filename="ProCompressed-${req.file.originalname.split('.')[0]}.jpg"`);
        res.set('Content-Type', 'image/jpeg');
        res.send(compressedBuffer);

    } catch (error) {
        console.error(`[ENGINE FAILURE] ${error.message}`);
        res.status(500).json({ error: error.message || 'Critical server error during compression.' });
    }
});

app.listen(PORT, () => {
    console.log('=============================================');
    console.log(`[SYSTEM BOOT] RAM-Powered Engine Online.`);
    console.log(`[NETWORK] Listening strictly on PORT: ${PORT}`);
    console.log('=============================================');
});