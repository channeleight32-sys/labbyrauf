/**
 * Realistic Electronic Component Database & Datasheets
 * IST Circuit & Logic Lab — Professional Workbench
 * 
 * Verified engineering parameters, pinouts, package geometries,
 * electrical ratings (typical vs max), and standardized circuit symbols.
 */

export type ComponentCategory =
  | "passives"
  | "semiconductors"
  | "integrated_circuits"
  | "electromechanical"
  | "power_electronics"
  | "microcontrollers_modules";

export type PackageType =
  | "AXIAL_RESISTOR"
  | "AXIAL_DIODE_DO41"
  | "GLASS_DIODE_DO35"
  | "RADIAL_ELECTROLYTIC"
  | "CERAMIC_DISC"
  | "TANTALUM_DIP"
  | "BOX_POLYESTER"
  | "TOROID_INDUCTOR"
  | "DRUM_INDUCTOR"
  | "AIR_CORE_COIL"
  | "TRANSFORMER_EI"
  | "POT_ROTARY"
  | "TRIMMER_POT"
  | "TO92"
  | "TO220"
  | "TO247"
  | "BRIDGE_W04"
  | "LED_5MM"
  | "DIP8"
  | "DIP14"
  | "DIP16"
  | "DIP28"
  | "PCB_ARDUINO_UNO"
  | "PCB_ESP32_DEVKIT"
  | "PCB_ARDUINO_NANO"
  | "PCB_RPI_PICO"
  | "MODULE_LORA"
  | "MODULE_NRF24"
  | "MODULE_BLUETOOTH"
  | "MODULE_GPS"
  | "MODULE_GSM"
  | "SWITCH_SLIDE"
  | "PUSH_BUTTON_6MM"
  | "RELAY_SPDT_BLUE"
  | "GLASS_FUSE_5X20"
  | "DC_MOTOR_CAN"
  | "SERVO_SG90"
  | "STEPPER_28BYJ48"
  | "PIEZO_BUZZER"
  | "SPEAKER_CONE";

export interface ComponentTerminal {
  name: string;
  pinNumber?: number;
  label: string;
  polarity?: "ANODE" | "CATHODE" | "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "GATE" | "BASE" | "COLLECTOR" | "EMITTER" | "DRAIN" | "SOURCE" | "MT1" | "MT2" | "A1" | "A2";
  side: "left" | "right" | "top" | "bottom";
  xOffsetPercent?: number; // percent along that side (0 to 100)
  description: string;
}

export interface ComponentRating {
  label: string;
  typical?: string;
  max?: string;
  unit?: string;
}

export interface RealisticComponentDef {
  id: string;
  name: string;
  partNumber: string;
  manufacturer: string;
  category: ComponentCategory;
  packageType: PackageType;
  packageDescription: string;
  dimensionsMm: { width: number; height: number; depth?: number };
  terminals: ComponentTerminal[];
  defaultValues?: {
    valueNumber?: number;
    valueUnit?: string;
    formattedValue?: string;
    voltageRatingV?: number;
    powerRatingW?: number;
    tolerancePct?: number;
  };
  electricalCharacteristics: ComponentRating[];
  absoluteMaximumRatings: ComponentRating[];
  typicalApplications: string[];
  keyFormulas?: string[];
  schematicSymbolType: string;
  isPolarized: boolean;
  datasheetSummary: string;
  educationalNotes: string;
}

