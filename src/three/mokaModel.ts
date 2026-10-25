import * as THREE from "three";
import { furShells, setShellCount, skinMaterial, type FurOptions, type SpotSet } from "./furMaterial";
import { fingerprint, loadGeometries, saveGeometries } from "./geometryStore";
import { box, clamp, ellipsoid, roundCone, roundedCylinder, sculpt, smax, smin, smoothstep, sphere, surfaceAlong, withBound, type Paint, type Sdf, type Vec } from "./sculpt";

/**
 * Moka esculpida: vaquita crema con manchas color caramelo, de plastilina
 * afelpada, como en su ilustración (public/assets/pets/animales/vaca/vaca-grande.jpg):
 * nariz grande gris oscuro, ojitos negros brillantes y separados, chapitas
 * rosas, copete de mechones crema, cuernitos color arena, orejas cafés con el
 * hueco rosa y pezuñas oscuras.
 *
 * El cuerpo (con pecho, cadera, cuello y muslos), la cabeza (con mejillas,
 * trompita y cuernitos), las patas, las orejas, la nariz y el copete son
 * superficies suaves esculpidas (ver sculpt.ts); la nariz y el copete van como
 * piezas pegadas encima, igual que en plastilina. Ojos, boca y cola son piezas
 * aparte porque se animan.
 *
 * Unidades: 1 ≈ el largo del cuerpo. Moka mira hacia +z; el suelo es y = 0.
 */

export type MokaAction = "greet" | "pet" | "eat" | "wag" | "smell" | "cheer";
export type UpdateContext = {
  reducedMotion: boolean;
  viewer: THREE.Camera;
  pointer: THREE.Vector2 | null;
  /** Algo que le llama la atención (una mariposa), en coordenadas del mundo; a veces lo sigue con la mirada. */
  interest: THREE.Vector3 | null;
};

// Tomados de la ilustración (medidos en vaca-grande.jpg y ajustados para que, ya con luz, se vean igual).
const COLORS = {
  fur: new THREE.Color("#f2d6b2"),
  spot: new THREE.Color("#a6643b"),
  ear: new THREE.Color("#94573a"),
  hoof: new THREE.Color("#6a5750"),
  hoofLine: new THREE.Color("#4a3d38"),
  nose: new THREE.Color("#4f4640"),
  blush: new THREE.Color("#ee8576"),
  horn: new THREE.Color("#dcae88"),
  innerEar: new THREE.Color("#eda088"),
  tuft: new THREE.Color("#f3dcb6"),
  tail: new THREE.Color("#a6643b"),
  tailTuft: new THREE.Color("#8a5232"),
};

const HEAD_ORIGIN = new THREE.Vector3(0, 1.13, 0.58);
/** Inclinación de las orejas: la punta un poco hacia arriba, como en la ilustración. */
const EAR_TILT = 0.28;

/** Dirección hacia afuera de la piel en `point` (gradiente de la función de distancia). */
function normalAt(sdf: Sdf, point: THREE.Vector3) {
  const e = 0.002;
  return new THREE.Vector3(
    sdf(point.x + e, point.y, point.z) - sdf(point.x - e, point.y, point.z),
    sdf(point.x, point.y + e, point.z) - sdf(point.x, point.y - e, point.z),
    sdf(point.x, point.y, point.z + e) - sdf(point.x, point.y, point.z - e),
  ).normalize();
}

/** Mezcla `out` hacia `color` en proporción `amount` (0–1). */
function tint(out: THREE.Color, color: THREE.Color, amount: number) {
  if (amount > 0) out.lerp(color, Math.min(1, amount));
}

// --- Cuerpo ----------------------------------------------------------------

const THIGHS: Vec[] = [[0.24, 0.43, 0.3], [-0.24, 0.43, 0.3], [0.24, 0.43, -0.32], [-0.24, 0.43, -0.32]];

// Esta función se evalúa cientos de miles de veces al esculpir: cada pieza solo se calcula en la zona
// donde puede tocar la piel (fuera de esa zona, unirla no cambiaría nada), y los bucles van con índice.
const torsoSdf: Sdf = (x, y, z) => {
  let d = ellipsoid(x, y, z, 0, 0.63, -0.02, 0.44, 0.36, 0.56); // Panza.
  if (z > -0.15) d = smin(d, ellipsoid(x, y, z, 0, 0.7, 0.3, 0.34, 0.31, 0.3), 0.12); // Pecho.
  if (z < 0.1) d = smin(d, ellipsoid(x, y, z, 0, 0.68, -0.36, 0.38, 0.32, 0.3), 0.12); // Cadera.
  if (y > 0.42 && z > 0.02) d = smin(d, roundCone(x, y, z, [0, 0.78, 0.34], [0, 1.02, 0.54], 0.21, 0.19), 0.1); // Cuello.
  if (y < 0.72) for (let index = 0; index < THIGHS.length; index++) d = smin(d, ellipsoid(x, y, z, THIGHS[index][0], THIGHS[index][1], THIGHS[index][2], 0.15, 0.17, 0.16), 0.09); // Muslos.
  return d;
};

// Las manchas ya no se pintan por vértice (se veían escalonadas): se dibujan por píxel en furMaterial.ts.
const torsoPaint: Paint = (x, y, z, out) => {
  out.copy(COLORS.fur);
};

/** Color de mancha ÷ color de piel: en la tarjeta gráfica la mancha multiplica el color de la piel. */
const SPOT_TINT = new THREE.Color(COLORS.spot.r / COLORS.fur.r, COLORS.spot.g / COLORS.fur.g, COLORS.spot.b / COLORS.fur.b);

function spotSet(sdf: Sdf, center: Vec, spots: Array<{ direction: Vec; radius: number; seed: number }>): SpotSet {
  return {
    centers: spots.map((spot) => surfaceAlong(sdf, center, spot.direction, 1)),
    radii: spots.map((spot) => spot.radius),
    seeds: spots.map((spot) => spot.seed),
    tint: SPOT_TINT,
  };
}

// Como en la ilustración: una mancha grande sobre el lomo y el hombro, dos chicas en el costado,
// una en la cadera junto a la cola y una en el hombro del otro lado (más una del lado que no se ve).
const torsoSpots = () => spotSet(torsoSdf, [0, 0.66, 0], [
  { direction: [0.62, 0.78, 0.12], radius: 0.25, seed: 0 },
  { direction: [1, 0.02, -0.42], radius: 0.11, seed: 1.7 },
  { direction: [0.9, -0.32, 0.12], radius: 0.085, seed: 3.4 },
  { direction: [0.45, 0.55, -0.9], radius: 0.16, seed: 5.1 },
  { direction: [-0.8, -0.05, 0.62], radius: 0.1, seed: 6.8 },
  { direction: [-1, 0.35, -0.2], radius: 0.18, seed: 8.2 },
]);

// --- Cabeza (coordenadas relativas a HEAD_ORIGIN) ----------------------------

// Cuernitos color arena a los lados del copete, apuntando hacia afuera y arriba.
const HORNS: Array<[Vec, Vec]> = [[[0.27, 0.24, -0.07], [0.41, 0.42, -0.08]], [[-0.27, 0.24, -0.07], [-0.41, 0.42, -0.08]]];
// Nariz: un frijol grande gris oscuro al frente de la trompita, con dos fosas ovaladas.
const NOSE: Vec = [0, -0.125, 0.345];
const NOSTRILS: Vec[] = [[0.09, -0.108, 0.443], [-0.09, -0.108, 0.443]];
// Ojitos negros brillantes, más separados y más chicos que antes (como en la ilustración).
const EYES: Array<[number, number]> = [[0.205, 0.075], [-0.205, 0.075]];
const MOUTH: [number, number] = [0.02, -0.285];

