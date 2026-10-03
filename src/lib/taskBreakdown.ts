import type { TaskEnergy } from "../types";

export type SuggestedStep = { text: string; minutes?: number };

/**
 * Motor local para "Desglosar una tarea": se usa cuando la IA en línea no
 * está configurada, tarda demasiado o no hay conexión. Reconoce tipos de
 * tarea comunes por palabras clave y propone acciones pequeñas y
 * observables. Nunca sale del navegador.
 */
const templates: Array<{ pattern: RegExp; steps: SuggestedStep[] }> = [
  {
    pattern: /exposici|presentaci|diapositiva|power ?point|canva|exponer/,
    steps: [
      { text: "Abrir un documento nuevo y escribir solo el título del tema", minutes: 3 },
      { text: "Anotar 3 ideas principales, aunque estén incompletas", minutes: 8 },
      { text: "Buscar un dato o ejemplo para la primera idea", minutes: 10 },
      { text: "Armar una diapositiva sencilla por cada idea", minutes: 20 },
      { text: "Ensayar en voz alta una vez, sin buscar que salga perfecto", minutes: 10 },
    ],
  },
  {
    pattern: /examen|estudiar|repasar|parcial|quiz|prueba de/,
    steps: [
      { text: "Reunir apuntes, libro o archivos en un solo lugar", minutes: 5 },
      { text: "Elegir un solo tema para empezar", minutes: 2 },
      { text: "Leer ese tema durante 10 minutos con un temporizador", minutes: 10 },
      { text: "Escribir 3 preguntas que podrían venir y responderlas", minutes: 12 },
      { text: "Tomar una pausa corta y elegir el siguiente tema", minutes: 5 },
    ],
  },
  {
    pattern: /ensayo|reporte|informe|tesis|resumen|escrito|redacci|investigaci|art[ií]culo/,
    steps: [
      { text: "Abrir el documento y escribir el título", minutes: 2 },
      { text: "Hacer una lista de 3 a 5 ideas que quieres incluir", minutes: 8 },
      { text: "Escribir un primer párrafo aunque quede imperfecto", minutes: 15 },
      { text: "Desarrollar una idea más de la lista", minutes: 15 },
      { text: "Leerlo una vez y corregir solo lo más evidente", minutes: 10 },
    ],
  },
  {
    pattern: /limpi|ordenar|recoger|cuarto|rec[aá]mara|casa|cocina|ba[ñn]o|lavar|trastes|ropa/,
    steps: [
      { text: "Elegir una sola zona pequeña, como el escritorio o la cama", minutes: 1 },
      { text: "Tirar la basura que se vea en esa zona", minutes: 5 },
      { text: "Juntar la ropa en un solo lugar", minutes: 5 },
      { text: "Regresar 10 objetos a su lugar", minutes: 8 },
      { text: "Mirar lo que ya cambió y decidir si sigues o paras", minutes: 2 },
    ],
  },
  {
    pattern: /correo|mail|mensaje|whats|responder|contestar|escribirle|llamar|llamada/,
    steps: [
      { text: "Abrir la aplicación y dejar listo el chat o el correo", minutes: 1 },
      { text: "Escribir en una frase qué necesitas decir o pedir", minutes: 3 },
      { text: "Completar el mensaje con un saludo y un cierre breves", minutes: 5 },
      { text: "Leerlo una vez y enviarlo", minutes: 2 },
    ],
  },
  {
    pattern: /tr[aá]mite|pagar|pago|cita|papeles|documentos|inscrip|beca|formulario|solicitud/,
    steps: [
      { text: "Buscar en la página oficial qué requisitos piden", minutes: 10 },
      { text: "Hacer una lista de los documentos que te faltan", minutes: 5 },
      { text: "Reunir o escanear el primer documento", minutes: 10 },
      { text: "Llenar la primera sección del formulario", minutes: 10 },
      { text: "Anotar la fecha límite y el siguiente paso", minutes: 3 },
    ],
  },
  {
    pattern: /proyecto|tarea|trabajo|entrega|actividad/,
    steps: [
      { text: "Escribir en una frase cómo se ve esto ya terminado", minutes: 3 },
      { text: "Reunir lo que necesitas: archivos, instrucciones y materiales", minutes: 5 },
      { text: "Hacer la parte más pequeña y fácil durante 10 minutos", minutes: 10 },
      { text: "Avanzar con la siguiente parte en un bloque de 15 minutos", minutes: 15 },
      { text: "Revisar lo hecho y anotar qué falta", minutes: 5 },
    ],
  },
];

const fallback: SuggestedStep[] = [
  { text: "Escribir en una frase qué significa terminar esta tarea", minutes: 3 },
  { text: "Preparar el lugar y lo que vas a necesitar", minutes: 5 },
  { text: "Hacer la primera acción más pequeña posible", minutes: 5 },
  { text: "Seguir durante un bloque corto de 10 minutos", minutes: 10 },
  { text: "Revisar cómo vas y elegir el siguiente paso", minutes: 3 },
];

function normalize(value: string) {
  return value.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Con poca energía se proponen menos pasos y más cortos; con bastante, se conservan. */
export function adjustForEnergy(steps: SuggestedStep[], energy: TaskEnergy): SuggestedStep[] {
  if (energy === "poca") return steps.slice(0, 4).map((step) => ({ ...step, minutes: step.minutes ? Math.max(1, Math.round(step.minutes / 2)) : undefined }));
  if (energy === "media") return steps.map((step) => ({ ...step, minutes: step.minutes && step.minutes > 15 ? 15 : step.minutes }));
  return steps;
}

export function localBreakdown(task: string, energy: TaskEnergy): SuggestedStep[] {
  const text = normalize(task);
  const match = templates.find((template) => template.pattern.test(text));
  return adjustForEnergy(match?.steps ?? fallback, energy);
}

/** Divide un paso que se siente grande en 3 micro-acciones. */
export function localSplitStep(step: string): SuggestedStep[] {
  const clean = step.replace(/\.$/, "").trim();
  const lower = clean.charAt(0).toLowerCase() + clean.slice(1);
  return [
    { text: `Preparar lo necesario para ${lower}`, minutes: 2 },
    { text: `Hacer solo la primera mitad: ${lower}`, minutes: 5 },
    { text: "Terminar lo que falta o decidir si basta por hoy", minutes: 5 },
  ];
}
