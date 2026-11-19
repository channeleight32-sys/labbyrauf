import { runAnalogMNA, type MnaComponent } from "./circuitLabAnalogSolver";

export type BreadboardWireColor =
  | "#ef4444"
  | "#0f172a"
  | "#eab308"
  | "#3b82f6"
  | "#22c55e"
  | "#f97316"
  | "#ffffff";

export interface BreadboardHoleId {
  type: "RAIL" | "TERMINAL";
  rail?: "TOP_POS" | "TOP_NEG" | "BOT_POS" | "BOT_NEG";
  col: number; // 1..63
  row?: "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J";
}

export interface BreadboardWire {
  id: string;
  from: BreadboardHoleId;
  to: BreadboardHoleId;
  color: BreadboardWireColor;
}

export type BbCompType =
  | "RESISTOR"
  | "INDUCTOR"
  | "LED_RED"
  | "LED_GREEN"
  | "LED_BLUE"
  | "DIODE_1N4007"
  | "DIODE_ZENER"
  | "DIODE_1N5819"
  | "CAP_CERAMIC"
  | "CAP_ELECTROLYTIC"
  | "BJT_BC547"
  | "BJT_BC557"
  | "TRANSISTOR_2N2222"
  | "MOSFET_IRF540N"
  | "IC_LM7805"
  | "IC_NE555"
  | "IC_LM741"
  | "IC_74LS00"
  | "IC_74LS04"
  | "IC_74LS08"
  | "IC_74LS32"
  | "IC_74LS02"
  | "IC_74LS86"
  | "IC_74LS74"
  | "IC_74LS76"
  | "SEVEN_SEG"
  | "PUSH_BUTTON"
  | "SWITCH_SPST"
  | "POTENTIOMETER"
  | "BUZZER"
  | "LDR";

export interface BreadboardComponentItem {
  id: string;
  type: BbCompType;
  label: string;
  value: number;
  formattedValue: string;
  wiperPct?: number;
  pins: Record<string, BreadboardHoleId>;
}

export type BreadboardPmeType =
  | "VOLTMETER"
  | "AMMETER"
  | "OHMMETER"
  | "POWER_METER"
  | "LOGIC_PROBE";

export interface InstalledBreadboardPme {
  id: string;
  type: BreadboardPmeType;
  label: string;
  probePosHole: BreadboardHoleId;
  probeNegHole?: BreadboardHoleId;
  targetCompId?: string;
}

// Canonical 2D SVG ViewBox Constants (1260 x 420)
export const SVG_PITCH_X = 18;
export const SVG_PITCH_Y = 18;
export const SVG_START_X = 60;
export const SVG_RAIL_TOP_POS_Y = 32;
export const SVG_RAIL_TOP_NEG_Y = 54;
export const SVG_TERMINAL_A_Y = 96;
export const SVG_TROUGH_Y = 194;
export const SVG_TERMINAL_F_Y = 222;
export const SVG_RAIL_BOT_POS_Y = 360;
export const SVG_RAIL_BOT_NEG_Y = 382;

// Canonical 3D World Space Constants (830 Tie-Point Breadboard Deck)
export const WORLD_COL_PITCH = 0.31;
export const WORLD_ROW_PITCH = 0.31;
export const WORLD_BOARD_W = 21.4;
export const WORLD_BOARD_D = 7.4;
export const WORLD_BOARD_H = 0.72;
export const WORLD_BOARD_TOP_Y = WORLD_BOARD_H;
export const WORLD_Z_TOP_POS_RAIL = -2.92;
export const WORLD_Z_TOP_NEG_RAIL = -2.42;
export const WORLD_Z_ROW_A = -1.62;
export const WORLD_Z_ROW_F = 0.38;
export const WORLD_Z_BOT_POS_RAIL = 2.42;
export const WORLD_Z_BOT_NEG_RAIL = 2.92;
export const WORLD_START_COL_X = -((63 - 1) * WORLD_COL_PITCH) / 2;

