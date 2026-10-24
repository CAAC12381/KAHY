import * as THREE from "three";

/**
 * Piel y pelo de los compañeros esculpidos.
 *
 * Manchas: se calculan en la tarjeta gráfica para cada píxel, a partir de la
 * posición en la pieza. Antes eran colores por vértice (uno cada ~1.5 cm) y
 * el borde de cada mancha se veía escalonado ("pixeleado"); así queda nítido
 * a cualquier distancia.
 *
 * Pelo: "capas" (shells). La misma malla se dibuja varias veces, cada una un
 * poquito inflada hacia afuera, y en cada capa solo quedan los puntos que
 * forman mechones; las capas de afuera tienen mechones más delgados, así que
 * terminan en punta. Se dibujan todas de una vez (InstancedMesh). Cada vértice
 * dice cuánto pelo lleva (atributo `aFur`, de 0 a 1): sin pelo en ojos, boca
 * y pezuñas; corto en el hocico.
 */

export type SpotSet = {
  /** Centros de las manchas, en coordenadas de la pieza (sobre la piel). */
  centers: THREE.Vector3[];
  radii: number[];
  /** Semilla de cada mancha: cambia la forma de su borde irregular. */
  seeds: number[];
  /** Color de mancha ÷ color de piel (por canal): la mancha multiplica el color de la piel. */
  tint: THREE.Color;
};

export type FurOptions = { length: number; density: number; shells: number };

const MAX_SPOTS = 6;

const vertexHead = /* glsl */ `
attribute float aFur;
varying vec3 vSkinPos;
varying float vFur;
varying float vShell;
uniform float uFurLength;
uniform float uShellCount;
`;

const vertexBody = /* glsl */ `
vSkinPos = position;
vFur = aFur;
#ifdef FUR_SHELL
  vShell = float(gl_InstanceID + 1) / uShellCount;
  transformed += normalize(objectNormal) * uFurLength * aFur * vShell;
  transformed.y -= uFurLength * aFur * vShell * vShell * 0.35; // Las puntas caen un poquito.
#else
  vShell = 0.0;
#endif
`;

const fragmentHead = /* glsl */ `
varying vec3 vSkinPos;
varying float vFur;
varying float vShell;
uniform vec4 uSpots[${MAX_SPOTS}];
uniform float uSeeds[${MAX_SPOTS}];
uniform vec3 uSpotTint;
uniform float uFurDensity;
float kahyHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
// Misma "ondulación" que wobble() en sculpt.ts, para bordes de mancha irregulares.
float kahyWobble(vec3 p) {
  return sin(p.x * 11.3 + p.y * 3.7) * sin(p.y * 9.1 + p.z * 5.3) * sin(p.z * 7.7 + p.x * 4.1);
}
`;

const fragmentBody = /* glsl */ `
float spot = 0.0;
for (int i = 0; i < ${MAX_SPOTS}; i++) {
  vec4 s = uSpots[i];
  if (s.w <= 0.0) continue;
  float seed = uSeeds[i];
  float radius = s.w * (1.0 + 0.18 * kahyWobble(vSkinPos * 1.3 + vec3(seed, 0.0, -seed)));
  spot = max(spot, smoothstep(radius + 0.006, radius - 0.006, length(vSkinPos - s.xyz)));
}
diffuseColor.rgb *= mix(vec3(1.0), uSpotTint, spot);
#ifdef FUR_SHELL
  if (vFur < 0.05) discard;
  vec3 strandPos = vSkinPos * uFurDensity;
  vec3 cell = floor(strandPos);
  vec3 center = vec3(kahyHash(cell + 17.1), kahyHash(cell + 31.7), kahyHash(cell + 47.3)) * 0.5 + 0.25;
  float thickness = (1.0 - vShell) * 0.5 + 0.06; // Más delgado hacia la punta.
  if (kahyHash(cell) < vShell * 0.7 || length(fract(strandPos) - center) > thickness) discard;
  diffuseColor.rgb *= mix(0.8, 1.06, vShell); // Raíz en sombra, puntas con luz.
#else
  diffuseColor.rgb *= mix(1.0, 0.88, vFur); // Entre los mechones se ve la piel, un poco más oscura.
#endif
`;

function spotUniforms(spots: SpotSet | null) {
  const values = Array.from({ length: MAX_SPOTS }, (_, index) => spots && index < spots.centers.length
    ? new THREE.Vector4(spots.centers[index].x, spots.centers[index].y, spots.centers[index].z, spots.radii[index])
    : new THREE.Vector4(0, 0, 0, -1));
  const seeds = Array.from({ length: MAX_SPOTS }, (_, index) => spots?.seeds[index] ?? 0);
  return { uSpots: { value: values }, uSeeds: { value: seeds }, uSpotTint: { value: spots?.tint.clone() ?? new THREE.Color(1, 1, 1) } };
}

function skinParameters(): THREE.MeshPhysicalMaterialParameters {
  return { vertexColors: true, roughness: 0.78, sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color("#f7e6cc") };
}

function inject(material: THREE.MeshPhysicalMaterial, uniforms: Record<string, THREE.IUniform>, shell: boolean) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${vertexHead}`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n${vertexBody}`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${fragmentHead}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${fragmentBody}`);
  };
  // Todas las pieles comparten el mismo programa (solo cambian los valores), y todas las capas de pelo el suyo.
  material.customProgramCacheKey = () => (shell ? "kahy-fur-shell" : "kahy-skin");
  material.userData.uniforms = uniforms; // Para cambiar valores después (p. ej. menos capas si el equipo va lento).
  if (shell) material.defines = { ...material.defines, FUR_SHELL: "" };
}

/** Piel de una pieza esculpida (con o sin manchas). La geometría necesita el atributo `aFur`. */
export function skinMaterial(spots: SpotSet | null, fur: FurOptions) {
  const material = new THREE.MeshPhysicalMaterial(skinParameters());
  inject(material, { ...spotUniforms(spots), uFurLength: { value: fur.length }, uShellCount: { value: fur.shells }, uFurDensity: { value: fur.density } }, false);
  return material;
}

/**
 * Cambia cuántas capas de pelo se dibujan (menos = más rápido). El pelo conserva su largo:
 * las capas se reparten de nuevo entre la piel y la punta.
 */
export function setShellCount(shells: THREE.InstancedMesh, count: number) {
  const visible = Math.max(2, Math.min(count, shells.instanceMatrix.count));
  shells.count = visible;
  const uniforms = (shells.material as THREE.Material).userData.uniforms as Record<string, THREE.IUniform> | undefined;
  if (uniforms?.uShellCount) uniforms.uShellCount.value = visible;
}

/**
 * Capas de pelo sobre una pieza: va como hija de la malla de la piel (así se mueve con ella).
 * No proyecta sombra (la sombra la da la piel) y se dibuja en una sola llamada.
 */
export function furShells(geometry: THREE.BufferGeometry, spots: SpotSet | null, fur: FurOptions) {
  const material = new THREE.MeshPhysicalMaterial(skinParameters());
  inject(material, { ...spotUniforms(spots), uFurLength: { value: fur.length }, uShellCount: { value: fur.shells }, uFurDensity: { value: fur.density } }, true);
  const shells = new THREE.InstancedMesh(geometry, material, fur.shells);
  const identity = new THREE.Matrix4();
  for (let index = 0; index < fur.shells; index++) shells.setMatrixAt(index, identity);
  shells.castShadow = false;
  shells.receiveShadow = true;
  shells.userData.furShells = true;
  return shells;
}
