# Emova - Analítica de Conversaciones

Sistema de evaluación de calidad en comunicaciones operativas del metro de Buenos Aires, utilizando servicios de AWS e integración con sistema TETRA.

## Demo en Vivo

**URL:** https://main.d1qfd0b1qv6z20.amplifyapp.com/

## Arquitectura Asíncrona

**Problema Resuelto:** API Gateway tiene timeout de 29 segundos, pero procesar 10 audios con Transcribe toma varios minutos.

**Solución:** Arquitectura asíncrona con polling para procesamiento en background.

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────────┐
│   Frontend      │────▶│ API Gateway │────▶│ POST /analyze    │
│   (Amplify)     │     │             │     │ session          │
│                 │     │             │     │ (retorna job_id) │
│ - Multi upload  │     │             │     └────────┬─────────┘
│ - Polling UI    │     │             │              │
│ - Estados       │     │             │              ▼
└─────┬───────────┘     │             │       ┌─────────────┐
      │                 │             │       │   Lambda    │
      │ GET /job/{id}   │             │       │ Background  │
      └─────────────────┤             │       │ Processing  │
                        │             │       └─────┬───────┘
                        └─────────────┘             │
                                                    ▼
                                             ┌─────────────┐     ┌─────────────┐
                                             │  Transcribe │────▶│   Bedrock   │
                                             │   (es-ES)   │     │ Claude 3.5  │
                                             └─────────────┘     └─────────────┘
```

### Flujo Asíncrono

1. **Frontend sube archivos** WAV + XMLs a S3
2. **POST /analyze-session** retorna `{job_id}` inmediatamente (<1 seg)
3. **Lambda procesa en background** hasta 15 minutos
4. **Frontend hace polling** cada 5 segundos a GET /job/{job_id}
5. **Cuando status=done** muestra resultados completos

### Estados del Job

| Estado | Descripción |
|--------|-------------|
| `pending` | Job creado, esperando procesamiento |
| `processing` | Lambda ejecutándose en background |
| `done` | Procesamiento completado, resultados disponibles |
| `error` | Error durante el procesamiento |

## Integración con Sistema TETRA

El sistema procesa datos nativos del sistema de radio TETRA de Emova:

| Archivo | Descripción |
|---------|-------------|
| `*.wav` | Audios de comunicaciones (por sesión) |
| `Holders.xml` | Directorio de dispositivos/operadores |
| `CallRefs.xml` | Metadatos de llamadas (quién, cuándo, duración) |
| `recordings/*.xml` | Detalle de intervenciones (quién habla cuándo) |

### Estructura de Datos TETRA

```xml
<!-- CallRefs.xml - Info de cada llamada -->
<callref TetraCallRef="138928185" CallingID="12746" Duration="28" />

<!-- Holders.xml - Directorio de dispositivos -->
<holder ID="12746" TetraAddress="722-80-3711700" Type="Mobile" />

<!-- recordings/134827077.xml - Intervenciones -->
<recording StartDate="28/12/2024 08.43.16" Duration="3" TalkingID="12746" />
```

## Servicios AWS Utilizados

| Servicio | Uso |
|----------|-----|
| **Amazon Transcribe** | Transcripción de audio a texto (es-ES) |
| **Amazon Bedrock** | Evaluación con Claude 3.5 Sonnet v2 |
| **Amazon S3** | Almacenamiento de audios y XMLs |
| **AWS Lambda** | Procesamiento serverless |
| **Amazon API Gateway** | API REST |
| **AWS Amplify** | Hosting del frontend |

## Criterios de Evaluación

Basados en estándares UIC 751-3 y ALAF:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| **Fraseología** | 25% | Uso de términos oficiales (Afirmativo, Copiado, Solicito) |
| **Claridad** | 25% | Mensaje completo, sin ambigüedades |
| **Protocolo** | 25% | Identificación emisor/receptor, estructura correcta |
| **Formalidad** | 25% | Lenguaje profesional, sin coloquialismos |

## Funcionalidades

- **Subida asíncrona:** Múltiples archivos WAV + XML de una sesión
- **Procesamiento en background:** Sin timeouts de API Gateway
- **Polling en tiempo real:** Estados visuales del progreso
- **Transcripción automática:** Amazon Transcribe (es-ES)
- **Enriquecimiento con metadatos TETRA:** Quién habla cuándo
- **Evaluación con IA:** Claude 3.5 Sonnet
- **Visualización de resultados:**
  - Score circular con animación
  - Barras de progreso por criterio
  - Timeline de intervenciones
  - Análisis individual por operador
- **Descarga de resultados:** JSON o TXT

## Estructura del Proyecto

```
├── frontend/               # React app
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   └── App.css        # Estilos
│   └── public/
├── src/                    # Lambdas
│   ├── analyze_session_handler.py  # Análisis asíncrono (múltiples WAV+XML)
│   ├── job_status_handler.py       # Polling de status del job
│   ├── analyze_handler.py          # Análisis individual (legacy)
│   └── upload_handler.py           # URLs presignadas S3
├── config/
│   └── prompts/
│       └── evaluation_prompt.txt
├── docs/
│   ├── cliente/           # PDFs del cliente
│   ├── investigacion/     # Documentación técnica
│   └── demo-guide.md      # Guía de demostración
├── Prueba de audio/       # Datos de prueba del cliente
│   ├── audios/            # Archivos WAV
│   ├── recordings/        # XMLs de intervenciones
│   ├── Holders.xml        # Directorio de dispositivos
│   └── CallRefs.xml       # Metadatos de llamadas
├── template.yaml          # SAM template
├── amplify.yml            # Config Amplify
└── memory.md              # Contexto del proyecto
```

## Recursos Desplegados

- **API Gateway:** https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev
- **S3 Bucket:** emova-audio-302263078976-dev
- **Stack CloudFormation:** emova-analytics
- **Amplify App ID:** d1qfd0b1qv6z20

## Endpoints

| Método | Path | Descripción |
|--------|------|-------------|
| GET | `/upload-url` | Obtener URL presignada para upload |
| POST | `/analyze` | Analizar audio individual (legacy) |
| POST | `/analyze-session` | Iniciar análisis asíncrono de sesión → `{job_id}` |
| GET | `/job/{job_id}` | Obtener status y resultado del job (polling) |

## Despliegue

### Backend (SAM)
```bash
sam build
sam deploy --stack-name emova-analytics --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --tags Project=EMOVA
```

### Frontend (Amplify)
El frontend se despliega automáticamente con cada push a `main`.

## Tags

Todos los recursos tienen el tag `Project: EMOVA` para tracking de costos.

## Repositorio

https://github.com/RayihBou/emovagenai
