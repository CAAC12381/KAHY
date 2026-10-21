import * as THREE from "three";
import { furShells, skinMaterial, type FurOptions, type SpotSet } from "./furMaterial";
import { fingerprint, loadGeometries, saveGeometries } from "./geometryStore";
import { box, clamp, ellipsoid, roundCone, roundedCylinder, sculpt, smax, smin, smoothstep, sphere, surfaceAlong, withBound, type Paint, type Sdf, type Vec } from "./sculpt";

/**
 * Moka esculpida: vaquita color crema con manchas cafés, como peluche.
 *
 * El cuerpo (con pecho, cadera, cuello y muslos), la cabeza (con mejillas,
 * hocico, cuernitos y copete), las patas y las orejas son superficies suaves
 * de una sola pieza (ver sculpt.ts); ojos, boca, cola, collar y campanita son
 * piezas aparte porque se animan o necesitan otro material.
 *
 * Unidades: 1 ≈ el largo del cuerpo. Moka mira hacia +z; el suelo es y = 0.
 */

export type MokaAction = "greet" | "pet" | "eat" | "wag";
export type UpdateContext = { reducedMotion: boolean; viewer: THREE.Camera; pointer: THREE.Vector2 | null };

const COLORS = {
  fur: new THREE.Color("#fbf3e6"),
  spot: new THREE.Color("#8a5a38"),
  hoof: new THREE.Color("#5a3b2a"),
  hoofLine: new THREE.Color("#3e281c"),
  snout: new THREE.Color("#f4b8ad"),
  nostril: new THREE.Color("#b9746a"),
  blush: new THREE.Color("#f39c9c"),
  horn: new THREE.Color("#efdcae"),
  innerEar: new THREE.Color("#f3aea6"),
};

const HEAD_ORIGIN = new THREE.Vector3(0, 1.13, 0.58);

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

const torsoSpots = () => spotSet(torsoSdf, [0, 0.66, 0], [
  { direction: [1, 0.45, -0.3], radius: 0.2, seed: 0 },
  { direction: [-1, 0.2, 0.25], radius: 0.19, seed: 1.7 },
  { direction: [-0.3, 1, -0.6], radius: 0.16, seed: 3.4 },
  { direction: [0.45, -0.25, 0.8], radius: 0.09, seed: 5.1 },
  { direction: [-0.65, -0.35, -0.7], radius: 0.12, seed: 6.8 },
]);

// --- Cabeza (coordenadas relativas a HEAD_ORIGIN) ----------------------------

const HORNS: Array<[Vec, Vec]> = [[[0.17, 0.29, -0.06], [0.23, 0.46, -0.09]], [[-0.17, 0.29, -0.06], [-0.23, 0.46, -0.09]]];
const TUFT: Array<[number, number, number, number]> = [[0, 0.38, 0.06, 0.07], [0.07, 0.36, 0.1, 0.055], [-0.07, 0.36, 0.1, 0.055], [0, 0.35, 0.16, 0.05]];
const NOSTRILS: Vec[] = [[0.09, -0.12, 0.43], [-0.09, -0.12, 0.43]];

const craniumSdf: Sdf = (x, y, z) => {
  let d = ellipsoid(x, y, z, 0, 0.03, -0.03, 0.42, 0.38, 0.37);
  d = smin(d, ellipsoid(x, y, z, 0.19, -0.09, 0.1, 0.19, 0.17, 0.2), 0.1); // Mejillas.
  d = smin(d, ellipsoid(x, y, z, -0.19, -0.09, 0.1, 0.19, 0.17, 0.2), 0.1);
  return d;
};
const muzzleSdf: Sdf = (x, y, z) => ellipsoid(x, y, z, 0, -0.16, 0.24, 0.29, 0.2, 0.2);
const hornsSdf: Sdf = (x, y, z) => Math.min(roundCone(x, y, z, HORNS[0][0], HORNS[0][1], 0.05, 0.026), roundCone(x, y, z, HORNS[1][0], HORNS[1][1], 0.05, 0.026));
const tuftSdf: Sdf = (x, y, z) => {
  let d = Infinity;
  for (let index = 0; index < TUFT.length; index++) d = Math.min(d, sphere(x, y, z, TUFT[index][0], TUFT[index][1], TUFT[index][2], TUFT[index][3]));
  return d;
};

