export interface GateSpec {
  inputs: number;
  outX: number;
  bubble?: { cx: number; cy: number; r: number };
  path: (x: number, y: number) => string;
  extra?: (x: number, y: number) => string;
}

export interface PinSpec {
  name: string;
  y: number;
  defaultVal?: number; // TTL pull-up default when unconnected
}

export interface CompSpec {
  w: number;
  h: number;
  label: string;
  inputs: PinSpec[];
  outputs: PinSpec[];
  seq?: boolean;
  clockPorts?: number[];
  init?: Record<string, number>;
  stateOutputs?: (st: Record<string, number>) => number[];
  step?: (
    ins: number[],
    st: Record<string, number>,
    edges: boolean[]
  ) => Record<string, number>;
  compute?: (ins: number[]) => number[];
  iconLabel?: string;
  noLabels?: boolean;
  analogCategory?:
    | "passive"
    | "diode"
    | "transistor"
    | "thyristor"
    | "analog_ic";
  partNumber?: string;
  valueLabel?: string;
}

export const GATE_SPECS: Record<string, GateSpec> = {
  AND: {
    inputs: 2,
    outX: 75,
    path: (x, y) =>
      `M ${x},${y} L ${x + 50},${y} A 25,25 0 0 1 ${x + 50},${y + 50} L ${x},${y + 50} Z`,
  },
  NAND: {
    inputs: 2,
    outX: 80,
    bubble: { cx: 75, cy: 25, r: 5 },
    path: (x, y) =>
      `M ${x},${y} L ${x + 45},${y} A 25,25 0 0 1 ${x + 45},${y + 50} L ${x},${y + 50} Z`,
  },
  OR: {
    inputs: 2,
    outX: 75,
    path: (x, y) =>
      `M ${x},${y} Q ${x + 35},${y + 25} ${x},${y + 50} ` +
      `Q ${x + 42},${y + 50} ${x + 75},${y + 25} ` +
      `Q ${x + 42},${y} ${x},${y} Z`,
  },
  NOR: {
    inputs: 2,
    outX: 80,
    bubble: { cx: 75, cy: 25, r: 5 },
    path: (x, y) =>
      `M ${x},${y} Q ${x + 33},${y + 25} ${x},${y + 50} ` +
      `Q ${x + 38},${y + 50} ${x + 70},${y + 25} ` +
      `Q ${x + 38},${y} ${x},${y} Z`,
  },
  XOR: {
    inputs: 2,
    outX: 75,
    path: (x, y) =>
      `M ${x},${y} Q ${x + 35},${y + 25} ${x},${y + 50} ` +
      `Q ${x + 42},${y + 50} ${x + 75},${y + 25} ` +
      `Q ${x + 42},${y} ${x},${y} Z`,
    extra: (x, y) => `M ${x - 9},${y} Q ${x + 26},${y + 25} ${x - 9},${y + 50}`,
  },
  XNOR: {
    inputs: 2,
    outX: 80,
    bubble: { cx: 75, cy: 25, r: 5 },
    path: (x, y) =>
      `M ${x},${y} Q ${x + 33},${y + 25} ${x},${y + 50} ` +
      `Q ${x + 38},${y + 50} ${x + 70},${y + 25} ` +
      `Q ${x + 38},${y} ${x},${y} Z`,
    extra: (x, y) => `M ${x - 9},${y} Q ${x + 24},${y + 25} ${x - 9},${y + 50}`,
  },
  NOT: {
    inputs: 1,
    outX: 70,
    bubble: { cx: 65, cy: 25, r: 5 },
    path: (x, y) => `M ${x},${y} L ${x + 60},${y + 25} L ${x},${y + 50} Z`,
  },
};

export function computeGate(type: string, ins: number[]): number {
  const a = ins[0] ? 1 : 0;
  const b = ins.length > 1 ? (ins[1] ? 1 : 0) : 0;
  switch (type) {
    case "AND":
      return a & b;
    case "OR":
      return a | b;
    case "NOT":
      return a ^ 1;
    case "NAND":
      return (a & b) ^ 1;
    case "NOR":
      return (a | b) ^ 1;
    case "XOR":
      return a ^ b;
    case "XNOR":
      return (a ^ b) ^ 1;
    default:
      return 0;
  }
}

function makePins(
  names: (string | { name: string; defaultVal?: number })[],
  h: number
): PinSpec[] {
  const n = names.length;
  if (n === 0) return [];
  const gap = h / (n + 1);
  return names.map((item, i) => {
    const y = Math.round(gap * (i + 1) * 10) / 10;
    if (typeof item === "string") {
      return { name: item, y };
    }
    return { name: item.name, defaultVal: item.defaultVal, y };
  });
}

function defComp(
  w: number,
  h: number,
  label: string,
  inputs: (string | { name: string; defaultVal?: number })[],
  outputs: string[],
  opts?: Partial<CompSpec>
): CompSpec {
  return {
    w,
    h,
    label,
    inputs: makePins(inputs, h),
    outputs: makePins(outputs, h),
    ...opts,
  };
}

export const SEG7_MAP: number[][] = [
  [1, 1, 1, 1, 1, 1, 0], // 0
  [0, 1, 1, 0, 0, 0, 0], // 1
  [1, 1, 0, 1, 1, 0, 1], // 2
  [1, 1, 1, 1, 0, 0, 1], // 3
  [0, 1, 1, 0, 0, 1, 1], // 4
  [1, 0, 1, 1, 0, 1, 1], // 5
  [1, 0, 1, 1, 1, 1, 1], // 6
  [1, 1, 1, 0, 0, 0, 0], // 7
  [1, 1, 1, 1, 1, 1, 1], // 8
  [1, 1, 1, 1, 0, 1, 1], // 9
  [1, 1, 1, 0, 1, 1, 1], // A
  [0, 0, 1, 1, 1, 1, 1], // b
  [1, 0, 0, 1, 1, 1, 0], // C
  [0, 1, 1, 1, 1, 0, 1], // d
  [1, 0, 0, 1, 1, 1, 1], // E
  [1, 0, 0, 0, 1, 1, 1], // F
];

export const SEG_LINES: Record<string, [number, number, number, number]> = {
  a: [13, 9, 47, 9],
  b: [51, 13, 51, 47],
  c: [51, 53, 51, 87],
  d: [13, 91, 47, 91],
  e: [9, 53, 9, 87],
  f: [9, 13, 9, 47],
  g: [13, 50, 47, 50],
};

