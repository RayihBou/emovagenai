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

  const downloadResult = (format) => {
    if (!result) return;
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
    const filename = `emova_analisis_${timestamp}`;
    
    let content, type, ext;
    if (format === 'json') {
      content = JSON.stringify({ archivo: file?.name, fecha: new Date().toISOString(), ...result }, null, 2);
      type = 'application/json';
      ext = 'json';
    } else {
      content = `ANÁLISIS DE COMUNICACIÓN - EMOVA
================================
Archivo: ${file?.name}
Fecha: ${new Date().toLocaleString()}

PUNTUACIÓN GENERAL: ${result.score}/10

CRITERIOS:
- Fraseología: ${result.fraseologia}/10
- Claridad: ${result.claridad}/10
- Protocolo: ${result.protocolo}/10
- Formalidad: ${result.formalidad}/10

TRANSCRIPCIÓN:
${result.transcript}

JUSTIFICACIÓN:
${result.justification}

ERRORES DETECTADOS:
${result.errores_detectados?.map(e => `- ${e}`).join('\n') || 'Ninguno'}

RECOMENDACIONES:
${result.recommendations?.map(r => `- ${r}`).join('\n') || 'Ninguna'}
`;
      type = 'text/plain';
      ext = 'txt';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
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
          <div 
            className={`upload-box ${file ? 'has-file' : ''}`} 
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
            />
            <div className="upload-icon">{file ? '✓' : '🎙️'}</div>
            <p>{file ? file.name : 'Haz clic o arrastra un archivo de audio'}</p>
            <span className="upload-hint">{file ? 'Clic para cambiar archivo' : 'Formatos: MP3, WAV, M4A, OGG'}</span>
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
            {/* Score Principal */}
            <div className="score-main-card">
              <div className="download-buttons">
                <button className="download-btn" onClick={() => downloadResult('json')}>
                  Descargar JSON
                </button>
                <button className="download-btn" onClick={() => downloadResult('txt')}>
                  Descargar TXT
                </button>
              </div>
              <div className="score-circle" style={{ '--score-color': getScoreColor(result.score), '--score-percent': `${result.score * 10}%` }}>
                <svg viewBox="0 0 100 100">
                  <circle className="score-bg" cx="50" cy="50" r="45" />
                  <circle className="score-progress" cx="50" cy="50" r="45" 
                    style={{ strokeDasharray: `${result.score * 28.27} 282.7` }} />
                </svg>
                <div className="score-text">
                  <span className="score-value">{result.score?.toFixed(1)}</span>
                  <span className="score-max">/10</span>
                </div>
              </div>
              <h2 className="score-title">Puntuación General</h2>
            </div>

            {/* Criterios con barras */}
            <div className="criteria-card">
              <h3>Criterios de Evaluación</h3>
              <div className="criteria-grid">
                {[
                  { name: 'Fraseología', value: result.fraseologia },
                  { name: 'Claridad', value: result.claridad },
                  { name: 'Protocolo', value: result.protocolo },
                  { name: 'Formalidad', value: result.formalidad }
                ].map((c, i) => (
                  <div className="criteria-item" key={i}>
                    <div className="criteria-header">
                      <span className="criteria-name">{c.name}</span>
                      <span className="criteria-value" style={{ color: getScoreColor(c.value) }}>{c.value}</span>
                    </div>
                    <div className="criteria-bar">
                      <div className="criteria-fill" style={{ width: `${c.value * 10}%`, background: getScoreColor(c.value) }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transcripción */}
            {result.transcript && (
              <div className="card transcript-card">
                <h3>Transcripción</h3>
                <p>{result.transcript}</p>
              </div>
            )}

            {/* Justificación */}
            <div className="card justification-card">
              <h3>Justificación</h3>
              <p>{result.justification}</p>
            </div>

            {/* Errores y Recomendaciones lado a lado */}
            <div className="feedback-grid">
              {result.errores_detectados?.length > 0 && (
                <div className="card errors-card">
                  <h3>Errores Detectados</h3>
                  <ul>
                    {result.errores_detectados.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div className="card recommendations-card">
                  <h3>Recomendaciones</h3>
                  <ul>
                    {result.recommendations.map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
