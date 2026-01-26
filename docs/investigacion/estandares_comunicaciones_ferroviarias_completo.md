# Metodologías y Estándares de Comunicaciones Ferroviarias Operativas

## 1. Fraseología Oficial Ferroviaria Internacional y Latinoamericana

### Estándares UIC (Unión Internacional de Ferrocarriles)
- **UIC 751-3**: Sistemas de comunicación ferroviaria
- **Principios básicos**: Claridad, brevedad, precisión, confirmación
- **Estructura estándar**: Identificación + Mensaje + Confirmación

### Fraseología Estándar Internacional
**Términos de Confirmación:**
- "Afirmativo" / "Negativo"
- "Copiado" / "Recibido"
- "Confirme" / "Repita"
- "Solicito" / "Autorizo"

**Estructura de Comunicación:**
1. Identificación del emisor
2. Identificación del receptor
3. Mensaje claro y conciso
4. Solicitud de confirmación
5. Confirmación del receptor

### Normativas Latinoamericanas (ALAF)
- Adaptación de estándares UIC para contexto regional
- Incorporación de terminología en español
- Protocolos específicos para sistemas urbanos

## 2. Protocolos de Comunicación Entre Roles

### Conductor ↔ PCO (Puesto Central de Operaciones)

**Comunicaciones Rutinarias:**
- Reporte de posición: "PCO, Tren [número], posición [estación], solicito autorización para continuar"
- Confirmación: "Tren [número], PCO, autorizado para continuar, copiado"

**Comunicaciones de Incidencia:**
- "PCO, Tren [número], reporto [tipo de incidencia] en [ubicación], solicito instrucciones"
- "Tren [número], PCO, copiado incidencia, mantenga posición, confirme"

### Conductor ↔ Personal de Mantenimiento

**Coordinación de Trabajos:**
- "Mantenimiento, Conductor Tren [número], solicito estado de vía en [sector]"
- "Conductor Tren [número], Mantenimiento, vía libre en [sector], copiado"

### PCO ↔ Personal de Mantenimiento

**Autorización de Trabajos:**
- "Mantenimiento, PCO, autorizo inicio de trabajos en [sector], confirme"
- "PCO, Mantenimiento, confirmado inicio de trabajos en [sector], vía bloqueada"

## 3. Estándares de Claridad y Formalidad en Metro/Subte

### Principios de Claridad
1. **Dicción clara**: Pronunciación precisa de cada palabra
2. **Velocidad controlada**: Ritmo pausado y comprensible
3. **Volumen adecuado**: Audible sin ser excesivo
4. **Articulación**: Separación clara entre palabras

### Estándares de Formalidad
1. **Uso de tratamiento formal**: "Usted" en lugar de "vos/tú"
2. **Terminología técnica precisa**: Uso correcto de términos ferroviarios
3. **Estructura protocolaria**: Seguimiento del formato establecido
4. **Ausencia de coloquialismos**: Evitar expresiones informales

### Criterios Específicos para Subte de Buenos Aires
- Identificación obligatoria del rol y número de tren
- Uso de terminología SBASE (Subterráneos de Buenos Aires)
- Confirmación explícita de mensajes críticos
- Reporte inmediato de anomalías

## 4. Mejores Prácticas de la Industria para Comunicaciones de Seguridad

### Principio de Redundancia
- **Doble confirmación**: Mensaje + Confirmación + Re-confirmación
- **Lectura de vuelta**: El receptor repite el mensaje recibido
- **Verificación cruzada**: Confirmación por terceros cuando sea crítico

### Comunicaciones de Emergencia
**Prioridad absoluta:**
- "EMERGENCIA, EMERGENCIA, EMERGENCIA"
- Identificación inmediata del emisor
- Descripción concisa de la situación
- Solicitud específica de acción

**Protocolo de Respuesta:**
1. Confirmación inmediata de recepción
2. Activación de protocolos de emergencia
3. Coordinación con servicios externos si es necesario

### Gestión de Comunicaciones Críticas
- **Tiempo de respuesta**: Máximo 10 segundos para confirmación
- **Claridad obligatoria**: Si no se entiende, solicitar repetición
- **Registro**: Todas las comunicaciones críticas deben ser registradas

