import { COMP_SPECS, GATE_SPECS } from "../data/logicSpecs";
import type { CircuitNode, CircuitWire } from "../components/CircuitLab";

export type GridPitch = 10 | 20 | 25 | 40;
export type GridVisualStyle = "blueprint" | "dots" | "off";
export type WireRoutingMode = "orthogonal" | "chamfer" | "bezier";

export interface AlignmentGuide {
  axis: "x" | "y";
  position: number;
  start: number;
  end: number;
  label: string;
  kind: "node" | "port";
}

export interface SnapComputationResult {
  x: number;
  y: number;
  guides: AlignmentGuide[];
}

export function snapValueToGrid(
  value: number,
  pitch: GridPitch,
  snapEnabled = true
): number {
  if (!snapEnabled) return Math.round(value);
  return Math.round(value / pitch) * pitch;
}

/**
 * Returns all port Y offsets (relative to node.y) and port X offsets (relative to node.x)
 * for a given node type so we can snap pins directly into horizontal alignment with connected/nearby gates.
 */
export function getNodePortOffsets(type: string): {
  inY: number[];
  outY: number[];
  width: number;
  height: number;
} {
  if (type === "INPUT") {
    return { inY: [], outY: [25], width: 56, height: 50 };
  }
  if (type === "OUTPUT") {
    return { inY: [25], outY: [], width: 56, height: 50 };
  }
  const comp = COMP_SPECS[type];
  if (comp) {
    return {
      inY: comp.inputs.map((p) => p.y),
      outY: comp.outputs.map((p) => p.y),
      width: comp.w,
      height: comp.h,
    };
  }
  const spec = GATE_SPECS[type];
  if (spec) {
    const inY = spec.inputs === 1 ? [25] : [15, 35];
    return {
      inY,
      outY: [25],
      width: spec.outX,
      height: 50,
    };
  }
  return { inY: [25], outY: [25], width: 75, height: 50 };
}

/**
 * Computes grid-snapped (x, y) plus magnetic alignment guides (X column alignment, Y top alignment,
 * and Pin-to-Pin Y alignment for straight horizontal wire runs).
 */
export function computeSnappedNodePosition(params: {
  rawX: number;
  rawY: number;
  draggedNode: CircuitNode;
  otherNodes: CircuitNode[];
  pitch: GridPitch;
  snapToGrid: boolean;
  magneticGuides: boolean;
}): SnapComputationResult {
  const {
    rawX,
    rawY,
    draggedNode,
    otherNodes,
    pitch,
    snapToGrid,
    magneticGuides,
  } = params;

  let snappedX = snapValueToGrid(rawX, pitch, snapToGrid);
  let snappedY = snapValueToGrid(rawY, pitch, snapToGrid);
  const guides: AlignmentGuide[] = [];

  if (!magneticGuides || otherNodes.length === 0) {
    return { x: snappedX, y: snappedY, guides };
  }

  const dragOffsets = getNodePortOffsets(draggedNode.type);
  const dragAllPinY = Array.from(
    new Set([...dragOffsets.inY, ...dragOffsets.outY])
  );
  const SNAP_THRESHOLD = Math.min(8, pitch / 2);

  // 1. Check X-column alignment with other nodes
  let bestDx = SNAP_THRESHOLD + 1;
  let matchedXGuide: AlignmentGuide | null = null;

  for (const other of otherNodes) {
    const dxLeft = Math.abs(snappedX - other.x);
    if (dxLeft <= SNAP_THRESHOLD && dxLeft < bestDx) {
      bestDx = dxLeft;
      snappedX = other.x;
      matchedXGuide = {
        axis: "x",
        position: other.x,
        start: Math.min(snappedY, other.y) - 28,
        end: Math.max(snappedY + dragOffsets.height, other.y + 60) + 28,
        label: `COL X=${other.x}`,
        kind: "node",
      };
    }
  }
  if (matchedXGuide) {
    guides.push(matchedXGuide);
  }

  // 2. Check Pin-to-Pin Y alignment (highest priority for clean straight horizontal wires)
  // and Node-to-Node top Y alignment
  let bestDy = SNAP_THRESHOLD + 1;
  let matchedYGuide: AlignmentGuide | null = null;

  for (const other of otherNodes) {
    const otherOffsets = getNodePortOffsets(other.type);
    const otherAllPinY = Array.from(
      new Set([...otherOffsets.inY, ...otherOffsets.outY])
    );

    // Check top-edge alignment first
    const dyTop = Math.abs(snappedY - other.y);
    if (dyTop <= SNAP_THRESHOLD && dyTop < bestDy) {
      bestDy = dyTop;
      snappedY = other.y;
      matchedYGuide = {
        axis: "y",
        position: other.y + 25,
        start: Math.min(snappedX, other.x) - 24,
        end: Math.max(snappedX + dragOffsets.width, other.x + otherOffsets.width) + 24,
        label: `ROW Y=${other.y}`,
        kind: "node",
      };
    }

    // Check Pin-to-Pin Y alignment so input/output pins form a straight horizontal line
    for (const myPinOff of dragAllPinY) {
      for (const otherPinOff of otherAllPinY) {
        const targetNodeY = other.y + otherPinOff - myPinOff;
        const dyPin = Math.abs(snappedY - targetNodeY);
        if (dyPin <= SNAP_THRESHOLD && dyPin < bestDy) {
          bestDy = dyPin;
          snappedY = targetNodeY;
          const pinWorldY = targetNodeY + myPinOff;
          matchedYGuide = {
            axis: "y",
            position: pinWorldY,
            start: Math.min(snappedX, other.x) - 20,
            end:
              Math.max(
                snappedX + dragOffsets.width,
                other.x + otherOffsets.width
              ) + 20,
            label: `PIN ALIGN Y=${pinWorldY}`,
            kind: "port",
          };
        }
      }
    }
  }

  if (matchedYGuide) {
    guides.push(matchedYGuide);
  }

  return { x: snappedX, y: snappedY, guides };
}

