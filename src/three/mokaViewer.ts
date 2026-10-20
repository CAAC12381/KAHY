import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/**
 * Moka en 3D: vaquita color crema con manchas cafés, hocico rosa, cuernitos,
 * orejas de hoja y su collar con campanita, sobre un prado redondo con
 * flores y pasto (como en su ilustración). Hecha solo con figuras de
 * three.js y texturas pintadas aquí mismo, sin archivos de modelo: pesa
 * poco y funciona sin internet.
 *
 * Unidades: 1 ≈ el largo del cuerpo. Moka mira hacia +z; el suelo es y = 0.
 * Cada pieza dice dónde está; si mueves una, revisa que no atraviese a sus
 * vecinas (las manchas y las chapitas están pintadas en las texturas, así
 * que siguen a la piel solas).
 */

export type MokaAction = "greet" | "pet" | "eat" | "wag";

export type MokaViewer = {
  play: (action: MokaAction) => void;
  setSleeping: (sleeping: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;
  resetView: () => void;
  /** Foto de lo que se ve ahora, con fondo, como PNG (data URL). */
  takePhoto: () => string;
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
  tongue: "#e98c8c",
  horn: "#ecd8ab",
  innerEar: "#f2b4ab",
  collar: "#d9706f",
  bell: "#e8b84a",
  grass: "#c3d9a8",
  grassEdge: "#a9c78c",
  blade: "#9fc184",
  photoBackground: "#f6efe0",
};

const CAMERA_START = new THREE.Vector3(2.3, 1.75, 3.4);
const TARGET = new THREE.Vector3(0, 0.74, 0);

export function createMokaViewer(container: HTMLElement, options: Options): MokaViewer {
  // Lanza un error si el navegador no tiene WebGL; la página muestra un aviso en ese caso.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.className = "moka-canvas";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.copy(CAMERA_START);

  // Luz suave de cuarto (para el brillo de la campana y el pelaje) + sol cálido con sombra difusa.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = 0.45;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight("#fff6e6", "#c9c2a8", 1.0));
  const sun = new THREE.DirectionalLight("#fff0d8", 2.0);
  sun.position.set(2.2, 4.2, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -2;
  sun.shadow.camera.right = 2;
  sun.shadow.camera.top = 2;
  sun.shadow.camera.bottom = -2;
  sun.shadow.radius = 5;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#e4ecff", 0.45);
  fill.position.set(-3, 2, -1);
  scene.add(fill);

  scene.add(buildMeadow());
  const moka = buildMoka();
  scene.add(moka.root);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 2.3;
  controls.maxDistance = 6.5;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.42; // No se puede mirar desde debajo del pasto.
  controls.autoRotateSpeed = 1.1;
  controls.autoRotate = !options.reducedMotion;
  controls.update();

  // Tocar (sin arrastrar) a Moka avisa a la página; pasar el cursor encima la hace mirarlo.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  let downAt: { x: number; y: number } | null = null;
  const pointerOnMoka = (event: PointerEvent) => {
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(moka.body, true).length > 0;
  };
  const onPointerDown = (event: PointerEvent) => { downAt = { x: event.clientX, y: event.clientY }; };
  const onPointerMove = (event: PointerEvent) => {
    hovering = event.pointerType === "mouse";
    if (hovering && !downAt) renderer.domElement.style.cursor = pointerOnMoka(event) ? "pointer" : "";
  };
  const onPointerLeave = () => { hovering = false; };
  const onPointerUp = (event: PointerEvent) => {
    const tapped = downAt && Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) <= 6;
    downAt = null;
    if (tapped && pointerOnMoka(event)) options.onTap();
  };
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerleave", onPointerLeave);
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
    // Tope de 0.1 s: al volver a la pestaña no da un salto, y en equipos lentos las transiciones no se quedan a medias.
    const delta = Math.min(timer.getDelta(), 0.1);
    moka.update(timer.getElapsed(), delta, {
      reducedMotion: options.reducedMotion,
      viewer: camera,
      pointer: hovering ? pointer : null,
    });
    controls.update();
    renderer.render(scene, camera);
  };

  // Solo se dibuja mientras la vista está en pantalla: ahorra batería al desplazarse fuera.
  const visibility = new IntersectionObserver(([entry]) => renderer.setAnimationLoop(entry?.isIntersecting ? frame : null));
  visibility.observe(container);

  return {
    play: (action) => moka.play(action),
    setSleeping: (sleeping) => moka.setSleeping(sleeping),
    setAutoRotate: (enabled) => { controls.autoRotate = enabled; },
    resetView: () => {
      camera.position.copy(CAMERA_START);
      controls.target.copy(TARGET);
      controls.update();
    },
    takePhoto: () => {
      const previous = scene.background;
      scene.background = new THREE.Color(COLORS.photoBackground);
      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL("image/png");
      scene.background = previous;
      renderer.render(scene, camera);
      return url;
    },
    dispose: () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      timer.dispose();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Sprite)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          (material as THREE.MeshStandardMaterial).map?.dispose();
          material.dispose();
        });
      });
      moka.textures.forEach((texture) => texture.dispose());
      scene.environment?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