const UPPER_ROWS = ["A", "B", "C", "D", "E"] as const;
const LOWER_ROWS = ["F", "G", "H", "I", "J"] as const;

export function holeToSvgXY(h: BreadboardHoleId): { x: number; y: number } {
  const col = Math.max(1, Math.min(63, h.col || 1));
  const x = SVG_START_X + (col - 1) * SVG_PITCH_X;
  if (h.type === "RAIL") {
    if (h.rail === "TOP_POS") return { x, y: SVG_RAIL_TOP_POS_Y };
    if (h.rail === "TOP_NEG") return { x, y: SVG_RAIL_TOP_NEG_Y };
    if (h.rail === "BOT_POS") return { x, y: SVG_RAIL_BOT_POS_Y };
    return { x, y: SVG_RAIL_BOT_NEG_Y };
  }
  const topIdx = UPPER_ROWS.indexOf((h.row || "A") as (typeof UPPER_ROWS)[number]);
  if (topIdx >= 0) {
    return { x, y: SVG_TERMINAL_A_Y + topIdx * SVG_PITCH_Y };
  }
  const botIdx = Math.max(
    0,
    LOWER_ROWS.indexOf((h.row || "F") as (typeof LOWER_ROWS)[number])
  );
  return { x, y: SVG_TERMINAL_F_Y + botIdx * SVG_PITCH_Y };
}

export function svgXYToNearestHole(sx: number, sy: number): BreadboardHoleId | null {
  const colF = Math.round((sx - SVG_START_X) / SVG_PITCH_X) + 1;
  if (colF < 1 || colF > 63) return null;
  const col = Math.max(1, Math.min(63, colF));
  const xDist = Math.abs(sx - (SVG_START_X + (col - 1) * SVG_PITCH_X));
  if (xDist > SVG_PITCH_X * 0.65) return null;

  const candidates: { y: number; hole: BreadboardHoleId }[] = [
    { y: SVG_RAIL_TOP_POS_Y, hole: { type: "RAIL", rail: "TOP_POS", col } },
    { y: SVG_RAIL_TOP_NEG_Y, hole: { type: "RAIL", rail: "TOP_NEG", col } },
    ...UPPER_ROWS.map((row, idx) => ({
      y: SVG_TERMINAL_A_Y + idx * SVG_PITCH_Y,
      hole: { type: "TERMINAL" as const, row, col },
    })),
    ...LOWER_ROWS.map((row, idx) => ({
      y: SVG_TERMINAL_F_Y + idx * SVG_PITCH_Y,
      hole: { type: "TERMINAL" as const, row, col },
    })),
    { y: SVG_RAIL_BOT_POS_Y, hole: { type: "RAIL", rail: "BOT_POS", col } },
    { y: SVG_RAIL_BOT_NEG_Y, hole: { type: "RAIL", rail: "BOT_NEG", col } },
  ];

  let best: { y: number; hole: BreadboardHoleId } | null = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    const d = Math.abs(sy - cand.y);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  if (!best || bestDist > SVG_PITCH_Y * 0.65) return null;
  return best.hole;
}

export function holeToWorldXZ(h: BreadboardHoleId): { x: number; z: number } {
  const col = Math.max(1, Math.min(63, h.col || 1));
  const x = WORLD_START_COL_X + (col - 1) * WORLD_COL_PITCH;
  if (h.type === "RAIL") {
    if (h.rail === "TOP_POS") return { x, z: WORLD_Z_TOP_POS_RAIL };
    if (h.rail === "TOP_NEG") return { x, z: WORLD_Z_TOP_NEG_RAIL };
    if (h.rail === "BOT_POS") return { x, z: WORLD_Z_BOT_POS_RAIL };
    return { x, z: WORLD_Z_BOT_NEG_RAIL };
  }
  const topIdx = UPPER_ROWS.indexOf((h.row || "A") as (typeof UPPER_ROWS)[number]);
  if (topIdx >= 0) {
    return { x, z: WORLD_Z_ROW_A + topIdx * WORLD_ROW_PITCH };
  }
  const botIdx = Math.max(
    0,
    LOWER_ROWS.indexOf((h.row || "F") as (typeof LOWER_ROWS)[number])
  );
  return { x, z: WORLD_Z_ROW_F + botIdx * WORLD_ROW_PITCH };
}