export const COMP_SPECS: Record<string, CompSpec> = {
  /* Flip-Flops */
  DFF: defComp(72, 58, "D FF", ["D", "CLK"], ["Q", "Q̅"], {
    seq: true,
    clockPorts: [1],
    init: { q: 0 },
    stateOutputs: (st) => [st.q, st.q ^ 1],
    step: (ins, st, edges) => (edges[0] ? { q: ins[0] ? 1 : 0 } : st),
    iconLabel: "D",
  }),

  TFF: defComp(72, 58, "T FF", ["T", "CLK"], ["Q", "Q̅"], {
    seq: true,
    clockPorts: [1],
    init: { q: 0 },
    stateOutputs: (st) => [st.q, st.q ^ 1],
    step: (ins, st, edges) =>
      edges[0] ? { q: ins[0] ? st.q ^ 1 : st.q } : st,
    iconLabel: "T",
  }),

  JKFF: defComp(74, 68, "JK FF", ["J", "K", "CLK"], ["Q", "Q̅"], {
    seq: true,
    clockPorts: [2],
    init: { q: 0 },
    stateOutputs: (st) => [st.q, st.q ^ 1],
    step: (ins, st, edges) => {
      if (!edges[0]) return st;
      const J = ins[0],
        K = ins[1];
      let q = st.q;
      if (J && K) q ^= 1;
      else if (J) q = 1;
      else if (K) q = 0;
      return { q };
    },
    iconLabel: "JK",
  }),

  SRFF: defComp(74, 68, "SR FF", ["S", "R", "CLK"], ["Q", "Q̅"], {
    seq: true,
    clockPorts: [2],
    init: { q: 0 },
    stateOutputs: (st) => [st.q, st.q ^ 1],
    step: (ins, st, edges) => {
      if (!edges[0]) return st;
      const S = ins[0],
        R = ins[1];
      let q = st.q;
      if (S && !R) q = 1;
      else if (R && !S) q = 0;
      else if (S && R) q = 0;
      return { q };
    },
    iconLabel: "SR",
  }),

  /* Standard 74-Series TTL Logic Chips */
  "7400": defComp(
    102,
    116,
    "7400 NAND",
    ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => [
        (ins[0] & ins[1]) ^ 1,
        (ins[2] & ins[3]) ^ 1,
        (ins[4] & ins[5]) ^ 1,
        (ins[6] & ins[7]) ^ 1,
      ],
      iconLabel: "7400",
      partNumber: "SN74LS00N",
    }
  ),

  "7402": defComp(
    102,
    116,
    "7402 NOR",
    ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => [
        (ins[0] | ins[1]) ^ 1,
        (ins[2] | ins[3]) ^ 1,
        (ins[4] | ins[5]) ^ 1,
        (ins[6] | ins[7]) ^ 1,
      ],
      iconLabel: "7402",
      partNumber: "SN74LS02N",
    }
  ),

  "7404": defComp(
    98,
    114,
    "7404 NOT",
    ["1A", "2A", "3A", "4A", "5A", "6A"],
    ["1Y", "2Y", "3Y", "4Y", "5Y", "6Y"],
    {
      compute: (ins) => [
        ins[0] ^ 1,
        ins[1] ^ 1,
        ins[2] ^ 1,
        ins[3] ^ 1,
        ins[4] ^ 1,
        ins[5] ^ 1,
      ],
      iconLabel: "7404",
      partNumber: "SN74LS04N",
    }
  ),

  "7408": defComp(
    102,
    116,
    "7408 AND",
    ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => [
        ins[0] & ins[1],
        ins[2] & ins[3],
        ins[4] & ins[5],
        ins[6] & ins[7],
      ],
      iconLabel: "7408",
      partNumber: "SN74LS08N",
    }
  ),

  "7432": defComp(
    102,
    116,
    "7432 OR",
    ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => [
        ins[0] | ins[1],
        ins[2] | ins[3],
        ins[4] | ins[5],
        ins[6] | ins[7],
      ],
      iconLabel: "7432",
      partNumber: "SN74LS32N",
    }
  ),

  "7486": defComp(
    102,
    116,
    "7486 XOR",
    ["1A", "1B", "2A", "2B", "3A", "3B", "4A", "4B"],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => [
        ins[0] ^ ins[1],
        ins[2] ^ ins[3],
        ins[4] ^ ins[5],
        ins[6] ^ ins[7],
      ],
      iconLabel: "7486",
      partNumber: "SN74LS86N",
    }
  ),

  "7476": defComp(
    110,
    134,
    "7476 Dual JK",
    [
      "1J",
      "1K",
      "1CLK",
      { name: "1PRE̅", defaultVal: 1 },
      { name: "1CLR̅", defaultVal: 1 },
      "2J",
      "2K",
      "2CLK",
      { name: "2PRE̅", defaultVal: 1 },
      { name: "2CLR̅", defaultVal: 1 },
    ],
    ["1Q", "1Q̅", "2Q", "2Q̅"],
    {
      seq: true,
      clockPorts: [2, 7],
      init: { q1: 0, q2: 0 },
      stateOutputs: (st) => [st.q1, st.q1 ^ 1, st.q2, st.q2 ^ 1],
      step: (ins, st, edges) => {
        let { q1, q2 } = st;
        if (!ins[4]) q1 = 0;
        else if (!ins[3]) q1 = 1;
        else if (edges[0]) {
          const J = ins[0],
            K = ins[1];
          if (J && K) q1 ^= 1;
          else if (J) q1 = 1;
          else if (K) q1 = 0;
        }

        if (!ins[9]) q2 = 0;
        else if (!ins[8]) q2 = 1;
        else if (edges[1]) {
          const J = ins[5],
            K = ins[6];
          if (J && K) q2 ^= 1;
          else if (J) q2 = 1;
          else if (K) q2 = 0;
        }
        return { q1, q2 };
      },
      iconLabel: "7476",
      partNumber: "SN74LS76AN",
    }
  ),

  "74151": defComp(
    112,
    152,
    "74151 8:1 MUX",
    [
      "D0",
      "D1",
      "D2",
      "D3",
      "D4",
      "D5",
      "D6",
      "D7",
      "S0",
      "S1",
      "S2",
      { name: "E̅", defaultVal: 0 },
    ],
    ["Y", "W̅"],
    {
      compute: (ins) => {
        const strobe = ins[11];
        if (strobe === 1) return [0, 1];
        const sel = (ins[10] << 2) | (ins[9] << 1) | ins[8];
        const val = ins[sel] ? 1 : 0;
        return [val, val ^ 1];
      },
      iconLabel: "74151",
      partNumber: "SN74LS151N",
    }
  ),

  "74153": defComp(
    112,
    152,
    "74153 Dual MUX",
    [
      "1C0",
      "1C1",
      "1C2",
      "1C3",
      { name: "1G̅", defaultVal: 0 },
      "2C0",
      "2C1",
      "2C2",
      "2C3",
      { name: "2G̅", defaultVal: 0 },
      "S0",
      "S1",
    ],
    ["1Y", "2Y"],
    {
      compute: (ins) => {
        const S0 = ins[10],
          S1 = ins[11];
        const sel = (S1 << 1) | S0;
        const g1 = ins[4];
        const g2 = ins[9];
        const y1 = g1 ? 0 : ins[sel] ? 1 : 0;
        const y2 = g2 ? 0 : ins[5 + sel] ? 1 : 0;
        return [y1, y2];
      },
      iconLabel: "74153",
      partNumber: "SN74LS153N",
    }
  ),

  "74157": defComp(
    108,
    134,
    "74157 Quad 2:1",
    [
      "1A",
      "1B",
      "2A",
      "2B",
      "3A",
      "3B",
      "4A",
      "4B",
      "S",
      { name: "G̅", defaultVal: 0 },
    ],
    ["1Y", "2Y", "3Y", "4Y"],
    {
      compute: (ins) => {
        const S = ins[8];
        const G = ins[9];
        if (G === 1) return [0, 0, 0, 0];
        return [
          S ? ins[1] : ins[0],
          S ? ins[3] : ins[2],
          S ? ins[5] : ins[4],
          S ? ins[7] : ins[6],
        ];
      },
      iconLabel: "74157",
      partNumber: "SN74LS157N",
    }
  ),

  "74161": defComp(
    112,
    136,
    "74161 Sync Ctr",
    [
      "D0",
      "D1",
      "D2",
      "D3",
      "CLK",
      { name: "CLR̅", defaultVal: 1 },
      { name: "LOAD̅", defaultVal: 1 },
      "ENP",
      "ENT",
    ],
    ["Q0", "Q1", "Q2", "Q3", "RCO"],
    {
      seq: true,
      clockPorts: [4],
      init: { count: 0 },
      stateOutputs: (st) => {
        const c = st.count & 0xf;
        return [
          c & 1,
          (c >> 1) & 1,
          (c >> 2) & 1,
          (c >> 3) & 1,
          c === 15 ? 1 : 0,
        ];
      },
      step: (ins, st, edges) => {
        let c = st.count & 0xf;
        if (!ins[5]) return { count: 0 };
        if (!edges[0]) return st;
        if (!ins[6]) {
          c = (ins[3] << 3) | (ins[2] << 2) | (ins[1] << 1) | ins[0];
        } else if (ins[7] && ins[8]) {
          c = (c + 1) & 0xf;
        }
        return { count: c };
      },
      iconLabel: "74161",
      partNumber: "SN74LS161AN",
    }
  ),

  "7473": defComp(
    104,
    120,
    "7473",
    [
      "J1",
      "K1",
      "CLK1",
      { name: "CLR1̅", defaultVal: 1 },
      "J2",
      "K2",
      "CLK2",
      { name: "CLR2̅", defaultVal: 1 },
    ],
    ["Q1", "Q̅1", "Q2", "Q̅2"],
    {
      seq: true,
      clockPorts: [2, 6],
      init: { q1: 0, q2: 0 },
      stateOutputs: (st) => [st.q1, st.q1 ^ 1, st.q2, st.q2 ^ 1],
      step: (ins, st, edges) => {
        let { q1, q2 } = st;
        if (!ins[3]) q1 = 0;
        else if (edges[0]) {
          const J = ins[0],
            K = ins[1];
          if (J && K) q1 ^= 1;
          else if (J) q1 = 1;
          else if (K) q1 = 0;
        }
        if (!ins[7]) q2 = 0;
        else if (edges[1]) {
          const J = ins[4],
            K = ins[5];
          if (J && K) q2 ^= 1;
          else if (J) q2 = 1;
          else if (K) q2 = 0;
        }
        return { q1, q2 };
      },
      iconLabel: "7473",
    }
  ),

  "7474": defComp(
    104,
    120,
    "7474",
    [
      "D1",
      "CLK1",
      { name: "PRE1̅", defaultVal: 1 },
      { name: "CLR1̅", defaultVal: 1 },
      "D2",
      "CLK2",
      { name: "PRE2̅", defaultVal: 1 },
      { name: "CLR2̅", defaultVal: 1 },
    ],
    ["Q1", "Q̅1", "Q2", "Q̅2"],
    {
      seq: true,
      clockPorts: [1, 5],
      init: { q1: 0, q2: 0 },
      stateOutputs: (st) => [st.q1, st.q1 ^ 1, st.q2, st.q2 ^ 1],
      step: (ins, st, edges) => {
        let { q1, q2 } = st;
        if (!ins[3]) q1 = 0;
        else if (!ins[2]) q1 = 1;
        else if (edges[0]) q1 = ins[0] ? 1 : 0;

        if (!ins[7]) q2 = 0;
        else if (!ins[6]) q2 = 1;
        else if (edges[1]) q2 = ins[4] ? 1 : 0;

        return { q1, q2 };
      },
      iconLabel: "7474",
    }
  ),

  /* MSI Combinational & Sequential Chips */
  "74138": defComp(
    108,
    134,
    "74138",
    [
      "A",
      "B",
      "C",
      { name: "G1", defaultVal: 1 },
      { name: "G2A̅", defaultVal: 0 },
      { name: "G2B̅", defaultVal: 0 },
    ],
    ["Y0̅", "Y1̅", "Y2̅", "Y3̅", "Y4̅", "Y5̅", "Y6̅", "Y7̅"],
    {
      compute: (ins) => {
        const [A, B, C, G1, G2A, G2B] = ins;
        const enabled = G1 === 1 && G2A === 0 && G2B === 0;
        if (!enabled) return [1, 1, 1, 1, 1, 1, 1, 1];
        const sel = (C << 2) | (B << 1) | A;
        const out: number[] = [];
        for (let i = 0; i < 8; i++) out.push(i === sel ? 0 : 1);
        return out;
      },
      iconLabel: "74138",
    }
  ),

  "74193": defComp(
    112,
    134,
    "74193",
    [
      "D0",
      "D1",
      "D2",
      "D3",
      "UP",
      "DOWN",
      "CLR",
      { name: "LOAD̅", defaultVal: 1 },
    ],
    ["Q0", "Q1", "Q2", "Q3", "TCU", "TCD"],
    {
      seq: true,
      clockPorts: [4, 5],
      init: { count: 0 },
      stateOutputs: (st) => {
        const c = st.count & 0xf;
        return [
          c & 1,
          (c >> 1) & 1,
          (c >> 2) & 1,
          (c >> 3) & 1,
          c === 15 ? 1 : 0,
          c === 0 ? 1 : 0,
        ];
      },
      step: (ins, st, edges) => {
        let c = st.count & 0xf;
        if (ins[6]) c = 0;
        else if (ins[7] === 0) {
          c = (ins[3] << 3) | (ins[2] << 2) | (ins[1] << 1) | ins[0];
        } else if (edges[0]) c = (c + 1) & 0xf;
        else if (edges[1]) c = (c - 1) & 0xf;
        return { count: c };
      },
      iconLabel: "74193",
    }
  ),

  "7447": defComp(
    102,
    118,
    "7447",
    ["A", "B", "C", "D", "LT", "BI"],
    ["a", "b", "c", "d", "e", "f", "g"],
    {
      compute: (ins) => {
        const [A, B, C, D, LT, BI] = ins;
        if (LT) return [1, 1, 1, 1, 1, 1, 1];
        if (BI) return [0, 0, 0, 0, 0, 0, 0];
        const val = ((D << 3) | (C << 2) | (B << 1) | A) & 0xf;
        return SEG7_MAP[val];
      },
      iconLabel: "7447",
    }
  ),

  MUX4: defComp(
    100,
    108,
    "4:1 MUX",
    ["I0", "I1", "I2", "I3", "S0", "S1"],
    ["Y"],
    {
      compute: (ins) => {
        const [I0, I1, I2, I3, S0, S1] = ins;
        const sel = (S1 << 1) | S0;
        const arr = [I0, I1, I2, I3];
        return [arr[sel] ? 1 : 0];
      },
      iconLabel: "MUX",
    }
  ),

  DEMUX4: defComp(
    100,
    96,
    "1:4 DMUX",
    ["D", "S0", "S1"],
    ["Y0", "Y1", "Y2", "Y3"],
    {
      compute: (ins) => {
        const [D, S0, S1] = ins;
        const sel = (S1 << 1) | S0;
        return [0, 1, 2, 3].map((i) => (i === sel ? (D ? 1 : 0) : 0));
      },
      iconLabel: "DMUX",
    }
  ),

  "7483": defComp(
    110,
    136,
    "7483 ADD",
    ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3", "Cin"],
    ["S0", "S1", "S2", "S3", "Cout"],
    {
      compute: (ins) => {
        const A = (ins[3] << 3) | (ins[2] << 2) | (ins[1] << 1) | ins[0];
        const B = (ins[7] << 3) | (ins[6] << 2) | (ins[5] << 1) | ins[4];
        const sum = A + B + (ins[8] ? 1 : 0);
        return [
          sum & 1,
          (sum >> 1) & 1,
          (sum >> 2) & 1,
          (sum >> 3) & 1,
          (sum >> 4) & 1,
        ];
      },
      iconLabel: "7483",
    }
  ),

  "7485": defComp(
    110,
    130,
    "7485 CMP",
    ["A0", "A1", "A2", "A3", "B0", "B1", "B2", "B3"],
    ["A>B", "A=B", "A<B"],
    {
      compute: (ins) => {
        const A = (ins[3] << 3) | (ins[2] << 2) | (ins[1] << 1) | ins[0];
        const B = (ins[7] << 3) | (ins[6] << 2) | (ins[5] << 1) | ins[4];
        return [A > B ? 1 : 0, A === B ? 1 : 0, A < B ? 1 : 0];
      },
      iconLabel: "7485",
    }
  ),

  "74194": defComp(
    108,
    118,
    "74194 SR",
    ["SIR", "SIL", "S0", "S1", "CLK", { name: "CLR̅", defaultVal: 1 }],
    ["QA", "QB", "QC", "QD"],
    {
      seq: true,
      clockPorts: [4],
      init: { reg: 0 },
      stateOutputs: (st) => [
        (st.reg >> 3) & 1,
        (st.reg >> 2) & 1,
        (st.reg >> 1) & 1,
        st.reg & 1,
      ],
      step: (ins, st, edges) => {
        const [SIR, SIL, S0, S1, , CLR] = ins;
        if (!CLR) return { reg: 0 };
        if (!edges[0]) return st;
        let r = st.reg & 0xf;
        const mode = (S1 << 1) | S0;
        if (mode === 1) {
          r = ((SIR & 1) << 3) | (r >> 1);
        } else if (mode === 2) {
          r = ((r << 1) & 0xf) | (SIL & 1);
        } else if (mode === 3) {
          r = ((r << 1) & 0xf) | ((r >> 3) & 1);
        }
        return { reg: r };
      },
      iconLabel: "74194",
    }
  ),

  "7SEG": defComp(84, 112, "", ["a", "b", "c", "d", "e", "f", "g"], [], {
    compute: () => [],
    noLabels: true,
  }),

  /* ============================================================================
   * ANALOGUE & POWER ELECTRONICS COMPONENTS (Passive, Diodes, BJTs, FETs, Thyristors, Linear ICs)
   * ============================================================================ */

  /* 1. Passive & Reactive Components */
  RES: defComp(76, 46, "RESISTOR", ["IN"], ["OUT"], {
    compute: (ins) => [ins[0] ? 1 : 0],
    iconLabel: "1kΩ",
    analogCategory: "passive",
    partNumber: "CFR-25 1kΩ",
    valueLabel: "1.0 kΩ ±5%",
  }),

  RESISTOR: defComp(76, 46, "RESISTOR", ["IN"], ["OUT"], {
    compute: (ins) => [ins[0] ? 1 : 0],
    iconLabel: "1kΩ",
    analogCategory: "passive",
    partNumber: "CFR-25 1kΩ",
    valueLabel: "1.0 kΩ ±5%",
  }),

  POT: defComp(
    76,
    46,
    "POT 10kΩ",
    ["IN", { name: "WIPER_EN", defaultVal: 1 }],
    ["OUT"],
    {
      compute: (ins) => [ins[0] && ins[1] ? 1 : 0],
      iconLabel: "POT",
      analogCategory: "passive",
      partNumber: "RV09 10kΩ",
      valueLabel: "10 kΩ Linear",
    }
  ),

  CAP_NP: defComp(
    76,
    46,
    "CAP NP",
    ["P1", { name: "DISC", defaultVal: 0 }],
    ["P2"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "100nF",
      analogCategory: "passive",
      partNumber: "C0G 100nF",
      valueLabel: "100nF Non-Polar",
    }
  ),

  CAPACITOR: defComp(
    76,
    46,
    "CAPACITOR",
    ["P1", { name: "DISC", defaultVal: 0 }],
    ["P2"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "100nF",
      analogCategory: "passive",
      partNumber: "C0G 100nF",
      valueLabel: "100nF Film Cap",
    }
  ),

  CAP_POL: defComp(
    76,
    46,
    "CAP POLAR",
    ["+ANODE", { name: "-CATH", defaultVal: 0 }],
    ["V_CAP"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "100µF+",
      analogCategory: "passive",
      partNumber: "EL-100µF/25V",
      valueLabel: "100µF Polarized",
    }
  ),

  IND: defComp(
    76,
    46,
    "INDUCTOR",
    ["L1", { name: "CORE_SAT", defaultVal: 0 }],
    ["L2"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "10mH",
      analogCategory: "passive",
      partNumber: "RLB0912 10mH",
      valueLabel: "10 mH Choke",
    }
  ),

  INDUCTOR: defComp(
    76,
    46,
    "INDUCTOR",
    ["L1", { name: "CORE_SAT", defaultVal: 0 }],
    ["L2"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "10mH",
      analogCategory: "passive",
      partNumber: "RLB0912 10mH",
      valueLabel: "10 mH Inductor",
    }
  ),

  TRANSFORMER: defComp(
    88,
    64,
    "XFMR 10:1",
    ["PRI_H", { name: "PRI_N", defaultVal: 0 }],
    ["SEC_1", "SEC_2"],
    {
      compute: (ins) => [ins[0] ^ ins[1] ? 1 : 0, 0],
      iconLabel: "XFMR",
      analogCategory: "passive",
      partNumber: "EI-48 230:12V",
      valueLabel: "Isolation 12V",
    }
  ),

  XTAL: defComp(
    76,
    46,
    "XTAL 16MHz",
    [{ name: "EN", defaultVal: 1 }],
    ["OSC"],
    {
      compute: (ins) => [ins[0] ? 1 : 0],
      iconLabel: "XTAL",
      analogCategory: "passive",
      partNumber: "HC-49S 16MHz",
      valueLabel: "16.000 MHz",
    }
  ),

  FUSE: defComp(
    76,
    46,
    "FUSE 1A",
    ["LINE", { name: "BLOWN", defaultVal: 0 }],
    ["LOAD"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "FUSE",
      analogCategory: "passive",
      partNumber: "F1AL250V",
      valueLabel: "1.0A Fast-Blow",
    }
  ),

  /* 2. Diodes, Rectifiers & Optoelectronics (including 1N4007A & Zener) */
  DIODE_1N4007: defComp(
    78,
    48,
    "1N4007A",
    ["A (Anode)", { name: "K_REV", defaultVal: 0 }],
    ["K (Out)"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "1N4007",
      analogCategory: "diode",
      partNumber: "1N4007A",
      valueLabel: "Si 1000V 1A Vf=0.7V",
    }
  ),

  ZENER: defComp(
    78,
    48,
    "ZENER 5.1V",
    ["V_IN (K)", { name: "A (GND)", defaultVal: 0 }],
    ["VZ_5V1", "IZ_CLAMP"],
    {
      compute: (ins) => {
        const reg = ins[0] === 1 && ins[1] === 0 ? 1 : 0;
        return [reg, reg];
      },
      iconLabel: "ZENER",
      analogCategory: "diode",
      partNumber: "1N4733A",
      valueLabel: "Vz = 5.1V 1W",
    }
  ),

  ZENER_BZX84: defComp(
    78,
    48,
    "ZENER BZX84",
    ["A (Anode)", { name: "K_REV", defaultVal: 0 }],
    ["K (Cathode)"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "BZX84",
      analogCategory: "diode",
      partNumber: "BZX84C5V1",
      valueLabel: "Vz = 5.1V Zener",
    }
  ),

  SCHOTTKY: defComp(
    78,
    48,
    "1N5819 SCH",
    ["A (Anode)", { name: "K_REV", defaultVal: 0 }],
    ["K (Out)"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "1N5819",
      analogCategory: "diode",
      partNumber: "1N5819",
      valueLabel: "Schottky Vf=0.3V",
    }
  ),

  LED_RED: defComp(
    78,
    48,
    "LED RED",
    ["ANODE", { name: "CATH", defaultVal: 0 }],
    ["LIGHT"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "LED",
      analogCategory: "diode",
      partNumber: "TLHR5400",
      valueLabel: "Vf=2.0V 20mA",
    }
  ),

  PHOTODIODE: defComp(
    78,
    48,
    "PHOTODIODE",
    ["LUX_IN", { name: "BIAS", defaultVal: 1 }],
    ["I_PHOTO"],
    {
      compute: (ins) => [ins[0] && ins[1] ? 1 : 0],
      iconLabel: "PHOTO",
      analogCategory: "diode",
      partNumber: "BPW34",
      valueLabel: "Si PIN λ=850nm",
    }
  ),

  BRIDGE_RECT: defComp(
    88,
    62,
    "BRIDGE RECT",
    ["AC_1", "AC_2"],
    ["DC+", "DC-"],
    {
      compute: (ins) => [ins[0] || ins[1] ? 1 : 0, 0],
      iconLabel: "DB107",
      analogCategory: "diode",
      partNumber: "DB107 / W04M",
      valueLabel: "4×1N4007A Bridge",
    }
  ),

  /* 3. Transistors — BJT (BC547, BC557, 2N2222), MOSFET (IRF540N), JFET (BF245B) */
  BC547: defComp(
    84,
    60,
    "BC547 NPN",
    [
      "B (Base)",
      { name: "C (Vcc)", defaultVal: 1 },
      { name: "E (Gnd)", defaultVal: 0 },
    ],
    ["E_OUT", "C_INV"],
    {
      compute: (ins) => {
        const [B, C, E] = ins;
        const on = B === 1 && E === 0;
        return [on ? C : 0, on ? 0 : C];
      },
      iconLabel: "BC547",
      analogCategory: "transistor",
      partNumber: "BC547B NPN",
      valueLabel: "NPN hFE=250 45V",
    }
  ),

  BC557: defComp(
    84,
    60,
    "BC557 PNP",
    [
      "B (Base)",
      { name: "E (Vcc)", defaultVal: 1 },
      { name: "C (Load)", defaultVal: 0 },
    ],
    ["C_OUT", "ACTIVE"],
    {
      compute: (ins) => {
        const [B, E] = ins;
        const on = B === 0 && E === 1;
        return [on ? 1 : 0, on ? 1 : 0];
      },
      iconLabel: "BC557",
      analogCategory: "transistor",
      partNumber: "BC557B PNP",
      valueLabel: "PNP hFE=250 45V",
    }
  ),

  "2N2222": defComp(
    84,
    60,
    "2N2222A NPN",
    [
      "B (Base)",
      { name: "C (Vcc)", defaultVal: 1 },
      { name: "E (Gnd)", defaultVal: 0 },
    ],
    ["E_OUT", "C_INV"],
    {
      compute: (ins) => {
        const [B, C, E] = ins;
        const on = B === 1 && E === 0;
        return [on ? C : 0, on ? 0 : C];
      },
      iconLabel: "2N2222",
      analogCategory: "transistor",
      partNumber: "2N2222A",
      valueLabel: "NPN 800mA High-Spd",
    }
  ),

  BJT_NPN: defComp(
    84,
    60,
    "NPN BJT",
    [
      "B (Base)",
      { name: "C (Vcc)", defaultVal: 1 },
      { name: "E (Gnd)", defaultVal: 0 },
    ],
    ["E_OUT", "C_INV"],
    {
      compute: (ins) => {
        const [B, C, E] = ins;
        const on = B === 1 && E === 0;
        return [on ? C : 0, on ? 0 : C];
      },
      iconLabel: "NPN",
      analogCategory: "transistor",
      partNumber: "2N3904 / BC547",
      valueLabel: "NPN hFE=250 45V",
    }
  ),

  BJT_PNP: defComp(
    84,
    60,
    "PNP BJT",
    [
      "B (Base)",
      { name: "E (Vcc)", defaultVal: 1 },
      { name: "C (Load)", defaultVal: 0 },
    ],
    ["C_OUT", "ACTIVE"],
    {
      compute: (ins) => {
        const [B, E] = ins;
        const on = B === 0 && E === 1;
        return [on ? 1 : 0, on ? 1 : 0];
      },
      iconLabel: "PNP",
      analogCategory: "transistor",
      partNumber: "2N3906 / BC557",
      valueLabel: "PNP hFE=250 45V",
    }
  ),

  IRF540N: defComp(
    84,
    60,
    "IRF540N MOS",
    [
      "G (Gate)",
      { name: "D (Drain)", defaultVal: 1 },
      { name: "S (Src)", defaultVal: 0 },
    ],
    ["S_OUT", "D_INV"],
    {
      compute: (ins) => {
        const [G, D, S] = ins;
        const on = G === 1 && S === 0;
        return [on ? D : 0, on ? 0 : D];
      },
      iconLabel: "IRF540",
      analogCategory: "transistor",
      partNumber: "IRF540N",
      valueLabel: "N-MOS 100V 33A",
    }
  ),

  MOSFET_N: defComp(
    84,
    60,
    "N-MOSFET",
    [
      "G (Gate)",
      { name: "D (Drain)", defaultVal: 1 },
      { name: "S (Src)", defaultVal: 0 },
    ],
    ["S_OUT", "D_INV"],
    {
      compute: (ins) => {
        const [G, D, S] = ins;
        const on = G === 1 && S === 0;
        return [on ? D : 0, on ? 0 : D];
      },
      iconLabel: "N-MOS",
      analogCategory: "transistor",
      partNumber: "IRF540N",
      valueLabel: "N-Channel 100V 33A",
    }
  ),

  JFET_N: defComp(
    84,
    60,
    "BF245 JFET",
    [
      "G (Pinch)",
      { name: "D (Drain)", defaultVal: 1 },
      { name: "S (Src)", defaultVal: 0 },
    ],
    ["ID_OUT"],
    {
      compute: (ins) => {
        const [G, D, S] = ins;
        return [G === 0 && S === 0 ? D : 0];
      },
      iconLabel: "JFET",
      analogCategory: "transistor",
      partNumber: "BF245B",
      valueLabel: "N-JFET Depletion",
    }
  ),

  /* 4. Thyristors & AC Power Switching — SCR, DIAC, TRIAC */
  SCR: defComp(
    84,
    60,
    "SCR TYN612",
    [
      { name: "A (Anode)", defaultVal: 1 },
      "G (Gate)",
      { name: "K (Reset)", defaultVal: 0 },
    ],
    ["K_OUT", "LATCH"],
    {
      seq: true,
      clockPorts: [1],
      init: { latched: 0 },
      stateOutputs: (st) => [st.latched, st.latched],
      step: (ins, st) => {
        const [A, G, K] = ins;
        if (A === 0 || K === 1) return { latched: 0 };
        if (G === 1 && A === 1 && K === 0) return { latched: 1 };
        return st;
      },
      iconLabel: "SCR",
      analogCategory: "thyristor",
      partNumber: "TYN612 / BT151",
      valueLabel: "Thyristor 600V 12A",
    }
  ),

  DIAC: defComp(
    78,
    48,
    "DIAC DB3",
    ["MT1", { name: "MT2", defaultVal: 0 }],
    ["TRIG_OUT"],
    {
      compute: (ins) => [ins[0] ^ ins[1] ? 1 : 0],
      iconLabel: "DIAC",
      analogCategory: "thyristor",
      partNumber: "DB3 DIAC",
      valueLabel: "V_BO = 32V Sym",
    }
  ),

  TRIAC: defComp(
    84,
    60,
    "TRIAC BT136",
    [
      { name: "MT1 (Line)", defaultVal: 1 },
      "G (Trig)",
      { name: "MT2 (N)", defaultVal: 0 },
    ],
    ["AC_LOAD", "COND"],
    {
      compute: (ins) => {
        const [MT1, G, MT2] = ins;
        const on = G === 1 && (MT1 === 1 || MT2 === 1);
        return [on ? 1 : 0, on ? 1 : 0];
      },
      iconLabel: "TRIAC",
      analogCategory: "thyristor",
      partNumber: "BT136-600E",
      valueLabel: "Bidirectional 600V",
    }
  ),

  /* 5. Linear / Analogue ICs, Optocouplers & Electromechanical */
  OPAMP_741: defComp(
    88,
    64,
    "LM741 OPAMP",
    ["V+ (In+)", "V- (In-)", { name: "VCC+", defaultVal: 1 }],
    ["VOUT"],
    {
      compute: (ins) => {
        const [vp, vn, vcc] = ins;
        return [vcc === 1 && vp > vn ? 1 : 0];
      },
      iconLabel: "LM741",
      analogCategory: "analog_ic",
      partNumber: "UA741CN",
      valueLabel: "Op-Amp Comparator",
    }
  ),

  LM7805: defComp(
    86,
    60,
    "LM7805 REG",
    [
      { name: "VIN (12V)", defaultVal: 1 },
      { name: "GND", defaultVal: 0 },
    ],
    ["VOUT_5V"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "7805",
      analogCategory: "analog_ic",
      partNumber: "LM7805CT",
      valueLabel: "+5.0V 1.5A Linear",
    }
  ),

  REG7805: defComp(
    86,
    60,
    "LM7805 REG",
    [
      { name: "VIN (12V)", defaultVal: 1 },
      { name: "GND", defaultVal: 0 },
    ],
    ["VOUT_5V"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "7805",
      analogCategory: "analog_ic",
      partNumber: "LM7805CT",
      valueLabel: "+5.0V 1.5A Linear",
    }
  ),

  OPTO_PC817: defComp(
    88,
    62,
    "PC817 OPTO",
    ["LED_A", { name: "LED_K", defaultVal: 0 }],
    ["EMIT_OUT", "COLL_INV"],
    {
      compute: (ins) => {
        const on = ins[0] === 1 && ins[1] === 0;
        return [on ? 1 : 0, on ? 0 : 1];
      },
      iconLabel: "PC817",
      analogCategory: "analog_ic",
      partNumber: "PC817C",
      valueLabel: "5kVrms Optocoupler",
    }
  ),

  PC817: defComp(
    88,
    62,
    "PC817 OPTO",
    ["LED_A", { name: "LED_K", defaultVal: 0 }],
    ["EMIT_OUT", "COLL_INV"],
    {
      compute: (ins) => {
        const on = ins[0] === 1 && ins[1] === 0;
        return [on ? 1 : 0, on ? 0 : 1];
      },
      iconLabel: "PC817",
      analogCategory: "analog_ic",
      partNumber: "PC817C",
      valueLabel: "5kVrms Optocoupler",
    }
  ),

  RELAY_SPDT: defComp(
    90,
    64,
    "RELAY SPDT",
    [
      "COIL+",
      { name: "COIL-", defaultVal: 0 },
      { name: "COM", defaultVal: 1 },
    ],
    ["NO", "NC"],
    {
      compute: (ins) => {
        const energized = ins[0] === 1 && ins[1] === 0;
        const com = ins[2];
        return [energized ? com : 0, energized ? 0 : com];
      },
      iconLabel: "RELAY",
      analogCategory: "analog_ic",
      partNumber: "SRD-12VDC-SL",
    }
  ),

  /* NE555 Precision Timer */
  TIMER_555: defComp(
    94,
    78,
    "NE555 TIMER",
    ["TRIG", "THRESH", { name: "RESET", defaultVal: 1 }, { name: "CTRL", defaultVal: 1 }],
    ["OUT", "DISCH"],
    {
      seq: true,
      init: { q: 0 },
      stateOutputs: (st) => [st.q, st.q ^ 1],
      step: (ins, st) => {
        const [trig, thresh, rst] = ins;
        if (!rst) return { q: 0 };
        if (!trig) return { q: 1 };
        if (thresh) return { q: 0 };
        return st;
      },
      iconLabel: "555",
      analogCategory: "analog_ic",
      partNumber: "NE555P",
      valueLabel: "Precision Timer",
    }
  ),

  /* LM393 Dual Comparator */
  LM393: defComp(
    88,
    64,
    "LM393 COMP",
    ["IN+", "IN-", { name: "VCC", defaultVal: 1 }],
    ["OUT"],
    {
      compute: (ins) => [ins[2] === 1 && ins[0] > ins[1] ? 1 : 0],
      iconLabel: "LM393",
      analogCategory: "analog_ic",
      partNumber: "LM393N",
      valueLabel: "Dual Voltage Comparator",
    }
  ),

  /* LM358 Dual Op-Amp */
  LM358: defComp(
    88,
    64,
    "LM358 OPAMP",
    ["IN+", "IN-", { name: "VCC", defaultVal: 1 }],
    ["VOUT"],
    {
      compute: (ins) => [ins[2] === 1 && ins[0] >= ins[1] ? 1 : 0],
      iconLabel: "LM358",
      analogCategory: "analog_ic",
      partNumber: "LM358P",
      valueLabel: "Dual Low-Power Op-Amp",
    }
  ),

  /* LM317 Adjustable Regulator */
  LM317: defComp(
    86,
    60,
    "LM317 REG",
    [{ name: "VIN", defaultVal: 1 }, { name: "ADJ", defaultVal: 0 }],
    ["VOUT"],
    {
      compute: (ins) => [ins[0] === 1 ? 1 : 0],
      iconLabel: "LM317",
      analogCategory: "analog_ic",
      partNumber: "LM317T",
      valueLabel: "1.25V-37V Adj Reg",
    }
  ),

  /* Power Sources & Ground */
  GND: defComp(
    70,
    50,
    "GND (0V)",
    ["GND"],
    ["0"],
    {
      compute: () => [0],
      iconLabel: "GND",
      analogCategory: "passive",
      partNumber: "Earth GND",
      valueLabel: "0.0V Earth Ground",
    }
  ),

  VCC_5V: defComp(
    70,
    50,
    "+5V VCC",
    [],
    ["+5V"],
    {
      compute: () => [1],
      iconLabel: "+5V",
      analogCategory: "passive",
      partNumber: "5V Rail",
      valueLabel: "+5.0V DC Supply",
    }
  ),

  VCC: defComp(
    70,
    50,
    "+5V VCC",
    [],
    ["+5V"],
    {
      compute: () => [1],
      iconLabel: "+5V",
      analogCategory: "passive",
      partNumber: "5V Rail",
      valueLabel: "+5.0V DC Supply",
    }
  ),

  VCC_12V: defComp(
    70,
    50,
    "+12V VDD",
    [],
    ["+12V"],
    {
      compute: () => [1],
      iconLabel: "+12V",
      analogCategory: "passive",
      partNumber: "12V Rail",
      valueLabel: "+12.0V DC Supply",
    }
  ),

  DC_VOLTAGE: defComp(
    78,
    50,
    "DC SOURCE",
    [],
    ["+V", "-GND"],
    {
      compute: () => [1, 0],
      iconLabel: "+V DC",
      analogCategory: "passive",
      partNumber: "DC Power Supply",
      valueLabel: "5.0V DC Source",
    }
  ),

  DC_VOLTAGE_SOURCE: defComp(
    78,
    50,
    "DC SOURCE",
    [],
    ["+V", "-GND"],
    {
      compute: () => [1, 0],
      iconLabel: "+V DC",
      analogCategory: "passive",
      partNumber: "DC Power Supply",
      valueLabel: "5.0V DC Source",
    }
  ),

  BATTERY: defComp(
    78,
    50,
    "BATTERY 9V",
    [],
    ["+POS", "-NEG"],
    {
      compute: () => [1, 0],
      iconLabel: "9V BAT",
      analogCategory: "passive",
      partNumber: "9V Cell",
      valueLabel: "9.0V DC Cell",
    }
  ),

  CLOCK: defComp(
    70,
    50,
    "CLOCK GEN",
    [],
    ["CLK"],
    {
      seq: true,
      clockPorts: [],
      init: { clk: 0 },
      stateOutputs: (st) => [st.clk ? 1 : 0],
      step: (_ins, st) => st,
      iconLabel: "CLK",
      analogCategory: "passive",
      partNumber: "TTL Clock",
      valueLabel: "1.0 Hz Square",
    }
  ),

  AC_SINE: defComp(
    78,
    50,
    "AC SINE GEN",
    [],
    ["PHASE", "NEUTRAL_GND"],
    {
      seq: true,
      init: { t: 0 },
      stateOutputs: (st) => [st.t & 1, 0],
      step: (ins, st) => ({ t: (st.t + 1) & 0xffff }),
      iconLabel: "~ AC",
      analogCategory: "passive",
      partNumber: "Sine Generator",
      valueLabel: "5.0Vpp 1.0 kHz",
    }
  ),

  AC_VOLTAGE_SOURCE: defComp(
    78,
    50,
    "AC SINE GEN",
    [],
    ["PHASE", "NEUTRAL_GND"],
    {
      seq: true,
      init: { t: 0 },
      stateOutputs: (st) => [st.t & 1, 0],
      step: (ins, st) => ({ t: (st.t + 1) & 0xffff }),
      iconLabel: "~ AC",
      analogCategory: "passive",
      partNumber: "Sine Generator",
      valueLabel: "5.0Vpp 1.0 kHz",
    }
  ),

  /* Interactive Switches */
  PUSHBUTTON: defComp(
    78,
    50,
    "PUSH BUTTON",
    ["IN", { name: "PRESS", defaultVal: 0 }],
    ["OUT"],
    {
      compute: (ins) => [ins[0] && ins[1] ? 1 : 0],
      iconLabel: "PB",
      analogCategory: "passive",
      partNumber: "Tactile PB",
      valueLabel: "Normally Open",
    }
  ),

  SWITCH_SPST: defComp(
    78,
    50,
    "SPST SWITCH",
    ["IN", { name: "CLOSED", defaultVal: 1 }],
    ["OUT"],
    {
      compute: (ins) => [ins[0] && ins[1] ? 1 : 0],
      iconLabel: "SPST",
      analogCategory: "passive",
      partNumber: "Slide Switch",
      valueLabel: "1-Pole 1-Throw",
    }
  ),

  /* Measuring Equipment & Output Meters */
  VOLTMETER: defComp(
    82,
    56,
    "VOLTMETER",
    ["V+ (Red)", "V- (COM)"],
    [],
    {
      compute: () => [],
      iconLabel: "[ V ]",
      analogCategory: "analog_ic",
      partNumber: "XMM-V (10MΩ)",
      valueLabel: "DC Voltmeter (Parallel)",
    }
  ),

  AMMETER: defComp(
    82,
    56,
    "AMMETER",
    ["I_IN (+)"],
    ["I_OUT (-)"],
    {
      compute: (ins) => [ins[0] ? 1 : 0],
      iconLabel: "[ A ]",
      analogCategory: "analog_ic",
      partNumber: "XMM-A (~0Ω)",
      valueLabel: "In-Line Ammeter (Series)",
    }
  ),

  OHMMETER: defComp(
    82,
    56,
    "OHMMETER",
    ["Ω+ (Red)", "Ω- (Black)"],
    [],
    {
      compute: () => [],
      iconLabel: "[ Ω ]",
      analogCategory: "analog_ic",
      partNumber: "XMM-Ω (Auto-Range)",
      valueLabel: "Precision Ohmmeter (De-energized)",
    }
  ),

  POWER_METER: defComp(
    90,
    64,
    "POWER METER",
    ["V+ (Red)", "V- (COM)", "I_IN (+)"],
    ["I_OUT (-)"],
    {
      compute: () => [0],
      iconLabel: "[ W ]",
      analogCategory: "analog_ic",
      partNumber: "XWM-Watt (P=V·I)",
      valueLabel: "Digital Wattmeter (Dual-Coil)",
    }
  ),

  WATTMETER: defComp(
    90,
    64,
    "WATTMETER",
    ["V+ (Red)", "V- (COM)", "I_IN (+)"],
    ["I_OUT (-)"],
    {
      compute: () => [0],
      iconLabel: "[ W ]",
      analogCategory: "analog_ic",
      partNumber: "XWM-Watt (P=V·I)",
      valueLabel: "Digital Wattmeter (Dual-Coil)",
    }
  ),

  DMM_PROBE: defComp(
    82,
    56,
    "DMM PROBE",
    ["RED (+)", "BLACK (-)"],
    ["DATA"],
    {
      compute: (ins) => [ins[0] && !ins[1] ? 1 : 0],
      iconLabel: "DMM",
      analogCategory: "analog_ic",
      partNumber: "Multimeter Lead",
      valueLabel: "Precision DMM Probe",
    }
  ),

  BUZZER: defComp(
    78,
    48,
    "PIEZO BUZZER",
    ["POS (+)", { name: "NEG (-)", defaultVal: 0 }],
    ["SOUND"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "BUZZ",
      analogCategory: "passive",
      partNumber: "Piezo Transducer",
      valueLabel: "2.4 kHz Beep",
    }
  ),

  LED_GREEN: defComp(
    78,
    48,
    "LED GREEN",
    ["A (Anode)", { name: "K (Cathode)", defaultVal: 0 }],
    ["LIGHT"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "LED-G",
      analogCategory: "diode",
      partNumber: "5mm Green LED",
      valueLabel: "Vf = 2.1V",
    }
  ),

  LED_BLUE: defComp(
    78,
    48,
    "LED BLUE",
    ["A (Anode)", { name: "K (Cathode)", defaultVal: 0 }],
    ["LIGHT"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0],
      iconLabel: "LED-B",
      analogCategory: "diode",
      partNumber: "5mm Blue LED",
      valueLabel: "Vf = 3.0V",
    }
  ),

  MOSFET_P: defComp(
    84,
    60,
    "P-MOSFET",
    ["GATE", "SOURCE", { name: "DRAIN", defaultVal: 1 }],
    ["V_OUT"],
    {
      compute: (ins) => [ins[0] === 0 && ins[1] === 1 ? 1 : 0],
      iconLabel: "P-MOS",
      analogCategory: "transistor",
      partNumber: "IRF9540N",
      valueLabel: "P-Channel Power MOS",
    }
  ),

  /* 6. Microcontrollers, ESP32 IoT, Embedded Digital Processors & Mixed-Signal ICs */
  ESP32: defComp(
    122,
    142,
    "ESP32-WROOM",
    [
      { name: "EN (3V3)", defaultVal: 1 },
      "GPIO34_IN",
      "GPIO35_IN",
      "GPIO32_ADC",
      "GPIO33_ADC",
      "RXD0",
      { name: "BOOT_0", defaultVal: 1 },
    ],
    ["GPIO2_LED", "GPIO4_OUT", "GPIO18_SCK", "GPIO19_MISO", "GPIO23_MOSI", "TXD0", "DAC1_25"],
    {
      seq: true,
      clockPorts: [0],
      init: { boot: 1, tick: 0 },
      stateOutputs: (st) => [
        st.tick & 1, // GPIO2 Built-in blinking indicator
        (st.tick >> 1) & 1,
        1,
        0,
        1,
        1,
        1,
      ],
      step: (ins, st) => {
        const en = ins[0];
        if (en === 0) return { boot: 0, tick: 0 };
        return { boot: 1, tick: ((st.tick ?? 0) + 1) & 0xff };
      },
      iconLabel: "ESP32",
      partNumber: "ESP32-WROOM-32D",
      valueLabel: "Dual-Core 240MHz Wi-Fi/BLE",
    }
  ),

  ESP32_S3: defComp(
    124,
    144,
    "ESP32-S3 AI",
    [
      { name: "EN (3V3)", defaultVal: 1 },
      "GPIO1_ADC",
      "GPIO2_ADC",
      "GPIO19_D-",
      "GPIO20_D+",
      "RXD0",
      { name: "BOOT_0", defaultVal: 1 },
    ],
    ["GPIO38_RGB", "GPIO4_OUT", "GPIO12_SCK", "GPIO13_MOSI", "TXD0", "GPIO48_STAT", "PWM_CH0"],
    {
      seq: true,
      clockPorts: [0],
      init: { boot: 1, tick: 0 },
      stateOutputs: (st) => [
        st.tick & 1, // Built-in RGB status blink
        (st.tick >> 1) & 1,
        1,
        1,
        1,
        (st.tick >> 2) & 1,
        1,
      ],
      step: (ins, st) => {
        const en = ins[0];
        if (en === 0) return { boot: 0, tick: 0 };
        return { boot: 1, tick: ((st.tick ?? 0) + 1) & 0xff };
      },
      iconLabel: "ESP32-S3",
      partNumber: "ESP32-S3-WROOM-1",
      valueLabel: "Dual-Core LX7 AI/Vector USB-OTG",
    }
  ),

  ESP32_C3: defComp(
    120,
    136,
    "ESP32-C3 RISC-V",
    [
      { name: "EN (3V3)", defaultVal: 1 },
      "GPIO0_ADC",
      "GPIO1_ADC",
      "GPIO2_STRAP",
      "RXD0",
      { name: "BOOT_9", defaultVal: 1 },
    ],
    ["GPIO8_LED", "GPIO3_OUT", "GPIO4_SCK", "GPIO5_MISO", "GPIO6_MOSI", "GPIO7_SS", "TXD0"],
    {
      seq: true,
      clockPorts: [0],
      init: { boot: 1, tick: 0 },
      stateOutputs: (st) => [
        st.tick & 1, // GPIO8 Built-in LED
        (st.tick >> 1) & 1,
        1,
        0,
        1,
        1,
        1,
      ],
      step: (ins, st) => {
        const en = ins[0];
        if (en === 0) return { boot: 0, tick: 0 };
        return { boot: 1, tick: ((st.tick ?? 0) + 1) & 0xff };
      },
      iconLabel: "ESP32-C3",
      partNumber: "ESP32-C3-Mini-1",
      valueLabel: "32-bit RISC-V 160MHz Low-Power",
    }
  ),

  ARDUINO_NANO: defComp(
    120,
    128,
    "ATmega328P",
    [
      { name: "RESET̅", defaultVal: 1 },
      "D2_IN",
      "D3_PWM",
      "A0_ADC",
      "RX",
    ],
    ["D13_LED", "D9_PWM", "D10_SS", "TX"],
    {
      seq: true,
      clockPorts: [0],
      init: { count: 0 },
      stateOutputs: (st) => [
        st.count & 1,
        (st.count >> 1) & 1,
        1,
        1,
      ],
      step: (ins, st) => {
        if (ins[0] === 0) return { count: 0 };
        return { count: ((st.count ?? 0) + 1) & 0x7f };
      },
      iconLabel: "ATmega",
      partNumber: "ATmega328P-PU",
      valueLabel: "16MHz AVR 32KB Flash",
    }
  ),

  ADC0804: defComp(
    112,
    136,
    "ADC0804 8-Bit",
    [
      "VIN+",
      { name: "CS̅", defaultVal: 0 },
      { name: "RD̅", defaultVal: 0 },
      { name: "WR̅", defaultVal: 0 },
      { name: "CLK_IN", defaultVal: 1 },
    ],
    ["DB7_MSB", "DB6", "DB5", "DB4", "DB3", "DB2", "DB1", "DB0_LSB", "INTR̅"],
    {
      compute: (ins) => {
        const [vin, cs, rd] = ins;
        if (cs === 1 || rd === 1) return [0, 0, 0, 0, 0, 0, 0, 0, 1];
        // Quantize analog voltage input (0 or 1 converted to full scale digital byte)
        const byteVal = vin ? 0xff : 0x00;
        return [
          (byteVal >> 7) & 1,
          (byteVal >> 6) & 1,
          (byteVal >> 5) & 1,
          (byteVal >> 4) & 1,
          (byteVal >> 3) & 1,
          (byteVal >> 2) & 1,
          (byteVal >> 1) & 1,
          byteVal & 1,
          0, // INTR conversion complete (active low)
        ];
      },
      iconLabel: "ADC0804",
      partNumber: "ADC0804LCN",
      valueLabel: "8-Bit Successive Approx",
    }
  ),

  DAC0808: defComp(
    112,
    136,
    "DAC0808 8-Bit",
    [
      "A1_MSB",
      "A2",
      "A3",
      "A4",
      "A5",
      "A6",
      "A7",
      "A8_LSB",
      { name: "VREF+", defaultVal: 1 },
    ],
    ["IOUT_ANALOG", "COMP_OUT"],
    {
      compute: (ins) => {
        const val =
          ((ins[0] ?? 0) << 7) |
          ((ins[1] ?? 0) << 6) |
          ((ins[2] ?? 0) << 5) |
          ((ins[3] ?? 0) << 4) |
          ((ins[4] ?? 0) << 3) |
          ((ins[5] ?? 0) << 2) |
          ((ins[6] ?? 0) << 1) |
          (ins[7] ?? 0);
        return [val > 0 ? 1 : 0, val >= 128 ? 1 : 0];
      },
      iconLabel: "DAC0808",
      partNumber: "DAC0808LCN",
      valueLabel: "8-Bit Multiplying D/A",
    }
  ),

  SENSOR_DHT22: defComp(
    96,
    64,
    "DHT22 SENSOR",
    [{ name: "VCC_3V3", defaultVal: 1 }, { name: "GND", defaultVal: 0 }],
    ["DATA_OUT", "READY"],
    {
      compute: (ins) => [ins[0] === 1 && ins[1] === 0 ? 1 : 0, 1],
      iconLabel: "DHT22",
      partNumber: "DHT22 / AM2302",
      valueLabel: "Temp & Humidity Digital",
    }
  ),
};

