import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, Cpu, RotateCcw } from "lucide-react";
import {
  afterDrawSync,
  disposeSceneSubtree,
  initThreeStudio,
} from "../utils/threeStudio";
import {
  createCapacitorElectrolytic3D,
  createDcMotorWheel3D,
  createDiffusedLed3D,
  createDipIc3D,
  createMiniBreadboard3D,
  createResistor3D,
  createSg90Servo3D,
  createTransistorTo2203D,
  createUltrasonicHcSr043D,
} from "./three/electronicsPrimitives3D";
import {
  createAnimatedPipeFlow3D,
  createBenchPowerSupply3D,
  createEsp32ModuleCompact3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";
import type { RoboticsProjectId } from "./RoboticsAutomationLab";

export interface RoboticsStage3DProps {
  projectId: RoboticsProjectId;
  isRunning: boolean;
  radarAngle: number;
  radarObstacles: { angle: number; distCm: number }[];
  ultrasonicDistCm: number;
  servoAngleDeg: number;
  motorDirection: "CW" | "CCW" | "BRAKE";
  motorPwmDuty: number;
  carX: number;
  carY: number;
  carHeadingDeg: number;
  carObstacleDetected: boolean;
  relayChannels: { id: number; name: string; on: boolean; load: string }[];
  pirMotionDetected: boolean;
  tempCelsius: number;
  relativeHumidityPct: number;
  soilMoisturePct: number;
  onToggleRelay?: (id: number) => void;
  onTogglePir?: () => void;
}

type StageCam = "ISO" | "TOP" | "CLOSE";

const STAGE_CAM_PRESETS: Record<
  StageCam,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  ISO: { label: "3D Stage", pos: [0, 5.4, 7.8], target: [-0.4, 0.7, 0] },
  TOP: { label: "Top View", pos: [-0.3, 10.2, 0.45], target: [-0.3, 0.5, 0] },
  CLOSE: { label: "Close-Up", pos: [1.8, 2.7, 4.2], target: [-0.3, 0.75, 0] },
};

const _posV = new THREE.Vector3();
const _tgtV = new THREE.Vector3();

