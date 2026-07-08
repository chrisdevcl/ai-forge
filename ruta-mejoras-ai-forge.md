# Ruta de mejoras — AI Forge

Documento de trabajo para que Claude Code ejecute la evolución del sitio. Objetivo: incorporar niveles Básico / Intermedio / Avanzado y reescribir el contenido para que cualquier persona lo entienda, sin perder precisión técnica.

## 1. Diagnóstico del estado actual

El sitio (`index.html`, `js/data.js`, `js/ui.js`, `js/app.js`) es una SPA con 43 tarjetas repartidas en 7 categorías temáticas (Fundamentos, Agentes, Mitos, Tips, Buenas prácticas, Malas prácticas, Trucos). El contenido es correcto y denso, pero estructurado como si el lector ya fuera desarrollador: asume conocimiento previo de tokens, API, JSON, embeddings, RLHF, prompt injection, etc., sin definir esos términos la primera vez que aparecen.

Hoy no existe ninguna noción de dificultad. Todas las tarjetas se presentan al mismo nivel, mezclando en la misma categoría contenido apto para cualquier usuario (ej. "la IA no aprende de mis conversaciones") con contenido de arquitectura de producción (ej. "prompt caching y costo por millón de tokens"). Eso hace que alguien sin bagaje técnico no sepa por dónde empezar, y que quien enseña estos conceptos no tenga un camino ordenado para guiar a otros.

Los ejemplos existentes son buenos pero mayormente técnicos (bloques JSON, XML, API calls). Faltan analogías cotidianas para quien nunca escribió una línea de código.

## 2. Definición de los tres niveles

Estos criterios son los que Claude Code debe aplicar para clasificar y también para reescribir cada tarjeta.

**Básico** — para cualquier persona que usa ChatGPT, Claude o Copilot sin conocimiento técnico. Cero jerga sin explicar. Cada término técnico que aparezca por primera vez se define en la misma oración con una analogía cotidiana. Los ejemplos son de uso diario (escribir un email, pedir un resumen, chatear), nunca código ni API. Objetivo: que la persona entienda qué pasa "detrás" y evite errores comunes.

**Intermedio** — para quien usa la IA de forma habitual y con intención: escribe prompts con cuidado, arma flujos de trabajo, evalúa herramientas, pero no necesariamente programa. Se puede usar vocabulario técnico si se define brevemente al introducirlo. Los ejemplos combinan uso cotidiano con casos de prompting más elaborado (few-shot, formato de salida, cadenas de prompts). Objetivo: que la persona pueda diseñar prompts y procesos más sofisticados con criterio.

**Avanzado** — para quien construye sobre la API o integra IA en sistemas: developers, arquitectos, equipos de producto técnico. Vocabulario técnico sin necesidad de redefinir lo ya cubierto en básico/intermedio (aunque sí se puede enlazar al glosario). Ejemplos con código, JSON, parámetros de API, arquitectura. Objetivo: decisiones de diseño e implementación en producción.

La regla de oro para Claude Code al redactar: **todo concepto se explica primero en términos simples y luego se profundiza**, nunca al revés. Un lector de nivel avanzado debe poder leer una tarjeta básica y no sentirla incorrecta — solo más simple.

## 3. Cambios estructurales necesarios en el sitio

Para que Claude Code los implemente en el código existente:

- **Nuevo campo `level`** en cada objeto de `CARDS` (`js/data.js`), con valores `'basico' | 'intermedio' | 'avanzado'`.
- **Nueva constante `LEVELS`** (paralela a `CATEGORIES`), con id, label, ícono y descripción corta de cada nivel, más un objeto `LEVEL_COLORS` (paralelo a `CATEGORY_COLORS`). Sugerencia de color tipo semáforo, por ser universalmente entendible: verde para básico, ámbar para intermedio, rojo/violeta para avanzado.
- **Filtro de nivel independiente del filtro de categoría**, para que ambos ejes se puedan combinar (ej. "Mitos" + "Básico"). Esto implica ampliar la lógica de filtrado en `js/app.js` (hoy solo filtra por `activeCategory` y `searchQuery`) para incluir `activeLevel`, y sincronizarlo con la URL igual que ya se hace con `cat` y `q`.
- **Badge de nivel visible en cada tarjeta**, junto al badge de tipo que ya existe (`card-badge` en `js/ui.js`), y también dentro del modal de detalle.
- **Ruta guiada opcional para principiantes**: una vista o botón "Empezar desde cero" que ordene automáticamente todas las tarjetas de nivel Básico en una secuencia recomendada de lectura (no alfabético ni por categoría, sino por dependencia conceptual). Útil para el caso de uso del usuario: enseñar a otras personas paso a paso.
- **Glosario**: una categoría o vista nueva con los términos técnicos usados (token, contexto, prompt, alucinación, RAG, fine-tuning, agente, temperatura, etc.), cada uno con definición de una línea en lenguaje simple. Las tarjetas de nivel intermedio/avanzado pueden enlazar términos al glosario en vez de redefinirlos cada vez.
- **Indicador de progreso por nivel** (opcional, usando el `storage.js` existente que ya persiste favoritos): marcar cuántas tarjetas de cada nivel ya se leyeron, útil para quien está aprendiendo o enseñando de forma estructurada.

