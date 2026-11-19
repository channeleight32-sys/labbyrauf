import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Camera,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MousePointerClick,
  Zap,
} from "lucide-react";
import {
  afterDrawSync,
  createRadialContactShadowTexture,
  disposeSceneSubtree,
  initThreeStudio,
  StudioContextHandle,
} from "../utils/threeStudio";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";
import {
  createCapacitorElectrolytic3D,
  createDiffusedLed3D,
  createDipIc3D,
  createInductorToroid3D,
  createOledDisplay3D,
  createPotentiometer3D,
  createResistor3D,
  createSevenSegment3D,
  createTactileButton3D,
  createTransistorTo2203D,
} from "./three/electronicsPrimitives3D";
import {
  createBenchPowerSupply3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";

export interface Circuit3DNodeInput {
  id: number | string;
  type: string;
  label: string;
  x: number;
  y: number;
  value?: number | string;
  isHigh?: boolean;
  currentMa?: number;
  voltageV?: number;
  segments?: boolean[];
  isInteractive?: boolean;
}

export interface Circuit3DWireInput {
  id: number | string;
  fromId: number | string;
  toId: number | string;
  isEnergized?: boolean;
  currentMa?: number;
  colorHex?: string;
}

interface CircuitLab3DViewProps {
  nodes: Circuit3DNodeInput[];
  wires: Circuit3DWireInput[];
  isRunning: boolean;
  selectedNodeId?: number | string | null;
  supplyVoltageV?: number;
  title?: string;
  onSelectNode?: (id: number | string) => void;
  onToggleInteractiveNode?: (id: number | string) => void;
  className?: string;
}

type CamPreset = "ISO" | "TOP" | "FRONT" | "ANGLE";

const CAM_PRESETS: Record<CamPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  ISO: { pos: [0, 5.4, 6.2], target: [0, 0.25, 0] },
  TOP: { pos: [0, 8.2, 0.45], target: [0, 0.15, 0] },
  FRONT: { pos: [0, 2.2, 7.2], target: [0, 0.35, 0] },
  ANGLE: { pos: [-5.0, 4.4, 5.0], target: [0, 0.25, 0] },
};

const _camGoalPos = new THREE.Vector3();
const _camGoalTgt = new THREE.Vector3();
const _rayMouse = new THREE.Vector2();

