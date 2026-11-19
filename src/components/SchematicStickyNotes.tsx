import React from "react";
import {
  StickyNote,
  Plus,
  Trash2,
  Copy,
  Minimize2,
  Maximize2,
  GripHorizontal,
  Sparkles,
} from "lucide-react";
import { CompSpec } from "../data/logicSpecs";

export type StickyNoteColorTheme =
  | "amber"
  | "cyan"
  | "emerald"
  | "violet"
  | "rose"
  | "slate";

export interface StickyNoteItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  text: string;
  colorTheme: StickyNoteColorTheme;
  fontSize: "sm" | "md" | "lg";
  minimized?: boolean;
}

export const STICKY_NOTE_THEMES: Record<
  StickyNoteColorTheme,
  {
    name: string;
    bg: string;
    headerBg: string;
    border: string;
    text: string;
    titleText: string;
    dot: string;
    svgFill: string;
    svgHeader: string;
    svgStroke: string;
    svgText: string;
  }
> = {
  amber: {
    name: "Engineering Post-It Amber",
    bg: "bg-[#1e1708]/95",
    headerBg: "bg-amber-500/20",
    border: "border-amber-400/60",
    text: "text-amber-100",
    titleText: "text-amber-300",
    dot: "#fbbf24",
    svgFill: "#1c1507",
    svgHeader: "#452b07",
    svgStroke: "#f59e0b",
    svgText: "#fef3c7",
  },
  cyan: {
    name: "Blueprint Signal Cyan",
    bg: "bg-[#071824]/95",
    headerBg: "bg-cyan-500/20",
    border: "border-cyan-400/60",
    text: "text-cyan-100",
    titleText: "text-cyan-300",
    dot: "#38bdf8",
    svgFill: "#071824",
    svgHeader: "#0c3047",
    svgStroke: "#06b6d4",
    svgText: "#cffafe",
  },
  emerald: {
    name: "Verification Emerald",
    bg: "bg-[#061c14]/95",
    headerBg: "bg-emerald-500/20",
    border: "border-emerald-400/60",
    text: "text-emerald-100",
    titleText: "text-emerald-300",
    dot: "#10b981",
    svgFill: "#061c14",
    svgHeader: "#063b2b",
    svgStroke: "#10b981",
    svgText: "#d1fae5",
  },
  violet: {
    name: "Sub-Circuit Violet",
    bg: "bg-[#140e26]/95",
    headerBg: "bg-violet-500/20",
    border: "border-violet-400/60",
    text: "text-violet-100",
    titleText: "text-violet-300",
    dot: "#a78bfa",
    svgFill: "#140e26",
    svgHeader: "#291b4d",
    svgStroke: "#8b5cf6",
    svgText: "#ede9fe",
  },
  rose: {
    name: "Critical / Thermal Rose",
    bg: "bg-[#220a12]/95",
    headerBg: "bg-rose-500/20",
    border: "border-rose-400/60",
    text: "text-rose-100",
    titleText: "text-rose-300",
    dot: "#fb7185",
    svgFill: "#220a12",
    svgHeader: "#471223",
    svgStroke: "#f43f5e",
    svgText: "#ffe4e6",
  },
  slate: {
    name: "Specification Slate",
    bg: "bg-[#0f172a]/95",
    headerBg: "bg-slate-700/40",
    border: "border-slate-500/60",
    text: "text-slate-200",
    titleText: "text-slate-100",
    dot: "#94a3b8",
    svgFill: "#0f172a",
    svgHeader: "#1e293b",
    svgStroke: "#64748b",
    svgText: "#f1f5f9",
  },
};

export const STICKY_NOTE_TEMPLATES: {
  label: string;
  title: string;
  text: string;
  colorTheme: StickyNoteColorTheme;
}[] = [
  {
    label: "Blank Note",
    title: "DESIGN ANNOTATION",
    text: "Add circuit design notes, node equations, or test instructions here...",
    colorTheme: "amber",
  },
  {
    label: "BC547 & 1N4007A Spec",
    title: "ANALOGUE BIAS SPEC",
    text: "• BC547B NPN: V_BE ≈ 0.7V, hFE ≈ 250, I_C(max) = 100mA\n• 1N4007A Diode: V_F = 0.7V, V_RRM = 1000V\n• Zener 1N4733A: V_Z = 5.1V @ I_ZT = 49mA",
    colorTheme: "cyan",
  },
  {
    label: "SCR / DIAC / TRIAC Note",
    title: "THYRISTOR TRIGGERING",
    text: "• SCR (TYN612): Latches ON when Gate G=1; commutates OFF when A=0 or K_RESET=1.\n• DIAC (DB3): Bidirectional breakover V_BO = ±32V.\n• TRIAC (BT136): AC load phase control in Quadrants I & III.",
    colorTheme: "violet",
  },
  {
    label: "Timing & Propagation",
    title: "TIMING CONSTRAINTS",
    text: "• Critical Path: Verify t_pd per stage < T_clk / 2\n• Probe key nets using CH1–CH4 Wire Probes or Logic Analyzer.",
    colorTheme: "emerald",
  },
];