## 4. Reclasificación sugerida de las 43 tarjetas existentes

Esta es una primera pasada para que Claude Code la use como punto de partida. Algunas tarjetas bajarán de nivel una vez reescrito su lenguaje (ver sección 5); la columna "Notas" indica cuáles.

### Fundamentos

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| f1 | Tokens: la moneda real del modelo | Intermedio | El concepto de "token" en sí podría tener una versión básica separada; lo específico de costos de API es intermedio/avanzado |
| f2 | Ventana de contexto | Intermedio | |
| f3 | Temperatura | Intermedio | Parámetro de API; la idea general ("más o menos predecible") es básica, el valor numérico es intermedio |
| f4 | Alucinación | **Básico** | Concepto esencial para cualquier usuario, no requiere jerga técnica |
| f5 | RAG | Avanzado | Patrón de arquitectura |
| f6 | System Prompt vs User Prompt | Intermedio | Relevante para cualquiera que configure instrucciones personalizadas, no solo developers |
| f7 | Fine-tuning vs Prompting vs RAG | Avanzado | |

### Agentes

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| a1 | ¿Qué es realmente un agente de IA? | Intermedio | Término cada vez más mainstream; se puede explicar sin código |
| a2 | Los 4 tipos de memoria en agentes | Avanzado | |
| a3 | Tool calling | Avanzado | |
| a4 | Multi-agent | Avanzado | |
| a5 | IA en el desarrollo: fortalezas y límites | Intermedio | Útil también para quien evalúa herramientas sin programar |
| a6 | AGENTS.md y archivos de contexto | Avanzado | Específico de developers |

### Mitos

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| m1 | "La IA aprende de mis conversaciones" | **Básico** | Candidata ideal de apertura del recorrido básico |
| m2 | "Mis instrucciones personalizan el modelo" | **Básico** | |
| m3 | "Más contexto siempre es mejor" | Intermedio | Requiere entender qué es contexto primero |
| m4 | "El modelo entiende el código como programador" | Intermedio | |
| m5 | "Los modelos tienen opiniones genuinas" | **Básico** | Aplica a cualquiera que chatea con IA |
| m6 | "El modelo más nuevo siempre es mejor" | Intermedio | |

### Tips

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| t1 | El contexto va antes de la tarea | **Básico** | Aplica a cualquier prompt en cualquier chat |
| t2 | Usa XML para prompts complejos | Avanzado | Técnica de estructuración avanzada |
| t3 | Empieza sesiones limpias | **Básico** | |
| t4 | Especifica el formato antes de generar | **Básico** | |
| t5 | Si el prompt falla, cámbialo | Intermedio | Menciona few-shot y chain of thought |
| t6 | Dile que sea honesto sobre su incertidumbre | **Básico** | Alto impacto, cero jerga necesaria |

### Buenas prácticas

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| bp1 | Prompt chaining | Intermedio | |
| bp2 | Few-shot examples | Intermedio | Muy accesible, podría bajar a básico si se simplifica el ejemplo |
| bp3 | Versiona tus system prompts como código | Avanzado | Flujo de producción con Git |
| bp4 | Grounding | Intermedio | |
| bp5 | Verificación propia | Intermedio | |

### Malas prácticas

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| mp1 | Vibe coding sin revisión | Intermedio | Relevante para cualquiera que use IA para programar, no solo seniors |
| mp2 | Mega-prompts sin estructura | Intermedio | |
| mp3 | Asumir persistencia entre sesiones | **Básico** | Malentendido muy común en usuarios no técnicos |
| mp4 | Ignorar el costo de tokens en producción | Avanzado | |
| mp5 | Confiar en el modelo para seguridad | Avanzado | |

### Trucos

| ID | Título | Nivel sugerido | Notas |
|---|---|---|---|
| tr1 | "Think step by step" al final | Intermedio | |
| tr2 | Inicio y final: zona de alta atención | Intermedio | |
| tr3 | Preguntas retóricas activan patrones distintos | **Básico** | Truco simple, sin jerga, aplicable de inmediato |
| tr4 | Prefill del assistant | Avanzado | Solo disponible vía API |
| tr5 | Re-reading trick | Intermedio | |
| tr6 | Cambia el rol para criticar su output | Intermedio | |
| tr7 | Temperatura dinámica por tipo de tarea | Avanzado | Pipelines de producción |
| tr8 | Cero-shot chain of thought extendido | Intermedio | |