// --- Materiales y piezas ---------------------------------------------------

function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra });
}

/** Pelaje de peluche: el brillo "sheen" da ese borde aterciopelado al girarla. */
function furMaterial(map?: THREE.Texture) {
  return new THREE.MeshPhysicalMaterial({
    color: map ? "#ffffff" : COLORS.fur,
    map: map ?? null,
    roughness: 0.78,
    sheen: 1,
    sheenRoughness: 0.55,
    sheenColor: new THREE.Color("#fff1dc"),
  });
}

function mesh(geometry: THREE.BufferGeometry, mat: THREE.Material, position: [number, number, number], scale: [number, number, number] = [1, 1, 1]) {
  const item = new THREE.Mesh(geometry, mat);
  item.position.set(...position);
  item.scale.set(...scale);
  item.castShadow = true;
  return item;
}

/**
 * Textura pintada para una esfera escalada (cuerpo o cabeza). `at` convierte
 * una dirección desde el centro de la pieza en el punto de la textura que
 * queda ahí, y `stretch` corrige que la textura se estira cerca de los polos.
 */
function paintedSkin(scale: THREE.Vector3, paint: (ctx: CanvasRenderingContext2D, at: (direction: THREE.Vector3) => { x: number; y: number; stretch: number }, unit: number) => void) {
  const width = 1024;
  const height = 512;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = COLORS.fur;
  ctx.fillRect(0, 0, width, height);
  const at = (direction: THREE.Vector3) => {
    const unitPoint = direction.clone().divide(scale).normalize();
    const theta = Math.acos(THREE.MathUtils.clamp(unitPoint.y, -1, 1));
    const phi = (Math.atan2(unitPoint.z, -unitPoint.x) + Math.PI * 2) % (Math.PI * 2);
    return { x: (phi / (Math.PI * 2)) * width, y: (theta / Math.PI) * height, stretch: 1 / Math.max(0.25, Math.sin(theta)) };
  };
  paint(ctx, at, height / Math.PI); // `unit`: píxeles por radián en vertical.
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/** Mancha irregular (varios óvalos encimados), repetida al otro lado si toca el borde de la textura. */
function blob(ctx: CanvasRenderingContext2D, point: { x: number; y: number; stretch: number }, radius: number, seed: number, color: string) {
  const width = ctx.canvas.width;
  ctx.fillStyle = color;
  for (const shift of [-width, 0, width]) {
    const cx = point.x + shift;
    if (cx + radius * point.stretch * 2 < 0 || cx - radius * point.stretch * 2 > width) continue;
    ctx.beginPath();
    ctx.ellipse(cx, point.y, radius * 0.72 * point.stretch, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let lobe = 0; lobe < 7; lobe++) {
      const angle = (lobe / 7) * Math.PI * 2 + seed;
      const size = radius * (0.42 + 0.2 * Math.sin(seed * 3.1 + lobe * 1.7));
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(angle) * radius * 0.5 * point.stretch, point.y + Math.sin(angle) * radius * 0.5, size * point.stretch, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function blush(ctx: CanvasRenderingContext2D, point: { x: number; y: number; stretch: number }, radius: number) {
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.scale(point.stretch, 1);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  gradient.addColorStop(0, "rgba(241, 150, 150, 0.6)");
  gradient.addColorStop(1, "rgba(241, 150, 150, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Oreja en forma de hoja: base redonda junto a la cabeza y punta afilada hacia +x. */
function leafGeometry(length: number, width: number, thickness: number) {
  const geometry = new THREE.SphereGeometry(1, 32, 16);
  const position = geometry.attributes.position;
  for (let index = 0; index < position.count; index++) {
    const x = position.getX(index);
    const toTip = (x + 1) / 2;
    const narrow = 1 - 0.62 * toTip * toTip;
    position.setXYZ(index, (x + 1) * (length / 2), position.getY(index) * width * narrow, position.getZ(index) * thickness * (1 - 0.45 * toTip));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function spriteTexture(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  draw(canvas.getContext("2d")!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// --- Moka ------------------------------------------------------------------

type UpdateContext = { reducedMotion: boolean; viewer: THREE.Camera; pointer: THREE.Vector2 | null };

function buildMoka() {
  const bodyScale = new THREE.Vector3(0.92, 0.74, 1.18);
  const headScale = new THREE.Vector3(1.05, 0.95, 0.95);
  const bodySkin = paintedSkin(bodyScale, (ctx, at, unit) => {
    blob(ctx, at(new THREE.Vector3(0.9, 0.35, -0.25)), 0.42 * unit, 0.7, COLORS.spot);
    blob(ctx, at(new THREE.Vector3(-0.85, 0.2, 0.3)), 0.36 * unit, 2.1, COLORS.spot);
    blob(ctx, at(new THREE.Vector3(-0.3, 0.75, -0.6)), 0.3 * unit, 4.2, COLORS.spot);
    blob(ctx, at(new THREE.Vector3(0.5, -0.15, 0.75)), 0.18 * unit, 5.3, COLORS.spot);
  });
  const headSkin = paintedSkin(headScale, (ctx, at, unit) => {
    blob(ctx, at(new THREE.Vector3(0.24, 0.12, 0.32)), 0.34 * unit, 1.3, COLORS.spot); // Parche del ojo.
    blob(ctx, at(new THREE.Vector3(-0.25, 0.8, -0.35)), 0.3 * unit, 3.7, COLORS.spot);
    blush(ctx, at(new THREE.Vector3(0.28, -0.05, 0.3)), 0.17 * unit);
    blush(ctx, at(new THREE.Vector3(-0.28, -0.05, 0.3)), 0.17 * unit);
  });

  const fur = furMaterial();
  const spot = material(COLORS.spot);
  const hoof = material(COLORS.hoof, { roughness: 0.5 });
  const snout = material(COLORS.snout, { roughness: 0.65 });
  const dark = material(COLORS.eye, { roughness: 0.2 });
  const shine = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const tongue = material(COLORS.tongue);
  const horn = material(COLORS.horn, { roughness: 0.55 });
  const innerEar = material(COLORS.innerEar);
  const collar = material(COLORS.collar, { roughness: 0.6 });
  const bellMat = material(COLORS.bell, { roughness: 0.25, metalness: 0.8 });

  const root = new THREE.Group();
  // `body` agrupa todo lo que se puede tocar; `bodyPivot` respira y se acuesta; `stance` lleva las patas.
  const body = new THREE.Group();
  root.add(body);
  const bodyPivot = new THREE.Group();
  const stance = new THREE.Group();
  body.add(bodyPivot, stance);

  // Patas: cortas y un poco más anchas arriba, con pezuñas. Cada una gira desde su parte de arriba
  // (y = 0.42, dentro del cuerpo) para poder doblarse al acostarse.
  const legGeometry = new THREE.CylinderGeometry(0.125, 0.105, 0.34, 20);
  const hoofGeometry = new THREE.CylinderGeometry(0.11, 0.118, 0.085, 20);
  const legs: Array<{ pivot: THREE.Group; front: boolean }> = [];
  for (const [x, z] of [[0.24, 0.3], [-0.24, 0.3], [0.24, -0.3], [-0.24, -0.3]] as const) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.42, z);
    pivot.add(mesh(legGeometry, fur, [0, -0.17, 0]));
    pivot.add(mesh(hoofGeometry, hoof, [0, -0.38, 0]));
    stance.add(pivot);
    legs.push({ pivot, front: z > 0 });
  }

  // Cuerpo: elipsoide en y = 0.62 (de y 0.25 a 0.99 y de z -0.59 a 0.59), con manchas pintadas.
  bodyPivot.add(mesh(new THREE.SphereGeometry(0.5, 64, 40), furMaterial(bodySkin), [0, 0.62, 0], bodyScale.toArray() as [number, number, number]));
  // Cuello: une el cuerpo con la cabeza para que no parezca una bola pegada.
  bodyPivot.add(mesh(new THREE.SphereGeometry(0.25, 32, 24), fur, [0, 0.9, 0.4], [1, 1.05, 1.1]));

  // Collar alrededor del cuello, perpendicular a la línea cuerpo→cabeza: asoma bajo la barbilla.
  const collarRing = mesh(new THREE.TorusGeometry(0.255, 0.03, 12, 48), collar, [0, 0.9, 0.4]);
  collarRing.rotation.x = -0.72;
  bodyPivot.add(collarRing);
  // Campanita bajo la barbilla, por fuera del pecho (y 0.71, z 0.63).
  const bell = new THREE.Group();
  bell.position.set(0, 0.71, 0.63);
  bell.add(mesh(new THREE.TorusGeometry(0.022, 0.007, 8, 16), bellMat, [0, 0, 0]));
  bell.add(mesh(new THREE.SphereGeometry(0.065, 24, 16), bellMat, [0, -0.06, 0.02]));
  bell.add(mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.02, 8), dark, [0, -0.12, 0.04]));
  bodyPivot.add(bell);

  // Cola: tubo curvo desde atrás del cuerpo con un mechón café. Gira desde su base.
  const tail = new THREE.Group();
  tail.position.set(0, 0.78, -0.51);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.06, -0.12), new THREE.Vector3(0, -0.22, -0.17), new THREE.Vector3(0, -0.36, -0.12)]);
  tail.add(mesh(new THREE.TubeGeometry(tailCurve, 20, 0.022, 8), fur, [0, 0, 0]));
  tail.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), spot, [0, -0.4, -0.1], [1, 1.4, 1]));
  bodyPivot.add(tail);

  // Cabeza grande (estilo chibi) en (0, 1.13, 0.58), metida un poco en el cuello y el cuerpo.
  const HEAD_Y = 1.13;
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0.58);
  bodyPivot.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.42, 64, 40), furMaterial(headSkin), [0, 0, 0], headScale.toArray() as [number, number, number]));

  // Hocico ancho y poco saliente (de perfil no parece de cerdito), con fosas al frente.
  head.add(mesh(new THREE.SphereGeometry(0.25, 40, 24), snout, [0, -0.15, 0.27], [1.3, 0.8, 0.7]));
  const nostrilGeometry = new THREE.SphereGeometry(0.026, 12, 8);
  const nostril = material(COLORS.nostril);
  head.add(mesh(nostrilGeometry, nostril, [0.085, -0.12, 0.432], [1, 1.3, 0.5]));
  head.add(mesh(nostrilGeometry, nostril, [-0.085, -0.12, 0.432], [1, 1.3, 0.5]));
  // Boca: sonrisa normal, y boca abierta con lengüita cuando dice "¡Muuu!".
  const smile = mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 24, Math.PI), dark, [0, -0.215, 0.43]);
  smile.rotation.z = Math.PI;
  head.add(smile);
  const openMouth = new THREE.Group();
  openMouth.position.set(0, -0.225, 0.425);
  openMouth.add(mesh(new THREE.SphereGeometry(1, 20, 12), dark, [0, 0, 0], [0.055, 0.04, 0.02]));
  openMouth.add(mesh(new THREE.SphereGeometry(1, 16, 10), tongue, [0, -0.014, 0.008], [0.032, 0.018, 0.014]));
  openMouth.visible = false;
  head.add(openMouth);

  // Ojos grandes con dos brillos. Para parpadear se aplastan; contentos o dormida se cambian por arquitos.
  const eyes: THREE.Group[] = [];
  const happyEyes: THREE.Mesh[] = [];
  const sleepyEyes: THREE.Mesh[] = [];
  const arcGeometry = new THREE.TorusGeometry(0.045, 0.011, 8, 20, Math.PI);
  for (const x of [0.16, -0.16]) {
    const eye = new THREE.Group();
    eye.position.set(x, 0.06, 0.352);
    eye.add(mesh(new THREE.SphereGeometry(0.075, 24, 16), dark, [0, 0, 0], [0.85, 1, 0.55]));
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), shine).translateX(0.022).translateY(0.032).translateZ(0.035));
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 6), shine).translateX(-0.02).translateY(-0.024).translateZ(0.037));
    head.add(eye);
    eyes.push(eye);
    const happy = mesh(arcGeometry, dark, [x, 0.05, 0.385]); // "^": ojitos contentos.
    happy.visible = false;
    head.add(happy);
    happyEyes.push(happy);
    const sleepy = mesh(arcGeometry, dark, [x, 0.07, 0.385]); // "‿": ojos cerrados al dormir.
    sleepy.rotation.z = Math.PI;
    sleepy.visible = false;
    head.add(sleepy);
    sleepyEyes.push(sleepy);
  }

  // Orejas de hoja hacia los lados, caídas y un poco al frente para que se vea el rosa de adentro.
  // La izquierda es café, como una mancha más.
  const earGeometry = leafGeometry(0.34, 0.11, 0.05);
  const innerEarGeometry = leafGeometry(0.25, 0.075, 0.03);
  const ears: THREE.Group[] = [];
  for (const side of [1, -1]) {
    const ear = new THREE.Group();
    ear.position.set(side * 0.36, 0.13, -0.03);
    ear.scale.x = side;
    ear.rotation.set(0, side * -0.4, side * -0.38);
    ear.add(mesh(earGeometry, side === 1 ? fur : spot, [0, 0, 0]));
    ear.add(mesh(innerEarGeometry, innerEar, [0.035, 0, 0.032]));
    head.add(ear);
    ears.push(ear);
  }

  // Cuernitos y un rizo café entre ellos.
  for (const side of [1, -1]) {
    const hornMesh = mesh(new THREE.CapsuleGeometry(0.042, 0.09, 6, 12), horn, [side * 0.17, 0.35, -0.05]);
    hornMesh.rotation.z = side * -0.35;
    head.add(hornMesh);
  }
  const tuftGeometry = new THREE.SphereGeometry(0.06, 16, 12);
  head.add(mesh(tuftGeometry, spot, [0, 0.385, 0.05]));
  head.add(mesh(tuftGeometry, spot, [0.06, 0.37, 0.1], [0.85, 0.85, 0.85]));
  head.add(mesh(tuftGeometry, spot, [-0.06, 0.37, 0.1], [0.85, 0.85, 0.85]));
  head.add(mesh(tuftGeometry, spot, [0, 0.355, 0.15], [0.7, 0.7, 0.7]));

  // --- Efectos: corazones al acariciarla y "z" al dormir. Son sprites, siempre de frente a la cámara.
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

  // --- Animación -------------------------------------------------------------
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

    // Acostarse y levantarse poco a poco.
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
    let yawTarget = THREE.MathUtils.clamp(Math.atan2(viewerLocal.x, viewerLocal.z - 0.58), -0.75, 0.75);
    let pitchTarget = THREE.MathUtils.clamp(-Math.atan2(viewerLocal.y - HEAD_Y, Math.hypot(viewerLocal.x, viewerLocal.z - 0.58)), -0.3, 0.2);
    if (context.pointer) {
      yawTarget = THREE.MathUtils.clamp(yawTarget + context.pointer.x * 0.35, -0.85, 0.85);
      pitchTarget = THREE.MathUtils.clamp(pitchTarget - context.pointer.y * 0.2, -0.35, 0.25);
    }
    if (lie > 0.05) {
      yawTarget *= 1 - lie;
      pitchTarget = pitchTarget * (1 - lie) + 0.28 * lie; // Dormida, la cabeza se recarga hacia abajo.
    }
    lookYaw += (yawTarget - lookYaw) * ease(4);
    lookPitch += (pitchTarget - lookPitch) * ease(4);
    head.rotation.set(lookPitch + 0.04 * Math.sin(time * 1.3) * calm, lookYaw + 0.06 * Math.sin(time * 0.55) * calm, 0.05 * Math.sin(time * 0.9) * calm);
    head.position.y = HEAD_Y;

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
        // Cierra los ojitos contenta, ladea la cabeza y salen corazones.
        happy = true;
        head.rotation.z += 0.16 * Math.sin(elapsed * 5) * Math.min(1, elapsed * 3);
        wag = 0.8 * Math.sin(elapsed * 15);
        while (action.spawned < 4 && elapsed > action.spawned * 0.3) {
          // A los lados de la cabeza (alternando), no encima de la cara, y sin salirse del cuadro al subir.
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
        head.position.y = HEAD_Y - 0.14 * down;
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

    // "Zzz" mientras duerme.
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
      particle.sprite.position.set(
        particle.from.x + 0.06 * Math.sin(particle.sway + age * 6),
        particle.from.y + particle.rise * age,
        particle.from.z,
      );
      particle.sprite.scale.setScalar(particle.size * Math.min(1, age * 5) * (1 + age * 0.4));
      particle.sprite.material.opacity = 1 - age * age;
    }
  }

  return { root, body, play, setSleeping, update, textures: [bodySkin, headSkin, heartTexture, zTexture] };
}

