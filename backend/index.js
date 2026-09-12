const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
app.post('/generate', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const prompt = `
You are a study assistant. Based on the following notes, do two things:
1. Write a concise summary (5-8 sentences).
2. Create 5 multiple-choice questions (MCQs) to test understanding, each with 4 options and the correct answer clearly marked.

Respond ONLY in valid JSON format, with no extra text, no markdown code fences, in this exact structure:
{
  "summary": "your summary here",
  "quiz": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "the correct option text"
    }
  ]
}

Notes:
${text}
    `;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();

    // Clean up in case the model wraps it in markdown code fences
    responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(responseText);

    res.json(parsed);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate summary and quiz', details: error.message });
  }
});
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});