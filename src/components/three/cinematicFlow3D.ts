import * as THREE from "three";

const _upAxis = new THREE.Vector3(0, 1, 0);
const _tmpPos = new THREE.Vector3();
const _tmpTan = new THREE.Vector3();
const _tmpQuat = new THREE.Quaternion();
const _tmpScale = new THREE.Vector3(1, 1, 1);
const _tmpMat4 = new THREE.Matrix4();

export interface FlowingWireOptions {
  radius?: number;
  tubularSegments?: number;
  radialSegments?: number;
  packetCount?: number;
  packetLength?: number;
  packetRadius?: number;
  packetColorHex?: number;
  ferruleColorHex?: number;
  speedMult?: number;
  phaseOffset?: number;
  reverse?: boolean;
  layer?: number;
  userData?: Record<string, unknown>;
}

export interface FlowingWire3DHandle {
  group: THREE.Group;
  curve: THREE.CatmullRomCurve3;
  tubeMesh: THREE.Mesh;
  wireMat: THREE.MeshStandardMaterial;
  packetInstanced: THREE.InstancedMesh;
  packetMat: THREE.MeshBasicMaterial;
  speedMult: number;
  phaseOffset: number;
  reverse: boolean;
  update: (elapsedPhase: number, active: boolean, speedScale?: number, reverseOverride?: boolean) => void;
}

/**
 * Creates a physical jumper cable with metallic pin tips, molded strain-relief ferrules,
 * insulated silicone jacket, and multi-packet directional "3D movie" energy capsules aligned
 * along the spline tangent (zero heap allocations during frame updates).
 */
