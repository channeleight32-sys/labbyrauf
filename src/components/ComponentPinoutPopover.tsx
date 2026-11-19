import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import type { ComponentTerminal, RealisticComponentDef } from "../data/realisticComponentsData";
import RealisticComponentRenderer from "./RealisticComponentRenderer";

export interface PinoutPopoverData {
  id: string;
  name: string;
  partNumber: string;
  packageType?: string;
  packageLabel: string;
  isPolarized: boolean;
  terminals: ComponentTerminal[];
  symbolNode?: React.ReactNode;
  note?: string;
}

interface ComponentPinoutPopoverProps {
  data: PinoutPopoverData | null;
  anchorRect: DOMRect | null;
}

type PinColorTheme = {
  stroke: string;
  text: string;
  bg: string;
  roleTag: string;
};

function getTerminalTheme(term: ComponentTerminal): PinColorTheme {
  const pol = (term.polarity || "").toUpperCase();
  const nm = `${term.name} ${term.label}`.toUpperCase();

  if (
    pol === "POSITIVE" ||
    pol === "ANODE" ||
    /\b(VCC|VDD|5V|3V3|3\.3V|VIN|VBUS|VSYS|V_POS|VS|POS|\+VS)\b/.test(nm)
  ) {
    return {
      stroke: "#F59E0B",
      text: "#FBBF24",
      bg: "rgba(245, 158, 11, 0.16)",
      roleTag: "PWR/+",
    };
  }

  if (
    pol === "NEGATIVE" ||
    pol === "CATHODE" ||
    /\b(GND|V_NEG|VSS|NEG)\b/.test(nm) ||
    nm.includes("GND")
  ) {
    return {
      stroke: "#94A3B8",
      text: "#CBD5E1",
      bg: "rgba(148, 163, 184, 0.14)",
      roleTag: "GND/-",
    };
  }

  if (
    pol === "GATE" ||
    pol === "BASE" ||
    /\b(TRIG|CLK|EN|RST|RESET|CE|CSN|NSS|CTRL|WIPER|PWM)\b/.test(nm)
  ) {
    return {
      stroke: "#34D399",
      text: "#6EE7B7",
      bg: "rgba(52, 211, 153, 0.15)",
      roleTag: "CTRL",
    };
  }

  if (
    pol === "COLLECTOR" ||
    pol === "DRAIN" ||
    /\b(OUT|VOUT|ECHO|TX|TXD|MISO|MOSI|SDA|SCL|1Y|2Y|3Y|4Y|5Y|6Y|CO)\b/.test(nm) ||
    /^Q\d/.test(term.name.toUpperCase())
  ) {
    return {
      stroke: "#38BDF8",
      text: "#7DD3FC",
      bg: "rgba(56, 189, 248, 0.15)",
      roleTag: "SIG/OUT",
    };
  }

  if (nm === "NC" || nm.includes(": NC")) {
    return {
      stroke: "#475569",
      text: "#64748B",
      bg: "rgba(71, 85, 105, 0.15)",
      roleTag: "NC",
    };
  }

  return {
    stroke: "#38BDF8",
    text: "#BAE6FD",
    bg: "rgba(56, 189, 248, 0.12)",
    roleTag: "IO",
  };
}

function formatPinShortLabel(term: ComponentTerminal): string {
  let clean = term.label
    .replace(/^Pin\s*\d+\s*:\s*/i, "")
    .replace(/^\d+\s*:\s*/, "")
    .trim();
  if (!clean) clean = term.name;
  if (clean.length > 18) {
    clean = `${clean.slice(0, 17)}…`;
  }
  return clean;
}

export function realisticComponentToPinoutData(comp: RealisticComponentDef): PinoutPopoverData {
  return {
    id: comp.id,
    name: comp.name,
    partNumber: comp.partNumber,
    packageType: comp.packageType,
    packageLabel: comp.packageDescription.split(",")[0].split(".")[0].slice(0, 46),
    isPolarized: comp.isPolarized,
    terminals: comp.terminals,
    note: comp.educationalNotes,
  };
}

