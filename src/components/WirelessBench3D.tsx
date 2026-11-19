import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Camera, Radio, RotateCcw } from "lucide-react";
import {
  afterDrawSync,
  createRadialContactShadowTexture,
  initThreeStudio,
} from "../utils/threeStudio";
import {
  createCapacitorElectrolytic3D,
  createDiffusedLed3D,
  createInductorToroid3D,
  createOledDisplay3D,
} from "./three/electronicsPrimitives3D";
import {
  createBenchPowerSupply3D,
  createEsp32ModuleCompact3D,
  createFlowingWire3D,
  createScopeProbe3D,
  FlowingWire3DHandle,
} from "./three/cinematicFlow3D";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";

export interface WirelessBench3DProps {
  mode: "LORA" | "WIFI_BLE" | "RF_FRIIS";
  freqLabel: string;
  txPowerDbm: number;
  rssiDbm: number;
  snrDb: number;
  distanceRatio: number; // 0..1 normalized link distance
  isLinkHealthy: boolean;
  packetPulseKey?: number;
  onTriggerTransmit?: () => void;
}

const _txP = new THREE.Vector3();
const _rxP = new THREE.Vector3();
const _rayPt = new THREE.Vector2();

function buildRfShieldTexture(title: string, sub: string, maxAniso: number): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, 236, 236);
  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 32px monospace";
  ctx.textAlign = "center";
  ctx.fillText(title, 128, 112);
  ctx.font = "bold 20px monospace";
  ctx.fillText(sub, 128, 152);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

