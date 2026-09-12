import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadResult(null);
    setAiResult(null);
    setError(null);
    setAnswers({});
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadResult(null);
    setAiResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Step 1: Upload and extract text
      const uploadResponse = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData);
      setLoading(false);

      // Step 2: Generate summary + quiz using the extracted text
      setGenerating(true);
      const generateResponse = await fetch('http://localhost:5000/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uploadData.extractedText }),
      });

      if (!generateResponse.ok) throw new Error('AI generation failed');

      const generateData = await generateResponse.json();
      setAiResult(generateData);
    } catch (err) {
      setError('Something went wrong. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const handleAnswerSelect = (qIndex, option) => {
    setAnswers({ ...answers, [qIndex]: option });
  };

  return (
    <div style={{ maxWidth: '700px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h1>StudyMate AI</h1>
      <p>Upload your notes (PDF) to get a summary and quiz.</p>

      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading || generating} style={{ marginLeft: '10px' }}>
        {loading ? 'Uploading...' : generating ? 'Generating...' : 'Upload'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {uploadResult && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <p><strong>File:</strong> {uploadResult.filename}</p>
        </div>
      )}

      {generating && <p>Generating summary and quiz, please wait...</p>}

      {aiResult && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', marginBottom: '20px' }}>
            <h3>Summary</h3>
            <p>{aiResult.summary}</p>
          </div>

          <div>
            <h3>Quiz</h3>
            {aiResult.quiz.map((q, i) => (
              <div key={i} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '8px' }}>
                <p><strong>{i + 1}. {q.question}</strong></p>
                {q.options.map((option, j) => {
                  const isSelected = answers[i] === option;
                  const isCorrect = option === q.correctAnswer;
                  let bgColor = '#fff';
                  if (isSelected && isCorrect) bgColor = '#c8f7c5';
                  else if (isSelected && !isCorrect) bgColor = '#f7c5c5';

                  return (
                    <div
                      key={j}
                      onClick={() => handleAnswerSelect(i, option)}
                      style={{
                        padding: '8px',
                        marginTop: '5px',
                        border: '1px solid #ddd',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        backgroundColor: bgColor,
                      }}
                    >
                      {option}
                    </div>
                  );
                })}
                {answers[i] && (
                  <p style={{ marginTop: '8px', fontSize: '14px' }}>
                    {answers[i] === q.correctAnswer ? '✅ Correct!' : `❌ Correct answer: ${q.correctAnswer}`}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;