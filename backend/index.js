const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Set up file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('StudyMate AI backend is running!');
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);

    const { PDFParse } = require('pdf-parse');
    const parser = new PDFParse({ data: fileBuffer });
    const data = await parser.getText();

    res.json({
      message: 'File uploaded and parsed successfully',
      filename: req.file.originalname,
      textLength: data.text.length,
      extractedText: data.text.substring(0, 500) // first 500 chars as preview
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});