export const REALISTIC_COMPONENTS: Record<string, RealisticComponentDef> = {
  // =========================================================================
  // 1. PASSIVE COMPONENTS
  // =========================================================================
  RES_CARBON: {
    id: "RES_CARBON",
    name: "Carbon Film Resistor",
    partNumber: "CFR-25JT-52-1K",
    manufacturer: "Yageo / Vishay",
    category: "passives",
    packageType: "AXIAL_RESISTOR",
    packageDescription: "Through-hole axial leaded ceramic rod with pyrolytic carbon film, tan lacquer coating, and color bands.",
    dimensionsMm: { width: 60, height: 20 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Terminal 1 (Bidirectional lead)" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Terminal 2 (Bidirectional lead)" },
    ],
    defaultValues: {
      valueNumber: 1000,
      valueUnit: "Ω",
      formattedValue: "1.0 kΩ",
      powerRatingW: 0.25,
      tolerancePct: 5,
    },
    electricalCharacteristics: [
      { label: "Nominal Resistance", typical: "1.0 kΩ", unit: "Ω" },
      { label: "Temperature Coefficient", typical: "-350 to +350", unit: "ppm/°C" },
      { label: "Tolerance", typical: "±5% (Gold)", unit: "%" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated Power @ 70°C", max: "0.25", unit: "W" },
      { label: "Max Working Voltage", max: "250", unit: "V DC" },
      { label: "Max Overload Voltage", max: "500", unit: "V" },
      { label: "Operating Temperature", max: "-55 to +155", unit: "°C" },
    ],
    typicalApplications: ["Current limiting for LEDs", "Pull-up / Pull-down for logic inputs", "Voltage divider networks", "Biasing BJT/FET amplifiers"],
    keyFormulas: ["V = I × R", "P = I² × R = V² / R"],
    schematicSymbolType: "RESISTOR_IEEE",
    isPolarized: false,
    datasheetSummary: "General purpose 1/4W carbon film resistor. EIA standard color coding (Brown-Black-Red-Gold for 1kΩ).",
    educationalNotes: "Non-polarized passive component. Current flows equally well in either direction.",
  },

  RES_METAL: {
    id: "RES_METAL",
    name: "Metal Film Precision Resistor",
    partNumber: "MFR-25FTE52-10K",
    manufacturer: "Vishay Dale",
    category: "passives",
    packageType: "AXIAL_RESISTOR",
    packageDescription: "Precision vacuum-sputtered nickel-chromium metal film, blue body lacquer, 5-band 1% tolerance.",
    dimensionsMm: { width: 60, height: 20 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Terminal 1" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Terminal 2" },
    ],
    defaultValues: {
      valueNumber: 10000,
      valueUnit: "Ω",
      formattedValue: "10.0 kΩ",
      powerRatingW: 0.25,
      tolerancePct: 1,
    },
    electricalCharacteristics: [
      { label: "Nominal Resistance", typical: "10.0 kΩ", unit: "Ω" },
      { label: "Temperature Coefficient", typical: "±50", unit: "ppm/°C" },
      { label: "Tolerance", typical: "±1% (Brown)", unit: "%" },
      { label: "Low Current Noise", typical: "< 0.1", unit: "µV/V" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated Power", max: "0.25", unit: "W" },
      { label: "Max Working Voltage", max: "300", unit: "V" },
    ],
    typicalApplications: ["Instrumentation amplifiers", "Active filter stages", "Precision voltage references", "ADC input networks"],
    schematicSymbolType: "RESISTOR_IEEE",
    isPolarized: false,
    datasheetSummary: "High-stability precision metal film resistor with 1% tolerance and ultra-low thermal drift.",
    educationalNotes: "Distinguished by its distinct blue body color and 5 colored bands instead of 4.",
  },

  POT_ROTARY: {
    id: "POT_ROTARY",
    name: "Rotary Potentiometer",
    partNumber: "RV24YN20S-B103",
    manufacturer: "Bourns / Alps Alpine",
    category: "passives",
    packageType: "POT_ROTARY",
    packageDescription: "Panel-mount 24mm cylindrical metal body with knurled rotating brass shaft and 3 solder lugs.",
    dimensionsMm: { width: 65, height: 50 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Term 1 (CCW)", side: "left", description: "Counter-clockwise fixed resistive element end" },
      { name: "WIPER", pinNumber: 2, label: "Wiper (W)", side: "bottom", description: "Variable center wiper contact" },
      { name: "T3", pinNumber: 3, label: "Term 3 (CW)", side: "right", description: "Clockwise fixed resistive element end" },
    ],
    defaultValues: {
      valueNumber: 10000,
      valueUnit: "Ω",
      formattedValue: "10 kΩ (Linear)",
      powerRatingW: 0.5,
    },
    electricalCharacteristics: [
      { label: "Total Track Resistance", typical: "10 kΩ", unit: "Ω" },
      { label: "Resistance Taper", typical: "Linear (Type B)", unit: "" },
      { label: "Rotational Angle", typical: "300", unit: "degrees" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated Power @ 40°C", max: "0.5", unit: "W" },
      { label: "Max Terminal Voltage", max: "200", unit: "V" },
    ],
    typicalApplications: ["Audio volume control", "Voltage division ratio tuning", "Speed control of DC motors", "Op-amp gain adjustment"],
    keyFormulas: ["V_out = V_in × (R_wiper / R_total)"],
    schematicSymbolType: "POTENTIOMETER",
    isPolarized: false,
    datasheetSummary: "Standard 3-terminal variable resistor. Turning the shaft sweeps the wiper from Terminal 1 to Terminal 3.",
    educationalNotes: "Connect Terminals 1 and 3 across power rails and probe Wiper for a continuous 0V to Vcc variable voltage.",
  },

  CAP_ELECTROLYTIC: {
    id: "CAP_ELECTROLYTIC",
    name: "Aluminum Electrolytic Capacitor",
    partNumber: "UHE1H101MPD (100µF 50V)",
    manufacturer: "Nichicon / Rubycon",
    category: "passives",
    packageType: "RADIAL_ELECTROLYTIC",
    packageDescription: "Cylindrical aluminum can with black/gold sleeve, embossed safety vent on top, and white negative polarity stripe.",
    dimensionsMm: { width: 55, height: 60 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "+ Anode", polarity: "ANODE", side: "left", description: "Positive Terminal (+, longer lead on physical component)" },
      { name: "CATHODE", pinNumber: 2, label: "- Cathode", polarity: "CATHODE", side: "right", description: "Negative Terminal (-, marked by white stripe on body)" },
    ],
    defaultValues: {
      valueNumber: 0.0001,
      valueUnit: "F",
      formattedValue: "100 µF",
      voltageRatingV: 50,
      tolerancePct: 20,
    },
    electricalCharacteristics: [
      { label: "Capacitance", typical: "100", unit: "µF" },
      { label: "Equivalent Series Resistance (ESR)", typical: "0.18", unit: "Ω" },
      { label: "Ripple Current @ 100kHz", typical: "480", unit: "mA RMS" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated Working Voltage (WV)", max: "50", unit: "V DC" },
      { label: "Surge Voltage", max: "63", unit: "V" },
      { label: "Operating Temperature", max: "105", unit: "°C" },
    ],
    typicalApplications: ["Power supply DC bulk reservoir smoothing", "Audio signal AC coupling / DC blocking", "Bypass filtering"],
    keyFormulas: ["Q = C × V", "i(t) = C × (dv/dt)", "X_C = 1 / (2π f C)"],
    schematicSymbolType: "CAPACITOR_POLARIZED",
    isPolarized: true,
    datasheetSummary: "Polarized radial capacitor. The negative lead is clearly indicated by the vertical white stripe with '-' signs.",
    educationalNotes: "WARNING: Must be connected with correct polarity! Reverse polarity or exceeding 50V causes dielectric breakdown and venting.",
  },

  CAP_CERAMIC: {
    id: "CAP_CERAMIC",
    name: "Ceramic Disc Capacitor",
    partNumber: "K104K15X7RF53H5 (100nF / 0.1µF)",
    manufacturer: "Vishay / Murata",
    category: "passives",
    packageType: "CERAMIC_DISC",
    packageDescription: "Radial ceramic dielectric round disc with orange-tan epoxy dip coating, stamped '104' (100,000 pF = 0.1 µF).",
    dimensionsMm: { width: 50, height: 45 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Terminal 1 (Non-polarized lead)" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Terminal 2 (Non-polarized lead)" },
    ],
    defaultValues: {
      valueNumber: 0.0000001,
      valueUnit: "F",
      formattedValue: "100 nF (0.1 µF)",
      voltageRatingV: 50,
    },
    electricalCharacteristics: [
      { label: "Capacitance Code", typical: "104 (10 × 10⁴ pF)", unit: "" },
      { label: "Capacitance", typical: "0.1", unit: "µF" },
      { label: "Dielectric Class", typical: "X7R (Stable)", unit: "" },
    ],
    absoluteMaximumRatings: [
      { label: "Working Voltage", max: "50", unit: "V DC" },
      { label: "Dielectric Withstanding Voltage", max: "125", unit: "V" },
    ],
    typicalApplications: ["High-frequency IC decoupling (0.1µF adjacent to Vcc pin)", "Noise suppression", "RF filter networks"],
    schematicSymbolType: "CAPACITOR_NONPOLAR",
    isPolarized: false,
    datasheetSummary: "Industry standard 100nF non-polarized bypass capacitor with low parasitic inductance.",
    educationalNotes: "Essential for digital and analog IC stability to shunt high-frequency switching noise directly to ground.",
  },

  IND_TOROIDAL: {
    id: "IND_TOROIDAL",
    name: "Toroidal Power Inductor",
    partNumber: "B82721A2122N020 (1 mH)",
    manufacturer: "TDK / EPCOS",
    category: "passives",
    packageType: "TOROID_INDUCTOR",
    packageDescription: "Iron powder circular toroidal core wound radially with heavy-gauge enameled copper magnet wire.",
    dimensionsMm: { width: 60, height: 60 },
    terminals: [
      { name: "IN", pinNumber: 1, label: "Lead 1", side: "left", description: "Coil Start" },
      { name: "OUT", pinNumber: 2, label: "Lead 2", side: "right", description: "Coil Finish" },
    ],
    defaultValues: {
      valueNumber: 0.001,
      valueUnit: "H",
      formattedValue: "1.0 mH",
    },
    electricalCharacteristics: [
      { label: "Inductance @ 10kHz", typical: "1.0", unit: "mH" },
      { label: "DC Resistance (DCR)", typical: "0.08", unit: "Ω" },
      { label: "Saturation Current", typical: "3.5", unit: "A" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Continuous Current", max: "4.0", unit: "A" },
      { label: "Core Temperature Limit", max: "130", unit: "°C" },
    ],
    typicalApplications: ["Switching buck/boost energy storage", "EMI common-mode chokes", "Power supply LC ripple filters"],
    keyFormulas: ["v(t) = L × (di/dt)", "X_L = 2π f L", "E = ½ L I²"],
    schematicSymbolType: "INDUCTOR",
    isPolarized: false,
    datasheetSummary: "Closed-loop toroidal core minimizes magnetic flux leakage and electromagnetic interference (EMI).",
    educationalNotes: "Inductors oppose instantaneous changes in electric current according to Faraday's law of induction.",
  },

  TRANSFORMER_EI: {
    id: "TRANSFORMER_EI",
    name: "Single-Phase Step-Down Transformer",
    partNumber: "VPP24-1000 (230V to 12V 1A)",
    manufacturer: "Triad Magnetics",
    category: "passives",
    packageType: "TRANSFORMER_EI",
    packageDescription: "Laminated silicon-steel E-I core, dual nylon bobbins wrapped with yellow insulating tape and solder lugs.",
    dimensionsMm: { width: 75, height: 65 },
    terminals: [
      { name: "PRI1", pinNumber: 1, label: "Primary L", side: "left", description: "AC Mains Live input (230V / 120V)" },
      { name: "PRI2", pinNumber: 2, label: "Primary N", side: "left", description: "AC Mains Neutral return" },
      { name: "SEC1", pinNumber: 3, label: "Secondary +", side: "right", description: "Stepped-down AC Output 1" },
      { name: "SEC2", pinNumber: 4, label: "Secondary -", side: "right", description: "Stepped-down AC Output 2" },
    ],
    defaultValues: {
      formattedValue: "10:1 (230V → 24V)",
    },
    electricalCharacteristics: [
      { label: "Primary Voltage", typical: "230", unit: "V AC" },
      { label: "Secondary Voltage (Full Load)", typical: "24", unit: "V AC" },
      { label: "Power Rating", typical: "24", unit: "VA" },
    ],
    absoluteMaximumRatings: [
      { label: "Dielectric Isolation (Pri to Sec)", max: "4000", unit: "V RMS" },
    ],
    typicalApplications: ["Linear AC-DC power supplies", "Galvanic circuit isolation", "Voltage stepping"],
    keyFormulas: ["V_p / V_s = N_p / N_s = I_s / I_p"],
    schematicSymbolType: "TRANSFORMER",
    isPolarized: false,
    datasheetSummary: "Galvanically isolated step-down transformer with 4kV primary-to-secondary dielectric strength.",
    educationalNotes: "Operates exclusively on alternating current (AC); DC applied to primary will saturate core and blow fuses.",
  },

  // =========================================================================
  // 2. SEMICONDUCTOR COMPONENTS
  // =========================================================================
  DIODE_1N4007: {
    id: "DIODE_1N4007",
    name: "1N4007 General Purpose Silicon Rectifier",
    partNumber: "1N4007",
    manufacturer: "Vishay / ON Semiconductor",
    category: "semiconductors",
    packageType: "AXIAL_DIODE_DO41",
    packageDescription: "DO-41 black molded plastic cylinder with silver cathode band and axial copper leads.",
    dimensionsMm: { width: 60, height: 20 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (A)", polarity: "ANODE", side: "left", description: "P-type positive terminal (unbanded side)" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (K)", polarity: "CATHODE", side: "right", description: "N-type negative terminal (silver band side)" },
    ],
    electricalCharacteristics: [
      { label: "Forward Voltage Drop (Vf @ 1A)", typical: "0.7", max: "1.1", unit: "V" },
      { label: "Reverse Leakage Current (Ir @ 1000V)", typical: "0.05", max: "5.0", unit: "µA" },
      { label: "Junction Capacitance", typical: "15", unit: "pF" },
    ],
    absoluteMaximumRatings: [
      { label: "Peak Repetitive Reverse Voltage (Vrrm)", max: "1000", unit: "V" },
      { label: "Average Rectified Forward Current (Io)", max: "1.0", unit: "A" },
      { label: "Non-repetitive Peak Surge Current (Ifsm)", max: "30", unit: "A" },
      { label: "Operating Junction Temp", max: "175", unit: "°C" },
    ],
    typicalApplications: ["50/60Hz AC mains rectification", "Flyback inductive kickback clamp across relay coils", "Polarity protection"],
    keyFormulas: ["I = I_s × (e^(V / (n × V_t)) - 1)"],
    schematicSymbolType: "DIODE_STANDARD",
    isPolarized: true,
    datasheetSummary: "Standard 1A 1000V silicon rectifier diode. Conduction begins when Anode is ~0.7V higher than Cathode.",
    educationalNotes: "Cathode is marked by the silver printed ring. Current flows easily from Anode to Cathode, blocked in reverse.",
  },

  DIODE_1N4148: {
    id: "DIODE_1N4148",
    name: "1N4148 High-Speed Switching Signal Diode",
    partNumber: "1N4148",
    manufacturer: "NXP / Diodes Inc.",
    category: "semiconductors",
    packageType: "GLASS_DIODE_DO35",
    packageDescription: "DO-35 hermetically sealed translucent reddish glass envelope with black cathode band.",
    dimensionsMm: { width: 55, height: 18 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (A)", polarity: "ANODE", side: "left", description: "Anode" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (K)", polarity: "CATHODE", side: "right", description: "Cathode (black ring)" },
    ],
    electricalCharacteristics: [
      { label: "Reverse Recovery Time (trr)", typical: "4.0", max: "8.0", unit: "ns" },
      { label: "Forward Voltage (Vf @ 10mA)", typical: "0.68", max: "1.0", unit: "V" },
      { label: "Diode Capacitance", typical: "1.4", unit: "pF" },
    ],
    absoluteMaximumRatings: [
      { label: "Continuous Reverse Voltage (Vr)", max: "100", unit: "V" },
      { label: "Continuous Forward Current (If)", max: "300", unit: "mA" },
    ],
    typicalApplications: ["High-speed digital logic clamping", "Signal clipping and wave-shaping", "Demodulation / peak detection"],
    schematicSymbolType: "DIODE_STANDARD",
    isPolarized: true,
    datasheetSummary: "Ultra-fast silicon switching diode with 4ns reverse recovery time for high-frequency signal processing.",
    educationalNotes: "Do not use for power rectification; limited to 300mA maximum continuous forward current.",
  },

  ZENER_5V1: {
    id: "ZENER_5V1",
    name: "1N4733A 5.1V Zener Diode",
    partNumber: "1N4733A",
    manufacturer: "Microsemi / ON Semi",
    category: "semiconductors",
    packageType: "GLASS_DIODE_DO35",
    packageDescription: "DO-35 glass envelope with blue/black cathode band and stamped '5V1'.",
    dimensionsMm: { width: 55, height: 18 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (A)", polarity: "ANODE", side: "left", description: "Anode terminal" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (K)", polarity: "CATHODE", side: "right", description: "Cathode terminal (connect to positive in regulation mode)" },
    ],
    defaultValues: {
      formattedValue: "5.1 V / 1.0 W",
    },
    electricalCharacteristics: [
      { label: "Nominal Zener Voltage (Vz @ 49mA)", typical: "5.1", unit: "V" },
      { label: "Zener Test Current (Izt)", typical: "49", unit: "mA" },
      { label: "Dynamic Impedance (Zzt)", typical: "7.0", unit: "Ω" },
    ],
    absoluteMaximumRatings: [
      { label: "Power Dissipation (Pd @ 50°C)", max: "1.0", unit: "W" },
      { label: "Surge Current (Izm)", max: "178", unit: "mA" },
    ],
    typicalApplications: ["Shunt voltage regulation", "ADC input voltage clamping protection (5V limits)", "MOSFET gate overvoltage protection"],
    keyFormulas: ["V_out = V_z", "I_s = (V_in - V_z) / R_series"],
    schematicSymbolType: "DIODE_ZENER",
    isPolarized: true,
    datasheetSummary: "Precision 5.1V 1W Zener diode operated in reverse breakdown to maintain a stable reference voltage.",
    educationalNotes: "Must be connected in reverse bias (Cathode to positive supply rail) with a series current-limiting resistor.",
  },

  BRIDGE_RECT: {
    id: "BRIDGE_RECT",
    name: "W04M Single-Phase Bridge Rectifier",
    partNumber: "W04M",
    manufacturer: "Diodes Incorporated",
    category: "semiconductors",
    packageType: "BRIDGE_W04",
    packageDescription: "Circular molded plastic case with 4 wire leads, beveled notch indicating positive (+) terminal.",
    dimensionsMm: { width: 60, height: 60 },
    terminals: [
      { name: "AC1", pinNumber: 1, label: "~ AC 1", side: "left", description: "AC Line Input 1" },
      { name: "AC2", pinNumber: 2, label: "~ AC 2", side: "left", description: "AC Line Input 2" },
      { name: "POS", pinNumber: 3, label: "+ DC Output", polarity: "POSITIVE", side: "right", description: "Positive Full-Wave Rectified DC Output" },
      { name: "NEG", pinNumber: 4, label: "- DC Return", polarity: "NEGATIVE", side: "right", description: "Negative Full-Wave Rectified DC Return (GND)" },
    ],
    electricalCharacteristics: [
      { label: "Forward Voltage Drop (per leg)", typical: "0.7", max: "1.0", unit: "V" },
      { label: "Total Conduction Drop", typical: "1.4", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Peak Reverse Voltage (Vrrm)", max: "400", unit: "V" },
      { label: "Average Forward Output Current (Io)", max: "1.5", unit: "A" },
    ],
    typicalApplications: ["Full-wave bridge power conversion from AC transformers to DC rails"],
    keyFormulas: ["V_dc_peak = V_ac_peak - 2 × V_f", "f_ripple = 2 × f_in"],
    schematicSymbolType: "BRIDGE_RECTIFIER",
    isPolarized: true,
    datasheetSummary: "Integrated 4-diode full-wave bridge rectifier module in a compact round WOB package.",
    educationalNotes: "Doubles the AC ripple frequency (e.g. 50Hz AC becomes 100Hz pulsating DC, easier to filter).",
  },

  LED_5MM_RED: {
    id: "LED_5MM_RED",
    name: "Red 5mm Diffused Through-Hole LED",
    partNumber: "HLMP-3301",
    manufacturer: "Broadcom / Kingbright",
    category: "semiconductors",
    packageType: "LED_5MM",
    packageDescription: "5mm round tinted red epoxy lens with cathode flat-edge notch and internal anvil/post leads.",
    dimensionsMm: { width: 50, height: 50 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (+)", polarity: "ANODE", side: "left", description: "Positive Anode (longer physical lead)" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (-)", polarity: "CATHODE", side: "right", description: "Negative Cathode (flat rim edge, larger internal anvil cup)" },
    ],
    defaultValues: {
      formattedValue: "2.0V / 20mA (Red)",
    },
    electricalCharacteristics: [
      { label: "Forward Voltage (Vf @ 20mA)", typical: "2.0", max: "2.4", unit: "V" },
      { label: "Peak Wavelength", typical: "635", unit: "nm" },
      { label: "Luminous Intensity", typical: "30", unit: "mcd" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Continuous Forward Current (If)", max: "30", unit: "mA" },
      { label: "Reverse Breakdown Voltage (Vr)", max: "5.0", unit: "V" },
    ],
    typicalApplications: ["Status indicators", "Logic probe high/low visualizers", "Optocoupler emitters"],
    keyFormulas: ["R_limit = (V_cc - V_f) / I_led"],
    schematicSymbolType: "LED",
    isPolarized: true,
    datasheetSummary: "Standard 5mm diffused gallium arsenide phosphide (GaAsP) red light emitting diode.",
    educationalNotes: "Always use a current-limiting resistor (e.g. 220Ω or 330Ω on 5V supply) to prevent thermal destruction.",
  },

  BJT_BC547: {
    id: "BJT_BC547",
    name: "BC547B NPN General Purpose BJT",
    partNumber: "BC547B",
    manufacturer: "Fairchild / ON Semiconductor",
    category: "semiconductors",
    packageType: "TO92",
    packageDescription: "TO-92 molded epoxy with flat front face bearing laser text 'BC547B', rounded back, and 3 pins.",
    dimensionsMm: { width: 55, height: 60 },
    terminals: [
      { name: "COLLECTOR", pinNumber: 1, label: "Collector (C)", polarity: "COLLECTOR", side: "right", description: "Collector lead (Pin 1 on European TO-92 standard)" },
      { name: "BASE", pinNumber: 2, label: "Base (B)", polarity: "BASE", side: "left", description: "Base lead (Pin 2, control terminal)" },
      { name: "EMITTER", pinNumber: 3, label: "Emitter (E)", polarity: "EMITTER", side: "bottom", description: "Emitter lead (Pin 3, marked with arrow in schematic)" },
    ],
    electricalCharacteristics: [
      { label: "DC Current Gain (hFE @ Ic=2mA, Vce=5V)", typical: "200–450 (Class B)", unit: "" },
      { label: "Base-Emitter Saturation Voltage (Vbe_sat)", typical: "0.7", max: "0.9", unit: "V" },
      { label: "Collector-Emitter Saturation (Vce_sat @ 10mA)", typical: "0.09", max: "0.25", unit: "V" },
      { label: "Transition Frequency (ft)", typical: "300", unit: "MHz" },
    ],
    absoluteMaximumRatings: [
      { label: "Collector-Emitter Voltage (Vceo)", max: "45", unit: "V" },
      { label: "Collector-Base Voltage (Vcbo)", max: "50", unit: "V" },
      { label: "Collector Current (Ic continuous)", max: "100", unit: "mA" },
      { label: "Total Power Dissipation (Ptot)", max: "500", unit: "mW" },
    ],
    typicalApplications: ["Common-Emitter small-signal audio amplifiers", "Logic inverter and saturated low-side switch", "Oscillators"],
    keyFormulas: ["I_c = β × I_b", "I_e = I_c + I_b", "V_ce = V_cc - I_c × R_c"],
    schematicSymbolType: "TRANSISTOR_NPN",
    isPolarized: true,
    datasheetSummary: "Ubiquitous NPN epitaxial silicon bipolar transistor for switching and audio-frequency amplification.",
    educationalNotes: "To turn ON, forward-bias the base-emitter junction with Vbe ≥ 0.65V. The schematic symbol arrow points OUT on Emitter.",
  },

  BJT_BC557: {
    id: "BJT_BC557",
    name: "BC557B PNP General Purpose BJT",
    partNumber: "BC557B",
    manufacturer: "ON Semiconductor",
    category: "semiconductors",
    packageType: "TO92",
    packageDescription: "TO-92 molded epoxy with flat front face bearing laser text 'BC557B', rounded back, and 3 pins.",
    dimensionsMm: { width: 55, height: 60 },
    terminals: [
      { name: "COLLECTOR", pinNumber: 1, label: "Collector (C)", polarity: "COLLECTOR", side: "right", description: "Collector lead" },
      { name: "BASE", pinNumber: 2, label: "Base (B)", polarity: "BASE", side: "left", description: "Base lead (control terminal)" },
      { name: "EMITTER", pinNumber: 3, label: "Emitter (E)", polarity: "EMITTER", side: "top", description: "Emitter lead (arrow points IN towards Base)" },
    ],
    electricalCharacteristics: [
      { label: "DC Current Gain (hFE)", typical: "200–450", unit: "" },
      { label: "Vbe forward drop", typical: "-0.65", unit: "V" },
      { label: "Vce_sat", typical: "-0.15", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Collector-Emitter Voltage (Vceo)", max: "-45", unit: "V" },
      { label: "Collector Current (Ic)", max: "-100", unit: "mA" },
    ],
    typicalApplications: ["High-side power switching", "Push-pull complementary symmetry output stages (paired with BC547)"],
    schematicSymbolType: "TRANSISTOR_PNP",
    isPolarized: true,
    datasheetSummary: "Complementary PNP counterpart to the BC547. Turns ON when Base is pulled lower than Emitter by 0.65V.",
    educationalNotes: "The schematic symbol arrow points IN toward the base.",
  },

  MOSFET_IRF540N: {
    id: "MOSFET_IRF540N",
    name: "IRF540N N-Channel Power MOSFET",
    partNumber: "IRF540N",
    manufacturer: "Infineon / International Rectifier",
    category: "semiconductors",
    packageType: "TO220",
    packageDescription: "TO-220AB package with nickel-plated copper heatsink mounting tab, molded body, and 3 thick pins.",
    dimensionsMm: { width: 65, height: 75 },
    terminals: [
      { name: "GATE", pinNumber: 1, label: "Gate (G)", polarity: "GATE", side: "left", description: "High-impedance insulated oxide control gate (Pin 1)" },
      { name: "DRAIN", pinNumber: 2, label: "Drain (D)", polarity: "DRAIN", side: "right", description: "Drain (Pin 2, internally tied to metal heatsink tab)" },
      { name: "SOURCE", pinNumber: 3, label: "Source (S)", polarity: "SOURCE", side: "bottom", description: "Source return (Pin 3)" },
    ],
    electricalCharacteristics: [
      { label: "Drain-Source On-Resistance (Rds(on) @ Vgs=10V)", typical: "44", max: "53", unit: "mΩ" },
      { label: "Gate Threshold Voltage (Vgs(th))", typical: "3.0", max: "4.0", unit: "V" },
      { label: "Total Gate Charge (Qg)", typical: "71", unit: "nC" },
    ],
    absoluteMaximumRatings: [
      { label: "Drain-to-Source Breakdown (Vdss)", max: "100", unit: "V" },
      { label: "Continuous Drain Current (Id @ 25°C)", max: "33", unit: "A" },
      { label: "Pulsed Drain Current (Idm)", max: "110", unit: "A" },
      { label: "Max Power Dissipation (Pd @ 25°C)", max: "130", unit: "W" },
    ],
    typicalApplications: ["PWM DC motor H-Bridge drives", "DC-DC buck & boost converters", "High-speed power switching"],
    keyFormulas: ["I_d = k_n × (V_gs - V_th)² in saturation", "P_cond = I_d² × R_ds(on)"],
    schematicSymbolType: "MOSFET_N_ENH",
    isPolarized: true,
    datasheetSummary: "Advanced HEXFET Power MOSFET with ultra-low on-resistance and fast switching speed.",
    educationalNotes: "Voltage-controlled device. Gate draws virtually zero static DC current, but requires 10V Vgs for minimum Rds(on).",
  },

  THYRISTOR_TYN612: {
    id: "THYRISTOR_TYN612",
    name: "TYN612 12A 600V Silicon Controlled Rectifier (SCR)",
    partNumber: "TYN612",
    manufacturer: "STMicroelectronics",
    category: "semiconductors",
    packageType: "TO220",
    packageDescription: "TO-220AB package with metal tab, laser-etched 'TYN612', Anode, Cathode, Gate terminal alignment.",
    dimensionsMm: { width: 65, height: 75 },
    terminals: [
      { name: "CATHODE", pinNumber: 1, label: "Cathode (K)", polarity: "CATHODE", side: "left", description: "Cathode (Pin 1)" },
      { name: "ANODE", pinNumber: 2, label: "Anode (A)", polarity: "ANODE", side: "right", description: "Anode (Pin 2, tied to tab)" },
      { name: "GATE", pinNumber: 3, label: "Gate (G)", polarity: "GATE", side: "bottom", description: "Gate trigger terminal (Pin 3)" },
    ],
    electricalCharacteristics: [
      { label: "Gate Trigger Current (Igt)", typical: "5.0", max: "15.0", unit: "mA" },
      { label: "Gate Trigger Voltage (Vgt)", typical: "0.8", max: "1.3", unit: "V" },
      { label: "Holding Current (Ih)", typical: "15", max: "30", unit: "mA" },
      { label: "Latching Current (Il)", typical: "30", max: "60", unit: "mA" },
      { label: "On-State Voltage Drop (Vt @ 24A)", typical: "1.3", max: "1.6", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Repetitive Peak Off-State Voltage (Vdrm/Vrrm)", max: "600", unit: "V" },
      { label: "RMS On-State Current (It(RMS))", max: "12", unit: "A" },
      { label: "Critical rate of rise of off-state voltage (dV/dt)", max: "200", unit: "V/µs" },
    ],
    typicalApplications: ["Phase-controlled AC battery chargers", "Crowbar overvoltage protection circuits", "Soft starters and solid-state relays"],
    schematicSymbolType: "THYRISTOR_SCR",
    isPolarized: true,
    datasheetSummary: "12A 600V SCR. Once triggered by a positive pulse at Gate (relative to Cathode), it remains latched ON until anode current drops below Holding Current Ih.",
    educationalNotes: "Unidirectional 4-layer (PNPN) semiconductor switch. Removing the gate signal does NOT turn off the SCR.",
  },

  TRIAC_BT136: {
    id: "TRIAC_BT136",
    name: "BT136-600E 4A Sensitive Gate TRIAC",
    partNumber: "BT136-600E",
    manufacturer: "WeEn Semiconductors / NXP",
    category: "semiconductors",
    packageType: "TO220",
    packageDescription: "TO-220 package, stamped 'BT136-600E', MT1, MT2, Gate pinout.",
    dimensionsMm: { width: 65, height: 75 },
    terminals: [
      { name: "MT1", pinNumber: 1, label: "Main Terminal 1 (MT1)", polarity: "MT1", side: "left", description: "Main Terminal 1 (Reference terminal for gate triggering)" },
      { name: "MT2", pinNumber: 2, label: "Main Terminal 2 (MT2)", polarity: "MT2", side: "right", description: "Main Terminal 2 (Connected to metal mounting tab)" },
      { name: "GATE", pinNumber: 3, label: "Gate (G)", polarity: "GATE", side: "bottom", description: "Gate trigger terminal (Pin 3)" },
    ],
    electricalCharacteristics: [
      { label: "Gate Trigger Current (Igt Quadrants I–III)", typical: "2.5", max: "10", unit: "mA" },
      { label: "Gate Trigger Voltage (Vgt)", typical: "0.7", max: "1.5", unit: "V" },
      { label: "Holding Current (Ih)", typical: "2.2", max: "15", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Peak Off-State Voltage (Vdrm)", max: "600", unit: "V" },
      { label: "RMS On-State Current (It(RMS))", max: "4.0", unit: "A" },
    ],
    typicalApplications: ["AC light dimmers (incandescent / halogen)", "Universal motor speed control (fans, power tools)", "Solid-state AC switches"],
    schematicSymbolType: "THYRISTOR_TRIAC",
    isPolarized: false,
    datasheetSummary: "Bidirectional AC triode thyristor capable of conducting current in both halves of the AC mains cycle.",
    educationalNotes: "Gate signal is referenced to MT1. Often paired with a DB3 DIAC to form symmetric phase-delay firing angles.",
  },

  DIAC_DB3: {
    id: "DIAC_DB3",
    name: "DB3 Bidirectional Trigger DIAC",
    partNumber: "DB3",
    manufacturer: "STMicroelectronics",
    category: "semiconductors",
    packageType: "GLASS_DIODE_DO35",
    packageDescription: "DO-35 glass package without polarity band (bidirectional symmetrical triggering).",
    dimensionsMm: { width: 55, height: 18 },
    terminals: [
      { name: "A1", pinNumber: 1, label: "Terminal 1 (A1 / MT1)", polarity: "A1", side: "left", description: "Bidirectional Terminal 1" },
      { name: "A2", pinNumber: 2, label: "Terminal 2 (A2 / MT2)", polarity: "A2", side: "right", description: "Bidirectional Terminal 2" },
    ],
    electricalCharacteristics: [
      { label: "Breakover Voltage (Vbo)", typical: "32", max: "36", unit: "V" },
      { label: "Breakover Voltage Symmetry (|Vbo1 - Vbo2|)", typical: "1.5", max: "3.0", unit: "V" },
      { label: "Dynamic Breakback Voltage (ΔV)", typical: "5.0", unit: "V" },
      { label: "Peak Pulse Current", typical: "2.0", unit: "A" },
    ],
    absoluteMaximumRatings: [
      { label: "Repetitive Peak On-State Current (120Hz)", max: "2.0", unit: "A" },
      { label: "Power Dissipation (Ta=50°C)", max: "150", unit: "mW" },
    ],
    typicalApplications: ["TRIAC gate phase trigger circuits", "Fluorescent lamp electronic ballast starters", "Relaxation oscillators"],
    schematicSymbolType: "DIAC",
    isPolarized: false,
    datasheetSummary: "Symmetric two-terminal trigger diode. Exhibits negative resistance breakover once voltage exceeds approximately 32V in either polarity.",
    educationalNotes: "Does not conduct until the voltage across its two terminals reaches ±32V, then breaks down sharply to inject a sharp current pulse into a TRIAC gate.",
  },

  // =========================================================================
  // 3. INTEGRATED CIRCUITS
  // =========================================================================
  IC_NE555: {
    id: "IC_NE555",
    name: "NE555 Precision Timer IC",
    partNumber: "NE555P",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP8",
    packageDescription: "Standard 8-pin Dual In-line Plastic (DIP-8) package with semicircular Pin 1 index notch and laser mark.",
    dimensionsMm: { width: 85, height: 75 },
    terminals: [
      { name: "GND", pinNumber: 1, label: "Pin 1: GND", polarity: "NEGATIVE", side: "left", description: "Ground reference (0V)" },
      { name: "TRIG", pinNumber: 2, label: "Pin 2: TRIG", side: "left", description: "Trigger input (active when < 1/3 Vcc)" },
      { name: "OUT", pinNumber: 3, label: "Pin 3: OUT", side: "left", description: "High-current output driver (up to 200mA)" },
      { name: "RESET", pinNumber: 4, label: "Pin 4: RESET", side: "left", description: "Active-low reset (pull to Vcc for normal operation)" },
      { name: "CTRL", pinNumber: 5, label: "Pin 5: CTRL", side: "right", description: "Control voltage access (default 2/3 Vcc, bypass with 10nF)" },
      { name: "THRES", pinNumber: 6, label: "Pin 6: THRES", side: "right", description: "Threshold input (resets output when > 2/3 Vcc)" },
      { name: "DISCH", pinNumber: 7, label: "Pin 7: DISCH", side: "right", description: "Open-collector discharge transistor to ground" },
      { name: "VCC", pinNumber: 8, label: "Pin 8: VCC", polarity: "POSITIVE", side: "right", description: "Positive supply voltage (+4.5V to +16V)" },
    ],
    electricalCharacteristics: [
      { label: "Supply Voltage Range (Vcc)", typical: "5 to 15", unit: "V" },
      { label: "Trigger Voltage Threshold", typical: "⅓ Vcc", unit: "V" },
      { label: "Threshold Voltage", typical: "⅔ Vcc", unit: "V" },
      { label: "Max Output Sink/Source Current", typical: "200", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Supply Voltage (Vcc)", max: "18", unit: "V" },
      { label: "Power Dissipation", max: "600", unit: "mW" },
    ],
    typicalApplications: ["Astable square wave clock generator", "Monostable one-shot pulse delay", "PWM motor speed controllers", "Missing pulse detector"],
    keyFormulas: [
      "Astable Frequency: f = 1.44 / ((R_A + 2×R_B) × C)",
      "Duty Cycle: D = (R_A + R_B) / (R_A + 2×R_B)",
      "Monostable Pulse Width: T = 1.1 × R × C",
    ],
    schematicSymbolType: "IC_DIP8",
    isPolarized: true,
    datasheetSummary: "The most widely used timing IC in electrical engineering history. Contains two precision comparators, an SR flip-flop, discharge transistor, and 3 matched 5kΩ resistors.",
    educationalNotes: "Pin 1 is directly to the left of the semicircular index notch on the package.",
  },

  IC_LM741: {
    id: "IC_LM741",
    name: "LM741 General Purpose Operational Amplifier",
    partNumber: "LM741CN",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP8",
    packageDescription: "DIP-8 package with notch, pin 1 laser dot, internally compensated op-amp.",
    dimensionsMm: { width: 85, height: 75 },
    terminals: [
      { name: "OFFSET_N1", pinNumber: 1, label: "Pin 1: Offset N1", side: "left", description: "Input offset voltage null 1" },
      { name: "INV_IN", pinNumber: 2, label: "Pin 2: Inverting (-)", side: "left", description: "Inverting input terminal" },
      { name: "NON_INV", pinNumber: 3, label: "Pin 3: Non-Inv (+)", side: "left", description: "Non-inverting input terminal" },
      { name: "V_NEG", pinNumber: 4, label: "Pin 4: V- (GND/-Vs)", polarity: "NEGATIVE", side: "left", description: "Negative supply rail (-15V or 0V)" },
      { name: "OFFSET_N2", pinNumber: 5, label: "Pin 5: Offset N2", side: "right", description: "Input offset voltage null 2" },
      { name: "OUT", pinNumber: 6, label: "Pin 6: Output", side: "right", description: "Op-amp analog output" },
      { name: "V_POS", pinNumber: 7, label: "Pin 7: V+ (+Vs)", polarity: "POSITIVE", side: "right", description: "Positive supply rail (+15V or +5V)" },
      { name: "NC", pinNumber: 8, label: "Pin 8: NC", side: "right", description: "No internal connection" },
    ],
    electricalCharacteristics: [
      { label: "Open-Loop Voltage Gain (Avol)", typical: "200,000 (106 dB)", unit: "V/V" },
      { label: "Input Impedance (Rin)", typical: "2.0", unit: "MΩ" },
      { label: "Gain Bandwidth Product (GBW)", typical: "1.0", unit: "MHz" },
      { label: "Slew Rate", typical: "0.5", unit: "V/µs" },
      { label: "Common Mode Rejection (CMRR)", typical: "90", unit: "dB" },
    ],
    absoluteMaximumRatings: [
      { label: "Dual Supply Voltage (Vs)", max: "±18", unit: "V" },
      { label: "Differential Input Voltage", max: "±30", unit: "V" },
      { label: "Output Short-Circuit Duration", max: "Continuous", unit: "" },
    ],
    typicalApplications: ["Inverting and Non-inverting amplifiers", "Summing amplifiers and differential subtractors", "Active analog filters", "Voltage followers (Buffer)"],
    keyFormulas: [
      "Inverting: V_out = - (R_f / R_in) × V_in",
      "Non-Inverting: V_out = (1 + R_f / R_1) × V_in",
      "Summing: V_out = - R_f × (V_1/R_1 + V_2/R_2)",
    ],
    schematicSymbolType: "OPAMP_IEEE",
    isPolarized: true,
    datasheetSummary: "Classic internally frequency-compensated monolithic operational amplifier with short-circuit protection.",
    educationalNotes: "In negative feedback, the op-amp forces the inverting terminal voltage to equal the non-inverting terminal (Virtual Ground concept).",
  },

  IC_7805: {
    id: "IC_7805",
    name: "LM7805 +5V Linear Voltage Regulator",
    partNumber: "LM7805CT",
    manufacturer: "ON Semiconductor / ST",
    category: "integrated_circuits",
    packageType: "TO220",
    packageDescription: "TO-220 package, stamped 'LM7805', metal tab tied to Common Ground (Pin 2).",
    dimensionsMm: { width: 65, height: 75 },
    terminals: [
      { name: "INPUT", pinNumber: 1, label: "Pin 1: Input (Vin)", polarity: "POSITIVE", side: "left", description: "Unregulated DC input (7.5V to 25V)" },
      { name: "GND", pinNumber: 2, label: "Pin 2: Common GND", polarity: "NEGATIVE", side: "bottom", description: "Common ground reference (internally tied to metal mounting tab)" },
      { name: "OUTPUT", pinNumber: 3, label: "Pin 3: Output (Vout)", polarity: "POSITIVE", side: "right", description: "Regulated +5.0V DC output" },
    ],
    electricalCharacteristics: [
      { label: "Output Voltage (Vout @ 5mA to 1A)", typical: "5.0", unit: "V" },
      { label: "Line Regulation (7V ≤ Vin ≤ 25V)", typical: "4.0", max: "50", unit: "mV" },
      { label: "Load Regulation (5mA ≤ Io ≤ 1.5A)", typical: "9.0", max: "100", unit: "mV" },
      { label: "Dropout Voltage (Vd @ 1A)", typical: "2.0", unit: "V" },
      { label: "Ripple Rejection @ 120Hz", typical: "78", unit: "dB" },
    ],
    absoluteMaximumRatings: [
      { label: "Input Voltage (Vin)", max: "35", unit: "V" },
      { label: "Output Current (with adequate heatsink)", max: "1.5", unit: "A" },
      { label: "Operating Junction Temperature", max: "125", unit: "°C" },
    ],
    typicalApplications: ["Clean +5V rail regulation for TTL logic, Arduino, and microcontrollers", "On-card local regulation"],
    keyFormulas: ["P_loss = (V_in - 5.0V) × I_load"],
    schematicSymbolType: "REGULATOR_3PIN",
    isPolarized: true,
    datasheetSummary: "Fixed 3-terminal positive voltage regulator with internal current-limiting, thermal shutdown, and safe-area compensation.",
    educationalNotes: "Requires a minimum 7V input (dropout voltage is ~2V). Place 0.33µF on input and 0.1µF on output for stability.",
  },

  IC_74LS00: {
    id: "IC_74LS00",
    name: "SN74LS00 Quad 2-Input NAND Gate",
    partNumber: "SN74LS00N",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 plastic package containing 4 independent Low-Power Schottky 2-input NAND gates.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "1A", pinNumber: 1, label: "1: 1A", side: "left", description: "Gate 1 Input A" },
      { name: "1B", pinNumber: 2, label: "2: 1B", side: "left", description: "Gate 1 Input B" },
      { name: "1Y", pinNumber: 3, label: "3: 1Y", side: "left", description: "Gate 1 Output Y = (A·B)'" },
      { name: "2A", pinNumber: 4, label: "4: 2A", side: "left", description: "Gate 2 Input A" },
      { name: "2B", pinNumber: 5, label: "5: 2B", side: "left", description: "Gate 2 Input B" },
      { name: "2Y", pinNumber: 6, label: "6: 2Y", side: "left", description: "Gate 2 Output Y" },
      { name: "GND", pinNumber: 7, label: "7: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "3Y", pinNumber: 8, label: "8: 3Y", side: "right", description: "Gate 3 Output Y" },
      { name: "3A", pinNumber: 9, label: "9: 3A", side: "right", description: "Gate 3 Input A" },
      { name: "3B", pinNumber: 10, label: "10: 3B", side: "right", description: "Gate 3 Input B" },
      { name: "4Y", pinNumber: 11, label: "11: 4Y", side: "right", description: "Gate 4 Output Y" },
      { name: "4A", pinNumber: 12, label: "12: 4A", side: "right", description: "Gate 4 Input A" },
      { name: "4B", pinNumber: 13, label: "13: 4B", side: "right", description: "Gate 4 Input B" },
      { name: "VCC", pinNumber: 14, label: "14: VCC", polarity: "POSITIVE", side: "right", description: "Power Supply (+5.0V)" },
    ],
    electricalCharacteristics: [
      { label: "Propagation Delay (tpd)", typical: "9.0", max: "15", unit: "ns" },
      { label: "High-level Output Voltage (Voh)", typical: "3.4", unit: "V" },
      { label: "Low-level Output Voltage (Vol)", typical: "0.35", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Supply Voltage (Vcc)", max: "7.0", unit: "V" },
    ],
    typicalApplications: ["Universal logic synthesis (any boolean function can be realized using only NAND gates)"],
    schematicSymbolType: "IC_DIP14",
    isPolarized: true,
    datasheetSummary: "Quadruple 2-input NAND gate. Pin 7 is Ground, Pin 14 is Vcc (+5V).",
    educationalNotes: "NAND is functionally complete. Both inputs HIGH produces LOW; any input LOW produces HIGH.",
  },

  // =========================================================================
  // 4. ELECTROMECHANICAL COMPONENTS
  // =========================================================================
  RELAY_SPDT: {
    id: "RELAY_SPDT",
    name: "SRD-05VDC-SL-C 5V SPDT Power Relay",
    partNumber: "SRD-05VDC-SL-C",
    manufacturer: "Songle",
    category: "electromechanical",
    packageType: "RELAY_SPDT_BLUE",
    packageDescription: "Subminiature sealed blue plastic cube with electromagnetic coil and SPDT contact schematic printed on top.",
    dimensionsMm: { width: 70, height: 60 },
    terminals: [
      { name: "COIL1", pinNumber: 1, label: "Coil A", side: "left", description: "5V Relay excitation coil terminal 1" },
      { name: "COIL2", pinNumber: 2, label: "Coil B", side: "left", description: "5V Relay excitation coil terminal 2" },
      { name: "COM", pinNumber: 3, label: "Common (COM)", side: "right", description: "Switch common pole" },
      { name: "NC", pinNumber: 4, label: "Norm Closed (NC)", side: "right", description: "Normally closed contact (connected to COM when coil unpowered)" },
      { name: "NO", pinNumber: 5, label: "Norm Open (NO)", side: "right", description: "Normally open contact (connects to COM when coil energized)" },
    ],
    electricalCharacteristics: [
      { label: "Nominal Coil Voltage", typical: "5.0", unit: "V DC" },
      { label: "Coil Resistance", typical: "70", unit: "Ω" },
      { label: "Pick-up Voltage", typical: "3.75", unit: "V" },
      { label: "Contact Rating (AC)", typical: "10A @ 250V AC", unit: "" },
      { label: "Operate Time", typical: "10", unit: "ms" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Switching Current", max: "10", unit: "A" },
      { label: "Dielectric Strength (Coil to Contact)", max: "1500", unit: "V AC" },
    ],
    typicalApplications: ["Microcontroller-driven AC mains switching", "Automated home appliance control", "Galvanic load isolation"],
    schematicSymbolType: "RELAY_SPDT",
    isPolarized: false,
    datasheetSummary: "Single-pole double-throw electromechanical relay. When 5V is applied across Coil1-Coil2, the internal armature moves COM from NC to NO.",
    educationalNotes: "Always place a reverse-biased flyback diode (like 1N4007) across the coil to absorb inductive kickback voltage when turning off.",
  },

  PUSHBUTTON: {
    id: "PUSHBUTTON",
    name: "Tactile Momentary Push Button Switch",
    partNumber: "B3F-1000",
    manufacturer: "Omron",
    category: "electromechanical",
    packageType: "PUSH_BUTTON_6MM",
    packageDescription: "6x6mm square black housing with round center plunger actuator and 4 through-hole brass pins.",
    dimensionsMm: { width: 45, height: 45 },
    terminals: [
      { name: "A1", pinNumber: 1, label: "Pin 1A", side: "left", description: "Pole 1" },
      { name: "A2", pinNumber: 2, label: "Pin 1B", side: "left", description: "Pole 1 (tied to 1A)" },
      { name: "B1", pinNumber: 3, label: "Pin 2A", side: "right", description: "Pole 2" },
      { name: "B2", pinNumber: 4, label: "Pin 2B", side: "right", description: "Pole 2 (tied to 2A)" },
    ],
    electricalCharacteristics: [
      { label: "Contact Rating", typical: "50mA @ 24V DC", unit: "" },
      { label: "Contact Resistance", typical: "< 100", unit: "mΩ" },
      { label: "Operating Force", typical: "1.5", unit: "N" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Operating Voltage", max: "24", unit: "V DC" },
      { label: "Max Continuous Current", max: "50", unit: "mA" },
    ],
    typicalApplications: ["Digital manual clock pulse trigger", "Microcontroller reset button", "User menu input"],
    schematicSymbolType: "SWITCH_MOMENTARY",
    isPolarized: false,
    datasheetSummary: "Normally-open momentary mechanical push button.",
    educationalNotes: "Pins on opposite sides connect together when button is pressed. Connect with a pull-up or pull-down resistor for clean logic levels.",
  },

  DC_MOTOR: {
    id: "DC_MOTOR",
    name: "Miniature DC Hobby Motor (3V–6V)",
    partNumber: "130-Size DC Motor",
    manufacturer: "Mabuchi",
    category: "electromechanical",
    packageType: "DC_MOTOR_CAN",
    packageDescription: "Cylindrical zinc-plated steel motor can with 2mm brass output shaft, plastic end cap, and two solder eyelet terminals.",
    dimensionsMm: { width: 65, height: 50 },
    terminals: [
      { name: "POS", pinNumber: 1, label: "+ Term", side: "left", description: "Motor armature terminal A" },
      { name: "NEG", pinNumber: 2, label: "- Term", side: "right", description: "Motor armature terminal B" },
    ],
    electricalCharacteristics: [
      { label: "Operating Voltage", typical: "3 to 6", unit: "V DC" },
      { label: "No-Load Speed @ 3V", typical: "12,000", unit: "RPM" },
      { label: "No-Load Current", typical: "140", unit: "mA" },
      { label: "Stall Current @ 3V", typical: "1.2", unit: "A" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Armature Voltage", max: "6.0", unit: "V DC" },
      { label: "Max Stall Current", max: "1.5", unit: "A" },
    ],
    typicalApplications: ["Robotics wheel drive", "Fan propulsion", "H-Bridge bidirectional PWM speed control"],
    schematicSymbolType: "MOTOR_DC",
    isPolarized: true,
    datasheetSummary: "Permanent magnet DC motor. Reversing applied terminal voltage reverses rotational direction.",
    educationalNotes: "High stall current and inductive back-EMF require dedicated transistor/H-Bridge drivers and flyback diodes.",
  },

  // =========================================================================
  // 5. POWER ELECTRONICS & MODULES
  // =========================================================================
  BUCK_CONVERTER_LM2596: {
    id: "BUCK_CONVERTER_LM2596",
    name: "LM2596 Step-Down DC-DC Buck Converter Module",
    partNumber: "LM2596S-ADJ Module",
    manufacturer: "Texas Instruments / Generic DevKit",
    category: "power_electronics",
    packageType: "TO220",
    packageDescription: "Blue PCB module with LM2596 switching IC, 47µH shielded toroidal inductor, SS34 Schottky diode, multi-turn trimmer, and screw terminals.",
    dimensionsMm: { width: 95, height: 60 },
    terminals: [
      { name: "IN_POS", pinNumber: 1, label: "IN +", polarity: "POSITIVE", side: "left", description: "DC Input (+4.5V to 40V)" },
      { name: "IN_NEG", pinNumber: 2, label: "IN -", polarity: "NEGATIVE", side: "left", description: "Input Ground (0V)" },
      { name: "OUT_POS", pinNumber: 3, label: "OUT +", polarity: "POSITIVE", side: "right", description: "Regulated Step-Down DC Output (+1.25V to 35V)" },
      { name: "OUT_NEG", pinNumber: 4, label: "OUT -", polarity: "NEGATIVE", side: "right", description: "Output Ground (0V)" },
    ],
    electricalCharacteristics: [
      { label: "Conversion Efficiency", typical: "Up to 92%", unit: "" },
      { label: "Switching Frequency", typical: "150", unit: "kHz" },
      { label: "Output Current", typical: "2.0 (3.0A with heatsink)", unit: "A" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Input DC Voltage", max: "40", unit: "V" },
      { label: "Max Peak Load Current", max: "3.0", unit: "A" },
    ],
    typicalApplications: ["High-efficiency step-down conversion from 12V/24V to 5V/3.3V without excessive heat of linear regulators"],
    keyFormulas: ["V_out = D × V_in", "Efficiency η = P_out / P_in"],
    schematicSymbolType: "CONVERTER_BUCK",
    isPolarized: true,
    datasheetSummary: "150 kHz fixed-frequency PWM step-down buck converter capable of driving 3A loads with high efficiency.",
    educationalNotes: "Adjust the onboard precision multiturn brass trimmer potentiometer to set desired output voltage.",
  },

  // =========================================================================
  // 6. MICROCONTROLLERS & IOT COMMUNICATION MODULES
  // =========================================================================
  ARDUINO_UNO_R3: {
    id: "ARDUINO_UNO_R3",
    name: "Arduino Uno R3 Microcontroller Board",
    partNumber: "A000066 (ATmega328P)",
    manufacturer: "Arduino / Microchip",
    category: "microcontrollers_modules",
    packageType: "PCB_ARDUINO_UNO",
    packageDescription: "Official blue PCB layout with ATmega328P-PU DIP chip, 16MHz crystal oscillator, silver USB-B jack, 2.1mm DC barrel jack, and dual female pin headers.",
    dimensionsMm: { width: 140, height: 100 },
    terminals: [
      { name: "D0_RX", pinNumber: 0, label: "D0 (RX)", side: "top", description: "Digital Pin 0 / Serial Receive" },
      { name: "D1_TX", pinNumber: 1, label: "D1 (TX)", side: "top", description: "Digital Pin 1 / Serial Transmit" },
      { name: "D2", pinNumber: 2, label: "D2", side: "top", description: "Digital Pin 2 (External Interrupt 0)" },
      { name: "D3_PWM", pinNumber: 3, label: "D3 (~PWM)", side: "top", description: "Digital Pin 3 (8-bit PWM)" },
      { name: "D4", pinNumber: 4, label: "D4", side: "top", description: "Digital Pin 4" },
      { name: "D5_PWM", pinNumber: 5, label: "D5 (~PWM)", side: "top", description: "Digital Pin 5 (8-bit PWM)" },
      { name: "D6_PWM", pinNumber: 6, label: "D6 (~PWM)", side: "top", description: "Digital Pin 6 (8-bit PWM)" },
      { name: "D7", pinNumber: 7, label: "D7", side: "top", description: "Digital Pin 7" },
      { name: "D8", pinNumber: 8, label: "D8", side: "top", description: "Digital Pin 8" },
      { name: "D9_PWM", pinNumber: 9, label: "D9 (~PWM)", side: "top", description: "Digital Pin 9 (8-bit PWM)" },
      { name: "D10_SS", pinNumber: 10, label: "D10 (~SS)", side: "top", description: "Digital Pin 10 (SPI Chip Select)" },
      { name: "D11_MOSI", pinNumber: 11, label: "D11 (~MOSI)", side: "top", description: "Digital Pin 11 (SPI MOSI)" },
      { name: "D12_MISO", pinNumber: 12, label: "D12 (MISO)", side: "top", description: "Digital Pin 12 (SPI MISO)" },
      { name: "D13_SCK", pinNumber: 13, label: "D13 (SCK)", side: "top", description: "Digital Pin 13 (Built-in LED & SPI Clock)" },
      { name: "GND_TOP", pinNumber: 14, label: "GND", polarity: "NEGATIVE", side: "top", description: "Ground (Digital rail)" },
      { name: "AREF", pinNumber: 15, label: "AREF", side: "top", description: "Analog Reference Voltage" },
      { name: "A0", pinNumber: 16, label: "A0", side: "bottom", description: "Analog Input 0 (10-bit ADC, 0-5V)" },
      { name: "A1", pinNumber: 17, label: "A1", side: "bottom", description: "Analog Input 1" },
      { name: "A2", pinNumber: 18, label: "A2", side: "bottom", description: "Analog Input 2" },
      { name: "A3", pinNumber: 19, label: "A3", side: "bottom", description: "Analog Input 3" },
      { name: "A4_SDA", pinNumber: 20, label: "A4 (SDA)", side: "bottom", description: "Analog Input 4 / I2C Data (SDA)" },
      { name: "A5_SCL", pinNumber: 21, label: "A5 (SCL)", side: "bottom", description: "Analog Input 5 / I2C Clock (SCL)" },
      { name: "VCC_5V", pinNumber: 22, label: "+5V", polarity: "POSITIVE", side: "bottom", description: "Regulated +5.0V power output rail" },
      { name: "VCC_3V3", pinNumber: 23, label: "+3.3V", polarity: "POSITIVE", side: "bottom", description: "Regulated +3.3V power output rail" },
      { name: "GND_BOT", pinNumber: 24, label: "GND", polarity: "NEGATIVE", side: "bottom", description: "Ground reference" },
      { name: "VIN", pinNumber: 25, label: "VIN", polarity: "POSITIVE", side: "bottom", description: "External raw DC input (7-12V)" },
    ],
    electricalCharacteristics: [
      { label: "Microcontroller", typical: "ATmega328P 8-bit AVR", unit: "" },
      { label: "Operating Voltage", typical: "5.0", unit: "V" },
      { label: "Clock Speed", typical: "16", unit: "MHz" },
      { label: "Flash Memory", typical: "32 KB (0.5 KB used by bootloader)", unit: "" },
      { label: "SRAM", typical: "2", unit: "KB" },
      { label: "EEPROM", typical: "1", unit: "KB" },
      { label: "DC Current per I/O Pin", typical: "20", max: "40", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Max VIN Input Voltage", max: "20", unit: "V DC" },
      { label: "Max Current per I/O Pin", max: "40", unit: "mA" },
      { label: "Max Total VCC/GND Current", max: "200", unit: "mA" },
    ],
    typicalApplications: ["Embedded systems labs", "Sensor data acquisition", "Robotics and motor actuation", "IoT sensor nodes"],
    schematicSymbolType: "MCU_ARDUINO",
    isPolarized: true,
    datasheetSummary: "World standard education and prototyping microcontroller board powered by the 8-bit ATmega328P.",
    educationalNotes: "Features 14 digital I/O pins (6 PWM capable) and 6 10-bit analog inputs.",
  },

  ESP32_DEVKIT_V1: {
    id: "ESP32_DEVKIT_V1",
    name: "ESP32 DevKit V1 (30-Pin NodeMCU)",
    partNumber: "ESP-WROOM-32D",
    manufacturer: "Espressif Systems",
    category: "microcontrollers_modules",
    packageType: "PCB_ESP32_DEVKIT",
    packageDescription: "Matte black breadboard-friendly PCB with RF metal shield can, 2.4GHz PCB meander antenna, CP2102 USB-UART, EN/BOOT buttons, and dual 15-pin headers.",
    dimensionsMm: { width: 130, height: 95 },
    terminals: [
      { name: "3V3", pinNumber: 1, label: "3V3", polarity: "POSITIVE", side: "left", description: "Regulated 3.3V power rail" },
      { name: "EN", pinNumber: 2, label: "EN", side: "left", description: "Enable / Reset chip" },
      { name: "VP", pinNumber: 3, label: "VP (GPIO36)", side: "left", description: "ADC1_CH0 (Input only)" },
      { name: "VN", pinNumber: 4, label: "VN (GPIO39)", side: "left", description: "ADC1_CH3 (Input only)" },
      { name: "D34", pinNumber: 5, label: "D34", side: "left", description: "GPIO34 (Input only)" },
      { name: "D35", pinNumber: 6, label: "D35", side: "left", description: "GPIO35 (Input only)" },
      { name: "D32", pinNumber: 7, label: "D32", side: "left", description: "GPIO32 (ADC1_CH4, Touch 9)" },
      { name: "D33", pinNumber: 8, label: "D33", side: "left", description: "GPIO33 (ADC1_CH5, Touch 8)" },
      { name: "D25", pinNumber: 9, label: "D25", side: "left", description: "GPIO25 (DAC1, ADC2_CH8)" },
      { name: "D26", pinNumber: 10, label: "D26", side: "left", description: "GPIO26 (DAC2, ADC2_CH9)" },
      { name: "D27", pinNumber: 11, label: "D27", side: "left", description: "GPIO27 (Touch 7)" },
      { name: "D14", pinNumber: 12, label: "D14", side: "left", description: "GPIO14 (HSPI_CLK)" },
      { name: "D12", pinNumber: 13, label: "D12", side: "left", description: "GPIO12 (HSPI_MISO)" },
      { name: "D13", pinNumber: 14, label: "D13", side: "left", description: "GPIO13 (HSPI_MOSI)" },
      { name: "GND_L", pinNumber: 15, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground" },
      { name: "VIN", pinNumber: 16, label: "VIN (5V)", polarity: "POSITIVE", side: "right", description: "Raw 5V USB / External input" },
      { name: "GND_R", pinNumber: 17, label: "GND", polarity: "NEGATIVE", side: "right", description: "Ground" },
      { name: "D23", pinNumber: 18, label: "D23 (MOSI)", side: "right", description: "GPIO23 (VSPI_MOSI)" },
      { name: "D22", pinNumber: 19, label: "D22 (SCL)", side: "right", description: "GPIO22 (I2C SCL)" },
      { name: "TX0", pinNumber: 20, label: "TX0", side: "right", description: "GPIO1 (UART0 TX)" },
      { name: "RX0", pinNumber: 21, label: "RX0", side: "right", description: "GPIO3 (UART0 RX)" },
      { name: "D21", pinNumber: 22, label: "D21 (SDA)", side: "right", description: "GPIO21 (I2C SDA)" },
      { name: "D19", pinNumber: 23, label: "D19 (MISO)", side: "right", description: "GPIO19 (VSPI_MISO)" },
      { name: "D18", pinNumber: 24, label: "D18 (SCK)", side: "right", description: "GPIO18 (VSPI_CLK)" },
      { name: "D5", pinNumber: 25, label: "D5 (CS)", side: "right", description: "GPIO5 (VSPI_CS)" },
      { name: "D4", pinNumber: 26, label: "D4", side: "right", description: "GPIO4 (Touch 0)" },
      { name: "D2", pinNumber: 27, label: "D2 (LED)", side: "right", description: "GPIO2 (Built-in Blue LED)" },
      { name: "D15", pinNumber: 28, label: "D15", side: "right", description: "GPIO15 (HSPI_CS)" },
    ],
    electricalCharacteristics: [
      { label: "Processor Core", typical: "Xtensa 32-bit LX6 Dual-Core", unit: "" },
      { label: "Clock Frequency", typical: "240", unit: "MHz" },
      { label: "SRAM", typical: "520", unit: "KB" },
      { label: "Wi-Fi Protocol", typical: "802.11 b/g/n (up to 150 Mbps)", unit: "" },
      { label: "Bluetooth", typical: "v4.2 BR/EDR and BLE", unit: "" },
      { label: "Logic Level", typical: "3.3V (NOT 5V tolerant!)", unit: "" },
    ],
    absoluteMaximumRatings: [
      { label: "Max 3.3V Pin Voltage", max: "3.6", unit: "V DC" },
      { label: "Max Current per GPIO Pin", max: "40", unit: "mA" },
      { label: "Max Storage Temperature", max: "150", unit: "°C" },
    ],
    typicalApplications: ["IoT telemetry and cloud dashboard gateways", "Wi-Fi smart home devices", "Wireless sensor networks", "FreeRTOS multitasking"],
    schematicSymbolType: "MCU_ESP32",
    isPolarized: true,
    datasheetSummary: "High-performance dual-core 32-bit SoC with integrated 2.4GHz Wi-Fi and Bluetooth LE.",
    educationalNotes: "CRITICAL: ESP32 GPIOs operate at 3.3V. Applying 5V directly to GPIO pins will damage the chip. Use level shifters or voltage dividers.",
  },

  MODULE_HC05_BLUETOOTH: {
    id: "MODULE_HC05_BLUETOOTH",
    name: "HC-05 Wireless Bluetooth Serial SPP Module",
    partNumber: "HC-05",
    manufacturer: "Guangzhou HC Information Tech",
    category: "microcontrollers_modules",
    packageType: "MODULE_BLUETOOTH",
    packageDescription: "Blue carrier PCB with BC417 Bluetooth chip, onboard 3.3V LDO, tactile AT-command button, status LED, and 6-pin header.",
    dimensionsMm: { width: 75, height: 40 },
    terminals: [
      { name: "STATE", pinNumber: 1, label: "STATE", side: "left", description: "Connection status output" },
      { name: "RXD", pinNumber: 2, label: "RXD (3.3V)", side: "left", description: "UART Serial Receive (requires 3.3V logic)" },
      { name: "TXD", pinNumber: 3, label: "TXD (3.3V)", side: "left", description: "UART Serial Transmit (3.3V output)" },
      { name: "GND", pinNumber: 4, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground" },
      { name: "VCC", pinNumber: 5, label: "VCC (5V)", polarity: "POSITIVE", side: "left", description: "Power input (+3.6V to +6V DC)" },
      { name: "EN", pinNumber: 6, label: "EN / KEY", side: "left", description: "Enable / AT command mode entry switch" },
    ],
    electricalCharacteristics: [
      { label: "Bluetooth Spec", typical: "v2.0 + EDR", unit: "" },
      { label: "Default Baud Rate", typical: "9600 (Data) / 38400 (AT mode)", unit: "bps" },
      { label: "RF Range", typical: "10", unit: "meters (Class 2)" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Supply Voltage (VCC)", max: "6.0", unit: "V DC" },
      { label: "Max UART Pin Voltage (RXD)", max: "3.6", unit: "V DC" },
    ],
    typicalApplications: ["Wireless serial UART bridge for smartphones and PCs", "Remote telemetry control of mobile robots"],
    schematicSymbolType: "MODULE_GENERIC",
    isPolarized: true,
    datasheetSummary: "Transparent serial port profile (SPP) Bluetooth bridge for point-to-point wireless microcomputer communication.",
    educationalNotes: "Carrier board accepts 5V on Vcc, but the RXD data pin is 3.3V level. Use a 1kΩ/2kΩ voltage divider from Arduino 5V TX to HC-05 RXD.",
  },

  MODULE_LORA_SX1278: {
    id: "MODULE_LORA_SX1278",
    name: "SX1278 433MHz Long Range LoRa Transceiver",
    partNumber: "Ra-02 (Semtech SX1278)",
    manufacturer: "Ai-Thinker / Semtech",
    category: "microcontrollers_modules",
    packageType: "MODULE_LORA",
    packageDescription: "Compact blue PCB with soldered metal RF shield, IPEX antenna connector, and helical copper spring antenna.",
    dimensionsMm: { width: 80, height: 50 },
    terminals: [
      { name: "GND", pinNumber: 1, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground" },
      { name: "VCC", pinNumber: 2, label: "3.3V", polarity: "POSITIVE", side: "left", description: "3.3V DC Power Supply" },
      { name: "NSS", pinNumber: 3, label: "NSS (CS)", side: "left", description: "SPI Chip Select (active low)" },
      { name: "SCK", pinNumber: 4, label: "SCK", side: "left", description: "SPI Clock" },
      { name: "MOSI", pinNumber: 5, label: "MOSI", side: "right", description: "SPI Master Out Slave In" },
      { name: "MISO", pinNumber: 6, label: "MISO", side: "right", description: "SPI Master In Slave Out" },
      { name: "DIO0", pinNumber: 7, label: "DIO0 (IRQ)", side: "right", description: "Packet received / Tx done interrupt" },
      { name: "RST", pinNumber: 8, label: "RST", side: "right", description: "Active low reset" },
    ],
    electricalCharacteristics: [
      { label: "Carrier Frequency", typical: "433", unit: "MHz" },
      { label: "Max Transmit Power", typical: "+20", unit: "dBm (100mW)" },
      { label: "Receiver Sensitivity", typical: "-148", unit: "dBm" },
      { label: "Outdoor Line-of-Sight Range", typical: "5 to 10", unit: "km" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Supply Voltage (VCC)", max: "3.6", unit: "V DC" },
      { label: "Max RF Input Power", max: "+10", unit: "dBm" },
      { label: "Max Storage Temperature", max: "125", unit: "°C" },
    ],
    typicalApplications: ["Agricultural weather stations", "Long-range satellite telemetry tracking", "Remote sensor monitoring"],
    schematicSymbolType: "MODULE_LORA",
    isPolarized: true,
    datasheetSummary: "Spread-spectrum long-range transceiver utilizing chirp spread spectrum (CSS) modulation for exceptional noise immunity.",
    educationalNotes: "Operates strictly on 3.3V logic. Always connect an antenna before transmitting to prevent RF power reflection damage.",
  },

  // -------------------------------------------------------------------------
  // PASSIVES EXPANSION
  // -------------------------------------------------------------------------
  RES_SMD: {
    id: "RES_SMD",
    name: "SMD 0805 Thick Film Chip Resistor",
    partNumber: "RC0805FR-0710KL",
    manufacturer: "Yageo / Panasonic",
    category: "passives",
    packageType: "AXIAL_RESISTOR",
    packageDescription: "Surface mount 0805 (2.0 x 1.25mm) ceramic substrate with ruthenium oxide film, nickel barrier solder terminations, and 3-digit marking '103'.",
    dimensionsMm: { width: 40, height: 25 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Pad 1", side: "left", description: "Solder End Termination 1" },
      { name: "T2", pinNumber: 2, label: "Pad 2", side: "right", description: "Solder End Termination 2" },
    ],
    defaultValues: {
      valueNumber: 10000,
      valueUnit: "Ω",
      formattedValue: "10 kΩ (0805 SMD)",
      powerRatingW: 0.125,
      tolerancePct: 1,
    },
    electricalCharacteristics: [
      { label: "Resistance", typical: "10 kΩ", unit: "Ω" },
      { label: "Power Rating @ 70°C", typical: "0.125 (1/8 W)", unit: "W" },
      { label: "Temperature Coefficient", typical: "±100", unit: "ppm/°C" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Working Voltage", max: "150", unit: "V" },
      { label: "Max Overload Voltage", max: "300", unit: "V" },
    ],
    typicalApplications: ["High-density SMD PCB production", "Mobile devices and compact IoT sensors"],
    schematicSymbolType: "RESISTOR_IEEE",
    isPolarized: false,
    datasheetSummary: "Standard 0805 metric 2012 surface-mount resistor marked '103' (10 × 10³ = 10kΩ).",
    educationalNotes: "No lead wires; solders directly to PCB surface pads via reflow or hand soldering.",
  },

  RES_WIREWOUND: {
    id: "RES_WIREWOUND",
    name: "5W Ceramic Cement Wirewound Power Resistor",
    partNumber: "SQP500JB-10R",
    manufacturer: "Yageo / Vishay",
    category: "passives",
    packageType: "AXIAL_RESISTOR",
    packageDescription: "Flameproof rectangular white steatite ceramic block filled with silica sand and non-inductive wirewound element.",
    dimensionsMm: { width: 75, height: 35 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Terminal 1" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Terminal 2" },
    ],
    defaultValues: {
      valueNumber: 10,
      valueUnit: "Ω",
      formattedValue: "10 Ω / 5 Watts",
      powerRatingW: 5.0,
      tolerancePct: 5,
    },
    electricalCharacteristics: [
      { label: "Nominal Resistance", typical: "10", unit: "Ω" },
      { label: "Power Rating", typical: "5.0", unit: "W" },
      { label: "Dielectric Strength", typical: "1000", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Continuous Power", max: "5.0", unit: "W" },
      { label: "Operating Temperature", max: "275", unit: "°C" },
    ],
    typicalApplications: ["Power supply inrush current limiting", "DC motor current sensing", "Audio amplifier dummy load testing"],
    schematicSymbolType: "RESISTOR_IEEE",
    isPolarized: false,
    datasheetSummary: "High-power 5W ceramic cement resistor built to dissipate substantial heat safely.",
    educationalNotes: "Body gets hot under continuous load. Mount with clearance above PCB surface.",
  },

  POT_TRIMMER: {
    id: "POT_TRIMMER",
    name: "Bourns 3296 Multi-Turn Trimmer Potentiometer",
    partNumber: "3296W-1-103LF",
    manufacturer: "Bourns",
    category: "passives",
    packageType: "TRIMMER_POT",
    packageDescription: "Square sealed blue plastic body (3/8-inch) with top brass adjustment screw (25 turns) and 3 in-line pins.",
    dimensionsMm: { width: 50, height: 50 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Pin 1 (CCW)", side: "left", description: "Fixed element terminal 1" },
      { name: "WIPER", pinNumber: 2, label: "Pin 2 (Wiper)", side: "bottom", description: "Center wiper terminal" },
      { name: "T3", pinNumber: 3, label: "Pin 3 (CW)", side: "right", description: "Fixed element terminal 3" },
    ],
    defaultValues: {
      valueNumber: 10000,
      valueUnit: "Ω",
      formattedValue: "10 kΩ (25-Turn)",
      powerRatingW: 0.5,
    },
    electricalCharacteristics: [
      { label: "Standard Resistance", typical: "10 kΩ", unit: "Ω" },
      { label: "Rotational Life", typical: "25 turns full travel", unit: "" },
      { label: "Contact Resistance Variation", typical: "1.0%", unit: "" },
    ],
    absoluteMaximumRatings: [
      { label: "Power Rating @ 70°C", max: "0.5", unit: "W" },
      { label: "Max Voltage", max: "300", unit: "V" },
    ],
    typicalApplications: ["Op-amp offset voltage nulling", "Precision voltage reference calibration", "Sensor comparator threshold tuning"],
    schematicSymbolType: "POTENTIOMETER",
    isPolarized: false,
    datasheetSummary: "High-precision 25-turn cermet trimmer allowing fine micro-adjustments.",
    educationalNotes: "Requires approximately 25 full screwdriver turns to traverse from 0Ω to 10kΩ.",
  },

  CAP_TANTALUM: {
    id: "CAP_TANTALUM",
    name: "Solid Dipped Tantalum Capacitor (10µF 16V)",
    partNumber: "TAP106K016SCS",
    manufacturer: "KYOCERA AVX",
    category: "passives",
    packageType: "TANTALUM_DIP",
    packageDescription: "Teardrop-shaped yellow/orange epoxy dipped bead with '+' printed above the longer anode lead.",
    dimensionsMm: { width: 45, height: 50 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "+ Anode", polarity: "ANODE", side: "left", description: "Positive terminal (+) marked on body" },
      { name: "CATHODE", pinNumber: 2, label: "- Cathode", polarity: "CATHODE", side: "right", description: "Negative terminal (-)" },
    ],
    defaultValues: {
      valueNumber: 0.00001,
      valueUnit: "F",
      formattedValue: "10 µF / 16V",
      voltageRatingV: 16,
    },
    electricalCharacteristics: [
      { label: "Capacitance", typical: "10", unit: "µF" },
      { label: "ESR @ 100kHz", typical: "1.8", unit: "Ω" },
      { label: "Leakage Current", typical: "0.8", unit: "µA" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated Voltage", max: "16", unit: "V DC" },
      { label: "Operating Temperature", max: "125", unit: "°C" },
    ],
    typicalApplications: ["Low-ESR microcontroller supply decoupling", "High-frequency DC-DC converter output bypass"],
    schematicSymbolType: "CAPACITOR_POLARIZED",
    isPolarized: true,
    datasheetSummary: "Solid electrolyte tantalum capacitor with ultra-low leakage current and stable capacitance across temperature.",
    educationalNotes: "CRITICAL: Unlike aluminum electrolytics which mark the negative lead, tantalum capacitors mark the POSITIVE lead with a '+' sign!",
  },

  CAP_POLYESTER: {
    id: "CAP_POLYESTER",
    name: "Metallized Polyester Film Capacitor (MKT 220nF)",
    partNumber: "B32529C0224K000",
    manufacturer: "TDK / EPCOS",
    category: "passives",
    packageType: "BOX_POLYESTER",
    packageDescription: "Compact rectangular yellow/green epoxy box with radial tin-plated leads, marked '220nK 100V'.",
    dimensionsMm: { width: 55, height: 45 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Terminal 1" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Terminal 2" },
    ],
    defaultValues: {
      valueNumber: 0.00000022,
      valueUnit: "F",
      formattedValue: "220 nF (0.22 µF)",
      voltageRatingV: 100,
    },
    electricalCharacteristics: [
      { label: "Capacitance", typical: "220", unit: "nF" },
      { label: "Dissipation Factor tan δ", typical: "0.008", unit: "" },
      { label: "Self-Healing Dielectric", typical: "Yes", unit: "" },
    ],
    absoluteMaximumRatings: [
      { label: "Rated DC Voltage", max: "100", unit: "V" },
    ],
    typicalApplications: ["High-fidelity audio tone controls", "Active RC filter poles", "Switching power supply snubber networks"],
    schematicSymbolType: "CAPACITOR_NONPOLAR",
    isPolarized: false,
    datasheetSummary: "Non-inductive wound metallized polyester capacitor with self-healing properties and low dielectric absorption.",
    educationalNotes: "Non-polarized and ideal for audio and analog signal paths where electrolytic distortion is unacceptable.",
  },

  XTAL_16MHZ: {
    id: "XTAL_16MHZ",
    name: "16.000 MHz Quartz Crystal Resonator",
    partNumber: "HC-49/S 16.000M",
    manufacturer: "Abracon / Citizen",
    category: "passives",
    packageType: "AXIAL_RESISTOR",
    packageDescription: "Low-profile HC-49/S hermetically sealed metal can package with stamped '16.000MHz' and 2 leads.",
    dimensionsMm: { width: 50, height: 40 },
    terminals: [
      { name: "XTAL1", pinNumber: 1, label: "Pin 1 (OSC_IN)", side: "left", description: "Crystal Lead 1" },
      { name: "XTAL2", pinNumber: 2, label: "Pin 2 (OSC_OUT)", side: "right", description: "Crystal Lead 2" },
    ],
    defaultValues: {
      formattedValue: "16.000 MHz (22pF)",
    },
    electricalCharacteristics: [
      { label: "Fundamental Frequency", typical: "16.000", unit: "MHz" },
      { label: "Load Capacitance (CL)", typical: "22", unit: "pF" },
      { label: "Frequency Tolerance", typical: "±20", unit: "ppm" },
    ],
    absoluteMaximumRatings: [
      { label: "Operating Temperature", max: "-40 to +85", unit: "°C" },
    ],
    typicalApplications: ["Microcontroller master system clock (Arduino Uno ATmega328P clock generator)"],
    schematicSymbolType: "CRYSTAL_OSC",
    isPolarized: false,
    datasheetSummary: "Piezoelectric quartz crystal providing precise 16 MHz reference frequency when paired with two 22pF load capacitors to ground.",
    educationalNotes: "Requires two 22pF ceramic capacitors connected from each lead to Ground to initiate and sustain oscillation.",
  },

  // -------------------------------------------------------------------------
  // SEMICONDUCTORS EXPANSION
  // -------------------------------------------------------------------------
  DIODE_1N5819: {
    id: "DIODE_1N5819",
    name: "1N5819 1A 40V Schottky Barrier Diode",
    partNumber: "1N5819",
    manufacturer: "STMicroelectronics / Diodes Inc.",
    category: "semiconductors",
    packageType: "AXIAL_DIODE_DO41",
    packageDescription: "DO-41 molded plastic with silver cathode band, low forward voltage metal-silicon junction.",
    dimensionsMm: { width: 60, height: 20 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (A)", polarity: "ANODE", side: "left", description: "Anode" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (K)", polarity: "CATHODE", side: "right", description: "Cathode (silver band)" },
    ],
    electricalCharacteristics: [
      { label: "Forward Voltage Drop (Vf @ 1A)", typical: "0.36", max: "0.60", unit: "V" },
      { label: "Reverse Recovery Time", typical: "< 10 (negligible)", unit: "ns" },
    ],
    absoluteMaximumRatings: [
      { label: "Peak Repetitive Reverse (Vrrm)", max: "40", unit: "V" },
      { label: "Average Forward Current (Io)", max: "1.0", unit: "A" },
    ],
    typicalApplications: ["High-efficiency DC-DC buck catch/freewheeling diode", "Solar panel reverse-current blocking", "Low-loss polarity protection"],
    schematicSymbolType: "DIODE_SCHOTTKY",
    isPolarized: true,
    datasheetSummary: "Schottky barrier diode with ultra-low forward drop (~0.35V vs 0.7V for silicon) and zero minority-carrier recovery time.",
    educationalNotes: "Crucial in switching regulators to reduce diode conduction and switching losses.",
  },

  DIODE_ZENER_12V: {
    id: "DIODE_ZENER_12V",
    name: "1N4742A 12V 1W Zener Voltage Regulator Diode",
    partNumber: "1N4742A",
    manufacturer: "Microsemi / ON Semi",
    category: "semiconductors",
    packageType: "GLASS_DIODE_DO35",
    packageDescription: "DO-35 glass envelope with cathode band, stamped '12V'.",
    dimensionsMm: { width: 55, height: 18 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (A)", polarity: "ANODE", side: "left", description: "Anode" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (K)", polarity: "CATHODE", side: "right", description: "Cathode (connect to + in regulation)" },
    ],
    defaultValues: { formattedValue: "12.0 V / 1W" },
    electricalCharacteristics: [
      { label: "Nominal Zener Voltage (Vz)", typical: "12.0", unit: "V" },
      { label: "Test Current (Izt)", typical: "21", unit: "mA" },
      { label: "Dynamic Impedance", typical: "9.0", unit: "Ω" },
    ],
    absoluteMaximumRatings: [
      { label: "Power Dissipation", max: "1.0", unit: "W" },
    ],
    typicalApplications: ["12V DC power rail stabilization", "Overvoltage clamp for MOSFET gates (prevents Vgs > 20V destruction)"],
    schematicSymbolType: "DIODE_ZENER",
    isPolarized: true,
    datasheetSummary: "12V 1 Watt Zener diode providing a stable clamping voltage in reverse breakdown.",
    educationalNotes: "Always pair with a current limiting resistor to prevent exceeding the 1W power limit.",
  },

  LED_5MM_GREEN: {
    id: "LED_5MM_GREEN",
    name: "Green 5mm Diffused Through-Hole LED",
    partNumber: "HLMP-1503",
    manufacturer: "Broadcom / Kingbright",
    category: "semiconductors",
    packageType: "LED_5MM",
    packageDescription: "5mm round tinted green epoxy lens with cathode flat edge notch.",
    dimensionsMm: { width: 50, height: 50 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (+)", polarity: "ANODE", side: "left", description: "Positive Anode lead (longer)" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (-)", polarity: "CATHODE", side: "right", description: "Negative Cathode lead (flat rim edge)" },
    ],
    defaultValues: { formattedValue: "2.2V / 20mA (Green)" },
    electricalCharacteristics: [
      { label: "Forward Voltage (Vf @ 20mA)", typical: "2.2", max: "2.6", unit: "V" },
      { label: "Dominant Wavelength", typical: "565", unit: "nm" },
      { label: "Luminous Intensity", typical: "45", unit: "mcd" },
    ],
    absoluteMaximumRatings: [
      { label: "Forward Current", max: "30", unit: "mA" },
      { label: "Reverse Voltage", max: "5.0", unit: "V" },
    ],
    typicalApplications: ["Power ON status indicator", "Logic HIGH monitor"],
    schematicSymbolType: "LED",
    isPolarized: true,
    datasheetSummary: "Diffused GaP green LED with 2.2V typical forward drop.",
    educationalNotes: "Use 150Ω on 5V rail for standard 20mA illumination.",
  },

  LED_5MM_BLUE: {
    id: "LED_5MM_BLUE",
    name: "Blue 5mm Water-Clear High-Brightness LED",
    partNumber: "C503B-BAS",
    manufacturer: "Cree LED",
    category: "semiconductors",
    packageType: "LED_5MM",
    packageDescription: "5mm round water-clear InGaN epoxy lens emitting intense 470nm royal blue light.",
    dimensionsMm: { width: 50, height: 50 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Anode (+)", polarity: "ANODE", side: "left", description: "Positive Anode" },
      { name: "CATHODE", pinNumber: 2, label: "Cathode (-)", polarity: "CATHODE", side: "right", description: "Negative Cathode" },
    ],
    defaultValues: { formattedValue: "3.2V / 20mA (Blue)" },
    electricalCharacteristics: [
      { label: "Forward Voltage (Vf @ 20mA)", typical: "3.2", max: "3.8", unit: "V" },
      { label: "Wavelength", typical: "470", unit: "nm" },
      { label: "Luminous Intensity", typical: "4000", unit: "mcd" },
    ],
    absoluteMaximumRatings: [
      { label: "Continuous Forward Current", max: "30", unit: "mA" },
    ],
    typicalApplications: ["High-visibility status beacons", "Optoelectronic pulse detectors"],
    schematicSymbolType: "LED",
    isPolarized: true,
    datasheetSummary: "Indium Gallium Nitride (InGaN) blue LED with higher forward voltage drop of ~3.2V.",
    educationalNotes: "Requires higher forward voltage than red/green LEDs due to wider semiconductor bandgap.",
  },

  BJT_2N2222: {
    id: "BJT_2N2222",
    name: "2N2222A NPN High-Speed Switching Transistor",
    partNumber: "PN2222A",
    manufacturer: "Central Semi / ON Semi",
    category: "semiconductors",
    packageType: "TO92",
    packageDescription: "TO-92 molded epoxy with flat front face stamped 'PN2222A' and 3 copper leads.",
    dimensionsMm: { width: 55, height: 60 },
    terminals: [
      { name: "EMITTER", pinNumber: 1, label: "Emitter (E)", polarity: "EMITTER", side: "left", description: "Emitter (Pin 1 on US TO-92 pinout)" },
      { name: "BASE", pinNumber: 2, label: "Base (B)", polarity: "BASE", side: "bottom", description: "Base (Pin 2)" },
      { name: "COLLECTOR", pinNumber: 3, label: "Collector (C)", polarity: "COLLECTOR", side: "right", description: "Collector (Pin 3)" },
    ],
    electricalCharacteristics: [
      { label: "DC Current Gain (hFE @ 150mA)", typical: "100 to 300", unit: "" },
      { label: "Collector Saturation (Vce_sat @ 500mA)", typical: "0.3", max: "1.0", unit: "V" },
      { label: "Gain Bandwidth Product (ft)", typical: "300", unit: "MHz" },
    ],
    absoluteMaximumRatings: [
      { label: "Collector-Emitter Voltage (Vceo)", max: "40", unit: "V" },
      { label: "Continuous Collector Current (Ic)", max: "800", unit: "mA" },
      { label: "Total Power Dissipation", max: "625", unit: "mW" },
    ],
    typicalApplications: ["Medium-power relay and solenoid driver", "High-speed logic level translation", "RF transmitters"],
    schematicSymbolType: "TRANSISTOR_NPN",
    isPolarized: true,
    datasheetSummary: "Workhorse 800mA NPN bipolar junction transistor for fast switching up to 300MHz.",
    educationalNotes: "Supports higher collector current (800mA) than the BC547 (100mA). Note that US TO-92 pinout is E-B-C from left to right.",
  },

  BJT_TIP120: {
    id: "BJT_TIP120",
    name: "TIP120 5A 60V NPN Power Darlington Transistor",
    partNumber: "TIP120",
    manufacturer: "STMicroelectronics / ON Semi",
    category: "semiconductors",
    packageType: "TO220",
    packageDescription: "TO-220 package with metal heatsink tab, internal monolithic dual BJT Darlington pair with base-emitter speed-up resistors and clamp diode.",
    dimensionsMm: { width: 65, height: 75 },
    terminals: [
      { name: "BASE", pinNumber: 1, label: "Base (B)", polarity: "BASE", side: "left", description: "Base (Pin 1)" },
      { name: "COLLECTOR", pinNumber: 2, label: "Collector (C)", polarity: "COLLECTOR", side: "right", description: "Collector (Pin 2, tied to tab)" },
      { name: "EMITTER", pinNumber: 3, label: "Emitter (E)", polarity: "EMITTER", side: "bottom", description: "Emitter (Pin 3)" },
    ],
    electricalCharacteristics: [
      { label: "DC Current Gain (hFE @ Ic=3A)", typical: "1,000 to 5,000", unit: "" },
      { label: "Base-Emitter Turn-On (Vbe)", typical: "1.4", max: "2.5", unit: "V" },
      { label: "Collector Saturation (Vce_sat @ 3A)", typical: "1.2", max: "2.0", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Collector-Emitter Voltage (Vceo)", max: "60", unit: "V" },
      { label: "Continuous Collector Current (Ic)", max: "5.0", unit: "A" },
      { label: "Max Power Dissipation (Tc=25°C)", max: "65", unit: "W" },
    ],
    typicalApplications: ["Direct microcontroller logic pin to high-current DC motor/solenoid driver", "Heavy lamp dimmers"],
    schematicSymbolType: "TRANSISTOR_DARLINGTON",
    isPolarized: true,
    datasheetSummary: "Complementary Darlington power transistor with enormous current gain (hFE ≥ 1000). A tiny 2mA micro logic output can easily switch a 2A inductive motor.",
    educationalNotes: "Vbe forward drop is ~1.4V (sum of two series silicon base-emitter junctions). Vce_sat is higher than a single BJT.",
  },

  OPTOCOUPLER_4N35: {
    id: "OPTOCOUPLER_4N35",
    name: "4N35 6-Pin DIP Phototransistor Optocoupler",
    partNumber: "4N35",
    manufacturer: "Vishay Semiconductor",
    category: "semiconductors",
    packageType: "DIP8",
    packageDescription: "DIP-6 white plastic package containing GaAs infrared emitter diode optically coupled to silicon phototransistor with 5000V RMS galvanic isolation.",
    dimensionsMm: { width: 75, height: 70 },
    terminals: [
      { name: "ANODE", pinNumber: 1, label: "Pin 1: Anode (+)", polarity: "ANODE", side: "left", description: "Infrared LED Anode" },
      { name: "CATHODE", pinNumber: 2, label: "Pin 2: Cathode (-)", polarity: "CATHODE", side: "left", description: "Infrared LED Cathode" },
      { name: "NC", pinNumber: 3, label: "Pin 3: NC", side: "left", description: "No Connection" },
      { name: "EMITTER", pinNumber: 4, label: "Pin 4: Emitter (E)", polarity: "EMITTER", side: "right", description: "Phototransistor Emitter" },
      { name: "COLLECTOR", pinNumber: 5, label: "Pin 5: Collector (C)", polarity: "COLLECTOR", side: "right", description: "Phototransistor Collector" },
      { name: "BASE", pinNumber: 6, label: "Pin 6: Base (B)", polarity: "BASE", side: "right", description: "Phototransistor Base (optional bias pin)" },
    ],
    electricalCharacteristics: [
      { label: "Current Transfer Ratio (CTR)", typical: "100%", unit: "" },
      { label: "Isolation Voltage", typical: "5000", unit: "V RMS" },
      { label: "Turn-On Time (ton)", typical: "3.0", unit: "µs" },
    ],
    absoluteMaximumRatings: [
      { label: "Input LED Forward Current", max: "60", unit: "mA" },
      { label: "Output Collector-Emitter Voltage", max: "30", unit: "V" },
    ],
    typicalApplications: ["Galvanic isolation between high-voltage power circuits and sensitive microcontrollers", "AC mains zero-crossing detection"],
    schematicSymbolType: "OPTOCOUPLER",
    isPolarized: true,
    datasheetSummary: "Standard 6-pin phototransistor optocoupler with 5.3kV isolation barrier.",
    educationalNotes: "No electrical connection exists between input Pins 1-2 and output Pins 4-6; signals transfer entirely via infrared photons.",
  },

  // -------------------------------------------------------------------------
  // INTEGRATED CIRCUITS EXPANSION
  // -------------------------------------------------------------------------
  IC_LM358: {
    id: "IC_LM358",
    name: "LM358 Dual Low-Power Operational Amplifier",
    partNumber: "LM358N",
    manufacturer: "Texas Instruments / ON Semi",
    category: "integrated_circuits",
    packageType: "DIP8",
    packageDescription: "DIP-8 package containing two independent high-gain frequency-compensated op-amps capable of single-supply operation (3V to 32V).",
    dimensionsMm: { width: 85, height: 75 },
    terminals: [
      { name: "OUT1", pinNumber: 1, label: "Pin 1: Out 1", side: "left", description: "Op-Amp 1 Output" },
      { name: "IN1_NEG", pinNumber: 2, label: "Pin 2: In 1 (-)", side: "left", description: "Op-Amp 1 Inverting Input" },
      { name: "IN1_POS", pinNumber: 3, label: "Pin 3: In 1 (+)", side: "left", description: "Op-Amp 1 Non-Inverting Input" },
      { name: "GND", pinNumber: 4, label: "Pin 4: GND", polarity: "NEGATIVE", side: "left", description: "Ground / Negative Supply Rail" },
      { name: "IN2_POS", pinNumber: 5, label: "Pin 5: In 2 (+)", side: "right", description: "Op-Amp 2 Non-Inverting Input" },
      { name: "IN2_NEG", pinNumber: 6, label: "Pin 6: In 2 (-)", side: "right", description: "Op-Amp 2 Inverting Input" },
      { name: "OUT2", pinNumber: 7, label: "Pin 7: Out 2", side: "right", description: "Op-Amp 2 Output" },
      { name: "VCC", pinNumber: 8, label: "Pin 8: VCC", polarity: "POSITIVE", side: "right", description: "Positive Supply Voltage (+3V to +32V)" },
    ],
    electricalCharacteristics: [
      { label: "Supply Voltage (Single Rail)", typical: "3 to 32", unit: "V" },
      { label: "Input Common-Mode Range", typical: "Includes Ground (0V)", unit: "" },
      { label: "Gain Bandwidth Product", typical: "1.0", unit: "MHz" },
      { label: "Quiescent Supply Current", typical: "0.7", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Single Supply Voltage", max: "32", unit: "V" },
      { label: "Max Differential Input Voltage", max: "32", unit: "V" },
    ],
    typicalApplications: ["Single-supply 5V sensor amplifiers", "Active bandpass filters", "Precision rectifiers"],
    schematicSymbolType: "OPAMP_IEEE",
    isPolarized: true,
    datasheetSummary: "Dual operational amplifier designed specifically for single-supply 5V operation where inputs can swing all the way to 0V.",
    educationalNotes: "Unlike the LM741 which requires dual ±15V supplies, the LM358 functions directly from a single +5V USB or battery rail.",
  },

  IC_LM339: {
    id: "IC_LM339",
    name: "LM339 Quad Differential Voltage Comparator",
    partNumber: "LM339N",
    manufacturer: "Texas Instruments / ST",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 plastic package containing 4 independent open-collector voltage comparators.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "OUT2", pinNumber: 1, label: "1: OUT 2", side: "left", description: "Comparator 2 Output (Open Collector)" },
      { name: "OUT1", pinNumber: 2, label: "2: OUT 1", side: "left", description: "Comparator 1 Output (Open Collector)" },
      { name: "VCC", pinNumber: 3, label: "3: VCC", polarity: "POSITIVE", side: "left", description: "Positive Supply (+2V to +36V)" },
      { name: "IN1_NEG", pinNumber: 4, label: "4: 1 IN-", side: "left", description: "Comparator 1 Inverting Input" },
      { name: "IN1_POS", pinNumber: 5, label: "5: 1 IN+", side: "left", description: "Comparator 1 Non-Inverting Input" },
      { name: "IN2_NEG", pinNumber: 6, label: "6: 2 IN-", side: "left", description: "Comparator 2 Inverting Input" },
      { name: "IN2_POS", pinNumber: 7, label: "7: 2 IN+", side: "left", description: "Comparator 2 Non-Inverting Input" },
      { name: "IN3_NEG", pinNumber: 8, label: "8: 3 IN-", side: "right", description: "Comparator 3 Inverting Input" },
      { name: "IN3_POS", pinNumber: 9, label: "9: 3 IN+", side: "right", description: "Comparator 3 Non-Inverting Input" },
      { name: "IN4_NEG", pinNumber: 10, label: "10: 4 IN-", side: "right", description: "Comparator 4 Inverting Input" },
      { name: "IN4_POS", pinNumber: 11, label: "11: 4 IN+", side: "right", description: "Comparator 4 Non-Inverting Input" },
      { name: "GND", pinNumber: 12, label: "12: GND", polarity: "NEGATIVE", side: "right", description: "Ground (0V)" },
      { name: "OUT4", pinNumber: 13, label: "13: OUT 4", side: "right", description: "Comparator 4 Output" },
      { name: "OUT3", pinNumber: 14, label: "14: OUT 3", side: "right", description: "Comparator 3 Output" },
    ],
    electricalCharacteristics: [
      { label: "Response Time", typical: "1.3", unit: "µs" },
      { label: "Output Sink Current", typical: "16", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Supply Voltage", max: "36", unit: "V" },
    ],
    typicalApplications: ["Window comparators", "Schmitt trigger threshold detectors", "Analog to digital 1-bit level slicers"],
    schematicSymbolType: "COMPARATOR_IEEE",
    isPolarized: true,
    datasheetSummary: "Quad precision comparator with open-collector outputs.",
    educationalNotes: "CRITICAL: The outputs are open-collector. You MUST connect an external pull-up resistor (e.g. 10kΩ to Vcc) to obtain a HIGH logic state.",
  },

  IC_74LS04: {
    id: "IC_74LS04",
    name: "SN74LS04 Hex Inverter (6 NOT Gates)",
    partNumber: "SN74LS04N",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 plastic package with 6 independent TTL inverter gates.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "1A", pinNumber: 1, label: "1: 1A (IN)", side: "left", description: "Inverter 1 Input" },
      { name: "1Y", pinNumber: 2, label: "2: 1Y (OUT)", side: "left", description: "Inverter 1 Output Y = A'" },
      { name: "2A", pinNumber: 3, label: "3: 2A", side: "left", description: "Inverter 2 Input" },
      { name: "2Y", pinNumber: 4, label: "4: 2Y", side: "left", description: "Inverter 2 Output" },
      { name: "3A", pinNumber: 5, label: "5: 3A", side: "left", description: "Inverter 3 Input" },
      { name: "3Y", pinNumber: 6, label: "6: 3Y", side: "left", description: "Inverter 3 Output" },
      { name: "GND", pinNumber: 7, label: "7: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "4Y", pinNumber: 8, label: "8: 4Y", side: "right", description: "Inverter 4 Output" },
      { name: "4A", pinNumber: 9, label: "9: 4A", side: "right", description: "Inverter 4 Input" },
      { name: "5Y", pinNumber: 10, label: "10: 5Y", side: "right", description: "Inverter 5 Output" },
      { name: "5A", pinNumber: 11, label: "11: 5A", side: "right", description: "Inverter 5 Input" },
      { name: "6Y", pinNumber: 12, label: "12: 6Y", side: "right", description: "Inverter 6 Output" },
      { name: "6A", pinNumber: 13, label: "13: 6A", side: "right", description: "Inverter 6 Input" },
      { name: "VCC", pinNumber: 14, label: "14: VCC", polarity: "POSITIVE", side: "right", description: "Power (+5.0V)" },
    ],
    electricalCharacteristics: [
      { label: "Propagation Delay (tpd)", typical: "9.0", max: "15", unit: "ns" },
      { label: "High-level Output (Voh)", typical: "3.4", unit: "V" },
      { label: "Low-level Output (Vol)", typical: "0.35", unit: "V" },
    ],
    absoluteMaximumRatings: [
      { label: "Supply Voltage (Vcc)", max: "7.0", unit: "V" },
    ],
    typicalApplications: ["Digital logic inversion", "Ring oscillators", "Signal buffering"],
    schematicSymbolType: "IC_DIP14",
    isPolarized: true,
    datasheetSummary: "Hex inverter featuring 6 independent TTL inverters.",
    educationalNotes: "HIGH input produces LOW output; LOW input produces HIGH output.",
  },

  IC_74LS08: {
    id: "IC_74LS08",
    name: "SN74LS08 Quad 2-Input AND Gate",
    partNumber: "SN74LS08N",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 package containing 4 independent 2-input positive AND gates.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "1A", pinNumber: 1, label: "1: 1A", side: "left", description: "Gate 1 Input A" },
      { name: "1B", pinNumber: 2, label: "2: 1B", side: "left", description: "Gate 1 Input B" },
      { name: "1Y", pinNumber: 3, label: "3: 1Y", side: "left", description: "Gate 1 Output Y = A·B" },
      { name: "2A", pinNumber: 4, label: "4: 2A", side: "left", description: "Gate 2 Input A" },
      { name: "2B", pinNumber: 5, label: "5: 2B", side: "left", description: "Gate 2 Input B" },
      { name: "2Y", pinNumber: 6, label: "6: 2Y", side: "left", description: "Gate 2 Output" },
      { name: "GND", pinNumber: 7, label: "7: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "3Y", pinNumber: 8, label: "8: 3Y", side: "right", description: "Gate 3 Output" },
      { name: "3A", pinNumber: 9, label: "9: 3A", side: "right", description: "Gate 3 Input A" },
      { name: "3B", pinNumber: 10, label: "10: 3B", side: "right", description: "Gate 3 Input B" },
      { name: "4Y", pinNumber: 11, label: "11: 4Y", side: "right", description: "Gate 4 Output" },
      { name: "4A", pinNumber: 12, label: "12: 4A", side: "right", description: "Gate 4 Input A" },
      { name: "4B", pinNumber: 13, label: "13: 4B", side: "right", description: "Gate 4 Input B" },
      { name: "VCC", pinNumber: 14, label: "14: VCC", polarity: "POSITIVE", side: "right", description: "Power (+5.0V)" },
    ],
    electricalCharacteristics: [
      { label: "Propagation Delay (tpd)", typical: "8.0", unit: "ns" },
    ],
    absoluteMaximumRatings: [{ label: "Vcc", max: "7.0", unit: "V" }],
    typicalApplications: ["Combinational logic networks", "Address decoding", "Clock gating"],
    schematicSymbolType: "IC_DIP14",
    isPolarized: true,
    datasheetSummary: "Quad 2-input AND gate IC. Pin 7 is GND, Pin 14 is Vcc (+5V).",
    educationalNotes: "Output is HIGH only when BOTH inputs A and B are simultaneously HIGH.",
  },

  IC_74LS32: {
    id: "IC_74LS32",
    name: "SN74LS32 Quad 2-Input OR Gate",
    partNumber: "SN74LS32N",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 package containing 4 independent 2-input positive OR gates.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "1A", pinNumber: 1, label: "1: 1A", side: "left", description: "Gate 1 Input A" },
      { name: "1B", pinNumber: 2, label: "2: 1B", side: "left", description: "Gate 1 Input B" },
      { name: "1Y", pinNumber: 3, label: "3: 1Y", side: "left", description: "Gate 1 Output Y = A+B" },
      { name: "2A", pinNumber: 4, label: "4: 2A", side: "left", description: "Gate 2 Input A" },
      { name: "2B", pinNumber: 5, label: "5: 2B", side: "left", description: "Gate 2 Input B" },
      { name: "2Y", pinNumber: 6, label: "6: 2Y", side: "left", description: "Gate 2 Output" },
      { name: "GND", pinNumber: 7, label: "7: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "3Y", pinNumber: 8, label: "8: 3Y", side: "right", description: "Gate 3 Output" },
      { name: "3A", pinNumber: 9, label: "9: 3A", side: "right", description: "Gate 3 Input A" },
      { name: "3B", pinNumber: 10, label: "10: 3B", side: "right", description: "Gate 3 Input B" },
      { name: "4Y", pinNumber: 11, label: "11: 4Y", side: "right", description: "Gate 4 Output" },
      { name: "4A", pinNumber: 12, label: "12: 4A", side: "right", description: "Gate 4 Input A" },
      { name: "4B", pinNumber: 13, label: "13: 4B", side: "right", description: "Gate 4 Input B" },
      { name: "VCC", pinNumber: 14, label: "14: VCC", polarity: "POSITIVE", side: "right", description: "Power (+5.0V)" },
    ],
    electricalCharacteristics: [{ label: "Propagation Delay", typical: "14", unit: "ns" }],
    absoluteMaximumRatings: [{ label: "Vcc", max: "7.0", unit: "V" }],
    typicalApplications: ["Combinational logic OR gating", "Interrupt line combining"],
    schematicSymbolType: "IC_DIP14",
    isPolarized: true,
    datasheetSummary: "Quad 2-input OR gate IC.",
    educationalNotes: "Output is HIGH if EITHER input A or input B (or both) is HIGH.",
  },

  IC_74LS86: {
    id: "IC_74LS86",
    name: "SN74LS86 Quad 2-Input Exclusive-OR (XOR) Gate",
    partNumber: "SN74LS86N",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP14",
    packageDescription: "DIP-14 package containing 4 independent 2-input XOR gates.",
    dimensionsMm: { width: 110, height: 75 },
    terminals: [
      { name: "1A", pinNumber: 1, label: "1: 1A", side: "left", description: "Gate 1 Input A" },
      { name: "1B", pinNumber: 2, label: "2: 1B", side: "left", description: "Gate 1 Input B" },
      { name: "1Y", pinNumber: 3, label: "3: 1Y", side: "left", description: "Gate 1 Output Y = A⊕B" },
      { name: "2A", pinNumber: 4, label: "4: 2A", side: "left", description: "Gate 2 Input A" },
      { name: "2B", pinNumber: 5, label: "5: 2B", side: "left", description: "Gate 2 Input B" },
      { name: "2Y", pinNumber: 6, label: "6: 2Y", side: "left", description: "Gate 2 Output" },
      { name: "GND", pinNumber: 7, label: "7: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "3Y", pinNumber: 8, label: "8: 3Y", side: "right", description: "Gate 3 Output" },
      { name: "3A", pinNumber: 9, label: "9: 3A", side: "right", description: "Gate 3 Input A" },
      { name: "3B", pinNumber: 10, label: "10: 3B", side: "right", description: "Gate 3 Input B" },
      { name: "4Y", pinNumber: 11, label: "11: 4Y", side: "right", description: "Gate 4 Output" },
      { name: "4A", pinNumber: 12, label: "12: 4A", side: "right", description: "Gate 4 Input A" },
      { name: "4B", pinNumber: 13, label: "13: 4B", side: "right", description: "Gate 4 Input B" },
      { name: "VCC", pinNumber: 14, label: "14: VCC", polarity: "POSITIVE", side: "right", description: "Power (+5.0V)" },
    ],
    electricalCharacteristics: [{ label: "Propagation Delay", typical: "10", unit: "ns" }],
    absoluteMaximumRatings: [{ label: "Vcc", max: "7.0", unit: "V" }],
    typicalApplications: ["Binary adders (Half Adder / Full Adder)", "Parity generators and checkers", "Digital comparators"],
    schematicSymbolType: "IC_DIP14",
    isPolarized: true,
    datasheetSummary: "Quad 2-input XOR gate IC.",
    educationalNotes: "Output is HIGH when inputs DIFFER; LOW when inputs are the SAME.",
  },

  IC_CD4017: {
    id: "IC_CD4017",
    name: "CD4017B CMOS Decade Counter with 10 Decoded Outputs",
    partNumber: "CD4017BE",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "DIP16",
    packageDescription: "DIP-16 package 5-stage Johnson decade counter with 10 spike-free decoded active-HIGH outputs.",
    dimensionsMm: { width: 120, height: 75 },
    terminals: [
      { name: "Q5", pinNumber: 1, label: "1: Q5", side: "left", description: "Decoded Output 5" },
      { name: "Q1", pinNumber: 2, label: "2: Q1", side: "left", description: "Decoded Output 1" },
      { name: "Q0", pinNumber: 3, label: "3: Q0", side: "left", description: "Decoded Output 0" },
      { name: "Q2", pinNumber: 4, label: "4: Q2", side: "left", description: "Decoded Output 2" },
      { name: "Q6", pinNumber: 5, label: "5: Q6", side: "left", description: "Decoded Output 6" },
      { name: "Q7", pinNumber: 6, label: "6: Q7", side: "left", description: "Decoded Output 7" },
      { name: "Q3", pinNumber: 7, label: "7: Q3", side: "left", description: "Decoded Output 3" },
      { name: "GND", pinNumber: 8, label: "8: GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "Q8", pinNumber: 9, label: "9: Q8", side: "right", description: "Decoded Output 8" },
      { name: "Q4", pinNumber: 10, label: "10: Q4", side: "right", description: "Decoded Output 4" },
      { name: "Q9", pinNumber: 11, label: "11: Q9", side: "right", description: "Decoded Output 9" },
      { name: "CO", pinNumber: 12, label: "12: Carry Out", side: "right", description: "Carry Out signal" },
      { name: "EN", pinNumber: 13, label: "13: Clock Inhibit", side: "right", description: "Clock Enable (pull to GND)" },
      { name: "CLK", pinNumber: 14, label: "14: Clock In", side: "right", description: "Clock Input (advances on rising edge)" },
      { name: "RST", pinNumber: 15, label: "15: Reset", side: "right", description: "Active HIGH Master Reset" },
      { name: "VDD", pinNumber: 16, label: "16: VDD", polarity: "POSITIVE", side: "right", description: "Positive Supply (+3V to +18V)" },
    ],
    electricalCharacteristics: [
      { label: "Supply Voltage Range (VDD)", typical: "3 to 18", unit: "V" },
      { label: "Max Clock Frequency @ 10V", typical: "5.0", unit: "MHz" },
    ],
    absoluteMaximumRatings: [{ label: "VDD", max: "18", unit: "V" }],
    typicalApplications: ["LED chasers / sequencers", "Electronic roulette wheels", "Frequency division by 10"],
    schematicSymbolType: "IC_DIP16",
    isPolarized: true,
    datasheetSummary: "5-stage Johnson counter with 10 decoded active-high outputs that step 1-by-1 with each clock pulse.",
    educationalNotes: "Connect to 555 timer output on Pin 14 to create classic 10-LED sequential running lights.",
  },

  // -------------------------------------------------------------------------
  // ELECTROMECHANICAL & POWER MODULES EXPANSION
  // -------------------------------------------------------------------------
  SWITCH_TOGGLE: {
    id: "SWITCH_TOGGLE",
    name: "MTS-102 SPDT Miniature Panel Toggle Switch",
    partNumber: "MTS-102",
    manufacturer: "Dailywell / C&K",
    category: "electromechanical",
    packageType: "SWITCH_SLIDE",
    packageDescription: "Subminiature threaded metal bushing with chromed bat handle actuator and 3 solder lug terminals.",
    dimensionsMm: { width: 45, height: 50 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Pin 1 (Throw 1)", side: "left", description: "Normally Closed contact" },
      { name: "COM", pinNumber: 2, label: "Pin 2 (Common Pole)", side: "bottom", description: "Common moving contact" },
      { name: "T2", pinNumber: 3, label: "Pin 3 (Throw 2)", side: "right", description: "Normally Open contact" },
    ],
    electricalCharacteristics: [
      { label: "Contact Rating", typical: "6A @ 125V AC / 3A @ 250V AC", unit: "" },
      { label: "Contact Resistance", typical: "< 20", unit: "mΩ" },
    ],
    absoluteMaximumRatings: [{ label: "Max Operating Voltage", max: "250", unit: "V AC" }],
    typicalApplications: ["Master power switch", "Circuit path diversion (A/B switching)"],
    schematicSymbolType: "SWITCH_SPDT",
    isPolarized: false,
    datasheetSummary: "Single-pole double-throw (SPDT) 2-position miniature toggle switch.",
    educationalNotes: "Moving the bat lever connects the center COM terminal to either Terminal 1 or Terminal 3.",
  },

  FUSE_GLASS_5X20: {
    id: "FUSE_GLASS_5X20",
    name: "5x20mm Fast-Acting Glass Cartridge Fuse (2A 250V)",
    partNumber: "0217002.MXP",
    manufacturer: "Littelfuse",
    category: "electromechanical",
    packageType: "GLASS_FUSE_5X20",
    packageDescription: "5x20mm cylindrical clear glass tube with nickel-plated brass end caps and visible fusible alloy wire element.",
    dimensionsMm: { width: 55, height: 20 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Cap 1", side: "left", description: "Fuse Terminal 1" },
      { name: "T2", pinNumber: 2, label: "Cap 2", side: "right", description: "Fuse Terminal 2" },
    ],
    defaultValues: { formattedValue: "2.0A / 250V (Fast-Blow)" },
    electricalCharacteristics: [
      { label: "Current Rating", typical: "2.0", unit: "A" },
      { label: "Voltage Rating", typical: "250", unit: "V AC" },
      { label: "Blowing Characteristic", typical: "Fast Acting (F)", unit: "" },
    ],
    absoluteMaximumRatings: [
      { label: "Interrupting Rating @ 250V AC", max: "35", unit: "A" },
    ],
    typicalApplications: ["Mains AC transformer primary overcurrent protection", "Benchtop instrument short-circuit defense"],
    schematicSymbolType: "FUSE",
    isPolarized: false,
    datasheetSummary: "Fast-acting cartridge fuse designed to melt and open the circuit when current exceeds 2 amperes.",
    educationalNotes: "Sacrificial protection device. The internal wire melts safely inside the sealed glass envelope to prevent fire.",
  },

  BUZZER_PIEZO: {
    id: "BUZZER_PIEZO",
    name: "5V Active Electromagnetic Sound Buzzer",
    partNumber: "HY-0905P",
    manufacturer: "CUI Devices / Murata",
    category: "electromechanical",
    packageType: "PIEZO_BUZZER",
    packageDescription: "Cylindrical black plastic housing with top acoustic hole, internal 2.3kHz oscillator, and '+' polarity mark.",
    dimensionsMm: { width: 50, height: 50 },
    terminals: [
      { name: "POS", pinNumber: 1, label: "+ Pos (5V)", polarity: "POSITIVE", side: "left", description: "Positive Terminal (+, longer lead)" },
      { name: "NEG", pinNumber: 2, label: "- GND", polarity: "NEGATIVE", side: "right", description: "Negative Ground return (-)" },
    ],
    defaultValues: { formattedValue: "5V / 2.3 kHz (Active)" },
    electricalCharacteristics: [
      { label: "Operating Voltage", typical: "4.5 to 5.5", unit: "V DC" },
      { label: "Resonant Frequency", typical: "2300", unit: "Hz" },
      { label: "Sound Pressure Level (SPL @ 10cm)", typical: "85", unit: "dB" },
      { label: "Current Consumption", typical: "30", unit: "mA" },
    ],
    absoluteMaximumRatings: [{ label: "Max Voltage", max: "7.0", unit: "V DC" }],
    typicalApplications: ["Microcontroller audible alarm / alert beeper", "Continuity tester beep indicator"],
    schematicSymbolType: "BUZZER",
    isPolarized: true,
    datasheetSummary: "Active buzzer containing internal drive circuitry. Generates continuous 2.3kHz tone simply by applying 5V DC.",
    educationalNotes: "Active buzzers require only pure DC to sound, whereas passive buzzers require an oscillating square wave from a microcontroller PWM pin.",
  },

  SERVO_SG90: {
    id: "SERVO_SG90",
    name: "TowerPro SG90 9g Micro Digital Servo Motor",
    partNumber: "SG90",
    manufacturer: "TowerPro",
    category: "electromechanical",
    packageType: "SERVO_SG90",
    packageDescription: "Translucent blue plastic casing with internal nylon gear train, potentiometer, control board, output splined shaft, and 3-pin cable (Orange PWM, Red 5V, Brown GND).",
    dimensionsMm: { width: 65, height: 60 },
    terminals: [
      { name: "GND", pinNumber: 1, label: "GND (Brown)", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "VCC", pinNumber: 2, label: "5V (Red)", polarity: "POSITIVE", side: "left", description: "Power (+4.8V to +6V)" },
      { name: "PWM", pinNumber: 3, label: "PWM Signal (Orange)", side: "left", description: "50Hz PWM Control (1ms to 2ms pulse width)" },
    ],
    electricalCharacteristics: [
      { label: "Operating Voltage", typical: "4.8 to 6.0", unit: "V" },
      { label: "Stall Torque @ 4.8V", typical: "1.8", unit: "kg·cm" },
      { label: "Operating Speed @ 4.8V", typical: "0.1", unit: "sec / 60 degrees" },
      { label: "Rotational Angle", typical: "180", unit: "degrees" },
    ],
    absoluteMaximumRatings: [{ label: "Max Supply Voltage", max: "6.0", unit: "V" }],
    typicalApplications: ["Robotic arm joints", "Camera pan-tilt mechanisms", "Steering actuators"],
    schematicSymbolType: "SERVO_MOTOR",
    isPolarized: true,
    datasheetSummary: "9-gram micro servo motor controlled by standard 50Hz PWM pulses (1.0ms = 0°, 1.5ms = 90°, 2.0ms = 180°).",
    educationalNotes: "Always power servos from an external 5V supply rather than the Arduino 5V pin to prevent voltage dips during motor stall.",
  },

  ARDUINO_NANO_V3: {
    id: "ARDUINO_NANO_V3",
    name: "Arduino Nano V3 (ATmega328P)",
    partNumber: "A000005",
    manufacturer: "Arduino / Microchip",
    category: "microcontrollers_modules",
    packageType: "PCB_ARDUINO_NANO",
    packageDescription: "Breadboard-friendly miniature blue PCB with ATmega328P TQFP chip, Mini-USB jack, and dual 15-pin through-hole headers.",
    dimensionsMm: { width: 90, height: 45 },
    terminals: [
      { name: "D13", pinNumber: 1, label: "D13", side: "top", description: "Digital Pin 13 / SCK / LED" },
      { name: "3V3", pinNumber: 2, label: "3V3", side: "top", description: "3.3V Output" },
      { name: "AREF", pinNumber: 3, label: "AREF", side: "top", description: "Analog Reference" },
      { name: "A0", pinNumber: 4, label: "A0", side: "top", description: "Analog Input 0" },
      { name: "A1", pinNumber: 5, label: "A1", side: "top", description: "Analog Input 1" },
      { name: "A2", pinNumber: 6, label: "A2", side: "top", description: "Analog Input 2" },
      { name: "A3", pinNumber: 7, label: "A3", side: "top", description: "Analog Input 3" },
      { name: "A4", pinNumber: 8, label: "A4 (SDA)", side: "top", description: "Analog Input 4 / I2C SDA" },
      { name: "A5", pinNumber: 9, label: "A5 (SCL)", side: "top", description: "Analog Input 5 / I2C SCL" },
      { name: "A6", pinNumber: 10, label: "A6", side: "top", description: "Analog Input 6" },
      { name: "A7", pinNumber: 11, label: "A7", side: "top", description: "Analog Input 7" },
      { name: "5V", pinNumber: 12, label: "+5V", polarity: "POSITIVE", side: "top", description: "+5V Power Rail" },
      { name: "RST", pinNumber: 13, label: "RESET", side: "top", description: "Reset" },
      { name: "GND", pinNumber: 14, label: "GND", polarity: "NEGATIVE", side: "top", description: "Ground" },
      { name: "VIN", pinNumber: 15, label: "VIN", polarity: "POSITIVE", side: "top", description: "Raw 7-12V Power" },
    ],
    electricalCharacteristics: [
      { label: "Processor", typical: "ATmega328P @ 16 MHz", unit: "" },
      { label: "Analog Inputs", typical: "8 (A0 to A7, two more than Uno!)", unit: "" },
    ],
    absoluteMaximumRatings: [{ label: "Max VIN", max: "12", unit: "V" }],
    typicalApplications: ["Solderless breadboard prototyping", "Compact embedded electronics"],
    schematicSymbolType: "MCU_ARDUINO",
    isPolarized: true,
    datasheetSummary: "Breadboard-friendly version of the Arduino Uno with 8 analog inputs instead of 6.",
    educationalNotes: "Plugs directly across the center trough of a solderless breadboard.",
  },

  RPI_PICO: {
    id: "RPI_PICO",
    name: "Raspberry Pi Pico (RP2040 Dual ARM Cortex-M0+)",
    partNumber: "SC0915",
    manufacturer: "Raspberry Pi Foundation",
    category: "microcontrollers_modules",
    packageType: "PCB_RPI_PICO",
    packageDescription: "Green breadboard-compatible PCB featuring RP2040 dual-core chip, micro-USB, castellated edge solder pads, and 40 pins.",
    dimensionsMm: { width: 100, height: 45 },
    terminals: [
      { name: "GP0", pinNumber: 1, label: "GP0 (UART0 TX)", side: "left", description: "GPIO 0" },
      { name: "GP1", pinNumber: 2, label: "GP1 (UART0 RX)", side: "left", description: "GPIO 1" },
      { name: "GND_1", pinNumber: 3, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground" },
      { name: "GP2", pinNumber: 4, label: "GP2", side: "left", description: "GPIO 2" },
      { name: "GP3", pinNumber: 5, label: "GP3", side: "left", description: "GPIO 3" },
      { name: "GP4", pinNumber: 6, label: "GP4", side: "left", description: "GPIO 4" },
      { name: "GP5", pinNumber: 7, label: "GP5", side: "left", description: "GPIO 5" },
      { name: "GND_2", pinNumber: 8, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground" },
      { name: "VBUS", pinNumber: 40, label: "VBUS (5V USB)", polarity: "POSITIVE", side: "right", description: "5V USB supply" },
      { name: "VSYS", pinNumber: 39, label: "VSYS (1.8-5.5V)", polarity: "POSITIVE", side: "right", description: "System power input" },
      { name: "GND_3", pinNumber: 38, label: "GND", polarity: "NEGATIVE", side: "right", description: "Ground" },
      { name: "3V3", pinNumber: 36, label: "3V3 (OUT)", polarity: "POSITIVE", side: "right", description: "Regulated 3.3V Output" },
    ],
    electricalCharacteristics: [
      { label: "Core", typical: "Dual ARM Cortex-M0+ @ 133 MHz", unit: "" },
      { label: "SRAM", typical: "264", unit: "KB" },
      { label: "Programmable I/O (PIO)", typical: "8 state machines", unit: "" },
      { label: "Operating Logic Level", typical: "3.3V", unit: "" },
    ],
    absoluteMaximumRatings: [{ label: "Max 3.3V Pin Voltage", max: "3.63", unit: "V" }],
    typicalApplications: ["High-speed PIO custom protocol emulation", "MicroPython and C++ robotics control"],
    schematicSymbolType: "MCU_GENERIC",
    isPolarized: true,
    datasheetSummary: "Affordable dual-core ARM microcontroller with unique Programmable I/O (PIO) hardware state machines.",
    educationalNotes: "Operates strictly on 3.3V logic levels. Do NOT connect 5V logic directly to GPIO pins.",
  },

  MODULE_NRF24L01: {
    id: "MODULE_NRF24L01",
    name: "NRF24L01+ 2.4GHz Ultra-Low Power RF Transceiver",
    partNumber: "NRF24L01+",
    manufacturer: "Nordic Semiconductor",
    category: "microcontrollers_modules",
    packageType: "MODULE_NRF24",
    packageDescription: "Black carrier PCB with NRF24L01+ QFN chip, 16MHz crystal, PCB serpentine trace antenna, and 2x4 (8-pin) header.",
    dimensionsMm: { width: 65, height: 35 },
    terminals: [
      { name: "GND", pinNumber: 1, label: "GND", polarity: "NEGATIVE", side: "left", description: "Ground (0V)" },
      { name: "VCC", pinNumber: 2, label: "VCC (3.3V ONLY!)", polarity: "POSITIVE", side: "left", description: "Power (+1.9V to +3.6V)" },
      { name: "CE", pinNumber: 3, label: "CE (Chip Enable)", side: "left", description: "RX/TX mode control" },
      { name: "CSN", pinNumber: 4, label: "CSN (SPI CS)", side: "left", description: "SPI Chip Select (active low)" },
      { name: "SCK", pinNumber: 5, label: "SCK", side: "right", description: "SPI Clock" },
      { name: "MOSI", pinNumber: 6, label: "MOSI", side: "right", description: "SPI Master Out Slave In" },
      { name: "MISO", pinNumber: 7, label: "MISO", side: "right", description: "SPI Master In Slave Out" },
      { name: "IRQ", pinNumber: 8, label: "IRQ", side: "right", description: "Interrupt Request" },
    ],
    electricalCharacteristics: [
      { label: "Frequency Band", typical: "2.400 to 2.525", unit: "GHz (ISM band)" },
      { label: "Data Rate", typical: "250 kbps, 1 Mbps, or 2 Mbps", unit: "" },
      { label: "TX Current @ 0dBm", typical: "11.3", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Supply Voltage (VCC)", max: "3.6", unit: "V DC" },
      { label: "Max SPI Input Voltage", max: "5.25 (SPI pins are 5V tolerant!)", unit: "V" },
    ],
    typicalApplications: ["Short-range 2.4GHz wireless telemetry", "Wireless remote control drones and robots"],
    schematicSymbolType: "MODULE_GENERIC",
    isPolarized: true,
    datasheetSummary: "Ultra-low-power 2.4GHz GFSK transceiver for point-to-point and star wireless sensor networks.",
    educationalNotes: "WARNING: VCC is strictly 3.3V (applying 5V destroys the chip). However, its SPI data pins ARE 5V tolerant, making connection to Arduino simple.",
  },

  // =========================================================================
  // 7. SENSORS & OPTICAL TRANSDUCERS
  // =========================================================================
  SENSOR_LDR_GL5528: {
    id: "SENSOR_LDR_GL5528",
    name: "GL5528 Cadmium-Sulfide Photoresistor (LDR)",
    partNumber: "GL5528",
    manufacturer: "Senba Optoelectronic",
    category: "passives",
    packageType: "CERAMIC_DISC",
    packageDescription: "5mm radial ceramic disc with meandering CdS photoconductive track under clear epoxy lens.",
    dimensionsMm: { width: 5.0, height: 4.3, depth: 2.0 },
    terminals: [
      { name: "T1", pinNumber: 1, label: "Lead 1", side: "left", description: "Non-polarized photoconductive terminal" },
      { name: "T2", pinNumber: 2, label: "Lead 2", side: "right", description: "Non-polarized photoconductive terminal" },
    ],
    defaultValues: {
      valueNumber: 12000,
      valueUnit: "Ω",
      formattedValue: "10–20 kΩ @ 10 lux",
      powerRatingW: 0.1,
    },
    electricalCharacteristics: [
      { label: "Light Resistance (10 lux)", typical: "10 – 20", unit: "kΩ" },
      { label: "Dark Resistance", typical: "> 1.0", unit: "MΩ" },
      { label: "Spectral Peak", typical: "540", unit: "nm (Green)" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Voltage (DC)", max: "150", unit: "V DC" },
      { label: "Max Power Dissipation", max: "100", unit: "mW" },
    ],
    typicalApplications: ["Automatic street-light relay", "ESP32 ADC ambient lux metering", "Solar dual-axis tracking bridge"],
    keyFormulas: ["V_adc = Vcc × R_fixed / (R_ldr + R_fixed)"],
    schematicSymbolType: "LDR_IEEE",
    isPolarized: false,
    datasheetSummary: "Light-dependent resistor whose resistance drops inversely with incident illuminance.",
    educationalNotes: "Wire in a series voltage divider with a 10 kΩ pull-down resistor into ESP32 GPIO34/GPIO35 ADC.",
  },

  SENSOR_HCSR04: {
    id: "SENSOR_HCSR04",
    name: "HC-SR04 Ultrasonic Distance Ranging Sensor",
    partNumber: "HC-SR04",
    manufacturer: "ElecFreaks / Generic",
    category: "microcontrollers_modules",
    packageType: "MODULE_NRF24",
    packageDescription: "Blue dual-transducer PCB housing 40 kHz TX/RX ultrasonic capsules and 4-pin 2.54mm header.",
    dimensionsMm: { width: 45, height: 20, depth: 15 },
    terminals: [
      { name: "VCC", pinNumber: 1, label: "VCC (+5V)", polarity: "POSITIVE", side: "left", description: "+5V regulated supply" },
      { name: "TRIG", pinNumber: 2, label: "TRIG (10µs)", side: "left", description: "Trigger pulse input (3.3V/5V)" },
      { name: "ECHO", pinNumber: 3, label: "ECHO (5V Out)", side: "right", description: "Echo pulse width output — use 1k/2k divider for 3.3V MCUs!" },
      { name: "GND", pinNumber: 4, label: "GND (0V)", polarity: "NEGATIVE", side: "right", description: "Common ground return" },
    ],
    electricalCharacteristics: [
      { label: "Operating Frequency", typical: "40", unit: "kHz" },
      { label: "Measuring Range", typical: "2 – 400", unit: "cm (±3mm)" },
      { label: "Quiescent Current", typical: "< 2", unit: "mA" },
    ],
    absoluteMaximumRatings: [
      { label: "Supply Voltage", max: "5.5", unit: "V DC" },
      { label: "Measurement Angle", max: "15", unit: "deg cone" },
    ],
    typicalApplications: ["Smart parking occupancy detector", "180° polar ultrasonic radar", "Obstacle-avoidance robotics"],
    keyFormulas: ["d (cm) = (t_echo_us × 0.0343) / 2"],
    schematicSymbolType: "MODULE_GENERIC",
    isPolarized: true,
    datasheetSummary: "Time-of-flight 40 kHz acoustic rangefinder computing distance from echo pulse width.",
    educationalNotes: "ECHO outputs 5V TTL; always drop ECHO through a 1 kΩ / 2 kΩ resistor divider before feeding ESP32 GPIO.",
  },

  SENSOR_LM35: {
    id: "SENSOR_LM35",
    name: "LM35DZ Precision Centigrade Temperature Sensor",
    partNumber: "LM35DZ",
    manufacturer: "Texas Instruments",
    category: "integrated_circuits",
    packageType: "TO92",
    packageDescription: "3-pin TO-92 plastic transistor-style IC calibrated directly in degrees Celsius.",
    dimensionsMm: { width: 4.6, height: 4.6, depth: 3.6 },
    terminals: [
      { name: "VS", pinNumber: 1, label: "+Vs (4–30V)", polarity: "POSITIVE", side: "left", description: "Positive power supply rail" },
      { name: "VOUT", pinNumber: 2, label: "Vout (10mV/°C)", side: "right", description: "Linear analog temperature voltage" },
      { name: "GND", pinNumber: 3, label: "GND", polarity: "NEGATIVE", side: "bottom", description: "Ground reference" },
    ],
    electricalCharacteristics: [
      { label: "Scale Factor", typical: "+10.0", unit: "mV / °C" },
      { label: "Accuracy @ 25°C", typical: "±0.5", unit: "°C" },
      { label: "Drain Current", typical: "60", unit: "µA" },
    ],
    absoluteMaximumRatings: [
      { label: "Supply Voltage (+Vs)", max: "35", unit: "V" },
      { label: "Operating Temp Range", max: "0 to +100", unit: "°C (LM35DZ)" },
    ],
    typicalApplications: ["Precision thermal telemetry", "Battery pack thermal cut-off", "PID oven/incubator control"],
    keyFormulas: ["T (°C) = V_out(V) × 100"],
    schematicSymbolType: "IC_GENERIC",
    isPolarized: true,
    datasheetSummary: "Linear analog temperature IC requiring no external calibration or linearization curves.",
    educationalNotes: "Self-heating is below 0.08°C in still air due to ultra-low 60 µA quiescent draw.",
  },

  SENSOR_BPW34: {
    id: "SENSOR_BPW34",
    name: "BPW34 High-Speed Silicon PIN Photodiode",
    partNumber: "BPW34",
    manufacturer: "Vishay Semiconductors",
    category: "semiconductors",
    packageType: "CERAMIC_DISC",
    packageDescription: "Flat clear plastic DIP-2 package with 7.5 mm² radiant-sensitive silicon PIN active area.",
    dimensionsMm: { width: 5.4, height: 4.3, depth: 1.5 },
    terminals: [
      { name: "CATHODE", pinNumber: 1, label: "Cathode (K)", polarity: "CATHODE", side: "left", description: "Connect to +Bias in photoconductive mode" },
      { name: "ANODE", pinNumber: 2, label: "Anode (A)", polarity: "ANODE", side: "right", description: "Feeds op-amp inverting TIA summing node" },
    ],
    electricalCharacteristics: [
      { label: "Active Radiant Area", typical: "7.5", unit: "mm²" },
      { label: "Responsivity @ 650nm", typical: "0.58", unit: "A/W" },
      { label: "Rise / Fall Time", typical: "100", unit: "ns" },
    ],
    absoluteMaximumRatings: [
      { label: "Max Reverse Voltage", max: "60", unit: "V" },
      { label: "Peak Sensitivity Wavelength", max: "900", unit: "nm (430–1100nm)" },
    ],
    typicalApplications: ["Visible Light Communication (VLC) TIA front-end", "Optical laser barrier receiver", "High-speed photometry"],
    keyFormulas: ["I_ph = R_λ × P_rx", "V_out = I_ph × R_f"],
    schematicSymbolType: "PHOTODIODE_IEEE",
    isPolarized: true,
    datasheetSummary: "Fast 100ns silicon PIN photodiode used in the IST Optical Wireless VLC receiver front-end.",
    educationalNotes: "Operate reverse-biased into an OPA380/TL072 transimpedance amplifier to minimize junction capacitance.",
  },
};

/**
 * Resistor band calculation utility
 */
export function calculateResistorColorBands(ohms: number) {
  if (ohms <= 0 || !isFinite(ohms)) {
    return {
      band1: { name: "Brown", color: "#854d0e" },
      band2: { name: "Black", color: "#0f172a" },
      band3: { name: "Red", color: "#dc2626" },
      band4: { name: "Gold (±5%)", color: "#d97706" },
    };
  }

  const COLOR_MAP: Record<number, { name: string; color: string }> = {
    0: { name: "Black", color: "#0f172a" },
    1: { name: "Brown", color: "#78350f" },
    2: { name: "Red", color: "#dc2626" },
    3: { name: "Orange", color: "#ea580c" },
    4: { name: "Yellow", color: "#eab308" },
    5: { name: "Green", color: "#16a34a" },
    6: { name: "Blue", color: "#2563eb" },
    7: { name: "Violet", color: "#9333ea" },
    8: { name: "Grey", color: "#64748b" },
    9: { name: "White", color: "#f8fafc" },
  };

  const expStr = ohms.toExponential();
  const parts = expStr.split("e");
  const mantissa = parseFloat(parts[0]);
  const exponent = parseInt(parts[1], 10);

  const sig2 = Math.round(mantissa * 10);
  const d1 = Math.min(9, Math.max(1, Math.floor(sig2 / 10)));
  const d2 = Math.min(9, Math.max(0, sig2 % 10));
  const mult = Math.min(7, Math.max(0, exponent - 1));

  return {
    band1: COLOR_MAP[d1] || COLOR_MAP[1],
    band2: COLOR_MAP[d2] || COLOR_MAP[0],
    band3: COLOR_MAP[mult] || COLOR_MAP[2],
    band4: { name: "Gold (±5%)", color: "#d97706" },
  };
}