export function worldXZToNearestHole(wx: number, wz: number): BreadboardHoleId | null {
  const colF = Math.round((wx - WORLD_START_COL_X) / WORLD_COL_PITCH) + 1;
  if (colF < 1 || colF > 63) return null;
  const col = Math.max(1, Math.min(63, colF));
  const xDist = Math.abs(wx - (WORLD_START_COL_X + (col - 1) * WORLD_COL_PITCH));
  if (xDist > WORLD_COL_PITCH * 0.58) return null;

  const candidates: { z: number; hole: BreadboardHoleId }[] = [
    { z: WORLD_Z_TOP_POS_RAIL, hole: { type: "RAIL", rail: "TOP_POS", col } },
    { z: WORLD_Z_TOP_NEG_RAIL, hole: { type: "RAIL", rail: "TOP_NEG", col } },
    ...UPPER_ROWS.map((row, idx) => ({
      z: WORLD_Z_ROW_A + idx * WORLD_ROW_PITCH,
      hole: { type: "TERMINAL" as const, row, col },
    })),
    ...LOWER_ROWS.map((row, idx) => ({
      z: WORLD_Z_ROW_F + idx * WORLD_ROW_PITCH,
      hole: { type: "TERMINAL" as const, row, col },
    })),
    { z: WORLD_Z_BOT_POS_RAIL, hole: { type: "RAIL", rail: "BOT_POS", col } },
    { z: WORLD_Z_BOT_NEG_RAIL, hole: { type: "RAIL", rail: "BOT_NEG", col } },
  ];

  let best: { z: number; hole: BreadboardHoleId } | null = null;
  let bestDist = Infinity;
  for (const cand of candidates) {
    const d = Math.abs(wz - cand.z);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  if (!best || bestDist > WORLD_ROW_PITCH * 0.58) return null;
  return best.hole;
}

export function formatHoleLabel(h: BreadboardHoleId): string {
  if (h.type === "RAIL") {
    return `${h.rail?.replace("_", " ")} · Col ${h.col}`;
  }
  return `Row ${h.row} · Col ${h.col}`;
}

export function formatCompactHole(h: BreadboardHoleId): string {
  if (h.type === "RAIL") {
    const tag =
      h.rail === "TOP_POS"
        ? "+TOP"
        : h.rail === "TOP_NEG"
        ? "-TOP"
        : h.rail === "BOT_POS"
        ? "+BOT"
        : "-BOT";
    return `${tag}:${h.col}`;
  }
  return `${h.row}${h.col}`;
}

/**
 * Physical 830-point breadboard internal bus strip key.
 * Holes sharing a strip key are electrically bonded internally inside the solderless deck.
 */
export function holeToElectricalStripKey(h: BreadboardHoleId): string {
  if (h.type === "RAIL") {
    return h.rail || "TOP_POS";
  }
  const isUpper = (UPPER_ROWS as readonly string[]).includes(h.row || "A");
  return `${isUpper ? "COL_TOP" : "COL_BOT"}_${h.col}`;
}

export interface SpiceNodeConnection {
  compId: string;
  compLabel: string;
  pinName: string;
  hole: BreadboardHoleId;
  holeLabel: string;
  stripKey: string;
  svgXY: { x: number; y: number };
  worldXZ: { x: number; z: number };
}

export interface SpiceNodeMappingEntry {
  spiceNodeName: string;
  rootStripKey: string;
  voltage: number;
  stripKeys: string[];
  coordSummary: string;
  connections: SpiceNodeConnection[];
}

export interface BreadboardSpiceCompileResult {
  vMap: Map<string, number>;
  currentMap: Map<string, number>;
  find: (k: string) => string;
  nodeList: SpiceNodeMappingEntry[];
  stripToSpiceName: Map<string, string>;
}

/**
 * Coordinate-based SPICE Netlist Compiler & MNA Solver Bridge:
 * Translates every component terminal's physical board coordinate (Col, Row/Rail) -> Strip Key ->
 * Disjoint-Set Wire/Bus Net -> Canonical SPICE Node ID (0 GND, VCC, N001...) -> Analog MNA Solution.
 */
export function compileBreadboardSpiceNetlist(
  components: BreadboardComponentItem[],
  wires: BreadboardWire[],
  vSourceVal: number,
  simRunning: boolean
): BreadboardSpiceCompileResult {
  const parent = new Map<string, string>();
  const allStripKeys = new Set<string>(["TOP_POS", "TOP_NEG", "BOT_NEG"]);

  function find(k: string): string {
    if (!parent.has(k)) parent.set(k, k);
    if (parent.get(k) !== k) parent.set(k, find(parent.get(k)!));
    return parent.get(k)!;
  }

  function union(a: string, b: string) {
    allStripKeys.add(a);
    allStripKeys.add(b);
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootA, rootB);
  }

  // Bridge top and bottom ground rails cleanly
  union("TOP_NEG", "BOT_NEG");

  // Merge wire jumper endpoints into shared electrical nodes
  wires.forEach((w) => {
    union(holeToElectricalStripKey(w.from), holeToElectricalStripKey(w.to));
  });

  // Collect all strips touched by component pins
  components.forEach((c) => {
    Object.values(c.pins).forEach((pin) => {
      const sk = holeToElectricalStripKey(pin);
      allStripKeys.add(sk);
      find(sk);
    });
  });

  // Assign canonical SPICE node identifiers to every active root cluster
  const gndRoot = find("TOP_NEG");
  const vccRoot = find("TOP_POS");
  const rootToSpiceName = new Map<string, string>();
  rootToSpiceName.set(gndRoot, "0 (GND)");
  if (vccRoot !== gndRoot) {
    rootToSpiceName.set(vccRoot, "VCC (+V)");
  }

  let nextNodeNum = 1;
  Array.from(allStripKeys)
    .sort()
    .forEach((sk) => {
      const r = find(sk);
      if (!rootToSpiceName.has(r)) {
        rootToSpiceName.set(r, `N${String(nextNodeNum++).padStart(3, "0")}`);
      }
    });

  const stripToSpiceName = new Map<string, string>();
  allStripKeys.forEach((sk) => {
    stripToSpiceName.set(sk, rootToSpiceName.get(find(sk)) || "N000");
  });

  if (!simRunning) {
    const emptyEntries = buildSpiceNodeEntries(
      components,
      allStripKeys,
      find,
      rootToSpiceName,
      new Map<string, number>()
    );
    return {
      vMap: new Map<string, number>(),
      currentMap: new Map<string, number>(),
      find,
      nodeList: emptyEntries,
      stripToSpiceName,
    };
  }

  // Construct MNA circuit elements from mapped coordinates
  const mnaComps: MnaComponent[] = [];
  const compIdToOrigId = new Map<number, string>();

  const registerMna = (comp: MnaComponent, origId: string) => {
    compIdToOrigId.set(comp.id, origId);
    mnaComps.push(comp);
  };

  // Bench DC supply across TOP_POS and TOP_NEG (GND)
  mnaComps.push({
    id: 9999,
    type: "VS",
    val: vSourceVal,
    nodePos: find("TOP_POS"),
    nodeNeg: find("TOP_NEG"),
  });

  components.forEach((c, idx) => {
    if (c.type === "RESISTOR" && c.pins.T1 && c.pins.T2) {
      registerMna(
        {
          id: idx + 1,
          type: "R",
          val: Math.max(1, c.value),
          nodePos: find(holeToElectricalStripKey(c.pins.T1)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.T2)),
        },
        c.id
      );
    } else if (c.type === "INDUCTOR" && c.pins.T1 && c.pins.T2) {
      // DC inductor winding ESR (~12 Ohm)
      registerMna(
        {
          id: idx + 1,
          type: "R",
          val: 12,
          nodePos: find(holeToElectricalStripKey(c.pins.T1)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.T2)),
        },
        c.id
      );
    } else if (c.type === "LDR" && c.pins.T1 && c.pins.T2) {
      registerMna(
        {
          id: idx + 1,
          type: "R",
          val: Math.max(50, c.value || 1000),
          nodePos: find(holeToElectricalStripKey(c.pins.T1)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.T2)),
        },
        c.id
      );
    } else if (c.type === "BUZZER") {
      const pPos = c.pins.ANODE || c.pins.T1;
      const pNeg = c.pins.CATHODE || c.pins.T2;
      if (pPos && pNeg) {
        registerMna(
          {
            id: idx + 1,
            type: "R",
            val: 180,
            nodePos: find(holeToElectricalStripKey(pPos)),
            nodeNeg: find(holeToElectricalStripKey(pNeg)),
          },
          c.id
        );
      }
    } else if (
      (c.type.startsWith("LED_") ||
        c.type === "DIODE_1N4007" ||
        c.type === "DIODE_1N5819") &&
      (c.pins.ANODE || c.pins.T1) &&
      (c.pins.CATHODE || c.pins.T2)
    ) {
      const pA = c.pins.ANODE || c.pins.T1;
      const pK = c.pins.CATHODE || c.pins.T2;
      registerMna(
        {
          id: idx + 1,
          type: "D",
          val: c.type.includes("BLUE")
            ? 3.2
            : c.type.includes("GREEN")
            ? 2.2
            : c.type === "DIODE_1N5819"
            ? 0.3
            : c.type === "DIODE_1N4007"
            ? 0.7
            : 2.0,
          nodePos: find(holeToElectricalStripKey(pA)),
          nodeNeg: find(holeToElectricalStripKey(pK)),
        },
        c.id
      );
    } else if (
      c.type === "DIODE_ZENER" &&
      (c.pins.ANODE || c.pins.T1) &&
      (c.pins.CATHODE || c.pins.T2)
    ) {
      const netA = find(holeToElectricalStripKey(c.pins.ANODE || c.pins.T1));
      const netK = find(holeToElectricalStripKey(c.pins.CATHODE || c.pins.T2));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "D",
          val: 0.7,
          nodePos: netA,
          nodeNeg: netK,
        },
        c.id
      );
      registerMna(
        {
          id: (idx + 1) * 100 + 2,
          type: "D",
          val: Math.max(2.4, c.value || 5.1),
          nodePos: netK,
          nodeNeg: netA,
        },
        c.id
      );
    } else if (c.type === "PUSH_BUTTON" || c.type === "SWITCH_SPST") {
      const p1 = c.pins.T1 || c.pins.P1;
      const p2 = c.pins.T2 || c.pins.P2;
      if (p1 && p2) {
        const isClosed = c.value === 1;
        registerMna(
          {
            id: idx + 1,
            type: "R",
            val: isClosed ? 0.05 : 1e7,
            nodePos: find(holeToElectricalStripKey(p1)),
            nodeNeg: find(holeToElectricalStripKey(p2)),
          },
          c.id
        );
      }
    } else if (c.type === "POTENTIOMETER" && c.pins.T1 && c.pins.WIPER && c.pins.T2) {
      const totalR = Math.max(10, c.value || 10000);
      const pct = Math.max(0.02, Math.min(0.98, c.wiperPct ?? 0.5));
      const r1 = Math.max(1, totalR * pct);
      const r2 = Math.max(1, totalR * (1 - pct));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "R",
          val: r1,
          nodePos: find(holeToElectricalStripKey(c.pins.T1)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.WIPER)),
        },
        c.id
      );
      registerMna(
        {
          id: (idx + 1) * 100 + 2,
          type: "R",
          val: r2,
          nodePos: find(holeToElectricalStripKey(c.pins.WIPER)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.T2)),
        },
        c.id
      );
    } else if (c.type === "CAP_CERAMIC" && c.pins.T1 && c.pins.T2) {
      registerMna(
        {
          id: idx + 1,
          type: "R",
          val: 1e7,
          nodePos: find(holeToElectricalStripKey(c.pins.T1)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.T2)),
        },
        c.id
      );
    } else if (c.type === "CAP_ELECTROLYTIC" && c.pins.ANODE && c.pins.CATHODE) {
      registerMna(
        {
          id: idx + 1,
          type: "R",
          val: 1e7,
          nodePos: find(holeToElectricalStripKey(c.pins.ANODE)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.CATHODE)),
        },
        c.id
      );
    } else if (
      (c.type === "BJT_BC547" || c.type === "TRANSISTOR_2N2222") &&
      c.pins.BASE &&
      c.pins.EMITTER &&
      c.pins.COLLECTOR
    ) {
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "D",
          val: 0.65,
          nodePos: find(holeToElectricalStripKey(c.pins.BASE)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.EMITTER)),
        },
        c.id
      );
      registerMna(
        {
          id: (idx + 1) * 100 + 2,
          type: "R",
          val: 45,
          nodePos: find(holeToElectricalStripKey(c.pins.COLLECTOR)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.EMITTER)),
        },
        c.id
      );
    } else if (
      c.type === "BJT_BC557" &&
      c.pins.BASE &&
      c.pins.EMITTER &&
      c.pins.COLLECTOR
    ) {
      // PNP: Emitter->Base diode drop + Emitter->Collector path
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "D",
          val: 0.65,
          nodePos: find(holeToElectricalStripKey(c.pins.EMITTER)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.BASE)),
        },
        c.id
      );
      registerMna(
        {
          id: (idx + 1) * 100 + 2,
          type: "R",
          val: 45,
          nodePos: find(holeToElectricalStripKey(c.pins.EMITTER)),
          nodeNeg: find(holeToElectricalStripKey(c.pins.COLLECTOR)),
        },
        c.id
      );
    } else if (
      c.type === "MOSFET_IRF540N" &&
      c.pins.GATE &&
      c.pins.DRAIN &&
      c.pins.SOURCE
    ) {
      const netG = find(holeToElectricalStripKey(c.pins.GATE));
      const netD = find(holeToElectricalStripKey(c.pins.DRAIN));
      const netS = find(holeToElectricalStripKey(c.pins.SOURCE));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "R",
          val: 1e8,
          nodePos: netG,
          nodeNeg: netS,
        },
        c.id
      );
      const isGateBiased = netG === find("TOP_POS") || (netG !== netS && netG !== find("TOP_NEG"));
      registerMna(
        {
          id: (idx + 1) * 100 + 2,
          type: "R",
          val: isGateBiased ? 0.25 : 1e6,
          nodePos: netD,
          nodeNeg: netS,
        },
        c.id
      );
    } else if (c.type === "IC_LM7805" && c.pins.VIN && c.pins.GND && c.pins.VOUT) {
      const netVin = find(holeToElectricalStripKey(c.pins.VIN));
      const netGnd = find(holeToElectricalStripKey(c.pins.GND));
      const netVout = find(holeToElectricalStripKey(c.pins.VOUT));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "R",
          val: 1000,
          nodePos: netVin,
          nodeNeg: netGnd,
        },
        c.id
      );
      if (netVin === find("TOP_POS") && netGnd === find("TOP_NEG")) {
        const regOut = Math.min(5.0, Math.max(0, vSourceVal - 1.5));
        const intNode = `LM7805_${c.id}_REG`;
        mnaComps.push({
          id: (idx + 1) * 100 + 2,
          type: "VS",
          val: regOut,
          nodePos: intNode,
          nodeNeg: netGnd,
        });
        registerMna(
          {
            id: (idx + 1) * 100 + 3,
            type: "R",
            val: 2,
            nodePos: intNode,
            nodeNeg: netVout,
          },
          c.id
        );
      }
    } else if (c.type === "IC_NE555" && c.pins.PIN1_GND && c.pins.PIN8_VCC) {
      const netVcc = find(holeToElectricalStripKey(c.pins.PIN8_VCC));
      const netGnd = find(holeToElectricalStripKey(c.pins.PIN1_GND));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "R",
          val: 15000,
          nodePos: netVcc,
          nodeNeg: netGnd,
        },
        c.id
      );
      if (
        c.pins.PIN3_OUT &&
        netVcc === find("TOP_POS") &&
        netGnd === find("TOP_NEG")
      ) {
        const vOut555 = Math.max(3.6, vSourceVal - 1.3);
        const intNode = `IC555_${c.id}_DRV`;
        mnaComps.push({
          id: (idx + 1) * 100 + 2,
          type: "VS",
          val: vOut555,
          nodePos: intNode,
          nodeNeg: netGnd,
        });
        registerMna(
          {
            id: (idx + 1) * 100 + 3,
            type: "R",
            val: 35,
            nodePos: intNode,
            nodeNeg: find(holeToElectricalStripKey(c.pins.PIN3_OUT)),
          },
          c.id
        );
      }
    } else if (c.type === "IC_LM741" && c.pins.PIN1_GND && c.pins.PIN8_VCC) {
      const netVcc = find(holeToElectricalStripKey(c.pins.PIN8_VCC));
      const netGnd = find(holeToElectricalStripKey(c.pins.PIN1_GND));
      registerMna(
        {
          id: (idx + 1) * 100 + 1,
          type: "R",
          val: 18000,
          nodePos: netVcc,
          nodeNeg: netGnd,
        },
        c.id
      );
      if (
        c.pins.PIN3_OUT &&
        netVcc === find("TOP_POS") &&
        netGnd === find("TOP_NEG")
      ) {
        const intNode = `IC741_${c.id}_OUT`;
        mnaComps.push({
          id: (idx + 1) * 100 + 2,
          type: "VS",
          val: vSourceVal * 0.5,
          nodePos: intNode,
          nodeNeg: netGnd,
        });
        registerMna(
          {
            id: (idx + 1) * 100 + 3,
            type: "R",
            val: 75,
            nodePos: intNode,
            nodeNeg: find(holeToElectricalStripKey(c.pins.PIN3_OUT)),
          },
          c.id
        );
      }
    } else if (c.type.startsWith("IC_74LS")) {
      const vccPin = c.pins.PIN14_VCC || c.pins.PIN16_VCC || c.pins.PIN5_VCC || c.pins.PIN8_VCC;
      const gndPin = c.pins.PIN7_GND || c.pins.PIN8_GND || c.pins.PIN13_GND || c.pins.PIN12_GND;
      const outPin =
        c.pins.PIN3_1Y ||
        c.pins.PIN2_1Y ||
        c.pins.PIN1_1Y ||
        c.pins.PIN5_1Q ||
        c.pins.PIN15_1Q ||
        c.pins.PIN3_OUT;
      if (vccPin && gndPin) {
        const netVcc = find(holeToElectricalStripKey(vccPin));
        const netGnd = find(holeToElectricalStripKey(gndPin));
        registerMna(
          {
            id: (idx + 1) * 100 + 1,
            type: "R",
            val: 2500,
            nodePos: netVcc,
            nodeNeg: netGnd,
          },
          c.id
        );
        if (outPin && netVcc === find("TOP_POS") && netGnd === find("TOP_NEG")) {
          const intNode = `IC74LS_${c.id}_OUT`;
          mnaComps.push({
            id: (idx + 1) * 100 + 2,
            type: "VS",
            val: Math.min(4.3, vSourceVal - 0.7),
            nodePos: intNode,
            nodeNeg: netGnd,
          });
          registerMna(
            {
              id: (idx + 1) * 100 + 3,
              type: "R",
              val: 45,
              nodePos: intNode,
              nodeNeg: find(holeToElectricalStripKey(outPin)),
            },
            c.id
          );
        }
      }
    } else if (c.type === "SEVEN_SEG") {
      const comHole = c.pins.COM_GND || c.pins.COM;
      if (comHole) {
        const netCom = find(holeToElectricalStripKey(comHole));
        const segKeys = ["SEG_A", "SEG_B", "SEG_C", "SEG_D", "SEG_E", "SEG_F", "SEG_G", "SEG_DP"];
        segKeys.forEach((sk, sIdx) => {
          const sHole = c.pins[sk];
          if (sHole) {
            registerMna(
              {
                id: (idx + 1) * 100 + sIdx + 1,
                type: "D",
                val: 1.9,
                nodePos: find(holeToElectricalStripKey(sHole)),
                nodeNeg: netCom,
              },
              c.id
            );
          }
        });
      }
    }
  });

  const solved = runAnalogMNA(mnaComps, find("TOP_NEG"));

  const vMap = new Map<string, number>();
  solved.netVoltages.forEach((v, netName) => {
    vMap.set(netName, v);
  });

  const currentMap = new Map<string, number>();
  solved.compTelemetry.forEach((telem, compId) => {
    const origId = compIdToOrigId.get(compId);
    if (origId) {
      const curAbs = Math.abs(telem.current_mA);
      const prevMax = currentMap.get(origId) ?? 0;
      if (curAbs >= prevMax) {
        currentMap.set(origId, curAbs);
      }
    }
  });

  const nodeList = buildSpiceNodeEntries(
    components,
    allStripKeys,
    find,
    rootToSpiceName,
    vMap
  );

  return { vMap, currentMap, find, nodeList, stripToSpiceName };
}

