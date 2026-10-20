import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

/**
 * Moka en 3D: una vaquita color crema con manchas cafés, hocico rosa,
 * cuernitos y su campanita, parada en un prado con flores (como en su
 * ilustración). Está hecha solo con figuras básicas de three.js, sin
 * archivos de modelo, así que pesa poco y funciona sin internet.
 *
 * Unidades: 1 ≈ el largo del cuerpo. Moka mira hacia +z; el suelo es y = 0.
 * Si cambias una pieza, cambia sus números en `buildMoka` y revisa que no
 * atraviese a sus vecinas (el comentario de cada pieza dice dónde está).
 */

export type MokaAction = "greet" | "eat" | "wag";

export type MokaViewer = {
  play: (action: MokaAction) => void;
  setAutoRotate: (enabled: boolean) => void;
  resetView: () => void;
  dispose: () => void;
};

type Options = {
  reducedMotion: boolean;
  /** Se llama cuando la persona toca a Moka (no cuando arrastra para girar). */
  onTap: () => void;
};

const COLORS = {
  fur: "#f8f0e2",
  spot: "#8b5e3c",
  hoof: "#5e4030",
  snout: "#f3b9ae",
  nostril: "#7a4b3f",
  eye: "#2b211d",
  blush: "#f19a9a",
  horn: "#e9d3a6",
  innerEar: "#f2b4ab",
  collar: "#d9706f",
  bell: "#e8b84a",
  grass: "#c3d9a8",
  grassEdge: "#a9c78c",
};

const CAMERA_START = new THREE.Vector3(2.3, 1.85, 3.5);
const TARGET = new THREE.Vector3(0, 0.82, 0);

export function createMokaViewer(container: HTMLElement, options: Options): MokaViewer {
  // Lanza un error si el navegador no tiene WebGL; la página muestra un aviso en ese caso.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = "moka-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.copy(CAMERA_START);

  // Luz cálida de mañana, como la de la acuarela.
  scene.add(new THREE.HemisphereLight("#fff6e6", "#c9c2a8", 1.6));
  const sun = new THREE.DirectionalLight("#fff0d8", 2.1);
  sun.position.set(2.2, 4.2, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -2;
  sun.shadow.camera.right = 2;
  sun.shadow.camera.top = 2;
  sun.shadow.camera.bottom = -2;
  sun.shadow.bias = -0.0008;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#e4ecff", 0.55);
  fill.position.set(-3, 2, -1);
  scene.add(fill);

  scene.add(buildMeadow());
  const moka = buildMoka();
  scene.add(moka.root);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.4;
  controls.maxDistance = 6.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.42; // No se puede mirar desde debajo del pasto.
  controls.autoRotateSpeed = 1.1;
  controls.autoRotate = !options.reducedMotion;
  controls.update();

  // Tocar (sin arrastrar) a Moka la hace saludar.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downAt: { x: number; y: number } | null = null;
  const onPointerDown = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
  const onPointerUp = (event: PointerEvent) => {
    if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) > 6) return;
    downAt = null;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.intersectObject(moka.root, true).length) {
      moka.play("greet");
      options.onTap();
    }
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointerup", onPointerUp);

  const resize = () => {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // En pantallas verticales (teléfono) se abre el ángulo para que el ancho visible no se encoja
    // y Moka no quede cortada a los lados; en cuadrado u horizontal se usan 35°.
    const wideAspect = 1;
    camera.fov = camera.aspect >= wideAspect ? 35 : THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(17.5)) * wideAspect / camera.aspect));
    camera.updateProjectionMatrix();
    renderer.render(scene, camera); // Cambiar el tamaño borra el lienzo: se redibuja de inmediato.
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const timer = new THREE.Timer();
  const frame = (timestamp: number) => {
    timer.update(timestamp);
    const delta = Math.min(timer.getDelta(), 0.05);
    moka.update(timer.getElapsed(), delta, options.reducedMotion);
    controls.update();
    renderer.render(scene, camera);
  };

  // Solo se dibuja mientras la vista está en pantalla: ahorra batería al desplazarse fuera.
  const visibility = new IntersectionObserver(([entry]) => renderer.setAnimationLoop(entry?.isIntersecting ? frame : null));
  visibility.observe(container);

  return {
    play: (action) => moka.play(action),
    setAutoRotate: (enabled) => { controls.autoRotate = enabled; },
    resetView: () => {
      camera.position.copy(CAMERA_START);
      controls.target.copy(TARGET);
      controls.update();
    },
    dispose: () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      timer.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra });
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  return item;
}

/**
 * Una mancha "pegada" a la superficie de un elipsoide: se coloca en la
 * dirección `direction` desde su centro y se orienta según la normal ahí.
 */
