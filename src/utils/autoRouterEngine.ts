import { COMP_SPECS, GATE_SPECS } from "../data/logicSpecs";
import type { CircuitNode, CircuitWire } from "../components/CircuitLab";
import {
  GridPitch,
  WireRoutingMode,
  RoutedWireGeometry,
  buildRoutedWireGeometry,
} from "./schematicGrid";

export interface ObstacleBox {
  nodeId: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RoutedWireWithMetrics extends RoutedWireGeometry {
  wireId: number;
  netKey: string;
  manhattanLength: number;
  routedLength: number;
  bendCount: number;
  avoidedObstacle: boolean;
}

export interface SolderJunctionPoint {
  x: number;
  y: number;
  netKey: string;
  fromNode: number;
  fromPort: number;
}

export interface WireCrossoverPoint {
  x: number;
  y: number;
}

export interface AutoRouterTelemetry {
  totalWires: number;
  totalWireLengthPx: number;
  idealManhattanLengthPx: number;
  totalBends: number;
  gateCollisionsAvoided: number;
  wireCrossingsCount: number;
  sharedFanoutTrunks: number;
  efficiencyScore: number;
  unconnectedInputPins: number;
  unconnectedOutputPins: number;
  computeTimeMs: number;
}

export interface AutoRouterResult {
  wireGeometries: Map<number, RoutedWireWithMetrics>;
  junctionDots: SolderJunctionPoint[];
  crossovers: WireCrossoverPoint[];
  telemetry: AutoRouterTelemetry;
}

/**
 * Helper to compute the exact world coordinate of a node's input or output port
 */
function getNodeCenterCoords(n: CircuitNode): { cx: number; cy: number } {
  if (n.type === "INPUT" || n.type === "OUTPUT") {
    return { cx: n.x + 28, cy: n.y + 25 };
  }
  const comp = COMP_SPECS[n.type];
  if (comp) {
    return { cx: n.x + comp.w / 2, cy: n.y + comp.h / 2 };
  }
  const spec = GATE_SPECS[n.type];
  return { cx: n.x + (spec?.outX || 75) / 2, cy: n.y + 25 };
}

export function getNodePortWorldPos(
  n: CircuitNode,
  port: number,
  dir: "in" | "out"
): { x: number; y: number } | null {
  let raw: { x: number; y: number } | null = null;
  if (n.type === "INPUT") {
    if (dir === "out" && port === 0) raw = { x: n.x + 56, y: n.y + 25 };
  } else if (n.type === "OUTPUT") {
    if (dir === "in" && port === 0) raw = { x: n.x, y: n.y + 25 };
  } else {
    const comp = COMP_SPECS[n.type];
    if (comp) {
      const pin = (dir === "in" ? comp.inputs : comp.outputs)[port];
      if (pin) {
        raw =
          dir === "in"
            ? { x: n.x, y: n.y + pin.y }
            : { x: n.x + comp.w, y: n.y + pin.y };
      }
    } else {
      const spec = GATE_SPECS[n.type];
      if (spec) {
        if (dir === "out") {
          if (port === 0) raw = { x: n.x + spec.outX, y: n.y + 25 };
        } else if (port >= 0 && port < spec.inputs) {
          const offs = spec.inputs === 1 ? [25] : [15, 35];
          raw = { x: n.x, y: n.y + (offs[port] ?? 25) };
        }
      }
    }
  }
  if (!raw) return null;

  const rot = n.rotation || 0;
  if (rot === 0) return raw;
  const center = getNodeCenterCoords(n);
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = raw.x - center.cx;
  const dy = raw.y - center.cy;
  return {
    x: Math.round(center.cx + dx * cos - dy * sin),
    y: Math.round(center.cy + dx * sin + dy * cos),
  };
}

/**
 * Computes obstacle bounding boxes for all nodes on the canvas so the A* router
 * routes wires around logic gates and IC packages rather than cutting through them.
 */
export function buildNodeObstacleBoxes(
  nodes: CircuitNode[],
  padding = 8
): ObstacleBox[] {
  return nodes.map((n) => {
    const center = getNodeCenterCoords(n);
    const rot = n.rotation || 0;
    const isSwapped = rot === 90 || rot === 270;
    let rawW = 75;
    let rawH = 54;
    if (n.type === "INPUT" || n.type === "OUTPUT") {
      rawW = 56;
      rawH = 50;
    } else if (COMP_SPECS[n.type]) {
      rawW = COMP_SPECS[n.type].w;
      rawH = COMP_SPECS[n.type].h;
    } else if (GATE_SPECS[n.type]) {
      rawW = GATE_SPECS[n.type].outX || 75;
      rawH = 54;
    }
    const finalW = (isSwapped ? rawH : rawW) / 2 + padding;
    const finalH = (isSwapped ? rawW : rawH) / 2 + padding;
    return {
      nodeId: n.id,
      x1: center.cx - finalW,
      y1: center.cy - finalH,
      x2: center.cx + finalW,
      y2: center.cy + finalH,
    };
  });
}

function buildRoundedSvgPath(
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
 * Simplifies a list of orthogonal points by removing redundant collinear intermediate vertices
 */
function simplifyOrthogonalWaypoints(
  pts: { x: number; y: number }[]
): { x: number; y: number }[] {
  if (pts.length <= 2) return pts;
  const deduped: { x: number; y: number }[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = deduped[deduped.length - 1];
    if (Math.hypot(pts[i].x - prev.x, pts[i].y - prev.y) > 0.5) {
      deduped.push(pts[i]);
    }
  }
  if (deduped.length <= 2) return deduped;

  const simplified: { x: number; y: number }[] = [deduped[0]];
  for (let i = 1; i < deduped.length - 1; i++) {
    const prev = simplified[simplified.length - 1];
    const curr = deduped[i];
    const next = deduped[i + 1];
    const sameX =
      Math.abs(prev.x - curr.x) < 0.5 && Math.abs(curr.x - next.x) < 0.5;
    const sameY =
      Math.abs(prev.y - curr.y) < 0.5 && Math.abs(curr.y - next.y) < 0.5;
    if (!sameX && !sameY) {
      simplified.push(curr);
    }
  }
  simplified.push(deduped[deduped.length - 1]);
  return simplified;
}

/**
 * Checks if an axis-aligned segment (p1 -> p2) intersects an ObstacleBox
 */
function segmentIntersectsBox(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  box: ObstacleBox
): boolean {
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  return (
    maxX > box.x1 && minX < box.x2 && maxY > box.y1 && minY < box.y2
  );
}

/**
 * Fast A* Manhattan Pathfinding Router on a 10px schematic grid lattice.
 * - Avoids all intermediate logic gate / IC bounding boxes
 * - Minimizes 90-degree bends (corner penalty)
 * - Separates parallel wire channels from different nets while encouraging shared trunks for same-net fanout
 */
function findAStarOrthogonalRoute(params: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  fromNodeId: number;
  toNodeId: number;
  netKey: string;
  obstacles: ObstacleBox[];
  occupiedEdges: Map<string, Set<string>>; // edgeKey -> Set<netKey>
  occupiedVertices: Map<string, Set<string>>; // vertexKey -> Set<netKey>
  gridStep: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}): {
  points: { x: number; y: number }[];
  avoidedObstacle: boolean;
} {
  const {
    from,
    to,
    fromNodeId,
    toNodeId,
    netKey,
    obstacles,
    occupiedEdges,
    occupiedVertices,
    gridStep,
    bounds,
  } = params;

  const snap = (v: number) => Math.round(v / gridStep) * gridStep;

  // Check if a simple direct 1-segment or 3-segment L/Z route is completely obstacle-free and congestion-free
  const directCollideCheck = (pts: { x: number; y: number }[]) => {
    for (let i = 0; i < pts.length - 1; i++) {
      for (const ob of obstacles) {
        if (ob.nodeId === fromNodeId || ob.nodeId === toNodeId) continue;
        if (segmentIntersectsBox(pts[i], pts[i + 1], ob)) {
          return true;
        }
      }
    }
    return false;
  };

  // Check if straight horizontal line is unobstructed
  if (Math.abs(from.y - to.y) <= 2 && to.x > from.x) {
    const straightPts = [from, to];
    if (!directCollideCheck(straightPts)) {
      return { points: straightPts, avoidedObstacle: false };
    }
  }

  // Entry and exit stubs outside the source and target pin bodies
  const startStubX = snap(from.x + Math.max(10, gridStep));
  const startStubY = snap(from.y);
  const endStubX = snap(to.x - Math.max(10, gridStep));
  const endStubY = snap(to.y);

  // Determine if a naive midpoint Z-route would collide with any gate obstacle
  const naiveMidX = snap((from.x + to.x) / 2);
  const naivePts = [
    from,
    { x: naiveMidX, y: from.y },
    { x: naiveMidX, y: to.y },
    to,
  ];
  const naiveCollides =
    to.x <= from.x + 20 || directCollideCheck(naivePts);

  // Run A* search from (startStubX, startStubY) to (endStubX, endStubY)
  const DIRS = [
    { dx: gridStep, dy: 0, dir: 0 }, // East
    { dx: 0, dy: gridStep, dir: 1 }, // South
    { dx: 0, dy: -gridStep, dir: 2 }, // North
    { dx: -gridStep, dy: 0, dir: 3 }, // West
  ];

  interface AStarNode {
    x: number;
    y: number;
    dir: number;
    g: number;
    f: number;
    parentIdx: number;
  }

  const allNodes: AStarNode[] = [];
  // Min-heap of indices into allNodes ordered by f
  const openHeap: number[] = [];
  const pushHeap = (idx: number) => {
    openHeap.push(idx);
    let c = openHeap.length - 1;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (allNodes[openHeap[c]].f >= allNodes[openHeap[p]].f) break;
      const tmp = openHeap[c];
      openHeap[c] = openHeap[p];
      openHeap[p] = tmp;
      c = p;
    }
  };
  const popHeap = (): number | undefined => {
    if (openHeap.length === 0) return undefined;
    const top = openHeap[0];
    const last = openHeap.pop()!;
    if (openHeap.length > 0) {
      openHeap[0] = last;
      let p = 0;
      const len = openHeap.length;
      while (true) {
        const l = (p << 1) + 1;
        const r = l + 1;
        let smallest = p;
        if (l < len && allNodes[openHeap[l]].f < allNodes[openHeap[smallest]].f)
          smallest = l;
        if (r < len && allNodes[openHeap[r]].f < allNodes[openHeap[smallest]].f)
          smallest = r;
        if (smallest === p) break;
        const tmp = openHeap[p];
        openHeap[p] = openHeap[smallest];
        openHeap[smallest] = tmp;
        p = smallest;
      }
    }
    return top;
  };