export function createFlowingWire3D(
  points: THREE.Vector3[],
  colorHex: number,
  options: FlowingWireOptions = {}
): FlowingWire3DHandle {
  const {
    radius = 0.024,
    tubularSegments = 28,
    radialSegments = 8,
    packetCount = 5,
    packetLength = 0.14,
    packetRadius = Math.max(0.036, radius * 1.65),
    packetColorHex,
    ferruleColorHex,
    speedMult = 0.85,
    phaseOffset = 0,
    reverse = false,
    layer,
    userData,
  } = options;

  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);

  const wireMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 0.12,
    roughness: 0.34,
    metalness: 0.1,
  });

  const tubeGeo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  const tubeMesh = new THREE.Mesh(tubeGeo, wireMat);
  tubeMesh.castShadow = true;
  if (layer !== undefined) tubeMesh.layers.set(layer);
  if (userData) Object.assign(tubeMesh.userData, userData);
  group.add(tubeMesh);

  // Molded connector boots + tinned gold pin tips at both ends
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.92,
    roughness: 0.18,
  });
  const bootMat = new THREE.MeshStandardMaterial({
    color: ferruleColorHex ?? 0x0f172a,
    roughness: 0.45,
    metalness: 0.15,
  });

  const endEndpoints: [number, THREE.Vector3, THREE.Vector3][] = [
    [0, points[0], curve.getTangentAt(0, new THREE.Vector3())],
    [1, points[points.length - 1], curve.getTangentAt(1, new THREE.Vector3())],
  ];

  endEndpoints.forEach(([u, pt, tan]) => {
    const dir = u === 0 ? tan : tan.clone().negate();
    const q = new THREE.Quaternion().setFromUnitVectors(_upAxis, dir.normalize());

    const ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.45, radius * 1.55, 0.11, 10),
      bootMat
    );
    ferrule.quaternion.copy(q);
    ferrule.position.copy(pt).addScaledVector(dir, 0.045);
    group.add(ferrule);

    const tip = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.09, 8),
      pinMat
    );
    tip.quaternion.copy(q);
    tip.position.copy(pt).addScaledVector(dir, -0.02);
    group.add(tip);
  });

  // Directional glowing energy capsules aligned cleanly along wire curve tangent
  const pCol =
    packetColorHex ??
    (colorHex === 0x0f172a || colorHex === 0x64748b || colorHex === 0x475569
      ? 0x38bdf8
      : colorHex === 0xef4444
      ? 0xfde047
      : 0x67e8f9);

  const packetGeo = new THREE.CapsuleGeometry(packetRadius, packetLength, 4, 8);
  const packetMat = new THREE.MeshBasicMaterial({
    color: pCol,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const packetInstanced = new THREE.InstancedMesh(packetGeo, packetMat, packetCount);
  packetInstanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  packetInstanced.frustumCulled = false;
  group.add(packetInstanced);

  const update = (
    elapsedPhase: number,
    active: boolean,
    speedScale = 1,
    reverseOverride?: boolean
  ) => {
    packetInstanced.visible = active;
    if (!active) {
      wireMat.emissiveIntensity = 0.06;
      return;
    }

    const rev = reverseOverride ?? reverse;
    const base = elapsedPhase * speedMult * speedScale + phaseOffset;
    const wave = 0.5 + 0.5 * Math.sin(elapsedPhase * Math.PI * 3.2 + phaseOffset * 6.283);
    wireMat.emissiveIntensity = 0.18 + 0.34 * wave;

    for (let i = 0; i < packetCount; i++) {
      let u = (base + i / packetCount) % 1;
      if (u < 0) u += 1;
      if (rev) u = 1 - u;

      curve.getPointAt(u, _tmpPos);
      curve.getTangentAt(u, _tmpTan);
      if (rev) _tmpTan.negate();
      _tmpTan.normalize();

      _tmpQuat.setFromUnitVectors(_upAxis, _tmpTan);
      const pulseS = 0.86 + 0.24 * Math.sin((u + phaseOffset) * Math.PI);
      _tmpScale.set(pulseS, 0.9 + 0.25 * wave, pulseS);
      _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
      packetInstanced.setMatrixAt(i, _tmpMat4);
    }
    packetInstanced.instanceMatrix.needsUpdate = true;
  };

  return {
    group,
    curve,
    tubeMesh,
    wireMat,
    packetInstanced,
    packetMat,
    speedMult,
    phaseOffset,
    reverse,
    update,
  };
}

export interface BenchPowerSupplyHandle {
  group: THREE.Group;
  pos5VLocal: THREE.Vector3;
  pos12VLocal: THREE.Vector3;
  posGndLocal: THREE.Vector3;
  updateReadout: (ch1Text: string, ch2Text: string, active: boolean) => void;
}

/**
 * Physical Laboratory DC Bench Power Supply with OLED meter readout and real binding posts.
 */
export function createBenchPowerSupply3D(
  title = "DC BENCH PSU",
  maxAniso = 4
): BenchPowerSupplyHandle {
  const group = new THREE.Group();

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(1.38, 0.72, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x161f30, roughness: 0.42, metalness: 0.48 })
  );
  chassis.position.y = 0.36;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // Brushed front bezel
  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.32, 0.64, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.35, metalness: 0.25 })
  );
  bezel.position.set(0, 0.36, 0.465);
  group.add(bezel);

  // Live CanvasTexture OLED readout on front face
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.12, 0.36),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  screen.position.set(0, 0.48, 0.502);
  group.add(screen);

  // Three color-coded laboratory banana/binding posts on bottom front row
  const buildPost = (x: number, colorHex: number) => {
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32 })
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(x, 0.18, 0.52);

    const stud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.14, 12),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
    );
    stud.rotation.x = Math.PI / 2;
    stud.position.set(x, 0.18, 0.55);
    group.add(collar, stud);
    return new THREE.Vector3(x, 0.18, 0.61);
  };

  const pos5VLocal = buildPost(-0.36, 0xef4444);
  const posGndLocal = buildPost(0.0, 0x1e293b);
  const pos12VLocal = buildPost(0.36, 0xf59e0b);

  let lastSig = "";
  const updateReadout = (ch1Text: string, ch2Text: string, active: boolean) => {
    const sig = `${ch1Text}|${ch2Text}|${active}`;
    if (sig === lastSig) return;
    lastSig = sig;

    ctx.fillStyle = "#030712";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = active ? "#0284c7" : "#334155";
    ctx.fillRect(0, 0, 512, 54);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 26px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(title.slice(0, 18), 18, 28);

    ctx.fillStyle = active ? "#34d399" : "#94a3b8";
    ctx.textAlign = "right";
    ctx.fillText(active ? "OUT: ON" : "STANDBY", 492, 28);

    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 40px monospace";
    ctx.fillText(ch1Text.slice(0, 19), 20, 118);

    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 36px monospace";
    ctx.fillText(ch2Text.slice(0, 21), 20, 192);
    tex.needsUpdate = true;
  };

  updateReadout("+5.00V  0.14A", "+3.3V REG OK", true);
  return { group, pos5VLocal, pos12VLocal, posGndLocal, updateReadout };
}

