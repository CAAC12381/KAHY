import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createMeadowLife } from "./meadowLife";
import { buildMoka, type MokaAction } from "./mokaModel";

export type { MokaAction };

/**
 * Escena 3D de Moka: lienzo, luces (de día y de noche), cámara que se gira con
 * el dedo, el mouse o el teclado, el prado con su vida (meadowLife.ts) y la
 * foto. El modelo y sus animaciones están en mokaModel.ts; las herramientas
 * para esculpir, en sculpt.ts.
 *
 * Gestos sobre el lienzo:
 * - Arrastrar en el fondo gira la cámara; dos dedos o la rueda acercan.
 * - Tocar a Moka la hace saludar; arrastrar sobre ella la acaricia.
 * - Con el lienzo enfocado: flechas giran, + y − acercan, Enter saluda.
 */

export type MokaViewer = {
  play: (action: MokaAction) => void;
  setSleeping: (sleeping: boolean) => void;
  setAutoRotate: (enabled: boolean) => void;
  resetView: () => void;
  /** Foto con marco y nombre, como PNG (data URL). */
  takePhoto: () => string;
  dispose: () => void;
};

type Options = {
  reducedMotion: boolean;
  /** Se llama cuando la persona toca a Moka (sin arrastrar) o pulsa Enter con el lienzo enfocado. */
  onTap: () => void;
  /** Se llama una vez por caricia (al arrastrar el dedo o el mouse sobre Moka). */
  onPet?: () => void;
  /** Avance de la escultura, de 0 a 1 (solo la primera vez por visita). */
  onProgress?: (fraction: number) => void;
};

// Colores del prado y del fondo de la foto (los de Moka están en mokaModel.ts).
const COLORS = {
  grass: "#c3d9a8",
  grassEdge: "#a9c78c",
  photoBackground: "#f6efe0",
};

// Luces de día y de noche (cuando Moka duerme todo se vuelve luz de luna, poco a poco).
const LIGHT = {
  day: { sky: new THREE.Color("#fff6e6"), ground: new THREE.Color("#c9c2a8"), hemi: 1.0, sun: new THREE.Color("#fff0d8"), sunPower: 2.0, rim: new THREE.Color("#fff4e0"), rimPower: 1.1, environment: 0.45, exposure: 1.1 },
  night: { sky: new THREE.Color("#8ea2d8"), ground: new THREE.Color("#2e3452"), hemi: 0.55, sun: new THREE.Color("#c6d4ff"), sunPower: 0.6, rim: new THREE.Color("#a9b8ff"), rimPower: 0.9, environment: 0.16, exposure: 0.95 },
};

const CAMERA_START = new THREE.Vector3(2.3, 1.75, 3.4);
const TARGET = new THREE.Vector3(0, 0.74, 0);

