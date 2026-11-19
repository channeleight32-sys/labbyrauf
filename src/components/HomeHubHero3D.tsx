import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { ArrowRight } from "lucide-react";
import {
  afterDrawSync,
  createRadialContactShadowTexture,
  initThreeStudio,
} from "../utils/threeStudio";
import {
  createDiffusedLed3D,
  createMiniBreadboard3D,
  createOledDisplay3D,
  createResistor3D,
  createSevenSegment3D,
} from "./three/electronicsPrimitives3D";
import { usePageVisibility, usePrefersReducedMotion } from "../utils/animationHelpers";

interface HomeHubHero3DProps {
  onLaunchEsp32: () => void;
}

const SEG_DIGITS: boolean[][] = [
  [true, true, true, true, true, true, false], // 0
  [false, true, true, false, false, false, false], // 1
  [true, true, false, true, true, false, true], // 2
  [true, true, true, true, false, false, true], // 3
  [false, true, true, false, false, true, true], // 4
  [true, false, true, true, false, true, true], // 5
  [true, false, true, true, true, true, true], // 6
  [true, true, true, false, false, false, false], // 7
  [true, true, true, true, true, true, true], // 8
  [true, true, true, true, false, true, true], // 9
];

export const HomeHubHero3D: React.FC<HomeHubHero3DProps> = ({ onLaunchEsp32 }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isPageVisible = usePageVisibility();
  const reducedMotionRef = useRef(prefersReducedMotion);
  reducedMotionRef.current = prefersReducedMotion;
  const pageVisibleRef = useRef(isPageVisible);
  pageVisibleRef.current = isPageVisible;
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !prefersReducedMotion && isPageVisible;
    }
  }, [prefersReducedMotion, isPageVisible]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const studio = initThreeStudio(el, {
      cameraPos: [3.2, 2.8, 3.6],
      targetPos: [0, 0.25, 0],
      fov: 38,
      minDistance: 2.2,
      maxDistance: 8,
      shadowBounds: 4,
      benchSize: 16,
      benchY: -0.2,
    });
    controlsRef.current = studio.controls;

    if (!studio.isSoftwareGl) {
      studio.controls.autoRotate = !reducedMotionRef.current && pageVisibleRef.current;
      studio.controls.autoRotateSpeed = 1.15;
    }

    const maxAniso = studio.renderer.capabilities.getMaxAnisotropy();
    const bb = createMiniBreadboard3D(2.6, 3.4, maxAniso);
    studio.scene.add(bb);

    // Compact ESP32 PCB mounted on upper breadboard deck
    const espPcb = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.08, 2.0),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
    );
    espPcb.position.set(0, 0.24, -0.35);
    espPcb.castShadow = true;
    const shield = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.14, 0.72),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.2 })
    );
    shield.position.set(0, 0.35, -0.78);
    shield.castShadow = true;

    const ledA = createDiffusedLed3D(0x22d3ee, 1.0);
    ledA.group.position.set(-0.78, 0.16, 0.65);
    const ledB = createDiffusedLed3D(0x10b981, 1.0);
    ledB.group.position.set(-0.78, 0.16, 1.05);

    const res = createResistor3D(220, 1.05);
    res.group.position.set(-0.78, 0.16, 0.15);

    const seg = createSevenSegment3D(0xf59e0b, 0.78);
    seg.group.position.set(0.76, 0.16, 0.92);

    const oled = createOledDisplay3D(maxAniso);
    oled.group.scale.setScalar(0.82);
    oled.group.position.set(0.66, 0.16, -0.35);
    oled.updateScreen("IST LAB 3D", ["ESP32 · MNA SPICE", "DRAG TO ORBIT 360°", "75 LABS VERIFIED"], "#22d3ee");

    const shadowTex = createRadialContactShadowTexture(256);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 4.4),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.45, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.18;

    studio.scene.add(espPcb, shield, ledA.group, ledB.group, res.group, seg.group, oled.group, shadow);

    const ro = new ResizeObserver(() => {
      const w = Math.max(220, el.clientWidth);
      const h = Math.max(190, el.clientHeight);
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
      const elapsed = clock.getElapsedTime();
      studio.controls.update();

      const animateActive = !reducedMotionRef.current && pageVisibleRef.current;
      const phase = animateActive ? (Math.sin(elapsed * 3.2) + 1) * 0.5 : 1;
      ledA.setIntensity(phase);
      ledB.setIntensity(animateActive ? 1 - phase : 0.75);
      const digit = animateActive ? Math.floor(elapsed * 1.4) % 10 : 8;
      seg.setSegments(SEG_DIGITS[digit]);

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
      studio.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[250px] sm:h-[280px] rounded-xl overflow-hidden border border-[#24344D] bg-[#0B1220]">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none bg-[#111B2B]/90 border border-[#24344D] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[#35BDF2]">
        Interactive 3D Preview · Drag to Orbit
      </div>
      <button
        type="button"
        onClick={onLaunchEsp32}
        className="absolute bottom-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-[11px] font-mono font-bold cursor-pointer whitespace-nowrap shrink-0 shadow-md"
      >
        <span>Full 3D ESP32 Studio</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default HomeHubHero3D;
