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
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

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
app.post('/upload', upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const { PDFParse } = require('pdf-parse');
    let combinedText = '';
    const filenames = [];

    for (const file of req.files) {
      const fileBuffer = fs.readFileSync(file.path);
      const parser = new PDFParse({ data: fileBuffer });
      const data = await parser.getText();

      filenames.push(file.originalname);
      combinedText += `\n\n--- From: ${file.originalname} ---\n\n` + data.text;
    }

    res.json({
      message: 'Files uploaded and parsed successfully',
      filenames: filenames,
      textLength: combinedText.length,
      extractedText: combinedText,
      preview: combinedText.substring(0, 500)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process files', details: error.message });
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
You are a study assistant. Based on the following notes, do three things:
1. Write a concise summary (5-8 sentences).
2. Create 5 multiple-choice questions (MCQs) to test understanding, each with 4 options and the correct answer clearly marked.
3. Create 6 flashcards, each with a short "front" (a key term or question) and a "back" (the definition or answer).

Respond ONLY in valid JSON format, with no extra text, no markdown code fences, in this exact structure:
{
  "summary": "your summary here",
  "quiz": [
    {
      "question": "question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "the correct option text"
    }
  ],
  "flashcards": [
    {
      "front": "term or question",
      "back": "definition or answer"
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});