  const heuristic = (x: number, y: number) =>
    Math.abs(endStubX - x) + Math.abs(endStubY - y);

  const bestG = new Map<string, number>();
  const startNode: AStarNode = {
    x: startStubX,
    y: startStubY,
    dir: 0,
    g: 0,
    f: heuristic(startStubX, startStubY),
    parentIdx: -1,
  };
  allNodes.push(startNode);
  pushHeap(0);
  bestG.set(`${startStubX},${startStubY},0`, 0);

  let goalIdx = -1;
  let iterations = 0;
  const MAX_ITERATIONS = 2800;

  while (openHeap.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const currIdx = popHeap()!;
    const curr = allNodes[currIdx];

    if (curr.x === endStubX && curr.y === endStubY) {
      goalIdx = currIdx;
      break;
    }

    for (const d of DIRS) {
      // Disallow immediate 180-degree reversal
      if (
        (curr.dir === 0 && d.dir === 3) ||
        (curr.dir === 3 && d.dir === 0) ||
        (curr.dir === 1 && d.dir === 2) ||
        (curr.dir === 2 && d.dir === 1)
      ) {
        continue;
      }

      const nx = curr.x + d.dx;
      const ny = curr.y + d.dy;

      if (
        nx < bounds.minX ||
        nx > bounds.maxX ||
        ny < bounds.minY ||
        ny > bounds.maxY
      ) {
        continue;
      }

      // Compute step cost
      let stepCost = gridStep;

      // 1. Bend penalty (prefer straight Manhattan lines with minimum turns)
      if (curr.dir !== d.dir) {
        stepCost += 26;
      }

      // 2. Obstacle collision penalty
      const isGoalCell = nx === endStubX && ny === endStubY;
      if (!isGoalCell) {
        let hitsObstacle = false;
        for (const ob of obstacles) {
          if (ob.nodeId === fromNodeId || ob.nodeId === toNodeId) {
            // Still avoid routing backward through the body of our own source/target gate
            const innerX1 = ob.x1 + 8;
            const innerX2 = ob.x2 - 8;
            const innerY1 = ob.y1 + 6;
            const innerY2 = ob.y2 - 6;
            if (
              nx > innerX1 &&
              nx < innerX2 &&
              ny > innerY1 &&
              ny < innerY2
            ) {
              stepCost += 900;
            }
            continue;
          }
          if (nx >= ob.x1 && nx <= ob.x2 && ny >= ob.y1 && ny <= ob.y2) {
            hitsObstacle = true;
            break;
          }
        }
        if (hitsObstacle) {
          stepCost += 2400;
        }
      }

      // 3. Track congestion / parallel wire separation vs shared fanout trunk bonus
      const eKey =
        curr.x < nx || (curr.x === nx && curr.y < ny)
          ? `${curr.x},${curr.y}-${nx},${ny}`
          : `${nx},${ny}-${curr.x},${curr.y}`;
      const edgeNets = occupiedEdges.get(eKey);
      if (edgeNets) {
        if (edgeNets.has(netKey)) {
          // Encourage sharing the trunk for the same output pin fanout!
          stepCost = Math.max(2, stepCost - 4);
        } else {
          // Strong penalty for overlapping a different signal net along the same track
          stepCost += 260;
        }
      }

      // 4. Vertex crossing cost
      const vKey = `${nx},${ny}`;
      const vertNets = occupiedVertices.get(vKey);
      if (vertNets && !vertNets.has(netKey)) {
        stepCost += 28;
      }

      const nextG = curr.g + stepCost;
      const stateKey = `${nx},${ny},${d.dir}`;
      const prevBest = bestG.get(stateKey);
      if (prevBest !== undefined && nextG >= prevBest) {
        continue;
      }
      bestG.set(stateKey, nextG);

      // Slight tie-breaker toward goal alignment
      const h = heuristic(nx, ny) * 1.02;
      const newIdx = allNodes.length;
      allNodes.push({
        x: nx,
        y: ny,
        dir: d.dir,
        g: nextG,
        f: nextG + h,
        parentIdx: currIdx,
      });
      pushHeap(newIdx);
    }
  }

