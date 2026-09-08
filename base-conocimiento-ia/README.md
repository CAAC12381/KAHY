# Base de conocimiento independiente para IA de bienestar (es-MX)

Versión inicial: 1.0.0  
Idioma principal: español de México (es-MX)  
Público previsto: personas adultas  
Estado: corpus sintético para prototipo; requiere revisión clínica, cultural y jurídica antes de producción.

## Qué contiene

Esta carpeta reúne un diccionario modular e independiente para que una IA conversacional comprenda mejor mensajes cotidianos de bienestar y psicología en México. No pertenece al código de una aplicación concreta, no se importa desde el proyecto que la contiene y puede copiarse completa a otro programa. No es un diccionario diagnóstico y no convierte palabras como “depre”, “ansioso” o “traumado” en trastornos clínicos.

El material sirve para cuatro usos distintos:

1. Normalizar escritura informal sin borrar el texto original.
2. Detectar expresiones mexicanas, emociones, necesidades e intención conversacional.
3. Recuperar contexto psicológico breve mediante RAG o reglas de enrutamiento.
4. Entrenar y evaluar respuestas con ejemplos sintéticos y casos ambiguos.

## Estructura

| Ruta | Contenido | Uso principal |
|---|---|---|
| manifest.json | Versión, alcance y catálogo de archivos | Trazabilidad |
| diccionarios/normalizacion.json | Abreviaturas, errores frecuentes, risas, intensificadores y reglas | Preprocesamiento |
| diccionarios/expresiones-mexico.jsonl | Modismos y frases coloquiales con interpretación contextual | Comprensión lingüística |
| diccionarios/emociones-necesidades.jsonl | Vocabulario emocional, corporal y de necesidades | Etiquetado semántico |
| diccionarios/intenciones-contextos.jsonl | Intenciones conversacionales y contextos de vida | Enrutamiento y personalización |
| psicologia/temas.jsonl | Temas de bienestar y psicología con límites y rutas de apoyo | RAG y clasificación |
| psicologia/herramientas-bajo-riesgo.jsonl | Prácticas breves que pueden ofrecerse con consentimiento | Generación de respuestas |
| seguridad/senales.jsonl | Señales sintéticas que activan aclaración, apoyo humano o emergencia | Motor separado de seguridad |
| seguridad/POLITICA_DE_RESPUESTA.md | Reglas de crisis, límites y revisión humana | Gobernanza |
| entrenamiento/ejemplos-anotados.jsonl | Pares sintéticos de entrada, interpretación y estrategia de respuesta | Few-shot o fine-tuning supervisado |
| evaluacion/casos-prueba.jsonl | Casos normales, ambiguos, negados y adversariales | Pruebas de regresión |
| integracion/esquema-interpretacion.json | Salida estructurada recomendada para el interpretador | Contrato de software |
| integracion/GUIA_DE_USO_INDEPENDIENTE.md | Cómo consumir el corpus desde cualquier programa sin enviar todo al modelo | Implementación opcional |
| fuentes/registro-fuentes.json | Fuentes oficiales o primarias y fechas de revisión | Procedencia |
| herramientas/validar.mjs | Validador local de JSON/JSONL, IDs y referencias | Control de calidad |

JSONL significa “un objeto JSON por línea”. Es conveniente para indexar, filtrar, versionar y preparar conjuntos de entrenamiento sin cargar un archivo gigante en memoria.

## Flujo recomendado

~~~text
mensaje original
  -> normalización tolerante (conservar original)
  -> detección de seguridad determinista y contextual
  -> interpretación de expresiones e intención
  -> recuperación de 3 a 6 entradas relevantes
  -> generación con reglas de alcance
  -> verificación de salida
  -> respuesta o ruta de ayuda humana
~~~

La seguridad se evalúa antes y después de consultar al modelo. El diccionario ayuda a encontrar señales, pero no debe ser la única barrera: hacen falta revisión contextual, pruebas y un protocolo humano real.

## Cómo leer una entrada de expresiones

~~~json
{
  "id": "mx_estado_aguitado_001",
  "formas": ["ando agüitado", "ando aguitado", "ando agüitada"],
  "parafrasis": ["me siento desanimado", "algo me preocupa"],
  "temas_posibles": ["animo", "estres"],
  "emociones_posibles": ["tristeza", "preocupacion"],
  "intensidad": "desconocida",
  "ambiguedad": "media",
  "no_asumir": ["depresion_clinica"],
  "pregunta_util": "¿Se parece más a tristeza, preocupación o cansancio?"
}
~~~

Las claves importantes son:

- formas: variantes que puede escribir una persona.
- parafrasis: significado probable, nunca certeza clínica.
- temas_posibles: rutas candidatas; puede haber varias.
- no_asumir: conclusiones que el sistema no debe producir.
- pregunta_util: una aclaración breve cuando el contexto no alcanza.
- marcadores_contexto: palabras que cambian o precisan el significado.

