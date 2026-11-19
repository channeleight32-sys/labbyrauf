import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  Eye,
  RotateCcw,
  Layers,
  Cable,
  Move,
  MousePointer,
  Lock,
  Unlock,
  Crosshair,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";
import {
  createCapacitorElectrolytic3D,
  createDiffusedLed3D,
  createDipIc3D,
  createPotentiometer3D,
  createResistor3D,
  createTactileButton3D,
  createTransistorTo2203D,
} from "./three/electronicsPrimitives3D";
import {
  createBenchPowerSupply3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";
import {
  WORLD_BOARD_D,
  WORLD_BOARD_H,
  WORLD_BOARD_TOP_Y,
  WORLD_BOARD_W,
  WORLD_COL_PITCH as COL_PITCH,
  WORLD_ROW_PITCH as ROW_PITCH,
  WORLD_START_COL_X as START_COL_X,
  WORLD_Z_BOT_NEG_RAIL as Z_BOT_NEG_RAIL,
  WORLD_Z_BOT_POS_RAIL as Z_BOT_POS_RAIL,
  WORLD_Z_ROW_A as Z_ROW_A,
  WORLD_Z_ROW_F as Z_ROW_F,
  WORLD_Z_TOP_NEG_RAIL as Z_TOP_NEG_RAIL,
  WORLD_Z_TOP_POS_RAIL as Z_TOP_POS_RAIL,
  formatHoleLabel,
  holeToWorldXZ,
  worldXZToNearestHole,
  type BreadboardComponentItem,
  type BreadboardHoleId,
  type BreadboardWire,
  type InstalledBreadboardPme,
} from "../utils/breadboardCoordMapper";

// Pre-allocated reusable math helpers (zero GC inside render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _mat4A = new THREE.Matrix4();
const _scaleA = new THREE.Vector3();

const BOARD_W = WORLD_BOARD_W;
const BOARD_D = WORLD_BOARD_D;
const BOARD_H = WORLD_BOARD_H;
const BOARD_TOP_Y = WORLD_BOARD_TOP_Y;

export interface Breadboard3DViewportProps {
  components: BreadboardComponentItem[];
  wires: BreadboardWire[];
  vSourceVal: number;
  simRunning: boolean;
  simFreqHz?: number;
  selectedWireColor?: string;
  simResults: {
    vMap: Map<string, number>;
    currentMap: Map<string, number>;
    find?: (k: string) => string;
  };
  selectedComponentId: string | null;
  pendingWireStart?: BreadboardHoleId | null;
  activeProbeToPlace?: "SCOPE_CH1" | "SCOPE_CH2" | "DMM_RED" | "DMM_BLACK" | "SIGGEN" | null;
  onSelectComponent: (compId: string | null) => void;
  onDoubleClickComponent: (compId: string) => void;
  onHoleClick?: (hole: BreadboardHoleId) => void;
  onDropComponentAtHole?: (type: string, value: number, hole: BreadboardHoleId) => void;
  onMoveComponentToHole?: (compId: string, hole: BreadboardHoleId) => void;
  onCancelPendingWire?: () => void;
  onTogglePushButton?: (compId: string) => void;
  onStepPotentiometer?: (compId: string, pct?: number) => void;
  isDmmActive: boolean;
  probeRedHole: BreadboardHoleId | null;
  probeBlackHole: BreadboardHoleId | null;
  isScopeActive: boolean;
  probeScopeCh1Hole: BreadboardHoleId | null;
  probeScopeCh2Hole: BreadboardHoleId | null;
  isSigGenActive?: boolean;
  sigGenHole?: BreadboardHoleId | null;
  holeToNetKey: (h: BreadboardHoleId) => string;
  isBoardLocked?: boolean;
  pinViewEnabled?: boolean;
  onToggleBoardLock?: () => void;
  frameCircuitTrigger?: number;
  installedPmes?: InstalledBreadboardPme[];
  activePmeProbeLabel?: string | null;
}

type CameraPresetKey = "ISOMETRIC" | "TOP" | "FRONT" | "MACRO" | "RESET";

const CAMERA_PRESETS: Record<
  CameraPresetKey,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  ISOMETRIC: { label: "Isometric", pos: [0, 9.6, 11.4], target: [0, 0.7, 0] },
  TOP: { label: "Top Down", pos: [0, 15.8, 0.6], target: [0, 0.7, 0] },
  FRONT: { label: "Low Profile", pos: [0, 3.3, 13.0], target: [0, 1.0, 0] },
  MACRO: { label: "IC Close-Up", pos: [-1.8, 4.4, 5.2], target: [-2.2, 0.9, 0] },
  RESET: { label: "Reset", pos: [0, 9.6, 11.4], target: [0, 0.7, 0] },
};

function createBreadboardTopTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 708;
  const ctx = canvas.getContext("2d")!;

  // Matte off-white ABS plastic base
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#f5f7fa");
  grad.addColorStop(0.5, "#eef2f6");
  grad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle plastic grain micro-speckle
  ctx.fillStyle = "rgba(15, 23, 42, 0.015)";
  for (let i = 0; i < 1800; i++) {
    const gx = ((i * 7919) % canvas.width);
    const gy = ((i * 6271) % canvas.height);
    ctx.fillRect(gx, gy, 2, 2);
  }

  const worldToCanvasX = (wx: number) => ((wx + BOARD_W / 2) / BOARD_W) * canvas.width;
  const worldToCanvasY = (wz: number) => ((wz + BOARD_D / 2) / BOARD_D) * canvas.height;

  // Power rail silkscreen stripes
  const drawRailStripe = (wzOffset: number, color: string, sign: string, wzHole: number) => {
    const yLine = worldToCanvasY(wzHole + wzOffset);
    const xStart = worldToCanvasX(START_COL_X - 0.35);
    const xEnd = worldToCanvasX(START_COL_X + 62 * COL_PITCH + 0.35);
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(xStart, yLine);
    ctx.lineTo(xEnd, yLine);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = "bold 26px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(sign, xStart - 28, yLine);
    ctx.fillText(sign, xEnd + 28, yLine);
  };

  drawRailStripe(-0.24, "#dc2626", "+", Z_TOP_POS_RAIL);
  drawRailStripe(0.24, "#2563eb", "-", Z_TOP_NEG_RAIL);
  drawRailStripe(-0.24, "#dc2626", "+", Z_BOT_POS_RAIL);
  drawRailStripe(0.24, "#2563eb", "-", Z_BOT_NEG_RAIL);

  // Center DIP trough recessed shadow band
  const troughTop = worldToCanvasY(-0.21);
  const troughBot = worldToCanvasY(0.21);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(28, troughTop, canvas.width - 56, troughBot - troughTop);
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 2;
  ctx.strokeRect(28, troughTop, canvas.width - 56, troughBot - troughTop);

  ctx.fillStyle = "#475569";
  ctx.font = "bold 17px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(
    "IST LABS · 830 TIE-POINT SOLDERLESS BREADBOARD · 2.54mm PITCH",
    canvas.width / 2,
    (troughTop + troughBot) / 2
  );

  // Row letters A..E and F..J on left and right margins
  ctx.fillStyle = "#334155";
  ctx.font = "bold 20px ui-monospace, SFMono-Regular, Menlo, monospace";
  const leftLabelX = worldToCanvasX(START_COL_X - 0.55);
  const rightLabelX = worldToCanvasX(START_COL_X + 62 * COL_PITCH + 0.55);
  ["A", "B", "C", "D", "E"].forEach((letter, idx) => {
    const cy = worldToCanvasY(Z_ROW_A + idx * ROW_PITCH);
    ctx.fillText(letter, leftLabelX, cy);
    ctx.fillText(letter, rightLabelX, cy);
  });
  ["F", "G", "H", "I", "J"].forEach((letter, idx) => {
    const cy = worldToCanvasY(Z_ROW_F + idx * ROW_PITCH);
    ctx.fillText(letter, leftLabelX, cy);
    ctx.fillText(letter, rightLabelX, cy);
  });

  // Column numbers 1, 5, 10, ..., 60, 63
  ctx.fillStyle = "#475569";
  ctx.font = "bold 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  const topNumY = worldToCanvasY(Z_ROW_A - 0.27);
  const botNumY = worldToCanvasY(Z_ROW_F + 4 * ROW_PITCH + 0.27);
  for (let col = 1; col <= 63; col++) {
    if (col === 1 || col === 63 || col % 5 === 0) {
      const cx = worldToCanvasX(START_COL_X + (col - 1) * COL_PITCH);
      ctx.fillText(String(col), cx, topNumY);
      ctx.fillText(String(col), cx, botNumY);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function disposeObjectSubtree(root: THREE.Object3D) {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        if (std.map) std.map.dispose();
        m.dispose();
      });
    }
  });
}

function addBentLead(
  group: THREE.Group,
  pStart: THREE.Vector3,
  pTopA: THREE.Vector3,
  pTopB: THREE.Vector3,
  pEnd: THREE.Vector3,
  leadMat: THREE.Material,
  radius = 0.026
) {
  const curve = new THREE.CatmullRomCurve3(
    [pStart, pTopA, pTopB, pEnd],
    false,
    "catmullrom",
    0.15
  );
  const geo = new THREE.TubeGeometry(curve, 18, radius, 8, false);
  const mesh = new THREE.Mesh(geo, leadMat);
  mesh.castShadow = true;
  group.add(mesh);
}