const craniumSdf: Sdf = (x, y, z) => {
  let d = ellipsoid(x, y, z, 0, 0.03, -0.03, 0.44, 0.38, 0.37);
  d = smin(d, ellipsoid(x, y, z, 0.2, -0.1, 0.09, 0.2, 0.18, 0.2), 0.1); // Mejillas.
  d = smin(d, ellipsoid(x, y, z, -0.2, -0.1, 0.09, 0.2, 0.18, 0.2), 0.1);
  return d;
};
/** Trompita crema bajo la nariz (la nariz oscura va pegada encima, como pieza aparte). */
const snoutSdf: Sdf = (x, y, z) => ellipsoid(x, y, z, 0, -0.15, 0.22, 0.25, 0.18, 0.2);
const hornsSdf: Sdf = (x, y, z) => Math.min(roundCone(x, y, z, HORNS[0][0], HORNS[0][1], 0.062, 0.038), roundCone(x, y, z, HORNS[1][0], HORNS[1][1], 0.062, 0.038));

const headSdf: Sdf = (x, y, z) => {
  let d = smin(craniumSdf(x, y, z), snoutSdf(x, y, z), 0.08);
  if (y > 0.14 && Math.abs(x) > 0.12) d = smin(d, hornsSdf(x, y, z), 0.03); // Los cuernos empiezan en y ≈ 0.2.
  return d;
};

/** La nariz, pieza aparte: frijol aplanado al frente, con las fosas hundidas. */
const noseSdf: Sdf = (x, y, z) => {
  let d = ellipsoid(x, y, z, NOSE[0], NOSE[1], NOSE[2], 0.225, 0.13, 0.095);
  if (z > 0.38) {
    for (let index = 0; index < NOSTRILS.length; index++) {
      const [nx, ny, nz] = NOSTRILS[index];
      d = smax(d, -ellipsoid(x, y, z, nx, ny, nz, 0.032, 0.04, 0.03), 0.018);
    }
  }
  return d;
};
const nosePaint: Paint = (_x, _y, _z, out) => { out.copy(COLORS.nose); };

/**
 * Copete: mechones crema que salen de la coronilla y caen sobre la frente y a los lados, como en la
 * ilustración. Cada mechón es una tira de conos redondeados que sigue la curva de la cabeza.
 */
type Strand = { points: THREE.Vector3[]; radii: number[]; bounds: THREE.Sphere };
const STRANDS = [
  // [hacia dónde cae (0 = al frente, + = a la izquierda de Moka), qué tan abajo llega, grosor, qué tan
  //  esponjado, cuánto se curva la punta hacia un lado]. Terminan en punta y no son parejos: así se ven
  //  como mechones de pelo y no como dedos.
  // Al frente, caen sobre la frente.
  [0, 1.08, 0.06, 1, 0.3], [0.2, 0.98, 0.055, 0.9, -0.35], [-0.18, 1.02, 0.056, 1, 0.35], [0.4, 1.03, 0.052, 0.85, 0.3], [-0.42, 0.96, 0.052, 0.9, -0.3],
  [0.62, 0.9, 0.05, 0.8, -0.25], [-0.65, 0.92, 0.05, 0.8, 0.25], [0.88, 0.76, 0.046, 0.7, 0.2], [-0.9, 0.74, 0.046, 0.7, -0.2],
  // Arriba: rizos más cortos y esponjados que dan volumen (uno casi parado al centro).
  [0.1, 0.66, 0.058, 1.6, -0.5], [-0.12, 0.64, 0.058, 1.6, 0.5], [0.35, 0.58, 0.054, 1.4, 0.45], [-0.38, 0.6, 0.054, 1.4, -0.45], [0, 0.45, 0.056, 1.9, 0.6],
  // Atrás y a los lados de atrás.
  [1.5, 0.52, 0.05, 1, 0.3], [-1.5, 0.52, 0.05, 1, -0.3], [2.4, 0.5, 0.05, 1, 0.3], [-2.4, 0.5, 0.05, 1, -0.3], [Math.PI, 0.55, 0.05, 1, 0.2],
] as const;
const TUFT_CENTER: Vec = [0, 0.03, -0.03];
const STRAND_STEPS = 6;
const strands: Strand[] = STRANDS.map(([azimuth, reach, thickness, fluff, curl]) => {
  const points: THREE.Vector3[] = [];
  const radii: number[] = [];
  for (let step = 0; step < STRAND_STEPS; step++) {
    const t = step / (STRAND_STEPS - 1);
    const polar = 0.05 + (reach - 0.05) * t; // Desde la coronilla hasta qué tan abajo cae.
    const turn = azimuth + curl * t * t; // La punta se curva hacia un lado.
    const direction: Vec = [Math.sin(polar) * Math.sin(turn), Math.cos(polar), Math.sin(polar) * Math.cos(turn)];
    const surface = surfaceAlong(craniumSdf, TUFT_CENTER, direction, 0.7);
    // Esponjado: el mechón sale de la raíz, hace un arco bajito y cae con la punta un poco despegada.
    const lift = 0.035 + 0.055 * fluff * Math.sin(Math.PI * 0.9 * t);
    points.push(surface.addScaledVector(new THREE.Vector3(...direction).normalize(), lift));
    radii.push(thickness * 1.42 * (1 - 0.74 * t)); // Termina en punta.
  }
  // Esfera que envuelve el mechón: si el punto ya está más cerca de otro mechón, este ni se calcula.
  const bounds = new THREE.Sphere().setFromPoints(points);
  bounds.radius += radii[0];
  return { points, radii, bounds };
});
const tuftSdf: Sdf = (x, y, z) => {
  let d = Infinity;
  for (let index = 0; index < strands.length; index++) {
    const { points, radii, bounds } = strands[index];
    if (Math.hypot(x - bounds.center.x, y - bounds.center.y, z - bounds.center.z) - bounds.radius > d) continue;
    for (let segment = 0; segment < STRAND_STEPS - 1; segment++) {
      const a = points[segment];
      const b = points[segment + 1];
      d = Math.min(d, roundCone(x, y, z, [a.x, a.y, a.z], [b.x, b.y, b.z], radii[segment], radii[segment + 1]));
    }
  }
  return d;
};
const tuftPaint: Paint = (_x, _y, _z, out) => { out.copy(COLORS.tuft); };

function headPaint(): Paint {
  const center: Vec = [0, 0, 0];
  // Chapitas rosas abajo y afuera de cada ojo.
  const cheeks = [surfaceAlong(headSdf, center, [0.72, -0.24, 0.62], 1), surfaceAlong(headSdf, center, [-0.72, -0.24, 0.62], 1)];
  return (x, y, z, out) => {
    out.copy(COLORS.fur);
    const cranium = craniumSdf(x, y, z);
    for (const cheek of cheeks) tint(out, COLORS.blush, 0.9 * smoothstep(0.1, 0.03, Math.hypot(x - cheek.x, y - cheek.y, z - cheek.z)));
    tint(out, COLORS.horn, smoothstep(0.012, -0.004, hornsSdf(x, y, z) - cranium));
  };
}