/**
 * Renders Sticky Notes inside the SVG canvas so exported SVG / 3x PNG lab reports
 * automatically include all schematic sticky note annotations.
 */
export function SvgStickyNotesLayer({ notes }: { notes: StickyNoteItem[] }) {
  if (notes.length === 0) return null;

  return (
    <g className="svg-sticky-notes-export-layer pointer-events-none">
      {notes.map((note) => {
        const theme = STICKY_NOTE_THEMES[note.colorTheme] || STICKY_NOTE_THEMES.amber;
        const h = note.minimized ? 30 : note.height;
        const lines = note.minimized ? [] : note.text.split("\n").slice(0, 9);
        const fontSizePx =
          note.fontSize === "lg" ? 11.5 : note.fontSize === "sm" ? 9 : 10;

        return (
          <g key={`svg-note-${note.id}`} transform={`translate(${note.x}, ${note.y})`}>
            {/* Main Note Card */}
            <rect
              x={0}
              y={0}
              width={note.width}
              height={h}
              rx={8}
              fill={theme.svgFill}
              stroke={theme.svgStroke}
              strokeWidth={1.6}
              opacity={0.92}
            />
            {/* Header Bar */}
            <rect
              x={1}
              y={1}
              width={note.width - 2}
              height={26}
              rx={7}
              fill={theme.svgHeader}
            />
            {/* Pin Dot */}
            <circle cx={12} cy={14} r={3.5} fill={theme.dot} />
            {/* Title */}
            <text
              x={22}
              y={17.5}
              fill={theme.svgText}
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono), monospace",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              {note.title.slice(0, 30)}
            </text>
            {/* Body Lines */}
            {!note.minimized &&
              lines.map((line, idx) => (
                <text
                  key={idx}
                  x={10}
                  y={43 + idx * (fontSizePx + 5)}
                  fill={theme.svgText}
                  style={{
                    fontSize: `${fontSizePx}px`,
                    fontFamily: "var(--font-mono), monospace",
                  }}
                >
                  {line.slice(0, 44)}
                </text>
              ))}
          </g>
        );
      })}
    </g>
  );
}

interface InteractiveStickyNotesOverlayProps {
  notes: StickyNoteItem[];
  pan: { x: number; y: number };
  selectedNoteId: number | null;
  onSelectNote: (id: number | null) => void;
  onUpdateNote: (id: number, patch: Partial<StickyNoteItem>) => void;
  onDeleteNote: (id: number) => void;
  onDuplicateNote: (id: number) => void;
  snapToGrid?: boolean;
  gridPitch?: number;
}

/**
 * Interactive floating HTML Sticky Notes layer rendered inside the schematic viewport.
 * Synchronizes with canvas `pan` so notes stick to world coordinates while providing
 * native inline `<input>` and `<textarea>` editing, drag-to-move, resize, and color themes.
 */
