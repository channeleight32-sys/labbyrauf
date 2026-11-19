import React, { useMemo } from "react";
import {
  ESP32_DEVKIT_V1_PINS,
  Esp32ExperimentDef,
  Esp32PinInfo,
  Esp32WiringRow,
} from "../data/esp32ExperimentsData";

interface Esp32InteractiveSchematicProps {
  experiment: Esp32ExperimentDef;
  selectedPinLabel: string | null;
  isRunning: boolean;
  gpio2Lit: boolean;
  externalLedRedLit: boolean;
  externalLedCyanLit: boolean;
  motorSpeedNorm: number;
  servoAngleDeg: number;
  ultrasonicCm: number;
  activeColorHex: string;
  magnetNear: boolean;
  wifiCh1: boolean;
  wifiCh2: boolean;
  beamBroken: boolean;
  alarmLatched: boolean;
  pumpOn: boolean;
  doorUnlocked: boolean;
  onSelectPin: (pin: Esp32PinInfo) => void;
  onFocusPin3D?: (pinLabel: string) => void;
}

function resolvePin(fromPinText: string): Esp32PinInfo | undefined {
  const norm = fromPinText.trim().toUpperCase().split(",")[0].trim();
  return ESP32_DEVKIT_V1_PINS.find((p) => {
    const lbl = p.label.toUpperCase();
    if (lbl === norm) return true;
    if (norm.startsWith("GPIO") && p.gpio !== null) {
      return `GPIO${p.gpio}` === norm || `GPIO ${p.gpio}` === norm;
    }
    if (lbl.includes(`(${norm})`) || lbl.startsWith(norm)) return true;
    return false;
  });
}

function wireStrokeHex(row: Esp32WiringRow): string {
  const c = row.wireColor.toLowerCase();
  if (c.includes("red") || row.signalType === "POWER") return "#ef4444";
  if (c.includes("black") || row.signalType === "GND") return "#64748b";
  if (c.includes("green") || c.includes("emerald")) return "#10b981";
  if (c.includes("amber") || c.includes("yellow")) return "#f59e0b";
  if (c.includes("purple")) return "#a855f7";
  return "#22d3ee";
}

function signalVoltageText(
  row: Esp32WiringRow,
  props: Esp32InteractiveSchematicProps
): string {
  if (!props.isRunning) return "0.0V (IDLE)";
  if (row.signalType === "POWER") return row.fromPin.includes("VIN") ? "5.0V USB" : "3.3V REG";
  if (row.signalType === "GND") return "0.0V REF";
  const pin = row.fromPin.toUpperCase();
  if (
    pin.includes("G2") &&
    !pin.includes("G26") &&
    !pin.includes("G25") &&
    !pin.includes("G27") &&
    !pin.includes("G23") &&
    !pin.includes("G21") &&
    !pin.includes("G22")
  ) {
    return props.gpio2Lit ? "3.3V HIGH" : "0.0V LOW";
  }
  if (pin.includes("G16")) return props.externalLedRedLit ? "3.3V HIGH" : "0.0V LOW";
  if (pin.includes("G17")) return props.externalLedCyanLit ? "3.3V HIGH" : "0.0V LOW";
  if (pin.includes("G14") && props.experiment.simType === "REED_SWITCH") {
    return props.magnetNear ? "0.0V CLOSED" : "3.3V PULLUP";
  }
  if (pin.includes("G14") && props.experiment.simType === "DC_MOTOR") {
    return `PWM ${Math.round(Math.abs(props.motorSpeedNorm) * 100)}%`;
  }
  if (pin.includes("G26") && props.experiment.simType === "WIFI_CONTROL") {
    return props.wifiCh2 ? "3.3V ON" : "0.0V OFF";
  }
  if (pin.includes("G26") && props.experiment.simType === "WATER_PUMP") {
    return props.pumpOn ? "3.3V PUMP ON" : "0.0V OFF";
  }
  if (pin.includes("G18") && props.experiment.simType === "LASER_BARRIER") {
    return props.alarmLatched ? "1.8kHz SIREN" : "0Hz QUIET";
  }
  if (pin.includes("G18") && props.experiment.simType === "ULTRASONIC_METER") {
    return `${props.ultrasonicCm.toFixed(0)}cm ECHO`;
  }
  if (pin.includes("G13") && (props.experiment.simType === "SMART_PARKING" || props.experiment.simType === "ULTRASONIC_RADAR" || props.experiment.simType === "PICK_AND_PLACE")) {
    return `PWM ${Math.round(props.servoAngleDeg)}°`;
  }
  if (pin.includes("G15") && props.experiment.simType === "KEYPAD_LOCK") {
    return props.doorUnlocked ? "UNLOCK 90°" : "LOCKED 0°";
  }
  if (row.signalType === "PWM") return "3.3V PWM";
  if (row.signalType === "ANALOG") return "ADC 12-BIT";
  if (row.signalType === "TOUCH") return "CAP TOUCH";
  return "3.3V ACTIVE";
}