function spotOn(center: THREE.Vector3, radius: number, scale: THREE.Vector3, direction: THREE.Vector3, size: [number, number], mat: THREE.Material) {
  const unit = direction.clone().normalize();
  const surface = center.clone().add(unit.clone().multiply(scale).multiplyScalar(radius));
  const normal = unit.clone().divide(scale).normalize();
  const spot = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), mat);
  spot.scale.set(size[0], size[1], 0.035);
  spot.position.copy(surface).addScaledVector(normal, -0.012);
  spot.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  spot.castShadow = true;
  return spot;
}

function buildMoka() {
  const fur = material(COLORS.fur);
  const spot = material(COLORS.spot);
  const hoof = material(COLORS.hoof);
  const snout = material(COLORS.snout);
  const dark = material(COLORS.eye, { roughness: 0.25 });
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const horn = material(COLORS.horn, { roughness: 0.6 });
  const innerEar = material(COLORS.innerEar);
  const collar = material(COLORS.collar, { roughness: 0.6 });
  const bellMat = material(COLORS.bell, { roughness: 0.3, metalness: 0.65 });
  const blush = new THREE.MeshBasicMaterial({ color: COLORS.blush, transparent: true, opacity: 0.45, depthWrite: false });

  const root = new THREE.Group();
  const bodyPivot = new THREE.Group(); // Todo menos las patas: "respira" y se agacha al aterrizar.
  root.add(bodyPivot);

  // Patas: cuatro cápsulas cortas con pezuñas; la parte de arriba queda dentro del cuerpo.
  const legGeometry = new THREE.CapsuleGeometry(0.12, 0.3, 6, 16);
  const hoofGeometry = new THREE.CylinderGeometry(0.125, 0.135, 0.09, 20);
  for (const [x, z] of [[0.27, 0.3], [-0.27, 0.3], [0.27, -0.32], [-0.27, -0.32]] as const) {
    root.add(mesh(legGeometry, fur, [x, 0.3, z]));
    root.add(mesh(hoofGeometry, hoof, [x, 0.045, z]));
  }

  // Cuerpo: elipsoide centrado en y = 0.72 (de y 0.33 a 1.11, de z -0.58 a 0.58).
  const bodyCenter = new THREE.Vector3(0, 0.72, 0);
  const bodyScale = new THREE.Vector3(0.95, 0.78, 1.15);
  const body = mesh(new THREE.SphereGeometry(0.5, 48, 32), fur, bodyCenter.toArray() as [number, number, number], bodyScale.toArray() as [number, number, number]);
  bodyPivot.add(body);
  for (const [direction, size] of [
    [new THREE.Vector3(0.75, 0.45, -0.35), [0.17, 0.13]],
    [new THREE.Vector3(-0.8, 0.25, 0.25), [0.15, 0.11]],
    [new THREE.Vector3(-0.35, 0.85, -0.5), [0.13, 0.1]],
    [new THREE.Vector3(0.45, 0.1, 0.75), [0.09, 0.07]],
  ] as Array<[THREE.Vector3, [number, number]]>) {
    bodyPivot.add(spotOn(bodyCenter, 0.5, bodyScale, direction, size, spot));
  }

  // Collar con campanita alrededor del cuello: el aro queda perpendicular a la línea cuerpo→cabeza,
  // así que solo asoma la parte de abajo, bajo la barbilla, que es donde cuelga la campana.
  const collarRing = mesh(new THREE.TorusGeometry(0.29, 0.032, 12, 40), collar, [0, 1.0, 0.44]);
  collarRing.rotation.x = -0.75;
  bodyPivot.add(collarRing);
  const bell = new THREE.Group();
  bell.position.set(0, 0.79, 0.64);
  bell.add(mesh(new THREE.SphereGeometry(0.07, 24, 16), bellMat, [0, -0.05, 0]));
  bell.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 8), dark, [0, -0.11, 0.03]));
  bodyPivot.add(bell);

  // Cola: un tubo curvo que sale de atrás del cuerpo, con un mechón café al final. Gira desde su base.
  const tail = new THREE.Group();
  tail.position.set(0, 0.88, -0.5);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.08, -0.14), new THREE.Vector3(0, -0.26, -0.18), new THREE.Vector3(0, -0.4, -0.12)]);
  tail.add(mesh(new THREE.TubeGeometry(tailCurve, 20, 0.022, 8), fur, [0, 0, 0]));
  tail.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), spot, [0, -0.44, -0.11], [1, 1.4, 1]));
  bodyPivot.add(tail);

  // Cabeza grande (estilo chibi), adelante y arriba del cuerpo. Gira un poco al "mirar".
  const head = new THREE.Group();
  head.position.set(0, 1.22, 0.55);
  bodyPivot.add(head);
  const headScale = new THREE.Vector3(1.05, 0.95, 0.95);
  head.add(mesh(new THREE.SphereGeometry(0.42, 48, 32), fur, [0, 0, 0], headScale.toArray() as [number, number, number]));
  head.add(spotOn(new THREE.Vector3(0, 0, 0), 0.42, headScale, new THREE.Vector3(0.55, 0.35, 0.75), [0.13, 0.11], spot)); // Parche junto al ojo.
  head.add(spotOn(new THREE.Vector3(0, 0, 0), 0.42, headScale, new THREE.Vector3(-0.3, 0.9, -0.2), [0.12, 0.09], spot));

  // Hocico rosa con fosas y una sonrisa.
  head.add(mesh(new THREE.SphereGeometry(0.24, 40, 24), snout, [0, -0.14, 0.33], [1.25, 0.85, 0.82]));
  const nostrilGeometry = new THREE.SphereGeometry(0.028, 12, 8);
  head.add(mesh(nostrilGeometry, material(COLORS.nostril), [0.09, -0.11, 0.52], [1, 1.4, 0.6]));
  head.add(mesh(nostrilGeometry, material(COLORS.nostril), [-0.09, -0.11, 0.52], [1, 1.4, 0.6]));
  const smile = mesh(new THREE.TorusGeometry(0.055, 0.011, 8, 24, Math.PI), dark, [0, -0.2, 0.515]);
  smile.rotation.z = Math.PI;
  head.add(smile);

  // Ojos grandes con brillo; se cierran (escala en y) para parpadear.
  const eyes: THREE.Group[] = [];
  for (const x of [0.17, -0.17]) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.07, 0.35);
    eye.add(mesh(new THREE.SphereGeometry(0.072, 24, 16), dark, [0, 0, 0], [0.85, 1, 0.6]));
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), shine).translateX(0.022).translateY(0.03).translateZ(0.04));
    head.add(eye);
    eyes.push(eye);
    // Chapitas rosadas bajo cada ojo, apenas por fuera de la cabeza y orientadas según su superficie.
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), blush);
    cheek.position.set(x * 1.55, -0.06, 0.322);
    const radii = headScale.clone().multiplyScalar(0.42);
    const normal = new THREE.Vector3(cheek.position.x / radii.x ** 2, cheek.position.y / radii.y ** 2, cheek.position.z / radii.z ** 2).normalize();
    cheek.lookAt(cheek.position.clone().add(normal));
    head.add(cheek);
  }

  // Orejas caídas hacia los lados y un poco hacia adelante, para que se vea su interior rosa.
  // Son delgadas (escala z 0.45) y el rosa sobresale apenas de su cara de enfrente. Se mueven un poquito.
  const ears: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.4, 0.1, -0.02);
    ear.rotation.set(0, side * -0.32, side * -0.45);
    ear.add(mesh(new THREE.SphereGeometry(0.16, 24, 16), fur, [side * 0.12, 0, 0], [1.35, 0.5, 0.45]));
    ear.add(mesh(new THREE.SphereGeometry(0.12, 20, 12), innerEar, [side * 0.14, 0, 0.046], [1.15, 0.36, 0.3]));
    head.add(ear);
    ears.push(ear);
  }

  // Cuernitos y un mechón de pelo café entre ellos.
  for (const side of [1, -1]) {
    const hornMesh = mesh(new THREE.CapsuleGeometry(0.045, 0.1, 6, 12), horn, [side * 0.2, 0.38, -0.02]);
    hornMesh.rotation.z = side * -0.35;
    head.add(hornMesh);
  }
  const tuftGeometry = new THREE.SphereGeometry(0.07, 16, 12);
  head.add(mesh(tuftGeometry, spot, [0, 0.38, 0.06]));
  head.add(mesh(tuftGeometry, spot, [0.07, 0.36, 0.1], [0.8, 0.8, 0.8]));
  head.add(mesh(tuftGeometry, spot, [-0.07, 0.36, 0.1], [0.8, 0.8, 0.8]));

  // --- Animación ---
  let action: { name: MokaAction; started: number } | null = null;
  let nextBlink = 1.5;
  let blinkStart = -1;
  let now = 0;

  function play(name: MokaAction) {
    action = { name, started: now };
  }

  function update(time: number, _delta: number, reducedMotion: boolean) {
    now = time;
    const calm = reducedMotion ? 0 : 1;

    // Respira y mira alrededor despacito.
    bodyPivot.scale.set(1, 1 + 0.018 * Math.sin(time * 2.1) * calm, 1);
    head.rotation.set(0.04 * Math.sin(time * 1.3) * calm, 0.12 * Math.sin(time * 0.55) * calm, 0.05 * Math.sin(time * 0.9) * calm);
    ears.forEach((ear, index) => { ear.rotation.x = 0.08 * Math.sin(time * 1.7 + index) * calm; });
    let wag = 0.25 * Math.sin(time * 2.4) * calm;
    let jump = 0;
    let bellSwing = 0.15 * Math.sin(time * 2.1) * calm;

    if (action) {
      const elapsed = time - action.started;
      if (action.name === "greet") {
        // Saltito con aplastado al caer, cola feliz y campanita sonando.
        const progress = Math.min(1, elapsed / 0.75);
        jump = reducedMotion ? 0 : 0.32 * Math.sin(Math.PI * progress);
        if (!reducedMotion && progress > 0.85) bodyPivot.scale.y *= 0.94;
        wag = 0.7 * Math.sin(elapsed * 18);
        bellSwing = 0.6 * Math.sin(elapsed * 20) * Math.max(0, 1 - elapsed / 1.2);
        if (elapsed > 1.2) action = null;
      } else if (action.name === "eat") {
        // Baja la cabeza al pasto, mastica y vuelve.
        const down = Math.min(1, elapsed / 0.4) * Math.min(1, Math.max(0, (2.2 - elapsed) / 0.4));
        head.rotation.x += 0.55 * down;
        head.position.y = 1.22 - 0.12 * down;
        head.rotation.z += 0.03 * Math.sin(elapsed * 14) * down;
        if (elapsed > 2.2) action = null;
      } else {
        wag = 0.85 * Math.sin(elapsed * 16);
        if (elapsed > 1.6) action = null;
      }
    }
    if (!action || action.name !== "eat") head.position.y = 1.22;

    root.position.y = jump;
    tail.rotation.set(0.1, wag, 0);
    bell.rotation.z = bellSwing;

    // Parpadeo cada 2.5–5 s.
    if (time > nextBlink && blinkStart < 0) blinkStart = time;
    const blinkProgress = blinkStart < 0 ? -1 : (time - blinkStart) / 0.16;
    const openness = blinkProgress < 0 || blinkProgress > 1 ? 1 : Math.max(0.08, Math.abs(1 - 2 * blinkProgress));
    eyes.forEach((eye) => { eye.scale.y = openness; });
    if (blinkProgress > 1) {
      blinkStart = -1;
      nextBlink = time + 2.5 + Math.random() * 2.5;
    }
  }

  return { root, play, update };
}

