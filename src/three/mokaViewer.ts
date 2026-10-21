import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { buildMoka, type MokaAction } from "./mokaModel";

export type { MokaAction };

/**
 * Escena 3D de Moka: lienzo, luces, cámara que se gira con el dedo o el
 * mouse, el prado y la foto. El modelo (esculpido) y sus animaciones están en
 * mokaModel.ts; las herramientas para esculpir, en sculpt.ts.
 */

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
  /** Avance de la escultura, de 0 a 1 (solo la primera vez por visita). */
  onProgress?: (fraction: number) => void;
};

// Colores del prado y del fondo de la foto (los de Moka están en mokaModel.ts).
const COLORS = {
  grass: "#c3d9a8",
  grassEdge: "#a9c78c",
  blade: "#9fc184",
  photoBackground: "#f6efe0",
};

const CAMERA_START = new THREE.Vector3(2.3, 1.75, 3.4);
const TARGET = new THREE.Vector3(0, 0.74, 0);

export async function createMokaViewer(container: HTMLElement, options: Options): Promise<MokaViewer> {
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

  // Luz de contorno desde atrás: separa la silueta de Moka del fondo claro.
  const rim = new THREE.DirectionalLight("#fff4e0", 1.1);
  rim.position.set(-1.5, 2.5, -3.5);
  scene.add(rim);

  scene.add(buildMeadow());
  // En equipos modestos se esculpe con menos detalle para que cargue rápido.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const modest = memory <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  const moka = await buildMoka(modest ? 0.8 : 1, options.onProgress);
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
        if (!object.geometry.userData.keep) object.geometry.dispose(); // Las esculpidas se reutilizan al volver.
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

function material(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, ...extra });
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
