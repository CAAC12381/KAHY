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

  // Viento del pasto: el tiempo se pasa al shader en cada cuadro.
  const wind = { value: 0 };
  scene.add(buildMeadow(wind));
  // En equipos modestos se esculpe con menos detalle para que cargue rápido.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const modest = memory <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  // Capas de pelo: menos en equipos modestos (cada capa es dibujar la figura otra vez).
  const moka = await buildMoka(modest ? 0.8 : 1, options.onProgress, modest ? 7 : 11);
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
    wind.value = options.reducedMotion ? 0 : timer.getElapsed();
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
function buildMeadow(wind: { value: number }) {
  const meadow = new THREE.Group();
  const profile = [[0, 0], [1.55, 0], [1.63, -0.015], [1.68, -0.05], [1.69, -0.1], [1.65, -0.15], [1.5, -0.18], [0, -0.18]].map(([x, y]) => new THREE.Vector2(x, y));
  const ground = new THREE.Mesh(new THREE.LatheGeometry(profile, 72), material(COLORS.grass, { roughness: 1, side: THREE.DoubleSide }));
  ground.receiveShadow = true;
  meadow.add(ground);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.025, 8, 72), material(COLORS.grassEdge, { roughness: 1 }));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.005;
  meadow.add(rim);

  meadow.add(buildGrass(wind));

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

/**
 * Pasto: unas 1800 hojas curvas y afiladas en varios verdes, dibujadas de una sola vez (InstancedMesh).
 * Se mecen con el viento en la tarjeta gráfica (`wind` es el tiempo). Son altas, planas y verdes
 * para que no se confundan con el pelo de Moka, que es corto, crema y suave.
 */
function buildGrass(wind: { value: number }) {
  // Hoja: tira de 4 tramos que se angosta hasta la punta y se curva hacia +z.
  const segments = 4;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const halfWidth = 0.011 * (1 - t * 0.92);
    const bend = 0.035 * t * t;
    positions.push(-halfWidth, t, bend, halfWidth, t, bend);
    if (row < segments) {
      const base = row * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const grassMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.85, side: THREE.DoubleSide });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uWind;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
        // Se mece más la punta que la base; cada hoja con su propio ritmo según dónde está.
        vec3 root = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);
        float sway = sin(uWind * 1.6 + root.x * 4.0 + root.z * 3.0) * 0.6 + sin(uWind * 2.7 + root.z * 6.0) * 0.4;
        transformed.z += sway * 0.12 * position.y * position.y;`);
  };
  grassMaterial.customProgramCacheKey = () => "kahy-grass";

  const samples = 2000; // Puntos repartidos en todo el prado; se descartan los que caen bajo Moka.
  const blades = new THREE.InstancedMesh(geometry, grassMaterial, samples);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const greens = ["#86b46a", "#9cc47c", "#78a65f", "#afd08c", "#91bd73"].map((hex) => new THREE.Color(hex));
  const color = new THREE.Color();
  let placed = 0;
  for (let index = 0; index < samples; index++) {
    // Reparto en espiral (ángulo dorado) con un poco de desorden estable; sin pasto bajo la panza de Moka.
    const angle = index * 2.39996 + Math.sin(index * 12.9898) * 0.3;
    const distance = 1.55 * Math.sqrt((index + 0.5) / samples) + 0.02 * Math.sin(index * 78.233);
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    if ((x / 0.42) ** 2 + (z / 0.55) ** 2 < 1 || distance > 1.56) continue;
    const height = 0.06 + 0.09 * (0.5 + 0.5 * Math.sin(index * 3.17));
    euler.set(0.18 * Math.sin(index * 1.7), index * 1.37, 0.18 * Math.cos(index * 2.3));
    quaternion.setFromEuler(euler);
    matrix.compose(new THREE.Vector3(x, 0, z), quaternion, new THREE.Vector3(1, height, 1));
    blades.setMatrixAt(placed, matrix);
    color.copy(greens[index % greens.length]).multiplyScalar(0.9 + 0.2 * (0.5 + 0.5 * Math.sin(index * 5.3)));
    blades.setColorAt(placed, color);
    placed++;
  }
  blades.count = placed;
  blades.receiveShadow = true;
  return blades;
}