const headSdf: Sdf = (x, y, z) => {
  let d = smin(craniumSdf(x, y, z), muzzleSdf(x, y, z), 0.06);
  if (y > 0.16) d = smin(d, hornsSdf(x, y, z), 0.03); // Los cuernos empiezan en y ≈ 0.24.
  if (y > 0.22) d = smin(d, tuftSdf(x, y, z), 0.04); // El copete empieza en y ≈ 0.30.
  if (z > 0.33 && y > -0.2 && y < -0.04) {
    for (let index = 0; index < NOSTRILS.length; index++) d = smax(d, -sphere(x, y, z, NOSTRILS[index][0], NOSTRILS[index][1], NOSTRILS[index][2], 0.03), 0.02); // Fosas.
  }
  return d;
};

function headPaint(): Paint {
  const center: Vec = [0, 0, 0];
  const cheeks = [surfaceAlong(headSdf, center, [0.62, -0.18, 0.75], 1), surfaceAlong(headSdf, center, [-0.62, -0.18, 0.75], 1)];
  return (x, y, z, out) => {
    out.copy(COLORS.fur);
    const cranium = craniumSdf(x, y, z);
    for (const cheek of cheeks) tint(out, COLORS.blush, 0.65 * smoothstep(0.1, 0.02, Math.hypot(x - cheek.x, y - cheek.y, z - cheek.z)));
    tint(out, COLORS.snout, smoothstep(0.012, -0.012, muzzleSdf(x, y, z) - cranium));
    for (const [nx, ny, nz] of NOSTRILS) tint(out, COLORS.nostril, smoothstep(0.036, 0.028, Math.hypot(x - nx, y - ny, z - nz)));
    tint(out, COLORS.horn, smoothstep(0.012, -0.004, hornsSdf(x, y, z) - cranium));
    tint(out, COLORS.spot, smoothstep(0.012, -0.004, tuftSdf(x, y, z) - cranium));
  };
}

const headSpots = () => spotSet(headSdf, [0, 0, 0], [
  { direction: [0.6, 0.35, 0.72], radius: 0.15, seed: 0.4 }, // Parche del ojo.
  { direction: [-0.45, 0.75, -0.45], radius: 0.15, seed: 2.9 },
]);

const EYES: Vec[] = [[0.16, 0.07, 0.33], [-0.16, 0.07, 0.33]];

/** Cuánto pelo lleva cada punto de la cabeza: nada en ojos, boca, fosas y cuernos; corto en el hocico. */
const headFur = (x: number, y: number, z: number) => {
  let amount = 1;
  for (const [ex, ey, ez] of EYES) amount = Math.min(amount, smoothstep(0.09, 0.13, Math.hypot(x - ex, y - ey, z - ez)));
  amount = Math.min(amount, smoothstep(0.05, 0.09, Math.hypot(x, y + 0.215, z - 0.43))); // Boca.
  for (const [nx, ny, nz] of NOSTRILS) amount = Math.min(amount, smoothstep(0.035, 0.06, Math.hypot(x - nx, y - ny, z - nz)));
  const cranium = craniumSdf(x, y, z);
  amount *= 1 - 0.65 * smoothstep(0.012, -0.012, muzzleSdf(x, y, z) - cranium); // Hocico: pelito corto.
  amount *= 1 - smoothstep(0.012, -0.004, hornsSdf(x, y, z) - cranium); // Cuernos: sin pelo.
  return amount;
};

// --- Pata (relativa a la cadera: cuelga hacia -y; la pezuña toca el suelo en y = -0.415) ---

const legSdf: Sdf = (x, y, z) => smin(
  roundCone(x, y, z, [0, 0.04, 0], [0, -0.3, 0], 0.12, 0.097),
  roundedCylinder(x, y, z, 0, -0.37, 0, 0.105, 0.045, 0.02), // Pezuña.
  0.03,
);