## Etiquetas operativas

La base separa conceptos que suelen confundirse:

- emocion_probable: lectura tentativa del estado expresado.
- necesidad_posible: apoyo, descanso, seguridad, información, conexión u otra necesidad.
- tema: ruta de contenido, no diagnóstico.
- intensidad_linguistica: fuerza de las palabras, no gravedad clínica.
- accion_seguridad: comportamiento del sistema, no nivel de riesgo de la persona.

Nunca debe producirse una etiqueta de persona como “riesgo bajo”, “riesgo medio” o “riesgo alto”. Las acciones disponibles son: continuar, aclarar, ofrecer_apoyo_humano, comprobacion_de_seguridad y emergencia_inmediata.

## Uso para RAG

Para RAG, indexa cada línea como una unidad independiente junto con sus campos. Antes de generar una respuesta:

1. Recupera primero coincidencias de seguridad.
2. Recupera expresiones por forma, variante y similitud semántica.
3. Recupera uno o dos temas psicológicos y, si corresponde, una herramienta de bajo riesgo.
4. Pasa al modelo solo las entradas relevantes y las reglas globales.
5. Guarda IDs y versión de las entradas utilizadas para auditoría, sin guardar el texto sensible del usuario si no es necesario.

No conviene pegar todos los archivos en un prompt. Eso aumenta costo, ruido y contradicciones.

## Uso para entrenamiento

Los ejemplos son sintéticos. Antes de un fine-tuning real:

1. Separa entrenamiento, validación y prueba por familia semántica, no al azar por frase, para evitar fugas.
2. Revisa cada ejemplo de seguridad con un profesional capacitado y con el protocolo operativo de la institución.
3. Balancea expresiones positivas, neutrales, ambiguas y de crisis; no entrenes solo lenguaje de malestar.
4. Incluye negación, tercera persona, citas, bromas, canciones, errores ortográficos y cambios de tema.
5. No uses conversaciones reales de usuarios por defecto. Requerirían finalidad, base jurídica, consentimiento cuando corresponda, minimización, desidentificación y revisión ética.
6. Mide falsos negativos de seguridad, sobreactivación, diagnósticos indebidos, consejos médicos, estigma y calidad por variación regional.

El archivo de ejemplos no es suficiente por sí solo para entrenar un modelo clínico. Está diseñado para un asistente de bienestar, orientación y navegación hacia ayuda.

## Límites deliberados

- No contiene textos completos de DSM, CIE, escalas clínicas, manuales ni libros protegidos.
- No incluye reactivos ni algoritmos de PHQ-9, GAD-7, ASRS, PCL-5 u otros instrumentos.
- No receta, ajusta o suspende medicamentos.
- No diagnostica depresión, ansiedad, TDAH, autismo, trauma u otras condiciones.
- No promete confidencialidad, rescate, monitoreo humano ni disponibilidad que el producto no tenga.
- No infiere género, orientación, origen étnico, discapacidad o diagnóstico por una expresión.
- No considera este corpus una representación completa de todas las regiones, edades o comunidades de México.

## Revisión antes de producción

Se necesitan, como mínimo, cuatro responsables con autoridad clara:

- revisión clínica y de crisis;
- revisión de lenguaje y variación regional;
- privacidad y cumplimiento en México;
- ingeniería de seguridad y evaluación.

Los números, horarios y servicios se deben verificar antes de cada lanzamiento y de forma periódica. El registro de fuentes incluye una fecha de consulta, no una garantía perpetua.

## Validación local

Desde la carpeta principal del proyecto ejecuta:

~~~powershell
node base-conocimiento-ia/herramientas/validar.mjs
~~~

El validador comprueba sintaxis, IDs duplicados, campos mínimos, referencias a fuentes y que ninguna entrada use niveles de riesgo prohibidos.

## Convenciones de edición

- Añadir una entrada nueva requiere un ID estable y único.
- No reutilizar IDs eliminados.
- Escribir sin datos personales ni historias reales identificables.
- Conservar errores solo dentro de formas o ejemplos; las explicaciones usan ortografía estándar.
- Evitar una relación uno a uno entre frase y diagnóstico.
- Marcar como pendiente cualquier dato que necesite confirmación clínica o jurídica.
- Cambiar la versión del manifest cuando se modifique significado, seguridad o estructura.

## Licencia y procedencia

Las frases y anotaciones de esta carpeta fueron redactadas como material sintético reutilizable. Las fuentes externas se registran como referencias y no se copian como corpus. Antes de redistribuir o entrenar un modelo comercial, el equipo debe definir una licencia explícita para este conjunto y revisar las condiciones de cada fuente.
