import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  AlertTriangle,
} from "lucide-react";
import Esp32ViewportController, {
  Esp32CameraPreset,
  orbitRotateCamera,
  panCameraView,
  zoomCameraView,
  computeCameraZoomPct,
} from "./Esp32ViewportController";
import {
  ESP32_DEVKIT_V1_PINS,
  Esp32PinInfo,
  Esp32SimType,
  Esp32WiringRow,
} from "../data/esp32ExperimentsData";
import {
  usePageVisibility,
  usePrefersReducedMotion,
} from "../utils/animationHelpers";
import {
  afterDrawSync,
  createRadialContactShadowTexture,
  disposeSceneSubtree,
  initThreeStudio,
} from "../utils/threeStudio";
import {
  createDcMotorWheel3D,
  createDiffusedLed3D,
  createKeypad4x43D,
  createMiniBreadboard3D,
  createOledDisplay3D,
  createRelayModule3D,
  createResistor3D,
  createSg90Servo3D,
  createSolarPanel3D,
  createTactileButton3D,
  createUltrasonicHcSr043D,
} from "./three/electronicsPrimitives3D";
import {
  createAnimatedPipeFlow3D,
  createBenchPowerSupply3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";

export interface CustomEsp32Wire {
  id: string;
  fromPinLabel: string;
  targetSocketIdx: number;
  colorHex: string;
}

export interface Esp32Board3DProps {
  selectedPinLabel: string | null;
  highlightedPins: string[];
  pinWiring?: Esp32WiringRow[];
  simType?: Esp32SimType;
  isRunning?: boolean;
  gpio2Lit: boolean;
  externalLedRedLit?: boolean;
  externalLedCyanLit?: boolean;
  motorSpeedNorm?: number;
  servoAngleDeg?: number;
  ultrasonicCm?: number;
  activeColorHex?: string;
  // Enhanced lesson-specific telemetry & 3D interaction callbacks
  tick?: number;
  magnetNear?: boolean;
  wifiCh1?: boolean;
  wifiCh2?: boolean;
  activePianoKey?: string | null;
  ringMode?: "CHASE" | "RAINBOW" | "CYAN";
  ambientLux?: number;
  beamBroken?: boolean;
  alarmLatched?: boolean;
  espNowCount?: number;
  parkingSlots?: { s1: boolean; s2: boolean; gateOpen: boolean };
  moisturePct?: number;
  pumpOn?: boolean;
  doorUnlocked?: boolean;
  enteredPin?: string;
  sunAngle?: number;
  radarAngleDeg?: number;
  radarEchoCm?: number;
  armJoints?: { base: number; shoulder: number; grip: number; auto: boolean };
  focusPinTrigger?: { pinLabel: string; seq: number } | null;
  customWires?: CustomEsp32Wire[];
  onAddCustomWire?: (fromPinLabel: string, targetSocketIdx: number) => void;
  onRemoveCustomWire?: (wireId: string) => void;
  onResetBoard?: () => void;
  onBootPress?: () => void;
  onSelectPin: (pin: Esp32PinInfo) => void;
  onToggleMagnet?: () => void;
  onPressPianoKey?: (key: string, freq: number) => void;
  onToggleBeam?: () => void;
  onPressKeypadKey?: (k: string) => void;
  onToggleParkingSlot?: (slot: "s1" | "s2") => void;
  onToggleWifiChannel?: (ch: 1 | 2) => void;
}

type CameraPreset = Esp32CameraPreset;

interface HoverOverlayInfo {
  title: string;
  subtitle: string;
  roleOrNote: string;
  x: number;
  y: number;
  pinRole?: string;
  capabilities?: string[];
  pinHardwareNote?: string;
}

interface DynamicWireHandle {
  flow: FlowingWire3DHandle;
  isPowerOrGnd: "POWER" | "GND" | "SIG";
}

const _vec3 = new THREE.Vector3();
const _targetVec = new THREE.Vector3();
const _projVec = new THREE.Vector3();

function createPcbSilkscreenTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#111622";
  ctx.fillRect(0, 0, 512, 1024);

  ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
  ctx.lineWidth = 2;
  for (let y = 180; y < 960; y += 26) {
    ctx.beginPath();
    ctx.moveTo(70, y);
    ctx.lineTo(130, y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(382, y);
    ctx.lineTo(442, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(226, 232, 240, 0.4)";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 476, 988);

  // 2.4 GHz Meander Antenna
  ctx.strokeStyle = "#d4af37";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(110, 145);
  ctx.lineTo(110, 48);
  ctx.lineTo(190, 48);
  ctx.lineTo(190, 115);
  ctx.lineTo(270, 115);
  ctx.lineTo(270, 48);
  ctx.lineTo(350, 48);
  ctx.lineTo(350, 130);
  ctx.lineTo(405, 130);
  ctx.stroke();

  const leftPins = ESP32_DEVKIT_V1_PINS.filter((p) => p.side === "LEFT");
  const rightPins = ESP32_DEVKIT_V1_PINS.filter((p) => p.side === "RIGHT");

  ctx.font = "bold 17px monospace";
  ctx.textBaseline = "middle";

  leftPins.forEach((pin, idx) => {
    const y = 215 + idx * 50;
    ctx.fillStyle =
      pin.role === "POWER"
        ? "#f87171"
        : pin.role === "GND"
        ? "#94a3b8"
        : "#e2e8f0";
    ctx.textAlign = "left";
    ctx.fillText(pin.label, 68, y);
  });

  rightPins.forEach((pin, idx) => {
    const y = 215 + idx * 50;
    ctx.fillStyle =
      pin.role === "POWER"
        ? "#f87171"
        : pin.role === "GND"
        ? "#94a3b8"
        : "#e2e8f0";
    ctx.textAlign = "right";
    ctx.fillText(pin.label, 444, y);
  });

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.fillText("ESP32 DEVKIT V1", 256, 610);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "15px monospace";
  ctx.fillText("IST CIRCUIT & LOGIC LAB", 256, 640);
  ctx.fillText("Wi-Fi + BLE · 3.3V CMOS", 256, 666);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createShieldLabelTexture(maxAniso: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#c8ced8";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 160; i++) {
    ctx.fillStyle =
      i % 2 === 0 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(0, i * 3.2, 512, 1.5);
  }

  ctx.fillStyle = "#334155";
  ctx.textAlign = "center";
  ctx.font = "bold 34px monospace";
  ctx.fillText("ESP-WROOM-32", 256, 195);
  ctx.font = "22px monospace";
  ctx.fillText("Wi-Fi + BLE 4.2", 256, 245);
  ctx.fillText("240MHz Dual Core", 256, 285);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 416, 416);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

function createPianoKeyTexture(label: string, freq: number, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#b45309";
  ctx.fillRect(0, 0, 256, 128);
  ctx.strokeStyle = "#fde68a";
  ctx.lineWidth = 5;
  ctx.strokeRect(6, 6, 244, 116);
  ctx.fillStyle = "#fef3c7";
  ctx.font = "bold 44px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 90, 64);
  ctx.font = "bold 24px monospace";
  ctx.fillText(`${freq}Hz`, 185, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}

function mapWireColorHex(colorName: string, signalType?: string): number {
  const c = colorName.toLowerCase();
  if (c.includes("red") || signalType === "POWER") return 0xef4444;
  if (c.includes("black") || c.includes("brown") || signalType === "GND")
    return 0x64748b;
  if (c.includes("cyan") || c.includes("blue")) return 0x22d3ee;
  if (c.includes("green")) return 0x10b981;
  if (c.includes("yellow") || c.includes("orange") || c.includes("amber"))
    return 0xf59e0b;
  if (c.includes("purple") || c.includes("violet")) return 0xa855f7;
  return 0x38bdf8;
}

function findMatchingPin(fromPinText: string): Esp32PinInfo | undefined {
  const norm = fromPinText.trim().toUpperCase().split(",")[0].trim();
  return ESP32_DEVKIT_V1_PINS.find((p) => {
    const lbl = p.label.toUpperCase();
    if (lbl === norm) return true;
    if (norm.startsWith("GPIO") && p.gpio !== null) {
      return `GPIO${p.gpio}` === norm || `GPIO ${p.gpio}` === norm;
    }
    if (lbl.includes(`(${norm})`) || lbl.startsWith(norm)) return true;
    return false;
  });
}

export default function Esp32Board3D({
  selectedPinLabel,
  highlightedPins,
  pinWiring = [],
  simType = "MEET_ESP32",
  isRunning = true,
  gpio2Lit,
  externalLedRedLit = false,
  externalLedCyanLit = false,
  motorSpeedNorm = 0,
  servoAngleDeg = 45,
  ultrasonicCm = 48,
  activeColorHex = "#22d3ee",
  tick = 0,
  magnetNear = false,
  wifiCh1 = true,
  wifiCh2 = false,
  activePianoKey = null,
  ringMode = "CHASE",
  ambientLux = 420,
  beamBroken = false,
  alarmLatched = false,
  espNowCount = 0,
  parkingSlots = { s1: false, s2: true, gateOpen: false },
  moisturePct = 55,
  pumpOn = false,
  doorUnlocked = false,
  enteredPin = "",
  sunAngle = 65,
  radarAngleDeg = 90,
  radarEchoCm = 120,
  armJoints = { base: 30, shoulder: 75, grip: 0, auto: false },
  focusPinTrigger = null,
  customWires = [],
  onAddCustomWire,
  onRemoveCustomWire,
  onResetBoard,
  onBootPress,
  onSelectPin,
  onToggleMagnet,
  onPressPianoKey,
  onToggleBeam,
  onPressKeypadKey,
  onToggleParkingSlot,
  onToggleWifiChannel,
}: Esp32Board3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();

  const [hoveredInfo, setHoveredInfo] = useState<HoverOverlayInfo | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>("ISO");
  const [autoOrbit, setAutoOrbit] = useState<boolean>(false);
  const [zoomPct, setZoomPct] = useState<number>(100);
  const [show3DWiring, setShow3DWiring] = useState<boolean>(true);
  const [wiringMode, setWiringMode] = useState<boolean>(false);
  const [pendingSourcePin, setPendingSourcePin] = useState<string | null>(null);
  const [localCustomWires, setLocalCustomWires] = useState<CustomEsp32Wire[]>([]);
  const [contextLost, setContextLost] = useState<boolean>(false);

  const effectiveCustomWires = onAddCustomWire ? customWires : localCustomWires;

  const propsRef = useRef({
    selectedPinLabel,
    highlightedPins,
    pinWiring,
    simType,
    isRunning,
    gpio2Lit,
    externalLedRedLit,
    externalLedCyanLit,
    motorSpeedNorm,
    servoAngleDeg,
    ultrasonicCm,
    activeColorHex,
    tick,
    magnetNear,
    wifiCh1,
    wifiCh2,
    activePianoKey,
    ringMode,
    ambientLux,
    beamBroken,
    alarmLatched,
    espNowCount,
    parkingSlots,
    moisturePct,
    pumpOn,
    doorUnlocked,
    enteredPin,
    sunAngle,
    radarAngleDeg,
    radarEchoCm,
    armJoints,
    show3DWiring,
    wiringMode,
    pendingSourcePin,
    effectiveCustomWires,
    autoOrbit,
    reducedMotion,
    isPageVisible,
    onSelectPin,
    onAddCustomWire,
    onRemoveCustomWire,
    onResetBoard,
    onBootPress,
    onToggleMagnet,
    onPressPianoKey,
    onToggleBeam,
    onPressKeypadKey,
    onToggleParkingSlot,
    onToggleWifiChannel,
  });

  propsRef.current = {
    selectedPinLabel,
    highlightedPins,
    pinWiring,
    simType,
    isRunning,
    gpio2Lit,
    externalLedRedLit,
    externalLedCyanLit,
    motorSpeedNorm,
    servoAngleDeg,
    ultrasonicCm,
    activeColorHex,
    tick,
    magnetNear,
    wifiCh1,
    wifiCh2,
    activePianoKey,
    ringMode,
    ambientLux,
    beamBroken,
    alarmLatched,
    espNowCount,
    parkingSlots,
    moisturePct,
    pumpOn,
    doorUnlocked,
    enteredPin,
    sunAngle,
    radarAngleDeg,
    radarEchoCm,
    armJoints,
    show3DWiring,
    wiringMode,
    pendingSourcePin,
    effectiveCustomWires,
    autoOrbit,
    reducedMotion,
    isPageVisible,
    onSelectPin,
    onAddCustomWire,
    onRemoveCustomWire,
    onResetBoard,
    onBootPress,
    onToggleMagnet,
    onPressPianoKey,
    onToggleBeam,
    onPressKeypadKey,
    onToggleParkingSlot,
    onToggleWifiChannel,
  };

  const sceneApiRef = useRef<{
    setPreset: (preset: CameraPreset) => void;
    focusPin: (pinLabel: string) => void;
    rotateBy: (dTheta: number, dPhi: number) => void;
    panBy: (dx: number, dy: number) => void;
    zoomBy: (factor: number) => void;
    syncHighlights: () => void;
    rebuildWiring: () => void;
    rebuildPeripheralStage: () => void;
    wakeLoop: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const studio = initThreeStudio(container, {
      backgroundHex: 0x060a14,
      fogNear: 14,
      fogFar: 32,
      fov: 38,
      cameraPos: [4.8, 5.2, 6.2],
      targetPos: [0.75, 0.3, 0],
      minDistance: 2.3,
      maxDistance: 15,
      shadowBounds: 6.5,
      benchSize: 28,
      benchY: -0.35,
      gridDivisions: 42,
    });

    const { renderer, scene, camera, controls, isSoftwareGl } = studio;
    let disposed = false;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
      requestRender();
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Soft contact shadows
    const shadowTex = createRadialContactShadowTexture(256);
    const espShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 6.2),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.85,
      })
    );
    espShadow.rotation.x = -Math.PI / 2;
    espShadow.position.set(-0.55, -0.33, 0);
    scene.add(espShadow);

    const benchShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 5.8),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.72,
      })
    );
    benchShadow.rotation.x = -Math.PI / 2;
    benchShadow.position.set(2.35, -0.33, 0);
    scene.add(benchShadow);

    // =========================================================================
    // A. COMPOSITE ESP32 DEVKIT V1 GROUP (at x = -0.55)
    // =========================================================================
    const boardGroup = new THREE.Group();
    boardGroup.position.set(-0.55, 0, 0);
    scene.add(boardGroup);

    const pcbW = 2.6;
    const pcbL = 5.0;
    const r = 0.1;
    const pcbShape = new THREE.Shape();
    pcbShape.moveTo(-pcbW / 2 + r, -pcbL / 2);
    pcbShape.lineTo(pcbW / 2 - r, -pcbL / 2);
    pcbShape.quadraticCurveTo(pcbW / 2, -pcbL / 2, pcbW / 2, -pcbL / 2 + r);
    pcbShape.lineTo(pcbW / 2, pcbL / 2 - r);
    pcbShape.quadraticCurveTo(pcbW / 2, pcbL / 2, pcbW / 2 - r, pcbL / 2);
    pcbShape.lineTo(-pcbW / 2 + r, pcbL / 2);
    pcbShape.quadraticCurveTo(-pcbW / 2, pcbL / 2, -pcbW / 2, pcbL / 2 - r);
    pcbShape.lineTo(-pcbW / 2, -pcbL / 2 + r);
    pcbShape.quadraticCurveTo(-pcbW / 2, -pcbL / 2, -pcbW / 2 + r, -pcbL / 2);

    const pcbGeo = new THREE.ExtrudeGeometry(pcbShape, {
      depth: 0.14,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    });
    pcbGeo.rotateX(-Math.PI / 2);
    const pcbMesh = new THREE.Mesh(
      pcbGeo,
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.62,
        metalness: 0.15,
      })
    );
    pcbMesh.castShadow = true;
    pcbMesh.receiveShadow = true;
    boardGroup.add(pcbMesh);

    const silkTex = createPcbSilkscreenTexture(maxAniso);
    const deckMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(pcbW - 0.06, pcbL - 0.06),
      new THREE.MeshStandardMaterial({
        map: silkTex,
        roughness: 0.55,
        metalness: 0.12,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    deckMesh.rotation.x = -Math.PI / 2;
    deckMesh.position.y = 0.16;
    boardGroup.add(deckMesh);

    // RF Shield
    const shieldTex = createShieldLabelTexture(maxAniso);
    const shieldSideMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.92,
      roughness: 0.2,
    });
    const shieldTopMat = new THREE.MeshStandardMaterial({
      map: shieldTex,
      metalness: 0.85,
      roughness: 0.25,
    });
    const shieldMesh = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.28, 1.72), [
      shieldSideMat,
      shieldSideMat,
      shieldTopMat,
      shieldSideMat,
      shieldSideMat,
      shieldSideMat,
    ]);
    shieldMesh.position.set(0, 0.3, -1.05);
    shieldMesh.castShadow = true;
    shieldMesh.layers.set(1);
    shieldMesh.userData.peripheralLabel = "ESP-WROOM-32 RF Module";
    shieldMesh.userData.peripheralRole = "Dual-Core 240MHz MCU · Wi-Fi + BLE 4.2";
    boardGroup.add(shieldMesh);

    // Micro-USB port
    const usbMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.18,
    });
    const usbMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.24, 0.52), usbMat);
    usbMesh.position.set(0, 0.27, 2.34);
    usbMesh.castShadow = true;
    boardGroup.add(usbMesh);

    // CP2102 USB-UART & AMS1117 3.3V LDO
    const icMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.25,
    });
    const cpMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.09, 0.45), icMat);
    cpMesh.position.set(0, 0.2, 1.38);
    cpMesh.layers.set(1);
    cpMesh.userData.peripheralLabel = "CP2102 USB-UART Bridge";
    cpMesh.userData.peripheralRole = "115200 bps Serial Console Interface";
    boardGroup.add(cpMesh);

    const regMesh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.12, 0.34), icMat);
    regMesh.position.set(-0.48, 0.21, 1.72);
    regMesh.layers.set(1);
    regMesh.userData.peripheralLabel = "AMS1117-3.3V Regulator";
    regMesh.userData.peripheralRole = "Steps 5V USB down to 3.3V Logic";
    boardGroup.add(regMesh);

    // Interactive EN (Reset) & BOOT (GPIO 0) Buttons with tactile animation
    const btnFrameGeo = new THREE.BoxGeometry(0.28, 0.08, 0.22);
    const btnCapGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.12, 16);
    const btnCapMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    let enPressedUntil = 0;
    let bootPressedUntil = 0;
    const btnCaps: THREE.Mesh[] = [];

    [-0.58, 0.58].forEach((bx, bi) => {
      const frame = new THREE.Mesh(btnFrameGeo, usbMat);
      frame.position.set(bx, 0.2, 2.15);
      const cap = new THREE.Mesh(btnCapGeo, btnCapMat);
      cap.position.set(bx, 0.24, 2.15);
      cap.layers.set(1);
      cap.userData.peripheralLabel = bi === 0 ? "EN (Hardware Reset)" : "BOOT (GPIO 0 Flash)";
      cap.userData.peripheralRole = bi === 0 ? "Click in 3D to Reset MCU" : "Click in 3D to Flash Bootloader";
      cap.userData.onAction = () => {
        if (bi === 0) {
          enPressedUntil = performance.now() + 260;
          propsRef.current.onResetBoard?.();
        } else {
          bootPressedUntil = performance.now() + 260;
          propsRef.current.onBootPress?.();
        }
      };
      boardGroup.add(frame, cap);
      btnCaps.push(cap);
    });

    // Onboard PWR + GPIO2 LEDs
    const pwrLedMat = new THREE.MeshStandardMaterial({
      color: 0xff2222,
      emissive: 0xff1111,
      emissiveIntensity: 2.1,
      roughness: 0.2,
    });
    const pwrLed = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.065, 0.07), pwrLedMat);
    pwrLed.position.set(-0.32, 0.195, 1.9);
    boardGroup.add(pwrLed);

    const gpio2LedMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: 0x22d3ee,
      emissiveIntensity: 0,
      roughness: 0.2,
    });
    const gpio2Led = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.08), gpio2LedMat);
    gpio2Led.position.set(0.32, 0.195, 1.9);
    boardGroup.add(gpio2Led);

    const gpio2HaloMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const gpio2Halo = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), gpio2HaloMat);
    gpio2Halo.position.set(0.32, 0.24, 1.9);
    gpio2Halo.visible = false;
    boardGroup.add(gpio2Halo);

    // Animated RF Wave Rings (for Wi-Fi / BLE / ESP-NOW experiments)
    const rfWaveRings: THREE.Mesh[] = [];
    const rfWaveMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.22, 28), rfWaveMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(0, 0.32, -2.15);
      ring.visible = false;
      boardGroup.add(ring);
      rfWaveRings.push(ring);
    }

    // 30 Gold Header Pins
    const pinInstanced = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.045, 0.42, 0.045),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.94, roughness: 0.18 }),
      30
    );
    const dummy = new THREE.Object3D();
    const collarGeo = new THREE.BoxGeometry(0.145, 0.11, 0.145);
    const pinHitGeo = new THREE.BoxGeometry(0.22, 0.48, 0.22);
    const pinHitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const pinCollars: {
      mesh: THREE.Mesh;
      pin: Esp32PinInfo;
      baseMat: THREE.MeshStandardMaterial;
      localPos: THREE.Vector3;
    }[] = [];

    ESP32_DEVKIT_V1_PINS.forEach((pin, idx) => {
      const px = pin.side === "LEFT" ? -1.12 : 1.12;
      const pz = -1.45 + pin.index * 0.245;
      dummy.position.set(px, 0.0, pz);
      dummy.updateMatrix();
      pinInstanced.setMatrixAt(idx, dummy.matrix);

      const collarMat = new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.45,
        metalness: 0.15,
      });
      const collar = new THREE.Mesh(collarGeo, collarMat);
      collar.position.set(px, 0.19, pz);
      collar.layers.set(1);
      collar.userData.pinInfo = pin;

      // Full-height raycast target covering gold pin shaft + black collar for forgiving hover picking
      const hitBox = new THREE.Mesh(pinHitGeo, pinHitMat);
      hitBox.position.set(px, 0.12, pz);
      hitBox.layers.set(1);
      hitBox.userData.pinInfo = pin;

      boardGroup.add(collar, hitBox);
      pinCollars.push({
        mesh: collar,
        pin,
        baseMat: collarMat,
        localPos: new THREE.Vector3(px, 0.25, pz),
      });
    });

    pinInstanced.instanceMatrix.needsUpdate = true;
    pinInstanced.computeBoundingSphere();
    boardGroup.add(pinInstanced);

    const selRingGeo = new THREE.RingGeometry(0.095, 0.14, 24);
    selRingGeo.rotateX(-Math.PI / 2);
    const selRingMesh = new THREE.Mesh(
      selRingGeo,
      new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    selRingMesh.position.set(0, 0.26, 0);
    selRingMesh.visible = false;
    boardGroup.add(selRingMesh);

    // Smart Pin Highlighting 3D hover halo + vertical luminous locator beacon + 3D Sprite Label
    const hoverRingGeo = new THREE.RingGeometry(0.11, 0.18, 24);
    hoverRingGeo.rotateX(-Math.PI / 2);
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const hoverRingMesh = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    hoverRingMesh.position.set(0, 0.275, 0);
    hoverRingMesh.visible = false;

    const hoverBeaconMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.88,
    });
    const hoverBeaconMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.48, 10),
      hoverBeaconMat
    );
    hoverBeaconMesh.position.set(0, 0.51, 0);
    hoverBeaconMesh.visible = false;

    const pinLabelCanvas = document.createElement("canvas");
    pinLabelCanvas.width = 256;
    pinLabelCanvas.height = 84;
    const pinLabelCtx = pinLabelCanvas.getContext("2d")!;
    const pinLabelTex = new THREE.CanvasTexture(pinLabelCanvas);
    pinLabelTex.colorSpace = THREE.SRGBColorSpace;
    const pinLabelSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: pinLabelTex,
        transparent: true,
        depthTest: false,
      })
    );
    pinLabelSprite.scale.set(0.95, 0.31, 1);
    pinLabelSprite.renderOrder = 20;
    pinLabelSprite.visible = false;

    const updatePinHoverSprite = (pin: Esp32PinInfo, accentCss: string) => {
      pinLabelCtx.clearRect(0, 0, 256, 84);
      pinLabelCtx.fillStyle = "rgba(8, 15, 32, 0.94)";
      pinLabelCtx.strokeStyle = accentCss;
      pinLabelCtx.lineWidth = 4;
      pinLabelCtx.beginPath();
      pinLabelCtx.roundRect(4, 4, 248, 76, 14);
      pinLabelCtx.fill();
      pinLabelCtx.stroke();
      pinLabelCtx.fillStyle = accentCss;
      pinLabelCtx.font = "bold 28px monospace";
      pinLabelCtx.textAlign = "center";
      pinLabelCtx.textBaseline = "middle";
      const mainTitle =
        pin.gpio !== null && pin.gpio !== undefined
          ? `${pin.label} · GPIO${pin.gpio}`
          : pin.label;
      pinLabelCtx.fillText(mainTitle, 128, 30);
      pinLabelCtx.fillStyle = "#cbd5e1";
      pinLabelCtx.font = "bold 17px monospace";
      pinLabelCtx.fillText(pin.capabilities.slice(0, 2).join(" / ") || pin.role, 128, 58);
      pinLabelTex.needsUpdate = true;
    };

    boardGroup.add(hoverRingMesh, hoverBeaconMesh, pinLabelSprite);
    let hoveredPinLabel: string | null = null;

    // =========================================================================
    // B. LAB INSTRUMENTATION (BENCH PSU + SCOPE PROBE) & 3D PERIPHERAL STAGE
    // =========================================================================
    const benchPsu = createBenchPowerSupply3D("ESP32 BENCH PSU", maxAniso);
    benchPsu.group.position.set(-2.75, -0.35, -1.65);
    benchPsu.group.rotation.y = 0.28;
    benchPsu.group.traverse((o) => {
      o.layers.set(1);
      o.userData.peripheralLabel = "DC Bench Power Supply (+5V / +12V / GND)";
      o.userData.peripheralRole = "Feeds ESP32 VIN (5.0V) & external load buses";
    });
    scene.add(benchPsu.group);

    const scopeProbe = createScopeProbe3D(0xfacc15, 0.92);
    scopeProbe.group.position.set(1.52, -0.09, -0.82);
    scopeProbe.group.traverse((o) => {
      o.layers.set(1);
      o.userData.peripheralLabel = "Oscilloscope CH1 10x BNC Probe";
      o.userData.peripheralRole = "Probing live primary GPIO / PWM output signal";
    });
    scene.add(scopeProbe.group);

    const periphGroup = new THREE.Group();
    periphGroup.position.set(2.35, -0.35, 0);
    scene.add(periphGroup);

    const targetSocketLocalPositions: THREE.Vector3[] = [];
    for (let i = 0; i < 6; i++) {
      targetSocketLocalPositions.push(new THREE.Vector3(-0.82, 0.24, -1.1 + i * 0.44));
    }

    interface PeripheralRigHooks {
      updateFrame: (delta: number, elapsed: number) => void;
    }
    let rigHooks: PeripheralRigHooks | null = null;
    const socketPinMeshes: { idx: number; mat: THREE.MeshStandardMaterial }[] = [];
    const stageAnchors = new Map<string, THREE.Vector3>();

    const buildLessonPeripheralStage = () => {
      disposeSceneSubtree(periphGroup);
      periphGroup.clear();
      rigHooks = null;
      socketPinMeshes.length = 0;
      stageAnchors.clear();

      const curType = propsRef.current.simType;

      // Grounded ESD Peripheral Tray + Solderless Breadboard Strip
      const deckBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.25, 0.16, 4.5),
        new THREE.MeshStandardMaterial({
          color: 0x151e30,
          roughness: 0.55,
          metalness: 0.22,
        })
      );
      deckBase.position.set(0, 0.08, 0);
      deckBase.castShadow = true;
      deckBase.receiveShadow = true;
      periphGroup.add(deckBase);

      // Left terminal jumper header block (interactive sockets for 3D wiring)
      const sockBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.12, 2.8),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
      );
      sockBase.position.set(-0.82, 0.18, 0);
      periphGroup.add(sockBase);

      targetSocketLocalPositions.forEach((sp, sIdx) => {
        const mat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          emissive: 0xfacc15,
          emissiveIntensity: 0.12,
          metalness: 0.85,
          roughness: 0.22,
        });
        const sockPin = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.11), mat);
        sockPin.position.set(sp.x, sp.y - 0.02, sp.z);
        sockPin.layers.set(1);
        sockPin.userData.targetSocketIdx = sIdx;
        sockPin.userData.peripheralLabel = `Breadboard Terminal Bus #${sIdx + 1}`;
        sockPin.userData.peripheralRole = "Click in Wire Mode to attach 3D jumper wire";
        periphGroup.add(sockPin);
        socketPinMeshes.push({ idx: sIdx, mat });
      });

      // Experiment-Specific High-Craft 3D Hardware Modules
      if (curType === "MEET_ESP32") {
        // Mini Solderless Breadboard + Live OLED Telemetry Screen + Onboard Status LED Mirror
        const miniBb = createMiniBreadboard3D(1.45, 3.6, maxAniso);
        miniBb.position.set(0.18, 0.16, 0);
        periphGroup.add(miniBb);

        const oled = createOledDisplay3D(maxAniso);
        oled.group.position.set(0.18, 0.32, -0.7);
        oled.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "SSD1306 Live Telemetry OLED";
          o.userData.peripheralRole = "Displays real-time GPIO 2 & CPU status";
        });
        periphGroup.add(oled.group);

        const gpio2Ext = createDiffusedLed3D(0x22d3ee, 1.35);
        gpio2Ext.group.position.set(0.18, 0.32, 0.55);
        gpio2Ext.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "GPIO 2 Test Indicator LED";
          o.userData.peripheralRole = "Mirrors onboard DevKit V1 blue LED";
        });
        const r220 = createResistor3D(220, 0.9);
        r220.group.position.set(0.18, 0.32, 1.05);

        const resetBtn = createTactileButton3D(0xef4444, 1.1);
        resetBtn.group.position.set(-0.22, 0.32, 1.38);
        resetBtn.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "External Reset Button";
          o.userData.peripheralRole = "Click in 3D to pulse EN Reset";
          o.userData.onAction = () => propsRef.current.onResetBoard?.();
        });
        periphGroup.add(gpio2Ext.group, r220.group, resetBtn.group);
        stageAnchors.set("led", new THREE.Vector3(0.18, 0.34, 0.55));
        stageAnchors.set("vcc", new THREE.Vector3(-0.42, 0.32, -1.35));
        stageAnchors.set("gnd", new THREE.Vector3(-0.52, 0.32, 1.35));
        stageAnchors.set("oled", new THREE.Vector3(0.18, 0.34, -0.7));

        rigHooks = {
          updateFrame: () => {
            const st = propsRef.current;
            const lit = Boolean(st.isRunning && st.gpio2Lit);
            gpio2Ext.setIntensity(lit ? 1 : 0);
            oled.updateScreen(
              "ESP32 DEVKIT V1",
              [
                `CPU: 240MHz Dual`,
                `GPIO2: ${lit ? "HIGH (3.3V)" : "LOW  (0.0V)"}`,
                `RAIL : 3.3V / 5V`,
                st.isRunning ? "STATUS: RUNNING" : "STATUS: PAUSED",
              ],
              lit ? "#22d3ee" : "#64748b"
            );
          },
        };
      } else if (curType === "DUAL_LED") {
        // Authentic Solderless Mini Breadboard + 2x 220Ω EIA Resistors + Red/Cyan 5mm LEDs
        const miniBb = createMiniBreadboard3D(1.45, 3.4, maxAniso);
        miniBb.position.set(0.18, 0.16, 0);
        periphGroup.add(miniBb);

        const ledRed = createDiffusedLed3D(0xef4444, 1.4);
        ledRed.group.position.set(0.38, 0.32, -0.75);
        ledRed.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "Red 5mm LED (GPIO 16)";
          o.userData.peripheralRole = "220Ω Series Resistor · ~5.9 mA";
        });

        const ledCyan = createDiffusedLed3D(0x22d3ee, 1.4);
        ledCyan.group.position.set(0.38, 0.32, 0.45);
        ledCyan.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "Cyan 5mm LED (GPIO 17)";
          o.userData.peripheralRole = "Alternating Antiphase Output";
        });

        const resA = createResistor3D(220, 1.0);
        resA.group.position.set(-0.18, 0.32, -0.75);
        const resB = createResistor3D(220, 1.0);
        resB.group.position.set(-0.18, 0.32, 0.45);
        periphGroup.add(ledRed.group, ledCyan.group, resA.group, resB.group);
        stageAnchors.set("red", new THREE.Vector3(-0.34, 0.36, -0.75));
        stageAnchors.set("cyan", new THREE.Vector3(-0.34, 0.36, 0.45));
        stageAnchors.set("gnd", new THREE.Vector3(0.56, 0.32, 1.25));

        rigHooks = {
          updateFrame: () => {
            const st = propsRef.current;
            const redOn = Boolean(st.isRunning && st.externalLedRedLit);
            const cyanOn = Boolean(st.isRunning && st.externalLedCyanLit);
            ledRed.setIntensity(redOn ? 1 : 0);
            ledCyan.setIntensity(cyanOn ? 1 : 0);
            resA.setThermalLevel(redOn ? 0.35 : 0);
            resB.setThermalLevel(cyanOn ? 0.35 : 0);
          },
        };
      } else if (curType === "REED_SWITCH") {
        // Mini Breadboard + Hermetically Sealed Glass Reed Switch + Pullup LED + Moving Neodymium Magnet
        const miniBb = createMiniBreadboard3D(1.45, 3.6, maxAniso);
        miniBb.position.set(0.18, 0.16, 0);
        periphGroup.add(miniBb);

        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xdbeafe,
          transparent: true,
          opacity: 0.55,
          roughness: 0.15,
          clearcoat: 1.0,
        });
        const glassTube = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 1.25, 20),
          glassMat
        );
        glassTube.rotation.x = Math.PI / 2;
        glassTube.position.set(-0.08, 0.5, -0.15);
        periphGroup.add(glassTube);

        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15,
          metalness: 0.92,
          roughness: 0.18,
        });
        const bladeA = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.65), bladeMat);
        bladeA.position.set(-0.08, 0.52, -0.4);
        const bladeB = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.65), bladeMat);
        bladeB.position.set(-0.08, 0.48, 0.1);
        periphGroup.add(bladeA, bladeB);

        const reedLed = createDiffusedLed3D(0x10b981, 1.3);
        reedLed.group.position.set(-0.18, 0.32, 1.15);
        periphGroup.add(reedLed.group);

        const magnetGroup = new THREE.Group();
        magnetGroup.position.set(0.65, 0.5, -0.15);
        const northHalf = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.26, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
        );
        northHalf.position.z = -0.21;
        const southHalf = new THREE.Mesh(
          new THREE.BoxGeometry(0.32, 0.26, 0.42),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25 })
        );
        southHalf.position.z = 0.21;
        magnetGroup.add(northHalf, southHalf);
        magnetGroup.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "Neodymium Block Magnet";
          o.userData.peripheralRole = "Click in 3D to toggle Reed Switch!";
          o.userData.onAction = () => propsRef.current.onToggleMagnet?.();
        });
        periphGroup.add(magnetGroup);
        stageAnchors.set("reed", new THREE.Vector3(-0.08, 0.42, -0.72));
        stageAnchors.set("gnd", new THREE.Vector3(-0.08, 0.36, 0.45));
        stageAnchors.set("led", new THREE.Vector3(-0.18, 0.34, 1.15));

        rigHooks = {
          updateFrame: (delta) => {
            const st = propsRef.current;
            const targetX = st.magnetNear ? 0.22 : 0.72;
            magnetGroup.position.x = THREE.MathUtils.damp(magnetGroup.position.x, targetX, 8, delta);
            bladeA.position.y = st.magnetNear ? 0.5 : 0.525;
            bladeB.position.y = st.magnetNear ? 0.5 : 0.475;
            reedLed.setIntensity(st.isRunning && st.magnetNear ? 1 : 0);
          },
        };
      } else if (curType === "WIFI_CONTROL" || curType === "BLUETOOTH_COMM" || curType === "ESPNOW_COMM") {
        // Distinct Wireless Hardware: Live SSD1306 Telemetry OLED + Songle Relay Module (Wi-Fi) / BLE Beacon / ESP-NOW Node B
        const oled = createOledDisplay3D(maxAniso);
        oled.group.position.set(0.2, 0.16, -0.85);
        oled.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel =
            curType === "WIFI_CONTROL"
              ? "HTTP Server Telemetry OLED"
              : curType === "BLUETOOTH_COMM"
              ? "BLE UART Console OLED"
              : "ESP-NOW Peer Node OLED";
          o.userData.peripheralRole = "Live packet & RSSI status";
        });
        periphGroup.add(oled.group);

        if (curType === "WIFI_CONTROL") {
          const r1 = createRelayModule3D("CH1 LOAD", maxAniso);
          r1.group.position.set(0.2, 0.16, 0.35);
          r1.group.traverse((o) => {
            o.layers.set(1);
            o.userData.peripheralLabel = "Wi-Fi Relay CH1 (GPIO 2)";
            o.userData.peripheralRole = "Click in 3D to toggle CH1 Load";
            o.userData.onAction = () => propsRef.current.onToggleWifiChannel?.(1);
          });
          const r2 = createRelayModule3D("CH2 LOAD", maxAniso);
          r2.group.position.set(0.2, 0.16, 1.55);
          r2.group.traverse((o) => {
            o.layers.set(1);
            o.userData.peripheralLabel = "Wi-Fi Relay CH2 (GPIO 26)";
            o.userData.peripheralRole = "Click in 3D to toggle CH2 Load";
            o.userData.onAction = () => propsRef.current.onToggleWifiChannel?.(2);
          });
          periphGroup.add(r1.group, r2.group);
          stageAnchors.set("ch1", new THREE.Vector3(-0.22, 0.28, 0.35));
          stageAnchors.set("ch2", new THREE.Vector3(-0.22, 0.28, 1.55));
          stageAnchors.set("gnd", new THREE.Vector3(-0.45, 0.24, 1.55));

          rigHooks = {
            updateFrame: () => {
              const st = propsRef.current;
              r1.setActive(Boolean(st.isRunning && st.wifiCh1));
              r2.setActive(Boolean(st.isRunning && st.wifiCh2));
              oled.updateScreen(
                "WIFI HTTP :80",
                [
                  "IP: 192.168.4.1",
                  `CH1 (IO2) : ${st.wifiCh1 ? "ON" : "OFF"}`,
                  `CH2 (IO26): ${st.wifiCh2 ? "ON" : "OFF"}`,
                  "RSSI: -48 dBm",
                ],
                "#22d3ee"
              );
            },
          };
        } else {
          // BLE or ESP-NOW Receiver Beacon Dome + Status LED
          const beaconLed = createDiffusedLed3D(curType === "BLUETOOTH_COMM" ? 0x3b82f6 : 0x10b981, 1.6);
          beaconLed.group.position.set(0.2, 0.16, 0.65);
          const peerBtn = createTactileButton3D(0x22d3ee, 1.2);
          peerBtn.group.position.set(0.2, 0.16, 1.45);
          peerBtn.group.traverse((o) => {
            o.layers.set(1);
            o.userData.peripheralLabel =
              curType === "BLUETOOTH_COMM" ? "BLE Toggle Command" : "ESP-NOW Trigger Button";
            o.userData.peripheralRole = "Click in 3D to send wireless packet";
            o.userData.onAction = () => propsRef.current.onToggleWifiChannel?.(1);
          });
          periphGroup.add(beaconLed.group, peerBtn.group);

          rigHooks = {
            updateFrame: () => {
              const st = propsRef.current;
              const active = Boolean(st.isRunning && (st.gpio2Lit || (st.espNowCount ?? 0) > 0));
              beaconLed.setIntensity(active ? 1 : 0.15);
              if (curType === "BLUETOOTH_COMM") {
                oled.updateScreen(
                  "BLE SPP BRIDGE",
                  [
                    "DEV: IST_ESP32",
                    `LED: ${st.gpio2Lit ? "HIGH" : "LOW"}`,
                    "UUID: 0xFFE0",
                    "LINK: PAIRED",
                  ],
                  "#3b82f6"
                );
              } else {
                oled.updateScreen(
                  "ESP-NOW MESH",
                  [
                    "CH1 · 250B FRAME",
                    `PACKETS: ${st.espNowCount ?? 0}`,
                    "LATENCY: 3.8 ms",
                    "ACK: 100% OK",
                  ],
                  "#10b981"
                );
              }
            },
          };
        }
      } else if (curType === "BUZZER_SIREN") {
        // Active Piezo Buzzer Cylinder + Expanding Concentric Acoustic Wave Rings
        const buzzBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.48, 0.44, 24),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38, metalness: 0.1 })
        );
        buzzBody.position.set(0.18, 0.38, 0);
        buzzBody.castShadow = true;
        buzzBody.layers.set(1);
        buzzBody.userData.peripheralLabel = "Piezo Acoustic Buzzer";
        buzzBody.userData.peripheralRole = "LEDC GPIO 18 PWM Carrier";

        const brassPlate = new THREE.Mesh(
          new THREE.CylinderGeometry(0.17, 0.17, 0.03, 18),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
        );
        brassPlate.position.set(0.18, 0.605, 0);
        periphGroup.add(buzzBody, brassPlate);
        stageAnchors.set("buzzer", new THREE.Vector3(-0.22, 0.26, -0.08));
        stageAnchors.set("gnd", new THREE.Vector3(-0.22, 0.24, 0.14));

        const soundRings: THREE.Mesh[] = [];
        const soundMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        for (let i = 0; i < 3; i++) {
          const rMesh = new THREE.Mesh(new THREE.RingGeometry(0.32, 0.38, 28), soundMat);
          rMesh.rotation.x = -Math.PI / 2;
          rMesh.position.set(0.18, 0.64, 0);
          periphGroup.add(rMesh);
          soundRings.push(rMesh);
        }

        rigHooks = {
          updateFrame: (_d, elapsed) => {
            const on = propsRef.current.isRunning && !propsRef.current.reducedMotion;
            soundRings.forEach((sr, idx) => {
              sr.visible = propsRef.current.isRunning;
              const p = on ? (elapsed * 1.4 + idx * 0.33) % 1 : idx * 0.33;
              sr.position.y = 0.62 + p * 1.1;
              const sc = 1 + p * 1.7;
              sr.scale.set(sc, sc, 1);
            });
          },
        };
      } else if (curType === "TOUCH_PIANO") {
        // 5 Clickable Labeled Copper Capacitive Touch Pads (C5 D5 E5 F5 G5)
        const notes = [
          { key: "C5", freq: 523, z: -1.45 },
          { key: "D5", freq: 587, z: -0.72 },
          { key: "E5", freq: 659, z: 0 },
          { key: "F5", freq: 698, z: 0.72 },
          { key: "G5", freq: 784, z: 1.45 },
        ];
        const padHandles: {
          key: string;
          mesh: THREE.Mesh;
          mat: THREE.MeshStandardMaterial;
        }[] = [];

        notes.forEach((n, idx) => {
          const tex = createPianoKeyTexture(n.key, n.freq, maxAniso);
          const padMat = new THREE.MeshStandardMaterial({
            map: tex,
            metalness: 0.45,
            roughness: 0.25,
            emissive: 0x22d3ee,
            emissiveIntensity: 0,
          });
          const pad = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.09, 0.56), padMat);
          pad.position.set(0.22, 0.21, n.z);
          pad.castShadow = true;
          pad.layers.set(1);
          pad.userData.peripheralLabel = `Capacitive Touch Key ${n.key} (${n.freq} Hz)`;
          pad.userData.peripheralRole = "Click directly in 3D to play musical note!";
          pad.userData.onAction = () => propsRef.current.onPressPianoKey?.(n.key, n.freq);
          periphGroup.add(pad);
          padHandles.push({ key: n.key, mesh: pad, mat: padMat });
          stageAnchors.set(`key_${idx}`, new THREE.Vector3(-0.28, 0.23, n.z));
        });
        stageAnchors.set("buzzer", new THREE.Vector3(-0.32, 0.24, 1.72));

        rigHooks = {
          updateFrame: (delta) => {
            const active = propsRef.current.activePianoKey;
            padHandles.forEach((ph) => {
              const isHit = ph.key === active;
              ph.mesh.position.y = THREE.MathUtils.damp(ph.mesh.position.y, isHit ? 0.165 : 0.21, 14, delta);
              ph.mat.emissiveIntensity = isHit ? 1.5 : 0.04;
            });
          },
        };
      } else if (curType === "RGB_RING") {
        // 12-Pixel WS2812B Circular NeoPixel Ring on Vertical Stand
        const stand = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.5, 0.24),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
        );
        stand.position.set(0.18, 0.4, 0);
        const ringBoard = new THREE.Mesh(
          new THREE.TorusGeometry(0.95, 0.14, 12, 36),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.2 })
        );
        ringBoard.rotation.y = Math.PI / 2;
        ringBoard.position.set(0.18, 1.35, 0);
        ringBoard.castShadow = true;
        periphGroup.add(stand, ringBoard);

        const pixMats: THREE.MeshStandardMaterial[] = [];
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          const pMat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            emissive: 0x22d3ee,
            emissiveIntensity: 0.2,
            roughness: 0.2,
          });
          const pMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), pMat);
          pMesh.position.set(0.05, 1.35 + Math.cos(ang) * 0.95, Math.sin(ang) * 0.95);
          periphGroup.add(pMesh);
          pixMats.push(pMat);
        }
        const r330 = createResistor3D(330, 0.9);
        r330.group.position.set(-0.36, 0.24, 0.25);
        periphGroup.add(r330.group);
        stageAnchors.set("din", new THREE.Vector3(-0.48, 0.26, 0.25));
        stageAnchors.set("vcc", new THREE.Vector3(-0.25, 0.24, -0.25));
        stageAnchors.set("gnd", new THREE.Vector3(-0.25, 0.24, 0.55));

        rigHooks = {
          updateFrame: () => {
            const st = propsRef.current;
            const curTick = st.tick ?? 0;
            const mode = st.ringMode ?? "CHASE";
            const activeIdx = curTick % 12;
            pixMats.forEach((m, i) => {
              if (!st.isRunning) {
                m.emissiveIntensity = 0.05;
                return;
              }
              if (mode === "CYAN") {
                m.emissive.setHex(0x22d3ee);
                m.emissiveIntensity = 2.4;
              } else if (mode === "RAINBOW") {
                const hue = ((i * 30 + curTick * 20) % 360) / 360;
                m.emissive.setHSL(hue, 0.9, 0.5);
                m.emissiveIntensity = 2.4;
              } else {
                const isLead = i === activeIdx;
                const isTail = (i + 1) % 12 === activeIdx;
                m.emissive.setHex(isLead ? 0x22d3ee : isTail ? 0x0284c7 : 0x0f172a);
                m.emissiveIntensity = isLead ? 2.8 : isTail ? 1.2 : 0.05;
              }
            });
          },
        };
      } else if (curType === "MOOD_LAMP") {
        // Mini Breadboard + 3x 220Ω EIA Resistors (R/G/B) + Frosted Acrylic RGB Diffuser Dome
        const miniBb = createMiniBreadboard3D(1.35, 2.2, maxAniso);
        miniBb.position.set(-0.1, 0.16, 0.88);
        periphGroup.add(miniBb);

        const rR = createResistor3D(220, 0.9);
        rR.group.position.set(-0.1, 0.32, 0.35);
        const rG = createResistor3D(220, 0.9);
        rG.group.position.set(-0.1, 0.32, 0.85);
        const rB = createResistor3D(220, 0.9);
        rB.group.position.set(-0.1, 0.32, 1.35);
        periphGroup.add(rR.group, rG.group, rB.group);

        const lampBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.56, 0.64, 0.32, 24),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.4 })
        );
        lampBase.position.set(0.22, 0.32, -1.05);
        lampBase.castShadow = true;

        const domeMat = new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          emissive: 0x22d3ee,
          emissiveIntensity: 1.6,
          roughness: 0.25,
          transparent: true,
          opacity: 0.9,
          clearcoat: 0.8,
        });
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.72),
          domeMat
        );
        dome.position.set(0.22, 0.75, -1.05);
        periphGroup.add(lampBase, dome);

        stageAnchors.set("r", new THREE.Vector3(-0.34, 0.34, 0.35));
        stageAnchors.set("g", new THREE.Vector3(-0.34, 0.34, 0.85));
        stageAnchors.set("b", new THREE.Vector3(-0.34, 0.34, 1.35));
        stageAnchors.set("gnd", new THREE.Vector3(0.32, 0.32, 1.65));

        rigHooks = {
          updateFrame: () => {
            const st = propsRef.current;
            domeMat.emissive.set(st.activeColorHex || "#22d3ee");
            domeMat.emissiveIntensity = st.isRunning ? 2.0 : 0.1;
          },
        };
      } else if (curType === "LIGHT_SENSOR") {
        // Mini Breadboard + LDR Photoresistor + 10kΩ Divider + Volumetric Light Cone + Night Lamp + OLED
        const miniBb = createMiniBreadboard3D(1.45, 3.6, maxAniso);
        miniBb.position.set(0.18, 0.16, 0);
        periphGroup.add(miniBb);

        const ldrBoard = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.08, 0.7),
          new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.45 })
        );
        ldrBoard.position.set(0.18, 0.36, -0.8);
        const ldrDisc = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.06, 18),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 })
        );
        ldrDisc.position.set(0.18, 0.42, -0.8);
        const r10k = createResistor3D(10000, 0.9);
        r10k.group.position.set(0.18, 0.32, -0.15);

        const nightLamp = createDiffusedLed3D(0xfbbf24, 1.55);
        nightLamp.group.position.set(0.18, 0.32, 0.35);

        const oled = createOledDisplay3D(maxAniso);
        oled.group.position.set(0.18, 0.32, 1.15);

        const sunMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), sunMat);
        sunOrb.position.set(0.18, 1.8, -0.8);

        const rayMat = new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
        });
        const rayCone = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.38, 1.3, 18), rayMat);
        rayCone.position.set(0.18, 1.1, -0.8);
        periphGroup.add(ldrBoard, ldrDisc, r10k.group, nightLamp.group, oled.group, sunOrb, rayCone);
        stageAnchors.set("vcc", new THREE.Vector3(-0.35, 0.36, -0.8));
        stageAnchors.set("ldr", new THREE.Vector3(0.02, 0.36, -0.15));
        stageAnchors.set("gnd", new THREE.Vector3(0.42, 0.34, -0.15));
        stageAnchors.set("led", new THREE.Vector3(0.18, 0.34, 0.35));

        rigHooks = {
          updateFrame: () => {
            const st = propsRef.current;
            const lux = st.ambientLux ?? 420;
            const norm = THREE.MathUtils.clamp(lux / 1000, 0.05, 1);
            sunOrb.scale.setScalar(0.55 + norm * 0.85);
            sunMat.color.setHSL(0.13, 0.9, 0.25 + norm * 0.5);
            rayMat.opacity = norm * 0.26;
            nightLamp.setIntensity(st.isRunning && lux < 250 ? 1 : 0);
            const adcRaw = Math.round(norm * 4095);
            oled.updateScreen(
              "LDR 12-BIT ADC",
              [
                `LUX : ${lux} lx`,
                `ADC1: ${adcRaw} / 4095`,
                `VOLT: ${((adcRaw / 4095) * 3.3).toFixed(2)} V`,
                `LAMP: ${lux < 250 ? "NIGHT ON" : "DAY OFF"}`,
              ],
              lux < 250 ? "#fbbf24" : "#22d3ee"
            );
          },
        };
      } else if (curType === "ULTRASONIC_METER" || curType === "ULTRASONIC_RADAR") {
        // HC-SR04 (on SG90 Servo for Radar) + Sliding Barrier Wall / Acoustic Rings
        const servoRig = createSg90Servo3D();
        servoRig.group.position.set(-0.05, 0.16, 0.2);

        const hc = createUltrasonicHcSr043D(maxAniso);
        if (curType === "ULTRASONIC_RADAR") {
          hc.group.position.set(0, 0.06, 0);
          servoRig.hornPivot.add(hc.group);
          periphGroup.add(servoRig.group);
        } else {
          hc.group.position.set(0.1, 0.18, -0.95);
          periphGroup.add(hc.group);
        }

        const wallMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          roughness: 0.4,
          metalness: 0.2,
        });
        const barrierWall = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.72, 0.14), wallMat);
        barrierWall.position.set(0.1, 0.52, 1.45);
        barrierWall.castShadow = true;
        barrierWall.layers.set(1);
        barrierWall.userData.peripheralLabel = "Acoustic Target Obstacle";
        barrierWall.userData.peripheralRole = "Position synced to Ultrasonic Echo Distance";
        // Mini Breadboard with real 1kΩ + 2kΩ ECHO protection voltage divider resistors
        const dividerBb = createMiniBreadboard3D(1.05, 1.35, maxAniso);
        dividerBb.position.set(-0.22, 0.16, -1.52);
        const r1k = createResistor3D(1000, 0.85);
        r1k.group.position.set(-0.22, 0.32, -1.72);
        const r2k = createResistor3D(2000, 0.85);
        r2k.group.position.set(-0.22, 0.32, -1.32);
        periphGroup.add(dividerBb, r1k.group, r2k.group, barrierWall);

        stageAnchors.set("servo", new THREE.Vector3(-0.22, 0.36, 0.2));
        stageAnchors.set("vcc", new THREE.Vector3(0.1, 0.25, -0.95));
        stageAnchors.set("trig", new THREE.Vector3(-0.1, 0.25, -0.95));
        stageAnchors.set("echo", new THREE.Vector3(-0.42, 0.34, -1.72));
        stageAnchors.set("gnd", new THREE.Vector3(-0.42, 0.34, -1.32));

        rigHooks = {
          updateFrame: (_d, elapsed) => {
            const st = propsRef.current;
            const cm = curType === "ULTRASONIC_RADAR" ? (st.radarEchoCm ?? 100) : st.ultrasonicCm;
            if (curType === "ULTRASONIC_RADAR") {
              servoRig.setAngleDeg(st.radarAngleDeg ?? 90);
            }
            const wallZ = THREE.MathUtils.clamp((cm / 250) * 2.3 - 0.35, -0.35, 1.9);
            barrierWall.position.z = wallZ;
            wallMat.color.setHex(cm < 25 ? 0xf43f5e : cm < 60 ? 0xf59e0b : 0x10b981);
            hc.setWaveProgress((elapsed * 0.9) % 1, Math.max(0.5, wallZ + 0.6), st.isRunning);
          },
        };
      } else if (curType === "DC_MOTOR") {
        // L298N Dual H-Bridge + Glowing Direction Status LEDs + Screw Terminals + Geared Motor & Encoder Wheel
        const hBridgePcb = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 0.1, 1.1),
          new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.42 })
        );
        hBridgePcb.position.set(0.15, 0.21, -0.95);
        const heatsink = new THREE.Mesh(
          new THREE.BoxGeometry(0.54, 0.46, 0.28),
          new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.28 })
        );
        heatsink.position.set(0.15, 0.45, -1.15);
        heatsink.castShadow = true;

        const screwBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.22, 0.24),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
        );
        screwBlock.position.set(0.15, 0.31, -0.58);

        const cwLed = createDiffusedLed3D(0x10b981, 0.9);
        cwLed.group.position.set(-0.22, 0.26, -0.62);
        const ccwLed = createDiffusedLed3D(0xf59e0b, 0.9);
        ccwLed.group.position.set(0.52, 0.26, -0.62);

        const motorRig = createDcMotorWheel3D();
        motorRig.group.position.set(0.15, 0.18, 0.72);
        motorRig.group.traverse((o) => {
          o.layers.set(1);
          o.userData.peripheralLabel = "DC Geared Motor + Encoder Wheel";
          o.userData.peripheralRole = "L298N H-Bridge PWM Speed & Direction";
        });
        periphGroup.add(hBridgePcb, heatsink, screwBlock, cwLed.group, ccwLed.group, motorRig.group);
        // Twisted motor armature leads from L298N screw terminals -> DC Motor terminals
        const motLeadA = createFlowingWire3D(
          [
            new THREE.Vector3(0.02, 0.34, -0.46),
            new THREE.Vector3(-0.08, 0.44, 0.12),
            new THREE.Vector3(-0.02, 0.32, 0.56),
          ],
          0x22d3ee,
          { radius: 0.02, packetCount: 3, packetLength: 0.1, layer: 1 }
        );
        const motLeadB = createFlowingWire3D(
          [
            new THREE.Vector3(0.28, 0.34, -0.46),
            new THREE.Vector3(0.36, 0.44, 0.12),
            new THREE.Vector3(0.32, 0.32, 0.56),
          ],
          0xf59e0b,
          { radius: 0.02, packetCount: 3, packetLength: 0.1, reverse: true, layer: 1 }
        );
        periphGroup.add(motLeadA.group, motLeadB.group);
        stageAnchors.set("ena", new THREE.Vector3(-0.34, 0.28, -0.95));
        stageAnchors.set("in1", new THREE.Vector3(-0.34, 0.28, -0.78));
        stageAnchors.set("in2", new THREE.Vector3(-0.34, 0.28, -0.62));
        stageAnchors.set("gnd", new THREE.Vector3(0.55, 0.28, -0.62));

        rigHooks = {
          updateFrame: (delta, elapsed) => {
            const st = propsRef.current;
            const mActive = Boolean(st.isRunning && Math.abs(st.motorSpeedNorm) > 0.03);
            const rev = (st.motorSpeedNorm ?? 0) < 0;
            motLeadA.update(elapsed, mActive, 1 + Math.abs(st.motorSpeedNorm ?? 0), rev);
            motLeadB.update(elapsed, mActive, 1 + Math.abs(st.motorSpeedNorm ?? 0), !rev);
            cwLed.setIntensity(st.isRunning && st.motorSpeedNorm > 0.02 ? 1 : 0);
            ccwLed.setIntensity(st.isRunning && st.motorSpeedNorm < -0.02 ? 1 : 0);
            if (st.isRunning && !st.reducedMotion) {
              motorRig.stepSpin(delta, st.motorSpeedNorm);
            }
          },
        };
      } else if (curType === "LASER_BARRIER") {
        // 650nm Brass Laser Diode Emitter + Red Beam Cylinder + Clickable Blocker Paddle + LDR Receiver
        const laserBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.55, 16),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.22 })
        );
        laserBody.rotation.x = Math.PI / 2;
        laserBody.position.set(0.15, 0.48, -1.45);
        periphGroup.add(laserBody);

        const rxTarget = new THREE.Mesh(
          new THREE.BoxGeometry(0.36, 0.45, 0.14),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
        );
        rxTarget.position.set(0.15, 0.48, 1.45);
        periphGroup.add(rxTarget);

        const beamMat = new THREE.MeshBasicMaterial({
          color: 0xff1e42,
          transparent: true,
          opacity: 0.85,
        });
        const beamFront = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 2.8, 10), beamMat);
        beamFront.rotation.x = Math.PI / 2;
        beamFront.position.set(0.15, 0.48, 0);
        periphGroup.add(beamFront);

        const blocker = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.7, 0.1),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 })
        );
        blocker.position.set(0.75, 0.52, 0);
        blocker.layers.set(1);
        blocker.userData.peripheralLabel = "Optical Interrupter Paddle";
        blocker.userData.peripheralRole = "Click in 3D to break/restore laser beam!";
        blocker.userData.onAction = () => propsRef.current.onToggleBeam?.();
        periphGroup.add(blocker);

        const sirenLed = createDiffusedLed3D(0xf43f5e, 1.35);
        sirenLed.group.position.set(-0.35, 0.16, 1.45);
        periphGroup.add(sirenLed.group);
        stageAnchors.set("laser", new THREE.Vector3(0.15, 0.38, -1.45));
        stageAnchors.set("ldr", new THREE.Vector3(0.15, 0.36, 1.45));
        stageAnchors.set("buzzer", new THREE.Vector3(-0.35, 0.28, 1.45));
        stageAnchors.set("gnd", new THREE.Vector3(-0.2, 0.22, 1.45));

        rigHooks = {
          updateFrame: (delta) => {
            const st = propsRef.current;
            const broken = Boolean(st.beamBroken);
            blocker.position.x = THREE.MathUtils.damp(blocker.position.x, broken ? 0.15 : 0.78, 10, delta);
            beamFront.scale.y = broken ? 0.48 : 1;
            beamFront.position.z = broken ? -0.72 : 0;
            sirenLed.setIntensity(st.isRunning && st.alarmLatched ? 1 : 0);
          },
        };
      } else if (curType === "SMART_PARKING") {
        // Two clickable parking bays + Servo Boom Gate
        const boomServo = createSg90Servo3D();
        boomServo.group.position.set(-0.35, 0.16, -1.35);
        const boomBar = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, 0.06, 0.09),
          new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
        );
        boomBar.position.set(0.55, 0.04, 0);
        boomServo.hornPivot.add(boomBar);
        periphGroup.add(boomServo.group);

        const buildCar = (color: number, zPos: number, slot: "s1" | "s2") => {
          const bayPad = new THREE.Mesh(
            new THREE.BoxGeometry(0.95, 0.03, 0.85),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })
          );
          bayPad.position.set(0.28, 0.18, zPos);
          bayPad.layers.set(1);
          bayPad.userData.peripheralLabel = `Parking Bay ${slot === "s1" ? "1" : "2"}`;
          bayPad.userData.peripheralRole = "Click in 3D to toggle Vehicle Presence";
          bayPad.userData.onAction = () => propsRef.current.onToggleParkingSlot?.(slot);
          periphGroup.add(bayPad);

          const carGrp = new THREE.Group();
          carGrp.position.set(0.28, 0.28, zPos);
          const chassis = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.22, 0.42),
            new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.35 })
          );
          const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.16, 0.34),
            new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2 })
          );
          cabin.position.y = 0.16;
          carGrp.add(chassis, cabin);
          carGrp.traverse((o) => {
            o.layers.set(1);
            o.userData.peripheralLabel = `Bay ${slot === "s1" ? "1" : "2"} Vehicle`;
            o.userData.peripheralRole = "Click in 3D to vacate/park bay";
            o.userData.onAction = () => propsRef.current.onToggleParkingSlot?.(slot);
          });
          periphGroup.add(carGrp);
          return carGrp;
        };

        const car1 = buildCar(0x38bdf8, 0.0, "s1");
        const car2 = buildCar(0xf59e0b, 1.15, "s2");

        rigHooks = {
          updateFrame: (delta) => {
            const slots = propsRef.current.parkingSlots ?? { s1: false, s2: true, gateOpen: false };
            car1.visible = slots.s1;
            car2.visible = slots.s2;
            const targetDeg = slots.gateOpen ? 90 : 0;
            boomServo.hornPivot.rotation.z = THREE.MathUtils.damp(
              boomServo.hornPivot.rotation.z,
              THREE.MathUtils.degToRad(targetDeg),
              8,
              delta
            );
          },
        };
      } else if (curType === "WATER_PUMP") {
        // Relay Module + 1N4007 Flyback Diode + Translucent Animated Water Hose + Planter Pot + Moisture Probe
        const relay = createRelayModule3D("PUMP RELAY", maxAniso);
        relay.group.position.set(0.18, 0.16, -1.35);
        periphGroup.add(relay.group);

        // 1N4007 flyback diode body across relay load terminals
        const diodeBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 0.34, 12),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 })
        );
        diodeBody.rotation.z = Math.PI / 2;
        diodeBody.position.set(0.18, 0.32, -0.78);
        const cathodeBand = new THREE.Mesh(
          new THREE.CylinderGeometry(0.063, 0.063, 0.07, 12),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
        );
        cathodeBand.rotation.z = Math.PI / 2;
        cathodeBand.position.set(0.28, 0.32, -0.78);
        periphGroup.add(diodeBody, cathodeBand);

        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(0.52, 0.38, 0.65, 20),
          new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.7 })
        );
        pot.position.set(0.2, 0.48, 0.65);
        pot.castShadow = true;

        const soilMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.05, 18), soilMat);
        soil.position.set(0.2, 0.79, 0.65);

        const plantStem = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.05, 0.42, 10),
          new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.55 })
        );
        plantStem.position.set(0.15, 0.98, 0.65);

        // Capacitive soil probe inserted into pot
        const probePcb = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.42, 0.04),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
        );
        probePcb.position.set(-0.08, 0.92, 0.65);

        // Animated translucent water delivery hose from relay pump into pot
        const waterPipe = createAnimatedPipeFlow3D(
          [
            new THREE.Vector3(0.32, 0.36, -0.95),
            new THREE.Vector3(0.45, 0.95, -0.35),
            new THREE.Vector3(0.38, 1.38, 0.25),
            new THREE.Vector3(0.24, 1.18, 0.56),
          ],
          0.055,
          7
        );

        periphGroup.add(pot, soil, plantStem, probePcb, waterPipe.group);
        stageAnchors.set("moist", new THREE.Vector3(-0.08, 1.06, 0.65));
        stageAnchors.set("relay", new THREE.Vector3(-0.22, 0.26, -1.35));
        stageAnchors.set("vcc", new THREE.Vector3(-0.08, 1.0, 0.65));
        stageAnchors.set("gnd", new THREE.Vector3(0.4, 0.24, -1.35));

        const drops: THREE.Mesh[] = [];
        const dropMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        for (let i = 0; i < 6; i++) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), dropMat);
          d.position.set(0.22 + (i % 2) * 0.06, 1.15 - i * 0.1, 0.58);
          periphGroup.add(d);
          drops.push(d);
        }

        rigHooks = {
          updateFrame: (_d, elapsed) => {
            const st = propsRef.current;
            const wet = (st.moisturePct ?? 50) / 100;
            soilMat.color.setRGB(0.34 - wet * 0.2, 0.16 - wet * 0.08, 0.05);
            const active = Boolean(st.isRunning && st.pumpOn);
            relay.setActive(active);
            waterPipe.update(elapsed * 0.95, active);
            drops.forEach((d, idx) => {
              d.visible = active;
              if (active) {
                const p = (elapsed * 1.8 + idx * 0.16) % 1;
                d.position.y = 1.15 - p * 0.36;
              }
            });
          },
        };
      } else if (curType === "KEYPAD_LOCK") {
        // Crisp CanvasTexture 4x4 Matrix Keypad + Live OLED PIN Prompt + Servo Deadbolt
        const keypad = createKeypad4x43D(maxAniso);
        keypad.group.position.set(0.2, 0.16, -0.82);
        keypad.keys.forEach((kEntry) => {
          kEntry.mesh.layers.set(1);
          kEntry.mesh.userData.peripheralLabel = `Keypad Key '${kEntry.key}'`;
          kEntry.mesh.userData.peripheralRole = "Click in 3D to enter PIN (1234 + #)";
          kEntry.mesh.userData.onAction = () => propsRef.current.onPressKeypadKey?.(kEntry.key);
        });
        periphGroup.add(keypad.group);

        const oled = createOledDisplay3D(maxAniso);
        oled.group.position.set(0.22, 0.16, 0.55);
        periphGroup.add(oled.group);

        const boltHousing = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.36, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.35 })
        );
        boltHousing.position.set(0.15, 0.34, 1.48);
        const bolt = new THREE.Mesh(
          new THREE.BoxGeometry(0.65, 0.18, 0.18),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
        );
        bolt.position.set(0.55, 0.34, 1.48);
        periphGroup.add(boltHousing, bolt);
        stageAnchors.set("rows", new THREE.Vector3(-0.34, 0.24, -1.05));
        stageAnchors.set("cols", new THREE.Vector3(-0.34, 0.24, -0.55));
        stageAnchors.set("servo", new THREE.Vector3(0.05, 0.32, 1.48));

        rigHooks = {
          updateFrame: (delta) => {
            const st = propsRef.current;
            const targetX = st.doorUnlocked ? 0.22 : 0.65;
            bolt.position.x = THREE.MathUtils.damp(bolt.position.x, targetX, 9, delta);
            const masked = (st.enteredPin || "").replace(/./g, "*");
            oled.updateScreen(
              st.doorUnlocked ? "DOOR UNLOCKED" : "ENTER PIN (1234)",
              [
                `CODE: ${masked || "____"}`,
                `BOLT: ${st.doorUnlocked ? "RETRACTED" : "LOCKED"}`,
                "#: VERIFY  *: CLR",
                "MATRIX: 4x4 GPIO",
              ],
              st.doorUnlocked ? "#10b981" : "#f59e0b"
            );
          },
        };
      } else if (curType === "SOLAR_TRACKING") {
        // Monocrystalline Tilting Solar Panel + Overhead Glowing Sun Orb
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.12, 0.72, 14),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
        );
        mast.position.set(0.15, 0.52, 0);
        const panelPivot = new THREE.Group();
        panelPivot.position.set(0.15, 0.9, 0);
        const solarPanel = createSolarPanel3D(maxAniso);
        panelPivot.add(solarPanel);

        const sunSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.24, 18, 14),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        sunSphere.position.set(0.15, 2.2, 0);
        periphGroup.add(mast, panelPivot, sunSphere);
        stageAnchors.set("east", new THREE.Vector3(-0.25, 0.35, -0.55));
        stageAnchors.set("west", new THREE.Vector3(-0.25, 0.35, 0.55));
        stageAnchors.set("servo", new THREE.Vector3(0.15, 0.52, 0));
        stageAnchors.set("gnd", new THREE.Vector3(0.35, 0.24, 0));

        rigHooks = {
          updateFrame: (delta) => {
            const ang = propsRef.current.sunAngle ?? 65;
            const tiltRad = THREE.MathUtils.degToRad(ang - 90);
            panelPivot.rotation.z = THREE.MathUtils.damp(panelPivot.rotation.z, -tiltRad * 0.75, 8, delta);
            sunSphere.position.x = 0.15 + Math.sin(tiltRad) * 1.45;
            sunSphere.position.y = 1.15 + Math.cos(tiltRad) * 1.2;
          },
        };
      } else {
        // PICK_AND_PLACE (3-DOF Articulated Servo Arm + Cargo Pickup Cube + Source/Drop Pads)
        const basePedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.48, 0.54, 0.24, 22),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.3 })
        );
        basePedestal.position.set(0.15, 0.28, 0);
        const armBasePivot = new THREE.Group();
        armBasePivot.position.set(0.15, 0.42, 0);

        const shoulderPivot = new THREE.Group();
        shoulderPivot.position.set(0, 0.18, 0);
        const lowerArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.95, 0.16),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
        );
        lowerArm.position.y = 0.45;
        lowerArm.castShadow = true;

        const foreArm = new THREE.Mesh(
          new THREE.BoxGeometry(0.85, 0.14, 0.14),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
        );
        foreArm.position.set(0.4, 0.88, 0);
        foreArm.castShadow = true;

        const clawA = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.06, 0.05),
          new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
        );
        clawA.position.set(0.88, 0.88, 0.1);
        const clawB = clawA.clone();
        clawB.position.z = -0.1;

        const cargoCube = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.22, 0.22),
          new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.25 })
        );
        cargoCube.position.set(0.95, 0.84, 0);
        cargoCube.castShadow = true;

        shoulderPivot.add(lowerArm, foreArm, clawA, clawB, cargoCube);
        armBasePivot.add(shoulderPivot);

        const pickPad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 0.04, 18),
          new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5 })
        );
        pickPad.position.set(0.65, 0.18, 1.15);
        const dropPad = new THREE.Mesh(
          new THREE.CylinderGeometry(0.26, 0.28, 0.04, 18),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 })
        );
        dropPad.position.set(0.65, 0.18, -1.15);

        // Mount 3 visible MG90S Servo Driver Blocks + External 5V 3A BEC Terminal
        const sBase = createSg90Servo3D();
        sBase.group.position.set(-0.42, 0.16, -0.75);
        sBase.group.scale.setScalar(0.65);
        const sShoulder = createSg90Servo3D();
        sShoulder.group.position.set(-0.42, 0.16, 0.0);
        sShoulder.group.scale.setScalar(0.65);
        const sGrip = createSg90Servo3D();
        sGrip.group.position.set(-0.42, 0.16, 0.75);
        sGrip.group.scale.setScalar(0.65);

        const becBlock = new THREE.Mesh(
          new THREE.BoxGeometry(0.45, 0.22, 0.45),
          new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 })
        );
        becBlock.position.set(-0.45, 0.27, 1.48);

        periphGroup.add(
          basePedestal,
          armBasePivot,
          pickPad,
          dropPad,
          sBase.group,
          sShoulder.group,
          sGrip.group,
          becBlock
        );

        stageAnchors.set("s1", new THREE.Vector3(-0.48, 0.26, -0.75));
        stageAnchors.set("s2", new THREE.Vector3(-0.48, 0.26, 0.0));
        stageAnchors.set("s3", new THREE.Vector3(-0.48, 0.26, 0.75));
        stageAnchors.set("gnd", new THREE.Vector3(-0.45, 0.34, 1.48));

        rigHooks = {
          updateFrame: (delta) => {
            const j = propsRef.current.armJoints ?? { base: 30, shoulder: 75, grip: 0, auto: false };
            armBasePivot.rotation.y = THREE.MathUtils.damp(
              armBasePivot.rotation.y,
              THREE.MathUtils.degToRad(j.base - 90),
              7,
              delta
            );
            shoulderPivot.rotation.z = THREE.MathUtils.damp(
              shoulderPivot.rotation.z,
              THREE.MathUtils.degToRad((j.shoulder - 75) * 0.55),
              7,
              delta
            );
            sBase.setAngleDeg(j.base);
            sShoulder.setAngleDeg(j.shoulder);
            sGrip.setAngleDeg(j.grip ? 120 : 25);
            const gripZ = j.grip ? 0.045 : 0.12;
            clawA.position.z = THREE.MathUtils.damp(clawA.position.z, gripZ, 10, delta);
            clawB.position.z = THREE.MathUtils.damp(clawB.position.z, -gripZ, 10, delta);
            cargoCube.visible = j.grip === 1;
          },
        };
      }
    };

    // =========================================================================
    // C. ANIMATED 3D WIRING CONNECTIONS GROUP (Preset + Custom User Wires)
    // =========================================================================
    const wireGroup = new THREE.Group();
    scene.add(wireGroup);
    let activeWires: DynamicWireHandle[] = [];

    const resolveStageLocalAnchor = (row: Esp32WiringRow, idx: number): THREE.Vector3 | undefined => {
      const comp = row.toComponent.toLowerCase();
      const pin = row.toPin.toLowerCase();
      if (row.signalType === "GND" && stageAnchors.has("gnd")) return stageAnchors.get("gnd");
      if (row.signalType === "POWER" && stageAnchors.has("vcc")) return stageAnchors.get("vcc");
      if (comp.includes("red") && stageAnchors.has("red")) return stageAnchors.get("red");
      if (comp.includes("cyan") && stageAnchors.has("cyan")) return stageAnchors.get("cyan");
      if (pin.includes("red") && stageAnchors.has("r")) return stageAnchors.get("r");
      if (pin.includes("green") && stageAnchors.has("g")) return stageAnchors.get("g");
      if (pin.includes("blue") && stageAnchors.has("b")) return stageAnchors.get("b");
      if (comp.includes("reed") && stageAnchors.has("reed")) return stageAnchors.get("reed");
      if (comp.includes("channel 1") && stageAnchors.has("ch1")) return stageAnchors.get("ch1");
      if (comp.includes("channel 2") && stageAnchors.has("ch2")) return stageAnchors.get("ch2");
      if ((comp.includes("buzzer") || comp.includes("speaker")) && stageAnchors.has("buzzer")) return stageAnchors.get("buzzer");
      if (row.signalType === "TOUCH" && stageAnchors.has(`key_${idx}`)) return stageAnchors.get(`key_${idx}`);
      if (comp.includes("ws2812b") && stageAnchors.has("din")) return stageAnchors.get("din");
      if (pin.includes("trig") && stageAnchors.has("trig")) return stageAnchors.get("trig");
      if (pin.includes("echo") && stageAnchors.has("echo")) return stageAnchors.get("echo");
      if (pin.includes("ena") && stageAnchors.has("ena")) return stageAnchors.get("ena");
      if (pin.includes("in1") && comp.includes("l298n") && stageAnchors.has("in1")) return stageAnchors.get("in1");
      if (pin.includes("in2") && comp.includes("l298n") && stageAnchors.has("in2")) return stageAnchors.get("in2");
      if (comp.includes("laser") && stageAnchors.has("laser")) return stageAnchors.get("laser");
      if ((comp.includes("ldr") || comp.includes("receiver")) && stageAnchors.has("ldr")) return stageAnchors.get("ldr");
      if (comp.includes("moisture") && stageAnchors.has("moist")) return stageAnchors.get("moist");
      if (comp.includes("relay") && stageAnchors.has("relay")) return stageAnchors.get("relay");
      if (comp.includes("east") && stageAnchors.has("east")) return stageAnchors.get("east");
      if (comp.includes("west") && stageAnchors.has("west")) return stageAnchors.get("west");
      if (comp.includes("servo 1") && stageAnchors.has("s1")) return stageAnchors.get("s1");
      if (comp.includes("servo 2") && stageAnchors.has("s2")) return stageAnchors.get("s2");
      if (comp.includes("servo 3") && stageAnchors.has("s3")) return stageAnchors.get("s3");
      if (comp.includes("servo") && stageAnchors.has("servo")) return stageAnchors.get("servo");
      if (pin.includes("rows") && stageAnchors.has("rows")) return stageAnchors.get("rows");
      if (pin.includes("cols") && stageAnchors.has("cols")) return stageAnchors.get("cols");
      if (stageAnchors.has("led")) return stageAnchors.get("led");
      return undefined;
    };

    const add3DJumperWire = (
      fromPinLabel: string,
      targetSocketIdx: number,
      wireColorHex: number,
      labelTitle: string,
      labelRole: string,
      isPowerOrGnd: "POWER" | "GND" | "SIG",
      wireIdx: number,
      customWireId?: string,
      endLocalOverride?: THREE.Vector3,
      inboundSignal = false
    ) => {
      const matched = findMatchingPin(fromPinLabel);
      const startLocal = matched
        ? new THREE.Vector3(
            matched.side === "LEFT" ? -1.12 : 1.12,
            0.38,
            -1.45 + matched.index * 0.245
          )
        : new THREE.Vector3(1.12, 0.38, -0.3 + wireIdx * 0.22);

      const startWorld = startLocal.clone().add(boardGroup.position);
      const targetLocal =
        endLocalOverride ??
        targetSocketLocalPositions[targetSocketIdx % targetSocketLocalPositions.length];
      const endWorld = targetLocal.clone().add(periphGroup.position);

      const archHeight = 0.72 + (wireIdx % 4) * 0.19;
      const mid1 = new THREE.Vector3(
        THREE.MathUtils.lerp(startWorld.x, endWorld.x, 0.32),
        archHeight,
        THREE.MathUtils.lerp(startWorld.z, endWorld.z, 0.35)
      );
      const mid2 = new THREE.Vector3(
        THREE.MathUtils.lerp(startWorld.x, endWorld.x, 0.72),
        archHeight * 0.85,
        THREE.MathUtils.lerp(startWorld.z, endWorld.z, 0.75)
      );

      const flow = createFlowingWire3D(
        [startWorld, mid1, mid2, endWorld],
        wireColorHex,
        {
          radius: 0.024,
          tubularSegments: 26,
          radialSegments: 8,
          packetCount: 5,
          packetLength: 0.14,
          packetColorHex: isPowerOrGnd === "GND" ? 0x38bdf8 : undefined,
          speedMult: isPowerOrGnd === "GND" ? 0.62 : 0.95,
          phaseOffset: (wireIdx * 0.21) % 1,
          reverse: inboundSignal,
          layer: 1,
          userData: {
            peripheralLabel: labelTitle,
            peripheralRole: customWireId
              ? `${labelRole} · Click in Wire Mode to remove`
              : labelRole,
            ...(customWireId ? { customWireId } : {}),
          },
        }
      );

      wireGroup.add(flow.group);
      activeWires.push({ flow, isPowerOrGnd });
    };

    const addBenchEquipmentWire = (
      startWorld: THREE.Vector3,
      endWorld: THREE.Vector3,
      colorHex: number,
      archY: number,
      label: string,
      role: string,
      isPowerOrGnd: "POWER" | "GND" | "SIG",
      idx: number
    ) => {
      const m1 = new THREE.Vector3(
        THREE.MathUtils.lerp(startWorld.x, endWorld.x, 0.35),
        archY,
        THREE.MathUtils.lerp(startWorld.z, endWorld.z, 0.35)
      );
      const m2 = new THREE.Vector3(
        THREE.MathUtils.lerp(startWorld.x, endWorld.x, 0.7),
        archY * 0.88,
        THREE.MathUtils.lerp(startWorld.z, endWorld.z, 0.7)
      );
      const flow = createFlowingWire3D([startWorld, m1, m2, endWorld], colorHex, {
        radius: 0.025,
        packetCount: 4,
        packetLength: 0.14,
        speedMult: 0.8,
        phaseOffset: (idx * 0.31) % 1,
        layer: 1,
        userData: { peripheralLabel: label, peripheralRole: role },
      });
      wireGroup.add(flow.group);
      activeWires.push({ flow, isPowerOrGnd });
    };

    const rebuildDynamicWires = () => {
      disposeSceneSubtree(wireGroup);
      wireGroup.clear();
      activeWires = [];

      const {
        pinWiring: wiringList,
        show3DWiring: visibleWires,
        effectiveCustomWires: extraWires,
      } = propsRef.current;
      wireGroup.visible = visibleWires;
      if (!visibleWires) return;

      // Always connect physical DC Bench PSU +5V & GND leads into ESP32 VIN & GND pins
      const psu5vWorld = benchPsu.pos5VLocal
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), benchPsu.group.rotation.y)
        .add(benchPsu.group.position);
      const psuGndWorld = benchPsu.posGndLocal
        .clone()
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), benchPsu.group.rotation.y)
        .add(benchPsu.group.position);

      const vinWorld = new THREE.Vector3(-1.12, 0.38, -1.45 + 14 * 0.245).add(boardGroup.position);
      const gndWorld = new THREE.Vector3(-1.12, 0.38, -1.45 + 13 * 0.245).add(boardGroup.position);

      addBenchEquipmentWire(
        psu5vWorld,
        vinWorld,
        0xef4444,
        0.52,
        "PSU +5.0V → ESP32 VIN",
        "Regulated DC Bench Feed",
        "POWER",
        0
      );
      addBenchEquipmentWire(
        psuGndWorld,
        gndWorld,
        0x475569,
        0.4,
        "PSU 0V GND → ESP32 GND",
        "Common Bench Ground Return",
        "GND",
        1
      );

      // Connect Scope CH1 coax + ground clip into bench measurement bus
      const probeTailWorld = scopeProbe.cableAttachLocal.clone().add(scopeProbe.group.position);
      addBenchEquipmentWire(
        probeTailWorld,
        new THREE.Vector3(1.52, -0.25, -2.55),
        0xfacc15,
        0.85,
        "Oscilloscope CH1 Coax",
        "10x BNC Live Signal Probe",
        "SIG",
        2
      );

      const rows =
        wiringList.length > 0
          ? wiringList
          : [
              {
                fromPin: "G2",
                toComponent: "Onboard/Ext LED",
                toPin: "Anode",
                wireColor: "Cyan",
                signalType: "DIGITAL_OUT" as const,
                notes: "Blink Output",
              },
              {
                fromPin: "GND",
                toComponent: "Breadboard",
                toPin: "Ground Rail",
                wireColor: "Black",
                signalType: "GND" as const,
                notes: "0V Return",
              },
            ];

      rows.forEach((row, idx) => {
        const wireHex = mapWireColorHex(row.wireColor, row.signalType);
        const endLocalOverride = resolveStageLocalAnchor(row, idx);
        const isInbound =
          row.signalType === "DIGITAL_IN" ||
          row.signalType === "ANALOG" ||
          row.signalType === "TOUCH";

        add3DJumperWire(
          row.fromPin,
          idx,
          wireHex,
          `${row.fromPin} → ${row.toComponent}`,
          `${row.signalType} (${row.wireColor} wire)`,
          row.signalType === "GND" ? "GND" : row.signalType === "POWER" ? "POWER" : "SIG",
          idx,
          undefined,
          endLocalOverride,
          isInbound
        );
      });

      extraWires.forEach((cw, cIdx) => {
        add3DJumperWire(
          cw.fromPinLabel,
          cw.targetSocketIdx,
          new THREE.Color(cw.colorHex).getHex(),
          `User Wire: ${cw.fromPinLabel} → Bus #${cw.targetSocketIdx + 1}`,
          "Interactive Custom Jumper",
          "SIG",
          rows.length + cIdx,
          cw.id
        );
      });
    };

    // Camera transition state
    let transitionActive = false;
    const camTargetPos = new THREE.Vector3(4.8, 5.2, 6.2);
    const orbitTargetPos = new THREE.Vector3(0.75, 0.3, 0);

    const applyPreset = (preset: CameraPreset) => {
      transitionActive = true;
      if (preset === "ISO") {
        camTargetPos.set(4.8, 5.2, 6.2);
        orbitTargetPos.set(0.75, 0.3, 0);
      } else if (preset === "TOP") {
        camTargetPos.set(0.7, 9.2, 0.05);
        orbitTargetPos.set(0.7, 0.15, 0);
      } else if (preset === "SHIELD") {
        camTargetPos.set(2.0, 3.1, -3.5);
        orbitTargetPos.set(-0.55, 0.3, -1.0);
      } else if (preset === "BENCH") {
        camTargetPos.set(5.4, 3.4, 2.2);
        orbitTargetPos.set(2.35, 0.25, 0.15);
      } else {
        camTargetPos.set(7.2, 1.6, 0.0);
        orbitTargetPos.set(0.7, 0.25, 0.2);
      }
      requestRender();
    };

    const focusOnPin = (pinLabel: string) => {
      const target = pinCollars.find((p) => p.pin.label === pinLabel);
      if (!target) return;
      transitionActive = true;
      const worldPin = target.localPos.clone().add(boardGroup.position);
      orbitTargetPos.copy(worldPin);
      const sideSign = target.pin.side === "LEFT" ? -1 : 1;
      camTargetPos.set(worldPin.x + sideSign * 2.1, worldPin.y + 2.2, worldPin.z + 2.3);
      requestRender();
    };

    const syncVisualHighlights = () => {
      const {
        selectedPinLabel: sel,
        highlightedPins: hi,
        isRunning: simOn,
        gpio2Lit: g2,
        show3DWiring: wiresVisible,
        pendingSourcePin: pendingPin,
        wiringMode: isWiring,
      } = propsRef.current;

      wireGroup.visible = wiresVisible;
      gpio2LedMat.emissiveIntensity = simOn && g2 ? 3.6 : 0.05;
      gpio2Halo.visible = Boolean(simOn && g2);

      let selectedEntry: (typeof pinCollars)[number] | undefined;
      let hoveredEntry: (typeof pinCollars)[number] | undefined;
      pinCollars.forEach((entry) => {
        const { pin, baseMat, mesh } = entry;
        const isPending = pendingPin === pin.label;
        const isHovered = hoveredPinLabel === pin.label;
        const isSel = sel === pin.label;
        const isHi = hi.includes(pin.label);
        if (isHovered) {
          hoveredEntry = entry;
        }
        if (isPending) {
          selectedEntry = entry;
          baseMat.color.setHex(0xf59e0b);
          baseMat.emissive.setHex(0xf59e0b);
          baseMat.emissiveIntensity = 1.9;
          mesh.scale.set(1.18, 1.18, 1.18);
        } else if (isHovered) {
          const hoverHex = pin.role === "POWER" ? 0xf87171 : pin.role === "GND" ? 0x38bdf8 : 0xfacc15;
          baseMat.color.setHex(hoverHex);
          baseMat.emissive.setHex(hoverHex);
          baseMat.emissiveIntensity = 2.4;
          mesh.scale.set(1.26, 1.32, 1.26);
        } else if (isSel) {
          selectedEntry = entry;
          baseMat.color.setHex(0x22d3ee);
          baseMat.emissive.setHex(0x22d3ee);
          baseMat.emissiveIntensity = 1.65;
          mesh.scale.set(1.12, 1.12, 1.12);
        } else if (isHi) {
          baseMat.color.setHex(0x10b981);
          baseMat.emissive.setHex(0x10b981);
          baseMat.emissiveIntensity = 0.85;
          mesh.scale.set(1.06, 1.06, 1.06);
        } else {
          baseMat.color.setHex(0x1f2937);
          baseMat.emissive.setHex(0x000000);
          baseMat.emissiveIntensity = 0;
          mesh.scale.set(1, 1, 1);
        }
      });

      socketPinMeshes.forEach((sp) => {
        if (isWiring && pendingPin) {
          sp.mat.emissive.setHex(0xf59e0b);
          sp.mat.emissiveIntensity = 1.25;
        } else {
          sp.mat.emissive.setHex(0xfacc15);
          sp.mat.emissiveIntensity = 0.12;
        }
      });

      if (selectedEntry) {
        selRingMesh.visible = true;
        selRingMesh.position.set(selectedEntry.localPos.x, 0.26, selectedEntry.localPos.z);
      } else {
        selRingMesh.visible = false;
      }

      if (hoveredEntry) {
        const hp = hoveredEntry.pin;
        const hoverHex =
          hp.role === "POWER"
            ? 0xf87171
            : hp.role === "GND"
            ? 0x38bdf8
            : hp.capabilities.some((c) => c.includes("ADC") || c.includes("TOUCH"))
            ? 0x10b981
            : 0xfacc15;
        const accentCss =
          hp.role === "POWER"
            ? "#f87171"
            : hp.role === "GND"
            ? "#38bdf8"
            : hp.capabilities.some((c) => c.includes("ADC") || c.includes("TOUCH"))
            ? "#34d399"
            : "#facc15";
        hoverRingMat.color.setHex(hoverHex);
        hoverBeaconMat.color.setHex(hoverHex);
        updatePinHoverSprite(hp, accentCss);
        hoverRingMesh.visible = true;
        hoverBeaconMesh.visible = true;
        pinLabelSprite.visible = true;
        hoverRingMesh.position.set(hoveredEntry.localPos.x, 0.275, hoveredEntry.localPos.z);
        hoverBeaconMesh.position.set(hoveredEntry.localPos.x, 0.51, hoveredEntry.localPos.z);
        pinLabelSprite.position.set(hoveredEntry.localPos.x, 0.92, hoveredEntry.localPos.z);
      } else {
        hoverRingMesh.visible = false;
        hoverBeaconMesh.visible = false;
        pinLabelSprite.visible = false;
      }

      activeWires.forEach((w) => {
        w.flow.wireMat.emissiveIntensity = simOn ? 0.42 : 0.08;
        w.flow.packetInstanced.visible = Boolean(simOn);
      });
    };

    buildLessonPeripheralStage();
    rebuildDynamicWires();
    syncVisualHighlights();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycasting on layer 1
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let lastHoverTime = 0;

    const updatePointer = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const projectWorldToDom = (worldPos: THREE.Vector3) => {
      _projVec.copy(worldPos).project(camera);
      const cw = renderer.domElement.clientWidth;
      const ch = renderer.domElement.clientHeight;
      const x = ((_projVec.x + 1) / 2) * cw;
      const y = ((-_projVec.y + 1) / 2) * ch;
      return {
        x: Math.max(12, Math.min(cw - 260, x + 14)),
        y: Math.max(44, Math.min(ch - 110, y - 32)),
      };
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverTime < 35) return;
      lastHoverTime = now;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const pin = hitObj.userData.pinInfo as Esp32PinInfo | undefined;
        if (pin) {
          if (hoveredPinLabel !== pin.label) {
            hoveredPinLabel = pin.label;
            syncVisualHighlights();
            requestRender();
          }
          renderer.domElement.style.cursor = propsRef.current.wiringMode ? "crosshair" : "pointer";
          hitObj.getWorldPosition(_vec3);
          const pos2d = projectWorldToDom(_vec3);
          setHoveredInfo({
            title: `${pin.label}${pin.gpio !== null && pin.gpio !== undefined ? ` (GPIO ${pin.gpio})` : ""}`,
            subtitle: pin.capabilities.slice(0, 3).join(" · "),
            roleOrNote: propsRef.current.wiringMode
              ? "Click pin to start 3D jumper wire"
              : "Click to inspect · Double-click to zoom pin",
            pinRole: pin.role,
            capabilities: pin.capabilities,
            pinHardwareNote: pin.caution || pin.description,
            x: pos2d.x,
            y: pos2d.y,
          });
          return;
        }
        if (hoveredPinLabel !== null) {
          hoveredPinLabel = null;
          syncVisualHighlights();
          requestRender();
        }
        const periphLabel = hitObj.userData.peripheralLabel as string | undefined;
        if (periphLabel) {
          renderer.domElement.style.cursor =
            propsRef.current.wiringMode && hitObj.userData.targetSocketIdx !== undefined
              ? "crosshair"
              : "pointer";
          const pos2d = projectWorldToDom(hits[0].point);
          setHoveredInfo({
            title: periphLabel,
            subtitle: (hitObj.userData.peripheralRole as string) || "Interactive Bench Module",
            roleOrNote: hitObj.userData.onAction
              ? "Click directly in 3D to interact"
              : hitObj.userData.targetSocketIdx !== undefined && propsRef.current.pendingSourcePin
              ? `Click to connect wire from ${propsRef.current.pendingSourcePin}`
              : "Synced to active experiment state",
            x: pos2d.x,
            y: pos2d.y,
          });
          return;
        }
      }
      if (hoveredPinLabel !== null) {
        hoveredPinLabel = null;
        syncVisualHighlights();
        requestRender();
      }
      renderer.domElement.style.cursor = "grab";
      setHoveredInfo(null);
    };

    let downPos = { x: 0, y: 0 };
    const handlePointerDown = (e: PointerEvent) => {
      downPos = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) > 6) return;
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;

        // 1. Custom wire removal in wiring mode
        const customWireId = hitObj.userData.customWireId as string | undefined;
        if (customWireId && propsRef.current.wiringMode) {
          if (propsRef.current.onRemoveCustomWire) {
            propsRef.current.onRemoveCustomWire(customWireId);
          } else {
            setLocalCustomWires((prev) => prev.filter((w) => w.id !== customWireId));
          }
          return;
        }

        // 2. Pin header click (inspect OR start interactive 3D wire)
        const pin = hitObj.userData.pinInfo as Esp32PinInfo | undefined;
        if (pin) {
          propsRef.current.onSelectPin(pin);
          if (propsRef.current.wiringMode) {
            setPendingSourcePin(pin.label);
            setShow3DWiring(true);
          }
          return;
        }

        // 3. Peripheral socket click (complete interactive 3D wire)
        const sockIdx = hitObj.userData.targetSocketIdx as number | undefined;
        if (sockIdx !== undefined && propsRef.current.pendingSourcePin) {
          const srcLabel = propsRef.current.pendingSourcePin;
          if (propsRef.current.onAddCustomWire) {
            propsRef.current.onAddCustomWire(srcLabel, sockIdx);
          } else {
            const palette = ["#22d3ee", "#f59e0b", "#10b981", "#a855f7", "#ef4444"];
            setLocalCustomWires((prev) => [
              ...prev,
              {
                id: `cw_${Date.now()}`,
                fromPinLabel: srcLabel,
                targetSocketIdx: sockIdx,
                colorHex: palette[prev.length % palette.length],
              },
            ]);
          }
          setPendingSourcePin(null);
          return;
        }

        // 4. Direct 3D peripheral interaction (Magnet, Piano Key, Keypad, Relay, Beam, EN/BOOT)
        const action = hitObj.userData.onAction as (() => void) | undefined;
        if (action) {
          action();
          requestRender();
        }
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      updatePointer(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const pinHit = hits.find((h) => Boolean(h.object.userData.pinInfo));
      if (pinHit) {
        const pin = pinHit.object.userData.pinInfo as Esp32PinInfo;
        propsRef.current.onSelectPin(pin);
        focusOnPin(pin.label);
      }
    };

    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("dblclick", handleDoubleClick);

    let lastReportedZoom = 100;
    const syncZoomPct = () => {
      const next = computeCameraZoomPct(camera, controls);
      if (Math.abs(next - lastReportedZoom) >= 2) {
        lastReportedZoom = next;
        setZoomPct(next);
      }
    };

    const onControlStart = () => {
      transitionActive = false;
    };
    const onControlChange = () => {
      syncZoomPct();
      requestRender();
    };
    controls.addEventListener("start", onControlStart);
    controls.addEventListener("change", onControlChange);

    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    const clock = new THREE.Clock();
    let elapsedTotal = 0;

    function needsContinuousLoop(): boolean {
      const st = propsRef.current;
      return Boolean((st.isRunning || st.autoOrbit) && !st.reducedMotion && st.isPageVisible);
    }

    function requestRender() {
      if (disposed || !propsRef.current.isPageVisible) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const delta = Math.min(0.1, clock.getDelta());
        const st = propsRef.current;

        if (st.isRunning && !st.reducedMotion) {
          elapsedTotal += delta;
        }

        // Tactile EN/BOOT button depression feedback
        const nowMs = performance.now();
        if (btnCaps[0]) btnCaps[0].position.y = nowMs < enPressedUntil ? 0.205 : 0.24;
        if (btnCaps[1]) btnCaps[1].position.y = nowMs < bootPressedUntil ? 0.205 : 0.24;

        // Camera smooth transition or auto-orbit turntable
        if (transitionActive) {
          const t = st.reducedMotion ? 1 : 1 - Math.exp(-6.5 * delta);
          camera.position.lerp(camTargetPos, t);
          controls.target.lerp(orbitTargetPos, t);
          syncZoomPct();
          _vec3.copy(camera.position).sub(camTargetPos);
          _targetVec.copy(controls.target).sub(orbitTargetPos);
          if (_vec3.length() < 0.03 && _targetVec.length() < 0.03) {
            transitionActive = false;
          } else {
            renderDirty = true;
          }
        } else if (st.autoOrbit && !st.reducedMotion) {
          orbitRotateCamera(camera, controls, delta * 0.42, 0);
        }

        // Animate RF antenna wavefronts for Wireless experiments
        const isWireless =
          st.simType === "WIFI_CONTROL" ||
          st.simType === "BLUETOOTH_COMM" ||
          st.simType === "ESPNOW_COMM";
        rfWaveRings.forEach((ring, i) => {
          ring.visible = isWireless && st.isRunning;
          if (ring.visible) {
            const p = st.reducedMotion ? i * 0.33 : (elapsedTotal * 0.8 + i * 0.33) % 1;
            const sc = 1 + p * 4.5;
            ring.scale.set(sc, sc, 1);
          }
        });

        // Animate wire current-flow energy packets + update Bench PSU telemetry
        const drawMa = st.isRunning
          ? (
              0.085 +
              (st.gpio2Lit ? 0.012 : 0) +
              (st.externalLedRedLit || st.externalLedCyanLit ? 0.012 : 0) +
              Math.abs(st.motorSpeedNorm ?? 0) * 0.42 +
              (st.pumpOn ? 0.38 : 0)
            ).toFixed(2)
          : "0.00";
        benchPsu.updateReadout(
          `+5.00V  ${drawMa}A`,
          st.isRunning ? "+3.30V REG OK" : "OUTPUT STANDBY",
          Boolean(st.isRunning)
        );

        if (st.show3DWiring && activeWires.length > 0) {
          const wiresActive = Boolean(st.isRunning && !st.reducedMotion);
          activeWires.forEach((w) => {
            w.flow.update(elapsedTotal, wiresActive);
          });
        }

        // Advance lesson-specific peripheral rig animations
        rigHooks?.updateFrame(delta, elapsedTotal);

        if (selRingMesh.visible && !st.reducedMotion && st.isRunning) {
          const pulseScale = 1 + 0.12 * Math.sin(elapsedTotal * 4.5);
          selRingMesh.scale.set(pulseScale, 1, pulseScale);
        } else {
          selRingMesh.scale.set(1, 1, 1);
        }

        if (hoverRingMesh.visible && !st.reducedMotion) {
          const hScale = 1 + 0.16 * Math.sin(performance.now() * 0.008);
          hoverRingMesh.scale.set(hScale, 1, hScale);
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (disposed) return;
          if (renderDirty || needsContinuousLoop()) {
            requestRender();
          }
        };
        if (isSoftwareGl) {
          afterDrawSync(renderer, () => disposed, (id) => (frameId = id), done);
        } else {
          done();
        }
      });
    }

    sceneApiRef.current = {
      setPreset: applyPreset,
      focusPin: focusOnPin,
      rotateBy: (dTheta: number, dPhi: number) => {
        transitionActive = false;
        orbitRotateCamera(camera, controls, dTheta, dPhi);
        syncZoomPct();
        requestRender();
      },
      panBy: (dx: number, dy: number) => {
        transitionActive = false;
        panCameraView(camera, controls, dx, dy);
        syncZoomPct();
        requestRender();
      },
      zoomBy: (factor: number) => {
        transitionActive = false;
        zoomCameraView(camera, controls, factor);
        syncZoomPct();
        requestRender();
      },
      syncHighlights: () => {
        syncVisualHighlights();
        requestRender();
      },
      rebuildWiring: () => {
        rebuildDynamicWires();
        syncVisualHighlights();
        requestRender();
      },
      rebuildPeripheralStage: () => {
        buildLessonPeripheralStage();
        requestRender();
      },
      wakeLoop: () => {
        clock.getDelta();
        requestRender();
      },
    };

    requestRender();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(260, entry.contentRect.width);
        const h = Math.max(240, entry.contentRect.height);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        requestRender();
      }
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      sceneApiRef.current = null;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      controls.removeEventListener("start", onControlStart);
      controls.removeEventListener("change", onControlChange);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("dblclick", handleDoubleClick);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      disposeSceneSubtree(periphGroup);
      disposeSceneSubtree(wireGroup);
      studio.dispose();
    };
  }, []);

  useEffect(() => {
    sceneApiRef.current?.rebuildPeripheralStage();
  }, [simType]);

  useEffect(() => {
    sceneApiRef.current?.syncHighlights();
  }, [
    selectedPinLabel,
    highlightedPins,
    isRunning,
    gpio2Lit,
    externalLedRedLit,
    externalLedCyanLit,
    motorSpeedNorm,
    servoAngleDeg,
    activeColorHex,
    show3DWiring,
    wiringMode,
    pendingSourcePin,
    tick,
  ]);

  useEffect(() => {
    sceneApiRef.current?.rebuildWiring();
  }, [pinWiring, show3DWiring, effectiveCustomWires]);

  useEffect(() => {
    if (focusPinTrigger) {
      sceneApiRef.current?.focusPin(focusPinTrigger.pinLabel);
    }
  }, [focusPinTrigger]);

  useEffect(() => {
    if (isPageVisible) {
      sceneApiRef.current?.wakeLoop();
    }
  }, [isPageVisible, isRunning, reducedMotion]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "h" || e.key === "H") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag !== "TEXTAREA" && tag !== "INPUT" && tag !== "SELECT") {
          setDockCollapsed((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const choosePreset = (preset: CameraPreset) => {
    setActivePreset(preset);
    sceneApiRef.current?.setPreset(preset);
  };

  return (
    <div className="relative w-full h-[390px] sm:h-[460px] rounded-2xl overflow-hidden bg-[#0B1220] border border-[#24344D]">
      <div ref={mountRef} className="w-full h-full touch-none" />

      {contextLost && (
        <div className="absolute inset-0 bg-[#0B1220] flex flex-col items-center justify-center gap-2 text-center p-4">
          <AlertTriangle className="w-6 h-6 text-[#F1B65B]" />
          <div className="text-xs font-mono text-[#F1B65B]">
            3D Hardware Viewport context paused by GPU. Restore tab focus to resume.
          </div>
        </div>
      )}

      <div className="absolute top-3 left-3 pointer-events-none px-3 py-1.5 rounded-lg bg-[#111B2B]/95 border border-[#24344D] text-[11px] font-mono text-slate-300 flex items-center gap-2">
        <span className="text-[#35BDF2] font-bold">ESP32 + BENCH · 3D</span>
        <span className="text-slate-600">|</span>
        <span className={isRunning ? "text-[#48C99A] font-bold" : "text-[#F1B65B] font-bold"}>
          {isRunning ? "RUNNING" : "IDLE / STANDBY"}
        </span>
        <span className="text-slate-600 hidden sm:inline">|</span>
        <span className="hidden sm:inline text-slate-300">
          {wiringMode
            ? pendingSourcePin
              ? `Wiring ${pendingSourcePin} → Click Bench Bus`
              : "Wire Mode: Click any ESP32 Pin"
            : selectedPinLabel
            ? `Pin: ${selectedPinLabel}`
            : "Orbit · Zoom · Click Pins & Hardware"}
        </span>
      </div>

      {wiringMode && (
        <div className="absolute top-3 right-3 z-20 px-3 py-1.5 rounded-lg bg-[#0b1020] border border-amber-400/70 text-[11px] font-mono text-amber-300 flex items-center gap-2 shadow-lg">
          <span>
            {pendingSourcePin
              ? `Source: ${pendingSourcePin} → Click gold terminal`
              : "Step 1: Click ESP32 pin to wire"}
          </span>
          {pendingSourcePin && (
            <button
              type="button"
              onClick={() => setPendingSourcePin(null)}
              className="px-1.5 py-0.5 rounded bg-[#131f38] text-slate-200 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {hoveredInfo && (
        <div
          className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl bg-[#080f20]/95 border border-cyan-400/75 shadow-2xl max-w-[260px]"
          style={{
            left: `${hoveredInfo.x}px`,
            top: `${hoveredInfo.y}px`,
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-amber-300">
              {hoveredInfo.title}
            </span>
            {hoveredInfo.pinRole && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">
                {hoveredInfo.pinRole}
              </span>
            )}
          </div>
          {hoveredInfo.capabilities && hoveredInfo.capabilities.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1">
              {hoveredInfo.capabilities.slice(0, 4).map((cap) => (
                <span
                  key={cap}
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                >
                  {cap}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-[10px] font-mono text-emerald-300 truncate">
              {hoveredInfo.subtitle}
            </div>
          )}
          {hoveredInfo.pinHardwareNote && (
            <div className="text-[10px] font-mono text-slate-300 mt-1">
              {hoveredInfo.pinHardwareNote}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-0.5">
            {hoveredInfo.roleOrNote}
          </div>
        </div>
      )}

      <Esp32ViewportController
        activePreset={activePreset}
        onSelectPreset={choosePreset}
        onRotateBy={(dTheta, dPhi) => sceneApiRef.current?.rotateBy(dTheta, dPhi)}
        onPanBy={(dx, dy) => sceneApiRef.current?.panBy(dx, dy)}
        onZoomBy={(factor) => sceneApiRef.current?.zoomBy(factor)}
        onResetView={() => {
          setAutoOrbit(false);
          choosePreset("ISO");
        }}
        autoOrbit={autoOrbit}
        onToggleAutoOrbit={() => {
          setAutoOrbit((v) => !v);
          sceneApiRef.current?.wakeLoop();
        }}
        zoomPct={zoomPct}
        selectedPinLabel={selectedPinLabel}
        onFocusPin={(pin) => sceneApiRef.current?.focusPin(pin)}
        wiringMode={wiringMode}
        onToggleWiringMode={() => {
          setWiringMode((v) => !v);
          setPendingSourcePin(null);
        }}
        show3DWiring={show3DWiring}
        onToggleShow3DWiring={() => setShow3DWiring((v) => !v)}
        dockCollapsed={dockCollapsed}
        onToggleDockCollapsed={() => setDockCollapsed((v) => !v)}
      />
    </div>
  );
}
