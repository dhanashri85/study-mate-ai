import { useState } from 'react';
import './App.css';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file first.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError('Something went wrong. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h1>StudyMate AI</h1>
      <p>Upload your notes (PDF) to get started.</p>

      <input type="file" accept=".pdf" onChange={handleFileChange} />
      <button onClick={handleUpload} disabled={loading} style={{ marginLeft: '10px' }}>
        {loading ? 'Uploading...' : 'Upload'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h3>Upload successful!</h3>
          <p><strong>Filename:</strong> {result.filename}</p>
          <p><strong>Extracted text length:</strong> {result.textLength} characters</p>
          <p><strong>Preview:</strong></p>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#333' }}>{result.extractedText}</p>
        </div>
      )}
    </div>
  );
}

export default App;