import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
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
  createMiniBreadboard3D,
  createOledDisplay3D,
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

export type AnalogStageMode =
  | "RLC"
  | "NETWORK"
  | "THEVENIN"
  | "TRANSIENT"
  | "BJT"
  | "MOSFET"
  | "OPAMP"
  | "DCDC"
  | "SCR"
  | "INVERTER";

export interface AnalogStage3DProps {
  mode: AnalogStageMode;
  title: string;
  config?: "series" | "parallel";
  circuitType?: "RC" | "RL" | "LC" | "RLC";
  topologyTag?: string;
  vin?: number;
  vout?: number;
  currentMa?: number;
  freqHz?: number;
  resonanceHz?: number;
  isResonant?: boolean;
  dutyRatio?: number;
  firingAlphaDeg?: number;
  rVal?: number;
  cVal?: number;
  lVal?: number;
  regionLabel?: string;
  isClipped?: boolean;
  isRunning?: boolean;
  onInteractiveStep?: () => void;
}

type StageCam = "ISO" | "TOP" | "CLOSE";
const STAGE_CAMS: Record<StageCam, { pos: [number, number, number]; tgt: [number, number, number] }> = {
  ISO: { pos: [3.3, 3.2, 4.1], tgt: [0, 0.25, 0] },
  TOP: { pos: [0, 5.1, 0.3], tgt: [0, 0.15, 0] },
  CLOSE: { pos: [1.8, 2.0, 2.8], tgt: [0, 0.3, 0] },
};

const _goalP = new THREE.Vector3();
const _goalT = new THREE.Vector3();
const _rayM = new THREE.Vector2();

interface StageActors {
  rMain: ReturnType<typeof createResistor3D> | null;
  capMain: ReturnType<typeof createCapacitorElectrolytic3D> | null;
  indMain: ReturnType<typeof createInductorToroid3D> | null;
  loadPot: ReturnType<typeof createPotentiometer3D>;
  testBtn: ReturnType<typeof createTactileButton3D>;
  outLed: ReturnType<typeof createDiffusedLed3D>;
  oled: ReturnType<typeof createOledDisplay3D>;
  benchPsu: ReturnType<typeof createBenchPowerSupply3D>;
  hitTargets: THREE.Object3D[];
  flows: FlowingWire3DHandle[];
  showInd: boolean;
}

