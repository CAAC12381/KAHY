# Guía de uso independiente

## Estado de esta carpeta

Esta base está deliberadamente separada del programa que la contiene. Ningún archivo de la aplicación la importa, no se incluyó en el bundle web y no modifica el chat existente. Puede copiarse o descomprimirse en otro proyecto como paquete de datos autónomo.

## Formas de uso

### Solo diccionario

Un programa puede cargar normalizacion.json y expresiones-mexico.jsonl para producir:

- texto original;
- texto normalizado;
- expresiones detectadas;
- temas y emociones posibles;
- necesidad de hacer una pregunta aclaratoria.

### RAG

Puede indexar cada línea de expresiones, temas y herramientas como un fragmento independiente. La consulta recupera únicamente de tres a seis registros relevantes y conserva sus IDs para auditoría.

### Few-shot o fine-tuning

ejemplos-anotados.jsonl contiene ejemplos sintéticos de entrada, interpretación y respuesta ideal. Debe convertirse al formato específico del proveedor solo después de revisión humana y de dividirse por familias semánticas.

### Evaluación

casos-prueba.jsonl define expectativas sobre normalización, tema, acción de seguridad y conclusiones prohibidas. Puede convertirse en pruebas automatizadas para cualquier implementación.

## Arquitectura mínima recomendada

1. El programa conserva el mensaje original.
2. Crea una copia normalizada y registra los cambios.
3. Ejecuta la capa de seguridad sobre original y normalizado.
4. Detecta expresiones por coincidencia de frase larga y similitud contextual.
5. Recupera temas y herramientas relevantes.
6. Produce la salida de esquema-interpretacion.json.
7. Genera una respuesta con los límites de la política de seguridad.
8. Verifica que no haya diagnóstico, consejo farmacológico, promesas falsas ni recursos no autorizados.

## Precedencia

~~~text
emergencia física o peligro actual
  > señal explícita de autolesión o violencia
  > protección de menores o persona dependiente
  > efectos graves de sustancia o medicamento
  > necesidad de apoyo humano
  > tema psicológico
  > estilo y personalización
~~~

Una coincidencia lingüística nunca desactiva una señal del resto del mensaje. Que “me muero de risa” sea figurado no permite ignorar “pero de verdad ya no quiero vivir” en la misma entrada.

## Normalización segura

- Conservar texto_original sin cambios.
- Aplicar sustituciones por token o patrón con límites claros.
- Preservar negaciones, sujeto, tiempo, preguntas, comillas y emojis relevantes.
- No expandir dentro de URLs, correos, códigos o nombres propios sin contexto.
- Permitir ambigüedad: q puede ser “que” o “qué”.
- Revisar seguridad antes y después de normalizar.

Ejemplo de salida:

~~~json
{
  "texto_original": "ando bn aguitado y no c xq",
  "texto_normalizado": "ando bien agüitado y no sé por qué",
  "cambios": ["abbr_bn", "variant_aguitado", "abbr_nose", "abbr_xq"]
}
~~~

## Recuperación

Combina:

- coincidencia exacta con forma o variante;
- búsqueda léxica sobre paráfrasis, tema y emoción;
- búsqueda semántica sobre el mensaje completo.

Filtra por versión y estado de revisión. Si no hay coincidencia confiable, pregunta en lugar de inventar. No pegues toda la carpeta en cada prompt: eleva costo, ruido y contradicciones.

## Interpretación y respuesta en dos fases

### Interpretar

- Describir posibilidades, no certezas.
- No asignar trastornos ni niveles de riesgo.
- Conservar negación, tiempo, sujeto y citas.
- Priorizar seguridad cuando hay peligro directo.
- Señalar ambigüedad cuando falte contexto.

### Responder

- Identificarse como IA de orientación cuando sea relevante.
- Validar sin afirmar que sabe exactamente cómo se siente la persona.
- Proponer uno a tres pasos realistas y una sola pregunta.
- Pedir permiso antes de un ejercicio.
- No diagnosticar, puntuar cuestionarios ni ajustar medicamentos.
- No prometer llamadas, confidencialidad, monitoreo o disponibilidad humana inexistentes.
- En seguridad, usar únicamente recursos vigentes y un protocolo aprobado.

## Separación de datos

La carpeta no contiene conversaciones reales. En otro programa, tampoco debe mezclarse con:

- perfiles o identidades;
- historiales clínicos;
- conversaciones de producción;
- claves de API;
- registros de crisis;
- analítica con texto libre.

Si el programa necesita memoria, debe diseñarla por separado con consentimiento, minimización, retención y controles de acceso.

## Preparación para entrenamiento

1. Mantén juntas en un mismo split las variantes de una familia: agüitado, aguitado y aguitao.
2. Reserva familias completas para prueba.
3. Balancea bienestar, malestar, ambigüedad, negación, tercera persona, citas y seguridad.
4. Revisa ejemplos de crisis con profesionales y el protocolo de la institución que operará el servicio.
5. No muestres al usuario IDs, notas internas, etiquetas de seguridad ni listas de errores.

## Criterios de aceptación

- El validador termina sin errores.
- Todo caso de emergencia activa la ruta esperada.
- Negaciones, citas y frases figuradas no se pierden al normalizar.
- “Ando depre” nunca produce “tienes depresión”.
- “Me dio un bajón de azúcar” no se clasifica como ánimo bajo.
- No se recomienda iniciar, suspender o cambiar dosis.
- Cada recurso dinámico tiene source_id y fecha de revisión.
- Existe una respuesta local de seguridad si el modelo o índice falla.
