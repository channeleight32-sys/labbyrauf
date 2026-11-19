import * as THREE from "three";

export interface DiffusedLedHandle {
  group: THREE.Group;
  domeMat: THREE.MeshPhysicalMaterial;
  haloMesh: THREE.Mesh;
  haloMat: THREE.MeshBasicMaterial;
  setIntensity: (level01: number, overrideHex?: string | number) => void;
}

/**
 * 5mm T-1 3/4 Diffused LED composite (collar + dome + cathode lead markings + soft halo)
 */
export function createDiffusedLed3D(
  colorHex: number,
  scale = 1
): DiffusedLedHandle {
  const group = new THREE.Group();
  const leadMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ee,
    metalness: 0.92,
    roughness: 0.18,
  });

  const leadA = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018 * scale, 0.018 * scale, 0.24 * scale, 8),
    leadMat
  );
  leadA.position.set(-0.055 * scale, 0.12 * scale, 0);
  const leadK = leadA.clone();
  leadK.position.set(0.055 * scale, 0.12 * scale, 0);
  group.add(leadA, leadK);

  const collarMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.35,
    metalness: 0.08,
  });
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145 * scale, 0.145 * scale, 0.05 * scale, 18),
    collarMat
  );
  collar.position.y = 0.25 * scale;
  collar.castShadow = true;
  group.add(collar);

  const domeMat = new THREE.MeshPhysicalMaterial({
    color: colorHex,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 0.05,
    roughness: 0.14,
    metalness: 0.0,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.88,
  });

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.18 * scale, 18),
    domeMat
  );
  body.position.y = 0.36 * scale;
  body.castShadow = true;

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.12 * scale, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    domeMat
  );
  cap.position.y = 0.45 * scale;
  group.add(body, cap);

  const haloMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const haloMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.27 * scale, 14, 12),
    haloMat
  );
  haloMesh.position.y = 0.41 * scale;
  haloMesh.visible = false;
  group.add(haloMesh);

  const setIntensity = (level01: number, overrideHex?: string | number) => {
    const v = THREE.MathUtils.clamp(level01, 0, 1);
    if (overrideHex !== undefined) {
      domeMat.color.set(overrideHex);
      domeMat.emissive.set(overrideHex);
      haloMat.color.set(overrideHex);
    }
    domeMat.emissiveIntensity = 0.04 + v * 3.1;
    haloMesh.visible = v > 0.05;
    haloMat.opacity = v * 0.32;
  };

  return { group, domeMat, haloMesh, haloMat, setIntensity };
}

export interface UltrasonicModuleHandle {
  group: THREE.Group;
  waveRings: THREE.Mesh[];
  waveMat: THREE.MeshBasicMaterial;
  setWaveProgress: (phase01: number, maxRangeUnits: number, active: boolean) => void;
}

/**
 * HC-SR04 Ultrasonic Twin-Transducer Module with metal mesh cans, PCB silkscreen, and animated wavefront rings.
 */
export function createUltrasonicHcSr043D(maxAnisotropy = 4): UltrasonicModuleHandle {
  const group = new THREE.Group();

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#0369a1";
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = "#bae6fd";
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, 496, 240);
  ctx.fillStyle = "#e0f2fe";
  ctx.font = "bold 30px monospace";
  ctx.textAlign = "center";
  ctx.fillText("HC-SR04", 256, 232);
  ctx.font = "bold 20px monospace";
  ctx.fillText("T   TRIG ECHO   R", 256, 42);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;

  const pcbMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.45,
    metalness: 0.1,
  });
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.56, 0.08), pcbMat);
  pcb.position.y = 0.34;
  pcb.castShadow = true;
  group.add(pcb);

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    metalness: 0.9,
    roughness: 0.2,
  });
  const darkMeshMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.85,
    metalness: 0.25,
  });

  [-0.31, 0.31].forEach((bx) => {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.24, 24),
      metalMat
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(bx, 0.34, 0.14);
    barrel.castShadow = true;

    const innerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.145, 0.145, 0.02, 20),
      darkMeshMat
    );
    innerMesh.rotation.x = Math.PI / 2;
    innerMesh.position.set(bx, 0.34, 0.255);
    group.add(barrel, innerMesh);
  });

  const crystal = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.09, 0.09),
    metalMat
  );
  crystal.position.set(0, 0.52, 0.06);
  group.add(crystal);

  const pinMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.92,
    roughness: 0.18,
  });
  [-0.18, -0.06, 0.06, 0.18].forEach((px) => {
    const pin = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.16, 0.032), pinMat);
    pin.position.set(px, 0.08, 0);
    group.add(pin);
  });

  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.45,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const waveRings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.2, 24), waveMat);
    ring.position.set(0, 0.34, 0.3);
    ring.visible = false;
    group.add(ring);
    waveRings.push(ring);
  }

  const setWaveProgress = (phase01: number, maxRangeUnits: number, active: boolean) => {
    const span = Math.max(0.5, maxRangeUnits);
    waveRings.forEach((r, idx) => {
      r.visible = active;
      if (!active) return;
      const p = (phase01 + idx * 0.25) % 1;
      r.position.z = 0.28 + p * span;
      const sc = 0.8 + p * 1.8;
      r.scale.set(sc, sc, 1);
    });
    waveMat.opacity = active ? 0.5 : 0;
  };

  return { group, waveRings, waveMat, setWaveProgress };
}