// --- Prado -----------------------------------------------------------------

/** Prado redondo con borde suave, flores de colores y matitas de pasto, como en la ilustración. */
function buildMeadow() {
  const meadow = new THREE.Group();
  const profile = [[0, 0], [1.55, 0], [1.63, -0.015], [1.68, -0.05], [1.69, -0.1], [1.65, -0.15], [1.5, -0.18], [0, -0.18]].map(([x, y]) => new THREE.Vector2(x, y));
  const ground = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), material(COLORS.grass, { roughness: 1, side: THREE.DoubleSide }));
  ground.receiveShadow = true;
  meadow.add(ground);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 8, 72), material(COLORS.grassEdge, { roughness: 1 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.005;
  meadow.add(rim);

  // Matitas de pasto: muchas hojitas en un solo objeto (InstancedMesh) para no cargar el teléfono.
  const bladesPerTuft = 3;
  const tufts = 70;
  const blades = new THREE.InstancedMesh(new THREE.ConeGeometry(0.014, 0.1, 4), material(COLORS.blade, { roughness: 0.9 }), tufts * bladesPerTuft);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  for (let tuft = 0; tuft < tufts; tuft++) {
    const angle = tuft * 2.399 + 1.1;
    const distance = 0.55 + ((tuft * 53) % 100) / 100;
    for (let blade = 0; blade < bladesPerTuft; blade++) {
      euler.set(0.35 * Math.cos(blade * 2.1 + tuft), blade * 2.1, 0.35 * Math.sin(blade * 2.1 + tuft));
      quaternion.setFromEuler(euler);
      matrix.compose(new THREE.Vector3(Math.cos(angle) * distance + (blade - 1) * 0.015, 0.045, Math.sin(angle) * distance), quaternion, new THREE.Vector3(1, 0.8 + (blade % 2) * 0.4, 1));
      blades.setMatrixAt(tuft * bladesPerTuft + blade, matrix);
    }
  }
  meadow.add(blades);

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
