# Memory: Demo Analítica de Conversaciones - Emova Movilidad SA

## Fecha Demo: 29 de enero de 2026

## Repositorio
- **Remote:** https://github.com/RayihBou/emovagenai.git
- **Local:** /Users/rayihbou/Documents/APU/Clientes/Emova Movilidad SA/PoC Analítica Conversaciones

---

## Requisitos Críticos de Implementación

### Control de Modificaciones
- Operaciones de lectura/análisis: Ejecutar sin preguntar
- Creación/modificación de archivos: SIEMPRE pedir confirmación antes de ejecutar

### Estructura de Proyecto
**OBLIGATORIO:** Mantener orden estricto en la estructura del proyecto:
- Raíz del proyecto debe estar lo más limpia posible
- Cada archivo debe estar en la carpeta que le corresponde
- Usar convenciones estándar: `src/`, `tests/`, `docs/`, `config/`, etc.
- No mezclar tipos de archivos en la misma carpeta

### Gestión de Tareas (TODO)
**OBLIGATORIO:** Usar TODO list para todas las tareas multi-paso:
- Crear TODO antes de iniciar cualquier desarrollo
- Marcar tareas completadas conforme se avanza
- Actualizar memory.md con tareas realizadas y pendientes
- Mantiene orden de ejecución y sirve como historial del proyecto

### Tagging Obligatorio
**IMPORTANTE:** Todos los recursos AWS desplegados para este proyecto DEBEN incluir el tag:
- **Key:** `Project`
- **Value:** `EMOVA`

Esto aplica a: S3 buckets, Lambda functions, Step Functions, DynamoDB tables, IAM roles, y cualquier otro recurso creado.

---

## Contexto del Cliente

- **Empresa:** Emova Movilidad SA - Concesionaria del sistema de subterráneos de Buenos Aires
- **Operación:** 6 líneas de subte + premetro (red de transporte más importante de Argentina)
- **Cliente AWS desde:** 2023
- **Experiencia previa:** EC2, S3, Bedrock (proyectos de procesamiento de imágenes/video para Censo)
- **Contacto principal:** Brian Domecq (Infrastructure Project Lead)
- **Equipo AWS:** Pablo García (DG), Ivan Gazabon (CSR), Rayih Bou (SA)

---

## Problema a Resolver

Desarrollar un modelo de IA para evaluar la calidad de las comunicaciones de audio entre actores operativos del metro:
- Conductores
- PCO (Puesto Central de Operaciones)
- Mantenimiento
- Señales

### Inputs
- Grabaciones de audio de comunicaciones operativas
- Manual de comunicación de la Universidad de La Plata (estándar de referencia)

### Outputs Esperados
- Modelo autónomo de evaluación
- Sistema de scoring (0-10)
- Reportes con recomendaciones de mejora
- Sistema de mejora continua

### Criterios de Evaluación
- Uso de fraseología oficial ferroviaria ("Afirmativo", "Copiado", etc.)
- Cumplimiento de protocolos ferroviarios
- Claridad de los mensajes
- Formalidad en la comunicación
- Detección de mensajes ambiguos, errores y malentendidos

---

## Arquitectura Propuesta para la Demo

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────────┐
│   Audio     │───▶│   Amazon     │───▶│   Amazon    │───▶│   Amazon    │───▶│  Scoring  │
│   (S3)      │    │  Transcribe  │    │  Comprehend │    │   Bedrock   │    │ Dashboard │
└─────────────┘    └──────────────┘    └─────────────┘    └─────────────┘    └───────────┘
                         │                    │                  │
                         ▼                    ▼                  ▼
                   Transcripción        Sentimiento         Evaluación
                   + Diarización        + Entidades         vs Manual
