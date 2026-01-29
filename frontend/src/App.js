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
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const processFiles = (fileList) => {
    const allFiles = Array.from(fileList);
    const wavs = allFiles.filter(f => f.name.toLowerCase().endsWith('.wav'));
    const xmls = allFiles.filter(f => 
      f.name.toLowerCase().endsWith('.xml') && 
      !['holders.xml', 'callrefs.xml'].includes(f.name.toLowerCase())
    );
    const holders = allFiles.find(f => f.name.toLowerCase() === 'holders.xml');
    const callrefs = allFiles.find(f => f.name.toLowerCase() === 'callrefs.xml');
    
    setFiles({ wavs, xmls, holders, callrefs });
    setResult(null);
    setError(null);
  };

  const handleFileChange = (e) => {
    processFiles(e.target.files);
  };

  const handleFolderChange = (e) => {
    processFiles(e.target.files);
  };

  const uploadFile = async (file, prefix) => {
    const res = await fetch(`${API_URL}/upload-url?filename=${prefix}/${encodeURIComponent(file.name)}`);
    const { upload_url, key } = await res.json();
    
    // Determinar content-type que coincida con el presigned URL
    let contentType = 'application/octet-stream';
    if (file.name.toLowerCase().endsWith('.wav')) contentType = 'audio/wav';
    else if (file.name.toLowerCase().endsWith('.xml')) contentType = 'application/xml';
    else if (file.name.toLowerCase().endsWith('.mp3')) contentType = 'audio/mpeg';
    
    await fetch(upload_url, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType }
    });
    return key;
  };

  const pollJobStatus = async (jobId) => {
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/job/${jobId}`);
          const data = await res.json();
          
          if (!res.ok) {
            clearInterval(interval);
            reject(new Error(data.error || 'Error consultando estado del job'));
            return;
          }
          
          setProgress(data.progress || 0);
          
          if (data.status === 'processing') {
            setStatus(`Procesando análisis... ${data.progress || 0}%`);
          } else if (data.status === 'done') {
            clearInterval(interval);
            resolve(data.result);
          } else if (data.status === 'error') {
            clearInterval(interval);
            reject(new Error(data.error || 'Error en el procesamiento'));
          }
        } catch (err) {
          clearInterval(interval);
          reject(err);
        }
      }, 5000);
    });
  };

  const handleAnalyze = async () => {
    if (files.wavs.length === 0) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);
    
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
      
      // 3. Iniciar análisis asíncrono
      setStatus('Iniciando análisis...');
      const analyzeRes = await fetch(`${API_URL}/analyze-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_keys: audioKeys, xml_keys: xmlKeys })
      });
      
      const jobData = await analyzeRes.json();
      
      if (!analyzeRes.ok) {
        throw new Error(jobData.error || 'Error iniciando el análisis');
      }
      
      // 4. Polling hasta completar
      const result = await pollJobStatus(jobData.job_id);
      
      setResult({
        transcript: result.transcript,
        sessionInfo: result.session_info,
        interventions: result.interventions,
        ...result.evaluation
      });
      setStatus('Análisis completado');
      setProgress(100);
      
    } catch (err) {
      setError(err.message);
      setStatus('');
      setProgress(0);
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
    } else if (format === 'html') {
      content = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EMOVA - Reporte de Analisis</title>
  <link rel="icon" href="https://a0.awsstatic.com/libra-css/images/site/fav/favicon.ico">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 20px 40px; display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #7c3aed; }
    .header img { height: 35px; }
    .header h1 { margin: 0; font-size: 1.5rem; font-weight: 500; color: #e2e8f0; }
    .container { max-width: 1200px; margin: 0 auto; padding: 30px 20px; }
    .card { background: #1e293b; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #334155; }
    .score-main { text-align: center; margin-bottom: 40px; }
    .score-circle { width: 200px; height: 200px; margin: 0 auto 20px; position: relative; }
    .score-circle svg { width: 100%; height: 100%; transform: rotate(-90deg); }
    .score-bg { fill: none; stroke: #334155; stroke-width: 8; }
    .score-progress { fill: none; stroke: ${getScoreColor(result.score)}; stroke-width: 8; stroke-linecap: round; }
    .score-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
    .score-value { font-size: 3rem; font-weight: bold; color: ${getScoreColor(result.score)}; }
    .score-max { font-size: 1.5rem; color: #94a3b8; }
    .criteria-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .criteria-item { background: #334155; padding: 16px; border-radius: 8px; }
    .criteria-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .criteria-name { font-weight: 600; }
    .criteria-value { font-weight: bold; font-size: 1.2rem; }
    .criteria-bar { height: 8px; background: #475569; border-radius: 4px; overflow: hidden; }
    .criteria-fill { height: 100%; transition: width 0.3s ease; }
    .session-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .stat { text-align: center; }
    .stat-value { display: block; font-size: 2rem; font-weight: bold; color: #7c3aed; }
    .stat-label { color: #94a3b8; font-size: 0.9rem; }
    .operators-grid { display: grid; gap: 16px; }
    .operator-item { background: #334155; padding: 16px; border-radius: 8px; }
    .operator-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .operator-name { font-weight: 600; }
    .operator-score { font-weight: bold; font-size: 1.1rem; }
    .operator-obs { color: #94a3b8; font-size: 0.9rem; }
    .timeline { max-height: 400px; overflow-y: auto; }
    .timeline-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #334155; }
    .timeline-time { color: #94a3b8; font-size: 0.9rem; }
    .timeline-speaker { font-weight: 500; }
    .timeline-duration { color: #7c3aed; font-size: 0.9rem; }
    .transcript-content { max-height: 400px; overflow-y: auto; background: #334155; padding: 16px; border-radius: 8px; }
    .transcript-line { margin-bottom: 8px; line-height: 1.5; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; line-height: 1.5; }
    h2 { color: #e2e8f0; margin-bottom: 16px; font-size: 1.1rem; font-weight: 600; padding-bottom: 10px; border-bottom: 2px solid #7c3aed; }
    h3 { color: #e2e8f0; margin-bottom: 16px; font-size: 0.95rem; }
    .footer { text-align: center; color: #64748b; font-size: 0.8rem; margin-top: 40px; padding-top: 20px; border-top: 1px solid #334155; }
    .footer img { height: 20px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://a0.awsstatic.com/libra-css/images/logos/aws_smile-header-desktop-en-white_59x35.png" alt="AWS Logo">
    <h1>EMOVA - Reporte de Analisis de Comunicaciones TETRA</h1>
  </div>
  <div class="container">
    <div class="card">
      <h2>Informacion de la Sesion</h2>
      <div class="session-stats">
        <div class="stat">
          <span class="stat-value">${result.sessionInfo?.total_duration || 0}s</span>
          <span class="stat-label">Duracion</span>
        </div>
        <div class="stat">
          <span class="stat-value">${result.sessionInfo?.num_audios || 0}</span>
          <span class="stat-label">Audios</span>
        </div>
        <div class="stat">
          <span class="stat-value">${result.sessionInfo?.num_interventions || 0}</span>
          <span class="stat-label">Intervenciones</span>
        </div>
        <div class="stat">
          <span class="stat-value">${result.sessionInfo?.participants?.length || 0}</span>
          <span class="stat-label">Participantes</span>
        </div>
      </div>
    </div>

    <div class="card score-main">
      <h2>Puntuación General</h2>
      <div class="score-circle">
        <svg viewBox="0 0 100 100">
          <circle class="score-bg" cx="50" cy="50" r="45" />
          <circle class="score-progress" cx="50" cy="50" r="45" 
            style="stroke-dasharray: ${result.score * 28.27} 282.7" />
        </svg>
        <div class="score-text">
          <span class="score-value">${result.score?.toFixed(1)}</span>
          <span class="score-max">/10</span>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Criterios de Evaluación</h2>
      <div class="criteria-grid">
        <div class="criteria-item">
          <div class="criteria-header">
            <span class="criteria-name">Fraseología</span>
            <span class="criteria-value" style="color: ${getScoreColor(result.fraseologia)}">${result.fraseologia}</span>
          </div>
          <div class="criteria-bar">
            <div class="criteria-fill" style="width: ${result.fraseologia * 10}%; background: ${getScoreColor(result.fraseologia)}"></div>
          </div>
        </div>
        <div class="criteria-item">
          <div class="criteria-header">
            <span class="criteria-name">Claridad</span>
            <span class="criteria-value" style="color: ${getScoreColor(result.claridad)}">${result.claridad}</span>
          </div>
          <div class="criteria-bar">
            <div class="criteria-fill" style="width: ${result.claridad * 10}%; background: ${getScoreColor(result.claridad)}"></div>
          </div>
        </div>
        <div class="criteria-item">
          <div class="criteria-header">
            <span class="criteria-name">Protocolo</span>
            <span class="criteria-value" style="color: ${getScoreColor(result.protocolo)}">${result.protocolo}</span>
          </div>
          <div class="criteria-bar">
            <div class="criteria-fill" style="width: ${result.protocolo * 10}%; background: ${getScoreColor(result.protocolo)}"></div>
          </div>
        </div>
        <div class="criteria-item">
          <div class="criteria-header">
            <span class="criteria-name">Formalidad</span>
            <span class="criteria-value" style="color: ${getScoreColor(result.formalidad)}">${result.formalidad}</span>
          </div>
          <div class="criteria-bar">
            <div class="criteria-fill" style="width: ${result.formalidad * 10}%; background: ${getScoreColor(result.formalidad)}"></div>
          </div>
        </div>
      </div>
    </div>

    ${result.analisis_por_operador ? `<div class="card">
      <h2>Análisis por Operador</h2>
      <div class="operators-grid">
        ${Object.entries(result.analisis_por_operador).map(([op, data]) => {
          const score = typeof data === 'number' ? data : (data.score || data.puntuacion || 'N/A');
          const obs = typeof data === 'object' ? (data.observacion || data.comentario || '') : '';
          return `<div class="operator-item">
            <div class="operator-header">
              <span class="operator-name">${op}</span>
              <span class="operator-score" style="color: ${typeof score === 'number' ? getScoreColor(score) : '#94a3b8'}">${score}${typeof score === 'number' ? '/10' : ''}</span>
            </div>
            <p class="operator-obs">${obs}</p>
          </div>`;
        }).join('')}
      </div>
    </div>` : ''}

    ${result.interventions?.length > 0 ? `<div class="card">
      <h2>Timeline de Intervenciones</h2>
      <div class="timeline">
        ${result.interventions.slice(0, 15).map(inv => 
          `<div class="timeline-item">
            <span class="timeline-time">${inv.start?.split(' ')[1] || ''}</span>
            <span class="timeline-speaker">Operador ${inv.talking_id}</span>
            <span class="timeline-duration">${inv.duration}s</span>
          </div>`
        ).join('')}
      </div>
    </div>` : ''}

    ${result.transcript ? `<div class="card">
      <h2>Transcripción</h2>
      <div class="transcript-content">
        ${result.transcript.split('\n').map(line => `<p class="transcript-line">${line}</p>`).join('')}
      </div>
    </div>` : ''}

    <div class="card">
      <h2>Justificación</h2>
      <p>${result.justification}</p>
    </div>

    ${result.errores_detectados?.length > 0 ? `<div class="card">
      <h2>Errores Detectados</h2>
      <ul>
        ${result.errores_detectados.map(err => `<li>${err}</li>`).join('')}
      </ul>
    </div>` : ''}

    ${result.recommendations?.length > 0 ? `<div class="card">
      <h2>Recomendaciones</h2>
      <ul>
        ${result.recommendations.map(rec => `<li>${rec}</li>`).join('')}
      </ul>
    </div>` : ''}
    
    <div class="footer">
      <img src="https://a0.awsstatic.com/libra-css/images/logos/aws_smile-header-desktop-en-white_59x35.png" alt="AWS">
      <p>Powered by AWS Amplify | Amazon API Gateway | AWS Lambda | Amazon S3 | Amazon Transcribe | Amazon Bedrock</p>
      <p style="margin-top: 8px;">Amazon Confidential</p>
    </div>
  </div>
</body>
</html>`;
      type = 'text/html';
      ext = 'html';
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
${result.analisis_por_operador ? Object.entries(result.analisis_por_operador).map(([op, data]) => {
  const score = typeof data === 'number' ? data : (data.score || data.puntuacion || 'N/A');
  const obs = typeof data === 'object' ? (data.observacion || data.comentario || '') : '';
  return `- ${op}: ${score}${typeof score === 'number' ? '/10' : ''} - ${obs}`;
}).join('\n') : 'N/A'}
`;
      type = 'text/plain';
      ext = 'txt';
    }
    
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = format === 'html' ? `reporte-emova-${timestamp}.${ext}` : `${filename}.${ext}`;
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
          <div className="upload-options">
            <div 
              className={`upload-box ${totalFiles > 0 ? 'has-file' : ''}`} 
              onClick={() => folderInputRef.current?.click()}
            >
              <input
                type="file"
                ref={folderInputRef}
                onChange={handleFolderChange}
                webkitdirectory=""
                directory=""
                multiple
                style={{ display: 'none' }}
              />
              <div className="upload-icon">{totalFiles > 0 ? '✓' : '📁'}</div>
              {totalFiles > 0 ? (
                <div className="file-summary">
                  <p><strong>{files.wavs.length}</strong> archivos WAV</p>
                  <p><strong>{files.xmls.length}</strong> archivos XML (recordings)</p>
                  {files.holders && <p>✓ Holders.xml</p>}
                  {files.callrefs && <p>✓ CallRefs.xml</p>}
                </div>
              ) : (
                <>
                  <p>Seleccionar carpeta de sesión</p>
                  <span className="upload-hint">Detecta automáticamente WAV, XML, subcarpetas</span>
                </>
              )}
            </div>
            
            <div className="upload-divider">o</div>
            
            <div 
              className="upload-box upload-box-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".wav,.xml"
                multiple
                style={{ display: 'none' }}
              />
              <div className="upload-icon">📄</div>
              <p>Seleccionar archivos</p>
              <span className="upload-hint">WAV + XML individuales</span>
            </div>
          </div>

          {totalFiles > 0 && (
            <div className="files-detail">
              <details>
                <summary>Ver archivos detectados ({totalFiles})</summary>
                <div className="files-list">
                  {files.wavs.map((f, i) => <span key={`wav-${i}`} className="file-tag wav">{f.name}</span>)}
                  {files.holders && <span className="file-tag xml">Holders.xml</span>}
                  {files.callrefs && <span className="file-tag xml">CallRefs.xml</span>}
                  {files.xmls.map((f, i) => <span key={`xml-${i}`} className="file-tag xml">{f.name}</span>)}
                </div>
              </details>
            </div>
          )}
          
          <button 
            className="analyze-btn" 
            onClick={handleAnalyze}
            disabled={files.wavs.length === 0 || loading}
          >
            {loading ? 'Procesando...' : `Analizar Sesión (${files.wavs.length} audios)`}
          </button>
          
          {status && (
            <div className="status-container">
              <p className="status">{status}</p>
              {loading && progress > 0 && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                  <span className="progress-text">{progress}%</span>
                </div>
              )}
            </div>
          )}
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
                <button className="download-btn" onClick={() => downloadResult('html')}>
                  Descargar Reporte HTML
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
                  {Object.entries(result.analisis_por_operador).map(([op, data], i) => {
                    const score = typeof data === 'number' ? data : (data.score || data.puntuacion || 'N/A');
                    const obs = typeof data === 'object' ? (data.observacion || data.comentario || '') : '';
                    return (
                      <div className="operator-item" key={i}>
                        <div className="operator-header">
                          <span className="operator-name">{op}</span>
                          <span className="operator-score" style={{ color: typeof score === 'number' ? getScoreColor(score) : '#94a3b8' }}>
                            {score}{typeof score === 'number' ? '/10' : ''}
                          </span>
                        </div>
                        <p className="operator-obs">{obs}</p>
                      </div>
                    );
                  })}
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
        <p className="services">AWS Amplify | Amazon API Gateway | AWS Lambda | Amazon S3 | Amazon Transcribe | Amazon Bedrock</p>
      </footer>
    </div>
  );
}

export default App;