export default function RoboticsStage3D(props: RoboticsStage3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const isVisible = usePageVisibility();
  const prefersReducedMotion = usePrefersReducedMotion();
  const visibleRef = useRef(isVisible);
  visibleRef.current = isVisible;
  const reducedRef = useRef(prefersReducedMotion);
  reducedRef.current = prefersReducedMotion;

  const [camPreset, setCamPreset] = useState<StageCam>("ISO");
  const [hoverLabel, setHoverLabel] = useState<{ title: string; x: number; y: number } | null>(null);
  const rebuildRef = useRef<(() => void) | null>(null);
  const presetRef = useRef<((c: StageCam) => void) | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const studio = initThreeStudio(container, {
      fov: 38,
      cameraPos: STAGE_CAM_PRESETS.ISO.pos,
      targetPos: STAGE_CAM_PRESETS.ISO.target,
      minDistance: 2.2,
      maxDistance: 19,
      benchSize: 30,
      gridDivisions: 30,
    });

    const { scene, camera, renderer, controls, isSoftwareGl } = studio;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const rigGroup = new THREE.Group();
    scene.add(rigGroup);

    let interactives: THREE.Object3D[] = [];
    let stepFn: ((delta: number, elapsed: number) => void) | null = null;

    const buildProjectStage = () => {
      disposeSceneSubtree(rigGroup);
      rigGroup.clear();
      interactives = [];
      stepFn = null;

      const cur = propsRef.current;
      const pid = cur.projectId;

      const anodizedMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        metalness: 0.55,
        roughness: 0.38,
      });
      const pcbMat = new THREE.MeshStandardMaterial({
        color: 0x0e1c36,
        roughness: 0.45,
        metalness: 0.14,
      });
      const acrylicMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.25,
      });

      const flows: FlowingWire3DHandle[] = [];
      const addWire = (
        p1: THREE.Vector3,
        p2: THREE.Vector3,
        colorHex: number,
        opts: {
          lift?: number;
          radius?: number;
          packetCount?: number;
          packetLength?: number;
          packetColorHex?: number;
          speedMult?: number;
          phaseOffset?: number;
          reverse?: boolean;
        } = {}
      ) => {
        const lift = opts.lift ?? 0.34;
        const mid = p1.clone().lerp(p2, 0.5);
        mid.y = Math.max(p1.y, p2.y) + lift;
        const q1 = p1.clone().lerp(mid, 0.55);
        q1.y = Math.max(p1.y, mid.y) + lift * 0.12;
        const q2 = mid.clone().lerp(p2, 0.45);
        q2.y = Math.max(p2.y, mid.y) + lift * 0.12;
        const handle = createFlowingWire3D([p1, q1, mid, q2, p2], colorHex, {
          radius: opts.radius ?? 0.022,
          packetCount: opts.packetCount ?? 4,
          packetLength: opts.packetLength ?? 0.11,
          packetColorHex: opts.packetColorHex,
          speedMult: opts.speedMult ?? 0.85,
          phaseOffset: opts.phaseOffset ?? (flows.length * 0.17) % 1,
          reverse: opts.reverse ?? false,
        });
        rigGroup.add(handle.group);
        flows.push(handle);
        return handle;
      };

      const addScopeAt = (targetPt: THREE.Vector3, label: string, colorHex = 0xfacc15) => {
        const probe = createScopeProbe3D(colorHex, 0.84);
        probe.group.position.copy(targetPt);
        probe.group.userData.tip = label;
        rigGroup.add(probe.group);
        interactives.push(probe.group);

        const tailWorld = targetPt.clone().add(probe.cableAttachLocal);
        const exitWorld = new THREE.Vector3(-4.1, 0.28, Math.min(2.25, tailWorld.z + 0.35));
        addWire(tailWorld, exitWorld, 0x334155, {
          lift: 0.45,
          radius: 0.026,
          packetColorHex: colorHex,
          packetCount: 5,
          speedMult: 1.05,
        });
      };

      // Shared mounted anodized base plate (wider on left to hold PSU & ESP32 cleanly)
      const stageBase = new THREE.Mesh(
        new THREE.BoxGeometry(8.2, 0.16, 4.9),
        anodizedMat
      );
      stageBase.position.set(-0.4, 0.08, 0);
      stageBase.receiveShadow = true;
      stageBase.castShadow = true;
      rigGroup.add(stageBase);

      // Shared Bench Power Supply + ESP32 Master Controller positions
      const isSmartCar = pid === "SMART_CAR";
      if (isSmartCar) {
        const sideDeck = new THREE.Mesh(
          new THREE.BoxGeometry(2.1, 0.16, 4.6),
          anodizedMat
        );
        sideDeck.position.set(-4.6, 0.08, 0);
        sideDeck.receiveShadow = true;
        sideDeck.castShadow = true;
        rigGroup.add(sideDeck);
      }

      const psuPos = isSmartCar
        ? new THREE.Vector3(-4.6, 0.16, -1.25)
        : new THREE.Vector3(-3.35, 0.16, -1.45);
      const benchPsu = createBenchPowerSupply3D("ROBOTICS PSU", maxAniso);
      benchPsu.group.position.copy(psuPos);
      benchPsu.group.scale.setScalar(0.92);
      benchPsu.group.userData.tip = "Dual-Rail Bench PSU (+5V Logic / +12V Actuator / GND)";
      rigGroup.add(benchPsu.group);
      interactives.push(benchPsu.group);

      const psu5VWorld = psuPos.clone().add(benchPsu.pos5VLocal.clone().multiplyScalar(0.92));
      const psu12VWorld = psuPos.clone().add(benchPsu.pos12VLocal.clone().multiplyScalar(0.92));
      const psuGndWorld = psuPos.clone().add(benchPsu.posGndLocal.clone().multiplyScalar(0.92));

      const espPos = isSmartCar
        ? new THREE.Vector3(-4.6, 0.16, 1.05)
        : new THREE.Vector3(-3.25, 0.16, 1.05);
      const esp32 = createEsp32ModuleCompact3D(
        isSmartCar ? "TELEMETRY RX" : "ESP32 MASTER",
        0.96,
        maxAniso
      );
      esp32.group.position.copy(espPos);
      esp32.group.userData.tip = isSmartCar
        ? "ESP32 Telemetry Base Station (Wi-Fi/ESP-NOW)"
        : "ESP32 DevKit V1 · 240MHz Dual-Core Controller";
      rigGroup.add(esp32.group);
      interactives.push(esp32.group);

      const espPin = (side: "LEFT" | "RIGHT", idx: number) =>
        espPos.clone().add(esp32.getPinLocalPos(side, idx));

      // Standard PSU -> ESP32 power & ground rails
      addWire(psu5VWorld, espPin("LEFT", 14), 0xef4444, { lift: 0.42, packetColorHex: 0xfde047 });
      addWire(psuGndWorld, espPin("LEFT", 13), 0x1e293b, { lift: 0.34, packetColorHex: 0x38bdf8, reverse: true });

      if (pid === "RADAR") {
        // Mini breadboard holding 1k/2k ECHO divider + 330R PWM resistor + 100uF cap
        const bbPos = new THREE.Vector3(-1.6, 0.16, 1.2);
        const bb = createMiniBreadboard3D(1.15, 1.5, maxAniso);
        bb.position.copy(bbPos);
        bb.userData.tip = "Signal Conditioning Breadboard (1kΩ/2kΩ Divider + 330Ω + 100µF)";
        rigGroup.add(bb);
        interactives.push(bb);

        const r1 = createResistor3D(1000, 0.65);
        r1.group.position.set(-1.6, 0.32, 0.85);
        const r2 = createResistor3D(2000, 0.65);
        r2.group.position.set(-1.6, 0.32, 1.15);
        const r3 = createResistor3D(330, 0.65);
        r3.group.position.set(-1.6, 0.32, 1.48);
        const cBulk = createCapacitorElectrolytic3D(0.68);
        cBulk.group.position.set(-1.92, 0.32, 0.72);
        rigGroup.add(r1.group, r2.group, r3.group, cBulk.group);

        const servo = createSg90Servo3D();
        servo.group.position.set(0.55, 0.16, 1.25);
        servo.group.scale.setScalar(1.25);
        servo.group.userData.tip = "SG90 Sweep Servo + HC-SR04 Turret";
        rigGroup.add(servo.group);
        interactives.push(servo.group);

        const turretPivot = new THREE.Group();
        turretPivot.position.set(0.55, 1.25, 1.25);
        rigGroup.add(turretPivot);

        const ultrasonic = createUltrasonicHcSr043D(maxAniso);
        ultrasonic.group.scale.setScalar(0.9);
        turretPivot.add(ultrasonic.group);

        const sweepMat = new THREE.MeshBasicMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.25,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const sweepRay = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 3.1), sweepMat);
        sweepRay.rotation.x = -Math.PI / 2;
        sweepRay.position.set(0, -1.04, -1.6);
        turretPivot.add(sweepRay);

        // Pin-to-pin harnesses
        const bbVcc = new THREE.Vector3(-2.0, 0.34, 0.65);
        const bbGnd = new THREE.Vector3(-1.22, 0.34, 0.65);
        addWire(psu5VWorld, bbVcc, 0xef4444, { lift: 0.45 });
        addWire(psuGndWorld, bbGnd, 0x1e293b, { lift: 0.38, reverse: true });
        // Servo +5V / GND / PWM (GPIO4 -> R3 -> SG90)
        addWire(bbVcc, new THREE.Vector3(0.45, 0.42, 1.48), 0xef4444, { lift: 0.3 });
        addWire(bbGnd, new THREE.Vector3(0.55, 0.42, 1.48), 0x475569, { lift: 0.24, reverse: true });
        addWire(espPin("RIGHT", 3), new THREE.Vector3(-1.82, 0.36, 1.48), 0x38bdf8, { lift: 0.28 });
        addWire(new THREE.Vector3(-1.38, 0.36, 1.48), new THREE.Vector3(0.66, 0.44, 1.48), 0x38bdf8, { lift: 0.32 });
        // HC-SR04 VCC, GND, TRIG (GPIO5 -> TRIG), ECHO (ECHO -> R1/R2 -> GPIO18)
        addWire(bbVcc, new THREE.Vector3(0.4, 1.24, 1.25), 0xf59e0b, { lift: 0.45 });
        addWire(espPin("RIGHT", 5), new THREE.Vector3(0.5, 1.24, 1.25), 0x22c55e, { lift: 0.55 });
        addWire(new THREE.Vector3(0.62, 1.24, 1.25), new THREE.Vector3(-1.38, 0.36, 0.85), 0xeab308, { lift: 0.42, reverse: false });
        addWire(new THREE.Vector3(-1.82, 0.36, 1.15), espPin("RIGHT", 7), 0x38bdf8, { lift: 0.32 });

        addScopeAt(new THREE.Vector3(0.66, 0.44, 1.48), "SCOPE CH1: SG90 50Hz PWM (GPIO4)");

        const targetMeshes: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; angle: number }[] = [];
        cur.radarObstacles.forEach((obs, idx) => {
          const rad = THREE.MathUtils.degToRad(obs.angle);
          const distUnits = THREE.MathUtils.clamp((obs.distCm / 45) * 2.7, 0.9, 2.95);
          const tx = 0.55 - Math.cos(rad) * distUnits;
          const tz = 1.25 - Math.sin(rad) * distUnits;
          const tMat = new THREE.MeshStandardMaterial({
            color: 0x334155,
            emissive: 0xf43f5e,
            emissiveIntensity: 0.1,
            roughness: 0.35,
          });
          const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.85, 16), tMat);
          pillar.position.set(tx, 0.58, tz);
          pillar.castShadow = true;
          pillar.userData.tip = `Target T${idx + 1}: ${obs.distCm}cm @ ${obs.angle}°`;
          rigGroup.add(pillar);
          interactives.push(pillar);
          targetMeshes.push({ mesh: pillar, mat: tMat, angle: obs.angle });
        });

        stepFn = (_d, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          servo.setAngleDeg(s.radarAngle);
          turretPivot.rotation.y = THREE.MathUtils.degToRad(90 - s.radarAngle);
          ultrasonic.setWaveProgress((elapsed * 1.1) % 1, 2.7, s.isRunning);
          cBulk.setChargeLevel(s.isRunning ? 0.65 : 0.15);
          targetMeshes.forEach((tm) => {
            const locked = Math.abs(tm.angle - s.radarAngle) <= 12;
            tm.mat.emissiveIntensity = locked ? 1.3 : 0.12;
            tm.mat.color.setHex(locked ? 0xf43f5e : 0x475569);
          });
          benchPsu.updateReadout("+5.00V  0.32A", `SERVO ${s.radarAngle.toFixed(0)}°`, s.isRunning);
          flows.forEach((fw) => fw.update(elapsed, active));
        };
      } else if (pid === "ULTRASONIC") {
        const sensor = createUltrasonicHcSr043D(maxAniso);
        sensor.group.position.set(-1.35, 0.95, -0.45);
        sensor.group.rotation.y = Math.PI / 2;
        sensor.group.userData.tip = "HC-SR04 40kHz Transducer Pair";
        rigGroup.add(sensor.group);
        interactives.push(sensor.group);

        // Breadboard with 2N2222 buzzer driver + 1k/2k divider + 3x Zone LEDs
        const bb = createMiniBreadboard3D(1.5, 1.5, maxAniso);
        bb.position.set(-1.1, 0.16, 1.25);
        bb.userData.tip = "Driver Board: 2N2222 BJT + 1kΩ/2kΩ Divider + 3x Zone LEDs";
        rigGroup.add(bb);
        interactives.push(bb);

        const q1 = createTransistorTo2203D(0.6, 0x38bdf8);
        q1.position.set(-1.35, 0.32, 1.15);
        const rBase = createResistor3D(1000, 0.65);
        rBase.group.position.set(-1.55, 0.32, 0.85);
        const rDiv = createResistor3D(2000, 0.65);
        rDiv.group.position.set(-0.95, 0.32, 0.85);
        const buzzerBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.18, 0.18, 18),
          new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 })
        );
        buzzerBody.position.set(-0.75, 0.4, 1.15);
        rigGroup.add(q1, rBase.group, rDiv.group, buzzerBody);

        const ledG = createDiffusedLed3D(0x22c55e, 0.72);
        ledG.group.position.set(-1.45, 0.32, 1.68);
        const ledY = createDiffusedLed3D(0xeab308, 0.72);
        ledY.group.position.set(-1.1, 0.32, 1.68);
        const ledR = createDiffusedLed3D(0xef4444, 0.72);
        ledR.group.position.set(-0.75, 0.32, 1.68);
        rigGroup.add(ledG.group, ledY.group, ledR.group);

        const wallMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.25,
          roughness: 0.32,
        });
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.5, 2.3), wallMat);
        barrier.position.set(1.3, 0.9, -0.3);
        barrier.castShadow = true;
        barrier.userData.tip = "Sliding Hazard Target Wall";
        rigGroup.add(barrier);
        interactives.push(barrier);

        // Pin-to-pin harnesses
        addWire(psu5VWorld, new THREE.Vector3(-1.35, 0.96, -0.63), 0xef4444, { lift: 0.45 });
        addWire(psuGndWorld, new THREE.Vector3(-1.35, 0.96, -0.27), 0x1e293b, { lift: 0.38, reverse: true });
        addWire(espPin("RIGHT", 4), new THREE.Vector3(-1.35, 0.96, -0.51), 0x22c55e, { lift: 0.4 });
        addWire(new THREE.Vector3(-1.35, 0.96, -0.39), new THREE.Vector3(-0.95, 0.36, 0.85), 0xeab308, { lift: 0.35 });
        addWire(new THREE.Vector3(-1.15, 0.36, 0.85), espPin("RIGHT", 6), 0x38bdf8, { lift: 0.26 });
        // Buzzer & LED harnesses
        const buzzWire = addWire(espPin("RIGHT", 8), new THREE.Vector3(-1.35, 0.38, 1.15), 0xf43f5e, { lift: 0.28 });
        addWire(espPin("RIGHT", 10), new THREE.Vector3(-1.45, 0.36, 1.68), 0x22c55e, { lift: 0.22 });
        addWire(espPin("RIGHT", 11), new THREE.Vector3(-1.1, 0.36, 1.68), 0xeab308, { lift: 0.25 });
        addWire(espPin("RIGHT", 12), new THREE.Vector3(-0.75, 0.36, 1.68), 0xef4444, { lift: 0.28 });

        addScopeAt(new THREE.Vector3(-1.35, 0.96, -0.39), "SCOPE CH1: ECHO Pulse Width (GPIO18)");

        stepFn = (delta, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          const distNorm = THREE.MathUtils.clamp((s.ultrasonicDistCm - 2) / 298, 0, 1);
          const targetX = -0.3 + distNorm * 3.1;
          barrier.position.x = THREE.MathUtils.damp(barrier.position.x, targetX, 8, delta);
          const isCrit = s.ultrasonicDistCm < 15;
          const isWarn = s.ultrasonicDistCm >= 15 && s.ultrasonicDistCm < 40;
          const warnHex = isCrit ? 0xf43f5e : isWarn ? 0xf59e0b : 0x10b981;
          wallMat.color.setHex(warnHex);
          wallMat.emissive.setHex(warnHex);
          ledR.setIntensity(isCrit ? 1 : 0.04);
          ledY.setIntensity(isWarn ? 1 : 0.04);
          ledG.setIntensity(!isCrit && !isWarn ? 1 : 0.04);
          sensor.setWaveProgress((elapsed * 1.1) % 1, Math.max(0.6, barrier.position.x + 1.05), s.isRunning);
          benchPsu.updateReadout("+5.00V  0.19A", `DIST ${s.ultrasonicDistCm.toFixed(0)}cm`, s.isRunning);
          flows.forEach((fw) => fw.update(elapsed, fw === buzzWire ? active && isCrit : active));
        };
      } else if (pid === "SERVO") {
        const regBoard = createMiniBreadboard3D(1.5, 1.5, maxAniso);
        regBoard.position.set(-1.1, 0.16, -0.55);
        regBoard.userData.tip = "LM7805 5V Regulation Stage + 470µF Stall Buffer + 330Ω PWM";
        rigGroup.add(regBoard);
        interactives.push(regBoard);

        const lm7805 = createTransistorTo2203D(0.95, 0xf59e0b);
        lm7805.position.set(-1.35, 0.32, -0.9);
        const cReservoir = createCapacitorElectrolytic3D(0.95);
        cReservoir.group.position.set(-0.85, 0.32, -0.65);
        const rGate = createResistor3D(330, 0.8);
        rGate.group.position.set(-1.1, 0.32, -0.15);
        rigGroup.add(lm7805, cReservoir.group, rGate.group);

        const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.24, 1.8), pcbMat);
        pedestal.position.set(1.25, 0.28, 0.1);
        rigGroup.add(pedestal);

        const servo = createSg90Servo3D();
        servo.group.position.set(1.25, 0.4, 0.1);
        servo.group.scale.setScalar(1.65);
        servo.group.userData.tip = "SG90 Micro Servo · 50Hz PWM Actuator";
        rigGroup.add(servo.group);
        interactives.push(servo.group);

        // Pin-to-pin power & PWM harness
        addWire(psu12VWorld, new THREE.Vector3(-1.44, 0.4, -0.9), 0xf59e0b, { lift: 0.4 });
        addWire(psuGndWorld, new THREE.Vector3(-1.35, 0.4, -0.9), 0x1e293b, { lift: 0.32, reverse: true });
        addWire(new THREE.Vector3(-1.26, 0.4, -0.9), new THREE.Vector3(-0.85, 0.4, -0.65), 0xef4444, { lift: 0.26 });
        addWire(new THREE.Vector3(-0.85, 0.4, -0.65), new THREE.Vector3(1.15, 0.56, 0.42), 0xef4444, { lift: 0.45 });
        addWire(new THREE.Vector3(-1.25, 0.36, -0.65), new THREE.Vector3(1.25, 0.56, 0.42), 0x475569, { lift: 0.36, reverse: true });
        addWire(espPin("RIGHT", 4), new THREE.Vector3(-1.35, 0.36, -0.15), 0x38bdf8, { lift: 0.34 });
        addWire(new THREE.Vector3(-0.82, 0.36, -0.15), new THREE.Vector3(1.38, 0.56, 0.42), 0x38bdf8, { lift: 0.42 });

        addScopeAt(new THREE.Vector3(1.38, 0.56, 0.42), "SCOPE CH1: 50Hz LEDC PWM (1.0–2.0ms)");

        stepFn = (_d, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          servo.setAngleDeg(s.servoAngleDeg);
          cReservoir.setChargeLevel(s.isRunning ? 0.72 : 0.15);
          benchPsu.updateReadout("+5.00V  0.42A", `PWM ${s.servoAngleDeg.toFixed(0)}°`, s.isRunning);
          flows.forEach((fw) => fw.update(elapsed, active));
        };
      } else if (pid === "DC_MOTOR") {
        const l298Pcb = new THREE.Mesh(
          new THREE.BoxGeometry(1.75, 0.14, 1.75),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 })
        );
        l298Pcb.position.set(-0.9, 0.23, 0.1);
        l298Pcb.userData.tip = "L298N Dual H-Bridge + 4x 1N4007 Flyback + 0.5Ω Shunt";
        const heatsink = new THREE.Mesh(
          new THREE.BoxGeometry(0.75, 0.85, 0.55),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 })
        );
        heatsink.position.set(-0.9, 0.72, -0.25);
        heatsink.castShadow = true;
        rigGroup.add(l298Pcb, heatsink);
        interactives.push(l298Pcb);

        // 0.5Ω Current Shunt Resistor + 4x 1N4007 snubber bodies on L298N board
        const rShunt = createResistor3D(1, 0.85);
        rShunt.group.position.set(-0.9, 0.3, 0.75);
        rigGroup.add(rShunt.group);

        const wheel = createDcMotorWheel3D();
        wheel.group.position.set(1.75, 0.78, 0.1);
        wheel.group.scale.setScalar(1.35);
        wheel.group.userData.tip = "12V Geared DC Motor + Encoder Wheel + 100nF EMI Cap";
        rigGroup.add(wheel.group);
        interactives.push(wheel.group);

        // 100nF EMI suppression ceramic cap across motor housing
        const emiCap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.04, 14),
          new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35 })
        );
        emiCap.rotation.z = Math.PI / 2;
        emiCap.position.set(1.1, 1.15, 0.1);
        rigGroup.add(emiCap);

        // PSU +12V/+5V/GND -> L298N
        addWire(psu12VWorld, new THREE.Vector3(-1.45, 0.34, -0.52), 0xf59e0b, { lift: 0.52, packetColorHex: 0xfde047 });
        addWire(psu5VWorld, new THREE.Vector3(-1.2, 0.34, -0.52), 0xef4444, { lift: 0.44 });
        addWire(psuGndWorld, new THREE.Vector3(-0.95, 0.34, -0.52), 0x1e293b, { lift: 0.36, reverse: true });

        // ESP32 ENA/IN1/IN2 -> L298N pins
        addWire(espPin("RIGHT", 2), new THREE.Vector3(-1.62, 0.32, 0.35), 0x38bdf8, { lift: 0.3 });
        addWire(espPin("RIGHT", 4), new THREE.Vector3(-1.62, 0.32, 0.5), 0x22c55e, { lift: 0.33 });
        addWire(espPin("RIGHT", 6), new THREE.Vector3(-1.62, 0.32, 0.65), 0x22c55e, { lift: 0.36 });

        // L298N OUT1/OUT2 -> DC Motor Armature Terminals
        const motLeadA = addWire(new THREE.Vector3(-0.15, 0.34, -0.15), new THREE.Vector3(1.12, 1.05, -0.05), 0xf59e0b, {
          lift: 0.45,
          radius: 0.028,
          packetCount: 6,
          packetColorHex: 0xfef08a,
        });
        const motLeadB = addWire(new THREE.Vector3(-0.15, 0.34, 0.35), new THREE.Vector3(1.12, 1.05, 0.25), 0x38bdf8, {
          lift: 0.38,
          radius: 0.028,
          packetCount: 6,
          reverse: true,
        });

        addScopeAt(new THREE.Vector3(-1.62, 0.32, 0.35), "SCOPE CH1: L298N ENA PWM (GPIO14)");

        stepFn = (delta, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          const dirSign = s.motorDirection === "CW" ? 1 : s.motorDirection === "CCW" ? -1 : 0;
          const speedNorm = s.isRunning ? dirSign * (s.motorPwmDuty / 100) : 0;
          wheel.stepSpin(delta, speedNorm);
          rShunt.setThermalLevel(s.isRunning && dirSign !== 0 ? (s.motorPwmDuty / 100) * 0.45 : 0);
          const speedScale = Math.max(0.35, s.motorPwmDuty / 65);
          benchPsu.updateReadout(
            `+12.0V ${(0.18 + (s.motorPwmDuty / 100) * 0.65).toFixed(2)}A`,
            `${s.motorDirection} · PWM ${s.motorPwmDuty}%`,
            s.isRunning
          );
          flows.forEach((fw) => {
            if (fw === motLeadA || fw === motLeadB) {
              const rev = fw === motLeadA ? dirSign < 0 : dirSign > 0;
              fw.update(elapsed, active && dirSign !== 0, speedScale, rev);
            } else {
              fw.update(elapsed, active, speedScale);
            }
          });
        };
      } else if (pid === "SMART_CAR") {
        const wallH = 0.42;
        const arenaMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.4 });
        const nWall = new THREE.Mesh(new THREE.BoxGeometry(7.6, wallH, 0.16), arenaMat);
        nWall.position.set(-0.2, 0.36, -2.35);
        const sWall = nWall.clone();
        sWall.position.z = 2.35;
        const wWall = new THREE.Mesh(new THREE.BoxGeometry(0.16, wallH, 4.7), arenaMat);
        wWall.position.set(-3.95, 0.36, 0);
        const eWall = wWall.clone();
        eWall.position.x = 3.55;
        rigGroup.add(nWall, sWall, wWall, eWall);

        // Side Telemetry Console -> RF Base Probe
        addScopeAt(espPin("RIGHT", 1), "SCOPE CH1: ESP-NOW Telemetry Link");

        const rover = new THREE.Group();
        rover.position.set(0, 0.25, 0);
        rover.userData.tip = "2WD Autonomous Rover (ESP32 + L298N + LM2596 + HC-SR04)";
        rigGroup.add(rover);
        interactives.push(rover);

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.14, 0.92), pcbMat);
        chassis.position.y = 0.2;
        chassis.castShadow = true;
        rover.add(chassis);

        // Onboard L298N + ESP32 + LM2596 buck inside rover
        const onL298 = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.14, 0.42),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 })
        );
        onL298.position.set(-0.22, 0.33, 0);
        const onMcu = new THREE.Mesh(
          new THREE.BoxGeometry(0.38, 0.1, 0.36),
          new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 })
        );
        onMcu.position.set(0.18, 0.32, 0);
        rover.add(onL298, onMcu);

        // Internal flowing power/motor harnesses inside rover chassis
        const rWireL = createFlowingWire3D(
          [
            new THREE.Vector3(-0.22, 0.36, -0.18),
            new THREE.Vector3(-0.2, 0.44, -0.34),
            new THREE.Vector3(-0.2, 0.26, -0.44),
          ],
          0xf59e0b,
          { radius: 0.014, packetCount: 3, packetLength: 0.06 }
        );
        const rWireR = createFlowingWire3D(
          [
            new THREE.Vector3(-0.22, 0.36, 0.18),
            new THREE.Vector3(-0.2, 0.44, 0.34),
            new THREE.Vector3(-0.2, 0.26, 0.44),
          ],
          0x22d3ee,
          { radius: 0.014, packetCount: 3, packetLength: 0.06 }
        );
        rover.add(rWireL.group, rWireR.group);
        flows.push(rWireL, rWireR);

        const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.14, 18);
        wheelGeo.rotateX(Math.PI / 2);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 });
        const wL = new THREE.Mesh(wheelGeo, wheelMat);
        wL.position.set(-0.2, 0.22, -0.52);
        const wR = wL.clone();
        wR.position.z = 0.52;
        rover.add(wL, wR);

        const noseSensor = createUltrasonicHcSr043D(maxAniso);
        noseSensor.group.scale.setScalar(0.55);
        noseSensor.group.rotation.y = Math.PI / 2;
        noseSensor.group.position.set(0.55, 0.48, 0);
        rover.add(noseSensor.group);

        const flashMat = new THREE.MeshBasicMaterial({
          color: 0x22d3ee,
          transparent: true,
          opacity: 0.22,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const conePlane = new THREE.Mesh(new THREE.CircleGeometry(1.1, 16, -0.35, 0.7), flashMat);
        conePlane.rotation.x = -Math.PI / 2;
        conePlane.position.set(0.65, 0.04, 0);
        rover.add(conePlane);

        stepFn = (delta, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          const rx = ((s.carX - 150) / 120) * 2.4;
          const rz = ((s.carY - 100) / 70) * 1.5;
          rover.position.x = THREE.MathUtils.damp(rover.position.x, rx, 10, delta);
          rover.position.z = THREE.MathUtils.damp(rover.position.z, rz, 10, delta);
          rover.rotation.y = THREE.MathUtils.degToRad(-s.carHeadingDeg);
          flashMat.color.setHex(s.carObstacleDetected ? 0xf43f5e : 0x22d3ee);
          flashMat.opacity = s.carObstacleDetected ? 0.55 : 0.2;
          noseSensor.setWaveProgress((elapsed * 1.4) % 1, 1.1, s.isRunning);
          benchPsu.updateReadout("+7.4V Li-Ion", s.carObstacleDetected ? "EVADE OBSTACLE" : "CRUISE 2WD", s.isRunning);
          flows.forEach((fw) => fw.update(elapsed, active));
        };
      } else if (pid === "SMART_HOME") {
        const relayPcb = new THREE.Mesh(
          new THREE.BoxGeometry(4.2, 0.14, 1.75),
          new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 })
        );
        relayPcb.position.set(0.45, 0.23, 0.8);
        rigGroup.add(relayPcb);

        // PSU -> Relay Coil 5V + GND
        addWire(psu5VWorld, new THREE.Vector3(-1.45, 0.34, 1.35), 0xef4444, { lift: 0.38 });
        addWire(psuGndWorld, new THREE.Vector3(-1.25, 0.34, 1.35), 0x1e293b, { lift: 0.32, reverse: true });

        const relayLeds: ReturnType<typeof createDiffusedLed3D>[] = [];
        const loadWires: FlowingWire3DHandle[] = [];
        const loadTargets = [
          new THREE.Vector3(-1.1, 0.78, -1.1),
          new THREE.Vector3(0.25, 0.82, -1.1),
          new THREE.Vector3(1.55, 0.45, -1.1),
          new THREE.Vector3(2.85, 0.45, -1.1),
        ];

        for (let i = 0; i < 4; i++) {
          const rx = -1.0 + i * 0.98;
          const rBox = new THREE.Mesh(
            new THREE.BoxGeometry(0.72, 0.52, 0.68),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
          );
          rBox.position.set(rx, 0.54, 0.72);
          rBox.castShadow = true;
          rBox.userData.relayId = i + 1;
          rBox.userData.tip = `Relay CH${i + 1} (Click to Toggle)`;
          rigGroup.add(rBox);
          interactives.push(rBox);

          // PC817 optocoupler DIP-4 + 1k resistor per channel
          const opto = createDipIc3D(4, "PC817", 0.55, maxAniso);
          opto.position.set(rx - 0.16, 0.3, 1.24);
          const rOpt = createResistor3D(1000, 0.5);
          rOpt.group.position.set(rx + 0.18, 0.3, 1.24);
          rigGroup.add(opto, rOpt.group);

          const led = createDiffusedLed3D(0x10b981, 0.55);
          led.group.position.set(rx, 0.32, 1.46);
          rigGroup.add(led.group);
          relayLeds.push(led);

          // ESP32 GPIO16..19 -> Opto IN1..IN4
          addWire(espPin("RIGHT", 2 + i * 2), new THREE.Vector3(rx - 0.16, 0.4, 1.24), 0x38bdf8, {
            lift: 0.25 + i * 0.04,
          });

          // High-voltage load wire from Relay NO terminal -> Appliance Load
          const lw = addWire(new THREE.Vector3(rx, 0.52, 0.36), loadTargets[i], 0xf59e0b, {
            lift: 0.36,
            radius: 0.025,
            packetColorHex: 0xfde047,
            packetCount: 5,
          });
          loadWires.push(lw);
        }

        const lampGlassMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfbbf24,
          emissiveIntensity: 0.1,
          roughness: 0.2,
        });
        const lampBulb = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 14), lampGlassMat);
        lampBulb.position.copy(loadTargets[0]);
        lampBulb.userData.tip = "CH1: 60W Room Lighting";
        rigGroup.add(lampBulb);
        interactives.push(lampBulb);

        const fanHub = new THREE.Group();
        fanHub.position.copy(loadTargets[1]);
        for (let b = 0; b < 4; b++) {
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.65, 0.04, 0.16),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.35 })
          );
          blade.rotation.y = (b * Math.PI) / 2;
          fanHub.add(blade);
        }
        rigGroup.add(fanHub);

        const pumpLed = createDiffusedLed3D(0x3b82f6, 1.1);
        pumpLed.group.position.copy(loadTargets[2]);
        rigGroup.add(pumpLed.group);

        const sirenLed = createDiffusedLed3D(0xf43f5e, 1.2);
        sirenLed.group.position.copy(loadTargets[3]);
        rigGroup.add(sirenLed.group);

        const pirMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          emissive: 0xf43f5e,
          emissiveIntensity: 0,
          roughness: 0.3,
        });
        const pirDome = new THREE.Mesh(
          new THREE.SphereGeometry(0.34, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
          pirMat
        );
        pirDome.position.set(2.95, 0.25, 0.8);
        pirDome.userData.isPir = true;
        pirDome.userData.tip = "HC-SR501 PIR Motion Sensor (Click to Trigger)";
        rigGroup.add(pirDome);
        interactives.push(pirDome);

        // PIR OUT -> ESP32 GPIO23 (reverse inbound)
        const pirWire = addWire(new THREE.Vector3(2.95, 0.28, 1.12), espPin("RIGHT", 12), 0xf43f5e, {
          lift: 0.58,
          reverse: true,
        });
        addScopeAt(new THREE.Vector3(2.95, 0.28, 1.12), "SCOPE CH1: PIR HC-SR501 Trigger");

        stepFn = (delta, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          s.relayChannels.forEach((ch, idx) => {
            relayLeds[idx]?.setIntensity(ch.on ? 1 : 0.05);
          });
          lampGlassMat.emissiveIntensity = s.relayChannels[0]?.on ? 1.5 : 0.08;
          if (s.relayChannels[1]?.on && s.isRunning && !reducedRef.current) {
            fanHub.rotation.y += delta * 10;
          }
          pumpLed.setIntensity(s.relayChannels[2]?.on ? 1.1 : 0.05);
          const sirenFlash = s.relayChannels[3]?.on ? 0.5 + 0.5 * Math.sin(elapsed * 12) : 0.05;
          sirenLed.setIntensity(sirenFlash);
          pirMat.emissiveIntensity = s.pirMotionDetected ? 0.9 : 0.05;
          const activeCount = s.relayChannels.filter((c) => c.on).length;
          benchPsu.updateReadout("+5.00V  0.35A", `${activeCount}/4 RELAYS ON`, s.isRunning);
          flows.forEach((fw) => {
            const loadIdx = loadWires.indexOf(fw);
            if (loadIdx !== -1) {
              fw.update(elapsed, active && Boolean(s.relayChannels[loadIdx]?.on));
            } else if (fw === pirWire) {
              fw.update(elapsed, active && s.pirMotionDetected, 1.2, true);
            } else {
              fw.update(elapsed, active);
            }
          });
        };
      } else if (pid === "TEMP_MONITOR") {
        // Breadboard with 4.7k pull-up, 100nF bypass, LM35DZ, 1k/10uF RC filter
        const bb = createMiniBreadboard3D(1.3, 1.5, maxAniso);
        bb.position.set(-1.35, 0.16, 1.05);
        bb.userData.tip = "Analog Filter & Pull-Up Deck (4.7kΩ + LM35DZ + RC 1kΩ/10µF)";
        rigGroup.add(bb);
        interactives.push(bb);

        const rPull = createResistor3D(4700, 0.72);
        rPull.group.position.set(-1.35, 0.32, 0.75);
        const lm35 = createTransistorTo2203D(0.55, 0xf59e0b);
        lm35.position.set(-1.35, 0.32, 1.15);
        const rAdc = createResistor3D(1000, 0.7);
        rAdc.group.position.set(-1.35, 0.32, 1.48);
        const cAdc = createCapacitorElectrolytic3D(0.65);
        cAdc.group.position.set(-0.95, 0.32, 1.48);
        rigGroup.add(rPull.group, lm35, rAdc.group, cAdc.group);

        const sensorBody = new THREE.Mesh(
          new THREE.BoxGeometry(1.05, 1.38, 0.42),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.35 })
        );
        sensorBody.position.set(0.35, 0.9, -0.3);
        sensorBody.castShadow = true;
        sensorBody.userData.tip = "DHT22 Precision Temp & Humidity Module";
        rigGroup.add(sensorBody);
        interactives.push(sensorBody);

        const thermMat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b,
          emissive: 0xf59e0b,
          emissiveIntensity: 0.65,
          roughness: 0.25,
        });
        const thermCol = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 18), thermMat);
        thermCol.position.set(2.3, 1.06, -0.2);
        thermCol.userData.tip = "Thermal Index Indicator Column";
        rigGroup.add(thermCol);
        interactives.push(thermCol);

        // Pin-to-pin harnesses
        addWire(psu5VWorld, new THREE.Vector3(0.15, 0.24, -0.1), 0xef4444, { lift: 0.36 });
        addWire(psuGndWorld, new THREE.Vector3(0.55, 0.24, -0.1), 0x1e293b, { lift: 0.3, reverse: true });
        addWire(new THREE.Vector3(0.35, 0.24, -0.1), new THREE.Vector3(-1.35, 0.36, 0.75), 0x38bdf8, { lift: 0.28, reverse: true });
        addWire(new THREE.Vector3(-1.62, 0.36, 0.75), espPin("RIGHT", 3), 0x38bdf8, { lift: 0.26, reverse: true });
        addWire(new THREE.Vector3(-1.35, 0.36, 1.48), espPin("RIGHT", 8), 0x22c55e, { lift: 0.28, reverse: true });

        addScopeAt(new THREE.Vector3(0.35, 0.24, -0.1), "SCOPE CH1: DHT22 Single-Wire Packet");

        stepFn = (_d, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          const tNorm = THREE.MathUtils.clamp(s.tempCelsius / 50, 0, 1);
          const col = new THREE.Color().setHSL(THREE.MathUtils.lerp(0.58, 0.03, tNorm), 0.9, 0.52);
          thermMat.color.copy(col);
          thermMat.emissive.copy(col);
          thermCol.scale.y = 0.25 + tNorm * 0.95;
          cAdc.setChargeLevel(s.isRunning ? 0.55 : 0.1);
          benchPsu.updateReadout("+5.00V  0.09A", `${s.tempCelsius.toFixed(1)}C · ${s.relativeHumidityPct.toFixed(0)}%RH`, s.isRunning);
          flows.forEach((fw) => fw.update(elapsed, active));
        };
      } else if (pid === "IRRIGATION") {
        // Breadboard with IRLZ44N Logic MOSFET, 220R gate resistor, 10k pull-down, 220uF reservoir
        const bb = createMiniBreadboard3D(1.3, 1.5, maxAniso);
        bb.position.set(-1.55, 0.16, 1.15);
        bb.userData.tip = "IRLZ44N Logic-Level MOSFET Stage (220Ω + 10kΩ + 220µF)";
        rigGroup.add(bb);
        interactives.push(bb);

        const mosfet = createTransistorTo2203D(0.95, 0x22c55e);
        mosfet.position.set(-1.35, 0.32, 0.95);
        const rGate = createResistor3D(220, 0.72);
        rGate.group.position.set(-1.75, 0.32, 1.05);
        const rPull = createResistor3D(10000, 0.72);
        rPull.group.position.set(-1.75, 0.32, 1.45);
        const cBulk = createCapacitorElectrolytic3D(0.8);
        cBulk.group.position.set(-1.25, 0.32, 1.55);
        rigGroup.add(mosfet, rGate.group, rPull.group, cBulk.group);

        const pot = new THREE.Mesh(
          new THREE.CylinderGeometry(1.1, 0.78, 1.05, 22),
          new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.72 })
        );
        pot.position.set(2.15, 0.68, 0.15);
        pot.castShadow = true;
        pot.userData.tip = "Agricultural Planter Substrate + Moisture Probe";
        rigGroup.add(pot);
        interactives.push(pot);

        const soilMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.95 });
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.14, 20), soilMat);
        soil.position.set(2.15, 1.18, 0.15);
        rigGroup.add(soil);

        const probe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.75, 0.06), acrylicMat);
        probe.position.set(1.75, 1.35, 0.35);
        rigGroup.add(probe);

        const valve = new THREE.Mesh(
          new THREE.BoxGeometry(0.95, 0.75, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
        );
        valve.position.set(-0.2, 0.54, -0.35);
        valve.userData.tip = "12V Solenoid Water Valve (<35% Trigger)";
        rigGroup.add(valve);
        interactives.push(valve);

        // Translucent animated water pipe arcing cleanly from solenoid valve to planter nozzle
        const waterPipe = createAnimatedPipeFlow3D(
          [
            new THREE.Vector3(-0.2, 0.92, -0.35),
            new THREE.Vector3(0.4, 2.05, -0.15),
            new THREE.Vector3(1.45, 2.35, 0.05),
            new THREE.Vector3(2.1, 2.05, 0.15),
          ],
          0.065,
          7
        );
        rigGroup.add(waterPipe.group);

        const droplets: THREE.Mesh[] = [];
        const dropMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        for (let i = 0; i < 5; i++) {
          const d = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), dropMat);
          d.position.set(2.1 + ((i % 3) - 1) * 0.18, 1.95 - i * 0.16, 0.15);
          rigGroup.add(d);
          droplets.push(d);
        }

        // Pin-to-pin electrical harnesses
        addWire(psu12VWorld, new THREE.Vector3(-0.55, 0.58, -0.55), 0xf59e0b, { lift: 0.45, packetColorHex: 0xfde047 });
        addWire(psuGndWorld, new THREE.Vector3(-1.35, 0.42, 0.95), 0x1e293b, { lift: 0.35, reverse: true });
        const gateWire = addWire(espPin("RIGHT", 6), new THREE.Vector3(-2.0, 0.36, 1.05), 0x38bdf8, { lift: 0.25 });
        const drainWire = addWire(new THREE.Vector3(-1.35, 0.42, 0.95), new THREE.Vector3(-0.55, 0.58, -0.15), 0x22c55e, { lift: 0.35 });
        addWire(new THREE.Vector3(1.75, 1.65, 0.35), espPin("RIGHT", 10), 0xa855f7, { lift: 0.52, reverse: true });

        addScopeAt(new THREE.Vector3(-1.42, 0.42, 0.95), "SCOPE CH1: IRLZ44N Gate Drive (GPIO25)");

        stepFn = (_delta, elapsed) => {
          const s = propsRef.current;
          const active = s.isRunning && !reducedRef.current;
          const watering = s.isRunning && s.soilMoisturePct < 35;
          waterPipe.update(elapsed * 0.95, watering && !reducedRef.current);
          droplets.forEach((d, idx) => {
            d.visible = watering;
            if (watering && !reducedRef.current) {
              const p = (elapsed * 1.4 + idx * 0.2) % 1;
              d.position.y = 2.02 - p * 0.82;
            }
          });
          soilMat.color.setHex(s.soilMoisturePct < 35 ? 0x5c3a21 : 0x28170b);
          cBulk.setChargeLevel(watering ? 0.85 : 0.2);
          benchPsu.updateReadout(
            watering ? "+12.0V  0.52A" : "+12.0V  0.04A",
            `MOIST ${s.soilMoisturePct.toFixed(0)}% ${watering ? "VALVE ON" : "IDLE"}`,
            s.isRunning
          );
          flows.forEach((fw) => {
            if (fw === gateWire || fw === drainWire) {
              fw.update(elapsed, active && watering);
            } else {
              fw.update(elapsed, active);
            }
          });
        };
      }
    };

    buildProjectStage();
    rebuildRef.current = buildProjectStage;

    // Click + Hover raycasting
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    let downPt = { x: 0, y: 0 };

    const getHit = (cx: number, cy: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      ptr.x = ((cx - rect.left) / rect.width) * 2 - 1;
      ptr.y = -((cy - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ptr, camera);
      const hits = raycaster.intersectObjects(interactives, true);
      if (hits.length === 0) return null;
      let cur: THREE.Object3D | null = hits[0].object;
      while (cur && !cur.userData.tip && !cur.userData.relayId && !cur.userData.isPir) {
        cur = cur.parent;
      }
      if (!cur) return null;
      return {
        obj: cur,
        x: cx - rect.left,
        y: cy - rect.top,
      };
    };

    const onMove = (e: PointerEvent) => {
      const hit = getHit(e.clientX, e.clientY);
      if (hit && hit.obj.userData.tip) {
        setHoverLabel({ title: String(hit.obj.userData.tip), x: hit.x, y: hit.y });
        renderer.domElement.style.cursor = "pointer";
      } else {
        setHoverLabel(null);
        renderer.domElement.style.cursor = "grab";
      }
    };

    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };

    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 6) return;
      const hit = getHit(e.clientX, e.clientY);
      if (!hit) return;
      if (typeof hit.obj.userData.relayId === "number") {
        propsRef.current.onToggleRelay?.(hit.obj.userData.relayId);
      } else if (hit.obj.userData.isPir) {
        propsRef.current.onTogglePir?.();
      }
    };

    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);

    let camAnim: { pos: [number, number, number]; target: [number, number, number] } | null = null;
    presetRef.current = (c) => {
      camAnim = { pos: STAGE_CAM_PRESETS[c].pos, target: STAGE_CAM_PRESETS[c].target };
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
    const clock = new THREE.Clock();

    const animate = () => {
      if (disposed || renderBusy) return;
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        const delta = Math.min(clock.getDelta(), 0.08);
        const elapsed = clock.getElapsedTime();

        if (camAnim) {
          _posV.set(...camAnim.pos);
          _tgtV.set(...camAnim.target);
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _posV.x, 6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _posV.y, 6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _posV.z, 6, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _tgtV.x, 6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _tgtV.y, 6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _tgtV.z, 6, delta);
          if (camera.position.distanceTo(_posV) < 0.05) camAnim = null;
        }

        if (stepFn && visibleRef.current && !reducedRef.current) {
          stepFn(delta, elapsed);
        } else if (stepFn) {
          stepFn(0, 0);
        }

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
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      disposeSceneSubtree(rigGroup);
      studio.dispose();
    };
  }, []);

  useEffect(() => {
    rebuildRef.current?.();
  }, [props.projectId, props.radarObstacles.length]);

  return (
    <div className="relative w-full h-64 sm:h-72 rounded-xl border border-cyan-500/30 bg-[#050811] overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full touch-none" />

      <div className="absolute top-2.5 left-2.5 pointer-events-none px-2.5 py-1 rounded-lg bg-[#090f1e]/90 border border-cyan-500/40 text-[10px] font-mono text-cyan-200 flex items-center gap-1.5">
        <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-white">3D Mechatronics Twin</span>
        <span className="text-slate-400">·</span>
        <span className={props.isRunning ? "text-emerald-400 font-bold" : "text-amber-300 font-bold"}>
          {props.isRunning ? "LIVE" : "PAUSED"}
        </span>
      </div>

      {hoverLabel && (
        <div
          className="pointer-events-none absolute z-20 px-2.5 py-1 rounded-lg bg-[#0a101d]/95 border border-cyan-400/70 text-[10px] font-mono text-cyan-200 shadow-xl"
          style={{ left: Math.min(hoverLabel.x + 12, 340), top: Math.max(10, hoverLabel.y - 34) }}
        >
          {hoverLabel.title}
        </div>
      )}

      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-[#0b1222]/95 border border-cyan-500/35 rounded-xl px-2 py-1 text-[10px] font-mono">
        <Camera className="w-3 h-3 text-cyan-400 mr-1" />
        {(Object.keys(STAGE_CAM_PRESETS) as StageCam[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setCamPreset(key);
              presetRef.current?.(key);
            }}
            className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
              camPreset === key ? "bg-cyan-400 text-slate-950" : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {STAGE_CAM_PRESETS[key].label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCamPreset("ISO");
            presetRef.current?.("ISO");
          }}
          className="p-1 rounded text-slate-300 hover:bg-slate-800 cursor-pointer"
          title="Reset Camera"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