```

### Servicios AWS Clave

| Servicio | Función | Tag Requerido |
|----------|---------|---------------|
| Amazon S3 | Almacenamiento de audios y manual | Project: EMOVA |
| Amazon Transcribe | Transcripción de audio | Project: EMOVA |
| Amazon Comprehend | Análisis de sentimiento y entidades | Project: EMOVA |
| Amazon Bedrock | Evaluación inteligente contra manual | Project: EMOVA |
| AWS Lambda | Orquestación de procesamiento | Project: EMOVA |
| AWS Step Functions | Workflow de análisis | Project: EMOVA |
| Amazon DynamoDB | Almacenamiento de resultados | Project: EMOVA |
| IAM Roles | Permisos de ejecución | Project: EMOVA |

---

## Estrategia de Demo (29 enero)

### Objetivo
Demostrar un flujo end-to-end funcional que procese un audio de ejemplo y genere un scoring con justificación.

### Componentes Mínimos Viables

1. **Transcripción en vivo**
   - Subir audio de ejemplo a S3
   - Transcribir con Transcribe (mostrar diarización de speakers)
   
2. **Análisis con Bedrock**
   - Prompt engineering para evaluar transcripción vs criterios del manual
   - Generar scoring 0-10 con justificación detallada
   
3. **Visualización simple**
   - Output en formato estructurado (JSON)
   - Opcional: Dashboard básico en Streamlit/Gradio

### Diferenciadores vs Whisper (solución actual)

| Aspecto | Whisper (actual) | AWS (propuesto) |
|---------|------------------|-----------------|
| Escalabilidad | Manual | Automática (serverless) |
| Diarización | Limitada | Nativa en Transcribe |
| Análisis semántico | No incluido | Comprehend + Bedrock |
| Integración | Standalone | Ecosistema AWS completo |
| Mantenimiento | Cliente | AWS managed |
| Costo | Infraestructura fija | Pay-per-use |

---

## MCP Servers para el Proyecto

### Ya Configurados
- **aws-knowledge-mcp-server:** Conocimiento interno AWS
- **awslabs.aws-documentation-mcp-server:** Documentación técnica
- **awslabs.git-repo-research-mcp-server:** Búsqueda semántica (FAISS + Bedrock)

### Configuración de Agentes Kiro
- **Ruta de configuración:** `/Users/rayihbou/.kiro`
- **Agentes:** `/Users/rayihbou/.kiro/agents/`
- **Prompts globales:** `/Users/rayihbou/.kiro/prompts/`

Para activar un MCP server, agregar la configuración en el archivo JSON del agente correspondiente.

### Recomendados para Activar

#### Críticos para el Flujo Principal
| Server | Función | Instalación |
|--------|---------|-------------|
| Bedrock Data Automation | Analiza documentos, imágenes, videos y audio | `uvx awslabs.aws-bedrock-data-automation-mcp-server@latest` |
| Document Loader | Parseo y extracción de contenido (manual) | `uvx awslabs.document-loader-mcp-server@latest` |
| Bedrock KB Retrieval | RAG con Knowledge Bases | `uvx awslabs.bedrock-kb-retrieval-mcp-server@latest` |
| Step Functions | Orquestación del workflow | `uvx awslabs.stepfunctions-tool-mcp-server@latest` |

#### Infraestructura y Desarrollo
| Server | Función | Instalación |
|--------|---------|-------------|
| AWS Serverless | Lifecycle completo con SAM CLI | `uvx awslabs.aws-serverless-mcp-server@latest` |
| DynamoDB | Operaciones y gestión de tablas | `uvx awslabs.dynamodb-mcp-server@latest` |
| Lambda Tool | Ejecutar Lambdas como herramientas | `uvx awslabs.lambda-tool-mcp-server@latest` |
| AWS CDK | Desarrollo IaC con compliance | `uvx awslabs.cdk-mcp-server@latest` |

#### Útiles Adicionales
| Server | Función | Instalación |
|--------|---------|-------------|
| AWS Diagram | Generar diagramas de arquitectura | `uvx awslabs.aws-diagram-mcp-server@latest` |
| AWS IAM | Gestión de roles y políticas | `uvx awslabs.iam-mcp-server@latest` |

### Nota sobre Transcribe y Comprehend
No existen MCP servers específicos. Usar AWS API MCP Server para llamadas CLI directas o Bedrock Data Automation para procesamiento de audio.

---

## Ideas para Demo Ganadora

### 1. Demo Interactiva con Audio Real
- Solicitar a Brian un audio de ejemplo (anonimizado)
- Procesar en vivo durante la reunión
- Mostrar transcripción con identificación de speakers

### 2. Prompt Engineering Especializado
```
Evalúa la siguiente transcripción de comunicación ferroviaria según estos criterios:
1. Uso de fraseología oficial (Afirmativo, Copiado, Recibido)
2. Claridad del mensaje
3. Cumplimiento de protocolo de identificación
4. Formalidad apropiada

