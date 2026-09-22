import { useState } from 'react';
import './App.css';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('studymate-history');
    return saved ? JSON.parse(saved) : [];
  });

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setUploadResult(null);
    setAiResult(null);
    setError(null);
    setAnswers({});
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select at least one PDF file.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadResult(null);
    setAiResult(null);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const uploadResponse = await fetch('https://study-mate-ai-dr3e.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');

      const uploadData = await uploadResponse.json();
      setUploadResult(uploadData);
      setLoading(false);

      setGenerating(true);
      const generateResponse = await fetch('https://study-mate-ai-dr3e.onrender.com/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: uploadData.extractedText }),
      });

      if (!generateResponse.ok) throw new Error('AI generation failed');

      const generateData = await generateResponse.json();
      setAiResult(generateData);
      // Save to history
      const newEntry = {
        id: Date.now(),
        filenames: uploadData.filenames,
        summary: generateData.summary,
        quiz: generateData.quiz,
        date: new Date().toLocaleString(),
      };
      const updatedHistory = [newEntry, ...history].slice(0, 10); // keep last 10
      setHistory(updatedHistory);
      localStorage.setItem('studymate-history', JSON.stringify(updatedHistory));
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

  const handleDownload = () => {
    if (!aiResult) return;

    let content = `StudyMate AI - Summary & Quiz\n`;
    content += `Files: ${uploadResult?.filenames?.join(', ') || 'N/A'}\n`;
    content += `\n===== SUMMARY =====\n\n`;
    content += aiResult.summary + '\n\n';
    content += `===== QUIZ =====\n\n`;

    aiResult.quiz.forEach((q, i) => {
      content += `${i + 1}. ${q.question}\n`;
      q.options.forEach((opt, j) => {
        content += `   ${String.fromCharCode(65 + j)}) ${opt}\n`;
      });
      content += `   Correct Answer: ${q.correctAnswer}\n\n`;
    });

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studymate-summary.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const loadFromHistory = (entry) => {
  setUploadResult({ filenames: entry.filenames });
  setAiResult({ summary: entry.summary, quiz: entry.quiz });
  setAnswers({});
  setShowHistory(false);
};

const clearHistory = () => {
  setHistory([]);
  localStorage.removeItem('studymate-history');
};

  const score = aiResult
    ? aiResult.quiz.filter((q, i) => answers[i] === q.correctAnswer).length
    : 0;

  return (
    <div className={darkMode ? "app-container dark" : "app-container"}>
      <div className="header">
        <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
        <h1>📚 StudyMate AI</h1>
        <p>Upload your notes (PDF) and get an instant summary + quiz.</p>
      </div>
      {showHistory && (
  <div className="history-panel">
    <div className="history-header">
      <h3>Upload History</h3>
      {history.length > 0 && (
        <button className="clear-history-btn" onClick={clearHistory}>Clear All</button>
      )}
    </div>
    {history.length === 0 ? (
      <p className="no-history">No past uploads yet.</p>
    ) : (
      history.map((entry) => (
        <div key={entry.id} className="history-item" onClick={() => loadFromHistory(entry)}>
          <p className="history-filename">📄 {entry.filenames?.join(', ')}</p>
          <p className="history-date">{entry.date}</p>
        </div>
      ))
    )}
  </div>
)}

      <div className="upload-card">
        <input type="file" accept=".pdf" multiple onChange={handleFileChange} className="file-input" />
        <button onClick={handleUpload} disabled={loading || generating} className="upload-btn">
          {loading ? 'Uploading...' : generating ? 'Generating...' : 'Upload'}
        </button>
      </div>
      <button className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
        🕘 History ({history.length})
      </button>

      {files.length > 0 && (
        <div className="info-card">
          <p><strong>📄 Selected:</strong> {files.map(f => f.name).join(', ')}</p>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}

      {generating && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Generating summary and quiz, please wait...</p>
        </div>
      )}

      {aiResult && (
        <div className="results">
          <div className="summary-card">
            <div className="summary-header">
              <h2>📝 Summary</h2>
              <button className="download-btn" onClick={handleDownload}>⬇️ Download</button>
            </div>
            <p>{aiResult.summary}</p>
          </div>

          <div className="quiz-section">
            <div className="quiz-header">
              <h2>🧠 Quiz</h2>
              {Object.keys(answers).length === aiResult.quiz.length && (
                <span className="score-badge">Score: {score} / {aiResult.quiz.length}</span>
              )}
            </div>

            {aiResult.quiz.map((q, i) => (
              <div key={i} className="question-card">
                <p className="question-text">{i + 1}. {q.question}</p>
                <div className="options-grid">
                  {q.options.map((option, j) => {
                    const isSelected = answers[i] === option;
                    const isCorrect = option === q.correctAnswer;
                    let optionClass = 'option';
                    if (isSelected && isCorrect) optionClass += ' correct';
                    else if (isSelected && !isCorrect) optionClass += ' incorrect';

                    return (
                      <div
                        key={j}
                        onClick={() => handleAnswerSelect(i, option)}
                        className={optionClass}
                      >
                        {option}
                      </div>
                    );
                  })}
                </div>
                {answers[i] && (
                  <p className="answer-feedback">
                    {answers[i] === q.correctAnswer
                      ? '✅ Correct!'
                      : `❌ Correct answer: ${q.correctAnswer}`}
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