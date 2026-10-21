import * as THREE from "three";
import { MarchingCubes } from "three/addons/objects/MarchingCubes.js";

/**
 * "Escultura" de figuras suaves para los compañeros en 3D.
 *
 * En vez de encimar esferas y cilindros (que dejan uniones visibles), cada
 * pieza se describe con una función de distancia (SDF): para cada punto dice
 * qué tan lejos está de la superficie (negativo = adentro). Las formas se
 * funden con `smin`, como plastilina, y `sculpt` convierte esa función en una
 * malla con marching cubes (de three.js). Los colores se pintan en 3D con
 * `paint`, así las manchas siguen la piel sin estirarse.
 *
 * Se calcula una sola vez al abrir la sección (alrededor de un segundo) y en
 * partes, para no congelar la página. Referencia de las fórmulas:
 * https://iquilezles.org/articles/distfunctions/
 */

export type Sdf = (x: number, y: number, z: number) => number;
export type Paint = (x: number, y: number, z: number, out: THREE.Color) => void;
export type Vec = [number, number, number];

const sq = (value: number) => value * value;

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Unión suave: `k` es qué tanto se redondea la unión (en unidades del modelo). */
export function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Resta o intersección suave. */
export function smax(a: number, b: number, k: number) {
  return -smin(-a, -b, k);
}

export function sphere(px: number, py: number, pz: number, cx: number, cy: number, cz: number, r: number) {
  return Math.hypot(px - cx, py - cy, pz - cz) - r;
}

