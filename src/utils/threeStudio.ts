import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export interface StudioContextHandle {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  isSoftwareGl: boolean;
  envRenderTarget: THREE.WebGLRenderTarget;
  dispose: () => void;
}

/**
 * Detects software WebGL rasterizers (SwiftShader, llvmpipe, WARP) using the GPU renderer string.
 * Only used for rendering cost (DPR, AA, shadows, loop pacing), never scene geometry or UI logic.
 */
export function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement("canvas");
    const gl = probeCanvas.getContext("webgl2");
    if (!gl) return true;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || "");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function disposeSceneSubtree(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const m of mats) {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) std.map.dispose();
        if (std.roughnessMap) std.roughnessMap.dispose();
        if (std.normalMap) std.normalMap.dispose();
        if (std.emissiveMap) std.emissiveMap.dispose();
        m.dispose();
      }
    }
  });
}

export function createRadialContactShadowTexture(size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const half = size / 2;
  const grad = ctx.createRadialGradient(half, half, size * 0.06, half, half, half * 0.96);
  grad.addColorStop(0, "rgba(0, 0, 0, 0.72)");
  grad.addColorStop(0.55, "rgba(0, 0, 0, 0.3)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export interface StudioInitOptions {
  backgroundHex?: number;
  fogNear?: number;
  fogFar?: number;
  fov?: number;
  cameraPos?: [number, number, number];
  targetPos?: [number, number, number];
  minDistance?: number;
  maxDistance?: number;
  shadowBounds?: number;
  benchSize?: number;
  benchY?: number;
  gridDivisions?: number;
}

export function initThreeStudio(
  container: HTMLElement,
  opts: StudioInitOptions = {}
): StudioContextHandle {
  const isSoftwareGl = detectSoftwareWebGL();
  const width = Math.max(280, container.clientWidth || 640);
  const height = Math.max(240, container.clientHeight || 380);

  const renderer = new THREE.WebGLRenderer({
    antialias: !isSoftwareGl,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.setPixelRatio(
    isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
  );
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = !isSoftwareGl;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.touchAction = "none";

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  const bgHex = opts.backgroundHex ?? 0x060a14;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bgHex);
  scene.fog = new THREE.Fog(bgHex, opts.fogNear ?? 16, opts.fogFar ?? 38);

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envRenderTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRenderTarget.texture;
  pmremGenerator.dispose();

  const camera = new THREE.PerspectiveCamera(
    opts.fov ?? 38,
    width / height,
    0.1,
    120
  );
  const camPos = opts.cameraPos ?? [4.5, 4.8, 5.8];
  camera.position.set(camPos[0], camPos[1], camPos[2]);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !isSoftwareGl;
  controls.dampingFactor = 0.08;
  controls.minDistance = opts.minDistance ?? 2.0;
  controls.maxDistance = opts.maxDistance ?? 24;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.enablePan = true;
  const tgt = opts.targetPos ?? [0, 0.25, 0];
  controls.target.set(tgt[0], tgt[1], tgt[2]);
  controls.update();

  // 3-Point Warm Key + Cool Hemisphere Fill + Cyan Rim Light
  const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x0e172a, 0.85);
  scene.add(hemiLight);

  const b = opts.shadowBounds ?? 7;
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.05);
  keyLight.position.set(b * 1.1, b * 1.75, b * 0.95);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = b * 6;
  keyLight.shadow.camera.left = -b;
  keyLight.shadow.camera.right = b;
  keyLight.shadow.camera.top = b;
  keyLight.shadow.camera.bottom = -b;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x22d3ee, 0.9);
  rimLight.position.set(-b * 1.1, b * 0.7, -b * 0.9);
  scene.add(rimLight);

  // Dark ESD Workbench Floor + Grid
  const benchY = opts.benchY ?? -0.25;
  const benchSize = opts.benchSize ?? 38;
  const benchGeo = new THREE.PlaneGeometry(benchSize * 1.8, benchSize * 1.8);
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x09101d,
    roughness: 0.86,
    metalness: 0.08,
  });
  const benchMesh = new THREE.Mesh(benchGeo, benchMat);
  benchMesh.rotation.x = -Math.PI / 2;
  benchMesh.position.y = benchY;
  benchMesh.receiveShadow = true;
  scene.add(benchMesh);

  const gridHelper = new THREE.GridHelper(
    benchSize,
    opts.gridDivisions ?? 38,
    0x1e3a5f,
    0x0e1a30
  );
  gridHelper.position.y = benchY + 0.012;
  scene.add(gridHelper);

  const dispose = () => {
    controls.dispose();
    disposeSceneSubtree(scene);
    envRenderTarget.dispose();
    renderer.dispose();
    try {
      renderer.forceContextLoss();
    } catch {
      // ignore if already lost
    }
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return {
    renderer,
    scene,
    camera,
    controls,
    isSoftwareGl,
    envRenderTarget,
    dispose,
  };
}

/**
 * Software-WebGL fenceSync frame waiter (avoids starving main thread on SwiftShader).
 */
export function afterDrawSync(
  renderer: THREE.WebGLRenderer,
  isDisposed: () => boolean,
  onTimerId: (id: number) => void,
  cb: () => void
): void {
  if (isDisposed()) return;
  const gl = renderer.getContext() as WebGL2RenderingContext;
  if (gl && typeof gl.fenceSync === "function") {
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (isDisposed()) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
      if (state === gl.UNSIGNALED) {
        onTimerId(window.setTimeout(poll, 5));
      } else {
        if (sync) gl.deleteSync(sync);
        onTimerId(window.setTimeout(cb, 80));
      }
    };
    onTimerId(window.setTimeout(poll, 5));
  } else {
    onTimerId(window.setTimeout(cb, 80));
  }
}