function buildPcbBoardTexture(maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext("2d")!;

  ctx.fillStyle = "#082f49";
  ctx.fillRect(0, 0, 1024, 640);

  // Subtle silkscreen reference grid
  ctx.strokeStyle = "rgba(56, 189, 248, 0.13)";
  ctx.lineWidth = 1;
  for (let x = 32; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 24);
    ctx.lineTo(x, 616);
    ctx.stroke();
  }
  for (let y = 32; y < 640; y += 32) {
    ctx.beginPath();
    ctx.moveTo(24, y);
    ctx.lineTo(1000, y);
    ctx.stroke();
  }

  // Copper pad matrix dots
  ctx.fillStyle = "#ca8a04";
  for (let x = 48; x < 980; x += 32) {
    for (let y = 48; y < 596; y += 32) {
      ctx.beginPath();
      ctx.arc(x, y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Outer perimeter silkscreen border
  ctx.strokeStyle = "#7dd3fc";
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, 988, 604);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "bold 20px monospace";
  ctx.fillText("IST LAB · FR-4 3D PROTOTYPING DECK", 36, 42);
  ctx.fillText("REV 4.2 · REAL-TIME MNA / LOGIC TWIN", 580, 606);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export const CircuitLab3DView: React.FC<CircuitLab3DViewProps> = ({
  nodes,
  wires,
  isRunning,
  selectedNodeId = null,
  supplyVoltageV = 5,
  title = "Interactive 3D Circuit Twin",
  onSelectNode,
  onToggleInteractiveNode,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<StudioContextHandle | null>(null);
  const circuitRootRef = useRef<THREE.Group | null>(null);
  const camTransitionRef = useRef<{ active: boolean }>({ active: false });

  const [preset, setPreset] = useState<CamPreset>("ISO");
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [contextLost, setContextLost] = useState<boolean>(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const reducedMotionRef = useRef(prefersReducedMotion);
  reducedMotionRef.current = prefersReducedMotion;
  const pageVisibleRef = useRef(isPageVisible);
  pageVisibleRef.current = isPageVisible;
  const [hoveredInfo, setHoveredInfo] = useState<{
    id: number | string;
    label: string;
    detail: string;
    isInteractive: boolean;
  } | null>(null);

  const callbacksRef = useRef({ onSelectNode, onToggleInteractiveNode });
  callbacksRef.current = { onSelectNode, onToggleInteractiveNode };

  const liveDataRef = useRef({ nodes, wires, isRunning, selectedNodeId, supplyVoltageV });
  liveDataRef.current = { nodes, wires, isRunning, selectedNodeId, supplyVoltageV };

  // Dynamic updaters populated when geometry rebuilds
  const updatersRef = useRef<{
    leds: { id: number | string; setIntensity: (v: number, col?: number) => void }[];
    sevenSegs: { id: number | string; setSegments: (s: boolean[]) => void }[];
    buttons: { id: number | string; setPressed: (p: boolean) => void }[];
    resistors: { id: number | string; setThermalLevel: (v: number) => void }[];
    caps: { id: number | string; setChargeLevel: (v: number) => void }[];
    inductors: { id: number | string; setFluxLevel: (v: number) => void; fluxRing: THREE.Mesh }[];
    oleds: { updateScreen: (h: string, l: string[], acc?: string) => void }[];
    psu: ReturnType<typeof createBenchPowerSupply3D> | null;
    flows: { flow: FlowingWire3DHandle; energized: boolean; speedScale: number; reverse: boolean }[];
    hitMeshes: THREE.Object3D[];
    highlightRings: Map<number | string, THREE.Mesh>;
  }>({
    leds: [],
    sevenSegs: [],
    buttons: [],
    resistors: [],
    caps: [],
    inductors: [],
    oleds: [],
    psu: null,
    flows: [],
    hitMeshes: [],
    highlightRings: new Map(),
  });

  // Structural signature (rebuilds meshes when topology, types, coordinates, values, or colors change)
  const topologySig = React.useMemo(() => {
    const nSig = nodes
      .map(
        (n) =>
          `${n.id}:${n.type}:${Math.round(n.x)}:${Math.round(n.y)}:${n.label}:${n.value ?? ""}:${
            n.segments ? n.segments.map((s) => (s ? "1" : "0")).join("") : ""
          }`
      )
      .join("|");
    const wSig = wires
      .map((w) => `${w.id}:${w.fromId}->${w.toId}:${w.colorHex ?? ""}`)
      .join("|");
    return `${nSig}##${wSig}`;
  }, [nodes, wires]);

  // 1. Initialize WebGL studio once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const studio = initThreeStudio(el, {
      cameraPos: CAM_PRESETS.ISO.pos,
      targetPos: CAM_PRESETS.ISO.target,
      fov: 40,
      minDistance: 2.8,
      maxDistance: 17,
      shadowBounds: 7,
      benchSize: 28,
      benchY: -0.22,
    });
    studioRef.current = studio;

    const canvas = studio.renderer.domElement;
    const onContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", onContextRestored);

    const onControlsStart = () => {
      camTransitionRef.current.active = false;
    };
    studio.controls.addEventListener("start", onControlsStart);

    // Build PCB baseplate + brass corner standoffs
    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();
    const boardGroup = new THREE.Group();
    const pcbTex = buildPcbBoardTexture(maxAniso);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.55 });
    const topMat = new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.42, metalness: 0.1 });
    const pcbMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8.6, 0.12, 5.4),
      [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]
    );
    pcbMesh.position.y = 0.02;
    pcbMesh.receiveShadow = true;
    pcbMesh.castShadow = true;
    boardGroup.add(pcbMesh);

    const standoffMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.9, roughness: 0.22 });
    [
      [-4.05, -2.45],
      [4.05, -2.45],
      [-4.05, 2.45],
      [4.05, 2.45],
    ].forEach(([sx, sz]) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.22, 14), standoffMat);
      post.position.set(sx, -0.05, sz);
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.04, 14), standoffMat);
      screw.position.set(sx, 0.095, sz);
      boardGroup.add(post, screw);
    });

    // Soft contact shadow directly under PCB deck
    const shadowTex = createRadialContactShadowTexture(256);
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(9.8, 6.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.2;
    boardGroup.add(shadowPlane);

    studio.scene.add(boardGroup);

    const circuitRoot = new THREE.Group();
    studio.scene.add(circuitRoot);
    circuitRootRef.current = circuitRoot;

    if (!studio.isSoftwareGl) {
      studio.renderer.compile(studio.scene, studio.camera);
    }

    // Raycasting (pointer click & throttled hover)
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let lastMoveTs = 0;
    let pointerDownXY = { x: 0, y: 0 };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownXY = { x: ev.clientX, y: ev.clientY };
    };

    const getHitNode = (ev: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      _rayMouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayMouse, studio.camera);
      const hits = raycaster.intersectObjects(updatersRef.current.hitMeshes, false);
      return hits.length > 0 ? hits[0].object.userData : null;
    };

    const onPointerUp = (ev: PointerEvent) => {
      const moved = Math.hypot(ev.clientX - pointerDownXY.x, ev.clientY - pointerDownXY.y);
      if (moved > 7) return; // user orbited
      const hit = getHitNode(ev);
      if (!hit) return;
      if (hit.isInteractive && callbacksRef.current.onToggleInteractiveNode) {
        callbacksRef.current.onToggleInteractiveNode(hit.nodeId);
      }
      if (callbacksRef.current.onSelectNode) {
        callbacksRef.current.onSelectNode(hit.nodeId);
      }
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastMoveTs < 65) return;
      lastMoveTs = now;
      const hit = getHitNode(ev);
      if (hit) {
        canvas.style.cursor = "pointer";
        const curNode = liveDataRef.current.nodes.find((n) => n.id === hit.nodeId);
        if (curNode) {
          const parts: string[] = [];
          if (curNode.voltageV !== undefined) parts.push(`${curNode.voltageV.toFixed(2)}V`);
          if (curNode.currentMa !== undefined) parts.push(`${curNode.currentMa.toFixed(1)}mA`);
          if (curNode.isHigh !== undefined) parts.push(curNode.isHigh ? "HIGH (1)" : "LOW (0)");
          setHoveredInfo({
            id: curNode.id,
            label: `${curNode.label || curNode.type}`,
            detail: parts.length ? parts.join(" · ") : `${curNode.type}`,
            isInteractive: Boolean(hit.isInteractive),
          });
        }
      } else {
        canvas.style.cursor = "grab";
        setHoveredInfo(null);
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointermove", onPointerMove);

    const onResize = () => {
      if (!el) return;
      const w = Math.max(260, el.clientWidth);
      const h = Math.max(220, el.clientHeight);
      studio.camera.aspect = w / h;
      studio.camera.updateProjectionMatrix();
      studio.renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(el);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (camTransitionRef.current.active) {
        const k = 1 - Math.exp(-6.5 * delta);
        studio.camera.position.lerp(_camGoalPos, k);
        studio.controls.target.lerp(_camGoalTgt, k);
        if (
          studio.camera.position.distanceTo(_camGoalPos) < 0.03 &&
          studio.controls.target.distanceTo(_camGoalTgt) < 0.03
        ) {
          camTransitionRef.current.active = false;
        }
      }
      studio.controls.update();

      // Animate live states (beads, LEDs, 7-segs, OLEDs, inductor rings)
      const { nodes: curNodes, wires: curWires, isRunning: run, selectedNodeId: selId, supplyVoltageV: vcc } =
        liveDataRef.current;

      const nodeMap = new Map<number | string, Circuit3DNodeInput>();
      curNodes.forEach((n) => nodeMap.set(n.id, n));
      const wireMap = new Map<number | string, Circuit3DWireInput>();
      curWires.forEach((w) => wireMap.set(w.id, w));

      const upd = updatersRef.current;
      upd.leds.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (!nd) return;
        const mag = run
          ? nd.isHigh
            ? 1
            : nd.currentMa && Math.abs(nd.currentMa) > 0.4
            ? Math.min(1, Math.abs(nd.currentMa) / 22)
            : 0
          : 0;
        entry.setIntensity(mag);
      });

      upd.sevenSegs.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (nd && nd.segments) {
          entry.setSegments(run ? nd.segments : [false, false, false, false, false, false, false]);
        }
      });

      upd.buttons.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (nd) {
          const on = Boolean(nd.isHigh || Number(nd.value) >= 1);
          entry.setPressed(on);
        }
      });

      upd.resistors.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (nd) {
          const iMa = Math.abs(nd.currentMa ?? 0);
          entry.setThermalLevel(run && iMa > 18 ? Math.min(1, (iMa - 18) / 80) : 0);
        }
      });

      upd.caps.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (nd) {
          const v = Math.abs(nd.voltageV ?? 0);
          entry.setChargeLevel(run ? Math.min(1, v / Math.max(5, vcc)) : 0);
        }
      });

      upd.inductors.forEach((entry) => {
        const nd = nodeMap.get(entry.id);
        if (nd) {
          const iMa = Math.abs(nd.currentMa ?? 0);
          const lvl = run && iMa > 1 ? Math.min(1, iMa / 40) : 0;
          entry.setFluxLevel(lvl);
          const pulse = reducedMotionRef.current ? 0 : Math.sin(elapsed * 5) * 0.08 * lvl;
          entry.fluxRing.scale.setScalar(1 + pulse);
        }
      });

      upd.highlightRings.forEach((ring, id) => {
        ring.visible = selId !== null && id === selId;
        if (ring.visible && !reducedMotionRef.current) {
          ring.rotation.z = elapsed * 1.4;
        }
      });

      // Multi-packet flowing energy capsules along energized 3D jumper wires
      const activeMotion = Boolean(run && !reducedMotionRef.current && pageVisibleRef.current);
      upd.flows.forEach((f) => {
        f.flow.update(elapsed, activeMotion && f.energized, f.speedScale, f.reverse);
      });

      if (upd.psu) {
        const totalMa = curNodes.reduce((acc, n) => acc + Math.abs(n.currentMa ?? 0), 0);
        upd.psu.updateReadout(
          `+${vcc.toFixed(1)}V ${(totalMa / 1000).toFixed(2)}A`,
          `NODES:${curNodes.length} NETS:${curWires.length}`,
          run
        );
      }

      const activeCount = curNodes.filter((n) => n.isHigh || Math.abs(n.currentMa ?? 0) > 0.2).length;
      upd.oleds.forEach((o) => {
        o.updateScreen(
          run ? `BENCH PSU · ${vcc.toFixed(1)}V` : "BENCH PSU · STANDBY",
          [
            `PARTS: ${curNodes.length}  NETS: ${curWires.length}`,
            `ACTIVE: ${activeCount}  STATE: ${run ? "LIVE" : "PAUSED"}`,
            `CLICK SWITCHES IN 3D TO TOGGLE`,
          ],
          run ? "#22d3ee" : "#f59e0b"
        );
      });

      studio.renderer.render(studio.scene, studio.camera);
      if (studio.isSoftwareGl) {
        afterDrawSync(
          studio.renderer,
          () => disposed,
          (id) => {
            frameId = id;
          },
          tick
        );
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
      studio.controls.removeEventListener("start", onControlsStart);
      studio.dispose();
    };
  }, []);

  // 2. Rebuild circuit 3D components + jumper wires whenever topology changes
  useEffect(() => {
    const root = circuitRootRef.current;
    const studio = studioRef.current;
    if (!root || !studio) return;

    disposeSceneSubtree(root);
    root.clear();

    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();
    const upd = updatersRef.current;
    upd.leds = [];
    upd.sevenSegs = [];
    upd.buttons = [];
    upd.resistors = [];
    upd.caps = [];
    upd.inductors = [];
    upd.oleds = [];
    upd.psu = null;
    upd.flows = [];
    upd.hitMeshes = [];
    upd.highlightRings = new Map();

    // Normalize 2D (x,y) coordinates onto our 7.6 x 4.4 PCB deck
    const validNodes = liveDataRef.current.nodes;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    validNodes.forEach((n) => {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    });
    const spanX = Math.max(220, maxX - minX);
    const spanY = Math.max(180, maxY - minY);
    const midX = validNodes.length ? (minX + maxX) / 2 : 0;
    const midY = validNodes.length ? (minY + maxY) / 2 : 0;

    const worldPosMap = new Map<number | string, THREE.Vector3>();
    const nodeTypeMap = new Map<number | string, string>();

    const getTerminalAnchor = (
      id: number | string,
      side: "left" | "right"
    ): THREE.Vector3 => {
      const base = worldPosMap.get(id) ?? new THREE.Vector3();
      const t = (nodeTypeMap.get(id) ?? "").toUpperCase();
      const sign = side === "left" ? -1 : 1;
      if (t === "R" || t === "RESISTOR" || t === "HB" || t === "D" || t === "D1N4007" || t === "ZD" || t === "DIODE") {
        return new THREE.Vector3(base.x + sign * 0.28, 0.14, base.z);
      }
      if (t === "L" || t === "INDUCTOR" || t === "C" || t === "CPOL" || t === "CNP" || t === "CAPACITOR") {
        return new THREE.Vector3(base.x + sign * 0.16, 0.14, base.z);
      }
      if (t === "BJT" || t === "BC547" || t === "BC557" || t === "MOS" || t === "JFET" || t === "SCR" || t === "DIAC" || t === "TRIAC" || t === "REG7805" || t.includes("TRANSISTOR")) {
        return new THREE.Vector3(base.x + sign * 0.12, 0.15, base.z + 0.08);
      }
      if (t === "LED" || t === "OUTPUT" || t === "BUZZER" || t === "LAMP" || t === "GND") {
        return new THREE.Vector3(base.x + sign * 0.08, 0.14, base.z);
      }
      if (t === "VS" || t === "FG" || t === "IS" || t === "AC" || t === "VCC" || t === "BATTERY") {
        return new THREE.Vector3(base.x + sign * 0.22, 0.16, base.z + 0.18);
      }
      // DIP IC / Gate: connect cleanly on outer DIP pin rows
      return new THREE.Vector3(base.x + sign * 0.2, 0.16, base.z + sign * 0.18);
    };

    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const selRingMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      side: THREE.DoubleSide,
    });

    validNodes.forEach((nd) => {
      const wx = validNodes.length <= 1 ? 0 : ((nd.x - midX) / spanX) * 6.8;
      const wz = validNodes.length <= 1 ? 0 : ((nd.y - midY) / spanY) * 4.0;
      const wp = new THREE.Vector3(wx, 0.08, wz);
      worldPosMap.set(nd.id, wp);
      nodeTypeMap.set(nd.id, nd.type);

      const compGroup = new THREE.Group();
      compGroup.position.copy(wp);

      const t = nd.type.toUpperCase();
      let isInteractive = Boolean(nd.isInteractive);

      if (t === "R" || t === "RESISTOR" || t === "HB") {
        const ohms = Number(nd.value) || 220;
        const r = createResistor3D(ohms, 1.3);
        compGroup.add(r.group);
        upd.resistors.push({ id: nd.id, setThermalLevel: r.setThermalLevel });
      } else if (t === "POT") {
        const pot = createPotentiometer3D(0.95);
        pot.setRatio(Math.min(1, Math.max(0, (Number(nd.value) || 500) / 10000)));
        compGroup.add(pot.group);
        isInteractive = true;
      } else if (t === "C" || t === "CPOL" || t === "CNP" || t === "CAPACITOR") {
        const c = createCapacitorElectrolytic3D(1.1);
        compGroup.add(c.group);
        upd.caps.push({ id: nd.id, setChargeLevel: c.setChargeLevel });
      } else if (t === "L" || t === "INDUCTOR") {
        const ind = createInductorToroid3D(1.1);
        compGroup.add(ind.group);
        upd.inductors.push({ id: nd.id, setFluxLevel: ind.setFluxLevel, fluxRing: ind.fluxRing });
      } else if (t === "7SEG" || t === "SEVEN_SEG") {
        const seg = createSevenSegment3D(0xef4444, 1.05);
        compGroup.add(seg.group);
        upd.sevenSegs.push({ id: nd.id, setSegments: seg.setSegments });
      } else if (t === "LED" || t === "OUTPUT" || t === "BUZZER" || t === "LAMP") {
        const hex = t === "OUTPUT" ? 0x10b981 : t === "BUZZER" ? 0xf59e0b : 0x22d3ee;
        const led = createDiffusedLed3D(hex, 1.25);
        compGroup.add(led.group);
        upd.leds.push({ id: nd.id, setIntensity: led.setIntensity });
      } else if (t === "INPUT" || t === "SW" || t.includes("SWITCH") || t.includes("BUTTON")) {
        const btn = createTactileButton3D(0x06b6d4, 1.25);
        const led = createDiffusedLed3D(0x34d399, 0.65);
        led.group.position.set(0.32, 0.02, 0);
        compGroup.add(btn.group, led.group);
        upd.buttons.push({ id: nd.id, setPressed: btn.setPressed });
        upd.leds.push({ id: nd.id, setIntensity: led.setIntensity });
        isInteractive = true;
      } else if (t === "VS" || t === "FG" || t === "IS" || t === "AC" || t === "VCC" || t === "BATTERY") {
        const oled = createOledDisplay3D(maxAniso);
        oled.group.scale.setScalar(0.82);
        compGroup.add(oled.group);
        upd.oleds.push({ updateScreen: oled.updateScreen });
      } else if (
        t === "BJT" ||
        t === "BC547" ||
        t === "BC557" ||
        t === "MOS" ||
        t === "JFET" ||
        t === "SCR" ||
        t === "DIAC" ||
        t === "TRIAC" ||
        t === "REG7805" ||
        t.includes("TRANSISTOR")
      ) {
        const tr = createTransistorTo2203D(1.1, t === "MOS" ? 0xf59e0b : 0x22d3ee);
        compGroup.add(tr);
        if (t === "MOS" || t === "SCR" || t === "TRIAC") isInteractive = true;
      } else if (t === "D" || t === "D1N4007" || t === "ZD" || t === "DIODE") {
        const dBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.34, 14),
          new THREE.MeshStandardMaterial({ color: t === "ZD" ? 0xd97706 : 0x111827, roughness: 0.35 })
        );
        dBody.rotation.z = Math.PI / 2;
        dBody.position.y = 0.16;
        dBody.castShadow = true;
        const band = new THREE.Mesh(
          new THREE.CylinderGeometry(0.083, 0.083, 0.06, 14),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.2 })
        );
        band.rotation.z = Math.PI / 2;
        band.position.set(0.11, 0.16, 0);
        compGroup.add(dBody, band);
      } else if (t === "GND") {
        const gPin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.24, 12),
          new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
        );
        gPin.position.y = 0.12;
        const base = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.14, 0.05, 14),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
        );
        base.position.y = 0.025;
        compGroup.add(gPin, base);
      } else {
        // Digital Gate, 74xx DIP IC, Op-Amp, NE555, Clock, Flip-Flop
        const pins = t === "OPAMP" || t === "NE555" ? 8 : 14;
        const ic = createDipIc3D(pins, nd.label || t, 0.9, maxAniso);
        const statusLed = createDiffusedLed3D(0x22d3ee, 0.55);
        statusLed.group.position.set(0, 0.22, 0.24);
        compGroup.add(ic, statusLed.group);
        upd.leds.push({ id: nd.id, setIntensity: statusLed.setIntensity });
      }

      // Selection halo ring
      const selRing = new THREE.Mesh(new THREE.RingGeometry(0.38, 0.45, 24), selRingMat);
      selRing.rotation.x = -Math.PI / 2;
      selRing.position.y = 0.015;
      selRing.visible = false;
      compGroup.add(selRing);
      upd.highlightRings.set(nd.id, selRing);

      // Raycast hit proxy (layer 1)
      const hitBox = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.65, 0.76), hitMat);
      hitBox.position.y = 0.28;
      hitBox.layers.set(1);
      hitBox.userData = { nodeId: nd.id, isInteractive };
      compGroup.add(hitBox);
      upd.hitMeshes.push(hitBox);

      root.add(compGroup);
    });

    // Physical Laboratory Bench PSU + Oscilloscope Probe connected to active circuit
    const psu = createBenchPowerSupply3D("CIRCUIT PSU", maxAniso);
    psu.group.position.set(-4.65, -0.2, -1.55);
    psu.group.rotation.y = 0.42;
    psu.group.scale.setScalar(0.85);
    root.add(psu.group);
    upd.psu = psu;

    const targetProbeNode =
      validNodes.find((n) => n.id === liveDataRef.current.selectedNodeId) ??
      validNodes.find((n) => n.type.toUpperCase() === "OUTPUT" || n.type.toUpperCase() === "LED") ??
      validNodes[validNodes.length - 1];

    if (targetProbeNode) {
      const tp = worldPosMap.get(targetProbeNode.id)!;
      const scopeProbe = createScopeProbe3D(0xfacc15, 0.78);
      scopeProbe.group.position.set(tp.x + 0.14, 0.22, tp.z);
      root.add(scopeProbe.group);

      const probeTail = scopeProbe.cableAttachLocal.clone().add(scopeProbe.group.position);
      const coaxFlow = createFlowingWire3D(
        [
          probeTail,
          new THREE.Vector3(probeTail.x + 0.45, 0.95, probeTail.z - 0.55),
          new THREE.Vector3(4.35, 0.25, -2.2),
        ],
        0xfacc15,
        { radius: 0.018, packetCount: 3, packetLength: 0.1, speedMult: 0.7 }
      );
      root.add(coaxFlow.group);
      upd.flows.push({
        flow: coaxFlow,
        energized: true,
        speedScale: 0.9,
        reverse: false,
      });
    }

    // PSU +VCC & GND leads feeding supply or first node cleanly
    const vsNode =
      validNodes.find((n) => ["VS", "VCC", "BATTERY", "FG", "AC"].includes(n.type.toUpperCase())) ??
      validNodes[0];
    if (vsNode) {
      const vsAnchor = getTerminalAnchor(vsNode.id, "left");
      const psuPosW = psu.pos5VLocal
        .clone()
        .multiplyScalar(0.85)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.42)
        .add(psu.group.position);
      const psuGndW = psu.posGndLocal
        .clone()
        .multiplyScalar(0.85)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.42)
        .add(psu.group.position);

      const vccFlow = createFlowingWire3D(
        [
          psuPosW,
          new THREE.Vector3((psuPosW.x + vsAnchor.x) * 0.5, 0.75, (psuPosW.z + vsAnchor.z) * 0.5),
          vsAnchor,
        ],
        0xef4444,
        { radius: 0.02, packetCount: 4, packetLength: 0.12, speedMult: 0.85 }
      );
      root.add(vccFlow.group);
      upd.flows.push({ flow: vccFlow, energized: true, speedScale: 1, reverse: false });

      const gndNode = validNodes.find((n) => n.type.toUpperCase() === "GND") ?? validNodes[validNodes.length - 1];
      const gndAnchor = gndNode ? getTerminalAnchor(gndNode.id, "left") : vsAnchor;
      const gndFlow = createFlowingWire3D(
        [
          gndAnchor,
          new THREE.Vector3((psuGndW.x + gndAnchor.x) * 0.5, 0.55, 2.35),
          psuGndW,
        ],
        0x475569,
        { radius: 0.02, packetCount: 4, packetLength: 0.12, speedMult: 0.65 }
      );
      root.add(gndFlow.group);
      upd.flows.push({ flow: gndFlow, energized: true, speedScale: 0.85, reverse: false });
    }

    // Build pin-accurate arched 3D silicone jumper wires & directional flowing capsules
    liveDataRef.current.wires.forEach((w, idx) => {
      const pA = worldPosMap.get(w.fromId);
      const pB = worldPosMap.get(w.toId);
      if (!pA || !pB) return;

      const startPt = getTerminalAnchor(w.fromId, pA.x <= pB.x ? "right" : "left");
      const endPt = getTerminalAnchor(w.toId, pA.x <= pB.x ? "left" : "right");

      const dist = startPt.distanceTo(endPt);
      const archH = Math.min(0.85, 0.26 + dist * 0.14);
      const mid = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5);
      mid.y += archH;

      const wireHex = w.colorHex
        ? new THREE.Color(w.colorHex).getHex()
        : w.isEnergized
        ? 0x22d3ee
        : 0x3b82f6;

      const fw = createFlowingWire3D([startPt, mid, endPt], wireHex, {
        radius: 0.021,
        tubularSegments: 22,
        radialSegments: 7,
        packetCount: 4,
        packetLength: 0.12,
        speedMult: 0.85,
        phaseOffset: (idx * 0.21) % 1,
        reverse: (w.currentMa ?? 0) < 0,
      });
      root.add(fw.group);

      upd.flows.push({
        flow: fw,
        energized: Boolean(w.isEnergized),
        speedScale: 0.7 + Math.min(1.6, Math.abs(w.currentMa ?? 10) / 28),
        reverse: (w.currentMa ?? 0) < 0,
      });
    });
  }, [topologySig]);

  const applyPreset = (p: CamPreset) => {
    setPreset(p);
    const cfg = CAM_PRESETS[p];
    _camGoalPos.set(cfg.pos[0], cfg.pos[1], cfg.pos[2]);
    _camGoalTgt.set(cfg.target[0], cfg.target[1], cfg.target[2]);
    camTransitionRef.current.active = true;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "h" || e.key === "H") {
        setDockCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`relative w-full h-[460px] sm:h-[520px] rounded-xl overflow-hidden border border-[#24344D] bg-[#0B1220] ${className}`}
    >
      {/* Dedicated WebGL Mount Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Minimal Top-Left Spec Badge */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none flex flex-wrap items-center gap-2 bg-[#111B2B]/90 border border-[#24344D] rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#F1F5FA]">
        <span className="font-bold text-[#35BDF2]">{title}</span>
        <span className="text-[#5E708A]" aria-hidden="true">·</span>
        <span className="tabular-nums">{nodes.length} parts</span>
        <span className="text-[#5E708A]" aria-hidden="true">·</span>
        <span className="tabular-nums">{wires.length} nets</span>
        <span className="text-[#5E708A]" aria-hidden="true">·</span>
        <span className={isRunning ? "text-[#48C99A] font-semibold" : "text-[#F1B65B] font-semibold"}>
          {isRunning ? "Running" : "Idle / Standby"}
        </span>
      </div>

      {/* Hover Telemetry Readout */}
      {hoveredInfo && (
        <div className="absolute top-3 right-3 z-10 pointer-events-none bg-[#091224]/95 border border-cyan-500/60 rounded-lg px-3 py-1.5 text-xs font-mono text-white">
          <div className="font-bold text-cyan-300 flex items-center gap-1.5">
            {hoveredInfo.isInteractive ? <MousePointerClick className="w-3.5 h-3.5 text-emerald-400" /> : <Zap className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{hoveredInfo.label}</span>
          </div>
          <div className="text-[11px] text-slate-300 tabular-nums">
            {hoveredInfo.detail}
            {hoveredInfo.isInteractive ? " · Click to toggle" : ""}
          </div>
        </div>
      )}

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#060a14]/95 text-slate-200 text-sm font-mono">
          WebGL context interrupted — restoring 3D PCB bench...
        </div>
      )}

      {/* Collapsible Unified Bottom Camera Dock */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
        <button
          type="button"
          onClick={() => setDockCollapsed((v) => !v)}
          className="mb-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#0b1325] border border-slate-700 text-[11px] font-mono text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
          title="Collapse or expand 3D camera controls (Shortcut: H)"
        >
          {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span>{dockCollapsed ? "Show Camera Dock (H)" : "Hide Dock (H)"}</span>
        </button>

        {!dockCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 bg-[#091020]/95 border border-slate-700/90 rounded-xl px-3 py-2 shadow-xl">
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 pr-1.5">
              <Camera className="w-3.5 h-3.5 text-cyan-400" />
              View:
            </span>
            {(["ISO", "TOP", "FRONT", "ANGLE"] as CamPreset[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => applyPreset(p)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  preset === p
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-slate-800/90 text-slate-300 hover:text-white"
                }`}
              >
                {p === "ISO" ? "Isometric" : p === "TOP" ? "Top PCB" : p === "FRONT" ? "Front" : "Side"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => applyPreset("ISO")}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800/80 border border-slate-700 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
            <span className="hidden sm:inline text-[10px] font-mono text-slate-400 pl-2 border-l border-slate-800">
              Drag to orbit · Scroll to zoom · Click parts &amp; switches
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CircuitLab3DView;
