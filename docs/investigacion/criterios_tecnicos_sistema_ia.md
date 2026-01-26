# Criterios Técnicos para Sistema de IA - Evaluación de Comunicaciones Operativas
## Emova Movilidad SA - Subte de Buenos Aires

### Matriz de Evaluación Automatizada (0-10)

## 1. FRASEOLOGÍA (25% del puntaje total)

### Términos Obligatorios a Detectar:
```
CONFIRMACIÓN:
- "Afirmativo" / "Negativo"
- "Copiado" / "Recibido"
- "Confirmado" / "No confirmado"

SOLICITUD:
- "Solicito"
- "Requiero"
- "Necesito autorización"

VERIFICACIÓN:
- "Confirme"
- "Repita"
- "Verifique"

IDENTIFICACIÓN:
- "Tren [número]"
- "PCO"
- "Mantenimiento"
- "Conductor"
```

### Algoritmo de Scoring - Fraseología:
```python
def evaluar_fraseologia(transcripcion):
    terminos_obligatorios = ["afirmativo", "negativo", "copiado", "recibido", 
                           "solicito", "confirme", "repita"]
    terminos_encontrados = 0
    
    for termino in terminos_obligatorios:
        if termino.lower() in transcripcion.lower():
            terminos_encontrados += 1
    
    # Identificación de roles
    roles = ["tren", "pco", "conductor", "mantenimiento"]
    identificacion_correcta = any(rol in transcripcion.lower() for rol in roles)
    
    puntaje_base = (terminos_encontrados / len(terminos_obligatorios)) * 8
    puntaje_identificacion = 2 if identificacion_correcta else 0
    
    return min(10, puntaje_base + puntaje_identificacion)
```

## 2. CLARIDAD (25% del puntaje total)

### Parámetros Técnicos de Audio:
```
CALIDAD DE AUDIO:
- SNR (Signal-to-Noise Ratio): Mínimo 20 dB
- Frecuencia de muestreo: 16 kHz mínimo
- Distorsión armónica: < 3%

CARACTERÍSTICAS DE VOZ:
- Velocidad de habla: 120-150 palabras/minuto (óptimo)
- Pausas entre palabras: 100-300 ms
- Volumen consistente: Variación < 6 dB
```

### Algoritmo de Scoring - Claridad:
```python
def evaluar_claridad(audio_features, transcripcion_confidence):
    # Análisis de calidad de audio
    snr_score = min(10, (audio_features['snr'] / 25) * 10)
    
    # Confianza de transcripción (Speech-to-Text)
    confidence_score = transcripcion_confidence * 10
    
    # Velocidad de habla
    wpm = audio_features['words_per_minute']
    if 120 <= wpm <= 150:
        speed_score = 10
    elif 100 <= wpm < 120 or 150 < wpm <= 180:
        speed_score = 7
    else:
        speed_score = max(0, 10 - abs(wpm - 135) * 0.1)
    
    # Consistencia de volumen
    volume_variance = audio_features['volume_variance']
    volume_score = max(0, 10 - volume_variance)
    
    return (snr_score + confidence_score + speed_score + volume_score) / 4
```

## 3. PROTOCOLO (25% del puntaje total)

### Estructura Protocolaria Obligatoria:
```
COMUNICACIÓN ESTÁNDAR:
1. Identificación del emisor
2. Identificación del receptor  
3. Mensaje principal
4. Solicitud de confirmación
5. Confirmación del receptor

EJEMPLO CORRECTO:
"PCO, Tren 123, reporto llegada a Estación Constitución, solicito autorización para continuar"
"Tren 123, PCO, copiado llegada Constitución, autorizado para continuar"
```

### Patrones de Protocolo a Detectar:
```regex
PATRÓN IDENTIFICACIÓN: 
r"(PCO|Tren \d+|Conductor|Mantenimiento).*(PCO|Tren \d+|Conductor|Mantenimiento)"

PATRÓN SOLICITUD:
r"(solicito|requiero|necesito).*(autorización|confirmación|instrucciones)"

PATRÓN CONFIRMACIÓN:
r"(copiado|recibido|confirmado|afirmativo)"
```

### Algoritmo de Scoring - Protocolo:
```python
def evaluar_protocolo(transcripcion):
    elementos_protocolo = {
        'identificacion_emisor': r"^(PCO|Tren \d+|Conductor|Mantenimiento)",
        'identificacion_receptor': r"(PCO|Tren \d+|Conductor|Mantenimiento)",
        'mensaje_claro': len(transcripcion.split()) >= 5,
        'solicitud_confirmacion': r"(solicito|confirme|copiado)",
        'estructura_ordenada': True  # Análisis de orden lógico
    }
    
    puntaje = 0
    for elemento, patron in elementos_protocolo.items():
        if isinstance(patron, str):
            if re.search(patron, transcripcion, re.IGNORECASE):
                puntaje += 2
        elif patron:  # Para elementos booleanos
            puntaje += 2
    
    return min(10, puntaje)
```

## 4. FORMALIDAD (25% del puntaje total)

