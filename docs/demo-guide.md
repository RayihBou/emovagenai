# Guía de Demostración - Emova Analítica de Conversaciones

**Fecha de Presentación:** 29 de enero de 2026  
**Cliente:** Emova Movilidad SA (Metro Buenos Aires)  
**URL Demo:** https://main.d1qfd0b1qv6z20.amplifyapp.com/  
**API Endpoint:** https://h7llsoo392.execute-api.us-east-1.amazonaws.com/dev

## 1. Preparación Previa a la Demo

### Verificaciones Técnicas
- [ ] Confirmar acceso a la URL de demo
- [ ] Verificar funcionamiento del API Gateway
- [ ] Comprobar estado de servicios AWS (Transcribe, Bedrock, S3)
- [ ] Preparar archivos de audio de prueba en español
- [ ] Verificar conectividad a internet estable

### Materiales Necesarios
- Laptop con navegador web actualizado
- Archivos de audio de ejemplo (conversaciones operativas del metro)
- Presentación de respaldo con capturas de pantalla
- Documentación técnica de la arquitectura

### Configuración del Entorno
- Abrir la aplicación demo en una pestaña
- Tener la consola de AWS lista (opcional, para mostrar servicios)
- Preparar archivos de audio de diferentes calidades y duraciones

## 2. Pasos de la Demostración

### Paso 1: Introducción de la Solución (5 minutos)
1. Presentar el problema: evaluación de calidad en comunicaciones operativas
2. Mostrar la arquitectura de la solución AWS
3. Explicar los criterios de evaluación:
   - Fraseología (25%)
   - Claridad (25%)
   - Protocolo (25%)
   - Formalidad (25%)

### Paso 2: Demostración en Vivo (10 minutos)
1. **Subida de Audio**
   - Acceder a https://main.d1qfd0b1qv6z20.amplifyapp.com/
   - Seleccionar archivo de audio de ejemplo
   - Explicar que se almacena en S3

2. **Procesamiento**
   - Mostrar indicador de procesamiento
   - Explicar transcripción con AWS Transcribe (es-ES)
   - Mencionar análisis con Bedrock Claude 3.5 Sonnet

3. **Resultados**
   - Mostrar score circular general
   - Explicar barras de progreso por criterio
   - Destacar análisis detallado por categoría

4. **Funcionalidades Adicionales**
   - Demostrar descarga en formato JSON
   - Mostrar descarga en formato TXT
   - Explicar utilidad de cada formato

### Paso 3: Casos de Uso Específicos (5 minutos)
- Evaluación de operadores nuevos
- Monitoreo de calidad en tiempo real
- Análisis de tendencias de comunicación
- Identificación de áreas de mejora

## 3. Puntos Clave a Destacar

### Beneficios Técnicos
- **Escalabilidad:** Arquitectura serverless que se adapta a la demanda
- **Precisión:** AWS Transcribe optimizado para español argentino
- **Inteligencia:** Claude 3.5 Sonnet para análisis contextual avanzado
- **Integración:** API REST para integración con sistemas existentes

### Beneficios Operativos
- **Automatización:** Reduce evaluación manual de comunicaciones
- **Consistencia:** Criterios de evaluación estandarizados
- **Eficiencia:** Procesamiento rápido de múltiples archivos
- **Trazabilidad:** Historial completo de evaluaciones

### Ventajas Competitivas
- **Tecnología AWS:** Infraestructura confiable y segura
- **Especialización:** Adaptado específicamente para el metro
- **Flexibilidad:** Criterios de evaluación configurables
- **Costo-Efectividad:** Modelo de pago por uso

## 4. Preguntas Frecuentes Anticipadas

### Técnicas

**¿Qué precisión tiene la transcripción?**
- AWS Transcribe tiene >95% de precisión para español
- Optimizado para audio de comunicaciones operativas
- Maneja ruido de fondo y múltiples hablantes

**¿Cómo se garantiza la seguridad de los datos?**
- Datos encriptados en tránsito y reposo
- Acceso controlado mediante IAM
- Cumplimiento con regulaciones de privacidad

**¿Puede integrarse con nuestros sistemas actuales?**
- API REST estándar para fácil integración
- Formatos de salida JSON y TXT
- Documentación completa disponible

### Operativas

**¿Cuánto tiempo toma procesar un audio?**
- Archivos de 1-2 minutos: 30-60 segundos
- Procesamiento paralelo para múltiples archivos
- Notificaciones en tiempo real del progreso

**¿Qué tipos de audio soporta?**
- Formatos: MP3, WAV, M4A
- Duración: hasta 30 minutos por archivo
- Calidad mínima recomendada: 16kHz

**¿Los criterios son personalizables?**
- Criterios actuales basados en mejores prácticas
- Posibilidad de ajustar pesos y parámetros
- Nuevos criterios mediante configuración

### Comerciales

**¿Cuál es el modelo de costos?**
- Pago por uso (por minuto de audio procesado)
- Sin costos fijos de infraestructura
- Escalamiento automático según demanda

**¿Qué soporte se incluye?**
- Documentación técnica completa
- Soporte durante implementación
- Monitoreo y mantenimiento continuo

## 5. Troubleshooting Básico

### Problemas de Conectividad
**Síntoma:** La aplicación no carga
- Verificar conexión a internet
- Probar en navegador incógnito
- Limpiar caché del navegador

### Problemas de Subida de Archivos
**Síntoma:** Error al subir audio
- Verificar formato de archivo (MP3, WAV, M4A)
- Comprobar tamaño máximo (50MB)
- Intentar con archivo más pequeño

### Problemas de Procesamiento
**Síntoma:** Procesamiento se queda colgado
- Esperar hasta 2 minutos para archivos largos
- Refrescar la página si es necesario
- Verificar estado de servicios AWS

### Resultados Inesperados
**Síntoma:** Scores muy bajos o altos
- Verificar calidad del audio original
- Comprobar idioma del archivo (debe ser español)
- Revisar si hay ruido excesivo de fondo

### Problemas de Descarga
**Síntoma:** No se pueden descargar resultados
- Verificar que el procesamiento haya terminado
- Probar con diferentes formatos (JSON/TXT)
- Comprobar permisos del navegador para descargas

## Contacto y Soporte

**Equipo Técnico AWS:**
- Arquitecto de Soluciones: [Nombre]
- Email: [email]
- Teléfono: [teléfono]

**Recursos Adicionales:**
- Documentación técnica: [URL]
- Portal de soporte: [URL]
- Repositorio de código: [URL]

---

*Documento preparado para la presentación del 29 de enero de 2026*  
*Versión 1.0 - Emova Movilidad SA*