export interface ServoSg90Handle {
  group: THREE.Group;
  hornPivot: THREE.Group;
  setAngleDeg: (deg: number) => void;
}

/**
 * SG90 9g Micro Servo composite with translucent blue gearbox, mounting lugs, spline shaft & sweeping white horn.
 */
export function createSg90Servo3D(): ServoSg90Handle {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    roughness: 0.26,
    metalness: 0.08,
    clearcoat: 0.65,
    transparent: true,
    opacity: 0.88,
  });
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.56, 0.3), bodyMat);
  mainBody.position.y = 0.28;
  mainBody.castShadow = true;
  group.add(mainBody);

  const ears = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.3), bodyMat);
  ears.position.y = 0.41;
  ears.castShadow = true;
  group.add(ears);

  const gearbox = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145, 0.145, 0.14, 20),
    bodyMat
  );
  gearbox.position.set(0.14, 0.6, 0);
  gearbox.castShadow = true;
  group.add(gearbox);

  const splineMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.35,
  });
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.1, 14),
    splineMat
  );
  shaft.position.set(0.14, 0.68, 0);
  group.add(shaft);

  const hornPivot = new THREE.Group();
  hornPivot.position.set(0.14, 0.72, 0);
  const hornHub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.045, 16),
    splineMat
  );
  const hornArm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.036, 0.11), splineMat);
  hornArm.position.x = 0.22;
  hornArm.castShadow = true;

  const tipAccent = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.05, 12),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  tipAccent.position.x = 0.44;
  hornPivot.add(hornHub, hornArm, tipAccent);
  group.add(hornPivot);

  const setAngleDeg = (deg: number) => {
    const clamped = THREE.MathUtils.clamp(deg, 0, 180);
    hornPivot.rotation.y = THREE.MathUtils.degToRad(clamped - 90);
  };

  return { group, hornPivot, setAngleDeg };
}

export interface DcMotorHandle {
  group: THREE.Group;
  wheelPivot: THREE.Group;
  stepSpin: (delta: number, speedNorm: number) => void;
}

/**
 * Yellow/Dark TT Geared DC Motor + Slotted Tachometer Wheel (CW/CCW clearly visible).
 */
export function createDcMotorWheel3D(): DcMotorHandle {
  const group = new THREE.Group();

  const canMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.88,
    roughness: 0.25,
  });
  const motorCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.45, 20),
    canMat
  );
  motorCan.rotation.z = Math.PI / 2;
  motorCan.position.set(-0.22, 0.28, 0);
  motorCan.castShadow = true;

  const gearMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.4,
    metalness: 0.08,
  });
  const gearHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.36), gearMat);
  gearHousing.position.set(0.22, 0.26, 0);
  gearHousing.castShadow = true;

  const wheelPivot = new THREE.Group();
  wheelPivot.position.set(0.22, 0.26, 0.3);

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.85,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    roughness: 0.35,
    metalness: 0.3,
  });
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.3,
  });

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.36, 0.14, 24),
    tireMat
  );
  tire.rotation.x = Math.PI / 2;
  tire.castShadow = true;

  const rim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.15, 20),
    rimMat
  );
  rim.rotation.x = Math.PI / 2;

  const spoke1 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.16), spokeMat);
  const spoke2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.46, 0.16), spokeMat);
  wheelPivot.add(tire, rim, spoke1, spoke2);

  group.add(motorCan, gearHousing, wheelPivot);

  const stepSpin = (delta: number, speedNorm: number) => {
    wheelPivot.rotation.z -= delta * speedNorm * 14;
  };

  return { group, wheelPivot, stepSpin };
}