  if (goalIdx !== -1) {
    const gridPath: { x: number; y: number }[] = [];
    let traceIdx = goalIdx;
    while (traceIdx !== -1) {
      const node = allNodes[traceIdx];
      gridPath.push({ x: node.x, y: node.y });
      traceIdx = node.parentIdx;
    }
    gridPath.reverse();

    // Record occupied edges and vertices for subsequent wires
    for (let i = 0; i < gridPath.length; i++) {
      const vk = `${gridPath[i].x},${gridPath[i].y}`;
      let vSet = occupiedVertices.get(vk);
      if (!vSet) {
        vSet = new Set();
        occupiedVertices.set(vk, vSet);
      }
      vSet.add(netKey);

      if (i < gridPath.length - 1) {
        const a = gridPath[i];
        const b = gridPath[i + 1];
        const ek =
          a.x < b.x || (a.x === b.x && a.y < b.y)
            ? `${a.x},${a.y}-${b.x},${b.y}`
            : `${b.x},${b.y}-${a.x},${a.y}`;
        let eSet = occupiedEdges.get(ek);
        if (!eSet) {
          eSet = new Set();
          occupiedEdges.set(ek, eSet);
        }
        eSet.add(netKey);
      }
    }

    // Build exact terminal-connected orthogonal waypoint chain
    const rawChain: { x: number; y: number }[] = [
      { x: from.x, y: from.y },
      { x: startStubX, y: from.y },
      ...gridPath,
      { x: endStubX, y: to.y },
      { x: to.x, y: to.y },
    ];
    const simplified = simplifyOrthogonalWaypoints(rawChain);
    return {
      points: simplified,
      avoidedObstacle: naiveCollides,
    };
  }

