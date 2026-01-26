# Emova - Analítica de Conversaciones

Sistema de evaluación de calidad en comunicaciones operativas del metro de Buenos Aires, utilizando servicios de AWS.

## Demo en Vivo

**URL:** https://main.d1qfd0b1qv6z20.amplifyapp.com/

## Arquitectura

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Gateway │────▶│   Lambda    │────▶│  Transcribe │
│  (Amplify)  │     │              │     │             │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘     └─────────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │   Bedrock   │
                                        │ Claude 3.5  │
                                        └─────────────┘
```

## Servicios AWS Utilizados

| Servicio | Uso |
|----------|-----|
| **Amazon Transcribe** | Transcripción de audio a texto (es-ES) |
| **Amazon Bedrock** | Evaluación con Claude 3.5 Sonnet v2 |
| **Amazon S3** | Almacenamiento de audios |
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

## Estructura del Proyecto

```
├── frontend/               # React app
│   ├── src/
│   │   ├── App.js         # Componente principal
│   │   └── App.css        # Estilos
│   └── public/
├── src/                    # Lambdas
│   ├── analyze_handler.py # Transcribe + Bedrock
│   └── upload_handler.py  # URLs presignadas S3
├── config/
│   └── prompts/
│       └── evaluation_prompt.txt
├── docs/
│   ├── cliente/           # PDFs del cliente
│   └── investigacion/     # Documentación técnica
├── template.yaml          # SAM template
├── amplify.yml            # Config Amplify
└── memory.md              # Contexto del proyecto
```

## Recursos Desplegados

- **API Gateway:** https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev
- **S3 Bucket:** emova-audio-302263078976-dev
- **Stack CloudFormation:** emova-analytics
- **Amplify App ID:** d1qfd0b1qv6z20

## Despliegue

### Backend (SAM)
```bash
sam build
sam deploy --stack-name emova-analytics --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --tags Project=EMOVA
```

### Frontend (Amplify)
El frontend se despliega automáticamente con cada push a `main`.

## Funcionalidades

- Subir archivos de audio (MP3, WAV, M4A, OGG)
- Transcripción automática con Amazon Transcribe
- Evaluación con IA usando Claude 3.5 Sonnet
- Visualización de resultados con score circular y barras de progreso
- Descarga de resultados en JSON o TXT
- Diseño responsive y tema oscuro

## Tags

Todos los recursos tienen el tag `Project: EMOVA` para tracking de costos.

## Modelo de IA

**Claude 3.5 Sonnet v2** (`us.anthropic.claude-3-5-sonnet-20241022-v2:0`)

Justificación:
- Balance óptimo costo/calidad para evaluación de texto
- Respuesta rápida (< 5 segundos)
- Suficiente capacidad para análisis de comunicaciones
- No requiere extended thinking para esta tarea

## Repositorio

https://github.com/RayihBou/emovagenai
