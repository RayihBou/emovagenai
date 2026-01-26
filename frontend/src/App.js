import React, { useState, useRef } from 'react';
import './App.css';

const API_URL = 'https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev';
const LOGO_EMOVA = 'https://emova.com.ar/wp-content/uploads/2023/09/aplicacion-ppal-logotag-concesionario-digital-footer-web.png';
const LOGO_GOBIERNO = 'https://www.argentina.gob.ar/profiles/argentinagobar/themes/argentinagobar/argentinagobar_theme/logo_argentina-azul.svg';
const LOGO_AWS = 'https://a0.awsstatic.com/libra-css/images/logos/aws_smile-header-desktop-en-white_59x35.png';

function App() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      // 1. Obtener URL presignada
      setStatus('Obteniendo URL de carga...');
      const uploadRes = await fetch(`${API_URL}/upload-url?filename=${encodeURIComponent(file.name)}`);
      if (!uploadRes.ok) throw new Error('Error obteniendo URL de carga');
      const { upload_url, key } = await uploadRes.json();
      
      // 2. Subir archivo a S3
      setStatus('Subiendo audio a S3...');
      const uploadToS3 = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': 'audio/mpeg' }
      });
      if (!uploadToS3.ok) throw new Error('Error subiendo archivo');
      
      // 3. Analizar
      setStatus('Transcribiendo audio (esto puede tomar 1-2 minutos)...');
      const analyzeRes = await fetch(`${API_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_key: key })
      });
      
      const data = await analyzeRes.json();
      
      if (!analyzeRes.ok) {
        throw new Error(data.error || 'Error en el análisis');
      }
      
      setResult({
        transcript: data.transcript,
        ...data.evaluation
      });
      setStatus('');
      
    } catch (err) {
      setError(err.message);
      setStatus('');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="app">
      <header className="header">
        <div className="logos">
          <img src={LOGO_EMOVA} alt="Emova" className="logo-emova" />
          <img src={LOGO_GOBIERNO} alt="Gobierno Argentina" className="logo-gobierno" />
        </div>
        <h1>Analítica de Conversaciones</h1>
        <p className="subtitle">Evaluación de calidad en comunicaciones operativas</p>
      </header>

      <main className="main">
        <section className="upload-section">
          <div className="upload-box" onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              style={{ display: 'none' }}
            />
            <div className="upload-icon">🎙️</div>
            <p>{file ? file.name : 'Seleccionar archivo de audio'}</p>
            <span className="upload-hint">MP3, WAV, M4A</span>
          </div>
          
          <button 
            className="analyze-btn" 
            onClick={handleAnalyze}
            disabled={!file || loading}
          >
            {loading ? 'Procesando...' : 'Analizar Comunicación'}
          </button>
          
          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </section>

        {result && (
          <section className="results-section">
            <div className="score-card">
              <div className="score-main" style={{ borderColor: getScoreColor(result.score) }}>
                <span className="score-value" style={{ color: getScoreColor(result.score) }}>
                  {result.score?.toFixed(1)}
                </span>
                <span className="score-label">Puntuación General</span>
              </div>
              
              <div className="score-details">
                <div className="score-item">
                  <span className="score-name">Fraseología</span>
                  <span className="score-num" style={{ color: getScoreColor(result.fraseologia) }}>
                    {result.fraseologia}
                  </span>
                </div>
                <div className="score-item">
                  <span className="score-name">Claridad</span>
                  <span className="score-num" style={{ color: getScoreColor(result.claridad) }}>
                    {result.claridad}
                  </span>
                </div>
                <div className="score-item">
                  <span className="score-name">Protocolo</span>
                  <span className="score-num" style={{ color: getScoreColor(result.protocolo) }}>
                    {result.protocolo}
                  </span>
                </div>
                <div className="score-item">
                  <span className="score-name">Formalidad</span>
                  <span className="score-num" style={{ color: getScoreColor(result.formalidad) }}>
                    {result.formalidad}
                  </span>
                </div>
              </div>
            </div>

            {result.transcript && (
              <div className="transcript-card">
                <h3>Transcripción</h3>
                <p>{result.transcript}</p>
              </div>
            )}

            <div className="analysis-card">
              <h3>Justificación</h3>
              <p>{result.justification}</p>
            </div>

            {result.errores_detectados?.length > 0 && (
              <div className="errors-card">
                <h3>Errores Detectados</h3>
                <ul>
                  {result.errores_detectados.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="recommendations-card">
                <h3>Recomendaciones</h3>
                <ul>
                  {result.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <div className="footer-powered">
          <span>Powered by</span>
          <img src={LOGO_AWS} alt="AWS" className="logo-aws-footer" />
        </div>
        <p className="services">Amazon Transcribe | Amazon Bedrock | Claude 3.5 Sonnet</p>
      </footer>
    </div>
  );
}

export default App;