  // Fallback to standard orthogonal geometry if bounds exceeded
  const fallback = buildRoutedWireGeometry({
    from,
    to,
    mode: "orthogonal",
    pitch: 20,
  });
  return {
    points: fallback.points,
    avoidedObstacle: false,
  };
}

/**
 * Computes complete auto-routed wire geometries, solder junction dots, wire crossovers,
 * and routing efficiency telemetry for all wires in the circuit.
 */
export function computeAutoRoutedCircuitWires(params: {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  mode: WireRoutingMode;
  pitch: GridPitch;
  autoRouterEnabled?: boolean;
}): AutoRouterResult {
  const startTime = performance.now();
  const {
    nodes,
    wires,
    mode,
    pitch,
    autoRouterEnabled = true,
  } = params;

  const nodeById = new Map<number, CircuitNode>();
  for (const n of nodes) nodeById.set(n.id, n);

  const obstacles = buildNodeObstacleBoxes(nodes, 10);

  // Compute canvas bounding box for A* lattice
  let minX = 20;
  let maxX = 960;
  let minY = 20;
  let maxY = 580;
  for (const ob of obstacles) {
    minX = Math.min(minX, ob.x1 - 60);
    maxX = Math.max(maxX, ob.x2 + 60);
    minY = Math.min(minY, ob.y1 - 60);
    maxY = Math.max(maxY, ob.y2 + 60);
  }
  const gridStep = 10;
  const bounds = {
    minX: Math.floor(minX / gridStep) * gridStep,
    maxX: Math.ceil(maxX / gridStep) * gridStep,
    minY: Math.floor(minY / gridStep) * gridStep,
    maxY: Math.ceil(maxY / gridStep) * gridStep,
  };

  const occupiedEdges = new Map<string, Set<string>>();
  const occupiedVertices = new Map<string, Set<string>>();
  const wireGeometries = new Map<number, RoutedWireWithMetrics>();

  // Order wires by Manhattan length ascending so short local connections route first
  // and longer buses route cleanly around them
  const indexedWires = wires
    .map((w, idx) => {
      const fromNode = nodeById.get(w.from.node);
      const toNode = nodeById.get(w.to.node);
      const fromPt = fromNode
        ? getNodePortWorldPos(fromNode, w.from.port, w.from.dir || "out")
        : null;
      const toPt = toNode
        ? getNodePortWorldPos(toNode, w.to.port, w.to.dir || "in")
        : null;
      const dist =
        fromPt && toPt
          ? Math.abs(toPt.x - fromPt.x) + Math.abs(toPt.y - fromPt.y)
          : 9999;
      return { w, idx, fromPt, toPt, dist };
    })
    .sort((a, b) => a.dist - b.dist);

  let totalWireLengthPx = 0;
  let idealManhattanLengthPx = 0;
  let totalBends = 0;
  let gateCollisionsAvoided = 0;

  for (const item of indexedWires) {
    const { w, idx, fromPt, toPt } = item;
    if (!fromPt || !toPt) continue;

    const netKey = `${w.from.node}:${w.from.port}`;
    const manhattanLength =
      Math.abs(toPt.x - fromPt.x) + Math.abs(toPt.y - fromPt.y);
    idealManhattanLengthPx += manhattanLength;

    // If user manually dragged midX or mode is bezier/chamfer or autoRouter is disabled
    if (!autoRouterEnabled || mode !== "orthogonal" || w.midX !== undefined) {
      const offsetSlot = (idx % 3) - 1;
      const baseGeom = buildRoutedWireGeometry({
        from: fromPt,
        to: toPt,
        mode,
        pitch,
        wireIndexOffset: offsetSlot,
        manualMidX: w.midX,
      });

      let routedLen = 0;
      for (let i = 0; i < baseGeom.points.length - 1; i++) {
        routedLen += Math.hypot(
          baseGeom.points[i + 1].x - baseGeom.points[i].x,
          baseGeom.points[i + 1].y - baseGeom.points[i].y
        );
      }
      const bends = Math.max(0, baseGeom.points.length - 2);
      totalWireLengthPx += routedLen;
      totalBends += bends;

      wireGeometries.set(w.id, {
        ...baseGeom,
        wireId: w.id,
        netKey,
        manhattanLength,
        routedLength: routedLen,
        bendCount: bends,
        avoidedObstacle: false,
      });
      continue;
    }

    // Run A* Obstacle-Avoiding Manhattan Router
    const { points, avoidedObstacle } = findAStarOrthogonalRoute({
      from: fromPt,
      to: toPt,
      fromNodeId: w.from.node,
      toNodeId: w.to.node,
      netKey,
      obstacles,
      occupiedEdges,
      occupiedVertices,
      gridStep,
      bounds,
    });

    let routedLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      routedLen += Math.hypot(
        points[i + 1].x - points[i].x,
        points[i + 1].y - points[i].y
      );
    }
    const bends = Math.max(0, points.length - 2);
    totalWireLengthPx += routedLen;
    totalBends += bends;
    if (avoidedObstacle) {
      gateCollisionsAvoided += 1;
    }

    // Find best vertical segment midpoint for the interactive drag handle
    let midHandle = {
      x: (fromPt.x + toPt.x) / 2,
      y: (fromPt.y + toPt.y) / 2,
    };
    let longestVert = -1;
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      if (Math.abs(a.x - b.x) < 1) {
        const vLen = Math.abs(b.y - a.y);
        if (vLen > longestVert) {
          longestVert = vLen;
          midHandle = { x: a.x, y: (a.y + b.y) / 2 };
        }
      }
    }

    wireGeometries.set(w.id, {
      d: buildRoundedSvgPath(points, 5),
      points,
      midHandle,
      wireId: w.id,
      netKey,
      manhattanLength,
      routedLength: routedLen,
      bendCount: bends,
      avoidedObstacle,
    });
  }

  // Detect Solder Junction Dots where same-net fanout wires diverge after sharing a trunk segment
  const junctionDots: SolderJunctionPoint[] = [];
  const seenJunctions = new Set<string>();
  const wiresByNet = new Map<string, RoutedWireWithMetrics[]>();
  for (const geom of wireGeometries.values()) {
    const list = wiresByNet.get(geom.netKey) || [];
    list.push(geom);
    wiresByNet.set(geom.netKey, list);
  }

  let sharedFanoutTrunks = 0;
  for (const [netKey, netWires] of wiresByNet.entries()) {
    if (netWires.length < 2) continue;
    sharedFanoutTrunks += 1;
    const [nStr, pStr] = netKey.split(":");
    const fromNode = Number(nStr);
    const fromPort = Number(pStr);

    for (let i = 0; i < netWires.length; i++) {
      for (let j = i + 1; j < netWires.length; j++) {
        const ptsA = netWires[i].points;
        const ptsB = netWires[j].points;
        // Find the last shared corner or divergence point
        for (const pa of ptsA) {
          for (const pb of ptsB) {
            if (Math.abs(pa.x - pb.x) <= 2 && Math.abs(pa.y - pb.y) <= 2) {
              const jKey = `${netKey}@${Math.round(pa.x)},${Math.round(pa.y)}`;
              if (!seenJunctions.has(jKey)) {
                seenJunctions.add(jKey);
                junctionDots.push({
                  x: pa.x,
                  y: pa.y,
                  netKey,
                  fromNode,
                  fromPort,
                });
              }
            }
          }
        }
      }
    }
  }

  // Detect orthogonal crossings between different nets
  const crossovers: WireCrossoverPoint[] = [];
  const allGeoms = Array.from(wireGeometries.values());
  for (let i = 0; i < allGeoms.length; i++) {
    for (let j = i + 1; j < allGeoms.length; j++) {
      if (allGeoms[i].netKey === allGeoms[j].netKey) continue;
      const ptsA = allGeoms[i].points;
      const ptsB = allGeoms[j].points;
      for (let sa = 0; sa < ptsA.length - 1; sa++) {
        const a1 = ptsA[sa];
        const a2 = ptsA[sa + 1];
        const aHoriz = Math.abs(a1.y - a2.y) < 1;
        for (let sb = 0; sb < ptsB.length - 1; sb++) {
          const b1 = ptsB[sb];
          const b2 = ptsB[sb + 1];
          const bHoriz = Math.abs(b1.y - b2.y) < 1;
          if (aHoriz === bHoriz) continue;
          const h1 = aHoriz ? a1 : b1;
          const h2 = aHoriz ? a2 : b2;
          const v1 = aHoriz ? b1 : a1;
          const v2 = aHoriz ? b2 : a2;
          const minHX = Math.min(h1.x, h2.x) + 4;
          const maxHX = Math.max(h1.x, h2.x) - 4;
          const minVY = Math.min(v1.y, v2.y) + 4;
          const maxVY = Math.max(v1.y, v2.y) - 4;
          if (v1.x > minHX && v1.x < maxHX && h1.y > minVY && h1.y < maxVY) {
            crossovers.push({ x: v1.x, y: h1.y });
          }
        }
      }
    }
  }

  // Count unconnected input and output pins across all nodes
  const { unwiredInCount, unwiredOutCount } = countUnwiredPins(nodes, wires);

  const efficiencyScore =
    totalWireLengthPx > 0
      ? Math.min(
          100,
          Math.max(
            65,
            Math.round((idealManhattanLengthPx / totalWireLengthPx) * 100)
          )
        )
      : 100;

  const computeTimeMs = Number((performance.now() - startTime).toFixed(2));

  return {
    wireGeometries,
    junctionDots,
    crossovers,
    telemetry: {
      totalWires: wires.length,
      totalWireLengthPx: Math.round(totalWireLengthPx),
      idealManhattanLengthPx: Math.round(idealManhattanLengthPx),
      totalBends,
      gateCollisionsAvoided,
      wireCrossingsCount: crossovers.length,
      sharedFanoutTrunks,
      efficiencyScore,
      unconnectedInputPins: unwiredInCount,
      unconnectedOutputPins: unwiredOutCount,
      computeTimeMs,
    },
  };
}

