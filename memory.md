# Emova - Analítica de Conversaciones

## Contexto del Proyecto

Demo para Emova Movilidad SA (operador del metro de Buenos Aires) para evaluar la calidad de comunicaciones operativas entre operadores usando servicios AWS, integrado con su sistema TETRA existente.

**Fecha de presentación:** 29 de enero de 2026
**Cliente:** Emova Movilidad SA
**Contacto:** Brian Domecq

## Estado Actual: ARQUITECTURA ASINCRONA IMPLEMENTADA

### URL de la Demo
https://main.d1qfd0b1qv6z20.amplifyapp.com/

### Problema Resuelto
**Problema:** API Gateway tiene timeout de 29 segundos, pero procesar 10 audios con Transcribe toma varios minutos.

**Solución:** Arquitectura asíncrona con polling.

### Flujo Asíncrono Implementado
1. **Frontend sube archivos:** WAV + XMLs a S3
2. **POST /analyze-session:** Recibe archivos, guarda job en S3, invoca Lambda async, retorna job_id inmediatamente (<1 seg)
3. **Lambda background:** Procesa audios con Transcribe, evalúa con Bedrock, guarda resultado en S3 (hasta 15 min)
4. **GET /job/{job_id}:** Frontend hace polling cada 5 seg, retorna status y resultado
5. **Cuando status=done:** Muestra resultados completos

### Estados del Job
- **pending:** Job creado, esperando procesamiento
- **processing:** Lambda ejecutándose en background
- **done:** Procesamiento completado, resultados disponibles
- **error:** Error durante el procesamiento

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
- **Analyze Session (Async):** POST /analyze-session
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
  **Respuesta:** `{"job_id": "uuid-123"}`

- **Job Status (Polling):** GET /job/{job_id}
  ```json
  {
    "status": "done",
    "result": {...},
    "progress": "8/10 audios procesados"
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

### 2026-01-28
- **ARQUITECTURA ASINCRONA:** Implementada para resolver timeout de API Gateway
- Nuevo endpoint GET /job/{job_id} para polling de status
- Lambda procesa en background hasta 15 minutos
- Frontend con polling cada 5 segundos
- Estados: pending → processing → done/error

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

- [ ] Implementar nueva Lambda job_status_handler.py
- [ ] Actualizar analyze_session_handler.py para procesamiento asíncrono
- [ ] Modificar frontend para polling con estados visuales
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