export const LEARN_GATES = [
  {
    type: "AND",
    name: "AND Gate",
    ic: "74LS08",
    expr: "Y = A · B",
    minterms: "∑m(3)",
    desc: "Output is HIGH (1) only when every input is HIGH. Equivalent to switches wired in series.",
  },
  {
    type: "OR",
    name: "OR Gate",
    ic: "74LS32",
    expr: "Y = A + B",
    minterms: "∑m(1, 2, 3)",
    desc: "Output is HIGH (1) when at least one input is HIGH. Equivalent to switches wired in parallel.",
  },
  {
    type: "NOT",
    name: "NOT Gate (Inverter)",
    ic: "74LS04",
    expr: "Y = Ā",
    minterms: "∑m(0)",
    desc: "Complements the input logic state. A logic 0 becomes 1 and a logic 1 becomes 0.",
  },
  {
    type: "NAND",
    name: "NAND Gate",
    ic: "74LS00",
    expr: "Y = (A · B)′",
    minterms: "∑m(0, 1, 2)",
    desc: "AND followed by an inverter. LOW only when all inputs are HIGH. Universally complete gate.",
  },
  {
    type: "NOR",
    name: "NOR Gate",
    ic: "74LS02",
    expr: "Y = (A + B)′",
    minterms: "∑m(0)",
    desc: "OR followed by an inverter. HIGH only when all inputs are LOW. Universally complete gate.",
  },
  {
    type: "XOR",
    name: "XOR Gate",
    ic: "74LS86",
    expr: "Y = A ⊕ B",
    minterms: "∑m(1, 2)",
    desc: "Exclusive-OR: Output is HIGH when inputs differ. Forms the sum bit of binary adders and parity generators.",
  },
  {
    type: "XNOR",
    name: "XNOR Gate",
    ic: "74LS266",
    expr: "Y = (A ⊕ B)′",
    minterms: "∑m(0, 3)",
    desc: "Exclusive-NOR: Output is HIGH when both inputs are identical. Acts as a 1-bit equality comparator.",
  },
];