export interface ScopeProbeHandle {
  group: THREE.Group;
  cableAttachLocal: THREE.Vector3;
  clipAttachLocal: THREE.Vector3;
}

/**
 * Physical 10x BNC Oscilloscope Probe stylus angled neatly onto a live circuit test node,
 * complete with compensation body & ground alligator clip wire exit.
 */
export function createScopeProbe3D(
  channelColorHex = 0xfacc15,
  scale = 1
): ScopeProbeHandle {
  const group = new THREE.Group();

  const bodyGrp = new THREE.Group();
  bodyGrp.rotation.z = -0.34;
  bodyGrp.rotation.x = 0.2;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.92,
    roughness: 0.16,
  });
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(0.024 * scale, 0.22 * scale, 12),
    metalMat
  );
  tip.rotation.x = Math.PI;
  tip.position.y = 0.11 * scale;

  const sleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052 * scale, 0.036 * scale, 0.68 * scale, 14),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.38 })
  );
  sleeve.position.y = 0.54 * scale;
  sleeve.castShadow = true;

  const ringBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.058 * scale, 0.058 * scale, 0.12 * scale, 16),
    new THREE.MeshStandardMaterial({
      color: channelColorHex,
      emissive: channelColorHex,
      emissiveIntensity: 0.4,
      roughness: 0.25,
    })
  );
  ringBand.position.y = 0.72 * scale;

  const boot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042 * scale, 0.025 * scale, 0.24 * scale, 12),
    new THREE.MeshStandardMaterial({ color: channelColorHex, roughness: 0.4 })
  );
  boot.position.y = 0.96 * scale;

  bodyGrp.add(tip, sleeve, ringBand, boot);
  group.add(bodyGrp);

  const tailLocal = new THREE.Vector3(0, 1.08 * scale, 0).applyEuler(bodyGrp.rotation);
  const clipLocal = new THREE.Vector3(0.06 * scale, 0.45 * scale, 0).applyEuler(bodyGrp.rotation);

  return {
    group,
    cableAttachLocal: tailLocal,
    clipAttachLocal: clipLocal,
  };
}

export interface CompactEsp32Handle {
  group: THREE.Group;
  shieldMat: THREE.MeshStandardMaterial;
  txLed: THREE.MeshStandardMaterial;
  getPinLocalPos: (side: "LEFT" | "RIGHT", index: number) => THREE.Vector3;
}

/**
 * Compact, accurate 30-pin ESP32 DevKit V1 module for use inside Multi-Module 3D Stages
 * (Robotics Bench, Optical VLC Bench, Wireless RF Bench), with true Left/Right gold header pins.
 */