## 5. Términos Obligatorios y Su Uso Correcto

### "Afirmativo" / "Negativo"
- **Uso**: Respuesta a preguntas directas o confirmación de instrucciones
- **Ejemplo**: "¿Confirma vía libre?" - "Afirmativo, vía libre confirmada"

### "Copiado" / "Recibido"
- **Uso**: Confirmación de recepción de información
- **Ejemplo**: "Tren 123, reduzca velocidad a 25 km/h" - "Copiado, reduciendo a 25 km/h"

### "Solicito"
- **Uso**: Petición formal de autorización o información
- **Ejemplo**: "PCO, solicito autorización para ingresar a estación Terminal"

### "Confirme"
- **Uso**: Solicitud de verificación o repetición
- **Ejemplo**: "Mantenimiento, confirme finalización de trabajos en vía 2"

### "Repita"
- **Uso**: Solicitud de repetición por falta de claridad
- **Ejemplo**: "PCO, no copié último mensaje, repita por favor"

## 6. Criterios de Evaluación Propuestos (Escala 0-10)

### Fraseología (25% del puntaje total)
- **10 puntos**: Uso perfecto de terminología técnica y términos obligatorios
- **7-9 puntos**: Uso correcto con mínimas omisiones
- **4-6 puntos**: Uso parcial con algunas incorrecciones
- **1-3 puntos**: Uso deficiente de terminología
- **0 puntos**: No usa terminología apropiada

### Claridad (25% del puntaje total)
- **10 puntos**: Dicción perfecta, velocidad adecuada, completamente comprensible
- **7-9 puntos**: Muy claro con mínimas imperfecciones
- **4-6 puntos**: Generalmente claro con algunas dificultades
- **1-3 puntos**: Difícil de entender
- **0 puntos**: Incomprensible

### Protocolo (25% del puntaje total)
- **10 puntos**: Sigue perfectamente la estructura protocolaria
- **7-9 puntos**: Sigue el protocolo con mínimas desviaciones
- **4-6 puntos**: Sigue parcialmente el protocolo
- **1-3 puntos**: Protocolo deficiente
- **0 puntos**: No sigue protocolo

### Formalidad (25% del puntaje total)
- **10 puntos**: Lenguaje completamente formal y profesional
- **7-9 puntos**: Muy formal con mínimas informalidades
- **4-6 puntos**: Generalmente formal
- **1-3 puntos**: Poco formal
- **0 puntos**: Informal o inapropiado

## 7. Implementación del Sistema de Scoring

### Algoritmo de Evaluación
1. **Análisis de transcripción**: Conversión de audio a texto
2. **Detección de términos clave**: Identificación de fraseología obligatoria
3. **Análisis de estructura**: Verificación de protocolo
4. **Evaluación de claridad**: Análisis de calidad de audio y dicción
5. **Cálculo de puntaje final**: Promedio ponderado de los 4 criterios

### Parámetros Técnicos
- **Umbral de ruido**: Máximo aceptable para claridad
- **Velocidad de habla**: Rango óptimo (120-150 palabras por minuto)
- **Pausas**: Identificación de pausas apropiadas
- **Volumen**: Consistencia en el nivel de audio

## 8. Referencias y Fuentes

### Normativas Internacionales
- UIC 751-3: Railway Communication Systems
- EN 50129: Railway Applications - Communication, Signalling and Processing Systems
- IEEE 1474: Standard for Communications-Based Train Control (CBTC)

### Organizaciones de Referencia
- UIC (Union Internationale des Chemins de fer)
- ALAF (Asociación Latinoamericana de Ferrocarriles)
- UITP (Union Internationale des Transports Publics)
- AREMA (American Railway Engineering and Maintenance-of-Way Association)

### Aplicación Específica
- Manual de Operaciones SBASE (Subterráneos de Buenos Aires)
- Protocolos de Comunicación Emova Movilidad SA
- Normativas de Seguridad Ferroviaria Argentina (CNRT)