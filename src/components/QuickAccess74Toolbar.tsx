import React, { useState, useMemo } from "react";
import {
  Search,
  X,
  Cpu,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Plus,
} from "lucide-react";

export interface Chip74Item {
  type: string;
  partNo: string;
  name: string;
  category: "GATES" | "FLIP-FLOPS" | "COUNTERS" | "MSI";
  pins: number;
  description: string;
  portsPreview: { ins: string[]; outs: string[] };
}

export const STANDARD_74_CHIPS: Chip74Item[] = [
  // Logic Gates
  {
    type: "7400",
    partNo: "74LS00",
    name: "Quad 2-Input NAND Gate",
    category: "GATES",
    pins: 14,
    description: "Four independent 2-input NAND gates in a single package. Output LOW only when both inputs HIGH.",
    portsPreview: { ins: ["1A, 1B", "2A, 2B", "3A, 3B", "4A, 4B"], outs: ["1Y", "2Y", "3Y", "4Y"] },
  },
  {
    type: "7402",
    partNo: "74LS02",
    name: "Quad 2-Input NOR Gate",
    category: "GATES",
    pins: 14,
    description: "Four independent 2-input NOR gates. Output HIGH only when both inputs LOW.",
    portsPreview: { ins: ["1A, 1B", "2A, 2B", "3A, 3B", "4A, 4B"], outs: ["1Y", "2Y", "3Y", "4Y"] },
  },
  {
    type: "7404",
    partNo: "74LS04",
    name: "Hex Inverter (NOT Gates)",
    category: "GATES",
    pins: 14,
    description: "Six independent inverters. Inverts logic 0 to 1 and logic 1 to 0.",
    portsPreview: { ins: ["1A", "2A", "3A", "4A", "5A", "6A"], outs: ["1Y", "2Y", "3Y", "4Y", "5Y", "6Y"] },
  },
  {
    type: "7408",
    partNo: "74LS08",
    name: "Quad 2-Input AND Gate",
    category: "GATES",
    pins: 14,
    description: "Four independent 2-input positive-AND gates. Output HIGH only when both inputs are HIGH.",
    portsPreview: { ins: ["1A, 1B", "2A, 2B", "3A, 3B", "4A, 4B"], outs: ["1Y", "2Y", "3Y", "4Y"] },
  },
  {
    type: "7432",
    partNo: "74LS32",
    name: "Quad 2-Input OR Gate",
    category: "GATES",
    pins: 14,
    description: "Four independent 2-input positive-OR gates. Output HIGH when at least one input is HIGH.",
    portsPreview: { ins: ["1A, 1B", "2A, 2B", "3A, 3B", "4A, 4B"], outs: ["1Y", "2Y", "3Y", "4Y"] },
  },
  {
    type: "7486",
    partNo: "74LS86",
    name: "Quad 2-Input XOR Gate",
    category: "GATES",
    pins: 14,
    description: "Four independent 2-input exclusive-OR gates. Output HIGH when inputs differ.",
    portsPreview: { ins: ["1A, 1B", "2A, 2B", "3A, 3B", "4A, 4B"], outs: ["1Y", "2Y", "3Y", "4Y"] },
  },

  // Flip-Flops & Storage
  {
    type: "7474",
    partNo: "74LS74",
    name: "Dual D-Type Flip-Flop",
    category: "FLIP-FLOPS",
    pins: 14,
    description: "Dual positive-edge-triggered D flip-flops with individual asynchronous active-LOW Preset and Clear.",
    portsPreview: { ins: ["D1, CLK1, PRE1̅, CLR1̅", "D2, CLK2, PRE2̅, CLR2̅"], outs: ["Q1, Q̅1", "Q2, Q̅2"] },
  },
  {
    type: "7473",
    partNo: "74LS73",
    name: "Dual J-K Flip-Flop with Clear",
    category: "FLIP-FLOPS",
    pins: 14,
    description: "Dual negative-edge-triggered J-K flip-flops with direct asynchronous clear inputs.",
    portsPreview: { ins: ["J1, K1, CLK1, CLR1̅", "J2, K2, CLK2, CLR2̅"], outs: ["Q1, Q̅1", "Q2, Q̅2"] },
  },
  {
    type: "7476",
    partNo: "74LS76",
    name: "Dual J-K Flip-Flop (Pre/Clr)",
    category: "FLIP-FLOPS",
    pins: 16,
    description: "Dual J-K flip-flops with individual Preset and Clear inputs for complete asynchronous control.",
    portsPreview: { ins: ["1J, 1K, 1CLK, 1PRE̅, 1CLR̅", "2J, 2K, 2CLK, 2PRE̅, 2CLR̅"], outs: ["1Q, 1Q̅", "2Q, 2Q̅"] },
  },

  // Counters & Shift Registers
  {
    type: "74161",
    partNo: "74LS161",
    name: "Sync 4-Bit Binary Counter",
    category: "COUNTERS",
    pins: 16,
    description: "Synchronous 4-bit binary counter with direct asynchronous master reset (CLR̅) and look-ahead carry (RCO).",
    portsPreview: { ins: ["D0..D3, CLK, CLR̅, LOAD̅, ENP, ENT"], outs: ["Q0..Q3, RCO"] },
  },
  {
    type: "74193",
    partNo: "74LS193",
    name: "Sync 4-Bit Up/Down Binary Counter",
    category: "COUNTERS",
    pins: 16,
    description: "Synchronous 4-bit reversible up/down counter with separate count clocks (UP, DOWN) and terminal count flags.",
    portsPreview: { ins: ["D0..D3, UP, DOWN, CLR, LOAD̅"], outs: ["Q0..Q3, TCU, TCD"] },
  },
  {
    type: "74194",
    partNo: "74LS194",
    name: "4-Bit Universal Shift Register",
    category: "COUNTERS",
    pins: 16,
    description: "Bidirectional 4-bit shift register with parallel load, shift left, shift right, and hold modes.",
    portsPreview: { ins: ["SIR, SIL, S0, S1, CLK, CLR̅"], outs: ["QA, QB, QC, QD"] },
  },

  // MSI Combinational & Arithmetic
  {
    type: "74138",
    partNo: "74LS138",
    name: "3-to-8 Line Decoder / Demux",
    category: "MSI",
    pins: 16,
    description: "High-speed 3-to-8 line decoder with 3 enable pins (1 active-HIGH, 2 active-LOW) and active-LOW outputs.",
    portsPreview: { ins: ["A, B, C, G1, G2A̅, G2B̅"], outs: ["Y0̅..Y7̅"] },
  },
  {
    type: "74151",
    partNo: "74LS151",
    name: "8-to-1 Data Selector / MUX",
    category: "MSI",
    pins: 16,
    description: "8-line to 1-line multiplexer with complementary outputs (Y and W̅) and strobe enable.",
    portsPreview: { ins: ["D0..D7, S0, S1, S2, E̅"], outs: ["Y, W̅"] },
  },
  {
    type: "74153",
    partNo: "74LS153",
    name: "Dual 4-to-1 Multiplexer",
    category: "MSI",
    pins: 16,
    description: "Two independent 4-line to 1-line data selectors sharing common select lines (S0, S1).",
    portsPreview: { ins: ["1C0..1C3, 1G̅, 2C0..2C3, 2G̅, S0, S1"], outs: ["1Y, 2Y"] },
  },
  {
    type: "74157",
    partNo: "74LS157",
    name: "Quad 2-to-1 Multiplexer",
    category: "MSI",
    pins: 16,
    description: "Four 2-line to 1-line multiplexers in a single IC with common select (S) and strobe (G̅).",
    portsPreview: { ins: ["1A, 1B, 2A, 2B, 3A, 3B, 4A, 4B, S, G̅"], outs: ["1Y..4Y"] },
  },
  {
    type: "7447",
    partNo: "74LS47",
    name: "BCD to 7-Segment Decoder / Driver",
    category: "MSI",
    pins: 16,
    description: "Translates 4-bit BCD to active-LOW 7-segment outputs with lamp test and blanking input.",
    portsPreview: { ins: ["A, B, C, D, LT, BI"], outs: ["a, b, c, d, e, f, g"] },
  },
  {
    type: "7483",
    partNo: "74LS83",
    name: "4-Bit Binary Full Adder",
    category: "MSI",
    pins: 16,
    description: "High-speed 4-bit binary adder with full internal look-ahead carry generation.",
    portsPreview: { ins: ["A0..A3, B0..B3, Cin"], outs: ["S0..S3, Cout"] },
  },
  {
    type: "7485",
    partNo: "74LS85",
    name: "4-Bit Magnitude Comparator",
    category: "MSI",
    pins: 16,
    description: "Compares two 4-bit binary numbers A and B and indicates whether A > B, A = B, or A < B.",
    portsPreview: { ins: ["A0..A3, B0..B3"], outs: ["A>B, A=B, A<B"] },
  },
];

