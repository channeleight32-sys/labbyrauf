import React, { useState, useMemo, useEffect } from "react";
import {
  Gauge,
  Sliders,
  ChevronRight,
  Search,
  Layers,
  Maximize2,
  Minimize2,
  Power,
  AlertTriangle,
  RotateCcw,
  Download,
  Check,
} from "lucide-react";

export type InstrumentCategory =
  | "ALL"
  | "SCOPES_ANALYZERS"
  | "METERS_DMMS"
  | "POWER_SOURCES"
  | "RF_MICROWAVE"
  | "COMPONENT_TESTERS"
  | "WORKBENCH_TOOLS";

export interface LabInstrumentDef {
  id: string;
  number: number;
  name: string;
  model: string;
  category: InstrumentCategory;
  categoryName: string;
  manufacturer: string;
  tagline: string;
  specs: string[];
}

export const LAB_26_INSTRUMENTS: LabInstrumentDef[] = [
  {
    id: "dso-4000",
    number: 1,
    name: "Digital Storage Oscilloscope",
    model: "DSO-4000X Pro",
    category: "SCOPES_ANALYZERS",
    categoryName: "Scopes & Analyzers",
    manufacturer: "Keysight / Tektronix Spec",
    tagline:
      "4-Channel 2 GSa/s DSO with hardware FFT spectrum, math channels (A+B, A-B), and calibrated timebase.",
    specs: ["4 Channels (CH1-CH4)", "2 GSa/s Real-Time", "100 MHz Bandwidth", "FFT Spectrum Analyzer", "Time/Voltage Cursors"],
  },
  {
    id: "analog-crt-scope",
    number: 2,
    name: "Analog CRT Oscilloscope",
    model: "Tek 2236 Phosphor",
    category: "SCOPES_ANALYZERS",
    categoryName: "Scopes & Analyzers",
    manufacturer: "Tektronix Classic Reference",
    tagline:
      "Dual-trace CRT with authentic P31 green phosphor glow, intensity bloom, beam focus, and XY Lissajous mode.",
    specs: ["Dual-Trace (CH1/CH2)", "P31 Green Phosphor Glow", "XY Lissajous Phase Plot", "Beam Focus & Intensity", "Chopped / Alternate Sweep"],
  },
  {
    id: "precision-dmm",
    number: 3,
    name: "6.5-Digit True RMS DMM",
    model: "Fluke 8846A Precision",
    category: "METERS_DMMS",
    categoryName: "Meters & DMMs",
    manufacturer: "Fluke Calibration",
    tagline:
      "High-accuracy bench multimeter with 6.5 digits of resolution, True RMS AC/DC, 4-wire resistance, and continuity.",
    specs: ["6.5-Digit VFD Display", "True RMS AC+DC to 300kHz", "2-Wire & 4-Wire Kelvin Ohms", "Continuity Buzzer & Diode", "0.0024% DCV Accuracy"],
  },
  {
    id: "analog-galvo-meter",
    number: 4,
    name: "Moving-Coil Analog VOM",
    model: "Simpson 260 Series 8P",
    category: "METERS_DMMS",
    categoryName: "Meters & DMMs",
    manufacturer: "Simpson Electric",
    tagline:
      "Taut-band moving-coil galvanometer with real ballistic needle deflection, mirrored parallax scale, and zero-trim.",
    specs: ["Ballistic Needle Physics", "Mirrored Anti-Parallax Scale", "Overload Protection Relay", "Multi-Range Rotary Switch", "20,000 Ω/V DC Sensitivity"],
  },
  {
    id: "arb-function-gen",
    number: 5,
    name: "Arbitrary Function Generator",
    model: "Agilent 33250A Synthesizer",
    category: "POWER_SOURCES",
    categoryName: "Power & Signal Sources",
    manufacturer: "Agilent / Keysight",
    tagline:
      "Direct Digital Synthesis (DDS) waveform generator with Sine, Square, Triangle, Pulse, Noise, DC offset, and AM/FM.",
    specs: ["80 MHz DDS Frequency", "12-Bit 200 MSa/s Arb", "AM, FM, PM, FSK, PWM", "Variable Duty & Offset", "50 Ω / Hi-Z Output Stage"],
  },
  {
    id: "dual-tracking-psu",
    number: 6,
    name: "Dual-Tracking DC Power Supply",
    model: "Rigol DP832 Triple-Output",
    category: "POWER_SOURCES",
    categoryName: "Power & Signal Sources",
    manufacturer: "Rigol Technologies",
    tagline:
      "Precision 3-channel power supply with independent, series-tracking (0-60V), and parallel (0-6A) modes with CC/CV crossover.",
    specs: ["CH1 & CH2: 0-30V / 3A", "CH3: 5V / 3A Fixed", "Series / Parallel Tracking", "Auto CC/CV Crossover", "OVP / OCP Protection"],
  },
  {
    id: "three-phase-source",
    number: 7,
    name: "Three-Phase AC Power Source",
    model: "Chroma 61702 3-Phase",
    category: "POWER_SOURCES",
    categoryName: "Power & Signal Sources",
    manufacturer: "Chroma ATE",
    tagline:
      "Variable 0-480V RMS 3-phase source (50/60/400Hz) with Wye/Delta topology, 120° phase displacement, and neutral monitoring.",
    specs: ["0-480 Vrms Line-to-Line", "50 Hz / 60 Hz / 400 Hz", "120° Balanced Phase Shifts", "Wye (Y) & Delta (Δ) Modes", "Neutral Current Metering"],
  },
  {
    id: "rf-signal-gen",
    number: 8,
    name: "RF Synthesized Signal Generator",
    model: "R&S SMB100A Microwave",
    category: "RF_MICROWAVE",
    categoryName: "RF & Microwave",
    manufacturer: "Rohde & Schwarz",
    tagline:
      "100 kHz to 3.2 GHz RF synthesizer with calibrated output level (-120 dBm to +18 dBm), pulse/AM/FM mod, and Vrms conversion.",
    specs: ["100 kHz - 3.2 GHz Range", "Calibrated Level in dBm/mV", "Low Phase Noise <-128 dBc", "AM / FM / Pulse Modulation", "50 Ω Matched RF Port"],
  },
  {
    id: "logic-analyzer-16ch",
    number: 9,
    name: "16-Channel Logic Analyzer",
    model: "Saleae Logic Pro 16",
    category: "SCOPES_ANALYZERS",
    categoryName: "Scopes & Analyzers",
    manufacturer: "Saleae / Keysight Spec",
    tagline:
      "16 digital channels with protocol decoders for I2C, SPI, UART, CAN bus, and synchronized timing trigger capture.",
    specs: ["16 Digital Inputs (D0-D15)", "500 MSa/s Digital Sampling", "Protocol Decoders: I2C/SPI/UART", "Multi-Stage Pattern Trigger", "Timing Marker Calculations"],
  },
  {
    id: "precision-lcr-meter",
    number: 10,
    name: "Precision LCR Bridge Meter",
    model: "Keysight E4980AL LCR",
    category: "COMPONENT_TESTERS",
    categoryName: "Component Testers",
    manufacturer: "Keysight Technologies",
    tagline:
      "Measures L, C, R, |Z|, ESR, Q-factor, D dissipation, and θ phase angle at test frequencies 100Hz to 1MHz.",
    specs: ["Test Freq: 100Hz - 1MHz", "ESR & Dissipation Factor D", "Quality Factor Q & Phase θ", "Series / Parallel Eq. Model", "4-Terminal Kelvin Test Clips"],
  },
  {
    id: "rf-spectrum-analyzer",
    number: 11,
    name: "RF Spectrum Analyzer",
    model: "R&S FSL3 Spectrum",
    category: "RF_MICROWAVE",
    categoryName: "RF & Microwave",
    manufacturer: "Rohde & Schwarz",
    tagline:
      "9 kHz to 3 GHz spectrum analyzer with adjustable Center Freq, Span, RBW, peak search marker, and harmonic spur analysis.",
    specs: ["9 kHz - 3 GHz Frequency Span", "RBW 100 Hz to 1 MHz", "Peak Search & Delta Markers", "Thermal Noise Floor Tracking", "Harmonic & Spur Detection"],
  },
  {
    id: "curve-tracer",
    number: 12,
    name: "Transistor Curve Tracer",
    model: "Tektronix 576 Curve Tracer",
    category: "COMPONENT_TESTERS",
    categoryName: "Component Testers",
    manufacturer: "Tektronix Vintage Benchmark",
    tagline:
      "Plots full family of curves for BJTs (Ib steps) and MOSFETs (Vgs steps) with Early slope, knee saturation, and hFE/gm.",
    specs: ["BJT Ib Step Generator", "MOSFET Vgs Steps (1V-5V)", "Collector Sweep 0-50V", "Dynamic hFE / Beta Readout", "Collector Saturation Vce(sat)"],
  },
  {
    id: "electronic-dc-load",
    number: 13,
    name: "Programmable DC Electronic Load",
    model: "BK Precision 8500 DC Load",
    category: "POWER_SOURCES",
    categoryName: "Power & Signal Sources",
    manufacturer: "B&K Precision",
    tagline:
      "Versatile electronic load with Constant Current (CC), Constant Voltage (CV), CR, and CP modes with live Ah/Wh metering.",
    specs: ["CC, CV, CR, CP Operating Modes", "0-300W / 30A / 120V Sink", "Dynamic Transient Pulsing", "Battery Capacity Ah / Wh Profiler", "Over-Power & Thermal Protection"],
  },
  {
    id: "vna-vector-network",
    number: 14,
    name: "Vector Network Analyzer (VNA)",
    model: "NanoVNA-F V2 Vector Network",
    category: "RF_MICROWAVE",
    categoryName: "RF & Microwave",
    manufacturer: "Keysight / NanoVNA Alliance",
    tagline:
      "Measures S11 reflection and complex load impedance (R + jX) with interactive Smith Chart, VSWR, and Return Loss (dB).",
    specs: ["50 kHz - 3 GHz Range", "Interactive Smith Chart (r+jx)", "S11 Return Loss & VSWR", "S21 Gain & Insertion Phase", "Port Calibration (SOLT)"],
  },
  {
    id: "precision-smu",
    number: 15,
    name: "Precision Source Measure Unit",
    model: "Keithley 2400 SMU",
    category: "COMPONENT_TESTERS",
    categoryName: "Component Testers",
    manufacturer: "Keithley Instruments",
    tagline:
      "4-quadrant precision SMU: simultaneous voltage sourcing with nanoamp current sensing, compliance clamping, and IV sweeps.",
    specs: ["4-Quadrant IV Operation", "Microvolt & Nanoamp Resolution", "Source V / Measure I Sweep", "Compliance Limiter Clamp", "Semiconductor IV Extraction"],
  },
  {
    id: "audio-distortion-analyzer",
    number: 16,
    name: "Audio Distortion & THD Meter",
    model: "Audio Precision APx500",
    category: "SCOPES_ANALYZERS",
    categoryName: "Scopes & Analyzers",
    manufacturer: "Audio Precision",
    tagline:
      "Measures Total Harmonic Distortion (THD in % and dB), SINAD, SNR, and harmonic breakdown from 20 Hz to 20 kHz.",
    specs: ["THD+N Resolution to 0.0001%", "SINAD & Signal-to-Noise Ratio", "20 Hz - 20 kHz Audio Band", "Soft/Hard Clipping Simulation", "2nd-5th Harmonic Breakdown"],
  },
  {
    id: "frequency-counter",
    number: 17,
    name: "Universal Frequency Counter / Timer",
    model: "Keysight 53220A 10-Digit",
    category: "METERS_DMMS",
    categoryName: "Meters & DMMs",
    manufacturer: "Keysight Technologies",
    tagline:
      "10-digit resolution frequency counter: measures frequency, period, positive pulse width, duty cycle, and event totalize.",
    specs: ["10-Digit High Precision VFD", "DC to 350 MHz Input Range", "Period, Pulse Width, Duty %", "Selectable Gate Time", "Totalize Pulse Event Counter"],
  },
  {
    id: "power-meter-wattmeter",
    number: 18,
    name: "Digital Power Meter / Wattmeter",
    model: "Yokogawa WT310E Precision",
    category: "METERS_DMMS",
    categoryName: "Meters & DMMs",
    manufacturer: "Yokogawa Electric",
    tagline:
      "Measures Active Power (W), Reactive Power (VAR), Apparent Power (VA), Power Factor (cos φ), and live phasor diagram.",
    specs: ["Active Power P (Watts)", "Reactive Q (VAR) & Apparent S (VA)", "Power Factor cos φ & Phase θ", "True RMS Voltage & Current", "Live Voltage/Current Phasors"],
  },
  {
    id: "variac-isolation",
    number: 19,
    name: "Variac & Isolation Transformer",
    model: "Staco 120V/140V Variac Lab",
    category: "POWER_SOURCES",
    categoryName: "Power & Signal Sources",
    manufacturer: "Staco Energy Products",
    tagline:
      "Variable autotransformer with 0-140% line voltage adjustment, galvanic ground isolation, dual metering, and breaker protection.",
    specs: ["0-140V AC Variable Rotary Dial", "Galvanic Ground Isolation", "10A Magnetic Breaker Reset", "Analog Voltmeter & Ammeter", "Load Current & VA Monitor"],
  },
  {
    id: "decade-resistor-box",
    number: 20,
    name: "Decade Resistance Box",
    model: "IET Labs 1433 Precision",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "IET Labs",
    tagline:
      "Precision resistance substitution box with calibrated decade switches from 10 Ω to 99,990 Ω with 0.1% metal film tolerance.",
    specs: ["Decades: ×1, ×10, ×100, ×1k", "0.1% Metal Film Precision", "Gold-Plated Banana Posts", "Live Power Dissipation Limit", "NIST Traceable Standard"],
  },
  {
    id: "decade-capacitor-box",
    number: 21,
    name: "Decade Capacitance Box",
    model: "IET Labs 1412-BC Decade",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "IET Labs",
    tagline:
      "5-decade capacitance substitution box with low-loss film capacitors from 100 pF to 9.9999 µF and live Xc readout.",
    specs: ["5 Decades: 100pF to 1µF", "Low Dielectric Loss Film", "500V DC Rated Capacitors", "Reactance Xc Readout (1kHz)", "Shielded Metal Enclosure"],
  },
  {
    id: "decade-inductor-box",
    number: 22,
    name: "Decade Inductance Box",
    model: "IET Labs 1491-G Inductor",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "IET Labs",
    tagline:
      "4-decade shielded toroidal inductance substitution standard from 1 mH to 9.999 H with high Q-factor and Xl computation.",
    specs: ["4 Decades: 1mH to 1H", "Shielded Toroidal Ferrite Cores", "High Q-Factor at 1kHz", "Reactance Xl & DCR Readout", "Max Continuous Current Rating"],
  },
  {
    id: "in-circuit-esr-meter",
    number: 23,
    name: "In-Circuit Capacitor ESR Meter",
    model: "Peak Atlas ESR70 Gold",
    category: "COMPONENT_TESTERS",
    categoryName: "Component Testers",
    manufacturer: "Peak Electronic Design",
    tagline:
      "Measures Equivalent Series Resistance (ESR) of electrolytic capacitors in-circuit using sub-100mV excitation.",
    specs: ["0.01 Ω to 50 Ω ESR Range", "Sub-100mV Test Amplitude", "Health Pass/Warn/Replace Verdict", "DUT Preset & Custom Sweep", "Capacitance 1µF-10,000µF"],
  },
  {
    id: "logic-probe-injector",
    number: 24,
    name: "Digital Logic Probe & Pulser",
    model: "Elenco LP-560 & FP-1",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "Elenco Electronics",
    tagline:
      "Handheld logic analyzer probe with HIGH/LOW/PULSE LEDs, TTL/CMOS threshold comparator, and 500Hz pulse injector.",
    specs: ["TTL (5V) & CMOS Thresholds", "HIGH (Green), LOW (Red), PULSE", "Tri-State / Float Detection", "Single-Shot & 500Hz Pulser", "100 MHz Detection Bandwidth"],
  },
  {
    id: "soldering-station",
    number: 25,
    name: "PID Temperature Soldering Station",
    model: "Hakko FX-888D Professional",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "Hakko Corporation",
    tagline:
      "Precision 65W soldering station with dynamic closed-loop PID thermal ramp (200°C - 480°C), presets, and interchangeable tips.",
    specs: ["200°C to 480°C (392°F - 896°F)", "Dynamic Closed-Loop PID", "Tips: Chisel, Conical, Knife", "Live Heater Duty Cycle %", "Quick Thermal Presets"],
  },
  {
    id: "solderless-breadboard",
    number: 26,
    name: "830-Tie Point Breadboard Workstation",
    model: "MB-102 Universal Breadboard",
    category: "WORKBENCH_TOOLS",
    categoryName: "Workbench Tools",
    manufacturer: "Lab By Rauf Standards",
    tagline:
      "Full solderless prototyping workstation with dual power rails, 63 terminal columns, catenary arched jumper wires, and live MNA solver.",
    specs: ["830 Interconnected Tie-Points", "Dual Top & Bottom +/- DC Rails", "63 Columns with Center IC Trough", "Catenary Jumper Wires (7 Colors)", "Direct Live MNA Engine Link"],
  },
];

