import React, { useState } from 'react';
import './App.css';

const LOGO_EMOVA = 'https://emova.com.ar/wp-content/uploads/2023/09/aplicacion-ppal-logotag-concesionario-digital-footer-web.png';
const LOGO_GOBIERNO = 'https://www.argentina.gob.ar/profiles/argentinagobar/themes/argentinagobar/argentinagobar_theme/logo_argentina-azul.svg';

function App() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus('ready');
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    setStatus('transcribing');
    await new Promise(r => setTimeout(r, 2000));
    
    setStatus('analyzing');
    await new Promise(r => setTimeout(r, 2000));
    
    setStatus('complete');
    setResult({
      score: 7.5,
      fraseologia: 8,
      claridad: 7,
      protocolo: 8,
      formalidad: 7,
      justification: "La comunicación sigue parcialmente el protocolo establecido. Se detectó uso correcto de 'Copiado' pero falta identificación formal del emisor.",
      errores_detectados: [
        "Uso de apodo 'Pecho' en lugar de identificación formal",
        "Falta confirmación explícita del receptor"
      ],
      recommendations: [
        "Utilizar identificación formal: 'Tren [número] para PCO'",
        "Confirmar recepción con 'Copiado' o 'Recibido'"
      ]
    });
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#eab308';
    if (score >= 4) return '#f97316';
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
        <p>Sistema de evaluación de calidad de comunicaciones operativas</p>
      </header>

      <main className="main">
        <section className="upload-section">
          <h2>Cargar Audio</h2>
          <div className="upload-box">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange}
              id="audio-input"
            />
            <label htmlFor="audio-input" className="upload-label">
              {file ? file.name : 'Seleccionar archivo de audio (.mp3, .wav)'}
            </label>
          </div>
          <button 
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={!file || status === 'transcribing' || status === 'analyzing'}
          >
            {status === 'transcribing' ? 'Transcribiendo...' : 
             status === 'analyzing' ? 'Analizando...' : 'Analizar Comunicación'}
          </button>
        </section>

        <section className="process-section">
          <h2>Proceso</h2>
          <div className="process-steps">
            <div className={`step ${status !== 'idle' ? 'active' : ''} ${['transcribing','analyzing','complete'].includes(status) ? 'done' : ''}`}>
              <div className="step-icon">1</div>
              <span>Carga de Audio</span>
            </div>
            <div className="step-arrow">→</div>
            <div className={`step ${['transcribing','analyzing','complete'].includes(status) ? 'active' : ''} ${['analyzing','complete'].includes(status) ? 'done' : ''}`}>
              <div className="step-icon">2</div>
              <span>Amazon Transcribe</span>
            </div>
            <div className="step-arrow">→</div>
            <div className={`step ${['analyzing','complete'].includes(status) ? 'active' : ''} ${status === 'complete' ? 'done' : ''}`}>
              <div className="step-icon">3</div>
              <span>Amazon Bedrock</span>
            </div>
            <div className="step-arrow">→</div>
            <div className={`step ${status === 'complete' ? 'active done' : ''}`}>
              <div className="step-icon">4</div>
              <span>Scoring</span>
            </div>
          </div>
        </section>

        {result && (
          <section className="results-section">
            <h2>Resultados</h2>
            <div className="score-main">
              <div className="score-circle" style={{borderColor: getScoreColor(result.score)}}>
                <span className="score-value" style={{color: getScoreColor(result.score)}}>{result.score}</span>
                <span className="score-label">/ 10</span>
              </div>
            </div>

            <div className="scores-grid">
              <div className="score-item">
                <span className="score-name">Fraseología</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${result.fraseologia * 10}%`, background: getScoreColor(result.fraseologia)}}></div>
                </div>
                <span className="score-num">{result.fraseologia}</span>
              </div>
              <div className="score-item">
                <span className="score-name">Claridad</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${result.claridad * 10}%`, background: getScoreColor(result.claridad)}}></div>
                </div>
                <span className="score-num">{result.claridad}</span>
              </div>
              <div className="score-item">
                <span className="score-name">Protocolo</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${result.protocolo * 10}%`, background: getScoreColor(result.protocolo)}}></div>
                </div>
                <span className="score-num">{result.protocolo}</span>
              </div>
              <div className="score-item">
                <span className="score-name">Formalidad</span>
                <div className="score-bar">
                  <div className="score-fill" style={{width: `${result.formalidad * 10}%`, background: getScoreColor(result.formalidad)}}></div>
                </div>
                <span className="score-num">{result.formalidad}</span>
              </div>
            </div>

            <div className="justification">
              <h3>Justificación</h3>
              <p>{result.justification}</p>
            </div>

            {result.errores_detectados.length > 0 && (
              <div className="errors">
                <h3>Errores Detectados</h3>
                <ul>
                  {result.errores_detectados.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="recommendations">
                <h3>Recomendaciones</h3>
                <ul>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Powered by Amazon Web Services</p>
        <p className="services">Amazon Transcribe | Amazon Bedrock | Claude 3.5 Sonnet</p>
      </footer>
    </div>
  );
}

export default App;