/**
 * Counts how many input pins and output pins are currently unconnected across all nodes
 */
export function countUnwiredPins(
  nodes: CircuitNode[],
  wires: CircuitWire[]
): { unwiredInCount: number; unwiredOutCount: number } {
  const wiredInputs = new Set<string>();
  const wiredOutputs = new Set<string>();

  for (const w of wires) {
    const fDir = w.from.dir || "out";
    const tDir = w.to.dir || "in";
    if (fDir === "in") wiredInputs.add(`${w.from.node}:${w.from.port}`);
    else wiredOutputs.add(`${w.from.node}:${w.from.port}`);
    if (tDir === "in") wiredInputs.add(`${w.to.node}:${w.to.port}`);
    else wiredOutputs.add(`${w.to.node}:${w.to.port}`);
  }

  let unwiredInCount = 0;
  let unwiredOutCount = 0;

  for (const n of nodes) {
    if (n.type === "INPUT") {
      if (!wiredOutputs.has(`${n.id}:0`)) unwiredOutCount++;
      continue;
    }
    if (n.type === "OUTPUT") {
      if (!wiredInputs.has(`${n.id}:0`)) unwiredInCount++;
      continue;
    }
    const comp = COMP_SPECS[n.type];
    if (comp) {
      for (let i = 0; i < comp.inputs.length; i++) {
        if (!wiredInputs.has(`${n.id}:${i}`)) unwiredInCount++;
      }
      for (let i = 0; i < comp.outputs.length; i++) {
        if (!wiredOutputs.has(`${n.id}:${i}`)) unwiredOutCount++;
      }
      continue;
    }
    const spec = GATE_SPECS[n.type];
    if (spec) {
      for (let i = 0; i < spec.inputs; i++) {
        if (!wiredInputs.has(`${n.id}:${i}`)) unwiredInCount++;
      }
      if (!wiredOutputs.has(`${n.id}:0`)) unwiredOutCount++;
    }
  }

  return { unwiredInCount, unwiredOutCount };
}