### Indicadores de Formalidad:
```
POSITIVOS (+):
- Uso de "usted" en lugar de "vos/tú"
- Terminología técnica precisa
- Ausencia de muletillas ("eh", "este", "bueno")
- Lenguaje profesional

NEGATIVOS (-):
- Coloquialismos o jerga
- Interrupciones o solapamientos
- Tono informal
- Expresiones no profesionales
```

### Diccionario de Términos:
```python
TERMINOS_FORMALES = [
    "usted", "solicito", "requiero", "autorización", 
    "confirmación", "procedimiento", "protocolo"
]

TERMINOS_INFORMALES = [
    "vos", "che", "dale", "bueno", "este", "eh",
    "ok", "bárbaro", "perfecto", "genial"
]

MULETILLAS = [
    "eh", "este", "bueno", "o sea", "digamos", "ponele"
]
```

### Algoritmo de Scoring - Formalidad:
```python
def evaluar_formalidad(transcripcion):
    palabras = transcripcion.lower().split()
    
    # Contar términos formales
    formales = sum(1 for palabra in palabras if palabra in TERMINOS_FORMALES)
    
    # Penalizar términos informales
    informales = sum(1 for palabra in palabras if palabra in TERMINOS_INFORMALES)
    
    # Penalizar muletillas
    muletillas = sum(1 for palabra in palabras if palabra in MULETILLAS)
    
    # Calcular puntaje
    puntaje_base = min(10, (formales / len(palabras)) * 50)
    penalizacion = (informales + muletillas) * 0.5
    
    return max(0, puntaje_base - penalizacion)
```

## 5. SISTEMA INTEGRADO DE EVALUACIÓN

### Función Principal de Scoring:
```python
def evaluar_comunicacion_completa(audio_file, transcripcion, audio_features, confidence):
    # Calcular puntajes individuales
    fraseologia = evaluar_fraseologia(transcripcion)
    claridad = evaluar_claridad(audio_features, confidence)
    protocolo = evaluar_protocolo(transcripcion)
    formalidad = evaluar_formalidad(transcripcion)
    
    # Ponderación (25% cada criterio)
    puntaje_final = (fraseologia + claridad + protocolo + formalidad) / 4
    
    # Generar reporte detallado
    reporte = {
        'puntaje_total': round(puntaje_final, 2),
        'fraseologia': round(fraseologia, 2),
        'claridad': round(claridad, 2),
        'protocolo': round(protocolo, 2),
        'formalidad': round(formalidad, 2),
        'recomendaciones': generar_recomendaciones(fraseologia, claridad, protocolo, formalidad)
    }
    
    return reporte
```

## 6. UMBRALES DE CALIDAD

### Clasificación por Puntaje:
```
EXCELENTE: 9.0 - 10.0
- Comunicación perfecta según estándares
- Cumple todos los protocolos
- Máxima claridad y formalidad

MUY BUENO: 7.5 - 8.9
- Comunicación muy efectiva
- Mínimas mejoras necesarias
- Cumple estándares operativos

BUENO: 6.0 - 7.4
- Comunicación aceptable
- Algunas áreas de mejora identificadas
- Requiere atención en aspectos específicos

REGULAR: 4.0 - 5.9
- Comunicación deficiente
- Múltiples áreas de mejora
- Requiere entrenamiento adicional

DEFICIENTE: 0.0 - 3.9
- Comunicación inaceptable
- No cumple estándares mínimos
- Requiere intervención inmediata
```

## 7. IMPLEMENTACIÓN TÉCNICA

### Stack Tecnológico Recomendado:
```
PROCESAMIENTO DE AUDIO:
- librosa (análisis de audio)
- scipy (procesamiento de señales)
- webrtcvad (detección de actividad vocal)

SPEECH-TO-TEXT:
- Google Cloud Speech-to-Text
- AWS Transcribe
- Azure Speech Services

PROCESAMIENTO DE TEXTO:
- spaCy (NLP en español)
- NLTK (análisis de texto)
- regex (patrones de protocolo)

MACHINE LEARNING:
- scikit-learn (clasificación)
- TensorFlow/PyTorch (modelos avanzados)
```

### Pipeline de Procesamiento:
```
1. INGESTA DE AUDIO
   ↓
2. PREPROCESAMIENTO
   - Normalización de volumen
   - Reducción de ruido
   - Segmentación
   ↓
3. ANÁLISIS DE CARACTERÍSTICAS
   - Extracción de features de audio
   - Detección de calidad
   ↓
4. TRANSCRIPCIÓN
   - Speech-to-Text
   - Confidence scoring
   ↓
5. ANÁLISIS DE TEXTO
   - Detección de patrones
   - Análisis de protocolo
   ↓
6. EVALUACIÓN INTEGRADA
   - Cálculo de puntajes
   - Generación de reporte
   ↓
7. ALMACENAMIENTO Y REPORTE
```

Este documento proporciona los criterios técnicos específicos para implementar el sistema de evaluación automatizada de comunicaciones operativas del subte de Buenos Aires, basado en estándares internacionales de comunicación ferroviaria y adaptado al contexto local de Emova Movilidad SA.