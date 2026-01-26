# Analítica de Conversaciones - Emova Movilidad SA

Sistema de evaluación de calidad de comunicaciones de audio para operadores del metro de Buenos Aires utilizando servicios de AWS.

## Contexto

Emova Movilidad SA opera la red de transporte subterráneo más importante de Argentina (6 líneas de subte + premetro). Este proyecto desarrolla un modelo de IA para evaluar la calidad de las comunicaciones de audio entre actores operativos:

- Conductores
- PCO (Puesto Central de Operaciones)
- Mantenimiento
- Señales

### Objetivo

Evaluar grabaciones de audio contra el manual de comunicación de la Universidad de La Plata, generando un scoring (0-10) con justificación detallada.

### Criterios de Evaluación

El sistema evalúa las comunicaciones según estándares UIC 751-3 y normativas ALAF:

| Criterio | Peso | Descripción |
|----------|------|-------------|
| Fraseología | 25% | Uso de términos oficiales: "Afirmativo", "Copiado", "Solicito", "Confirme" |
| Claridad | 25% | Mensaje completo, sin ambigüedades, ubicación exacta |
| Protocolo | 25% | Estructura: Identificación → Mensaje → Confirmación |
| Formalidad | 25% | Lenguaje profesional, sin apodos ni coloquialismos |

**Escala de scoring:**
- 9-10: Excelente (comunicación modelo)
- 7-8: Muy bueno (mínimas desviaciones)
- 5-6: Aceptable (algunas falencias)
- 3-4: Deficiente (múltiples errores)
- 1-2: Muy deficiente (no sigue protocolo)

**Errores comunes penalizados:**
- Uso de apodos ("Pecho", "Claudito", "amigo")
- Repetición innecesaria ("copiado, copiado, copiado")
- Falta de identificación de emisor/receptor
- Expresiones coloquiales ("dale", "le pego un vistazo")

## Arquitectura

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌───────────┐
│   Audio     │───▶│   Amazon     │───▶│   Amazon    │───▶│  Scoring  │
│   (S3)      │    │  Transcribe  │    │   Bedrock   │    │   JSON    │
└─────────────┘    └──────────────┘    └─────────────┘    └───────────┘
      │                   │                   │
      ▼                   ▼                   ▼
   Trigger           Transcripción       Evaluación
   Lambda            + Diarización       vs Manual
```

## Servicios AWS

| Servicio | Función |
|----------|---------|
| Amazon S3 | Almacenamiento de audios |
| Amazon Transcribe | Transcripción de audio (es-ES, speaker diarization) |
| Amazon Bedrock | Evaluación inteligente contra manual (Claude 3.5 Sonnet) |
| AWS Lambda | Procesamiento serverless |
| IAM | Roles y permisos |

### Selección de Modelo LLM

Se utiliza **Claude 3.5 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0`) por:

- Balance óptimo costo/calidad para análisis de texto estructurado
- Respuesta rápida (~3-5s) ideal para demos en vivo
- Costo: $3/1M input, $15/1M output

Alternativas consideradas:
- Claude 4 Sonnet: Similar costo, mejor para sub-agentes (no necesario aquí)
- Claude 4.5 Opus: Más potente pero 40% más costoso, para agentes multi-step

## Estructura del Proyecto

```
├── src/                    # Código fuente
│   ├── transcribe_handler.py
│   └── analysis_handler.py
├── docs/                   # Documentación
│   ├── cliente/            # Documentos del cliente
│   └── investigacion/      # Estándares y criterios técnicos
├── config/
│   └── prompts/            # Prompts para Bedrock
├── scripts/                # Scripts de utilidad
├── template.yaml           # SAM template
├── README.md
└── memory.md               # Contexto del proyecto
```

## Documentación Técnica

- `docs/investigacion/estandares_comunicaciones_ferroviarias_completo.md` - Estándares UIC y ALAF
- `docs/investigacion/criterios_tecnicos_sistema_ia.md` - Matriz de evaluación automatizada
- `docs/cliente/` - Documentos originales del cliente

## Requisitos

- AWS CLI configurado
- SAM CLI instalado
- Python 3.11+
- Acceso a Amazon Bedrock (Claude habilitado)

## Despliegue

```bash
# Construir
sam build

# Desplegar
sam deploy --guided
```

Todos los recursos se crean con el tag `Project: EMOVA`.

## Uso

1. Subir archivo de audio (.mp3, .wav) al bucket S3 en `input/`
2. Lambda de transcripción se ejecuta automáticamente
3. Lambda de análisis evalúa la transcripción
4. Resultado JSON con scoring disponible en `results/`

## Output Ejemplo

```json
{
  "transcription_key": "transcriptions/comunicacion_001.json",
  "transcript": "...",
  "evaluation": {
    "score": 8,
    "fraseologia": 9,
    "claridad": 8,
    "protocolo": 7,
    "formalidad": 8,
    "justification": "...",
    "errores_detectados": [],
    "recommendations": []
  }
}
```

## Documentación del Cliente

- `docs/cliente/Proyceto analíticas de comunicaciones.pdf` - Alcance del proyecto
- `docs/cliente/Analisis de comunicaciones.pdf` - Ejemplos de análisis

## Contacto

- **Cliente:** Brian Domecq (Infrastructure Project Lead) - Emova Movilidad SA
- **AWS:** Rayih Bou (Solutions Architect)