export default function ComponentPinoutPopover({
  data,
  anchorRect,
}: ComponentPinoutPopoverProps) {
  const layout = useMemo(() => {
    if (!data) return null;

    const terms = data.terminals;
    const rawLeft = terms.filter((t) => t.side === "left");
    const rawRight = terms.filter((t) => t.side === "right");
    const rawTop = terms.filter((t) => t.side === "top");
    const rawBottom = terms.filter((t) => t.side === "bottom");

    // Large horizontal pin headers (e.g. Arduino Uno/Nano) rearrange cleanly into left/right banks
    const needsBankSplit = rawTop.length > 4 || rawBottom.length > 4;

    let leftPins: ComponentTerminal[] = rawLeft;
    let rightPins: ComponentTerminal[] = rawRight;
    let topPins: ComponentTerminal[] = rawTop;
    let bottomPins: ComponentTerminal[] = rawBottom;
    let leftBankTitle: string | null = null;
    let rightBankTitle: string | null = null;

    if (needsBankSplit) {
      if (rawBottom.length > 0 && rawTop.length > 0) {
        leftPins = [...rawLeft, ...rawBottom];
        rightPins = [...rawRight, ...rawTop];
        leftBankTitle = "POWER / ANALOG";
        rightBankTitle = "DIGITAL / PWM";
      } else {
        const allSingleBank = [...rawLeft, ...rawTop, ...rawBottom, ...rawRight];
        const mid = Math.ceil(allSingleBank.length / 2);
        leftPins = allSingleBank.slice(0, mid);
        rightPins = allSingleBank.slice(mid);
        leftBankTitle = "BANK A";
        rightBankTitle = "BANK B";
      }
      topPins = [];
      bottomPins = [];
    }

    const maxVert = Math.max(leftPins.length, rightPins.length, 1);
    const isDense = maxVert > 8;
    const rowStep = isDense ? 16 : 22;
    const bodyTop = topPins.length > 0 ? 44 : leftBankTitle ? 26 : 18;
    const bodyBottomPad = bottomPins.length > 0 ? 44 : 16;
    const bodyH = Math.max(76, maxVert * rowStep + 14);
    const svgH = bodyTop + bodyH + bodyBottomPad;

    const showLegendRows = terms.length <= 10;
    const keyHighlightPins = showLegendRows
      ? terms
      : terms
          .filter((t) => {
            const th = getTerminalTheme(t);
            return th.roleTag === "PWR/+" || th.roleTag === "GND/-" || th.roleTag === "CTRL";
          })
          .slice(0, 6);

    const estimatedLegendHeight = showLegendRows
      ? Math.ceil(terms.length / (terms.length > 4 ? 2 : 1)) * 22 + 24
      : Math.ceil(keyHighlightPins.length / 2) * 20 + 26;

    const estimatedTotalH = 92 + svgH + estimatedLegendHeight + (data.note ? 44 : 0);

    return {
      leftPins,
      rightPins,
      topPins,
      bottomPins,
      leftBankTitle,
      rightBankTitle,
      bodyTop,
      bodyH,
      svgH,
      isDense,
      showLegendRows,
      keyHighlightPins,
      estimatedTotalH: Math.min(580, estimatedTotalH),
    };
  }, [data]);

  if (!data || !anchorRect || !layout || typeof document === "undefined") {
    return null;
  }

  const popoverW = 416;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 12;

  // Smart horizontal placement: prefer right of card, else left of card, else centered over/below
  let left = anchorRect.right + 12;
  if (left + popoverW > vw - margin) {
    const tryLeft = anchorRect.left - popoverW - 12;
    if (tryLeft >= margin) {
      left = tryLeft;
    } else {
      left = Math.max(margin, Math.min(vw - popoverW - margin, anchorRect.left + anchorRect.width / 2 - popoverW / 2));
    }
  }

  // Smart vertical clamping within viewport
  let top = anchorRect.top + anchorRect.height / 2 - layout.estimatedTotalH / 2;
  if (top + layout.estimatedTotalH > vh - margin) {
    top = vh - layout.estimatedTotalH - margin;
  }
  if (top < margin) {
    top = margin;
  }

  const svgW = 400;
  const bodyX = 134;
  const bodyW = 132;
  const bodyRight = bodyX + bodyW;
  const bodyMidX = bodyX + bodyW / 2;
  const isDipOrIc =
    Boolean(data.packageType?.includes("DIP")) ||
    Boolean(data.packageType?.includes("PCB")) ||
    data.terminals.length >= 6;

  return createPortal(
    <div
      role="tooltip"
      aria-label={`Schematic pinout diagram for ${data.name}`}
      style={{
        position: "fixed",
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        width: `${popoverW}px`,
        maxHeight: `${vh - margin * 2}px`,
      }}
      className="z-50 pointer-events-none select-none rounded-xl bg-[#0B1220]/98 border border-cyan-400/45 shadow-2xl shadow-black/85 overflow-hidden text-slate-100"
    >
      {/* Top Header Strip */}
      <div className="px-3.5 py-2.5 bg-[#111B2E] border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-cyan-400 tracking-wide">
          <span>SCHEMATIC PINOUT DIAGRAM</span>
          <span className="tabular-nums text-slate-400">
            {data.terminals.length} {data.terminals.length === 1 ? "Pin" : "Pins"} ·{" "}
            {data.isPolarized ? "Polarized" : "Non-Polarized"}
          </span>
        </div>
        <div className="text-sm font-semibold text-white leading-snug mt-0.5 truncate">
          {data.name}
        </div>
        <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
          {data.partNumber} · {data.packageLabel}
        </div>
      </div>

      {/* Blueprint SVG Schematic Pinout Diagram */}
      <div className="bg-[#060B14] px-2.5 py-2 border-b border-slate-800/90">
        <svg
          viewBox={`0 0 ${svgW} ${layout.svgH}`}
          className="w-full h-auto block"
          style={{ maxHeight: "290px" }}
        >
          <defs>
            <pattern
              id={`pinoutGrid_${data.id}`}
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 16 0 L 0 0 0 16"
                fill="none"
                stroke="#1E293B"
                strokeWidth="0.6"
                strokeOpacity="0.65"
              />
            </pattern>
          </defs>

          <rect
            x="0"
            y="0"
            width={svgW}
            height={layout.svgH}
            rx="6"
            fill={`url(#pinoutGrid_${data.id})`}
          />

          {/* Optional Left / Right Header Bank Subtitles for Multi-Rail MCUs */}
          {layout.leftBankTitle && (
            <text
              x={bodyX - 8}
              y={14}
              textAnchor="end"
              fill="#64748B"
              fontFamily="monospace"
              fontSize="8"
              fontWeight="bold"
            >
              {layout.leftBankTitle}
            </text>
          )}
          {layout.rightBankTitle && (
            <text
              x={bodyRight + 8}
              y={14}
              textAnchor="start"
              fill="#64748B"
              fontFamily="monospace"
              fontSize="8"
              fontWeight="bold"
            >
              {layout.rightBankTitle}
            </text>
          )}

          {/* Central Schematic Package Frame */}
          <rect
            x={bodyX}
            y={layout.bodyTop}
            width={bodyW}
            height={layout.bodyH}
            rx="6"
            fill="#0B1324"
            stroke="#38BDF8"
            strokeOpacity="0.55"
            strokeWidth="1.25"
          />

          {/* Classic DIP / IC Pin-1 Index Notch & Marker Dot */}
          {isDipOrIc && (
            <g>
              <path
                d={`M ${bodyMidX - 10} ${layout.bodyTop} A 10 10 0 0 0 ${bodyMidX + 10} ${layout.bodyTop}`}
                fill="#060B14"
                stroke="#38BDF8"
                strokeOpacity="0.55"
                strokeWidth="1.1"
              />
              <circle
                cx={bodyX + 10}
                cy={layout.bodyTop + 10}
                r="2.6"
                fill="#F59E0B"
              />
            </g>
          )}

          {/* Centered IEEE/IEC Schematic Symbol */}
          <svg
            x={bodyMidX - 48}
            y={layout.bodyTop + (layout.bodyH - (layout.isDense ? 54 : 58)) / 2 - (layout.isDense ? 8 : 0)}
            width={96}
            height={layout.isDense ? 54 : 58}
            viewBox="0 0 100 60"
          >
            {data.symbolNode ? (
              data.symbolNode
            ) : (
              <RealisticComponentRenderer
                type={data.id}
                mode="SCHEMATIC"
                width={96}
                height={layout.isDense ? 54 : 58}
                formattedValue={data.partNumber}
                isSimRunning={false}
              />
            )}
          </svg>

          {layout.isDense && (
            <text
              x={bodyMidX}
              y={layout.bodyTop + layout.bodyH - 12}
              textAnchor="middle"
              fill="#64748B"
              fontFamily="monospace"
              fontSize="8"
              fontWeight="bold"
            >
              {data.packageType?.replace("PCB_", "").replace("_", " ") || `${data.terminals.length}-PIN`}
            </text>
          )}

          {/* LEFT SIDE PINS */}
          {layout.leftPins.map((term, idx) => {
            const count = layout.leftPins.length;
            const y =
              count === 1
                ? layout.bodyTop + layout.bodyH / 2
                : layout.bodyTop + 13 + ((layout.bodyH - 26) * idx) / (count - 1);
            const theme = getTerminalTheme(term);
            const pinStr = term.pinNumber !== undefined ? String(term.pinNumber) : String(idx + 1);
            const xNode = bodyX - 24;
            return (
              <g key={`L_${term.name}_${pinStr}_${idx}`}>
                <line
                  x1={xNode}
                  y1={y}
                  x2={bodyX}
                  y2={y}
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <circle
                  cx={xNode}
                  cy={y}
                  r={layout.isDense ? 2.5 : 3.2}
                  fill="#060B14"
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                {/* Pin number badge inside body edge */}
                <rect
                  x={bodyX + 4}
                  y={y - 6}
                  width={pinStr.length > 1 ? 15 : 12}
                  height={12}
                  rx="2.5"
                  fill={theme.bg}
                />
                <text
                  x={bodyX + (pinStr.length > 1 ? 11.5 : 10)}
                  y={y + 3}
                  textAnchor="middle"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {pinStr}
                </text>
                {/* Signal name outside */}
                <text
                  x={xNode - 6}
                  y={y + 3}
                  textAnchor="end"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize={layout.isDense ? "8.8" : "9.5"}
                  fontWeight="bold"
                >
                  {formatPinShortLabel(term)}
                </text>
              </g>
            );
          })}

          {/* RIGHT SIDE PINS */}
          {layout.rightPins.map((term, idx) => {
            const count = layout.rightPins.length;
            const y =
              count === 1
                ? layout.bodyTop + layout.bodyH / 2
                : layout.bodyTop + 13 + ((layout.bodyH - 26) * idx) / (count - 1);
            const theme = getTerminalTheme(term);
            const pinStr =
              term.pinNumber !== undefined
                ? String(term.pinNumber)
                : String(layout.leftPins.length + idx + 1);
            const xNode = bodyRight + 24;
            const badgeW = pinStr.length > 1 ? 15 : 12;
            return (
              <g key={`R_${term.name}_${pinStr}_${idx}`}>
                <line
                  x1={bodyRight}
                  y1={y}
                  x2={xNode}
                  y2={y}
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <circle
                  cx={xNode}
                  cy={y}
                  r={layout.isDense ? 2.5 : 3.2}
                  fill="#060B14"
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                {/* Pin number badge inside body edge */}
                <rect
                  x={bodyRight - 4 - badgeW}
                  y={y - 6}
                  width={badgeW}
                  height={12}
                  rx="2.5"
                  fill={theme.bg}
                />
                <text
                  x={bodyRight - 4 - badgeW / 2}
                  y={y + 3}
                  textAnchor="middle"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize="8"
                  fontWeight="bold"
                >
                  {pinStr}
                </text>
                {/* Signal name outside */}
                <text
                  x={xNode + 6}
                  y={y + 3}
                  textAnchor="start"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize={layout.isDense ? "8.8" : "9.5"}
                  fontWeight="bold"
                >
                  {formatPinShortLabel(term)}
                </text>
              </g>
            );
          })}

          {/* TOP SIDE PINS (compact <= 4) */}
          {layout.topPins.map((term, idx) => {
            const count = layout.topPins.length;
            const x =
              count === 1
                ? bodyMidX
                : bodyX + 24 + ((bodyW - 48) * idx) / (count - 1);
            const theme = getTerminalTheme(term);
            const pinStr = term.pinNumber !== undefined ? String(term.pinNumber) : String(idx + 1);
            const yNode = layout.bodyTop - 18;
            return (
              <g key={`T_${term.name}_${pinStr}_${idx}`}>
                <line
                  x1={x}
                  y1={yNode}
                  x2={x}
                  y2={layout.bodyTop}
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <circle
                  cx={x}
                  cy={yNode}
                  r="3.2"
                  fill="#060B14"
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={yNode - 8}
                  textAnchor="middle"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {pinStr} · {formatPinShortLabel(term)}
                </text>
              </g>
            );
          })}

          {/* BOTTOM SIDE PINS (compact <= 4) */}
          {layout.bottomPins.map((term, idx) => {
            const count = layout.bottomPins.length;
            const x =
              count === 1
                ? bodyMidX
                : bodyX + 24 + ((bodyW - 48) * idx) / (count - 1);
            const theme = getTerminalTheme(term);
            const pinStr = term.pinNumber !== undefined ? String(term.pinNumber) : String(idx + 1);
            const bodyBottom = layout.bodyTop + layout.bodyH;
            const yNode = bodyBottom + 18;
            return (
              <g key={`B_${term.name}_${pinStr}_${idx}`}>
                <line
                  x1={x}
                  y1={bodyBottom}
                  x2={x}
                  y2={yNode}
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <circle
                  cx={x}
                  cy={yNode}
                  r="3.2"
                  fill="#060B14"
                  stroke={theme.stroke}
                  strokeWidth="1.5"
                />
                <text
                  x={x}
                  y={yNode + 14}
                  textAnchor="middle"
                  fill={theme.text}
                  fontFamily="monospace"
                  fontSize="9"
                  fontWeight="bold"
                >
                  {pinStr} · {formatPinShortLabel(term)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Pinout Reference Legend */}
      <div className="px-3.5 py-2.5 bg-[#0B1220] space-y-2">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
          <span>
            {layout.showLegendRows ? "Pin Functions" : "Key Power & Control Pins"}
          </span>
          <span className="text-slate-500">
            PWR/+ · GND/- · CTRL · SIG
          </span>
        </div>

        <div
          className={`grid gap-x-3 gap-y-1 ${
            (layout.showLegendRows ? data.terminals.length : layout.keyHighlightPins.length) > 4
              ? "grid-cols-2"
              : "grid-cols-1"
          }`}
        >
          {(layout.showLegendRows ? data.terminals : layout.keyHighlightPins).map((term, idx) => {
            const theme = getTerminalTheme(term);
            const pinStr = term.pinNumber !== undefined ? String(term.pinNumber) : String(idx + 1);
            return (
              <div
                key={`leg_${term.name}_${pinStr}_${idx}`}
                className="flex items-baseline gap-1.5 text-[10.5px] font-mono leading-tight min-w-0"
              >
                <span
                  className="shrink-0 tabular-nums font-bold px-1 rounded"
                  style={{ color: theme.text, backgroundColor: theme.bg }}
                >
                  {pinStr}
                </span>
                <span className="text-white font-semibold shrink-0 truncate max-w-[105px]">
                  {term.name}
                </span>
                <span className="text-slate-400 truncate font-sans text-[10px]">
                  {term.description}
                </span>
              </div>
            );
          })}
        </div>

        {data.note && (
          <div className="pt-1.5 border-t border-slate-800/80 text-[10.5px] text-slate-300 leading-snug line-clamp-2">
            {data.note}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
