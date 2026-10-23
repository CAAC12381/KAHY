import * as THREE from "three";

/**
 * Vida del prado: dos mariposas de día y luciérnagas de noche.
 *
 * - Las mariposas vuelan en curvas suaves alrededor de Moka, aleteando. De vez
 *   en cuando una se posa en su lomo unos segundos (Moka la mira) y se va.
 * - Cuando Moka duerme, las mariposas se van y salen luciérnagas que brillan
 *   y se apagan despacio.
 *
 * Con "reducir movimiento" las mariposas vuelan más lento y no se posan.
 */

type Butterfly = {
  group: THREE.Group;
  wings: THREE.Mesh[];
  radius: number;
  height: number;
  speed: number;
  phase: number;
  /** Estado del aterrizaje en el lomo: dónde va y desde cuándo. */
  landing: { started: number } | null;
};

function wingTexture(fill: string, edge: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  // Ala derecha (la izquierda es la misma reflejada): lóbulo grande arriba y uno chico abajo.
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(2, 34);
  ctx.bezierCurveTo(10, 2, 58, 0, 60, 18);
  ctx.bezierCurveTo(62, 30, 40, 34, 30, 34);
  ctx.bezierCurveTo(46, 38, 54, 56, 40, 60);
  ctx.bezierCurveTo(26, 62, 10, 48, 2, 34);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  for (const [x, y, r] of [[44, 14, 4], [52, 22, 3], [36, 50, 3]]) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, "rgba(255, 252, 200, 1)");
  gradient.addColorStop(0.35, "rgba(230, 245, 140, 0.6)");
  gradient.addColorStop(1, "rgba(230, 245, 140, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createMeadowLife() {
  const group = new THREE.Group();
  const textures: THREE.Texture[] = [];

  const butterflies: Butterfly[] = [
    { fill: "#f3a65a", edge: "#7a4a2a", radius: 1.05, height: 1.05, speed: 0.42, phase: 0 },
    { fill: "#c9b6e4", edge: "#6f5a8f", radius: 1.25, height: 1.3, speed: -0.33, phase: 2.4 },
  ].map(({ fill, edge, radius, height, speed, phase }) => {
    const texture = wingTexture(fill, edge);
    textures.push(texture);
    const material = new THREE.MeshStandardMaterial({ map: texture, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.7 });
    const wingGeometry = new THREE.PlaneGeometry(0.11, 0.11);
    wingGeometry.translate(0.055, 0, 0); // La bisagra del ala queda en el cuerpo.
    wingGeometry.rotateX(-Math.PI / 2); // Alas acostadas: el aleteo las levanta.
    const butterfly = new THREE.Group();
    const wings = [1, -1].map((side) => {
      const wing = new THREE.Mesh(wingGeometry, material);
      wing.scale.x = side;
      butterfly.add(wing);
      return wing;
    });
    const bodyMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.05, 4, 8), new THREE.MeshStandardMaterial({ color: "#3b2a22", roughness: 0.6 }));
    bodyMesh.rotation.x = Math.PI / 2;
    butterfly.add(bodyMesh);
    group.add(butterfly);
    return { group: butterfly, wings, radius, height, speed, phase, landing: null };
  });

  // Luciérnagas: puntos de luz que flotan cerca del pasto y parpadean despacio.
  const glow = glowTexture();
  textures.push(glow);
  const fireflies = Array.from({ length: 16 }, (_, index) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    sprite.scale.setScalar(0.07);
    group.add(sprite);
    return { sprite, seed: index * 1.618, radius: 0.7 + ((index * 37) % 9) / 10 };
  });

  let nextLanding = 18;
  const target = new THREE.Vector3();
  const flying = new THREE.Vector3();
  const ahead = new THREE.Vector3();

  function pathPoint(butterfly: Butterfly, time: number, out: THREE.Vector3) {
    const angle = time * butterfly.speed + butterfly.phase;
    out.set(
      Math.cos(angle) * butterfly.radius + 0.18 * Math.sin(time * 1.3 + butterfly.phase),
      butterfly.height + 0.18 * Math.sin(time * 0.9 + butterfly.phase) + 0.05 * Math.sin(time * 5.1),
      Math.sin(angle) * butterfly.radius * 0.85,
    );
    return out;
  }

  /**
   * `night`: 0 de día … 1 de noche. `perch` da el punto del lomo de Moka para posarse.
   * Devuelve la mariposa más interesante para que Moka la mire (o null de noche).
   */
  function update(time: number, delta: number, night: number, reducedMotion: boolean, perch: (out: THREE.Vector3) => THREE.Vector3): THREE.Vector3 | null {
    const pace = reducedMotion ? 0.4 : 1;
    const day = 1 - night;
    let interest: THREE.Vector3 | null = null;

    // ¿Toca que una mariposa se pose en Moka? Solo de día y sin "reducir movimiento".
    if (!reducedMotion && day > 0.95 && time > nextLanding && !butterflies.some((item) => item.landing)) {
      butterflies[1].landing = { started: time };
    }

    for (const butterfly of butterflies) {
      const t = time * pace;
      pathPoint(butterfly, t, flying);
      let flap = 1;
      if (butterfly.landing) {
        // 0–2 s: vuela al lomo; 2–7 s: descansa abriendo y cerrando las alas despacio; 7–9 s: regresa a volar.
        const elapsed = time - butterfly.landing.started;
        perch(target).y += 0.02;
        const toPerch = THREE.MathUtils.smoothstep(elapsed, 0, 2);
        const back = THREE.MathUtils.smoothstep(elapsed, 7, 9);
        const blend = toPerch * (1 - back);
        butterfly.group.position.copy(flying).lerp(target, blend);
        flap = blend > 0.95 ? 0.25 : 1;
        if (elapsed > 9 || night > 0.05) {
          butterfly.landing = null;
          nextLanding = time + 25 + Math.random() * 20;
        }
        if (blend > 0.2) interest = butterfly.group.position;
      } else {
        butterfly.group.position.copy(flying);
      }
      // Mira hacia donde vuela (o hacia adelante si está posada).
      pathPoint(butterfly, t + 0.05, ahead);
      if (!butterfly.landing || THREE.MathUtils.smoothstep(time - butterfly.landing.started, 0, 2) < 0.95) butterfly.group.lookAt(ahead);
      const beat = flap < 1 ? 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 3)) : 0.15 + 1.1 * Math.abs(Math.sin(time * 16 * pace + butterfly.phase));
      butterfly.wings[0].rotation.z = beat;
      butterfly.wings[1].rotation.z = -beat;
      // De noche se van (encogen y desaparecen); al amanecer regresan.
      butterfly.group.scale.setScalar(Math.max(0.001, day));
      butterfly.group.visible = day > 0.02;
      if (!interest && day > 0.5) interest = butterfly.group.position;
    }

    for (const firefly of fireflies) {
      const t = time * 0.35 * pace + firefly.seed;
      firefly.sprite.position.set(Math.cos(t) * firefly.radius, 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.7 + firefly.seed)), Math.sin(t * 0.8) * firefly.radius * 0.9);
      const twinkle = 0.5 + 0.5 * Math.sin(time * 2.2 + firefly.seed * 3);
      firefly.sprite.material.opacity = night * twinkle;
      firefly.sprite.visible = night > 0.02;
    }
    void delta;
    return interest;
  }

  function dispose() {
    textures.forEach((texture) => texture.dispose());
  }

  return { group, update, dispose };
}