export default function Esp32InteractiveSchematic(
  props: Esp32InteractiveSchematicProps
) {
  const { experiment, selectedPinLabel, isRunning, onSelectPin, onFocusPin3D } = props;

  // Render ALL wiring rows (never slice to 6!)
  const activeRows = useMemo(() => {
    return experiment.pinWiring.map((row, idx) => ({
      row,
      idx,
      pin: resolvePin(row.fromPin),
      stroke: wireStrokeHex(row),
      stateText: signalVoltageText(row, props),
    }));
  }, [experiment, props]);

  // Identify primary non-power/non-GND pin for oscilloscope probe tap
  const scopePinIdx = useMemo(() => {
    const found = activeRows.findIndex(
      (r) => r.row.signalType !== "POWER" && r.row.signalType !== "GND"
    );
    return found >= 0 ? found : 0;
  }, [activeRows]);

  // Render target IEEE/IEC component symbol on the right side for each wiring row
  const renderTargetSymbol = (row: Esp32WiringRow, y: number, stroke: string, idx: number) => {
    const comp = row.toComponent.toLowerCase();
    const toPin = row.toPin.toLowerCase();
    const sim = experiment.simType;

    const isActiveHigh =
      isRunning &&
      (row.signalType === "POWER" ||
        (row.fromPin.includes("G16") && props.externalLedRedLit) ||
        (row.fromPin.includes("G17") && props.externalLedCyanLit) ||
        (row.fromPin.includes("G2") && props.gpio2Lit) ||
        (sim === "DC_MOTOR" && Math.abs(props.motorSpeedNorm) > 0.05) ||
        (sim === "WATER_PUMP" && props.pumpOn) ||
        (sim === "LASER_BARRIER" && props.alarmLatched) ||
        (sim === "MOOD_LAMP") ||
        (sim === "RGB_RING"));

    const isEchoDivider =
      (sim === "ULTRASONIC_METER" || sim === "ULTRASONIC_RADAR") &&
      toPin.includes("echo");
    const isLdrDivider =
      (comp.includes("ldr") || comp.includes("receiver divider")) &&
      row.signalType === "ANALOG";
    const isRelayPump =
      sim === "WATER_PUMP" && comp.includes("relay");
    const isHBridgeMotor =
      sim === "DC_MOTOR" && comp.includes("l298n") && idx === 0;
    const isServo =
      comp.includes("servo") || comp.includes("sg90");
    const isKeypad = comp.includes("keypad");
    const isLed = comp.includes("led") || comp.includes("ring") || comp.includes("lamp");
    const isBuzzer = comp.includes("buzzer") || comp.includes("speaker");
    const isReed = comp.includes("reed");
    const isTouchPad = row.signalType === "TOUCH" || comp.includes("key ");

    // Special IEEE 1k / 2k Voltage Divider on Ultrasonic ECHO
    if (isEchoDivider) {
      return (
        <g key={`target-${idx}`} transform={`translate(430, ${y})`}>
          <circle cx={0} cy={0} r={4} fill={stroke} />
          {/* 1k series resistor from sensor ECHO */}
          <path
            d="M 0 0 L 18 0 L 22 -6 L 28 6 L 34 -6 L 40 6 L 46 -6 L 50 0 L 70 0"
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2}
          />
          <text x={35} y={-10} textAnchor="middle" fill="#fde68a" fontSize={8.5} fontFamily="monospace">
            1kΩ
          </text>
          {/* Node junction down to 2kΩ to GND */}
          <circle cx={14} cy={0} r={3} fill="#fbbf24" />
          <line x1={14} y1={0} x2={14} y2={16} stroke="#94a3b8" strokeWidth={1.6} />
          <text x={24} y={19} fill="#94a3b8" fontSize={8} fontFamily="monospace">
            2kΩ→GND
          </text>
          <rect x={70} y={-16} width={175} height={32} rx={6} fill="#0c1d36" stroke={stroke} strokeWidth={1.5} />
          <text x={82} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
            HC-SR04 ECHO (5V→3.3V)
          </text>
          <text x={82} y={10} fill="#fbbf24" fontSize={8.5} fontFamily="monospace">
            {props.ultrasonicCm.toFixed(1)} cm · Divided Safe
          </text>
        </g>
      );
    }

    // Special IEEE LDR + 10k Pull-Down Divider
    if (isLdrDivider) {
      return (
        <g key={`target-${idx}`} transform={`translate(430, ${y})`}>
          <circle cx={0} cy={0} r={4} fill={stroke} />
          <line x1={0} y1={0} x2={22} y2={0} stroke={stroke} strokeWidth={2} />
          {/* LDR circle + light arrows */}
          <circle cx={40} cy={0} r={14} fill="#111827" stroke="#facc15" strokeWidth={1.6} />
          <path d="M 30 0 L 34 -4 L 38 4 L 42 -4 L 46 4 L 50 0" fill="none" stroke="#facc15" strokeWidth={1.5} />
          <line x1={26} y1={-18} x2={34} y2={-11} stroke="#fde047" strokeWidth={1.4} />
          <line x1={33} y1={-21} x2={41} y2={-14} stroke="#fde047" strokeWidth={1.4} />
          {/* 10k pull-down tag */}
          <text x={64} y={-3} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
            {row.toComponent}
          </text>
          <text x={64} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
            +10kΩ Divider → 0V GND
          </text>
        </g>
      );
    }

    // Special IEEE Relay + 1N4007 Flyback Diode + Water Pump
    if (isRelayPump) {
      return (
        <g key={`target-${idx}`} transform={`translate(430, ${y})`}>
          <circle cx={0} cy={0} r={4} fill={stroke} />
          <line x1={0} y1={0} x2={16} y2={0} stroke={stroke} strokeWidth={2} />
          <rect x={16} y={-18} width={132} height={36} rx={6} fill="#0e1b33" stroke={props.pumpOn ? "#34d399" : "#334155"} strokeWidth={1.7} />
          <text x={24} y={-3} fill="#f8fafc" fontSize={9.5} fontFamily="monospace" fontWeight="700">
            5V OPTO RELAY
          </text>
          <text x={24} y={10} fill={props.pumpOn ? "#34d399" : "#94a3b8"} fontSize={8.5} fontFamily="monospace">
            {props.pumpOn ? "COIL ENERGIZED" : "RELAY OPEN"}
          </text>
          {/* 1N4007 Flyback diode + Pump motor circle */}
          <line x1={148} y1={0} x2={182} y2={0} stroke={props.pumpOn ? "#38bdf8" : "#475569"} strokeWidth={2} />
          <circle cx={202} cy={0} r={16} fill="#0f172a" stroke={props.pumpOn ? "#38bdf8" : "#475569"} strokeWidth={2} />
          <text x={202} y={4} textAnchor="middle" fill="#e2e8f0" fontSize={10} fontFamily="monospace" fontWeight="700">
            PUMP
          </text>
          <text x={224} y={4} fill="#94a3b8" fontSize={8} fontFamily="monospace">
            1N4007
          </text>
        </g>
      );
    }

    // Special IEEE L298N H-Bridge + 12V Motor (row 0)
    if (isHBridgeMotor) {
      return (
        <g key={`target-${idx}`} transform={`translate(430, ${y})`}>
          <circle cx={0} cy={0} r={4} fill={stroke} />
          <line x1={0} y1={0} x2={16} y2={0} stroke={stroke} strokeWidth={2} />
          <rect x={16} y={-18} width={128} height={36} rx={6} fill="#141b34" stroke={Math.abs(props.motorSpeedNorm) > 0.05 ? "#22d3ee" : "#334155"} strokeWidth={1.7} />
          <text x={24} y={-2} fill="#f8fafc" fontSize={9.5} fontFamily="monospace" fontWeight="700">
            L298N H-BRIDGE
          </text>
          <text x={24} y={10} fill="#f59e0b" fontSize={8.5} fontFamily="monospace">
            VS=+12V · ENA PWM
          </text>
          <line x1={144} y1={0} x2={176} y2={0} stroke="#22d3ee" strokeWidth={2} />
          <circle cx={196} cy={0} r={16} fill="#0b1326" stroke={Math.abs(props.motorSpeedNorm) > 0.05 ? "#38bdf8" : "#475569"} strokeWidth={2} />
          <text x={196} y={4} textAnchor="middle" fill="#f8fafc" fontSize={11} fontFamily="monospace" fontWeight="700">
            M
          </text>
        </g>
      );
    }

    return (
      <g key={`target-${idx}`}>
        <circle cx={430} cy={y} r={4.5} fill={stroke} stroke="#0b1020" strokeWidth={1.5} />

        {row.signalType === "GND" ? (
          <g transform={`translate(475, ${y})`}>
            <line x1={-45} y1={0} x2={0} y2={0} stroke="#64748b" strokeWidth={2} />
            <line x1={0} y1={0} x2={0} y2={9} stroke="#64748b" strokeWidth={2} />
            <line x1={-16} y1={9} x2={16} y2={9} stroke="#94a3b8" strokeWidth={2.5} />
            <line x1={-10} y1={14} x2={10} y2={14} stroke="#94a3b8" strokeWidth={2} />
            <line x1={-4} y1={19} x2={4} y2={19} stroke="#94a3b8" strokeWidth={1.5} />
            <text x={24} y={4} fill="#94a3b8" fontSize={10} fontFamily="monospace" fontWeight="700">
              0V GND · {row.toComponent}
            </text>
          </g>
        ) : row.signalType === "POWER" ? (
          <g transform={`translate(430, ${y})`}>
            <line x1={0} y1={0} x2={24} y2={0} stroke="#ef4444" strokeWidth={2.2} />
            <circle cx={34} cy={0} r={10} fill="#2a0f18" stroke="#ef4444" strokeWidth={1.8} />
            <text x={34} y={3.5} textAnchor="middle" fill="#fca5a5" fontSize={9.5} fontFamily="monospace" fontWeight="700">
              V+
            </text>
            <text x={52} y={-2} fill="#fca5a5" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent} ({row.toPin})
            </text>
            <text x={52} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              {row.notes.slice(0, 38)}
            </text>
          </g>
        ) : isLed ? (
          <g transform={`translate(430, ${y})`}>
            <path
              d="M 0 0 L 14 0 L 18 -7 L 25 7 L 32 -7 L 39 7 L 46 -7 L 50 0 L 64 0"
              fill="none"
              stroke="#eab308"
              strokeWidth={2}
            />
            <text x={32} y={-11} textAnchor="middle" fill="#cbd5e1" fontSize={8.5} fontFamily="monospace">
              {sim === "RGB_RING" ? "330Ω" : "220Ω"}
            </text>
            <polygon
              points="64,-9 64,9 84,0"
              fill={isActiveHigh ? props.activeColorHex || stroke : "#1e293b"}
              stroke={stroke}
              strokeWidth={2}
            />
            <line x1={84} y1={-9} x2={84} y2={9} stroke={stroke} strokeWidth={2.5} />
            {isActiveHigh && (
              <>
                <line x1={74} y1={-12} x2={82} y2={-20} stroke={props.activeColorHex || stroke} strokeWidth={1.5} />
                <line x1={81} y1={-9} x2={89} y2={-17} stroke={props.activeColorHex || stroke} strokeWidth={1.5} />
              </>
            )}
            <line x1={84} y1={0} x2={106} y2={0} stroke="#64748b" strokeWidth={2} />
            <line x1={106} y1={-7} x2={106} y2={7} stroke="#64748b" strokeWidth={2} />
            <text x={116} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent}
            </text>
            <text x={116} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              {row.toPin}
            </text>
          </g>
        ) : isBuzzer ? (
          <g transform={`translate(430, ${y})`}>
            <path d="M 0 0 L 14 0 L 18 -5 L 24 5 L 30 -5 L 36 5 L 40 0 L 52 0" fill="none" stroke="#eab308" strokeWidth={1.8} />
            <text x={27} y={-10} textAnchor="middle" fill="#cbd5e1" fontSize={8} fontFamily="monospace">100Ω</text>
            <rect x={52} y={-12} width={16} height={24} rx={3} fill="#0f172a" stroke={stroke} strokeWidth={1.8} />
            <polygon points="68,-12 82,-18 82,18 68,12" fill="#1e293b" stroke={stroke} strokeWidth={1.8} />
            <text x={94} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent}
            </text>
            <text x={94} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              Piezo Sounder · {row.toPin}
            </text>
          </g>
        ) : isReed ? (
          <g transform={`translate(430, ${y})`}>
            <line x1={0} y1={0} x2={22} y2={0} stroke={stroke} strokeWidth={2} />
            <ellipse cx={46} cy={0} rx={24} ry={10} fill="#0b1326" stroke="#38bdf8" strokeWidth={1.4} />
            <line x1={26} y1={0} x2={44} y2={props.magnetNear ? 0 : -4} stroke="#facc15" strokeWidth={2} />
            <line x1={44} y1={0} x2={66} y2={0} stroke="#facc15" strokeWidth={2} />
            <text x={80} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              Magnetic Reed Switch
            </text>
            <text x={80} y={10} fill={props.magnetNear ? "#34d399" : "#94a3b8"} fontSize={8.5} fontFamily="monospace">
              {props.magnetNear ? "CONTACTS CLOSED (0V)" : "CONTACTS OPEN (PULLUP)"}
            </text>
          </g>
        ) : isTouchPad ? (
          <g transform={`translate(430, ${y})`}>
            <line x1={0} y1={0} x2={24} y2={0} stroke={stroke} strokeWidth={2} />
            <line x1={24} y1={-10} x2={24} y2={10} stroke={stroke} strokeWidth={2.5} />
            <line x1={32} y1={-10} x2={32} y2={10} stroke="#64748b" strokeWidth={2} strokeDasharray="3 2" />
            <text x={44} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent}
            </text>
            <text x={44} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              Capacitive Touch · {row.notes.slice(0, 22)}
            </text>
          </g>
        ) : isServo ? (
          <g transform={`translate(430, ${y})`}>
            <line x1={0} y1={0} x2={16} y2={0} stroke={stroke} strokeWidth={2} />
            <rect x={16} y={-17} width={225} height={34} rx={6} fill="#141930" stroke={isRunning ? stroke : "#334155"} strokeWidth={1.6} />
            <circle cx={34} cy={0} r={9} fill="#0b1120" stroke="#38bdf8" strokeWidth={1.5} />
            <text x={34} y={3.5} textAnchor="middle" fill="#38bdf8" fontSize={8.5} fontFamily="monospace" fontWeight="700">
              M
            </text>
            <text x={50} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent.slice(0, 24)}
            </text>
            <text x={50} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              {row.toPin} · 50Hz PWM (5V BEC)
            </text>
          </g>
        ) : (
          <g transform={`translate(430, ${y})`}>
            <rect
              x={14}
              y={-17}
              width={235}
              height={34}
              rx={7}
              fill={isKeypad ? "#161b33" : "#0e172c"}
              stroke={isActiveHigh ? stroke : "#334155"}
              strokeWidth={1.6}
            />
            <line x1={0} y1={0} x2={14} y2={0} stroke={stroke} strokeWidth={2} />
            <circle cx={28} cy={0} r={4.5} fill={isActiveHigh ? stroke : "#475569"} />
            <text x={40} y={-2} fill="#f8fafc" fontSize={10} fontFamily="monospace" fontWeight="700">
              {row.toComponent.slice(0, 26)}
            </text>
            <text x={40} y={10} fill="#94a3b8" fontSize={8.5} fontFamily="monospace">
              Pin: {row.toPin} · {row.signalType}
            </text>
          </g>
        )}
      </g>
    );
  };

  const svgHeight = Math.max(350, 128 + activeRows.length * 46);

  return (
    <div className="bg-[#080d1a] rounded-2xl border border-[#1e2d4a] p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-wider">
            Interactive IEEE Circuit Schematic · Exp #{experiment.id}
          </h4>
          <p className="text-[11px] text-slate-400">
            All {activeRows.length} circuit connections shown pin-to-pin · Click any ESP32 pin to focus in 3D
          </p>
        </div>
        <span className="text-[11px] font-mono text-slate-300">
          {isRunning ? "Live Directional Signal Flow Active" : "Simulation Paused"}
        </span>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-[#1a2845] bg-[#060a14]">
        <svg
          viewBox={`0 0 740 ${svgHeight}`}
          className="w-full min-w-[560px] h-auto select-none"
        >
          <defs>
            <pattern id="espSchGrid" width="24" height="24" patternUnits="userSpaceOnUse">
              <path
                d="M 24 0 L 0 0 0 24"
                fill="none"
                stroke="#111d36"
                strokeWidth="0.75"
              />
            </pattern>
          </defs>
          <rect width="740" height={svgHeight} fill="url(#espSchGrid)" />

          {/* Top Lab Bench Power Bus & Oscilloscope Probe Bar */}
          <g transform="translate(28, 12)">
            <rect
              x={0}
              y={0}
              width={684}
              height={32}
              rx={6}
              fill="#0b1326"
              stroke="#1e3a5f"
              strokeWidth={1.2}
            />
            <circle cx={18} cy={16} r={4.5} fill="#ef4444" />
            <text x={28} y={20} fill="#fca5a5" fontSize={9.5} fontFamily="monospace" fontWeight="700">
              PSU +5.0V VIN
            </text>
            <circle cx={136} cy={16} r={4.5} fill="#f59e0b" />
            <text x={146} y={20} fill="#fcd34d" fontSize={9.5} fontFamily="monospace" fontWeight="700">
              AMS1117 +3.3V
            </text>
            <circle cx={268} cy={16} r={4.5} fill="#64748b" />
            <text x={278} y={20} fill="#94a3b8" fontSize={9.5} fontFamily="monospace" fontWeight="700">
              0V COMMON GND
            </text>
            <rect x={445} y={6} width={226} height={20} rx={4} fill="#111d36" stroke="#facc15" strokeWidth={1} />
            <text x={558} y={19} textAnchor="middle" fill="#fde047" fontSize={9} fontFamily="monospace" fontWeight="700">
              SCOPE CH1 → {activeRows[scopePinIdx]?.row.fromPin.split(",")[0] ?? "G2"}
            </text>
          </g>

          {/* ESP32-WROOM-32 Schematic IC Symbol */}
          <g transform="translate(28, 56)">
            <rect
              x={0}
              y={0}
              width={205}
              height={svgHeight - 76}
              rx={12}
              fill="#0d1629"
              stroke="#38bdf8"
              strokeWidth={2}
            />
            <rect
              x={22}
              y={12}
              width={161}
              height={42}
              rx={6}
              fill="#17243d"
              stroke="#64748b"
              strokeWidth={1.2}
            />
            <text
              x={102}
              y={30}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={12}
              fontFamily="monospace"
              fontWeight="700"
            >
              ESP32 DEVKIT V1
            </text>
            <text
              x={102}
              y={46}
              textAnchor="middle"
              fill="#22d3ee"
              fontSize={9}
              fontFamily="monospace"
            >
              240MHz · 3.3V CMOS
            </text>

            {/* Onboard GPIO2 LED visual indicator */}
            <g transform="translate(102, 70)">
              <circle cx={-42} cy={0} r={5} fill={isRunning ? "#ef4444" : "#450a0a"} />
              <text x={-32} y={3} fill="#94a3b8" fontSize={9} fontFamily="monospace">
                PWR
              </text>
              <circle
                cx={18}
                cy={0}
                r={5.5}
                fill={isRunning && props.gpio2Lit ? "#22d3ee" : "#0f172a"}
                stroke="#38bdf8"
                strokeWidth={1.2}
              />
              <text x={28} y={3} fill="#bae6fd" fontSize={9} fontFamily="monospace">
                IO2 LED
              </text>
            </g>
          </g>

          {/* Wiring Traces + Clickable ESP32 Schematic Pins + Target Symbols */}
          {activeRows.map(({ row, idx, pin, stroke, stateText }) => {
            const y = 148 + idx * 46;
            const isSel = pin && selectedPinLabel === pin.label;
            const isSignalMoving = isRunning && row.signalType !== "GND";
            const isInbound =
              row.signalType === "DIGITAL_IN" ||
              row.signalType === "ANALOG" ||
              row.signalType === "TOUCH";

            return (
              <g key={`sch-row-${idx}`}>
                {/* Clickable ESP32 IC Pin Terminal */}
                <g
                  className="cursor-pointer"
                  onClick={() => {
                    if (pin) {
                      onSelectPin(pin);
                      onFocusPin3D?.(pin.label);
                    }
                  }}
                >
                  <rect
                    x={160}
                    y={y - 12}
                    width={73}
                    height={24}
                    rx={5}
                    fill={isSel ? "#0ea5e9" : "#13203b"}
                    stroke={isSel ? "#67e8f9" : stroke}
                    strokeWidth={isSel ? 2 : 1.2}
                  />
                  <text
                    x={196}
                    y={y + 3.5}
                    textAnchor="middle"
                    fill={isSel ? "#020617" : "#f8fafc"}
                    fontSize={9.8}
                    fontFamily="monospace"
                    fontWeight="700"
                  >
                    {row.fromPin.split(",")[0].trim()}
                  </text>
                </g>

                {/* Oscilloscope probe indicator tap */}
                {idx === scopePinIdx && (
                  <g transform={`translate(248, ${y})`}>
                    <line x1={0} y1={0} x2={0} y2={-16} stroke="#facc15" strokeWidth={1.4} strokeDasharray="2 2" />
                    <circle cx={0} cy={0} r={3.5} fill="#facc15" />
                  </g>
                )}

                {/* Orthogonal Schematic Wire */}
                <path
                  d={`M 233 ${y} L 430 ${y}`}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={isSel ? 3.2 : 2.2}
                  strokeOpacity={isRunning ? 0.95 : 0.45}
                />

                {/* Animated Signal Flow Dashes + Traveling Energy Packet when Live */}
                {isSignalMoving && (
                  <>
                    <path
                      d={`M 233 ${y} L 430 ${y}`}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2}
                      strokeDasharray="6 14"
                      strokeOpacity={0.78}
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from={isInbound ? "0" : "40"}
                        to={isInbound ? "40" : "0"}
                        dur={row.signalType === "PWM" ? "0.6s" : "1.1s"}
                        repeatCount="indefinite"
                      />
                    </path>
                    <circle r={3.6} fill="#ffffff" cy={y}>
                      <animate
                        attributeName="cx"
                        values={isInbound ? "426;237" : "237;426"}
                        dur={row.signalType === "PWM" ? "0.85s" : "1.45s"}
                        repeatCount="indefinite"
                      />
                    </circle>
                  </>
                )}

                {/* Live State Label on Trace */}
                <rect
                  x={276}
                  y={y - 16}
                  width={114}
                  height={14}
                  rx={3}
                  fill="#060a14"
                  fillOpacity={0.92}
                />
                <text
                  x={333}
                  y={y - 6}
                  textAnchor="middle"
                  fill={stroke}
                  fontSize={8.5}
                  fontFamily="monospace"
                  fontWeight="700"
                >
                  {stateText}
                </text>

                {/* Target IEEE/IEC Component Symbol */}
                {renderTargetSymbol(row, y, stroke, idx)}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
