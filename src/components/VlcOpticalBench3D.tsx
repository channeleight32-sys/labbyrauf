import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, RotateCcw, Radio } from "lucide-react";
import {
  afterDrawSync,
  disposeSceneSubtree,
  initThreeStudio,
} from "../utils/threeStudio";
import {
  createDiffusedLed3D,
  createDipIc3D,
  createResistor3D,
  createTransistorTo2203D,
  DiffusedLedHandle,
} from "./three/electronicsPrimitives3D";
import {
  createBenchPowerSupply3D,
  createEsp32ModuleCompact3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";

export interface VlcOpticalBench3DProps {
  wavelengthColorHex: string;
  wavelengthNm: number;
  distanceM: number;
  halfPowerAngleDeg: number;
  irradianceAngleDeg: number;
  incidenceAngleDeg: number;
  driveCurrentMa: number;
  ambientLightLux: number;
  lensGain: number;
  tiaResistorOhm: number;
  receivedPowerUw: number;
  snrDb: number;
  isTransmitting: boolean;
  txBitValue: number;
  rxBitValue: number;
  isBitMatching: boolean;
  baudRate: number;
}

type VlcCameraPreset = "ISO" | "TX" | "CHANNEL" | "RX" | "TOP";

const PRESETS: Record<
  VlcCameraPreset,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  ISO: { label: "Bench Iso", pos: [0, 5.2, 9.2], target: [0, 0.9, 0] },
  TX: { label: "TX Emitter", pos: [-4.8, 3.0, 4.4], target: [-4.2, 1.0, 0] },
  CHANNEL: { label: "Optical Path", pos: [0, 3.2, 6.2], target: [0, 1.15, 0] },
  RX: { label: "RX Photodiode", pos: [4.8, 3.0, 4.4], target: [3.6, 1.0, 0] },
  TOP: { label: "Top Down", pos: [0, 11.4, 0.5], target: [0, 0.8, 0] },
};

const _targetVec = new THREE.Vector3();
const _posVec = new THREE.Vector3();