interface QuickAccess74ToolbarProps {
  onAddChip: (chipType: string) => void;
  className?: string;
}

export const QuickAccess74Toolbar: React.FC<QuickAccess74ToolbarProps> = ({
  onAddChip,
  className = "",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "ALL" | "GATES" | "FLIP-FLOPS" | "COUNTERS" | "MSI"
  >("ALL");
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredChip, setHoveredChip] = useState<Chip74Item | null>(null);

  const filteredChips = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return STANDARD_74_CHIPS.filter((chip) => {
      const matchCat =
        selectedCategory === "ALL" || chip.category === selectedCategory;
      if (!matchCat) return false;
      if (!q) return true;
      return (
        chip.type.toLowerCase().includes(q) ||
        chip.partNo.toLowerCase().includes(q) ||
        chip.name.toLowerCase().includes(q) ||
        chip.description.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div
      className={`bg-slate-900/95 border border-cyan-500/25 rounded-xl backdrop-blur-md shadow-2xl transition-all duration-200 overflow-hidden ${className}`}
    >
      {/* Top Header & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 border-b border-slate-800/80 bg-slate-950/60">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-wider uppercase text-cyan-300 font-mono">
                74-Series IC Quick Bar
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 border border-cyan-800 text-cyan-400">
                TTL DIP ICs
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Drag or click any standard 74xx chip directly onto your schematic
            </p>
          </div>
        </div>

        {/* Search input & category filter buttons */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1 min-w-[140px] max-w-[210px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 74xx (e.g. 7408, NAND, MUX)..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Expand/Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1 border border-slate-700 px-2 cursor-pointer transition-colors"
            title={isExpanded ? "Collapse 74-Series Bar" : "Expand 74-Series Bar"}
          >
            <span className="text-[11px] font-mono">{isExpanded ? "Hide" : "Show"}</span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Category Pills & Chips Tray */}
      {isExpanded && (
        <div className="p-2.5 space-y-2">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: "ALL", label: `All (${STANDARD_74_CHIPS.length})` },
                { id: "GATES", label: "Logic Gates (7400/02/04/08/32/86)" },
                { id: "FLIP-FLOPS", label: "Flip-Flops (7473/74/76)" },
                { id: "COUNTERS", label: "Counters & Regs (74161/193/194)" },
                { id: "MSI", label: "MSI / Dec / Mux (7447/83/85/138/151)" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-950"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Chips Scroll Grid */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-slate-700">
            {filteredChips.length === 0 ? (
              <div className="py-4 px-6 text-xs text-slate-400 font-mono text-center w-full">
                No 74-series chips matched &quot;{searchQuery}&quot;. Try searching 7400, 7408, flip-flop, or decoder.
              </div>
            ) : (
              filteredChips.map((chip) => {
                const isHovered = hoveredChip?.type === chip.type;
                return (
                  <div
                    key={chip.type}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", chip.type);
                      e.dataTransfer.setData("application/x-logicraft-74", chip.type);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                    onClick={() => onAddChip(chip.type)}
                    onMouseEnter={() => setHoveredChip(chip)}
                    onMouseLeave={() => setHoveredChip(null)}
                    className="group relative shrink-0 w-36 bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-400/80 rounded-xl p-2 cursor-grab active:cursor-grabbing transition-all shadow-md hover:shadow-cyan-500/10 flex flex-col justify-between select-none"
                    title={`Click or drag ${chip.partNo} (${chip.name}) onto canvas`}
                  >
                    {/* Top DIP IC Notch & Pin Indicators */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1">
                          {/* Mini IC icon with DIP notch */}
                          <div className="w-5 h-3.5 rounded bg-slate-800 border border-slate-700 flex items-center justify-center relative">
                            <div className="w-1.5 h-1 rounded-b-full bg-slate-900 absolute -top-0.5 left-1/2 -translate-x-1/2 border-b border-slate-700" />
                          </div>
                          <span className="text-[11px] font-bold font-mono text-white group-hover:text-cyan-300 transition-colors">
                            {chip.partNo}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 group-hover:border-cyan-800 group-hover:text-cyan-400">
                          DIP-{chip.pins}
                        </span>
                      </div>

                      {/* Chip Name */}
                      <p className="text-[10px] text-slate-300 font-sans font-medium line-clamp-1 leading-snug">
                        {chip.name}
                      </p>
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="mt-2 pt-1.5 border-t border-slate-900/80 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                      <span className="text-slate-500 group-hover:text-cyan-400 transition-colors flex items-center gap-0.5">
                        <Plus className="w-2.5 h-2.5" /> Drop
                      </span>
                      <span className="text-[8.5px] uppercase tracking-wider text-slate-500">
                        {chip.category}
                      </span>
                    </div>

                    {/* Quick Hover Flyout Tooltip */}
                    {isHovered && (
                      <div className="absolute left-0 bottom-full mb-2 w-64 z-50 p-2.5 rounded-xl bg-slate-950/95 border border-cyan-500/50 shadow-2xl pointer-events-none text-left">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
                          <span className="font-mono text-xs font-bold text-cyan-300">
                            {chip.partNo} • {chip.name}
                          </span>
                          <span className="text-[9px] font-mono text-cyan-400 px-1 rounded bg-cyan-950/80 border border-cyan-800">
                            DIP-{chip.pins}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-300 mb-2 leading-relaxed">
                          {chip.description}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono bg-slate-900/80 p-1.5 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-cyan-400 block font-semibold">Inputs:</span>
                            <span className="text-slate-300 text-[8.5px] truncate block">
                              {chip.portsPreview.ins.join(" | ")}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-400 block font-semibold">Outputs:</span>
                            <span className="text-slate-300 text-[8.5px] truncate block">
                              {chip.portsPreview.outs.join(" | ")}
                            </span>
                          </div>
                        </div>
                        <p className="text-[9px] text-cyan-300/80 italic mt-1.5 text-center">
                          💡 Click to place or drag directly to canvas
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAccess74Toolbar;