**Resumen:** 10 básicas, 21 intermedias, 12 avanzadas. Es un punto de partida razonable; conviene revisar el balance después de la reescritura, ya que simplificar el lenguaje de una tarjeta intermedia a veces permite bajarla a básica.

## 5. Guía de reescritura del lenguaje

Instrucciones para que Claude Code aplique al reescribir cada tarjeta, sobre todo las de nivel Básico:

- **Define el término la primera vez que aparece**, en la misma frase, con una analogía cotidiana. Ejemplo de transformación:
  - Antes (como está hoy, f4): *"Una alucinación ocurre cuando el modelo genera texto que parece correcto y confiado pero es factualmente incorrecto."*
  - Después (nivel básico): *"Una 'alucinación' es cuando la IA te da una respuesta que suena segura y bien escrita, pero que en realidad es falsa o inventada — como un compañero de trabajo que prefiere improvisar una respuesta antes que decir 'no sé'."*
- **Un ejemplo cotidiano por concepto**, además del técnico si corresponde. No reemplazar el ejemplo técnico en tarjetas intermedias/avanzadas: sumar uno simple antes.
- **Frases cortas, una idea por oración.** Evitar subordinadas largas y encadenar varios conceptos nuevos en la misma oración.
- **Nada de siglas sin desarrollar la primera vez** (RAG, LLM, API, RLHF): siempre "sigla (qué significa, explicado en una frase)".
- **Mantener la precisión técnica.** Simplificar el lenguaje no significa decir algo impreciso o falso; significa elegir mejor las palabras y dar más contexto, no recortar contenido verdadero.
- **Cerrar cada tarjeta básica con una frase de aplicación práctica inmediata**: qué puede hacer distinto la persona la próxima vez que use la IA.

## 6. Contenido nuevo a crear (huecos en nivel básico)

Hoy no existe una introducción absoluta. Para que la ruta básica tenga sentido como punto de partida, faltan tarjetas como:

- ¿Qué es un LLM (modelo de lenguaje)? — en una analogía simple, sin matemática.
- ¿Qué es un "prompt"? — la instrucción que le das a la IA, con ejemplos de prompts buenos y malos lado a lado.
- IA vs. Machine Learning vs. LLM vs. Agente — un mapa simple de estos términos que la gente confunde y usa indistintamente.
- ¿Cómo "aprendió" el modelo? — qué es el entrenamiento, en una frase, sin entrar en arquitecturas.
- Glosario general (ver sección 3).

## 7. Plan de implementación por fases

1. **Modelo de datos y taxonomía.** Agregar `level` a las 43 tarjetas según la tabla de la sección 4, crear `LEVELS` y `LEVEL_COLORS` en `data.js`. Sin cambios visuales todavía.
2. **Contenido básico.** Reescribir las 10 tarjetas marcadas como Básico según la guía de la sección 5, y crear las tarjetas nuevas de la sección 6. Es la prioridad más alta: es el contenido que más gente va a leer primero.
3. **UI de niveles.** Badge de nivel en tarjeta y modal, filtro combinable con categoría, sincronización con la URL. Reusar los patrones ya existentes de `category-bar` en `ui.js`/`app.js`.
4. **Ruta guiada y glosario.** Vista de "Empezar desde cero" con orden recomendado, vista de glosario con términos enlazables desde tarjetas intermedias/avanzadas.
5. **Revisión de intermedio y avanzado.** Aplicar la misma guía de lenguaje (definir jerga la primera vez, un ejemplo cotidiano antes del técnico) sin perder profundidad técnica.
6. **Rebalanceo final.** Revisar si alguna tarjeta reescrita puede bajar de nivel tras la simplificación.

## 8. Checklist de validación

- Cada tarjeta tiene `level` asignado y aparece correctamente al filtrar por nivel.
- Ninguna tarjeta de nivel Básico usa una sigla o término técnico sin definirlo en la misma tarjeta.
- Cada tarjeta Básica tiene al menos un ejemplo cotidiano (no técnico).
- El filtro de nivel funciona combinado con categoría y con búsqueda, y persiste en la URL igual que los filtros existentes.
- La ruta guiada recorre las 10 tarjetas básicas en un orden que no asume conocimiento previo no cubierto antes.
- Revisión de que el contenido técnico de las tarjetas avanzadas no perdió precisión al tocar el resto del sitio.