export default function Breadboard3DViewport({
  components,
  wires,
  vSourceVal,
  simRunning,
  simFreqHz = 2.0,
  selectedWireColor = "#38bdf8",
  simResults,
  selectedComponentId,
  pendingWireStart = null,
  activeProbeToPlace = null,
  onSelectComponent,
  onDoubleClickComponent,
  onHoleClick,
  onDropComponentAtHole,
  onMoveComponentToHole,
  onCancelPendingWire,
  onTogglePushButton,
  onStepPotentiometer,
  isDmmActive,
  probeRedHole,
  probeBlackHole,
  isScopeActive,
  probeScopeCh1Hole,
  probeScopeCh2Hole,
  isSigGenActive = false,
  sigGenHole = null,
  holeToNetKey,
  isBoardLocked = true,
  pinViewEnabled = true,
  onToggleBoardLock,
  frameCircuitTrigger = 0,
  installedPmes = [],
  activePmeProbeLabel = null,
}: Breadboard3DViewportProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const [contextLost, setContextLost] = useState<boolean>(false);
  const [hoverInfo, setHoverInfo] = useState<{
    label: string;
    detail: string;
    x: number;
    y: number;
  } | null>(null);
  const [activePreset, setActivePreset] = useState<CameraPresetKey>("ISOMETRIC");
  const [hudCollapsed, setHudCollapsed] = useState<boolean>(false);
  const [explodeLift, setExplodeLift] = useState<number>(0);
  const [interactionMode, setInteractionMode] = useState<"INSPECT" | "WIRE" | "MOVE">("INSPECT");
  const [dropTargetLabel, setDropTargetLabel] = useState<string | null>(null);

  // Refs bridging React props to Three.js lifecycle without tearing down WebGL context
  const propsRef = useRef({
    components,
    wires,
    vSourceVal,
    simRunning,
    simFreqHz,
    selectedWireColor,
    simResults,
    selectedComponentId,
    pendingWireStart,
    activeProbeToPlace,
    onSelectComponent,
    onDoubleClickComponent,
    onHoleClick,
    onDropComponentAtHole,
    onMoveComponentToHole,
    onCancelPendingWire,
    onTogglePushButton,
    onStepPotentiometer,
    isDmmActive,
    probeRedHole,
    probeBlackHole,
    isScopeActive,
    probeScopeCh1Hole,
    probeScopeCh2Hole,
    isSigGenActive,
    sigGenHole,
    holeToNetKey,
    explodeLift,
    interactionMode,
    reducedMotion,
    isPageVisible,
    isBoardLocked,
    pinViewEnabled,
    installedPmes,
    activePmeProbeLabel,
  });
  propsRef.current = {
    components,
    wires,
    vSourceVal,
    simRunning,
    simFreqHz,
    selectedWireColor,
    simResults,
    selectedComponentId,
    pendingWireStart,
    activeProbeToPlace,
    onSelectComponent,
    onDoubleClickComponent,
    onHoleClick,
    onDropComponentAtHole,
    onMoveComponentToHole,
    onCancelPendingWire,
    onTogglePushButton,
    onStepPotentiometer,
    isDmmActive,
    probeRedHole,
    probeBlackHole,
    isScopeActive,
    probeScopeCh1Hole,
    probeScopeCh2Hole,
    isSigGenActive,
    sigGenHole,
    holeToNetKey,
    explodeLift,
    interactionMode,
    reducedMotion,
    isPageVisible,
    isBoardLocked,
    pinViewEnabled,
    installedPmes,
    activePmeProbeLabel,
  };

  const sceneActionsRef = useRef<{
    syncDynamicScene: () => void;
    applyCameraPreset: (preset: CameraPresetKey) => void;
    frameCircuit: () => void;
    setOrbitLocked: (locked: boolean) => void;
    dollyCamera: (step: number) => void;
    updateExplodeLift: (lift: number) => void;
    previewDropAtClient: (clientX: number, clientY: number) => BreadboardHoleId | null;
    clearDropPreview: () => void;
    wakeLoop: () => void;
  } | null>(null);

  const handlePresetClick = useCallback((preset: CameraPresetKey) => {
    setActivePreset(preset);
    sceneActionsRef.current?.applyCameraPreset(preset);
  }, []);

  const handleFrameCircuitClick = useCallback(() => {
    setActivePreset("ISOMETRIC");
    sceneActionsRef.current?.frameCircuit();
  }, []);

  // Keyboard shortcut 'H' to toggle HUD collapse (Cinema / Zen inspection)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key.toLowerCase() === "h") {
        setHudCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Initialize Three.js WebGL scene once
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL detection (only adjusts rendering cost)
    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement("canvas").getContext("webgl2");
        if (!probe) return true;
        const ext = probe.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param) || "");
        probe.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    scene.fog = new THREE.FogExp2(0x090d16, 0.014);

    // Mandatory studio environment reflection map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 120);
    camera.position.set(...CAMERA_PRESETS.ISOMETRIC.pos);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.minDistance = 3.2;
    controls.maxDistance = 32;
    controls.enableRotate = !propsRef.current.isBoardLocked;
    controls.enablePan = !propsRef.current.isBoardLocked;
    controls.enableZoom = !propsRef.current.isBoardLocked;
    controls.target.set(...CAMERA_PRESETS.ISOMETRIC.target);
    controls.update();

    // 2. 3-Point Studio Lighting Rig (warm key, cool hemisphere fill, crisp rim)
    const hemiLight = new THREE.HemisphereLight(0xcce7ff, 0x101827, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(8.5, 14.5, 9.0);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 2;
    keyLight.shadow.camera.far = 36;
    keyLight.shadow.camera.left = -13;
    keyLight.shadow.camera.right = 13;
    keyLight.shadow.camera.top = 7;
    keyLight.shadow.camera.bottom = -7;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.75);
    rimLight.position.set(-10, 7, -11);
    scene.add(rimLight);

    // 3. Static Lab Workbench + Breadboard Chassis + 882 Instanced Tie-Point Holes
    const staticGroup = new THREE.Group();
    scene.add(staticGroup);

    // Dark matte anti-static ESD mat desk surface
    const deskGeo = new THREE.PlaneGeometry(76, 52);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x0b1322,
      roughness: 0.88,
      metalness: 0.08,
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.rotation.x = -Math.PI / 2;
    deskMesh.position.y = -0.03;
    deskMesh.receiveShadow = true;
    staticGroup.add(deskMesh);

    // Subtle ESD bench grid lines
    const gridHelper = new THREE.GridHelper(48, 48, 0x1e3a5f, 0x111c33);
    gridHelper.position.y = -0.02;
    staticGroup.add(gridHelper);

    // Soft contact shadow grounding directly beneath breadboard
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext("2d")!;
    const radGrad = sctx.createRadialGradient(128, 64, 18, 128, 64, 122);
    radGrad.addColorStop(0, "rgba(0,0,0,0.65)");
    radGrad.addColorStop(0.65, "rgba(0,0,0,0.28)");
    radGrad.addColorStop(1, "rgba(0,0,0,0)");
    sctx.fillStyle = radGrad;
    sctx.fillRect(0, 0, 256, 128);
    const contactShadowTex = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_W + 2.2, BOARD_D + 2.0),
      new THREE.MeshBasicMaterial({
        map: contactShadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.005;
    staticGroup.add(contactShadow);

    // Breadboard base aluminum backing plate (realistic 830-point chassis)
    const metalBacking = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W + 0.14, 0.09, BOARD_D + 0.14),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        metalness: 0.85,
        roughness: 0.3,
      })
    );
    metalBacking.position.y = 0.045;
    metalBacking.receiveShadow = true;
    staticGroup.add(metalBacking);

    // Breadboard ABS body + textured top decal
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const topTexture = createBreadboardTopTexture(maxAnisotropy);
    const sideMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.48,
      metalness: 0.04,
    });
    const topMat = new THREE.MeshStandardMaterial({
      map: topTexture,
      roughness: 0.42,
      metalness: 0.04,
    });
    const boardBody = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W, BOARD_H - 0.08, BOARD_D),
      [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
    );
    boardBody.position.y = 0.08 + (BOARD_H - 0.08) / 2;
    boardBody.castShadow = true;
    boardBody.receiveShadow = true;
    staticGroup.add(boardBody);

    // Center DIP trough physical recessed dark channel
    const troughMesh = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_W - 0.7, 0.04, 0.36),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.6,
        metalness: 0.05,
      })
    );
    troughMesh.position.set(0, BOARD_TOP_Y - 0.015, 0);
    staticGroup.add(troughMesh);

    // 882 Instanced Tie-Point Sockets (dark square chamfer + inner brass spring clip)
    const allHolePositions: { x: number; z: number }[] = [];
    const rowZList = [
      Z_TOP_POS_RAIL,
      Z_TOP_NEG_RAIL,
      ...["A", "B", "C", "D", "E"].map((_, i) => Z_ROW_A + i * ROW_PITCH),
      ...["F", "G", "H", "I", "J"].map((_, i) => Z_ROW_F + i * ROW_PITCH),
      Z_BOT_POS_RAIL,
      Z_BOT_NEG_RAIL,
    ];
    for (let c = 0; c < 63; c++) {
      const hx = START_COL_X + c * COL_PITCH;
      for (const hz of rowZList) {
        allHolePositions.push({ x: hx, z: hz });
      }
    }

    const holeOuterGeo = new THREE.BoxGeometry(0.145, 0.025, 0.145);
    const holeOuterMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.1,
    });
    const holeOuterInst = new THREE.InstancedMesh(
      holeOuterGeo,
      holeOuterMat,
      allHolePositions.length
    );
    holeOuterInst.position.y = BOARD_TOP_Y + 0.002;

    const clipGeo = new THREE.BoxGeometry(0.085, 0.028, 0.085);
    const clipMat = new THREE.MeshStandardMaterial({
      color: 0xb89552,
      metalness: 0.9,
      roughness: 0.25,
    });
    const clipInst = new THREE.InstancedMesh(clipGeo, clipMat, allHolePositions.length);
    clipInst.position.y = BOARD_TOP_Y - 0.004;

    allHolePositions.forEach((hp, idx) => {
      _vec3A.set(hp.x, 0, hp.z);
      _quatA.identity();
      _scaleA.set(1, 1, 1);
      _mat4A.compose(_vec3A, _quatA, _scaleA);
      holeOuterInst.setMatrixAt(idx, _mat4A);
      clipInst.setMatrixAt(idx, _mat4A);
    });
    holeOuterInst.instanceMatrix.needsUpdate = true;
    clipInst.instanceMatrix.needsUpdate = true;
    holeOuterInst.computeBoundingSphere();
    clipInst.computeBoundingSphere();
    staticGroup.add(holeOuterInst, clipInst);

    // Invisible top-surface picking plane + glowing hover socket ring
    const boardPickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_W, BOARD_D),
      new THREE.MeshBasicMaterial({ visible: false, side: THREE.DoubleSide })
    );
    boardPickPlane.rotation.x = -Math.PI / 2;
    boardPickPlane.position.y = BOARD_TOP_Y + 0.01;
    staticGroup.add(boardPickPlane);

    const hoverHoleRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const hoverHoleRing = new THREE.Mesh(
      new THREE.RingGeometry(0.075, 0.125, 20),
      hoverHoleRingMat
    );
    hoverHoleRing.rotation.x = -Math.PI / 2;
    hoverHoleRing.position.y = BOARD_TOP_Y + 0.018;
    hoverHoleRing.visible = false;
    staticGroup.add(hoverHoleRing);

    // 3D Drag-and-Drop / Move target beacon
    const dropPreviewGroup = new THREE.Group();
    const dropRing = new THREE.Mesh(
      new THREE.RingGeometry(0.11, 0.19, 24),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
    );
    dropRing.rotation.x = -Math.PI / 2;
    dropRing.position.y = BOARD_TOP_Y + 0.025;
    const dropStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.52, 10),
      new THREE.MeshBasicMaterial({ color: 0x10b981 })
    );
    dropStem.position.y = BOARD_TOP_Y + 0.28;
    dropPreviewGroup.add(dropRing, dropStem);
    dropPreviewGroup.visible = false;
    staticGroup.add(dropPreviewGroup);

    // Live 3D point-to-point catenary wire preview curve (zero allocation updates)
    const WIRE_PREVIEW_SEGMENTS = 24;
    const wirePreviewPositions = new Float32Array((WIRE_PREVIEW_SEGMENTS + 1) * 3);
    const wirePreviewGeo = new THREE.BufferGeometry();
    wirePreviewGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(wirePreviewPositions, 3)
    );
    const wirePreviewMat = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.95,
    });
    const wirePreviewLine = new THREE.Line(wirePreviewGeo, wirePreviewMat);
    wirePreviewLine.visible = false;
    staticGroup.add(wirePreviewLine);

    const updateLiveWirePreview = (startHole: BreadboardHoleId, endHole: BreadboardHoleId) => {
      const a = holeToWorldXZ(startHole);
      const b = holeToWorldXZ(endHole);
      const dist = Math.hypot(b.x - a.x, b.z - a.z);
      const archH = BOARD_TOP_Y + 0.42 + Math.min(0.85, dist * 0.14);
      const previewCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a.x, BOARD_TOP_Y + 0.1, a.z),
        new THREE.Vector3(a.x, archH * 0.85, a.z),
        new THREE.Vector3((a.x + b.x) / 2, archH, (a.z + b.z) / 2),
        new THREE.Vector3(b.x, archH * 0.85, b.z),
        new THREE.Vector3(b.x, BOARD_TOP_Y + 0.1, b.z),
      ]);
      const posAttr = wirePreviewGeo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i <= WIRE_PREVIEW_SEGMENTS; i++) {
        previewCurve.getPointAt(i / WIRE_PREVIEW_SEGMENTS, _vec3A);
        posAttr.setXYZ(i, _vec3A.x, _vec3A.y, _vec3A.z);
      }
      posAttr.needsUpdate = true;
      wirePreviewMat.color.set(propsRef.current.selectedWireColor || "#22d3ee");
      wirePreviewLine.visible = true;
    };

    // Persistent DC Bench Power Supply behind top-left power rail
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const benchPsu = createBenchPowerSupply3D("BB BENCH PSU", maxAniso);
    benchPsu.group.position.set(-BOARD_W * 0.36, 0, -BOARD_D * 0.92);
    benchPsu.group.rotation.y = 0.18;
    benchPsu.group.scale.setScalar(1.38);
    staticGroup.add(benchPsu.group);

    // 4. Dynamic Assembly Groups (Components, Wires, Flowing Packets, Probes)
    const assemblyGroup = new THREE.Group();
    scene.add(assemblyGroup);

    let wireFlowMeshes: {
      flow: FlowingWire3DHandle;
      speed: number;
      energized: boolean;
    }[] = [];
    let interactiveHitGroups: THREE.Group[] = [];

    // Build / Rebuild 3D Breadboard Components, Wires, and Instrument Probes
    const syncDynamicScene = () => {
      disposeObjectSubtree(assemblyGroup);
      assemblyGroup.clear();
      wireFlowMeshes = [];
      interactiveHitGroups = [];

      const {
        components: curComps,
        wires: curWires,
        simRunning: curRunning,
        simResults: curSim,
        selectedComponentId: curSelId,
        isDmmActive: curDmm,
        probeRedHole: curRed,
        probeBlackHole: curBlk,
        isScopeActive: curScope,
        probeScopeCh1Hole: curCh1,
        probeScopeCh2Hole: curCh2,
        holeToNetKey: curHoleNet,
        explodeLift: curLift,
      } = propsRef.current;

      const tinnedLeadMat = new THREE.MeshStandardMaterial({
        color: 0xdbe3ee,
        metalness: 0.92,
        roughness: 0.2,
      });

      const compLiftY = BOARD_TOP_Y + curLift * 0.65;

      // Render Components
      curComps.forEach((comp) => {
        const compGroup = new THREE.Group();
        compGroup.userData.compId = comp.id;
        compGroup.userData.compLabel = comp.label;
        compGroup.userData.compValue = comp.formattedValue;
        const isSelected = curSelId === comp.id;

        if (comp.type === "RESISTOR" && comp.pins.T1 && comp.pins.T2) {
          const a = holeToWorldXZ(comp.pins.T1);
          const b = holeToWorldXZ(comp.pins.T2);
          const midX = (a.x + b.x) / 2;
          const midZ = (a.z + b.z) / 2;
          const dx = b.x - a.x;
          const dz = b.z - a.z;
          const span = Math.hypot(dx, dz);
          const yaw = -Math.atan2(dz, dx);
          const primScale = 1.55;
          const bodyTopY = compLiftY + 0.18 * primScale;
          const halfSpan = Math.min(span * 0.45, 0.35 * primScale);
          const dirX = span > 0.001 ? dx / span : 1;
          const dirZ = span > 0.001 ? dz / span : 0;

          // Extension leads bridging arbitrary breadboard hole spans cleanly into resistor primitive
          addBentLead(
            compGroup,
            new THREE.Vector3(a.x, BOARD_TOP_Y - 0.02, a.z),
            new THREE.Vector3(a.x, bodyTopY, a.z),
            new THREE.Vector3(midX - dirX * halfSpan, bodyTopY, midZ - dirZ * halfSpan),
            new THREE.Vector3(midX, bodyTopY, midZ),
            tinnedLeadMat,
            0.024
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(b.x, BOARD_TOP_Y - 0.02, b.z),
            new THREE.Vector3(b.x, bodyTopY, b.z),
            new THREE.Vector3(midX + dirX * halfSpan, bodyTopY, midZ + dirZ * halfSpan),
            new THREE.Vector3(midX, bodyTopY, midZ),
            tinnedLeadMat,
            0.024
          );

          // Shared 3D library primitive with EIA 4-band rings & thermal response
          const resHandle = createResistor3D(comp.value, primScale);
          const currentMa = curRunning ? (curSim.currentMap.get(comp.id) ?? 0) : 0;
          const powerMw = (currentMa / 1000) * (currentMa / 1000) * Math.max(1, comp.value) * 1000;
          resHandle.setThermalLevel(THREE.MathUtils.clamp(powerMw / 250, 0, 1));
          resHandle.group.position.set(midX, compLiftY, midZ);
          resHandle.group.rotation.y = yaw;
          compGroup.add(resHandle.group);
        } else if (comp.type.startsWith("LED_") && comp.pins.ANODE && comp.pins.CATHODE) {
          const a = holeToWorldXZ(comp.pins.ANODE);
          const k = holeToWorldXZ(comp.pins.CATHODE);
          const midX = (a.x + k.x) / 2;
          const midZ = (a.z + k.z) / 2;
          const yaw = -Math.atan2(k.z - a.z, k.x - a.x);
          const baseY = compLiftY + 0.14;
          const ledHex = comp.type.includes("RED")
            ? 0xef4444
            : comp.type.includes("GREEN")
            ? 0x22c55e
            : 0x3b82f6;
          const currentMa = curRunning ? (curSim.currentMap.get(comp.id) ?? 0) : 0;
          const isLit = currentMa > 0.8;
          const normIntensity = isLit ? THREE.MathUtils.clamp(currentMa / 14, 0.35, 1) : 0;

          // Anode & Cathode bent leads from exact breadboard tie-points
          addBentLead(
            compGroup,
            new THREE.Vector3(a.x, BOARD_TOP_Y - 0.02, a.z),
            new THREE.Vector3(a.x, baseY + 0.04, a.z),
            new THREE.Vector3(midX + (a.x - midX) * 0.25, baseY + 0.14, midZ + (a.z - midZ) * 0.25),
            new THREE.Vector3(midX + (a.x - midX) * 0.14, baseY + 0.24, midZ + (a.z - midZ) * 0.14),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(k.x, BOARD_TOP_Y - 0.02, k.z),
            new THREE.Vector3(k.x, baseY + 0.04, k.z),
            new THREE.Vector3(midX + (k.x - midX) * 0.25, baseY + 0.14, midZ + (k.z - midZ) * 0.25),
            new THREE.Vector3(midX + (k.x - midX) * 0.14, baseY + 0.24, midZ + (k.z - midZ) * 0.14),
            tinnedLeadMat
          );

          // Shared 3D Diffused LED primitive from electronicsPrimitives3D
          const ledHandle = createDiffusedLed3D(ledHex, 1.55);
          ledHandle.setIntensity(normIntensity, ledHex);
          ledHandle.group.position.set(midX, baseY, midZ);
          ledHandle.group.rotation.y = yaw;
          compGroup.add(ledHandle.group);
        } else if (comp.type === "INDUCTOR" && comp.pins.T1 && comp.pins.T2) {
          const a = holeToWorldXZ(comp.pins.T1);
          const b = holeToWorldXZ(comp.pins.T2);
          const midX = (a.x + b.x) / 2;
          const midZ = (a.z + b.z) / 2;
          const yaw = -Math.atan2(b.z - a.z, b.x - a.x);
          const bodyY = compLiftY + 0.22;

          addBentLead(
            compGroup,
            new THREE.Vector3(a.x, BOARD_TOP_Y - 0.02, a.z),
            new THREE.Vector3(a.x, bodyY, a.z),
            new THREE.Vector3(midX, bodyY, midZ),
            new THREE.Vector3(midX, bodyY, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(b.x, BOARD_TOP_Y - 0.02, b.z),
            new THREE.Vector3(b.x, bodyY, b.z),
            new THREE.Vector3(midX, bodyY, midZ),
            new THREE.Vector3(midX, bodyY, midZ),
            tinnedLeadMat
          );

          const coilGroup = new THREE.Group();
          coilGroup.position.set(midX, bodyY, midZ);
          coilGroup.rotation.y = yaw;
          const ferriteMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.25 });
          const copperMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.85 });
          const core = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.52, 14), ferriteMat);
          core.rotation.z = Math.PI / 2;
          core.castShadow = true;
          coilGroup.add(core);
          for (let i = -2; i <= 2; i++) {
            const turn = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 10, 18), copperMat);
            turn.rotation.y = Math.PI / 2;
            turn.position.x = i * 0.085;
            coilGroup.add(turn);
          }
          compGroup.add(coilGroup);
        } else if (comp.type === "LDR" && comp.pins.T1 && comp.pins.T2) {
          const p1 = holeToWorldXZ(comp.pins.T1);
          const p2 = holeToWorldXZ(comp.pins.T2);
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;
          const yaw = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
          const baseY = compLiftY + 0.22;

          addBentLead(
            compGroup,
            new THREE.Vector3(p1.x, BOARD_TOP_Y - 0.02, p1.z),
            new THREE.Vector3(p1.x, baseY, p1.z),
            new THREE.Vector3(midX, baseY, midZ),
            new THREE.Vector3(midX, baseY + 0.05, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(p2.x, BOARD_TOP_Y - 0.02, p2.z),
            new THREE.Vector3(p2.x, baseY, p2.z),
            new THREE.Vector3(midX, baseY, midZ),
            new THREE.Vector3(midX, baseY + 0.05, midZ),
            tinnedLeadMat
          );

          const ldrHead = new THREE.Group();
          ldrHead.position.set(midX, baseY + 0.18, midZ);
          ldrHead.rotation.y = yaw;
          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.09, 20),
            new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.05 })
          );
          const trace = new THREE.Mesh(
            new THREE.BoxGeometry(0.28, 0.095, 0.06),
            new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.4 })
          );
          ldrHead.add(disc, trace);
          compGroup.add(ldrHead);
        } else if (comp.type === "BUZZER") {
          const p1 = holeToWorldXZ(comp.pins.ANODE || comp.pins.T1);
          const p2 = holeToWorldXZ(comp.pins.CATHODE || comp.pins.T2);
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;
          const baseY = compLiftY + 0.08;
          const currentMa = curRunning ? (curSim.currentMap.get(comp.id) ?? 0) : 0;
          const isBuzzing = currentMa > 0.5;

          addBentLead(
            compGroup,
            new THREE.Vector3(p1.x, BOARD_TOP_Y - 0.02, p1.z),
            new THREE.Vector3(p1.x, baseY + 0.04, p1.z),
            new THREE.Vector3(midX, baseY + 0.06, midZ),
            new THREE.Vector3(midX, baseY + 0.08, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(p2.x, BOARD_TOP_Y - 0.02, p2.z),
            new THREE.Vector3(p2.x, baseY + 0.04, p2.z),
            new THREE.Vector3(midX, baseY + 0.06, midZ),
            new THREE.Vector3(midX, baseY + 0.08, midZ),
            tinnedLeadMat
          );

          const buzzBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.34, 24),
            new THREE.MeshStandardMaterial({
              color: 0x111827,
              roughness: 0.45,
              emissive: isBuzzing ? 0x10b981 : 0x000000,
              emissiveIntensity: isBuzzing ? 0.25 : 0,
            })
          );
          buzzBody.position.set(midX, baseY + 0.2, midZ);
          buzzBody.castShadow = true;
          const holeRing = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 0.35, 14),
            new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.3 })
          );
          holeRing.position.set(midX, baseY + 0.205, midZ);
          compGroup.add(buzzBody, holeRing);
        } else if (
          comp.type === "DIODE_1N4007" ||
          comp.type === "DIODE_ZENER" ||
          comp.type === "DIODE_1N5819"
        ) {
          const p1 = holeToWorldXZ(comp.pins.ANODE || comp.pins.T1);
          const p2 = holeToWorldXZ(comp.pins.CATHODE || comp.pins.T2);
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;
          const dx = p2.x - p1.x;
          const dz = p2.z - p1.z;
          const yaw = -Math.atan2(dz, dx);
          const bodyY = compLiftY + 0.19;

          addBentLead(
            compGroup,
            new THREE.Vector3(p1.x, BOARD_TOP_Y - 0.02, p1.z),
            new THREE.Vector3(p1.x, bodyY, p1.z),
            new THREE.Vector3(midX, bodyY, midZ),
            new THREE.Vector3(midX, bodyY, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(p2.x, BOARD_TOP_Y - 0.02, p2.z),
            new THREE.Vector3(p2.x, bodyY, p2.z),
            new THREE.Vector3(midX, bodyY, midZ),
            new THREE.Vector3(midX, bodyY, midZ),
            tinnedLeadMat
          );

          const body = new THREE.Group();
          body.position.set(midX, bodyY, midZ);
          body.rotation.y = yaw;
          const isZener = comp.type === "DIODE_ZENER";
          const isSchottky = comp.type === "DIODE_1N5819";
          const epoxy = new THREE.Mesh(
            new THREE.CylinderGeometry(isZener ? 0.105 : 0.125, isZener ? 0.105 : 0.125, 0.48, 16),
            new THREE.MeshStandardMaterial({
              color: isZener ? 0xea580c : 0x111827,
              roughness: isZener ? 0.25 : 0.42,
              metalness: 0.12,
            })
          );
          epoxy.rotation.z = Math.PI / 2;
          epoxy.castShadow = true;
          const band = new THREE.Mesh(
            new THREE.CylinderGeometry(isZener ? 0.11 : 0.129, isZener ? 0.11 : 0.129, 0.09, 16),
            new THREE.MeshStandardMaterial({
              color: isZener ? 0x0f172a : isSchottky ? 0xfacc15 : 0xe2e8f0,
              roughness: 0.3,
              metalness: 0.5,
            })
          );
          band.rotation.z = Math.PI / 2;
          band.position.x = 0.16;
          body.add(epoxy, band);
          compGroup.add(body);
        } else if (comp.type === "CAP_ELECTROLYTIC" && comp.pins.ANODE && comp.pins.CATHODE) {
          const a = holeToWorldXZ(comp.pins.ANODE);
          const k = holeToWorldXZ(comp.pins.CATHODE);
          const midX = (a.x + k.x) / 2;
          const midZ = (a.z + k.z) / 2;
          const yaw = -Math.atan2(k.z - a.z, k.x - a.x);
          const baseY = compLiftY + 0.08;

          addBentLead(
            compGroup,
            new THREE.Vector3(a.x, BOARD_TOP_Y - 0.02, a.z),
            new THREE.Vector3(a.x, baseY + 0.06, a.z),
            new THREE.Vector3(midX + (a.x - midX) * 0.35, baseY + 0.09, midZ + (a.z - midZ) * 0.35),
            new THREE.Vector3(midX, baseY + 0.12, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(k.x, BOARD_TOP_Y - 0.02, k.z),
            new THREE.Vector3(k.x, baseY + 0.06, k.z),
            new THREE.Vector3(midX + (k.x - midX) * 0.35, baseY + 0.09, midZ + (k.z - midZ) * 0.35),
            new THREE.Vector3(midX, baseY + 0.12, midZ),
            tinnedLeadMat
          );

          // Shared 3D Electrolytic Capacitor primitive from electronicsPrimitives3D
          const capHandle = createCapacitorElectrolytic3D(1.55);
          const vA = curSim.vMap.get(curSim.find ? curSim.find(curHoleNet(comp.pins.ANODE)) : curHoleNet(comp.pins.ANODE)) ?? 0;
          const vK = curSim.vMap.get(curSim.find ? curSim.find(curHoleNet(comp.pins.CATHODE)) : curHoleNet(comp.pins.CATHODE)) ?? 0;
          const capDiff = Math.abs(vA - vK);
          capHandle.setChargeLevel(curRunning && capDiff > 0.35 ? Math.min(1, capDiff / 9) : 0);
          capHandle.group.position.set(midX, baseY, midZ);
          capHandle.group.rotation.y = yaw;
          compGroup.add(capHandle.group);
        } else if (comp.type === "CAP_CERAMIC" && comp.pins.T1 && comp.pins.T2) {
          const p1 = holeToWorldXZ(comp.pins.T1);
          const p2 = holeToWorldXZ(comp.pins.T2);
          const midX = (p1.x + p2.x) / 2;
          const midZ = (p1.z + p2.z) / 2;
          const yaw = -Math.atan2(p2.z - p1.z, p2.x - p1.x);
          const baseY = compLiftY + 0.22;

          addBentLead(
            compGroup,
            new THREE.Vector3(p1.x, BOARD_TOP_Y - 0.02, p1.z),
            new THREE.Vector3(p1.x, baseY, p1.z),
            new THREE.Vector3(midX, baseY, midZ),
            new THREE.Vector3(midX, baseY + 0.06, midZ),
            tinnedLeadMat
          );
          addBentLead(
            compGroup,
            new THREE.Vector3(p2.x, BOARD_TOP_Y - 0.02, p2.z),
            new THREE.Vector3(p2.x, baseY, p2.z),
            new THREE.Vector3(midX, baseY, midZ),
            new THREE.Vector3(midX, baseY + 0.06, midZ),
            tinnedLeadMat
          );

          const disc = new THREE.Mesh(
            new THREE.CylinderGeometry(0.21, 0.21, 0.12, 20),
            new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.38, metalness: 0.05 })
          );
          disc.rotation.x = Math.PI / 2;
          disc.rotation.z = yaw;
          disc.position.set(midX, baseY + 0.2, midZ);
          disc.castShadow = true;
          compGroup.add(disc);
        } else if (
          (comp.type === "BJT_BC547" ||
            comp.type === "BJT_BC557" ||
            comp.type === "TRANSISTOR_2N2222" ||
            comp.type === "MOSFET_IRF540N" ||
            comp.type === "IC_LM7805") &&
          Object.values(comp.pins).length >= 3
        ) {
          const pinCoords = Object.values(comp.pins).map(holeToWorldXZ);
          const avgX = pinCoords.reduce((acc, p) => acc + p.x, 0) / pinCoords.length;
          const avgZ = pinCoords.reduce((acc, p) => acc + p.z, 0) / pinCoords.length;
          const bodyY = compLiftY + 0.36;

          pinCoords.forEach((pc) => {
            addBentLead(
              compGroup,
              new THREE.Vector3(pc.x, BOARD_TOP_Y - 0.02, pc.z),
              new THREE.Vector3(pc.x, bodyY - 0.12, pc.z),
              new THREE.Vector3(avgX + (pc.x - avgX) * 0.35, bodyY - 0.04, avgZ + (pc.z - avgZ) * 0.35),
              new THREE.Vector3(avgX + (pc.x - avgX) * 0.25, bodyY + 0.04, avgZ + (pc.z - avgZ) * 0.25),
              tinnedLeadMat,
              0.022
            );
          });

          const bjtConduction = curRunning && (curSim.currentMap.get(comp.id) ?? 0) > 0.2;
          const accentHex =
            comp.type === "IC_LM7805"
              ? 0xf59e0b
              : comp.type === "MOSFET_IRF540N"
              ? 0xa855f7
              : comp.type === "BJT_BC557"
              ? 0xf43f5e
              : bjtConduction
              ? 0x10b981
              : 0x22d3ee;
          // Shared 3D Transistor / TO-220 package primitive from electronicsPrimitives3D
          const transistorGroup = createTransistorTo2203D(1.32, accentHex);
          transistorGroup.position.set(avgX, compLiftY + 0.14, avgZ);
          compGroup.add(transistorGroup);
        } else if (comp.type === "SEVEN_SEG") {
          const pinList = Object.values(comp.pins).map(holeToWorldXZ);
          if (pinList.length > 0) {
            const minX = Math.min(...pinList.map((p) => p.x));
            const maxX = Math.max(...pinList.map((p) => p.x));
            const minZ = Math.min(...pinList.map((p) => p.z));
            const maxZ = Math.max(...pinList.map((p) => p.z));
            const cx = (minX + maxX) / 2;
            const cz = (minZ + maxZ) / 2;
            const segY = compLiftY + 0.08;
            const bodyW = Math.max(1.3, maxX - minX + 0.32);

            const housing = new THREE.Mesh(
              new THREE.BoxGeometry(bodyW, 0.42, 0.96),
              new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.45, metalness: 0.1 })
            );
            housing.position.set(cx, segY + 0.21, cz);
            housing.castShadow = true;
            compGroup.add(housing);

            const face = new THREE.Mesh(
              new THREE.PlaneGeometry(bodyW - 0.16, 0.78),
              new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.2 })
            );
            face.rotation.x = -Math.PI / 2;
            face.position.set(cx, segY + 0.425, cz);
            compGroup.add(face);

            // 7-segment display bars (a..g)
            const comHole = comp.pins.COM_GND || comp.pins.COM;
            const vCom = comHole
              ? (curSim.vMap.get(curSim.find ? curSim.find(curHoleNet(comHole)) : curHoleNet(comHole)) ?? 0)
              : 0;
            const segDefs: { key: string; px: number; pz: number; horiz: boolean }[] = [
              { key: "SEG_A", px: 0, pz: -0.26, horiz: true },
              { key: "SEG_B", px: 0.18, pz: -0.13, horiz: false },
              { key: "SEG_C", px: 0.18, pz: 0.13, horiz: false },
              { key: "SEG_D", px: 0, pz: 0.26, horiz: true },
              { key: "SEG_E", px: -0.18, pz: 0.13, horiz: false },
              { key: "SEG_F", px: -0.18, pz: -0.13, horiz: false },
              { key: "SEG_G", px: 0, pz: 0, horiz: true },
            ];
            segDefs.forEach((sd) => {
              const sHole = comp.pins[sd.key];
              const vPin = sHole
                ? (curSim.vMap.get(curSim.find ? curSim.find(curHoleNet(sHole)) : curHoleNet(sHole)) ?? 0)
                : 0;
              const lit = curRunning && vPin - vCom > 1.6;
              const bar = new THREE.Mesh(
                new THREE.BoxGeometry(sd.horiz ? 0.28 : 0.06, 0.02, sd.horiz ? 0.06 : 0.22),
                new THREE.MeshBasicMaterial({ color: lit ? 0xef4444 : 0x331115 })
              );
              bar.position.set(cx + sd.px, segY + 0.435, cz + sd.pz);
              compGroup.add(bar);
            });

            pinList.forEach((pc) => {
              const sideSign = pc.z >= cz ? 1 : -1;
              addBentLead(
                compGroup,
                new THREE.Vector3(pc.x, BOARD_TOP_Y - 0.02, pc.z),
                new THREE.Vector3(pc.x, segY + 0.1, pc.z),
                new THREE.Vector3(pc.x, segY + 0.14, pc.z - sideSign * 0.05),
                new THREE.Vector3(pc.x, segY + 0.14, cz + sideSign * 0.35),
                tinnedLeadMat,
                0.022
              );
            });
          }
        } else if (comp.type.startsWith("IC_")) {
          const pinList = Object.values(comp.pins).map(holeToWorldXZ);
          if (pinList.length > 0) {
            const minX = Math.min(...pinList.map((p) => p.x));
            const maxX = Math.max(...pinList.map((p) => p.x));
            const minZ = Math.min(...pinList.map((p) => p.z));
            const maxZ = Math.max(...pinList.map((p) => p.z));
            const cx = (minX + maxX) / 2;
            const cz = (minZ + maxZ) / 2;
            const icY = compLiftY + 0.04;
            const pinsCount =
              comp.type === "IC_74LS76"
                ? 16
                : comp.type.startsWith("IC_74LS")
                ? 14
                : 8;
            const icTitle =
              comp.type === "IC_NE555"
                ? "NE555P"
                : comp.type === "IC_LM741"
                ? "LM741CN"
                : comp.type.replace("IC_", "SN");

            // Shared 3D DIP IC primitive straddling the center trough (E/F row spacing)
            const dipIcGroup = createDipIc3D(pinsCount, icTitle, 1.9, maxAnisotropy);
            const halfPins = Math.max(4, Math.floor(pinsCount / 2));
            const defaultWidth = Math.max(0.45, halfPins * 0.125) * 1.9;
            const desiredWidth = Math.max(1.0, maxX - minX + 0.24);
            dipIcGroup.scale.set(desiredWidth / defaultWidth, 1.15, 1.0);
            dipIcGroup.position.set(cx, icY, cz);
            compGroup.add(dipIcGroup);

            // Power indicator micro-LED when Vcc is present
            const vccPin = comp.pins.PIN8_VCC || comp.pins.PIN14_VCC || comp.pins.PIN16_VCC || comp.pins.PIN5_VCC;
            const vccVal = vccPin
              ? (curSim.vMap.get(curSim.find ? curSim.find(curHoleNet(vccPin)) : curHoleNet(vccPin)) ?? 0)
              : 0;
            const icPowered = curRunning && vccVal > 1.8;
            const icLed = new THREE.Mesh(
              new THREE.SphereGeometry(0.045, 10, 8),
              new THREE.MeshBasicMaterial({ color: icPowered ? 0x10b981 : 0x334155 })
            );
            icLed.position.set(cx - desiredWidth * 0.34, icY + 0.33, cz + 0.2);
            compGroup.add(icLed);

            // DIP gull-wing leads into exact breadboard sockets
            pinList.forEach((pc) => {
              const sideSign = pc.z >= cz ? 1 : -1;
              addBentLead(
                compGroup,
                new THREE.Vector3(pc.x, BOARD_TOP_Y - 0.02, pc.z),
                new THREE.Vector3(pc.x, icY + 0.14, pc.z),
                new THREE.Vector3(pc.x, icY + 0.18, pc.z - sideSign * 0.06),
                new THREE.Vector3(pc.x, icY + 0.18, cz + sideSign * 0.28),
                tinnedLeadMat,
                0.022
              );
            });
          }
        } else if (comp.type === "PUSH_BUTTON" || comp.type === "SWITCH_SPST") {
          const pinList = Object.values(comp.pins).map(holeToWorldXZ);
          if (pinList.length >= 2) {
            const cx = pinList.reduce((acc, p) => acc + p.x, 0) / pinList.length;
            const cz = pinList.reduce((acc, p) => acc + p.z, 0) / pinList.length;
            const baseY = compLiftY + 0.05;
            const pressed = comp.value === 1;
            pinList.forEach((pc) => {
              addBentLead(
                compGroup,
                new THREE.Vector3(pc.x, BOARD_TOP_Y - 0.02, pc.z),
                new THREE.Vector3(pc.x, baseY + 0.06, pc.z),
                new THREE.Vector3(cx, baseY + 0.08, cz),
                new THREE.Vector3(cx, baseY + 0.08, cz),
                tinnedLeadMat,
                0.024
              );
            });
            // Shared 3D Tactile Push Button / Slide Switch primitive
            const btnHandle = createTactileButton3D(
              comp.type === "SWITCH_SPST"
                ? pressed
                  ? 0x22c55e
                  : 0xf59e0b
                : pressed
                ? 0x10b981
                : 0x06b6d4,
              1.35
            );
            btnHandle.setPressed(pressed);
            btnHandle.group.position.set(cx, baseY, cz);
            compGroup.userData.interactiveType = comp.type;
            compGroup.add(btnHandle.group);
          }
        } else if (comp.type === "POTENTIOMETER") {
          const pinList = Object.values(comp.pins).map(holeToWorldXZ);
          if (pinList.length >= 2) {
            const cx = pinList.reduce((acc, p) => acc + p.x, 0) / pinList.length;
            const cz = pinList.reduce((acc, p) => acc + p.z, 0) / pinList.length;
            const baseY = compLiftY + 0.06;
            const pct = THREE.MathUtils.clamp(comp.wiperPct ?? 0.5, 0.02, 0.98);
            pinList.forEach((pc) => {
              addBentLead(
                compGroup,
                new THREE.Vector3(pc.x, BOARD_TOP_Y - 0.02, pc.z),
                new THREE.Vector3(pc.x, baseY + 0.04, pc.z),
                new THREE.Vector3(cx, baseY + 0.08, cz),
                new THREE.Vector3(cx, baseY + 0.08, cz),
                tinnedLeadMat,
                0.024
              );
            });
            // Shared 3D Rotary Potentiometer primitive
            const potHandle = createPotentiometer3D(1.24);
            potHandle.setRatio(pct);
            potHandle.group.position.set(cx, baseY, cz);
            compGroup.userData.interactiveType = "POTENTIOMETER";
            compGroup.add(potHandle.group);
          }
        }

        // Selection bracket box & Raycast layer assignment
        if (isSelected) {
          const box = new THREE.Box3().setFromObject(compGroup);
          if (!box.isEmpty()) {
            const size = new THREE.Vector3();
            const center = new THREE.Vector3();
            box.getSize(size);
            box.getCenter(center);
            const hlMesh = new THREE.Mesh(
              new THREE.BoxGeometry(size.x + 0.18, size.y + 0.12, size.z + 0.18),
              new THREE.MeshBasicMaterial({
                color: 0x22d3ee,
                wireframe: true,
                transparent: true,
                opacity: 0.78,
              })
            );
            hlMesh.position.copy(center);
            compGroup.add(hlMesh);
          }
        }

        compGroup.traverse((child) => {
          child.layers.set(1);
          child.layers.enable(0);
        });
        interactiveHitGroups.push(compGroup);
        assemblyGroup.add(compGroup);
      });

      // Physical DC Bench PSU Power & Ground Rail Feeders connected into Top +VCC / -GND Breadboard Rails
      const psu5vWorld = benchPsu.pos5VLocal
        .clone()
        .multiplyScalar(1.38)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.18)
        .add(benchPsu.group.position);
      const psuGndWorld = benchPsu.posGndLocal
        .clone()
        .multiplyScalar(1.38)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.18)
        .add(benchPsu.group.position);

      const railPosTarget = new THREE.Vector3(START_COL_X + 2 * COL_PITCH, BOARD_TOP_Y + 0.08, Z_TOP_POS_RAIL);
      const railNegTarget = new THREE.Vector3(START_COL_X + 4 * COL_PITCH, BOARD_TOP_Y + 0.08, Z_TOP_NEG_RAIL);

      const psuRedFlow = createFlowingWire3D(
        [
          psu5vWorld,
          new THREE.Vector3(
            THREE.MathUtils.lerp(psu5vWorld.x, railPosTarget.x, 0.5),
            BOARD_TOP_Y + 0.85,
            THREE.MathUtils.lerp(psu5vWorld.z, railPosTarget.z, 0.5)
          ),
          railPosTarget,
        ],
        0xef4444,
        {
          radius: 0.044,
          packetCount: 5,
          packetLength: 0.24,
          packetRadius: 0.068,
          speedMult: 0.55,
          phaseOffset: 0.1,
        }
      );
      const psuBlkFlow = createFlowingWire3D(
        [
          railNegTarget,
          new THREE.Vector3(
            THREE.MathUtils.lerp(psuGndWorld.x, railNegTarget.x, 0.5),
            BOARD_TOP_Y + 0.72,
            THREE.MathUtils.lerp(psuGndWorld.z, railNegTarget.z, 0.5)
          ),
          psuGndWorld,
        ],
        0x334155,
        {
          radius: 0.044,
          packetCount: 5,
          packetLength: 0.24,
          packetRadius: 0.068,
          packetColorHex: 0x38bdf8,
          speedMult: 0.45,
          phaseOffset: 0.35,
        }
      );
      assemblyGroup.add(psuRedFlow.group, psuBlkFlow.group);
      wireFlowMeshes.push(
        { flow: psuRedFlow, speed: 0.55, energized: Boolean(curRunning) },
        { flow: psuBlkFlow, speed: 0.45, energized: Boolean(curRunning) }
      );

      // Render Jumper Wires (Catenary 3D insulated cables + ferrule boots + tangent-aligned flowing energy capsules)
      curWires.forEach((w, wIdx) => {
        const a = holeToWorldXZ(w.from);
        const b = holeToWorldXZ(w.to);
        const dist = Math.hypot(b.x - a.x, b.z - a.z);
        const archH = BOARD_TOP_Y + 0.36 + Math.min(0.85, dist * 0.14) + (wIdx % 3) * 0.08;

        const netKeyFrom = curSim.find ? curSim.find(curHoleNet(w.from)) : curHoleNet(w.from);
        const netKeyTo = curSim.find ? curSim.find(curHoleNet(w.to)) : curHoleNet(w.to);
        const netV = curSim.vMap.get(netKeyFrom) ?? curSim.vMap.get(netKeyTo) ?? 0;
        const hasNetCurrent = curComps.some((comp) => {
          const cur = curSim.currentMap.get(comp.id) ?? 0;
          if (cur <= 0.05) return false;
          return Object.values(comp.pins).some((pinHole) => {
            const pk = curSim.find ? curSim.find(curHoleNet(pinHole)) : curHoleNet(pinHole);
            return pk === netKeyFrom || pk === netKeyTo;
          });
        });

        const wireColorHex = new THREE.Color(w.color || "#38bdf8").getHex();
        const energized = Boolean(
          curRunning &&
            (Math.abs(netV) > 0.08 || hasNetCurrent || w.color === "#ef4444" || w.color === "#eab308")
        );
        const pulseColor =
          w.color === "#ef4444" || netV >= 3.2
            ? 0xfacc15
            : w.color === "#0f172a" || Math.abs(netV) < 0.2
            ? 0x38bdf8
            : 0x22d3ee;

        const fw = createFlowingWire3D(
          [
            new THREE.Vector3(a.x, BOARD_TOP_Y + 0.08, a.z),
            new THREE.Vector3(a.x, archH * 0.85, a.z),
            new THREE.Vector3((a.x + b.x) / 2, archH, (a.z + b.z) / 2),
            new THREE.Vector3(b.x, archH * 0.85, b.z),
            new THREE.Vector3(b.x, BOARD_TOP_Y + 0.08, b.z),
          ],
          wireColorHex,
          {
            radius: 0.044,
            tubularSegments: 26,
            radialSegments: 9,
            packetCount: 4,
            packetLength: 0.2,
            packetRadius: 0.068,
            packetColorHex: pulseColor,
            speedMult: hasNetCurrent ? 0.52 : 0.36,
            phaseOffset: (wIdx * 0.27) % 1,
          }
        );
        assemblyGroup.add(fw.group);
        wireFlowMeshes.push({
          flow: fw,
          speed: hasNetCurrent ? 0.52 : 0.36,
          energized,
        });
      });

      // Render Physical 10x BNC / DMM Instrument Probes with angled styluses & Coax Leads when active
      const addProbeTip = (hole: BreadboardHoleId | null, colorHex: number) => {
        if (!hole) return;
        const { x, z } = holeToWorldXZ(hole);
        const probe = createScopeProbe3D(colorHex, 1.35);
        probe.group.position.set(x, BOARD_TOP_Y + 0.02, z);
        assemblyGroup.add(probe.group);

        const tailWorld = probe.cableAttachLocal.clone().add(probe.group.position);
        const coax = createFlowingWire3D(
          [
            tailWorld,
            new THREE.Vector3(tailWorld.x + 0.85, tailWorld.y + 0.9, tailWorld.z + 1.25),
            new THREE.Vector3(tailWorld.x + 1.4, BOARD_TOP_Y + 0.15, BOARD_D * 0.82),
          ],
          colorHex,
          {
            radius: 0.028,
            packetCount: 3,
            packetLength: 0.16,
            packetRadius: 0.045,
            speedMult: 0.45,
          }
        );
        assemblyGroup.add(coax.group);
        wireFlowMeshes.push({
          flow: coax,
          speed: 0.45,
          energized: Boolean(curRunning),
        });
      };

      if (curDmm) {
        addProbeTip(curRed, 0xef4444);
        addProbeTip(curBlk, 0x1e293b);
      }
      if (curScope) {
        addProbeTip(curCh1, 0xfacc15);
        addProbeTip(curCh2, 0x22d3ee);
      }
      if (propsRef.current.isSigGenActive && propsRef.current.sigGenHole) {
        addProbeTip(propsRef.current.sigGenHole, 0xf97316);
      }

      // Render Installed Breadboard PME Probes (Voltmeter, Ammeter, Ohmmeter, Wattmeter, Logic Probe)
      const pmes = propsRef.current.installedPmes || [];
      pmes.forEach((pme) => {
        const pmeColor =
          pme.type === "VOLTMETER"
            ? 0x38bdf8
            : pme.type === "AMMETER"
            ? 0xf59e0b
            : pme.type === "OHMMETER"
            ? 0xa855f7
            : pme.type === "POWER_METER"
            ? 0x10b981
            : 0xec4899;
        addProbeTip(pme.probePosHole, pmeColor);
        if (pme.probeNegHole) {
          addProbeTip(pme.probeNegHole, 0x475569);
        }
      });

      // Active Circuit Footprint Tray Outline so laid circuit location is always immediately visible
      const allHoles: BreadboardHoleId[] = [];
      curComps.forEach((c) => {
        Object.values(c.pins).forEach((p) => allHoles.push(p));
      });
      curWires.forEach((w) => {
        allHoles.push(w.from, w.to);
      });
      if (allHoles.length > 0) {
        const worldPts = allHoles.map(holeToWorldXZ);
        const minX = Math.min(...worldPts.map((p) => p.x)) - 0.38;
        const maxX = Math.max(...worldPts.map((p) => p.x)) + 0.38;
        const minZ = Math.min(...worldPts.map((p) => p.z)) - 0.38;
        const maxZ = Math.max(...worldPts.map((p) => p.z)) + 0.38;
        const yTray = BOARD_TOP_Y + 0.015;
        const zonePts = [
          new THREE.Vector3(minX, yTray, minZ),
          new THREE.Vector3(maxX, yTray, minZ),
          new THREE.Vector3(maxX, yTray, maxZ),
          new THREE.Vector3(minX, yTray, maxZ),
        ];
        const zoneGeo = new THREE.BufferGeometry().setFromPoints(zonePts);
        const zoneMat = new THREE.LineBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.72,
        });
        assemblyGroup.add(new THREE.LineLoop(zoneGeo, zoneMat));
      }

      // Highlight pending wire start socket beacon in 3D
      if (propsRef.current.pendingWireStart) {
        const { x, z } = holeToWorldXZ(propsRef.current.pendingWireStart);
        const startRing = new THREE.Mesh(
          new THREE.RingGeometry(0.09, 0.16, 20),
          new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
        );
        startRing.rotation.x = -Math.PI / 2;
        startRing.position.set(x, BOARD_TOP_Y + 0.024, z);
        const startPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.025, 0.35, 10),
          new THREE.MeshBasicMaterial({ color: 0xfacc15 })
        );
        startPost.position.set(x, BOARD_TOP_Y + 0.18, z);
        assemblyGroup.add(startRing, startPost);
      }
    };

    // Initial build
    syncDynamicScene();
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 5. Smooth Camera Preset Interpolation + On-Demand / Paced Render Loop
    let activePresetAnim: {
      targetPos: THREE.Vector3;
      targetLook: THREE.Vector3;
    } | null = null;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === "function") {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const clock = new THREE.Clock();
    let pulsePhase = 0;

    const requestRender = () => {
      if (disposed || !propsRef.current.isPageVisible) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const delta = Math.min(clock.getDelta(), 0.1);
        const st = propsRef.current;

        if (activePresetAnim) {
          camera.position.x = THREE.MathUtils.damp(
            camera.position.x,
            activePresetAnim.targetPos.x,
            6.5,
            delta
          );
          camera.position.y = THREE.MathUtils.damp(
            camera.position.y,
            activePresetAnim.targetPos.y,
            6.5,
            delta
          );
          camera.position.z = THREE.MathUtils.damp(
            camera.position.z,
            activePresetAnim.targetPos.z,
            6.5,
            delta
          );
          controls.target.x = THREE.MathUtils.damp(
            controls.target.x,
            activePresetAnim.targetLook.x,
            6.5,
            delta
          );
          controls.target.y = THREE.MathUtils.damp(
            controls.target.y,
            activePresetAnim.targetLook.y,
            6.5,
            delta
          );
          controls.target.z = THREE.MathUtils.damp(
            controls.target.z,
            activePresetAnim.targetLook.z,
            6.5,
            delta
          );
          if (
            camera.position.distanceTo(activePresetAnim.targetPos) < 0.04 &&
            controls.target.distanceTo(activePresetAnim.targetLook) < 0.04
          ) {
            activePresetAnim = null;
          } else {
            renderDirty = true;
          }
        }

        // Advance multi-packet tangent-aligned electricity capsules & Bench PSU telemetry
        const benchI = st.components.reduce(
          (acc, c) => acc + Math.abs(st.simResults.currentMap.get(c.id) ?? 0),
          0
        );
        benchPsu.updateReadout(
          `+${(st.vSourceVal ?? 5).toFixed(2)}V ${(benchI / 1000).toFixed(3)}A`,
          `F:${(st.simFreqHz ?? 2).toFixed(1)}Hz · ${st.components.length} PARTS`,
          Boolean(st.simRunning)
        );

        if (st.simRunning && wireFlowMeshes.length > 0) {
          const baseHz = Math.max(0.25, Math.min(20, st.simFreqHz ?? 2.0));
          const freqFactor = 0.35 + baseHz * 0.38;
          if (!st.reducedMotion) {
            pulsePhase = (pulsePhase + delta * freqFactor) % 1000;
          }
          const activeFlow = Boolean(!st.reducedMotion);
          for (let i = 0; i < wireFlowMeshes.length; i++) {
            const wf = wireFlowMeshes[i];
            wf.flow.update(pulsePhase, wf.energized && activeFlow);
          }
        } else if (wireFlowMeshes.length > 0) {
          for (let i = 0; i < wireFlowMeshes.length; i++) {
            wireFlowMeshes[i].flow.update(0, false);
          }
        }

        // Clamp OrbitControls target within board footprint so breadboard never drifts away
        controls.target.x = THREE.MathUtils.clamp(controls.target.x, -10.5, 10.5);
        controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0.1, 2.8);
        controls.target.z = THREE.MathUtils.clamp(controls.target.z, -4.2, 4.2);

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (
            renderDirty ||
            activePresetAnim !== null ||
            (st.simRunning && wireFlowMeshes.length > 0 && !st.reducedMotion && st.isPageVisible)
          ) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    };

    const onControlStart = () => {
      activePresetAnim = null;
    };
    const onControlChange = () => {
      requestRender();
    };
    controls.addEventListener("start", onControlStart);
    controls.addEventListener("change", onControlChange);

    // 6. Layer-1 Raycasting for Components + Layer-0 Raycasting for 882 Breadboard Sockets
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const boardRaycaster = new THREE.Raycaster();
    boardRaycaster.layers.set(0);
    const pointerNdc = new THREE.Vector2();
    let lastMoveTs = 0;

    const findHitComp = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(interactiveHitGroups, true);
      if (hits.length === 0) return null;
      let cur: THREE.Object3D | null = hits[0].object;
      while (cur && !cur.userData.compId) {
        cur = cur.parent;
      }
      if (!cur || !cur.userData.compId) return null;
      return {
        compId: String(cur.userData.compId),
        label: String(cur.userData.compLabel || cur.userData.compId),
        detail: String(cur.userData.compValue || ""),
        interactiveType: cur.userData.interactiveType as string | undefined,
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const findHitHole = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      boardRaycaster.setFromCamera(pointerNdc, camera);
      const hits = boardRaycaster.intersectObject(boardPickPlane, false);
      if (hits.length === 0) return null;
      const pt = hits[0].point;
      const hole = worldXZToNearestHole(pt.x, pt.z);
      if (!hole) return null;
      const snapped = holeToWorldXZ(hole);
      const netKey = propsRef.current.simResults.find
        ? propsRef.current.simResults.find(propsRef.current.holeToNetKey(hole))
        : propsRef.current.holeToNetKey(hole);
      const nodeV = propsRef.current.simResults.vMap.get(netKey) ?? 0;
      return {
        hole,
        worldX: snapped.x,
        worldZ: snapped.z,
        label: formatHoleLabel(hole),
        voltage: nodeV,
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    let draggedCompId: string | null = null;
    let draggedInteractiveType: string | undefined;
    let didDragComp = false;
    let lastDragEndTs = 0;

    const onPointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveTs < 32) return;
      lastMoveTs = now;

      // Active 3D component drag-to-reposition onto breadboard holes
      if (draggedCompId) {
        if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5) {
          didDragComp = true;
        }
        const holeHit = findHitHole(e.clientX, e.clientY);
        if (holeHit && didDragComp) {
          dropPreviewGroup.visible = true;
          dropPreviewGroup.position.set(holeHit.worldX, 0, holeHit.worldZ);
          hoverHoleRing.visible = true;
          hoverHoleRing.position.set(holeHit.worldX, BOARD_TOP_Y + 0.018, holeHit.worldZ);
          setHoverInfo({
            label: `Move to ${holeHit.label}`,
            detail: "Release to snap component leads & re-solve SPICE",
            x: holeHit.x,
            y: holeHit.y,
          });
          renderer.domElement.style.cursor = "grabbing";
          requestRender();
        }
        return;
      }

      // If placing a probe, pending wire, or explicit 3D Wire Mode, prioritize hole picking
      const holeFirst = Boolean(
        propsRef.current.pendingWireStart ||
          propsRef.current.activeProbeToPlace ||
          propsRef.current.interactionMode === "WIRE"
      );
      const compHit = holeFirst ? null : findHitComp(e.clientX, e.clientY);
      if (compHit) {
        hoverHoleRing.visible = false;
        wirePreviewLine.visible = false;
        const isMove =
          propsRef.current.interactionMode === "MOVE" ||
          propsRef.current.isBoardLocked ||
          e.shiftKey;
        const actionHint = isMove
          ? "Drag: Move · Dbl-Click: Props"
          : compHit.interactiveType === "PUSH_BUTTON" || compHit.interactiveType === "SWITCH_SPST"
          ? "Click to Toggle Switch"
          : compHit.interactiveType === "POTENTIOMETER"
          ? "Click to Step Wiper"
          : "Click: Select · Shift+Drag: Move · Dbl-Click: Props";
        setHoverInfo({
          label: compHit.label,
          detail: `${compHit.detail} · ${actionHint}`,
          x: compHit.x,
          y: compHit.y,
        });
        renderer.domElement.style.cursor = isMove ? "grab" : "pointer";
        requestRender();
        return;
      }

      const holeHit = findHitHole(e.clientX, e.clientY);
      if (holeHit) {
        hoverHoleRing.visible = true;
        hoverHoleRing.position.set(holeHit.worldX, BOARD_TOP_Y + 0.018, holeHit.worldZ);
        if (propsRef.current.pendingWireStart) {
          updateLiveWirePreview(propsRef.current.pendingWireStart, holeHit.hole);
        } else {
          wirePreviewLine.visible = false;
        }
        const modeHint = propsRef.current.activeProbeToPlace
          ? `Snap ${propsRef.current.activeProbeToPlace}`
          : propsRef.current.pendingWireStart
          ? "Click to Complete 3D Jumper Wire"
          : "Click Socket to Start Wire";
        setHoverInfo({
          label: holeHit.label,
          detail: `${holeHit.voltage.toFixed(2)} V · ${modeHint}`,
          x: holeHit.x,
          y: holeHit.y,
        });
        renderer.domElement.style.cursor = "crosshair";
        requestRender();
        return;
      }

      if (hoverHoleRing.visible || wirePreviewLine.visible) {
        hoverHoleRing.visible = false;
        wirePreviewLine.visible = false;
        requestRender();
      }
      setHoverInfo(null);
      renderer.domElement.style.cursor = "grab";
    };

    let downPos = { x: 0, y: 0 };
    const onPointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
      didDragComp = false;
      const wantsMove =
        propsRef.current.interactionMode === "MOVE" ||
        propsRef.current.isBoardLocked ||
        (e.shiftKey && e.button === 0);
      if (wantsMove && !propsRef.current.pendingWireStart && !propsRef.current.activeProbeToPlace) {
        const compHit = findHitComp(e.clientX, e.clientY);
        if (compHit) {
          draggedCompId = compHit.compId;
          draggedInteractiveType = compHit.interactiveType;
          propsRef.current.onSelectComponent(compHit.compId);
          controls.enabled = false;
          renderer.domElement.style.cursor = "grabbing";
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (draggedCompId) {
        const movingId = draggedCompId;
        const movingInteractiveType = draggedInteractiveType;
        const moved = didDragComp || Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 5;
        draggedCompId = null;
        draggedInteractiveType = undefined;
        didDragComp = false;
        controls.enabled = true;
        sceneActionsRef.current?.setOrbitLocked(propsRef.current.isBoardLocked);
        dropPreviewGroup.visible = false;
        hoverHoleRing.visible = false;
        if (moved) {
          lastDragEndTs = performance.now();
          const holeHit = findHitHole(e.clientX, e.clientY);
          if (holeHit && propsRef.current.onMoveComponentToHole) {
            propsRef.current.onMoveComponentToHole(movingId, holeHit.hole);
          }
        } else {
          if (movingInteractiveType === "PUSH_BUTTON" || movingInteractiveType === "SWITCH_SPST") {
            propsRef.current.onTogglePushButton?.(movingId);
          } else if (movingInteractiveType === "POTENTIOMETER") {
            propsRef.current.onStepPotentiometer?.(movingId);
          }
        }
        renderer.domElement.style.cursor = "grab";
        requestRender();
        return;
      }

      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      const holeFirst = Boolean(
        propsRef.current.pendingWireStart ||
          propsRef.current.activeProbeToPlace ||
          propsRef.current.interactionMode === "WIRE"
      );
      if (!holeFirst) {
        const compHit = findHitComp(e.clientX, e.clientY);
        if (compHit) {
          propsRef.current.onSelectComponent(compHit.compId);
          if (compHit.interactiveType === "PUSH_BUTTON" || compHit.interactiveType === "SWITCH_SPST") {
            propsRef.current.onTogglePushButton?.(compHit.compId);
          } else if (compHit.interactiveType === "POTENTIOMETER") {
            propsRef.current.onStepPotentiometer?.(compHit.compId);
          }
          return;
        }
      }

      const holeHit = findHitHole(e.clientX, e.clientY);
      if (holeHit && propsRef.current.onHoleClick) {
        wirePreviewLine.visible = false;
        propsRef.current.onHoleClick(holeHit.hole);
        return;
      }

      propsRef.current.onSelectComponent(null);
    };
    const onDoubleClick = (e: MouseEvent) => {
      if (performance.now() - lastDragEndTs < 250) return;
      const hit = findHitComp(e.clientX, e.clientY);
      if (hit) {
        propsRef.current.onDoubleClickComponent(hit.compId);
      }
    };

    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("dblclick", onDoubleClick);

    const onContextLost = (ev: Event) => {
      ev.preventDefault();
      setContextLost(true);
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
    };
    const onContextRestored = () => {
      setContextLost(false);
      clock.getDelta();
      requestRender();
    };
    renderer.domElement.addEventListener("webglcontextlost", onContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(100, entry.contentRect.width);
        const h = Math.max(100, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    sceneActionsRef.current = {
      syncDynamicScene: () => {
        if (!propsRef.current.pendingWireStart) {
          wirePreviewLine.visible = false;
        }
        syncDynamicScene();
        requestRender();
      },
      applyCameraPreset: (preset: CameraPresetKey) => {
        const cfg = CAMERA_PRESETS[preset];
        activePresetAnim = {
          targetPos: new THREE.Vector3(...cfg.pos),
          targetLook: new THREE.Vector3(...cfg.target),
        };
        requestRender();
      },
      frameCircuit: () => {
        const { components: curComps, wires: curWires } = propsRef.current;
        const holes: BreadboardHoleId[] = [];
        curComps.forEach((c) => Object.values(c.pins).forEach((p) => holes.push(p)));
        curWires.forEach((w) => holes.push(w.from, w.to));
        if (holes.length === 0) {
          activePresetAnim = {
            targetPos: new THREE.Vector3(...CAMERA_PRESETS.ISOMETRIC.pos),
            targetLook: new THREE.Vector3(...CAMERA_PRESETS.ISOMETRIC.target),
          };
          requestRender();
          return;
        }
        const pts = holes.map(holeToWorldXZ);
        const minX = Math.min(...pts.map((p) => p.x));
        const maxX = Math.max(...pts.map((p) => p.x));
        const minZ = Math.min(...pts.map((p) => p.z));
        const maxZ = Math.max(...pts.map((p) => p.z));
        const cx = THREE.MathUtils.clamp((minX + maxX) / 2, -9.5, 9.5);
        const cz = THREE.MathUtils.clamp((minZ + maxZ) / 2, -2.5, 2.5);
        const span = Math.max(3.6, maxX - minX, (maxZ - minZ) * 1.4);
        const dist = THREE.MathUtils.clamp(span * 1.35 + 3.8, 6.2, 16.5);
        activePresetAnim = {
          targetPos: new THREE.Vector3(cx, dist * 0.72, cz + dist * 0.78),
          targetLook: new THREE.Vector3(cx, 0.72, cz),
        };
        requestRender();
      },
      setOrbitLocked: (locked: boolean) => {
        controls.enableRotate = !locked;
        controls.enablePan = !locked;
        controls.enableZoom = !locked;
        renderer.domElement.style.touchAction = locked ? "pan-y" : "none";
      },
      dollyCamera: (step: number) => {
        // step > 0 moves camera ahead toward target; step < 0 moves back
        activePresetAnim = null;
        _vec3A.subVectors(camera.position, controls.target);
        const curDist = _vec3A.length();
        if (curDist < 0.001) return;
        const nextDist = THREE.MathUtils.clamp(curDist - step * 1.4, 3.8, 26);
        _vec3A.multiplyScalar(nextDist / curDist);
        camera.position.copy(controls.target).add(_vec3A);
        controls.update();
        requestRender();
      },
      updateExplodeLift: () => {
        syncDynamicScene();
        requestRender();
      },
      previewDropAtClient: (clientX: number, clientY: number) => {
        const hit = findHitHole(clientX, clientY);
        if (hit) {
          dropPreviewGroup.visible = true;
          dropPreviewGroup.position.set(hit.worldX, 0, hit.worldZ);
          requestRender();
          return hit.hole;
        }
        dropPreviewGroup.visible = false;
        requestRender();
        return null;
      },
      clearDropPreview: () => {
        if (dropPreviewGroup.visible) {
          dropPreviewGroup.visible = false;
          requestRender();
        }
      },
      wakeLoop: () => {
        clock.getDelta();
        requestRender();
      },
    };

    requestRender();

    return () => {
      disposed = true;
      sceneActionsRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("change", onControlChange);
      controls.dispose();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("dblclick", onDoubleClick);
      renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onContextRestored);
      disposeObjectSubtree(staticGroup);
      disposeObjectSubtree(assemblyGroup);
      envRT.dispose();
      renderer.forceContextLoss();
      renderer.dispose();
    };
  }, []);

  // Sync dynamic 3D components, wires, LEDs, and probes whenever structural/electrical props change
  useEffect(() => {
    sceneActionsRef.current?.syncDynamicScene();
  }, [
    components,
    wires,
    vSourceVal,
    simRunning,
    selectedWireColor,
    simResults,
    selectedComponentId,
    pendingWireStart,
    isDmmActive,
    probeRedHole,
    probeBlackHole,
    isScopeActive,
    probeScopeCh1Hole,
    probeScopeCh2Hole,
    isSigGenActive,
    sigGenHole,
    explodeLift,
    installedPmes,
  ]);

  // Sync camera lock & page scroll passthrough
  useEffect(() => {
    sceneActionsRef.current?.setOrbitLocked(isBoardLocked);
  }, [isBoardLocked]);

  // Native non-passive wheel lock when Pin View is enabled so scrolling canvas never scrolls outer page
  useEffect(() => {
    const el = mountRef.current;
    if (!el || !pinViewEnabled) return;
    const onWheelLock = (ev: WheelEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    el.addEventListener("wheel", onWheelLock, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheelLock);
    };
  }, [pinViewEnabled]);

  // Trigger camera framing on the laid circuit whenever requested
  useEffect(() => {
    if (frameCircuitTrigger > 0) {
      sceneActionsRef.current?.frameCircuit();
    }
  }, [frameCircuitTrigger]);

  // Wake animation loop cleanly when visibility, reducedMotion, or simFreqHz changes without rebuilding meshes
  useEffect(() => {
    if (isPageVisible) {
      sceneActionsRef.current?.wakeLoop();
    }
  }, [isPageVisible, reducedMotion, simFreqHz, simRunning]);

  const handleDragOver3D = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("application/ist-bb-comp")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const hole = sceneActionsRef.current?.previewDropAtClient(e.clientX, e.clientY);
    setDropTargetLabel(hole ? formatHoleLabel(hole) : "Hover over a 3D socket");
  };

  const handleDragLeave3D = () => {
    sceneActionsRef.current?.clearDropPreview();
    setDropTargetLabel(null);
  };

  const handleDrop3D = (e: React.DragEvent<HTMLDivElement>) => {
    const raw = e.dataTransfer.getData("application/ist-bb-comp");
    sceneActionsRef.current?.clearDropPreview();
    setDropTargetLabel(null);
    if (!raw) return;
    e.preventDefault();
    try {
      const parsed = JSON.parse(raw) as { type: string; value: number };
      const hole = sceneActionsRef.current?.previewDropAtClient(e.clientX, e.clientY);
      sceneActionsRef.current?.clearDropPreview();
      if (hole && onDropComponentAtHole) {
        onDropComponentAtHole(parsed.type, parsed.value, hole);
      } else if (onDropComponentAtHole) {
        onDropComponentAtHole(parsed.type, parsed.value, { type: "TERMINAL", col: 28, row: "C" });
      }
    } catch {
      // ignore invalid drag payload
    }
  };

  return (
    <div
      className="relative w-full h-full min-h-[420px] rounded-2xl border-2 border-[#26365c] bg-[#090d16] overflow-hidden shadow-2xl select-none"
      onDragOver={handleDragOver3D}
      onDragLeave={handleDragLeave3D}
      onDrop={handleDrop3D}
    >
      {/* Isolated WebGL Canvas Container */}
      <div ref={mountRef} className={`w-full h-full ${isBoardLocked ? "touch-pan-y" : "touch-none"}`} />

      {contextLost && (
        <div className="absolute inset-0 z-30 bg-[#090d16]/95 flex flex-col items-center justify-center gap-2 text-center p-4">
          <div className="text-xs font-mono text-amber-300 font-bold">
            3D Breadboard WebGL context paused by GPU. Restore tab focus to resume.
          </div>
        </div>
      )}

      {/* Minimal Top-Left Spec Badge + Lock Status */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2">
        <div className="pointer-events-none px-3 py-1.5 rounded-xl bg-[#0b1220]/90 border border-cyan-500/40 text-[11px] font-mono text-cyan-200 flex items-center gap-2 shadow-lg">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold text-white">3D Breadboard</span>
          <span className="text-slate-400">·</span>
          <span className="text-cyan-300">{components.length} Parts</span>
          <span className="text-slate-400">·</span>
          <span className={simRunning ? "text-[#48C99A] font-bold" : "text-[#F1B65B] font-bold"}>
            {simRunning ? `${vSourceVal.toFixed(1)}V · ${simFreqHz.toFixed(1)}Hz` : "IDLE / STANDBY"}
          </span>
        </div>

        {onToggleBoardLock && (
          <button
            type="button"
            onClick={onToggleBoardLock}
            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors ${
              isBoardLocked
                ? "bg-emerald-950/90 border-emerald-400/60 text-emerald-200 hover:bg-emerald-900"
                : "bg-amber-950/90 border-amber-400/60 text-amber-200 hover:bg-amber-900"
            }`}
            title={
              isBoardLocked
                ? "Locked on current view. Click to unlock and move ahead, back, and forth."
                : "Unlocked — orbit/pan/move ahead & back freely. Click to lock on current view."
            }
          >
            {isBoardLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{isBoardLocked ? "Locked on View" : "Unlocked · Move Ahead/Forth"}</span>
          </button>
        )}

        {!isBoardLocked && (
          <div className="flex items-center gap-1 bg-[#0b1220]/90 border border-amber-400/40 rounded-xl p-0.5 shadow-lg">
            <button
              type="button"
              onClick={() => sceneActionsRef.current?.dollyCamera(1)}
              className="px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold text-amber-200 hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              title="Move Ahead (Zoom closer)"
            >
              <ZoomIn className="w-3 h-3" />
              <span>Ahead</span>
            </button>
            <button
              type="button"
              onClick={() => sceneActionsRef.current?.dollyCamera(-1)}
              className="px-2 py-1 rounded-lg text-[10.5px] font-mono font-bold text-amber-200 hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
              title="Move Back (Zoom out)"
            >
              <ZoomOut className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleFrameCircuitClick}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold bg-[#0b1220]/90 hover:bg-slate-800 border border-cyan-500/50 text-cyan-200 shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Focus & center camera directly on the laid circuit"
        >
          <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
          <span>Find Circuit</span>
        </button>

        <button
          type="button"
          onClick={() => handlePresetClick("RESET")}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold bg-[#0b1220]/90 hover:bg-slate-800 border border-slate-600/80 text-slate-100 shadow-lg flex items-center gap-1.5 cursor-pointer transition-colors"
          title="Reset 3D camera zoom & angle to default isometric view"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
          <span>Reset Zoom</span>
        </button>
      </div>

      {/* 3D Drag & Drop Socket Snap Overlay */}
      {dropTargetLabel && (
        <div className="absolute top-12 left-3 z-20 pointer-events-none px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/70 text-[11px] font-mono text-emerald-200 shadow-lg">
          Drop Component at: <span className="font-bold text-white">{dropTargetLabel}</span>
        </div>
      )}

      {/* Active 3D Wiring / Probe Placement Banner */}
      {(pendingWireStart || activeProbeToPlace || activePmeProbeLabel || interactionMode !== "INSPECT") && (
        <div className="absolute top-3 right-3 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/70 text-[11px] font-mono text-amber-200 shadow-lg">
          <span>
            {activePmeProbeLabel
              ? `Click any 3D socket to attach ${activePmeProbeLabel}`
              : activeProbeToPlace
              ? `Click any 3D socket to snap ${activeProbeToPlace}`
              : pendingWireStart
              ? `Wiring ${formatHoleLabel(pendingWireStart)} → Click destination hole`
              : interactionMode === "WIRE"
              ? "3D Wire Mode: Click two sockets to connect jumper"
              : "3D Move Mode: Drag any component to a new socket"}
          </span>
          {pendingWireStart && onCancelPendingWire && (
            <button
              type="button"
              onClick={onCancelPendingWire}
              className="px-2 py-0.5 rounded bg-slate-900 text-amber-200 hover:text-white border border-amber-400/50 cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* 3D Hover Inspection Tooltip */}
      {hoverInfo && (
        <div
          className="pointer-events-none absolute z-20 px-2.5 py-1.5 rounded-lg bg-[#0a101d]/95 border border-cyan-400/70 text-[11px] font-mono shadow-xl"
          style={{
            left: Math.min(hoverInfo.x + 14, 480),
            top: Math.max(12, hoverInfo.y - 38),
          }}
        >
          <div className="font-bold text-cyan-300">{hoverInfo.label}</div>
          <div className="text-[10px] text-slate-300">{hoverInfo.detail}</div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Cinema / Zen HUD) */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-transform duration-200 ${
          hudCollapsed ? "bottom-[-52px]" : "bottom-3"
        }`}
        style={{ maxWidth: "min(860px, 95%)" }}
      >
        <button
          type="button"
          onClick={() => setHudCollapsed((v) => !v)}
          className="mb-1 px-3 py-0.5 rounded-t-lg bg-[#0d1526]/95 border border-b-0 border-cyan-500/40 text-[10px] font-mono font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
          title="Toggle 3D Camera Controls (Shortcut: H)"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3" />
              <span>Show 3D Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        <div className="bg-[#0d1526]/95 border border-cyan-500/40 rounded-xl px-3 py-2 shadow-2xl flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
          {/* Interaction Modes: Inspect / Wire / Move */}
          <div className="flex items-center gap-1 pr-2 border-r border-slate-700/80">
            <button
              type="button"
              onClick={() => setInteractionMode("INSPECT")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                interactionMode === "INSPECT"
                  ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/70"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/80"
              }`}
              title="Inspect & click parts"
            >
              <MousePointer className="w-3 h-3" />
              <span>Inspect</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode("WIRE")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                interactionMode === "WIRE"
                  ? "bg-amber-500/25 text-amber-200 border border-amber-400/70"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/80"
              }`}
              title="Point-to-point 3D jumper wiring (auto-updates SPICE)"
            >
              <Cable className="w-3 h-3" />
              <span>3D Wire</span>
            </button>
            <button
              type="button"
              onClick={() => setInteractionMode("MOVE")}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                interactionMode === "MOVE"
                  ? "bg-emerald-500/25 text-emerald-200 border border-emerald-400/70"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/80"
              }`}
              title="Drag 3D components across holes (or hold Shift + Drag)"
            >
              <Move className="w-3 h-3" />
              <span>3D Move</span>
            </button>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-slate-700/80">
            <Camera className="w-3.5 h-3.5 text-cyan-400 mr-0.5" />
            {(["ISOMETRIC", "TOP", "FRONT", "MACRO"] as CameraPresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetClick(key)}
                className={`px-2 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activePreset === key
                    ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/70"
                    : "bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700/80"
                }`}
              >
                {CAMERA_PRESETS[key].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handlePresetClick("RESET")}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 cursor-pointer"
              title="Reset Camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-300">Lift:</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={explodeLift}
              onChange={(e) => setExplodeLift(parseFloat(e.target.value) || 0)}
              className="w-20 accent-cyan-400 cursor-pointer"
              title="Elevate components slightly above breadboard sockets to inspect leads"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