const legPaint: Paint = (x, y, z, out) => {
  out.copy(COLORS.fur);
  tint(out, COLORS.hoof, smoothstep(-0.322, -0.336, y));
  // Rayita de la pezuña partida, al frente.
  if (y < -0.33 && z > 0) tint(out, COLORS.hoofLine, smoothstep(0.012, 0.004, Math.abs(x)));
};

const legFur = (_x: number, y: number) => smoothstep(-0.335, -0.31, y);

// --- Oreja (base en el origen, se extiende hacia +x; el hueco rosa mira hacia +z) ---

const earCupSdf: Sdf = (x, y, z) => ellipsoid(x, y, z, 0.18, 0, 0.05, 0.13, 0.058, 0.036);
const earSdf: Sdf = (x, y, z) => {
  const taper = 1 - 0.5 * clamp(x / 0.34, 0, 1); // Se afina hacia la punta, como hoja.
  const outer = ellipsoid(x, y / taper, z, 0.17, 0, 0, 0.17, 0.09, 0.06) * taper;
  return smax(outer, -earCupSdf(x, y, z), 0.015);
};

function earPaint(outside: THREE.Color): Paint {
  return (x, y, z, out) => {
    out.copy(outside);
    tint(out, COLORS.innerEar, smoothstep(0.01, 0.002, earCupSdf(x, y, z)));
  };
}

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

const headScene: Sdf = (x, y, z) => (y < -0.1 ? Math.min(headSdf(x, y, z), torsoSdf(x + HEAD_ORIGIN.x, y + HEAD_ORIGIN.y, z + HEAD_ORIGIN.z)) : headSdf(x, y, z));

// La pata siente el muslo y la panza que tiene encima (igual para las cuatro).
const legScene: Sdf = (x, y, z) => (y > -0.05 ? Math.min(legSdf(x, y, z), ellipsoid(x, y, z, 0, 0.015, 0, 0.15, 0.17, 0.16), ellipsoid(x, y, z, 0, 0.215, 0, 0.44, 0.36, 0.56)) : legSdf(x, y, z));

// --- Montaje y animación ----------------------------------------------------


type MokaGeometries = { torsoGeometry: THREE.BufferGeometry; headGeometry: THREE.BufferGeometry; legGeometry: THREE.BufferGeometry; earGeometries: THREE.BufferGeometry[] };
/**
 * Huella del modelo: el código de todas las piezas y sus medidas. Si cambia algo de la forma o de los
 * colores, cambia la huella y la copia guardada en el dispositivo deja de usarse.
 */