const EIA_COLOR_HEX = [
  0x18181b, // 0 black
  0x78350f, // 1 brown
  0xdc2626, // 2 red
  0xea580c, // 3 orange
  0xeab308, // 4 yellow
  0x16a34a, // 5 green
  0x2563eb, // 6 blue
  0x9333ea, // 7 violet
  0x64748b, // 8 grey
  0xf8fafc, // 9 white
];

function getResistorBandColors(ohms: number): [number, number, number, number] {
  const safe = Math.max(1, ohms);
  const exp = Math.floor(Math.log10(safe));
  const scaled = Math.round(safe / Math.pow(10, exp - 1));
  const d1 = Math.min(9, Math.max(0, Math.floor(scaled / 10)));
  const d2 = Math.min(9, Math.max(0, scaled % 10));
  const mult = Math.min(9, Math.max(0, exp - 1));
  return [
    EIA_COLOR_HEX[d1] ?? 0x78350f,
    EIA_COLOR_HEX[d2] ?? 0x18181b,
    EIA_COLOR_HEX[mult] ?? 0xdc2626,
    0xd4af37, // gold 5% tolerance
  ];
}

export interface Resistor3DHandle {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  setThermalLevel: (norm01: number) => void;
}

/**
 * Axial 1/4W Carbon Film Resistor with authentic EIA 4-band color rings & bent leads.
 */
export function createResistor3D(ohms = 220, scale = 1): Resistor3DHandle {
  const group = new THREE.Group();
  const leadMat = new THREE.MeshStandardMaterial({
    color: 0xdbe3ee,
    metalness: 0.9,
    roughness: 0.2,
  });
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xdcb884,
    emissive: 0xf97316,
    emissiveIntensity: 0,
    roughness: 0.42,
    metalness: 0.05,
  });

  // Axial wire lead + two vertical legs
  const topWire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016 * scale, 0.016 * scale, 0.72 * scale, 8),
    leadMat
  );
  topWire.rotation.z = Math.PI / 2;
  topWire.position.y = 0.18 * scale;

  const legL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016 * scale, 0.016 * scale, 0.19 * scale, 8),
    leadMat
  );
  legL.position.set(-0.35 * scale, 0.095 * scale, 0);
  const legR = legL.clone();
  legR.position.x = 0.35 * scale;

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065 * scale, 0.065 * scale, 0.36 * scale, 16),
    bodyMat
  );
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.18 * scale;
  body.castShadow = true;

  // End caps slightly bulbous
  [-0.16 * scale, 0.16 * scale].forEach((cx) => {
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072 * scale, 0.072 * scale, 0.07 * scale, 16),
      bodyMat
    );
    cap.rotation.z = Math.PI / 2;
    cap.position.set(cx, 0.18 * scale, 0);
    group.add(cap);
  });

  // 4 EIA Color Bands
  const bands = getResistorBandColors(ohms);
  const bandX = [-0.1, -0.035, 0.035, 0.11];
  bands.forEach((hex, idx) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.069 * scale, 0.069 * scale, 0.032 * scale, 16),
      new THREE.MeshStandardMaterial({ color: hex, roughness: 0.3, metalness: idx === 3 ? 0.7 : 0.05 })
    );
    ring.rotation.z = Math.PI / 2;
    ring.position.set(bandX[idx] * scale, 0.18 * scale, 0);
    group.add(ring);
  });

  group.add(topWire, legL, legR, body);

  const setThermalLevel = (norm01: number) => {
    const n = THREE.MathUtils.clamp(norm01, 0, 1);
    bodyMat.emissiveIntensity = n > 0.15 ? n * 1.4 : 0;
  };

  return { group, bodyMat, setThermalLevel };
}

export interface Capacitor3DHandle {
  group: THREE.Group;
  sleeveMat: THREE.MeshStandardMaterial;
  setChargeLevel: (norm01: number) => void;
}

/**
 * Radial Electrolytic Capacitor with polarity stripe & scored aluminum top vent.
 */