// Mancha grande alrededor del ojo derecho de la imagen (hasta la oreja) y otra en la sien del otro lado.
const headSpots = () => spotSet(headSdf, [0, 0, 0], [
  { direction: [0.62, 0.3, 0.68], radius: 0.19, seed: 0.4 },
  { direction: [-0.72, 0.52, 0.42], radius: 0.13, seed: 2.9 },
  { direction: [0.2, 0.55, -0.85], radius: 0.15, seed: 4.6 },
]);

// Dónde quedan los ojos y la boca sobre la piel (los ojos se asoman en la dirección de la piel).
const eyeSpots = EYES.map(([x, y]) => surfaceAlong(headSdf, [x, y, 0], [0, 0, 1], 0.7));
const mouthSpot = surfaceAlong(headSdf, [MOUTH[0], MOUTH[1], 0], [0, 0, 1], 0.7);

/** Cuánto pelo lleva cada punto de la cabeza: nada en ojos, boca y cuernos; corto en la trompita. */
const headFur = (x: number, y: number, z: number) => {
  let amount = 1;
  for (const eye of eyeSpots) amount = Math.min(amount, smoothstep(0.075, 0.11, Math.hypot(x - eye.x, y - eye.y, z - eye.z)));
  amount = Math.min(amount, smoothstep(0.04, 0.08, Math.hypot(x - mouthSpot.x, y - mouthSpot.y, z - mouthSpot.z))); // Boca.
  const cranium = craniumSdf(x, y, z);
  amount *= 1 - 0.55 * smoothstep(0.012, -0.012, snoutSdf(x, y, z) - cranium); // Trompita: pelito corto.
  amount *= 1 - smoothstep(0.012, -0.004, hornsSdf(x, y, z) - cranium); // Cuernos: sin pelo.
  return amount;
};

// --- Pata (relativa a la cadera: cuelga hacia -y; la pezuña toca el suelo en y = -HIP) ---
// Las patas son LEG_EXTRA más largas que al principio y el cuerpo va así de más alto: en la
// ilustración Moka es una becerrita paradita, con patas largas para su cuerpo.
const LEG_EXTRA = 0.1;
const HIP = 0.415 + LEG_EXTRA;

// Patas gorditas y pezuñas grandes, un poco más anchas que la pata, como en la ilustración.
const legSdf: Sdf = (x, y, z) => smin(
  roundCone(x, y, z, [0, 0.04, 0], [0, 0.125 - HIP, 0], 0.13, 0.108),
  roundedCylinder(x, y, z, 0, 0.05 - HIP, 0, 0.12, 0.052, 0.03), // Pezuña.
  0.025,
);

const legPaint: Paint = (x, y, z, out) => {
  out.copy(COLORS.fur);
  tint(out, COLORS.hoof, smoothstep(0.109 - HIP, 0.093 - HIP, y));
  // Rayita de la pezuña partida, al frente.
  if (y < 0.095 - HIP && z > 0) tint(out, COLORS.hoofLine, smoothstep(0.012, 0.004, Math.abs(x)));
};

const legFur = (_x: number, y: number) => smoothstep(0.095 - HIP, 0.12 - HIP, y);

// --- Oreja (base en el origen, se extiende hacia +x; el hueco rosa mira hacia +z) ---
// Grande y ancha como hoja, café por fuera y rosa por dentro.

const earCupSdf: Sdf = (x, y, z) => ellipsoid(x, y, z, 0.21, 0, 0.044, 0.15, 0.09, 0.036);
const earSdf: Sdf = (x, y, z) => {
  const taper = 1 - 0.45 * clamp(x / 0.4, 0, 1); // Se afina hacia la punta.
  const outer = ellipsoid(x, y / taper, z, 0.2, 0, 0, 0.2, 0.135, 0.058) * taper;
  return smax(outer, -earCupSdf(x, y, z), 0.015);
};

const earPaint: Paint = (x, y, z, out) => {
  out.copy(COLORS.ear);
  tint(out, COLORS.innerEar, smoothstep(0.012, 0.002, earCupSdf(x, y, z)));
};

// --- Sombras de los pliegues -------------------------------------------------
// Cada pieza se sombrea viendo también a sus vecinas (en las coordenadas de la pieza), para que el
// cuello se oscurezca bajo la barbilla y la parte de arriba de las patas bajo la panza.

const SHADE = { strength: 0.42, tint: new THREE.Color("#b08a74") };

const torsoScene: Sdf = (x, y, z) => {
  let d = torsoSdf(x, y, z);
  if (y > 0.7 && z > 0.15) d = Math.min(d, headSdf(x - HEAD_ORIGIN.x, y - HEAD_ORIGIN.y, z - HEAD_ORIGIN.z));
  if (y < 0.62) for (let index = 0; index < THIGHS.length; index++) d = Math.min(d, legSdf(x - THIGHS[index][0], y - 0.415, z - THIGHS[index][2]));
  return d;
};

// La cabeza se oscurece bajo el copete, alrededor de la nariz y bajo la barbilla.
const headScene: Sdf = (x, y, z) => {
  let d = headSdf(x, y, z);
  if (y > 0.12) d = Math.min(d, tuftSdf(x, y, z));
  if (z > 0.2 && y < 0.05) d = Math.min(d, noseSdf(x, y, z));
  if (y < -0.1) d = Math.min(d, torsoSdf(x + HEAD_ORIGIN.x, y + HEAD_ORIGIN.y, z + HEAD_ORIGIN.z));
  return d;
};
// Los mechones se sombrean entre sí y donde tocan la cabeza; la nariz, en sus fosas y su borde.
const tuftScene: Sdf = (x, y, z) => Math.min(tuftSdf(x, y, z), headSdf(x, y, z));
const noseScene: Sdf = (x, y, z) => Math.min(noseSdf(x, y, z), headSdf(x, y, z));

// La pata siente el muslo y la panza que tiene encima (igual para las cuatro).
const legScene: Sdf = (x, y, z) => (y > -0.05 ? Math.min(legSdf(x, y, z), ellipsoid(x, y, z, 0, 0.015, 0, 0.15, 0.17, 0.16), ellipsoid(x, y, z, 0, 0.215, 0, 0.44, 0.36, 0.56)) : legSdf(x, y, z));

// --- Montaje y animación ----------------------------------------------------

type MokaGeometries = {
  torsoGeometry: THREE.BufferGeometry;
  headGeometry: THREE.BufferGeometry;
  legGeometry: THREE.BufferGeometry;
  earGeometry: THREE.BufferGeometry;
  noseGeometry: THREE.BufferGeometry;
  tuftGeometry: THREE.BufferGeometry;
};
const PIECES = ["torsoGeometry", "headGeometry", "legGeometry", "earGeometry", "noseGeometry", "tuftGeometry"] as const;

/**
 * Huella del modelo: el código de todas las piezas y sus medidas. Si cambia algo de la forma o de los
 * colores, cambia la huella y la copia guardada en el dispositivo deja de usarse.
 */