export function ellipsoid(px: number, py: number, pz: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const x = px - cx;
  const y = py - cy;
  const z = pz - cz;
  const k0 = Math.sqrt(sq(x / rx) + sq(y / ry) + sq(z / rz));
  const k1 = Math.sqrt(sq(x / (rx * rx)) + sq(y / (ry * ry)) + sq(z / (rz * rz)));
  return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

/** Cono redondeado entre los puntos a (radio r1) y b (radio r2): patas, cuello, cuernos. */
export function roundCone(px: number, py: number, pz: number, a: Vec, b: Vec, r1: number, r2: number) {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = r1 - r2;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = px - a[0];
  const pay = py - a[1];
  const paz = pz - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const x2 = sq(pax * l2 - bax * y) + sq(pay * l2 - bay * y) + sq(paz * l2 - baz * y);
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

/** Cilindro vertical con bordes redondeados (radio, media altura, redondeo), centrado en (cx, cy, cz). */
export function roundedCylinder(px: number, py: number, pz: number, cx: number, cy: number, cz: number, radius: number, halfHeight: number, rounding: number) {
  const dx = Math.hypot(px - cx, pz - cz) - (radius - rounding);
  const dy = Math.abs(py - cy) - (halfHeight - rounding);
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) - rounding;
}

/** Caja (medio lado hx, hy, hz) centrada en (cx, cy, cz). */
export function box(px: number, py: number, pz: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) {
  const qx = Math.abs(px - cx) - hx;
  const qy = Math.abs(py - cy) - hy;
  const qz = Math.abs(pz - cz) - hz;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
}

/** Ruido barato y estable (sin azar) entre -1 y 1, para que los bordes de las manchas no sean círculos perfectos. */
export function wobble(x: number, y: number, z: number) {
  return Math.sin(x * 11.3 + y * 3.7) * Math.sin(y * 9.1 + z * 5.3) * Math.sin(z * 7.7 + x * 4.1);
}

/**
 * Punto de la superficie partiendo de `origin` (que debe estar adentro) en la
 * dirección `direction`. Sirve para colocar ojos, boca y orejas justo sobre la piel.
 */
export function surfaceAlong(sdf: Sdf, origin: Vec, direction: Vec, maxDistance: number): THREE.Vector3 {
  const dir = new THREE.Vector3(...direction).normalize();
  let inside = 0;
  let outside = maxDistance;
  for (let step = 0; step < 40; step++) {
    const middle = (inside + outside) / 2;
    if (sdf(origin[0] + dir.x * middle, origin[1] + dir.y * middle, origin[2] + dir.z * middle) < 0) inside = middle;
    else outside = middle;
  }
  return new THREE.Vector3(...origin).addScaledVector(dir, (inside + outside) / 2);
}

/**
 * Atajo para el espacio vacío: lejos de la pieza basta saber que se está afuera,
 * así que si `bound` (una forma simple que la envuelve) dice que el punto está a
 * más de `margin` de distancia, se usa ese valor y no se calcula la pieza completa.
 * Lo que envuelve debe contener la pieza entera.
 */
export function withBound(bound: Sdf, sdf: Sdf, margin = 0.08): Sdf {
  return (x, y, z) => {
    const outside = bound(x, y, z);
    return outside > margin ? outside : sdf(x, y, z);
  };
}

/**
 * Oclusión ambiental: qué tan "tapado" está un punto por la figura que lo
 * rodea (bajo la barbilla, entre la pata y el cuerpo, dentro de la oreja).
 * 1 = al aire libre, 0 = muy metido. Se calcula con la misma función de
 * distancia, mirando un poco hacia afuera desde la superficie.
 */
function ambientOcclusion(scene: Sdf, x: number, y: number, z: number, nx: number, ny: number, nz: number) {
  let occlusion = 0;
  let weight = 1;
  for (let step = 1; step <= 4; step++) {
    const h = 0.012 + 0.022 * step;
    occlusion += (h - scene(x + nx * h, y + ny * h, z + nz * h)) * weight;
    weight *= 0.7;
  }
  return clamp(1 - 2.4 * occlusion, 0, 1);
}

type SculptOptions = {
  sdf: Sdf;
  paint: Paint;
  /**
   * Sombras suaves en los pliegues: `scene` es la figura completa alrededor de la pieza (por
   * ejemplo, el cuerpo más la cabeza y las patas), para que una pieza "sienta" a sus vecinas.
   */
  occlusion?: { scene: Sdf; strength: number; tint: THREE.Color };
  /** Valores extra por vértice (por ejemplo, cuánto pelo lleva cada zona), calculados ya sobre la piel. */
  attributes?: Record<string, (x: number, y: number, z: number) => number>;
  /**
   * Cubo que contiene la pieza (centro y medio lado). La pieza debe quedar a más de 3 celdas de
   * cada cara: marching cubes no cierra la superficie en el borde, y lo que lo toque queda abierto
   * (así quedó hueca la base de las pezuñas). `geometry.userData.touchesBounds` avisa si pasa.
   */
  center: Vec;
  halfSize: number;
  /** Celdas por lado: más = más suave, pero más lento de calcular. */
  resolution: number;
};

/**
 * Cede el turno al navegador. Con MessageChannel y no con setTimeout: en pestañas en segundo
 * plano el navegador retrasa cada setTimeout hasta 1 s, y eso alargaba la carga varios segundos.
 */
export function yieldToPage() {
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close(); // Un canal abierto mantiene vivo el proceso (en las pruebas de Node no terminaban).
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

export async function sculpt({ sdf, paint, occlusion, attributes, center, halfSize, resolution }: SculptOptions): Promise<THREE.BufferGeometry> {
  const cubes = new MarchingCubes(resolution, new THREE.MeshBasicMaterial(), false, true, 160000);
  cubes.isolation = 0;
  const { size, size2, field, palette } = cubes;
  const half = size / 2;
  const nearSurface = (halfSize / half) * 2.5; // Solo se pinta cerca de la piel: el resto no se ve.
  const color = new THREE.Color();
  let lastYield = performance.now();
  for (let z = 0; z < size; z++) {
    // Cede el turno cada ~40 ms para que la página siga respondiendo mientras se esculpe.
    if (performance.now() - lastYield > 40) {
      await yieldToPage();
      lastYield = performance.now();
    }
    const wz = center[2] + ((z - half) / half) * halfSize;
    for (let y = 0; y < size; y++) {
      const wy = center[1] + ((y - half) / half) * halfSize;
      for (let x = 0; x < size; x++) {
        const wx = center[0] + ((x - half) / half) * halfSize;
        const index = x + y * size + z * size2;
        const distance = sdf(wx, wy, wz);
        field[index] = -distance; // marching cubes de three.js toma "adentro" como valores altos.
        if (Math.abs(distance) < nearSurface) {
          paint(wx, wy, wz, color);
          palette[index * 3] = color.r;
          palette[index * 3 + 1] = color.g;
          palette[index * 3 + 2] = color.b;
        }
      }
    }
  }
  cubes.update();

  const vertexCount = cubes.count;
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const colors = cubes.colorArray.slice(0, vertexCount * 3);
  const normal = new THREE.Vector3();
  for (let index = 0; index < vertexCount; index++) {
    const offset = index * 3;
    positions[offset] = center[0] + cubes.positionArray[offset] * halfSize;
    positions[offset + 1] = center[1] + cubes.positionArray[offset + 1] * halfSize;
    positions[offset + 2] = center[2] + cubes.positionArray[offset + 2] * halfSize;
    normal.fromArray(cubes.normalArray, offset).normalize().toArray(normals, offset);
  }
  cubes.geometry.dispose();
  (cubes.material as THREE.Material).dispose();

  const geometry = indexed(positions, normals, colors, center, halfSize);
  const cell = halfSize / half;
  const margin = halfSize - 3 * cell;
  const position = geometry.attributes.position;
  for (let vertex = 0; vertex < position.count; vertex++) {
    if (Math.abs(position.getX(vertex) - center[0]) > margin || Math.abs(position.getY(vertex) - center[1]) > margin || Math.abs(position.getZ(vertex) - center[2]) > margin) {
      geometry.userData.touchesBounds = true;
      console.warn("[sculpt] La pieza toca el borde de su cubo y puede quedar abierta: agranda halfSize o mueve center.", center, halfSize);
      break;
    }
  }
  for (const [name, valueAt] of Object.entries(attributes ?? {})) {
    const values = new Float32Array(position.count);
    for (let vertex = 0; vertex < position.count; vertex++) values[vertex] = valueAt(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
    geometry.setAttribute(name, new THREE.BufferAttribute(values, 1));
  }
  // Sombra de los pliegues: se calcula por vértice ya en la superficie (mucho menos trabajo que en toda la rejilla).
  if (occlusion) {
    const normalAttribute = geometry.attributes.normal;
    const colorAttribute = geometry.attributes.color;
    for (let vertex = 0; vertex < position.count; vertex++) {
      const ao = ambientOcclusion(occlusion.scene, position.getX(vertex), position.getY(vertex), position.getZ(vertex), normalAttribute.getX(vertex), normalAttribute.getY(vertex), normalAttribute.getZ(vertex));
      color.setRGB(colorAttribute.getX(vertex), colorAttribute.getY(vertex), colorAttribute.getZ(vertex)).lerp(occlusion.tint, (1 - ao) * occlusion.strength);
      colorAttribute.setXYZ(vertex, color.r, color.g, color.b);
    }
  }
  return geometry;
}

/**
 * Marching cubes repite cada vértice en todos los triángulos que lo comparten
 * (unas 6 veces). Se unen los que caen en el mismo punto: la posición se
 * redondea a 1/65536 del cubo y se convierte en un número único, mucho más
 * rápido que mergeVertices de three.js (que arma textos para comparar).
 */
function indexed(positions: Float32Array, normals: Float32Array, colors: Float32Array, center: Vec, halfSize: number) {
  const count = positions.length / 3;
  const seen = new Map<number, number>();
  const index = new Uint32Array(count);
  const outPositions = new Float32Array(positions.length);
  const outNormals = new Float32Array(normals.length);
  const outColors = new Float32Array(colors.length);
  const levels = 65536;
  const span = levels * 2 + 1;
  let unique = 0;
  for (let vertex = 0; vertex < count; vertex++) {
    const offset = vertex * 3;
    const qx = Math.round(((positions[offset] - center[0]) / halfSize + 1) * levels);
    const qy = Math.round(((positions[offset + 1] - center[1]) / halfSize + 1) * levels);
    const qz = Math.round(((positions[offset + 2] - center[2]) / halfSize + 1) * levels);
    const key = (qx * span + qy) * span + qz;
    let target = seen.get(key);
    if (target === undefined) {
      target = unique++;
      seen.set(key, target);
      for (let axis = 0; axis < 3; axis++) {
        outPositions[target * 3 + axis] = positions[offset + axis];
        outNormals[target * 3 + axis] = normals[offset + axis];
        outColors[target * 3 + axis] = colors[offset + axis];
      }
    }
    index[vertex] = target;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(outPositions.slice(0, unique * 3), 3));
  geometry.setAttribute("normal", new THREE.BufferAttribute(outNormals.slice(0, unique * 3), 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(outColors.slice(0, unique * 3), 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}
