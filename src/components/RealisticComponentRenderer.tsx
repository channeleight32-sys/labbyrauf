import React, { useId } from "react";
import { calculateResistorColorBands } from "../data/realisticComponentsData";

export interface ComponentRenderProps {
  type: string; // e.g. "RES", "DIODE_1N4007", "TIMER_555", "BC547", etc.
  mode: "REALISTIC" | "SCHEMATIC";
  width: number;
  height: number;
  value?: number;
  formattedValue?: string;
  label?: string;
  isConducting?: boolean;
  current_mA?: number;
  vDrop?: number;
  isMirrored?: boolean;
  customColor?: string;
  isSimRunning?: boolean;
  simSpeed?: number;
  simFrequencyHz?: number;
}

function computeSpiceAnimDurSec(freqHz?: number, simSpeed = 1): string {
  const speed = Math.max(0.2, simSpeed || 1);
  if (!freqHz || !isFinite(freqHz) || freqHz <= 0) {
    return `${(1.15 / speed).toFixed(2)}s`;
  }
  // Map real physical frequencies (0.25 Hz .. 1 MHz+) to perceptible visual periods (0.22s .. 2.2s)
  const rawPeriod = freqHz <= 6 ? 1 / Math.max(0.45, freqHz) : 1 / (1.8 + Math.log10(freqHz) * 0.72);
  const clamped = Math.max(0.22, Math.min(2.2, rawPeriod / speed));
  return `${clamped.toFixed(2)}s`;
}

function computeCapEiaCode(capFarads?: number, formatted?: string): string {
  // Check formatted text if value not explicitly in Farads or is in uF
  if (capFarads && isFinite(capFarads) && capFarads > 0) {
    // Heuristic: CircuitLab values < 1 are often passed in Farads or uF; handle pF if huge
    let pf = capFarads < 1e-4 ? capFarads * 1e12 : capFarads < 1000 ? capFarads * 1e6 : capFarads;
    if (formatted) {
      const m = formatted.match(/([\d.]+)\s*(pF|nF|µF|uF|mF)/i);
      if (m) {
        const num = parseFloat(m[1]);
        const unit = m[2].toLowerCase();
        if (unit === "pf") pf = num;
        else if (unit === "nf") pf = num * 1000;
        else if (unit === "µf" || unit === "uf") pf = num * 1e6;
        else if (unit === "mf") pf = num * 1e9;
      }
    }
    if (pf >= 10 && pf < 1e9) {
      const str = Math.round(pf).toString();
      if (str.length >= 2) {
        return `${str.slice(0, 2)}${str.length - 2}`;
      }
    }
  }
  return "104";
}

function computeSmdResistorCode(ohms: number): string {
  if (!isFinite(ohms) || ohms <= 0) return "000";
  if (ohms < 10) return ohms.toFixed(1).replace(".", "R");
  const s = Math.round(ohms).toString();
  if (s.length <= 2) return `${s}0`;
  return `${s.slice(0, 2)}${s.length - 2}`;
}

export default function RealisticComponentRenderer({
  type,
  mode,
  width,
  height,
  value,
  formattedValue,
  label,
  isConducting = false,
  current_mA = 0,
  vDrop = 0,
  isMirrored = false,
  customColor,
  isSimRunning = true,
  simSpeed = 1,
  simFrequencyHz = 0,
}: ComponentRenderProps) {
  const uid = useId().replace(/:/g, "");
  const ids = {
    schemGlow: `schemGlow_${uid}`,
    metalLead: `metalLead_${uid}`,
    ceramicTan: `ceramicTan_${uid}`,
    metalFilmBlue: `metalFilmBlue_${uid}`,
    glassDO35: `glassDO35_${uid}`,
    blackEpoxy: `blackEpoxy_${uid}`,
    to220Tab: `to220Tab_${uid}`,
    ledGlowRed: `ledGlowRed_${uid}`,
    ledGlowGreen: `ledGlowGreen_${uid}`,
    ledGlowBlue: `ledGlowBlue_${uid}`,
    ledGlowYellow: `ledGlowYellow_${uid}`,
    pkgShadow: `pkgShadow_${uid}`,
    copperWire: `copperWire_${uid}`,
  };

  const upper = type.toUpperCase();
  const cycleDur = computeSpiceAnimDurSec(simFrequencyHz, simSpeed);

  // SCHEMATIC MODE — IEEE/IEC Schematic Symbols
  if (mode === "SCHEMATIC") {
    return (
      <svg
        viewBox="0 0 100 60"
        width={width}
        height={height}
        className="w-full h-full select-none pointer-events-none"
        style={{ transform: isMirrored ? "scaleX(-1)" : undefined }}
      >
        <defs>
          <filter id={ids.schemGlow} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" floodOpacity="0.4" />
          </filter>
        </defs>
        {renderSchematicSymbol(upper, label || formattedValue, isSimRunning && isConducting, customColor, isSimRunning, current_mA, vDrop, simSpeed, cycleDur, simFrequencyHz)}
      </svg>
    );
  }

  // REALISTIC COMPONENT MODE — Authentic Physical Electronic Packages
  return (
    <svg
      viewBox="0 0 120 70"
      width={width}
      height={height}
      className="w-full h-full select-none pointer-events-none drop-shadow-md"
      style={{ transform: isMirrored ? "scaleX(-1)" : undefined }}
    >
      <defs>
        <linearGradient id={ids.metalLead} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="50%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>

        <linearGradient id={ids.ceramicTan} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="25%" stopColor="#fde047" />
          <stop offset="50%" stopColor="#eab308" />
          <stop offset="85%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>

        <linearGradient id={ids.metalFilmBlue} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="30%" stopColor="#3b82f6" />
          <stop offset="70%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>

        <linearGradient id={ids.glassDO35} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(254, 215, 170, 0.9)" />
          <stop offset="35%" stopColor="rgba(251, 146, 60, 0.7)" />
          <stop offset="70%" stopColor="rgba(234, 88, 12, 0.8)" />
          <stop offset="100%" stopColor="rgba(154, 52, 18, 0.95)" />
        </linearGradient>

        <linearGradient id={ids.blackEpoxy} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="25%" stopColor="#1e293b" />
          <stop offset="75%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#020617" />
        </linearGradient>

        <linearGradient id={ids.to220Tab} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        <linearGradient id={ids.copperWire} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </linearGradient>

        <radialGradient id={ids.ledGlowRed} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#b91c1c" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={ids.ledGlowGreen} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#15803d" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#14532d" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={ids.ledGlowBlue} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#0284c7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0" />
        </radialGradient>

        <radialGradient id={ids.ledGlowYellow} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#facc15" stopOpacity="0.85" />
          <stop offset="60%" stopColor="#ca8a04" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#713f12" stopOpacity="0" />
        </radialGradient>

        <filter id={ids.pkgShadow} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000000" floodOpacity="0.6" />
        </filter>
      </defs>

      {renderRealisticPhysicalPackage(
        ids,
        upper,
        value,
        formattedValue,
        label,
        isConducting,
        current_mA,
        vDrop,
        isSimRunning,
        simSpeed,
        cycleDur,
        simFrequencyHz
      )}
    </svg>
  );
}

type SvgDefIds = {
  schemGlow: string;
  metalLead: string;
  ceramicTan: string;
  metalFilmBlue: string;
  glassDO35: string;
  blackEpoxy: string;
  to220Tab: string;
  ledGlowRed: string;
  ledGlowGreen: string;
  ledGlowBlue: string;
  ledGlowYellow: string;
  pkgShadow: string;
  copperWire: string;
};

