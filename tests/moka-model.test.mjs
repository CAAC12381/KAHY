// Pruebas de la escultura de Moka (src/three/mokaModel.ts), sin navegador.
//
// Por qué existen: el 20 de octubre de 2026 la base de las pezuñas quedó justo en el borde del cubo
// donde se esculpe la pata y salió abierta; de pie no se notaba (toca el suelo), pero al dormir
// Moka levanta las patas y se veía un hueco. Esta prueba revisa que cada pieza esté cerrada.
import assert from "node:assert/strict";
import { test } from "node:test";

// Lo poco del navegador que usa el modelo (los dibujitos de corazón y "z" se pintan en un canvas).
globalThis.window ??= globalThis;
const noop = () => {};
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => noop }) }) };

const { buildMoka } = await import("../src/three/mokaModel.ts");

/**
 * Aristas que solo usa un triángulo: el borde de un hoyo. (Marching cubes deja a veces algún
 * triángulo de área cero donde coinciden dos puntos; no se ve y no cuenta como hoyo.)
 */
function openEdges(geometry) {
  const edges = new Map();
  const index = geometry.index.array;
  for (let triangle = 0; triangle < index.length; triangle += 3) {
    const [a, b, c] = [index[triangle], index[triangle + 1], index[triangle + 2]];
    if (a === b || b === c || a === c) continue;
    for (const [p, q] of [[a, b], [b, c], [c, a]]) {
      const key = p < q ? `${p}-${q}` : `${q}-${p}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  return [...edges.values()].filter((count) => count === 1).length;
}

test("cada pieza esculpida de Moka está cerrada, lejos del borde de su cubo y con su cantidad de pelo", async () => {
  // 0.8 es el detalle de los equipos modestos: con celdas más grandes es donde más fácil se toca el borde.
  const moka = await buildMoka(0.8, () => {}, 4);
  const sculpted = new Set();
  moka.root.traverse((object) => {
    if (object.isMesh && object.geometry.userData.keep) sculpted.add(object.geometry);
  });
  assert.equal(sculpted.size, 5, "cuerpo, cabeza, pata y dos orejas");
  for (const geometry of sculpted) {
    assert.ok(!geometry.userData.touchesBounds, "una pieza toca el borde de su cubo");
    assert.equal(openEdges(geometry), 0, "una pieza tiene hoyos");
    assert.ok(geometry.attributes.aFur, "falta la cantidad de pelo por vértice");
  }
});

test("cada parte con pelo lleva sus capas de pelo, que no proyectan sombra", async () => {
  const moka = await buildMoka(0.8, () => {}, 4);
  const shells = [];
  moka.root.traverse((object) => { if (object.userData.furShells) shells.push(object); });
  assert.equal(shells.length, 1 + 1 + 4 + 2, "cuerpo, cabeza, cuatro patas y dos orejas");
  for (const layer of shells) assert.equal(layer.castShadow, false);
});
