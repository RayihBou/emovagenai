import React, { useState, useRef } from 'react';
import './App.css';

const API_URL = 'https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev';
const LOGO_EMOVA = 'https://emova.com.ar/wp-content/uploads/2023/09/aplicacion-ppal-logotag-concesionario-digital-footer-web.png';
const LOGO_GOBIERNO = 'https://www.argentina.gob.ar/profiles/argentinagobar/themes/argentinagobar/argentinagobar_theme/logo_argentina-azul.svg';
const LOGO_AWS = 'https://a0.awsstatic.com/libra-css/images/logos/aws_smile-header-desktop-en-white_59x35.png';

function App() {
  const [files, setFiles] = useState({ wavs: [], xmls: [], holders: null, callrefs: null });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const wavs = selectedFiles.filter(f => f.name.endsWith('.wav'));
    const xmls = selectedFiles.filter(f => f.name.endsWith('.xml') && !['Holders.xml', 'CallRefs.xml'].includes(f.name));
    const holders = selectedFiles.find(f => f.name === 'Holders.xml');
    const callrefs = selectedFiles.find(f => f.name === 'CallRefs.xml');
    
    setFiles({ wavs, xmls, holders, callrefs });
    setResult(null);
    setError(null);
  };

  const uploadFile = async (file, prefix) => {
    const res = await fetch(`${API_URL}/upload-url?filename=${prefix}/${encodeURIComponent(file.name)}`);
    const { upload_url, key } = await res.json();
    await fetch(upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type || 'application/octet-stream' }
    });
    return key;
  };

  const handleAnalyze = async () => {
    if (files.wavs.length === 0) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const sessionId = Date.now();
      
      // 1. Subir WAVs
      setStatus(`Subiendo ${files.wavs.length} archivos de audio...`);
      const audioKeys = await Promise.all(
        files.wavs.map(f => uploadFile(f, `sessions/${sessionId}/audios`))
      );
      
      // 2. Subir XMLs
      const xmlKeys = { recordings: [] };
      
      if (files.holders) {
        setStatus('Subiendo metadatos (Holders.xml)...');
        xmlKeys.holders = await uploadFile(files.holders, `sessions/${sessionId}`);
      }
      
      if (files.callrefs) {
        setStatus('Subiendo metadatos (CallRefs.xml)...');
        xmlKeys.callrefs = await uploadFile(files.callrefs, `sessions/${sessionId}`);
      }
      
      if (files.xmls.length > 0) {
        setStatus(`Subiendo ${files.xmls.length} archivos de recordings...`);
        xmlKeys.recordings = await Promise.all(
          files.xmls.map(f => uploadFile(f, `sessions/${sessionId}/recordings`))
        );
      }
      
      // 3. Analizar sesión
      setStatus('Analizando sesión completa (esto puede tomar varios minutos)...');
      const analyzeRes = await fetch(`${API_URL}/analyze-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_keys: audioKeys, xml_keys: xmlKeys })
      });
      
      const data = await analyzeRes.json();
      
      if (!analyzeRes.ok) {
        throw new Error(data.error || 'Error en el análisis');
      }
      
      setResult({
        transcript: data.transcript,
        sessionInfo: data.session_info,
        interventions: data.interventions,
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
    const filename = `emova_sesion_${timestamp}`;
    
    let content, type, ext;
    if (format === 'json') {
      content = JSON.stringify({ fecha: new Date().toISOString(), ...result }, null, 2);
      type = 'application/json';
      ext = 'json';
    } else {
      content = `ANÁLISIS DE SESIÓN - EMOVA
================================
Fecha: ${new Date().toLocaleString()}
Duración total: ${result.sessionInfo?.total_duration || 0} segundos
Archivos analizados: ${result.sessionInfo?.num_audios || 0}
Intervenciones: ${result.sessionInfo?.num_interventions || 0}
Participantes: ${result.sessionInfo?.participants?.join(', ') || 'N/A'}

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

ANÁLISIS POR OPERADOR:
${result.analisis_por_operador ? Object.entries(result.analisis_por_operador).map(([op, data]) => 
  `- ${op}: ${data.score}/10 - ${data.observacion}`).join('\n') : 'N/A'}
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

  const totalFiles = files.wavs.length + files.xmls.length + (files.holders ? 1 : 0) + (files.callrefs ? 1 : 0);

  return (
    <div className="app">
      <header className="header">
        <div className="logos">
          <img src={LOGO_EMOVA} alt="Emova" className="logo-emova" />
          <img src={LOGO_GOBIERNO} alt="Gobierno Argentina" className="logo-gobierno" />
        </div>
        <h1>Analítica de Conversaciones</h1>
        <p className="subtitle">Evaluación de calidad en comunicaciones operativas - Sistema TETRA</p>
      </header>

      <main className="main">
        <section className="upload-section">
          <div 
            className={`upload-box ${totalFiles > 0 ? 'has-file' : ''}`} 
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".wav,.xml"
              multiple
            />
            <div className="upload-icon">{totalFiles > 0 ? '✓' : '📁'}</div>
            {totalFiles > 0 ? (
              <div className="file-summary">
                <p>{files.wavs.length} archivos WAV</p>
                <p>{files.xmls.length} archivos XML (recordings)</p>
                {files.holders && <p>Holders.xml</p>}
                {files.callrefs && <p>CallRefs.xml</p>}
              </div>
            ) : (
              <>
                <p>Selecciona los archivos de la sesión</p>
                <span className="upload-hint">WAV (audios) + XML (Holders, CallRefs, recordings)</span>
              </>
            )}
          </div>
          
          <button 
            className="analyze-btn" 
            onClick={handleAnalyze}
            disabled={files.wavs.length === 0 || loading}
          >
            {loading ? 'Procesando...' : `Analizar Sesión (${files.wavs.length} audios)`}
          </button>
          
          {status && <p className="status">{status}</p>}
          {error && <p className="error">{error}</p>}
        </section>

        {result && (
          <section className="results-section">
            {/* Info de sesión */}
            <div className="session-info-card">
              <h3>Información de la Sesión</h3>
              <div className="session-stats">
                <div className="stat">
                  <span className="stat-value">{result.sessionInfo?.total_duration || 0}s</span>
                  <span className="stat-label">Duración</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{result.sessionInfo?.num_audios || 0}</span>
                  <span className="stat-label">Audios</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{result.sessionInfo?.num_interventions || 0}</span>
                  <span className="stat-label">Intervenciones</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{result.sessionInfo?.participants?.length || 0}</span>
                  <span className="stat-label">Participantes</span>
                </div>
              </div>
            </div>

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
              <div className="score-circle" style={{ '--score-color': getScoreColor(result.score) }}>
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

            {/* Criterios */}
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

            {/* Timeline de intervenciones */}
            {result.interventions?.length > 0 && (
              <div className="card timeline-card">
                <h3>Timeline de Intervenciones</h3>
                <div className="timeline">
                  {result.interventions.slice(0, 15).map((inv, i) => (
                    <div className="timeline-item" key={i}>
                      <span className="timeline-time">{inv.start?.split(' ')[1] || ''}</span>
                      <span className="timeline-speaker">Operador {inv.talking_id}</span>
                      <span className="timeline-duration">{inv.duration}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Análisis por operador */}
            {result.analisis_por_operador && (
              <div className="card operators-card">
                <h3>Análisis por Operador</h3>
                <div className="operators-grid">
                  {Object.entries(result.analisis_por_operador).map(([op, data], i) => (
                    <div className="operator-item" key={i}>
                      <div className="operator-header">
                        <span className="operator-name">{op}</span>
                        <span className="operator-score" style={{ color: getScoreColor(data.score) }}>
                          {data.score}/10
                        </span>
                      </div>
                      <p className="operator-obs">{data.observacion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcripción */}
            {result.transcript && (
              <div className="card transcript-card">
                <h3>Transcripción</h3>
                <div className="transcript-content">
                  {result.transcript.split('\n').map((line, i) => (
                    <p key={i} className="transcript-line">{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Justificación */}
            <div className="card justification-card">
              <h3>Justificación</h3>
              <p>{result.justification}</p>
            </div>

            {/* Errores y Recomendaciones */}
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
