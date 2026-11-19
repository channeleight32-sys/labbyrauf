import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Gauge,
  Radio,
  TrendingUp,
  Zap,
  FileCode2,
  Sliders,
  Download,
  Upload,
  CheckCircle2,
  Check,
  Copy,
  Sparkles,
  BarChart3,
  Layers,
  Cpu,
  Terminal,
  Play,
  Grid3X3,
} from "lucide-react";
import type { AnalogNode, AnalogWire, AnalogCompType } from "./SeriesParallelBuilder";
import MatrixDebugView from "./MatrixDebugView";
import OscilloscopeSignalAnalysisPanel from "./OscilloscopeSignalAnalysisPanel";
import {
  SpiceNodeSolution,
  SpiceBranchSolution,
  SpiceConvergenceReport,
  executeRawSpiceNetlist,
  runNgspiceOperatingPoint,
  runNgspiceTransient,
  runNgspiceAcSweep,
  runTheveninEquivalent,
} from "../utils/ngspiceEngine";

export interface FunctionGenConfig {
  enabled: boolean;
  waveform: "SINE" | "SQUARE" | "TRIANGLE" | "PULSE";
  frequencyHz: number;
  amplitudeV: number;
  dcOffsetV: number;
  dutyCyclePct: number;
}

export type SpiceAnalysisTab =
  | "INSTRUMENTS"
  | "NGSPICE_ENGINE"
  | "MATRIX_DEBUG"
  | "TRANSIENT"
  | "AC_BODE"
  | "DC_SWEEP"
  | "PARAM_SWEEP"
  | "MONTE_CARLO"
  | "SPICE_NETLIST";

interface TelemetryEntry {
  vDrop: number;
  current_mA: number;
  power_mW: number;
  vTerm0: number;
  vTerm1: number;
  diffResistanceOhm?: number;
  operatingRegion?: string;
  spiceModelName?: string;
}

interface MultisimInstrumentsPanelProps {
  nodes: AnalogNode[];
  wires: AnalogWire[];
  compTelemetry: Map<number, TelemetryEntry>;
  nodalSolutions?: SpiceNodeSolution[];
  branchSolutions?: SpiceBranchSolution[];
  convergence?: SpiceConvergenceReport;
  getTermNet: (nodeId: number, term: number) => number;
  getNetVoltage: (netId: number) => number;
  reqOhm: number | null;
  fgConfig: FunctionGenConfig;
  onChangeFgConfig: React.Dispatch<React.SetStateAction<FunctionGenConfig>>;
  simRunning: boolean;
  onImportSpiceNodes?: (
    parsedNodes: Omit<AnalogNode, "id">[],
    parsedWires: [number, number, number, number][]
  ) => void;
  requestedTab?: { tab: SpiceAnalysisTab; seq: number } | null;
}