export function createCapacitorElectrolytic3D(scale = 1): Capacitor3DHandle {
  const group = new THREE.Group();
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ee, metalness: 0.9, roughness: 0.18 });

  const leadA = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.2 * scale, 8),
    leadMat
  );
  leadA.position.set(-0.055 * scale, 0.1 * scale, 0);
  const leadK = leadA.clone();
  leadK.position.set(0.055 * scale, 0.1 * scale, 0);

  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x0f2e5e,
    emissive: 0x22d3ee,
    emissiveIntensity: 0,
    roughness: 0.32,
    metalness: 0.25,
  });
  const can = new THREE.Mesh(
    new THREE.CylinderGeometry(0.145 * scale, 0.145 * scale, 0.38 * scale, 22),
    sleeveMat
  );
  can.position.y = 0.36 * scale;
  can.castShadow = true;

  const topMetal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132 * scale, 0.132 * scale, 0.02 * scale, 20),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.22 })
  );
  topMetal.position.y = 0.555 * scale;

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.04 * scale, 0.34 * scale, 0.03 * scale),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
  );
  stripe.position.set(0.132 * scale, 0.36 * scale, 0);

  group.add(leadA, leadK, can, topMetal, stripe);

  const setChargeLevel = (norm01: number) => {
    sleeveMat.emissiveIntensity = THREE.MathUtils.clamp(norm01, 0, 1) * 0.9;
  };

  return { group, sleeveMat, setChargeLevel };
}

export interface Inductor3DHandle {
  group: THREE.Group;
  fluxRingMat: THREE.MeshBasicMaterial;
  fluxRing: THREE.Mesh;
  setFluxLevel: (norm01: number) => void;
}

/**
 * Copper-Wound Toroidal Power Inductor with animated magnetic flux halo.
 */
export function createInductorToroid3D(scale = 1): Inductor3DHandle {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.TorusGeometry(0.16 * scale, 0.065 * scale, 14, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.35 })
  );
  core.position.y = 0.25 * scale;
  core.castShadow = true;

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.88,
    roughness: 0.22,
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const turn = new THREE.Mesh(
      new THREE.TorusGeometry(0.074 * scale, 0.015 * scale, 8, 14),
      copperMat
    );
    turn.position.set(Math.cos(a) * 0.16 * scale, 0.25 * scale + Math.sin(a) * 0.16 * scale, 0);
    turn.rotation.z = a;
    turn.rotation.y = Math.PI / 2;
    group.add(turn);
  }

  const fluxRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fluxRing = new THREE.Mesh(
    new THREE.RingGeometry(0.24 * scale, 0.29 * scale, 24),
    fluxRingMat
  );
  fluxRing.position.y = 0.25 * scale;
  fluxRing.visible = false;

  group.add(core, fluxRing);

  const setFluxLevel = (norm01: number) => {
    const n = THREE.MathUtils.clamp(norm01, 0, 1);
    fluxRing.visible = n > 0.08;
    fluxRingMat.opacity = n * 0.65;
  };

  return { group, fluxRingMat, fluxRing, setFluxLevel };
}

/**
 * TO-220 Power Transistor / Voltage Regulator (BJT / MOSFET / LM7805).
 */
export function createTransistorTo2203D(scale = 1, activeAccentHex = 0x22d3ee): THREE.Group {
  const group = new THREE.Group();
  const leadMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.18 });
  [-0.085 * scale, 0, 0.085 * scale].forEach((lx) => {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.026 * scale, 0.22 * scale, 0.02 * scale),
      leadMat
    );
    leg.position.set(lx, 0.11 * scale, 0);
    group.add(leg);
  });

  const epoxy = new THREE.Mesh(
    new THREE.BoxGeometry(0.32 * scale, 0.28 * scale, 0.14 * scale),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: activeAccentHex,
      emissiveIntensity: 0.08,
      roughness: 0.4,
    })
  );
  epoxy.position.y = 0.34 * scale;
  epoxy.castShadow = true;

  const heatsink = new THREE.Mesh(
    new THREE.BoxGeometry(0.32 * scale, 0.2 * scale, 0.045 * scale),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.9, roughness: 0.25 })
  );
  heatsink.position.set(0, 0.56 * scale, -0.045 * scale);
  heatsink.castShadow = true;

  group.add(epoxy, heatsink);
  return group;
}

/**
 * DIP Integrated Circuit (NE555, LM741, 74LSxx Logic Gate IC) with silkscreen label & Pin-1 notch.
 */