/** Prado redondo con flores de colores, como en la ilustración de Moka. */
function buildMeadow() {
  const meadow = new THREE.Group();
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.75, 0.08, 64), material(COLORS.grass, { roughness: 1 }));
  ground.position.y = -0.04;
  ground.receiveShadow = true;
  meadow.add(ground);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.72, 0.04, 8, 64), material(COLORS.grassEdge, { roughness: 1 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.005;
  meadow.add(rim);

  const petalColors = ["#f6b7c8", "#c9b6e4", "#a9cbe8", "#fbe3a1", "#f9c9a8"].map((color) => material(color, { roughness: 0.7 }));
  const center = material("#f2c14e", { roughness: 0.6 });
  const stem = material("#8fb27a");
  const petalGeometry = new THREE.SphereGeometry(0.035, 12, 8);
  const centerGeometry = new THREE.SphereGeometry(0.028, 12, 8);
  const stemGeometry = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6);

  // Posiciones fijas (no aleatorias) para que el prado se vea igual cada vez.
  for (let index = 0; index < 22; index++) {
    const angle = index * 2.399 + 0.4; // Ángulo dorado: reparte las flores sin amontonarlas.
    const distance = 0.75 + ((index * 37) % 10) / 12;
    const flower = new THREE.Group();
    flower.position.set(Math.cos(angle) * distance, 0, Math.sin(angle) * distance);
    flower.add(new THREE.Mesh(stemGeometry, stem).translateY(0.04));
    const petals = petalColors[index % petalColors.length];
    for (let petal = 0; petal < 5; petal++) {
      const petalAngle = (petal / 5) * Math.PI * 2;
      const item = new THREE.Mesh(petalGeometry, petals);
      item.position.set(Math.cos(petalAngle) * 0.04, 0.09, Math.sin(petalAngle) * 0.04);
      item.scale.set(1, 0.45, 1);
      flower.add(item);
    }
    flower.add(new THREE.Mesh(centerGeometry, center).translateY(0.095));
    flower.scale.setScalar(0.8 + ((index * 13) % 5) / 10);
    meadow.add(flower);
  }
  return meadow;
}
