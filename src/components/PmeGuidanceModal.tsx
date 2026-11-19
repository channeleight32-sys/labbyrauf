import React, { useState } from "react";
import {
  X,
  Gauge,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  Flame,
  Check,
  Compass,
} from "lucide-react";
import { CircuitNode, CircuitWire } from "./CircuitLab";
import { CircuitLabSolverResult } from "../utils/circuitLabAnalogSolver";

export interface PmeDiagnosticsItem {
  nodeId: number;
  type: "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER";
  label: string;
  status: "OK" | "WARNING" | "CRITICAL" | "UNCONNECTED";
  title: string;
  reading: string;
  details: string;
  pmeRule: string;
  correctionTip: string;
}

interface PmeGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeMeterType?: "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER" | "DIAGNOSTICS";
  nodes: CircuitNode[];
  wires: CircuitWire[];
  analogSolution?: CircuitLabSolverResult;
  onAutoFixFault?: (fault: PmeDiagnosticsItem) => void;
}

type PmeTab = "DIAGNOSTICS" | "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER" | "CHART";

export default function PmeGuidanceModal({
  isOpen,
  onClose,
  activeMeterType = "DIAGNOSTICS",
  nodes,
  wires,
  analogSolution,
  onAutoFixFault,
}: PmeGuidanceModalProps) {
  const [activeTab, setActiveTab] = useState<PmeTab>(
    activeMeterType === "DIAGNOSTICS" ? "DIAGNOSTICS" : activeMeterType
  );

  // Keep active tab in sync if activeMeterType changes when opened
  React.useEffect(() => {
    if (activeMeterType) {
      setActiveTab(activeMeterType === "DIAGNOSTICS" ? "DIAGNOSTICS" : activeMeterType);
    }
  }, [activeMeterType]);

  if (!isOpen) return null;

  // Real-time Metrology Scanner: Inspect all meters on the canvas
  const meterNodes = nodes.filter(
    (n) =>
      n.type === "VOLTMETER" ||
      n.type === "AMMETER" ||
      n.type === "OHMMETER" ||
      n.type === "POWER_METER" ||
      n.type === "WATTMETER"
  );

  // Bidirectional terminal lookup (wires can originate or terminate at either end)
  const findPinConn = (nodeId: number, port: number, dir: "in" | "out") => {
    for (const w of wires) {
      if (w.to.node === nodeId && w.to.port === port && (!w.to.dir || w.to.dir === dir)) {
        return { wire: w, other: w.from };
      }
      if (w.from.node === nodeId && w.from.port === port && (!w.from.dir || w.from.dir === dir)) {
        return { wire: w, other: w.to };
      }
    }
    return null;
  };

  const diagnostics: PmeDiagnosticsItem[] = meterNodes.map((n) => {
    const meterType = (
      n.type === "WATTMETER" ? "POWER_METER" : n.type
    ) as "VOLTMETER" | "AMMETER" | "OHMMETER" | "POWER_METER";
    const label = n.label || n.type;

    if (meterType === "VOLTMETER") {
      const c0 = findPinConn(n.id, 0, "in");
      const c1 = findPinConn(n.id, 1, "in");
      const hasV0 = !!c0;
      const hasV1 = !!c1;

      if (!hasV0 && !hasV1) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "UNCONNECTED",
          title: "Open Test Leads (No Connection)",
          reading: "---.- V",
          details: "Both the Red Lead [V+] and Black Lead [V- / COM] are floating.",
          pmeRule: "Voltmeters must be connected IN PARALLEL across two points of potential difference.",
          correctionTip: "Connect Red [V+] to the component high side, and Black [V-] to the low side or circuit Ground.",
        };
      }

      if (!hasV0 || !hasV1) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "WARNING",
          title: hasV0
            ? "Floating Ground Reference [COM Open]"
            : "Floating Sense Probe [V+ Open]",
          reading: "Floating V",
          details: hasV0
            ? "Red probe [V+] is attached, but COM probe [V-] is open. Reading cannot establish a reference potential."
            : "Black COM probe [V-] is attached, but Red probe [V+] is open. No high-side node is being sensed.",
          pmeRule: "Voltage is an electrostatic potential difference (ΔV = V_plus - V_minus). Both reference points are needed.",
          correctionTip: hasV0
            ? "Wire the Black lead [V-] to circuit Ground (GND) or the other terminal of the measured element."
            : "Wire the Red lead [V+] to the positive or high-potential side of the measured element.",
        };
      }

      // Check if voltmeter is wired in series (e.g. only 1 wire leaving it, or blocking a series loop)
      const src0 = c0 ? nodes.find((x) => x.id === c0.other.node) : null;
      const src1 = c1 ? nodes.find((x) => x.id === c1.other.node) : null;
      const isSeriesFault =
        src0 &&
        src1 &&
        src0.id !== src1.id &&
        (src0.type.includes("VCC") || src0.type.includes("DC_VOLTAGE") || src0.type === "BATTERY") &&
        src1.type !== "GND" &&
        wires.filter((w) => w.to.node === src1.id || w.from.node === src1.id).length <= 2;

      const telem = analogSolution?.compTelemetry.get(n.id);
      const diffV = telem ? telem.vTerm0 - telem.vTerm1 : 0;

      if (isSeriesFault) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "CRITICAL",
          title: "⚠️ High-Impedance Series Block Fault",
          reading: `${diffV.toFixed(2)} V (Choking Load)`,
          details: "Voltmeter appears to be wired IN SERIES with the load branch. The meter's 10 MΩ internal impedance blocks loop current.",
          pmeRule: "NEVER connect a voltmeter in series. It acts as an open circuit (10 MΩ), stopping all current to downstream components.",
          correctionTip: "Rewire the voltmeter IN PARALLEL across the load. Restore direct continuity from power source to the load.",
        };
      }

      return {
        nodeId: n.id,
        type: meterType,
        label,
        status: "OK",
        title: "Normal Parallel Potential Measurement",
        reading: `${diffV >= 0 ? "+" : ""}${diffV.toFixed(2)} V`,
        details: `Measuring potential difference across ${src0?.label || "Node A"} and ${src1?.label || "Node B"}. High 10 MΩ input impedance minimizes loading error.`,
        pmeRule: "Standard parallel voltmeter configuration satisfies IEEE/IEC metrology rules.",
        correctionTip: "Connection is optimal. No changes required.",
      };
    }

    if (meterType === "AMMETER") {
      const cIn = findPinConn(n.id, 0, "in");
      const cOut = findPinConn(n.id, 0, "out");
      const hasIn = !!cIn;
      const hasOut = !!cOut;

      if (!hasIn && !hasOut) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "UNCONNECTED",
          title: "Open Series Loop (Ammeter Floating)",
          reading: "0.00 mA",
          details: "Neither I_IN nor I_OUT is connected. Current cannot flow through an open meter.",
          pmeRule: "Ammeters must be inserted IN SERIES by breaking the circuit branch: upstream supply enters I_IN (+), leaves I_OUT (-) to load.",
          correctionTip: "Cut the wire leading to the load, wire the upstream end to I_IN (+), and connect I_OUT (-) to the load.",
        };
      }

      if (!hasIn || !hasOut) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "WARNING",
          title: hasIn ? "Open Load Terminal (I_OUT Open)" : "Open Source Terminal (I_IN Open)",
          reading: "0.00 mA",
          details: "Ammeter has only one terminal wired. Circuit path is broken.",
          pmeRule: "Ammeters are 2-terminal series pass devices. Both input and output terminals must be wired.",
          correctionTip: hasIn
            ? "Connect I_OUT (-) to the downstream load or next component."
            : "Connect I_IN (+) to the upstream voltage feed.",
        };
      }

      // Check for dead short circuit: Ammeter connected directly across voltage supply or directly to GND with no series load
      const srcNode = cIn ? nodes.find((x) => x.id === cIn.other.node) : null;
      const destNode = cOut ? nodes.find((x) => x.id === cOut.other.node) : null;
      const telem = analogSolution?.compTelemetry.get(n.id);
      const currentMa = telem?.current_mA ?? 0;
      const absMa = Math.abs(currentMa);

      const isDirectRailShort =
        ((destNode?.type === "GND" &&
          (srcNode?.type.includes("VCC") || srcNode?.type.includes("DC_VOLTAGE") || srcNode?.type === "BATTERY")) ||
          (srcNode?.type === "GND" &&
            (destNode?.type.includes("VCC") || destNode?.type.includes("DC_VOLTAGE") || destNode?.type === "BATTERY")));

      const isShortCircuit =
        isDirectRailShort ||
        absMa > 2400 ||
        (telem && Math.abs(telem.vDrop) > 0.05 && absMa > 2000);

      if (isShortCircuit) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "CRITICAL",
          title: "🚨 DEAD SHORT CIRCUIT HAZARD (Blown Virtual Fuse)",
          reading: "> 2.50 A ⚠️ (OVERLOAD)",
          details: "Ammeter is placed in parallel directly across power rails or supply node without a current-limiting load! Internal shunt resistance is ~0.001 Ω, causing destructive short circuit currents.",
          pmeRule: "NEVER connect an ammeter in parallel across a voltage source. Always wire in SERIES with a resistive or active load.",
          correctionTip: "Disconnect ammeter from Ground. Insert a load resistor (e.g. 1kΩ or 330Ω) between I_OUT (-) and Ground.",
        };
      }

      return {
        nodeId: n.id,
        type: meterType,
        label,
        status: "OK",
        title: "Normal In-Series Current Loop",
        reading: absMa >= 1000 ? `${(currentMa / 1000).toFixed(2)} A` : `${currentMa.toFixed(2)} mA`,
        details: `Loop current flowing smoothly through 0.001 Ω precision shunt from ${srcNode?.label || "Source"} to ${destNode?.label || "Load"}.`,
        pmeRule: "In-line series ammeter placement verified. Kirchhoff's Current Law (KCL) maintained.",
        correctionTip: "Connection is optimal. No changes required.",
      };
    }

    if (meterType === "OHMMETER") {
      const c0 = findPinConn(n.id, 0, "in");
      const c1 = findPinConn(n.id, 1, "in");
      const has0 = !!c0;
      const has1 = !!c1;

      if (!has0 && !has1) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "UNCONNECTED",
          title: "Open Test Leads (No DUT Attached)",
          reading: "O.L. MΩ",
          details: "Both test probes (Ω+ Red & Ω- Black) are disconnected.",
          pmeRule: "Ohmmeter requires de-energized test leads connected directly across the Device Under Test (DUT).",
          correctionTip: "Attach test leads across the resistor or component whose resistance you want to inspect.",
        };
      }

      if (!has0 || !has1) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "WARNING",
          title: "Single Lead Connected (Open Loop)",
          reading: "O.L. MΩ",
          details: "One probe lead is floating. Resistance can only be measured across a complete 2-terminal path.",
          pmeRule: "An ohmmeter injects an internal micro-current between Ω+ and Ω- to measure voltage drop (R = V/I). Both leads must touch the component.",
          correctionTip: "Connect the second probe to the opposite terminal of the component.",
        };
      }

      // Check if circuit is energized (voltage present)
      const src0 = c0 ? nodes.find((x) => x.id === c0.other.node) : null;
      const src1 = c1 ? nodes.find((x) => x.id === c1.other.node) : null;
      const v0 = src0
        ? analogSolution?.getPinVoltage(src0.id, c0?.other.port ?? 0, c0?.other.dir || "out") ?? 0
        : 0;
      const v1 = src1
        ? analogSolution?.getPinVoltage(src1.id, c1?.other.port ?? 0, c1?.other.dir || "out") ?? 0
        : 0;
      const vDiff = Math.abs(v0 - v1);

      if (vDiff > 0.05 || Math.abs(v0) > 0.1 || Math.abs(v1) > 0.1) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "CRITICAL",
          title: "⚡ LIVE CIRCUIT DANGER (External Voltage Detected)",
          reading: "⚡ LIVE CKT!",
          details: `External voltage detected (${vDiff.toFixed(2)}V across leads). Active power in the circuit overrides the meter's internal test current. In real labs, this destroys the meter's internal A/D converter or blows its protection fuse!`,
          pmeRule: "CRITICAL PME RULE: NEVER measure resistance on an energized / live circuit! Power MUST be disconnected completely.",
          correctionTip: "Turn off or remove voltage sources (VCC, 9V, AC Sine) before using the ohmmeter.",
        };
      }

      // Check if component is directly probed across a resistive component
      const isAcrossSameComp = c0 && c1 && c0.other.node === c1.other.node;
      const comp = isAcrossSameComp && c0 ? nodes.find((x) => x.id === c0.other.node) : null;
      const telem = analogSolution?.compTelemetry.get(n.id);
      const nomR = comp?.analogParams?.resistanceOhms ?? telem?.resistanceOhms ?? 1000;
      const formattedR =
        nomR >= 1e6
          ? `${(nomR / 1e6).toFixed(2)} MΩ`
          : nomR >= 1000
          ? `${(nomR / 1000).toFixed(2)} kΩ`
          : `${nomR.toFixed(1)} Ω`;

      return {
        nodeId: n.id,
        type: meterType,
        label,
        status: "OK",
        title: isAcrossSameComp ? "De-Energized Component Measurement" : "De-Energized Network Resistance",
        reading: formattedR,
        details: isAcrossSameComp
          ? `Measuring ${comp?.label || comp?.type}. Circuit is unpowered (0V external). Internal precision test current injected safely.`
          : "Measuring equivalent network resistance between test leads.",
        pmeRule: "Accurate resistance reading confirmed. If measuring in-circuit, remember to isolate one lead (lift one leg) to avoid parallel sneak paths.",
        correctionTip: "Connection is optimal.",
      };
    }

    if (meterType === "POWER_METER") {
      const cV0 = findPinConn(n.id, 0, "in");
      const cV1 = findPinConn(n.id, 1, "in");
      const cIIn = findPinConn(n.id, 2, "in");
      const cIOut = findPinConn(n.id, 0, "out");

      const hasV = !!(cV0 && cV1);
      const hasI = !!(cIIn && cIOut);

      if (!hasV && !hasI) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "UNCONNECTED",
          title: "Wattmeter Unconnected (Both Coils Open)",
          reading: "0.00 mW",
          details: "Digital Wattmeter requires 4 terminals: Voltage Coil [V+, V-] in parallel, and Current Coil [I_IN, I_OUT] in series.",
          pmeRule: "Electric Power P = V × I. Both potential difference across the load and current through the load must be measured simultaneously.",
          correctionTip: "Wire V+ & V- across load element; insert I_IN & I_OUT in series into the load current loop.",
        };
      }

      if (hasV && !hasI) {
        const src0 = cV0 ? nodes.find((x) => x.id === cV0.other.node) : null;
        const src1 = cV1 ? nodes.find((x) => x.id === cV1.other.node) : null;
        const v0 = src0
          ? analogSolution?.getPinVoltage(src0.id, cV0?.other.port ?? 0, cV0?.other.dir || "out") ?? 0
          : 0;
        const v1 = src1
          ? analogSolution?.getPinVoltage(src1.id, cV1?.other.port ?? 0, cV1?.other.dir || "out") ?? 0
          : 0;
        const v = Math.abs(v0 - v1);

        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "WARNING",
          title: "Missing Current Coil (I_IN / I_OUT Open)",
          reading: `0.00 mW (V = ${v.toFixed(2)}V)`,
          details: `Voltage coil is connected (${v.toFixed(2)}V), but current coil has zero loop current because I_IN / I_OUT are open. P = V × 0 = 0W.`,
          pmeRule: "Power calculation requires both voltage across and current through the circuit branch.",
          correctionTip: "Insert the current coil [I_IN (+)] and [I_OUT (-)] in-line with the circuit loop.",
        };
      }

      if (!hasV && hasI) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "WARNING",
          title: "Missing Voltage Coil (V+ / V- Open)",
          reading: "0.00 mW (V Open)",
          details: "Current coil is carrying current in the circuit loop, but voltage sense terminals V+ and V- are floating. P = 0 × I = 0W.",
          pmeRule: "Wattmeter needs potential difference leads attached across the load to calculate P = V × I.",
          correctionTip: "Connect V+ (Red) to the load high side and V- (COM) to the load low side or Ground.",
        };
      }

      // Check for current coil short circuit
      const destNode = cIOut ? nodes.find((x) => x.id === cIOut.other.node) : null;
      const srcNode = cIIn ? nodes.find((x) => x.id === cIIn.other.node) : null;
      const telem = analogSolution?.compTelemetry.get(n.id);
      const isCoilShort =
        (destNode?.type === "GND" &&
          (srcNode?.type.includes("VCC") || srcNode?.type.includes("DC_VOLTAGE") || srcNode?.type === "BATTERY")) ||
        (srcNode?.type === "GND" &&
          (destNode?.type.includes("VCC") || destNode?.type.includes("DC_VOLTAGE") || destNode?.type === "BATTERY")) ||
        Math.abs(telem?.current_mA ?? 0) > 2400;

      if (isCoilShort) {
        return {
          nodeId: n.id,
          type: meterType,
          label,
          status: "CRITICAL",
          title: "🚨 Current Coil Short Circuit Hazard",
          reading: "⚠️ SHORT CKT!",
          details: "Current coil (I_IN to I_OUT) is connected directly between power and ground rails without a series load. Near 0Ω shunt creates a dangerous short circuit.",
          pmeRule: "The current coil of a wattmeter has very low resistance. It must only be in series with an active load.",
          correctionTip: "Add a load resistor downstream of I_OUT before connecting to Ground.",
        };
      }

      const v = Math.abs((telem ? telem.vTerm0 - telem.vTerm1 : 0) || telem?.vDrop || 0);
      const iMa = Math.abs(telem?.current_mA ?? 0);
      const pMw = v * iMa;

      return {
        nodeId: n.id,
        type: meterType,
        label,
        status: "OK",
        title: "Optimal 4-Terminal Dual-Coil Measurement",
        reading: pMw >= 1000 ? `${(pMw / 1000).toFixed(2)} W` : `${pMw.toFixed(1)} mW`,
        details: `Simultaneous 4-terminal measurement: V = ${v.toFixed(2)} V across load, I = ${iMa.toFixed(1)} mA through branch. Real Power P = ${pMw.toFixed(1)} mW.`,
        pmeRule: "Dual-coil wattmeter metrology verified. Both voltage drop and loop current captured cleanly.",
        correctionTip: "Connection is optimal. No changes required.",
      };
    }

    return {
      nodeId: n.id,
      type: meterType,
      label,
      status: "OK",
      title: "Active Meter",
      reading: "---",
      details: "Operating normally.",
      pmeRule: "Follow standard IEEE metrology.",
      correctionTip: "None",
    };
  });

  const faultCount = diagnostics.filter((d) => d.status === "CRITICAL" || d.status === "WARNING").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0b1120] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden text-slate-100">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-[#0d1629]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono tracking-tight text-white">
                  PME Metrology &amp; Meter Operation Guide
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300 font-semibold">
                  IEEE/IEC LAB STANDARDS
                </span>
                {faultCount > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 border border-red-700/60 text-red-300 font-bold flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    {faultCount} Meter Fault{faultCount > 1 ? "s" : ""} on Canvas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Precision Measurement Equipment rules: Voltmeter (Parallel), Ammeter (Series), Ohmmeter (De-energized), &amp; Wattmeter (Dual-Coil).
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Close PME Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-800/80 bg-[#080d19] overflow-x-auto text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("DIAGNOSTICS")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "DIAGNOSTICS"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-sm shadow-cyan-950"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Live Canvas Diagnostics</span>
            {diagnostics.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${faultCount > 0 ? "bg-red-500/30 text-red-300 border border-red-500/40" : "bg-cyan-900/60 text-cyan-300"}`}>
                {diagnostics.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("VOLTMETER")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "VOLTMETER"
                ? "bg-sky-500/20 text-sky-300 border border-sky-400/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <Gauge className="w-4 h-4 text-sky-400" />
            <span>Voltmeter [V]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("AMMETER")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "AMMETER"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Ammeter [A]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("OHMMETER")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "OHMMETER"
                ? "bg-amber-500/20 text-amber-300 border border-amber-400/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Ohmmeter [Ω]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("POWER_METER")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "POWER_METER"
                ? "bg-purple-500/20 text-purple-300 border border-purple-400/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <Flame className="w-4 h-4 text-purple-400" />
            <span>Wattmeter [W]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("CHART")}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all cursor-pointer font-bold ${
              activeTab === "CHART"
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-400/50 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>PME Comparison Chart</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: LIVE CANVAS DIAGNOSTICS */}
          {activeTab === "DIAGNOSTICS" && (
            <div className="space-y-4">
              <div className="bg-[#0e172a] border border-cyan-800/50 rounded-xl p-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-bold font-mono text-cyan-300">
                    <ShieldAlert className="w-4 h-4 text-cyan-400" />
                    <span>Real-Time Meter Connection Scanner</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    This scanner evaluates every voltmeter, ammeter, ohmmeter, and wattmeter placed on your circuit canvas against Kirchhoff&apos;s Laws (KCL &amp; KVL) and real laboratory metrology rules.
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono text-slate-400">Total Meters Placed</div>
                  <div className="text-xl font-mono font-bold text-white">{meterNodes.length}</div>
                </div>
              </div>

              {diagnostics.length === 0 ? (
                <div className="border border-dashed border-slate-700/80 rounded-xl p-8 text-center space-y-3 bg-[#0a0f1d]/60">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
                    <Gauge className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-200 font-mono">No Meters Currently on Canvas</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Drag or click to add a <strong>Digital Voltmeter</strong>, <strong>In-Line Ammeter</strong>, <strong>Digital Ohmmeter</strong>, or <strong>Wattmeter</strong> from the component box (under Meters &amp; Probes).
                    </p>
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-lg">
                      💡 Tip: Use the Quick Access Toolbar or press &quot;Meters &amp; Probes&quot; in the sidebar
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {diagnostics.map((diag) => {
                    const isOk = diag.status === "OK";
                    const isCrit = diag.status === "CRITICAL";
                    const isWarn = diag.status === "WARNING";
                    const isUnc = diag.status === "UNCONNECTED";

                    return (
                      <div
                        key={diag.nodeId}
                        className={`rounded-xl border p-4 space-y-3 transition-all ${
                          isCrit
                            ? "bg-red-950/20 border-red-500/50 shadow-lg shadow-red-950/30"
                            : isWarn
                            ? "bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30"
                            : isUnc
                            ? "bg-slate-900/40 border-slate-700/80"
                            : "bg-emerald-950/20 border-emerald-500/50 shadow-lg shadow-emerald-950/20"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                                  diag.type === "VOLTMETER"
                                    ? "bg-sky-950 text-sky-300 border border-sky-700/60"
                                    : diag.type === "AMMETER"
                                    ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                                    : diag.type === "OHMMETER"
                                    ? "bg-amber-950 text-amber-300 border border-amber-700/60"
                                    : "bg-purple-950 text-purple-300 border border-purple-700/60"
                                }`}
                              >
                                {diag.type}
                              </span>
                              <span className="text-xs font-mono font-bold text-white">{diag.label}</span>
                            </div>
                            <div className="text-xs font-sans font-semibold text-slate-200 mt-1 flex items-center gap-1.5">
                              {isCrit ? (
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                              ) : isWarn ? (
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                              ) : isUnc ? (
                                <Info className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              ) : (
                                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              )}
                              <span>{diag.title}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] font-mono text-slate-400">Live Reading</div>
                            <div
                              className={`text-sm font-mono font-bold ${
                                isCrit
                                  ? "text-red-400"
                                  : isWarn
                                  ? "text-amber-300"
                                  : isUnc
                                  ? "text-slate-500"
                                  : "text-emerald-300"
                              }`}
                            >
                              {diag.reading}
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <p className="text-xs text-slate-300 leading-relaxed font-sans">{diag.details}</p>

                        {/* Metrology Rule */}
                        <div className="bg-[#020617] border border-slate-800 rounded-lg p-2 text-[11px] font-mono space-y-1">
                          <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wide">
                            Metrology Rule:
                          </span>
                          <p className="text-slate-400 font-sans leading-normal">{diag.pmeRule}</p>
                        </div>

                        {/* Actionable Correction Tip */}
                        <div
                          className={`rounded-lg p-2.5 text-xs font-sans space-y-1 ${
                            isOk
                              ? "bg-emerald-950/40 border border-emerald-800/40 text-emerald-200"
                              : "bg-cyan-950/40 border border-cyan-700/50 text-cyan-200"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-bold font-mono text-[11px] uppercase">
                            <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{isOk ? "Status Summary" : "Operator Action Required"}</span>
                          </div>
                          <p className="leading-relaxed text-[11.5px]">{diag.correctionTip}</p>
                          {onAutoFixFault && !isOk && (
                            <button
                              type="button"
                              onClick={() => onAutoFixFault(diag)}
                              className="mt-2 w-full py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-colors cursor-pointer"
                            >
                              <Zap className="w-3.5 h-3.5 text-yellow-300" />
                              <span>Auto-Correct Connection (Apply PME Rule)</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOLTMETER GUIDE */}
          {activeTab === "VOLTMETER" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Theory & Rules */}
                <div className="space-y-4">
                  <div className="bg-[#0e172a] border border-sky-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold font-mono text-sky-300">
                      <Gauge className="w-5 h-5 text-sky-400" />
                      <span>Digital Voltmeter (DVM) · Metrology Constitution</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      A voltmeter measures the <strong>electrostatic potential difference (voltage drop)</strong> between two spatial points in an electrical circuit: <code>ΔV = V_Red - V_Black</code>.
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-emerald-300">Rule 1: Always Wire IN PARALLEL:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            Place the probes across the component terminals without breaking or interrupting the existing circuit wire.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-emerald-300">Rule 2: High Internal Impedance (10 MΩ):</strong>
                          <span className="text-slate-400 block mt-0.5">
                            An ideal voltmeter has infinite resistance (R_in → ∞). Our precision DVM has 10,000,000 Ω internal resistance to avoid drawing current from the circuit (zero circuit loading).
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-red-300">Rule 3: NEVER Wire in Series:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            If you break the circuit wire and place the voltmeter in-line, its 10 MΩ resistance will choke the current to zero, turning your circuit into an open circuit!
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Probe Color Code */}
                  <div className="bg-[#020617] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
                      Lead Polarity Standard
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 space-y-1">
                        <span className="text-red-400 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                          V+ (Red Probe)
                        </span>
                        <p className="text-[11px] text-slate-400 font-sans">
                          Positive sensing lead. Connect to the high-potential side of the component.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60 space-y-1">
                        <span className="text-slate-300 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                          V- / COM (Black Probe)
                        </span>
                        <p className="text-[11px] text-slate-400 font-sans">
                          Common negative reference lead. Connect to the low-potential side or circuit Ground.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Diagram */}
                <div className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
                    <Gauge className="w-4 h-4" />
                    <span>Schematic Wiring Demonstration</span>
                  </div>

                  <div className="space-y-4">
                    {/* Correct Diagram */}
                    <div className="bg-[#020617] border border-emerald-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          CORRECT: Parallel Connection Across Load
                        </span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                          RECOMMENDED
                        </span>
                      </div>
                      <svg viewBox="0 0 360 80" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Supply rail */}
                        <line x1="20" y1="25" x2="80" y2="25" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="50" y="16" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">+5V VCC</text>

                        {/* Load Resistor */}
                        <rect x="80" y="15" width="60" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                        <text x="110" y="29" fill="#f8fafc" fontSize="10" fontFamily="monospace" textAnchor="middle">R1 1kΩ</text>
                        <line x1="140" y1="25" x2="190" y2="25" stroke="#64748b" strokeWidth="2.5" />
                        {/* Ground */}
                        <line x1="190" y1="25" x2="190" y2="40" stroke="#64748b" strokeWidth="2.5" />
                        <line x1="175" y1="40" x2="205" y2="40" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="180" y1="44" x2="200" y2="44" stroke="#38bdf8" strokeWidth="2" />
                        <line x1="185" y1="48" x2="195" y2="48" stroke="#38bdf8" strokeWidth="2" />

                        {/* Voltmeter in parallel below */}
                        <line x1="80" y1="25" x2="80" y2="60" stroke="#ef4444" strokeWidth="1.8" strokeDasharray="3 2" />
                        <line x1="80" y1="60" x2="230" y2="60" stroke="#ef4444" strokeWidth="1.8" />
                        <line x1="140" y1="25" x2="140" y2="70" stroke="#475569" strokeWidth="1.8" strokeDasharray="3 2" />
                        <line x1="140" y1="70" x2="230" y2="70" stroke="#475569" strokeWidth="1.8" />

                        {/* Voltmeter box */}
                        <rect x="230" y="45" width="110" height="32" rx="5" fill="#0c192e" stroke="#38bdf8" strokeWidth="2" />
                        <text x="285" y="60" fill="#38bdf8" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">VOLTMETER [V]</text>
                        <text x="285" y="72" fill="#22c55e" fontSize="9" fontFamily="monospace" textAnchor="middle">5.00 V (Parallel)</text>
                      </svg>
                    </div>

                    {/* Wrong Diagram */}
                    <div className="bg-[#020617] border border-red-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          WRONG: Voltmeter Placed in Series
                        </span>
                        <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-700/50">
                          FAULT / BLOCKED
                        </span>
                      </div>
                      <svg viewBox="0 0 360 70" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Supply rail */}
                        <line x1="20" y1="35" x2="70" y2="35" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="45" y="24" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">+5V</text>

                        {/* Voltmeter choking circuit */}
                        <rect x="70" y="18" width="115" height="34" rx="5" fill="#1f0909" stroke="#ef4444" strokeWidth="2" />
                        <text x="127" y="32" fill="#f87171" fontSize="9" fontFamily="monospace" fontWeight="bold" textAnchor="middle">VOLTMETER (10MΩ)</text>
                        <text x="127" y="44" fill="#fca5a5" fontSize="8" fontFamily="monospace" textAnchor="middle">Choking Current!</text>

                        <line x1="185" y1="35" x2="240" y2="35" stroke="#475569" strokeWidth="2" strokeDasharray="3 2" />
                        <rect x="240" y="25" width="55" height="20" rx="3" fill="#1e293b" stroke="#64748b" strokeWidth="1.5" />
                        <text x="267" y="39" fill="#94a3b8" fontSize="9" fontFamily="monospace" textAnchor="middle">R1 (0 mA)</text>
                        <line x1="295" y1="35" x2="330" y2="35" stroke="#475569" strokeWidth="2" />
                        <text x="335" y="38" fill="#ef4444" fontSize="14" fontWeight="bold">✕</text>
                      </svg>
                      <p className="text-[11px] text-red-300 font-sans leading-tight">
                        Because of the 10 MΩ internal resistance, current is reduced to 0.0005 mA (0.5 µA), starving the circuit.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AMMETER GUIDE */}
          {activeTab === "AMMETER" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Theory & Rules */}
                <div className="space-y-4">
                  <div className="bg-[#061a12] border border-emerald-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold font-mono text-emerald-300">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <span>In-Line Ammeter · Metrology Constitution</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      An ammeter measures the <strong>flow rate of electric charge (current I = dq/dt)</strong> passing through a specific branch of a circuit, quantified in Amperes (A) or milliamperes (mA).
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-emerald-300">Rule 1: Always Wire IN SERIES:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            You MUST break/cut the circuit line so that the current enters <code>I_IN (+)</code> and exits <code>I_OUT (-)</code> to reach the downstream component.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-emerald-300">Rule 2: Near-Zero Shunt Resistance (~0.001 Ω):</strong>
                          <span className="text-slate-400 block mt-0.5">
                            An ideal ammeter has zero internal resistance (R_m → 0). Our precision ammeter uses a calibrated 0.001 Ω shunt so it causes virtually no voltage drop across itself.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-red-300">Rule 3: NEVER Wire in Parallel across Power Sources:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            Because R_m ≈ 0 Ω, wiring an ammeter across a voltage source causes a <strong>DEAD SHORT CIRCUIT</strong> (I = V / 0.001Ω → infinite). In a physical lab, this causes loud sparks, trips breakers, or blows the DMM fuse.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Pinout */}
                  <div className="bg-[#020617] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
                      Ammeter Port Flow
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                          I_IN (+) Input Port
                        </span>
                        <p className="text-[11px] text-slate-400 font-sans">
                          Current entry port. Connect to the upstream voltage feed or power source.
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-700/50 space-y-1">
                        <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-400 inline-block" />
                          I_OUT (-) Output Port
                        </span>
                        <p className="text-[11px] text-slate-400 font-sans">
                          Current exit port. Connect directly to the downstream load element.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Diagram */}
                <div className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span>In-Line Current Schematic Demonstration</span>
                  </div>

                  <div className="space-y-4">
                    {/* Correct Diagram */}
                    <div className="bg-[#020617] border border-emerald-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          CORRECT: In-Line Series Insertion
                        </span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                          RECOMMENDED
                        </span>
                      </div>
                      <svg viewBox="0 0 360 70" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Supply rail */}
                        <line x1="15" y1="35" x2="55" y2="35" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="35" y="24" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">+5V</text>

                        {/* Ammeter in series */}
                        <rect x="55" y="16" width="110" height="38" rx="5" fill="#042f1f" stroke="#10b981" strokeWidth="2" />
                        <text x="110" y="32" fill="#34d399" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AMMETER [A]</text>
                        <text x="110" y="44" fill="#6ee7b7" fontSize="8.5" fontFamily="monospace" textAnchor="middle">5.00 mA (In-Series)</text>

                        {/* Wire to load */}
                        <line x1="165" y1="35" x2="220" y2="35" stroke="#34d399" strokeWidth="2.5" />
                        <polygon points="195,31 205,35 195,39" fill="#10b981" />

                        {/* Load Resistor */}
                        <rect x="220" y="25" width="60" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" />
                        <text x="250" y="39" fill="#f8fafc" fontSize="9.5" fontFamily="monospace" textAnchor="middle">1kΩ Load</text>

                        {/* Ground */}
                        <line x1="280" y1="35" x2="315" y2="35" stroke="#64748b" strokeWidth="2.5" />
                        <line x1="315" y1="28" x2="315" y2="42" stroke="#38bdf8" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Wrong Diagram */}
                    <div className="bg-[#020617] border border-red-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          WRONG: Ammeter Wired in Parallel Across Supply
                        </span>
                        <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-700/50">
                          DEAD SHORT HAZARD
                        </span>
                      </div>
                      <svg viewBox="0 0 360 75" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Supply rail */}
                        <line x1="20" y1="20" x2="70" y2="20" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="45" y="14" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">+5V VCC</text>

                        {/* Ammeter straight to ground */}
                        <line x1="70" y1="20" x2="110" y2="20" stroke="#ef4444" strokeWidth="2" />
                        <rect x="110" y="8" width="120" height="38" rx="5" fill="#3b0808" stroke="#ef4444" strokeWidth="2" />
                        <text x="170" y="24" fill="#f87171" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">AMMETER (0.001Ω)</text>
                        <text x="170" y="37" fill="#fca5a5" fontSize="8.5" fontFamily="monospace" textAnchor="middle">&gt; 5000 A FAULT! ⚠️</text>

                        <line x1="230" y1="20" x2="270" y2="20" stroke="#ef4444" strokeWidth="2" />
                        <line x1="270" y1="20" x2="270" y2="50" stroke="#ef4444" strokeWidth="2" />
                        <text x="290" y="42" fill="#ef4444" fontSize="11" fontFamily="monospace" fontWeight="bold">GND (SHORT!)</text>
                      </svg>
                      <p className="text-[11px] text-red-300 font-sans leading-tight">
                        Connecting the 0.001 Ω ammeter straight across power and ground causes excessive fault current, blowing the virtual fuse.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: OHMMETER GUIDE */}
          {activeTab === "OHMMETER" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Theory & Rules */}
                <div className="space-y-4">
                  <div className="bg-[#1f1606] border border-amber-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold font-mono text-amber-300">
                      <Zap className="w-5 h-5 text-amber-400" />
                      <span>Digital Ohmmeter (Ω) · Metrology Constitution</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      An ohmmeter measures the <strong>electric resistance (opposition to current flow, R = V/I)</strong> of a component or branch, quantified in Ohms (Ω), kiloohms (kΩ), or megaohms (MΩ).
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-red-300">CRITICAL RULE: Always Measure on DE-ENERGIZED Circuits:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            The circuit <strong>MUST BE COMPLETELY POWERED OFF</strong> (0V external). An ohmmeter works by injecting its own tiny precision test current (I_test ≈ 100 µA) and measuring the resulting millivolt drop. Any external voltage corrupts the calculation and will destroy real meter circuitry!
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-amber-300">Isolate Component to Prevent Sneak Paths:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            When measuring a resistor still connected to a board with other components, parallel branches create alternate paths (R_eq = R1 || R2), resulting in a reading lower than nominal. <strong>Lift one leg / disconnect one pin</strong> for 100% true isolated measurement.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-amber-300">Open-Loop Display: O.L. (Over-Limit):</strong>
                          <span className="text-slate-400 block mt-0.5">
                            When test leads are not touching or disconnected, the ohmmeter measures infinite air resistance and displays <code>O.L.</code> (Over Limit). Touching probes directly together displays <code>0.00 Ω</code> (continuity test).
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Current Box */}
                  <div className="bg-[#020617] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
                      Internal Operating Principle
                    </div>
                    <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs font-mono text-amber-200/90 leading-relaxed">
                      <code>R_DUT = V_sense / I_internal_source</code>
                      <p className="text-[11px] text-slate-400 font-sans mt-1">
                        Because the meter supplies its own internal battery and current source, external power sources will push stray current backwards into the sensing circuit.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Diagram */}
                <div className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    <span>Ohmmeter Wiring &amp; Isolation Demonstration</span>
                  </div>

                  <div className="space-y-4">
                    {/* Correct Diagram */}
                    <div className="bg-[#020617] border border-emerald-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          CORRECT: Unpowered &amp; Isolated Component
                        </span>
                        <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-700/50">
                          TRUE RESISTANCE
                        </span>
                      </div>
                      <svg viewBox="0 0 360 75" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Resistor DUT */}
                        <rect x="150" y="15" width="60" height="20" rx="3" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
                        <text x="180" y="29" fill="#f8fafc" fontSize="10" fontFamily="monospace" textAnchor="middle">10 kΩ</text>

                        {/* Test leads */}
                        <line x1="150" y1="25" x2="80" y2="25" stroke="#ef4444" strokeWidth="2" />
                        <line x1="80" y1="25" x2="80" y2="50" stroke="#ef4444" strokeWidth="2" />

                        <line x1="210" y1="25" x2="280" y2="25" stroke="#475569" strokeWidth="2" />
                        <line x1="280" y1="25" x2="280" y2="50" stroke="#475569" strokeWidth="2" />

                        {/* Ohmmeter Casing */}
                        <rect x="50" y="45" width="260" height="25" rx="4" fill="#1c1404" stroke="#f59e0b" strokeWidth="1.8" />
                        <text x="180" y="61" fill="#fbbf24" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          OHMMETER: 10.00 kΩ (Circuit Unpowered ✓)
                        </text>
                      </svg>
                    </div>

                    {/* Wrong Diagram */}
                    <div className="bg-[#020617] border border-red-500/40 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono font-bold">
                        <span className="text-red-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          WRONG: Measuring Resistance While Circuit is Energized
                        </span>
                        <span className="text-[10px] bg-red-950 text-red-300 px-2 py-0.5 rounded border border-red-700/50">
                          METER DESTRUCTION HAZARD
                        </span>
                      </div>
                      <svg viewBox="0 0 360 70" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                        {/* Live circuit */}
                        <line x1="20" y1="25" x2="80" y2="25" stroke="#ef4444" strokeWidth="2.5" />
                        <text x="50" y="16" fill="#ef4444" fontSize="9.5" fontFamily="monospace" textAnchor="middle">12V LIVE ⚡</text>

                        <rect x="80" y="15" width="55" height="20" rx="3" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
                        <text x="107" y="29" fill="#f8fafc" fontSize="9.5" fontFamily="monospace" textAnchor="middle">R1</text>

                        {/* Ohmmeter clamped on live */}
                        <line x1="80" y1="25" x2="80" y2="50" stroke="#ef4444" strokeWidth="2" />
                        <line x1="135" y1="25" x2="135" y2="50" stroke="#ef4444" strokeWidth="2" />

                        <rect x="60" y="45" width="240" height="22" rx="4" fill="#3b0808" stroke="#ef4444" strokeWidth="1.8" />
                        <text x="180" y="60" fill="#fca5a5" fontSize="9.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                          ⚡ LIVE CIRCUIT ERROR (Disconnect Power!)
                        </text>
                      </svg>
                      <p className="text-[11px] text-red-300 font-sans leading-tight">
                        External voltage drives current into the meter, corrupting the A/D reference and risking blown fuses.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: WATTMETER GUIDE */}
          {activeTab === "POWER_METER" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Left Column: Theory & Rules */}
                <div className="space-y-4">
                  <div className="bg-[#1b0928] border border-purple-800/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-bold font-mono text-purple-300">
                      <Flame className="w-5 h-5 text-purple-400" />
                      <span>Digital Wattmeter (Power Meter) · Metrology Constitution</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      A wattmeter measures <strong>instantaneous and active electric power (P = V × I)</strong> dissipated by an electrical component, quantified in Watts (W), milliwatts (mW), or kilowatts (kW).
                    </p>

                    <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-purple-300">Rule 1: 4-Terminal Dual-Coil Architecture:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            A real wattmeter contains two distinct physical elements: a <strong>Voltage Coil</strong> (high resistance) and a <strong>Current Coil</strong> (low resistance). BOTH must be wired!
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-purple-300">Rule 2: Voltage Coil Wires IN PARALLEL:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            Connect <code>V+ (Red)</code> and <code>V- (COM)</code> across the load to sense the potential difference (V).
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong className="text-purple-300">Rule 3: Current Coil Wires IN SERIES:</strong>
                          <span className="text-slate-400 block mt-0.5">
                            Break the circuit branch so current enters <code>I_IN (+)</code> and exits <code>I_OUT (-)</code> into the load (I).
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Reference */}
                  <div className="bg-[#020617] border border-slate-800 rounded-xl p-4 space-y-2">
                    <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wide">
                      Wattmeter 4-Terminal Pinout
                    </div>
                    <div className="grid grid-cols-2 gap-2.5 text-xs font-mono">
                      <div className="p-2 rounded bg-sky-950/30 border border-sky-800/40">
                        <span className="text-sky-400 font-bold">V+ (Red)</span>
                        <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">Voltage coil (+) across high-side.</p>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-700/60">
                        <span className="text-slate-300 font-bold">V- (COM)</span>
                        <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">Voltage coil (-) across low-side / GND.</p>
                      </div>
                      <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40">
                        <span className="text-emerald-400 font-bold">I_IN (+)</span>
                        <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">Current coil entry from upstream feed.</p>
                      </div>
                      <div className="p-2 rounded bg-teal-950/30 border border-teal-800/40">
                        <span className="text-teal-400 font-bold">I_OUT (-)</span>
                        <p className="text-[10.5px] text-slate-400 font-sans mt-0.5">Current coil exit to downstream load.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Visual Diagram */}
                <div className="bg-[#090e1a] border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-4">
                  <div className="text-xs font-mono font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-4 h-4" />
                    <span>Complete 4-Terminal Dual-Coil Wiring Diagram</span>
                  </div>

                  <div className="bg-[#020617] border border-purple-500/40 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold">
                      <span className="text-purple-400 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-purple-400" />
                        Full Dual-Coil Wiring: P = V × I
                      </span>
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-700/50">
                        STANDARD
                      </span>
                    </div>

                    <svg viewBox="0 0 360 110" className="w-full h-auto bg-[#030712] rounded-lg border border-slate-800">
                      {/* Supply rail */}
                      <line x1="20" y1="35" x2="60" y2="35" stroke="#ef4444" strokeWidth="2.5" />
                      <text x="40" y="25" fill="#ef4444" fontSize="10" fontFamily="monospace" textAnchor="middle">+12V</text>

                      {/* Current coil in series */}
                      <line x1="60" y1="35" x2="90" y2="35" stroke="#10b981" strokeWidth="2" />
                      <rect x="90" y="20" width="160" height="75" rx="6" fill="#130722" stroke="#a855f7" strokeWidth="2" />
                      <text x="170" y="36" fill="#c084fc" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        WATTMETER (P = V·I)
                      </text>

                      {/* Internal coils labels */}
                      <text x="170" y="52" fill="#34d399" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
                        [I_IN] ── Current Coil (0.001Ω) ──→ [I_OUT]
                      </text>
                      <text x="170" y="68" fill="#38bdf8" fontSize="8.5" fontFamily="monospace" textAnchor="middle">
                        [V+] ─── Potential Coil (10MΩ) ─── [V-]
                      </text>
                      <text x="170" y="86" fill="#facc15" fontSize="10.5" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                        P = 120.0 mW
                      </text>

                      {/* Out to Load */}
                      <line x1="250" y1="35" x2="280" y2="35" stroke="#10b981" strokeWidth="2" />
                      <rect x="280" y="25" width="55" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.8" />
                      <text x="307" y="39" fill="#f8fafc" fontSize="9" fontFamily="monospace" textAnchor="middle">Load</text>

                      {/* Voltage coil sensing across load */}
                      <path d="M 270 35 L 270 12 L 110 12 L 110 20" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" />
                      <text x="190" y="9" fill="#ef4444" fontSize="8" fontFamily="monospace" textAnchor="middle">V+ to Load Top</text>

                      {/* V- to Ground */}
                      <path d="M 335 35 L 345 35 L 345 102 L 230 102 L 230 95" fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 2" />
                      <text x="290" y="100" fill="#94a3b8" fontSize="8" fontFamily="monospace" textAnchor="middle">V- to GND</text>
                    </svg>

                    <p className="text-[11px] text-purple-200 font-sans leading-relaxed">
                      If you connect only the voltage leads, power reads 0W (current is missing). If you connect only current leads, power reads 0W (voltage is missing). Both must be active.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PME COMPARISON CHART */}
          {activeTab === "CHART" && (
            <div className="space-y-4">
              <div className="bg-[#0e172a] border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-bold font-mono text-cyan-300">
                  Precision Measurement Equipment (PME) Standard Matrix
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  IEEE Standard 1459-2010 &amp; University Metrology Laboratory rules at a glance.
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#080d19]">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#0d1629] text-slate-300">
                      <th className="p-3">Instrument</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Placement</th>
                      <th className="p-3">Internal Impedance</th>
                      <th className="p-3">Circuit State</th>
                      <th className="p-3 text-red-400">Worst Wrong-Way Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-300">
                    <tr className="hover:bg-sky-950/20">
                      <td className="p-3 font-bold text-sky-400 flex items-center gap-1.5">
                        <Gauge className="w-4 h-4 text-sky-400" />
                        Digital Voltmeter [V]
                      </td>
                      <td className="p-3">Potential Difference ΔV</td>
                      <td className="p-3 font-bold text-emerald-400">PARALLEL</td>
                      <td className="p-3">10 MΩ (High)</td>
                      <td className="p-3">Energized / Live</td>
                      <td className="p-3 text-red-300">
                        Wired in Series: Chokes circuit current, turning it into open circuit.
                      </td>
                    </tr>

                    <tr className="hover:bg-emerald-950/20">
                      <td className="p-3 font-bold text-emerald-400 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        In-Line Ammeter [A]
                      </td>
                      <td className="p-3">Electric Current I</td>
                      <td className="p-3 font-bold text-emerald-400">SERIES</td>
                      <td className="p-3">0.001 Ω (Near Zero)</td>
                      <td className="p-3">Energized / Live</td>
                      <td className="p-3 text-red-300">
                        Wired in Parallel across supply: Dead short circuit, trips breaker / blows fuse!
                      </td>
                    </tr>

                    <tr className="hover:bg-amber-950/20">
                      <td className="p-3 font-bold text-amber-400 flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        Digital Ohmmeter [Ω]
                      </td>
                      <td className="p-3">Resistance R = V/I</td>
                      <td className="p-3 font-bold text-emerald-400">ACROSS ISOLATED DUT</td>
                      <td className="p-3">Active Sensing Current</td>
                      <td className="p-3 font-bold text-amber-300">DE-ENERGIZED (0V Power OFF)</td>
                      <td className="p-3 text-red-300">
                        Measuring Live Circuit: Destroys A/D sensing converter or blows fuse!
                      </td>
                    </tr>

                    <tr className="hover:bg-purple-950/20">
                      <td className="p-3 font-bold text-purple-400 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-purple-400" />
                        Digital Wattmeter [W]
                      </td>
                      <td className="p-3">Active Real Power P = V·I</td>
                      <td className="p-3 font-bold text-purple-300">DUAL-COIL (V // and I series)</td>
                      <td className="p-3">V Coil: 10MΩ / I Coil: 0.001Ω</td>
                      <td className="p-3">Energized / Live</td>
                      <td className="p-3 text-red-300">
                        Current coil placed in parallel across voltage rail (Dead Short).
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-[#0d1629] text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>IST Circuit Metrology Standards</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors cursor-pointer"
            >
              Back to Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
