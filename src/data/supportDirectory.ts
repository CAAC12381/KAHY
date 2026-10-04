/**
 * Directorio de servicios reales de apoyo en salud mental para Michoacán.
 *
 * Reglas de este archivo (ver ANALISIS_Y_PLAN_DE_DATOS.md, "directorio
 * versionado de servicios públicos, universitarios y comunitarios"):
 * - Cada dato viene de la fuente citada en `sources`; no se completa nada
 *   de memoria. Si la fuente no publica un dato, el campo se omite.
 * - Cuando dos publicaciones oficiales se contradicen, se anota en `caution`
 *   en lugar de elegir una en silencio.
 * - Al cambiar cualquier entrada, actualiza `verifiedAt` de esa entrada y
 *   DIRECTORY_VERSION. Lo ideal es confirmar por teléfono antes de publicar.
 */

export const DIRECTORY_VERSION = "2026-10-03";
export const DIRECTORY_VERIFIED_LABEL = "3 de octubre de 2026";

export type ServiceKind = "linea" | "centro" | "hospital" | "universitario";
export type ServiceCity = "Morelia" | "Uruapan" | "Zamora" | "Zitácuaro" | "Huetamo" | "Lázaro Cárdenas";

export type SupportService = {
  id: string;
  name: string;
  operator: string;
  kind: ServiceKind;
  /** Sin ciudad: atiende a distancia en todo el ámbito indicado en `coverage`. */
  city?: ServiceCity;
  coverage: string;
  summary: string;
  services: string[];
  phones: Array<{ display: string; tel: string }>;
  address?: string;
  hours?: string;
  cost?: string;
  requirements?: string;
  email?: string;
  /** Dato dudoso o contradictorio entre fuentes que la persona debe confirmar. */
  caution?: string;
  alwaysOpen?: boolean;
  free?: boolean;
  sources: Array<{ label: string; url: string; date: string }>;
  verifiedAt: string;
};

export const serviceKindLabels: Record<ServiceKind, string> = {
  linea: "Línea telefónica",
  centro: "Centro comunitario",
  hospital: "Hospital",
  universitario: "Servicio universitario",
};

export const serviceCities: ServiceCity[] = ["Morelia", "Uruapan", "Zamora", "Zitácuaro", "Huetamo", "Lázaro Cárdenas"];

const ssmCentros2023 = { label: "Secretaría de Salud de Michoacán: domicilios y teléfonos de los centros", url: "https://salud.michoacan.gob.mx/michoacan-atiende-la-salud-mental-y-adicciones-en-5-centros-integrales/", date: "30 jun 2023" };
const ssmCentros2024 = { label: "Secretaría de Salud de Michoacán: servicios, gratuidad y requisitos", url: "https://salud.michoacan.gob.mx/en-cinco-centros-comunitarios-se-atiende-la-salud-mental-de-las-y-los-michoacanos/", date: "5 sep 2024" };
const ssmHorario2024 = { label: "Secretaría de Salud de Michoacán: horario de los centros y línea Hablemoos", url: "https://salud.michoacan.gob.mx/estos-centros-de-salud-mental-y-adicciones-brindan-atencion-gratuita-en-michoacan/", date: "3 jun 2024" };
const gobMich2026 = { label: "Gobierno de Michoacán: red estatal con seis centros", url: "https://michoacan.gob.mx/noticias/michoacan-consolida-red-estatal-de-salud-mental-con-centros-comunitarios-gratuitos/", date: "30 mar 2026" };

const cecosamaServices = [
  "Atención psicológica y psiquiátrica",
  "Depresión, ansiedad y prevención del suicidio",
  "Consumo de sustancias",
  "Terapia individual, grupal y familiar",
  "Talleres comunitarios",
];
const cecosamaHours = "Lunes a viernes, de 8:00 a 20:00";
const cecosamaHoursCaution = "Un comunicado anterior de la SSM indicaba horario de 8:00 a 15:00. Llama antes de acudir.";
const cecosamaRequirements = "Copia de identificación oficial con fotografía o de la CURP.";