function modelFingerprint() {
  const code = [torsoSdf, torsoPaint, craniumSdf, snoutSdf, hornsSdf, headSdf, noseSdf, nosePaint, tuftSdf, tuftPaint, headPaint, headFur, legSdf, legPaint, legFur, earCupSdf, earSdf, earPaint, torsoScene, headScene, tuftScene, noseScene, legScene, sculpt, sculptMoka].map(String).join("|");
  const sizes = JSON.stringify({ LEG_EXTRA, THIGHS, HORNS, NOSE, NOSTRILS, EYES, MOUTH, STRANDS, STRAND_STEPS, colors: Object.values(COLORS).map((color) => color.getHexString()), shade: [SHADE.strength, SHADE.tint.getHexString()] });
  return fingerprint(code + sizes);
}

type SculptJob = { done: Promise<MokaGeometries>; progress: number; listeners: Set<(fraction: number) => void> };
const sculpted = new Map<number, SculptJob>();

/**
 * Esculpe las piezas una sola vez por visita: al volver a abrir la sección,
 * Moka aparece al instante. Las geometrías quedan marcadas con `keep` para que
 * el visor no las libere al cerrarse.
 */
function sculptMoka(detail: number, onProgress: (fraction: number) => void) {
  let job = sculpted.get(detail);
  if (!job) {
    // Quien abra la sección mientras se esculpe (o la abra dos veces) también recibe el avance.
    const listeners = new Set<(fraction: number) => void>();
    const report = (fraction: number) => {
      created.progress = fraction;
      listeners.forEach((listener) => listener(fraction));
    };
    const created: SculptJob = { progress: 0, listeners, done: Promise.resolve() as unknown as Promise<MokaGeometries> };
    created.done = (async () => {
      // ¿Ya se esculpió antes en este dispositivo, con este mismo modelo? Entonces se lee y listo.
      const key = `moka:${detail}:${modelFingerprint()}`;
      const saved = await loadGeometries(key);
      if (saved?.length === PIECES.length) {
        saved.forEach((geometry) => { geometry.userData.keep = true; });
        report(1);
        return Object.fromEntries(PIECES.map((name, index) => [name, saved[index]])) as MokaGeometries;
      }
      const res = (value: number) => Math.round(value * detail);
      const torsoBound: Sdf = (x, y, z) => box(x, y, z, 0, 0.73, 0.03, 0.5, 0.52, 0.75);
      const torsoGeometry = await sculpt({ sdf: withBound(torsoBound, torsoSdf), paint: torsoPaint, occlusion: { scene: torsoScene, ...SHADE }, attributes: { aFur: () => 1 }, center: [0, 0.7, 0.01], halfSize: 0.8, resolution: res(84) });
      report(0.4);
      const headBound: Sdf = (x, y, z) => sphere(x, y, z, 0, 0.06, 0.02, 0.52);
      const headGeometry = await sculpt({ sdf: withBound(headBound, headSdf), paint: headPaint(), occlusion: { scene: headScene, ...SHADE }, attributes: { aFur: headFur }, center: [0, 0.05, 0.02], halfSize: 0.52, resolution: res(72) });
      report(0.7);
      // Copete: mechones con poquito pelo (se ven sus surcos, como plastilina) y un poco de sombra entre ellos.
      const tuftBound: Sdf = (x, y, z) => box(x, y, z, 0, 0.33, 0.02, 0.38, 0.3, 0.4);
      const tuftGeometry = await sculpt({ sdf: withBound(tuftBound, tuftSdf), paint: tuftPaint, occlusion: { scene: tuftScene, strength: 0.5, tint: SHADE.tint }, attributes: { aFur: () => 0.35 }, center: [0, 0.34, 0.02], halfSize: 0.46, resolution: res(70) });
      report(0.82);
      const noseGeometry = await sculpt({ sdf: noseSdf, paint: nosePaint, occlusion: { scene: noseScene, strength: 0.6, tint: new THREE.Color("#1d1715") }, center: [NOSE[0], NOSE[1], NOSE[2]], halfSize: 0.3, resolution: res(48) });
      report(0.88);
      // Cubo de la pata: de y -0.60 a 0.26. Antes la base de la pezuña quedaba en el borde del cubo y salía hueca.
      const legGeometry = await sculpt({ sdf: legSdf, paint: legPaint, occlusion: { scene: legScene, ...SHADE }, attributes: { aFur: legFur }, center: [0, -0.12 - LEG_EXTRA / 2, 0], halfSize: 0.38 + LEG_EXTRA / 2, resolution: res(52) });
      // Una sola oreja para las dos (la otra es su reflejo).
      const earGeometry = await sculpt({ sdf: earSdf, paint: earPaint, occlusion: { scene: earSdf, strength: 0.35, tint: SHADE.tint }, attributes: { aFur: (x, y, z) => 0.7 - 0.5 * smoothstep(0.012, 0.002, earCupSdf(x, y, z)) }, center: [0.2, 0, 0], halfSize: 0.27, resolution: res(46) });
      report(1);
      const geometries: MokaGeometries = { torsoGeometry, headGeometry, legGeometry, earGeometry, noseGeometry, tuftGeometry };
      const pieces = PIECES.map((name) => geometries[name]);
      for (const geometry of pieces) geometry.userData.keep = true;
      void saveGeometries(key, "moka:", pieces);
      return geometries;
    })();
    created.done.catch(() => sculpted.delete(detail)); // Si algo falla, el siguiente intento vuelve a esculpir.
    job = created;
    sculpted.set(detail, job);
  }
  const current = job;
  if (current.progress > 0) onProgress(current.progress);
  current.listeners.add(onProgress);
  return current.done.finally(() => current.listeners.delete(onProgress));
}

