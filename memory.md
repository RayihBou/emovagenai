# Emova - Analítica de Conversaciones

## Contexto del Proyecto

Demo para Emova Movilidad SA (operador del metro de Buenos Aires) para evaluar la calidad de comunicaciones operativas entre operadores usando servicios AWS, integrado con su sistema TETRA existente.

**Fecha de presentación:** 29 de enero de 2026
**Cliente:** Emova Movilidad SA
**Contacto:** Brian Domecq

## Estado Actual: DEMO FUNCIONAL CON DATOS REALES

### URL de la Demo
https://main.d1qfd0b1qv6z20.amplifyapp.com/

### Flujo Implementado (Sesión Completa)
1. Usuario selecciona múltiples archivos WAV + XMLs de una sesión TETRA
2. Archivos se suben a S3
3. Lambda parsea XMLs para obtener metadatos (quién habla cuándo)
4. Cada WAV se transcribe con Amazon Transcribe (es-ES)
5. Transcripciones se enriquecen con metadatos de operadores
6. Bedrock Claude 3.5 Sonnet evalúa la sesión completa
7. Resultados incluyen:
   - Score general y por criterio
   - Timeline de intervenciones
   - Análisis individual por operador
   - Descarga JSON/TXT

## Integración Sistema TETRA

El cliente compartió datos reales de su sistema de radio TETRA:

### Archivos Recibidos (27/01/2026)
- **10 archivos WAV** - Audios de comunicaciones del 28/12/2024
- **Holders.xml** - Directorio de 6 dispositivos móviles
- **CallRefs.xml** - 14 registros de llamadas grupales
- **10 XMLs de recordings** - Detalle de intervenciones

### Estructura de Datos
```
Prueba de audio/
├── audios/
│   ├── 138928171.wav (4 seg)
│   ├── 138928184.wav (10 seg)
│   ├── 138928185.wav (28 seg) ← más largo
│   └── ... (10 archivos total)
├── recordings/
│   ├── 134827077.xml (4 intervenciones)
│   └── ... (10 archivos)
├── Holders.xml (6 dispositivos)
└── CallRefs.xml (14 llamadas)
```

### Mapeo de IDs
| ID | Tipo | Dirección TETRA |
|----|------|-----------------|
| 6752 | Talk Group | 722-80-3701000 |
| 12746 | Mobile | 722-80-3711700 |
| 13544 | Mobile | 722-80-3711003 |
| 14727 | Mobile | 722-80-3711776 |
| 15162 | Mobile | 722-80-3711798 |
| 16435 | Mobile | 722-80-3711810 |

## Recursos AWS Desplegados

| Recurso | Identificador | Región |
|---------|---------------|--------|
| API Gateway | h7llsoo392 | us-east-1 |
| Lambda Analyze Session | emova-analyze-session-dev | us-east-1 |
| Lambda Analyze | emova-analyze-dev | us-east-1 |
| Lambda Upload | emova-upload-url-dev | us-east-1 |
| S3 Bucket | emova-audio-302263078976-dev | us-east-1 |
| Amplify App | d1qfd0b1qv6z20 | us-east-1 |
| CloudFormation Stack | emova-analytics | us-east-1 |

**Tag en todos los recursos:** `Project: EMOVA`

## Endpoints

- **API Base:** https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev
- **Upload URL:** GET /upload-url?filename={path/nombre}
- **Analyze Session:** POST /analyze-session
  ```json
  {
    "audio_keys": ["sessions/123/audios/138928185.wav"],
    "xml_keys": {
      "holders": "sessions/123/Holders.xml",
      "callrefs": "sessions/123/CallRefs.xml",
      "recordings": ["sessions/123/recordings/134827077.xml"]
    }
  }
  ```

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `src/analyze_session_handler.py` | Lambda para sesiones (múltiples WAV+XML) |
| `src/analyze_handler.py` | Lambda individual (legacy) |
| `src/upload_handler.py` | URLs presignadas |
| `frontend/src/App.js` | React con multi-upload y timeline |
| `template.yaml` | SAM template |

## Historial de Cambios

### 2026-01-27
- Recibidos datos reales del cliente (10 WAV + XMLs)
- Creada Lambda analyze_session_handler.py para procesar sesiones
- Frontend actualizado para multi-upload WAV + XML
- Agregado timeline de intervenciones
- Agregado análisis por operador
- Integración con metadatos TETRA

### 2026-01-26
- Demo inicial funcional
- Backend con SAM (API Gateway + Lambdas)
- Frontend con score circular y barras de progreso
- Botones de descarga JSON/TXT

## Pendientes

- [ ] Probar con los 10 audios del cliente como sesión completa
- [ ] Validar que Transcribe detecte correctamente el español argentino
- [ ] Ajustar prompt si es necesario según resultados reales

## Comandos Útiles

```bash
# Desplegar backend
sam build && sam deploy --stack-name emova-analytics --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --tags Project=EMOVA

# Ver logs de Lambda
aws logs tail /aws/lambda/emova-analyze-session-dev --follow

# Disparar build en Amplify
aws amplify start-job --app-id d1qfd0b1qv6z20 --branch-name main --job-type RELEASE --region us-east-1
```

## Notas del Cliente

Del correo de Brian Domecq (27/01/2026):
- **CallRefs**: Información de cada llamada grupal
- **TetraCallRef**: ID que corresponde al nombre del archivo WAV
- **CallingID**: Quien inicia la comunicación
- **TalkingID**: Quien está hablando en cada momento
- **Duration**: Duración de cada transmisión