export function InteractiveStickyNotesOverlay({
  notes,
  pan,
  selectedNoteId,
  onSelectNote,
  onUpdateNote,
  onDeleteNote,
  onDuplicateNote,
  snapToGrid = false,
  gridPitch = 20,
}: InteractiveStickyNotesOverlayProps) {
  if (notes.length === 0) return null;

  const snapVal = (v: number) =>
    snapToGrid ? Math.round(v / gridPitch) * gridPitch : Math.round(v);

  const handleStartDragNote = (
    note: StickyNoteItem,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    onSelectNote(note.id);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initX = note.x;
    const initY = note.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startClientX;
      const dy = ev.clientY - startClientY;
      onUpdateNote(note.id, {
        x: snapVal(initX + dx),
        y: snapVal(initY + dy),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleStartResizeNote = (
    note: StickyNoteItem,
    e: React.PointerEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();
    onSelectNote(note.id);
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const initW = note.width;
    const initH = note.height;

    const onMove = (ev: PointerEvent) => {
      const dw = ev.clientX - startClientX;
      const dh = ev.clientY - startClientY;
      onUpdateNote(note.id, {
        width: Math.max(180, Math.min(440, Math.round(initW + dw))),
        height: Math.max(105, Math.min(340, Math.round(initH + dh))),
      });
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {notes.map((note) => {
        const theme =
          STICKY_NOTE_THEMES[note.colorTheme] || STICKY_NOTE_THEMES.amber;
        const isSelected = selectedNoteId === note.id;
        const screenX = pan.x + note.x;
        const screenY = pan.y + note.y;
        const textFontClass =
          note.fontSize === "lg"
            ? "text-xs leading-relaxed"
            : note.fontSize === "sm"
            ? "text-[10px] leading-snug"
            : "text-[11px] leading-normal";

        return (
          <div
            key={note.id}
            style={{
              transform: `translate(${screenX}px, ${screenY}px)`,
              width: `${note.width}px`,
              height: note.minimized ? "auto" : `${note.height}px`,
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onSelectNote(note.id);
            }}
            className={`absolute left-0 top-0 pointer-events-auto rounded-lg border shadow-xl backdrop-blur-md flex flex-col transition-shadow ${
              theme.bg
            } ${theme.border} ${
              isSelected
                ? "ring-2 ring-amber-400/80 shadow-amber-500/20"
                : "shadow-black/60"
            }`}
          >
            {/* Draggable Sticky Note Header */}
            <div
              onPointerDown={(e) => handleStartDragNote(note, e)}
              className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-t-lg border-b border-white/10 cursor-grab active:cursor-grabbing select-none ${theme.headerBg}`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <GripHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={note.title}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onUpdateNote(note.id, { title: e.target.value })
                  }
                  placeholder="Note Title..."
                  aria-label="Sticky note title"
                  className={`bg-transparent font-mono text-[11px] font-bold tracking-wide focus:outline-none focus:underline w-full truncate ${theme.titleText}`}
                />
              </div>

              {/* Color Swatches + Actions */}
              <div
                className="flex items-center gap-1 shrink-0"
                onPointerDown={(e) => e.stopPropagation()}
              >
                {(
                  Object.keys(STICKY_NOTE_THEMES) as StickyNoteColorTheme[]
                ).map((cKey) => (
                  <button
                    key={cKey}
                    type="button"
                    onClick={() => onUpdateNote(note.id, { colorTheme: cKey })}
                    style={{ backgroundColor: STICKY_NOTE_THEMES[cKey].dot }}
                    className={`w-2.5 h-2.5 rounded-full cursor-pointer transition-transform ${
                      note.colorTheme === cKey
                        ? "scale-125 ring-1 ring-white"
                        : "opacity-65 hover:opacity-100"
                    }`}
                    title={STICKY_NOTE_THEMES[cKey].name}
                  />
                ))}

                <button
                  type="button"
                  onClick={() => {
                    const order: ("sm" | "md" | "lg")[] = ["sm", "md", "lg"];
                    const nextFont =
                      order[(order.indexOf(note.fontSize) + 1) % order.length];
                    onUpdateNote(note.id, { fontSize: nextFont });
                  }}
                  className="px-1 py-0.5 text-[9px] font-mono font-bold text-slate-300 hover:text-white bg-black/30 rounded cursor-pointer"
                  title="Cycle text size (S / M / L)"
                >
                  {note.fontSize.toUpperCase()}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateNote(note.id, { minimized: !note.minimized })
                  }
                  className="p-0.5 text-slate-300 hover:text-white rounded cursor-pointer"
                  title={note.minimized ? "Expand note" : "Minimize note"}
                >
                  {note.minimized ? (
                    <Maximize2 className="w-3 h-3" />
                  ) : (
                    <Minimize2 className="w-3 h-3" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicateNote(note.id)}
                  className="p-0.5 text-slate-300 hover:text-cyan-300 rounded cursor-pointer"
                  title="Duplicate sticky note"
                >
                  <Copy className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={() => onDeleteNote(note.id)}
                  className="p-0.5 text-slate-300 hover:text-rose-400 rounded cursor-pointer"
                  title="Delete sticky note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Editable Multi-Line Textarea Body */}
            {!note.minimized && (
              <div className="relative flex-1 flex flex-col p-2 min-h-0">
                <textarea
                  value={note.text}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onUpdateNote(note.id, { text: e.target.value })
                  }
                  placeholder="Type schematic annotation, equations, or pin notes..."
                  aria-label="Sticky note annotation text"
                  className={`w-full flex-1 bg-transparent resize-none font-mono focus:outline-none ${textFontClass} ${theme.text} placeholder:text-slate-500`}
                />

                {/* Bottom Metadata + Resize Corner Handle */}
                <div className="flex items-center justify-between pt-1 mt-1 border-t border-white/10 text-[9px] font-mono text-slate-400 select-none">
                  <span>
                    ({note.x}, {note.y}) · {note.width}×{note.height}px
                  </span>
                  <div
                    onPointerDown={(e) => handleStartResizeNote(note, e)}
                    className="px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/15 text-slate-300 cursor-nwse-resize"
                    title="Drag corner to resize sticky note"
                  >
                    ⤡ Resize
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Renders authentic IEEE/IEC vector schematic symbols for all Analogue & Power Electronics
 * components both in the Left Palette (`AnalogPaletteSymbol`) and on the SVG Canvas (`SvgAnalogNodeGraphic`).
 */
export function AnalogPaletteSymbol({ type }: { type: string }) {
  switch (type) {
    case "RES":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="4" y1="21" x2="14" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <polyline
            points="14,21 18,12 24,30 30,12 36,30 42,12 46,21"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.3"
            strokeLinejoin="round"
          />
          <line x1="46" y1="21" x2="58" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
        </svg>
      );

    case "POT":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="4" y1="23" x2="14" y2="23" stroke="#38bdf8" strokeWidth="2" />
          <polyline
            points="14,23 18,15 24,31 30,15 36,31 42,15 46,23"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.2"
          />
          <line x1="46" y1="23" x2="58" y2="23" stroke="#38bdf8" strokeWidth="2" />
          <line x1="20" y1="35" x2="40" y2="9" stroke="#22c55e" strokeWidth="2" />
          <polygon points="42,7 36,9 40,13" fill="#22c55e" />
        </svg>
      );

    case "CAP_NP":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="6" y1="21" x2="26" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="26" y1="9" x2="26" y2="33" stroke="#38bdf8" strokeWidth="2.8" />
          <line x1="35" y1="9" x2="35" y2="33" stroke="#38bdf8" strokeWidth="2.8" />
          <line x1="35" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
        </svg>
      );

    case "CAP_POL":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="6" y1="21" x2="25" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="25" y1="9" x2="25" y2="33" stroke="#fbbf24" strokeWidth="2.8" />
          <path
            d="M 37,9 Q 31,21 37,33"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.6"
          />
          <line x1="34" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <text x="16" y="15" fill="#fbbf24" style={{ fontSize: "11px", fontWeight: 800 }}>
            +
          </text>
        </svg>
      );

    case "IND":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <path
            d="M 5,25 L 13,25 A 5,6 0 0 1 23,25 A 5,6 0 0 1 33,25 A 5,6 0 0 1 43,25 A 5,6 0 0 1 53,25 L 58,25"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="2.3"
          />
        </svg>
      );

    case "DIODE_1N4007":
    case "SCHOTTKY":
    case "LED_RED":
    case "PHOTODIODE":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="6" y1="21" x2="21" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <polygon
            points="21,11 21,31 39,21"
            fill="rgba(56,189,248,0.2)"
            stroke="#38bdf8"
            strokeWidth="2.2"
          />
          <line x1="39" y1="11" x2="39" y2="31" stroke="#fbbf24" strokeWidth="2.8" />
          <line x1="39" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          {type === "LED_RED" && (
            <>
              <line x1="30" y1="9" x2="37" y2="3" stroke="#f43f5e" strokeWidth="1.8" />
              <line x1="36" y1="11" x2="43" y2="5" stroke="#f43f5e" strokeWidth="1.8" />
            </>
          )}
        </svg>
      );

    case "ZENER":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="6" y1="21" x2="21" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <polygon
            points="21,11 21,31 39,21"
            fill="rgba(16,185,129,0.22)"
            stroke="#10b981"
            strokeWidth="2.2"
          />
          <polyline
            points="34,9 39,12 39,30 44,33"
            fill="none"
            stroke="#fbbf24"
            strokeWidth="2.5"
          />
          <line x1="39" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
        </svg>
      );

    case "BC547":
    case "BC557":
    case "2N2222":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <circle
            cx="33"
            cy="21"
            r="15"
            fill="rgba(56,189,248,0.08)"
            stroke="#38bdf8"
            strokeWidth="1.8"
          />
          <line x1="8" y1="21" x2="26" y2="21" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="26" y1="12" x2="26" y2="30" stroke="#fbbf24" strokeWidth="2.8" />
          <line x1="26" y1="16" x2="42" y2="8" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="26" y1="26" x2="42" y2="34" stroke="#22c55e" strokeWidth="2.2" />
          {type === "BC557" ? (
            <polygon points="28,27 35,27 32,32" fill="#22c55e" />
          ) : (
            <polygon points="42,34 35,34 39,29" fill="#22c55e" />
          )}
        </svg>
      );

    case "IRF540N":
    case "JFET_N":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <circle
            cx="33"
            cy="21"
            r="15"
            fill="rgba(167,139,250,0.08)"
            stroke="#a78bfa"
            strokeWidth="1.8"
          />
          <line x1="8" y1="25" x2="23" y2="25" stroke="#38bdf8" strokeWidth="2.2" />
          <line x1="23" y1="11" x2="23" y2="31" stroke="#fbbf24" strokeWidth="2.2" />
          <line x1="28" y1="11" x2="28" y2="31" stroke="#a78bfa" strokeWidth="2.4" />
          <line x1="28" y1="14" x2="43" y2="14" stroke="#38bdf8" strokeWidth="2" />
          <line x1="28" y1="28" x2="43" y2="28" stroke="#22c55e" strokeWidth="2" />
        </svg>
      );

    case "SCR":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="6" y1="20" x2="20" y2="20" stroke="#38bdf8" strokeWidth="2.2" />
          <polygon
            points="20,10 20,30 38,20"
            fill="rgba(244,63,94,0.22)"
            stroke="#fb7185"
            strokeWidth="2.2"
          />
          <line x1="38" y1="10" x2="38" y2="30" stroke="#fbbf24" strokeWidth="2.8" />
          <line x1="38" y1="20" x2="56" y2="20" stroke="#38bdf8" strokeWidth="2.2" />
          <polyline
            points="38,25 46,35 54,35"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.2"
          />
        </svg>
      );

    case "DIAC":
    case "TRIAC":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <line x1="5" y1="21" x2="18" y2="21" stroke="#38bdf8" strokeWidth="2" />
          <polygon
            points="18,9 18,21 38,15"
            fill="rgba(167,139,250,0.25)"
            stroke="#a78bfa"
            strokeWidth="1.8"
          />
          <polygon
            points="38,21 38,33 18,27"
            fill="rgba(167,139,250,0.25)"
            stroke="#a78bfa"
            strokeWidth="1.8"
          />
          <line x1="18" y1="8" x2="18" y2="34" stroke="#fbbf24" strokeWidth="2.2" />
          <line x1="38" y1="8" x2="38" y2="34" stroke="#fbbf24" strokeWidth="2.2" />
          <line x1="38" y1="21" x2="56" y2="21" stroke="#38bdf8" strokeWidth="2" />
          {type === "TRIAC" && (
            <polyline
              points="38,28 46,36 55,36"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2"
            />
          )}
        </svg>
      );

    case "OPAMP_741":
      return (
        <svg viewBox="0 0 62 42" className="w-full h-full">
          <polygon
            points="14,6 14,36 50,21"
            fill="rgba(56,189,248,0.15)"
            stroke="#38bdf8"
            strokeWidth="2.2"
          />
          <text x="18" y="18" fill="#22c55e" style={{ fontSize: "10px", fontWeight: 800 }}>
            +
          </text>
          <text x="18" y="30" fill="#fb7185" style={{ fontSize: "10px", fontWeight: 800 }}>
            −
          </text>
        </svg>
      );

    default:
      return null;
  }
}

/**
 * Renders the detailed schematic symbol and live status inside an Analogue Component node
 * on the main `CircuitLab` SVG schematic canvas.
 */
export function SvgAnalogNodeGraphic({
  type,
  x,
  y,
  comp,
  isActive,
  customLabel,
  customValue,
}: {
  type: string;
  x: number;
  y: number;
  comp: CompSpec;
  isActive: boolean;
  customLabel?: string;
  customValue?: string;
}) {
  const cx = x + comp.w / 2;
  const cy = y + comp.h / 2 + 2;

  const categoryColors: Record<
    string,
    { border: string; activeBorder: string; badgeBg: string; accent: string }
  > = {
    passive: {
      border: "#475569",
      activeBorder: "#fbbf24",
      badgeBg: "#1e1b10",
      accent: "#fbbf24",
    },
    diode: {
      border: "#0e7490",
      activeBorder: "#22d3ee",
      badgeBg: "#082530",
      accent: "#38bdf8",
    },
    transistor: {
      border: "#047857",
      activeBorder: "#34d399",
      badgeBg: "#062920",
      accent: "#10b981",
    },
    thyristor: {
      border: "#6d28d9",
      activeBorder: "#c084fc",
      badgeBg: "#1e1136",
      accent: "#a78bfa",
    },
    analog_ic: {
      border: "#be123c",
      activeBorder: "#fb7185",
      badgeBg: "#2b0c18",
      accent: "#f43f5e",
    },
  };

  const theme =
    categoryColors[comp.analogCategory || "passive"] || categoryColors.passive;
  const strokeCol = isActive ? theme.activeBorder : theme.border;

  return (
    <g>
      {/* Component Body Housing */}
      <rect
        x={x}
        y={y}
        width={comp.w}
        height={comp.h}
        rx={10}
        fill="#0c1324"
        stroke={strokeCol}
        strokeWidth={isActive ? 2.4 : 1.8}
      />

      {/* Top Part Number Banner */}
      <rect
        x={x + 3}
        y={y + 3}
        width={comp.w - 6}
        height={16}
        rx={6}
        fill={theme.badgeBg}
      />
      <text
        x={cx}
        y={y + 14}
        textAnchor="middle"
        fill={theme.accent}
        style={{
          fontSize: "8.5px",
          fontFamily: "var(--font-mono)",
          fontWeight: 700,
          letterSpacing: "0.04em",
        }}
      >
        {customLabel || comp.partNumber || comp.label}
      </text>

      {/* Center Authentic Vector Symbol */}
      <g transform={`translate(${cx - 26}, ${cy - 17})`}>
        {type === "RES" && (
          <>
            <line x1="2" y1="17" x2="10" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <polyline
              points="10,17 14,8 20,26 26,8 32,26 38,8 42,17"
              fill="none"
              stroke={isActive ? "#fbbf24" : "#cbd5e1"}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <line x1="42" y1="17" x2="50" y2="17" stroke="#94a3b8" strokeWidth="2" />
          </>
        )}

        {type === "POT" && (
          <>
            <line x1="2" y1="18" x2="10" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <polyline
              points="10,18 14,10 20,26 26,10 32,26 38,10 42,18"
              fill="none"
              stroke={isActive ? "#fbbf24" : "#cbd5e1"}
              strokeWidth="2.2"
            />
            <line x1="42" y1="18" x2="50" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <line x1="16" y1="29" x2="36" y2="6" stroke="#22c55e" strokeWidth="2" />
            <polygon points="38,4 32,6 36,10" fill="#22c55e" />
          </>
        )}

        {type === "CAP_NP" && (
          <>
            <line x1="4" y1="17" x2="22" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <line
              x1="22"
              y1="6"
              x2="22"
              y2="28"
              stroke={isActive ? "#38bdf8" : "#cbd5e1"}
              strokeWidth="2.8"
            />
            <line
              x1="30"
              y1="6"
              x2="30"
              y2="28"
              stroke={isActive ? "#38bdf8" : "#cbd5e1"}
              strokeWidth="2.8"
            />
            <line x1="30" y1="17" x2="48" y2="17" stroke="#94a3b8" strokeWidth="2" />
          </>
        )}

        {type === "CAP_POL" && (
          <>
            <line x1="4" y1="17" x2="21" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <line
              x1="21"
              y1="6"
              x2="21"
              y2="28"
              stroke={isActive ? "#fbbf24" : "#cbd5e1"}
              strokeWidth="2.8"
            />
            <path
              d="M 33,6 Q 27,17 33,28"
              fill="none"
              stroke={isActive ? "#38bdf8" : "#94a3b8"}
              strokeWidth="2.6"
            />
            <line x1="30" y1="17" x2="48" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <text
              x="11"
              y="13"
              fill="#fbbf24"
              style={{ fontSize: "10px", fontWeight: 800 }}
            >
              +
            </text>
          </>
        )}

        {type === "IND" && (
          <path
            d="M 2,20 L 9,20 A 4.5,5.5 0 0 1 18,20 A 4.5,5.5 0 0 1 27,20 A 4.5,5.5 0 0 1 36,20 A 4.5,5.5 0 0 1 45,20 L 50,20"
            fill="none"
            stroke={isActive ? "#fbbf24" : "#94a3b8"}
            strokeWidth="2.3"
          />
        )}

        {type === "TRANSFORMER" && (
          <>
            <path
              d="M 14,5 A 4,3.5 0 0 1 14,12 A 4,3.5 0 0 1 14,19 A 4,3.5 0 0 1 14,26"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <line x1="24" y1="5" x2="24" y2="27" stroke="#64748b" strokeWidth="1.8" />
            <line x1="28" y1="5" x2="28" y2="27" stroke="#64748b" strokeWidth="1.8" />
            <path
              d="M 38,5 A 4,3.5 0 0 0 38,12 A 4,3.5 0 0 0 38,19 A 4,3.5 0 0 0 38,26"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />
          </>
        )}

        {type === "XTAL" && (
          <>
            <line x1="6" y1="17" x2="17" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <line x1="17" y1="7" x2="17" y2="27" stroke="#38bdf8" strokeWidth="2.2" />
            <rect
              x="21"
              y="6"
              width="10"
              height="22"
              fill="rgba(251,191,36,0.2)"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <line x1="35" y1="7" x2="35" y2="27" stroke="#38bdf8" strokeWidth="2.2" />
            <line x1="35" y1="17" x2="46" y2="17" stroke="#94a3b8" strokeWidth="2" />
          </>
        )}

        {type === "FUSE" && (
          <>
            <rect
              x="10"
              y="10"
              width="32"
              height="14"
              rx="3"
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.6"
            />
            <path
              d="M 4,17 L 12,17 C 19,9 33,25 40,17 L 48,17"
              fill="none"
              stroke={isActive ? "#22c55e" : "#fb7185"}
              strokeWidth="2.2"
            />
          </>
        )}

        {(type === "DIODE_1N4007" ||
          type === "SCHOTTKY" ||
          type === "LED_RED" ||
          type === "PHOTODIODE") && (
          <>
            <line x1="4" y1="18" x2="17" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <polygon
              points="17,8 17,28 35,18"
              fill={
                isActive
                  ? type === "LED_RED"
                    ? "rgba(244,63,94,0.45)"
                    : "rgba(34,211,238,0.3)"
                  : "rgba(51,65,85,0.4)"
              }
              stroke={
                isActive
                  ? type === "LED_RED"
                    ? "#fb7185"
                    : "#22d3ee"
                  : "#94a3b8"
              }
              strokeWidth="2.2"
            />
            <line
              x1="35"
              y1="8"
              x2="35"
              y2="28"
              stroke="#fbbf24"
              strokeWidth="2.8"
            />
            <line x1="35" y1="18" x2="48" y2="18" stroke="#94a3b8" strokeWidth="2" />
            {type === "LED_RED" && isActive && (
              <circle
                cx="26"
                cy="18"
                r="14"
                fill="rgba(244,63,94,0.22)"
              />
            )}
          </>
        )}

        {type === "ZENER" && (
          <>
            <line x1="4" y1="18" x2="17" y2="18" stroke="#94a3b8" strokeWidth="2" />
            <polygon
              points="17,8 17,28 35,18"
              fill={isActive ? "rgba(16,185,129,0.3)" : "rgba(51,65,85,0.4)"}
              stroke={isActive ? "#10b981" : "#94a3b8"}
              strokeWidth="2.2"
            />
            <polyline
              points="30,6 35,9 35,27 40,30"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2.5"
            />
            <line x1="35" y1="18" x2="48" y2="18" stroke="#94a3b8" strokeWidth="2" />
          </>
        )}

        {type === "BRIDGE_RECT" && (
          <>
            <polygon
              points="26,3 45,17 26,31 7,17"
              fill={isActive ? "rgba(34,211,238,0.16)" : "none"}
              stroke={isActive ? "#22d3ee" : "#94a3b8"}
              strokeWidth="2"
            />
            <text
              x="26"
              y="20"
              textAnchor="middle"
              fill="#fbbf24"
              style={{ fontSize: "8px", fontFamily: "var(--font-mono)", fontWeight: 700 }}
            >
              ~ / +
            </text>
          </>
        )}

        {(type === "BC547" || type === "BC557" || type === "2N2222") && (
          <>
            <circle
              cx="28"
              cy="17"
              r="14"
              fill={isActive ? "rgba(16,185,129,0.16)" : "rgba(15,23,42,0.6)"}
              stroke={isActive ? "#34d399" : "#64748b"}
              strokeWidth="1.8"
            />
            <line x1="4" y1="17" x2="21" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <line x1="21" y1="9" x2="21" y2="25" stroke="#fbbf24" strokeWidth="2.8" />
            <line x1="21" y1="13" x2="36" y2="6" stroke="#38bdf8" strokeWidth="2" />
            <line x1="21" y1="21" x2="36" y2="28" stroke="#22c55e" strokeWidth="2" />
            {type === "BC557" ? (
              <polygon points="23,22 30,22 27,27" fill="#22c55e" />
            ) : (
              <polygon points="36,28 29,28 33,23" fill="#22c55e" />
            )}
          </>
        )}

        {(type === "IRF540N" || type === "JFET_N") && (
          <>
            <circle
              cx="28"
              cy="17"
              r="14"
              fill={isActive ? "rgba(16,185,129,0.16)" : "rgba(15,23,42,0.6)"}
              stroke={isActive ? "#34d399" : "#64748b"}
              strokeWidth="1.8"
            />
            <line x1="4" y1="21" x2="19" y2="21" stroke="#94a3b8" strokeWidth="2" />
            <line x1="19" y1="8" x2="19" y2="26" stroke="#fbbf24" strokeWidth="2.2" />
            <line x1="24" y1="8" x2="24" y2="26" stroke="#38bdf8" strokeWidth="2.4" />
            <line x1="24" y1="11" x2="38" y2="11" stroke="#38bdf8" strokeWidth="2" />
            <line x1="24" y1="23" x2="38" y2="23" stroke="#22c55e" strokeWidth="2" />
          </>
        )}

        {type === "SCR" && (
          <>
            <line x1="4" y1="16" x2="16" y2="16" stroke="#94a3b8" strokeWidth="2" />
            <polygon
              points="16,7 16,25 34,16"
              fill={isActive ? "rgba(192,132,252,0.35)" : "rgba(51,65,85,0.4)"}
              stroke={isActive ? "#c084fc" : "#94a3b8"}
              strokeWidth="2.2"
            />
            <line x1="34" y1="7" x2="34" y2="25" stroke="#fbbf24" strokeWidth="2.8" />
            <line x1="34" y1="16" x2="48" y2="16" stroke="#94a3b8" strokeWidth="2" />
            <polyline
              points="34,21 41,29 48,29"
              fill="none"
              stroke="#22c55e"
              strokeWidth="2.2"
            />
          </>
        )}

        {(type === "DIAC" || type === "TRIAC") && (
          <>
            <line x1="3" y1="17" x2="15" y2="17" stroke="#94a3b8" strokeWidth="2" />
            <polygon
              points="15,6 15,17 35,11"
              fill={isActive ? "rgba(192,132,252,0.32)" : "rgba(51,65,85,0.4)"}
              stroke={isActive ? "#c084fc" : "#94a3b8"}
              strokeWidth="1.8"
            />
            <polygon
              points="35,17 35,28 15,22"
              fill={isActive ? "rgba(192,132,252,0.32)" : "rgba(51,65,85,0.4)"}
              stroke={isActive ? "#c084fc" : "#94a3b8"}
              strokeWidth="1.8"
            />
            <line x1="15" y1="5" x2="15" y2="29" stroke="#fbbf24" strokeWidth="2.2" />
            <line x1="35" y1="5" x2="35" y2="29" stroke="#fbbf24" strokeWidth="2.2" />
            <line x1="35" y1="17" x2="48" y2="17" stroke="#94a3b8" strokeWidth="2" />
            {type === "TRIAC" && (
              <polyline
                points="35,23 42,30 49,30"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
              />
            )}
          </>
        )}

        {type === "OPAMP_741" && (
          <>
            <polygon
              points="10,4 10,30 44,17"
              fill={isActive ? "rgba(251,113,133,0.22)" : "rgba(30,41,59,0.6)"}
              stroke={isActive ? "#fb7185" : "#94a3b8"}
              strokeWidth="2.2"
            />
            <text x="14" y="14" fill="#22c55e" style={{ fontSize: "9px", fontWeight: 800 }}>
              +
            </text>
            <text x="14" y="25" fill="#fb7185" style={{ fontSize: "9px", fontWeight: 800 }}>
              −
            </text>
          </>
        )}

        {(type === "LM7805" || type === "OPTO_PC817" || type === "RELAY_SPDT") && (
          <>
            <rect
              x="8"
              y="5"
              width="36"
              height="24"
              rx="4"
              fill={isActive ? "rgba(34,197,94,0.18)" : "rgba(30,41,59,0.7)"}
              stroke={isActive ? "#22c55e" : "#64748b"}
              strokeWidth="1.8"
            />
            <text
              x="26"
              y="20"
              textAnchor="middle"
              fill="#f8fafc"
              style={{
                fontSize: "8.5px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
              }}
            >
              {comp.iconLabel || type}
            </text>
          </>
        )}
      </g>

      {/* Bottom Spec / State Readout */}
      <text
        x={cx}
        y={y + comp.h - 6}
        textAnchor="middle"
        fill={customValue ? "#38bdf8" : isActive ? "#4ade80" : "#94a3b8"}
        style={{
          fontSize: "8px",
          fontFamily: "var(--font-mono)",
          fontWeight: customValue ? 700 : 600,
        }}
      >
        {customValue || comp.valueLabel || comp.label} {isActive ? "· ON" : ""}
      </text>
    </g>
  );
}

/**
 * Toolbar widget for placing and managing floating Sticky Notes in `CircuitLab`.
 */
export function StickyNoteToolbarWidget({
  notesCount,
  isToolActive,
  onToggleTool,
  onQuickAddNote,
  onClearNotes,
}: {
  notesCount: number;
  isToolActive: boolean;
  onToggleTool: () => void;
  onQuickAddNote: (templateIdx?: number) => void;
  onClearNotes: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-[#1c1607] via-[#111827] to-[#1c1607] border border-amber-500/35 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-amber-300">
          <StickyNote className="w-4 h-4 text-amber-400" />
          STICKY NOTE ANNOTATIONS ({notesCount}):
        </span>

        <button
          type="button"
          onClick={onToggleTool}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
            isToolActive
              ? "bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm shadow-amber-500/20"
              : "bg-slate-900/90 border-slate-700/80 text-slate-200 hover:border-amber-500/50 hover:text-white"
          }`}
          title="Click to activate Sticky Note placement mode, then click anywhere on the schematic canvas to drop a floating text box"
        >
          <StickyNote className="w-3.5 h-3.5 text-amber-400" />
          {isToolActive
            ? "Click Canvas to Place Note..."
            : "Sticky Note Tool"}
        </button>

        <button
          type="button"
          onClick={() => onQuickAddNote(0)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 transition-colors cursor-pointer"
          title="Immediately place a floating Sticky Note on the schematic canvas"
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          Add Sticky Note
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1 mr-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Templates:
        </span>
        {STICKY_NOTE_TEMPLATES.slice(1).map((tpl, idx) => (
          <button
            key={tpl.label}
            type="button"
            onClick={() => onQuickAddNote(idx + 1)}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-200 border border-slate-700/80 hover:border-amber-500/40 transition-colors cursor-pointer"
            title={`Add annotated sticky note: ${tpl.title}`}
          >
            + {tpl.label}
          </button>
        ))}

        {notesCount > 0 && (
          <button
            type="button"
            onClick={onClearNotes}
            className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-rose-950/40 hover:bg-rose-950/70 text-rose-300 border border-rose-800/50 transition-colors cursor-pointer ml-1"
            title="Remove all sticky notes from canvas"
          >
            Clear Notes
          </button>
        )}
      </div>
    </div>
  );
}