// =========================================================================
// REALISTIC PHYSICAL COMPONENT PACKAGES
// =========================================================================
function renderRealisticPhysicalPackage(
  ids: SvgDefIds,
  type: string,
  value?: number,
  formattedValue?: string,
  label?: string,
  isConducting = false,
  current_mA = 0,
  vDrop = 0,
  isSimRunning = true,
  simSpeed = 1,
  cycleDur = "1.10s",
  simFrequencyHz = 0
) {
  // 1a. SMD 0805 CHIP RESISTOR
  if (type === "RES_SMD" || type.includes("SMD_RES")) {
    const ohms = value ?? 10000;
    const code = computeSmdResistorCode(ohms);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        {/* PCB Solder Pads */}
        <rect x="20" y="24" width="12" height="22" rx="1.5" fill="#d97706" opacity="0.45" />
        <rect x="88" y="24" width="12" height="22" rx="1.5" fill="#d97706" opacity="0.45" />
        {/* Nickel/Tin Plated End Caps */}
        <rect x="24" y="22" width="14" height="26" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <rect x="82" y="22" width="14" height="26" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        {/* Black Thick-Film Alumina Glaze Body */}
        <rect x="37" y="22" width="46" height="26" rx="1" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
        <text x="60" y="39" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="13" fontWeight="bold" letterSpacing="1">
          {code}
        </text>
        <text x="60" y="59" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {formattedValue || `${ohms >= 1000 ? `${ohms / 1000} kΩ` : `${ohms} Ω`} · 0805 SMD`}
        </text>
      </g>
    );
  }

  // 1b. CERAMIC WIREWOUND POWER RESISTOR (5W 10Ω Ceramic Block)
  if (type === "RES_WIREWOUND" || type.includes("WIREWOUND")) {
    const ohms = value ?? 10;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="6" y1="35" x2="22" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3.2" strokeLinecap="round" />
        <line x1="98" y1="35" x2="114" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3.2" strokeLinecap="round" />
        {/* White Cement Ceramic Block */}
        <rect x="22" y="18" width="76" height="34" rx="2" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1" />
        <rect x="24" y="20" width="72" height="5" fill="#e2e8f0" opacity="0.7" />
        <text x="60" y="34" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="9.5" fontWeight="bold">
          5W {formattedValue || `${ohms}Ω`} J
        </text>
        <text x="60" y="45" textAnchor="middle" fill="#475569" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
          ROYALOHM CEMENT
        </text>
      </g>
    );
  }

  // 1c. AXIAL RESISTORS (Carbon Film & Metal Film with EIA Color Bands)
  if (
    type === "RES" ||
    type === "RESISTOR" ||
    type === "RES_CARBON" ||
    type === "RES_METAL" ||
    type.startsWith("RES_")
  ) {
    const isMetalFilm = type === "RES_METAL";
    const ohms = value ?? (type === "RES_METAL" ? 10000 : 1000);
    const bands = calculateResistorColorBands(ohms);
    const showPulse = isSimRunning && (isConducting || current_mA > 0.05) && simFrequencyHz > 0;

    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="5" y1="35" x2="25" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3" strokeLinecap="round" />
        <line x1="95" y1="35" x2="115" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3" strokeLinecap="round" />
        {showPulse && (
          <line
            x1="8"
            y1="35"
            x2="112"
            y2="35"
            stroke="#38bdf8"
            strokeWidth="4.2"
            strokeOpacity="0.45"
            strokeLinecap="round"
            className="spice-signal-flow"
            style={{ animationDuration: cycleDur }}
          />
        )}
        <path
          d="M 25 25 C 23 25, 23 45, 25 45 L 30 43 L 90 43 L 95 45 C 97 45, 97 25, 95 25 L 90 27 L 30 27 Z"
          fill={isMetalFilm ? `url(#${ids.metalFilmBlue})` : `url(#${ids.ceramicTan})`}
          stroke={showPulse ? "#38bdf8" : "#475569"}
          strokeWidth={showPulse ? "1.2" : "0.8"}
        />
        <rect x="36" y="27" width="5.5" height="16" fill={bands.band1.color} rx="0.5" />
        <rect x="47" y="27" width="5.5" height="16" fill={bands.band2.color} rx="0.5" />
        <rect x="58" y="27" width="5.5" height="16" fill={bands.band3.color} rx="0.5" />
        <rect x="76" y="27" width="5.5" height="16" fill={bands.band4.color} rx="0.5" />
        <line x1="26" y1="30" x2="94" y2="30" stroke="#ffffff" strokeWidth="1.2" opacity="0.35" />
        <text x="60" y="58" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="9.5" fontWeight="bold">
          {formattedValue || `${ohms} Ω`}
        </text>
      </g>
    );
  }

  // 2a. MOLDED AXIAL DIODES (1N4007 & 1N5819 Schottky)
  if (type === "DIODE_1N4007" || type === "DIODE_1N5819" || type === "DIODE" || type === "SCHOTTKY") {
    const isSchottky = type === "DIODE_1N5819" || type === "SCHOTTKY";
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="8" y1="35" x2="30" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3" strokeLinecap="round" />
        <line x1="90" y1="35" x2="112" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="3" strokeLinecap="round" />
        <rect x="30" y="24" width="60" height="22" rx="4" fill={`url(#${ids.blackEpoxy})`} stroke="#475569" strokeWidth="1" />
        <rect x="74" y="24" width="10" height="22" fill="#cbd5e1" />
        <line x1="74" y1="24" x2="74" y2="46" stroke="#94a3b8" strokeWidth="0.8" />
        <text x="52" y="38" textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize="8" fontWeight="bold">
          {isSchottky ? "1N5819" : "1N4007"}
        </text>
        <text x="24" y="20" fill="#38bdf8" fontFamily="monospace" fontSize="8" fontWeight="bold">A (+)</text>
        <text x="88" y="20" fill="#f87171" fontFamily="monospace" fontSize="8" fontWeight="bold">K (-)</text>
      </g>
    );
  }

  // 2b. DO-35 GLASS DIODES (1N4148, Zener)
  if (type === "DIODE_1N4148" || type === "ZENER" || type.includes("ZENER")) {
    const isZener = type.includes("ZENER");
    const zenerLabel = type.includes("12V") ? "1N4742 12V" : "1N4733 5.1V";
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="8" y1="35" x2="32" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="88" y1="35" x2="112" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <rect x="32" y="26" width="56" height="18" rx="6" fill={`url(#${ids.glassDO35})`} stroke="#fb923c" strokeWidth="0.9" />
        <rect x="52" y="32" width="6" height="6" fill="#1e293b" />
        <line x1="32" y1="35" x2="52" y2="35" stroke="#f97316" strokeWidth="1.2" />
        <rect x="74" y="26" width="6" height="18" fill="#0f172a" />
        <line x1="35" y1="29" x2="85" y2="29" stroke="#ffffff" strokeWidth="1.2" opacity="0.6" />
        <text x="60" y="58" textAnchor="middle" fill={isZener ? "#c084fc" : "#fb923c"} fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {isZener ? (formattedValue || zenerLabel) : "1N4148"}
        </text>
      </g>
    );
  }

  // 2c. BRIDGE RECTIFIER (MB6S / DB107 / W10 DIP-4)
  if (type === "BRIDGE_RECT" || type.includes("BRIDGE")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="36" y1="50" x2="36" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="52" y1="50" x2="52" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="68" y1="50" x2="68" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="84" y1="50" x2="84" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <rect x="26" y="14" width="68" height="36" rx="4" fill={`url(#${ids.blackEpoxy})`} stroke="#475569" strokeWidth="1" />
        <text x="36" y="26" textAnchor="middle" fill="#ef4444" fontFamily="monospace" fontSize="9" fontWeight="bold">+</text>
        <text x="52" y="26" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="9" fontWeight="bold">~</text>
        <text x="68" y="26" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="9" fontWeight="bold">~</text>
        <text x="84" y="26" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="9" fontWeight="bold">-</text>
        <text x="60" y="40" textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize="8" fontWeight="bold">DB107 1A 1kV</text>
      </g>
    );
  }

  // 3a. ELECTROLYTIC CAPACITOR
  if (type === "CAP_POL" || type === "CAP_ELECTROLYTIC" || type.includes("ELECTROLYTIC")) {
    const absV = Math.abs(vDrop || 0);
    const chargeNorm = isSimRunning ? Math.min(1, Math.max(0.18, absV / 12)) : 0;
    const isCharging = isSimRunning && (absV > 0.08 || simFrequencyHz > 0);
    const isAcCycling = isSimRunning && simFrequencyHz > 0;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="42" y1="52" x2="42" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
        <line x1="78" y1="52" x2="78" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
        <rect x="30" y="8" width="60" height="46" rx="6" fill="#0f172a" stroke={isCharging ? "#22d3ee" : "#334155"} strokeWidth={isCharging ? "1.3" : "1"} />
        <rect x="30" y="8" width="16" height="46" rx="4" fill="#f8fafc" />
        <text x="38" y="22" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="12" fontWeight="900">-</text>
        <text x="38" y="36" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="12" fontWeight="900">-</text>
        <text x="38" y="50" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="12" fontWeight="900">-</text>
        <text x="64" y="23" textAnchor="middle" fill="#fde047" fontFamily="monospace" fontSize="9" fontWeight="bold">
          {formattedValue || "100 µF"}
        </text>
        <text x="64" y="34" textAnchor="middle" fill={isCharging ? "#38bdf8" : "#fde047"} fontFamily="monospace" fontSize="7.2" fontWeight="bold">
          {isAcCycling ? "CHG ↔ DIS" : isCharging ? `CHG ${absV.toFixed(1)}V` : "50V · 105°C"}
        </text>
        {/* Live dielectric plate charge/discharge bar */}
        <rect x="50" y="40" width="34" height="5" rx="2" fill="#020617" stroke="#334155" strokeWidth="0.6" />
        <rect
          x="50.5"
          y="40.5"
          width={Math.max(0, 33 * chargeNorm)}
          height="4"
          rx="1.5"
          fill={isAcCycling ? "#38bdf8" : "#22d3ee"}
          className={isCharging ? "spice-cap-charge" : undefined}
          style={{ transition: "width 280ms ease-out", animationDuration: cycleDur }}
        />
      </g>
    );
  }

  // 3b. TANTALUM DIPPED TEARDROP CAPACITOR
  if (type === "CAP_TANTALUM" || type.includes("TANTALUM")) {
    const absV = Math.abs(vDrop || 0);
    const chargeNorm = isSimRunning ? Math.min(1, Math.max(0.22, absV / 12)) : 0;
    const isCharging = isSimRunning && (absV > 0.08 || simFrequencyHz > 0);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="48" y1="48" x2="48" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="72" y1="48" x2="72" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <path d="M 42 46 C 36 30, 44 12, 60 12 C 76 12, 84 30, 78 46 Z" fill="#eab308" stroke={isCharging ? "#22d3ee" : "#ca8a04"} strokeWidth="1.2" />
        <line x1="47" y1="22" x2="47" y2="34" stroke="#92400e" strokeWidth="1.8" />
        <text x="48" y="19" textAnchor="middle" fill="#78350f" fontFamily="monospace" fontSize="8" fontWeight="bold">+</text>
        <text x="63" y="30" textAnchor="middle" fill="#451a03" fontFamily="monospace" fontSize="8.5" fontWeight="bold">10µF</text>
        <text x="63" y="39" textAnchor="middle" fill="#451a03" fontFamily="monospace" fontSize="6.8">
          {simFrequencyHz > 0 && isSimRunning ? "CHG↔DIS" : isCharging ? `${absV.toFixed(1)}V` : "16V+"}
        </text>
        {isCharging && (
          <rect
            x="46"
            y="42"
            width={28 * chargeNorm}
            height="2.8"
            rx="1"
            fill="#0891b2"
            className="spice-cap-charge"
            style={{ transition: "width 280ms ease-out", animationDuration: cycleDur }}
          />
        )}
      </g>
    );
  }

  // 3c. POLYESTER MKT FILM BOX CAPACITOR
  if (type === "CAP_POLYESTER" || type.includes("POLYESTER")) {
    const absV = Math.abs(vDrop || 0);
    const chargeNorm = isSimRunning ? Math.min(1, Math.max(0.22, absV / 12)) : 0;
    const isCharging = isSimRunning && (absV > 0.08 || simFrequencyHz > 0);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="42" y1="48" x2="42" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.6" />
        <line x1="78" y1="48" x2="78" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.6" />
        <rect x="30" y="14" width="60" height="34" rx="2.5" fill="#dc2626" stroke={isCharging ? "#22d3ee" : "#991b1b"} strokeWidth="1" />
        <rect x="33" y="16" width="54" height="5" fill="#ef4444" opacity="0.5" />
        <text x="60" y="31" textAnchor="middle" fill="#fef2f2" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {formattedValue || "470nJ"}
        </text>
        <text x="60" y="40" textAnchor="middle" fill="#fecaca" fontFamily="monospace" fontSize="6.5">
          {simFrequencyHz > 0 && isSimRunning ? "CHG ↔ DIS" : isCharging ? `CHG ${absV.toFixed(1)}V` : "250V MKT"}
        </text>
        {isCharging && (
          <rect
            x="35"
            y="43"
            width={50 * chargeNorm}
            height="3"
            rx="1"
            fill="#38bdf8"
            className="spice-cap-charge"
            style={{ transition: "width 280ms ease-out", animationDuration: cycleDur }}
          />
        )}
      </g>
    );
  }

  // 3d. CERAMIC DISC CAPACITOR
  if (type === "CAP_NP" || type === "CAP_CERAMIC" || type === "CAPACITOR") {
    const code = computeCapEiaCode(value, formattedValue);
    const absV = Math.abs(vDrop || 0);
    const isCharging = isSimRunning && (absV > 0.08 || simFrequencyHz > 0);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="45" y1="46" x2="45" y2="65" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="75" y1="46" x2="75" y2="65" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        {isCharging && (
          <circle
            cx="60"
            cy="28"
            r="24.5"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.8"
            strokeOpacity="0.78"
            className="spice-cap-discharge"
            style={{ animationDuration: cycleDur }}
          />
        )}
        <circle cx="60" cy="28" r="22" fill="#d97706" stroke="#b45309" strokeWidth="1.2" />
        <ellipse cx="60" cy="28" rx="20" ry="20" fill={`url(#${ids.ceramicTan})`} opacity="0.6" />
        <text x="60" y="27" textAnchor="middle" fill="#451a03" fontFamily="monospace" fontSize="11" fontWeight="bold">
          {code}
        </text>
        <text x="60" y="38" textAnchor="middle" fill="#451a03" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
          {simFrequencyHz > 0 && isSimRunning ? "CHG↔DIS" : isCharging ? `${absV.toFixed(1)}V` : formattedValue || "100nF / 50V"}
        </text>
      </g>
    );
  }

  // 3e. TOROIDAL INDUCTOR / TRANSFORMER / FUSE / CRYSTAL
  if (type === "IND" || type === "INDUCTOR" || type === "IND_TOROIDAL" || type.includes("CHOKE")) {
    const hasFlux = isSimRunning && (current_mA > 0.05 || isConducting);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="12" y1="52" x2="38" y2="46" stroke={`url(#${ids.copperWire})`} strokeWidth="3" />
        <line x1="108" y1="52" x2="82" y2="46" stroke={`url(#${ids.copperWire})`} strokeWidth="3" />
        {/* Live Electromagnetic Flux Halo */}
        {hasFlux && (
          <circle
            cx="60"
            cy="31"
            r="28"
            fill="none"
            stroke="#a855f7"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            opacity="0.85"
            className="spice-inductor-flux"
            style={{ animationDuration: cycleDur }}
          />
        )}
        {/* Ferrite Toroid Core */}
        <circle cx="60" cy="31" r="22" fill="none" stroke="#334155" strokeWidth="10" />
        <circle cx="60" cy="31" r="22" fill="none" stroke="#eab308" strokeWidth="10" strokeDasharray="3.5 3.5" />
        <circle cx="60" cy="31" r="11" fill="#0b1020" />
        <text x="60" y="62" textAnchor="middle" fill={hasFlux ? "#c084fc" : "#a855f7"} fontFamily="monospace" fontSize="8" fontWeight="bold">
          {hasFlux ? `${current_mA.toFixed(1)}mA · Φ` : formattedValue || "10 mH"}
        </text>
      </g>
    );
  }

  if (type.includes("TRANSFORMER")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="10" y1="24" x2="26" y2="24" stroke="#ef4444" strokeWidth="2.8" />
        <line x1="10" y1="46" x2="26" y2="46" stroke="#0f172a" strokeWidth="2.8" />
        <line x1="94" y1="24" x2="110" y2="24" stroke="#38bdf8" strokeWidth="2.8" />
        <line x1="94" y1="46" x2="110" y2="46" stroke="#38bdf8" strokeWidth="2.8" />
        {/* E-I Laminated Steel Frame */}
        <rect x="26" y="10" width="68" height="50" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#475569" strokeWidth="1.2" />
        {/* Center Bobbin Copper Wrap */}
        <rect x="40" y="15" width="40" height="40" rx="2" fill="#d97706" stroke="#92400e" strokeWidth="1" />
        <rect x="44" y="17" width="32" height="36" fill="#1e293b" opacity="0.25" />
        <text x="60" y="34" textAnchor="middle" fill="#fef3c7" fontFamily="monospace" fontSize="7.5" fontWeight="bold">
          12V-0-12V
        </text>
        <text x="60" y="45" textAnchor="middle" fill="#fde68a" fontFamily="monospace" fontSize="6.5">
          STEP-DOWN
        </text>
      </g>
    );
  }

  if (type === "FUSE" || type === "FUSE_GLASS_5X20" || type.includes("FUSE")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="6" y1="35" x2="20" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.6" />
        <line x1="100" y1="35" x2="114" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.6" />
        {/* Glass Tube */}
        <rect x="28" y="23" width="64" height="24" rx="2" fill="rgba(186,230,253,0.18)" stroke="#94a3b8" strokeWidth="1" />
        {/* Brass/Nickel End Caps */}
        <rect x="18" y="22" width="16" height="26" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.9" />
        <rect x="86" y="22" width="16" height="26" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.9" />
        {/* Fusible Filament */}
        <line x1="34" y1="35" x2="86" y2="35" stroke="#fde047" strokeWidth="1.6" />
        <text x="60" y="60" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="8" fontWeight="bold">
          {formattedValue || "2.0A 250V F"}
        </text>
      </g>
    );
  }

  if (type === "XTAL" || type === "XTAL_16MHZ" || type.includes("XTAL")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="46" y1="44" x2="46" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="74" y1="44" x2="74" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        {/* HC-49S Tin Can */}
        <rect x="24" y="42" width="72" height="5" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <rect x="30" y="18" width="60" height="24" rx="10" fill={`url(#${ids.to220Tab})`} stroke="#94a3b8" strokeWidth="1" />
        <text x="60" y="33" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="8" fontWeight="bold">
          {formattedValue || "16.000MHz"}
        </text>
      </g>
    );
  }

  // 4. TRANSISTORS (TO-92 Small Signal BJT / JFET)
  if (
    type === "BC547" ||
    type === "BC557" ||
    type === "BJT_BC547" ||
    type === "BJT_BC557" ||
    type === "2N2222" ||
    type === "BJT_2N2222" ||
    type === "2N3904" ||
    type === "2N3906" ||
    type === "JFET_N" ||
    type === "JFET_P"
  ) {
    const isPnp = type === "BC557" || type === "BJT_BC557" || type === "2N3906";
    const isJfet = type.startsWith("JFET");
    const is2n = type.includes("2N2222");
    const partLabel = type.includes("BC547") ? "BC547B" : type.includes("BC557") ? "BC557B" : is2n ? "2N2222A" : type;
    const pinLabels = isJfet ? ["D", "S", "G"] : is2n ? ["E", "B", "C"] : ["C", "B", "E"];

    const activeConduction = isSimRunning && (isConducting || current_mA > 0.05);

    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="38" y1="48" x2="38" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="60" y1="48" x2="60" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="82" y1="48" x2="82" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        {activeConduction && (
          <path
            d="M 25 48 L 95 48 C 99 48, 99 13, 60 13 C 21 13, 21 48, 25 48 Z"
            fill="none"
            stroke="#10b981"
            strokeWidth="2"
            opacity="0.8"
          />
        )}
        <path
          d="M 28 46 L 92 46 C 96 46, 96 16, 60 16 C 24 16, 24 46, 28 46 Z"
          fill={`url(#${ids.blackEpoxy})`}
          stroke={activeConduction ? "#34d399" : "#475569"}
          strokeWidth={activeConduction ? "1.4" : "1"}
        />
        <line x1="30" y1="44" x2="90" y2="44" stroke="#64748b" strokeWidth="1" />
        <text x="60" y="32" textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {partLabel}
        </text>
        <text x="60" y="41" textAnchor="middle" fill={activeConduction ? "#34d399" : isPnp ? "#f472b6" : "#38bdf8"} fontFamily="monospace" fontSize="7" fontWeight="bold">
          {activeConduction ? "ON · COND" : isJfet ? "N-JFET" : isPnp ? "PNP TO-92" : "NPN TO-92"}
        </text>
        <text x="38" y="58" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5">{pinLabels[0]}</text>
        <text x="60" y="58" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5">{pinLabels[1]}</text>
        <text x="82" y="58" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5">{pinLabels[2]}</text>
      </g>
    );
  }

  // 5. TO-220 POWER PACKAGES (IRF540N, TIP120, TYN612 SCR, BT136 TRIAC, LM7805, LM317, LM2596)
  if (
    type === "IRF540N" ||
    type === "MOSFET_IRF540N" ||
    type === "MOSFET_N" ||
    type === "MOSFET_P" ||
    type === "SCR" ||
    type === "TRIAC" ||
    type === "LM7805" ||
    type === "IC_7805" ||
    type === "REG7805" ||
    type === "LM7812" ||
    type === "LM7912" ||
    type === "LM317" ||
    type === "THYRISTOR_TYN612" ||
    type === "TRIAC_BT136" ||
    type === "BJT_TIP120" ||
    type === "TIP120" ||
    type === "BUCK_CONVERTER_LM2596"
  ) {
    const isTriac = type === "TRIAC" || type === "TRIAC_BT136";
    const isScr = type === "SCR" || type === "THYRISTOR_TYN612";
    const is7805 = type.includes("7805");
    const is7812 = type.includes("7812");
    const is317 = type.includes("317");
    const isTip120 = type.includes("TIP120");
    const isBuck = type.includes("LM2596");
    const isPmos = type === "MOSFET_P";
    const activeConduction = isSimRunning && (isConducting || current_mA > 0.05);

    const nameLabel = isTriac
      ? "BT136"
      : isScr
      ? "TYN612"
      : is7805
      ? "LM7805"
      : is7812
      ? "LM7812"
      : is317
      ? "LM317T"
      : isTip120
      ? "TIP120"
      : isBuck
      ? "LM2596"
      : isPmos
      ? "IRF9540"
      : "IRF540N";
    const subLabel = isTriac
      ? "TRIAC"
      : isScr
      ? "SCR"
      : is7805
      ? "+5V REG"
      : is7812
      ? "+12V REG"
      : is317
      ? "ADJ REG"
      : isTip120
      ? "NPN DARL"
      : isBuck
      ? "3A BUCK"
      : isPmos
      ? "P-MOSFET"
      : "N-MOSFET";
    const pins = isTriac
      ? ["MT1", "MT2", "G"]
      : isScr
      ? ["K", "A", "G"]
      : is7805 || is7812
      ? ["IN", "GND", "OUT"]
      : is317
      ? ["ADJ", "OUT", "IN"]
      : isTip120
      ? ["B", "C", "E"]
      : ["G", "D", "S"];

    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="36" y="6" width="48" height="20" rx="3" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <circle cx="60" cy="15" r="4.5" fill="#0b1020" stroke="#94a3b8" strokeWidth="0.8" />
        <line x1="42" y1="48" x2="42" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.2" />
        <line x1="60" y1="48" x2="60" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.2" />
        <line x1="78" y1="48" x2="78" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.2" />
        <rect x="30" y="20" width="60" height="30" rx="2" fill={`url(#${ids.blackEpoxy})`} stroke={activeConduction ? "#34d399" : "#475569"} strokeWidth={activeConduction ? "1.5" : "1"} />
        <line x1="32" y1="22" x2="88" y2="22" stroke="#64748b" strokeWidth="0.8" />
        {activeConduction && <circle cx="82" cy="27" r="2.2" fill="#10b981" />}
        <text x="60" y="34" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {nameLabel}
        </text>
        <text x="60" y="44" textAnchor="middle" fill={activeConduction ? "#34d399" : "#38bdf8"} fontFamily="monospace" fontSize="7" fontWeight="bold">
          {activeConduction ? `${subLabel} · ON` : subLabel}
        </text>
        <text x="42" y="58" textAnchor="middle" fill="#cbd5e1" fontFamily="monospace" fontSize="6.5">{pins[0]}</text>
        <text x="60" y="58" textAnchor="middle" fill="#cbd5e1" fontFamily="monospace" fontSize="6.5">{pins[1]}</text>
        <text x="78" y="58" textAnchor="middle" fill="#cbd5e1" fontFamily="monospace" fontSize="6.5">{pins[2]}</text>
      </g>
    );
  }

  // 6. DIAC (DB3 in DO-35 glass)
  if (type === "DIAC" || type === "DIAC_DB3") {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="8" y1="35" x2="32" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="88" y1="35" x2="112" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <rect x="32" y="26" width="56" height="18" rx="6" fill={`url(#${ids.glassDO35})`} stroke="#38bdf8" strokeWidth="1" />
        <rect x="52" y="32" width="8" height="6" fill="#1e293b" />
        <text x="60" y="38" textAnchor="middle" fill="#ffffff" fontFamily="monospace" fontSize="8" fontWeight="bold">DB3</text>
        <text x="60" y="56" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="8" fontWeight="bold">DIAC (±32V)</text>
      </g>
    );
  }

  // 7. 5mm LEDs (Red, Green, Blue, Yellow/Amber)
  if (type.startsWith("LED_") || type === "LED") {
    const isGreen = type.includes("GREEN");
    const isBlue = type.includes("BLUE");
    const isYellow = type.includes("YELLOW") || type.includes("AMBER");
    const domeColor = isGreen ? "#22c55e" : isBlue ? "#3b82f6" : isYellow ? "#facc15" : "#ef4444";
    const darkDome = isGreen ? "#14532d" : isBlue ? "#1e3a8a" : isYellow ? "#713f12" : "#7f1d1d";
    const glowId = isGreen
      ? ids.ledGlowGreen
      : isBlue
      ? ids.ledGlowBlue
      : isYellow
      ? ids.ledGlowYellow
      : ids.ledGlowRed;
    const isLedOn = isSimRunning && (isConducting || current_mA > 0.05);
    const brightness = isLedOn ? Math.min(1, Math.max(0.45, (current_mA || 10) / 15)) : 0;

    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="50" y1="52" x2="50" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="70" y1="52" x2="70" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        {isLedOn && (
          <circle
            cx="60"
            cy="30"
            r="34"
            fill={`url(#${glowId})`}
            opacity={brightness}
            className="spice-led-pulse"
            style={{ animationDuration: cycleDur }}
          />
        )}
        <path d="M 44 48 L 72 48 L 74 52 L 42 52 Z" fill={isLedOn ? domeColor : darkDome} />
        <path
          d="M 44 48 L 44 28 C 44 14, 76 14, 76 28 L 76 48 Z"
          fill={isLedOn ? domeColor : darkDome}
          opacity={isLedOn ? Math.max(0.65, brightness) : 1}
          stroke={isLedOn ? "#f8fafc" : "#475569"}
          strokeWidth={isLedOn ? "1.1" : "0.8"}
        />
        <polygon points="56,36 64,36 62,44 58,44" fill="#cbd5e1" opacity="0.75" />
        <circle
          cx="60"
          cy="33"
          r={isLedOn ? "2.2" : "1.5"}
          fill={isLedOn ? "#fef08a" : "#64748b"}
          className={isLedOn ? "spice-led-pulse" : undefined}
          style={isLedOn ? { animationDuration: cycleDur } : undefined}
        />
        <path d="M 48 24 Q 50 18 60 18" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
        {isLedOn && (
          <text x="60" y="62" textAnchor="middle" fill="#34d399" fontFamily="monospace" fontSize="7.5" fontWeight="bold">
            {current_mA.toFixed(1)} mA
          </text>
        )}
      </g>
    );
  }

  // 8a. OPTOCOUPLER (4N35 / PC817 DIP-6 / DIP-4 White/Black Package)
  if (type === "PC817" || type === "OPTO_PC817" || type === "OPTOCOUPLER_4N35" || type.includes("OPTO")) {
    const is4n35 = type.includes("4N35");
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        {[24, 35, 46].map((y, idx) => (
          <g key={idx}>
            <line x1="12" y1={y} x2="26" y2={y} stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
            <line x1="94" y1={y} x2="108" y2={y} stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
          </g>
        ))}
        <rect x="26" y="14" width="68" height="42" rx="3" fill={is4n35 ? `url(#${ids.blackEpoxy})` : "#f8fafc"} stroke="#64748b" strokeWidth="1" />
        <circle cx="34" cy="22" r="2" fill={is4n35 ? "#94a3b8" : "#0f172a"} />
        <text x="60" y="34" textAnchor="middle" fill={is4n35 ? "#f8fafc" : "#0f172a"} fontFamily="monospace" fontSize="9" fontWeight="bold">
          {is4n35 ? "4N35" : "PC817"}
        </text>
        <text x="60" y="45" textAnchor="middle" fill={is4n35 ? "#38bdf8" : "#475569"} fontFamily="monospace" fontSize="6.5">
          OPTOISOLATOR
        </text>
      </g>
    );
  }

  // 8b. DUAL-INLINE PACKAGES (DIP-8, DIP-14, DIP-16)
  if (
    type === "TIMER_555" ||
    type === "OPAMP_741" ||
    type === "LM358" ||
    type === "LM339" ||
    type === "LM393" ||
    type === "IC_NE555" ||
    type === "IC_LM741" ||
    type === "IC_LM358" ||
    type === "IC_LM339" ||
    type.startsWith("74") ||
    type.startsWith("IC_74") ||
    type === "CD4017" ||
    type === "IC_CD4017" ||
    type.startsWith("DIP")
  ) {
    const isDIP8 =
      type === "TIMER_555" ||
      type === "OPAMP_741" ||
      type === "LM358" ||
      type === "LM393" ||
      type === "IC_NE555" ||
      type === "IC_LM741" ||
      type === "IC_LM358";
    const isDIP16 = type === "CD4017" || type === "IC_CD4017";
    const pinCount = isDIP8 ? 8 : isDIP16 ? 16 : 14;
    const halfPins = pinCount / 2;
    const partName = type.includes("555")
      ? "NE555P"
      : type.includes("741")
      ? "LM741CN"
      : type.includes("358")
      ? "LM358N"
      : type.includes("339")
      ? "LM339N"
      : type.includes("393")
      ? "LM393P"
      : type.replace(/^IC_/, "");

    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        {Array.from({ length: halfPins }).map((_, i) => {
          const y = 16 + i * (isDIP8 ? 11 : isDIP16 ? 5.6 : 6.6);
          return (
            <g key={`pin-pair-${i}`}>
              <line x1="10" y1={y} x2="22" y2={y} stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" strokeLinecap="round" />
              <line x1="98" y1={y} x2="110" y2={y} stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" strokeLinecap="round" />
            </g>
          );
        })}
        <rect x="22" y="10" width="76" height="50" rx="3" fill={`url(#${ids.blackEpoxy})`} stroke={isSimRunning && (isConducting || simFrequencyHz > 0) ? "#38bdf8" : "#475569"} strokeWidth="1" />
        <path d="M 52 10 A 8 8 0 0 0 68 10 Z" fill="#0b1020" stroke="#334155" strokeWidth="0.8" />
        <circle cx="32" cy="18" r="2.2" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
        {isSimRunning && (isConducting || simFrequencyHz > 0) && (
          <circle
            cx="88"
            cy="18"
            r="2.4"
            fill="#22d3ee"
            className={simFrequencyHz > 0 ? "spice-ic-heartbeat" : undefined}
            style={simFrequencyHz > 0 ? { animationDuration: cycleDur } : undefined}
          />
        )}
        <text x="60" y="32" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="8" fontWeight="bold">
          {partName}
        </text>
        <text x="60" y="42" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5">
          DIP-{pinCount}
        </text>
      </g>
    );
  }

  // 9a. ARDUINO UNO R3 & ARDUINO NANO V3
  if (type === "ARDUINO_UNO" || type === "PCB_ARDUINO_UNO" || type === "ARDUINO_UNO_R3") {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="10" y="5" width="100" height="60" rx="5" fill="#0284c7" stroke="#0369a1" strokeWidth="1.2" />
        <rect x="12" y="10" width="18" height="15" rx="1.5" fill={`url(#${ids.metalLead})`} stroke="#475569" strokeWidth="0.8" />
        <rect x="12" y="38" width="20" height="18" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="0.8" />
        <rect x="48" y="24" width="38" height="18" rx="2" fill="#020617" stroke="#334155" strokeWidth="0.8" />
        <text x="67" y="35" textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize="5.5" fontWeight="bold">ATMEGA328P</text>
        <ellipse cx="40" cy="28" rx="4" ry="7" fill={`url(#${ids.metalLead})`} />
        <rect x="14" y="27" width="5" height="5" rx="1" fill="#ef4444" />
        <rect x="36" y="6" width="70" height="5" fill="#0f172a" />
        <rect x="36" y="59" width="70" height="5" fill="#0f172a" />
        <text x="60" y="52" textAnchor="middle" fill="#ffffff" fontFamily="monospace" fontSize="7" fontWeight="bold">ARDUINO UNO R3</text>
      </g>
    );
  }

  if (type === "ARDUINO_NANO" || type === "ARDUINO_NANO_V3") {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="14" y="16" width="92" height="38" rx="3" fill="#0284c7" stroke="#0369a1" strokeWidth="1.2" />
        <rect x="12" y="26" width="12" height="18" rx="1" fill={`url(#${ids.metalLead})`} stroke="#475569" strokeWidth="0.8" />
        <rect x="52" y="26" width="18" height="18" transform="rotate(45 61 35)" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
        <rect x="24" y="17" width="76" height="4" fill="#0f172a" />
        <rect x="24" y="49" width="76" height="4" fill="#0f172a" />
        <text x="64" y="62" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="7" fontWeight="bold">NANO V3 ATMEGA328</text>
      </g>
    );
  }

  // 9b. RASPBERRY PI PICO
  if (type === "RPI_PICO") {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="12" y="14" width="96" height="42" rx="3" fill="#15803d" stroke="#166534" strokeWidth="1.2" />
        <rect x="12" y="27" width="11" height="16" rx="1" fill={`url(#${ids.metalLead})`} stroke="#475569" strokeWidth="0.8" />
        <rect x="49" y="26" width="18" height="18" rx="1" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
        <rect x="20" y="15" width="84" height="4" fill="#eab308" opacity="0.85" />
        <rect x="20" y="51" width="84" height="4" fill="#eab308" opacity="0.85" />
        <text x="64" y="65" textAnchor="middle" fill="#4ade80" fontFamily="monospace" fontSize="7" fontWeight="bold">RPi PICO RP2040</text>
      </g>
    );
  }

  // 10a. ESP32 DEVKIT MODULE
  if (type === "ESP32" || type === "ESP32_DEVKIT_V1" || type.startsWith("ESP32")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="15" y="8" width="90" height="54" rx="3" fill="#0f172a" stroke="#334155" strokeWidth="1" />
        <rect x="16" y="9" width="6" height="52" fill="#020617" />
        <rect x="98" y="9" width="6" height="52" fill="#020617" />
        <rect x="32" y="14" width="46" height="32" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <text x="55" y="28" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="6.5" fontWeight="bold">ESP-WROOM-32</text>
        <text x="55" y="38" textAnchor="middle" fill="#334155" fontFamily="monospace" fontSize="5">Wi-Fi + BLE</text>
        <path d="M 80 18 L 92 18 L 92 24 L 84 24 L 84 30 L 92 30" fill="none" stroke="#eab308" strokeWidth="1.5" />
        <rect x="23" y="24" width="8" height="12" fill={`url(#${ids.metalLead})`} />
        <text x="60" y="56" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="7" fontWeight="bold">ESP32 DevKit V1</text>
      </g>
    );
  }

  // 10b. RF WIRELESS MODULES (HC-05, LoRa SX1278, NRF24L01)
  if (type.startsWith("MODULE_")) {
    const isLora = type.includes("LORA");
    const isNrf = type.includes("NRF24");
    const pcbColor = isNrf ? "#0f172a" : isLora ? "#047857" : "#1d4ed8";
    const title = isNrf ? "NRF24L01+" : isLora ? "SX1278 LoRa" : "HC-05 BT";
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="18" y="12" width="84" height="44" rx="4" fill={pcbColor} stroke="#475569" strokeWidth="1" />
        <rect x="28" y="18" width="42" height="24" rx="2" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <path d="M 76 18 L 92 18 L 92 24 L 82 24 L 82 30 L 92 30" fill="none" stroke="#eab308" strokeWidth="1.6" />
        <text x="49" y="33" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="7" fontWeight="bold">{title}</text>
        <text x="60" y="51" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="6.5">2.4GHz / RF</text>
      </g>
    );
  }

  // 11. POTENTIOMETERS (Rotary & PCB Trimmer)
  if (type === "POT" || type === "POT_ROTARY" || type === "POT_TRIMMER") {
    if (type === "POT_TRIMMER") {
      return (
        <g filter={`url(#${ids.pkgShadow})`}>
          <line x1="42" y1="50" x2="42" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
          <line x1="60" y1="50" x2="60" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
          <line x1="78" y1="50" x2="78" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
          <rect x="30" y="14" width="60" height="36" rx="3" fill="#2563eb" stroke="#1d4ed8" strokeWidth="1" />
          <circle cx="40" cy="24" r="5" fill="#eab308" stroke="#92400e" strokeWidth="1" />
          <line x1="36" y1="24" x2="44" y2="24" stroke="#713f12" strokeWidth="1.4" />
          <text x="68" y="34" textAnchor="middle" fill="#eff6ff" fontFamily="monospace" fontSize="8" fontWeight="bold">3296W</text>
          <text x="60" y="45" textAnchor="middle" fill="#bfdbfe" fontFamily="monospace" fontSize="7">{formattedValue || "10 kΩ"}</text>
        </g>
      );
    }
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="38" y1="52" x2="38" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.5" />
        <line x1="60" y1="52" x2="60" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.5" />
        <line x1="82" y1="52" x2="82" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="3.5" />
        <circle cx="60" cy="30" r="24" fill={`url(#${ids.to220Tab})`} stroke="#475569" strokeWidth="1.2" />
        <circle cx="60" cy="30" r="10" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
        <line x1="60" y1="20" x2="60" y2="40" stroke="#713f12" strokeWidth="1.5" />
        <text x="60" y="60" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="7.5" fontWeight="bold">
          {formattedValue || "10 kΩ"}
        </text>
      </g>
    );
  }

  // 12. RELAYS & SWITCHES
  if (type === "RELAY_SPDT" || type.includes("RELAY")) {
    const isEnergized = isSimRunning && (isConducting || current_mA > 0.05 || Math.abs(vDrop) > 1.2);
    const isPulsing = isEnergized && simFrequencyHz > 0;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect
          x="25"
          y="10"
          width="70"
          height="50"
          rx="4"
          fill="#0284c7"
          stroke={isEnergized ? "#34d399" : "#0369a1"}
          strokeWidth={isEnergized ? "1.6" : "1.2"}
        />
        {/* Cutaway transparent solenoid & armature inspection window */}
        <rect x="30" y="13" width="60" height="22" rx="2.5" fill="#082f49" stroke="#38bdf8" strokeWidth="0.7" />
        {/* Solenoid coil winding */}
        <rect
          x="34"
          y="17"
          width="18"
          height="14"
          rx="1.5"
          fill={isEnergized ? "#d97706" : "#92400e"}
          stroke={isEnergized ? "#fbbf24" : "#b45309"}
          strokeWidth="0.9"
          className={isEnergized ? "spice-relay-coil" : undefined}
          style={isEnergized ? { animationDuration: cycleDur } : undefined}
        />
        <line x1="38" y1="17" x2="38" y2="31" stroke="#fcd34d" strokeWidth="0.9" opacity="0.8" />
        <line x1="43" y1="17" x2="43" y2="31" stroke="#fcd34d" strokeWidth="0.9" opacity="0.8" />
        <line x1="48" y1="17" x2="48" y2="31" stroke="#fcd34d" strokeWidth="0.9" opacity="0.8" />
        {/* NC and NO stationary contacts */}
        <circle cx="81" cy="18" r="2" fill={!isEnergized ? "#38bdf8" : "#475569"} />
        <circle cx="81" cy="30" r="2" fill={isEnergized ? "#34d399" : "#475569"} />
        <text x="86" y="20" fill="#94a3b8" fontFamily="monospace" fontSize="5">NC</text>
        <text x="86" y="32" fill="#34d399" fontFamily="monospace" fontSize="5">NO</text>
        {/* Pivoting metallic armature blade */}
        <line
          x1="57"
          y1="24"
          x2="80"
          y2={isEnergized ? 29 : 19}
          stroke={isEnergized ? "#34d399" : "#e2e8f0"}
          strokeWidth="2.2"
          strokeLinecap="round"
          className={isPulsing ? "spice-relay-armature" : undefined}
          style={{ transition: "all 150ms ease-out", animationDuration: cycleDur }}
        />
        <circle cx="57" cy="24" r="2" fill="#f8fafc" />
        <text x="60" y="43" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="6.5" fontWeight="bold">
          {isEnergized ? "COIL ON · NO CLOSED" : "SRD-05VDC · NC REST"}
        </text>
        <text x="60" y="51" textAnchor="middle" fill="#fde047" fontFamily="monospace" fontSize="5.8">10A 250VAC</text>
        <circle cx="34" cy="56" r="2" fill="#cbd5e1" />
        <circle cx="48" cy="56" r="2" fill="#cbd5e1" />
        <circle cx="72" cy="56" r="2" fill="#cbd5e1" />
        <circle cx="86" cy="56" r="2" fill="#cbd5e1" />
      </g>
    );
  }

  if (type === "SWITCH_TOGGLE" || type === "SWITCH_SPST") {
    const isClosed = isConducting || current_mA > 0.05;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="40" y1="50" x2="40" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
        <line x1="60" y1="50" x2="60" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
        <line x1="80" y1="50" x2="80" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="3" />
        <rect x="30" y="30" width="60" height="22" rx="3" fill="#dc2626" stroke={isClosed ? "#34d399" : "#991b1b"} strokeWidth="1" />
        <rect x="46" y="22" width="28" height="8" rx="1" fill={`url(#${ids.to220Tab})`} stroke="#64748b" strokeWidth="0.8" />
        <line
          x1="60"
          y1="22"
          x2={isClosed ? 48 : 74}
          y2="6"
          stroke={`url(#${ids.metalLead})`}
          strokeWidth="4.5"
          strokeLinecap="round"
          style={{ transition: "all 180ms ease-out" }}
        />
        <circle cx="82" cy="36" r="2.2" fill={isClosed ? "#10b981" : "#475569"} />
      </g>
    );
  }

  if (type === "PUSHBUTTON") {
    const isPressed = isConducting || current_mA > 0.05;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="28" y1="26" x2="40" y2="26" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="28" y1="44" x2="40" y2="44" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="80" y1="26" x2="92" y2="26" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="80" y1="44" x2="92" y2="44" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <rect x="40" y="16" width="40" height="38" rx="4" fill={`url(#${ids.to220Tab})`} stroke={isPressed ? "#10b981" : "#64748b"} strokeWidth="1" />
        <circle cx="60" cy="35" r={isPressed ? 8.5 : 10} fill={isPressed ? "#059669" : "#0f172a"} stroke="#334155" strokeWidth="1" style={{ transition: "all 150ms ease" }} />
        <circle cx="46" cy="22" r="2" fill="#475569" />
        <circle cx="74" cy="22" r="2" fill="#475569" />
        <circle cx="46" cy="48" r="2" fill="#475569" />
        <circle cx="74" cy="48" r="2" fill="#475569" />
      </g>
    );
  }

  // 13. MOTORS & SERVOS
  if (type === "SERVO_SG90") {
    const isSpinning = isSimRunning && (isConducting || current_mA > 0.05 || Math.abs(vDrop) > 0.1);
    const spinDur = `${(Math.max(0.4, 1.4 - Math.min(1, Math.abs(vDrop) / 6) * 0.8) / Math.max(0.2, simSpeed)).toFixed(2)}s`;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="24" y="20" width="72" height="36" rx="4" fill="#0284c7" stroke={isSpinning ? "#38bdf8" : "#0369a1"} strokeWidth="1" />
        <rect x="16" y="26" width="88" height="6" rx="1.5" fill="#0369a1" />
        <rect x="64" y="10" width="24" height="10" rx="5" fill="#0284c7" />
        <rect x="74" y="4" width="4" height="6" fill="#f8fafc" />
        <g
          className={isSpinning ? "motor-rotor-spin" : ""}
          style={{ transformOrigin: "76px 4px", animationDuration: spinDur }}
        >
          <rect x="60" y="2" width="32" height="4" rx="2" fill={isSpinning ? "#67e8f9" : "#f8fafc"} />
        </g>
        <text x="48" y="44" textAnchor="middle" fill="#e0f2fe" fontFamily="monospace" fontSize="8" fontWeight="bold">
          {isSpinning ? "SERVO ACT" : "SG90 9g"}
        </text>
      </g>
    );
  }

  if (type === "DC_MOTOR" || type.includes("MOTOR")) {
    const isSpinning = isSimRunning && (isConducting || current_mA > 0.05 || Math.abs(vDrop) > 0.1);
    const spinDur = `${(Math.max(0.28, 1.2 - Math.min(1, Math.abs(vDrop) / 12) * 0.8) / Math.max(0.2, simSpeed)).toFixed(2)}s`;
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="20" y1="35" x2="30" y2="35" stroke="#ef4444" strokeWidth="3" />
        <line x1="90" y1="35" x2="100" y2="35" stroke="#0f172a" strokeWidth="3" />
        <rect x="30" y="16" width="60" height="38" rx="8" fill={`url(#${ids.to220Tab})`} stroke={isSpinning ? "#10b981" : "#64748b"} strokeWidth={isSpinning ? "1.5" : "1"} />
        <rect x="88" y="32" width="16" height="6" fill="#eab308" />
        {/* Rotating Rotor Indicator on Spindle */}
        <g
          transform="translate(104, 35)"
        >
          <g
            className={isSpinning ? (vDrop < 0 ? "motor-rotor-spin-rev" : "motor-rotor-spin") : ""}
            style={{ animationDuration: spinDur }}
          >
            <circle cx="0" cy="0" r="8" fill="#0f172a" stroke={isSpinning ? "#34d399" : "#475569"} strokeWidth="1.2" />
            <line x1="-6" y1="0" x2="6" y2="0" stroke={isSpinning ? "#38bdf8" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" />
            <line x1="0" y1="-6" x2="0" y2="6" stroke={isSpinning ? "#38bdf8" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" />
          </g>
        </g>
        <text x="58" y="38" textAnchor="middle" fill="#0f172a" fontFamily="monospace" fontSize="7.8" fontWeight="bold">
          {isSpinning ? "SPINNING" : "DC MOTOR"}
        </text>
      </g>
    );
  }

  // 14. PIEZO BUZZER
  if (type === "BUZZER" || type.includes("BUZZER")) {
    const isBeeping = isSimRunning && (isConducting || current_mA > 0.05);
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="45" y1="54" x2="45" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="75" y1="54" x2="75" y2="68" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <circle cx="60" cy="30" r="24" fill="#0f172a" stroke={isBeeping ? "#f59e0b" : "#334155"} strokeWidth="1.5" />
        <circle cx="60" cy="30" r="6" fill="#020617" stroke={isBeeping ? "#fbbf24" : "#475569"} strokeWidth="1" />
        {isBeeping && (
          <>
            <path d="M 86 22 Q 92 30 86 38" fill="none" stroke="#fbbf24" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M 91 17 Q 99 30 91 43" fill="none" stroke="#fbbf24" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
          </>
        )}
        <text x="44" y="24" fill="#ef4444" fontFamily="monospace" fontSize="12" fontWeight="bold">+</text>
        <text x="60" y="48" textAnchor="middle" fill={isBeeping ? "#fbbf24" : "#94a3b8"} fontFamily="monospace" fontSize="6.5">
          {isBeeping ? "ACTIVE TONE" : "PIEZO 5V"}
        </text>
      </g>
    );
  }

  // 15. POWER SUPPLIES, SOURCES, GROUND & BENCH METERS
  if (
    type === "VCC" ||
    type === "VCC_5V" ||
    type === "VCC_12V" ||
    type === "DC_VOLTAGE" ||
    type === "DC_VOLTAGE_SOURCE" ||
    type === "BATTERY" ||
    type === "AC_SINE" ||
    type === "AC_VOLTAGE_SOURCE"
  ) {
    const isAc = type.includes("AC_");
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="20" y="10" width="80" height="50" rx="6" fill="#0f172a" stroke={isAc ? (isSimRunning ? "#fbbf24" : "#b45309") : (isSimRunning ? "#ef4444" : "#7f1d1d")} strokeWidth="1.4" />
        <text x="60" y="25" textAnchor="middle" fill={isAc ? "#fbbf24" : "#f87171"} fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {isAc ? "AC SOURCE" : type === "BATTERY" ? "9V BATTERY" : "DC SUPPLY"}
        </text>
        {isAc ? (
          <path
            d="M 32 37 Q 39 29 46 37 T 60 37 T 74 37 T 88 37"
            fill="none"
            stroke={isSimRunning ? "#22d3ee" : "#64748b"}
            strokeWidth="1.8"
            strokeDasharray={isSimRunning ? "10 4" : "none"}
            className={isSimRunning ? "ac-wave-travel" : ""}
          />
        ) : (
          <text x="60" y="41" textAnchor="middle" fill="#f8fafc" fontFamily="monospace" fontSize="11" fontWeight="bold">
            {formattedValue || (type === "VCC_12V" ? "12.0 V" : type === "BATTERY" ? "9.0 V" : "5.0 V")}
          </text>
        )}
        <text x="60" y="54" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="6.5">
          {isAc ? (formattedValue || "50/60 Hz RMS") : isSimRunning ? "REGULATED RAIL · ON" : "STANDBY"}
        </text>
      </g>
    );
  }

  if (type === "GND") {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="28" y="14" width="64" height="42" rx="6" fill="#0f172a" stroke="#64748b" strokeWidth="1.2" />
        <line x1="60" y1="20" x2="60" y2="32" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="42" y1="32" x2="78" y2="32" stroke="#94a3b8" strokeWidth="2.5" />
        <line x1="48" y1="37" x2="72" y2="37" stroke="#94a3b8" strokeWidth="2.2" />
        <line x1="54" y1="42" x2="66" y2="42" stroke="#94a3b8" strokeWidth="2" />
        <text x="60" y="52" textAnchor="middle" fill="#cbd5e1" fontFamily="monospace" fontSize="7" fontWeight="bold">0.00V EARTH</text>
      </g>
    );
  }

  if (
    type === "VOLTMETER" ||
    type === "AMMETER" ||
    type === "OHMMETER" ||
    type === "POWER_METER" ||
    type === "WATTMETER" ||
    type === "DMM_PROBE"
  ) {
    const meterAccent =
      type === "AMMETER"
        ? "#34d399"
        : type === "OHMMETER"
        ? "#fbbf24"
        : type.includes("POWER") || type.includes("WATT")
        ? "#c084fc"
        : "#38bdf8";
    const meterCode =
      type === "AMMETER" ? "A" : type === "OHMMETER" ? "Ω" : type.includes("POWER") || type.includes("WATT") ? "W" : "V";
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="22" y="8" width="76" height="54" rx="6" fill="#1e293b" stroke={meterAccent} strokeWidth="1.4" />
        <rect x="28" y="13" width="64" height="22" rx="3" fill="#060a14" stroke="#334155" strokeWidth="0.9" />
        <text x="60" y="28" textAnchor="middle" fill={meterAccent} fontFamily="monospace" fontSize="11" fontWeight="bold">
          {meterCode === "W" ? `${(vDrop * current_mA).toFixed(0)} mW` : `${meterCode} METER`}
        </text>
        <circle cx="60" cy="48" r="10" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
        <text x="60" y="51.5" textAnchor="middle" fill={meterAccent} fontFamily="monospace" fontSize="10" fontWeight="bold">{meterCode}</text>
      </g>
    );
  }

  // 16. SENSORS & OPTICAL TRANSDUCERS (LDR, HC-SR04, LM35, BPW34)
  if (type === "SENSOR_LDR_GL5528" || type.includes("LDR")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="46" y1="44" x2="46" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <line x1="74" y1="44" x2="74" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.5" />
        <ellipse cx="60" cy="30" rx="22" ry="15" fill="#d97706" stroke="#fbbf24" strokeWidth="1.2" />
        <path d="M 43 28 Q 48 22 53 28 T 63 28 T 73 28" fill="none" stroke="#fef08a" strokeWidth="1.8" />
        <path d="M 45 34 Q 50 28 55 34 T 65 34 T 75 34" fill="none" stroke="#991b1b" strokeWidth="1.5" />
        <text x="60" y="61" textAnchor="middle" fill="#fbbf24" fontFamily="monospace" fontSize="6.5" fontWeight="bold">LDR GL5528</text>
      </g>
    );
  }

  if (type === "SENSOR_HCSR04" || type.includes("HCSR04")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <rect x="14" y="12" width="92" height="42" rx="4" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="1.2" />
        <circle cx="38" cy="33" r="14" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
        <circle cx="38" cy="33" r="9" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        <circle cx="82" cy="33" r="14" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" />
        <circle cx="82" cy="33" r="9" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        {[48, 56, 64, 72].map((px) => (
          <rect key={px} x={px - 1.5} y="54" width="3" height="10" fill="#fbbf24" />
        ))}
        <text x="60" y="21" textAnchor="middle" fill="#e0f2fe" fontFamily="monospace" fontSize="6" fontWeight="bold">HC-SR04</text>
      </g>
    );
  }

  if (type === "SENSOR_BPW34" || type.includes("BPW34")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="20" y1="35" x2="38" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <line x1="82" y1="35" x2="100" y2="35" stroke={`url(#${ids.metalLead})`} strokeWidth="2.8" />
        <rect x="38" y="17" width="44" height="36" rx="4" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
        <rect x="46" y="23" width="28" height="24" rx="2" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
        <text x="60" y="62" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="7" fontWeight="bold">BPW34 PIN</text>
      </g>
    );
  }

  if (type === "SENSOR_LM35" || type.includes("LM35")) {
    return (
      <g filter={`url(#${ids.pkgShadow})`}>
        <line x1="48" y1="42" x2="48" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.4" />
        <line x1="60" y1="42" x2="60" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.4" />
        <line x1="72" y1="42" x2="72" y2="66" stroke={`url(#${ids.metalLead})`} strokeWidth="2.4" />
        <rect x="41" y="14" width="38" height="28" rx="4" fill={`url(#${ids.blackEpoxy})`} stroke="#475569" strokeWidth="1.2" />
        <text x="60" y="29" textAnchor="middle" fill="#e2e8f0" fontFamily="monospace" fontSize="8" fontWeight="bold">LM35</text>
        <text x="60" y="38" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="5.5">10mV/°C</text>
      </g>
    );
  }

  // DEFAULT / FALLBACK REALISTIC MODULE
  return (
    <g filter={`url(#${ids.pkgShadow})`}>
      <rect x="25" y="15" width="70" height="40" rx="6" fill={`url(#${ids.blackEpoxy})`} stroke="#475569" strokeWidth="1.2" />
      <text x="60" y="34" textAnchor="middle" fill="#38bdf8" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
        {type}
      </text>
      <text x="60" y="46" textAnchor="middle" fill="#94a3b8" fontFamily="monospace" fontSize="7">
        {formattedValue || label || "Module"}
      </text>
    </g>
  );
}

