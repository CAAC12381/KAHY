// Pruebas de la escultura de Moka (src/three/mokaModel.ts), sin navegador.
//
// Por qué existen: el 20 de octubre de 2026 la base de las pezuñas quedó justo en el borde del cubo
// donde se esculpe la pata y salió abierta; de pie no se notaba (toca el suelo), pero al dormir
// Moka levanta las patas y se veía un hueco. Esta prueba revisa que cada pieza esté cerrada.
import assert from "node:assert/strict";
import { test } from "node:test";

// Lo poco del navegador que usa el modelo (los dibujitos de corazón y "z" se pintan en un canvas).
globalThis.window ??= globalThis;
// Un "contexto 2D" falso que acepta cualquier llamada (también gradientes encadenados).
const fake = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => fake }) };

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
  assert.equal(sculpted.size, 6, "cuerpo, cabeza, pata, oreja (la otra es su reflejo), nariz y copete");
  for (const geometry of sculpted) {
    assert.ok(!geometry.userData.touchesBounds, "una pieza toca el borde de su cubo");
    assert.equal(openEdges(geometry), 0, "una pieza tiene hoyos");
  }
  // Todas llevan pelo (y dicen cuánto en cada vértice) menos la nariz, que es lisa.
  assert.equal([...sculpted].filter((geometry) => geometry.attributes.aFur).length, 5, "falta la cantidad de pelo por vértice");
});

test("cada parte con pelo lleva sus capas de pelo, que no proyectan sombra", async () => {
  const moka = await buildMoka(0.8, () => {}, 4);
  const shells = [];
  moka.root.traverse((object) => { if (object.userData.furShells) shells.push(object); });
  assert.equal(shells.length, 1 + 1 + 4 + 2 + 1, "cuerpo, cabeza, cuatro patas, dos orejas y el copete");
  for (const layer of shells) assert.equal(layer.castShadow, false);
});

test("Moka puede hacer todo seguido sin errores: saludar, comer, acariciarla, dormir y despertar", async () => {
  const THREE = await import("three");
  const { createMeadowLife } = await import("../src/three/meadowLife.ts");
  const moka = await buildMoka(0.8, () => {}, 4);
  const life = createMeadowLife();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(2.3, 1.75, 3.4);
  let time = 0;
  const run = (seconds, reducedMotion = false) => {
    for (let frame = 0; frame < seconds * 30; frame++) {
      time += 1 / 30;
      const interest = life.update(time, 1 / 30, moka.night(), reducedMotion, (out) => moka.perch(out));
      moka.update(time, 1 / 30, { reducedMotion, viewer: camera, pointer: null, interest });
      moka.root.updateMatrixWorld(true);
    }
  };
  run(2);
  for (const action of ["greet", "eat", "wag", "pet", "smell"]) {
    moka.play(action);
    run(3.2);
  }
  moka.rub(new THREE.Vector3(0.2, 0.9, 0.2));
  run(1);
  moka.rub(new THREE.Vector3(0.1, 1.2, 0.5));
  run(1);
  moka.rub(null);
  moka.setSleeping(true);
  run(4);
  assert.ok(moka.night() > 0.95, "dormida, la escena se vuelve de noche");
  moka.play("greet"); // Dormida no hace caso: no debe fallar.
  run(1);
  moka.setSleeping(false);
  run(4);
  assert.ok(moka.night() < 0.05, "despierta, vuelve el día");
  run(10, true); // Con "reducir movimiento" también.
  moka.setFurLayers(0.5);
  let visibleLayers = 0;
  moka.root.traverse((object) => { if (object.userData.furShells) visibleLayers = Math.max(visibleLayers, object.count); });
  assert.ok(visibleLayers <= 3, "con calidad baja se dibujan menos capas de pelo");
  for (const value of [moka.root.position.y, moka.root.rotation.y]) assert.ok(Number.isFinite(value));
});

test("Moka se pone apenada (cabeza y orejas abajo) y al consolarla se alegra", async () => {
  const THREE = await import("three");
  const moka = await buildMoka(0.8, () => {}, 4);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1.95, 1.74, 2.9);
  // La cabeza es el grupo que lleva la nariz: la pieza esculpida con brillo de plastilina (clearcoat).
  let head = null;
  moka.root.traverse((object) => { if (object.isMesh && object.material.vertexColors && object.material.clearcoat > 0) head = object.parent; });
  assert.ok(head, "no se encontró la cabeza");
  let time = 0;
  const run = (seconds) => {
    for (let frame = 0; frame < seconds * 30; frame++) {
      time += 1 / 30;
      moka.update(time, 1 / 30, { reducedMotion: true, viewer: camera, pointer: null, interest: null });
    }
  };
  run(2);
  const calmPitch = head.rotation.x;
  moka.setDowncast(true);
  run(3);
  assert.ok(head.rotation.x > calmPitch + 0.2, "apenada, mira hacia el suelo");
  moka.setDowncast(false);
  moka.play("cheer");
  run(3.5);
  assert.ok(Math.abs(head.rotation.x - calmPitch) < 0.1, "consolada, vuelve a levantar la cabeza");
});

test("Moka tiene dos cejas que, apenada, suben por dentro (cejitas de preocupación)", async () => {
  const THREE = await import("three");
  const moka = await buildMoka(0.8, () => {}, 4);
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(1.95, 1.74, 2.9);
  const brows = [];
  moka.root.traverse((object) => { if (object.userData.browSide) brows.push(object); });
  assert.equal(brows.length, 2, "una ceja sobre cada ojo");
  let time = 0;
  const run = (seconds) => {
    for (let frame = 0; frame < seconds * 30; frame++) {
      time += 1 / 30;
      moka.update(time, 1 / 30, { reducedMotion: true, viewer: camera, pointer: null, interest: null });
    }
  };
  run(1);
  moka.setDowncast(true);
  run(3);
  // La punta de adentro (hacia el centro de la cara) sube: cada ceja gira hacia el lado contrario al suyo.
  for (const brow of brows) assert.ok(-brow.userData.browSide * brow.rotation.z > 0.3, "apenada, la ceja no se inclinó hacia arriba por dentro");
  moka.setDowncast(false);
  moka.setSleeping(true);
  run(4);
  for (const brow of brows) assert.ok(brow.position.y < 0, "dormida, las cejas bajan");
});