/** `detailsPublished: false` para un centro del que la SSM aún no publica horario ni requisitos propios: no se le atribuyen los de los demás. */
function cecosama(city: ServiceCity, details: Pick<SupportService, "address" | "phones" | "caution"> & { extraSources?: SupportService["sources"]; summary?: string; detailsPublished?: boolean }): SupportService {
  const published = details.detailsPublished !== false;
  return {
    id: `cecosama-${city.toLowerCase().replace(/\s+/g, "-").normalize("NFD").replace(/\p{Diacritic}/gu, "")}`,
    name: `Centro Comunitario de Salud Mental y Adicciones (Cecosama) ${city}`,
    operator: "Secretaría de Salud de Michoacán",
    kind: "centro",
    city,
    coverage: `${city} y municipios cercanos`,
    summary: details.summary ?? "Primer contacto público y gratuito para atención psicológica, psiquiátrica y de consumo de sustancias.",
    services: cecosamaServices,
    phones: details.phones,
    address: details.address,
    hours: published ? cecosamaHours : undefined,
    cost: "Gratuito",
    free: true,
    requirements: published ? cecosamaRequirements : undefined,
    caution: [details.caution, published ? cecosamaHoursCaution : ""].filter(Boolean).join(" "),
    sources: published ? [ssmCentros2023, ssmCentros2024, ssmHorario2024, gobMich2026, ...(details.extraSources ?? [])] : [gobMich2026],
    verifiedAt: DIRECTORY_VERIFIED_LABEL,
  };
}