export interface RoutedWireGeometry {
  d: string;
  points: { x: number; y: number }[];
  midHandle: { x: number; y: number };
}

/**
 * Generates clean SVG wire geometry for:
 * - "orthogonal": Manhattan 90-degree grid-snapped routing with subtle 5px rounded corners & feedback loop avoidance
 * - "chamfer": 45-degree CAD octilinear routing
 * - "bezier": Smooth cubic Bezier curve
 */
export function buildRoutedWireGeometry(params: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  mode: WireRoutingMode;
  pitch: GridPitch;
  wireIndexOffset?: number;
  manualMidX?: number;
}): RoutedWireGeometry {
  const {
    from,
    to,
    mode,
    pitch,
    wireIndexOffset = 0,
    manualMidX,
  } = params;

  if (mode === "bezier") {
    const ctrlSpan = Math.max(55, Math.min(140, Math.abs(to.x - from.x) * 0.48));
    const d = `M ${from.x},${from.y} C ${from.x + ctrlSpan},${from.y} ${
      to.x - ctrlSpan
    },${to.y} ${to.x},${to.y}`;
    const samplePts: { x: number; y: number }[] = [];
    const p0 = from;
    const p1 = { x: from.x + ctrlSpan, y: from.y };
    const p2 = { x: to.x - ctrlSpan, y: to.y };
    const p3 = to;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const u = 1 - t;
      samplePts.push({
        x:
          u * u * u * p0.x +
          3 * u * u * t * p1.x +
          3 * u * t * t * p2.x +
          t * t * t * p3.x,
        y:
          u * u * u * p0.y +
          3 * u * u * t * p1.y +
          3 * u * t * t * p2.y +
          t * t * t * p3.y,
      });
    }
    return {
      d,
      points: samplePts,
      midHandle: samplePts[8],
    };
  }

  const gridStep = Math.max(10, pitch);

  // Directly aligned horizontal wire
  if (Math.abs(from.y - to.y) <= 2 && to.x > from.x) {
    const pts = [
      { x: from.x, y: from.y },
      { x: to.x, y: to.y },
    ];
    return {
      d: `M ${from.x},${from.y} L ${to.x},${to.y}`,
      points: pts,
      midHandle: { x: (from.x + to.x) / 2, y: from.y },
    };
  }

  // Forward connection (to.x > from.x + 24)
  if (to.x > from.x + 24) {
    const rawMidX =
      manualMidX !== undefined
        ? manualMidX
        : (from.x + to.x) / 2 + wireIndexOffset * 10;
    const clampedMidX = Math.max(
      from.x + 14,
      Math.min(to.x - 14, Math.round(rawMidX / 10) * 10)
    );

    if (mode === "chamfer") {
      const dy = to.y - from.y;
      const chamfer = Math.min(
        18,
        Math.abs(dy) / 2,
        Math.abs(to.x - from.x) / 4
      );
      const signY = dy >= 0 ? 1 : -1;
      const pts = [
        { x: from.x, y: from.y },
        { x: clampedMidX - chamfer, y: from.y },
        { x: clampedMidX, y: from.y + signY * chamfer },
        { x: clampedMidX, y: to.y - signY * chamfer },
        { x: clampedMidX + chamfer, y: to.y },
        { x: to.x, y: to.y },
      ];
      const d = pts
        .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`)
        .join(" ");
      return {
        d,
        points: pts,
        midHandle: { x: clampedMidX, y: (from.y + to.y) / 2 },
      };
    }

    // Orthogonal Manhattan routing with subtle rounded corners
    const pts = [
      { x: from.x, y: from.y },
      { x: clampedMidX, y: from.y },
      { x: clampedMidX, y: to.y },
      { x: to.x, y: to.y },
    ];
    return {
      d: buildRoundedOrthogonalPath(pts, 5),
      points: pts,
      midHandle: { x: clampedMidX, y: (from.y + to.y) / 2 },
    };
  }

  // Feedback / Backward connection (to.x <= from.x + 24): route cleanly around in a grid-snapped U-channel
  const stubOutX = Math.round((from.x + 24) / 10) * 10;
  const stubInX = Math.round((to.x - 24) / 10) * 10;
  const loopY =
    from.y <= to.y
      ? Math.min(from.y, to.y) - Math.max(40, gridStep * 2) - wireIndexOffset * 10
      : Math.max(from.y, to.y) + Math.max(40, gridStep * 2) + wireIndexOffset * 10;
  const snappedLoopY = Math.round(loopY / 10) * 10;

  const pts = [
    { x: from.x, y: from.y },
    { x: stubOutX, y: from.y },
    { x: stubOutX, y: snappedLoopY },
    { x: stubInX, y: snappedLoopY },
    { x: stubInX, y: to.y },
    { x: to.x, y: to.y },
  ];

  return {
    d: buildRoundedOrthogonalPath(pts, 5),
    points: pts,
    midHandle: { x: (stubOutX + stubInX) / 2, y: snappedLoopY },
  };
}

function buildRoundedOrthogonalPath(
  pts: { x: number; y: number }[],
  radius = 5
): string {
  if (pts.length < 2) return "";
  if (pts.length === 2) {
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  }

  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${curr.x},${curr.y}`;
      continue;
    }

    const startCornerX = curr.x - (v1x / len1) * r;
    const startCornerY = curr.y - (v1y / len1) * r;
    const endCornerX = curr.x + (v2x / len2) * r;
    const endCornerY = curr.y + (v2y / len2) * r;

    d += ` L ${startCornerX.toFixed(1)},${startCornerY.toFixed(
      1
    )} Q ${curr.x},${curr.y} ${endCornerX.toFixed(1)},${endCornerY.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  d += ` L ${last.x},${last.y}`;
  return d;
}

/**
 * Evaluates a point along a polyline at normalized parameter t in [0, 1]
 */
export function getPolylinePointAt(
  pts: { x: number; y: number }[],
  t: number
): { x: number; y: number } | null {
  if (pts.length === 0) return null;
  if (pts.length === 1) return pts[0];

  const clampedT = Math.max(0, Math.min(1, t));
  let totalLen = 0;
  const segLens: number[] = [];

  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(len);
    totalLen += len;
  }

  if (totalLen === 0) return pts[0];
  const targetDist = clampedT * totalLen;
  let accum = 0;

  for (let i = 0; i < segLens.length; i++) {
    const segLen = segLens[i];
    if (accum + segLen >= targetDist || i === segLens.length - 1) {
      const localT = segLen > 0 ? (targetDist - accum) / segLen : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * localT,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * localT,
      };
    }
    accum += segLen;
  }

  return pts[pts.length - 1];
}

/**
 * Snaps all nodes in the schematic to the active grid pitch
 */
export function snapAllNodesToGrid(
  nodes: CircuitNode[],
  pitch: GridPitch
): CircuitNode[] {
  return nodes.map((n) => ({
    ...n,
    x: snapValueToGrid(n.x, pitch, true),
    y: snapValueToGrid(n.y, pitch, true),
  }));
}

export type MultiAlignAction =
  | "align-left"
  | "align-center-x"
  | "align-top"
  | "distribute-x"
  | "distribute-y";

/**
 * Aligns or distributes the selected nodes (or all internal gates if fewer than 2 are selected) on the grid
 */
export function alignNodesOnGrid(
  nodes: CircuitNode[],
  targetIds: number[],
  action: MultiAlignAction,
  pitch: GridPitch
): CircuitNode[] {
  const idSet = new Set(targetIds);
  const subset = nodes.filter((n) => idSet.has(n.id));
  if (subset.length < 2) return nodes;

  if (action === "align-left") {
    const minX = snapValueToGrid(
      Math.min(...subset.map((n) => n.x)),
      pitch,
      true
    );
    return nodes.map((n) => (idSet.has(n.id) ? { ...n, x: minX } : n));
  }

  if (action === "align-center-x") {
    const avgX = snapValueToGrid(
      subset.reduce((acc, n) => acc + n.x, 0) / subset.length,
      pitch,
      true
    );
    return nodes.map((n) => (idSet.has(n.id) ? { ...n, x: avgX } : n));
  }

  if (action === "align-top") {
    const minY = snapValueToGrid(
      Math.min(...subset.map((n) => n.y)),
      pitch,
      true
    );
    return nodes.map((n) => (idSet.has(n.id) ? { ...n, y: minY } : n));
  }

  if (action === "distribute-y") {
    const sorted = [...subset].sort((a, b) => a.y - b.y);
    const minY = snapValueToGrid(sorted[0].y, pitch, true);
    const maxY = snapValueToGrid(sorted[sorted.length - 1].y, pitch, true);
    const span = Math.max(
      (sorted.length - 1) * Math.max(80, pitch * 4),
      maxY - minY
    );
    const step = span / (sorted.length - 1);
    const posMap = new Map<number, number>();
    sorted.forEach((n, idx) => {
      posMap.set(n.id, snapValueToGrid(minY + idx * step, pitch, true));
    });
    return nodes.map((n) =>
      posMap.has(n.id) ? { ...n, y: posMap.get(n.id)! } : n
    );
  }

  if (action === "distribute-x") {
    const sorted = [...subset].sort((a, b) => a.x - b.x);
    const minX = snapValueToGrid(sorted[0].x, pitch, true);
    const maxX = snapValueToGrid(sorted[sorted.length - 1].x, pitch, true);
    const span = Math.max(
      (sorted.length - 1) * Math.max(140, pitch * 7),
      maxX - minX
    );
    const step = span / (sorted.length - 1);
    const posMap = new Map<number, number>();
    sorted.forEach((n, idx) => {
      posMap.set(n.id, snapValueToGrid(minX + idx * step, pitch, true));
    });
    return nodes.map((n) =>
      posMap.has(n.id) ? { ...n, x: posMap.get(n.id)! } : n
    );
  }

  return nodes;
}

/**
 * Computes topological signal stage depths (Inputs at 0, 1st logic level at 1, etc.)
 */
export function computeNodeDepths(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): Record<number, number> {
  const depths: Record<number, number> = {};
  nodes.forEach((n) => {
    if (
      n.type === "INPUT" ||
      n.type === "CLOCK" ||
      n.type === "VCC" ||
      n.type === "GND"
    ) {
      depths[n.id] = 0;
    }
  });

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 30) {
    changed = false;
    iterations++;
    for (const w of wires) {
      const fromDepth = depths[w.from.node] ?? 0;
      const targetDepth = depths[w.to.node] ?? 1;
      if (fromDepth + 1 > targetDepth) {
        depths[w.to.node] = fromDepth + 1;
        changed = true;
      }
    }
  }

  for (const n of nodes) {
    if (
      n.type !== "INPUT" &&
      n.type !== "CLOCK" &&
      n.type !== "VCC" &&
      n.type !== "GND" &&
      depths[n.id] === undefined
    ) {
      depths[n.id] = 1;
    }
  }
  return depths;
}

/**
 * Automatically arranges the entire circuit into clean, grid-snapped topological columns
 * (Inputs -> Logic Stages -> Outputs) for an instant textbook-grade schematic layout.
 */
export function autoArrangeCircuitOnGrid(
  nodes: CircuitNode[],
  wires: CircuitWire[],
  nodeDepths?: Record<number, number>,
  pitch: GridPitch = 20
): CircuitNode[] {
  if (nodes.length === 0) return nodes;

  const resolvedDepths = nodeDepths && Object.keys(nodeDepths).length > 0
    ? nodeDepths
    : computeNodeDepths(nodes, wires);

  const inputs = nodes
    .filter((n) => n.type === "INPUT" || n.type === "CLOCK" || n.type === "VCC")
    .sort((a, b) => a.y - b.y);
  const outputs = nodes
    .filter((n) => n.type === "OUTPUT" || n.type === "7SEG" || n.type === "LED")
    .sort((a, b) => a.y - b.y);
  const internal = nodes.filter(
    (n) =>
      n.type !== "INPUT" &&
      n.type !== "CLOCK" &&
      n.type !== "VCC" &&
      n.type !== "OUTPUT" &&
      n.type !== "7SEG" &&
      n.type !== "LED"
  );

  // Group internal nodes by stage depth
  const stageGroups = new Map<number, CircuitNode[]>();
  let maxStage = 1;
  for (const n of internal) {
    const stg = Math.max(1, resolvedDepths[n.id] || 1);
    if (stg > maxStage) maxStage = stg;
    const list = stageGroups.get(stg) || [];
    list.push(n);
    stageGroups.set(stg, list);
  }

  const colStartX = snapValueToGrid(50, pitch, true);
  const colSpacingX = snapValueToGrid(150, pitch, true);
  const rowStartY = snapValueToGrid(60, pitch, true);
  const rowSpacingY = snapValueToGrid(80, pitch, true);

  const updatedPos = new Map<number, { x: number; y: number }>();

  // Place INPUT column
  inputs.forEach((inp, idx) => {
    updatedPos.set(inp.id, {
      x: colStartX,
      y: snapValueToGrid(rowStartY + idx * rowSpacingY, pitch, true),
    });
  });

  // Place internal stage columns
  const sortedStages = Array.from(stageGroups.keys()).sort((a, b) => a - b);
  sortedStages.forEach((stg, colIdx) => {
    const group = (stageGroups.get(stg) || []).sort((a, b) => a.y - b.y);
    const colX = snapValueToGrid(
      colStartX + (colIdx + 1) * colSpacingX,
      pitch,
      true
    );
    group.forEach((n, rIdx) => {
      const comp = COMP_SPECS[n.type];
      const extraRowGap = comp && comp.h > 90 ? snapValueToGrid(150, pitch, true) : rowSpacingY;
      updatedPos.set(n.id, {
        x: colX,
        y: snapValueToGrid(rowStartY + rIdx * extraRowGap, pitch, true),
      });
    });
  });

  // Place OUTPUT column aligned with driving gates where possible
  const outColX = snapValueToGrid(
    colStartX + (sortedStages.length + 1) * colSpacingX,
    pitch,
    true
  );
  outputs.forEach((outp, idx) => {
    const drivingWire = wires.find((w) => w.to.node === outp.id);
    const driverPos = drivingWire
      ? updatedPos.get(drivingWire.from.node)
      : undefined;
    const targetY = driverPos
      ? snapValueToGrid(driverPos.y, pitch, true)
      : snapValueToGrid(rowStartY + idx * rowSpacingY, pitch, true);
    updatedPos.set(outp.id, {
      x: outColX,
      y: targetY,
    });
  });

  return nodes.map((n) => {
    const p = updatedPos.get(n.id);
    return p ? { ...n, x: p.x, y: p.y } : n;
  });
}