function modelFingerprint() {
  const code = [torsoSdf, torsoPaint, craniumSdf, muzzleSdf, hornsSdf, tuftSdf, headSdf, headPaint, headFur, legSdf, legPaint, legFur, earCupSdf, earSdf, earPaint, torsoScene, headScene, legScene, sculpt, sculptMoka].map(String).join("|");
  const sizes = JSON.stringify({ THIGHS, HORNS, TUFT, NOSTRILS, EYES, colors: Object.values(COLORS).map((color) => color.getHexString()), shade: [SHADE.strength, SHADE.tint.getHexString()] });
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
      if (saved?.length === 5) {
        saved.forEach((geometry) => { geometry.userData.keep = true; });
        report(1);
        const [torsoGeometry, headGeometry, legGeometry, ...earGeometries] = saved;
        return { torsoGeometry, headGeometry, legGeometry, earGeometries };
      }
      const res = (value: number) => Math.round(value * detail);
      const torsoBound: Sdf = (x, y, z) => box(x, y, z, 0, 0.73, 0.03, 0.5, 0.52, 0.75);
      const torsoGeometry = await sculpt({ sdf: withBound(torsoBound, torsoSdf), paint: torsoPaint, occlusion: { scene: torsoScene, ...SHADE }, attributes: { aFur: () => 1 }, center: [0, 0.7, 0.01], halfSize: 0.8, resolution: res(84) });
      report(0.45);
      const headBound: Sdf = (x, y, z) => sphere(x, y, z, 0, 0.06, 0.02, 0.52);
      const headGeometry = await sculpt({ sdf: withBound(headBound, headSdf), paint: headPaint(), occlusion: { scene: headScene, ...SHADE }, attributes: { aFur: headFur }, center: [0, 0.05, 0.02], halfSize: 0.52, resolution: res(72) });
      report(0.85);
      // Cubo de la pata: de y -0.50 a 0.26. Antes la base de la pezuña (y -0.415) quedaba en el borde y salía hueca.
      const legGeometry = await sculpt({ sdf: legSdf, paint: legPaint, occlusion: { scene: legScene, ...SHADE }, attributes: { aFur: legFur }, center: [0, -0.12, 0], halfSize: 0.38, resolution: res(46) });
      const earGeometries: THREE.BufferGeometry[] = []; // [crema, café]
      for (const outside of [COLORS.fur, COLORS.spot]) {
        earGeometries.push(await sculpt({ sdf: earSdf, paint: earPaint(outside), occlusion: { scene: earSdf, strength: 0.35, tint: SHADE.tint }, attributes: { aFur: (x, y, z) => 0.6 - 0.45 * smoothstep(0.012, 0.002, earCupSdf(x, y, z)) }, center: [0.17, 0, 0], halfSize: 0.22, resolution: res(40) }));
      }
      report(1);
      const pieces = [torsoGeometry, headGeometry, legGeometry, ...earGeometries];
      for (const geometry of pieces) geometry.userData.keep = true;
      void saveGeometries(key, "moka:", pieces);
      return { torsoGeometry, headGeometry, legGeometry, earGeometries };
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
  const torsoFur = furOf(0.024, 95, shellCount);
  const headFurOptions = furOf(0.017, 110, shellCount);
  const legFurOptions = furOf(0.013, 110, shellCount - 2);
  const earFur = furOf(0.01, 120, shellCount - 4);
  const torsoSpotSet = torsoSpots();
  const headSpotSet = headSpots();
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
  const material = (color: string, extra: THREE.MeshPhysicalMaterialParameters = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, ...extra });
  const dark = material("#2b211d", { roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.08 });
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const tongue = material("#e98c8c", { roughness: 0.5 });
  const collar = material("#d9706f", { roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#ffd0cc") });
  const bellMat = material("#e8b84a", { roughness: 0.22, metalness: 0.85 });
  const spotMat = material("#8a5a38", { sheen: 1, sheenColor: new THREE.Color("#d9b08c") });
  const furMat = material("#fbf3e6", { sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color("#fff1dc") });


  const { torsoGeometry, headGeometry, legGeometry, earGeometries } = await sculptMoka(detail, onProgress);

  const root = new THREE.Group();
  // `body` agrupa lo que se puede tocar; `bodyPivot` respira y se acuesta; `stance` lleva las patas.
  const body = new THREE.Group();
  const bodyPivot = new THREE.Group();
  const stance = new THREE.Group();
  root.add(body);
  body.add(bodyPivot, stance);
  bodyPivot.add(furry(torsoGeometry, torsoSpotSet, torsoFur));

  // Patas: misma escultura para las cuatro; cada una gira desde la cadera para doblarse al acostarse.
  const legs = THIGHS.map(([x, , z]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.415, z);
    pivot.add(furry(legGeometry, null, legFurOptions));
    stance.add(pivot);
    return { pivot, front: z > 0 };
  });

  // Collar alrededor del cuello (perpendicular a su eje) y campanita bajo la barbilla.
  const collarRing = meshOf(new THREE.TorusGeometry(0.222, 0.036, 16, 56), collar);
  collarRing.position.set(0, 0.9, 0.44);
  collarRing.rotation.x = -0.94;
  bodyPivot.add(collarRing);
  const bell = new THREE.Group();
  bell.position.set(0, 0.76, 0.62);
  bell.add(meshOf(new THREE.TorusGeometry(0.022, 0.007, 8, 16), bellMat));
  const bellBall = meshOf(new THREE.SphereGeometry(0.065, 28, 18), bellMat);
  bellBall.position.set(0, -0.06, 0.02);
  bell.add(bellBall);
  const clapper = meshOf(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 8), dark);
  clapper.position.set(0, -0.12, 0.04);
  bell.add(clapper);
  bodyPivot.add(bell);

  // Cola: sale de donde termina la cadera; gira desde su base.
  const tailBase = surfaceAlong(torsoSdf, [0, 0.8, 0], [0, 0, -1], 1);
  const tail = new THREE.Group();
  tail.position.set(0, tailBase.y, tailBase.z + 0.03);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.06, -0.12), new THREE.Vector3(0, -0.22, -0.17), new THREE.Vector3(0, -0.36, -0.12)]);
  tail.add(meshOf(new THREE.TubeGeometry(tailCurve, 24, 0.022, 10), furMat));
  const tuftTip = meshOf(new THREE.SphereGeometry(0.06, 18, 12), spotMat);
  tuftTip.position.set(0, -0.4, -0.1);
  tuftTip.scale.set(1, 1.4, 1);
  tail.add(tuftTip);
  bodyPivot.add(tail);

  // Cabeza.
  const head = new THREE.Group();
  head.position.copy(HEAD_ORIGIN);
  bodyPivot.add(head);
  head.add(furry(headGeometry, headSpotSet, headFurOptions));

  // Boca sobre el hocico: sonrisa, y boca abierta con lengüita para el "¡Muuu!".
  const mouthAt = surfaceAlong(headSdf, [0, -0.235, 0], [0, 0, 1], 0.7);
  const smile = meshOf(new THREE.TorusGeometry(0.05, 0.0105, 8, 24, Math.PI), dark);
  smile.position.set(0, mouthAt.y + 0.012, mouthAt.z + 0.002);
  smile.rotation.z = Math.PI;
  head.add(smile);
  const openMouth = new THREE.Group();
  openMouth.position.set(0, mouthAt.y, mouthAt.z - 0.006);
  const mouthHole = meshOf(new THREE.SphereGeometry(1, 20, 12), dark);
  mouthHole.scale.set(0.055, 0.04, 0.02);
  const mouthTongue = meshOf(new THREE.SphereGeometry(1, 16, 10), tongue);
  mouthTongue.position.set(0, -0.014, 0.008);
  mouthTongue.scale.set(0.032, 0.018, 0.014);
  openMouth.add(mouthHole, mouthTongue);
  openMouth.visible = false;
  head.add(openMouth);

  // Ojos grandes y brillantes (con dos destellos), justo sobre la piel. Para parpadear se aplastan;
  // contenta o dormida se cambian por arquitos.
  const eyes: THREE.Group[] = [];
  const happyEyes: THREE.Mesh[] = [];
  const sleepyEyes: THREE.Mesh[] = [];
  const arcGeometry = new THREE.TorusGeometry(0.046, 0.011, 8, 20, Math.PI);
  for (const x of [0.16, -0.16]) {
    const surface = surfaceAlong(headSdf, [x, 0.07, 0], [0, 0, 1], 0.7);
    const eye = new THREE.Group();
    eye.position.set(x, 0.07, surface.z - 0.03);
    const ball = meshOf(new THREE.SphereGeometry(0.08, 28, 18), dark);
    ball.scale.set(0.85, 1, 0.55);
    eye.add(ball);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.023, 12, 8), shine).translateX(0.024).translateY(0.034).translateZ(0.04));
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 6), shine).translateX(-0.02).translateY(-0.026).translateZ(0.042));
    head.add(eye);
    eyes.push(eye);
    const happy = meshOf(arcGeometry, dark); // "^": ojitos contentos.
    happy.position.set(x, 0.06, surface.z + 0.01);
    happy.visible = false;
    head.add(happy);
    happyEyes.push(happy);
    const sleepy = meshOf(arcGeometry, dark); // "‿": dormida.
    sleepy.position.set(x, 0.08, surface.z + 0.01);
    sleepy.rotation.z = Math.PI;
    sleepy.visible = false;
    head.add(sleepy);
    sleepyEyes.push(sleepy);
  }

  // Orejas a los lados (la izquierda café), caídas y un poco al frente para que se vea el hueco rosa.
  const ears = [1, -1].map((side) => {
    const base = surfaceAlong(headSdf, [0, 0.14, -0.05], [side, 0, 0], 0.7);
    const ear = new THREE.Group();
    ear.position.set(base.x - side * 0.035, 0.14, -0.05);
    ear.scale.x = side;
    ear.rotation.set(0, side * -0.4, side * -0.38);
    ear.add(furry(earGeometries[side === 1 ? 0 : 1], null, earFur));
    head.add(ear);
    return ear;
  });

  // --- Efectos: corazones al acariciarla y "z" al dormir (sprites, siempre de frente a la cámara).
  const spriteTexture = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    draw(canvas.getContext("2d")!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  };
  const heartTexture = spriteTexture((ctx) => {
    ctx.fillStyle = "#f28aa0";
    ctx.beginPath();
    ctx.moveTo(32, 56);
    ctx.bezierCurveTo(6, 38, 4, 12, 20, 9);
    ctx.bezierCurveTo(27, 8, 31, 13, 32, 18);
    ctx.bezierCurveTo(33, 13, 37, 8, 44, 9);
    ctx.bezierCurveTo(60, 12, 58, 38, 32, 56);
    ctx.fill();
  });
  const zTexture = spriteTexture((ctx) => {
    ctx.fillStyle = "#8a6aa0";
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
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.position.copy(from);
    sprite.scale.setScalar(0.001);
    effects.add(sprite);
    particles.push({ sprite, born: now, life, from: from.clone(), sway: Math.random() * Math.PI * 2, rise, size });
  }

  let action: { name: MokaAction; started: number; spawned: number } | null = null;
  let sleeping = false;
  let sleepAmount = 0;
  let nextZ = 0;
  let nextBlink = 1.5;
  let blinkStart = -1;
  let now = 0;
  let lookYaw = 0;
  let lookPitch = 0;
  const viewerLocal = new THREE.Vector3();

  function play(name: MokaAction) {
    if (sleeping) return;
    action = { name, started: now, spawned: 0 };
  }

  function setSleeping(value: boolean) {
    sleeping = value;
    if (value) action = null;
    nextZ = now + 0.6;
  }

  function update(time: number, delta: number, context: UpdateContext) {
    now = time;
    const calm = context.reducedMotion ? 0 : 1;
    const ease = (speed: number) => 1 - Math.exp(-delta * speed);

    // Acostarse y levantarse poco a poco: baja el cuerpo, dobla las patas de adelante y esconde las de atrás.
    sleepAmount += ((sleeping ? 1 : 0) - sleepAmount) * ease(3);
    const lie = sleepAmount;
    bodyPivot.position.y = -0.2 * lie;
    stance.position.y = -0.2 * lie;
    for (const leg of legs) {
      leg.pivot.rotation.x = leg.front ? -1.4 * lie : 0;
      leg.pivot.scale.y = 1 - (leg.front ? 0.35 : 0.75) * lie;
    }

    // Respira (más hondo y lento dormida) y mueve las orejas.
    const breath = lie > 0.5 ? 0.03 * Math.sin(time * 1.3) : 0.018 * Math.sin(time * 2.1) * calm;
    bodyPivot.scale.set(1, 1 + breath, 1);
    ears.forEach((ear, index) => { ear.rotation.x = 0.08 * Math.sin(time * 1.7 + index) * calm; });

    // Te mira: gira la cabeza hacia la cámara (y hacia el cursor si está encima), dentro de un límite.
    viewerLocal.copy(context.viewer.position);
    root.worldToLocal(viewerLocal);
    let yawTarget = clamp(Math.atan2(viewerLocal.x, viewerLocal.z - HEAD_ORIGIN.z), -0.75, 0.75);
    let pitchTarget = clamp(-Math.atan2(viewerLocal.y - HEAD_ORIGIN.y, Math.hypot(viewerLocal.x, viewerLocal.z - HEAD_ORIGIN.z)), -0.3, 0.2);
    if (context.pointer) {
      yawTarget = clamp(yawTarget + context.pointer.x * 0.35, -0.85, 0.85);
      pitchTarget = clamp(pitchTarget - context.pointer.y * 0.2, -0.35, 0.25);
    }
    if (lie > 0.05) {
      yawTarget *= 1 - lie;
      pitchTarget = pitchTarget * (1 - lie) + 0.28 * lie; // Dormida, la cabeza se recarga hacia abajo.
    }
    lookYaw += (yawTarget - lookYaw) * ease(4);
    lookPitch += (pitchTarget - lookPitch) * ease(4);
    head.rotation.set(lookPitch + 0.04 * Math.sin(time * 1.3) * calm, lookYaw + 0.06 * Math.sin(time * 0.55) * calm, 0.05 * Math.sin(time * 0.9) * calm);
    head.position.y = HEAD_ORIGIN.y;

    let wag = 0.25 * Math.sin(time * 2.4) * calm * (1 - lie);
    let jump = 0;
    let bellSwing = 0.15 * Math.sin(time * 2.1) * calm * (1 - lie);
    let happy = false;
    openMouth.visible = false;

    if (action) {
      const elapsed = time - action.started;
      if (action.name === "greet") {
        // Saltito con "¡Muuu!", campanita sonando y cola feliz.
        const progress = Math.min(1, elapsed / 0.75);
        jump = context.reducedMotion ? 0 : 0.3 * Math.sin(Math.PI * progress);
        if (!context.reducedMotion && progress > 0.85) bodyPivot.scale.y *= 0.95;
        openMouth.visible = elapsed < 0.9;
        wag = 0.7 * Math.sin(elapsed * 18);
        bellSwing = 0.6 * Math.sin(elapsed * 20) * Math.max(0, 1 - elapsed / 1.2);
        if (elapsed > 1.2) action = null;
      } else if (action.name === "pet") {
        // Cierra los ojitos contenta, ladea la cabeza y salen corazones a los lados.
        happy = true;
        head.rotation.z += 0.16 * Math.sin(elapsed * 5) * Math.min(1, elapsed * 3);
        wag = 0.8 * Math.sin(elapsed * 15);
        while (action.spawned < 4 && elapsed > action.spawned * 0.3) {
          const side = action.spawned % 2 === 0 ? 1 : -1;
          spawn(heartTexture, new THREE.Vector3(side * (0.32 + Math.random() * 0.12), 1.28 + Math.random() * 0.1, 0.55), 0.16, 0.42, 1.6);
          action.spawned++;
        }
        if (elapsed > 1.8) action = null;
      } else if (action.name === "eat") {
        // Baja la cabeza al pasto, mastica y vuelve.
        const down = Math.min(1, elapsed / 0.4) * Math.min(1, Math.max(0, (2.2 - elapsed) / 0.4));
        head.rotation.x = lookPitch * (1 - down) + 0.6 * down;
        head.rotation.y = lookYaw * (1 - down);
        head.position.y = HEAD_ORIGIN.y - 0.14 * down;
        head.rotation.z += 0.03 * Math.sin(elapsed * 14) * down;
        if (elapsed > 2.2) action = null;
      } else {
        wag = 0.85 * Math.sin(elapsed * 16);
        if (elapsed > 1.6) action = null;
      }
    }

    root.position.y = jump;
    tail.rotation.set(0.1 + 0.4 * lie, wag, 0);
    bell.rotation.z = bellSwing;
    smile.visible = !openMouth.visible;

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
      eye.scale.y = openness;
    });
    happyEyes.forEach((item) => { item.visible = happy && !asleep; });
    sleepyEyes.forEach((item) => { item.visible = asleep; });

    if (asleep && time > nextZ) {
      spawn(zTexture, new THREE.Vector3(0.28, 1.15, 0.55), 0.13, 0.4, 2.4);
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

  return { root, body, play, setSleeping, update, textures: [heartTexture, zTexture] };
}
