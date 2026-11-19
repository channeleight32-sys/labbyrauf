import React, { useState } from "react";
import {
  Flame,
  Zap,
  Thermometer,
  Activity,
  Cpu,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Gauge,
} from "lucide-react";
import {
  CircuitPowerSummary,
  LOGIC_FAMILY_SPECS,
  LogicFamilyId,
} from "../utils/powerAnalysis";

export type PowerOverlaySubMode = "all" | "gates_only" | "clock_heat_only";

interface PowerAnalysisOverlayPanelProps {
  isEnabled: boolean;
  onToggleEnabled: () => void;
  subMode: PowerOverlaySubMode;
  onChangeSubMode: (mode: PowerOverlaySubMode) => void;
  familyId: LogicFamilyId;
  onChangeFamilyId: (id: LogicFamilyId) => void;
  clockScaleMHzPerHz: number;
  onChangeClockScale: (scale: number) => void;
  summary: CircuitPowerSummary;
  selectedNodeId: number | null;
  onSelectNode: (nodeId: number) => void;
  onLoadClockStressPreset: () => void;
  autoClock: boolean;
  onToggleAutoClock: () => void;
}

export function SchematicPowerHudOverlay({
  summary,
  subMode,
  onSelectHotspot,
}: {
  summary: CircuitPowerSummary;
  subMode: PowerOverlaySubMode;
  onSelectHotspot: (nodeId: number) => void;
}) {
  const dynPct =
    summary.totalCircuitPowerMw > 0
      ? Math.round(
          ((summary.totalDynamicMw + summary.totalWireMw) /
            summary.totalCircuitPowerMw) *
            100
        )
      : 0;
  const statPct = 100 - dynPct;

  return (
    <div className="absolute top-3 right-3 z-10 w-72 bg-[#090D16]/92 backdrop-blur-md border border-orange-500/40 rounded-xl p-3 shadow-2xl text-xs font-mono space-y-2.5 pointer-events-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="inline-flex items-center gap-1.5 font-bold text-orange-300 tracking-wide">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          POWER &amp; THERMAL OVERLAY
        </span>
        <span className="px-1.5 py-0.5 rounded bg-orange-500/20 border border-orange-500/40 text-[10px] text-orange-200 font-bold">
          {summary.family.shortLabel}
        </span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 uppercase">Total Power</div>
          <div className="text-sm font-bold text-amber-300 mt-0.5">
            {summary.totalCircuitPowerMw.toFixed(2)} mW
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5">
            Dyn {dynPct}% · Stat {statPct}%
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2">
          <div className="text-[9px] text-slate-400 uppercase">
            Peak Die Temp
          </div>
          <div
            className="text-sm font-bold mt-0.5"
            style={{
              color: summary.hotspotNode?.heatColor || "#38bdf8",
            }}
          >
            {summary.peakJunctionTempC.toFixed(1)} °C
          </div>
          <div className="text-[9px] text-slate-400 mt-0.5 truncate">
            {summary.hotspotNode
              ? `Hotspot: ${summary.hotspotNode.label}`
              : "Ambient 27.0°C"}
          </div>
        </div>
      </div>

      {/* High-Frequency Clock Heat Signature Status */}
      <div className="flex items-center justify-between bg-rose-950/35 border border-rose-500/35 rounded-lg px-2.5 py-1.5">
        <div>
          <div className="text-[10px] font-bold text-rose-300 flex items-center gap-1">
            <Activity className="w-3 h-3 text-rose-400" />
            HF Clock Heat Nets: {summary.activeClockLineCount}
          </div>
          <div className="text-[9px] text-slate-300">
            f_eff = {summary.effectiveClockMHz} MHz · P_clk ={" "}
            {summary.totalWireMw.toFixed(2)} mW
          </div>
        </div>
        {summary.hotspotNode && (
          <button
            type="button"
            onClick={() => onSelectHotspot(summary.hotspotNode!.nodeId)}
            className="px-2 py-1 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-[9px] font-bold text-rose-200 cursor-pointer shrink-0"
            title="Locate peak thermal hotspot gate on schematic"
          >
            Locate Peak
          </button>
        )}
      </div>

      {/* Thermal Gradient Scale Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-[9px] text-slate-400">
          <span>27°C Cool</span>
          <span>45°C Warm</span>
          <span>65°C Hot</span>
          <span>85°C+ Crit</span>
        </div>
        <div
          className="h-2 w-full rounded-full border border-slate-700/80"
          style={{
            background:
              "linear-gradient(90deg, #38bdf8 0%, #10b981 30%, #f59e0b 60%, #f97316 82%, #f43f5e 100%)",
          }}
        />
        <div className="text-[9px] text-slate-400 flex items-center justify-between">
          <span>
            Mode:{" "}
            <strong className="text-slate-200">
              {subMode === "all"
                ? "Gates + HF Clock Heat"
                : subMode === "gates_only"
                ? "Gate Power Only"
                : "Clock Line Heat Only"}
            </strong>
          </span>
          <span className="text-orange-300">P = α·C·V²·f + P_stat</span>
        </div>
      </div>
    </div>
  );
}

export default function PowerAnalysisOverlayPanel({
  isEnabled,
  onToggleEnabled,
  subMode,
  onChangeSubMode,
  familyId,
  onChangeFamilyId,
  clockScaleMHzPerHz,
  onChangeClockScale,
  summary,
  selectedNodeId,
  onSelectNode,
  onLoadClockStressPreset,
  autoClock,
  onToggleAutoClock,
}: PowerAnalysisOverlayPanelProps) {
  const [showTable, setShowTable] = useState(false);

  return (
    <div
      className={`rounded-xl border transition-all p-4 space-y-3.5 ${
        isEnabled
          ? "bg-gradient-to-r from-[#1c1018] via-[#111827] to-[#1a120b] border-orange-500/50 shadow-lg shadow-orange-950/20"
          : "bg-[#111827] border-slate-800"
      }`}
    >
      {/* Top Bar: Toggle + Quick Summary Pills + Preset Stress Test */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleEnabled}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold border transition-all cursor-pointer ${
              isEnabled
                ? "bg-gradient-to-r from-orange-500 to-rose-600 text-white border-orange-300/60 shadow-md shadow-orange-500/25"
                : "bg-slate-900 hover:bg-slate-800 text-orange-300 border-orange-500/40"
            }`}
          >
            {isEnabled ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                Power Analysis Overlay: ON
              </>
            ) : (
              <>
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Enable Power Analysis Overlay
              </>
            )}
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              Total:{" "}
              <strong className="text-amber-300">
                {summary.totalCircuitPowerMw.toFixed(2)} mW
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              Dynamic CV²f:{" "}
              <strong className="text-cyan-300">
                {summary.totalDynamicMw.toFixed(2)} mW
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              Static Bias:{" "}
              <strong className="text-emerald-300">
                {summary.totalStaticMw.toFixed(2)} mW
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-rose-950/40 border border-rose-500/35 text-rose-200">
              🔥 HF Clock Nets:{" "}
              <strong>
                {summary.activeClockLineCount} ({summary.effectiveClockMHz} MHz)
              </strong>
            </span>
            <span className="px-2.5 py-1 rounded-md bg-slate-900/90 border border-slate-800 text-slate-300">
              Peak T_j:{" "}
              <strong
                style={{ color: summary.hotspotNode?.heatColor || "#fbbf24" }}
              >
                {summary.peakJunctionTempC.toFixed(1)}°C
              </strong>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onLoadClockStressPreset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-500/40 transition-colors cursor-pointer"
            title="Load a Synchronous Clocked Counter + Adder Stress Circuit with active high-frequency clock lines"
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            Load HF Clock Thermal Demo
          </button>

          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
          >
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
            {showTable ? "Hide Gate Breakdown" : "Per-Gate Power Table"}
            {showTable ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Configuration Row when enabled or expanded */}
      {isEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80 text-xs font-mono">
          {/* 1. Logic Family Selector */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                IC Technology Family (V_DD)
              </span>
              <span className="text-amber-300">{summary.family.vdd}V Rail</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(LOGIC_FAMILY_SPECS) as LogicFamilyId[]).map(
                (id) => {
                  const spec = LOGIC_FAMILY_SPECS[id];
                  const active = familyId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onChangeFamilyId(id)}
                      className={`px-2 py-1 rounded text-[10px] font-mono text-left border transition-colors cursor-pointer truncate ${
                        active
                          ? "bg-amber-500/20 border-amber-400 text-amber-200 font-bold"
                          : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {spec.shortLabel}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* 2. High-Frequency Clock Scaling & Auto-Clock Burst */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Thermometer className="w-3.5 h-3.5 text-rose-400" />
                HF Clock Multiplier
              </span>
              <span className="text-rose-300 font-bold">
                f_eff = {summary.effectiveClockMHz} MHz
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { label: "1MHz/Hz", scale: 1 },
                { label: "5MHz/Hz", scale: 5 },
                { label: "10MHz/Hz", scale: 10 },
                { label: "25MHz/Hz", scale: 25 },
              ].map((item) => (
                <button
                  key={item.scale}
                  type="button"
                  onClick={() => onChangeClockScale(item.scale)}
                  className={`flex-1 py-1 rounded text-[10px] border transition-colors cursor-pointer ${
                    clockScaleMHzPerHz === item.scale
                      ? "bg-rose-500/25 border-rose-400 text-rose-200 font-bold"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={onToggleAutoClock}
                className={`px-2 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                  autoClock
                    ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                    : "bg-slate-950 border-slate-700 text-slate-300 hover:border-rose-400"
                }`}
                title="Toggle active clock oscillator to heat up clock nets in real time"
              >
                {autoClock ? "CLK: ACTIVE" : "Run CLK"}
              </button>
            </div>
          </div>

          {/* 3. Schematic Overlay Layer Filter */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-orange-400" />
                Overlay Layer Mode
              </span>
              <span className="text-slate-400">Real-Time SVG</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: "all" as const, label: "All (Power+Heat)" },
                { id: "gates_only" as const, label: "Gate Power" },
                { id: "clock_heat_only" as const, label: "Clock Heat" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeSubMode(m.id)}
                  className={`py-1 px-1.5 rounded text-[10px] border transition-colors cursor-pointer truncate ${
                    subMode === m.id
                      ? "bg-orange-500/25 border-orange-400 text-orange-200 font-bold"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Per-Gate Power & Clock Line Heat Signature Breakdown Table */}
      {showTable && (
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Per-Gate Power Consumption Breakdown */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Per-Gate Estimated Power Consumption ({summary.nodeMetricsList.length})
                </h4>
                <span className="text-[10px] font-mono text-slate-400">
                  Click row to focus gate
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-left">
                      <th className="py-1.5 px-2">Gate / IC</th>
                      <th className="py-1.5 px-2 text-right">C_load</th>
                      <th className="py-1.5 px-2 text-right">α (Toggle)</th>
                      <th className="py-1.5 px-2 text-right">P_stat</th>
                      <th className="py-1.5 px-2 text-right">P_dyn</th>
                      <th className="py-1.5 px-2 text-right">Total</th>
                      <th className="py-1.5 px-2 text-right">Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.nodeMetricsList.map((m) => {
                      const isSel = selectedNodeId === m.nodeId;
                      return (
                        <tr
                          key={m.nodeId}
                          onClick={() => onSelectNode(m.nodeId)}
                          className={`border-b border-slate-900 cursor-pointer transition-colors ${
                            isSel
                              ? "bg-orange-500/20 text-white font-bold"
                              : "text-slate-300 hover:bg-slate-900/70"
                          }`}
                        >
                          <td className="py-1.5 px-2 flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: m.heatColor }}
                            />
                            <span className="truncate max-w-[110px]">
                              {m.label}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-slate-400">
                            {m.loadCapacitancePf}pF
                          </td>
                          <td className="py-1.5 px-2 text-right text-cyan-300">
                            {(m.activityFactor * 100).toFixed(0)}%
                          </td>
                          <td className="py-1.5 px-2 text-right text-emerald-300">
                            {m.staticPowerMw.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-300">
                            {m.dynamicPowerMw.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-white">
                            {m.totalPowerMw.toFixed(2)}mW
                          </td>
                          <td
                            className="py-1.5 px-2 text-right font-bold"
                            style={{ color: m.heatColor }}
                          >
                            {m.junctionTempC}°C
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Active Clock Lines & Interconnect Heat Signatures */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-rose-400" />
                  Clock Line &amp; Net Thermal Heat Signatures ({summary.wireSignaturesList.length})
                </h4>
                <span className="text-[10px] font-mono text-rose-300">
                  {summary.activeClockLineCount} Active HF Clock Nets
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-[11px] font-mono border-collapse">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-800 text-left">
                      <th className="py-1.5 px-2">Net / Wire</th>
                      <th className="py-1.5 px-2">Classification</th>
                      <th className="py-1.5 px-2 text-right">f_toggle</th>
                      <th className="py-1.5 px-2 text-right">P_wire</th>
                      <th className="py-1.5 px-2 text-right">Heat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.wireSignaturesList
                      .slice()
                      .sort((a, b) => b.heatIntensity - a.heatIntensity)
                      .map((w) => (
                        <tr
                          key={w.wireId}
                          className="border-b border-slate-900 text-slate-300 hover:bg-slate-900/60"
                        >
                          <td className="py-1.5 px-2 truncate max-w-[130px]">
                            {w.netLabel}
                          </td>
                          <td className="py-1.5 px-2">
                            {w.isClockLine ? (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-bold">
                                🔥 HF CLOCK LINE
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[10px]">
                                Data Net
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right text-cyan-300">
                            {w.effectiveFreqMHz} MHz
                          </td>
                          <td className="py-1.5 px-2 text-right text-amber-300">
                            {w.wirePowerMw.toFixed(2)} mW
                          </td>
                          <td
                            className="py-1.5 px-2 text-right font-bold"
                            style={{ color: w.heatColor }}
                          >
                            {w.wireTempC}°C ({w.thermalTier})
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