interface PinCandidate {
  nodeId: number;
  nodeType: string;
  nodeLabel: string;
  port: number;
  pinName: string;
  x: number;
  y: number;
}

/**
 * Automatically calculates and synthesizes the most efficient pin-to-pin connections
 * for all unconnected logic gate, IC, INPUT, and OUTPUT pins on the canvas.
 *
 * Uses topological left-to-right flow (x_from < x_to), semantic pin matching
 * (e.g., 7447 a..g -> 7SEG a..g, CLK -> CLK), Manhattan distance minimization,
 * and fanout balancing so multi-input gates connect to distinct upstream sources.
 */
export function autoConnectUnwiredPins(params: {
  nodes: CircuitNode[];
  wires: CircuitWire[];
  targetNodeIds?: number[];
  allocateWireId: () => number;
}): {
  nextWires: CircuitWire[];
  addedCount: number;
  addedDescriptions: string[];
} {
  const { nodes, wires, targetNodeIds, allocateWireId } = params;
  const targetSet =
    targetNodeIds && targetNodeIds.length > 0 ? new Set(targetNodeIds) : null;

  const workingWires = [...wires];
  const wiredInputs = new Set<string>();
  const fanoutCount = new Map<string, number>();

  for (const w of workingWires) {
    const fDir = w.from.dir || "out";
    const tDir = w.to.dir || "in";
    if (tDir === "in") wiredInputs.add(`${w.to.node}:${w.to.port}`);
    else wiredInputs.add(`${w.from.node}:${w.from.port}`);
    if (fDir === "out") {
      const outKey = `${w.from.node}:${w.from.port}`;
      fanoutCount.set(outKey, (fanoutCount.get(outKey) || 0) + 1);
    }
    if (tDir === "out") {
      const outKey = `${w.to.node}:${w.to.port}`;
      fanoutCount.set(outKey, (fanoutCount.get(outKey) || 0) + 1);
    }
  }

  // Gather all output pins and all unconnected input pins
  const allOutputPins: PinCandidate[] = [];
  const openInputPins: PinCandidate[] = [];

  const sortedNodes = [...nodes].sort((a, b) => a.x - b.x || a.y - b.y);

  for (const n of sortedNodes) {
    const inScope = !targetSet || targetSet.has(n.id);

    if (n.type === "INPUT") {
      const pos = getNodePortWorldPos(n, 0, "out");
      if (pos) {
        allOutputPins.push({
          nodeId: n.id,
          nodeType: n.type,
          nodeLabel: n.label || "IN",
          port: 0,
          pinName: n.label || "OUT",
          x: pos.x,
          y: pos.y,
        });
      }
      continue;
    }

    if (n.type === "OUTPUT") {
      if (inScope && !wiredInputs.has(`${n.id}:0`)) {
        const pos = getNodePortWorldPos(n, 0, "in");
        if (pos) {
          openInputPins.push({
            nodeId: n.id,
            nodeType: n.type,
            nodeLabel: n.label || "OUT",
            port: 0,
            pinName: "IN",
            x: pos.x,
            y: pos.y,
          });
        }
      }
      continue;
    }

    const comp = COMP_SPECS[n.type];
    if (comp) {
      if (inScope) {
        comp.inputs.forEach((pin, idx) => {
          if (!wiredInputs.has(`${n.id}:${idx}`)) {
            const pos = getNodePortWorldPos(n, idx, "in");
            if (pos) {
              openInputPins.push({
                nodeId: n.id,
                nodeType: n.type,
                nodeLabel: n.label || comp.label,
                port: idx,
                pinName: pin.name || `IN${idx}`,
                x: pos.x,
                y: pos.y,
              });
            }
          }
        });
      }
      comp.outputs.forEach((pin, idx) => {
        const pos = getNodePortWorldPos(n, idx, "out");
        if (pos) {
          allOutputPins.push({
            nodeId: n.id,
            nodeType: n.type,
            nodeLabel: n.label || comp.label,
            port: idx,
            pinName: pin.name || `OUT${idx}`,
            x: pos.x,
            y: pos.y,
          });
        }
      });
      continue;
    }

    const spec = GATE_SPECS[n.type];
    if (spec) {
      if (inScope) {
        for (let idx = 0; idx < spec.inputs; idx++) {
          if (!wiredInputs.has(`${n.id}:${idx}`)) {
            const pos = getNodePortWorldPos(n, idx, "in");
            if (pos) {
              openInputPins.push({
                nodeId: n.id,
                nodeType: n.type,
                nodeLabel: n.label || n.type,
                port: idx,
                pinName: `IN${idx}`,
                x: pos.x,
                y: pos.y,
              });
            }
          }
        }
      }
      const outPos = getNodePortWorldPos(n, 0, "out");
      if (outPos) {
        allOutputPins.push({
          nodeId: n.id,
          nodeType: n.type,
          nodeLabel: n.label || n.type,
          port: 0,
          pinName: "Y",
          x: outPos.x,
          y: outPos.y,
        });
      }
    }
  }

  if (openInputPins.length === 0 || allOutputPins.length === 0) {
    return { nextWires: workingWires, addedCount: 0, addedDescriptions: [] };
  }

  const addedDescriptions: string[] = [];
  let addedCount = 0;

  // Track which source outputs have already been connected to a given target node
  // so a 2-input gate doesn't connect both inputs to the exact same source unless only 1 source exists
  const sourcesUsedByTargetNode = new Map<number, Set<string>>();
  for (const w of workingWires) {
    const s = sourcesUsedByTargetNode.get(w.to.node) || new Set<string>();
    s.add(`${w.from.node}:${w.from.port}`);
    sourcesUsedByTargetNode.set(w.to.node, s);
  }

  // Sort open input pins left-to-right, top-to-bottom
  openInputPins.sort((a, b) => a.x - b.x || a.y - b.y);

  for (const inPin of openInputPins) {
    if (wiredInputs.has(`${inPin.nodeId}:${inPin.port}`)) continue;

    const usedOnThisNode =
      sourcesUsedByTargetNode.get(inPin.nodeId) || new Set<string>();

    let bestOut: PinCandidate | null = null;
    let bestScore = Infinity;

    for (const outPin of allOutputPins) {
      if (outPin.nodeId === inPin.nodeId) continue;
      if (targetSet && !targetSet.has(outPin.nodeId)) continue;

      const outKey = `${outPin.nodeId}:${outPin.port}`;
      const currentFanout = fanoutCount.get(outKey) || 0;

      // Semantic 7-segment display matching (7447 outputs a..g -> 7SEG inputs a..g)
      if (
        inPin.nodeType === "7SEG" &&
        outPin.nodeType === "7447" &&
        inPin.port === outPin.port
      ) {
        bestOut = outPin;
        bestScore = -10000;
        break;
      }

      // Semantic clock pin matching
      const isClockPin =
        inPin.pinName.toUpperCase().includes("CLK") ||
        inPin.pinName.toUpperCase().includes("CP");
      const isClockSource =
        outPin.nodeLabel.toUpperCase().includes("CLK") ||
        outPin.nodeLabel.toUpperCase().includes("CLOCK");

      const dx = inPin.x - outPin.x;
      const dy = Math.abs(inPin.y - outPin.y);

      // Base geometric score: strongly prefer upstream left-to-right flow (dx > 0)
      let score =
        dx >= -10
          ? dx * 0.9 + dy * 1.65
          : Math.abs(dx) * 3.5 + dy * 2.2 + 650;

      // If wiring an OUTPUT LED block, strongly prefer logic gate/IC outputs over raw INPUT switches
      if (inPin.nodeType === "OUTPUT") {
        if (outPin.nodeType === "INPUT") {
          score += 900;
        } else {
          // Prefer unused gate outputs first
          score += currentFanout * 180;
        }
      } else {
        // Wiring an internal gate or IC input:
        // Penalize reusing the exact same output pin on multiple inputs of the same gate
        if (usedOnThisNode.has(outKey)) {
          score += 1200;
        }
        // Mild fanout balancing penalty so adjacent inputs pick adjacent switches/gates
        score += currentFanout * 95;
      }

      if (isClockPin && isClockSource) {
        score -= 450;
      }

      if (score < bestScore) {
        bestScore = score;
        bestOut = outPin;
      }
    }

    if (bestOut) {
      const outKey = `${bestOut.nodeId}:${bestOut.port}`;
      const newWire: CircuitWire = {
        id: allocateWireId(),
        from: { node: bestOut.nodeId, port: bestOut.port },
        to: { node: inPin.nodeId, port: inPin.port },
      };
      workingWires.push(newWire);
      wiredInputs.add(`${inPin.nodeId}:${inPin.port}`);
      fanoutCount.set(outKey, (fanoutCount.get(outKey) || 0) + 1);
      usedOnThisNode.add(outKey);
      sourcesUsedByTargetNode.set(inPin.nodeId, usedOnThisNode);
      addedCount++;
      addedDescriptions.push(
        `${bestOut.nodeLabel}.${bestOut.pinName} → ${inPin.nodeLabel}.${inPin.pinName}`
      );
    }
  }

  return {
    nextWires: workingWires,
    addedCount,
    addedDescriptions,
  };
}