export const supportServices: SupportService[] = [
  {
    id: "linea-de-la-vida",
    name: "Línea de la Vida",
    operator: "Comisión Nacional de Salud Mental y Adicciones (CONASAMA)",
    kind: "linea",
    coverage: "Todo México",
    summary: "Orientación y apoyo por teléfono ante crisis emocionales, ansiedad, depresión, ideación suicida, violencia de género y consumo de sustancias.",
    services: ["Atención y apoyo en crisis emocional", "Ansiedad, depresión y comportamiento suicida", "Consumo de sustancias y apoyo para dejar de fumar", "Violencia de género", "Derivación a servicios especializados"],
    phones: [{ display: "800 911 2000", tel: "8009112000" }],
    hours: "Las 24 horas, los 365 días del año",
    cost: "Gratuito",
    alwaysOpen: true,
    free: true,
    sources: [{ label: "CONASAMA, Gobierno de México: Línea de la Vida", url: "https://www.gob.mx/conasama/es/articulos/linea-de-la-vida-800-911-2000?idiom=es", date: "23 oct 2025" }],
    verifiedAt: DIRECTORY_VERIFIED_LABEL,
  },
  {
    id: "linea-hablemoos",
    name: "Línea Hablemoos",
    operator: "Secretaría de Salud de Michoacán · Centro Regulador de Urgencias Médicas (CRUM)",
    kind: "linea",
    coverage: "Todo Michoacán",
    summary: "Atención psicológica inmediata por teléfono, atendida por psicólogos del CRUM. Confidencial y gratuita.",
    services: ["Ansiedad y depresión", "Trastornos de la conducta alimentaria", "Adicciones", "Violencia familiar y escolar"],
    phones: [{ display: "443 314 1617", tel: "4433141617" }, { display: "443 315 9037", tel: "4433159037" }],
    hours: "Las 24 horas, los 365 días del año",
    cost: "Gratuito",
    alwaysOpen: true,
    free: true,
    sources: [
      { label: "Secretaría de Salud de Michoacán: Llama a la línea Hablemoos", url: "https://salud.michoacan.gob.mx/llama-a-la-linea-hablemoos-para-recibir-atencion-a-la-salud-mental/", date: "12 jun 2024" },
      ssmHorario2024,
      { label: "UMSNH: Directorio de salud mental", url: "https://www.cptrsi.umich.mx/salud-mental/directorio", date: "consultado el 3 oct 2026" },
    ],
    verifiedAt: DIRECTORY_VERIFIED_LABEL,
  },
  {
    id: "hospital-psiquiatrico-morelia",
    name: "Hospital Psiquiátrico “Dr. José Torres Orozco”",
    operator: "Secretaría de Salud de Michoacán",
    kind: "hospital",
    city: "Morelia",
    coverage: "Todo Michoacán",
    summary: "Hospital público especializado: consulta externa de psiquiatría y psicología, urgencias y hospitalización.",
    services: ["Consulta de psiquiatría y paidopsiquiatría", "Psicología individual, familiar, de pareja e infantil", "Neuropsicología", "Terapia para mujeres que han vivido violencia", "Urgencias y hospitalización (18 a 60 años)"],
    phones: [{ display: "443 324 6801", tel: "4433246801" }, { display: "443 324 6802", tel: "4433246802" }, { display: "443 314 5566", tel: "4433145566" }],
    address: "Miguel Arreola 450, Col. Poblado Ocolusen, Morelia",
    hours: "Psiquiatría: lunes a domingo, de 8:00 a 20:00. Psicología: lunes a viernes, de 8:00 a 20:00. Urgencias: lunes a domingo.",
    cost: "Cuotas de recuperación",
    caution: "La página oficial publica los teléfonos sin clave lada (aquí se añadió la 443 de Morelia) e indica urgencias de 8:00 a 20:00; confirma por teléfono la atención nocturna y el costo.",
    sources: [
      { label: "Secretaría de Salud de Michoacán: Hospital Psiquiátrico", url: "https://salud.michoacan.gob.mx/hospital-psiquiatrico/", date: "consultado el 3 oct 2026" },
      { label: "UMSNH: Directorio de salud mental", url: "https://www.cptrsi.umich.mx/salud-mental/directorio", date: "consultado el 3 oct 2026" },
    ],
    verifiedAt: DIRECTORY_VERIFIED_LABEL,
  },
  cecosama("Morelia", {
    address: "Calle Miguel Arreola s/n, Col. Poblado Ocolusen, Morelia",
    phones: [{ display: "443 314 0419", tel: "4433140419" }],
  }),
  cecosama("Uruapan", {
    address: "Calle Cuba esquina con Matamoros s/n, Col. 28 de Octubre, Uruapan",
    phones: [{ display: "452 503 9183", tel: "4525039183" }],
  }),
  cecosama("Zamora", {
    address: "Calle Niños Héroes, Col. Centro, Zamora",
    phones: [{ display: "351 515 6374", tel: "3515156374" }],
    caution: "La SSM no publica el teléfono de Zamora en su página; el número proviene de un medio que cita a la SSM (mayo de 2024). En comunicados de 2023 el centro aparece como Cisame.",
    extraSources: [{ label: "Tus Buenas Noticias, con datos de la SSM: teléfonos para citas", url: "https://www.tusbuenasnoticias.com/actualidad/ciencia-y-salud/como-dejar-de-beber-alcohol/33635", date: "18 may 2024" }],
  }),
  cecosama("Zitácuaro", {
    address: "Avenida Morelia, Col. Independencia, Zitácuaro",
    phones: [{ display: "715 153 6060", tel: "7151536060" }],
    caution: "La SSM ha publicado dos números exteriores distintos para este domicilio (52 en 2023 y 91 en 2024). Pide la dirección exacta al llamar.",
  }),
  cecosama("Lázaro Cárdenas", {
    address: "Paseo de los Frutales esquina con prolongación 5 de Febrero, Col. Tinoco Rubí, Lázaro Cárdenas",
    phones: [{ display: "753 532 9243", tel: "7535329243" }],
  }),
  cecosama("Huetamo", {
    phones: [],
    summary: "Centro abierto en 2026 para la región de Tierra Caliente; ofrece consultas a distancia con especialistas del Hospital Psiquiátrico de Morelia.",
    caution: "La fuente oficial todavía no publica domicilio, teléfono ni horario de este centro. Puedes preguntar por ellos en la Línea Hablemoos.",
    detailsPublished: false,
  }),
  {
    id: "ciip-umsnh",
    name: "Centro Integral de Intervención Psicológica (CIIP)",
    operator: "Facultad de Psicología, Universidad Michoacana de San Nicolás de Hidalgo",
    kind: "universitario",
    city: "Morelia",
    coverage: "Población en general y comunidad universitaria",
    summary: "Atención psicológica de la Facultad de Psicología de la UMSNH, abierta al público con cita previa.",
    services: ["Psicoterapia individual para niños, adolescentes y adultos", "Psicoterapia familiar y grupal", "Intervención en crisis", "Evaluación psicológica"],
    phones: [{ display: "443 317 8512", tel: "4433178512" }, { display: "443 312 9909", tel: "4433129909" }],
    address: "Francisco Villa 450, Col. Dr. Miguel Silva, Morelia",
    email: "direccion.fp@umich.mx",
    cost: "Cuotas de recuperación",
    caution: "La página del centro no publica horarios ni el monto de la cuota; las fuentes que los mencionan son de 2012 y 2014. Pide cita por teléfono o con el formulario “Solicitud de atención CIIP” de su página.",
    sources: [
      { label: "Facultad de Psicología UMSNH: ubicación y contacto del CIIP", url: "https://www.psicologia.umich.mx/ciip/ubicacion", date: "consultado el 3 oct 2026" },
      { label: "UMSNH: Directorio de salud mental", url: "https://www.cptrsi.umich.mx/salud-mental/directorio", date: "consultado el 3 oct 2026" },
      { label: "UMSNH: atención psicológica a la comunidad y a la sociedad en general", url: "https://umich.mx/ofrece-umsnh-atencion-psicologica-a-comunidad-educativa-y-sociedad-en-general/", date: "26 abr 2014" },
    ],
    verifiedAt: DIRECTORY_VERIFIED_LABEL,
  },
];
