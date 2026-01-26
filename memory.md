# Emova - Analítica de Conversaciones

## Contexto del Proyecto

Demo para Emova Movilidad SA (operador del metro de Buenos Aires) para evaluar la calidad de comunicaciones operativas entre operadores usando servicios AWS.

**Fecha de presentación:** 29 de enero de 2026
**Cliente:** Emova Movilidad SA
**Contacto:** Brian Domecq

## Estado Actual: DEMO FUNCIONAL

### URL de la Demo
https://main.d1qfd0b1qv6z20.amplifyapp.com/

### Flujo Implementado
1. Usuario sube archivo de audio
2. Audio se almacena en S3 (URL presignada)
3. Lambda invoca Amazon Transcribe (es-ES)
4. Transcripción se evalúa con Claude 3.5 Sonnet v2
5. Resultados se muestran con visualización gráfica
6. Usuario puede descargar resultados en JSON o TXT

## Recursos AWS Desplegados

| Recurso | Identificador | Región |
|---------|---------------|--------|
| API Gateway | h7llsoo392 | us-east-1 |
| Lambda Analyze | emova-analyze-dev | us-east-1 |
| Lambda Upload | emova-upload-url-dev | us-east-1 |
| S3 Bucket | emova-audio-302263078976-dev | us-east-1 |
| Amplify App | d1qfd0b1qv6z20 | us-east-1 |
| CloudFormation Stack | emova-analytics | us-east-1 |

**Tag en todos los recursos:** `Project: EMOVA`

## Endpoints

- **API Base:** https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev
- **Upload URL:** GET /upload-url?filename={nombre}
- **Analyze:** POST /analyze (body: {audio_key: "input/archivo.mp3"})

## Modelo de IA

**Claude 3.5 Sonnet v2** - `us.anthropic.claude-3-5-sonnet-20241022-v2:0`

## Criterios de Evaluación

Basados en UIC 751-3 y ALAF (25% cada uno):
1. **Fraseología** - Términos oficiales
2. **Claridad** - Mensaje sin ambigüedades
3. **Protocolo** - Identificación y estructura
4. **Formalidad** - Lenguaje profesional

## Repositorio

- **GitHub:** https://github.com/RayihBou/emovagenai
- **Branch:** main
- **Visibilidad:** Público

## Archivos Clave

| Archivo | Descripción |
|---------|-------------|
| `src/analyze_handler.py` | Lambda principal (Transcribe + Bedrock) |
| `src/upload_handler.py` | Lambda para URLs presignadas |
| `frontend/src/App.js` | Componente React principal |
| `frontend/src/App.css` | Estilos del frontend |
| `template.yaml` | SAM template |
| `config/prompts/evaluation_prompt.txt` | Prompt de evaluación |

## Historial de Cambios

### 2026-01-26
- Desplegado backend completo con SAM (API Gateway + Lambdas)
- Configurado CORS en S3 para uploads desde frontend
- Corregido modelo Bedrock para usar inference profile
- Rediseñada visualización de resultados (score circular, barras de progreso)
- Agregados botones de descarga JSON/TXT
- Mejorada área de upload de audio
- Agregado favicon y logo AWS en footer
- Corregido fondo blanco en overscroll
- Limpieza de archivos obsoletos

### Anteriores
- Estructura inicial del proyecto
- Frontend React desplegado en Amplify
- Investigación de estándares UIC 751-3 y ALAF
- Prompt de evaluación optimizado

## Pendientes

- [ ] Obtener audios reales del cliente (solicitados a Brian Domecq)
- [ ] Crear guía de demo (docs/demo-guide.md)
- [ ] Pruebas con audios de comunicaciones ferroviarias reales

## Comandos Útiles

```bash
# Desplegar backend
sam build && sam deploy --stack-name emova-analytics --region us-east-1 --capabilities CAPABILITY_IAM --resolve-s3 --tags Project=EMOVA

# Ver logs de Lambda
aws logs tail /aws/lambda/emova-analyze-dev --follow

# Disparar build en Amplify
aws amplify start-job --app-id d1qfd0b1qv6z20 --branch-name main --job-type RELEASE --region us-east-1
```

## Notas Técnicas

- El bucket S3 tiene CORS configurado para permitir uploads desde cualquier origen
- Las credenciales AWS son temporales (expiran cada 12-24h)
- El frontend usa React con tema oscuro
- Background aplicado a html y body para evitar fondo blanco en overscroll (macOS/iOS)
