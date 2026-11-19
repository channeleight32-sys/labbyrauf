import React, { useState, useMemo } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
} from "lucide-react";
import {
  computeFftSpectrum,
  formatFrequencyHz,
  type FftWindowType,
} from "../utils/fftSignalAnalysis";

export interface FftChannelInput {
  id: string;
  label: string;
  color: string;
  samples: number[];
}

interface OscilloscopeSignalAnalysisPanelProps {
  channels: FftChannelInput[];
  sampleRateHz: number;
  telemetryDecimals?: number;
  subtitle?: string;
  defaultOpen?: boolean;
}

const WINDOW_OPTIONS: { id: FftWindowType; label: string }[] = [
  { id: "hann", label: "Hann" },
  { id: "hamming", label: "Hamming" },
  { id: "blackman", label: "Blackman" },
  { id: "rectangular", label: "Rect" },
];

export default function OscilloscopeSignalAnalysisPanel({
  channels,
  sampleRateHz,
  telemetryDecimals = 3,
  subtitle = "Automatic real-time FFT spectral decomposition of captured oscilloscope samples",
  defaultOpen = true,
}: OscilloscopeSignalAnalysisPanelProps) {
  const dec = Math.min(4, Math.max(2, telemetryDecimals));

  const [isExpanded, setIsExpanded] = useState<boolean>(defaultOpen);
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [windowType, setWindowType] = useState<FftWindowType>("hann");
  const [scaleMode, setScaleMode] = useState<"DBV" | "VPK">("DBV");
  const [removeDc, setRemoveDc] = useState<boolean>(true);
  const [hoverBinIdx, setHoverBinIdx] = useState<number | null>(null);

  const activeChannel = useMemo(() => {
    if (channels.length === 0) return null;
    return (
      channels.find((c) => c.id === selectedChannelId) ?? channels[0]
    );
  }, [channels, selectedChannelId]);

  const fft = useMemo(() => {
    if (!activeChannel) {
      return computeFftSpectrum([], sampleRateHz, { windowType, removeDc });
    }
    return computeFftSpectrum(activeChannel.samples, sampleRateHz, {
      windowType,
      removeDc,
    });
  }, [activeChannel, sampleRateHz, windowType, removeDc]);

  // SVG spectrum plot geometry
  const plotW = 660;
  const plotH = 190;
  const padL = 46;
  const padR = 16;
  const padT = 18;
  const padB = 26;
  const innerW = plotW - padL - padR;
  const innerH = plotH - padT - padB;

  const dbMin = -80;
  const dbMax = 20;
  const maxVpkScale = useMemo(() => {
    if (!fft.valid || fft.bins.length === 0) return 5;
    let m = 0.5;
    for (let i = 1; i < fft.bins.length; i++) {
      if (fft.bins[i].magVpk > m) m = fft.bins[i].magVpk;
    }
    return Math.max(0.5, m * 1.15);
  }, [fft]);

  const { linePath, areaPath, harmonicMarkers } = useMemo(() => {
    if (!fft.valid || fft.bins.length < 2) {
      return { linePath: "", areaPath: "", harmonicMarkers: [] };
    }
    const maxBinIdx = fft.bins.length - 1;
    const pts: string[] = [];

    const yForBin = (magVpk: number, magDbv: number) => {
      if (scaleMode === "DBV") {
        const clamped = Math.max(dbMin, Math.min(dbMax, magDbv));
        const norm = (clamped - dbMin) / (dbMax - dbMin);
        return padT + innerH * (1 - norm);
      }
      const norm = Math.min(1, Math.max(0, magVpk / maxVpkScale));
      return padT + innerH * (1 - norm);
    };

    for (let i = 0; i <= maxBinIdx; i++) {
      const b = fft.bins[i];
      const x = padL + (i / maxBinIdx) * innerW;
      const y = yForBin(b.magVpk, b.magDbv);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }

    const line = `M ${pts.join(" L ")}`;
    const area = `${line} L ${(padL + innerW).toFixed(1)},${(padT + innerH).toFixed(1)} L ${padL.toFixed(1)},${(padT + innerH).toFixed(1)} Z`;

    const markers = fft.harmonics
      .filter((h) => fft.nyquistHz > 0 && h.freqHz <= fft.nyquistHz)
      .slice(0, 5)
      .map((h) => {
        const u = Math.min(1, Math.max(0, h.freqHz / fft.nyquistHz));
        const x = padL + u * innerW;
        const y = yForBin(h.magVpk, h.magDbv);
        return { ...h, x, y };
      });

    return { linePath: line, areaPath: area, harmonicMarkers: markers };
  }, [fft, scaleMode, maxVpkScale, innerW, innerH]);

  const hoveredBin =
    hoverBinIdx !== null && fft.bins[hoverBinIdx]
      ? fft.bins[hoverBinIdx]
      : null;

  const hoverX =
    hoveredBin && fft.bins.length > 1
      ? padL + (hoveredBin.index / (fft.bins.length - 1)) * innerW
      : null;

  const hoverY = useMemo(() => {
    if (!hoveredBin) return null;
    if (scaleMode === "DBV") {
      const clamped = Math.max(dbMin, Math.min(dbMax, hoveredBin.magDbv));
      const norm = (clamped - dbMin) / (dbMax - dbMin);
      return padT + innerH * (1 - norm);
    }
    const norm = Math.min(1, Math.max(0, hoveredBin.magVpk / maxVpkScale));
    return padT + innerH * (1 - norm);
  }, [hoveredBin, scaleMode, innerH, maxVpkScale]);

  const traceColor = activeChannel?.color || "#35BDF2";

  return (
    <section
      aria-label="Signal Analysis FFT Panel"
      className="bg-[#111B2B] border border-[#24344D] rounded-xl overflow-hidden"
    >
      {/* Header Bar */}
      <div className="px-4 py-3 bg-[#162338]/75 border-b border-[#24344D] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#0B1220] border border-[#35BDF2]/40 flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-[#35BDF2]" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-display font-bold text-[#F1F5FA] tracking-tight">
                Signal Analysis
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-[#35BDF2]/15 text-[#35BDF2] border border-[#35BDF2]/35">
                FFT SPECTRUM
              </span>
              {fft.valid && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#0B1220] text-[#48C99A] border border-[#48C99A]/30 tabular-nums">
                  {fft.fftSize}-pt · fs = {formatFrequencyHz(fft.sampleRateHz)} · Δf ={" "}
                  {formatFrequencyHz(fft.binResolutionHz)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#9BAAC0] truncate">{subtitle}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Selector */}
          {channels.length > 0 && (
            <div className="flex items-center bg-[#0B1220] border border-[#24344D] rounded-lg p-0.5 text-[11px] font-mono">
              {channels.slice(0, 6).map((ch) => {
                const isSel = activeChannel?.id === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setSelectedChannelId(ch.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded transition-colors cursor-pointer ${
                      isSel
                        ? "bg-[#1C2B40] text-[#F1F5FA] font-semibold"
                        : "text-[#9BAAC0] hover:text-[#F1F5FA]"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ch.color }}
                    />
                    <span className="max-w-[78px] truncate">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Scale Mode */}
          <div className="flex items-center bg-[#0B1220] border border-[#24344D] rounded-lg p-0.5 text-[11px] font-mono">
            {(["DBV", "VPK"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setScaleMode(m)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  scaleMode === m
                    ? "bg-[#35BDF2]/20 text-[#35BDF2] font-semibold"
                    : "text-[#9BAAC0] hover:text-[#F1F5FA]"
                }`}
              >
                {m === "DBV" ? "dBV" : "Vpk"}
              </button>
            ))}
          </div>

          {/* Window Selector */}
          <div className="flex items-center bg-[#0B1220] border border-[#24344D] rounded-lg p-0.5 text-[11px] font-mono">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWindowType(w.id)}
                className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                  windowType === w.id
                    ? "bg-[#648CFF]/20 text-[#F1F5FA] font-semibold"
                    : "text-[#9BAAC0] hover:text-[#F1F5FA]"
                }`}
                title={`${w.label} FFT Window`}
              >
                {w.label}
              </button>
            ))}
          </div>

          {/* DC Reject Toggle */}
          <button
            type="button"
            onClick={() => setRemoveDc((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-colors cursor-pointer ${
              removeDc
                ? "bg-[#48C99A]/15 text-[#48C99A] border-[#48C99A]/40"
                : "bg-[#0B1220] text-[#9BAAC0] border-[#24344D] hover:text-[#F1F5FA]"
            }`}
            title="Remove DC component before FFT windowing to prevent 0 Hz leakage"
          >
            AC Coupled
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 rounded-lg bg-[#0B1220] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] cursor-pointer"
            aria-label={isExpanded ? "Collapse Signal Analysis" : "Expand Signal Analysis"}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {!fft.valid ? (
            <div className="rounded-xl bg-[#0B1220] border border-[#24344D] p-6 text-center space-y-1.5">
              <Activity className="w-5 h-5 text-[#35BDF2] mx-auto opacity-75" />
              <div className="text-xs font-mono font-semibold text-[#F1F5FA]">
                Waiting for sufficient waveform samples ({fft.sampleCount}/4 minimum)
              </div>
              <p className="text-xs text-[#9BAAC0]">
                Run or sweep the oscilloscope trace to compute the FFT magnitude spectrum, fundamental frequency, and harmonic distortion.
              </p>
            </div>
          ) : (
            <>
              {/* 4 Key Spectral Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                  <div className="text-[#9BAAC0] text-[10px] uppercase">
                    Fundamental (f₁)
                  </div>
                  <div className="text-[#35BDF2] font-bold text-sm tabular-nums mt-0.5">
                    {fft.fundamentalFreqHz > 0
                      ? formatFrequencyHz(fft.fundamentalFreqHz)
                      : "DC / Flat"}
                  </div>
                  <div className="text-[10px] text-[#9BAAC0] tabular-nums mt-0.5">
                    Nyquist: {formatFrequencyHz(fft.nyquistHz)}
                  </div>
                </div>

                <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                  <div className="text-[#9BAAC0] text-[10px] uppercase">
                    Peak Magnitude
                  </div>
                  <div className="text-[#48C99A] font-bold text-sm tabular-nums mt-0.5">
                    {fft.fundamentalMagVpk.toFixed(dec)} Vpk
                  </div>
                  <div className="text-[10px] text-[#9BAAC0] tabular-nums mt-0.5">
                    {fft.fundamentalMagDbv.toFixed(1)} dBV
                  </div>
                </div>

                <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                  <div className="text-[#9BAAC0] text-[10px] uppercase">
                    THD / SFDR
                  </div>
                  <div className="text-[#F1B65B] font-bold text-sm tabular-nums mt-0.5">
                    {fft.thdPercent.toFixed(2)}% THD
                  </div>
                  <div className="text-[10px] text-[#9BAAC0] tabular-nums mt-0.5">
                    SFDR: {fft.sfdrDb.toFixed(1)} dB
                  </div>
                </div>

                <div className="bg-[#162338] border border-[#24344D] rounded-xl p-3">
                  <div className="text-[#9BAAC0] text-[10px] uppercase">
                    DC Offset / AC RMS
                  </div>
                  <div className="text-[#F1F5FA] font-bold text-sm tabular-nums mt-0.5">
                    {fft.dcOffsetV.toFixed(dec)} Vdc
                  </div>
                  <div className="text-[10px] text-[#9BAAC0] tabular-nums mt-0.5">
                    AC RMS: {fft.acRmsV.toFixed(dec)} V · Vpp: {fft.vpp.toFixed(2)} V
                  </div>
                </div>
              </div>

              {/* Interactive FFT Spectrum Plot */}
              <div className="rounded-xl bg-[#070D18] border border-[#24344D] p-2.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-mono">
                  <div className="flex items-center gap-2 text-[#9BAAC0]">
                    <Sparkles className="w-3.5 h-3.5 text-[#35BDF2]" />
                    <span>
                      Channel:{" "}
                      <strong className="text-[#F1F5FA]">
                        {activeChannel?.label}
                      </strong>{" "}
                      ({windowType.toUpperCase()} window, N={fft.sampleCount})
                    </span>
                  </div>
                  <div className="text-[#35BDF2] tabular-nums">
                    {hoveredBin
                      ? `Cursor: ${formatFrequencyHz(hoveredBin.freqHz)} · ${hoveredBin.magVpk.toFixed(dec)} Vpk (${hoveredBin.magDbv.toFixed(1)} dBV)`
                      : "Hover spectrum to inspect frequency bins"}
                  </div>
                </div>

                <svg
                  viewBox={`0 0 ${plotW} ${plotH}`}
                  className="w-full h-48 sm:h-52 select-none"
                  onPointerMove={(e) => {
                    if (fft.bins.length < 2) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const scaleX = plotW / rect.width;
                    const svgX = (e.clientX - rect.left) * scaleX;
                    const u = Math.max(
                      0,
                      Math.min(1, (svgX - padL) / innerW)
                    );
                    setHoverBinIdx(
                      Math.round(u * (fft.bins.length - 1))
                    );
                  }}
                  onPointerLeave={() => setHoverBinIdx(null)}
                >
                  <defs>
                    <linearGradient
                      id="fftAreaGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={traceColor}
                        stopOpacity="0.34"
                      />
                      <stop
                        offset="100%"
                        stopColor={traceColor}
                        stopOpacity="0.02"
                      />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid & Y Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                    const y = padT + frac * innerH;
                    const labelText =
                      scaleMode === "DBV"
                        ? `${Math.round(dbMax - frac * (dbMax - dbMin))}`
                        : `${(maxVpkScale * (1 - frac)).toFixed(1)}V`;
                    return (
                      <g key={`fy-${i}`}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={padL + innerW}
                          y2={y}
                          stroke="#162338"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 6}
                          y={y + 3}
                          textAnchor="end"
                          fill="#9BAAC0"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {labelText}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Frequency Grid & X Labels */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac, i) => {
                    const x = padL + frac * innerW;
                    const freq = frac * fft.nyquistHz;
                    return (
                      <g key={`fx-${i}`}>
                        <line
                          x1={x}
                          y1={padT}
                          x2={x}
                          y2={padT + innerH}
                          stroke="#162338"
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={plotH - 8}
                          textAnchor={
                            i === 0 ? "start" : i === 4 ? "end" : "middle"
                          }
                          fill="#9BAAC0"
                          fontSize="9"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {formatFrequencyHz(freq)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Axis Unit Label */}
                  <text
                    x={6}
                    y={padT - 5}
                    fill="#35BDF2"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono, monospace"
                    fontWeight="bold"
                  >
                    {scaleMode === "DBV" ? "dBV" : "Vpk"}
                  </text>

                  {/* Spectrum Area & Trace */}
                  {areaPath && <path d={areaPath} fill="url(#fftAreaGrad)" />}
                  {linePath && (
                    <path
                      d={linePath}
                      fill="none"
                      stroke={traceColor}
                      strokeWidth="2"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Harmonic Peak Callouts */}
                  {harmonicMarkers.map((hm) => (
                    <g key={`hm-${hm.order}`} className="pointer-events-none">
                      <line
                        x1={hm.x}
                        y1={hm.y}
                        x2={hm.x}
                        y2={padT + innerH}
                        stroke={hm.order === 1 ? "#48C99A" : "#F1B65B"}
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity={0.6}
                      />
                      <circle
                        cx={hm.x}
                        cy={hm.y}
                        r={hm.order === 1 ? 4 : 3}
                        fill={hm.order === 1 ? "#48C99A" : "#F1B65B"}
                        stroke="#070D18"
                        strokeWidth="1.2"
                      />
                      <text
                        x={Math.min(padL + innerW - 14, Math.max(padL + 10, hm.x))}
                        y={Math.max(padT + 10, hm.y - 7)}
                        textAnchor="middle"
                        fill={hm.order === 1 ? "#48C99A" : "#F1B65B"}
                        fontSize="9"
                        fontFamily="JetBrains Mono, monospace"
                        fontWeight="bold"
                      >
                        {hm.label}
                      </text>
                    </g>
                  ))}

                  {/* Interactive Hover Crosshair */}
                  {hoverX !== null && hoverY !== null && (
                    <g className="pointer-events-none">
                      <line
                        x1={hoverX}
                        y1={padT}
                        x2={hoverX}
                        y2={padT + innerH}
                        stroke="#F1F5FA"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                        opacity={0.75}
                      />
                      <circle
                        cx={hoverX}
                        cy={hoverY}
                        r={4}
                        fill="#35BDF2"
                        stroke="#070D18"
                        strokeWidth="1.5"
                      />
                    </g>
                  )}
                </svg>
              </div>

              {/* Harmonic Peak Breakdown */}
              {fft.harmonics.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                  <span className="text-[#9BAAC0] uppercase font-semibold mr-1">
                    Harmonics:
                  </span>
                  {fft.harmonics.slice(0, 5).map((h) => (
                    <div
                      key={`hchip-${h.order}`}
                      className={`px-2.5 py-1 rounded-lg border tabular-nums ${
                        h.order === 1
                          ? "bg-[#48C99A]/10 border-[#48C99A]/40 text-[#48C99A]"
                          : "bg-[#162338] border-[#24344D] text-[#F1F5FA]"
                      }`}
                    >
                      <span className="font-bold">{h.label}</span>{" "}
                      <span>{formatFrequencyHz(h.freqHz)}</span>{" "}
                      <span className="text-[#9BAAC0]">
                        · {h.magVpk.toFixed(2)}V ({h.order === 1 ? `${h.magDbv.toFixed(1)} dBV` : `${h.relDbc.toFixed(1)} dBc`})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