export default function VlcOpticalBench3D(props: VlcOpticalBench3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const isVisible = usePageVisibility();
  const prefersReducedMotion = usePrefersReducedMotion();
  const visibleRef = useRef(isVisible);
  visibleRef.current = isVisible;
  const reducedRef = useRef(prefersReducedMotion);
  reducedRef.current = prefersReducedMotion;

  const [activePreset, setActivePreset] = useState<VlcCameraPreset>("ISO");
  const [hoverTip, setHoverTip] = useState<{
    title: string;
    detail: string;
    x: number;
    y: number;
  } | null>(null);

  const presetFnRef = useRef<((p: VlcCameraPreset) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const studio = initThreeStudio(container, {
      fov: 38,
      cameraPos: PRESETS.ISO.pos,
      targetPos: PRESETS.ISO.target,
      minDistance: 2.5,
      maxDistance: 22,
      benchSize: 32,
      gridDivisions: 32,
    });

    const { scene, camera, renderer, controls, isSoftwareGl } = studio;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const world = new THREE.Group();
    scene.add(world);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.85,
      roughness: 0.28,
    });
    const darkAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.65,
      roughness: 0.38,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.9,
      roughness: 0.25,
    });

    const opticalRail = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.26, 1.45), railMat);
    opticalRail.position.set(0, 0.13, 0);
    opticalRail.receiveShadow = true;
    opticalRail.castShadow = true;
    world.add(opticalRail);

    for (let i = -5; i <= 5; i++) {
      const tickMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.02, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      tickMesh.position.set(i * 1.0, 0.27, 0.62);
      world.add(tickMesh);
    }

    const txFlows: FlowingWire3DHandle[] = [];
    const rxFlows: FlowingWire3DHandle[] = [];

    const addStageWire = (
      parent: THREE.Group,
      list: FlowingWire3DHandle[],
      p1: THREE.Vector3,
      p2: THREE.Vector3,
      colorHex: number,
      opts: { lift?: number; reverse?: boolean; packetColorHex?: number; radius?: number } = {}
    ) => {
      const lift = opts.lift ?? 0.24;
      const mid = p1.clone().lerp(p2, 0.5);
      mid.y = Math.max(p1.y, p2.y) + lift;
      const hw = createFlowingWire3D([p1, mid, p2], colorHex, {
        radius: opts.radius ?? 0.017,
        packetCount: 4,
        packetLength: 0.09,
        packetColorHex: opts.packetColorHex,
        reverse: opts.reverse ?? false,
        phaseOffset: (list.length * 0.21) % 1,
      });
      parent.add(hw.group);
      list.push(hw);
      return hw;
    };

    // Benchtop DC Power Supply feeding Optical Rail TX
    const benchPsu = createBenchPowerSupply3D("VLC BENCH PSU", maxAniso);
    benchPsu.group.position.set(-4.5, 0, -1.75);
    benchPsu.group.scale.setScalar(0.88);
    benchPsu.group.userData.tipTitle = "Optical Bench Dual Power Supply";
    benchPsu.group.userData.tipDetail = "+3.3V LED Bias Rail & +5V Transceiver Feed";
    world.add(benchPsu.group);

    // 2. Transmitter Assembly (Fixed at Left x = -4.5)
    const txAssembly = new THREE.Group();
    txAssembly.position.set(-4.5, 0.26, 0);
    txAssembly.userData.tipTitle = "ESP32-TX + 2N2222 BJT Optical Emitter";
    txAssembly.userData.tipDetail = "GPIO4 UART2 -> 1kΩ R_B -> 2N2222 -> LED Collimator";
    world.add(txAssembly);

    const txSled = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 1.8), darkAnodizedMat);
    txSled.position.y = 0.08;
    txSled.castShadow = true;
    txAssembly.add(txSled);

    const espTx = createEsp32ModuleCompact3D("ESP32-TX", 0.68, maxAniso);
    espTx.group.position.set(-0.48, 0.16, 0);
    txAssembly.add(espTx.group);

    // 2N2222 Transistor + R_B (1k) + R_LIM (100R)
    const q1Bjt = createTransistorTo2203D(0.56, 0x38bdf8);
    q1Bjt.position.set(0.18, 0.16, 0.42);
    const rBase = createResistor3D(1000, 0.52);
    rBase.group.position.set(-0.04, 0.16, 0.42);
    const rLim = createResistor3D(100, 0.52);
    rLim.group.position.set(0.18, 0.16, -0.35);
    txAssembly.add(q1Bjt, rBase.group, rLim.group);

    // TX Scope Probe CH1 on GPIO4 -> R_B
    const txScope = createScopeProbe3D(0xfacc15, 0.68);
    txScope.group.position.set(-0.15, 0.34, 0.42);
    txAssembly.add(txScope.group);
    addStageWire(
      txAssembly,
      txFlows,
      new THREE.Vector3(-0.15, 0.34, 0.42).add(txScope.cableAttachLocal),
      new THREE.Vector3(-1.2, 0.18, 1.1),
      0x334155,
      { lift: 0.3, packetColorHex: 0xfacc15 }
    );

    // Wire PSU -> ESP32-TX & TX Driver
    const psu5VLocalToTx = benchPsu.group.position
      .clone()
      .add(benchPsu.pos5VLocal.clone().multiplyScalar(0.88))
      .sub(txAssembly.position);
    const psuGndLocalToTx = benchPsu.group.position
      .clone()
      .add(benchPsu.posGndLocal.clone().multiplyScalar(0.88))
      .sub(txAssembly.position);

    const txGpio4 = new THREE.Vector3(-0.48, 0.16, 0).add(espTx.getPinLocalPos("RIGHT", 4));
    const txVin = new THREE.Vector3(-0.48, 0.16, 0).add(espTx.getPinLocalPos("LEFT", 14));
    const txGnd = new THREE.Vector3(-0.48, 0.16, 0).add(espTx.getPinLocalPos("LEFT", 13));

    addStageWire(txAssembly, txFlows, psu5VLocalToTx, txVin, 0xef4444, { lift: 0.36, packetColorHex: 0xfde047 });
    addStageWire(txAssembly, txFlows, psuGndLocalToTx, txGnd, 0x1e293b, { lift: 0.28, reverse: true });
    addStageWire(txAssembly, txFlows, txGpio4, new THREE.Vector3(-0.18, 0.26, 0.42), 0x38bdf8, { lift: 0.18 });
    addStageWire(txAssembly, txFlows, new THREE.Vector3(0.18, 0.3, 0.42), new THREE.Vector3(0.45, 0.85, 0.1), 0x22d3ee, { lift: 0.25 });
    addStageWire(txAssembly, txFlows, new THREE.Vector3(0.18, 0.26, -0.35), new THREE.Vector3(0.45, 0.85, -0.1), 0xf59e0b, { lift: 0.25 });

    const txPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 16), railMat);
    txPedestal.position.set(0.55, 0.48, 0);
    txAssembly.add(txPedestal);

    const emitterPivot = new THREE.Group();
    emitterPivot.position.set(0.55, 0.92, 0);
    txAssembly.add(emitterPivot);

    const collimatorHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.56, 22),
      darkAnodizedMat
    );
    collimatorHousing.rotation.z = -Math.PI / 2;
    collimatorHousing.castShadow = true;
    emitterPivot.add(collimatorHousing);

    const lensRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 10, 24), brassMat);
    lensRing.rotation.y = Math.PI / 2;
    lensRing.position.x = 0.28;
    emitterPivot.add(lensRing);

    const txLedHandle: DiffusedLedHandle = createDiffusedLed3D(0xef4444, 1.35);
    txLedHandle.group.rotation.z = -Math.PI / 2;
    txLedHandle.group.position.set(0.22, 0, 0);
    emitterPivot.add(txLedHandle.group);

    // 3. Free-Space Optical Beam Cone & Traveling Photon Wave Packets + OOK Wave Rings
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.26,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamConeGeo = new THREE.ConeGeometry(1, 1, 24, 1, true);
    beamConeGeo.translate(0, -0.5, 0);
    beamConeGeo.rotateZ(-Math.PI / 2);
    const beamCone = new THREE.Mesh(beamConeGeo, beamMat);
    beamCone.position.set(-4.5 + 0.55 + 0.28, 1.18, 0);
    beamCone.userData.tipTitle = "Free-Space LOS Optical Channel";
    beamCone.userData.tipDetail = "Lambertian propagation h(t) = (m+1)A/(2πd²) cos^m(φ) cos(ψ)";
    world.add(beamCone);

    const photonSpheres: THREE.Mesh[] = [];
    const photonMats: THREE.MeshBasicMaterial[] = [];
    const ookRings: THREE.Mesh[] = [];
    const ookRingMats: THREE.MeshBasicMaterial[] = [];
    for (let i = 0; i < 8; i++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.85,
      });
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), pMat);
      pMesh.position.set(-3.5 + i * 0.8, 1.18, 0);
      world.add(pMesh);
      photonSpheres.push(pMesh);
      photonMats.push(pMat);

      const rMat = new THREE.MeshBasicMaterial({
        color: 0xef4444,
        transparent: true,
        opacity: 0.4,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const rMesh = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.24, 24), rMat);
      rMesh.rotation.y = Math.PI / 2;
      rMesh.position.set(-3.5 + i * 0.8, 1.18, 0);
      world.add(rMesh);
      ookRings.push(rMesh);
      ookRingMats.push(rMat);
    }

    // 4. Overhead Ambient Light Disturbance Lamp
    const lampFixture = new THREE.Group();
    lampFixture.position.set(0, 3.6, 0);
    lampFixture.userData.tipTitle = "Ambient Optical Noise Source (Lux)";
    lampFixture.userData.tipDetail = "Background solar/room irradiance inducing photodiode shot noise";
    world.add(lampFixture);

    const lampHood = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.55, 0.42, 20), darkAnodizedMat);
    const lampBulbMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 14), lampBulbMat);
    lampBulb.position.y = -0.15;
    lampFixture.add(lampHood, lampBulb);

    const ambientPointLight = new THREE.PointLight(0xfbbf24, 0.4, 8);
    ambientPointLight.position.set(0, 3.2, 0);
    scene.add(ambientPointLight);

    // 5. Receiver Assembly (Slides on Optical Rail based on distanceM)
    const rxAssembly = new THREE.Group();
    rxAssembly.position.set(1.8, 0.26, 0);
    rxAssembly.userData.tipTitle = "BPW34 + OPA380 TIA + LM393 Slicer + ESP32-RX";
    rxAssembly.userData.tipDetail = "Concentrator Lens -> BPW34 -> Transimpedance Amp -> LM393 -> GPIO34";
    world.add(rxAssembly);

    const rxSled = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.16, 1.8), darkAnodizedMat);
    rxSled.position.y = 0.08;
    rxSled.castShadow = true;
    rxAssembly.add(rxSled);

    // OPA380 TIA DIP-8 + LM393 Slicer DIP-8 + R_F Feedback + ESP32-RX
    const opa380 = createDipIc3D(8, "OPA380", 0.72, maxAniso);
    opa380.position.set(-0.08, 0.16, -0.32);
    const lm393 = createDipIc3D(8, "LM393", 0.72, maxAniso);
    lm393.position.set(0.22, 0.16, 0.36);
    const rFeedback = createResistor3D(100000, 0.5);
    rFeedback.group.position.set(-0.08, 0.32, -0.58);
    const espRx = createEsp32ModuleCompact3D("ESP32-RX", 0.68, maxAniso);
    espRx.group.position.set(0.68, 0.16, 0);
    rxAssembly.add(opa380, lm393, rFeedback.group, espRx.group);

    // Scope Probe CH2 on TIA Analog Output (TP2)
    const rxScope = createScopeProbe3D(0x22d3ee, 0.68);
    rxScope.group.position.set(0.12, 0.32, -0.1);
    rxAssembly.add(rxScope.group);
    addStageWire(
      rxAssembly,
      rxFlows,
      new THREE.Vector3(0.12, 0.32, -0.1).add(rxScope.cableAttachLocal),
      new THREE.Vector3(1.15, 0.18, 1.15),
      0x334155,
      { lift: 0.3, packetColorHex: 0x22d3ee }
    );

    const rxGpio34 = new THREE.Vector3(0.68, 0.16, 0).add(espRx.getPinLocalPos("LEFT", 6));
    addStageWire(rxAssembly, rxFlows, new THREE.Vector3(-0.55, 0.72, 0), new THREE.Vector3(-0.22, 0.3, -0.32), 0x34d399, { lift: 0.2 });
    addStageWire(rxAssembly, rxFlows, new THREE.Vector3(0.12, 0.3, -0.32), new THREE.Vector3(0.12, 0.3, 0.25), 0x22d3ee, { lift: 0.18 });
    addStageWire(rxAssembly, rxFlows, new THREE.Vector3(0.35, 0.3, 0.36), rxGpio34, 0xfbbf24, { lift: 0.18 });

    const rxPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.65, 16), railMat);
    rxPedestal.position.set(-0.62, 0.48, 0);
    rxAssembly.add(rxPedestal);

    const rxOpticsPivot = new THREE.Group();
    rxOpticsPivot.position.set(-0.62, 0.92, 0);
    rxAssembly.add(rxOpticsPivot);

    const rxBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.42, 22), darkAnodizedMat);
    rxBarrel.rotation.z = Math.PI / 2;
    rxOpticsPivot.add(rxBarrel);

    const lensGlass = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 0.06, 22),
      new THREE.MeshPhysicalMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1,
      })
    );
    lensGlass.rotation.z = Math.PI / 2;
    lensGlass.position.x = -0.22;
    rxOpticsPivot.add(lensGlass);

    const photodiodeDieMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.5,
      roughness: 0.25,
    });
    const photodiodeDie = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.22), photodiodeDieMat);
    photodiodeDie.position.x = -0.05;
    rxOpticsPivot.add(photodiodeDie);

    const rxStatusLed = createDiffusedLed3D(0x10b981, 0.72);
    rxStatusLed.group.position.set(0.88, 0.25, 0.62);
    rxAssembly.add(rxStatusLed.group);

    // Raycast targets for hover tooltips
    const rayTargets = [benchPsu.group, txAssembly, beamCone, lampFixture, rxAssembly];
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(rayTargets, true);
      if (hits.length === 0) {
        setHoverTip(null);
        renderer.domElement.style.cursor = "grab";
        return;
      }
      let cur: THREE.Object3D | null = hits[0].object;
      while (cur && !cur.userData.tipTitle) cur = cur.parent;
      if (cur && cur.userData.tipTitle) {
        setHoverTip({
          title: String(cur.userData.tipTitle),
          detail: String(cur.userData.tipDetail || ""),
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoverTip(null);
        renderer.domElement.style.cursor = "grab";
      }
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    let camAnim: { pos: [number, number, number]; target: [number, number, number] } | null = null;
    presetFnRef.current = (p) => {
      camAnim = { pos: PRESETS[p].pos, target: PRESETS[p].target };
    };
    controls.addEventListener("start", () => {
      camAnim = null;
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let disposed = false;
    let frameId = 0;
    let renderBusy = false;
    let phase = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed || renderBusy) return;
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.08);
        const elapsed = clock.getElapsedTime();
        const cur = propsRef.current;

        if (camAnim) {
          _posVec.set(...camAnim.pos);
          _targetVec.set(...camAnim.target);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _posVec.x, 6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _posVec.y, 6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _posVec.z, 6, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _targetVec.x, 6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _targetVec.y, 6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _targetVec.z, 6, delta);
          if (camera.position.distanceTo(_posVec) < 0.05) camAnim = null;
        }

        const targetRxX = -0.8 + THREE.MathUtils.clamp((cur.distanceM - 0.1) / 4.9, 0, 1) * 5.2;
        rxAssembly.position.x = THREE.MathUtils.damp(rxAssembly.position.x, targetRxX, 8, delta);

        emitterPivot.rotation.y = THREE.MathUtils.degToRad(-cur.irradianceAngleDeg);
        rxOpticsPivot.rotation.y = THREE.MathUtils.degToRad(cur.incidenceAngleDeg);

        const waveHex = new THREE.Color(cur.wavelengthColorHex).getHex();
        const txLit = cur.txBitValue === 1;
        const driveNorm = THREE.MathUtils.clamp(cur.driveCurrentMa / 30, 0.25, 1.3);
        txLedHandle.setIntensity(txLit ? driveNorm : 0.05, waveHex);

        const beamStartX = -3.67;
        const beamEndX = rxAssembly.position.x - 0.82;
        const spanLen = Math.max(0.8, beamEndX - beamStartX);
        const coneRadius = THREE.MathUtils.clamp(
          0.22 + spanLen * Math.tan(THREE.MathUtils.degToRad(Math.min(55, cur.halfPowerAngleDeg)) * 0.45),
          0.26,
          1.75
        );
        beamCone.position.set(beamStartX, 1.18, 0);
        beamCone.rotation.y = THREE.MathUtils.degToRad(-cur.irradianceAngleDeg);
        beamCone.scale.set(spanLen, coneRadius, coneRadius);
        beamMat.color.setHex(waveHex);
        beamMat.opacity = txLit ? (cur.isTransmitting ? 0.34 : 0.2) : 0.035;

        const speed = THREE.MathUtils.clamp(cur.baudRate / 600, 0.5, 2.8);
        if (cur.isTransmitting && !reducedRef.current && visibleRef.current) {
          phase = (phase + delta * 0.85 * speed) % 1;
        }
        photonSpheres.forEach((p, idx) => {
          const t = (phase + idx / photonSpheres.length) % 1;
          p.position.x = beamStartX + t * spanLen;
          p.position.y = 1.18 + Math.sin(t * Math.PI * 3 + idx) * (txLit ? 0.07 : 0.02);
          photonMats[idx].color.setHex(waveHex);
          photonMats[idx].opacity = cur.isTransmitting && txLit ? 0.88 * (1 - t * 0.35) : 0.14;
          const sc = txLit ? 1.0 - t * 0.25 : 0.45;
          p.scale.set(sc, sc, sc);

          const r = ookRings[idx];
          r.position.x = p.position.x;
          const rSc = 0.65 + t * (coneRadius * 2.2);
          r.scale.setScalar(rSc);
          ookRingMats[idx].color.setHex(waveHex);
          ookRingMats[idx].opacity = cur.isTransmitting && txLit ? 0.48 * (1 - t * 0.75) : 0.06;
        });

        const ambNorm = THREE.MathUtils.clamp(cur.ambientLightLux / 5000, 0, 1);
        lampBulbMat.emissiveIntensity = 0.08 + ambNorm * 2.4;
        ambientPointLight.intensity = 0.15 + ambNorm * 2.2;

        photodiodeDieMat.emissive.setHex(cur.rxBitValue === 1 ? 0x10b981 : 0x0f172a);
        photodiodeDieMat.emissiveIntensity = cur.rxBitValue === 1 ? 0.9 : 0.1;
        rxStatusLed.setIntensity(
          cur.isBitMatching ? 0.85 : 0.95,
          cur.isBitMatching ? 0x10b981 : 0xf43f5e
        );

        const activeFlow = cur.isTransmitting && !reducedRef.current && visibleRef.current;
        benchPsu.updateReadout(
          `+3.3V  ${(cur.driveCurrentMa / 1000).toFixed(3)}A`,
          `${cur.wavelengthNm}nm · ${cur.baudRate}bps`,
          cur.isTransmitting
        );
        txFlows.forEach((fw) => fw.update(elapsed, activeFlow && txLit, speed));
        rxFlows.forEach((fw) => fw.update(elapsed, activeFlow && cur.rxBitValue === 1, speed));

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (!disposed) animate();
        };
        if (isSoftwareGl) {
          afterDrawSync(renderer, () => disposed, (id) => { frameId = id; }, done);
        } else {
          done();
        }
      });
    };

    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      disposeSceneSubtree(world);
      studio.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-72 sm:h-80 rounded-xl border border-slate-800 bg-[#050811] overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full touch-none" />

      {/* Minimal Top-Left Optical Telemetry Pill */}
      <div className="absolute top-2.5 left-2.5 pointer-events-none px-2.5 py-1.5 rounded-lg bg-[#090f1e]/90 border border-cyan-500/40 text-[10px] font-mono text-cyan-200 flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-white">{props.wavelengthNm}nm LOS</span>
        <span className="text-slate-400">·</span>
        <span className="text-cyan-300 tabular-nums">{props.distanceM.toFixed(2)}m</span>
        <span className="text-slate-400">·</span>
        <span className={props.isBitMatching ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
          SNR {props.snrDb} dB · {props.receivedPowerUw.toFixed(2)} µW
        </span>
      </div>

      {/* Hover Tooltip */}
      {hoverTip && (
        <div
          className="pointer-events-none absolute z-20 px-2.5 py-1.5 rounded-lg bg-[#0a101d]/95 border border-cyan-400/70 text-[10px] font-mono shadow-xl max-w-[230px]"
          style={{ left: Math.min(hoverTip.x + 12, 340), top: Math.max(10, hoverTip.y - 42) }}
        >
          <div className="font-bold text-cyan-300">{hoverTip.title}</div>
          <div className="text-slate-300">{hoverTip.detail}</div>
        </div>
      )}

      {/* Bottom Camera Presets */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#0b1222]/95 border border-cyan-500/35 rounded-xl px-2 py-1 text-[10px] font-mono">
        <Camera className="w-3 h-3 text-cyan-400 mr-1" />
        {(Object.keys(PRESETS) as VlcCameraPreset[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setActivePreset(key);
              presetFnRef.current?.(key);
            }}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
              activePreset === key
                ? "bg-cyan-400 text-slate-950"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {PRESETS[key].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setActivePreset("ISO");
            presetFnRef.current?.("ISO");
          }}
          className="p-1 rounded text-slate-300 hover:bg-slate-800 cursor-pointer"
          title="Reset Optical Bench Camera"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
