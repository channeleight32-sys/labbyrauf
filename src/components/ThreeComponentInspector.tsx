import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  REALISTIC_COMPONENTS,
  RealisticComponentDef,
  calculateResistorColorBands,
} from "../data/realisticComponentsData";
import {
  RotateCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sliders,
  Layers,
  Sparkles,
  Zap,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Box,
  Eye,
  ShieldCheck,
  Flame,
  Thermometer,
  AlertTriangle,
} from "lucide-react";

export interface ThreeComponentInspectorProps {
  componentId: string;
  selectedTerminalName?: string | null;
  onSelectTerminal?: (terminalName: string | null) => void;
  className?: string;
}

export default function ThreeComponentInspector({
  componentId,
  selectedTerminalName,
  onSelectTerminal,
  className = "",
}: ThreeComponentInspectorProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Component metadata
  const compDef: RealisticComponentDef = useMemo(() => {
    return (
      REALISTIC_COMPONENTS[componentId] ||
      REALISTIC_COMPONENTS[
        Object.keys(REALISTIC_COMPONENTS).find(
          (k) =>
            k.toUpperCase() === componentId.toUpperCase() ||
            componentId.toUpperCase().includes(k.toUpperCase())
        ) || "RES_CARBON"
      ]
    );
  }, [componentId]);

  // Inspector UI controls state
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(true);
  const [isWireframe, setIsWireframe] = useState<boolean>(false);
  const [explodedRatio, setExplodedRatio] = useState<number>(0);
  const [isHudCollapsed, setIsHudCollapsed] = useState<boolean>(false);
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{
    name: string;
    label: string;
    polarity?: string;
    description: string;
    x: number;
    y: number;
  } | null>(null);

  // Mutable refs for Three.js scene instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);
  const pinMeshesRef = useRef<Map<string, THREE.Mesh[]>>(new Map());
  const explodedPartsRef = useRef<
    Array<{ mesh: THREE.Object3D; originalPos: THREE.Vector3; explodeDir: THREE.Vector3 }>
  >([]);
  const requestRenderRef = useRef<() => void>(() => {});
  const isSoftwareGlRef = useRef<boolean>(false);

  // Update pin highlighting when selectedTerminalName changes
  useEffect(() => {
    if (!pinMeshesRef.current) return;
    pinMeshesRef.current.forEach((meshes, name) => {
      const isSelected = selectedTerminalName === name;
      meshes.forEach((m) => {
        const mat = m.material as THREE.MeshStandardMaterial;
        if (mat && "emissive" in mat) {
          if (isSelected) {
            mat.emissive = new THREE.Color(0x06b6d4);
            mat.emissiveIntensity = 0.8;
          } else {
            mat.emissive = new THREE.Color(0x000000);
            mat.emissiveIntensity = 0;
          }
        }
      });
    });
    requestRenderRef.current();
  }, [selectedTerminalName, compDef]);

  // Update wireframe state
  useEffect(() => {
    if (!rootGroupRef.current) return;
    rootGroupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => {
            (mat as THREE.MeshStandardMaterial).wireframe = isWireframe;
          });
        } else if (m.material) {
          (m.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
        }
      }
    });
    requestRenderRef.current();
  }, [isWireframe, compDef]);

  // Thermal Simulation State
  const [isThermalMode, setIsThermalMode] = useState<boolean>(false);
  const [simulatedPowerW, setSimulatedPowerW] = useState<number>(() => {
    if (compDef.packageType.includes("TO220") || compDef.packageType.includes("TO247")) return 1.5;
    if (compDef.packageType.includes("TO92")) return 0.25;
    if (compDef.packageType.includes("DIP")) return 0.40;
    if (compDef.packageType.includes("TRANSFORMER")) return 1.8;
    return 0.20;
  });
  const [ambientTempC, setAmbientTempC] = useState<number>(25);
  const originalMaterialsRef = useRef<
    Map<string, { color: THREE.Color; emissive: THREE.Color; emissiveIntensity: number; roughness: number; metalness: number }>
  >(new Map());

  // Thermal Simulation Physics Calculation
  const thermalMetrics = useMemo(() => {
    let thetaJA = 140; // Default axial resistor °C/W
    let maxTempRating = 155; // °C
    if (compDef.packageType.includes("TO220") || compDef.packageType.includes("TO247")) {
      thetaJA = 65; // without heatsink
      maxTempRating = 175;
    } else if (compDef.packageType.includes("TO92")) {
      thetaJA = 200;
      maxTempRating = 150;
    } else if (compDef.packageType.includes("DIP")) {
      thetaJA = 110;
      maxTempRating = 125;
    } else if (compDef.id === "RES_SMD" || compDef.packageType.includes("SMD")) {
      thetaJA = 250;
      maxTempRating = 125;
    } else if (compDef.packageType.includes("DO41") || compDef.packageType.includes("DO35") || compDef.packageType.includes("BRIDGE")) {
      thetaJA = 160;
      maxTempRating = 150;
    } else if (compDef.packageType.includes("PCB") || compDef.packageType.includes("MODULE")) {
      thetaJA = 55;
      maxTempRating = 85;
    }

    const tempRise = simulatedPowerW * thetaJA;
    const tj = ambientTempC + tempRise;
    const tcase = ambientTempC + tempRise * 0.72;
    const isOverheated = tj >= maxTempRating;
    const isWarning = tj >= maxTempRating * 0.8;

    return {
      thetaJA,
      tempRise,
      tj,
      tcase,
      maxTempRating,
      isOverheated,
      isWarning,
    };
  }, [compDef.packageType, simulatedPowerW, ambientTempC]);

  const getThermalColor = (temp: number) => {
    if (temp <= 25) return { color: 0x2563eb, emissive: 0x1d4ed8, intensity: 0.1 };
    if (temp <= 45) return { color: 0x06b6d4, emissive: 0x0891b2, intensity: 0.2 };
    if (temp <= 65) return { color: 0x10b981, emissive: 0x059669, intensity: 0.3 };
    if (temp <= 90) return { color: 0xfacc15, emissive: 0xca8a04, intensity: 0.45 };
    if (temp <= 115) return { color: 0xf97316, emissive: 0xea580c, intensity: 0.65 };
    if (temp <= 140) return { color: 0xef4444, emissive: 0xdc2626, intensity: 0.85 };
    return { color: 0xffffff, emissive: 0xf43f5e, intensity: 1.0 };
  };

  // Update thermal false-color overlay
  useEffect(() => {
    if (!rootGroupRef.current) return;

    if (!isThermalMode) {
      rootGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          const orig = originalMaterialsRef.current.get(m.uuid);
          if (orig && m.material) {
            const mat = m.material as THREE.MeshStandardMaterial;
            mat.color.copy(orig.color);
            mat.emissive.copy(orig.emissive);
            mat.emissiveIntensity = orig.emissiveIntensity;
            mat.roughness = orig.roughness;
            mat.metalness = orig.metalness;
          }
        }
      });
    } else {
      rootGroupRef.current.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          if (!originalMaterialsRef.current.has(m.uuid) && m.material) {
            const mat = m.material as THREE.MeshStandardMaterial;
            originalMaterialsRef.current.set(m.uuid, {
              color: mat.color.clone(),
              emissive: mat.emissive.clone(),
              emissiveIntensity: mat.emissiveIntensity || 0,
              roughness: mat.roughness,
              metalness: mat.metalness,
            });
          }

          if (m.material) {
            const mat = m.material as THREE.MeshStandardMaterial;
            const isPin =
              m.name?.toLowerCase().includes("pin") ||
              m.name?.toLowerCase().includes("lead") ||
              m.name?.toLowerCase().includes("terminal");
            const targetT = isPin
              ? ambientTempC + thermalMetrics.tempRise * 0.3
              : thermalMetrics.tj;
            const thermal = getThermalColor(targetT);

            mat.color = new THREE.Color(thermal.color);
            mat.emissive = new THREE.Color(thermal.emissive);
            mat.emissiveIntensity = thermal.intensity;
            mat.roughness = 0.5;
            mat.metalness = 0.1;
          }
        }
      });
    }
    requestRenderRef.current();
  }, [isThermalMode, simulatedPowerW, ambientTempC, thermalMetrics, compDef]);

  // Update exploded view state
  useEffect(() => {
    explodedPartsRef.current.forEach(({ mesh, originalPos, explodeDir }) => {
      mesh.position.copy(
        originalPos.clone().add(explodeDir.clone().multiplyScalar(explodedRatio * 1.35))
      );
    });
    requestRenderRef.current();
  }, [explodedRatio, compDef]);

  // Initialize Three.js Scene, Materials, Geometry, Studio Lighting & Controls
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    originalMaterialsRef.current.clear();

    // Detect software WebGL from GPU renderer string to adaptively tune rendering cost
    const isSoftwareGl = (() => {
      const testGl = document.createElement("canvas").getContext("webgl2");
      if (!testGl) return true;
      const ext = testGl.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : testGl.RENDERER;
      const gpu = String(testGl.getParameter(param));
      testGl.getExtension("WEBGL_lose_context")?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();
    isSoftwareGlRef.current = isSoftwareGl;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 360;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 5.5);
    cameraRef.current = camera;

    // 2. Renderer with PBR Color Pipeline & RoomEnvironment
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    container.replaceChildren(renderer.domElement);

    // Studio Environment reflection texture
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio Lighting Rig
    // Warm Key Light with soft shadows
    const keyLight = new THREE.DirectionalLight(0xfff5eb, 2.2);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool Hemisphere Fill Light
    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 1.2);
    scene.add(hemiLight);

    // Subtle Rim Light for edge crispness
    const rimLight = new THREE.DirectionalLight(0x67e8f9, 1.5);
    rimLight.position.set(-4, -2, -4);
    scene.add(rimLight);

    // Soft Contact Shadow Ground Plane
    const contactShadowGeo = new THREE.PlaneGeometry(6, 6);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext("2d");
    if (sCtx) {
      const grad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.65)");
      grad.addColorStop(0.5, "rgba(0, 0, 0, 0.25)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      sCtx.fillStyle = grad;
      sCtx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(contactShadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.1;
    scene.add(shadowMesh);

    // 4. OrbitControls (demand-driven; disable autoRotate & damping on software WebGL)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1.8;
    controls.maxDistance = 10;
    controls.autoRotate = !isSoftwareGl && isAutoRotating;
    controls.autoRotateSpeed = 1.8;
    controlsRef.current = controls;

    // 5. Build Procedural 3D Electronic Component Model
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);
    rootGroupRef.current = rootGroup;
    pinMeshesRef.current.clear();
    explodedPartsRef.current = [];

    build3DComponentModel(
      compDef,
      rootGroup,
      pinMeshesRef.current,
      explodedPartsRef.current,
      isSoftwareGl
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 6. On-Demand Coalesced Rendering Engine with Software GL Synchronization
    let frameId = 0;
    let pollTimerId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let isDisposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (isDisposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          pollTimerId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          pollTimerId = window.setTimeout(cb, 80);
        }
      };
      pollTimerId = window.setTimeout(poll, 5);
    }

    function requestRender() {
      if (isDisposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (isDisposed) return;
        renderDirty = false;
        const delta = Math.min(clock.getDelta(), 0.1);
        controls.update(delta);
        renderer.render(scene, camera);
        const done = () => {
          renderBusy = false;
          if (isDisposed) return;
          if (renderDirty || (!isSoftwareGl && controls.autoRotate)) {
            requestRender();
          }
        };
        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }
    requestRenderRef.current = requestRender;
    requestRender();

    controls.addEventListener("change", requestRender);

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      cancelAnimationFrame(frameId);
      clearTimeout(pollTimerId);
    };
    const handleContextRestored = () => {
      requestRender();
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored);

    // 7. Raycasting for Pin Detection & Hover Callouts
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const currentHoveredPinRef = { current: null as string | null };

    const handlePointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const allPins: THREE.Mesh[] = [];
      const pinMapBack = new Map<THREE.Mesh, { name: string; termDef: any }>();

      pinMeshesRef.current.forEach((meshes, name) => {
        const termDef = compDef.terminals.find((t) => t.name === name);
        meshes.forEach((m) => {
          allPins.push(m);
          pinMapBack.set(m, { name, termDef });
        });
      });

      const intersects = raycaster.intersectObjects(allPins, false);
      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        const info = pinMapBack.get(hit);
        if (info && info.termDef) {
          currentHoveredPinRef.current = info.name;
          setHoveredPinInfo({
            name: info.name,
            label: info.termDef.label,
            polarity: info.termDef.polarity,
            description: info.termDef.description,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
          renderer.domElement.style.cursor = "pointer";
          return;
        }
      }
      currentHoveredPinRef.current = null;
      setHoveredPinInfo(null);
      renderer.domElement.style.cursor = "grab";
    };

    const handleClick = () => {
      if (currentHoveredPinRef.current && onSelectTerminal) {
        onSelectTerminal(currentHoveredPinRef.current);
      }
    };

    renderer.domElement.addEventListener("mousemove", handlePointerMove);
    renderer.domElement.addEventListener("click", handleClick);

    // 8. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth || 600;
      const newH = container.clientHeight || 360;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
      requestRender();
    });
    resizeObserver.observe(container);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(pollTimerId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("mousemove", handlePointerMove);
      renderer.domElement.removeEventListener("click", handleClick);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      controls.dispose();
      shadowTex.dispose();
      if (scene.environment) {
        scene.environment.dispose();
        scene.environment = null;
      }
      originalMaterialsRef.current.clear();

      // Dispose all geometries and materials to prevent WebGL memory leaks
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else if (mesh.material) {
            mesh.material.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [compDef]);

  // Handle auto-rotate toggle
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !isSoftwareGlRef.current && isAutoRotating;
      requestRenderRef.current();
    }
  }, [isAutoRotating]);

  // Reset 3D camera orientation
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(0, 2.2, 5.5);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
      requestRenderRef.current();
    }
  };

  const zoomCamera = (delta: number) => {
    if (cameraRef.current && controlsRef.current) {
      const dir = cameraRef.current.position.clone().sub(controlsRef.current.target).normalize();
      const dist = cameraRef.current.position.distanceTo(controlsRef.current.target);
      const newDist = Math.max(1.8, Math.min(8.0, dist + delta));
      cameraRef.current.position.copy(controlsRef.current.target.clone().add(dir.multiplyScalar(newDist)));
      controlsRef.current.update();
      requestRenderRef.current();
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-gradient-to-b from-[#0a101f] via-[#070b14] to-[#04060c] select-none ${className}`}>
      {/* Three.js Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
      />

      {/* Blueprint Grid Watermark Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Floating 3D Pin Hover Callout HUD */}
      {hoveredPinInfo && (
        <div
          className="absolute z-20 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-3 px-3 py-2 rounded-xl bg-slate-950/95 border border-cyan-400 text-left shadow-2xl"
          style={{
            left: `${Math.max(80, Math.min(hoveredPinInfo.x, (mountRef.current?.clientWidth || 560) - 80))}px`,
            top: `${Math.max(40, hoveredPinInfo.y)}px`,
          }}
        >
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>{hoveredPinInfo.label}</span>
            {hoveredPinInfo.polarity && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {hoveredPinInfo.polarity}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-300 font-sans mt-0.5 max-w-xs">
            {hoveredPinInfo.description}
          </p>
          <div className="text-[10px] font-mono text-cyan-400/80 mt-1">
            Click pin to select &amp; trace
          </div>
        </div>
      )}

      {/* Minimal Top Header Badge */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2 pointer-events-none">
        <span className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-slate-700/80 text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5 shadow-md">
          <Box className="w-3.5 h-3.5" />
          <span>THREE.JS PBR 3D MODEL</span>
        </span>
        <span className="text-xs font-mono text-slate-400">
          {compDef.packageType}
        </span>
      </div>

      {/* Floating FLIR Thermal Heat Map Overlay Card */}
      {isThermalMode && (
        <div className="absolute top-12 left-4 z-20 w-72 bg-slate-950/95 border border-orange-500/50 rounded-2xl p-3.5 shadow-2xl font-mono text-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>FLIR THERMAL PROFILE</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                thermalMetrics.isOverheated
                  ? "bg-red-950 text-red-400 border border-red-700"
                  : thermalMetrics.isWarning
                  ? "bg-amber-950 text-amber-300 border border-amber-700"
                  : "bg-emerald-950 text-emerald-400 border border-emerald-800"
              }`}
            >
              {thermalMetrics.isOverheated
                ? "OVERHEATING"
                : thermalMetrics.isWarning
                ? "ELEVATED"
                : "OPTIMAL"}
            </span>
          </div>

          {/* False-Color Colorbar Scale */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
              <span>25°C (Cool)</span>
              <span>65°C</span>
              <span>110°C</span>
              <span className="text-red-400 font-bold">155°C (Hot)</span>
            </div>
            <div className="w-full h-3 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 via-emerald-400 via-yellow-400 via-orange-500 to-red-600 border border-slate-700 relative shadow-inner">
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full shadow-md -translate-x-1/2 border border-slate-950"
                style={{
                  left: `${Math.min(
                    100,
                    Math.max(0, ((thermalMetrics.tj - 25) / 130) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>

          {/* Temperature Metrics Readout */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
            <div>
              <span className="text-slate-400 block text-[10px]">JUNCTION TJ</span>
              <span
                className={`text-base font-extrabold ${
                  thermalMetrics.isOverheated ? "text-red-400" : "text-amber-300"
                }`}
              >
                {thermalMetrics.tj.toFixed(1)} °C
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CASE TCASE</span>
              <span className="text-base font-extrabold text-cyan-300">
                {thermalMetrics.tcase.toFixed(1)} °C
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">TEMP RISE ΔT</span>
              <span className="font-bold text-slate-200">
                +{thermalMetrics.tempRise.toFixed(1)} °C
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">R_TH (JA)</span>
              <span className="font-bold text-slate-200">
                {thermalMetrics.thetaJA} °C/W
              </span>
            </div>
          </div>

          {/* Power Dissipation Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-slate-300 text-[11px]">
              <span className="text-slate-400">Power Dissipation P:</span>
              <span className="font-bold text-amber-300">
                {simulatedPowerW.toFixed(2)} W ({Math.round(simulatedPowerW * 1000)} mW)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={compDef.packageType.includes("TO220") || compDef.packageType.includes("TO247") ? 5 : 1.5}
              step={0.05}
              value={simulatedPowerW}
              onChange={(e) => setSimulatedPowerW(parseFloat(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {thermalMetrics.isOverheated && (
            <div className="p-2 rounded-lg bg-red-950/80 border border-red-700/80 text-[10px] text-red-200 flex items-start gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span>
                Exceeds maximum package junction limit ({thermalMetrics.maxTempRating}°C). Heat sink or derating required!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ergonomic Collapsible Bottom Control Dock */}
      <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 z-10 max-w-[95%] w-auto flex flex-col items-center">
        {/* Toggle Collapse Button */}
        <button
          type="button"
          onClick={() => setIsHudCollapsed(!isHudCollapsed)}
          className="mb-1.5 px-3 py-1 rounded-lg bg-slate-950/95 hover:bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700/80 flex items-center gap-1.5 shadow-lg cursor-pointer transition-colors"
        >
          {isHudCollapsed ? (
            <>
              <ChevronUp className="w-3 h-3 text-cyan-400" />
              <span>Show 3D Tools</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 text-slate-400" />
              <span>Hide Dock</span>
            </>
          )}
        </button>

        {/* Unified Bottom Control Dock */}
        {!isHudCollapsed && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-950/95 border border-[#26365c] shadow-2xl text-xs font-mono">
            {/* Auto Rotate Toggle */}
            <button
              type="button"
              onClick={() => setIsAutoRotating(!isAutoRotating)}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isAutoRotating
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
              title="Toggle continuous 360° auto-rotation"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Auto-Rotate: {isAutoRotating ? "ON" : "OFF"}</span>
            </button>

            {/* Wireframe Toggle */}
            <button
              type="button"
              onClick={() => setIsWireframe(!isWireframe)}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isWireframe
                  ? "bg-cyan-500/25 text-cyan-300 border-cyan-400"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
              title="Inspect polygon topology and mesh wireframe"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Wireframe: {isWireframe ? "ON" : "OFF"}</span>
            </button>

            {/* Thermal Simulation Heat Map Toggle */}
            <button
              type="button"
              onClick={() => setIsThermalMode(!isThermalMode)}
              className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isThermalMode
                  ? "bg-gradient-to-r from-red-500/30 to-orange-500/30 text-amber-200 border-amber-400 shadow-md shadow-orange-500/20"
                  : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
              }`}
              title="Toggle color-coded FLIR thermal heat map showing operating power dissipation & junction temperature"
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  isThermalMode ? "text-amber-400" : "text-slate-400"
                }`}
              />
              <span>Thermal: {isThermalMode ? "ON" : "OFF"}</span>
            </button>

            {/* Exploded View Slider */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300">
              <Sliders className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px] whitespace-nowrap">Explode:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.02}
                value={explodedRatio}
                onChange={(e) => setExplodedRatio(parseFloat(e.target.value))}
                className="w-20 sm:w-28 accent-cyan-400 cursor-pointer"
                title="Separate internal die, casing, and leadframe"
              />
              <span className="text-[10px] text-cyan-300 font-mono w-7 text-right">
                {Math.round(explodedRatio * 100)}%
              </span>
            </div>

            {/* Zoom & Reset Buttons */}
            <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => zoomCamera(-0.7)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => zoomCamera(0.7)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={resetCamera}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
                title="Reset Camera View"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =========================================================================
// PROCEDURAL 3D PBR ELECTRONIC COMPONENT GEOMETRY BUILDERS
// =========================================================================

function build3DComponentModel(
  def: RealisticComponentDef,
  group: THREE.Group,
  pinMap: Map<string, THREE.Mesh[]>,
  explodedList: Array<{ mesh: THREE.Object3D; originalPos: THREE.Vector3; explodeDir: THREE.Vector3 }>,
  isSoftwareGl = false
) {
  const metalLeadMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.95,
    roughness: 0.2,
  });

  const nickelTabMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.96,
    roughness: 0.16,
  });

  const blackEpoxyMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    metalness: 0.08,
    roughness: 0.5,
  });

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    metalness: 0.9,
    roughness: 0.24,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    metalness: 0.92,
    roughness: 0.22,
  });

  const pushExplode = (mesh: THREE.Object3D, x: number, y: number, z: number) => {
    explodedList.push({
      mesh,
      originalPos: mesh.position.clone(),
      explodeDir: new THREE.Vector3(x, y, z),
    });
  };

  const assignPin = (key: string | undefined, mesh: THREE.Mesh, labelPrefix = "pin_") => {
    if (!key) return;
    mesh.name = `${labelPrefix}${key}`;
    const existing = pinMap.get(key);
    if (existing) existing.push(mesh);
    else pinMap.set(key, [mesh]);
  };

  const pkg = def.packageType;

  // -----------------------------------------------------------------------
  // SPECIAL OVERRIDES BY COMPONENT ID (where realisticComponentsData shares packageType)
  // -----------------------------------------------------------------------
  if (def.id === "XTAL_16MHZ") {
    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 0.08, 24),
      blackEpoxyMat.clone()
    );
    pad.scale.set(1.2, 1, 0.55);
    pad.position.y = -0.35;

    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.12, 24),
      nickelTabMat.clone()
    );
    rim.scale.set(1.15, 1, 0.52);
    rim.position.y = -0.25;

    const canBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 0.7, 24),
      nickelTabMat.clone()
    );
    canBody.scale.set(1.1, 1, 0.48);
    canBody.position.y = 0.15;

    const domeCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      nickelTabMat.clone()
    );
    domeCap.scale.set(1.1, 0.45, 0.48);
    domeCap.position.y = 0.5;

    const leadGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 14);
    const l1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l1.position.set(-0.36, -0.82, 0);
    const l2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l2.position.set(0.36, -0.82, 0);

    group.add(pad, rim, canBody, domeCap, l1, l2);
    assignPin(def.terminals[0]?.name || "XTAL1", l1);
    assignPin(def.terminals[1]?.name || "XTAL2", l2);
    pushExplode(canBody, 0, 0.6, 0);
    pushExplode(domeCap, 0, 0.9, 0);
    pushExplode(rim, 0, 0.25, 0);
    pushExplode(pad, 0, -0.1, 0);
    pushExplode(l1, -0.3, -0.6, 0);
    pushExplode(l2, 0.3, -0.6, 0);
    return;
  }

  if (def.id === "RES_SMD") {
    const aluminaMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.45, metalness: 0.05 });
    const glazeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.25, metalness: 0.15 });
    const ceramicCore = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.42, 1.05), aluminaMat);
    const resistiveFilm = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.98), glazeMat);
    resistiveFilm.position.y = 0.22;

    const capGeo = new THREE.BoxGeometry(0.32, 0.46, 1.1);
    const capL = new THREE.Mesh(capGeo, nickelTabMat.clone());
    capL.position.x = -0.82;
    const capR = new THREE.Mesh(capGeo, nickelTabMat.clone());
    capR.position.x = 0.82;

    const solderPadGeo = new THREE.BoxGeometry(0.45, 0.06, 1.15);
    const padL = new THREE.Mesh(solderPadGeo, brassMat.clone());
    padL.position.set(-0.82, -0.25, 0);
    const padR = new THREE.Mesh(solderPadGeo, brassMat.clone());
    padR.position.set(0.82, -0.25, 0);

    group.add(ceramicCore, resistiveFilm, capL, capR, padL, padR);
    assignPin("T1", capL);
    assignPin("T2", capR);
    pushExplode(resistiveFilm, 0, 0.55, 0);
    pushExplode(capL, -0.7, 0, 0);
    pushExplode(capR, 0.7, 0, 0);
    pushExplode(padL, -0.7, -0.45, 0);
    pushExplode(padR, 0.7, -0.45, 0);
    return;
  }

  if (def.id === "RES_WIREWOUND") {
    const ceramicWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75, metalness: 0.02 });
    const block = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 0.75), ceramicWhite);
    const coreSlot = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.14, 0.65),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.8 })
    );
    coreSlot.position.y = -0.34;

    const leadGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.15, 16);
    leadGeo.rotateZ(Math.PI / 2);
    const l1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l1.position.x = -1.55;
    const l2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l2.position.x = 1.55;

    group.add(block, coreSlot, l1, l2);
    assignPin("T1", l1);
    assignPin("T2", l2);
    pushExplode(coreSlot, 0, -0.5, 0);
    pushExplode(l1, -0.8, 0, 0);
    pushExplode(l2, 0.8, 0, 0);
    return;
  }

  if (def.id === "BUCK_CONVERTER_LM2596") {
    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 0.1, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.35 })
    );
    const ic = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.25, 0.55), blackEpoxyMat.clone());
    ic.position.set(-0.2, 0.18, 0.25);
    const coil = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.45, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55 })
    );
    coil.position.set(0.55, 0.28, -0.15);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.45, 0.24),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 })
    );
    trim.position.set(-0.25, 0.28, -0.4);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), brassMat.clone());
    screw.position.set(-0.35, 0.54, -0.4);

    const capMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 });
    const capIn = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.55, 20), capMat);
    capIn.position.set(-0.85, 0.32, 0.28);
    const capOut = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.55, 20), capMat.clone());
    capOut.position.set(0.95, 0.32, 0.32);

    const padGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.18, 12);
    const pInPos = new THREE.Mesh(padGeo, metalLeadMat.clone());
    pInPos.position.set(-1.25, 0.02, -0.45);
    const pInNeg = new THREE.Mesh(padGeo, metalLeadMat.clone());
    pInNeg.position.set(-1.25, 0.02, 0.45);
    const pOutPos = new THREE.Mesh(padGeo, metalLeadMat.clone());
    pOutPos.position.set(1.25, 0.02, -0.45);
    const pOutNeg = new THREE.Mesh(padGeo, metalLeadMat.clone());
    pOutNeg.position.set(1.25, 0.02, 0.45);

    group.add(pcb, ic, coil, trim, screw, capIn, capOut, pInPos, pInNeg, pOutPos, pOutNeg);
    assignPin("IN_POS", pInPos);
    assignPin("IN_NEG", pInNeg);
    assignPin("OUT_POS", pOutPos);
    assignPin("OUT_NEG", pOutNeg);
    pushExplode(coil, 0, 0.8, 0);
    pushExplode(capIn, 0, 0.65, 0);
    pushExplode(capOut, 0, 0.65, 0);
    pushExplode(trim, 0, 0.7, 0);
    pushExplode(screw, 0, 1.0, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 1. AXIAL RESISTOR (Carbon film tan / Metal film blue)
  // -----------------------------------------------------------------------
  if (pkg === "AXIAL_RESISTOR") {
    const isMetal = def.id === "RES_METAL";
    const bodyMat = new THREE.MeshStandardMaterial({
      color: isMetal ? 0x2563eb : 0xd97706,
      roughness: 0.35,
      metalness: 0.05,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.6, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    const bulgeGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 24);
    bulgeGeo.rotateZ(Math.PI / 2);
    const endL = new THREE.Mesh(bulgeGeo, bodyMat);
    endL.position.x = -0.8;
    const endR = new THREE.Mesh(bulgeGeo, bodyMat);
    endR.position.x = 0.8;
    group.add(endL, endR);

    const ohms = def.defaultValues?.valueNumber ?? (isMetal ? 10000 : 1000);
    const bands = calculateResistorColorBands(ohms);
    const bandPositions = [-0.45, -0.15, 0.15, 0.5];
    const bandColors = [
      bands.band1.color,
      bands.band2.color,
      bands.band3.color,
      bands.band4.color,
    ];

    bandPositions.forEach((pos, idx) => {
      const ringGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 24);
      ringGeo.rotateZ(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(bandColors[idx]),
        roughness: 0.3,
        metalness: idx === 3 ? 0.8 : 0.1,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.x = pos;
      group.add(ring);
      pushExplode(ring, 0, 0.45 + idx * 0.08, 0);
    });

    const leadGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 16);
    leadGeo.rotateZ(Math.PI / 2);

    const lead1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    lead1.position.x = -1.6;
    const lead2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    lead2.position.x = 1.6;
    group.add(lead1, lead2);

    assignPin("T1", lead1);
    assignPin("T2", lead2);
    pushExplode(endL, -0.35, 0, 0);
    pushExplode(endR, 0.35, 0, 0);
    pushExplode(lead1, -1, 0, 0);
    pushExplode(lead2, 1, 0, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 2. AXIAL DIODE DO-41 (1N4007 / 1N5819 Schottky)
  // -----------------------------------------------------------------------
  if (pkg === "AXIAL_DIODE_DO41") {
    const isSchottky = def.id === "DIODE_1N5819";
    const bodyGeo = new THREE.CylinderGeometry(0.36, 0.36, 1.4, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, blackEpoxyMat);
    group.add(body);

    const ringGeo = new THREE.CylinderGeometry(0.365, 0.365, 0.22, 24);
    ringGeo.rotateZ(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: isSchottky ? 0x38bdf8 : 0xe2e8f0,
      metalness: isSchottky ? 0.4 : 0.9,
      roughness: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.x = 0.45;
    group.add(ring);

    const leadGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 16);
    leadGeo.rotateZ(Math.PI / 2);
    const anodeLead = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    anodeLead.position.x = -1.45;
    const cathodeLead = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    cathodeLead.position.x = 1.45;
    group.add(anodeLead, cathodeLead);

    assignPin("ANODE", anodeLead);
    assignPin("CATHODE", cathodeLead);
    pushExplode(anodeLead, -1, 0, 0);
    pushExplode(cathodeLead, 1, 0, 0);
    pushExplode(ring, 0, 0.5, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 3. GLASS DIODE DO-35 (1N4148 / Zener / DB3)
  // -----------------------------------------------------------------------
  if (pkg === "GLASS_DIODE_DO35") {
    const isZener = def.id.includes("ZENER");
    const isDiac = def.id.includes("DIAC");
    const glassGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.2, 24);
    glassGeo.rotateZ(Math.PI / 2);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: isDiac ? 0x38bdf8 : 0xf97316,
      transmission: isSoftwareGl ? 0 : 0.85,
      opacity: isSoftwareGl ? 0.42 : 0.9,
      transparent: true,
      depthWrite: false,
      roughness: 0.1,
      ior: 1.5,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.renderOrder = 2;
    group.add(glass);

    const slugGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16);
    slugGeo.rotateZ(Math.PI / 2);
    const slug = new THREE.Mesh(slugGeo, copperMat);
    group.add(slug);

    if (def.isPolarized) {
      const bandGeo = new THREE.CylinderGeometry(0.285, 0.285, 0.15, 24);
      bandGeo.rotateZ(Math.PI / 2);
      const band = new THREE.Mesh(
        bandGeo,
        isZener ? new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3 }) : blackEpoxyMat
      );
      band.position.x = 0.35;
      group.add(band);
      pushExplode(band, 0, 0.75, 0);
    }

    const leadGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.4, 16);
    leadGeo.rotateZ(Math.PI / 2);
    const l1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l1.position.x = -1.3;
    const l2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l2.position.x = 1.3;
    group.add(l1, l2);

    assignPin(def.terminals[0]?.name || "T1", l1);
    assignPin(def.terminals[1]?.name || "T2", l2);
    pushExplode(glass, 0, 0.55, 0);
    pushExplode(slug, 0, 0.15, 0);
    pushExplode(l1, -1, 0, 0);
    pushExplode(l2, 1, 0, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 4. RADIAL ELECTROLYTIC CAPACITOR
  // -----------------------------------------------------------------------
  if (pkg === "RADIAL_ELECTROLYTIC") {
    const canGeo = new THREE.CylinderGeometry(0.65, 0.65, 1.8, 32);
    const can = new THREE.Mesh(canGeo, blackEpoxyMat);
    group.add(can);

    const bungGeo = new THREE.CylinderGeometry(0.64, 0.62, 0.12, 28);
    const bung = new THREE.Mesh(bungGeo, new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
    bung.position.y = -0.9;
    group.add(bung);

    const stripeGeo = new THREE.CylinderGeometry(0.655, 0.655, 1.78, 32, 1, false, 0, Math.PI / 5);
    const stripeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.3,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const stripe = new THREE.Mesh(stripeGeo, stripeMat);
    stripe.rotation.y = Math.PI / 2;
    group.add(stripe);

    const ventTopGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.05, 32);
    const ventMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const ventTop = new THREE.Mesh(ventTopGeo, ventMat);
    ventTop.position.y = 0.91;
    group.add(ventTop);

    const leadGeoLong = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 16);
    const leadGeoShort = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 16);
    const anode = new THREE.Mesh(leadGeoLong, metalLeadMat.clone());
    anode.position.set(-0.25, -1.45, 0);
    const cathode = new THREE.Mesh(leadGeoShort, metalLeadMat.clone());
    cathode.position.set(0.25, -1.3, 0);
    group.add(anode, cathode);

    assignPin("ANODE", anode);
    assignPin("CATHODE", cathode);
    pushExplode(ventTop, 0, 0.9, 0);
    pushExplode(stripe, 0, 0.2, 0.7);
    pushExplode(bung, 0, -0.4, 0);
    pushExplode(anode, -0.25, -0.8, 0);
    pushExplode(cathode, 0.25, -0.8, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 5. CERAMIC DISC, TANTALUM DIP & BOX POLYESTER CAPACITORS
  // -----------------------------------------------------------------------
  if (pkg === "CERAMIC_DISC") {
    const discMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55, metalness: 0.05 });
    const discGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.22, 32);
    discGeo.rotateX(Math.PI / 2);
    const disc = new THREE.Mesh(discGeo, discMat);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.08, 12, 32), discMat);
    const collar = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.25, 0.26),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 })
    );
    collar.position.y = -0.58;

    const leadGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.2, 16);
    const l1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l1.position.set(-0.25, -1.05, 0);
    const l2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l2.position.set(0.25, -1.05, 0);
    group.add(disc, rim, collar, l1, l2);

    assignPin("T1", l1);
    assignPin("T2", l2);
    pushExplode(rim, 0, 0.4, 0.3);
    pushExplode(collar, 0, -0.35, 0);
    pushExplode(l1, -0.25, -0.7, 0);
    pushExplode(l2, 0.25, -0.7, 0);
    return;
  }

  if (pkg === "TANTALUM_DIP") {
    const tantMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.08 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.58, 24, 20), tantMat);
    body.scale.set(0.95, 1.25, 0.68);
    const capDot = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.08, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.7 })
    );
    capDot.position.set(-0.26, 0.32, 0.16);

    const leadGeoLong = new THREE.CylinderGeometry(0.045, 0.045, 1.15, 14);
    const leadGeoShort = new THREE.CylinderGeometry(0.045, 0.045, 0.9, 14);
    const anode = new THREE.Mesh(leadGeoLong, metalLeadMat.clone());
    anode.position.set(-0.24, -1.05, 0);
    const cathode = new THREE.Mesh(leadGeoShort, metalLeadMat.clone());
    cathode.position.set(0.24, -0.92, 0);
    group.add(body, capDot, anode, cathode);

    assignPin("ANODE", anode);
    assignPin("CATHODE", cathode);
    pushExplode(capDot, -0.2, 0.5, 0.3);
    pushExplode(anode, -0.25, -0.7, 0);
    pushExplode(cathode, 0.25, -0.7, 0);
    return;
  }

  if (pkg === "BOX_POLYESTER") {
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35, metalness: 0.05 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.95, 0.58), yellowMat);
    const potBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.34, 0.12, 0.52),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.7 })
    );
    potBase.position.y = -0.46;

    const leadGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.0, 14);
    const l1 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l1.position.set(-0.48, -0.9, 0);
    const l2 = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    l2.position.set(0.48, -0.9, 0);
    group.add(box, potBase, l1, l2);

    assignPin("T1", l1);
    assignPin("T2", l2);
    pushExplode(potBase, 0, -0.35, 0);
    pushExplode(l1, -0.3, -0.7, 0);
    pushExplode(l2, 0.3, -0.7, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 5B. TOROID INDUCTOR & EI TRANSFORMER
  // -----------------------------------------------------------------------
  if (pkg === "TOROID_INDUCTOR") {
    const core = new THREE.Mesh(
      new THREE.TorusGeometry(0.68, 0.24, 20, 40),
      new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.45, metalness: 0.15 })
    );
    core.position.y = 0.25;
    group.add(core);

    const windings: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.045, 10, 20), copperMat.clone());
      w.position.set(Math.cos(a) * 0.68, 0.25 + Math.sin(a) * 0.68, 0);
      w.rotation.y = Math.PI / 2;
      w.rotation.x = -a;
      group.add(w);
      windings.push(w);
    }

    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.14, 0.72), blackEpoxyMat.clone());
    base.position.y = -0.68;
    const leadGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.85, 14);
    const inLead = new THREE.Mesh(leadGeo, copperMat.clone());
    inLead.position.set(-0.5, -1.05, 0);
    const outLead = new THREE.Mesh(leadGeo, copperMat.clone());
    outLead.position.set(0.5, -1.05, 0);
    group.add(base, inLead, outLead);

    assignPin("IN", inLead);
    assignPin("OUT", outLead);
    windings.forEach((w, idx) => {
      const a = (idx / 14) * Math.PI * 2;
      pushExplode(w, Math.cos(a) * 0.35, Math.sin(a) * 0.35, 0.25);
    });
    pushExplode(base, 0, -0.4, 0);
    pushExplode(inLead, -0.3, -0.8, 0);
    pushExplode(outLead, 0.3, -0.8, 0);
    return;
  }

  if (pkg === "TRANSFORMER_EI") {
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.78, roughness: 0.38 });
    const tapeMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.42, metalness: 0.05 });

    const coreTop = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.26, 1.05), steelMat);
    coreTop.position.y = 0.72;
    const coreBot = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.26, 1.05), steelMat);
    coreBot.position.y = -0.52;
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 1.05), steelMat);
    legL.position.set(-0.89, 0.1, 0);
    const legR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 1.05), steelMat);
    legR.position.set(0.89, 0.1, 0);

    const bobbin = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.02, 1.38), tapeMat);
    bobbin.position.y = 0.1;

    const earGeo = new THREE.BoxGeometry(0.32, 0.12, 0.85);
    const earL = new THREE.Mesh(earGeo, nickelTabMat.clone());
    earL.position.set(-1.18, -0.59, 0);
    const earR = new THREE.Mesh(earGeo, nickelTabMat.clone());
    earR.position.set(1.18, -0.59, 0);

    const lugGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.55, 12);
    const pri1 = new THREE.Mesh(lugGeo, brassMat.clone());
    pri1.position.set(-0.45, -0.82, 0.42);
    const pri2 = new THREE.Mesh(lugGeo, brassMat.clone());
    pri2.position.set(-0.45, -0.82, -0.42);
    const sec1 = new THREE.Mesh(lugGeo, brassMat.clone());
    sec1.position.set(0.45, -0.82, 0.42);
    const sec2 = new THREE.Mesh(lugGeo, brassMat.clone());
    sec2.position.set(0.45, -0.82, -0.42);

    group.add(coreTop, coreBot, legL, legR, bobbin, earL, earR, pri1, pri2, sec1, sec2);
    assignPin("PRI1", pri1);
    assignPin("PRI2", pri2);
    assignPin("SEC1", sec1);
    assignPin("SEC2", sec2);
    pushExplode(coreTop, 0, 0.7, 0);
    pushExplode(legL, -0.6, 0, 0);
    pushExplode(legR, 0.6, 0, 0);
    pushExplode(bobbin, 0, 0.1, 0.6);
    pushExplode(coreBot, 0, -0.55, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 5C. ROTARY POTENTIOMETER & BRIDGE RECTIFIER
  // -----------------------------------------------------------------------
  if (pkg === "POT_ROTARY") {
    const casing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.55, 32), nickelTabMat.clone());
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.18, 1.3),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 })
    );
    board.position.set(0, -0.32, 0.25);

    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 24), brassMat.clone());
    collar.position.y = 0.5;
    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.14, 6), nickelTabMat.clone());
    nut.position.y = 0.46;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.9, 20), brassMat.clone());
    shaft.position.y = 1.05;

    const lugGeo = new THREE.BoxGeometry(0.12, 0.65, 0.08);
    const t1 = new THREE.Mesh(lugGeo, metalLeadMat.clone());
    t1.position.set(-0.42, -0.7, 0.72);
    const wiper = new THREE.Mesh(lugGeo, metalLeadMat.clone());
    wiper.position.set(0, -0.7, 0.72);
    const t3 = new THREE.Mesh(lugGeo, metalLeadMat.clone());
    t3.position.set(0.42, -0.7, 0.72);

    group.add(casing, board, collar, nut, shaft, t1, wiper, t3);
    assignPin("T1", t1);
    assignPin("WIPER", wiper);
    assignPin("T3", t3);
    pushExplode(shaft, 0, 0.9, 0);
    pushExplode(nut, 0, 0.65, 0);
    pushExplode(collar, 0, 0.4, 0);
    pushExplode(board, 0, -0.4, 0.2);
    return;
  }

  if (pkg === "BRIDGE_W04") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.65, 32), blackEpoxyMat.clone());
    const topCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.72, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 })
    );
    topCap.position.y = 0.36;
    const posMark = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.04, 0.24),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 })
    );
    posMark.position.set(-0.32, 0.43, 0.25);

    const leadGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 14);
    const coords = [
      { key: def.terminals[0]?.name || "AC1", x: 0.35, z: -0.35 },
      { key: def.terminals[1]?.name || "AC2", x: 0.35, z: 0.35 },
      { key: def.terminals[2]?.name || "POS", x: -0.35, z: 0.35 },
      { key: def.terminals[3]?.name || "NEG", x: -0.35, z: -0.35 },
    ];
    group.add(body, topCap, posMark);
    coords.forEach((c) => {
      const m = new THREE.Mesh(leadGeo, metalLeadMat.clone());
      m.position.set(c.x, -0.78, c.z);
      group.add(m);
      assignPin(c.key, m);
      pushExplode(m, c.x * 0.5, -0.7, c.z * 0.5);
    });
    pushExplode(topCap, 0, 0.65, 0);
    pushExplode(posMark, 0, 0.85, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 6. TO-92 TRANSISTOR (BC547, BC557, 2N2222)
  // -----------------------------------------------------------------------
  if (pkg === "TO92") {
    const bodyShape = new THREE.Shape();
    bodyShape.absarc(0, 0, 0.55, -Math.PI / 2, Math.PI / 2, false);
    bodyShape.lineTo(-0.2, 0.55);
    bodyShape.lineTo(-0.2, -0.55);
    bodyShape.closePath();

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 0.9,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.05,
      bevelThickness: 0.05,
    });
    bodyGeo.rotateX(-Math.PI / 2);
    bodyGeo.center();

    const body = new THREE.Mesh(bodyGeo, blackEpoxyMat);
    const capRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.48, 0.06, 20),
      new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.4 })
    );
    capRing.position.y = 0.48;
    group.add(body, capRing);

    const leadGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 16);
    const cLead = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    cLead.position.set(-0.28, -1.05, 0);
    const bLead = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    bLead.position.set(0, -1.05, 0);
    const eLead = new THREE.Mesh(leadGeo, metalLeadMat.clone());
    eLead.position.set(0.28, -1.05, 0);
    group.add(cLead, bLead, eLead);

    const tNames = def.terminals.map((t) => t.name);
    assignPin(tNames[0] || "COLLECTOR", cLead);
    assignPin(tNames[1] || "BASE", bLead);
    assignPin(tNames[2] || "EMITTER", eLead);
    pushExplode(capRing, 0, 0.65, 0);
    pushExplode(cLead, -0.35, -0.65, 0);
    pushExplode(bLead, 0, -0.65, 0);
    pushExplode(eLead, 0.35, -0.65, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 7. TO-220 / TO-247 POWER SEMICONDUCTOR
  // -----------------------------------------------------------------------
  if (pkg === "TO220" || pkg === "TO247") {
    const scale = pkg === "TO247" ? 1.25 : 1.0;
    const bodyGeo = new THREE.BoxGeometry(1.2 * scale, 1.1 * scale, 0.45 * scale);
    bodyGeo.translate(0, -0.1 * scale, 0);
    const body = new THREE.Mesh(bodyGeo, blackEpoxyMat);
    group.add(body);

    const tabShape = new THREE.Shape();
    tabShape.moveTo(-0.6 * scale, 0.45 * scale);
    tabShape.lineTo(0.6 * scale, 0.45 * scale);
    tabShape.lineTo(0.6 * scale, 1.35 * scale);
    tabShape.lineTo(-0.6 * scale, 1.35 * scale);
    tabShape.closePath();

    const holePath = new THREE.Path();
    holePath.absarc(0, 0.9 * scale, 0.22 * scale, 0, Math.PI * 2, true);
    tabShape.holes.push(holePath);

    const tabGeo = new THREE.ExtrudeGeometry(tabShape, { depth: 0.12 * scale, bevelEnabled: false });
    tabGeo.center();
    tabGeo.translate(0, 0.85 * scale, -0.15 * scale);
    const tab = new THREE.Mesh(tabGeo, nickelTabMat);
    group.add(tab);

    const pinGeo = new THREE.BoxGeometry(0.09 * scale, 1.3 * scale, 0.06 * scale);
    const p1 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p1.position.set(-0.35 * scale, -1.2 * scale, 0);
    const p2 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p2.position.set(0, -1.2 * scale, 0);
    const p3 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p3.position.set(0.35 * scale, -1.2 * scale, 0);
    group.add(p1, p2, p3);

    const tNames = def.terminals.map((t) => t.name);
    assignPin(tNames[0], p1);
    assignPin(tNames[1], p2);
    assignPin(tNames[2], p3);

    pushExplode(tab, 0, 0.8, -0.4);
    pushExplode(p1, -0.3, -0.6, 0);
    pushExplode(p2, 0, -0.6, 0);
    pushExplode(p3, 0.3, -0.6, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 8. DIP INTEGRATED CIRCUITS (DIP8 / 4N35 / DIP14 / DIP16 / DIP28)
  // -----------------------------------------------------------------------
  if (pkg === "DIP8" || pkg === "DIP14" || pkg === "DIP16" || pkg === "DIP28") {
    const isOpto = def.id === "OPTOCOUPLER_4N35";
    const pinCount = isOpto ? 6 : pkg === "DIP8" ? 8 : pkg === "DIP14" ? 14 : pkg === "DIP16" ? 16 : 28;
    const bodyLength = (pinCount / 2) * 0.45 + 0.35;

    const icBodyMat = isOpto
      ? new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.05 })
      : blackEpoxyMat;
    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLength, 0.4, 0.95), icBodyMat);
    group.add(body);

    const notchGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.42, 16, 1, false, 0, Math.PI);
    notchGeo.rotateZ(Math.PI / 2);
    const notchMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
    const notch = new THREE.Mesh(notchGeo, notchMat);
    notch.position.set(-bodyLength / 2, 0.1, 0);
    group.add(notch);

    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12),
      new THREE.MeshBasicMaterial({ color: 0x52525b })
    );
    dot.position.set(-bodyLength / 2 + 0.25, 0.21, 0.3);
    group.add(dot);

    pushExplode(notch, -0.3, 0.5, 0);
    pushExplode(dot, 0, 0.7, 0);

    const pinsPerSide = pinCount / 2;
    const pinSpacing = (bodyLength - 0.5) / (pinsPerSide - 1 || 1);

    for (let i = 0; i < pinsPerSide; i++) {
      const x = -bodyLength / 2 + 0.25 + i * pinSpacing;
      const pB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.06), metalLeadMat.clone());
      pB.position.set(x, -0.35, 0.52);
      group.add(pB);
      assignPin(def.terminals[i]?.name, pB);
      pushExplode(pB, 0, -0.45, 0.45);

      const pT = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.06), metalLeadMat.clone());
      pT.position.set(x, -0.35, -0.52);
      group.add(pT);
      assignPin(def.terminals[pinCount - 1 - i]?.name, pT);
      pushExplode(pT, 0, -0.45, -0.45);
    }
    return;
  }

  // -----------------------------------------------------------------------
  // 9. 5mm ROUND LED
  // -----------------------------------------------------------------------
  if (pkg === "LED_5MM") {
    const ledHex = def.id.includes("GREEN")
      ? 0x22c55e
      : def.id.includes("BLUE")
      ? 0x38bdf8
      : def.id.includes("YELLOW") || def.id.includes("AMBER")
      ? 0xfacc15
      : 0xef4444;

    const lensMat = new THREE.MeshPhysicalMaterial({
      color: ledHex,
      transmission: isSoftwareGl ? 0 : 0.75,
      opacity: isSoftwareGl ? 0.45 : 0.88,
      transparent: true,
      depthWrite: false,
      roughness: 0.15,
      emissive: new THREE.Color(ledHex),
      emissiveIntensity: 0.25,
      ior: 1.55,
    });

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), lensMat);
    dome.position.y = 0.35;
    dome.renderOrder = 2;

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.7, 24), lensMat);
    base.renderOrder = 2;

    const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.54, 0.12, 24), lensMat);
    flange.position.y = -0.35;
    flange.renderOrder = 2;

    const cupGeo = new THREE.ConeGeometry(0.15, 0.25, 12);
    cupGeo.rotateX(Math.PI);
    const cup = new THREE.Mesh(cupGeo, metalLeadMat.clone());
    cup.position.set(0.08, 0.1, 0);

    const anode = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 16), metalLeadMat.clone());
    anode.position.set(-0.18, -0.95, 0);
    const cathode = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.1, 16), metalLeadMat.clone());
    cathode.position.set(0.18, -0.8, 0);
    group.add(dome, base, flange, cup, anode, cathode);

    assignPin("ANODE", anode);
    assignPin("CATHODE", cathode);
    pushExplode(dome, 0, 0.75, 0);
    pushExplode(base, 0, 0.35, 0);
    pushExplode(flange, 0, 0.05, 0);
    pushExplode(cup, 0.2, 0.2, 0);
    pushExplode(anode, -0.25, -0.7, 0);
    pushExplode(cathode, 0.25, -0.7, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 10. MICROCONTROLLER BOARDS & RF MODULES
  // -----------------------------------------------------------------------
  if (
    pkg === "PCB_ARDUINO_UNO" ||
    pkg === "PCB_ARDUINO_NANO" ||
    pkg === "PCB_RPI_PICO" ||
    pkg === "PCB_ESP32_DEVKIT" ||
    pkg === "MODULE_BLUETOOTH" ||
    pkg === "MODULE_LORA" ||
    pkg === "MODULE_NRF24" ||
    pkg === "MODULE_GPS" ||
    pkg === "MODULE_GSM"
  ) {
    const pcbColor =
      pkg === "PCB_ARDUINO_UNO" || pkg === "PCB_ARDUINO_NANO" || pkg === "MODULE_BLUETOOTH" || pkg === "MODULE_LORA"
        ? 0x0284c7
        : pkg === "PCB_RPI_PICO"
        ? 0x16a34a
        : 0x18181b;
    const isWide = pkg === "PCB_ARDUINO_UNO";
    const w = isWide ? 2.8 : 2.35;
    const d = isWide ? 2.0 : 1.15;

    const pcb = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.08, d),
      new THREE.MeshStandardMaterial({ color: pcbColor, roughness: 0.35 })
    );
    group.add(pcb);

    // Primary IC or RF Shield Can
    const hasShield = pkg === "PCB_ESP32_DEVKIT" || pkg === "MODULE_LORA" || pkg === "MODULE_GSM";
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(hasShield ? 0.95 : 0.72, 0.14, hasShield ? 0.85 : 0.56),
      hasShield ? nickelTabMat.clone() : blackEpoxyMat.clone()
    );
    chip.position.set(hasShield ? 0.2 : -0.1, 0.11, 0);
    group.add(chip);
    pushExplode(chip, 0, 0.65, 0);

    // Connector / Antenna accent
    if (pkg.startsWith("PCB_")) {
      const usb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.34, 0.48), nickelTabMat.clone());
      usb.position.set(-w / 2 + 0.25, 0.2, isWide ? 0.4 : 0);
      group.add(usb);
      pushExplode(usb, -0.5, 0.4, 0);
    } else {
      const antennaTrace = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.04, 0.68),
        brassMat.clone()
      );
      antennaTrace.position.set(w / 2 - 0.28, 0.06, 0);
      group.add(antennaTrace);
      pushExplode(antennaTrace, 0.5, 0.4, 0);
    }

    // Header Pins (top and bottom banks mapped evenly to def.terminals)
    const headerBar1 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.22, 0.14), blackEpoxyMat.clone());
    headerBar1.position.set(0.15, 0.14, d * 0.42);
    const headerBar2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.22, 0.14), blackEpoxyMat.clone());
    headerBar2.position.set(0.15, 0.14, -d * 0.42);
    group.add(headerBar1, headerBar2);
    pushExplode(headerBar1, 0, 0.45, 0.35);
    pushExplode(headerBar2, 0, 0.45, -0.35);

    const half = Math.ceil(def.terminals.length / 2);
    const pinGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.48, 8);
    def.terminals.forEach((term, idx) => {
      const topRow = idx >= half;
      const col = topRow ? idx - half : idx;
      const span = Math.max(1, (topRow ? def.terminals.length - half : half) - 1);
      const px = -w * 0.32 + (col / span) * (w * 0.64);
      const pz = topRow ? -d * 0.42 : d * 0.42;
      const pm = new THREE.Mesh(pinGeo, brassMat.clone());
      pm.position.set(px, -0.22, pz);
      group.add(pm);
      assignPin(term.name, pm);
      pushExplode(pm, 0, -0.5, pz * 0.3);
    });
    return;
  }

  // -----------------------------------------------------------------------
  // 11. BOURNS TRIMMER POTENTIOMETER (3296)
  // -----------------------------------------------------------------------
  if (pkg === "TRIMMER_POT") {
    const blueBoxMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.55), blueBoxMat);
    group.add(box);

    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16), brassMat.clone());
    screw.position.set(0.3, 0.55, 0);
    group.add(screw);

    const pinGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.9, 12);
    const p1 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p1.position.set(-0.3, -0.85, 0);
    const p2 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p2.position.set(0, -0.85, 0);
    const p3 = new THREE.Mesh(pinGeo, metalLeadMat.clone());
    p3.position.set(0.3, -0.85, 0);
    group.add(p1, p2, p3);

    assignPin("T1", p1);
    assignPin("WIPER", p2);
    assignPin("T3", p3);
    pushExplode(screw, 0, 0.75, 0);
    pushExplode(p1, -0.25, -0.65, 0);
    pushExplode(p2, 0, -0.65, 0);
    pushExplode(p3, 0.25, -0.65, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 12. GLASS CARTRIDGE FUSE 5x20mm
  // -----------------------------------------------------------------------
  if (pkg === "GLASS_FUSE_5X20") {
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: isSoftwareGl ? 0 : 0.9,
      opacity: isSoftwareGl ? 0.38 : 0.95,
      transparent: true,
      depthWrite: false,
      roughness: 0.05,
      ior: 1.5,
    });
    const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.4, 24), glassMat);
    glassTube.rotation.z = Math.PI / 2;
    glassTube.renderOrder = 2;
    group.add(glassTube);

    const capGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.35, 24);
    capGeo.rotateZ(Math.PI / 2);
    const cap1 = new THREE.Mesh(capGeo, nickelTabMat.clone());
    cap1.position.x = -0.75;
    const cap2 = new THREE.Mesh(capGeo, nickelTabMat.clone());
    cap2.position.x = 0.75;
    group.add(cap1, cap2);

    const wireGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.3, 8);
    wireGeo.rotateZ(Math.PI / 2);
    const fuseWire = new THREE.Mesh(wireGeo, metalLeadMat.clone());
    group.add(fuseWire);

    assignPin("T1", cap1);
    assignPin("T2", cap2);
    pushExplode(cap1, -0.9, 0, 0);
    pushExplode(cap2, 0.9, 0, 0);
    pushExplode(glassTube, 0, 0.55, 0);
    pushExplode(fuseWire, 0, -0.2, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 13. RELAY SPDT & ELECTROMECHANICAL SWITCHES / ACTUATORS
  // -----------------------------------------------------------------------
  if (pkg === "RELAY_SPDT_BLUE") {
    const relayMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.4 });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.2), relayMat);
    const coilCore = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.75, 20), copperMat.clone());
    coilCore.position.set(-0.35, 0.05, 0);
    const baseSeal = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 1.16), blackEpoxyMat.clone());
    baseSeal.position.y = -0.62;
    group.add(cube, coilCore, baseSeal);

    const pGeo = new THREE.BoxGeometry(0.08, 0.5, 0.06);
    const pinCoords = [
      { name: "COIL1", x: -0.6, z: -0.4 },
      { name: "COIL2", x: -0.6, z: 0.4 },
      { name: "COM", x: 0.6, z: 0 },
      { name: "NC", x: 0.2, z: -0.4 },
      { name: "NO", x: 0.2, z: 0.4 },
    ];
    pinCoords.forEach((pt) => {
      const pm = new THREE.Mesh(pGeo, metalLeadMat.clone());
      pm.position.set(pt.x, -0.88, pt.z);
      group.add(pm);
      assignPin(pt.name, pm);
      pushExplode(pm, 0, -0.6, 0);
    });
    pushExplode(cube, 0, 0.8, 0);
    pushExplode(coilCore, 0, 0.25, 0);
    return;
  }

  if (pkg === "SWITCH_SLIDE") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 0.8), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 }));
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.85), nickelTabMat.clone());
    bezel.position.y = 0.45;
    const bushing = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.45, 20), nickelTabMat.clone());
    bushing.position.y = 0.7;
    const bat = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.9, 16), nickelTabMat.clone());
    bat.position.set(0.14, 1.2, 0);
    bat.rotation.z = -0.26;
    group.add(body, bezel, bushing, bat);

    const lugGeo = new THREE.BoxGeometry(0.08, 0.55, 0.18);
    const p1 = new THREE.Mesh(lugGeo, brassMat.clone());
    p1.position.set(-0.36, -0.68, 0);
    const p2 = new THREE.Mesh(lugGeo, brassMat.clone());
    p2.position.set(0, -0.68, 0);
    const p3 = new THREE.Mesh(lugGeo, brassMat.clone());
    p3.position.set(0.36, -0.68, 0);
    group.add(p1, p2, p3);

    assignPin(def.terminals[0]?.name || "T1", p1);
    assignPin(def.terminals[1]?.name || "COM", p2);
    assignPin(def.terminals[2]?.name || "T2", p3);
    pushExplode(bat, 0.2, 0.9, 0);
    pushExplode(bushing, 0, 0.65, 0);
    pushExplode(bezel, 0, 0.4, 0);
    pushExplode(p1, -0.2, -0.55, 0);
    pushExplode(p2, 0, -0.55, 0);
    pushExplode(p3, 0.2, -0.55, 0);
    return;
  }

  if (pkg === "PUSH_BUTTON_6MM") {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 1.0), blackEpoxyMat.clone());
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.1, 1.06), nickelTabMat.clone());
    plate.position.y = 0.28;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.36, 24), blackEpoxyMat.clone());
    cap.position.y = 0.5;
    group.add(base, plate, cap);

    const legGeo = new THREE.BoxGeometry(0.1, 0.55, 0.08);
    const coords = [
      { key: def.terminals[0]?.name || "A1", x: -0.54, z: 0.32 },
      { key: def.terminals[1]?.name || "A2", x: -0.54, z: -0.32 },
      { key: def.terminals[2]?.name || "B1", x: 0.54, z: 0.32 },
      { key: def.terminals[3]?.name || "B2", x: 0.54, z: -0.32 },
    ];
    coords.forEach((c) => {
      const m = new THREE.Mesh(legGeo, brassMat.clone());
      m.position.set(c.x, -0.45, c.z);
      group.add(m);
      assignPin(c.key, m);
      pushExplode(m, c.x * 0.45, -0.5, c.z * 0.45);
    });
    pushExplode(cap, 0, 0.85, 0);
    pushExplode(plate, 0, 0.45, 0);
    return;
  }

  if (pkg === "DC_MOTOR_CAN") {
    const canGeo = new THREE.CylinderGeometry(0.75, 0.75, 1.65, 28);
    canGeo.rotateZ(Math.PI / 2);
    const can = new THREE.Mesh(canGeo, nickelTabMat.clone());

    const endBellGeo = new THREE.CylinderGeometry(0.74, 0.72, 0.32, 28);
    endBellGeo.rotateZ(Math.PI / 2);
    const endBell = new THREE.Mesh(endBellGeo, new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.5 }));
    endBell.position.x = -0.95;

    const bearingGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 20);
    bearingGeo.rotateZ(Math.PI / 2);
    const bearing = new THREE.Mesh(bearingGeo, nickelTabMat.clone());
    bearing.position.x = 0.88;

    const shaftGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.85, 16);
    shaftGeo.rotateZ(Math.PI / 2);
    const shaft = new THREE.Mesh(shaftGeo, brassMat.clone());
    shaft.position.x = 1.35;

    const tabGeo = new THREE.BoxGeometry(0.28, 0.08, 0.14);
    const posTab = new THREE.Mesh(tabGeo, copperMat.clone());
    posTab.position.set(-1.2, 0.25, 0.28);
    const negTab = new THREE.Mesh(tabGeo, copperMat.clone());
    negTab.position.set(-1.2, -0.25, -0.28);

    group.add(can, endBell, bearing, shaft, posTab, negTab);
    assignPin("POS", posTab);
    assignPin("NEG", negTab);
    pushExplode(endBell, -0.7, 0, 0);
    pushExplode(shaft, 0.9, 0, 0);
    pushExplode(bearing, 0.45, 0, 0);
    pushExplode(posTab, -1.0, 0.2, 0.2);
    pushExplode(negTab, -1.0, -0.2, -0.2);
    return;
  }

  if (pkg === "SERVO_SG90") {
    const servoBlue = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: isSoftwareGl ? 0.65 : 0.88,
      roughness: 0.25,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.3, 0.78), servoBlue);
    const ears = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 0.76), servoBlue);
    ears.position.y = 0.3;
    const gearBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.32, 24), servoBlue);
    gearBoss.position.set(0.38, 0.78, 0);
    const spline = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.22, 16),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    spline.position.set(0.38, 1.0, 0);

    const horn = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.1, 0.22),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    horn.position.set(0.58, 1.12, 0);

    const wireColors = [0x78350f, 0xdc2626, 0xf97316];
    const wireNames = ["GND", "VCC", "PWM"];
    group.add(body, ears, gearBoss, spline, horn);
    wireNames.forEach((wName, i) => {
      const wMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.9, 12),
        new THREE.MeshStandardMaterial({ color: wireColors[i], roughness: 0.5 })
      );
      wMesh.rotation.z = Math.PI / 2;
      wMesh.position.set(-1.15, -0.45 + i * 0.14, 0);
      group.add(wMesh);
      assignPin(wName, wMesh);
      pushExplode(wMesh, -0.7, 0, 0);
    });
    pushExplode(horn, 0, 1.0, 0);
    pushExplode(spline, 0, 0.7, 0);
    pushExplode(gearBoss, 0, 0.4, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // 14. PIEZO BUZZER
  // -----------------------------------------------------------------------
  if (pkg === "PIEZO_BUZZER") {
    const bMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.6, 32), blackEpoxyMat);
    const piezoDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.06, 28), brassMat.clone());
    piezoDisc.position.y = 0.05;
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24),
      new THREE.MeshBasicMaterial({ color: 0x020617 })
    );
    hole.position.y = 0.31;
    group.add(bMesh, piezoDisc, hole);

    const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 12), metalLeadMat.clone());
    l1.position.set(-0.3, -0.65, 0);
    const l2 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.8, 12), metalLeadMat.clone());
    l2.position.set(0.3, -0.65, 0);
    group.add(l1, l2);

    assignPin("POS", l1);
    assignPin("NEG", l2);
    pushExplode(hole, 0, 0.7, 0);
    pushExplode(piezoDisc, 0, 0.4, 0);
    pushExplode(l1, -0.25, -0.7, 0);
    pushExplode(l2, 0.25, -0.7, 0);
    return;
  }

  // -----------------------------------------------------------------------
  // DEFAULT / GENERIC COMPOSITE MODULE FALLBACK
  // -----------------------------------------------------------------------
  const genericMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.0), blackEpoxyMat);
  const topPlate = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.08, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })
  );
  topPlate.position.y = 0.28;
  group.add(genericMesh, topPlate);
  pushExplode(topPlate, 0, 0.6, 0);

  const count = Math.max(1, def.terminals.length);
  def.terminals.forEach((term, idx) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7, 12), metalLeadMat.clone());
    const x = count === 1 ? 0 : -0.55 + (idx / (count - 1)) * 1.1;
    p.position.set(x, -0.5, 0);
    group.add(p);
    assignPin(term.name, p);
    pushExplode(p, 0, -0.6, 0);
  });
}