export function createDipIc3D(
  pinsCount = 8,
  label = "NE555P",
  scale = 1,
  maxAniso = 4
): THREE.Group {
  const group = new THREE.Group();
  const halfPins = Math.max(4, Math.floor(pinsCount / 2));
  const length = Math.max(0.45, halfPins * 0.125) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#181d29";
  ctx.fillRect(0, 0, 256, 128);
  ctx.fillStyle = "#334155";
  ctx.beginPath();
  ctx.arc(0, 64, 18, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(32, 98, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "bold 30px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label.slice(0, 10), 135, 64);

  const topTex = new THREE.CanvasTexture(canvas);
  topTex.colorSpace = THREE.SRGBColorSpace;
  topTex.anisotropy = maxAniso;

  const sideMat = new THREE.MeshStandardMaterial({ color: 0x161b26, roughness: 0.45 });
  const topMat = new THREE.MeshStandardMaterial({ map: topTex, roughness: 0.38 });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.14 * scale, 0.34 * scale),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
  );
  body.position.y = 0.2 * scale;
  body.castShadow = true;
  group.add(body);

  const pinMat = new THREE.MeshStandardMaterial({ color: 0xdbe3ee, metalness: 0.9, roughness: 0.18 });
  for (let i = 0; i < halfPins; i++) {
    const px = (-length / 2 + 0.08 * scale) + i * ((length - 0.16 * scale) / Math.max(1, halfPins - 1));
    [-0.19 * scale, 0.19 * scale].forEach((pz) => {
      const pin = new THREE.Mesh(
        new THREE.BoxGeometry(0.03 * scale, 0.2 * scale, 0.025 * scale),
        pinMat
      );
      pin.position.set(px, 0.1 * scale, pz);
      group.add(pin);
    });
  }

  return group;
}

export interface SevenSeg3DHandle {
  group: THREE.Group;
  setSegments: (segmentsOn: boolean[]) => void;
}

/**
 * Common-Cathode 7-Segment LED Display Module (a,b,c,d,e,f,g).
 */
export function createSevenSegment3D(activeColorHex = 0xef4444, scale = 1): SevenSeg3DHandle {
  const group = new THREE.Group();
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(0.56 * scale, 0.14 * scale, 0.78 * scale),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 })
  );
  face.position.y = 0.14 * scale;
  face.castShadow = true;
  group.add(face);

  // Segment positions [x, z, rotY] for a, b, c, d, e, f, g
  const segLayout: [number, number, number][] = [
    [0, -0.24, 0], // a
    [0.14, -0.12, Math.PI / 2], // b
    [0.14, 0.12, Math.PI / 2], // c
    [0, 0.24, 0], // d
    [-0.14, 0.12, Math.PI / 2], // e
    [-0.14, -0.12, Math.PI / 2], // f
    [0, 0, 0], // g
  ];

  const segMats: THREE.MeshStandardMaterial[] = [];
  segLayout.forEach(([sx, sz, rot]) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: activeColorHex,
      emissiveIntensity: 0.04,
      roughness: 0.25,
    });
    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(0.22 * scale, 0.025 * scale, 0.055 * scale),
      mat
    );
    seg.position.set(sx * scale, 0.215 * scale, sz * scale);
    seg.rotation.y = rot;
    group.add(seg);
    segMats.push(mat);
  });

  const setSegments = (segmentsOn: boolean[]) => {
    segMats.forEach((m, idx) => {
      const on = Boolean(segmentsOn[idx]);
      m.color.setHex(on ? activeColorHex : 0x334155);
      m.emissiveIntensity = on ? 2.6 : 0.03;
    });
  };

  return { group, setSegments };
}

export interface OledDisplayHandle {
  group: THREE.Group;
  updateScreen: (header: string, lines: string[], accentHex?: string) => void;
}

/**
 * 0.96" SSD1306 I2C OLED Display with live updating CanvasTexture telemetry.
 */