Transcripción: {transcripcion}

Genera un scoring de 0-10 y justifica cada punto.
```

### 3. Comparativa Visual
- Mostrar lado a lado: transcripción Whisper vs Transcribe
- Destacar mejoras en diarización y precisión

### 4. Roadmap de Implementación
- Fase 1: PoC (4 semanas) - Flujo básico funcional
- Fase 2: MVP (8 semanas) - Dashboard + integración
- Fase 3: Producción (12 semanas) - Escalabilidad + mejora continua

### 5. Quick Wins
- Mostrar Contact Lens for Amazon Connect como referencia de analítica de conversaciones
- Demostrar capacidades de Bedrock con el manual indexado (RAG)

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Audio de baja calidad | Transcribe tiene noise reduction |
| Jerga ferroviaria específica | Custom vocabulary en Transcribe |
| Manual extenso | Chunking + embeddings para RAG |
| Latencia en procesamiento | Arquitectura asíncrona con Step Functions |

---

## Próximos Pasos

1. [x] Preparar estructura del proyecto
2. [x] Crear README con contexto completo
3. [x] Configurar template SAM
4. [x] Desarrollar Lambda de transcripción
5. [x] Desarrollar Lambda de análisis
6. [x] Configurar bucket S3 para audios de prueba
7. [ ] Probar flujo end-to-end (pendiente audios del cliente)
8. [ ] Documentar instrucciones de demo

## Pendientes con Cliente

**26/01/2026** - Correo enviado a Brian Domecq solicitando archivos de audio de ejemplo para la demo.
- Asunto: "Re: [EXTERNAL] Proyecto analítica de conversaciones"
- Estado: Esperando respuesta

---

## Metodología de Evaluación

### Investigación Realizada
Se investigaron estándares internacionales de comunicaciones ferroviarias:
- **UIC 751-3**: Sistemas de comunicación ferroviaria internacional
- **ALAF**: Normativas latinoamericanas adaptadas para contexto regional
- **Manual Universidad de La Plata**: Referencia específica del cliente

### Criterios de Scoring (0-10)

| Criterio | Peso | Qué evalúa |
|----------|------|------------|
| Fraseología | 25% | Términos oficiales: "Afirmativo", "Copiado", "Solicito", "Confirme", "Repita" |
| Claridad | 25% | Mensaje completo, ubicación exacta, sin ambigüedades |
| Protocolo | 25% | Estructura: Identificación emisor → receptor → mensaje → confirmación |
| Formalidad | 25% | Lenguaje profesional, sin apodos ni coloquialismos |

### Errores Comunes Detectados (del análisis del cliente)
- Uso de apodos: "Pecho", "Claudito", "amigo", "flaco"
- Repetición innecesaria: "copiado, copiado, copiado"
- Expresiones coloquiales: "dale", "le pego un vistazo", "bueno bueno"
- Falta de identificación formal de emisor/receptor
- Mensajes incompletos sin ubicación exacta

### Escala de Puntaje
- **9-10**: Excelente - Comunicación modelo
- **7-8**: Muy bueno - Mínimas desviaciones
- **5-6**: Aceptable - Algunas falencias
- **3-4**: Deficiente - Múltiples errores
- **1-2**: Muy deficiente - No sigue protocolo

---

## Referencias

- Correo: "[EXTERNAL] Proyecto analítica de conversaciones" - Brian Domecq (20/01/2026)
- PDFs: "Proyceto analíticas de comunicaciones.pdf", "Analisis de comunicaciones.pdf"
- Nota Obsidian: "20-01-26 (Kick Off)"
