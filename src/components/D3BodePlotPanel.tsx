import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Activity, RotateCcw } from "lucide-react";

export interface BodeDataPoint {
  freqHz: number;
  logF: number;
  freqLabel: string;
  gainDb: number;
  gainMag: number;
  phaseDeg: number;
  circuitPhiDeg: number;
  zMag: number;
}

export interface D3BodePlotPanelProps {
  data: BodeDataPoint[];
  logLo: number;
  logHi: number;
  dbMax: number;
  opFreqHz: number;
  critFreqHz: number;
  gainDbAtOp: number;
  gainMagAtOp: number;
  phaseDegAtOp: number;
  ok: boolean;
  circuitLabel: string;
  configLabel: string;
  outputTap: string;
  onSelectFreqHz: (freqHz: number) => void;
  formatHz: (hz: number) => string;
}

type BodeDisplayMode = "BOTH" | "MAG" | "PHASE";

export default function D3BodePlotPanel({
  data,
  logLo,
  logHi,
  dbMax,
  opFreqHz,
  critFreqHz,
  gainDbAtOp,
  gainMagAtOp,
  phaseDegAtOp,
  ok,
  circuitLabel,
  configLabel,
  outputTap,
  onSelectFreqHz,
  formatHz,
}: D3BodePlotPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<BodeDisplayMode>("BOTH");
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 780, h: 330 });
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [hoverPt, setHoverPt] = useState<{
    pt: BodeDataPoint;
    px: number;
    pyDb: number;
    pyDeg: number;
  } | null>(null);

  const onSelectRef = useRef(onSelectFreqHz);
  onSelectRef.current = onSelectFreqHz;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(320, Math.round(entry.contentRect.width));
        const h = Math.max(280, Math.round(entry.contentRect.height));
        setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Reset manual zoom if global fMin/fMax range shifts drastically
  useEffect(() => {
    setZoomRange(null);
  }, [logLo, logHi]);

  const activeDomainHz = useMemo<[number, number]>(() => {
    if (zoomRange && zoomRange[1] > zoomRange[0]) {
      return zoomRange;
    }
    return [Math.pow(10, logLo), Math.pow(10, logHi)];
  }, [zoomRange, logLo, logHi]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    const margin = { top: 24, right: 56, bottom: 38, left: 56 };
    const innerW = Math.max(120, size.w - margin.left - margin.right);
    const innerH = Math.max(120, size.h - margin.top - margin.bottom);

    svg
      .attr("viewBox", `0 0 ${size.w} ${size.h}`)
      .attr("width", size.w)
      .attr("height", size.h);

    const defs = svg.append("defs");
    const clipId = "d3-bode-clip-rect";
    defs
      .append("clipPath")
      .attr("id", clipId)
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerW)
      .attr("height", innerH);

    const magGrad = defs
      .append("linearGradient")
      .attr("id", "d3-bode-mag-grad")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "0%")
      .attr("y2", "100%");
    magGrad
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.28);
    magGrad
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#f59e0b")
      .attr("stop-opacity", 0.02);

    const rootG = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const [fLo, fHi] = activeDomainHz;
    const xScale = d3.scaleLog().domain([fLo, fHi]).range([0, innerW]).clamp(false);
    const yDbScale = d3.scaleLinear().domain([-60, dbMax]).range([innerH, 0]);
    const yDegScale = d3.scaleLinear().domain([-180, 180]).range([innerH, 0]);

    // Grid lines (log decades on X, linear dB steps on Y)
    const logSpan = Math.max(1, Math.ceil(Math.log10(fHi)) - Math.floor(Math.log10(fLo)));
    const stepDecade = logSpan > 8 ? 2 : 1;
    const xTicks: number[] = [];
    for (
      let exp = Math.floor(Math.log10(fLo));
      exp <= Math.ceil(Math.log10(fHi));
      exp += stepDecade
    ) {
      const hz = Math.pow(10, exp);
      if (hz >= fLo * 0.999 && hz <= fHi * 1.001) xTicks.push(hz);
    }

    const gridG = rootG.append("g").attr("class", "bode-grid");
    gridG
      .selectAll("line.vx")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "vx")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#1e293b")
      .attr("stroke-dasharray", "3 3")
      .attr("stroke-width", 1);

    const yGridTicks =
      mode === "PHASE" ? [-180, -90, 0, 90, 180] : [-60, -40, -20, -3, 0, dbMax];
    gridG
      .selectAll("line.hy")
      .data(yGridTicks)
      .enter()
      .append("line")
      .attr("class", "hy")
      .attr("x1", 0)
      .attr("x2", innerW)
      .attr("y1", (d) => (mode === "PHASE" ? yDegScale(d) : yDbScale(d)))
      .attr("y2", (d) => (mode === "PHASE" ? yDegScale(d) : yDbScale(d)))
      .attr("stroke", (d) => (d === -3 ? "#f59e0b" : "#1e293b"))
      .attr("stroke-opacity", (d) => (d === -3 ? 0.5 : 1))
      .attr("stroke-dasharray", (d) => (d === -3 ? "5 4" : "3 3"))
      .attr("stroke-width", 1);

    // Axes
    const xAxis = d3
      .axisBottom(xScale)
      .tickValues(xTicks)
      .tickFormat((d) => formatHz(Number(d)).replace(" ", ""));
    rootG
      .append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis)
      .call((g) => {
        g.select(".domain").attr("stroke", "#334155");
        g.selectAll(".tick line").attr("stroke", "#475569");
        g.selectAll(".tick text")
          .attr("fill", "#94a3b8")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "10px");
      });

    if (mode === "BOTH" || mode === "MAG") {
      const yLeftAxis = d3
        .axisLeft(yDbScale)
        .tickValues([-60, -40, -20, -3, 0, ...(dbMax > 6 ? [dbMax] : [])])
        .tickFormat((d) => `${d}dB`);
      rootG
        .append("g")
        .call(yLeftAxis)
        .call((g) => {
          g.select(".domain").attr("stroke", "#f59e0b").attr("stroke-opacity", 0.6);
          g.selectAll(".tick line").attr("stroke", "#f59e0b").attr("stroke-opacity", 0.45);
          g.selectAll(".tick text")
            .attr("fill", "#fbbf24")
            .attr("font-family", "JetBrains Mono, monospace")
            .attr("font-size", "10px");
        });
    }

    if (mode === "BOTH" || mode === "PHASE") {
      const yRightAxis =
        mode === "PHASE"
          ? d3
              .axisLeft(yDegScale)
              .tickValues([-180, -90, 0, 90, 180])
              .tickFormat((d) => `${d}°`)
          : d3
              .axisRight(yDegScale)
              .tickValues([-180, -90, 0, 90, 180])
              .tickFormat((d) => `${d}°`);

      rootG
        .append("g")
        .attr("transform", mode === "PHASE" ? "translate(0,0)" : `translate(${innerW},0)`)
        .call(yRightAxis)
        .call((g) => {
          g.select(".domain").attr("stroke", "#22d3ee").attr("stroke-opacity", 0.6);
          g.selectAll(".tick line").attr("stroke", "#22d3ee").attr("stroke-opacity", 0.45);
          g.selectAll(".tick text")
            .attr("fill", "#38bdf8")
            .attr("font-family", "JetBrains Mono, monospace")
            .attr("font-size", "10px");
        });
    }

    // Axis Titles
    rootG
      .append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 31)
      .attr("text-anchor", "middle")
      .attr("fill", "#94a3b8")
      .attr("font-family", "JetBrains Mono, monospace")
      .attr("font-size", "10px")
      .text("FREQUENCY f (LOG SCALE · CLICK TO TUNE f_op · DRAG TO INSPECT)");

    const plotG = rootG.append("g").attr("clip-path", `url(#${clipId})`);

    // -3 dB Cutoff Label
    if (mode === "BOTH" || mode === "MAG") {
      plotG
        .append("text")
        .attr("x", 8)
        .attr("y", yDbScale(-3) - 5)
        .attr("fill", "#fbbf24")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .text("-3 dB Cutoff");
    }

    if (ok && data.length > 1) {
      // Magnitude Area & Curve
      if (mode === "BOTH" || mode === "MAG") {
        const magArea = d3
          .area<BodeDataPoint>()
          .x((d) => xScale(d.freqHz))
          .y0(innerH)
          .y1((d) => yDbScale(d.gainDb))
          .curve(d3.curveMonotoneX);

        plotG
          .append("path")
          .datum(data)
          .attr("fill", "url(#d3-bode-mag-grad)")
          .attr("d", magArea);

        const magLine = d3
          .line<BodeDataPoint>()
          .x((d) => xScale(d.freqHz))
          .y((d) => yDbScale(d.gainDb))
          .curve(d3.curveMonotoneX);

        plotG
          .append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#f59e0b")
          .attr("stroke-width", 2.5)
          .attr("d", magLine);
      }

      // Phase Curve
      if (mode === "BOTH" || mode === "PHASE") {
        const phaseLine = d3
          .line<BodeDataPoint>()
          .x((d) => xScale(d.freqHz))
          .y((d) => yDegScale(d.phaseDeg))
          .curve(d3.curveMonotoneX);

        plotG
          .append("path")
          .datum(data)
          .attr("fill", "none")
          .attr("stroke", "#22d3ee")
          .attr("stroke-width", 2.1)
          .attr("stroke-dasharray", "6 3")
          .attr("d", phaseLine);
      }

      // Characteristic Frequency Marker (f0 / fc)
      if (isFinite(critFreqHz) && critFreqHz >= fLo && critFreqHz <= fHi) {
        const cx = xScale(critFreqHz);
        plotG
          .append("line")
          .attr("x1", cx)
          .attr("x2", cx)
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", "#10b981")
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4 3");

        plotG
          .append("text")
          .attr("x", Math.min(innerW - 28, cx + 5))
          .attr("y", 14)
          .attr("fill", "#34d399")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .text(`${circuitLabel === "RLC" || circuitLabel === "LC" ? "f₀" : "fc"} ${formatHz(critFreqHz)}`);
      }

      // Active Operating Frequency Marker (f_op)
      if (isFinite(opFreqHz) && opFreqHz >= fLo && opFreqHz <= fHi) {
        const ox = xScale(opFreqHz);
        plotG
          .append("line")
          .attr("x1", ox)
          .attr("x2", ox)
          .attr("y1", 0)
          .attr("y2", innerH)
          .attr("stroke", "#f8fafc")
          .attr("stroke-width", 1.4)
          .attr("stroke-dasharray", "2 2");

        if (mode === "BOTH" || mode === "MAG") {
          plotG
            .append("circle")
            .attr("cx", ox)
            .attr("cy", yDbScale(Math.max(-60, Math.min(dbMax, gainDbAtOp))))
            .attr("r", 4.5)
            .attr("fill", "#f59e0b")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.8);
        }
        if (mode === "BOTH" || mode === "PHASE") {
          plotG
            .append("circle")
            .attr("cx", ox)
            .attr("cy", yDegScale(Math.max(-180, Math.min(180, phaseDegAtOp))))
            .attr("r", 4.5)
            .attr("fill", "#22d3ee")
            .attr("stroke", "#ffffff")
            .attr("stroke-width", 1.8);
        }

        plotG
          .append("text")
          .attr("x", ox > innerW - 72 ? ox - 6 : ox + 6)
          .attr("y", innerH - 8)
          .attr("text-anchor", ox > innerW - 72 ? "end" : "start")
          .attr("fill", "#ffffff")
          .attr("font-family", "JetBrains Mono, monospace")
          .attr("font-size", "10px")
          .attr("font-weight", "bold")
          .text(`f_op ${formatHz(opFreqHz)}`);
      }
    }

    // Dynamic hover crosshair group (updated in D3 pointer handlers)
    const hoverG = plotG.append("g").style("display", "none");
    hoverG
      .append("line")
      .attr("class", "hover-vline")
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#94a3b8")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3 3");
    hoverG
      .append("circle")
      .attr("class", "hover-mag-dot")
      .attr("r", 5)
      .attr("fill", "#fbbf24")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);
    hoverG
      .append("circle")
      .attr("class", "hover-phase-dot")
      .attr("r", 5)
      .attr("fill", "#22d3ee")
      .attr("stroke", "#0f172a")
      .attr("stroke-width", 2);

    // Interactive Bisector Overlay & Wheel Zoom
    const bisectFreq = d3.bisector<BodeDataPoint, number>((d) => d.freqHz).left;

    const overlay = rootG
      .append("rect")
      .attr("width", innerW)
      .attr("height", innerH)
      .attr("fill", "transparent")
      .style("cursor", "crosshair");

    overlay
      .on("mousemove", function (event: MouseEvent) {
        if (!ok || data.length === 0) return;
        const [mx] = d3.pointer(event, this);
        const fHover = xScale.invert(Math.max(0, Math.min(innerW, mx)));
        const idx = Math.min(data.length - 1, Math.max(0, bisectFreq(data, fHover, 1)));
        const d0 = data[idx - 1] ?? data[idx];
        const d1 = data[idx];
        const pt =
          !d0 || Math.abs(fHover - d1.freqHz) < Math.abs(fHover - d0.freqHz) ? d1 : d0;

        const px = xScale(pt.freqHz);
        const pyDb = yDbScale(pt.gainDb);
        const pyDeg = yDegScale(pt.phaseDeg);

        hoverG.style("display", "");
        hoverG.select(".hover-vline").attr("x1", px).attr("x2", px);
        hoverG
          .select(".hover-mag-dot")
          .style("display", mode === "PHASE" ? "none" : "")
          .attr("cx", px)
          .attr("cy", pyDb);
        hoverG
          .select(".hover-phase-dot")
          .style("display", mode === "MAG" ? "none" : "")
          .attr("cx", px)
          .attr("cy", pyDeg);

        setHoverPt({
          pt,
          px: margin.left + px,
          pyDb: margin.top + pyDb,
          pyDeg: margin.top + pyDeg,
        });
      })
      .on("mouseleave", () => {
        hoverG.style("display", "none");
        setHoverPt(null);
      })
      .on("click", function (event: MouseEvent) {
        if (!ok) return;
        const [mx] = d3.pointer(event, this);
        const fClicked = xScale.invert(Math.max(0, Math.min(innerW, mx)));
        if (isFinite(fClicked) && fClicked > 0) {
          onSelectRef.current(Number(fClicked.toPrecision(4)));
        }
      });

    // Alt/Ctrl + Wheel horizontal frequency zoom inside D3 plot
    const onWheelZoom = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.altKey) return;
      event.preventDefault();
      const baseLo = Math.pow(10, logLo);
      const baseHi = Math.pow(10, logHi);
      const factor = event.deltaY < 0 ? 0.72 : 1.38;
      const logCurLo = Math.log10(fLo);
      const logCurHi = Math.log10(fHi);
      const centerLog = (logCurLo + logCurHi) / 2;
      const halfSpan = Math.max(0.5, ((logCurHi - logCurLo) / 2) * factor);
      const nextLo = Math.max(baseLo, Math.pow(10, centerLog - halfSpan));
      const nextHi = Math.min(baseHi, Math.pow(10, centerLog + halfSpan));
      if (nextHi > nextLo * 1.5) {
        setZoomRange([nextLo, nextHi]);
      }
    };
    svgEl.addEventListener("wheel", onWheelZoom, { passive: false });

    return () => {
      svgEl.removeEventListener("wheel", onWheelZoom);
    };
  }, [
    data,
    activeDomainHz,
    dbMax,
    opFreqHz,
    critFreqHz,
    gainDbAtOp,
    phaseDegAtOp,
    ok,
    mode,
    size,
    circuitLabel,
    formatHz,
    logLo,
    logHi,
  ]);

  return (
    <section className="bg-[#11192e] border border-cyan-500/40 rounded-xl p-4 sm:p-5 space-y-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 font-bold">
            <Activity className="w-4 h-4" />
            <span>D3.JS INTERACTIVE BODE FREQUENCY RESPONSE (MAGNITUDE &amp; PHASE)</span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            D3 log-frequency scale |H(jω)| (dB) and transfer phase ∠H(jω) (°) synced live with{" "}
            {circuitLabel} {configLabel} circuit (V_out across {outputTap}). Click curve to tune f_op.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {zoomRange && (
            <button
              type="button"
              onClick={() => setZoomRange(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-mono text-cyan-200 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Zoom</span>
            </button>
          )}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#090f1d] border border-slate-800 rounded-lg p-1 text-[11px] font-mono">
            {(
              [
                { id: "BOTH", label: "Mag + Phase" },
                { id: "MAG", label: "Magnitude (dB)" },
                { id: "PHASE", label: "Phase (°)" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors ${
                  mode === opt.id
                    ? "bg-cyan-400 text-slate-950 font-bold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Numeric Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
        <div className="bg-[#090f1d] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-slate-400">GAIN |H| AT f_op</div>
          <div className="text-amber-300 font-bold tabular-nums">
            {ok ? `${gainDbAtOp.toFixed(2)} dB (${gainMagAtOp.toFixed(3)}×)` : "--"}
          </div>
        </div>
        <div className="bg-[#090f1d] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-slate-400">TRANSFER PHASE ∠H</div>
          <div className="text-cyan-300 font-bold tabular-nums">
            {ok ? `${phaseDegAtOp.toFixed(1)}°` : "--"}
          </div>
        </div>
        <div className="bg-[#090f1d] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-slate-400">
            {circuitLabel === "RLC" || circuitLabel === "LC" ? "RESONANCE f₀" : "CUTOFF (−3 dB) fc"}
          </div>
          <div className="text-emerald-300 font-bold tabular-nums">
            {isFinite(critFreqHz) ? formatHz(critFreqHz) : "--"}
          </div>
        </div>
        <div className="bg-[#090f1d] border border-slate-800 rounded-lg px-3 py-2">
          <div className="text-[10px] text-slate-400">OPERATING FREQ</div>
          <div className="text-white font-bold tabular-nums">{formatHz(opFreqHz)}</div>
        </div>
      </div>

      {/* D3 SVG Container + Interactive Crosshair Tooltip */}
      <div
        ref={containerRef}
        className="relative w-full h-[330px] bg-[#080d18] border border-slate-800/80 rounded-xl overflow-hidden"
      >
        <svg ref={svgRef} className="w-full h-full block" />

        {hoverPt && (
          <div
            className="pointer-events-none absolute z-20 px-3 py-2 rounded-xl bg-[#0a1020]/95 border border-cyan-400/70 text-[11px] font-mono text-slate-200 shadow-2xl space-y-0.5 tabular-nums"
            style={{
              left: hoverPt.px > size.w * 0.65 ? hoverPt.px - 205 : hoverPt.px + 14,
              top: 14,
              minWidth: 188,
            }}
          >
            <div className="font-bold text-white border-b border-slate-700/80 pb-0.5 mb-1">
              Freq: {formatHz(hoverPt.pt.freqHz)}
            </div>
            {(mode === "BOTH" || mode === "MAG") && (
              <div className="text-amber-300">
                |H|: <span className="font-bold">{hoverPt.pt.gainDb.toFixed(2)} dB</span> ({hoverPt.pt.gainMag.toFixed(3)}×)
              </div>
            )}
            {(mode === "BOTH" || mode === "PHASE") && (
              <div className="text-cyan-300">
                ∠H: <span className="font-bold">{hoverPt.pt.phaseDeg.toFixed(1)}°</span>
              </div>
            )}
            <div className="text-slate-400 text-[10px]">
              |Z|={hoverPt.pt.zMag} Ω · φ_Z={hoverPt.pt.circuitPhiDeg}°
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400 px-1">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-amber-300">
            <span className="w-3.5 h-0.5 bg-amber-400 inline-block" /> Magnitude |H(jω)| (dB)
          </span>
          <span className="inline-flex items-center gap-1.5 text-cyan-300">
            <span className="w-3.5 h-0.5 border-t-2 border-dashed border-cyan-400 inline-block" /> Transfer Phase ∠H (°)
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block" /> Characteristic Freq (f₀/fc)
          </span>
        </div>
        <span className="text-[10px] text-slate-500">Tip: Click curve to set f_op · Ctrl/Alt + Scroll to zoom</span>
      </div>
    </section>
  );
}