// =========================================================================
// STANDARDIZED IEEE / IEC SCHEMATIC SYMBOLS
// =========================================================================
function renderSchematicSymbol(
  type: string,
  labelText?: string,
  isConducting = false,
  customColor?: string,
  isSimRunning = true,
  current_mA = 0,
  vDrop = 0,
  simSpeed = 1,
  cycleDur = "1.10s",
  simFrequencyHz = 0
) {
  const schemColor = customColor || "var(--comp-stroke, #38bdf8)";
  const labelColor = "var(--comp-label, #94a3b8)";

  // VOLTAGE SOURCES (DC & AC)
  if (type === "VCC" || type === "VCC_5V" || type === "VCC_12V" || type.includes("DC_VOLTAGE") || type === "BATTERY") {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="43" y2="30" />
        <line x1="57" y1="30" x2="90" y2="30" />
        <line x1="43" y1="14" x2="43" y2="46" strokeWidth="2.8" />
        <line x1="49" y1="22" x2="49" y2="38" strokeWidth="2.8" />
        <line x1="53" y1="14" x2="53" y2="46" strokeWidth="2.8" />
        <line x1="57" y1="22" x2="57" y2="38" strokeWidth="2.8" />
        <text x="34" y="21" fill="#ef4444" stroke="none" fontFamily="monospace" fontSize="10" fontWeight="bold">+</text>
        {labelText && (
          <text x="50" y="55" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">
            {labelText}
          </text>
        )}
      </g>
    );
  }

  if (type.includes("AC_")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="90" y2="30" />
        <circle cx="50" cy="30" r="18" stroke={isSimRunning ? "#fbbf24" : schemColor} />
        <path
          d="M 38 30 Q 44 19 50 30 T 62 30"
          strokeWidth="2.2"
          stroke={isSimRunning ? "#22d3ee" : schemColor}
          strokeDasharray={isSimRunning ? "8 4" : "none"}
          className={isSimRunning ? "ac-wave-travel" : ""}
        />
      </g>
    );
  }

  if (type === "GND") {
    return (
      <g stroke={schemColor} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="28" />
        <line x1="28" y1="28" x2="72" y2="28" />
        <line x1="35" y1="36" x2="65" y2="36" />
        <line x1="42" y1="44" x2="58" y2="44" />
      </g>
    );
  }

  if (type === "CLOCK") {
    return (
      <g stroke={isSimRunning ? "#22d3ee" : schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x="20" y="14" width="52" height="32" rx="3" />
        <polyline points="28,38 35,38 35,22 46,22 46,38 56,38 56,22 65,22" />
        <line x1="72" y1="30" x2="90" y2="30" />
      </g>
    );
  }

  // POTENTIOMETER (check before RES_ check so POT_ matches)
  if (type.includes("POT")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="34" x2="25" y2="34" />
        <path d="M 25 34 L 30 24 L 38 44 L 46 24 L 54 44 L 62 24 L 70 44 L 75 34" />
        <line x1="75" y1="34" x2="90" y2="34" />
        <line x1="50" y1="10" x2="50" y2="24" stroke="#f59e0b" strokeWidth="2.2" />
        <polygon points="50,26 46,20 54,20" fill="#f59e0b" stroke="none" />
      </g>
    );
  }

  // RESISTOR (IEEE Zigzag)
  if (type === "RES" || type === "RESISTOR" || type.startsWith("RES_")) {
    const showPulse = isSimRunning && (isConducting || current_mA > 0.05) && simFrequencyHz > 0;
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <line x1="10" y1="30" x2="25" y2="30" />
        <path
          d="M 25 30 L 30 20 L 40 40 L 50 20 L 60 40 L 70 20 L 75 30"
          className={showPulse ? "spice-signal-flow" : undefined}
          style={showPulse ? { animationDuration: cycleDur } : undefined}
        />
        <line x1="75" y1="30" x2="90" y2="30" />
        {labelText && (
          <text x="50" y="52" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="9" fontWeight="bold">
            {labelText}
          </text>
        )}
      </g>
    );
  }

  // CAPACITOR (IEEE Non-Polar or Polar)
  if (type.includes("CAP")) {
    const isPolar = type.includes("POL") || type.includes("ELECTROLYTIC") || type.includes("TANTALUM");
    const isCharged = isSimRunning && (Math.abs(vDrop) > 0.08 || simFrequencyHz > 0);
    const plateColor = isCharged ? "#22d3ee" : schemColor;
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="44" y2="30" />
        <line x1="56" y1="30" x2="90" y2="30" />
        {isCharged && (
          <rect
            x="45.5"
            y="18"
            width="9"
            height="24"
            rx="1"
            fill="rgba(34, 211, 238, 0.25)"
            stroke="none"
            className="spice-cap-discharge"
            style={{ animationDuration: cycleDur }}
          />
        )}
        <line x1="44" y1="16" x2="44" y2="44" stroke={plateColor} strokeWidth="2.8" />
        {isPolar ? <path d="M 56 16 Q 52 30 56 44" stroke={plateColor} strokeWidth="2.8" /> : <line x1="56" y1="16" x2="56" y2="44" stroke={plateColor} strokeWidth="2.8" />}
        {isPolar && <text x="36" y="24" fill={plateColor} stroke="none" fontFamily="monospace" fontSize="10" fontWeight="bold">+</text>}
        {isCharged && (
          <text x="50" y="12" textAnchor="middle" fill="#34d399" stroke="none" fontFamily="monospace" fontSize="7" fontWeight="bold">
            {simFrequencyHz > 0 ? "CHG↔DIS" : `${Math.abs(vDrop).toFixed(1)}V`}
          </text>
        )}
        {labelText && (
          <text x="50" y="54" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
            {labelText}
          </text>
        )}
      </g>
    );
  }

  // INDUCTOR (IEEE Coils)
  if (type.includes("IND") || type.includes("CHOKE")) {
    const hasFlux = isSimRunning && (current_mA > 0.05 || isConducting);
    return (
      <g stroke={hasFlux ? "#c084fc" : schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="25" y2="30" />
        <path d="M 25 30 A 7 7 0 0 1 39 30 A 7 7 0 0 1 53 30 A 7 7 0 0 1 67 30 A 7 7 0 0 1 75 30" />
        <line x1="75" y1="30" x2="90" y2="30" />
        {hasFlux && (
          <line
            x1="28"
            y1="17"
            x2="72"
            y2="17"
            stroke="#c084fc"
            strokeDasharray="3 3"
            strokeWidth="1.6"
            className="spice-inductor-flux"
            style={{ animationDuration: cycleDur }}
          />
        )}
        {labelText && (
          <text x="50" y="50" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
            {labelText}
          </text>
        )}
      </g>
    );
  }

  // BRIDGE RECTIFIER
  if (type.includes("BRIDGE")) {
    return (
      <g stroke={schemColor} strokeWidth="1.8" fill="none" strokeLinejoin="round">
        <polygon points="50,8 74,30 50,52 26,30" />
        <line x1="10" y1="30" x2="26" y2="30" />
        <line x1="74" y1="30" x2="90" y2="30" />
        <text x="50" y="33" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">BRIDGE</text>
      </g>
    );
  }

  // DIAC / SCR / TRIAC
  if (type.includes("DIAC")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinejoin="round">
        <line x1="10" y1="30" x2="36" y2="30" />
        <line x1="64" y1="30" x2="90" y2="30" />
        <polygon points="36,16 36,30 64,23" />
        <polygon points="64,30 64,44 36,37" />
        <line x1="36" y1="16" x2="36" y2="44" />
        <line x1="64" y1="16" x2="64" y2="44" />
      </g>
    );
  }

  if (type.includes("TRIAC")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinejoin="round">
        <line x1="10" y1="30" x2="36" y2="30" />
        <line x1="64" y1="30" x2="90" y2="30" />
        <polygon points="36,16 36,30 64,23" />
        <polygon points="64,30 64,44 36,37" />
        <line x1="36" y1="16" x2="36" y2="44" />
        <line x1="64" y1="16" x2="64" y2="44" />
        <polyline points="64,40 76,50 86,50" stroke="#f59e0b" />
      </g>
    );
  }

  if (type === "SCR" || type.includes("THYRISTOR")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinejoin="round">
        <line x1="10" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="90" y2="30" />
        <polygon points="38,18 38,42 62,30" />
        <line x1="62" y1="18" x2="62" y2="42" strokeWidth="2.4" />
        <polyline points="62,36 74,48 86,48" stroke="#f59e0b" />
      </g>
    );
  }

  // DIODE (Standard, Zener, Schottky, LED)
  if (type.includes("DIODE") || type.includes("ZENER") || type.includes("SCHOTTKY") || type.includes("1N5819") || type.includes("LED")) {
    const isZener = type.includes("ZENER");
    const isSchottky = type.includes("SCHOTTKY") || type.includes("1N5819");
    const isLed = type.includes("LED");
    const ledActive = isLed && isSimRunning && (isConducting || current_mA > 0.05);
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {ledActive && (
          <circle
            cx="50"
            cy="30"
            r="17"
            fill="rgba(34, 197, 94, 0.22)"
            stroke="none"
            className="spice-led-pulse"
            style={{ animationDuration: cycleDur }}
          />
        )}
        <line x1="10" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="90" y2="30" />
        <polygon points="38,18 38,42 62,30" fill={isConducting ? "rgba(56,189,248,0.35)" : "none"} stroke={schemColor} />
        {isZener ? (
          <path d="M 62 18 L 62 42 L 57 42 M 62 18 L 67 18" strokeWidth="2.5" />
        ) : isSchottky ? (
          <path d="M 58 22 L 58 17 L 62 17 L 62 43 L 66 43 L 66 38" strokeWidth="2.2" />
        ) : (
          <line x1="62" y1="18" x2="62" y2="42" strokeWidth="2.5" />
        )}
        {isLed && (
          <g
            stroke="#22c55e"
            strokeWidth="1.5"
            className={ledActive ? "spice-led-pulse" : undefined}
            style={ledActive ? { animationDuration: cycleDur } : undefined}
          >
            <line x1="50" y1="16" x2="58" y2="8" />
            <polygon points="58,8 54,9 57,12" fill="#22c55e" />
            <line x1="58" y1="18" x2="66" y2="10" />
            <polygon points="66,10 62,11 65,14" fill="#22c55e" />
          </g>
        )}
        {labelText && (
          <text x="50" y="54" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">
            {labelText}
          </text>
        )}
      </g>
    );
  }

  // MOSFET / JFET
  if (type.includes("MOSFET") || type.includes("IRF540") || type.includes("JFET")) {
    const isPmos = type.includes("MOSFET_P") || type.includes("JFET_P");
    const active = isSimRunning && (isConducting || current_mA > 0.05);
    const activeCol = active ? "#34d399" : schemColor;
    return (
      <g stroke={activeCol} strokeWidth="2" fill="none" strokeLinecap="round">
        {active && <circle cx="52" cy="30" r="19" fill="rgba(16,185,129,0.12)" stroke="none" />}
        <line x1="12" y1="42" x2="36" y2="42" />
        <line x1="36" y1="16" x2="36" y2="44" strokeWidth="2.6" />
        <line x1="43" y1="16" x2="43" y2="23" strokeWidth="2.6" />
        <line x1="43" y1="27" x2="43" y2="33" strokeWidth="2.6" />
        <line x1="43" y1="37" x2="43" y2="44" strokeWidth="2.6" />
        <polyline points="43,19 64,19 64,10 86,10" />
        <polyline points="43,41 64,41 64,50 86,50" />
        <line x1="43" y1="30" x2="64" y2="30" />
        <line x1="64" y1="30" x2="64" y2="41" />
        <polygon points={isPmos ? "55,30 48,27 48,33" : "46,30 53,27 53,33"} fill={activeCol} stroke="none" />
      </g>
    );
  }

  // BJT (NPN / PNP)
  if (type.includes("BC547") || type.includes("BC557") || type.includes("2N2222") || type.includes("TIP120") || type.includes("NPN") || type.includes("PNP")) {
    const isPnp = type.includes("557") || type.includes("PNP");
    const active = isSimRunning && (isConducting || current_mA > 0.05);
    const activeCol = active ? "#34d399" : schemColor;
    return (
      <g stroke={activeCol} strokeWidth="2" fill="none" strokeLinecap="round">
        {active && <circle cx="50" cy="30" r="18" fill="rgba(16,185,129,0.12)" stroke="none" />}
        <line x1="38" y1="18" x2="38" y2="42" strokeWidth="3.2" />
        <line x1="15" y1="30" x2="38" y2="30" />
        <line x1="38" y1="24" x2="64" y2="14" />
        <line x1="64" y1="14" x2="85" y2="14" />
        <line x1="38" y1="36" x2="64" y2="46" />
        <line x1="64" y1="46" x2="85" y2="46" />
        {isPnp ? (
          <polygon points="46,39 52,36 50,42" fill={activeCol} stroke="none" />
        ) : (
          <polygon points="56,43 50,45 52,39" fill={activeCol} stroke="none" />
        )}
        <text x="30" y="24" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">B</text>
        <text x="70" y="11" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">C</text>
        <text x="70" y="55" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="8" fontWeight="bold">E</text>
      </g>
    );
  }

  // BENCH METERS
  if (type === "VOLTMETER" || type === "AMMETER" || type === "OHMMETER" || type === "POWER_METER" || type === "WATTMETER" || type === "DMM_PROBE") {
    const letter = type === "AMMETER" ? "A" : type === "OHMMETER" ? "Ω" : type.includes("POWER") || type.includes("WATT") ? "W" : "V";
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none">
        <circle cx="50" cy="30" r="18" />
        <line x1="10" y1="30" x2="32" y2="30" />
        <line x1="68" y1="30" x2="90" y2="30" />
        <text x="50" y="34" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="14" fontWeight="bold">
          {letter}
        </text>
      </g>
    );
  }

  // CRYSTAL RESONATOR
  if (type.includes("XTAL")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="90" y2="30" />
        <line x1="38" y1="16" x2="38" y2="44" />
        <line x1="62" y1="16" x2="62" y2="44" />
        <rect x="44" y="14" width="12" height="32" />
      </g>
    );
  }

  // TRANSFORMER
  if (type.includes("TRANSFORMER")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="18" x2="26" y2="18" />
        <line x1="10" y1="42" x2="26" y2="42" />
        <path d="M 26 18 A 4 4 0 0 1 26 26 A 4 4 0 0 1 26 34 A 4 4 0 0 1 26 42" strokeWidth="2.2" />
        <line x1="47" y1="14" x2="47" y2="46" stroke={schemColor} strokeWidth="1.8" />
        <line x1="53" y1="14" x2="53" y2="46" stroke={schemColor} strokeWidth="1.8" />
        <line x1="74" y1="18" x2="90" y2="18" />
        <line x1="74" y1="42" x2="90" y2="42" />
        <path d="M 74 18 A 4 4 0 0 0 74 26 A 4 4 0 0 0 74 34 A 4 4 0 0 0 74 42" strokeWidth="2.2" />
      </g>
    );
  }

  // FUSE
  if (type.includes("FUSE")) {
    return (
      <g stroke={schemColor} strokeWidth="2.2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="30" y2="30" />
        <line x1="70" y1="30" x2="90" y2="30" />
        <path d="M 30 30 C 40 18, 40 42, 50 30 C 60 18, 60 42, 70 30" strokeWidth="2.4" />
      </g>
    );
  }

  // RELAY (Solenoid Coil + SPDT Armature)
  if (type.includes("RELAY")) {
    const isClosed = isSimRunning && (isConducting || current_mA > 0.05 || Math.abs(vDrop) > 1.2);
    const isPulsing = isClosed && simFrequencyHz > 0;
    const swColor = isClosed ? "#34d399" : schemColor;
    return (
      <g stroke={swColor} strokeWidth="2" fill="none" strokeLinecap="round">
        {/* Coil */}
        <rect
          x="14"
          y="16"
          width="18"
          height="28"
          rx="2"
          fill={isClosed ? "rgba(245, 158, 11, 0.25)" : "rgba(56, 189, 248, 0.08)"}
          stroke={isClosed ? "#fbbf24" : schemColor}
          className={isClosed ? "spice-relay-coil" : undefined}
          style={isClosed ? { animationDuration: cycleDur } : undefined}
        />
        <line x1="14" y1="40" x2="32" y2="20" stroke={isClosed ? "#fbbf24" : schemColor} strokeWidth="1.4" />
        {/* Magnetic coupling flux */}
        <line x1="34" y1="30" x2="46" y2="30" stroke="#fbbf24" strokeDasharray="2.5 2.5" strokeWidth="1.3" />
        {/* SPDT Armature & NC/NO Terminals */}
        <line x1="48" y1="30" x2="48" y2="30" />
        <circle cx="48" cy="30" r="2.6" fill="#090d16" stroke={swColor} />
        <circle cx="78" cy="18" r="2.6" fill={!isClosed ? "#38bdf8" : "#090d16"} stroke={swColor} />
        <circle cx="78" cy="40" r="2.6" fill={isClosed ? "#34d399" : "#090d16"} stroke={swColor} />
        <line x1="78" y1="18" x2="90" y2="18" />
        <line x1="78" y1="40" x2="90" y2="40" />
        <line
          x1="48"
          y1="30"
          x2="77"
          y2={isClosed ? 39 : 19}
          stroke={swColor}
          strokeWidth="2.4"
          className={isPulsing ? "spice-relay-armature" : undefined}
          style={{ transition: "all 160ms ease-out", animationDuration: cycleDur }}
        />
      </g>
    );
  }

  // SWITCH / PUSH BUTTON
  if (type.includes("SWITCH") || type.includes("BUTTON")) {
    const isClosed = isConducting || current_mA > 0.05;
    const swColor = isClosed ? "#34d399" : schemColor;
    return (
      <g stroke={swColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="30" y2="30" />
        <line x1="70" y1="30" x2="90" y2="30" />
        <circle cx="30" cy="30" r="3" fill="var(--canvas-bg, #090d16)" stroke={swColor} strokeWidth="2" />
        <circle cx="70" cy="30" r="3" fill="var(--canvas-bg, #090d16)" stroke={swColor} strokeWidth="2" />
        <line x1="30" y1="30" x2={isClosed ? 70 : 66} y2={isClosed ? 30 : 16} stroke={swColor} strokeWidth="2.4" style={{ transition: "all 180ms ease-out" }} />
      </g>
    );
  }

  // OP-AMP
  if (type.includes("OPAMP") || type.includes("741") || type.includes("LM358") || type.includes("LM339") || type.includes("LM393")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <polygon points="25,10 25,50 75,30" fill="var(--gate-fill, rgba(56,189,248,0.06))" />
        <line x1="10" y1="20" x2="25" y2="20" />
        <line x1="10" y1="40" x2="25" y2="40" />
        <line x1="75" y1="30" x2="90" y2="30" />
        <text x="32" y="24" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="11" fontWeight="bold">-</text>
        <text x="32" y="44" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="11" fontWeight="bold">+</text>
      </g>
    );
  }

  // VOLTAGE REGULATOR (7805 / 317 / 2596)
  if (type.includes("7805") || type.includes("7812") || type.includes("317") || type.includes("2596")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none">
        <rect x="24" y="12" width="52" height="32" rx="2" fill="var(--gate-fill, rgba(56,189,248,0.08))" />
        <line x1="8" y1="24" x2="24" y2="24" />
        <line x1="76" y1="24" x2="92" y2="24" />
        <line x1="50" y1="44" x2="50" y2="56" />
        <text x="50" y="30" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
          {type.includes("317") ? "LM317" : type.includes("2596") ? "BUCK" : "7805"}
        </text>
        <text x="27" y="21" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="6.5" fontWeight="bold">IN</text>
        <text x="73" y="21" textAnchor="end" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="6.5" fontWeight="bold">OUT</text>
        <text x="50" y="42" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="6" fontWeight="bold">
          {type.includes("317") ? "ADJ" : "GND"}
        </text>
      </g>
    );
  }

  // OPTOCOUPLER (IEEE LED Emitter + Phototransistor Receiver inside isolation frame)
  if (type.includes("PC817") || type.includes("OPTO") || type.includes("4N25") || type.includes("MOC")) {
    return (
      <g stroke={schemColor} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <rect x="16" y="8" width="68" height="44" rx="2" strokeDasharray="4 2" fill="var(--gate-fill, rgba(56,189,248,0.06))" />
        {/* Left LED emitter */}
        <line x1="8" y1="20" x2="26" y2="20" />
        <line x1="26" y1="20" x2="26" y2="25" />
        <polygon points="20,25 32,25 26,35" fill={isConducting ? "rgba(56,189,248,0.35)" : "none"} />
        <line x1="20" y1="35" x2="32" y2="35" strokeWidth="2.2" />
        <line x1="26" y1="35" x2="26" y2="42" />
        <line x1="8" y1="42" x2="26" y2="42" />
        {/* Optical photon arrows */}
        <line x1="39" y1="24" x2="51" y2="20" stroke="#22c55e" strokeWidth="1.4" />
        <polygon points="52,20 47,19 49,23" fill="#22c55e" stroke="none" />
        <line x1="40" y1="32" x2="52" y2="28" stroke="#22c55e" strokeWidth="1.4" />
        <polygon points="53,28 48,27 50,31" fill="#22c55e" stroke="none" />
        {/* Right phototransistor */}
        <line x1="60" y1="20" x2="60" y2="40" strokeWidth="2.4" />
        <line x1="60" y1="25" x2="76" y2="18" />
        <line x1="76" y1="18" x2="92" y2="18" />
        <line x1="60" y1="35" x2="76" y2="42" />
        <line x1="76" y1="42" x2="92" y2="42" />
        <polygon points="71,40 65,41 67,36" fill={schemColor} stroke="none" />
      </g>
    );
  }

  // NE555 PRECISION TIMER (IEEE Rectangular IC Outline)
  if (type.includes("555")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none">
        <rect x="24" y="10" width="52" height="40" rx="2" fill="var(--gate-fill, rgba(56,189,248,0.08))" />
        <line x1="10" y1="18" x2="24" y2="18" />
        <line x1="10" y1="30" x2="24" y2="30" />
        <line x1="10" y1="42" x2="24" y2="42" />
        <line x1="76" y1="22" x2="90" y2="22" />
        <line x1="76" y1="38" x2="90" y2="38" />
        <text x="50" y="29" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="10" fontWeight="bold">
          NE555
        </text>
        <text x="50" y="40" textAnchor="middle" fill={labelColor} stroke="none" fontFamily="monospace" fontSize="6.5">
          TIMER
        </text>
      </g>
    );
  }

  // MOTOR / SERVO / BUZZER
  if (type.includes("MOTOR") || type.includes("SERVO")) {
    const isSpinning = isSimRunning && (isConducting || current_mA > 0.05 || Math.abs(vDrop) > 0.1);
    const spinDur = `${(Math.max(0.32, 1.2 - Math.min(1, Math.abs(vDrop) / 12) * 0.75) / Math.max(0.2, simSpeed)).toFixed(2)}s`;
    const col = isSpinning ? "#34d399" : schemColor;
    return (
      <g stroke={col} strokeWidth="2" fill="none">
        <circle cx="50" cy="30" r="17" />
        <line x1="12" y1="30" x2="33" y2="30" />
        <line x1="67" y1="30" x2="88" y2="30" />
        {isSpinning && (
          <g className="motor-rotor-spin" style={{ transformOrigin: "50px 30px", animationDuration: spinDur }}>
            <circle cx="50" cy="30" r="13" strokeDasharray="5 5" strokeWidth="1.4" stroke="#22d3ee" />
          </g>
        )}
        <text x="50" y="34" textAnchor="middle" fill={col} stroke="none" fontFamily="monospace" fontSize="13" fontWeight="bold">M</text>
      </g>
    );
  }

  if (type.includes("BUZZER")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinejoin="round">
        <line x1="12" y1="22" x2="32" y2="22" />
        <line x1="12" y1="38" x2="32" y2="38" />
        <rect x="32" y="16" width="18" height="28" />
        <polygon points="50,18 68,8 68,52 50,42" />
      </g>
    );
  }

  // LDR / PHOTODIODE SENSORS
  if (type.includes("LDR")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="26" y2="30" />
        <line x1="74" y1="30" x2="90" y2="30" />
        <polyline points="26,30 32,20 40,40 48,20 56,40 64,20 70,30 74,30" />
        <circle cx="50" cy="30" r="20" strokeOpacity="0.55" />
        <line x1="20" y1="8" x2="34" y2="18" stroke="#fbbf24" strokeWidth="1.6" />
        <line x1="28" y1="5" x2="42" y2="15" stroke="#fbbf24" strokeWidth="1.6" />
      </g>
    );
  }

  if (type.includes("BPW34") || type.includes("PHOTODIODE")) {
    return (
      <g stroke={schemColor} strokeWidth="2" fill="none" strokeLinecap="round">
        <line x1="10" y1="30" x2="38" y2="30" />
        <line x1="62" y1="30" x2="90" y2="30" />
        <polygon points="38,18 38,42 62,30" fill="var(--gate-fill, rgba(56,189,248,0.12))" />
        <line x1="62" y1="16" x2="62" y2="44" strokeWidth="2.5" />
        <line x1="26" y1="10" x2="40" y2="18" stroke="#34d399" strokeWidth="1.6" />
        <line x1="34" y1="6" x2="48" y2="14" stroke="#34d399" strokeWidth="1.6" />
      </g>
    );
  }

  // DIGITAL 74XX / MSI / MCU IEEE STD 315 RECTANGULAR LOGIC & PROCESSOR BLOCKS
  if (
    type.startsWith("74") ||
    type.includes("MUX") ||
    type.includes("ADC") ||
    type.includes("DAC") ||
    type.includes("ESP32") ||
    type.includes("ARDUINO") ||
    type.includes("DHT22") ||
    type === "DFF" ||
    type === "TFF" ||
    type === "JKFF" ||
    type === "SRFF"
  ) {
    const shortTag = (labelText || type).slice(0, 10);
    return (
      <g stroke={schemColor} strokeWidth="1.8" fill="none">
        <rect x="18" y="8" width="64" height="44" rx="2" fill="var(--gate-fill, rgba(56,189,248,0.08))" />
        <path d="M 45 8 A 5 5 0 0 0 55 8" strokeWidth="1.4" />
        <text x="50" y="34" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize={shortTag.length > 7 ? "7.5" : "9"} fontWeight="bold">
          {shortTag}
        </text>
      </g>
    );
  }

  // DEFAULT SCHEMATIC BLOCK
  return (
    <g stroke={schemColor} strokeWidth="2" fill="none">
      <rect x="22" y="14" width="56" height="32" rx="2" fill="var(--gate-fill, rgba(56,189,248,0.08))" />
      <line x1="10" y1="30" x2="22" y2="30" />
      <line x1="78" y1="30" x2="90" y2="30" />
      <text x="50" y="34" textAnchor="middle" fill={schemColor} stroke="none" fontFamily="monospace" fontSize="8.5" fontWeight="bold">
        {(labelText || type).slice(0, 10)}
      </text>
    </g>
  );
}