export async function createMokaViewer(container: HTMLElement, options: Options): Promise<MokaViewer> {
  // Lanza un error si el navegador no tiene WebGL; la página muestra un aviso en ese caso.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  let pixelRatio = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = LIGHT.day.exposure;
  const canvas = renderer.domElement;
  canvas.className = "moka-canvas";
  // El lienzo se puede enfocar con Tab y manejar con el teclado.
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "application");
  canvas.setAttribute("aria-roledescription", "vista 3D");
  canvas.setAttribute("aria-label", "Moka en 3D. Flechas para girar la vista, más y menos para acercar, Enter para saludarla.");
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.copy(CAMERA_START);

  // Luz suave de cuarto (para el brillo de la campana y el pelaje) + sol cálido con sombra difusa.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  scene.environmentIntensity = LIGHT.day.environment;
  room.dispose();
  pmrem.dispose();
  const hemisphere = new THREE.HemisphereLight(LIGHT.day.sky, LIGHT.day.ground, LIGHT.day.hemi);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(LIGHT.day.sun, LIGHT.day.sunPower);
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
  const rim = new THREE.DirectionalLight(LIGHT.day.rim, LIGHT.day.rimPower);
  rim.position.set(-1.5, 2.5, -3.5);
  scene.add(rim);

  // Viento del pasto: el tiempo se pasa al shader en cada cuadro.
  const wind = { value: 0 };
  scene.add(buildMeadow(wind));
  const life = createMeadowLife();
  scene.add(life.group);
  // En equipos modestos se esculpe con menos detalle para que cargue rápido.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  const modest = memory <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4;
  // Capas de pelo: menos en equipos modestos (cada capa es dibujar la figura otra vez).
  const moka = await buildMoka(modest ? 0.8 : 1, options.onProgress, modest ? 7 : 11);
  scene.add(moka.root);

  const controls = new OrbitControls(camera, canvas);
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

  // --- Gestos ----------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hovering = false;
  // Un gesto que empezó sobre Moka es caricia (la cámara no se mueve); en el fondo, gira la cámara.
  let gesture: { x: number; y: number; onMoka: boolean; travel: number; petted: boolean; lastX: number; lastY: number } | null = null;
  const hitOnMoka = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObject(moka.body, true)[0]?.point ?? null;
  };
  const onPointerDown = (event: PointerEvent) => {
    if (gesture) {
      // Segundo dedo (para acercar con dos dedos): deja de ser caricia y la cámara vuelve a responder.
      if (gesture.onMoka) moka.rub(null);
      gesture = null;
      controls.enabled = true;
      return;
    }
    const onMoka = hitOnMoka(event) !== null;
    gesture = { x: event.clientX, y: event.clientY, onMoka, travel: 0, petted: false, lastX: event.clientX, lastY: event.clientY };
    if (onMoka) {
      controls.enabled = false; // Este listener corre antes que el de OrbitControls (fase de captura).
      canvas.setPointerCapture?.(event.pointerId);
    }
  };
  const onPointerMove = (event: PointerEvent) => {
    hovering = event.pointerType === "mouse";
    if (gesture) {
      gesture.travel += Math.hypot(event.clientX - gesture.lastX, event.clientY - gesture.lastY);
      gesture.lastX = event.clientX;
      gesture.lastY = event.clientY;
      if (gesture.onMoka && gesture.travel > 6) {
        const point = hitOnMoka(event);
        moka.rub(point);
        if (!gesture.petted && gesture.travel > 40) {
          gesture.petted = true;
          options.onPet?.();
        }
      }
    } else if (hovering) {
      canvas.style.cursor = hitOnMoka(event) ? "grab" : "";
    }
  };
  const endGesture = (event: PointerEvent) => {
    if (!gesture) return;
    const tapped = gesture.onMoka && gesture.travel <= 6;
    if (gesture.onMoka) moka.rub(null);
    gesture = null;
    controls.enabled = true;
    if (tapped && event.type === "pointerup") options.onTap();
  };
  const onPointerLeave = () => { hovering = false; };
  canvas.addEventListener("pointerdown", onPointerDown, { capture: true });
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endGesture);
  canvas.addEventListener("pointercancel", endGesture);
  canvas.addEventListener("pointerleave", onPointerLeave);

  // Teclado: girar y acercar alrededor del mismo centro, con los mismos límites que con el dedo.
  const spherical = new THREE.Spherical();
  const offset = new THREE.Vector3();
  const onKeyDown = (event: KeyboardEvent) => {
    let theta = 0;
    let phi = 0;
    let zoom = 1;
    if (event.key === "ArrowLeft") theta = -0.26;
    else if (event.key === "ArrowRight") theta = 0.26;
    else if (event.key === "ArrowUp") phi = -0.15;
    else if (event.key === "ArrowDown") phi = 0.15;
    else if (event.key === "+" || event.key === "=") zoom = 0.88;
    else if (event.key === "-" || event.key === "_") zoom = 1.14;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      options.onTap();
      return;
    } else return;
    event.preventDefault();
    offset.copy(camera.position).sub(controls.target);
    spherical.setFromVector3(offset);
    spherical.theta += theta;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi + phi, controls.minPolarAngle, controls.maxPolarAngle);
    spherical.radius = THREE.MathUtils.clamp(spherical.radius * zoom, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
    controls.update();
  };
  canvas.addEventListener("keydown", onKeyDown);

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

  // Calidad automática: si durante 3 s seguidos va a menos de ~25 cuadros por segundo, primero baja la
  // resolución y luego la mitad de las capas de pelo. Nunca vuelve a subir (evita que parpadee la calidad).
  let quality = 2;
  let slowSince = -1;
  let frameAverage = 1 / 60;
  const lowerQuality = () => {
    if (quality === 2 && pixelRatio > 1) {
      pixelRatio = 1;
      renderer.setPixelRatio(1);
      resize();
    } else {
      moka.setFurLayers(0.5);
    }
    quality--;
  };

  const timer = new THREE.Timer();
  const frame = (timestamp: number) => {
    timer.update(timestamp);
    const rawDelta = timer.getDelta();
    // Tope de 0.1 s: al volver a la pestaña no da un salto, y en equipos lentos las transiciones no se quedan a medias.
    const delta = Math.min(rawDelta, 0.1);
    const time = timer.getElapsed();
    wind.value = options.reducedMotion ? 0 : time;

    // Noche: cuando Moka duerme, la luz pasa poco a poco a luz de luna.
    const night = moka.night();
    hemisphere.color.lerpColors(LIGHT.day.sky, LIGHT.night.sky, night);
    hemisphere.groundColor.lerpColors(LIGHT.day.ground, LIGHT.night.ground, night);
    hemisphere.intensity = THREE.MathUtils.lerp(LIGHT.day.hemi, LIGHT.night.hemi, night);
    sun.color.lerpColors(LIGHT.day.sun, LIGHT.night.sun, night);
    sun.intensity = THREE.MathUtils.lerp(LIGHT.day.sunPower, LIGHT.night.sunPower, night);
    rim.color.lerpColors(LIGHT.day.rim, LIGHT.night.rim, night);
    rim.intensity = THREE.MathUtils.lerp(LIGHT.day.rimPower, LIGHT.night.rimPower, night);
    scene.environmentIntensity = THREE.MathUtils.lerp(LIGHT.day.environment, LIGHT.night.environment, night);
    renderer.toneMappingExposure = THREE.MathUtils.lerp(LIGHT.day.exposure, LIGHT.night.exposure, night);

    const interest = life.update(time, delta, night, options.reducedMotion, (out) => moka.perch(out));
    moka.update(time, delta, {
      reducedMotion: options.reducedMotion,
      viewer: camera,
      pointer: hovering && !gesture ? pointer : null,
      interest,
    });
    controls.update();
    renderer.render(scene, camera);

    if (quality > 0 && document.visibilityState === "visible") {
      frameAverage += (Math.min(rawDelta, 0.25) - frameAverage) * 0.05;
      if (frameAverage > 0.04) {
        if (slowSince < 0) slowSince = time;
        else if (time - slowSince > 3) {
          lowerQuality();
          slowSince = -1;
          frameAverage = 1 / 60;
        }
      } else slowSince = -1;
    }
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
      // Se dibuja con más resolución, sobre fondo (claro de día, azul de noche), y se le pone un marco con nombre y fecha.
      const night = moka.night();
      const previousBackground = scene.background;
      scene.background = new THREE.Color(COLORS.photoBackground).lerp(new THREE.Color("#2b3150"), night);
      renderer.setPixelRatio(Math.min(3, Math.max(2, pixelRatio)));
      renderer.render(scene, camera);
      const shot = document.createElement("canvas");
      const padding = Math.round(canvas.width * 0.04);
      const caption = Math.round(canvas.width * 0.09);
      shot.width = canvas.width + padding * 2;
      shot.height = canvas.height + padding * 2 + caption;
      const ctx = shot.getContext("2d")!;
      ctx.fillStyle = "#fffefb";
      ctx.fillRect(0, 0, shot.width, shot.height);
      ctx.save();
      const radius = padding * 0.8;
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(padding, padding, canvas.width, canvas.height, radius);
      else ctx.rect(padding, padding, canvas.width, canvas.height); // Navegadores viejos: esquinas rectas.
      ctx.clip();
      ctx.drawImage(canvas, padding, padding);
      ctx.restore();
      ctx.fillStyle = "#684d72";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${Math.round(caption * 0.42)}px Inter, "Segoe UI", system-ui, sans-serif`;
      ctx.fillText("Moka · KAHY", padding, canvas.height + padding + caption / 2);
      ctx.fillStyle = "#6d6f68";
      ctx.font = `500 ${Math.round(caption * 0.28)}px Inter, "Segoe UI", system-ui, sans-serif`;
      ctx.textAlign = "right";
      ctx.fillText(new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" }), shot.width - padding, canvas.height + padding + caption / 2);
      const url = shot.toDataURL("image/png");
      scene.background = previousBackground;
      renderer.setPixelRatio(pixelRatio);
      resize();
      return url;
    },
    dispose: () => {
      visibility.disconnect();
      resizeObserver.disconnect();
      renderer.setAnimationLoop(null);
      timer.dispose();
      canvas.removeEventListener("pointerdown", onPointerDown, { capture: true });
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", endGesture);
      canvas.removeEventListener("pointercancel", endGesture);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("keydown", onKeyDown);
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
      life.dispose();
      scene.environment?.dispose();
      renderer.dispose();
      canvas.remove();
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