export function createOledDisplay3D(maxAniso = 4): OledDisplayHandle {
  const group = new THREE.Group();

  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.08, 0.92),
    new THREE.MeshStandardMaterial({ color: 0x0c4a6e, roughness: 0.45 })
  );
  pcb.position.y = 0.04;
  pcb.castShadow = true;

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const screenTex = new THREE.CanvasTexture(canvas);
  screenTex.colorSpace = THREE.SRGBColorSpace;
  screenTex.anisotropy = maxAniso;

  const bezel = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.05, 0.62),
    new THREE.MeshStandardMaterial({ color: 0x050810, roughness: 0.25 })
  );
  bezel.position.set(0, 0.095, 0.04);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.52),
    new THREE.MeshBasicMaterial({ map: screenTex })
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.set(0, 0.123, 0.04);

  // 4 top gold pins VCC GND SCL SDA
  const pinMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 });
  [-0.18, -0.06, 0.06, 0.18].forEach((px) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.14, 0.035), pinMat);
    p.position.set(px, 0.1, -0.36);
    group.add(p);
  });

  group.add(pcb, bezel, glass);

  let lastSig = "";
  const updateScreen = (header: string, lines: string[], accentHex = "#22d3ee") => {
    const sig = `${header}|${lines.join("|")}|${accentHex}`;
    if (sig === lastSig) return;
    lastSig = sig;

    ctx.fillStyle = "#040814";
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = accentHex;
    ctx.fillRect(0, 0, 512, 54);
    ctx.fillStyle = "#020617";
    ctx.font = "bold 28px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(header.slice(0, 24), 18, 28);

    ctx.fillStyle = "#e0f2fe";
    ctx.font = "bold 26px monospace";
    lines.slice(0, 4).forEach((ln, idx) => {
      ctx.fillText(ln.slice(0, 28), 18, 92 + idx * 42);
    });
    screenTex.needsUpdate = true;
  };

  updateScreen("SSD1306 128x64", ["OLED Ready", "I2C: 0x3C"]);
  return { group, updateScreen };
}

export interface RelayModuleHandle {
  group: THREE.Group;
  setActive: (on: boolean) => void;
}

/**
 * 5V Single-Channel Songle Relay Module with blue cube, terminal block & live status LED.
 */
export function createRelayModule3D(label = "5V RELAY", maxAniso = 4): RelayModuleHandle {
  const group = new THREE.Group();
  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.08, 1.15),
    new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.45 })
  );
  pcb.position.y = 0.04;
  pcb.castShadow = true;

  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px monospace";
  ctx.textAlign = "center";
  ctx.fillText("SRD-05VDC", 128, 108);
  ctx.font = "bold 22px monospace";
  ctx.fillText(label, 128, 152);
  ctx.fillText("10A 250VAC", 128, 192);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  const cubeMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35 });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.46, 0.62), cubeMat);
  cube.position.set(0, 0.31, -0.05);
  cube.castShadow = true;

  const greenBlock = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.24, 0.24),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.4 })
  );
  greenBlock.position.set(0, 0.2, 0.42);

  const led = createDiffusedLed3D(0x10b981, 0.85);
  led.group.position.set(0.28, 0.08, -0.42);

  group.add(pcb, cube, greenBlock, led.group);

  const setActive = (on: boolean) => {
    led.setIntensity(on ? 1 : 0);
  };

  return { group, setActive };
}

export interface Potentiometer3DHandle {
  group: THREE.Group;
  knobPivot: THREE.Group;
  setRatio: (ratio01: number) => void;
}

/**
 * Rotary Panel Potentiometer with rotatable wiper dial.
 */
export function createPotentiometer3D(scale = 1): Potentiometer3DHandle {
  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.55 * scale, 0.26 * scale, 0.55 * scale),
    new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 })
  );
  base.position.y = 0.16 * scale;
  base.castShadow = true;

  const knobPivot = new THREE.Group();
  knobPivot.position.y = 0.36 * scale;

  const knob = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17 * scale, 0.17 * scale, 0.16 * scale, 18),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.25 })
  );
  const pointer = new THREE.Mesh(
    new THREE.BoxGeometry(0.04 * scale, 0.17 * scale, 0.12 * scale),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  pointer.position.z = -0.07 * scale;
  knobPivot.add(knob, pointer);

  group.add(base, knobPivot);

  const setRatio = (ratio01: number) => {
    const r = THREE.MathUtils.clamp(ratio01, 0, 1);
    knobPivot.rotation.y = (0.5 - r) * Math.PI * 1.5;
  };

  return { group, knobPivot, setRatio };
}

/**
 * Tactile 4-pin Push Button with depressible plunger cap.
 */
export function createTactileButton3D(capHex = 0x06b6d4, scale = 1) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.46 * scale, 0.16 * scale, 0.46 * scale),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45 })
  );
  body.position.y = 0.1 * scale;
  body.castShadow = true;

  const capMat = new THREE.MeshStandardMaterial({
    color: capHex,
    emissive: capHex,
    emissiveIntensity: 0.1,
    roughness: 0.3,
  });
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.12 * scale, 16),
    capMat
  );
  cap.position.y = 0.22 * scale;
  group.add(body, cap);

  const setPressed = (pressed: boolean) => {
    cap.position.y = (pressed ? 0.17 : 0.22) * scale;
    capMat.emissiveIntensity = pressed ? 0.9 : 0.1;
  };

  return { group, cap, setPressed };
}