function buildSpiceNodeEntries(
  components: BreadboardComponentItem[],
  allStripKeys: Set<string>,
  find: (k: string) => string,
  rootToSpiceName: Map<string, string>,
  vMap: Map<string, number>
): SpiceNodeMappingEntry[] {
  const byRoot = new Map<string, SpiceNodeMappingEntry>();

  allStripKeys.forEach((sk) => {
    const r = find(sk);
    let entry = byRoot.get(r);
    if (!entry) {
      entry = {
        spiceNodeName: rootToSpiceName.get(r) || r,
        rootStripKey: r,
        voltage: vMap.get(r) ?? 0,
        stripKeys: [],
        coordSummary: "",
        connections: [],
      };
      byRoot.set(r, entry);
    }
    if (!entry.stripKeys.includes(sk)) {
      entry.stripKeys.push(sk);
    }
  });

  components.forEach((comp) => {
    Object.entries(comp.pins).forEach(([pinName, hole]) => {
      const sk = holeToElectricalStripKey(hole);
      const r = find(sk);
      const entry = byRoot.get(r);
      if (entry) {
        entry.connections.push({
          compId: comp.id,
          compLabel: comp.label,
          pinName,
          hole,
          holeLabel: formatCompactHole(hole),
          stripKey: sk,
          svgXY: holeToSvgXY(hole),
          worldXZ: holeToWorldXZ(hole),
        });
      }
    });
  });

  const list = Array.from(byRoot.values()).map((e) => {
    const sortedStrips = [...e.stripKeys].sort();
    const coordLabels = e.connections.map((c) => {
      const wx = c.worldXZ.x.toFixed(2);
      const wz = c.worldXZ.z.toFixed(2);
      return `${c.holeLabel} (${wx}, ${wz})`;
    });
    e.coordSummary =
      coordLabels.length > 0
        ? coordLabels.join(" · ")
        : sortedStrips.join(" ↔ ");
    return e;
  });

  // Sort: 0 (GND), VCC (+V), then N001..N999
  list.sort((a, b) => {
    if (a.spiceNodeName.startsWith("0 ")) return -1;
    if (b.spiceNodeName.startsWith("0 ")) return 1;
    if (a.spiceNodeName.startsWith("VCC")) return -1;
    if (b.spiceNodeName.startsWith("VCC")) return 1;
    return a.spiceNodeName.localeCompare(b.spiceNodeName);
  });

  return list;
}