export default function MultisimInstrumentsPanel({
  nodes,
  wires,
  compTelemetry,
  nodalSolutions = [],
  branchSolutions = [],
  convergence,
  getTermNet,
  getNetVoltage,
  reqOhm,
  fgConfig,
  onChangeFgConfig,
  simRunning,
  onImportSpiceNodes,
  requestedTab,
}: MultisimInstrumentsPanelProps) {
  const [activeTab, setActiveTab] = useState<SpiceAnalysisTab>("INSTRUMENTS");
  const [showMnaMatrix, setShowMnaMatrix] = useState<boolean>(false);
  const [transientCsvDownloaded, setTransientCsvDownloaded] = useState<boolean>(false);

  useEffect(() => {
    if (requestedTab?.tab) {
      setActiveTab(requestedTab.tab);
    }
  }, [requestedTab]);

  // XMM1 Digital Multimeter state
  const [dmmMode, setDmmMode] = useState<"VDC" | "VAC" | "IDC" | "OHM" | "DB">("VDC");
  const [dmmTargetNodeId, setDmmTargetNodeId] = useState<number>(0);

  // XBP1 Bode Plotter cursor index (0..60)
  const [bodeCursorIdx, setBodeCursorIdx] = useState<number>(28);

  // DC Sweep & Parameter Sweep config
  const [dcSweepMaxV, setDcSweepMaxV] = useState<number>(24);
  const [tolerancePct, setTolerancePct] = useState<number>(5);
  const [copiedNetlist, setCopiedNetlist] = useState<boolean>(false);
  const [customNetlistText, setCustomNetlistText] = useState<string>("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [rawBatchResult, setRawBatchResult] = useState<ReturnType<
    typeof executeRawSpiceNetlist
  > | null>(null);

  const measurableNodes = useMemo(
    () => nodes.filter((n) => n.type !== "GND"),
    [nodes]
  );

  const activeDmmNode = useMemo(() => {
    if (measurableNodes.length === 0) return null;
    return (
      measurableNodes.find((n) => n.id === dmmTargetNodeId) ||
      measurableNodes[0]
    );
  }, [measurableNodes, dmmTargetNodeId]);

  // Real-time Time-Domain MNA Transient Waveform (XSC1) across 2 periods of XFG1 (or 5*tau for DC reactive circuits)
  const transientMna = useMemo(() => {
    const numSteps = 120;
    const freqHz = Math.max(1, fgConfig.frequencyHz || 1000);
    const totalTime = 2 / freqHz;
    const dt = totalTime / numSteps;
    const primarySrc = nodes.find((n) => n.type === "VS" || n.type === "FG");
    const vPeak = fgConfig.enabled ? fgConfig.amplitudeV : primarySrc?.value ?? 12;
    const vOffset = fgConfig.enabled ? fgConfig.dcOffsetV : 0;

    // Force time-varying excitation on primary source when Function Generator is active
    const sourceTimeOverrides: Record<number, (tSec: number) => number> = {};
    if (primarySrc && fgConfig.enabled) {
      sourceTimeOverrides[primarySrc.id] = (tSec: number) => {
        const phaseFrac = ((tSec * freqHz) % 1 + 1) % 1;
        let raw = Math.sin(2 * Math.PI * freqHz * tSec);
        if (fgConfig.waveform === "SQUARE") {
          raw = phaseFrac < fgConfig.dutyCyclePct / 100 ? 1 : -1;
        } else if (fgConfig.waveform === "TRIANGLE") {
          raw = phaseFrac < 0.5 ? -1 + 4 * phaseFrac : 3 - 4 * phaseFrac;
        } else if (fgConfig.waveform === "PULSE") {
          raw = phaseFrac < fgConfig.dutyCyclePct / 100 ? 1 : 0;
        }
        return vOffset + vPeak * raw;
      };
    }

    const tranRes = runNgspiceTransient(nodes, wires, {
      tStart: 0,
      tStop: totalTime,
      dt,
      method: "TRAPEZOIDAL",
      fgConfig,
      sourceTimeOverrides,
      strictGround: false,
    });

    if (!tranRes.converged || tranRes.timePointsS.length === 0) {
      return {
        ch1Path: "",
        ch2Path: "",
        vOutRms: 0,
        timePointsS: [] as number[],
        srcVSeries: [] as number[],
        obsVSeries: [] as number[],
        srcLabel: primarySrc?.label ?? "Source",
        obsLabel: activeDmmNode?.label ?? "Load",
        netSeriesColumns: [] as { header: string; values: number[] }[],
        error: tranRes.abortedReason || "Transient solver did not converge",
      };
    }

    const srcNet = primarySrc ? getTermNet(primarySrc.id, 0) : 1;
    const obsNode = activeDmmNode && activeDmmNode.id !== primarySrc?.id
      ? activeDmmNode
      : nodes.find((n) => n.type !== "GND" && n.id !== primarySrc?.id) ?? primarySrc;

    const obsNet0 = obsNode ? getTermNet(obsNode.id, 0) : srcNet;
    const obsNet1 = obsNode ? getTermNet(obsNode.id, 1) : 0;
    const obsVSeries = tranRes.timePointsS.map((_, i) => {
      const v0 = tranRes.netVoltagesHistory[obsNet0]?.[i] ?? 0;
      const v1 = tranRes.netVoltagesHistory[obsNet1]?.[i] ?? 0;
      return obsNode && obsNode.id !== primarySrc?.id ? v0 - v1 : v0;
    });
    const srcVSeries = tranRes.timePointsS.map(
      (_, i) => tranRes.netVoltagesHistory[srcNet]?.[i] ?? 0
    );

    const netSeriesColumns = Object.entries(tranRes.netVoltagesHistory)
      .map(([netStr, values]) => ({
        netId: Number(netStr),
        header: `V_Net${netStr}_V`,
        values,
      }))
      .filter((col) => col.netId > 0)
      .sort((a, b) => a.netId - b.netId)
      .map(({ header, values }) => ({ header, values }));

    const maxPeak = Math.max(
      1,
      Math.abs(vPeak) + Math.abs(vOffset),
      ...srcVSeries.map(Math.abs),
      ...obsVSeries.map(Math.abs)
    );

    const ch1Pts: string[] = [];
    const ch2Pts: string[] = [];
    const nPts = tranRes.timePointsS.length;
    for (let i = 0; i < nPts; i++) {
      const u = nPts > 1 ? i / (nPts - 1) : 0;
      const x = 45 + u * 640;
      const y1 = 105 - (srcVSeries[i] / maxPeak) * 75;
      const y2 = 105 - (obsVSeries[i] / maxPeak) * 75;
      ch1Pts.push(`${x.toFixed(1)},${Math.max(15, Math.min(195, y1)).toFixed(1)}`);
      ch2Pts.push(`${x.toFixed(1)},${Math.max(15, Math.min(195, y2)).toFixed(1)}`);
    }

    const sqMean = obsVSeries.reduce((s, v) => s + v * v, 0) / Math.max(1, nPts);
    return {
      ch1Path: ch1Pts.length > 0 ? `M ${ch1Pts.join(" L ")}` : "",
      ch2Path: ch2Pts.length > 0 ? `M ${ch2Pts.join(" L ")}` : "",
      vOutRms: Math.sqrt(sqMean),
      timePointsS: tranRes.timePointsS,
      srcVSeries,
      obsVSeries,
      srcLabel: primarySrc?.label ?? "Source",
      obsLabel: obsNode?.label ?? "Load",
      netSeriesColumns,
      error: undefined as string | undefined,
    };
  }, [fgConfig, activeDmmNode, nodes, wires, getTermNet]);

  const handleDownloadTransientCsv = () => {
    if (transientMna.timePointsS.length === 0) return;
    const safeSrc = transientMna.srcLabel.replace(/[^a-zA-Z0-9_]/g, "_");
    const safeObs = transientMna.obsLabel.replace(/[^a-zA-Z0-9_]/g, "_");
    const headers = [
      "Sample",
      "Time_s",
      "Time_ms",
      `CH1_${safeSrc}_V`,
      `CH2_${safeObs}_V`,
      ...transientMna.netSeriesColumns.map((c) => c.header),
    ];
    const lines = [headers.join(",")];
    transientMna.timePointsS.forEach((tSec, idx) => {
      const row: (string | number)[] = [
        idx,
        tSec.toExponential(6),
        (tSec * 1000).toFixed(6),
        (transientMna.srcVSeries[idx] ?? 0).toFixed(6),
        (transientMna.obsVSeries[idx] ?? 0).toFixed(6),
        ...transientMna.netSeriesColumns.map((col) =>
          (col.values[idx] ?? 0).toFixed(6)
        ),
      ];
      lines.push(row.join(","));
    });

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spice_transient_oscilloscope_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTransientCsvDownloaded(true);
    window.setTimeout(() => setTransientCsvDownloaded(false), 2200);
  };

  const transientWaveforms = {
    ch1Path: transientMna.ch1Path,
    ch2Path: transientMna.ch2Path,
  };

  // Real-time Complex Small-Signal AC Frequency Sweep / Bode Plotter (XBP1) from 1 Hz to 1 MHz (61 points)
  const bodeData = useMemo(() => {
    const primarySrc = nodes.find((n) => n.type === "VS" || n.type === "FG");
    const obsNode = activeDmmNode && activeDmmNode.id !== primarySrc?.id
      ? activeDmmNode
      : nodes.find((n) => n.type === "C" || n.type === "CPOL" || n.type === "CNP") ??
        nodes.find((n) => n.type !== "GND" && n.id !== primarySrc?.id);

    let outNetId: number | undefined;
    if (obsNode) {
      const n0 = getTermNet(obsNode.id, 0);
      const n1 = getTermNet(obsNode.id, 1);
      const inNet = primarySrc ? getTermNet(primarySrc.id, 0) : 1;
      if (n0 !== 0 && n0 !== inNet) outNetId = n0;
      else if (n1 !== 0 && n1 !== inNet) outNetId = n1;
      else outNetId = n0 !== 0 ? n0 : n1;
    }

    const dcV = convergence?.solutionVectorX.slice(0, convergence.unknownNodesCount) ?? [];
    const sweep = runNgspiceAcSweep(nodes, wires, {
      fStart: 1,
      fStop: 1_000_000,
      points: 61,
      sweepType: "LOG",
      outputNetId: outNetId,
      acMagnitudeV: fgConfig.enabled ? fgConfig.amplitudeV : primarySrc?.value ?? 1,
      strictGround: false,
      dcOperatingVoltages: dcV,
    });

    if (!sweep.converged || sweep.frequencies.length === 0) {
      return {
        points: Array.from({ length: 61 }).map((_, idx) => ({
          freqHz: Math.pow(10, (idx / 60) * 6),
          magDb: 0,
          phaseDeg: 0,
        })),
        f0Hz: 0,
        error: sweep.abortedReason || "AC sweep failed",
      };
    }

    const points = sweep.frequencies.map((pt) => ({
      freqHz: pt.freqHz,
      magDb: pt.gainDb,
      phaseDeg: pt.phaseDeg,
    }));

    // Detect true -3 dB cutoff frequency or resonant peak directly from solved Bode points
    const maxMagDb = Math.max(...points.map((p) => p.magDb));
    const lowFreqDb = points[0]?.magDb ?? 0;
    const highFreqDb = points[points.length - 1]?.magDb ?? 0;
    let f0Hz = fgConfig.frequencyHz || 1000;

    if (maxMagDb - Math.min(lowFreqDb, highFreqDb) > 6 && maxMagDb > Math.max(lowFreqDb, highFreqDb) + 1.5) {
      // Bandpass peak
      const peakPt = points.reduce((best, p) => (p.magDb > best.magDb ? p : best), points[0]);
      f0Hz = peakPt.freqHz;
    } else {
      const targetDb = Math.max(lowFreqDb, highFreqDb) - 3.0103;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if ((a.magDb - targetDb) * (b.magDb - targetDb) <= 0) {
          const frac = Math.abs(b.magDb - a.magDb) > 1e-6 ? (targetDb - a.magDb) / (b.magDb - a.magDb) : 0.5;
          f0Hz = Math.pow(10, Math.log10(a.freqHz) + frac * (Math.log10(b.freqHz) - Math.log10(a.freqHz)));
          break;
        }
      }
    }

    return { points, f0Hz, error: undefined as string | undefined };
  }, [nodes, wires, activeDmmNode, getTermNet, convergence, fgConfig.enabled, fgConfig.amplitudeV, fgConfig.frequencyHz]);

  // Compute DMM readout strictly from MNA .OP / Transient RMS / Complex AC / 1A Thévenin R_eq
  const dmmReadout = useMemo(() => {
    if (!activeDmmNode) {
      return { main: "0.000", unit: "V DC", sub: "No component selected" };
    }
    const t = compTelemetry.get(activeDmmNode.id);
    const vDrop = Math.abs(t?.vDrop ?? 0);
    const iMa = Math.abs(t?.current_mA ?? 0);
    const net0 = getTermNet(activeDmmNode.id, 0);
    const net1 = getTermNet(activeDmmNode.id, 1);

    switch (dmmMode) {
      case "VDC":
        return {
          main: vDrop.toFixed(4),
          unit: "V DC",
          sub: `V(+) = ${(t?.vTerm0 ?? 0).toFixed(3)}V · V(−) = ${(t?.vTerm1 ?? 0).toFixed(3)}V`,
        };
      case "VAC": {
        const vRms = fgConfig.enabled ? transientMna.vOutRms : 0;
        return {
          main: vRms.toFixed(4),
          unit: "V RMS",
          sub: fgConfig.enabled
            ? `True MNA RMS @ ${fgConfig.frequencyHz} Hz (${fgConfig.waveform})`
            : `AC Source OFF (DC only — enable XFG1 for AC RMS)`,
        };
      }
      case "IDC":
        return {
          main: iMa.toFixed(4),
          unit: "mA DC",
          sub: `Branch Power P = ${(t?.power_mW ?? 0).toFixed(3)} mW`,
        };
      case "OHM": {
        const thev = runTheveninEquivalent(nodes, wires, net0, net1);
        const effOhm = iMa > 1e-4 ? vDrop / (iMa / 1000) : thev ?? reqOhm ?? 0;
        return {
          main: effOhm >= 1000 ? (effOhm / 1000).toFixed(3) : effOhm.toFixed(2),
          unit: effOhm >= 1000 ? "kΩ" : "Ω",
          sub:
            iMa > 1e-4
              ? `Active R = V/I · Thévenin R_th = ${(thev ?? reqOhm ?? effOhm).toFixed(2)} Ω`
              : thev !== null
              ? `1A Test-Current Thévenin R_eq = ${thev.toFixed(2)} Ω`
              : `Open Circuit (∞ Ω)`,
        };
      }
      case "DB": {
        const vRef = fgConfig.enabled ? Math.max(1e-6, transientMna.vOutRms) : Math.max(1e-6, vDrop);
        const dbv = 20 * Math.log10(vRef);
        return {
          main: dbv.toFixed(2),
          unit: "dBV",
          sub: `Ref 1.000 V RMS (${(dbv + 2.21).toFixed(2)} dBu)`,
        };
      }
    }
  }, [activeDmmNode, compTelemetry, dmmMode, fgConfig, reqOhm, nodes, wires, getTermNet, transientMna.vOutRms]);

  // XWM1 Wattmeter calculation using real complex AC MNA phasor power when AC active, else real DC operating point
  const wattmeterData = useMemo(() => {
    if (fgConfig.enabled) {
      const dcV = convergence?.solutionVectorX.slice(0, convergence.unknownNodesCount) ?? [];
      const singleAc = runNgspiceAcSweep(nodes, wires, {
        fStart: Math.max(1, fgConfig.frequencyHz),
        fStop: Math.max(2, fgConfig.frequencyHz + 1),
        points: 2,
        sweepType: "LINEAR",
        acMagnitudeV: fgConfig.amplitudeV,
        strictGround: false,
        dcOperatingVoltages: dcV,
      });
      if (singleAc.converged && singleAc.frequencies.length > 0) {
        const pt = singleAc.frequencies[0];
        const realMw = Math.abs(pt.realPowerW) * 1000;
        const apparentMva = Math.abs(pt.apparentPowerVa) * 1000;
        const reactiveMvar = Math.abs(pt.reactivePowerVar) * 1000;
        const pf = Math.max(0, Math.min(1, Math.abs(pt.powerFactor)));
        return {
          realMw,
          apparentMva,
          reactiveMvar,
          pf,
          phaseDeg: pt.inputImpedancePhaseDeg,
        };
      }
    }

    const t = activeDmmNode ? compTelemetry.get(activeDmmNode.id) : null;
    const pMw = Math.abs(t?.power_mW ?? 0);
    return {
      realMw: pMw,
      apparentMva: pMw,
      reactiveMvar: 0,
      pf: 1.0,
      phaseDeg: 0,
    };
  }, [activeDmmNode, compTelemetry, nodes, wires, convergence, fgConfig]);

  // Real MNA DC Sweep Curve (runs full ngspice operating-point per voltage step)
  const dcSweepPoints = useMemo(() => {
    const sweepTargetSrc = nodes.find((n) => n.type === "VS" || n.type === "FG");
    const observeNode =
      activeDmmNode && activeDmmNode.id !== sweepTargetSrc?.id
        ? activeDmmNode
        : nodes.find((n) => n.type !== "GND" && n.type !== "VS" && n.type !== "FG");

    const rows: { vs: number; vNode: number; iMa: number; pMw: number }[] = [];
    for (let step = 0; step <= 12; step++) {
      const vs = (step / 12) * dcSweepMaxV;
      if (sweepTargetSrc) {
        const sweptNodes = nodes.map((n) =>
          n.id === sweepTargetSrc.id ? { ...n, value: vs } : n
        );
        const res = runNgspiceOperatingPoint(sweptNodes, wires, {
          ...fgConfig,
          enabled: sweepTargetSrc.type === "FG",
          amplitudeV: vs,
          dcOffsetV: vs,
        });
        const tObs = observeNode ? res.compTelemetry.get(observeNode.id) : undefined;
        const tSrc = res.compTelemetry.get(sweepTargetSrc.id);
        const vNode = Math.abs(tObs?.vDrop ?? vs);
        const iMa = Math.abs(tObs?.current_mA ?? tSrc?.current_mA ?? 0);
        rows.push({ vs, vNode, iMa, pMw: vNode * iMa });
      } else {
        rows.push({ vs, vNode: 0, iMa: 0, pMw: 0 });
      }
    }
    return rows;
  }, [dcSweepMaxV, activeDmmNode, nodes, wires, fgConfig]);

  // Maximum Power Transfer Parameter Sweep via MNA on primary load resistor
  const paramSweepPoints = useMemo(() => {
    const loadR =
      nodes.find((n) => (n.type === "R" || n.type === "POT") && n.id === activeDmmNode?.id) ||
      [...nodes].reverse().find((n) => n.type === "R" || n.type === "POT");
    const vSource =
      nodes.find((n) => n.type === "VS" || n.type === "FG")?.value ?? 12;

    let rSource = 100;
    const pts: { rLoad: number; vLoad: number; pLoadMw: number }[] = [];

    if (loadR) {
      // Measure true Thévenin source resistance seen at loadR terminals using MNA
      const openRes = runNgspiceOperatingPoint(
        nodes.map((n) => (n.id === loadR.id ? { ...n, value: 1e6 } : n)),
        wires,
        fgConfig
      );
      const vOc = Math.abs(openRes.compTelemetry.get(loadR.id)?.vDrop ?? vSource);
      const midTestRes = runNgspiceOperatingPoint(
        nodes.map((n) => (n.id === loadR.id ? { ...n, value: 100 } : n)),
        wires,
        fgConfig
      );
      const tMid = midTestRes.compTelemetry.get(loadR.id);
      const vMid = Math.abs(tMid?.vDrop ?? vOc * 0.5);
      const iMidA = Math.abs(tMid?.current_mA ?? 0) / 1000;
      if (iMidA > 1e-6 && vOc > vMid) {
        rSource = Math.max(1, (vOc - vMid) / iMidA);
      }

      for (let i = 1; i <= 25; i++) {
        const rLoad = i * 20;
        const sweepRes = runNgspiceOperatingPoint(
          nodes.map((n) => (n.id === loadR.id ? { ...n, value: rLoad } : n)),
          wires,
          fgConfig
        );
        const t = sweepRes.compTelemetry.get(loadR.id);
        const vLoad = Math.abs(t?.vDrop ?? 0);
        const pLoadMw = Math.abs(t?.power_mW ?? 0);
        pts.push({ rLoad, vLoad, pLoadMw });
      }
      return { pts, rSource, vSource: vOc || vSource };
    }

    for (let i = 1; i <= 25; i++) {
      const rLoad = i * 20;
      const iAmp = vSource / (rSource + rLoad);
      pts.push({ rLoad, vLoad: iAmp * rLoad, pLoadMw: iAmp * iAmp * rLoad * 1000 });
    }
    return { pts, rSource, vSource };
  }, [nodes, wires, fgConfig, activeDmmNode]);

  // Real MNA Monte Carlo Tolerance Statistical Runs (16 full circuit solves)
  const monteCarloRuns = useMemo(() => {
    const targetNode = activeDmmNode;
    const runs: {
      run: number;
      vOut: number;
      iMa: number;
      devPct: number;
    }[] = [];

    for (let r = 1; r <= 16; r++) {
      const jitteredNodes = nodes.map((n, idx) => {
        if (n.type !== "R" && n.type !== "POT" && n.type !== "ZD" && n.type !== "VS") return n;
        const pseudo =
          Math.sin(r * 12.9898 + idx * 78.233 + nodes.length * 19.13) *
          Math.cos(r * 4.1415 + idx);
        const scale = 1 + (pseudo * tolerancePct) / 100;
        return { ...n, value: Math.max(0.1, n.value * scale) };
      });
      const simRes = runNgspiceOperatingPoint(jitteredNodes, wires, fgConfig);
      const t = targetNode ? simRes.compTelemetry.get(targetNode.id) : undefined;
      const pseudoPrimary = Math.sin(r * 12.9898 + nodes.length * 19.13) * Math.cos(r * 4.1415);
      runs.push({
        run: r,
        vOut: Math.abs(t?.vDrop ?? 0),
        iMa: Math.abs(t?.current_mA ?? 0),
        devPct: pseudoPrimary * tolerancePct,
      });
    }

    const vList = runs.map((x) => x.vOut);
    const minV = Math.min(...vList);
    const maxV = Math.max(...vList);
    const meanV = vList.reduce((a, b) => a + b, 0) / vList.length;
    const stdV = Math.sqrt(
      vList.reduce((a, b) => a + Math.pow(b - meanV, 2), 0) / vList.length
    );

    return { runs, minV, maxV, meanV, stdV };
  }, [activeDmmNode, tolerancePct, nodes, wires, fgConfig]);

  // Live Berkeley SPICE3 / Multisim Netlist Generator
  const generatedSpiceNetlist = useMemo(() => {
    const lines: string[] = [
      `* =================================================================`,
      `* NI MULTISIM / BERKELEY SPICE3 COMPATIBLE NETLIST (.CIR)`,
      `* Generated Live by IST Circuit & Logic Lab (Real-Time MNA Engine)`,
      `* =================================================================`,
    ];

    for (const n of nodes) {
      if (n.type === "GND") continue;
      const net0 = getTermNet(n.id, 0);
      const net1 = getTermNet(n.id, 1);
      switch (n.type) {
        case "VS":
          lines.push(`${n.label} ${net0} ${net1} DC ${n.value}V`);
          break;
        case "FG":
          lines.push(
            `${n.label} ${net0} ${net1} SIN(${fgConfig.dcOffsetV}V ${fgConfig.amplitudeV}V ${fgConfig.frequencyHz}Hz)`
          );
          break;
        case "IS":
          lines.push(`${n.label} ${net0} ${net1} DC ${n.value}mA`);
          break;
        case "R":
        case "POT":
          lines.push(`${n.label} ${net0} ${net1} ${n.value}`);
          break;
        case "L":
          lines.push(`${n.label} ${net0} ${net1} ${n.value}mH`);
          break;
        case "C":
          lines.push(`${n.label} ${net0} ${net1} ${n.value}uF`);
          break;
        case "D":
          lines.push(`D_${n.label} ${net0} ${net1} D1N4007 ; V_F=${n.value}V`);
          break;
        case "ZD":
          lines.push(`DZ_${n.label} ${net0} ${net1} D1N4733A ; V_Z=${n.value}V`);
          break;
        case "LED":
          lines.push(`DLED_${n.label} ${net0} ${net1} LED_RED ; V_F=${n.value}V`);
          break;
        case "BJT":
          lines.push(`Q_${n.label} ${net0} ${net0} ${net1} Q2N2222 ; Beta=${n.value}`);
          break;
        case "MOS":
          lines.push(`M_${n.label} ${net0} ${net0} ${net1} ${net1} IRF540N ; State=${n.value >= 1 ? "ON" : "OFF"}`);
          break;
        case "OPAMP":
          lines.push(`X_${n.label} ${net0} 0 ${net1} LM741_SUBCKT ; Gain=${n.value}`);
          break;
        default:
          lines.push(`X_${n.label} ${net0} ${net1} ${n.type}_MODEL PARAMS: VAL=${n.value}`);
      }
    }

    lines.push(``);
    lines.push(`* --- Multisim SPICE Simulation Control Directives ---`);
    lines.push(`.OP`);
    lines.push(
      `.TRAN ${(1 / (fgConfig.frequencyHz * 50)).toExponential(2)}s ${(2 / fgConfig.frequencyHz).toExponential(2)}s`
    );
    lines.push(`.AC DEC 20 1Hz 1MEGHz`);
    lines.push(`.END`);
    return lines.join("\n");
  }, [nodes, getTermNet, fgConfig]);

  const parseSpiceNumberWithSuffix = (rawToken: string, compType: AnalogCompType): number => {
    const clean = rawToken.replace(/(ohm|ω|v|a|hz|s)$/i, "").trim();
    const m = clean.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)(meg|g|k|m|u|µ|n|p|uh|mh|uf|nf|pf|ma|ua)?/i);
    if (!m) return 100;
    const n = parseFloat(m[1]);
    if (!isFinite(n)) return 100;
    const suf = (m[2] || "").toLowerCase();
    if (!suf) return n;
    if (compType === "C") {
      if (suf.startsWith("p")) return n * 1e-6;
      if (suf.startsWith("n")) return n * 1e-3;
      if (suf.startsWith("u") || suf.startsWith("µ")) return n;
      if (suf === "m" || suf === "mf") return n * 1e3;
      return n;
    }
    if (compType === "L") {
      if (suf.startsWith("u") || suf.startsWith("µ")) return n * 1e-3;
      if (suf.startsWith("m")) return n;
      if (suf === "h") return n * 1e3;
      return n;
    }
    if (compType === "IS") {
      if (suf.startsWith("u") || suf.startsWith("µ")) return n * 1e-3;
      if (suf.startsWith("m")) return n;
      return n * 1000;
    }
    if (suf === "meg" || m[2] === "M") return n * 1e6;
    if (suf === "g") return n * 1e9;
    if (suf === "k") return n * 1e3;
    if (suf === "m" || suf === "ma") return n * 1e-3;
    if (suf === "u" || suf === "µ" || suf === "ua") return n * 1e-6;
    if (suf === "n") return n * 1e-9;
    if (suf === "p") return n * 1e-12;
    return n;
  };

  const handleParseAndImportNetlist = () => {
    const src = (customNetlistText || generatedSpiceNetlist).trim();
    const lines = src.split(/\r?\n/);
    const newNodes: Omit<AnalogNode, "id">[] = [];
    const pinsByNet = new Map<string, { nodeIdx: number; term: number }[]>();

    const registerNet = (netToken: string, nodeIdx: number, term: number) => {
      const key = netToken.trim().toLowerCase();
      const norm = key === "gnd" || key === "0v" ? "0" : key;
      if (!pinsByNet.has(norm)) pinsByNet.set(norm, []);
      pinsByNet.get(norm)!.push({ nodeIdx, term });
    };

    let idx = 0;
    for (const raw of lines) {
      const noComment = raw.split(";")[0].trim();
      if (!noComment || noComment.startsWith("*") || noComment.startsWith(".")) continue;
      const parts = noComment.split(/\s+/);
      if (parts.length < 4) continue;
      const label = parts[0];
      const ch = label[0].toUpperCase();
      let type: AnalogCompType = "R";
      if (ch === "V") type = "VS";
      else if (ch === "I") type = "IS";
      else if (ch === "L") type = "L";
      else if (ch === "C") type = "C";
      else if (ch === "D") type = label.toUpperCase().startsWith("DZ") ? "ZD" : label.toUpperCase().includes("LED") ? "LED" : "D";
      else if (ch === "Q") type = "BJT";
      else if (ch === "M") type = "MOS";

      const is3Term = type === "BJT" || type === "MOS";
      const valIdx = is3Term && parts.length >= 5 ? 4 : parts.length >= 4 && !/^(DC|SIN|AC)$/i.test(parts[3]) ? 3 : parts.length - 1;
      const rawValTok = parts[valIdx] || parts[parts.length - 1];
      const numVal = parseSpiceNumberWithSuffix(rawValTok, type);

      const nodeIdx = newNodes.length;
      newNodes.push({
        type,
        label,
        x: 120 + (idx % 4) * 160,
        y: 120 + Math.floor(idx / 4) * 140,
        orient: type === "VS" || type === "C" || is3Term ? "V" : "H",
        value: type === "D" ? 0.7 : type === "LED" ? 2.0 : numVal,
      });

      if (is3Term && parts.length >= 4) {
        registerNet(parts[1], nodeIdx, 0); // Collector / Drain
        registerNet(parts[2], nodeIdx, 2); // Base / Gate
        registerNet(parts[3], nodeIdx, 1); // Emitter / Source
      } else {
        registerNet(parts[1], nodeIdx, 0);
        registerNet(parts[2], nodeIdx, 1);
      }
      idx++;
    }

    if (newNodes.length > 0 && onImportSpiceNodes) {
      const gndIdx = newNodes.length;
      newNodes.push({
        type: "GND",
        label: "GND",
        x: 120,
        y: 360,
        orient: "V",
        value: 0,
      });
      registerNet("0", gndIdx, 0);

      const newWires: [number, number, number, number][] = [];
      for (const [, endpoints] of pinsByNet.entries()) {
        for (let k = 0; k < endpoints.length - 1; k++) {
          const a = endpoints[k];
          const b = endpoints[k + 1];
          if (a.nodeIdx !== b.nodeIdx || a.term !== b.term) {
            newWires.push([a.nodeIdx, a.term, b.nodeIdx, b.term]);
          }
        }
      }

      onImportSpiceNodes(newNodes, newWires);
      setImportStatus(`Synthesized ${idx} components & ${pinsByNet.size} electrical nets onto schematic canvas.`);
      setTimeout(() => setImportStatus(null), 3500);
    }
  };

  const activeBodePoint =
    bodeData.points[Math.min(bodeData.points.length - 1, Math.max(0, bodeCursorIdx))];

  return (
    <div className="bg-[#0d1526] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Top Multisim Ribbon Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                NI Multisim Compatible Virtual Instruments &amp; SPICE Analysis Rack
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-[10px] font-mono font-bold text-emerald-300">
                100% FREE · REAL-TIME MNA SPICE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live Digital Multimeter (XMM1), Function Generator (XFG1), Bode Plotter (XBP1), Wattmeter (XWM1), Transient, DC/Parametric Sweep, Monte Carlo &amp; SPICE Netlist.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "INSTRUMENTS" as const, label: "Bench", fullTitle: "Virtual Bench (XMM1 DMM, XFG1 Function Gen, XWM1 Wattmeter)", icon: Gauge },
            { id: "NGSPICE_ENGINE" as const, label: "SPICE", fullTitle: "ngspice.js Engine (Nodal Voltages & Branch Currents)", icon: Cpu },
            { id: "MATRIX_DEBUG" as const, label: "Matrix Debug", fullTitle: "Inspect MNA Matrix [A], RHS Vector [b], and Singularity / Convergence Trace", icon: Grid3X3 },
            { id: "TRANSIENT" as const, label: "Scope", fullTitle: "Transient Oscilloscope (XSC1)", icon: Activity },
            { id: "AC_BODE" as const, label: "Bode", fullTitle: "AC Bode Frequency Plotter (XBP1)", icon: TrendingUp },
            { id: "DC_SWEEP" as const, label: "DC Sweep", fullTitle: "DC Voltage Sweep Analysis", icon: Sliders },
            { id: "PARAM_SWEEP" as const, label: "Param", fullTitle: "Parametric Component Value Sweep", icon: BarChart3 },
            { id: "MONTE_CARLO" as const, label: "Monte Carlo", fullTitle: "Monte Carlo Tolerance Statistical Analysis", icon: Sparkles },
            { id: "SPICE_NETLIST" as const, label: "Netlist", fullTitle: "SPICE Netlist (.CIR) Viewer & Editor", icon: FileCode2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                title={tab.fullTitle}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-cyan-400 text-slate-950 font-bold shadow-sm shadow-cyan-500/25"
                    : tab.id === "NGSPICE_ENGINE"
                    ? "bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/70 border border-emerald-500/40 font-semibold"
                    : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1B: NGSPICE.JS REAL-TIME NODAL VOLTAGES & BRANCH CURRENTS ENGINE */}
      {activeTab === "NGSPICE_ENGINE" && (
        <div className="bg-[#070b14] border border-emerald-500/30 rounded-xl p-4 space-y-4">
          {/* Engine Convergence Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-bold">
                <Cpu className="w-3.5 h-3.5" />
                {convergence?.engineVersion ?? "ngspice.js v3.8 (Nonlinear NR-MNA)"}
              </span>
              <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-500/40 text-cyan-300">
                Status: {convergence?.converged ? "CONVERGED" : "SOLVED"} ({convergence?.iterations ?? 1} NR Iteration{(convergence?.iterations ?? 1) > 1 ? "s" : ""})
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300">
                MNA Matrix: {convergence?.matrixDimension ?? 0}×{convergence?.matrixDimension ?? 0} ({convergence?.unknownNodesCount ?? 0} Nodes + {convergence?.voltageSourcesCount ?? 0} V-Src)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/40 text-purple-300">
                KCL Residual: {(convergence?.kclMaxResidualA ?? 0).toExponential(2)} A · Solve: {(convergence?.solveTimeMs ?? 0.1).toFixed(2)} ms
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowMnaMatrix((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 text-cyan-300 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5" />
              {showMnaMatrix ? "Hide MNA Matrix & ngspice Log" : "Inspect MNA Matrix [A][x]=[b] & Log"}
            </button>
          </div>

          {/* Split Grid: Left = Nodal Voltages V(n) | Right = Branch Currents I(branch) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            {/* Table 1: Real-Time Nodal Voltages V(n) & KCL Verification */}
            <div className="xl:col-span-5 bg-[#040811] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-cyan-300">
                  01. SPICE NODAL VOLTAGES V(n) &amp; KCL BALANCE
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {nodalSolutions.length} Active Electrical Nets
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                      <th className="py-1.5 px-2.5 text-left">Net ID</th>
                      <th className="py-1.5 px-2.5 text-right">Nodal V(n)</th>
                      <th className="py-1.5 px-2.5 text-right">∑I_in = ∑I_out</th>
                      <th className="py-1.5 px-2.5 text-left">Connected Pins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodalSolutions.map((ns) => (
                      <tr
                        key={ns.netId}
                        className="border-b border-slate-800/60 hover:bg-slate-900/50"
                      >
                        <td className="py-1.5 px-2.5 font-bold text-white whitespace-nowrap">
                          V({ns.netName})
                        </td>
                        <td
                          className={`py-1.5 px-2.5 text-right font-bold whitespace-nowrap ${
                            ns.netId === 0
                              ? "text-slate-400"
                              : ns.voltageV >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {ns.voltageV >= 0 ? "+" : ""}
                          {ns.voltageV.toFixed(4)} V
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-amber-300 whitespace-nowrap">
                          {ns.kclEnteringMa.toFixed(2)} mA
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-300 text-[11px]">
                          {ns.connectedTerminals.join(", ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2: Real-Time Branch Currents I(branch) & Semiconductor Operating Point */}
            <div className="xl:col-span-7 bg-[#040811] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-300">
                  02. SPICE BRANCH CURRENTS I(branch) &amp; DEVICE OPERATING POINT (.OP)
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {branchSolutions.length} Circuit Branches
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-emerald-400 border-b border-slate-800">
                      <th className="py-1.5 px-2.5 text-left">Branch / Model</th>
                      <th className="py-1.5 px-2.5 text-center">Nodes</th>
                      <th className="py-1.5 px-2.5 text-right">Drop ΔV</th>
                      <th className="py-1.5 px-2.5 text-right">Current I(br)</th>
                      <th className="py-1.5 px-2.5 text-right">Power P</th>
                      <th className="py-1.5 px-2.5 text-left">SPICE Operating Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchSolutions.map((bs) => (
                      <tr
                        key={bs.nodeId}
                        className="border-b border-slate-800/60 hover:bg-slate-900/50"
                      >
                        <td className="py-1.5 px-2.5 font-bold text-white whitespace-nowrap">
                          I({bs.label}){" "}
                          <span className="text-[10px] text-cyan-400 font-normal">
                            [{bs.spiceModelName}]
                          </span>
                        </td>
                        <td className="py-1.5 px-2.5 text-center text-slate-300 whitespace-nowrap">
                          (N{bs.netPos}, N{bs.netNeg})
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-amber-300 whitespace-nowrap">
                          {bs.vDrop >= 0 ? "+" : ""}
                          {bs.vDrop.toFixed(4)} V
                        </td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-emerald-400 whitespace-nowrap">
                          {bs.current_mA >= 0 ? "+" : ""}
                          {bs.current_mA.toFixed(4)} mA
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-purple-300 whitespace-nowrap">
                          {bs.power_mW.toFixed(3)} mW
                        </td>
                        <td className="py-1.5 px-2.5 text-slate-300 text-[11px]">
                          {bs.operatingRegion}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Collapsible MNA Jacobian Matrix [A]*[x] = [b] & ngspice Batch Log */}
          {showMnaMatrix && convergence && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-xs font-mono font-bold text-cyan-300">
                  Linearized MNA System [A] · [x] = [b] (Final Newton-Raphson Step)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px] font-mono border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
                        <th className="p-1.5 text-left">Var</th>
                        {convergence.variableLabels.map((lbl) => (
                          <th key={lbl} className="p-1.5 text-right text-cyan-300">
                            {lbl}
                          </th>
                        ))}
                        <th className="p-1.5 text-right text-emerald-400">Sol [x]</th>
                        <th className="p-1.5 text-right text-amber-300">RHS [b]</th>
                      </tr>
                    </thead>
                    <tbody>
                      {convergence.mnaMatrixA.map((row, rIdx) => (
                        <tr key={rIdx} className="border-b border-slate-800/50">
                          <td className="p-1.5 font-bold text-cyan-300">
                            {convergence.variableLabels[rIdx]}
                          </td>
                          {row.map((val, cIdx) => (
                            <td key={cIdx} className="p-1.5 text-right text-slate-300">
                              {Math.abs(val) < 1e-8
                                ? "0"
                                : Math.abs(val) >= 100
                                ? val.toExponential(1)
                                : val.toFixed(4)}
                            </td>
                          ))}
                          <td className="p-1.5 text-right font-bold text-emerald-400">
                            {(convergence.solutionVectorX[rIdx] ?? 0).toFixed(4)}
                          </td>
                          <td className="p-1.5 text-right text-amber-300">
                            {(convergence.mnaVectorB[rIdx] ?? 0).toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-[#030712] border border-slate-800 rounded-xl p-3 space-y-2">
                <div className="text-xs font-mono font-bold text-emerald-300">
                  ngspice.js Standard Output Log (.OP Operating Point Report)
                </div>
                <pre className="text-[11px] font-mono text-emerald-300/90 overflow-x-auto max-h-56 leading-relaxed">
                  {convergence.rawNgspiceLog}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 1C: MNA MATRIX DEBUGGER VIEW */}
      {activeTab === "MATRIX_DEBUG" && (
        <MatrixDebugView
          convergence={convergence}
          title="SPICE Workbench — MNA Matrix [A] · [x] = [b] & Homotopy Debugger"
        />
      )}

      {/* TAB 1: VIRTUAL BENCH INSTRUMENTS (XMM1 Multimeter + XFG1 Function Gen + XWM1 Wattmeter) */}
      {activeTab === "INSTRUMENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* XMM1: Digital Multimeter */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Gauge className="w-3.5 h-3.5" />
                XMM1 — Agilent / Multisim Digital Multimeter
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                AUTO-RANGE
              </span>
            </div>

            {/* Digital 7-Segment Style LCD Readout */}
            <div className="bg-[#030712] border-2 border-cyan-500/40 rounded-xl p-3.5 font-mono">
              <div className="flex items-baseline justify-between">
                <span className="text-2xl sm:text-3xl font-bold text-emerald-400 tracking-wider">
                  {simRunning ? dmmReadout.main : "----"}
                </span>
                <span className="text-sm font-bold text-cyan-300">
                  {dmmReadout.unit}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5 truncate">
                {dmmReadout.sub}
              </div>
            </div>

            {/* Mode Buttons: V DC, V AC, I DC, Ohm, dB */}
            <div className="grid grid-cols-5 gap-1.5">
              {(["VDC", "VAC", "IDC", "OHM", "DB"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDmmMode(m)}
                  className={`py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    dmmMode === m
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {m === "OHM" ? "Ω" : m}
                </button>
              ))}
            </div>

            {/* Probe Target Component Selector */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-mono text-slate-400">
                Test Probe Across:
              </span>
              <select
                value={activeDmmNode?.id ?? ""}
                onChange={(e) => setDmmTargetNodeId(Number(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              >
                {measurableNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.label} ({n.type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* XFG1: Function Generator */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5" />
                XFG1 — Function &amp; Arbitrary Waveform Gen
              </span>
              <button
                type="button"
                onClick={() =>
                  onChangeFgConfig((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                  }))
                }
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border cursor-pointer ${
                  fgConfig.enabled
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-slate-900 border-slate-700 text-slate-400"
                }`}
              >
                {fgConfig.enabled ? "OUTPUT ON" : "DC MODE"}
              </button>
            </div>

            {/* Waveform Type Selector */}
            <div className="grid grid-cols-4 gap-1.5">
              {(["SINE", "SQUARE", "TRIANGLE", "PULSE"] as const).map((wf) => (
                <button
                  key={wf}
                  type="button"
                  onClick={() =>
                    onChangeFgConfig((prev) => ({
                      ...prev,
                      enabled: true,
                      waveform: wf,
                    }))
                  }
                  className={`py-1.5 rounded-lg text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                    fgConfig.waveform === wf
                      ? "bg-purple-500/25 border-purple-400 text-purple-200"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {wf}
                </button>
              ))}
            </div>

            {/* Frequency, Amplitude & Offset Sliders */}
            <div className="space-y-2 text-xs font-mono">
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frequency (f):</span>
                  <span className="text-purple-300 font-bold">
                    {fgConfig.frequencyHz >= 1000
                      ? `${(fgConfig.frequencyHz / 1000).toFixed(2)} kHz`
                      : `${fgConfig.frequencyHz} Hz`}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={20000}
                  step={10}
                  value={fgConfig.frequencyHz}
                  onChange={(e) =>
                    onChangeFgConfig((prev) => ({
                      ...prev,
                      enabled: true,
                      frequencyHz: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amp (V_pk):</span>
                    <span className="text-cyan-300 font-bold">
                      {fgConfig.amplitudeV} V
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={36}
                    step={0.5}
                    value={fgConfig.amplitudeV}
                    onChange={(e) =>
                      onChangeFgConfig((prev) => ({
                        ...prev,
                        enabled: true,
                        amplitudeV: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duty / Sym:</span>
                    <span className="text-amber-300 font-bold">
                      {fgConfig.dutyCyclePct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    step={5}
                    value={fgConfig.dutyCyclePct}
                    onChange={(e) =>
                      onChangeFgConfig((prev) => ({
                        ...prev,
                        enabled: true,
                        dutyCyclePct: Number(e.target.value),
                      }))
                    }
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* XWM1: Digital Wattmeter & Power Factor Analyzer */}
          <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                XWM1 — Wattmeter &amp; Power Factor Meter
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                P · S · Q · cos(φ)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 font-mono">
              <div className="bg-[#030712] border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Active Power (P)</div>
                <div className="text-lg font-bold text-amber-300">
                  {wattmeterData.realMw.toFixed(2)} mW
                </div>
              </div>
              <div className="bg-[#030712] border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Power Factor (PF)</div>
                <div className="text-lg font-bold text-emerald-400">
                  {wattmeterData.pf.toFixed(4)}
                </div>
              </div>
              <div className="bg-[#030712] border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Apparent Power (S)</div>
                <div className="text-sm font-bold text-cyan-300">
                  {wattmeterData.apparentMva.toFixed(2)} mVA
                </div>
              </div>
              <div className="bg-[#030712] border border-slate-800 rounded-lg p-2.5">
                <div className="text-[10px] text-slate-400">Reactive Power (Q)</div>
                <div className="text-sm font-bold text-purple-300">
                  {wattmeterData.reactiveMvar.toFixed(2)} mVAR
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1">
              <span>Impedance Phase Angle φ:</span>
              <span className="text-white font-bold">
                {wattmeterData.phaseDeg.toFixed(2)}°
              </span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REAL-TIME TRANSIENT OSCILLOSCOPE (XSC1) */}
      {activeTab === "TRANSIENT" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-cyan-300 font-bold">
                ■ CH1: Source Excitation ({fgConfig.waveform} · {fgConfig.frequencyHz} Hz)
              </span>
              <span className="text-emerald-400 font-bold">
                ■ CH2: Load Response across {activeDmmNode?.label ?? "Load"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="text-xs font-mono text-slate-400">
                Period T = {(1000 / fgConfig.frequencyHz).toFixed(3)} ms · V_pk = {fgConfig.amplitudeV} V
              </div>
              <button
                type="button"
                onClick={handleDownloadTransientCsv}
                disabled={transientMna.timePointsS.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer whitespace-nowrap"
                title="Download transient simulation time-series points as CSV for Excel or MATLAB"
              >
                {transientCsvDownloaded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Download CSV</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <svg
            viewBox="0 0 710 215"
            className="w-full h-auto bg-[#030712] border border-slate-800 rounded-xl"
          >
            {/* Graticule grid */}
            {[35, 70, 105, 140, 175].map((y) => (
              <line
                key={y}
                x1="45"
                y1={y}
                x2="685"
                y2={y}
                stroke={y === 105 ? "#334155" : "#1e293b"}
                strokeDasharray={y === 105 ? "none" : "4 4"}
              />
            ))}
            {[45, 173, 301, 429, 557, 685].map((x) => (
              <line
                key={x}
                x1={x}
                y1="15"
                x2={x}
                y2="195"
                stroke="#1e293b"
                strokeDasharray="4 4"
              />
            ))}
            <path
              d={transientWaveforms.ch1Path}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.2"
            />
            <path
              d={transientWaveforms.ch2Path}
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.5"
            />
            <text x="10" y="30" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
              +{fgConfig.amplitudeV}V
            </text>
            <text x="10" y="108" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono">
              0.0V
            </text>
            <text x="10" y="190" fill="#38bdf8" fontSize="10" fontFamily="JetBrains Mono">
              -{fgConfig.amplitudeV}V
            </text>
          </svg>

          <OscilloscopeSignalAnalysisPanel
            channels={[
              {
                id: "xsc1-ch1",
                label: `CH1: ${transientMna.srcLabel}`,
                color: "#38bdf8",
                samples: transientMna.srcVSeries,
              },
              {
                id: "xsc1-ch2",
                label: `CH2: ${transientMna.obsLabel}`,
                color: "#22c55e",
                samples: transientMna.obsVSeries,
              },
            ]}
            sampleRateHz={
              transientMna.timePointsS.length >= 2
                ? 1 /
                  Math.max(
                    1e-12,
                    transientMna.timePointsS[1] - transientMna.timePointsS[0]
                  )
                : 10000
            }
            subtitle="Automatic FFT spectrum & THD analysis of XSC1 MNA SPICE transient waveforms"
          />
        </div>
      )}

      {/* TAB 3: BODE PLOTTER (XBP1 - AC FREQUENCY SWEEP) */}
      {activeTab === "AC_BODE" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-cyan-300 font-bold">
                ■ Gain Magnitude |H(jω)| (dB)
              </span>
              <span className="text-purple-300 font-bold">
                ■ Phase Shift ∠H(jω) (°)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                f_c / f_0 ={" "}
                {bodeData.f0Hz >= 1000
                  ? `${(bodeData.f0Hz / 1000).toFixed(2)} kHz`
                  : `${bodeData.f0Hz.toFixed(1)} Hz`}
              </span>
              <span className="text-emerald-300 font-bold">
                Cursor:{" "}
                {activeBodePoint.freqHz >= 1000
                  ? `${(activeBodePoint.freqHz / 1000).toFixed(2)} kHz`
                  : `${activeBodePoint.freqHz.toFixed(1)} Hz`}{" "}
                · {activeBodePoint.magDb.toFixed(2)} dB ·{" "}
                {activeBodePoint.phaseDeg.toFixed(1)}°
              </span>
            </div>
          </div>

          <svg
            viewBox="0 0 710 215"
            className="w-full h-auto bg-[#030712] border border-slate-800 rounded-xl"
          >
            {[35, 75, 115, 155, 190].map((y) => (
              <line
                key={y}
                x1="45"
                y1={y}
                x2="685"
                y2={y}
                stroke="#1e293b"
                strokeDasharray="3 3"
              />
            ))}
            {/* Magnitude Curve */}
            <path
              d={`M ${bodeData.points
                .map((pt, idx) => {
                  const x = 45 + (idx / 60) * 640;
                  const y = Math.max(
                    18,
                    Math.min(192, 65 - pt.magDb * 2.2)
                  );
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" L ")}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2.5"
            />
            {/* Phase Curve */}
            <path
              d={`M ${bodeData.points
                .map((pt, idx) => {
                  const x = 45 + (idx / 60) * 640;
                  const y = Math.max(
                    18,
                    Math.min(192, 110 - (pt.phaseDeg / 180) * 75)
                  );
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" L ")}`}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="5 3"
            />
            {/* Interactive Cursor Line */}
            <line
              x1={45 + (bodeCursorIdx / 60) * 640}
              y1="15"
              x2={45 + (bodeCursorIdx / 60) * 640}
              y2="195"
              stroke="#f59e0b"
              strokeWidth="1.8"
            />
            {["1Hz", "10Hz", "100Hz", "1kHz", "10kHz", "100kHz", "1MHz"].map(
              (lbl, idx) => (
                <text
                  key={lbl}
                  x={45 + (idx / 6) * 640}
                  y="208"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono"
                >
                  {lbl}
                </text>
              )
            )}
          </svg>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 shrink-0">
              Sweep Frequency Cursor (1 Hz → 1 MHz):
            </span>
            <input
              type="range"
              min={0}
              max={60}
              value={bodeCursorIdx}
              onChange={(e) => setBodeCursorIdx(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* TAB 4: DC TRANSFER SWEEP */}
      {activeTab === "DC_SWEEP" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-cyan-300 font-bold">
              DC Transfer Sweep: V_Source from 0 V → {dcSweepMaxV} V (Plotting{" "}
              {activeDmmNode?.label ?? "Output"})
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Max Sweep V_S:</span>
              <input
                type="range"
                min={5}
                max={48}
                value={dcSweepMaxV}
                onChange={(e) => setDcSweepMaxV(Number(e.target.value))}
                className="w-32 accent-cyan-400 cursor-pointer"
              />
              <span className="text-white font-bold">{dcSweepMaxV} V</span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 max-h-52">
            <table className="w-full text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-900 text-cyan-400 border-b border-slate-800">
                  <th className="py-1.5 px-3 text-left">Sweep Step</th>
                  <th className="py-1.5 px-3 text-right">Source V_S (V)</th>
                  <th className="py-1.5 px-3 text-right">
                    {activeDmmNode?.label ?? "Load"} ΔV (V)
                  </th>
                  <th className="py-1.5 px-3 text-right">Branch Current (mA)</th>
                  <th className="py-1.5 px-3 text-right">Power P (mW)</th>
                </tr>
              </thead>
              <tbody>
                {dcSweepPoints.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-800/60 text-slate-300"
                  >
                    <td className="py-1 px-3 text-slate-400">#{idx + 1}</td>
                    <td className="py-1 px-3 text-right text-white font-semibold">
                      {row.vs.toFixed(2)} V
                    </td>
                    <td className="py-1 px-3 text-right text-cyan-300 font-bold">
                      {row.vNode.toFixed(3)} V
                    </td>
                    <td className="py-1 px-3 text-right text-emerald-400">
                      {row.iMa.toFixed(2)} mA
                    </td>
                    <td className="py-1 px-3 text-right text-purple-300">
                      {row.pMw.toFixed(2)} mW
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PARAMETRIC SWEEP (MAX POWER TRANSFER CURVE) */}
      {activeTab === "PARAM_SWEEP" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-emerald-300 font-bold">
              Parametric Resistance Sweep: R_Load (20 Ω → 500 Ω) · Peak Power at
              R_Load = R_Th ({paramSweepPoints.rSource} Ω)
            </span>
            <span className="text-amber-300">
              P_max ={" "}
              {(
                (Math.pow(paramSweepPoints.vSource, 2) /
                  (4 * paramSweepPoints.rSource)) *
                1000
              ).toFixed(2)}{" "}
              mW
            </span>
          </div>

          <svg
            viewBox="0 0 710 190"
            className="w-full h-auto bg-[#030712] border border-slate-800 rounded-xl"
          >
            {(() => {
              const maxP = Math.max(
                1,
                ...paramSweepPoints.pts.map((p) => p.pLoadMw)
              );
              const d = paramSweepPoints.pts
                .map((p, idx) => {
                  const x = 45 + (idx / 24) * 640;
                  const y = 165 - (p.pLoadMw / maxP) * 135;
                  return `${x.toFixed(1)},${y.toFixed(1)}`;
                })
                .join(" L ");
              return (
                <>
                  <path
                    d={`M ${d}`}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2.6"
                  />
                  {paramSweepPoints.pts.map((p, idx) => {
                    const x = 45 + (idx / 24) * 640;
                    const y = 165 - (p.pLoadMw / maxP) * 135;
                    return (
                      <circle
                        key={idx}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#38bdf8"
                      />
                    );
                  })}
                </>
              );
            })()}
          </svg>
        </div>
      )}

      {/* TAB 6: MONTE CARLO TOLERANCE ANALYSIS */}
      {activeTab === "MONTE_CARLO" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-purple-300 font-bold">
                16-Run Monte Carlo Statistical Spread (±{tolerancePct}% Component Tolerance)
              </span>
              <span className="text-emerald-300">
                Mean = {monteCarloRuns.meanV.toFixed(3)} V · σ ={" "}
                {monteCarloRuns.stdV.toFixed(3)} V · Range [{monteCarloRuns.minV.toFixed(2)}V ..{" "}
                {monteCarloRuns.maxV.toFixed(2)}V]
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 5, 10].map((tol) => (
                <button
                  key={tol}
                  type="button"
                  onClick={() => setTolerancePct(tol)}
                  className={`px-2 py-1 rounded text-xs font-mono border cursor-pointer ${
                    tolerancePct === tol
                      ? "bg-purple-500/20 border-purple-400 text-purple-200 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                  }`}
                >
                  ±{tol}%
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 font-mono text-xs">
            {monteCarloRuns.runs.map((r) => (
              <div
                key={r.run}
                className="bg-slate-900/90 border border-slate-800 rounded-lg p-2"
              >
                <div className="text-[10px] text-slate-400 flex justify-between">
                  <span>Run #{r.run}</span>
                  <span
                    className={
                      r.devPct >= 0 ? "text-emerald-400" : "text-amber-400"
                    }
                  >
                    {r.devPct >= 0 ? "+" : ""}
                    {r.devPct.toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {r.vOut.toFixed(3)} V
                </div>
                <div className="text-[10px] text-cyan-300">
                  {r.iMa.toFixed(2)} mA
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: LIVE BERKELEY SPICE3 / MULTISIM NETLIST (.CIR) */}
      {activeTab === "SPICE_NETLIST" && (
        <div className="bg-[#070b14] border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-cyan-300">
              Live Bidirectional SPICE3 / Multisim / LTSpice Netlist (.CIR)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const content = customNetlistText || generatedSpiceNetlist;
                  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "spice_workbench_circuit.cir";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-mono font-bold text-cyan-200 cursor-pointer"
                title="Download standard SPICE compatible .CIR netlist for academic reporting"
              >
                <Download className="w-3.5 h-3.5" />
                Download Netlist (.CIR)
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    if (navigator.clipboard?.writeText) {
                      await navigator.clipboard.writeText(customNetlistText || generatedSpiceNetlist);
                    }
                    setCopiedNetlist(true);
                    setTimeout(() => setCopiedNetlist(false), 2000);
                  } catch {
                    setImportStatus("Clipboard access restricted — select and copy text from editor below.");
                    setTimeout(() => setImportStatus(null), 3000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-cyan-400" />
                {copiedNetlist ? "Copied .CIR!" : "Copy SPICE Netlist"}
              </button>
              <button
                type="button"
                onClick={() => {
                  const res = executeRawSpiceNetlist(
                    customNetlistText || generatedSpiceNetlist
                  );
                  setRawBatchResult(res);
                  setImportStatus(
                    `ngspice.js solved ${res.nodalVoltages.length} nodal voltages and ${res.branchCurrents.length} branch currents from .CIR deck.`
                  );
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-xs font-mono font-bold text-emerald-300 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Run Netlist in ngspice.js
              </button>
              <button
                type="button"
                onClick={handleParseAndImportNetlist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-xs font-mono font-bold text-cyan-200 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                Synthesize Netlist to Canvas
              </button>
            </div>
          </div>

          {importStatus && (
            <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {importStatus}
            </div>
          )}

          <textarea
            rows={9}
            value={customNetlistText || generatedSpiceNetlist}
            onChange={(e) => setCustomNetlistText(e.target.value)}
            className="w-full bg-[#030712] border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs font-mono text-emerald-300 focus:outline-none"
          />

          {rawBatchResult && (
            <div className="bg-[#030712] border border-emerald-500/40 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-emerald-300">
                  ngspice.js Direct .CIR Deck Execution Output (Nodal Voltages &amp; Branch Currents)
                </span>
                <button
                  type="button"
                  onClick={() => setRawBatchResult(null)}
                  className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Close Output
                </button>
              </div>
              <pre className="text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre-wrap">
                {rawBatchResult.logOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