export const WirelessBench3D: React.FC<WirelessBench3DProps> = (props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const reducedMotionRef = useRef(prefersReducedMotion);
  reducedMotionRef.current = prefersReducedMotion;
  const pageVisibleRef = useRef(isPageVisible);
  pageVisibleRef.current = isPageVisible;

  const burstTimerRef = useRef(0);
  useEffect(() => {
    if (props.packetPulseKey) {
      burstTimerRef.current = 1.0;
    }
  }, [props.packetPulseKey]);

  const [camPreset, setCamPreset] = useState<"SIDE" | "ISO" | "TOP">("ISO");
  const camGoalRef = useRef<{ active: boolean; pos: [number, number, number]; tgt: [number, number, number] }>({
    active: false,
    pos: [5.4, 3.6, 5.2],
    tgt: [0, 0.35, 0],
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const studio = initThreeStudio(el, {
      cameraPos: [5.4, 3.6, 5.2],
      targetPos: [0, 0.35, 0],
      fov: 40,
      minDistance: 2.5,
      maxDistance: 15,
      shadowBounds: 6.5,
      benchSize: 24,
      benchY: -0.22,
    });

    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();

    const benchPsu = createBenchPowerSupply3D("RF BENCH PSU", maxAniso);
    benchPsu.group.position.set(-2.65, -0.22, 0);
    benchPsu.group.rotation.y = Math.PI / 2;
    benchPsu.group.scale.setScalar(0.85);
    studio.scene.add(benchPsu.group);

    const buildRfNode = (label: string, mcuLabel: string, pcbHex: number, isTx: boolean) => {
      const grp = new THREE.Group();
      const flows: FlowingWire3DHandle[] = [];

      // Carrier base plate holding both ESP32 Master + RF Transceiver + Pi-Match
      const sled = new THREE.Mesh(
        new THREE.BoxGeometry(2.65, 0.08, 2.05),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45, metalness: 0.3 })
      );
      sled.position.set(-0.35, 0.04, 0);
      sled.castShadow = true;

      // Real 30-pin ESP32 MCU connected via 6-wire SPI bus to RF shield PCB
      const esp = createEsp32ModuleCompact3D(mcuLabel, 0.68, maxAniso);
      esp.group.position.set(-0.98, 0.08, 0.05);

      const pcb = new THREE.Mesh(
        new THREE.BoxGeometry(1.25, 0.08, 1.8),
        new THREE.MeshStandardMaterial({ color: pcbHex, roughness: 0.42 })
      );
      pcb.position.set(0.32, 0.08, 0);
      pcb.castShadow = true;

      const canTex = buildRfShieldTexture(label, "SX1278 / RF", maxAniso);
      const shield = new THREE.Mesh(
        new THREE.BoxGeometry(0.82, 0.18, 0.88),
        new THREE.MeshStandardMaterial({ map: canTex, metalness: 0.85, roughness: 0.22 })
      );
      shield.position.set(0.32, 0.21, 0.12);
      shield.castShadow = true;

      // Visible Pi-Match RF filter L1/C1 before SMA port
      const lMatch = createInductorToroid3D(0.45);
      lMatch.group.position.set(0.32, 0.12, -0.45);
      const cMatch = createCapacitorElectrolytic3D(0.42);
      cMatch.group.position.set(0.62, 0.12, -0.42);

      // SMA brass connector + whip antenna
      const sma = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
      );
      sma.position.set(0.32, 0.2, -0.78);

      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.045, 1.45, 12),
        new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.35 })
      );
      antenna.position.set(0.32, 0.94, -0.78);
      antenna.castShadow = true;

      const antTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.048, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0x22d3ee })
      );
      antTip.position.set(0.32, 1.66, -0.78);

      const led = createDiffusedLed3D(0x10b981, 0.9);
      led.group.position.set(0.75, 0.12, -0.65);

      const oled = createOledDisplay3D(maxAniso);
      oled.group.scale.setScalar(0.82);
      oled.group.position.set(0.32, 0.12, 0.88);

      // Pin-to-pin SPI jumper harness (SCK, MISO, MOSI, NSS, DIO0, 3V3)
      const spiColors = [0xf87171, 0x38bdf8, 0x38bdf8, 0x22c55e, 0xfbbf24, 0x34d399];
      [2, 4, 6, 8, 10, 12].forEach((pinIdx, i) => {
        const p1 = new THREE.Vector3(-0.98, 0.08, 0.05).add(esp.getPinLocalPos("RIGHT", pinIdx));
        const p2 = new THREE.Vector3(-0.08, 0.16, -0.35 + i * 0.15);
        const mid = p1.clone().lerp(p2, 0.5);
        mid.y += 0.18 + (i % 2) * 0.05;
        const hw = createFlowingWire3D([p1, mid, p2], spiColors[i], {
          radius: 0.015,
          packetCount: 3,
          packetLength: 0.075,
          reverse: !isTx && i === 2,
          phaseOffset: (i * 0.19) % 1,
        });
        grp.add(hw.group);
        flows.push(hw);
      });

      // Scope Probe attached on SPI / DIO0
      const scope = createScopeProbe3D(isTx ? 0xfacc15 : 0x22d3ee, 0.65);
      scope.group.position.set(-0.08, 0.16, 0.4);
      grp.add(scope.group);

      const shadowTex = createRadialContactShadowTexture(256);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.8, 2.5),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.set(-0.2, -0.18, 0);

      grp.add(sled, esp.group, pcb, shield, lMatch.group, cMatch.group, sma, antenna, antTip, led.group, oled.group, shadow);
      return { grp, led, oled, antTip, flows, lMatch };
    };

    const txNode = buildRfNode("TX NODE", "ESP32-TX", 0x064e3b, true);
    const rxNode = buildRfNode("RX NODE", "ESP32-RX", 0x0c4a6e, false);
    txNode.grp.position.set(0, 0, -2.1);
    rxNode.grp.position.set(0, 0, 2.1);
    rxNode.grp.rotation.y = Math.PI;
    studio.scene.add(txNode.grp, rxNode.grp);

    // 3D Fresnel Zone Envelope spanning between TX & RX antennas
    const fresnelMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });
    const fresnelZone = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), fresnelMat);
    studio.scene.add(fresnelZone);

    // Expanding electromagnetic wavefront rings + carrier packets between TX and RX antennas
    const waveRings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x22d3ee,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.3, 32), mat);
      studio.scene.add(mesh);
      waveRings.push({ mesh, mat, phase: i / 6 });
    }

    // Raycast click on TX board to fire RF packet
    const hitMesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.7, 0.9, 2.1),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hitMesh.layers.set(1);
    txNode.grp.add(hitMesh);

    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let downPt = { x: 0, y: 0 };
    const canvas = studio.renderer.domElement;

    const onDown = (e: PointerEvent) => {
      downPt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y) > 7) return;
      const rect = canvas.getBoundingClientRect();
      _rayPt.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      _rayPt.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(_rayPt, studio.camera);
      if (raycaster.intersectObject(hitMesh, false).length > 0) {
        burstTimerRef.current = 1.0;
        propsRef.current.onTriggerTransmit?.();
      }
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);

    studio.controls.addEventListener("start", () => {
      camGoalRef.current.active = false;
    });

    const ro = new ResizeObserver(() => {
      const w = Math.max(240, el.clientWidth);
      const h = Math.max(200, el.clientHeight);
      studio.camera.aspect = w / h;
      studio.camera.updateProjectionMatrix();
      studio.renderer.setSize(w, h);
    });
    ro.observe(el);

    if (!studio.isSoftwareGl) studio.renderer.compile(studio.scene, studio.camera);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.08);
      const elapsed = clock.getElapsedTime();
      const p = propsRef.current;

      if (camGoalRef.current.active) {
        const k = 1 - Math.exp(-6 * delta);
        _txP.set(...camGoalRef.current.pos);
        _rxP.set(...camGoalRef.current.tgt);
        studio.camera.position.lerp(_txP, k);
        studio.controls.target.lerp(_rxP, k);
        if (studio.camera.position.distanceTo(_txP) < 0.04) camGoalRef.current.active = false;
      }
      studio.controls.update();

      const halfSpan = 1.2 + THREE.MathUtils.clamp(p.distanceRatio, 0, 1) * 2.5;
      txNode.grp.position.z = THREE.MathUtils.lerp(txNode.grp.position.z, -halfSpan, 0.12);
      rxNode.grp.position.z = THREE.MathUtils.lerp(rxNode.grp.position.z, halfSpan, 0.12);

      burstTimerRef.current = Math.max(0, burstTimerRef.current - delta * 1.3);
      const burstBoost = burstTimerRef.current;

      txNode.led.setIntensity(0.45 + burstBoost * 0.55, 0x22d3ee);
      rxNode.led.setIntensity(p.isLinkHealthy ? 0.95 : 0.75, p.isLinkHealthy ? 0x10b981 : 0xef4444);
      txNode.lMatch.setFluxLevel(0.45 + burstBoost * 0.55);
      rxNode.lMatch.setFluxLevel(p.isLinkHealthy ? 0.65 : 0.25);

      const activeAnim = !reducedMotionRef.current && pageVisibleRef.current;
      txNode.flows.forEach((fw) => fw.update(elapsed, activeAnim, 1 + burstBoost));
      rxNode.flows.forEach((fw) => fw.update(elapsed, activeAnim && p.isLinkHealthy, 1 + burstBoost * 0.5));
      benchPsu.updateReadout(`+3.3V  0.14A`, `TX +${p.txPowerDbm}dBm`, true);

      const startZ = txNode.grp.position.z - 0.78;
      const endZ = rxNode.grp.position.z + 0.78;
      const midZ = (startZ + endZ) * 0.5;
      const spanZ = Math.max(0.8, Math.abs(endZ - startZ) * 0.5);
      fresnelZone.position.set(0.0, 1.35, midZ);
      fresnelZone.scale.set(0.65, 0.65, spanZ);
      fresnelMat.color.setHex(p.isLinkHealthy ? 0x22d3ee : 0xf59e0b);
      fresnelMat.opacity = 0.08 + burstBoost * 0.14;

      waveRings.forEach((r) => {
        if (activeAnim) {
          r.phase = (r.phase + delta * (0.45 + burstBoost * 0.55)) % 1;
        }
        const z = THREE.MathUtils.lerp(startZ, endZ, r.phase);
        r.mesh.position.set(0, 1.32, z);
        const sc = 0.6 + r.phase * 2.1;
        r.mesh.scale.setScalar(sc);
        r.mat.color.setHex(p.isLinkHealthy ? 0x22d3ee : 0xf59e0b);
        r.mat.opacity = (1 - r.phase) * (0.35 + burstBoost * 0.45);
      });

      txNode.oled.updateScreen(
        `TX · ${p.mode}`,
        [`FREQ: ${p.freqLabel}`, `PWR: +${p.txPowerDbm} dBm`, `CLICK PCB TO SEND`],
        "#22d3ee"
      );
      rxNode.oled.updateScreen(
        `RX · ${p.isLinkHealthy ? "LINK OK" : "WEAK"}`,
        [`RSSI: ${p.rssiDbm} dBm`, `SNR: ${p.snrDb.toFixed(1)} dB`, p.isLinkHealthy ? "STATUS: LOCKED" : "STATUS: CRC LOSS"],
        p.isLinkHealthy ? "#10b981" : "#ef4444"
      );

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
      studio.dispose();
    };
  }, []);

  const applyView = (v: "SIDE" | "ISO" | "TOP") => {
    setCamPreset(v);
    camGoalRef.current = {
      active: true,
      pos: v === "SIDE" ? [6.4, 2.2, 0] : v === "TOP" ? [0, 7.6, 0.35] : [5.4, 3.6, 5.2],
      tgt: [0, 0.35, 0],
    };
  };

  return (
    <div className="relative w-full h-[320px] sm:h-[360px] rounded-xl overflow-hidden border border-[#24344D] bg-[#0B1220]">
      <div ref={containerRef} className="w-full h-full" />

      <div className="absolute top-3 left-3 z-10 pointer-events-none bg-[#111B2B]/90 border border-[#24344D] rounded-lg px-3 py-1.5 text-[11px] font-mono text-[#F1F5FA] flex items-center gap-2">
        <Radio className="w-3.5 h-3.5 text-cyan-400" />
        <span className="font-bold text-cyan-300">3D RF Link Bench</span>
        <span className="text-slate-600" aria-hidden="true">·</span>
        <span className="tabular-nums">RSSI {props.rssiDbm} dBm</span>
        <span className="text-slate-600" aria-hidden="true">·</span>
        <span className={props.isLinkHealthy ? "text-emerald-300 font-semibold" : "text-red-400 font-semibold"}>
          {props.isLinkHealthy ? "Link Locked" : "Weak Signal"}
        </span>
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-[#091020]/95 border border-slate-700 rounded-lg px-2.5 py-1.5">
        <Camera className="w-3.5 h-3.5 text-cyan-400 mr-1" />
        {(["ISO", "SIDE", "TOP"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => applyView(v)}
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer whitespace-nowrap shrink-0 ${
              camPreset === v ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            {v === "ISO" ? "Isometric" : v === "SIDE" ? "Fresnel Side" : "Top View"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => applyView("ISO")}
          className="px-2 py-1 rounded text-[11px] font-mono text-slate-300 hover:text-white bg-slate-800 cursor-pointer"
          title="Reset camera"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default WirelessBench3D;