interface LabInstrumentsRackProps {
  onLaunchBreadboard?: () => void;
  onNavigateTab?: (tab: any) => void;
}

function formatEngineeringOhms(r: number): string {
  if (r >= 1e6) return `${(r / 1e6).toFixed(4)} MΩ`;
  if (r >= 1e3) return `${(r / 1e3).toFixed(4)} kΩ`;
  return `${r.toFixed(2)} Ω`;
}

export default function LabInstrumentsRack({
  onLaunchBreadboard,
}: LabInstrumentsRackProps) {
  const [selectedInstrumentId, setSelectedInstrumentId] = useState<string>("dso-4000");
  const [secondaryInstrumentId, setSecondaryInstrumentId] = useState<string>("precision-dmm");
  const [activeSlotTarget, setActiveSlotTarget] = useState<"A" | "B">("A");
  const [activeCategory, setActiveCategory] = useState<InstrumentCategory>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"SINGLE" | "RACK_DUAL">("SINGLE");

  // 1. DSO
  const [dsoCh1VDiv, setDsoCh1VDiv] = useState<number>(1.0);
  const [dsoSignalVpk, setDsoSignalVpk] = useState<number>(2.5);
  const [dsoTimebase, setDsoTimebase] = useState<number>(0.5);
  const [dsoRunning, setDsoRunning] = useState<boolean>(true);
  const [dsoWaveform, setDsoWaveform] = useState<"SINE" | "SQUARE" | "TRIANGLE">("SINE");
  const [dsoFrequency, setDsoFrequency] = useState<number>(1000);
  const [dsoMathMode, setDsoMathMode] = useState<"OFF" | "A+B" | "A-B" | "FFT">("OFF");

  // 2. Analog CRT Scope
  const [crtIntensity, setCrtIntensity] = useState<number>(85);
  const [crtFocus, setCrtFocus] = useState<number>(92);
  const [crtXyMode, setCrtXyMode] = useState<boolean>(false);
  const [crtPhaseDeg, setCrtPhaseDeg] = useState<number>(45);
  const [crtXyRatio, setCrtXyRatio] = useState<"1:1" | "1:2" | "2:3" | "3:4">("1:1");

  // 3. Digital Multimeter
  const [dmmFunction, setDmmFunction] = useState<"VDC" | "VAC" | "IDC" | "OHM" | "CAP" | "DIODE" | "FREQ">("VDC");
  const [dmmSimVoltage, setDmmSimVoltage] = useState<number>(5.0342);
  const [dmmTestR, setDmmTestR] = useState<number>(10042.5);
  const [dmmTestCapUf, setDmmTestCapUf] = useState<number>(47.182);
  const [dmmDiodePreset, setDmmDiodePreset] = useState<"1N4148" | "1N5819" | "LED_RED" | "OPEN">("1N4148");
  const [dmmTestFreqHz, setDmmTestFreqHz] = useState<number>(1000.0);
  const [dmmHold, setDmmHold] = useState<boolean>(false);
  const [dmmHeldDisplay, setDmmHeldDisplay] = useState<string>("");

  // 4. Analog Galvanometer
  const [galvoRange, setGalvoRange] = useState<number>(10);
  const [galvoReading, setGalvoReading] = useState<number>(4.8);
  const [galvoZeroTrimDeg, setGalvoZeroTrimDeg] = useState<number>(0);

  // 5. Function Generator
  const [fgType, setFgType] = useState<"SINE" | "SQUARE" | "TRIANGLE" | "PULSE" | "NOISE">("SINE");
  const [fgFreqHz, setFgFreqHz] = useState<number>(2500);
  const [fgAmpVpp, setFgAmpVpp] = useState<number>(4.0);
  const [fgOffsetV, setFgOffsetV] = useState<number>(0.0);
  const [fgModulation, setFgModulation] = useState<"OFF" | "AM" | "FM">("OFF");
  const [fgOutputEnabled, setFgOutputEnabled] = useState<boolean>(true);

  // 6. Dual DC Power Supply
  const [psuCh1V, setPsuCh1V] = useState<number>(12.0);
  const [psuCh1LimitA, setPsuCh1LimitA] = useState<number>(1.5);
  const [psuCh2V, setPsuCh2V] = useState<number>(5.0);
  const [psuCh2LimitA, setPsuCh2LimitA] = useState<number>(2.0);
  const [psuLoadOhms, setPsuLoadOhms] = useState<number>(12.0);
  const [psuTrackingMode, setPsuTrackingMode] = useState<"INDEPENDENT" | "SERIES" | "PARALLEL">("INDEPENDENT");
  const [psuOutputEnabled, setPsuOutputEnabled] = useState<boolean>(true);

  // 7. Three-Phase Source
  const [threePhaseV, setThreePhaseV] = useState<number>(230);
  const [threePhaseFreq, setThreePhaseFreq] = useState<50 | 60 | 400>(50);
  const [threePhaseConfig, setThreePhaseConfig] = useState<"WYE" | "DELTA">("WYE");
  const [threePhaseLoadA, setThreePhaseLoadA] = useState<number>(10.0);

  // 8. RF Signal Generator
  const [rfFreqMHz, setRfFreqMHz] = useState<number>(915.0);
  const [rfLevelDbm, setRfLevelDbm] = useState<number>(-10.0);
  const [rfModMode, setRfModMode] = useState<"CW" | "AM" | "FM" | "PULSE">("CW");
  const [rfOutputOn, setRfOutputOn] = useState<boolean>(true);

  // 9. Logic Analyzer 16CH
  const [laProtocol, setLaProtocol] = useState<"I2C" | "SPI" | "UART" | "CAN">("I2C");
  const [laSampleMhz, setLaSampleMhz] = useState<number>(25);
  const [laRunning, setLaRunning] = useState<boolean>(true);

  // 10. Precision LCR Meter
  const [lcrFreq, setLcrFreq] = useState<"100Hz" | "1kHz" | "10kHz" | "100kHz" | "1MHz">("1kHz");
  const [lcrTargetComp, setLcrTargetComp] = useState<"CAP" | "IND" | "RES">("CAP");
  const [lcrEquivModel, setLcrEquivModel] = useState<"SERIES" | "PARALLEL">("SERIES");
  const [lcrNominalVal, setLcrNominalVal] = useState<number>(10); // 10 uF, 10 mH, or 10 kOhm
  const [lcrEsrOhms, setLcrEsrOhms] = useState<number>(1.2);

  // 11. RF Spectrum Analyzer
  const [saCenterMHz, setSaCenterMHz] = useState<number>(433.92);
  const [saSpanMHz, setSaSpanMHz] = useState<number>(20);
  const [saRbwKhz, setSaRbwKhz] = useState<number>(10);

  // 12. Curve Tracer
  const [curveDevType, setCurveDevType] = useState<"BJT_NPN" | "MOSFET_N">("BJT_NPN");
  const [curveSweepMaxV, setCurveSweepMaxV] = useState<number>(20);
  const [curveStepVal, setCurveStepVal] = useState<number>(20); // 20 uA/step or 0.5V/step

  // 13. Programmable DC Load
  const [dcLoadMode, setDcLoadMode] = useState<"CC" | "CV" | "CR" | "CP">("CC");
  const [dcLoadSourceV, setDcLoadSourceV] = useState<number>(12.0);
  const [dcLoadSetpoint, setDcLoadSetpoint] = useState<number>(2.5);
  const [dcLoadEnabled, setDcLoadEnabled] = useState<boolean>(true);

  // 14. VNA Smith Chart
  const [vnaFreqMHz, setVnaFreqMHz] = useState<number>(433);
  const [vnaMarkerZ, setVnaMarkerZ] = useState<{ r: number; x: number }>({ r: 50, x: 12 });

  // 15. Precision SMU
  const [smuDut, setSmuDut] = useState<"DIODE" | "ZENER" | "LED_BLUE" | "RES_10K">("DIODE");
  const [smuSourceV, setSmuSourceV] = useState<number>(0.72);
  const [smuComplianceMa, setSmuComplianceMa] = useState<number>(20);

  // 16. Audio Distortion Analyzer
  const [audioFreqHz, setAudioFreqHz] = useState<number>(1000);
  const [audioOverdrivePct, setAudioOverdrivePct] = useState<number>(12);

  // 17. Universal Frequency Counter
  const [fcInputHz, setFcInputHz] = useState<number>(12500000);
  const [fcDutyPct, setFcDutyPct] = useState<number>(42.5);
  const [fcGateSec, setFcGateSec] = useState<0.01 | 0.1 | 1 | 10>(1);

  // 18. Power Meter / Wattmeter
  const [pmVrms, setPmVrms] = useState<number>(230);
  const [pmIrms, setPmIrms] = useState<number>(4.5);
  const [pmPhaseDeg, setPmPhaseDeg] = useState<number>(28);

  // 19. Variac & Isolation
  const [variacPct, setVariacPct] = useState<number>(85);
  const [variacLoadOhms, setVariacLoadOhms] = useState<number>(25);
  const [variacBreakerTripped, setVariacBreakerTripped] = useState<boolean>(false);

  // 20. Decade Resistance Box
  const [decadeR1k, setDecadeR1k] = useState<number>(4);
  const [decadeR100, setDecadeR100] = useState<number>(7);
  const [decadeR10, setDecadeR10] = useState<number>(0);
  const [decadeR1, setDecadeR1] = useState<number>(5);
  const totalDecadeR = decadeR1k * 1000 + decadeR100 * 100 + decadeR10 * 10 + decadeR1;

  // 21. Decade Capacitance Box
  const [capD100p, setCapD100p] = useState<number>(2);
  const [capD1n, setCapD1n] = useState<number>(4);
  const [capD10n, setCapD10n] = useState<number>(7);
  const [capD100n, setCapD100n] = useState<number>(1);
  const [capD1u, setCapD1u] = useState<number>(0);
  const totalDecadeCapPf = capD100p * 100 + capD1n * 1000 + capD10n * 10000 + capD100n * 100000 + capD1u * 1000000;

  // 22. Decade Inductance Box
  const [indD1m, setIndD1m] = useState<number>(5);
  const [indD10m, setIndD10m] = useState<number>(3);
  const [indD100m, setIndD100m] = useState<number>(1);
  const [indD1h, setIndD1h] = useState<number>(0);
  const totalDecadeIndMh = indD1m * 1 + indD10m * 10 + indD100m * 100 + indD1h * 1000;

  // 23. In-Circuit ESR Meter
  const [esrCapUf, setEsrCapUf] = useState<number>(470);
  const [esrOhms, setEsrOhms] = useState<number>(0.18);

  // 24. Digital Logic Probe & Pulser
  const [probeFamily, setProbeFamily] = useState<"TTL" | "CMOS">("TTL");
  const [probeState, setProbeState] = useState<"HIGH" | "LOW" | "FLOAT" | "PULSE">("PULSE");
  const [pulserFreqHz, setPulserFreqHz] = useState<number>(500);
  const [singleShotCount, setSingleShotCount] = useState<number>(0);

  // 25. Soldering Station
  const [solderSetTemp, setSolderSetTemp] = useState<number>(350);
  const [solderActualTemp, setSolderActualTemp] = useState<number>(348);
  const [solderTip, setSolderTip] = useState<"CHISEL" | "CONICAL" | "KNIFE">("CHISEL");

  // Smooth thermal PID convergence for soldering station
  useEffect(() => {
    const tempTimer = setInterval(() => {
      setSolderActualTemp((curr) => {
        const diff = solderSetTemp - curr;
        if (Math.abs(diff) <= 1) return solderSetTemp;
        const step = Math.sign(diff) * Math.max(1, Math.round(Math.abs(diff) * 0.25));
        return curr + step;
      });
    }, 250);
    return () => clearInterval(tempTimer);
  }, [solderSetTemp]);

  // Animation ticker for scopes & pulsing probes
  const [tick, setTick] = useState<number>(0);
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => (t + 1) % 3600);
    }, 45);
    return () => clearInterval(timer);
  }, []);

  const filteredInstruments = useMemo(() => {
    return LAB_26_INSTRUMENTS.filter((inst) => {
      const matchCat = activeCategory === "ALL" || inst.category === activeCategory;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        inst.name.toLowerCase().includes(q) ||
        inst.model.toLowerCase().includes(q) ||
        inst.tagline.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  const activeInstrument = useMemo(
    () => LAB_26_INSTRUMENTS.find((i) => i.id === selectedInstrumentId) || LAB_26_INSTRUMENTS[0],
    [selectedInstrumentId]
  );

  const secondaryInstrument = useMemo(
    () => LAB_26_INSTRUMENTS.find((i) => i.id === secondaryInstrumentId) || LAB_26_INSTRUMENTS[2],
    [secondaryInstrumentId]
  );

  const [rackCsvSuccessKey, setRackCsvSuccessKey] = useState<string | null>(null);

  const downloadRackCsv = (
    key: string,
    filename: string,
    headers: string[],
    rows: (string | number)[][]
  ) => {
    const lines = [headers.join(","), ...rows.map((r) => r.join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setRackCsvSuccessKey(key);
    window.setTimeout(() => setRackCsvSuccessKey(null), 2200);
  };

  const mountInstrumentFromPalette = (id: string) => {
    if (viewMode === "RACK_DUAL" && activeSlotTarget === "B") {
      setSecondaryInstrumentId(id);
    } else {
      setSelectedInstrumentId(id);
    }
  };

  const renderInstrumentPanelBody = (inst: LabInstrumentDef, slotKey: string) => {
    switch (inst.id) {
      case "dso-4000": {
        const totalWindowSec = (dsoTimebase / 1000) * 10; // 10 horizontal divs
        const vpp = dsoSignalVpk * 2;
        const vrms =
          dsoWaveform === "SINE"
            ? dsoSignalVpk / Math.SQRT2
            : dsoWaveform === "SQUARE"
            ? dsoSignalVpk
            : dsoSignalVpk / Math.sqrt(3);

        const ch1Points = Array.from({ length: 140 }, (_, i) => {
          const frac = i / 139;
          const x = frac * 500;
          const t = frac * totalWindowSec + (dsoRunning ? tick * 0.00008 : 0);
          const phase = 2 * Math.PI * dsoFrequency * t;
          let v1 = 0;
          if (dsoWaveform === "SINE") {
            v1 = Math.sin(phase) * dsoSignalVpk;
          } else if (dsoWaveform === "SQUARE") {
            v1 = (Math.sin(phase) >= 0 ? 1 : -1) * dsoSignalVpk;
          } else {
            const norm = ((dsoFrequency * t) % 1 + 1) % 1;
            v1 = (norm < 0.5 ? 4 * norm - 1 : 3 - 4 * norm) * dsoSignalVpk;
          }
          const v2 = Math.cos(phase + 0.6) * (dsoSignalVpk * 0.72);
          const y1 = 100 - Math.max(-92, Math.min(92, (v1 / dsoCh1VDiv) * 25));
          const y2 = 100 - Math.max(-92, Math.min(92, (v2 / dsoCh1VDiv) * 25));
          const vm = dsoMathMode === "A+B" ? v1 + v2 : v1 - v2;
          const ym = 100 - Math.max(-92, Math.min(92, (vm / dsoCh1VDiv) * 25));
          return { x, y1, y2, ym, t, v1, v2, vm };
        });

        // Harmonic amplitudes for FFT bar overlay
        const fftBars = Array.from({ length: 9 }, (_, idx) => {
          const n = idx + 1;
          let relAmp = 0;
          if (dsoWaveform === "SINE") {
            relAmp = n === 1 ? 1 : 0.02 / n;
          } else if (dsoWaveform === "SQUARE") {
            relAmp = n % 2 === 1 ? 1 / n : 0.03 / n;
          } else {
            relAmp = n % 2 === 1 ? 1 / (n * n) : 0.02 / n;
          }
          return { harmonic: n, freqHz: n * dsoFrequency, relAmp };
        });

        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700 font-mono text-xs">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${dsoRunning ? "bg-emerald-400" : "bg-red-500"}`} />
                <span className="font-bold text-white tracking-widest uppercase">
                  KEYSIGHT INFIIIVISION DSO-X 4024A
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                  {dsoRunning ? "TRIG'D" : "STOP"}
                </span>
                <span className="text-slate-400">2.00 GSa/s · 100MHz</span>
                <button
                  type="button"
                  onClick={() =>
                    downloadRackCsv(
                      `dso-${slotKey}`,
                      `dso_x4024a_${dsoWaveform.toLowerCase()}_${Date.now()}.csv`,
                      ["Sample", "Time_s", "Time_ms", "CH1_V", "CH2_V", "Math_V"],
                      ch1Points.map((p, idx) => [
                        idx,
                        p.t.toExponential(6),
                        (p.t * 1000).toFixed(6),
                        p.v1.toFixed(6),
                        p.v2.toFixed(6),
                        p.vm.toFixed(6),
                      ])
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold cursor-pointer"
                  title="Download DSO transient points as CSV for Excel or MATLAB"
                >
                  {rackCsvSuccessKey === `dso-${slotKey}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 text-cyan-300" />
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative w-full h-64 bg-[#030712] border-2 border-cyan-900 rounded-xl overflow-hidden shadow-inner flex flex-col justify-between p-3 font-mono">
              <svg className="w-full h-44" viewBox="0 0 500 200" preserveAspectRatio="none">
                <defs>
                  <pattern id={`dso-grid-sub-${slotKey}`} width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#0e7490" strokeWidth="0.4" strokeOpacity="0.35" />
                  </pattern>
                  <pattern id={`dso-grid-main-${slotKey}`} width="50" height="25" patternUnits="userSpaceOnUse">
                    <rect width="50" height="25" fill={`url(#dso-grid-sub-${slotKey})`} />
                    <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.45" />
                  </pattern>
                </defs>
                <rect width="500" height="200" fill={`url(#dso-grid-main-${slotKey})`} />
                <line x1="250" y1="0" x2="250" y2="200" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                <line x1="0" y1="100" x2="500" y2="100" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />

                {dsoMathMode === "FFT" ? (
                  <>
                    {fftBars.map((bar, i) => {
                      const bx = 35 + i * 50;
                      const bh = Math.max(4, bar.relAmp * 145);
                      return (
                        <g key={bar.harmonic}>
                          <rect x={bx - 12} y={180 - bh} width={24} height={bh} rx={3} fill="#c084fc" opacity="0.82" />
                          <text x={bx} y={194} textAnchor="middle" fill="#e9d5ff" fontSize="9" fontFamily="monospace">
                            {bar.harmonic}f₀
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  <>
                    <path
                      d={ch1Points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y1.toFixed(1)}`).join(" ")}
                      fill="none"
                      stroke="#facc15"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={ch1Points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y2.toFixed(1)}`).join(" ")}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                      strokeLinecap="round"
                      opacity="0.85"
                    />
                    {(dsoMathMode === "A+B" || dsoMathMode === "A-B") && (
                      <path
                        d={ch1Points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.ym.toFixed(1)}`).join(" ")}
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    )}
                  </>
                )}
              </svg>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800">
                <div className="flex items-center gap-3">
                  <span className="text-yellow-400 font-bold">1: {dsoCh1VDiv.toFixed(2)}V/div</span>
                  <span className="text-cyan-400 font-bold">2: {dsoCh1VDiv.toFixed(2)}V/div</span>
                  {dsoMathMode !== "OFF" && <span className="text-purple-400 font-bold">MATH: {dsoMathMode}</span>}
                  <span className="text-slate-300">M: {dsoTimebase.toFixed(2)}ms/div</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <span>f₀: {dsoFrequency.toLocaleString()} Hz</span>
                  <span>Vpp: {vpp.toFixed(2)} V</span>
                  <span>Vrms: {vrms.toFixed(2)} V</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1 font-mono">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Acquisition</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDsoRunning(!dsoRunning)}
                    className={`flex-1 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                      dsoRunning ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-red-500 text-white hover:bg-red-400"
                    }`}
                  >
                    {dsoRunning ? "RUN" : "STOP"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTick((t) => (t + 5) % 3600);
                      setDsoRunning(false);
                    }}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold cursor-pointer"
                  >
                    Step
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1 text-center">
                <span className="text-[10px] font-bold text-yellow-400 uppercase block">CH1 V/div</span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDsoCh1VDiv((v) => Math.max(0.25, Number((v * 0.5).toFixed(2))))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-14 font-bold text-yellow-300 text-[11px]">{dsoCh1VDiv.toFixed(2)}V</span>
                  <button
                    type="button"
                    onClick={() => setDsoCh1VDiv((v) => Math.min(10, Number((v * 2).toFixed(2))))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Timebase</span>
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDsoTimebase((t) => Math.max(0.05, Number((t * 0.5).toFixed(2))))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-14 font-bold text-cyan-300 text-[11px]">{dsoTimebase.toFixed(2)}ms</span>
                  <button
                    type="button"
                    onClick={() => setDsoTimebase((t) => Math.min(5, Number((t * 2).toFixed(2))))}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Waveform</span>
                <select
                  value={dsoWaveform}
                  onChange={(e) => setDsoWaveform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-[11px] rounded px-1.5 py-1 cursor-pointer"
                >
                  <option value="SINE">Pure Sine</option>
                  <option value="SQUARE">TTL Square</option>
                  <option value="TRIANGLE">Triangle</option>
                </select>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="font-bold text-slate-400 uppercase">Freq</span>
                  <span className="text-cyan-300 font-bold">{dsoFrequency}Hz</span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={100}
                  value={dsoFrequency}
                  onChange={(e) => setDsoFrequency(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-400">Vpk</span>
                  <input
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.5}
                    value={dsoSignalVpk}
                    onChange={(e) => setDsoSignalVpk(Number(e.target.value))}
                    className="w-20 accent-yellow-400 cursor-pointer"
                  />
                </div>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-purple-400 uppercase block">Math / FFT</span>
                <div className="grid grid-cols-2 gap-1">
                  {(["OFF", "A+B", "A-B", "FFT"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDsoMathMode(m)}
                      className={`py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        dsoMathMode === m ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "analog-crt-scope": {
        const [rx, ry] = crtXyRatio.split(":").map(Number);
        const beamStrokeW = 1.6 + ((100 - crtFocus) / 100) * 4.5;
        const beamOpacity = Math.max(0.25, crtIntensity / 100);
        return (
          <div className="bg-[#1a231d] border-2 border-[#2d4734] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#2d4734] font-mono text-xs">
              <span className="font-bold text-emerald-300 tracking-wider">
                TEKTRONIX 2236 DUAL TRACE 100MHz CRT OSCILLOSCOPE
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700 text-[11px]">
                  P31 High-Persistence Phosphor
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (crtXyMode) {
                      const rows = Array.from({ length: 180 }, (_, i) => {
                        const theta = (i / 179) * Math.PI * 2;
                        const phaseRad = (crtPhaseDeg * Math.PI) / 180;
                        return [
                          i,
                          theta.toFixed(6),
                          Math.sin(rx * theta).toFixed(6),
                          Math.sin(ry * theta + phaseRad).toFixed(6),
                        ];
                      });
                      downloadRackCsv(
                        `crt-${slotKey}`,
                        `tek2236_xy_lissajous_${Date.now()}.csv`,
                        ["Sample", "Theta_rad", "CH1_X_norm", "CH2_Y_norm"],
                        rows
                      );
                    } else {
                      const rows = Array.from({ length: 120 }, (_, i) => [
                        i,
                        (i * 0.1).toFixed(3),
                        (Math.sin(i * 0.16 + tick * 0.18) * 5).toFixed(6),
                        (
                          Math.sin(i * 0.32 + tick * 0.18 + (crtPhaseDeg * Math.PI) / 180) *
                          3.8
                        ).toFixed(6),
                      ]);
                      downloadRackCsv(
                        `crt-${slotKey}`,
                        `tek2236_dual_sweep_${Date.now()}.csv`,
                        ["Sample", "Time_ms", "CH1_V", "CH2_V"],
                        rows
                      );
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/40 text-[11px] font-bold cursor-pointer"
                  title="Download CRT trace points as CSV for Excel or MATLAB"
                >
                  {rackCsvSuccessKey === `crt-${slotKey}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 text-emerald-300" />
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative w-full h-72 bg-[#021207] border-4 border-[#1e3b26] rounded-[32px] overflow-hidden flex items-center justify-center p-4 shadow-[inset_0_0_60px_rgba(16,185,129,0.3)]">
              <svg className="w-full h-full" viewBox="0 0 500 280" preserveAspectRatio="none">
                <defs>
                  <pattern id={`crt-grid-${slotKey}`} width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#34d399" strokeWidth="0.6" opacity="0.25" />
                  </pattern>
                </defs>
                <rect width="500" height="280" fill={`url(#crt-grid-${slotKey})`} />
                <circle cx="250" cy="140" r="132" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.25" />

                {crtXyMode ? (
                  <path
                    d={Array.from({ length: 180 }, (_, i) => {
                      const theta = (i / 179) * Math.PI * 2;
                      const phaseRad = (crtPhaseDeg * Math.PI) / 180;
                      const x = 250 + Math.sin(rx * theta) * 115;
                      const y = 140 + Math.sin(ry * theta + phaseRad) * 95;
                      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth={beamStrokeW}
                    opacity={beamOpacity}
                  />
                ) : (
                  <>
                    <path
                      d={Array.from({ length: 120 }, (_, i) => {
                        const x = (i / 119) * 500;
                        const y = 90 + Math.sin(i * 0.16 + tick * 0.18) * 45;
                        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#4ade80"
                      strokeWidth={beamStrokeW}
                      opacity={beamOpacity}
                    />
                    <path
                      d={Array.from({ length: 120 }, (_, i) => {
                        const x = (i / 119) * 500;
                        const y = 195 + Math.sin(i * 0.32 + tick * 0.18 + (crtPhaseDeg * Math.PI) / 180) * 35;
                        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      }).join(" ")}
                      fill="none"
                      stroke="#86efac"
                      strokeWidth={Math.max(1.4, beamStrokeW * 0.85)}
                      strokeDasharray="6 2"
                      opacity={beamOpacity * 0.82}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-500/5 to-white/10 pointer-events-none rounded-[32px]" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 font-mono">
              <div className="bg-[#121c15] p-3 rounded-xl border border-[#2d4734] space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Phosphor Intensity</span>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={crtIntensity}
                  onChange={(e) => setCrtIntensity(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="text-[10px] text-emerald-300 text-right">{crtIntensity}%</div>
              </div>

              <div className="bg-[#121c15] p-3 rounded-xl border border-[#2d4734] space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Beam Focus</span>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={crtFocus}
                  onChange={(e) => setCrtFocus(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="text-[10px] text-emerald-300 text-right">
                  {crtFocus}% ({beamStrokeW.toFixed(1)}px spot)
                </div>
              </div>

              <div className="bg-[#121c15] p-3 rounded-xl border border-[#2d4734] space-y-2">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Sweep / Lissajous</span>
                <button
                  type="button"
                  onClick={() => setCrtXyMode(!crtXyMode)}
                  className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    crtXyMode ? "bg-emerald-400 text-slate-950 font-bold" : "bg-slate-800 text-slate-300 hover:text-white"
                  }`}
                >
                  {crtXyMode ? "XY LISSAJOUS" : "DUAL SWEEP"}
                </button>
                {crtXyMode && (
                  <div className="flex gap-1">
                    {(["1:1", "1:2", "2:3", "3:4"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setCrtXyRatio(r)}
                        className={`flex-1 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          crtXyRatio === r ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#121c15] p-3 rounded-xl border border-[#2d4734] space-y-1">
                <span className="text-[10px] text-emerald-400 font-bold uppercase">Phase Angle</span>
                <input
                  type="range"
                  min={0}
                  max={180}
                  step={5}
                  value={crtPhaseDeg}
                  onChange={(e) => setCrtPhaseDeg(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="text-[10px] text-emerald-300 text-right">{crtPhaseDeg}° Phase</div>
              </div>
            </div>
          </div>
        );
      }

      case "precision-dmm": {
        const diodeValMap = {
          "1N4148": "0.6842 V (Si)",
          "1N5819": "0.2418 V (Schottky)",
          LED_RED: "1.8740 V (Red LED)",
          OPEN: "O.L. V (Reverse/Open)",
        };
        const liveReadout =
          dmmFunction === "VDC"
            ? `+${dmmSimVoltage.toFixed(5)} V DC`
            : dmmFunction === "VAC"
            ? `${(dmmSimVoltage / Math.SQRT2).toFixed(5)} V AC`
            : dmmFunction === "IDC"
            ? `${((dmmSimVoltage / 100) * 1000).toFixed(3)} mA DC`
            : dmmFunction === "OHM"
            ? formatEngineeringOhms(dmmTestR)
            : dmmFunction === "CAP"
            ? `${dmmTestCapUf.toFixed(3)} µF`
            : dmmFunction === "DIODE"
            ? diodeValMap[dmmDiodePreset]
            : `${dmmTestFreqHz.toFixed(2)} Hz`;

        const displayedValue = dmmHold && dmmHeldDisplay ? dmmHeldDisplay : liveReadout;

        return (
          <div className="bg-[#151c2d] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 font-mono text-xs">
              <span className="font-bold text-white tracking-widest uppercase">
                FLUKE 8846A 6.5 DIGIT PRECISION MULTIMETER
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!dmmHold) {
                      setDmmHeldDisplay(liveReadout);
                      setDmmHold(true);
                    } else {
                      setDmmHold(false);
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded font-bold cursor-pointer border ${
                    dmmHold
                      ? "bg-amber-400 text-slate-950 border-amber-300"
                      : "bg-slate-800 text-slate-200 border-slate-700 hover:text-white"
                  }`}
                >
                  {dmmHold ? "HOLD ACTIVE" : "HOLD"}
                </button>
                <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[11px]">
                  True RMS Dual Display
                </span>
              </div>
            </div>

            <div className="bg-[#040e14] border-2 border-cyan-800/80 rounded-xl p-5 shadow-inner font-mono text-cyan-300 flex flex-col justify-between h-44">
              <div className="flex items-center justify-between text-xs text-cyan-500">
                <span>RANGE: AUTO</span>
                <span>SHUNT: {dmmFunction === "IDC" ? "100 Ω LOAD" : "10 MΩ INPUT Z"}</span>
                <span>{dmmHold ? "DISPLAY FROZEN" : "100 NPLC ACTIVE"}</span>
              </div>

              <div className="text-center my-auto">
                <div className="text-3xl sm:text-5xl font-extrabold tracking-widest text-cyan-300 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                  {displayedValue}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-cyan-400/80 border-t border-cyan-950 pt-2">
                <span>DC BUS: {(dmmSimVoltage * 1000).toFixed(1)} mV</span>
                <span>PK-PK EQUIV: {(dmmSimVoltage * 2.828).toFixed(4)} V</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-7 gap-2 pt-1">
              {[
                { id: "VDC", label: "DC V" },
                { id: "VAC", label: "AC V" },
                { id: "IDC", label: "DC I" },
                { id: "OHM", label: "Ω 4W" },
                { id: "CAP", label: "CAP" },
                { id: "DIODE", label: "DIODE" },
                { id: "FREQ", label: "FREQ" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    setDmmFunction(mode.id as any);
                    setDmmHold(false);
                  }}
                  className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    dmmFunction === mode.id
                      ? "bg-cyan-400 text-slate-950 font-extrabold shadow-md shadow-cyan-500/20"
                      : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {(dmmFunction === "VDC" || dmmFunction === "VAC" || dmmFunction === "IDC") && (
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">Input Voltage (across 100 Ω in IDC):</span>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.05}
                  value={dmmSimVoltage}
                  onChange={(e) => setDmmSimVoltage(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="font-bold text-cyan-300 w-20 text-right">{dmmSimVoltage.toFixed(2)} V</span>
              </div>
            )}
            {dmmFunction === "OHM" && (
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">DUT Resistance:</span>
                <input
                  type="range"
                  min={10}
                  max={100000}
                  step={10}
                  value={dmmTestR}
                  onChange={(e) => setDmmTestR(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="font-bold text-cyan-300 w-28 text-right">{formatEngineeringOhms(dmmTestR)}</span>
              </div>
            )}
            {dmmFunction === "CAP" && (
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">DUT Capacitance (µF):</span>
                <input
                  type="range"
                  min={0.1}
                  max={1000}
                  step={0.1}
                  value={dmmTestCapUf}
                  onChange={(e) => setDmmTestCapUf(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="font-bold text-cyan-300 w-24 text-right">{dmmTestCapUf.toFixed(2)} µF</span>
              </div>
            )}
            {dmmFunction === "DIODE" && (
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="text-slate-400 mr-2">Select Semiconductor DUT:</span>
                {(
                  [
                    { id: "1N4148", label: "1N4148 Silicon" },
                    { id: "1N5819", label: "1N5819 Schottky" },
                    { id: "LED_RED", label: "Red LED" },
                    { id: "OPEN", label: "Reverse Bias (Open)" },
                  ] as const
                ).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDmmDiodePreset(d.id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer ${
                      dmmDiodePreset === d.id ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
            {dmmFunction === "FREQ" && (
              <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 flex items-center gap-4 text-xs font-mono">
                <span className="text-slate-400">Input Signal Freq (Hz):</span>
                <input
                  type="range"
                  min={50}
                  max={100000}
                  step={50}
                  value={dmmTestFreqHz}
                  onChange={(e) => setDmmTestFreqHz(parseFloat(e.target.value))}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="font-bold text-cyan-300 w-28 text-right">{dmmTestFreqHz.toFixed(1)} Hz</span>
              </div>
            )}
          </div>
        );
      }

      case "analog-galvo-meter": {
        const isOverloaded = galvoReading > galvoRange;
        const clampedRatio = Math.min(1.06, Math.max(0, galvoReading / galvoRange));
        const needleDeg = clampedRatio * 80 - 40 + galvoZeroTrimDeg;
        const scaleTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((f) => Number((f * galvoRange).toFixed(1)));

        return (
          <div className="bg-[#1f1915] border-2 border-amber-900/60 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-amber-900/40 font-mono text-xs">
              <span className="font-bold text-amber-200 tracking-wider">
                SIMPSON 260 SERIES 8P TAUT-BAND VOLT-OHM-MILLIAMMETER
              </span>
              <div className="flex items-center gap-2">
                {isOverloaded && (
                  <span className="px-2 py-0.5 rounded bg-red-900/90 text-red-200 border border-red-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> OVERLOAD RELAY TRIPPED
                  </span>
                )}
                <span className="text-amber-500 font-semibold">20,000 Ω/V DC</span>
              </div>
            </div>

            <div className="relative w-full h-64 bg-[#f8f6e8] rounded-xl p-4 overflow-hidden border-4 border-amber-950 shadow-inner flex flex-col justify-end">
              <div className="absolute top-4 left-6 right-6 h-28 border-b-2 border-slate-400 flex flex-col justify-between text-slate-900 font-mono text-[11px]">
                <div className="w-full h-3 bg-gradient-to-r from-slate-300 via-slate-100 to-slate-300 border border-slate-400 rounded-sm my-auto opacity-75" />
                <div className="flex justify-between px-2 font-bold">
                  {scaleTicks.map((t, idx) => (
                    <span key={idx}>{t}V</span>
                  ))}
                </div>
              </div>

              <div className="relative z-10 w-full flex justify-center">
                <div
                  className="w-1 h-44 bg-red-600 origin-bottom transition-transform duration-200 shadow-md"
                  style={{ transform: `rotate(${needleDeg}deg)` }}
                />
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-600 mx-auto -mt-4 relative z-20 shadow-lg" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-slate-400 block">Full Scale Range:</span>
                <div className="flex gap-1.5">
                  {[2.5, 10, 50, 250].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setGalvoRange(r)}
                      className={`flex-1 py-1 rounded text-xs font-bold cursor-pointer ${
                        galvoRange === r ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {r}V
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Applied Voltage:</span>
                  <span className={`font-bold ${isOverloaded ? "text-red-400" : "text-amber-300"}`}>
                    {galvoReading.toFixed(1)} V
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(galvoRange * 1.2, 12)}
                  step={0.1}
                  value={galvoReading}
                  onChange={(e) => setGalvoReading(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 mt-1 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Zero Trim Screw:</span>
                  <span className="text-amber-300 font-bold">{galvoZeroTrimDeg.toFixed(1)}°</span>
                </div>
                <input
                  type="range"
                  min={-3}
                  max={3}
                  step={0.5}
                  value={galvoZeroTrimDeg}
                  onChange={(e) => setGalvoZeroTrimDeg(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 mt-1 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "arb-function-gen": {
        const fgPreviewPoints = Array.from({ length: 120 }, (_, i) => {
          const x = (i / 119) * 320;
          const phase = (i / 119) * Math.PI * 6;
          let raw = 0;
          if (!fgOutputEnabled) {
            raw = 0;
          } else if (fgType === "SINE") {
            raw = Math.sin(phase);
          } else if (fgType === "SQUARE") {
            raw = Math.sin(phase) >= 0 ? 1 : -1;
          } else if (fgType === "TRIANGLE") {
            const norm = ((i / 119) * 3) % 1;
            raw = norm < 0.5 ? 4 * norm - 1 : 3 - 4 * norm;
          } else if (fgType === "PULSE") {
            const norm = ((i / 119) * 3) % 1;
            raw = norm < 0.25 ? 1 : -1;
          } else {
            raw = Math.sin(i * 12.9898) * 0.65 + Math.cos(i * 78.233) * 0.35;
          }
          if (fgModulation === "AM" && fgOutputEnabled) {
            raw *= 0.55 + 0.45 * Math.sin((i / 119) * Math.PI * 2);
          } else if (fgModulation === "FM" && fgOutputEnabled && fgType !== "NOISE") {
            raw = Math.sin(phase + 2.2 * Math.sin((i / 119) * Math.PI * 2));
          }
          const v = fgOutputEnabled ? raw * (fgAmpVpp / 2) + fgOffsetV : 0;
          const y = 32 - Math.max(-28, Math.min(28, v * 3.2));
          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");

        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 font-mono text-xs">
              <span className="font-bold text-white tracking-widest uppercase">
                AGILENT 33250A 80MHz FUNCTION / ARBITRARY WAVEFORM GENERATOR
              </span>
              <button
                type="button"
                onClick={() => setFgOutputEnabled(!fgOutputEnabled)}
                className={`px-3 py-1 rounded text-[11px] font-bold cursor-pointer border ${
                  fgOutputEnabled
                    ? "bg-emerald-950 text-emerald-400 border-emerald-700"
                    : "bg-red-950 text-red-400 border-red-800"
                }`}
              >
                OUTPUT: {fgOutputEnabled ? "ON (50 Ω)" : "DISABLED"}
              </button>
            </div>

            <div className="bg-[#02131a] border-2 border-cyan-800 rounded-xl p-4 font-mono text-cyan-300 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-7 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between text-xs text-cyan-400">
                  <span>WAVE: {fgType}</span>
                  <span>MOD: {fgModulation}</span>
                  <span>Z_OUT: 50 Ω</span>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 tracking-wider">
                  {(fgFreqHz / 1000).toFixed(4)} kHz
                </div>
                <div className="text-xs text-cyan-500">
                  Amplitude: {fgAmpVpp.toFixed(2)} Vpp · Offset: {fgOffsetV >= 0 ? "+" : ""}
                  {fgOffsetV.toFixed(2)} Vdc
                </div>
              </div>
              <div className="md:col-span-5 bg-[#010b10] border border-cyan-900/70 rounded-lg p-2">
                <svg className="w-full h-16" viewBox="0 0 320 64">
                  <line x1="0" y1="32" x2="320" y2="32" stroke="#164e63" strokeDasharray="3 3" strokeWidth="1" />
                  <path d={fgPreviewPoints} fill="none" stroke={fgOutputEnabled ? "#22d3ee" : "#64748b"} strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold">WAVEFORM</span>
                <select
                  value={fgType}
                  onChange={(e) => setFgType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 cursor-pointer"
                >
                  <option value="SINE">Sine Wave</option>
                  <option value="SQUARE">Square 50%</option>
                  <option value="TRIANGLE">Triangle</option>
                  <option value="PULSE">Pulse Train</option>
                  <option value="NOISE">Gaussian Noise</option>
                </select>
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold">FREQUENCY (Hz)</span>
                <input
                  type="number"
                  min={1}
                  max={80000000}
                  value={fgFreqHz}
                  onChange={(e) => setFgFreqHz(Math.max(1, Number(e.target.value) || 1000))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold"
                />
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold">AMPLITUDE (Vpp)</span>
                <input
                  type="number"
                  min={0.1}
                  max={20}
                  step={0.5}
                  value={fgAmpVpp}
                  onChange={(e) => setFgAmpVpp(Math.max(0.1, Number(e.target.value) || 1.0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-300 font-bold"
                />
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-400">DC OFFSET</span>
                  <span className="text-cyan-300">{fgOffsetV.toFixed(1)}V</span>
                </div>
                <input
                  type="range"
                  min={-5}
                  max={5}
                  step={0.5}
                  value={fgOffsetV}
                  onChange={(e) => setFgOffsetV(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] font-bold">MODULATION</span>
                <div className="flex gap-1 mt-1">
                  {(["OFF", "AM", "FM"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setFgModulation(m)}
                      className={`flex-1 py-1 rounded text-xs font-bold cursor-pointer ${
                        fgModulation === m ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "dual-tracking-psu": {
        const effCh1SetV = psuCh1V;
        const effCh2SetV = psuTrackingMode === "SERIES" ? psuCh1V : psuCh2V;
        const safeLoadR = Math.max(0.5, psuLoadOhms);
        const ch1DemandI = effCh1SetV / safeLoadR;
        const ch1IsCC = psuOutputEnabled && ch1DemandI > psuCh1LimitA;
        const ch1ActualI = psuOutputEnabled ? Math.min(ch1DemandI, psuCh1LimitA) : 0;
        const ch1ActualV = psuOutputEnabled ? ch1ActualI * safeLoadR : 0;

        const ch2DemandI = effCh2SetV / safeLoadR;
        const ch2IsCC = psuOutputEnabled && ch2DemandI > psuCh2LimitA;
        const ch2ActualI = psuOutputEnabled ? Math.min(ch2DemandI, psuCh2LimitA) : 0;
        const ch2ActualV = psuOutputEnabled ? ch2ActualI * safeLoadR : 0;

        const ch3ActualV = psuOutputEnabled ? 5.0 : 0;
        const ch3ActualI = psuOutputEnabled ? 5.0 / Math.max(2, safeLoadR) : 0;

        const totalTrackV =
          psuTrackingMode === "SERIES"
            ? (ch1ActualV + ch2ActualV).toFixed(2) + " V SERIES"
            : psuTrackingMode === "PARALLEL"
            ? (ch1ActualI + ch2ActualI).toFixed(3) + " A PARALLEL"
            : "INDEPENDENT CH1/CH2";

        return (
          <div className="bg-[#101726] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700 font-mono text-xs">
              <span className="font-bold text-white tracking-widest uppercase">
                RIGOL DP832 TRIPLE-OUTPUT DC POWER SUPPLY
              </span>
              <div className="flex items-center gap-2">
                {(["INDEPENDENT", "SERIES", "PARALLEL"] as const).map((tm) => (
                  <button
                    key={tm}
                    type="button"
                    onClick={() => setPsuTrackingMode(tm)}
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                      psuTrackingMode === tm ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    {tm}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setPsuOutputEnabled(!psuOutputEnabled)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    psuOutputEnabled ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20" : "bg-red-500 text-white"
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{psuOutputEnabled ? "OUTPUT ON" : "OFF"}</span>
                </button>
              </div>
            </div>

            <div className="text-[11px] font-mono text-cyan-300 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800 flex justify-between">
              <span>TOPOLOGY: {totalTrackV}</span>
              <span>CONNECTED TEST LOAD: {psuLoadOhms.toFixed(1)} Ω</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="bg-[#030914] border-2 border-amber-500/50 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-amber-400">CH1 (0-30V)</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      !psuOutputEnabled
                        ? "bg-slate-800 text-slate-400"
                        : ch1IsCC
                        ? "bg-red-950 text-red-400 border border-red-700"
                        : "bg-emerald-950 text-emerald-400"
                    }`}
                  >
                    {!psuOutputEnabled ? "OFF" : ch1IsCC ? "CC LIMIT" : "CV MODE"}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-amber-300">{ch1ActualV.toFixed(2)} V</div>
                <div className="text-lg font-bold text-amber-400/80">{ch1ActualI.toFixed(3)} A</div>
                <div className="text-xs text-slate-400">P: {(ch1ActualV * ch1ActualI).toFixed(2)} W · Ilim {psuCh1LimitA.toFixed(2)}A</div>
              </div>

              <div className="bg-[#030914] border-2 border-cyan-500/50 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-cyan-400">CH2 ({psuTrackingMode === "SERIES" ? "TRACKING" : "0-30V"})</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      !psuOutputEnabled
                        ? "bg-slate-800 text-slate-400"
                        : ch2IsCC
                        ? "bg-red-950 text-red-400 border border-red-700"
                        : "bg-emerald-950 text-emerald-400"
                    }`}
                  >
                    {!psuOutputEnabled ? "OFF" : ch2IsCC ? "CC LIMIT" : "CV MODE"}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-cyan-300">{ch2ActualV.toFixed(2)} V</div>
                <div className="text-lg font-bold text-cyan-400/80">{ch2ActualI.toFixed(3)} A</div>
                <div className="text-xs text-slate-400">P: {(ch2ActualV * ch2ActualI).toFixed(2)} W · Ilim {psuCh2LimitA.toFixed(2)}A</div>
              </div>

              <div className="bg-[#030914] border-2 border-emerald-500/50 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-emerald-400">CH3 (5V FIXED)</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px] font-bold">
                    {psuOutputEnabled ? "LOGIC VCC" : "OFF"}
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-emerald-300">{ch3ActualV.toFixed(2)} V</div>
                <div className="text-lg font-bold text-emerald-400/80">{ch3ActualI.toFixed(3)} A</div>
                <div className="text-xs text-slate-400">P: {(ch3ActualV * ch3ActualI).toFixed(2)} W</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs pt-1">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>CH1 V / I_limit:</span>
                  <span className="font-bold text-amber-300">{psuCh1V.toFixed(1)}V / {psuCh1LimitA.toFixed(2)}A</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={psuCh1V}
                  onChange={(e) => setPsuCh1V(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <input
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={psuCh1LimitA}
                  onChange={(e) => setPsuCh1LimitA(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>CH2 V / I_limit:</span>
                  <span className="font-bold text-cyan-300">{effCh2SetV.toFixed(1)}V / {psuCh2LimitA.toFixed(2)}A</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={0.5}
                  value={effCh2SetV}
                  disabled={psuTrackingMode === "SERIES"}
                  onChange={(e) => setPsuCh2V(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
                />
                <input
                  type="range"
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={psuCh2LimitA}
                  onChange={(e) => setPsuCh2LimitA(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-300">
                  <span>Test Load R:</span>
                  <span className="font-bold text-emerald-300">{psuLoadOhms.toFixed(1)} Ω</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={psuLoadOhms}
                  onChange={(e) => setPsuLoadOhms(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="text-[10px] text-slate-400">Lower load R triggers automatic CC current-limit crossover</div>
              </div>
            </div>
          </div>
        );
      }

      case "three-phase-source": {
        const vPhase = threePhaseConfig === "WYE" ? threePhaseV / Math.sqrt(3) : threePhaseV;
        const apparentVA = Math.sqrt(3) * threePhaseV * threePhaseLoadA;
        return (
          <div className="bg-[#101726] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-widest uppercase">
                CHROMA 61702 THREE-PHASE AC POWER SOURCE
              </span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                {threePhaseConfig} ({threePhaseConfig === "WYE" ? "3P4W" : "3P3W"}) · {threePhaseFreq} Hz
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-7 bg-[#030712] border border-cyan-900/70 rounded-xl p-3">
                <svg className="w-full h-44" viewBox="0 0 360 140">
                  <line x1="0" y1="70" x2="360" y2="70" stroke="#1e293b" strokeWidth="1" />
                  {[
                    { offsetDeg: 0, color: "#facc15", label: "L1 (0°)" },
                    { offsetDeg: 120, color: "#22d3ee", label: "L2 (-120°)" },
                    { offsetDeg: 240, color: "#c084fc", label: "L3 (-240°)" },
                  ].map((ph) => (
                    <path
                      key={ph.label}
                      d={Array.from({ length: 90 }, (_, i) => {
                        const x = (i / 89) * 360;
                        const theta = (i / 89) * Math.PI * 4 - (ph.offsetDeg * Math.PI) / 180 + tick * 0.1;
                        const y = 70 - Math.sin(theta) * (threePhaseV / 480) * 56;
                        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                      }).join(" ")}
                      fill="none"
                      stroke={ph.color}
                      strokeWidth="2.2"
                    />
                  ))}
                </svg>
                <div className="flex justify-center gap-4 text-[11px] mt-1">
                  <span className="text-yellow-400">● L1 (0°)</span>
                  <span className="text-cyan-400">● L2 (-120°)</span>
                  <span className="text-purple-400">● L3 (-240°)</span>
                </div>
              </div>

              <div className="md:col-span-5 bg-[#030914] border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Line-to-Line V_LL:</span>
                  <span className="text-cyan-300 font-bold">{threePhaseV} Vrms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Phase Voltage V_φ:</span>
                  <span className="text-yellow-300 font-bold">{vPhase.toFixed(1)} Vrms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Balanced Line Current:</span>
                  <span className="text-emerald-300 font-bold">{threePhaseLoadA.toFixed(1)} A</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Neutral Current I_N:</span>
                  <span className="text-slate-200 font-bold">{threePhaseConfig === "WYE" ? "0.00 A (Balanced)" : "N/A (Delta)"}</span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-400">3-Phase Apparent Power:</span>
                  <span className="text-white font-extrabold">{(apparentVA / 1000).toFixed(2)} kVA</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">V_LL Setting</span>
                  <span className="text-cyan-300 font-bold">{threePhaseV} V</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={480}
                  step={5}
                  value={threePhaseV}
                  onChange={(e) => setThreePhaseV(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Line Load (A)</span>
                  <span className="text-emerald-300 font-bold">{threePhaseLoadA} A</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={threePhaseLoadA}
                  onChange={(e) => setThreePhaseLoadA(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Frequency</span>
                <div className="flex gap-1.5">
                  {([50, 60, 400] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setThreePhaseFreq(f)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        threePhaseFreq === f ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {f}Hz
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Topology</span>
                <div className="flex gap-1.5">
                  {(["WYE", "DELTA"] as const).map((top) => (
                    <button
                      key={top}
                      type="button"
                      onClick={() => setThreePhaseConfig(top)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        threePhaseConfig === top ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {top === "WYE" ? "Wye (Y)" : "Delta (Δ)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "rf-signal-gen": {
        const powerWatts = 0.001 * Math.pow(10, rfLevelDbm / 10);
        const vRmsVolts = Math.sqrt(powerWatts * 50);
        const vDisplay = vRmsVolts >= 1 ? `${vRmsVolts.toFixed(3)} Vrms` : `${(vRmsVolts * 1000).toFixed(3)} mVrms`;
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-widest uppercase">
                ROHDE &amp; SCHWARZ SMB100A RF SYNTHESIZER
              </span>
              <button
                type="button"
                onClick={() => setRfOutputOn(!rfOutputOn)}
                className={`px-3 py-1 rounded font-bold cursor-pointer ${
                  rfOutputOn ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
                }`}
              >
                RF {rfOutputOn ? "ON" : "OFF"}
              </button>
            </div>

            <div className="bg-[#030b16] border-2 border-cyan-800/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <div className="text-[10px] text-cyan-500 uppercase">Carrier Frequency</div>
                <div className="text-3xl font-extrabold text-cyan-300">{rfFreqMHz.toFixed(3)} MHz</div>
                <div className="text-xs text-slate-400 mt-1">Modulation: {rfModMode} · Z₀ = 50 Ω</div>
              </div>
              <div className="sm:text-right">
                <div className="text-[10px] text-amber-400 uppercase">Calibrated Output Level</div>
                <div className="text-3xl font-extrabold text-amber-300">
                  {rfOutputOn ? `${rfLevelDbm.toFixed(1)} dBm` : "RF MUTED"}
                </div>
                <div className="text-xs text-emerald-300 mt-1">50 Ω Voltage: {rfOutputOn ? vDisplay : "0.000 mV"}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Freq (MHz)</span>
                  <span className="text-cyan-300 font-bold">{rfFreqMHz.toFixed(1)} MHz</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3200}
                  step={1}
                  value={rfFreqMHz}
                  onChange={(e) => setRfFreqMHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Level (dBm)</span>
                  <span className="text-amber-300 font-bold">{rfLevelDbm.toFixed(1)} dBm</span>
                </div>
                <input
                  type="range"
                  min={-120}
                  max={18}
                  step={0.5}
                  value={rfLevelDbm}
                  onChange={(e) => setRfLevelDbm(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Modulation Scheme</span>
                <div className="grid grid-cols-4 gap-1">
                  {(["CW", "AM", "FM", "PULSE"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setRfModMode(m)}
                      className={`py-1 rounded font-bold cursor-pointer ${
                        rfModMode === m ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "logic-analyzer-16ch": {
        const protocolPayloads = {
          I2C: ["START", "ADDR 0x48 (W)", "ACK", "DATA 0x2F", "ACK", "DATA 0xA4", "STOP"],
          SPI: ["CS LOW", "MOSI 0x9F", "MISO 0xEF", "DATA 0x40", "DATA 0x18", "CS HIGH"],
          UART: ["IDLE", "START", "0x55 ('U')", "STOP", "START", "0x49 ('I')", "STOP"],
          CAN: ["SOF", "ID 0x3A2", "DLC 4", "0x11 0x22", "CRC OK", "EOF"],
        }[laProtocol];
        const phaseShift = laRunning ? Math.floor(tick / 4) : 0;
        return (
          <div className="bg-[#0e1422] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">SALEAE LOGIC PRO 16 · PROTOCOL DECODER</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-cyan-400">{laSampleMhz} MSa/s</span>
                <button
                  type="button"
                  onClick={() => setLaRunning(!laRunning)}
                  className={`px-3 py-1 rounded font-bold cursor-pointer ${
                    laRunning ? "bg-emerald-500 text-slate-950" : "bg-amber-400 text-slate-950"
                  }`}
                >
                  {laRunning ? "CAPTURING" : "HOLD TRIGGER"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const usPerStep = 1 / Math.max(1, laSampleMhz);
                    const rows = Array.from({ length: 24 }, (_, step) => {
                      const bits = Array.from({ length: 8 }, (_, ch) =>
                        ch === 0
                          ? (step + phaseShift) % 2
                          : ((step + phaseShift) >> (ch % 4)) & 1
                      );
                      return [step, (step * usPerStep).toFixed(6), ...bits];
                    });
                    downloadRackCsv(
                      `la16-${slotKey}`,
                      `saleae_logic_pro16_${laProtocol.toLowerCase()}_${Date.now()}.csv`,
                      ["Sample", "Time_us", "D0", "D1", "D2", "D3", "D4", "D5", "D6", "D7"],
                      rows
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 font-bold cursor-pointer"
                  title="Download 8-channel logic capture as CSV for Excel or MATLAB"
                >
                  {rackCsvSuccessKey === `la16-${slotKey}` ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 text-cyan-300" />
                      <span>Download CSV</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="bg-[#030712] border border-cyan-900/70 rounded-xl p-3 space-y-2">
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {protocolPayloads.map((tok, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-200 font-bold">
                    {tok}
                  </span>
                ))}
              </div>
              <svg className="w-full h-44" viewBox="0 0 480 176">
                {Array.from({ length: 8 }, (_, ch) => {
                  const yBase = 18 + ch * 20;
                  const colors = ["#22d3ee", "#facc15", "#4ade80", "#c084fc", "#f472b6", "#38bdf8", "#a3e635", "#fb923c"];
                  const points = Array.from({ length: 24 }, (_, step) => {
                    const x0 = step * 20;
                    const x1 = x0 + 20;
                    const bit = ch === 0 ? (step + phaseShift) % 2 : ((step + phaseShift) >> (ch % 4)) & 1;
                    const prevBit = ch === 0 ? (step - 1 + phaseShift) % 2 : ((step - 1 + phaseShift) >> (ch % 4)) & 1;
                    const y = bit ? yBase - 11 : yBase;
                    const py = prevBit ? yBase - 11 : yBase;
                    return `${step === 0 ? `M ${x0} ${y}` : `L ${x0} ${py} L ${x0} ${y}`} L ${x1} ${y}`;
                  }).join(" ");
                  return (
                    <g key={ch}>
                      <text x={2} y={yBase - 2} fill={colors[ch]} fontSize="9" fontFamily="monospace">
                        D{ch}
                      </text>
                      <g transform="translate(22, 0)">
                        <path d={points} fill="none" stroke={colors[ch]} strokeWidth="1.8" />
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Bus Protocol Analyzer</span>
                <div className="flex gap-1.5">
                  {(["I2C", "SPI", "UART", "CAN"] as const).map((proto) => (
                    <button
                      key={proto}
                      type="button"
                      onClick={() => setLaProtocol(proto)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        laProtocol === proto ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {proto}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Sample Clock Speed</span>
                <div className="flex gap-1.5">
                  {[10, 25, 100, 500].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLaSampleMhz(s)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        laSampleMhz === s ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {s}M
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "precision-lcr-meter": {
        const freqHzMap = { "100Hz": 100, "1kHz": 1000, "10kHz": 10000, "100kHz": 100000, "1MHz": 1000000 };
        const fHz = freqHzMap[lcrFreq];
        const omega = 2 * Math.PI * fHz;
        let xVal = 0;
        let rVal = lcrEsrOhms;
        if (lcrTargetComp === "CAP") {
          const capF = lcrNominalVal * 1e-6;
          xVal = -1 / (omega * capF);
        } else if (lcrTargetComp === "IND") {
          const indH = lcrNominalVal * 1e-3;
          xVal = omega * indH;
        } else {
          rVal = lcrNominalVal * 1000;
          xVal = omega * 2e-6; // small parasitic wire inductance
        }
        const magZ = Math.hypot(rVal, xVal);
        const thetaDeg = (Math.atan2(xVal, rVal) * 180) / Math.PI;
        const qFactor = Math.abs(xVal) / Math.max(1e-6, rVal);
        const dFactor = rVal / Math.max(1e-6, Math.abs(xVal));

        return (
          <div className="bg-[#121929] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">KEYSIGHT E4980AL PRECISION LCR METER</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                4-WIRE KELVIN · {lcrFreq} ({lcrEquivModel})
              </span>
            </div>

            <div className="bg-[#030d14] border-2 border-cyan-800 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400">PRIMARY ({lcrTargetComp})</div>
                <div className="text-xl font-extrabold text-cyan-300">
                  {lcrTargetComp === "CAP" ? `${lcrNominalVal} µF` : lcrTargetComp === "IND" ? `${lcrNominalVal} mH` : `${lcrNominalVal} kΩ`}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">|Z| IMPEDANCE</div>
                <div className="text-xl font-extrabold text-amber-300">{formatEngineeringOhms(magZ)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">PHASE ANGLE θ</div>
                <div className="text-xl font-extrabold text-emerald-300">{thetaDeg.toFixed(2)}°</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Q / DISSIPATION D</div>
                <div className="text-sm font-bold text-purple-300 mt-1">
                  Q={qFactor.toFixed(2)} · D={dFactor.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <span className="text-slate-400 block">DUT Component &amp; Model</span>
                <div className="flex gap-1">
                  {(["CAP", "IND", "RES"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setLcrTargetComp(c)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        lcrTargetComp === c ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 pt-1">
                  {(["SERIES", "PARALLEL"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLcrEquivModel(m)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        lcrEquivModel === m ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Test Frequency</span>
                <div className="grid grid-cols-3 gap-1">
                  {(["100Hz", "1kHz", "10kHz", "100kHz", "1MHz"] as const).map((fr) => (
                    <button
                      key={fr}
                      type="button"
                      onClick={() => setLcrFreq(fr)}
                      className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                        lcrFreq === fr ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {fr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Nominal Value:</span>
                  <span className="text-cyan-300 font-bold">{lcrNominalVal}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={lcrNominalVal}
                  onChange={(e) => setLcrNominalVal(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between">
                  <span className="text-slate-400">ESR (Ω):</span>
                  <span className="text-amber-300">{lcrEsrOhms.toFixed(1)} Ω</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={25}
                  step={0.1}
                  value={lcrEsrOhms}
                  onChange={(e) => setLcrEsrOhms(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "rf-spectrum-analyzer": {
        const noiseFloorDbm = Math.round(-134 + 10 * Math.log10(saRbwKhz));
        const specPoints = Array.from({ length: 140 }, (_, i) => {
          const frac = i / 139;
          const x = frac * 480;
          const freq = saCenterMHz - saSpanMHz / 2 + frac * saSpanMHz;
          const distMain = Math.abs(freq - 433.92);
          const distSpur1 = Math.abs(freq - 437.5);
          const distSpur2 = Math.abs(freq - 429.0);
          const peakMain = Math.exp(-(distMain * distMain) / 0.12) * 92;
          const spur1 = Math.exp(-(distSpur1 * distSpur1) / 0.08) * 44;
          const spur2 = Math.exp(-(distSpur2 * distSpur2) / 0.08) * 32;
          const jitter = Math.sin(i * 19.3 + tick * 0.4) * 3.5;
          const dbm = Math.min(-4, noiseFloorDbm + peakMain + spur1 + spur2 + jitter);
          const y = Math.max(10, Math.min(155, ((-dbm) / 140) * 155));
          return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
        }).join(" ");
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">R&amp;S FSL3 SPECTRUM ANALYZER (9kHz - 3GHz)</span>
              <span className="text-amber-300 font-bold">MKR1: 433.92 MHz · -12.4 dBm</span>
            </div>

            <div className="bg-[#030712] border-2 border-cyan-900 rounded-xl p-3 space-y-2">
              <svg className="w-full h-44" viewBox="0 0 480 160">
                {[30, 60, 90, 120].map((y) => (
                  <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#164e63" strokeWidth="0.6" strokeDasharray="3 3" />
                ))}
                <path d={specPoints} fill="none" stroke="#facc15" strokeWidth="2" />
              </svg>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>CENTER: {saCenterMHz.toFixed(2)} MHz</span>
                <span>SPAN: {saSpanMHz} MHz</span>
                <span>RBW: {saRbwKhz} kHz</span>
                <span>NOISE FLOOR: {noiseFloorDbm} dBm</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Center MHz</span>
                  <span className="text-cyan-300">{saCenterMHz.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={420}
                  max={450}
                  step={0.1}
                  value={saCenterMHz}
                  onChange={(e) => setSaCenterMHz(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Span MHz</span>
                  <span className="text-cyan-300">{saSpanMHz} MHz</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={50}
                  step={1}
                  value={saSpanMHz}
                  onChange={(e) => setSaSpanMHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Resolution BW (RBW)</span>
                <div className="flex gap-1.5">
                  {[1, 10, 100, 1000].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSaRbwKhz(r)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        saRbwKhz === r ? "bg-yellow-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {r === 1000 ? "1M" : `${r}k`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "curve-tracer": {
        const steps = [1, 2, 3, 4, 5];
        return (
          <div className="bg-[#111a18] border-2 border-emerald-900/60 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40 text-xs">
              <span className="font-bold text-emerald-300 tracking-wider">TEKTRONIX 576 SEMICONDUCTOR CURVE TRACER</span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                {curveDevType === "BJT_NPN" ? "β = 150 · Va = 80V" : "Vth = 1.8V · K = 1.4 A/V²"}
              </span>
            </div>

            <div className="bg-[#02120b] border-2 border-emerald-900 rounded-xl p-3">
              <svg className="w-full h-48" viewBox="0 0 420 180">
                <line x1="30" y1="155" x2="405" y2="155" stroke="#10b981" strokeWidth="1" opacity="0.5" />
                <line x1="30" y1="15" x2="30" y2="155" stroke="#10b981" strokeWidth="1" opacity="0.5" />
                {steps.map((s) => {
                  const pathD = Array.from({ length: 60 }, (_, idx) => {
                    const v = (idx / 59) * curveSweepMaxV;
                    let iMa = 0;
                    if (curveDevType === "BJT_NPN") {
                      const ibUa = s * curveStepVal;
                      iMa = (150 * ibUa * 1e-3) * (1 - Math.exp(-v / 0.18)) * (1 + v / 80);
                    } else {
                      const vgs = 1.5 + s * (curveStepVal / 40);
                      const vov = Math.max(0, vgs - 1.8);
                      iMa = v < vov ? 1.4 * ((vov * v - 0.5 * v * v) * 8) : 0.7 * (vov * vov * 8) * (1 + 0.02 * v);
                    }
                    const x = 30 + (v / curveSweepMaxV) * 370;
                    const y = Math.max(15, 155 - Math.min(25, iMa) * 5.2);
                    return `${idx === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(" ");
                  return <path key={s} d={pathD} fill="none" stroke="#34d399" strokeWidth="2" opacity={0.45 + s * 0.11} />;
                })}
              </svg>
              <div className="flex justify-between text-[11px] text-emerald-400 px-2">
                <span>0 V (Collector / Drain Sweep to {curveSweepMaxV}V)</span>
                <span>Step: {curveDevType === "BJT_NPN" ? `${curveStepVal} µA Ib` : `${(curveStepVal / 40).toFixed(2)} V Vgs`}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">DUT Polarity / Model</span>
                <div className="flex gap-1.5">
                  {(["BJT_NPN", "MOSFET_N"] as const).map((dt) => (
                    <button
                      key={dt}
                      type="button"
                      onClick={() => setCurveDevType(dt)}
                      className={`flex-1 py-1 rounded font-bold cursor-pointer ${
                        curveDevType === dt ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max V_sweep</span>
                  <span className="text-emerald-300 font-bold">{curveSweepMaxV} V</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={50}
                  step={5}
                  value={curveSweepMaxV}
                  onChange={(e) => setCurveSweepMaxV(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Step Drive</span>
                  <span className="text-emerald-300 font-bold">
                    {curveDevType === "BJT_NPN" ? `${curveStepVal} µA` : `${(curveStepVal / 40).toFixed(2)} V`}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={50}
                  step={5}
                  value={curveStepVal}
                  onChange={(e) => setCurveStepVal(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "electronic-dc-load": {
        const sinkAmps = !dcLoadEnabled
          ? 0
          : dcLoadMode === "CC"
          ? Math.min(30, dcLoadSetpoint)
          : dcLoadMode === "CV"
          ? Math.max(0, (dcLoadSourceV - dcLoadSetpoint) * 2.5)
          : dcLoadMode === "CR"
          ? dcLoadSourceV / Math.max(0.5, dcLoadSetpoint)
          : dcLoadSetpoint / Math.max(1, dcLoadSourceV);
        const sinkWatts = dcLoadSourceV * sinkAmps;
        const unitLabel = dcLoadMode === "CC" ? "A" : dcLoadMode === "CV" ? "V" : dcLoadMode === "CR" ? "Ω" : "W";
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">BK PRECISION 8500 PROGRAMMABLE DC ELECTRONIC LOAD</span>
              <button
                type="button"
                onClick={() => setDcLoadEnabled(!dcLoadEnabled)}
                className={`px-3 py-1 rounded font-bold cursor-pointer ${
                  dcLoadEnabled ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
                }`}
              >
                INPUT {dcLoadEnabled ? "ON" : "OFF"}
              </button>
            </div>

            <div className="bg-[#030914] border-2 border-amber-500/40 rounded-xl p-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-400">TERMINAL VOLTAGE</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-amber-300">{dcLoadSourceV.toFixed(2)} V</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">SINK CURRENT ({dcLoadMode})</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300">{sinkAmps.toFixed(3)} A</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">DISSIPATED POWER</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300">{sinkWatts.toFixed(2)} W</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Operating Mode</span>
                <div className="grid grid-cols-4 gap-1">
                  {(["CC", "CV", "CR", "CP"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDcLoadMode(m)}
                      className={`py-1 rounded font-bold cursor-pointer ${
                        dcLoadMode === m ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">DUT Voltage</span>
                  <span className="text-amber-300 font-bold">{dcLoadSourceV.toFixed(1)} V</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={0.5}
                  value={dcLoadSourceV}
                  onChange={(e) => setDcLoadSourceV(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Setpoint ({unitLabel})</span>
                  <span className="text-cyan-300 font-bold">
                    {dcLoadSetpoint.toFixed(1)} {unitLabel}
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={dcLoadMode === "CP" ? 150 : 25}
                  step={0.5}
                  value={dcLoadSetpoint}
                  onChange={(e) => setDcLoadSetpoint(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "vna-vector-network": {
        const z0 = 50;
        const rn = vnaMarkerZ.r / z0;
        const xn = vnaMarkerZ.x / z0;
        // Gamma = ((r-1) + jx) / ((r+1) + jx)
        const den = (rn + 1) * (rn + 1) + xn * xn;
        const gammaRe = ((rn - 1) * (rn + 1) + xn * xn) / den;
        const gammaIm = (2 * xn) / den;
        const gammaMag = Math.min(0.999, Math.hypot(gammaRe, gammaIm));
        const s11Db = 20 * Math.log10(Math.max(1e-4, gammaMag));
        const vswr = (1 + gammaMag) / Math.max(1e-4, 1 - gammaMag);
        const cx = 110 + gammaRe * 90;
        const cy = 110 - gammaIm * 90;

        return (
          <div className="bg-[#101726] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">NANOVNA-F V2 VECTOR NETWORK ANALYZER</span>
              <span className="text-cyan-300 font-bold">{vnaFreqMHz} MHz · Z₀ = 50 Ω</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-5 flex justify-center bg-[#030914] border border-cyan-900/70 rounded-xl p-3">
                <svg className="w-52 h-52" viewBox="0 0 220 220">
                  <circle cx="110" cy="110" r="90" fill="none" stroke="#334155" strokeWidth="1.5" />
                  <circle cx="155" cy="110" r="45" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <circle cx="132.5" cy="110" r="67.5" fill="none" stroke="#1e293b" strokeWidth="1" />
                  <line x1="20" y1="110" x2="200" y2="110" stroke="#334155" strokeWidth="1" />
                  <line x1="110" y1="20" x2="110" y2="200" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                  <circle cx="110" cy="110" r="3" fill="#22d3ee" />
                  <line x1="110" y1="110" x2={cx} y2={cy} stroke="#facc15" strokeWidth="1.5" strokeDasharray="3 2" />
                  <circle cx={cx} cy={cy} r="6" fill="#facc15" stroke="#0f172a" strokeWidth="2" />
                </svg>
              </div>

              <div className="md:col-span-7 bg-[#030914] border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Load Impedance Z_L:</span>
                  <span className="text-yellow-300 font-extrabold">
                    {vnaMarkerZ.r} {vnaMarkerZ.x >= 0 ? "+" : "-"} j{Math.abs(vnaMarkerZ.x)} Ω
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Reflection Coefficient |Γ|:</span>
                  <span className="text-cyan-300 font-bold">{gammaMag.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">S11 Return Loss:</span>
                  <span className="text-emerald-300 font-bold">{s11Db.toFixed(2)} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Standing Wave Ratio (VSWR):</span>
                  <span className="text-white font-extrabold">{vswr.toFixed(2)} : 1</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Freq (MHz)</span>
                  <span className="text-cyan-300">{vnaFreqMHz} MHz</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={1500}
                  step={5}
                  value={vnaFreqMHz}
                  onChange={(e) => setVnaFreqMHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Real R (Ω)</span>
                  <span className="text-yellow-300">{vnaMarkerZ.r} Ω</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={200}
                  step={1}
                  value={vnaMarkerZ.r}
                  onChange={(e) => setVnaMarkerZ((z) => ({ ...z, r: Number(e.target.value) }))}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Reactance jX (Ω)</span>
                  <span className="text-yellow-300">{vnaMarkerZ.x} Ω</span>
                </div>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={vnaMarkerZ.x}
                  onChange={(e) => setVnaMarkerZ((z) => ({ ...z, x: Number(e.target.value) }))}
                  className="w-full accent-yellow-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "precision-smu": {
        const calcSmuCurrentMa = (v: number) => {
          if (smuDut === "RES_10K") return (v / 10000) * 1000;
          if (smuDut === "ZENER") {
            if (v >= 0) return v > 0.65 ? Math.exp((v - 0.65) / 0.04) * 1.5 : 0;
            return v < -5.1 ? -Math.exp((-v - 5.1) / 0.05) * 4.0 : 0;
          }
          const vf = smuDut === "LED_BLUE" ? 2.65 : 0.62;
          return v > vf ? Math.exp((v - vf) / 0.055) * 1.2 : 0;
        };
        const rawMa = calcSmuCurrentMa(smuSourceV);
        const isCompliant = Math.abs(rawMa) >= smuComplianceMa;
        const clampedMa = Math.sign(rawMa) * Math.min(Math.abs(rawMa), smuComplianceMa);
        return (
          <div className="bg-[#101726] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">KEITHLEY 2400 SOURCE MEASURE UNIT (4-QUADRANT)</span>
              <span className={`px-2 py-0.5 rounded font-bold ${isCompliant ? "bg-red-900 text-red-200" : "bg-emerald-950 text-emerald-400"}`}>
                {isCompliant ? "COMPLIANCE HIT" : "SOURCE V · MEAS I"}
              </span>
            </div>

            <div className="bg-[#030914] border-2 border-cyan-800 rounded-xl p-5 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-400">SOURCE VOLTAGE</div>
                <div className="text-3xl font-extrabold text-cyan-300">{smuSourceV >= 0 ? "+" : ""}{smuSourceV.toFixed(3)} V</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">MEASURED CURRENT</div>
                <div className="text-3xl font-extrabold text-emerald-300">
                  {Math.abs(clampedMa) < 0.01 ? `${(clampedMa * 1000).toFixed(2)} µA` : `${clampedMa.toFixed(4)} mA`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Connected Semiconductor DUT</span>
                <div className="grid grid-cols-2 gap-1">
                  {(["DIODE", "ZENER", "LED_BLUE", "RES_10K"] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSmuDut(d)}
                      className={`py-1 rounded text-[10px] font-bold cursor-pointer ${
                        smuDut === d ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Sweep V</span>
                  <span className="text-cyan-300">{smuSourceV.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min={-6.5}
                  max={4.0}
                  step={0.05}
                  value={smuSourceV}
                  onChange={(e) => setSmuSourceV(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Compliance (mA)</span>
                  <span className="text-amber-300">{smuComplianceMa} mA</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  step={1}
                  value={smuComplianceMa}
                  onChange={(e) => setSmuComplianceMa(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "audio-distortion-analyzer": {
        const thdPct = 0.002 + Math.pow(audioOverdrivePct / 100, 1.8) * 14.5;
        const thdDb = 20 * Math.log10(thdPct / 100);
        const sinadDb = -thdDb;
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">AUDIO PRECISION APx500 THD+N ANALYZER</span>
              <span className="text-cyan-300">TEST TONE: {audioFreqHz} Hz</span>
            </div>

            <div className="bg-[#030914] border-2 border-purple-700/60 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400">THD+N RATIO</div>
                <div className="text-2xl font-extrabold text-purple-300">{thdPct.toFixed(4)} %</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">DISTORTION FLOOR</div>
                <div className="text-2xl font-extrabold text-cyan-300">{thdDb.toFixed(1)} dB</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">SINAD / SNR</div>
                <div className="text-2xl font-extrabold text-emerald-300">{sinadDb.toFixed(1)} dB</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Fundamental Freq</span>
                  <span className="text-cyan-300 font-bold">{audioFreqHz} Hz</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={20000}
                  step={20}
                  value={audioFreqHz}
                  onChange={(e) => setAudioFreqHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Amplifier Clipping / Drive</span>
                  <span className="text-purple-300 font-bold">{audioOverdrivePct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={audioOverdrivePct}
                  onChange={(e) => setAudioOverdrivePct(Number(e.target.value))}
                  className="w-full accent-purple-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "frequency-counter": {
        const periodUs = 1e6 / Math.max(1, fcInputHz);
        const posWidthUs = periodUs * (fcDutyPct / 100);
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">KEYSIGHT 53220A 10-DIGIT FREQUENCY COUNTER</span>
              <span className="text-emerald-400">GATE: {fcGateSec} s · OCXO LOCK</span>
            </div>

            <div className="bg-[#030914] border-2 border-cyan-800 rounded-xl p-5 text-center space-y-2">
              <div className="text-[10px] text-cyan-500">CH1 FREQUENCY</div>
              <div className="text-3xl sm:text-4xl font-extrabold text-cyan-300 tracking-wider">
                {fcInputHz >= 1e6 ? `${(fcInputHz / 1e6).toFixed(7)} MHz` : `${(fcInputHz / 1e3).toFixed(5)} kHz`}
              </div>
              <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-300 pt-2 border-t border-slate-800">
                <span>PERIOD: {periodUs < 1 ? `${(periodUs * 1000).toFixed(2)} ns` : `${periodUs.toFixed(3)} µs`}</span>
                <span>+WIDTH: {(posWidthUs * 1000).toFixed(1)} ns</span>
                <span>DUTY: {fcDutyPct.toFixed(1)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Input Freq (Hz)</span>
                <input
                  type="range"
                  min={1000}
                  max={50000000}
                  step={50000}
                  value={fcInputHz}
                  onChange={(e) => setFcInputHz(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Duty Cycle</span>
                  <span className="text-cyan-300">{fcDutyPct}%</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  step={0.5}
                  value={fcDutyPct}
                  onChange={(e) => setFcDutyPct(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Gate Time (s)</span>
                <div className="flex gap-1">
                  {([0.01, 0.1, 1, 10] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFcGateSec(g)}
                      className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        fcGateSec === g ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {g}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "power-meter-wattmeter": {
        const rad = (pmPhaseDeg * Math.PI) / 180;
        const pf = Math.cos(rad);
        const sVa = pmVrms * pmIrms;
        const pW = sVa * pf;
        const qVar = sVa * Math.sin(rad);
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">YOKOGAWA WT310E PRECISION POWER ANALYZER</span>
              <span className="text-emerald-400 font-bold">PF: {pf.toFixed(3)} ({pmPhaseDeg > 0 ? "LAGGING" : pmPhaseDeg < 0 ? "LEADING" : "UNITY"})</span>
            </div>

            <div className="bg-[#030914] border-2 border-emerald-700/60 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-400">ACTIVE POWER P</div>
                <div className="text-2xl font-extrabold text-emerald-300">{pW.toFixed(1)} W</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">REACTIVE Q</div>
                <div className="text-2xl font-extrabold text-amber-300">{qVar.toFixed(1)} VAR</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">APPARENT S</div>
                <div className="text-2xl font-extrabold text-cyan-300">{sVa.toFixed(1)} VA</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">POWER FACTOR</div>
                <div className="text-2xl font-extrabold text-white">{pf.toFixed(3)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Line Vrms</span>
                  <span className="text-cyan-300 font-bold">{pmVrms} V</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={250}
                  step={5}
                  value={pmVrms}
                  onChange={(e) => setPmVrms(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Load Irms</span>
                  <span className="text-amber-300 font-bold">{pmIrms.toFixed(1)} A</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={pmIrms}
                  onChange={(e) => setPmIrms(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Phase Angle θ</span>
                  <span className="text-emerald-300 font-bold">{pmPhaseDeg}°</span>
                </div>
                <input
                  type="range"
                  min={-60}
                  max={60}
                  step={1}
                  value={pmPhaseDeg}
                  onChange={(e) => setPmPhaseDeg(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "variac-isolation": {
        const outVac = (variacPct / 100) * 120;
        const loadI = outVac / Math.max(2, variacLoadOhms);
        const isTripped = variacBreakerTripped || loadI > 10;
        const dispVac = isTripped ? 0 : outVac;
        const dispI = isTripped ? 0 : loadI;
        return (
          <div className="bg-[#181512] border-2 border-amber-900/60 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-amber-900/40 text-xs">
              <span className="font-bold text-amber-200 tracking-wider">STACO VARIABLE AUTOTRANSFORMER &amp; ISOLATION STAGE</span>
              {isTripped ? (
                <button
                  type="button"
                  onClick={() => {
                    setVariacLoadOhms(Math.max(variacLoadOhms, 20));
                    setVariacBreakerTripped(false);
                  }}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> RESET 10A BREAKER
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-700">
                  GALVANICALLY ISOLATED · OK
                </span>
              )}
            </div>

            <div className="bg-[#080605] border-2 border-amber-900/70 rounded-xl p-5 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-[10px] text-amber-500">ISOLATED AC OUTPUT</div>
                <div className="text-3xl font-extrabold text-amber-300">{dispVac.toFixed(1)} Vac</div>
              </div>
              <div>
                <div className="text-[10px] text-amber-500">LOAD CURRENT</div>
                <div className={`text-3xl font-extrabold ${loadI > 10 ? "text-red-400" : "text-cyan-300"}`}>
                  {dispI.toFixed(2)} A
                </div>
              </div>
              <div>
                <div className="text-[10px] text-amber-500">DIAL SETTING</div>
                <div className="text-3xl font-extrabold text-white">{variacPct}%</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Variac Brush Position (0-140%)</span>
                  <span className="text-amber-300 font-bold">{outVac.toFixed(1)} Vac</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={140}
                  step={1}
                  value={variacPct}
                  onChange={(e) => setVariacPct(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Isolated Load Impedance (Ω)</span>
                  <span className="text-cyan-300 font-bold">{variacLoadOhms} Ω</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={250}
                  step={1}
                  value={variacLoadOhms}
                  onChange={(e) => setVariacLoadOhms(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case "decade-resistor-box":
        return (
          <div className="bg-[#181310] border-2 border-amber-900/50 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-amber-900/30 text-xs">
              <span className="font-bold text-amber-300 tracking-wider">
                IET LABS 1433 PRECISION DECADE RESISTANCE STANDARD
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[11px]">
                0.1% Calibration Grade
              </span>
            </div>

            <div className="bg-[#0c0805] border-2 border-amber-900/60 rounded-xl p-5 text-center shadow-inner">
              <div className="text-xs text-amber-500 uppercase tracking-widest">Active Equivalent Resistance</div>
              <div className="text-4xl sm:text-5xl font-extrabold text-amber-300 my-2 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
                {totalDecadeR.toLocaleString()} Ω
              </div>
              <div className="text-xs text-slate-400">
                ({(totalDecadeR / 1000).toFixed(3)} kΩ) · Max Dissipation: 0.5W/step
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "× 1,000 Ω", val: decadeR1k, set: setDecadeR1k, mult: 1000 },
                { label: "× 100 Ω", val: decadeR100, set: setDecadeR100, mult: 100 },
                { label: "× 10 Ω", val: decadeR10, set: setDecadeR10, mult: 10 },
                { label: "× 1 Ω", val: decadeR1, set: setDecadeR1, mult: 1 },
              ].map((dec) => (
                <div key={dec.label} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-center space-y-1.5">
                  <span className="text-xs font-bold text-amber-400">{dec.label}</span>
                  <div className="text-2xl font-extrabold text-white">{dec.val}</div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    value={dec.val}
                    onChange={(e) => dec.set(Number(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                  <div className="text-[11px] text-slate-400">{dec.val * dec.mult} Ω</div>
                </div>
              ))}
            </div>
          </div>
        );

      case "decade-capacitor-box": {
        const capF = Math.max(1e-12, totalDecadeCapPf * 1e-12);
        const xc1khz = 1 / (2 * Math.PI * 1000 * capF);
        const capLabel =
          totalDecadeCapPf >= 1e6
            ? `${(totalDecadeCapPf / 1e6).toFixed(4)} µF`
            : totalDecadeCapPf >= 1e3
            ? `${(totalDecadeCapPf / 1e3).toFixed(1)} nF`
            : `${totalDecadeCapPf} pF`;
        return (
          <div className="bg-[#111924] border-2 border-cyan-900/50 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-900/30 text-xs">
              <span className="font-bold text-cyan-300 tracking-wider">IET LABS 1412-BC DECADE CAPACITANCE BOX</span>
              <span className="text-slate-400">500V Film · Xc @ 1kHz = {formatEngineeringOhms(xc1khz)}</span>
            </div>

            <div className="bg-[#050b12] border-2 border-cyan-900/60 rounded-xl p-5 text-center">
              <div className="text-xs text-cyan-500 uppercase">Total Substitution Capacitance</div>
              <div className="text-4xl font-extrabold text-cyan-300 my-2">{capLabel}</div>
              <div className="text-xs text-slate-400">{totalDecadeCapPf.toLocaleString()} pF</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
              {[
                { label: "× 1 µF", val: capD1u, set: setCapD1u },
                { label: "× 100 nF", val: capD100n, set: setCapD100n },
                { label: "× 10 nF", val: capD10n, set: setCapD10n },
                { label: "× 1 nF", val: capD1n, set: setCapD1n },
                { label: "× 100 pF", val: capD100p, set: setCapD100p },
              ].map((d) => (
                <div key={d.label} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-cyan-400">{d.label}</span>
                  <div className="text-xl font-extrabold text-white">{d.val}</div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    value={d.val}
                    onChange={(e) => d.set(Number(e.target.value))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "decade-inductor-box": {
        const indH = totalDecadeIndMh / 1000;
        const xl1khz = 2 * Math.PI * 1000 * indH;
        return (
          <div className="bg-[#141722] border-2 border-purple-900/50 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-purple-900/30 text-xs">
              <span className="font-bold text-purple-300 tracking-wider">IET LABS 1491-G TOROIDAL DECADE INDUCTOR</span>
              <span className="text-slate-400">Xl @ 1kHz = {formatEngineeringOhms(xl1khz)}</span>
            </div>

            <div className="bg-[#070812] border-2 border-purple-900/60 rounded-xl p-5 text-center">
              <div className="text-xs text-purple-400 uppercase">Selected Toroidal Inductance</div>
              <div className="text-4xl font-extrabold text-purple-300 my-2">
                {indH >= 1 ? `${indH.toFixed(3)} H` : `${totalDecadeIndMh} mH`}
              </div>
              <div className="text-xs text-slate-400">Estimated DCR: {(totalDecadeIndMh * 0.045).toFixed(2)} Ω</div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: "× 1 H", val: indD1h, set: setIndD1h },
                { label: "× 100 mH", val: indD100m, set: setIndD100m },
                { label: "× 10 mH", val: indD10m, set: setIndD10m },
                { label: "× 1 mH", val: indD1m, set: setIndD1m },
              ].map((d) => (
                <div key={d.label} className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                  <span className="text-xs font-bold text-purple-400">{d.label}</span>
                  <div className="text-2xl font-extrabold text-white">{d.val}</div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    value={d.val}
                    onChange={(e) => d.set(Number(e.target.value))}
                    className="w-full accent-purple-400 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      }

      case "in-circuit-esr-meter": {
        const expectedMaxEsr = Math.max(0.15, 220 / Math.max(10, esrCapUf));
        const verdict =
          esrOhms <= expectedMaxEsr
            ? { text: "LOW ESR · HEALTHY CAPACITOR", cls: "text-emerald-300 bg-emerald-950 border-emerald-700" }
            : esrOhms <= expectedMaxEsr * 2.5
            ? { text: "ELEVATED ESR · AGED ELECTROLYTIC", cls: "text-amber-300 bg-amber-950 border-amber-700" }
            : { text: "HIGH ESR FAULT · REPLACE CAP", cls: "text-red-300 bg-red-950 border-red-700" };
        return (
          <div className="bg-[#181610] border-2 border-amber-700/50 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-amber-800/40 text-xs">
              <span className="font-bold text-amber-200 tracking-wider">PEAK ATLAS ESR70 IN-CIRCUIT ESR ANALYZER</span>
              <span className={`px-2 py-0.5 rounded border font-bold ${verdict.cls}`}>{verdict.text}</span>
            </div>

            <div className="bg-[#090805] border-2 border-amber-800/60 rounded-xl p-5 grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-[10px] text-slate-400">MEASURED ESR</div>
                <div className="text-4xl font-extrabold text-amber-300">{esrOhms.toFixed(2)} Ω</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">CAPACITANCE</div>
                <div className="text-4xl font-extrabold text-cyan-300">{esrCapUf} µF</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Simulated ESR (Ω)</span>
                  <span className="text-amber-300">{esrOhms.toFixed(2)} Ω</span>
                </div>
                <input
                  type="range"
                  min={0.02}
                  max={15}
                  step={0.02}
                  value={esrOhms}
                  onChange={(e) => setEsrOhms(parseFloat(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Quick DUT Presets</span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setEsrCapUf(470); setEsrOhms(0.18); }}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold cursor-pointer"
                  >
                    470µF Good
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEsrCapUf(100); setEsrOhms(1.4); }}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold cursor-pointer"
                  >
                    100µF Aged
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEsrCapUf(1000); setEsrOhms(6.8); }}
                    className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold cursor-pointer"
                  >
                    1000µF Faulty
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "logic-probe-injector": {
        const isHighLit = probeState === "HIGH" || (probeState === "PULSE" && Math.floor(tick / 4) % 2 === 0);
        const isLowLit = probeState === "LOW" || (probeState === "PULSE" && Math.floor(tick / 4) % 2 === 1);
        const isPulseLit = probeState === "PULSE";
        return (
          <div className="bg-[#121826] border-2 border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700 text-xs">
              <span className="font-bold text-white tracking-wider">ELENCO LP-560 LOGIC PROBE &amp; FP-1 PULSER</span>
              <span className="text-cyan-300 font-bold">
                FAMILY: {probeFamily} ({probeFamily === "TTL" ? "0.8V / 2.0V" : "1.5V / 3.5V"})
              </span>
            </div>

            <div className="bg-[#030914] border-2 border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-around gap-4">
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full border-2 ${isHighLit ? "bg-emerald-400 border-emerald-200 shadow-lg shadow-emerald-500/60" : "bg-emerald-950 border-emerald-900"}`} />
                <span className="text-sm font-bold text-emerald-300">HI (1)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full border-2 ${isLowLit ? "bg-red-500 border-red-300 shadow-lg shadow-red-500/60" : "bg-red-950 border-red-900"}`} />
                <span className="text-sm font-bold text-red-300">LO (0)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <div className={`w-6 h-6 rounded-full border-2 ${isPulseLit ? "bg-amber-400 border-amber-200 shadow-lg shadow-amber-500/60" : "bg-amber-950 border-amber-900"}`} />
                <span className="text-sm font-bold text-amber-300">PULSE ({pulserFreqHz}Hz)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Probed Circuit State</span>
                <div className="grid grid-cols-2 gap-1">
                  {(["HIGH", "LOW", "FLOAT", "PULSE"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setProbeState(st)}
                      className={`py-1 rounded font-bold cursor-pointer ${
                        probeState === st ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 block">Threshold Family</span>
                <div className="flex gap-1.5">
                  {(["TTL", "CMOS"] as const).map((fam) => (
                    <button
                      key={fam}
                      type="button"
                      onClick={() => setProbeFamily(fam)}
                      className={`flex-1 py-1.5 rounded font-bold cursor-pointer ${
                        probeFamily === fam ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {fam}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Pulser Inject ({pulserFreqHz}Hz)</span>
                  <span className="text-amber-300">{singleShotCount} shots</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSingleShotCount((c) => c + 1);
                      setProbeState("PULSE");
                    }}
                    className="flex-1 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold cursor-pointer"
                  >
                    Inject 1x Pulse
                  </button>
                  <button
                    type="button"
                    onClick={() => setPulserFreqHz(pulserFreqHz === 500 ? 10 : 500)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
                  >
                    {pulserFreqHz === 500 ? "10Hz" : "500Hz"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "soldering-station": {
        const pidDutyPct = Math.min(100, Math.max(8, Math.round(14 + Math.max(0, solderSetTemp - solderActualTemp) * 3.5 + (solderSetTemp - 200) * 0.14)));
        return (
          <div className="bg-[#111e28] border-2 border-cyan-800/60 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
            <div className="flex items-center justify-between pb-3 border-b border-cyan-800/40 text-xs">
              <span className="font-bold text-cyan-200 tracking-wider">
                HAKKO FX-888D PROFESSIONAL DIGITAL SOLDERING STATION
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                  Math.abs(solderSetTemp - solderActualTemp) <= 2
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : "bg-amber-950 text-amber-300 border-amber-700"
                }`}
              >
                {Math.abs(solderSetTemp - solderActualTemp) <= 2 ? "PID CONTROL: LOCKED" : "HEATER RAMPING"}
              </span>
            </div>

            <div className="bg-[#050a0f] border-2 border-red-950 rounded-xl p-5 text-center shadow-inner">
              <div className="text-xs text-red-500 uppercase tracking-widest">Iron Tip Temperature</div>
              <div className="text-5xl font-extrabold text-red-500 my-2 tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]">
                {solderActualTemp} °C
              </div>
              <div className="text-xs text-slate-400">
                Target: {solderSetTemp} °C · Heater Duty: {pidDutyPct}% (65W Ceramic) · Tip: {solderTip}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Set Target:</span>
                  <div className="flex gap-1.5">
                    {[280, 350, 400].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSolderSetTemp(t)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-red-300 font-bold cursor-pointer"
                      >
                        {t}°C
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="range"
                  min={200}
                  max={480}
                  step={5}
                  value={solderSetTemp}
                  onChange={(e) => setSolderSetTemp(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>200°C</span>
                  <span>350°C (Lead-Free)</span>
                  <span>480°C</span>
                </div>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-slate-400 block">Mounted Soldering Tip:</span>
                <div className="flex gap-2">
                  {(["CHISEL", "CONICAL", "KNIFE"] as const).map((tip) => (
                    <button
                      key={tip}
                      type="button"
                      onClick={() => setSolderTip(tip)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                        solderTip === tip ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300 hover:text-white"
                      }`}
                    >
                      {tip}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "solderless-breadboard":
      default:
        return (
          <div className="bg-[#121929] border-2 border-cyan-700/60 rounded-2xl p-6 shadow-2xl space-y-4 font-mono text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center mx-auto text-cyan-300 shadow-lg shadow-cyan-500/10">
              <Layers className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-white">830-Point Solderless Breadboard Workstation</h3>
            <p className="text-xs text-slate-300 max-w-xl mx-auto">
              Featuring full dual-rail power buses, 63 terminal columns, catenary arched jumper wires in 7 official colors,
              live component insertion (DIP-8, TO-92, axial resistors, LEDs), interactive DMM multimeter voltage probes,
              and real-time Modified Nodal Analysis (MNA) circuit simulation.
            </p>
            {onLaunchBreadboard && (
              <button
                type="button"
                onClick={onLaunchBreadboard}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold shadow-xl shadow-cyan-500/25 inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Launch Interactive Virtual Breadboard</span>
              </button>
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0a1128] via-[#0f1b3a] to-[#070d1e] border border-cyan-500/30 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 text-[11px] font-mono font-bold tracking-wider uppercase">
                ISO 17025 Calibrated Standard Rack
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-semibold">
                26 Live Bench Instruments
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Gauge className="w-8 h-8 text-cyan-400" />
              <span>Virtual Laboratory Equipment &amp; Calibration Suite</span>
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-3xl">
              Interactive front-panel controls, precision VFD/CRT displays, Smith Chart &amp; FFT math overlays,
              and physics simulation across all 26 electronic engineering bench instruments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setViewMode(viewMode === "SINGLE" ? "RACK_DUAL" : "SINGLE")}
              className="px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-200 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
            >
              {viewMode === "SINGLE" ? <Maximize2 className="w-4 h-4 text-cyan-400" /> : <Minimize2 className="w-4 h-4 text-cyan-400" />}
              <span>{viewMode === "SINGLE" ? "Dual-Rack Bench View" : "Focus Single Instrument"}</span>
            </button>

            {onLaunchBreadboard && (
              <button
                type="button"
                onClick={onLaunchBreadboard}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>Open Solderless Breadboard</span>
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: "ALL" as const, label: "All 26 Instruments" },
              { id: "SCOPES_ANALYZERS" as const, label: "Oscilloscopes & Analyzers" },
              { id: "METERS_DMMS" as const, label: "Multimeters & Meters" },
              { id: "POWER_SOURCES" as const, label: "Power & Signal Sources" },
              { id: "RF_MICROWAVE" as const, label: "RF & Microwave" },
              { id: "COMPONENT_TESTERS" as const, label: "Component Testers" },
              { id: "WORKBENCH_TOOLS" as const, label: "Tools & Standards" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-cyan-400 text-slate-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search instrument or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="bg-[#0b1020] border border-[#202d4d] rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Laboratory Rack Units ({filteredInstruments.length})
              </span>
              {viewMode === "RACK_DUAL" ? (
                <div className="flex items-center gap-1 text-[10px] font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveSlotTarget("A")}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      activeSlotTarget === "A" ? "bg-cyan-400 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Mount A
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlotTarget("B")}
                    className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                      activeSlotTarget === "B" ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    Mount B
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-mono text-slate-500">Click to mount</span>
              )}
            </div>

            <div className="space-y-1.5 max-h-[720px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredInstruments.map((inst) => {
                const isSlotA = inst.id === selectedInstrumentId;
                const isSlotB = viewMode === "RACK_DUAL" && inst.id === secondaryInstrumentId;
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => mountInstrumentFromPalette(inst.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSlotA
                        ? "bg-cyan-500/15 border-cyan-400/80 shadow-md shadow-cyan-500/10"
                        : isSlotB
                        ? "bg-amber-500/15 border-amber-400/80 shadow-md shadow-amber-500/10"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                            isSlotA
                              ? "bg-cyan-400 text-slate-950"
                              : isSlotB
                              ? "bg-amber-400 text-slate-950"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {inst.number}
                        </span>
                        <h4 className={`text-xs font-bold truncate ${isSlotA ? "text-cyan-200" : isSlotB ? "text-amber-200" : "text-slate-200"}`}>
                          {inst.name}
                        </h4>
                        {viewMode === "RACK_DUAL" && (isSlotA || isSlotB) && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${isSlotA ? "bg-cyan-500/30 text-cyan-200" : "bg-amber-500/30 text-amber-200"}`}>
                            {isSlotA ? "SLOT A" : "SLOT B"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] font-mono text-slate-400">
                        <span className="text-slate-300 font-semibold">{inst.model}</span>
                        <span>·</span>
                        <span className="text-slate-500 truncate">{inst.categoryName}</span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform ${
                        isSlotA || isSlotB ? "text-cyan-400 translate-x-0.5" : "text-slate-600"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {[
            { inst: activeInstrument, slot: "A" as const },
            ...(viewMode === "RACK_DUAL" ? [{ inst: secondaryInstrument, slot: "B" as const }] : []),
          ].map(({ inst, slot }) => (
            <div key={`${slot}-${inst.id}`} className="bg-[#0b1020] border border-[#202d4d] rounded-2xl p-6 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        slot === "A" ? "bg-cyan-500/20 text-cyan-300" : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {viewMode === "RACK_DUAL" ? `RACK SLOT ${slot} · ` : ""}INSTRUMENT #{inst.number}
                    </span>
                    <span className="text-xs font-mono text-slate-400 font-medium">{inst.manufacturer}</span>
                  </div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight mt-1">
                    {inst.name}
                    <span className="ml-2 font-mono text-cyan-400 font-normal text-sm">[{inst.model}]</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{inst.tagline}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 max-w-sm justify-end">
                  {inst.specs.map((sp, idx) => (
                    <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                      {sp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5">{renderInstrumentPanelBody(inst, slot)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