export function createEsp32ModuleCompact3D(
  label = "ESP32 DEVKIT",
  scale = 1,
  maxAniso = 4
): CompactEsp32Handle {
  const group = new THREE.Group();

  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 256, 512);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 240, 496);
  ctx.fillStyle = "#d4af37";
  ctx.fillRect(72, 16, 112, 52);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 20px monospace";
  ctx.textAlign = "center";
  ctx.fillText(label.slice(0, 14), 128, 360);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "14px monospace";
  ctx.fillText("240MHz · 3.3V", 128, 392);

  const pcbTex = new THREE.CanvasTexture(c);
  pcbTex.colorSpace = THREE.SRGBColorSpace;
  pcbTex.anisotropy = maxAniso;

  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(1.15 * scale, 0.08 * scale, 2.25 * scale),
    [
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ map: pcbTex, roughness: 0.45 }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 }),
    ]
  );
  pcb.position.y = 0.04 * scale;
  pcb.castShadow = true;
  pcb.receiveShadow = true;
  group.add(pcb);

  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.9,
    roughness: 0.22,
  });
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.72 * scale, 0.14 * scale, 0.78 * scale),
    shieldMat
  );
  shield.position.set(0, 0.15 * scale, -0.46 * scale);
  shield.castShadow = true;
  group.add(shield);

  const usb = new THREE.Mesh(
    new THREE.BoxGeometry(0.36 * scale, 0.11 * scale, 0.24 * scale),
    shieldMat
  );
  usb.position.set(0, 0.12 * scale, 1.04 * scale);
  group.add(usb);

  const txLed = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.5,
  });
  const ledMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08 * scale, 0.04 * scale, 0.06 * scale),
    txLed
  );
  ledMesh.position.set(0.18 * scale, 0.1 * scale, 0.82 * scale);
  group.add(ledMesh);

  // 15x2 gold pin headers
  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.92,
    roughness: 0.2,
  });
  const pinGeo = new THREE.BoxGeometry(0.032 * scale, 0.18 * scale, 0.032 * scale);
  const instPins = new THREE.InstancedMesh(pinGeo, pinMat, 30);
  const d = new THREE.Object3D();

  for (let i = 0; i < 15; i++) {
    const z = (-0.7 + i * 0.105) * scale;
    d.position.set(-0.48 * scale, 0.12 * scale, z);
    d.updateMatrix();
    instPins.setMatrixAt(i, d.matrix);

    d.position.set(0.48 * scale, 0.12 * scale, z);
    d.updateMatrix();
    instPins.setMatrixAt(15 + i, d.matrix);
  }
  instPins.instanceMatrix.needsUpdate = true;
  group.add(instPins);

  const getPinLocalPos = (side: "LEFT" | "RIGHT", index: number) => {
    const clampedIdx = Math.max(0, Math.min(14, index));
    return new THREE.Vector3(
      (side === "LEFT" ? -0.48 : 0.48) * scale,
      0.2 * scale,
      (-0.7 + clampedIdx * 0.105) * scale
    );
  };

  return { group, shieldMat, txLed, getPinLocalPos };
}

export interface FluidPipeHandle {
  group: THREE.Group;
  update: (elapsedPhase: number, flowing: boolean) => void;
}

/**
 * Translucent fluid/coolant pipe with animated directional water slugs inside.
 */
export function createAnimatedPipeFlow3D(
  points: THREE.Vector3[],
  pipeRadius = 0.055,
  slugCount = 6
): FluidPipeHandle {
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);

  const pipeMesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, pipeRadius, 12, false),
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.36,
      roughness: 0.12,
      clearcoat: 0.9,
      depthWrite: false,
    })
  );
  group.add(pipeMesh);

  const slugGeo = new THREE.CapsuleGeometry(pipeRadius * 0.62, 0.16, 4, 8);
  const slugMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });
  const slugInst = new THREE.InstancedMesh(slugGeo, slugMat, slugCount);
  slugInst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  slugInst.frustumCulled = false;
  group.add(slugInst);

  const update = (elapsedPhase: number, flowing: boolean) => {
    slugInst.visible = flowing;
    if (!flowing) return;
    for (let i = 0; i < slugCount; i++) {
      const u = (elapsedPhase + i / slugCount) % 1;
      curve.getPointAt(u, _tmpPos);
      curve.getTangentAt(u, _tmpTan).normalize();
      _tmpQuat.setFromUnitVectors(_upAxis, _tmpTan);
      _tmpScale.set(1, 1, 1);
      _tmpMat4.compose(_tmpPos, _tmpQuat, _tmpScale);
      slugInst.setMatrixAt(i, _tmpMat4);
    }
    slugInst.instanceMatrix.needsUpdate = true;
  };

  return { group, update };
}