export interface KeypadKeyEntry {
  key: string;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  restY: number;
}

/**
 * Crisp 4x4 Matrix Keypad with CanvasTexture keycaps and individual raycastable key meshes.
 */
export function createKeypad4x43D(maxAniso = 4): {
  group: THREE.Group;
  keys: KeypadKeyEntry[];
} {
  const group = new THREE.Group();
  const labels = ["1", "2", "3", "A", "4", "5", "6", "B", "7", "8", "9", "C", "*", "0", "#", "D"];

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.08, 1.32),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.45 })
  );
  board.position.y = 0.04;
  board.castShadow = true;
  group.add(board);

  const keys: KeypadKeyEntry[] = [];
  labels.forEach((k, idx) => {
    const row = Math.floor(idx / 4);
    const col = idx % 4;
    const isHash = k === "#";
    const isStar = k === "*";
    const isLetter = k === "A" || k === "B" || k === "C" || k === "D";

    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = isHash ? "#059669" : isStar ? "#d97706" : isLetter ? "#0284c7" : "#1e293b";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 120, 120);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 64px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(k, 64, 66);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.3,
      emissive: 0x22d3ee,
      emissiveIntensity: 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.075, 0.22), mat);
    mesh.position.set(-0.375 + col * 0.25, 0.115, -0.43 + row * 0.27);
    mesh.castShadow = true;
    group.add(mesh);
    keys.push({ key: k, mesh, mat, restY: 0.115 });
  });

  return { group, keys };
}

/**
 * Photovoltaic Monocrystalline Solar Panel with busbars & cell grid CanvasTexture.
 */
export function createSolarPanel3D(maxAniso = 4): THREE.Group {
  const group = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = canvas2d(c);
  ctx.fillStyle = "#0f2d6b";
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, 500, 500);
  // 4x6 Silicon cell grid
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  for (let x = 1; x < 4; x++) {
    ctx.beginPath();
    ctx.moveTo(x * 128, 12);
    ctx.lineTo(x * 128, 500);
    ctx.stroke();
  }
  for (let y = 1; y < 6; y++) {
    ctx.beginPath();
    ctx.moveTo(12, y * 85);
    ctx.lineTo(500, y * 85);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.06, 1.56),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 })
  );
  const cells = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 1.46),
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.15, metalness: 0.3, clearcoat: 1.0 })
  );
  cells.rotation.x = -Math.PI / 2;
  cells.position.y = 0.032;
  group.add(frame, cells);
  return group;
}

function canvas2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext("2d")!;
}

/**
 * Solderless Mini Breadboard Deck (authentic white ABS with red/blue power rails & tie-point grid).
 */
export function createMiniBreadboard3D(
  width = 1.65,
  depth = 3.8,
  maxAniso = 4
): THREE.Group {
  const group = new THREE.Group();
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 1024;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, 0, 512, 1024);

  // Power rails +/-
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(36, 32, 6, 960);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(72, 32, 6, 960);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(434, 32, 6, 960);
  ctx.fillStyle = "#2563eb";
  ctx.fillRect(470, 32, 6, 960);

  // Center DIP trough
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(246, 20, 20, 984);

  // Tie-point hole matrix
  ctx.fillStyle = "#0f172a";
  const rowsY = 30;
  for (let r = 0; r < rowsY; r++) {
    const y = 52 + r * 32;
    // Power rails holes
    if (r % 5 !== 4) {
      ctx.fillRect(48, y - 4, 8, 8);
      ctx.fillRect(84, y - 4, 8, 8);
      ctx.fillRect(416, y - 4, 8, 8);
      ctx.fillRect(452, y - 4, 8, 8);
    }
    // Terminal A-E and F-J holes
    for (let col = 0; col < 5; col++) {
      ctx.fillRect(118 + col * 24, y - 4, 9, 9);
      ctx.fillRect(282 + col * 24, y - 4, 9, 9);
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;

  const sideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const topMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38 });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.16, depth),
    [sideMat, sideMat, topMat, sideMat, sideMat, sideMat]
  );
  body.position.y = 0.08;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  return group;
}
