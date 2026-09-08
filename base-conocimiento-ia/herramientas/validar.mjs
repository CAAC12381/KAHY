import { readFileSync, existsSync } from "node:fs";
import { dirname, extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = normalize(join(here, ".."));
const manifestPath = join(root, "manifest.json");
const errors = [];
const warnings = [];
const documents = new Map();

function parseJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    errors.push(`${relative(root, path)}: JSON inválido: ${error.message}`);
    return null;
  }
}

function parseJsonl(path) {
  const result = [];
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!line.trim()) return;
    try {
      result.push(JSON.parse(line));
    } catch (error) {
      errors.push(`${relative(root, path)}:${index + 1}: JSONL inválido: ${error.message}`);
    }
  });
  return result;
}

function collectObjects(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectObjects(item, output));
  } else if (value && typeof value === "object") {
    output.push(value);
    Object.values(value).forEach((item) => collectObjects(item, output));
  }
  return output;
}

function requireFields(record, fields, location) {
  for (const field of fields) {
    if (!(field in record)) errors.push(`${location}: falta el campo ${field}`);
  }
}

if (!existsSync(manifestPath)) {
  console.error("No existe manifest.json");
  process.exit(1);
}

const manifest = parseJson(manifestPath);
if (!manifest) process.exit(1);

for (const entry of manifest.files || []) {
  const fullPath = join(root, entry.path);
  if (!existsSync(fullPath)) {
    errors.push(`manifest.json apunta a un archivo inexistente: ${entry.path}`);
    continue;
  }
  const extension = extname(fullPath);
  const data = extension === ".jsonl" ? parseJsonl(fullPath) : parseJson(fullPath);
  documents.set(entry.path, data);
}

const ids = new Map();
for (const [path, data] of documents) {
  for (const object of collectObjects(data)) {
    if (typeof object.id !== "string") continue;
    if (ids.has(object.id)) errors.push(`ID duplicado ${object.id}: ${ids.get(object.id)} y ${path}`);
    else ids.set(object.id, path);
  }
}

const sourceDocument = documents.get("fuentes/registro-fuentes.json");
const sourceIds = new Set((sourceDocument?.sources || []).map((source) => source.id));

for (const [path, data] of documents) {
  for (const object of collectObjects(data)) {
    if (Array.isArray(object.source_ids)) {
      for (const sourceId of object.source_ids) {
        if (!sourceIds.has(sourceId)) errors.push(`${path}: source_id desconocido: ${sourceId}`);
      }
    }
    if (Array.isArray(object.matched_ids)) {
      for (const matchId of object.matched_ids) {
        if (!ids.has(matchId)) errors.push(`${path}: matched_id desconocido: ${matchId}`);
      }
    }
    for (const forbiddenKey of ["risk_level", "nivel_riesgo", "suicide_probability", "diagnostico_confirmado"]) {
      if (forbiddenKey in object) errors.push(`${path}: campo prohibido ${forbiddenKey}`);
    }
  }
}

const allowedActions = new Set([
  "continuar",
  "aclarar",
  "ofrecer_apoyo_humano",
  "comprobacion_de_seguridad",
  "emergencia_inmediata",
]);

for (const [path, data] of documents) {
  for (const object of collectObjects(data)) {
    for (const key of ["accion", "safety_action", "expected_action"]) {
      if (typeof object[key] === "string" && !allowedActions.has(object[key])) {
        errors.push(`${path}: acción no permitida ${object[key]} en ${key}`);
      }
    }
  }
}

const expressions = documents.get("diccionarios/expresiones-mexico.jsonl") || [];
expressions.forEach((record, index) => requireFields(record, ["id", "formas", "parafrasis", "temas_posibles", "ambiguedad", "no_asumir"], `expresiones:${index + 1}`));

const emotionNeeds = documents.get("diccionarios/emociones-necesidades.jsonl") || [];
emotionNeeds.forEach((record, index) => requireFields(record, ["id", "tipo", "formas", "descripcion", "no_asumir"], `emociones-necesidades:${index + 1}`));

const intentsContexts = documents.get("diccionarios/intenciones-contextos.jsonl") || [];
intentsContexts.forEach((record, index) => {
  requireFields(record, ["id", "tipo", "nombre", "senales", "no_asumir"], `intenciones-contextos:${index + 1}`);
  if (record.tipo === "intencion") requireFields(record, ["objetivo_probable", "movimientos_respuesta"], `intenciones-contextos:${index + 1}`);
  else if (record.tipo === "contexto") requireFields(record, ["dimensiones", "preguntas_utiles"], `intenciones-contextos:${index + 1}`);
  else errors.push(`intenciones-contextos:${index + 1}: tipo desconocido ${record.tipo}`);
});

const topics = documents.get("psicologia/temas.jsonl") || [];
topics.forEach((record, index) => requireFields(record, ["id", "titulo", "alcance", "preguntas", "apoyo_bajo_riesgo", "buscar_apoyo_si", "no_hacer", "source_ids"], `temas:${index + 1}`));

const tools = documents.get("psicologia/herramientas-bajo-riesgo.jsonl") || [];
tools.forEach((record, index) => requireFields(record, ["id", "titulo", "objetivo", "ofrecer_cuando", "no_usar_como_sustituto", "permiso", "pasos", "detener_si", "source_ids"], `herramientas:${index + 1}`));

const signals = documents.get("seguridad/senales.jsonl") || [];
signals.forEach((record, index) => requireFields(record, ["id", "dominio", "subtipo", "ejemplos", "accion", "eleva_si", "contraejemplos", "no_hacer", "source_ids"], `seguridad:${index + 1}`));

const training = documents.get("entrenamiento/ejemplos-anotados.jsonl") || [];
training.forEach((record, index) => requireFields(record, ["id", "input", "normalized", "intentions", "topics", "emotions", "needs", "safety_action", "clarify", "matched_ids", "ideal_response", "avoid"], `entrenamiento:${index + 1}`));

const evaluation = documents.get("evaluacion/casos-prueba.jsonl") || [];
evaluation.forEach((record, index) => requireFields(record, ["id", "group", "input", "expected_action"], `evaluacion:${index + 1}`));

const minimums = [
  ["expresiones", expressions.length, 100],
  ["emociones y necesidades", emotionNeeds.length, 60],
  ["intenciones y contextos", intentsContexts.length, 60],
  ["temas psicológicos", topics.length, 50],
  ["herramientas", tools.length, 20],
  ["señales de seguridad", signals.length, 50],
  ["ejemplos de entrenamiento", training.length, 75],
  ["casos de evaluación", evaluation.length, 75],
];

for (const [label, count, minimum] of minimums) {
  if (count < minimum) errors.push(`Cobertura insuficiente en ${label}: ${count}; mínimo ${minimum}`);
}

const dynamicSources = (sourceDocument?.sources || []).filter((source) => source.dynamic);
for (const source of dynamicSources) {
  if (!source.verified_at || !source.review_by) warnings.push(`Fuente dinámica ${source.id} sin ciclo completo de verificación`);
}

console.log(`Base: ${root}`);
console.log(`Versión: ${manifest.version}`);
console.log(`IDs únicos: ${ids.size}`);
for (const [label, count] of minimums) console.log(`${label}: ${count}`);
console.log(`Fuentes registradas: ${sourceIds.size}`);

for (const warning of warnings) console.warn(`ADVERTENCIA: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  console.error(`Validación fallida con ${errors.length} error(es).`);
  process.exit(1);
}

console.log("Validación correcta.");