/**
 * Connects a source node (Gate/INPUT A) directly to a target node (Gate/OUTPUT B)
 * by pairing the next available output port of A with the next unconnected input port of B.
 */
export function autoWireBetweenTwoNodes(params: {
  sourceNode: CircuitNode;
  targetNode: CircuitNode;
  wires: CircuitWire[];
  allocateWireId: () => number;
}): {
  nextWires: CircuitWire[];
  connectedPortPair: { fromPort: number; toPort: number } | null;
} {
  const { sourceNode, targetNode, wires, allocateWireId } = params;
  if (sourceNode.id === targetNode.id) {
    return { nextWires: wires, connectedPortPair: null };
  }

  // Ensure left-to-right or source->target direction: if user clicked OUTPUT then Gate, swap
  const firstIsInputOnly = sourceNode.type === "OUTPUT";
  const secondIsOutputOnly = targetNode.type === "INPUT";
  const fromNode =
    firstIsInputOnly || secondIsOutputOnly ? targetNode : sourceNode;
  const toNode =
    firstIsInputOnly || secondIsOutputOnly ? sourceNode : targetNode;

  // Determine number of output ports on fromNode
  let outCount = 0;
  if (fromNode.type === "INPUT") outCount = 1;
  else if (COMP_SPECS[fromNode.type])
    outCount = COMP_SPECS[fromNode.type].outputs.length;
  else if (GATE_SPECS[fromNode.type]) outCount = 1;

  // Determine number of input ports on toNode
  let inCount = 0;
  if (toNode.type === "OUTPUT") inCount = 1;
  else if (COMP_SPECS[toNode.type])
    inCount = COMP_SPECS[toNode.type].inputs.length;
  else if (GATE_SPECS[toNode.type]) inCount = GATE_SPECS[toNode.type].inputs;

  if (outCount === 0 || inCount === 0) {
    return { nextWires: wires, connectedPortPair: null };
  }

  // Find first unconnected input port on toNode (or fallback to port 0)
  const wiredToPorts = new Set(
    wires.filter((w) => w.to.node === toNode.id).map((w) => w.to.port)
  );
  let targetPort = 0;
  for (let p = 0; p < inCount; p++) {
    if (!wiredToPorts.has(p)) {
      targetPort = p;
      break;
    }
  }

  // Pick output port on fromNode (match index if multi-output bus, else 0)
  const sourcePort = Math.min(outCount - 1, targetPort);

  const filtered = wires.filter(
    (w) => !(w.to.node === toNode.id && w.to.port === targetPort)
  );
  const nextWires: CircuitWire[] = [
    ...filtered,
    {
      id: allocateWireId(),
      from: { node: fromNode.id, port: sourcePort },
      to: { node: toNode.id, port: targetPort },
    },
  ];

  return {
    nextWires,
    connectedPortPair: { fromPort: sourcePort, toPort: targetPort },
  };
}
