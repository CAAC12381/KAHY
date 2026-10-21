// Pruebas de las herramientas para esculpir compañeros en 3D (src/three/sculpt.ts).
// Moka y los que vengan después se construyen con estas funciones: si una se rompe, la figura sale
// deformada o con hoyos, y eso es difícil de notar a simple vista en un teléfono.
import assert from "node:assert/strict";
import { test } from "node:test";
import { box, ellipsoid, roundCone, sculpt, smin, sphere, surfaceAlong, withBound } from "../src/three/sculpt.ts";

const ball = (x, y, z) => sphere(x, y, z, 0, 0, 0, 0.5);

test("las formas básicas miden la distancia correcta a su superficie", () => {
  assert.ok(Math.abs(sphere(1, 0, 0, 0, 0, 0, 0.5) - 0.5) < 1e-9);
  assert.ok(Math.abs(ellipsoid(0.4, 0, 0, 0, 0, 0, 0.4, 0.2, 0.3)) < 1e-9, "un punto del borde da 0");
  assert.ok(ellipsoid(0, 0, 0, 0, 0, 0, 0.4, 0.2, 0.3) < 0, "el centro está adentro");
  assert.ok(Math.abs(roundCone(0, 0.5, 0.2, [0, 0, 0], [0, 1, 0], 0.2, 0.2)) < 1e-9, "a la mitad del cono, a un radio del eje");
  assert.ok(Math.abs(box(0.5, 0, 0, 0, 0, 0, 0.5, 0.5, 0.5)) < 1e-9);
});

test("la unión suave nunca es más grande que la unión normal (no abre huecos)", () => {
  for (const [a, b] of [[0.1, 0.12], [-0.05, 0.3], [0.2, 0.2]]) assert.ok(smin(a, b, 0.1) <= Math.min(a, b));
});

test("surfaceAlong encuentra la piel en la dirección pedida", () => {
  const point = surfaceAlong(ball, [0, 0, 0], [0, 0, 1], 1);
  assert.ok(Math.abs(point.z - 0.5) < 1e-4 && Math.abs(point.x) < 1e-9);
});

test("el atajo del espacio vacío no cambia nada cerca de la pieza", () => {
  const bounded = withBound((x, y, z) => box(x, y, z, 0, 0, 0, 0.55, 0.55, 0.55), ball, 0.08);
  for (const point of [[0, 0, 0.5], [0.3, 0.3, 0], [0, 0.6, 0]]) assert.equal(bounded(...point), ball(...point));
  assert.ok(bounded(0.9, 0.9, 0.9) > 0, "lejos sigue estando afuera");
});

test("sculpt convierte la función en una malla cerrada, con colores y sin vértices repetidos", async () => {
  const geometry = await sculpt({ sdf: ball, paint: (x, y, z, out) => out.setRGB(1, 0.5, 0.25), center: [0, 0, 0], halfSize: 0.7, resolution: 40 });
  const position = geometry.attributes.position;
  const cell = 0.7 / 20;
  for (let index = 0; index < position.count; index++) {
    const radius = Math.hypot(position.getX(index), position.getY(index), position.getZ(index));
    assert.ok(Math.abs(radius - 0.5) < cell, `vértice fuera de la esfera: ${radius}`);
  }
  assert.ok(geometry.index, "la malla viene indexada");
  assert.ok(geometry.index.count >= position.count * 3, "cada vértice se comparte entre varios triángulos");
  const colors = geometry.attributes.color;
  assert.ok(Math.abs(colors.getX(0) - 1) < 1e-6 && Math.abs(colors.getY(0) - 0.5) < 1e-6);
  // Malla cerrada: cada arista aparece exactamente en dos triángulos.
  const edges = new Map();
  const index = geometry.index.array;
  for (let triangle = 0; triangle < index.length; triangle += 3) {
    for (const [a, b] of [[index[triangle], index[triangle + 1]], [index[triangle + 1], index[triangle + 2]], [index[triangle + 2], index[triangle]]]) {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  const open = [...edges.values()].filter((count) => count !== 2).length;
  assert.equal(open, 0, `${open} aristas sin pareja: la malla tiene hoyos`);
});