export interface PresetNodeDef {
  type: string;
  x: number;
  y: number;
  value?: number;
  label?: string;
  analogParams?: {
    resistanceOhms?: number;
    capacitanceUf?: number;
    inductanceMh?: number;
    dcVoltageV?: number;
    acVoltageV?: number;
    frequencyHz?: number;
    userValue?: number;
    userUnit?: string;
    formattedValue?: string;
  };
}

export type PresetWireDef = [number, number, number, number, ("in" | "out")?, ("in" | "out")?];

export const CIRCUIT_PRESETS: Record<
  string,
  {
    category: string;
    description: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }
> = {
  "Half Adder": {
    category: "Combinational",
    description:
      "Adds two 1-bit binary numbers A and B, producing Sum (A ⊕ B) and Carry (A · B).",
    nodes: [
      { type: "INPUT", x: 80, y: 80, value: 1, label: "A" },
      { type: "INPUT", x: 80, y: 220, value: 0, label: "B" },
      { type: "XOR", x: 320, y: 70 },
      { type: "AND", x: 320, y: 220 },
      { type: "OUTPUT", x: 560, y: 95, label: "Sum" },
      { type: "OUTPUT", x: 560, y: 245, label: "Carry" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
    ],
  },
  "Full Adder": {
    category: "Combinational",
    description:
      "Adds A, B, and Carry-In (Cin) using two cascaded XOR gates and carry-merge logic.",
    nodes: [
      { type: "INPUT", x: 40, y: 40, value: 1, label: "A" },
      { type: "INPUT", x: 40, y: 180, value: 1, label: "B" },
      { type: "INPUT", x: 40, y: 350, value: 0, label: "Cin" },
      { type: "XOR", x: 220, y: 60 },
      { type: "XOR", x: 430, y: 130 },
      { type: "AND", x: 220, y: 240 },
      { type: "AND", x: 430, y: 320 },
      { type: "OR", x: 640, y: 260 },
      { type: "OUTPUT", x: 660, y: 130, label: "Sum" },
      { type: "OUTPUT", x: 830, y: 260, label: "Cout" },
    ],
    wires: [
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [3, 0, 4, 0],
      [2, 0, 4, 1],
      [0, 0, 5, 0],
      [1, 0, 5, 1],
      [3, 0, 6, 0],
      [2, 0, 6, 1],
      [5, 0, 7, 0],
      [6, 0, 7, 1],
      [4, 0, 8, 0],
      [7, 0, 9, 0],
    ],
  },
  "4:1 Multiplexer (MUX4)": {
    category: "Combinational",
    description:
      "Routes one of four data inputs (I0–I3) to output Y based on 2-bit select lines (S1, S0).",
    nodes: [
      { type: "INPUT", x: 50, y: 30, value: 1, label: "I0" },
      { type: "INPUT", x: 50, y: 100, value: 0, label: "I1" },
      { type: "INPUT", x: 50, y: 170, value: 1, label: "I2" },
      { type: "INPUT", x: 50, y: 240, value: 0, label: "I3" },
      { type: "INPUT", x: 50, y: 330, value: 0, label: "S0" },
      { type: "INPUT", x: 50, y: 400, value: 0, label: "S1" },
      { type: "MUX4", x: 300, y: 120 },
      { type: "OUTPUT", x: 570, y: 180, label: "Y" },
    ],
    wires: [
      [0, 0, 6, 0],
      [1, 0, 6, 1],
      [2, 0, 6, 2],
      [3, 0, 6, 3],
      [4, 0, 6, 4],
      [5, 0, 6, 5],
      [6, 0, 7, 0],
    ],
  },
  "SR Latch (Cross-Coupled NOR)": {
    category: "Sequential",
    description:
      "Bistable memory cell built from two cross-coupled NOR gates (R=top, S=bottom).",
    nodes: [
      { type: "INPUT", x: 60, y: 70, value: 0, label: "R" },
      { type: "INPUT", x: 60, y: 350, value: 1, label: "S" },
      { type: "NOR", x: 320, y: 80 },
      { type: "NOR", x: 320, y: 300 },
      { type: "OUTPUT", x: 620, y: 80, label: "Q" },
      { type: "OUTPUT", x: 620, y: 300, label: "Q̅" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 3, 0],
      [2, 0, 3, 1],
      [3, 0, 2, 1],
      [2, 0, 4, 0],
      [3, 0, 5, 0],
    ],
  },
  "D Flip-Flop": {
    category: "Sequential",
    description:
      "Edge-triggered D Flip-Flop: captures input D on the rising edge of CLK (use Step Clock or Auto Clock).",
    nodes: [
      { type: "INPUT", x: 60, y: 100, value: 1, label: "D" },
      { type: "INPUT", x: 60, y: 240, value: 0, label: "CLK" },
      { type: "DFF", x: 300, y: 120 },
      { type: "OUTPUT", x: 560, y: 120, label: "Q" },
      { type: "OUTPUT", x: 560, y: 200, label: "Q̅" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [2, 1, 4, 0],
    ],
  },
  "JK Flip-Flop": {
    category: "Sequential",
    description:
      "Universal flip-flop: J=K=0 holds, J=1/K=0 sets, J=0/K=1 resets, J=K=1 toggles on rising CLK.",
    nodes: [
      { type: "INPUT", x: 50, y: 60, value: 1, label: "J" },
      { type: "INPUT", x: 50, y: 180, value: 1, label: "K" },
      { type: "INPUT", x: 50, y: 300, value: 0, label: "CLK" },
      { type: "JKFF", x: 300, y: 120 },
      { type: "OUTPUT", x: 560, y: 120, label: "Q" },
      { type: "OUTPUT", x: 560, y: 200, label: "Q̅" },
    ],
    wires: [
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [2, 0, 3, 2],
      [3, 0, 4, 0],
      [3, 1, 5, 0],
    ],
  },
  "Dual D FF (7474)": {
    category: "MSI & Counters",
    description:
      "7474 Dual D Flip-Flop IC with active-low asynchronous Preset and Clear inputs.",
    nodes: [
      { type: "INPUT", x: 40, y: 40, value: 1, label: "D1" },
      { type: "INPUT", x: 40, y: 120, value: 0, label: "CLK1" },
      { type: "INPUT", x: 40, y: 200, value: 1, label: "PRE1̅" },
      { type: "INPUT", x: 40, y: 280, value: 1, label: "CLR1̅" },
      { type: "INPUT", x: 40, y: 360, value: 1, label: "D2" },
      { type: "INPUT", x: 40, y: 440, value: 0, label: "CLK2" },
      { type: "7474", x: 300, y: 90 },
      { type: "OUTPUT", x: 600, y: 100, label: "Q1" },
      { type: "OUTPUT", x: 600, y: 170, label: "Q̅1" },
      { type: "OUTPUT", x: 600, y: 250, label: "Q2" },
      { type: "OUTPUT", x: 600, y: 320, label: "Q̅2" },
    ],
    wires: [
      [0, 0, 6, 0],
      [1, 0, 6, 1],
      [2, 0, 6, 2],
      [3, 0, 6, 3],
      [4, 0, 6, 4],
      [5, 0, 6, 5],
      [6, 0, 7, 0],
      [6, 1, 8, 0],
      [6, 2, 9, 0],
      [6, 3, 10, 0],
    ],
  },
  "4-Bit Counter (74193)": {
    category: "MSI & Counters",
    description:
      "74193 Synchronous 4-bit Up/Down Binary Counter. Click Step Clock or Auto Clock to count.",
    nodes: [
      { type: "INPUT", x: 40, y: 80, value: 0, label: "UP_CLK" },
      { type: "INPUT", x: 40, y: 180, value: 0, label: "DN_CLK" },
      { type: "INPUT", x: 40, y: 280, value: 0, label: "CLR" },
      { type: "INPUT", x: 40, y: 380, value: 1, label: "LOAD̅" },
      { type: "74193", x: 310, y: 90 },
      { type: "OUTPUT", x: 630, y: 60, label: "Q0" },
      { type: "OUTPUT", x: 630, y: 130, label: "Q1" },
      { type: "OUTPUT", x: 630, y: 200, label: "Q2" },
      { type: "OUTPUT", x: 630, y: 270, label: "Q3" },
      { type: "OUTPUT", x: 630, y: 340, label: "TCU" },
      { type: "OUTPUT", x: 630, y: 410, label: "TCD" },
    ],
    wires: [
      [0, 0, 4, 4],
      [1, 0, 4, 5],
      [2, 0, 4, 6],
      [3, 0, 4, 7],
      [4, 0, 5, 0],
      [4, 1, 6, 0],
      [4, 2, 7, 0],
      [4, 3, 8, 0],
      [4, 4, 9, 0],
      [4, 5, 10, 0],
    ],
  },
  "3-to-8 Decoder (74138)": {
    category: "MSI & Counters",
    description:
      "74138 3-to-8 Line Decoder with active-low outputs Y0̅–Y7̅ and enable gating (G1=1, G2A̅=0, G2B̅=0).",
    nodes: [
      { type: "INPUT", x: 40, y: 50, value: 1, label: "A" },
      { type: "INPUT", x: 40, y: 130, value: 0, label: "B" },
      { type: "INPUT", x: 40, y: 210, value: 1, label: "C" },
      { type: "INPUT", x: 40, y: 290, value: 1, label: "G1" },
      { type: "INPUT", x: 40, y: 370, value: 0, label: "G2A̅" },
      { type: "INPUT", x: 40, y: 450, value: 0, label: "G2B̅" },
      { type: "74138", x: 310, y: 90 },
      { type: "OUTPUT", x: 630, y: 40, label: "Y0̅" },
      { type: "OUTPUT", x: 630, y: 100, label: "Y1̅" },
      { type: "OUTPUT", x: 630, y: 160, label: "Y2̅" },
      { type: "OUTPUT", x: 630, y: 220, label: "Y3̅" },
      { type: "OUTPUT", x: 630, y: 280, label: "Y4̅" },
      { type: "OUTPUT", x: 630, y: 340, label: "Y5̅" },
      { type: "OUTPUT", x: 630, y: 400, label: "Y6̅" },
      { type: "OUTPUT", x: 630, y: 460, label: "Y7̅" },
    ],
    wires: [
      [0, 0, 6, 0],
      [1, 0, 6, 1],
      [2, 0, 6, 2],
      [3, 0, 6, 3],
      [4, 0, 6, 4],
      [5, 0, 6, 5],
      [6, 0, 7, 0],
      [6, 1, 8, 0],
      [6, 2, 9, 0],
      [6, 3, 10, 0],
      [6, 4, 11, 0],
      [6, 5, 12, 0],
      [6, 6, 13, 0],
      [6, 7, 14, 0],
    ],
  },
  "7-Segment Display (7447)": {
    category: "MSI & Counters",
    description:
      "BCD-to-7-Segment Decoder (7447) driving a 7-Segment LED display. Toggle inputs A–D to form digits 0–9.",
    nodes: [
      { type: "INPUT", x: 40, y: 50, value: 1, label: "A(1)" },
      { type: "INPUT", x: 40, y: 130, value: 0, label: "B(2)" },
      { type: "INPUT", x: 40, y: 210, value: 1, label: "C(4)" },
      { type: "INPUT", x: 40, y: 290, value: 0, label: "D(8)" },
      { type: "INPUT", x: 40, y: 370, value: 0, label: "LT" },
      { type: "INPUT", x: 40, y: 450, value: 0, label: "BI" },
      { type: "7447", x: 290, y: 110 },
      { type: "7SEG", x: 580, y: 120 },
    ],
    wires: [
      [0, 0, 6, 0],
      [1, 0, 6, 1],
      [2, 0, 6, 2],
      [3, 0, 6, 3],
      [4, 0, 6, 4],
      [5, 0, 6, 5],
      [6, 0, 7, 0],
      [6, 1, 7, 1],
      [6, 2, 7, 2],
      [6, 3, 7, 3],
      [6, 4, 7, 4],
      [6, 5, 7, 5],
      [6, 6, 7, 6],
    ],
  },
  "Counter + 7-Seg Decoder": {
    category: "MSI & Counters",
    description:
      "74193 4-bit counter wired into a 7447 BCD decoder, 7-Segment display, and binary LED outputs Q0–Q3.",
    nodes: [
      { type: "INPUT", x: 30, y: 140, value: 0, label: "UP_CLK" },
      { type: "INPUT", x: 30, y: 240, value: 0, label: "CLR" },
      { type: "INPUT", x: 30, y: 340, value: 1, label: "LOAD̅" },
      { type: "74193", x: 200, y: 100 },
      { type: "7447", x: 450, y: 110 },
      { type: "7SEG", x: 690, y: 100 },
      { type: "OUTPUT", x: 690, y: 300, label: "Q0" },
      { type: "OUTPUT", x: 690, y: 365, label: "Q1" },
      { type: "OUTPUT", x: 690, y: 430, label: "Q2" },
      { type: "OUTPUT", x: 690, y: 495, label: "Q3" },
    ],
    wires: [
      [0, 0, 3, 4],
      [1, 0, 3, 6],
      [2, 0, 3, 7],
      [3, 0, 4, 0],
      [3, 1, 4, 1],
      [3, 2, 4, 2],
      [3, 3, 4, 3],
      [4, 0, 5, 0],
      [4, 1, 5, 1],
      [4, 2, 5, 2],
      [4, 3, 5, 3],
      [4, 4, 5, 4],
      [4, 5, 5, 5],
      [4, 6, 5, 6],
      [3, 0, 6, 0],
      [3, 1, 7, 0],
      [3, 2, 8, 0],
      [3, 3, 9, 0],
    ],
  },
  "BC547 NPN Transistor Switch & Inverter": {
    category: "Analogue & Transistors",
    description:
      "Base drive through a 1kΩ Resistor (RES) into a BC547 NPN BJT driving both an Emitter-Follower LED load and an Inverted Collector output with a 1N4007A protection diode.",
    nodes: [
      { type: "INPUT", x: 40, y: 100, value: 1, label: "V_BASE" },
      { type: "INPUT", x: 40, y: 240, value: 1, label: "VCC_12V" },
      { type: "RES", x: 180, y: 90, label: "R_B 1kΩ" },
      { type: "BC547", x: 360, y: 120 },
      { type: "DIODE_1N4007", x: 560, y: 70 },
      { type: "LED_RED", x: 560, y: 190 },
      { type: "OUTPUT", x: 750, y: 80, label: "EMITTER_HI" },
      { type: "OUTPUT", x: 750, y: 200, label: "COLL_INV" },
    ],
    wires: [
      [0, 0, 2, 0],
      [2, 0, 3, 0],
      [1, 0, 3, 1],
      [3, 0, 4, 0],
      [4, 0, 6, 0],
      [3, 1, 5, 0],
      [5, 0, 7, 0],
    ],
  },
  "1N4007A Rectifier + Polar Cap + Zener 5.1V Regulator": {
    category: "Analogue & Power",
    description:
      "AC/DC Power Supply Chain: 1N4007A silicon rectifier diode feeds a 100µF Polarized Electrolytic Capacitor, series current-limiting Resistor, and 1N4733A 5.1V Zener Diode shunt regulator.",
    nodes: [
      { type: "INPUT", x: 40, y: 120, value: 1, label: "AC_LINE" },
      { type: "INPUT", x: 40, y: 260, value: 0, label: "REV_BLK" },
      { type: "DIODE_1N4007", x: 180, y: 110 },
      { type: "CAP_POL", x: 350, y: 110 },
      { type: "RES", x: 520, y: 115 },
      { type: "ZENER", x: 670, y: 110 },
      { type: "OUTPUT", x: 840, y: 100, label: "VZ_5.1V" },
      { type: "OUTPUT", x: 840, y: 190, label: "IZ_SHUNT" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [5, 1, 7, 0],
    ],
  },
  "SCR Latch & DIAC-TRIAC AC Power Controller": {
    category: "Power Thyristors",
    description:
      "Top branch: TYN612 SCR Thyristor latches ON when Gate G=1 and stays latched even after G=0 until K_RESET=1. Bottom branch: DB3 DIAC triggers a BT136 TRIAC AC load switch.",
    nodes: [
      { type: "INPUT", x: 40, y: 60, value: 1, label: "ANODE_VCC" },
      { type: "INPUT", x: 40, y: 145, value: 1, label: "SCR_GATE" },
      { type: "INPUT", x: 40, y: 230, value: 0, label: "K_RESET" },
      { type: "SCR", x: 260, y: 95 },
      { type: "OUTPUT", x: 520, y: 95, label: "SCR_LATCH" },
      { type: "INPUT", x: 40, y: 345, value: 1, label: "AC_PHASE" },
      { type: "CAP_NP", x: 180, y: 335 },
      { type: "DIAC", x: 340, y: 335 },
      { type: "TRIAC", x: 510, y: 325 },
      { type: "OUTPUT", x: 710, y: 335, label: "TRIAC_LOAD" },
    ],
    wires: [
      [0, 0, 3, 0],
      [1, 0, 3, 1],
      [2, 0, 3, 2],
      [3, 0, 4, 0],
      [5, 0, 6, 0],
      [6, 0, 7, 0],
      [7, 0, 8, 1],
      [5, 0, 8, 0],
      [8, 0, 9, 0],
    ],
  },
  "LM741 Op-Amp Comparator & PC817 Opto-Relay Driver": {
    category: "Analogue & Linear ICs",
    description:
      "LM741 Operational Amplifier compares V+ against V-, driving a PC817 Optocoupler, BC547 NPN driver, and an SPDT Electromechanical Relay (NO / NC contacts).",
    nodes: [
      { type: "INPUT", x: 40, y: 80, value: 1, label: "V_IN+" },
      { type: "INPUT", x: 40, y: 180, value: 0, label: "V_REF-" },
      { type: "OPAMP_741", x: 200, y: 100 },
      { type: "OPTO_PC817", x: 380, y: 100 },
      { type: "BC547", x: 550, y: 100 },
      { type: "RELAY_SPDT", x: 720, y: 100 },
      { type: "OUTPUT", x: 890, y: 95, label: "RELAY_NO" },
      { type: "OUTPUT", x: 890, y: 185, label: "RELAY_NC" },
    ],
    wires: [
      [0, 0, 2, 0],
      [1, 0, 2, 1],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [4, 0, 5, 0],
      [5, 0, 6, 0],
      [5, 1, 7, 0],
    ],
  },
  "Half-Wave Diode Rectifier with Load": {
    category: "Analogue & Power",
    description:
      "Standard textbook single-phase Half-Wave Silicon Rectifier: 5.0Vpp sinusoidal AC input feeds a 1N4007A diode and 1kΩ resistive load to ground. Deploy 4 oscilloscope channels across the input, diode cathode, and load to observe positive conduction and reverse zero-blocking.",
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC 5Vpp 50Hz" },
      { type: "DIODE_1N4007", x: 260, y: 140, label: "D1 1N4007A" },
      { type: "RES", x: 480, y: 140, label: "R_LOAD 1kΩ" },
      { type: "GND", x: 480, y: 280, label: "GND" },
      { type: "OUTPUT", x: 680, y: 140, label: "V_RECTIFIED" },
    ],
    wires: [
      [0, 0, 1, 0],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [0, 1, 3, 0],
      [1, 0, 4, 0],
    ],
  },
  "Full-Wave Bridge Rectifier with Filter": {
    category: "Analogue & Power",
    description:
      "Full-wave bridge rectifier using integrated silicon diode bridge, electrolytic filter capacitor, and 1kΩ load resistor, showing full-wave conduction (Vout = |Vin| - 1.4V) and DC ripple smoothing.",
    nodes: [
      { type: "AC_SINE", x: 60, y: 160, label: "AC 12Vpp 50Hz" },
      { type: "BRIDGE_RECT", x: 260, y: 130, label: "W04M Bridge" },
      { type: "CAP_POL", x: 460, y: 130, label: "C_FILTER 47µF" },
      { type: "RES", x: 620, y: 130, label: "R_LOAD 1kΩ" },
      { type: "GND", x: 460, y: 280, label: "GND" },
      { type: "OUTPUT", x: 780, y: 130, label: "V_DC_OUT" },
    ],
    wires: [
      [0, 0, 1, 0],
      [0, 1, 1, 1],
      [1, 0, 2, 0],
      [2, 0, 3, 0],
      [3, 0, 4, 0],
      [1, 1, 4, 0],
      [2, 0, 5, 0],
    ],
  },
};