/** `detail` < 1 baja la resolución en equipos modestos (la escultura tarda menos y pesa menos). */
export async function buildMoka(detail = 1, onProgress: (fraction: number) => void = () => {}, shellCount = 10) {
  // Pelo: largo, densidad (mechones por unidad) y capas de cada pieza. Menos capas en equipos modestos.
  const furOf = (length: number, density: number, shells: number): FurOptions => ({ length, density, shells: Math.max(3, shells) });
  const torsoFur = furOf(0.018, 115, shellCount);
  const headFurOptions = furOf(0.014, 125, shellCount);
  const legFurOptions = furOf(0.013, 110, shellCount - 2);
  const earFur = furOf(0.012, 125, shellCount - 3);
  const tuftFur = furOf(0.01, 150, shellCount - 4);
  const torsoSpotSet = torsoSpots();
  const headSpotSet = headSpots();
  // Una pata de atrás lleva una mancha por fuera, como en la ilustración.
  const legSpotSet = spotSet(legSdf, [0, -0.08, 0], [{ direction: [1, 0.45, -0.25], radius: 0.1, seed: 1.1 }]);
  const meshOf = (geometry: THREE.BufferGeometry, mat: THREE.Material) => {
    const item = new THREE.Mesh(geometry, mat);
    item.castShadow = true;
    item.receiveShadow = true;
    return item;
  };
  /** Piel + capas de pelo (hijas de la piel, para que se muevan con ella). */
  const furry = (geometry: THREE.BufferGeometry, spots: SpotSet | null, fur: FurOptions) => {
    const skin = meshOf(geometry, skinMaterial(spots, fur));
    skin.add(furShells(geometry, spots, fur));
    return skin;
  };
  const material = (color: string | THREE.Color, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, ...extra });
  const dark = material("#1f1917", { roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.06 });
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const tongue = material("#e98c8c", { roughness: 0.5 });
  const tailMat = material(COLORS.tail, { sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#e8c39e") });
  const tailTuftMat = material(COLORS.tailTuft, { sheen: 1, sheenRoughness: 0.6, sheenColor: new THREE.Color("#d9b08c") });
  // Nariz de plastilina: lisa, con un brillo suave (el color y la sombra de las fosas vienen de la escultura).
  const noseMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45 });

  const { torsoGeometry, headGeometry, legGeometry, earGeometry, noseGeometry, tuftGeometry } = await sculptMoka(detail, onProgress);

  const root = new THREE.Group();
  // `body` agrupa lo que se puede tocar; `bodyPivot` respira y se acuesta; `stance` lleva las patas.
  const body = new THREE.Group();
  const bodyPivot = new THREE.Group();
  const stance = new THREE.Group();
  root.add(body);
  body.add(bodyPivot, stance);
  bodyPivot.add(furry(torsoGeometry, torsoSpotSet, torsoFur));

  // Patas: misma escultura para las cuatro; cada una gira desde la cadera para doblarse al acostarse.
  const legs = THIGHS.map(([x, , z], index) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, HIP, z);
    pivot.add(furry(legGeometry, index === 2 ? legSpotSet : null, legFurOptions));
    stance.add(pivot);
    return { pivot, front: z > 0 };
  });

  // Cola color caramelo: sale de arriba de la cadera, cae en curva y termina en una borla más oscura.
  const tailBase = surfaceAlong(torsoSdf, [0, 0.84, 0], [0, 0.15, -1], 1);
  const tail = new THREE.Group();
  tail.position.set(0, tailBase.y, tailBase.z + 0.02);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.02, -0.12), new THREE.Vector3(0, -0.14, -0.21), new THREE.Vector3(0, -0.33, -0.19)]);
  tail.add(meshOf(new THREE.TubeGeometry(tailCurve, 24, 0.026, 10), tailMat));
  const tuftTip = meshOf(new THREE.SphereGeometry(0.066, 18, 12), tailTuftMat);
  tuftTip.position.set(0, -0.39, -0.18);
  tuftTip.scale.set(1, 1.5, 1);
  tail.add(tuftTip);
  bodyPivot.add(tail);

  // Cabeza, con la nariz y el copete pegados encima.
  const head = new THREE.Group();
  head.position.copy(HEAD_ORIGIN);
  bodyPivot.add(head);
  head.add(furry(headGeometry, headSpotSet, headFurOptions));
  head.add(meshOf(noseGeometry, noseMat));
  head.add(furry(tuftGeometry, null, tuftFur));

  /** Grupo pegado a la piel de la cabeza en `point`, con su +z hacia afuera de la piel. */
  const onSkin = (point: THREE.Vector3, lift: number) => {
    const normal = normalAt(headSdf, point);
    const group = new THREE.Group();
    group.position.copy(point).addScaledVector(normal, lift);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    head.add(group);
    return group;
  };

  // Boca bajo la nariz: sonrisa, y boca abierta con lengüita para el "¡Muuu!".
  const mouth = onSkin(mouthSpot, 0.002);
  const smile = meshOf(new THREE.TorusGeometry(0.048, 0.009, 8, 24, Math.PI), dark);
  smile.position.y = 0.014;
  smile.rotation.z = Math.PI;
  mouth.add(smile);
  const openMouth = new THREE.Group();
  openMouth.position.z = -0.008;
  const mouthHole = meshOf(new THREE.SphereGeometry(1, 20, 12), dark);
  mouthHole.scale.set(0.052, 0.038, 0.02);
  const mouthTongue = meshOf(new THREE.SphereGeometry(1, 16, 10), tongue);
  mouthTongue.position.set(0, -0.013, 0.008);
  mouthTongue.scale.set(0.03, 0.017, 0.014);
  openMouth.add(mouthHole, mouthTongue);
  openMouth.visible = false;
  mouth.add(openMouth);

  // Ojitos negros y brillantes (un destello grande y uno chico), asomando de la piel en su dirección.
  // Para parpadear se aplastan; contenta o dormida se cambian por arquitos.
  const eyes: THREE.Group[] = [];
  const happyEyes: THREE.Mesh[] = [];
  const sleepyEyes: THREE.Mesh[] = [];
  const arcGeometry = new THREE.TorusGeometry(0.04, 0.0095, 8, 20, Math.PI);
  for (const spot of eyeSpots) {
    const socket = onSkin(spot, -0.016);
    const eye = new THREE.Group();
    const ball = meshOf(new THREE.SphereGeometry(0.066, 28, 18), dark);
    ball.scale.set(0.92, 1, 0.62);
    eye.add(ball);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.019, 12, 8), shine).translateX(0.022).translateY(0.027).translateZ(0.034));
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6), shine).translateX(-0.019).translateY(-0.023).translateZ(0.036));
    socket.add(eye);
    eyes.push(eye);
    const happy = meshOf(arcGeometry, dark); // "^": ojitos contentos.
    happy.position.set(0, -0.012, 0.024);
    happy.visible = false;
    socket.add(happy);
    happyEyes.push(happy);
    const sleepy = meshOf(arcGeometry, dark); // "‿": dormida.
    sleepy.position.set(0, 0.012, 0.024);
    sleepy.rotation.z = Math.PI;
    sleepy.visible = false;
    socket.add(sleepy);
    sleepyEyes.push(sleepy);
  }

  // Orejas grandes a los lados, abiertas hacia el frente (se ve el hueco rosa) y con la punta un poco arriba.
  const ears = [1, -1].map((side) => {
    const base = surfaceAlong(headSdf, [0, 0.2, -0.07], [side, 0.08, 0], 0.7);
    const ear = new THREE.Group();
    ear.position.set(base.x - side * 0.03, base.y, base.z);
    ear.scale.x = side;
    ear.rotation.set(0, side * -0.42, side * EAR_TILT);
    ear.add(furry(earGeometry, null, earFur));
    head.add(ear);
    return ear;
  });

  // Ramita de pasto que asoma por un lado de la boca mientras mastica.
  const sprig = new THREE.Group();
  sprig.position.set(mouthSpot.x + 0.03, mouthSpot.y - 0.004, mouthSpot.z - 0.004);
  const sprigMaterial = material("#8dbb6c", { roughness: 0.8, side: THREE.DoubleSide });
  for (const [angle, length] of [[-1.15, 0.11], [-0.75, 0.13], [-0.35, 0.09]] as const) {
    const bladeGeometry = new THREE.PlaneGeometry(0.014, length);
    bladeGeometry.translate(0, length / 2, 0);
    const blade = new THREE.Mesh(bladeGeometry, sprigMaterial);
    blade.rotation.set(0.5, 0, angle);
    sprig.add(blade);
  }
  sprig.visible = false;
  head.add(sprig);

  // Florecita rosa que huele (como en la ilustración): la sostiene con la boca, a un lado de la nariz.
  const heldFlower = new THREE.Group();
  const flowerHead = new THREE.Group();
  flowerHead.position.set(-0.22, -0.215, 0.48);
  flowerHead.scale.setScalar(1.3);
  flowerHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.35, 0.3, 0.89).normalize());
  const petalShape = new THREE.SphereGeometry(1, 16, 10);
  petalShape.scale(0.05, 0.017, 0.036);
  petalShape.translate(0.05, 0, 0);
  const petalMaterial = material("#f2849d", { roughness: 0.62, sheen: 0.4, sheenColor: new THREE.Color("#ffd3dd") });
  for (let index = 0; index < 5; index++) {
    const petal = meshOf(petalShape, petalMaterial);
    petal.rotation.set(0, (index / 5) * Math.PI * 2, 0.2);
    flowerHead.add(petal);
  }
  const flowerCenter = meshOf(new THREE.SphereGeometry(0.03, 16, 10), material("#f6c94a", { roughness: 0.55 }));
  flowerCenter.scale.set(1, 0.7, 1);
  flowerCenter.position.y = 0.012;
  flowerHead.add(flowerCenter);
  heldFlower.add(flowerHead);
  const flowerStem = new THREE.CatmullRomCurve3([mouthSpot.clone().add(new THREE.Vector3(-0.035, 0.004, 0.006)), new THREE.Vector3(-0.12, -0.3, 0.46), new THREE.Vector3(-0.21, -0.235, 0.475)]);
  heldFlower.add(meshOf(new THREE.TubeGeometry(flowerStem, 12, 0.008, 6), material("#7fae63", { roughness: 0.7 })));
  heldFlower.visible = false;
  head.add(heldFlower);

  // Punto del lomo donde a veces se posa una mariposa (ver meadowLife.ts).
  const perch = new THREE.Object3D();
  perch.position.set(0.12, 1.0, -0.14);
  bodyPivot.add(perch);

  // --- Efectos: corazones (al acariciarla) y "z" (al dormir): sprites, siempre de frente a la cámara.
  const spriteTexture = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2); // Se dibuja en 64 × 64 y se guarda al doble para que se vea nítido de cerca.
    draw(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  // Corazón rojo coral "de plastilina", como los de la ilustración: relleno con volumen y un brillo.
  const heartTexture = spriteTexture((ctx) => {
    const heart = () => {
      ctx.beginPath();
      ctx.moveTo(32, 56);
      ctx.bezierCurveTo(6, 38, 4, 12, 20, 9);
      ctx.bezierCurveTo(27, 8, 31, 13, 32, 18);
      ctx.bezierCurveTo(33, 13, 37, 8, 44, 9);
      ctx.bezierCurveTo(60, 12, 58, 38, 32, 56);
    };
    const fill = ctx.createRadialGradient(24, 20, 2, 32, 32, 34);
    fill.addColorStop(0, "#f58a7c");
    fill.addColorStop(0.55, "#e2574c");
    fill.addColorStop(1, "#b83a33");
    ctx.fillStyle = fill;
    heart();
    ctx.fill();
    ctx.fillStyle = "rgba(255, 236, 228, 0.7)";
    ctx.beginPath();
    ctx.ellipse(20, 19, 5, 3.2, -0.6, 0, Math.PI * 2);
    ctx.fill();
  });
  const zTexture = spriteTexture((ctx) => {
    ctx.fillStyle = "#b9a6d6";
    ctx.font = "bold 46px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("z", 32, 34);
  });
  const effects = new THREE.Group();
  root.add(effects);
  type Particle = { sprite: THREE.Sprite; born: number; life: number; from: THREE.Vector3; sway: number; rise: number; size: number };
  const particles: Particle[] = [];
  function spawn(texture: THREE.Texture, from: THREE.Vector3, size: number, rise: number, life: number) {
    if (particles.length > 24) return; // Tope: acariciar sin parar no llena la escena de corazones.
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.position.copy(from);
    sprite.scale.setScalar(0.001);
    effects.add(sprite);
    particles.push({ sprite, born: now, life, from: from.clone(), sway: Math.random() * Math.PI * 2, rise, size });
  }

  // --- Estado ------------------------------------------------------------------
  type IdleKind = "ear" | "tilt" | "sniff" | "look" | "hop" | "swish" | "prance";
  const IDLE_DURATION: Record<IdleKind, number> = { ear: 0.45, tilt: 1.6, sniff: 1.4, look: 2.8, hop: 0.55, swish: 1, prance: 1.5 };
  let action: { name: MokaAction; started: number; spawned: number } | null = null;
  let idle: { kind: IdleKind; started: number; side: number } | null = null;
  let nextIdle = 5;
  let rubbing: { point: THREE.Vector3; lastHeart: number } | null = null;
  let happyUntil = 0;
  let sleeping = false;
  let sleepAmount = 0;
  // Apenada (en "Lo que le dirías a alguien que quieres"): cabeza, orejas y cola abajo hasta que la consuelan.
  let downcast = false;
  let downAmount = 0;
  let nextZ = 0;
  let nextBlink = 1.5;
  let blinkStart = -1;
  let now = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const viewerLocal = new THREE.Vector3();
  const interestLocal = new THREE.Vector3();

  function play(name: MokaAction) {
    if (sleeping) return;
    action = { name, started: now, spawned: 0 };
    idle = null;
  }

  function setSleeping(value: boolean) {
    sleeping = value;
    if (value) {
      action = null;
      rubbing = null;
    }
    nextZ = now + 0.6;
  }

  function setDowncast(value: boolean) {
    downcast = value;
    if (value) action = null;
  }

  /** La mano (dedo o mouse) pasa sobre Moka en `worldPoint`; null cuando se suelta. */
  function rub(worldPoint: THREE.Vector3 | null) {
    if (!worldPoint) {
      if (rubbing) happyUntil = now + 0.9; // Se queda contenta un momento después de la caricia.
      rubbing = null;
      return;
    }
    if (sleeping) return;
    const local = root.worldToLocal(worldPoint.clone());
    if (rubbing) rubbing.point.copy(local);
    else rubbing = { point: local, lastHeart: now - 1 };
    idle = null;
  }

  function update(time: number, delta: number, context: UpdateContext) {
    now = time;
    const calm = context.reducedMotion ? 0 : 1;
    const ease = (speed: number) => 1 - Math.exp(-delta * speed);

    // Acostarse y levantarse poco a poco: baja el cuerpo, dobla las patas de adelante y esconde las de atrás.
    sleepAmount += ((sleeping ? 1 : 0) - sleepAmount) * ease(3);
    const lie = sleepAmount;
    downAmount += ((downcast ? 1 : 0) - downAmount) * ease(2.2);
    const down = downAmount;
    bodyPivot.position.y = LEG_EXTRA - (0.2 + LEG_EXTRA) * lie;
    stance.position.y = -(0.2 + LEG_EXTRA) * lie;
    for (const leg of legs) {
      leg.pivot.rotation.x = leg.front ? -1.4 * lie : 0;
      leg.pivot.scale.y = 1 - (leg.front ? 0.35 : 0.75) * lie;
    }

    // Vida propia: si nadie la toca, cada 4–9 s hace algo pequeño (oreja, cabeza, olfatear, mirar la mariposa…).
    const awake = !sleeping && lie < 0.1;
    if (action || rubbing || !awake || down > 0.05) idle = null;
    else if (!idle && time > nextIdle) {
      const kinds: IdleKind[] = context.interest ? ["ear", "tilt", "sniff", "look", "look", "hop", "swish", "prance"] : ["ear", "tilt", "sniff", "hop", "swish", "prance"];
      let kind = kinds[Math.floor(Math.random() * kinds.length)];
      if (kind === "hop" && context.reducedMotion) kind = "tilt";
      idle = { kind, started: time, side: Math.random() < 0.5 ? -1 : 1 };
    }
    if (idle && time - idle.started > IDLE_DURATION[idle.kind]) {
      idle = null;
      nextIdle = time + 4 + Math.random() * 5;
    }
    const idleT = idle ? (time - idle.started) / IDLE_DURATION[idle.kind] : 0;
    const idleEnvelope = idle ? Math.sin(Math.PI * idleT) : 0;

    // Respira (más hondo y lento dormida) y mueve las orejas.
    const breath = lie > 0.5 ? 0.03 * Math.sin(time * 1.3) : 0.018 * Math.sin(time * (2.1 - 0.8 * down)) * calm;
    let squash = 1;
    ears.forEach((ear, index) => {
      ear.rotation.x = 0.08 * Math.sin(time * 1.7 + index) * calm;
      ear.rotation.z = (index === 0 ? 1 : -1) * (EAR_TILT - 0.55 * down); // Apenada, las orejas caen.
    });

    // Hacia dónde mira: a ti (la cámara), al cursor si está encima, a la mano que la acaricia o a la mariposa.
    viewerLocal.copy(context.viewer.position);
    root.worldToLocal(viewerLocal);
    let lookAt = viewerLocal;
    if (idle?.kind === "look" && context.interest) lookAt = root.worldToLocal(interestLocal.copy(context.interest));
    else if (rubbing) lookAt = interestLocal.copy(rubbing.point).lerp(viewerLocal, 0.5);
    let yawTarget = clamp(Math.atan2(lookAt.x, lookAt.z - HEAD_ORIGIN.z), -0.8, 0.8);
    let pitchTarget = clamp(-Math.atan2(lookAt.y - HEAD_ORIGIN.y - LEG_EXTRA, Math.hypot(lookAt.x, lookAt.z - HEAD_ORIGIN.z)), -0.35, 0.25);
    if (context.pointer && lookAt === viewerLocal) {
      yawTarget = clamp(yawTarget + context.pointer.x * 0.35, -0.85, 0.85);
      pitchTarget = clamp(pitchTarget - context.pointer.y * 0.2, -0.35, 0.25);
    }
    if (lie > 0.05) {
      yawTarget *= 1 - lie;
      pitchTarget = pitchTarget * (1 - lie) + 0.28 * lie; // Dormida, la cabeza se recarga hacia abajo.
    }
    if (down > 0.01) {
      // Apenada: mira al suelo, casi de frente, con la cabeza un poquito ladeada.
      yawTarget *= 1 - 0.7 * down;
      pitchTarget = pitchTarget * (1 - down) + 0.36 * down;
    }
    lookYaw += (yawTarget - lookYaw) * ease(4);
    lookPitch += (pitchTarget - lookPitch) * ease(4);
    head.rotation.set(lookPitch + 0.04 * Math.sin(time * 1.3) * calm, lookYaw + 0.06 * Math.sin(time * 0.55) * calm, 0.05 * Math.sin(time * 0.9) * calm + 0.1 * down);
    head.position.y = HEAD_ORIGIN.y;
    bodyPivot.rotation.y = 0;

    let wag = 0.25 * Math.sin(time * 2.4) * calm * (1 - lie) * (1 - 0.85 * down);
    let jump = 0;
    let happy = time < happyUntil;
    let mouthOpen = 0;
    // Patita levantada (como en la ilustración): cuánto y cuál de las de adelante (0 = la izquierda de Moka).
    let prance = 0;
    let pranceLeg = 1;
    let flowerShown = 0;
    sprig.visible = false;

    if (idle) {
      if (idle.kind === "ear") {
        const ear = ears[idle.side > 0 ? 0 : 1];
        ear.rotation.x += 0.7 * Math.sin(idleT * Math.PI * 2) * (1 - idleT);
        ear.rotation.z += (idle.side > 0 ? 1 : -1) * 0.25 * idleEnvelope;
      } else if (idle.kind === "tilt") {
        head.rotation.z += 0.3 * idleEnvelope * idle.side;
      } else if (idle.kind === "sniff") {
        head.rotation.x += 0.16 * idleEnvelope + 0.025 * Math.sin(time * 32) * idleEnvelope;
      } else if (idle.kind === "hop") {
        jump = 0.09 * Math.sin(Math.PI * idleT);
      } else if (idle.kind === "swish") {
        wag = 1.0 * Math.sin(idleT * Math.PI * 3) * idleEnvelope;
      } else if (idle.kind === "prance") {
        prance = idleEnvelope;
        pranceLeg = idle.side > 0 ? 0 : 1;
        head.rotation.z += 0.08 * idleEnvelope * idle.side;
      }
    }

    if (rubbing) {
      // Acariciada: ojitos contentos, se inclina hacia la mano, mueve la cola y salen corazones donde la tocas.
      happy = true;
      head.rotation.z -= clamp(rubbing.point.x * 0.6, -0.25, 0.25);
      wag = 0.8 * Math.sin(time * 15);
      if (time - rubbing.lastHeart > 0.28) {
        rubbing.lastHeart = time;
        spawn(heartTexture, rubbing.point.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, 0.06)), 0.13, 0.35, 1.3);
      }
    }

    if (action) {
      const elapsed = time - action.started;
      if (action.name === "greet") {
        // Se agacha (0–0.15 s), salta con "¡Muuu!" (0.15–0.75 s), las orejas se levantan y al caer se aplasta un poquito.
        const progress = clamp((elapsed - 0.15) / 0.6, 0, 1);
        if (!context.reducedMotion) {
          const crouch = elapsed < 0.15 ? Math.sin((elapsed / 0.15) * Math.PI * 0.5) : Math.max(0, 1 - (elapsed - 0.15) / 0.08);
          const land = elapsed > 0.75 ? Math.max(0, 1 - (elapsed - 0.75) / 0.18) : 0;
          squash = 1 - 0.08 * crouch - 0.06 * land;
          jump = 0.3 * Math.sin(Math.PI * progress);
        }
        ears.forEach((ear, index) => { ear.rotation.z += (index === 0 ? 1 : -1) * 0.4 * Math.sin(Math.PI * progress); });
        mouthOpen = elapsed > 0.12 && elapsed < 1.05 ? 1 : 0;
        wag = 0.7 * Math.sin(elapsed * 18);
        if (elapsed > 1.3) action = null;
      } else if (action.name === "pet") {
        // Botón "Acariciar": se acurruca de lado, cierra los ojitos y salen corazones a los lados.
        happy = true;
        head.rotation.z += 0.16 * Math.sin(elapsed * 5) * Math.min(1, elapsed * 3);
        wag = 0.8 * Math.sin(elapsed * 15);
        while (action.spawned < 4 && elapsed > action.spawned * 0.3) {
          const side = action.spawned % 2 === 0 ? 1 : -1;
          spawn(heartTexture, new THREE.Vector3(side * (0.32 + Math.random() * 0.12), 1.28 + LEG_EXTRA + Math.random() * 0.1, 0.55), 0.16, 0.42, 1.6);
          action.spawned++;
        }
        if (elapsed > 1.8) action = null;
      } else if (action.name === "eat") {
        // Baja la cabeza al pasto, arranca una ramita, la mastica (boca que abre y cierra) y vuelve.
        const down = Math.min(1, elapsed / 0.4) * Math.min(1, Math.max(0, (2.4 - elapsed) / 0.4));
        head.rotation.x = lookPitch * (1 - down) + 0.6 * down;
        head.rotation.y = lookYaw * (1 - down);
        head.position.y = HEAD_ORIGIN.y - 0.14 * down;
        const chewing = elapsed > 0.55 && elapsed < 2.3;
        if (chewing) {
          const chew = Math.abs(Math.sin((elapsed - 0.55) * 9));
          mouthOpen = 0.35 + 0.5 * chew;
          head.rotation.z += 0.025 * Math.sin(elapsed * 18);
          sprig.visible = true;
          sprig.rotation.z = 0.15 * Math.sin(elapsed * 9);
        }
        if (elapsed > 2.4) action = null;
      } else if (action.name === "smell") {
        // Oler una flor: aparece la florecita en su boca, la huele (cabeza que se mece y olfatea), cierra
        // los ojitos contenta, levanta una patita y salen corazones junto a la flor.
        const shown = smoothstep(0, 0.35, elapsed) * (1 - smoothstep(2.6, 3, elapsed));
        flowerShown = shown;
        head.rotation.x += 0.1 * shown + (elapsed > 0.4 && elapsed < 1.7 ? 0.022 * Math.sin(elapsed * 30) * shown : 0);
        head.rotation.z += 0.14 * shown;
        happy = elapsed > 0.55 && elapsed < 2.7;
        prance = smoothstep(0.5, 0.9, elapsed) * (1 - smoothstep(2.2, 2.7, elapsed));
        pranceLeg = 1;
        wag = 0.5 * Math.sin(elapsed * 10) * shown;
        while (action.spawned < 3 && elapsed > 0.8 + action.spawned * 0.4) {
          const at = root.worldToLocal(flowerHead.getWorldPosition(new THREE.Vector3()));
          spawn(heartTexture, at.add(new THREE.Vector3(-0.08 + Math.random() * 0.06, 0.12, 0.02)), 0.12 + 0.03 * action.spawned, 0.4, 1.5);
          action.spawned++;
        }
        if (elapsed > 3) action = null;
      } else if (action.name === "cheer") {
        // Consolada: levanta la cabeza, sube las orejas, da un saltito contenta y salen corazones alrededor.
        const progress = clamp((elapsed - 0.45) / 0.55, 0, 1);
        if (!context.reducedMotion) jump = 0.16 * Math.sin(Math.PI * progress);
        ears.forEach((ear, index) => { ear.rotation.z += (index === 0 ? 1 : -1) * 0.35 * Math.sin(Math.PI * clamp(elapsed / 1.2, 0, 1)); });
        happy = elapsed > 0.35 && elapsed < 2.6;
        mouthOpen = elapsed > 0.5 && elapsed < 0.95 ? 0.7 : 0;
        wag = 0.8 * Math.sin(elapsed * 14) * Math.min(1, elapsed * 2);
        while (action.spawned < 6 && elapsed > 0.5 + action.spawned * 0.22) {
          const angle = -0.9 + (action.spawned / 5) * 1.8;
          spawn(heartTexture, new THREE.Vector3(Math.sin(angle) * 0.42, 1.3 + LEG_EXTRA + Math.cos(angle) * 0.1, 0.45), 0.14, 0.45, 1.6);
          action.spawned++;
        }
        if (elapsed > 2.8) action = null;
      } else {
        // Mover la cola: cola feliz y el cuerpo se menea con ella.
        const envelope = Math.min(1, elapsed * 4) * Math.max(0, Math.min(1, (1.6 - elapsed) * 3));
        wag = 0.9 * Math.sin(elapsed * 16);
        bodyPivot.rotation.y = 0.07 * Math.sin(elapsed * 16 + Math.PI) * envelope * calm;
        if (elapsed > 1.6) action = null;
      }
    }

    // La patita se levanta hacia adelante y el cuerpo se echa tantito para atrás.
    if (prance > 0 && lie < 0.1) {
      legs[pranceLeg].pivot.rotation.x -= 0.6 * prance * calm;
      bodyPivot.rotation.x = -0.03 * prance * calm;
    } else bodyPivot.rotation.x = 0;
    heldFlower.visible = flowerShown > 0.01;
    heldFlower.scale.setScalar(Math.max(0.001, flowerShown));

    root.position.y = jump;
    bodyPivot.scale.set(1 + (1 - squash) * 0.5, (1 + breath) * squash, 1 + (1 - squash) * 0.5);
    tail.rotation.set(0.1 + 0.4 * lie - 0.22 * down, wag, 0);
    openMouth.visible = mouthOpen > 0;
    openMouth.scale.set(1, Math.max(0.3, mouthOpen), 1);
    smile.visible = !openMouth.visible;
    smile.scale.y = 1 - 0.7 * down; // Apenada, la sonrisa se aplana.

    // Ojos: dormida → "‿"; contenta → "^"; si no, abiertos y parpadeando cada 2.5–5 s.
    const asleep = lie > 0.5;
    if (time > nextBlink && blinkStart < 0) blinkStart = time;
    const blinkProgress = blinkStart < 0 ? -1 : (time - blinkStart) / 0.16;
    const openness = blinkProgress < 0 || blinkProgress > 1 ? 1 : Math.max(0.08, Math.abs(1 - 2 * blinkProgress));
    if (blinkProgress > 1) {
      blinkStart = -1;
      nextBlink = time + 2.5 + Math.random() * 2.5;
    }
    eyes.forEach((eye) => {
      eye.visible = !asleep && !happy;
      eye.scale.y = openness * (1 - 0.3 * down); // Apenada, ojitos entrecerrados.
    });
    happyEyes.forEach((item) => { item.visible = happy && !asleep; });
    sleepyEyes.forEach((item) => { item.visible = asleep; });

    if (asleep && time > nextZ) {
      spawn(zTexture, new THREE.Vector3(0.28, 1.15 + LEG_EXTRA * (1 - lie), 0.55), 0.13, 0.4, 2.4);
      nextZ = time + 1.1;
    }

    // Partículas: suben, se balancean, crecen y se desvanecen.
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      const age = (time - particle.born) / particle.life;
      if (age >= 1) {
        effects.remove(particle.sprite);
        particle.sprite.material.dispose();
        particles.splice(index, 1);
        continue;
      }
      particle.sprite.position.set(particle.from.x + 0.06 * Math.sin(particle.sway + age * 6), particle.from.y + particle.rise * age, particle.from.z);
      particle.sprite.scale.setScalar(particle.size * Math.min(1, age * 5) * (1 + age * 0.4));
      particle.sprite.material.opacity = 1 - age * age;
    }
  }

  /** Menos capas de pelo si el equipo va lento (el pelo conserva su largo). `fraction`: de 0 a 1. */
  function setFurLayers(fraction: number) {
    root.traverse((object) => {
      if (object instanceof THREE.InstancedMesh && object.userData.furShells) setShellCount(object, Math.round(object.instanceMatrix.count * Math.min(1, fraction)));
    });
  }

  return {
    root,
    body,
    play,
    setSleeping,
    setDowncast,
    rub,
    update,
    setFurLayers,
    /** 0 despierta … 1 dormida: la escena usa esto para oscurecerse (modo noche). */
    night: () => sleepAmount,
    /** Dónde se posa una mariposa (en el lomo), en coordenadas del mundo. */
    perch: (out: THREE.Vector3) => perch.getWorldPosition(out),
    textures: [heartTexture, zTexture],
  };
}