export const AnalogStage3D: React.FC<AnalogStage3DProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const studioRef = useRef<StudioContextHandle | null>(null);
  const stageGroupRef = useRef<THREE.Group | null>(null);
  const actorsRef = useRef<StageActors | null>(null);
  const camAnimRef = useRef(false);
  const [camView, setCamView] = useState<StageCam>("ISO");
  const [dockHidden, setDockHidden] = useState(false);

  const propsRef = useRef(props);
  propsRef.current = props;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const reducedMotionRef = useRef(prefersReducedMotion);
  reducedMotionRef.current = prefersReducedMotion;
  const pageVisibleRef = useRef(isPageVisible);
  pageVisibleRef.current = isPageVisible;

  // 1. Initialize studio & persistent breadboard/OLED once
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const studio: StudioContextHandle = initThreeStudio(el, {
      cameraPos: STAGE_CAMS.ISO.pos,
      targetPos: STAGE_CAMS.ISO.tgt,
      fov: 38,
      minDistance: 2.0,
      maxDistance: 12,
      shadowBounds: 4.5,
      benchSize: 20,
      benchY: -0.2,
    });
    studioRef.current = studio;

    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();
    const bb = createMiniBreadboard3D(4.2, 2.35, maxAniso);
    bb.position.y = 0;
    studio.scene.add(bb);

    const shadowTex = createRadialContactShadowTexture(256);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 3.1),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.18;
    studio.scene.add(shadow);

    const stageGroup = new THREE.Group();
    studio.scene.add(stageGroup);
    stageGroupRef.current = stageGroup;

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let downPt = { x: 0, y: 0 };
    let pulseToggle = false;

    const canvas = studio.renderer.domElement;
    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 7) return;
      const actors = actorsRef.current;
      if (!actors || actors.hitTargets.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      _rayM.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayM.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayM, studio.camera);
      const hits = raycaster.intersectObjects(actors.hitTargets, false);
      if (hits.length > 0) {
        pulseToggle = !pulseToggle;
        actors.testBtn.setPressed(pulseToggle);
        propsRef.current.onInteractiveStep?.();
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    studio.controls.addEventListener("start", () => {
      camAnimRef.current = false;
    });

    const ro = new ResizeObserver(() => {
      const w = Math.max(240, el.clientWidth);
      const h = Math.max(200, el.clientHeight);
      studio.camera.aspect = w / h;
      studio.camera.updateProjectionMatrix();
      studio.renderer.setSize(w, h);
    });
    ro.observe(el);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();

      if (camAnimRef.current) {
        const k = 1 - Math.exp(-6 * delta);
        studio.camera.position.lerp(_goalP, k);
        studio.controls.target.lerp(_goalT, k);
        if (studio.camera.position.distanceTo(_goalP) < 0.03) camAnimRef.current = false;
      }
      studio.controls.update();

      const p = propsRef.current;
      const actors = actorsRef.current;
      if (actors) {
        const running = p.isRunning !== false;
        const iMag = Math.abs(p.currentMa ?? 12);
        const vin = Math.abs(p.vin ?? 12);
        const vout = Math.abs(p.vout ?? 6);
        const ratio = p.dutyRatio ?? Math.min(1, vout / Math.max(1, vin));

        actors.loadPot.setRatio(ratio);
        actors.rMain?.setThermalLevel(running ? Math.min(1, iMag / 90) : 0);
        actors.capMain?.setChargeLevel(running ? Math.min(1, vout / Math.max(5, vin)) : 0);

        if (actors.indMain) {
          const fluxLvl = running && actors.showInd ? (p.isResonant ? 1.0 : Math.min(0.85, iMag / 45)) : 0;
          actors.indMain.setFluxLevel(fluxLvl);
          const pulse = reducedMotionRef.current ? 0 : Math.sin(elapsed * 6) * 0.12 * fluxLvl;
          actors.indMain.fluxRing.scale.setScalar(1 + pulse);
        }

        const ledCol = p.isClipped || p.mode === "SCR" ? (p.isClipped ? 0xef4444 : 0xf59e0b) : p.isResonant ? 0x22d3ee : 0x10b981;
        const ledLevel = running ? THREE.MathUtils.clamp(vout / Math.max(3, vin * 0.8), 0.15, 1) : 0;
        actors.outLed.setIntensity(ledLevel, ledCol);

        const flowSpeed = running && !reducedMotionRef.current && pageVisibleRef.current ? 0.55 + Math.min(2.2, iMag / 22) : 0;
        const activeFlow = Boolean(running && !reducedMotionRef.current && pageVisibleRef.current && iMag > 0.05);
        actors.flows.forEach((fw) => {
          fw.update(elapsed, activeFlow, flowSpeed);
        });

        actors.benchPsu.updateReadout(
          `+${vin.toFixed(1)}V ${(iMag / 1000).toFixed(3)}A`,
          `VOUT: ${vout.toFixed(2)}V`,
          running
        );

        const line2 =
          p.freqHz !== undefined
            ? `F:${p.freqHz >= 1000 ? `${(p.freqHz / 1000).toFixed(2)}kHz` : `${p.freqHz.toFixed(0)}Hz`} I:${iMag.toFixed(1)}mA`
            : `VOUT:${vout.toFixed(2)}V I:${iMag.toFixed(1)}mA`;
        const line3 = p.regionLabel
          ? p.regionLabel
          : p.isResonant
          ? "RESONANCE LOCKED (X_L = X_C)"
          : p.isClipped
          ? "SATURATION CLIPPING"
          : "ACTIVE CONDUCTION";

        actors.oled.updateScreen(
          `${p.mode} · ${p.title.slice(0, 14)}`,
          [`VIN: ${vin.toFixed(1)}V  VOUT: ${vout.toFixed(2)}V`, line2, line3],
          p.isClipped ? "#ef4444" : p.isResonant ? "#22d3ee" : "#10b981"
        );
      }

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
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      if (stageGroupRef.current) {
        disposeSceneSubtree(stageGroupRef.current);
      }
      actorsRef.current = null;
      stageGroupRef.current = null;
      studioRef.current = null;
      studio.dispose();
    };
  }, []);

  // 2. Rebuild dynamic physical 3D breadboard topology & wiring whenever mode/topology/component values change
  const structuralKey = `${props.mode}:${props.config ?? "series"}:${props.circuitType ?? "RLC"}:${
    props.topologyTag ?? ""
  }:${Math.round(props.rVal ?? 1000)}`;

  useEffect(() => {
    const studio = studioRef.current;
    const stageGroup = stageGroupRef.current;
    if (!studio || !stageGroup) return;

    while (stageGroup.children.length > 0) {
      const child = stageGroup.children[0];
      stageGroup.remove(child);
      disposeSceneSubtree(child);
    }

    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();
    const rOhm = Math.max(1, props.rVal ?? 1000);
    const mode = props.mode;
    const isParallel = props.config === "parallel";
    const cType = props.circuitType ?? "RLC";
    const topoTag = (props.topologyTag ?? "").toUpperCase();

    const hasR =
      mode !== "RLC" ? true : cType === "RC" || cType === "RL" || cType === "RLC";
    const hasL =
      mode === "RLC"
        ? cType === "RL" || cType === "RLC"
        : mode === "DCDC" ||
          mode === "INVERTER" ||
          (mode === "TRANSIENT" && topoTag === "RL");
    const hasC =
      mode === "RLC"
        ? cType === "RC" || cType === "RLC"
        : mode === "DCDC" ||
          mode === "SCR" ||
          mode === "INVERTER" ||
          (mode === "TRANSIENT" && topoTag !== "RL") ||
          (mode === "BJT" && topoTag !== "CE_UNBYPASSED");

    const rMain = hasR ? createResistor3D(rOhm, 1.35) : null;
    const indMain = hasL ? createInductorToroid3D(1.1) : null;
    const capMain = hasC ? createCapacitorElectrolytic3D(1.1) : null;
    const loadPot = createPotentiometer3D(0.95);
    const testBtn = createTactileButton3D(0x06b6d4, 1.15);
    const outLed = createDiffusedLed3D(0x10b981, 1.3);
    const oled = createOledDisplay3D(maxAniso);
    oled.group.position.set(-1.35, 0.02, -1.65);
    oled.group.scale.setScalar(1.05);

    const benchPsu = createBenchPowerSupply3D("ANALOG PSU", maxAniso);
    benchPsu.group.position.set(-2.95, -0.2, -0.75);
    benchPsu.group.rotation.y = 0.48;
    benchPsu.group.scale.setScalar(0.88);

    const scopeProbe = createScopeProbe3D(0xfacc15, 0.72);
    scopeProbe.group.position.set(1.48, 0.24, -0.35);

    stageGroup.add(oled.group, benchPsu.group, scopeProbe.group, loadPot.group, testBtn.group, outLed.group);

    const wirePaths: THREE.Vector3[][] = [];
    const wireColors: number[] = [];
    const addWire = (pts: THREE.Vector3[], col: number) => {
      wirePaths.push(pts);
      wireColors.push(col);
    };

    if (mode === "RLC") {
      loadPot.group.position.set(-1.62, 0.16, 0.52);
      testBtn.group.position.set(1.5, 0.16, 0.52);
      outLed.group.position.set(1.5, 0.16, -0.35);

      if (isParallel) {
        // Parallel Shunt Banks across top bus (z=-0.52) and bottom return bus (z=+0.45)
        if (rMain) {
          rMain.group.rotation.y = Math.PI / 2;
          rMain.group.position.set(-0.95, 0.16, -0.05);
          stageGroup.add(rMain.group);
          addWire([new THREE.Vector3(-1.5, 0.2, -0.52), new THREE.Vector3(-1.22, 0.48, -0.52), new THREE.Vector3(-0.95, 0.2, -0.4)], 0xef4444);
          addWire([new THREE.Vector3(-0.95, 0.2, 0.3), new THREE.Vector3(-0.95, 0.44, 0.45), new THREE.Vector3(1.5, 0.2, 0.45)], 0x10b981);
        }
        if (indMain) {
          indMain.group.position.set(-0.08, 0.16, -0.05);
          stageGroup.add(indMain.group);
          addWire([new THREE.Vector3(-0.95, 0.2, -0.52), new THREE.Vector3(-0.5, 0.5, -0.52), new THREE.Vector3(-0.08, 0.22, -0.22)], 0xf59e0b);
          addWire([new THREE.Vector3(-0.08, 0.22, 0.14), new THREE.Vector3(-0.08, 0.45, 0.45), new THREE.Vector3(0.75, 0.2, 0.45)], 0x3b82f6);
        }
        if (capMain) {
          capMain.group.position.set(0.76, 0.16, -0.05);
          stageGroup.add(capMain.group);
          addWire([new THREE.Vector3(-0.08, 0.2, -0.52), new THREE.Vector3(0.35, 0.48, -0.52), new THREE.Vector3(0.76, 0.22, -0.2)], 0x22d3ee);
          addWire([new THREE.Vector3(0.76, 0.22, 0.12), new THREE.Vector3(1.12, 0.45, -0.15), new THREE.Vector3(1.48, 0.22, -0.35)], 0x10b981);
        }
      } else {
        // Series Single-Loop Horizontal Chain along Z = -0.32
        const chain: THREE.Object3D[] = [];
        if (rMain) {
          rMain.group.position.set(-1.1, 0.16, -0.32);
          stageGroup.add(rMain.group);
          chain.push(rMain.group);
        }
        if (indMain) {
          indMain.group.position.set(hasR ? -0.2 : -0.95, 0.16, -0.32);
          stageGroup.add(indMain.group);
          chain.push(indMain.group);
        }
        if (capMain) {
          const xPos = chain.length === 2 ? 0.65 : chain.length === 1 ? -0.15 : -0.9;
          capMain.group.position.set(xPos, 0.16, -0.32);
          stageGroup.add(capMain.group);
          chain.push(capMain.group);
        }
        // Source -> first element -> ... -> Output LED -> Return
        if (chain.length > 0) {
          const first = chain[0].position;
          addWire([new THREE.Vector3(-1.62, 0.2, 0.35), new THREE.Vector3(-1.45, 0.52, 0.0), new THREE.Vector3(first.x - 0.32, 0.22, first.z)], 0xef4444);
          for (let i = 0; i < chain.length - 1; i++) {
            const pA = chain[i].position;
            const pB = chain[i + 1].position;
            addWire([new THREE.Vector3(pA.x + 0.26, 0.22, pA.z), new THREE.Vector3((pA.x + pB.x) / 2, 0.5, pA.z), new THREE.Vector3(pB.x - 0.24, 0.22, pB.z)], i === 0 ? 0xf59e0b : 0x22d3ee);
          }
          const last = chain[chain.length - 1].position;
          addWire([new THREE.Vector3(last.x + 0.22, 0.22, last.z), new THREE.Vector3((last.x + 1.48) / 2, 0.5, -0.32), new THREE.Vector3(1.45, 0.22, -0.35)], 0x10b981);
        }
      }
    } else if (mode === "DCDC") {
      loadPot.group.position.set(-1.65, 0.16, 0.5);
      testBtn.group.position.set(1.52, 0.16, 0.5);
      outLed.group.position.set(1.52, 0.16, -0.35);

      const qSw = createTransistorTo2203D(1.05, 0x22d3ee);
      const rLoad = rMain!;
      const lChoke = indMain!;
      const cOut = capMain!;

      if (topoTag === "BOOST") {
        // Boost: Inductor at input -> Shunt Switch -> Forward Diode/Cap/Load
        lChoke.group.position.set(-1.05, 0.16, -0.32);
        qSw.position.set(-0.22, 0.16, 0.38);
        cOut.group.position.set(0.55, 0.16, -0.25);
        rLoad.group.position.set(1.05, 0.16, 0.25);
        addWire([new THREE.Vector3(-1.62, 0.2, 0.32), new THREE.Vector3(-1.35, 0.5, -0.05), new THREE.Vector3(-1.05, 0.22, -0.32)], 0xef4444);
        addWire([new THREE.Vector3(-0.85, 0.22, -0.32), new THREE.Vector3(-0.5, 0.5, 0.05), new THREE.Vector3(-0.22, 0.22, 0.38)], 0xf59e0b);
        addWire([new THREE.Vector3(-0.85, 0.22, -0.32), new THREE.Vector3(-0.1, 0.52, -0.3), new THREE.Vector3(0.55, 0.22, -0.25)], 0x22d3ee);
        addWire([new THREE.Vector3(0.65, 0.22, -0.25), new THREE.Vector3(1.1, 0.48, -0.28), new THREE.Vector3(1.48, 0.22, -0.35)], 0x10b981);
      } else if (topoTag === "BUCK_BOOST") {
        // Buck-Boost: Series switch -> Shunt Inductor -> Inverted Cap/Load
        qSw.position.set(-0.95, 0.16, -0.35);
        lChoke.group.position.set(-0.1, 0.16, 0.32);
        cOut.group.position.set(0.65, 0.16, -0.32);
        rLoad.group.position.set(1.05, 0.16, 0.22);
        addWire([new THREE.Vector3(-1.6, 0.2, 0.35), new THREE.Vector3(-1.3, 0.5, 0.0), new THREE.Vector3(-0.95, 0.22, -0.35)], 0xef4444);
        addWire([new THREE.Vector3(-0.8, 0.22, -0.35), new THREE.Vector3(-0.4, 0.52, 0.0), new THREE.Vector3(-0.1, 0.22, 0.32)], 0xa855f7);
        addWire([new THREE.Vector3(-0.1, 0.22, 0.32), new THREE.Vector3(0.3, 0.5, 0.0), new THREE.Vector3(0.65, 0.22, -0.32)], 0x22d3ee);
        addWire([new THREE.Vector3(0.75, 0.22, -0.32), new THREE.Vector3(1.12, 0.48, -0.32), new THREE.Vector3(1.48, 0.22, -0.35)], 0x10b981);
      } else {
        // Buck: Series Switch -> Series Inductor -> Shunt Cap & Load
        qSw.position.set(-1.05, 0.16, -0.32);
        lChoke.group.position.set(-0.22, 0.16, -0.32);
        cOut.group.position.set(0.55, 0.16, 0.15);
        rLoad.group.position.set(1.05, 0.16, -0.32);
        addWire([new THREE.Vector3(-1.55, 0.2, 0.35), new THREE.Vector3(-1.3, 0.48, 0.0), new THREE.Vector3(-1.05, 0.22, -0.32)], 0xef4444);
        addWire([new THREE.Vector3(-0.88, 0.22, -0.32), new THREE.Vector3(-0.55, 0.5, -0.32), new THREE.Vector3(-0.22, 0.22, -0.32)], 0xf59e0b);
        addWire([new THREE.Vector3(-0.02, 0.22, -0.32), new THREE.Vector3(0.35, 0.5, -0.1), new THREE.Vector3(0.55, 0.22, 0.15)], 0x22d3ee);
        addWire([new THREE.Vector3(0.6, 0.22, 0.15), new THREE.Vector3(1.05, 0.48, -0.15), new THREE.Vector3(1.48, 0.22, -0.35)], 0x10b981);
      }
      stageGroup.add(qSw, rLoad.group, lChoke.group, cOut.group);
    } else if (mode === "SCR" || mode === "INVERTER") {
      loadPot.group.position.set(-1.62, 0.16, 0.48);
      testBtn.group.position.set(1.48, 0.16, 0.5);
      outLed.group.position.set(1.48, 0.16, -0.32);

      const bridgeCount = topoTag === "HALF_WAVE" ? 1 : mode === "INVERTER" ? 4 : 2;
      for (let i = 0; i < bridgeCount; i++) {
        const scr = createTransistorTo2203D(0.95, i % 2 === 0 ? 0xf59e0b : 0x22d3ee);
        scr.position.set(-0.95 + i * 0.58, 0.16, i < 2 ? -0.32 : 0.42);
        stageGroup.add(scr);
        if (i > 0) {
          addWire(
            [
              new THREE.Vector3(-0.95 + (i - 1) * 0.58, 0.22, i - 1 < 2 ? -0.32 : 0.42),
              new THREE.Vector3(-0.95 + (i - 0.5) * 0.58, 0.46, 0.05),
              new THREE.Vector3(-0.95 + i * 0.58, 0.22, i < 2 ? -0.32 : 0.42),
            ],
            0x22d3ee
          );
        }
      }
      if (rMain) {
        rMain.group.position.set(0.85, 0.16, -0.32);
        stageGroup.add(rMain.group);
      }
      if (capMain) {
        capMain.group.position.set(0.3, 0.16, 0.42);
        stageGroup.add(capMain.group);
        addWire([new THREE.Vector3(0.3, 0.22, 0.42), new THREE.Vector3(0.58, 0.46, 0.05), new THREE.Vector3(0.85, 0.22, -0.32)], 0xa855f7);
      }
      if (indMain) {
        indMain.group.position.set(-0.25, 0.16, 0.42);
        stageGroup.add(indMain.group);
        addWire([new THREE.Vector3(-0.25, 0.22, 0.42), new THREE.Vector3(0.02, 0.44, 0.42), new THREE.Vector3(0.3, 0.22, 0.42)], 0xf59e0b);
      }
      addWire([new THREE.Vector3(-1.55, 0.2, 0.35), new THREE.Vector3(-1.25, 0.5, 0.0), new THREE.Vector3(-0.95, 0.22, -0.32)], 0xef4444);
      addWire([new THREE.Vector3(-0.85, 0.22, -0.32), new THREE.Vector3(0.05, 0.52, -0.32), new THREE.Vector3(0.85, 0.22, -0.32)], 0xf59e0b);
      addWire([new THREE.Vector3(0.95, 0.22, -0.32), new THREE.Vector3(1.22, 0.48, -0.32), new THREE.Vector3(1.48, 0.22, -0.32)], 0x10b981);
    } else if (mode === "OPAMP" || mode === "NETWORK" || mode === "THEVENIN") {
      loadPot.group.position.set(-1.62, 0.16, 0.48);
      testBtn.group.position.set(1.48, 0.16, 0.5);
      outLed.group.position.set(1.48, 0.16, -0.32);

      const icLabel = mode === "OPAMP" ? "LM741" : mode === "THEVENIN" ? "TH-NET" : "T-MESH";
      const opIc = createDipIc3D(8, icLabel, 0.95, maxAniso);
      opIc.position.set(-0.2, 0.16, 0.05);
      stageGroup.add(opIc);

      const rIn = createResistor3D(rOhm, 1.15);
      rIn.group.position.set(-1.12, 0.16, -0.32);
      stageGroup.add(rIn.group);

      if (rMain) {
        rMain.group.position.set(0.65, 0.16, topoTag === "NON_INVERTING" ? 0.45 : -0.35);
        stageGroup.add(rMain.group);
      }
      // Attach directly to DIP-8 side pin rows (not package center)
      addWire([new THREE.Vector3(-1.55, 0.2, 0.42), new THREE.Vector3(-1.35, 0.48, 0.05), new THREE.Vector3(-1.32, 0.22, -0.32)], 0xef4444);
      addWire([new THREE.Vector3(-0.92, 0.22, -0.32), new THREE.Vector3(-0.58, 0.48, -0.22), new THREE.Vector3(-0.26, 0.22, -0.18)], 0x22d3ee);
      const fbZ = topoTag === "NON_INVERTING" ? 0.45 : -0.35;
      addWire([new THREE.Vector3(-0.08, 0.22, 0.28), new THREE.Vector3(0.25, 0.52, fbZ * 0.7), new THREE.Vector3(0.48, 0.22, fbZ)], 0xf59e0b);
      addWire([new THREE.Vector3(0.84, 0.22, fbZ), new THREE.Vector3(1.15, 0.48, (fbZ - 0.32) / 2), new THREE.Vector3(1.48, 0.22, -0.32)], 0x10b981);
    } else {
      // BJT / MOSFET / TRANSIENT
      loadPot.group.position.set(-1.62, 0.16, 0.48);
      testBtn.group.position.set(1.48, 0.16, 0.5);
      outLed.group.position.set(1.48, 0.16, -0.32);

      if (rMain) {
        rMain.group.position.set(-1.05, 0.16, -0.32);
        stageGroup.add(rMain.group);
      }
      if (mode === "BJT" || mode === "MOSFET") {
        const qDev = createTransistorTo2203D(1.08, mode === "MOSFET" ? 0xa855f7 : 0x22d3ee);
        qDev.position.set(0.05, 0.16, 0.25);
        stageGroup.add(qDev);
      }
      if (indMain) {
        indMain.group.position.set(0.0, 0.16, -0.32);
        stageGroup.add(indMain.group);
      }
      if (capMain) {
        capMain.group.position.set(0.72, 0.16, topoTag === "CE_BYPASSED" ? 0.42 : -0.32);
        stageGroup.add(capMain.group);
      }
      addWire([new THREE.Vector3(-1.55, 0.2, 0.38), new THREE.Vector3(-1.3, 0.5, 0.05), new THREE.Vector3(-1.24, 0.22, -0.32)], 0xef4444);
      addWire([new THREE.Vector3(-0.82, 0.22, -0.32), new THREE.Vector3(-0.35, 0.52, -0.05), new THREE.Vector3(0.02, 0.24, 0.15)], 0x22d3ee);
      addWire([new THREE.Vector3(0.15, 0.24, 0.15), new THREE.Vector3(0.85, 0.5, -0.1), new THREE.Vector3(1.45, 0.22, -0.32)], 0x10b981);
    }

    // Add Bench PSU Power & Ground Return Leads + Scope Coax + Closed Ground Return Bus
    const psuPosWorld = benchPsu.pos5VLocal
      .clone()
      .multiplyScalar(0.88)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.48)
      .add(benchPsu.group.position);
    const psuGndWorld = benchPsu.posGndLocal
      .clone()
      .multiplyScalar(0.88)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.48)
      .add(benchPsu.group.position);

    addWire([psuPosWorld, new THREE.Vector3(-2.15, 0.48, 0.05), new THREE.Vector3(-1.62, 0.22, 0.48)], 0xef4444);
    addWire([new THREE.Vector3(1.48, 0.22, -0.32), new THREE.Vector3(0.2, 0.4, 0.88), new THREE.Vector3(-1.62, 0.22, 0.55)], 0x475569);
    addWire([psuGndWorld, new THREE.Vector3(-2.15, 0.25, 0.48), new THREE.Vector3(-1.62, 0.2, 0.55)], 0x334155);
    addWire(
      [
        scopeProbe.cableAttachLocal.clone().add(scopeProbe.group.position),
        new THREE.Vector3(1.85, 1.05, -0.95),
        new THREE.Vector3(2.25, 0.35, -1.65),
      ],
      0xfacc15
    );

    const flows: FlowingWire3DHandle[] = [];
    wirePaths.forEach((pts, idx) => {
      const col = wireColors[idx % wireColors.length];
      const fw = createFlowingWire3D(pts, col, {
        radius: 0.02,
        tubularSegments: 20,
        radialSegments: 7,
        packetCount: 4,
        packetLength: 0.11,
        speedMult: 0.85,
        phaseOffset: (idx * 0.21) % 1,
      });
      stageGroup.add(fw.group);
      flows.push(fw);
    });

    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const btnHit = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.65), hitMat);
    btnHit.position.copy(testBtn.group.position).setY(0.32);
    btnHit.layers.set(1);
    const potHit = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 0.65), hitMat);
    potHit.position.copy(loadPot.group.position).setY(0.34);
    potHit.layers.set(1);
    stageGroup.add(btnHit, potHit);

    actorsRef.current = {
      rMain,
      capMain,
      indMain,
      loadPot,
      testBtn,
      outLed,
      oled,
      benchPsu,
      hitTargets: [btnHit, potHit],
      flows,
      showInd: hasL,
    };

    if (!studio.isSoftwareGl) studio.renderer.compile(studio.scene, studio.camera);
  }, [structuralKey]);

  const switchCam = (c: StageCam) => {
    setCamView(c);
    _goalP.set(...STAGE_CAMS[c].pos);
    _goalT.set(...STAGE_CAMS[c].tgt);
    camAnimRef.current = true;
  };

  return (
    <div className="relative w-full h-[300px] sm:h-[340px] rounded-xl overflow-hidden border border-slate-800 bg-[#060a14]">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none bg-[#0a1222]/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-200 flex items-center gap-2">
        <span className="font-bold text-cyan-300">3D Hardware Bench</span>
        <span className="text-slate-600" aria-hidden="true">·</span>
        <span>{props.title}</span>
      </div>

      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockHidden((v) => !v)}
          className="mb-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#0a1222] border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          {dockHidden ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          <span>{dockHidden ? "Camera" : "Hide"}</span>
        </button>
        {!dockHidden && (
          <div className="flex items-center gap-1 bg-[#091020]/95 border border-slate-700 rounded-lg px-2 py-1">
            <Camera className="w-3 h-3 text-cyan-400 mr-1" />
            {(["ISO", "TOP", "CLOSE"] as StageCam[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => switchCam(c)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
                  camView === c ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:text-white bg-slate-800"
                }`}
              >
                {c === "ISO" ? "3D Iso" : c === "TOP" ? "Top" : "Close-up"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => switchCam("ISO")}
              className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
              title="Reset 3D View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalogStage3D;
