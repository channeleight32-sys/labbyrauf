import React, { useState } from "react";
import {
  Layers,
  Cpu,
  Zap,
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import { RoboticsProjectId } from "./RoboticsAutomationLab";

interface SchematicProps {
  projectId: RoboticsProjectId;
  onOpenInWorkbench?: () => void;
}

interface ComponentSpecItem {
  designator: string;
  name: string;
  value: string;
  packageType: string;
  connections: string;
  rationale: string;
}

export const RoboticsSchematicViewer: React.FC<SchematicProps> = ({
  projectId,
  onOpenInWorkbench,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedBOM, setCopiedBOM] = useState<boolean>(false);

  // Detailed Bill of Materials (BOM) for each project
  const getBOM = (id: RoboticsProjectId): ComponentSpecItem[] => {
    switch (id) {
      case "RADAR":
        return [
          {
            designator: "U1",
            name: "Microcontroller",
            value: "ESP32 DevKit V1 (30-pin, 240MHz)",
            packageType: "DIP-30 Module",
            connections: "GPIO4 -> Servo PWM, GPIO5 -> TRIG, GPIO18 <- ECHO",
            rationale: "Main dual-core processor managing 50Hz PWM servo sweep and microsecond time-of-flight acoustic pulse timing.",
          },
          {
            designator: "SEN1",
            name: "Ultrasonic Ranging Module",
            value: "HC-SR04 (40 kHz sonic transducer)",
            packageType: "4-pin Header (VCC, TRIG, ECHO, GND)",
            connections: "VCC to +5V, GND to GND, TRIG to GPIO5, ECHO to R1",
            rationale: "Emits 8-cycle 40kHz ultrasound burst and outputs 5V TTL pulse proportional to round-trip echo distance.",
          },
          {
            designator: "MOT1",
            name: "Micro Servo Actuator",
            value: "TowerPro SG90 9g (1.8 kg-cm torque)",
            packageType: "3-pin JR Connector",
            connections: "Red (+5V), Brown (GND), Orange to R3 / GPIO4",
            rationale: "Provides precise 180° mechanical rotational sweep for the radar antenna bracket.",
          },
          {
            designator: "R1",
            name: "Voltage Divider High-Side",
            value: "1.0 kΩ (1/4W, 5% Metal Film)",
            packageType: "Axial Through-Hole",
            connections: "Between HC-SR04 ECHO pin and ESP32 GPIO18 node",
            rationale: "Drops 5V echo pulse down to safe 3.3V logic level: Vout = 5V * (2k / (1k + 2k)) = 3.33V.",
          },
          {
            designator: "R2",
            name: "Voltage Divider Low-Side",
            value: "2.0 kΩ (1/4W, 5% Metal Film)",
            packageType: "Axial Through-Hole",
            connections: "Between ESP32 GPIO18 node and GND",
            rationale: "Forms lower branch of divider to ground, ensuring ESP32 3.3V max input voltage rating is never exceeded.",
          },
          {
            designator: "R3",
            name: "Servo Gate Protection Resistor",
            value: "330 Ω (1/4W, 5% Carbon Film)",
            packageType: "Axial Through-Hole",
            connections: "Between ESP32 GPIO4 and SG90 PWM signal wire",
            rationale: "Limits GPIO drive current and damps inductive transmission line reflections on the servo lead.",
          },
          {
            designator: "C1",
            name: "Bulk Inrush Buffer Capacitor",
            value: "100 µF, 16V Low-ESR Electrolytic",
            packageType: "Radial Can",
            connections: "Across +5V servo supply rail and GND",
            rationale: "Absorbs transient current spikes (up to 650mA stall) when the servo motor reverses direction, preventing MCU brownout resets.",
          },
          {
            designator: "C2",
            name: "Sensor Decoupling Bypass",
            value: "100 nF (0.1 µF, 50V X7R Ceramic)",
            packageType: "Radial Through-Hole",
            connections: "Directly across HC-SR04 VCC and GND pins",
            rationale: "Filters high-frequency 40kHz oscillator switching noise from propagating onto the system power plane.",
          },
        ];

      case "ULTRASONIC":
        return [
          {
            designator: "U1",
            name: "Microcontroller",
            value: "ESP32 DevKit V1 (30-pin)",
            packageType: "DIP-30 Module",
            connections: "GPIO5 -> TRIG, GPIO18 <- ECHO, GPIO21 -> Buzzer, GPIO19/22/23 -> LEDs",
            rationale: "Reads ultrasonic pulse flight time and drives 3-stage hazard indicators and warning buzzer.",
          },
          {
            designator: "SEN1",
            name: "Ultrasonic Transducer",
            value: "HC-SR04 (40 kHz, 2cm - 400cm range)",
            packageType: "4-pin Header",
            connections: "VCC to +5V, GND to GND, TRIG to GPIO5, ECHO to R1",
            rationale: "Measures distance to obstacles via time-of-flight acoustic ranging.",
          },
          {
            designator: "Q1",
            name: "NPN BJT Buzzer Driver",
            value: "2N2222A (40V, 800mA, hFE = 100-300)",
            packageType: "TO-92",
            connections: "Base to R3, Emitter to GND, Collector to Buzzer (-)",
            rationale: "Switches the 5V 35mA piezo buzzer without overloading the ESP32 GPIO (max 12mA sink capability).",
          },
          {
            designator: "D1",
            name: "Flyback Snubber Diode",
            value: "1N4148 (100V, 200mA Fast Recovery, 4ns)",
            packageType: "DO-35 Glass Axial",
            connections: "Anti-parallel across Buzzer (Cathode to +5V, Anode to Collector)",
            rationale: "Dissipates inductive back-EMF voltage spikes generated when the buzzer magnetic coil switches off.",
          },
          {
            designator: "R1",
            name: "Echo Level Shifter Upper",
            value: "1.0 kΩ (1/4W, 5%)",
            packageType: "Axial",
            connections: "HC-SR04 ECHO to GPIO18",
            rationale: "Steps 5V echo pulse down to safe 3.3V logic level.",
          },
          {
            designator: "R2",
            name: "Echo Level Shifter Lower",
            value: "2.0 kΩ (1/4W, 5%)",
            packageType: "Axial",
            connections: "GPIO18 to GND",
            rationale: "Lower leg of voltage divider.",
          },
          {
            designator: "R3",
            name: "BJT Base Bias Resistor",
            value: "1.0 kΩ (1/4W, 5%)",
            packageType: "Axial",
            connections: "Between GPIO21 and 2N2222A Base",
            rationale: "Sets base current Ib = (3.3V - 0.7V) / 1kΩ = 2.6mA, driving Q1 into deep saturation (Vce < 0.2V).",
          },
          {
            designator: "LED1-3",
            name: "Zone Indicator LEDs",
            value: "Green (Safe), Yellow (Caution), Red (Hazard)",
            packageType: "5mm T-1 3/4 Through-Hole",
            connections: "Anodes to R4-R6, Cathodes to GND",
            rationale: "Visual 3-tier distance proximity feedback for operators.",
          },
          {
            designator: "R4-R6",
            name: "LED Current Limiting Resistors",
            value: "220 Ω (1/4W, 5%)",
            packageType: "Axial",
            connections: "Between GPIO19, GPIO22, GPIO23 and LED Anodes",
            rationale: "Limits LED forward current to If = (3.3V - 2.0V) / 220Ω = 5.9mA per LED.",
          },
        ];

      case "SERVO":
        return [
          {
            designator: "U1",
            name: "Microcontroller",
            value: "ESP32 DevKit V1",
            packageType: "DIP-30 Module",
            connections: "GPIO4 -> R1 -> SG90 PWM",
            rationale: "LEDC timer generates high-resolution 50Hz PWM pulses with 16-bit duty precision.",
          },
          {
            designator: "U2",
            name: "Linear Voltage Regulator",
            value: "LM7805CT (+5.0V, 1.5A Positive Linear)",
            packageType: "TO-220 with heatsink",
            connections: "IN to 7.4V/12V Battery, OUT to +5V Servo Rail, GND to GND",
            rationale: "Isolates the noisy motor power domain from the sensitive 3.3V ESP32 microcontroller supply.",
          },
          {
            designator: "MOT1",
            name: "Micro Servo Motor",
            value: "SG90 9g (Operating Voltage 4.8V - 6.0V)",
            packageType: "3-pin Connector",
            connections: "VCC (+5V), GND (GND), Signal (PWM)",
            rationale: "Position actuator responsive to 1.0ms (0°) to 2.0ms (180°) control pulses.",
          },
          {
            designator: "R1",
            name: "Gate / Signal Damping Resistor",
            value: "330 Ω (1/4W)",
            packageType: "Axial",
            connections: "Between GPIO4 and Servo PWM lead",
            rationale: "Damps signal line ringing and limits surge current in case of reverse connection.",
          },
          {
            designator: "C1",
            name: "Input Regulator Filter",
            value: "0.33 µF (330 nF, 50V Ceramic)",
            packageType: "Radial",
            connections: "LM7805 Vin to GND",
            rationale: "Stabilizes linear regulator input stage against oscillation per datasheet requirements.",
          },
          {
            designator: "C2",
            name: "Output High-Frequency Bypass",
            value: "0.1 µF (100 nF, 50V Ceramic)",
            packageType: "Radial",
            connections: "LM7805 Vout to GND",
            rationale: "Bypasses high-frequency brush commutation transients.",
          },
          {
            designator: "C3",
            name: "Bulk Reservoir Capacitor",
            value: "470 µF, 16V Low-ESR Electrolytic",
            packageType: "Radial Can",
            connections: "Across +5V Servo Rail and GND",
            rationale: "Supplies instantaneous surge current during servo motor acceleration without dropping rail voltage.",
          },
        ];

      case "DC_MOTOR":
        return [
          {
            designator: "U1",
            name: "Dual H-Bridge Motor Driver IC",
            value: "L298N (46V, 2A Dual Full-Bridge Driver)",
            packageType: "Multiwatt15 Through-Hole",
            connections: "Vs to +12V, Vss to +5V, IN1 to GPIO27, IN2 to GPIO26, ENA to GPIO14",
            rationale: "Contains 4 high-voltage BJT half-bridges capable of bidirectional motor control with independent enable.",
          },
          {
            designator: "MOT1",
            name: "Permanent Magnet DC Motor",
            value: "12V DC Brushed Motor (1000 RPM, 0.85A stall)",
            packageType: "2-terminal Motor",
            connections: "Terminal A to OUT1, Terminal B to OUT2",
            rationale: "Converts electrical power to mechanical rotation with torque proportional to armature current.",
          },
          {
            designator: "D1-D4",
            name: "High-Speed Flyback Diodes",
            value: "1N4007 (1000V, 1A Power Rectifier)",
            packageType: "DO-41 Axial",
            connections: "Bridge configuration across OUT1, OUT2 to Vs and GND",
            rationale: "Forms free-wheeling recirculation paths for inductive motor current during PWM OFF periods and active braking.",
          },
          {
            designator: "C1",
            name: "Motor Noise Suppression Ceramic",
            value: "100 nF (0.1 µF, 100V Ceramic)",
            packageType: "Disc Through-Hole",
            connections: "Soldered directly across motor terminals",
            rationale: "Shunts electromagnetic interference (EMI) and RF brush sparking at the point of origin.",
          },
          {
            designator: "C2",
            name: "Logic Rail Decoupling",
            value: "100 nF (50V X7R Ceramic)",
            packageType: "Radial",
            connections: "Across L298N Vss (Pin 9) and GND",
            rationale: "Keeps internal TTL input stage stable during high dI/dt switching.",
          },
          {
            designator: "C3",
            name: "Motor Supply Bulk Capacitor",
            value: "470 µF, 35V Low-ESR Electrolytic",
            packageType: "Radial Can",
            connections: "Across +12V Motor Rail and GND",
            rationale: "Supplies motor start-up inrush current and absorbs regenerated kinetic energy during braking.",
          },
          {
            designator: "R_SENSE",
            name: "Current Sensing Shunt",
            value: "0.5 Ω, 2W Low-Inductance Shunt",
            packageType: "Ceramic Wirewound",
            connections: "Between L298N Sense A (Pin 1) and GND",
            rationale: "Develops 0.5V per Ampere of motor current for overcurrent protection monitoring.",
          },
        ];

      case "SMART_CAR":
        return [
          {
            designator: "U1",
            name: "Robot Master Controller",
            value: "ESP32 DevKit V1 (Dual-Core, FreeRTOS)",
            packageType: "DIP-30 Module",
            connections: "GPIO12-14, 25-27 -> L298N, GPIO4 -> Pan Servo, GPIO5/18 -> Ultrasonic",
            rationale: "Executes real-time obstacle avoidance state machine and differential drive kinematics.",
          },
          {
            designator: "U2",
            name: "Motor Driver Stage",
            value: "L298N Dual H-Bridge Driver Board",
            packageType: "Heatsink Module",
            connections: "Drives Left Motor (OUT1/2) and Right Motor (OUT3/4)",
            rationale: "Amplifies low-level MCU PWM signals to drive 6V-12V DC geared motors.",
          },
          {
            designator: "MOT1,2",
            name: "TT Geared DC Motors",
            value: "1:48 Reduction Gearbox (200 RPM @ 6V)",
            packageType: "Dual Shaft DC Motor",
            connections: "Left motor to OUT1/OUT2, Right motor to OUT3/OUT4",
            rationale: "Provides wheel drive with high torque for climbing inclines and overcoming carpet friction.",
          },
          {
            designator: "U3",
            name: "Switching Step-Down Buck Converter",
            value: "LM2596S (DC-DC Buck, 3A, 150kHz)",
            packageType: "SMD Module",
            connections: "IN from 7.4V Li-ion pack, OUT adjusted to clean 5.0V",
            rationale: "High-efficiency (92%) voltage conversion to power ESP32, servo, and sensors without wasting battery heat.",
          },
          {
            designator: "SEN1",
            name: "Obstacle Distance Sensor",
            value: "HC-SR04 on SG90 Panning Bracket",
            packageType: "Transducer Array",
            connections: "Mounted at car front with 1kΩ/2kΩ divider to GPIO18",
            rationale: "Scans ahead for obstacles to determine forward clearance and initiate steering maneuvers.",
          },
          {
            designator: "SEN2,3",
            name: "Infrared Edge / Line Detectors",
            value: "TCRT5000 Reflective Optical Sensors",
            packageType: "IR LED + Phototransistor",
            connections: "Down-facing; Anode to 220Ω, Collector to 10kΩ pull-up into GPIO32, 33",
            rationale: "Detects drop-offs, table edges, and floor navigation lines via optical reflection.",
          },
        ];

      case "SMART_HOME":
        return [
          {
            designator: "U1",
            name: "IoT Automation Controller",
            value: "ESP32 DevKit V1 (Wi-Fi 802.11 b/g/n + BLE)",
            packageType: "DIP-30 Module",
            connections: "GPIO16, 17, 18, 19 -> Relay Drivers; GPIO23 <- PIR Sensor",
            rationale: "Maintains Wi-Fi/MQTT/HTTP server connection and triggers optocoupled relay channels.",
          },
          {
            designator: "U2-U5",
            name: "Optocoupler Isolators (4x)",
            value: "PC817 (5000 Vrms Isolation Voltage)",
            packageType: "DIP-4",
            connections: "Anode to ESP32 GPIO via 1kΩ, Phototransistor collector to +5V coil rail",
            rationale: "Guarantees complete galvanic isolation between sensitive 3.3V microcontroller and high-voltage 250VAC mains.",
          },
          {
            designator: "Q1-Q4",
            name: "Relay Driver Transistors (4x)",
            value: "BC547B NPN (45V, 100mA, hFE = 200-450)",
            packageType: "TO-92",
            connections: "Base to PC817 emitter, Collector to Relay Coil (-), Emitter to GND",
            rationale: "Sinks 70mA coil current needed to magnetically energize each mechanical relay.",
          },
          {
            designator: "RLY1-4",
            name: "Electromechanical Power Relays (4x)",
            value: "Songle SRD-05VDC-SL-C (250VAC / 10A SPDT)",
            packageType: "Sugar-Cube 5-pin Sealed",
            connections: "Coil to +5V and Q collector; COM and NO contacts to AC loads",
            rationale: "Controls high-power alternating current appliances (lighting, ventilation fan, water pump, alarm siren).",
          },
          {
            designator: "D1-D4",
            name: "Relay Flyback Snubbers (4x)",
            value: "1N4007 (1000V, 1A Power Rectifier)",
            packageType: "DO-41 Axial",
            connections: "Anti-parallel across each 5V relay coil",
            rationale: "Clamps high-voltage inductive kickback spikes when relay coil magnetic field collapses.",
          },
          {
            designator: "R1-R4",
            name: "Optocoupler LED Current Limiters (4x)",
            value: "1.0 kΩ (1/4W, 5%)",
            packageType: "Axial",
            connections: "Between ESP32 GPIO and PC817 Anode",
            rationale: "Sets optocoupler forward current If = (3.3V - 1.2V) / 1kΩ = 2.1mA, well within GPIO drive limits.",
          },
          {
            designator: "SEN1",
            name: "Passive Infrared Motion Sensor",
            value: "HC-SR501 Pyroelectric Sensor",
            packageType: "PIR Dome Module",
            connections: "VCC to +5V, GND to GND, OUT to GPIO23",
            rationale: "Detects human body infrared radiation (9-10 µm) for automated occupancy lighting.",
          },
        ];

      case "TEMP_MONITOR":
        return [
          {
            designator: "U1",
            name: "Environmental MCU",
            value: "ESP32 DevKit V1 (240MHz, 12-bit SAR ADC)",
            packageType: "DIP-30 Module",
            connections: "GPIO4 <-> DHT22 Single-Wire Data; GPIO34 <- LM35 Analog In",
            rationale: "Samples digital 40-bit DHT22 packet and executes 12-bit ADC conversion of analog LM35 output.",
          },
          {
            designator: "SEN1",
            name: "Digital Temperature & Humidity Sensor",
            value: "DHT22 / AM2302 (±0.5°C, ±2% RH precision)",
            packageType: "4-pin Single-Row Package",
            connections: "Pin 1 to 3.3V, Pin 2 to GPIO4, Pin 4 to GND",
            rationale: "Precision calibrated digital capacitive humidity sensor and high-accuracy NTC thermistor.",
          },
          {
            designator: "R1",
            name: "Single-Wire Bus Pull-Up Resistor",
            value: "4.7 kΩ (1/4W, 1% Precision Metal Film)",
            packageType: "Axial",
            connections: "Between DHT22 DATA pin (Pin 2) and +3.3V VDD rail",
            rationale: "Mandatory pull-up resistor for open-drain bidirectional communication protocol specified by DHT22 datasheet.",
          },
          {
            designator: "C1",
            name: "Sensor Supply Decoupling",
            value: "100 nF (0.1 µF, 50V X7R Ceramic)",
            packageType: "Radial",
            connections: "Directly across DHT22 VDD (Pin 1) and GND (Pin 4)",
            rationale: "Suppresses voltage droop during 1.5mA measurement conversion cycle.",
          },
          {
            designator: "SEN2",
            name: "Precision Centigrade Analog Temp Sensor",
            value: "LM35DZ (10.0 mV / °C linear scale factor)",
            packageType: "TO-92",
            connections: "Pin 1 to +5V, Pin 2 to RC filter, Pin 3 to GND",
            rationale: "Generates linear analog voltage (e.g. 250mV at 25.0°C) with zero offset requirement.",
          },
          {
            designator: "R2",
            name: "ADC Input Noise Filter Resistor",
            value: "1.0 kΩ (1/4W, 1%)",
            packageType: "Axial",
            connections: "Between LM35 Vout pin and ESP32 ADC1 GPIO34",
            rationale: "Forms low-pass RC filter with C2 to eliminate 50Hz/60Hz electromagnetic mains hum noise.",
          },
          {
            designator: "C2",
            name: "ADC Input Noise Filter Capacitor",
            value: "10 µF, 16V Tantalum / Low-Leakage",
            packageType: "Radial",
            connections: "Between ESP32 ADC1 GPIO34 pin and GND",
            rationale: "Sets cutoff frequency fc = 1 / (2*pi*1k*10µF) = 15.9 Hz, filtering ADC reading jitter.",
          },
        ];

      case "IRRIGATION":
        return [
          {
            designator: "U1",
            name: "IoT Irrigation Controller",
            value: "ESP32 DevKit V1",
            packageType: "DIP-30 Module",
            connections: "GPIO35 <- Soil Moisture Analog In, GPIO25 -> Solenoid Gate Drive",
            rationale: "Monitors soil moisture level and implements 10% deadband hysteresis control algorithm.",
          },
          {
            designator: "SEN1",
            name: "Capacitive Soil Moisture Probe",
            value: "Capacitive Moisture Sensor v1.2 (Corrosion-Free)",
            packageType: "PCB Dip Probe with TLC555 Timer",
            connections: "VCC to +3.3V, GND to GND, AOUT to ESP32 GPIO35",
            rationale: "Measures soil dielectric permittivity via 1.5MHz high-frequency oscillation without metal electrode electrolysis.",
          },
          {
            designator: "Q1",
            name: "Logic-Level N-Channel Power MOSFET",
            value: "IRLZ44N (55V, 47A, Rds(on) = 0.028Ω @ Vgs = 3.3V)",
            packageType: "TO-220",
            connections: "Gate to R2, Drain to Valve (-), Source to GND",
            rationale: "True logic-level gate threshold (Vgs(th) = 1.0V - 2.0V) fully switches 0.6A valve current directly from 3.3V ESP32 GPIO.",
          },
          {
            designator: "VALVE1",
            name: "12V DC Electric Water Solenoid Valve",
            value: "1/2\" NPT Normally Closed (12V, 0.5A, 6W)",
            packageType: "Brass Body Solenoid",
            connections: "(+) to +12V DC Supply, (-) to MOSFET Drain",
            rationale: "Electromagnetically actuated valve controlling pressurized water delivery to irrigation drip lines.",
          },
          {
            designator: "D1",
            name: "High-Energy Flyback Freewheeling Diode",
            value: "1N5408 (1000V, 3A Fast-Recovery Power Diode)",
            packageType: "DO-201AD Axial",
            connections: "Anti-parallel across Solenoid (Cathode to +12V, Anode to Drain)",
            rationale: "Safely clamps the high-energy inductive kickback voltage spike (often exceeding 120V) generated when the solenoid coil shuts off.",
          },
          {
            designator: "R1",
            name: "Gate Pull-Down Resistor",
            value: "10.0 kΩ (1/4W, 5%)",
            packageType: "Axial",
            connections: "Between MOSFET Gate and GND",
            rationale: "Pulls gate firmly to GND during microcontroller reset/bootup to prevent accidental valve opening during flash operations.",
          },
          {
            designator: "R2",
            name: "Gate Damping Resistor",
            value: "220 Ω (1/4W, 5%)",
            packageType: "Axial",
            connections: "Between ESP32 GPIO25 and MOSFET Gate",
            rationale: "Limits capacitive inrush charging current into MOSFET gate capacitance (Ciss = 1700pF) and prevents parasitic ringing.",
          },
          {
            designator: "C1",
            name: "Bulk 12V Supply Reservoir",
            value: "220 µF, 25V Low-ESR Electrolytic",
            packageType: "Radial Can",
            connections: "Across +12V Solenoid Rail and GND",
            rationale: "Maintains supply voltage when solenoid coil energizes instantaneously.",
          },
        ];

      default:
        return [];
    }
  };

  const bom = getBOM(projectId);

  const handleCopyBOM = () => {
    const text = bom
      .map(
        (b) =>
          `${b.designator}: ${b.name} (${b.value}) - ${b.packageType}\nConnections: ${b.connections}\nRationale: ${b.rationale}\n`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopiedBOM(true);
    setTimeout(() => setCopiedBOM(false), 2000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Schematic Canvas Card with Standard Electrical Symbols */}
      <div className="bg-[#070b16] border border-cyan-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
        {/* Card Header & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono tracking-wide">
                Complete Engineering Hardware Schematic Diagram
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Standard IEEE/IEC electronic schematic showing all physical resistors, transistors, coils, diodes &amp; wiring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyBOM}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-cyan-400 text-xs font-mono text-cyan-300 hover:text-white transition flex items-center gap-1.5 cursor-pointer"
              title="Copy Bill of Materials to clipboard"
            >
              {copiedBOM ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBOM ? "BOM Copied!" : "Copy Component BOM"}</span>
            </button>

            {onOpenInWorkbench && (
              <button
                type="button"
                onClick={onOpenInWorkbench}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-xs font-mono font-bold text-cyan-200 transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/50"
                title="Load this exact schematic into the primary CircuitLab Workbench"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Workbench</span>
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            HIGH-FIDELITY VECTOR SCHEMATIC RENDERER (SVG)
            ========================================================================= */}
        <div className="w-full bg-[#03060f] rounded-xl border border-slate-800 overflow-x-auto p-4 flex justify-center shadow-inner">
          {projectId === "RADAR" && (
            <svg
              viewBox="0 0 880 420"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-radar" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
                {/* Glow Filter */}
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect width="880" height="420" fill="url(#grid-radar)" rx="8" />

              {/* Title Header */}
              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                PROJECT 1: ESP32 ULTRASONIC RADAR SCANNER · FULL SCHEMATIC
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                SG90 Servo (PWM Angle Sweep) + HC-SR04 Transducer + 1kΩ/2kΩ Voltage Divider + 100µF Bulk Buffer
              </text>

              {/* 1. ESP32 MICROCONTROLLER BLOCK */}
              <rect x="260" y="90" width="200" height="270" rx="8" fill="#0b1329" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="270" y="100" width="180" height="24" rx="4" fill="#0284c7" />
              <text x="360" y="116" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                ESP32 DEVKIT V1 (MCU)
              </text>

              {/* MCU Pins */}
              {/* Left Side */}
              <text x="270" y="150" fill="#94a3b8" fontSize="10">3V3 (3.3V OUT)</text>
              <circle cx="260" cy="146" r="4" fill="#38bdf8" />

              <text x="270" y="190" fill="#94a3b8" fontSize="10">GND (GROUND)</text>
              <circle cx="260" cy="186" r="4" fill="#64748b" />

              <text x="270" y="230" fill="#f59e0b" fontSize="10">VIN (+5V IN)</text>
              <circle cx="260" cy="226" r="4" fill="#f59e0b" />

              {/* Right Side */}
              <text x="450" y="150" fill="#38bdf8" fontSize="10" textAnchor="end">GPIO4 (PWM SERVO)</text>
              <circle cx="460" cy="146" r="4" fill="#38bdf8" />

              <text x="450" y="190" fill="#22c55e" fontSize="10" textAnchor="end">GPIO5 (TRIG OUT)</text>
              <circle cx="460" cy="186" r="4" fill="#22c55e" />

              <text x="450" y="230" fill="#38bdf8" fontSize="10" textAnchor="end">GPIO18 (ECHO IN 3.3V)</text>
              <circle cx="460" cy="226" r="4" fill="#38bdf8" />

              {/* 2. POWER SUPPLY RAILS (+5V & GND) */}
              <rect x="40" y="110" width="140" height="100" rx="6" fill="#181308" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="110" y="135" fill="#fbbf24" fontSize="11" fontWeight="bold" textAnchor="middle">
                5V DC REGULATED
              </text>
              <text x="110" y="152" fill="#94a3b8" fontSize="9" textAnchor="middle">
                Power Adapter / USB
              </text>

              {/* +5V Rail */}
              <line x1="180" y1="140" x2="260" y2="140" stroke="#f59e0b" strokeWidth="2" />
              <line x1="240" y1="140" x2="240" y2="226" stroke="#f59e0b" strokeWidth="2" />
              <line x1="240" y1="226" x2="260" y2="226" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="240" cy="140" r="3" fill="#f59e0b" />
              <text x="210" y="132" fill="#f59e0b" fontSize="9" fontWeight="bold">+5V</text>

              {/* Common GND Rail */}
              <line x1="180" y1="186" x2="260" y2="186" stroke="#475569" strokeWidth="2.5" />
              <text x="210" y="180" fill="#94a3b8" fontSize="9">GND</text>

              {/* Bulk Buffer Capacitor C1 across 5V and GND */}
              <g transform="translate(190, 240)">
                <line x1="0" y1="-100" x2="0" y2="-10" stroke="#f59e0b" strokeWidth="1.5" />
                {/* Capacitor Plates */}
                <rect x="-12" y="-10" width="24" height="4" fill="#38bdf8" />
                <path d="M -12 2 Q 0 -2 12 2" fill="none" stroke="#64748b" strokeWidth="2.5" />
                <line x1="0" y1="2" x2="0" y2="50" stroke="#475569" strokeWidth="1.5" />
                <text x="18" y="-4" fill="#38bdf8" fontSize="9" fontWeight="bold">C1: 100µF</text>
                <text x="18" y="8" fill="#64748b" fontSize="8">16V Low-ESR</text>
                {/* GND symbol */}
                <line x1="-8" y1="50" x2="8" y2="50" stroke="#475569" strokeWidth="2" />
                <line x1="-5" y1="54" x2="5" y2="54" stroke="#475569" strokeWidth="1.5" />
                <line x1="-2" y1="58" x2="2" y2="58" stroke="#475569" strokeWidth="1" />
              </g>

              {/* 3. HC-SR04 SENSOR MODULE */}
              <rect x="580" y="170" width="180" height="150" rx="8" fill="#0d1b33" stroke="#22c55e" strokeWidth="2" />
              <rect x="590" y="180" width="160" height="22" rx="4" fill="#15803d" />
              <text x="670" y="195" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                HC-SR04 ULTRASONIC
              </text>
              {/* Transducer Eyes */}
              <circle cx="630" cy="235" r="16" fill="#052e16" stroke="#22c55e" strokeWidth="1.5" />
              <text x="630" y="238" fill="#4ade80" fontSize="8" textAnchor="middle">TX</text>
              <circle cx="710" cy="235" r="16" fill="#052e16" stroke="#22c55e" strokeWidth="1.5" />
              <text x="710" y="238" fill="#4ade80" fontSize="8" textAnchor="middle">RX</text>

              {/* HC-SR04 Pins */}
              <text x="595" y="275" fill="#f59e0b" fontSize="9">VCC (+5V)</text>
              <circle cx="580" cy="272" r="3.5" fill="#f59e0b" />

              <text x="595" y="295" fill="#22c55e" fontSize="9">TRIG (Pulse)</text>
              <circle cx="580" cy="292" r="3.5" fill="#22c55e" />

              <text x="595" y="315" fill="#eab308" fontSize="9">ECHO (5V Out)</text>
              <circle cx="580" cy="312" r="3.5" fill="#eab308" />

              {/* TRIG Connection: GPIO5 -> TRIG */}
              <path id="radar-trig-path" d="M 460 186 L 520 186 L 520 292 L 580 292" fill="none" stroke="#22c55e" strokeWidth="1.8" />
              <circle r="3" fill="#4ade80">
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 460 186 L 520 186 L 520 292 L 580 292" />
              </circle>
              <text x="530" y="284" fill="#22c55e" fontSize="8" fontWeight="bold">10µs TRIG</text>

              {/* 4. VOLTAGE DIVIDER (R1 = 1kΩ, R2 = 2kΩ) on ECHO line */}
              {/* Wire from HC-SR04 ECHO (580, 312) to R1 */}
              <line x1="580" y1="312" x2="550" y2="312" stroke="#eab308" strokeWidth="1.8" />
              <text x="555" y="326" fill="#eab308" fontSize="8">5V Echo</text>

              {/* HC-SR04 Pin 4 GND */}
              <text x="595" y="330" fill="#94a3b8" fontSize="8.5">GND (0V)</text>
              <circle cx="580" cy="326" r="3" fill="#64748b" />
              <path d="M 580 326 L 560 326 L 560 355" fill="none" stroke="#475569" strokeWidth="1.8" />
              <line x1="552" y1="355" x2="568" y2="355" stroke="#475569" strokeWidth="2" />
              <line x1="555" y1="359" x2="565" y2="359" stroke="#475569" strokeWidth="1.5" />

              {/* R1 Resistor: Horizontal Zig-Zag */}
              <g transform="translate(520, 312)">
                <line x1="30" y1="0" x2="20" y2="0" stroke="#eab308" strokeWidth="1.8" />
                <path d="M 20 0 L 17 -5 L 11 5 L 5 -5 L -1 5 L -7 -5 L -13 5 L -16 0" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <line x1="-16" y1="0" x2="-25" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="0" y="-10" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">R1: 1.0 kΩ</text>
              </g>

              {/* Divider Midpoint Node at (495, 312) */}
              <circle cx="495" cy="312" r="4" fill="#38bdf8" />
              {/* Connection to ESP32 GPIO18 */}
              <path d="M 495 312 L 495 226 L 460 226" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              <circle r="3" fill="#38bdf8">
                <animateMotion dur="1.5s" repeatCount="indefinite" path="M 580 312 L 495 312 L 495 226 L 460 226" />
              </circle>
              <text x="480" y="218" fill="#38bdf8" fontSize="8" fontWeight="bold">Safe 3.3V Echo</text>

              {/* R2 Resistor going to GND */}
              <g transform="translate(495, 335)">
                <line x1="0" y1="-23" x2="0" y2="-15" stroke="#38bdf8" strokeWidth="1.8" />
                <path d="M 0 -15 L -5 -12 L 5 -6 L -5 0 L 5 6 L -5 12 L 0 15" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <line x1="0" y1="15" x2="0" y2="25" stroke="#475569" strokeWidth="1.8" />
                <text x="12" y="4" fill="#f59e0b" fontSize="9" fontWeight="bold">R2: 2.0 kΩ</text>
                {/* GND */}
                <line x1="-8" y1="25" x2="8" y2="25" stroke="#475569" strokeWidth="2" />
                <line x1="-5" y1="29" x2="5" y2="29" stroke="#475569" strokeWidth="1.5" />
                <line x1="-2" y1="33" x2="2" y2="33" stroke="#475569" strokeWidth="1" />
              </g>

              {/* 5. SG90 SERVO MOTOR MODULE */}
              <rect x="580" y="55" width="180" height="95" rx="8" fill="#131c36" stroke="#38bdf8" strokeWidth="2" />
              <text x="670" y="75" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                TOWERPRO SG90 SERVO
              </text>
              <text x="670" y="90" fill="#94a3b8" fontSize="8.5" textAnchor="middle">
                180° Micro Actuator (50 Hz)
              </text>

              {/* Servo Terminals */}
              <text x="595" y="112" fill="#f59e0b" fontSize="8.5">Red (+5V Power)</text>
              <circle cx="580" cy="108" r="3.5" fill="#f59e0b" />

              <text x="595" y="126" fill="#94a3b8" fontSize="8.5">Brown (GND)</text>
              <circle cx="580" cy="122" r="3.5" fill="#64748b" />
              <path d="M 580 122 L 545 122 L 545 102" fill="none" stroke="#475569" strokeWidth="1.6" />
              <line x1="538" y1="102" x2="552" y2="102" stroke="#475569" strokeWidth="1.8" />
              <line x1="541" y1="98" x2="549" y2="98" stroke="#475569" strokeWidth="1.2" />

              <text x="595" y="140" fill="#38bdf8" fontSize="8.5">Orange (PWM Pulse)</text>
              <circle cx="580" cy="136" r="3.5" fill="#38bdf8" />

              {/* R3 Resistor (330Ω) on PWM line */}
              <g transform="translate(520, 146)">
                <line x1="-60" y1="0" x2="-20" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                <path d="M -20 0 L -16 -4 L -10 4 L -4 -4 L 2 4 L 8 -4 L 14 4 L 18 0" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                <line x1="18" y1="0" x2="40" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                <line x1="40" y1="0" x2="60" y2="-10" stroke="#38bdf8" strokeWidth="1.8" />
                <circle r="3" fill="#67e8f9">
                  <animateMotion dur="1.2s" repeatCount="indefinite" path="M -60 0 L 40 0 L 60 -10" />
                </circle>
                <text x="0" y="-8" fill="#38bdf8" fontSize="8.5" fontWeight="bold" textAnchor="middle">R3: 330 Ω</text>
              </g>

              {/* Wiring to 5V power and GND */}
              {/* +5V line to Servo */}
              <path d="M 240 140 L 240 70 L 560 70 L 560 108 L 580 108" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />
              {/* +5V line to HC-SR04 */}
              <path d="M 560 70 L 780 70 L 780 272 L 760 272" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" />

              {/* Rationale callout card in SVG */}
              <g transform="translate(40, 240)">
                <rect width="190" height="120" rx="6" fill="#080e1e" stroke="#334155" strokeWidth="1" />
                <text x="12" y="20" fill="#38bdf8" fontSize="10" fontWeight="bold">DESIGN RATIONALE:</text>
                <text x="12" y="38" fill="#cbd5e1" fontSize="8.5">• 1k/2k Divider: 5V * (2/3) = 3.3V</text>
                <text x="12" y="52" fill="#cbd5e1" fontSize="8.5">  Protects 3.3V ESP32 GPIO18</text>
                <text x="12" y="70" fill="#cbd5e1" fontSize="8.5">• 100µF C1: Absorbs stall surge</text>
                <text x="12" y="84" fill="#cbd5e1" fontSize="8.5">  Prevents brownout restarts</text>
                <text x="12" y="102" fill="#cbd5e1" fontSize="8.5">• 330Ω R3: Damps PWM ringing</text>
              </g>
            </svg>
          )}

          {projectId === "ULTRASONIC" && (
            <svg
              viewBox="0 0 880 400"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-us" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="880" height="400" fill="url(#grid-us)" rx="8" />

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                PROJECT 2: ULTRASONIC RANGEFINDER &amp; HAZARD BUZZER · FULL SCHEMATIC
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                HC-SR04 + 2N2222 NPN BJT Buzzer Driver + 1N4148 Snubber + 3-Stage Safety LEDs (Green/Yellow/Red)
              </text>

              {/* ESP32 Controller */}
              <rect x="230" y="80" width="190" height="280" rx="8" fill="#0b1329" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="240" y="90" width="170" height="24" rx="4" fill="#0284c7" />
              <text x="325" y="106" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                ESP32 CONTROLLER
              </text>

              {/* Pins on ESP32 */}
              <text x="410" y="145" fill="#38bdf8" fontSize="9.5" textAnchor="end">GPIO21 (BUZZER)</text>
              <circle cx="420" cy="141" r="3.5" fill="#38bdf8" />

              <text x="410" y="180" fill="#22c55e" fontSize="9.5" textAnchor="end">GPIO19 (GREEN LED)</text>
              <circle cx="420" cy="176" r="3.5" fill="#22c55e" />

              <text x="410" y="215" fill="#eab308" fontSize="9.5" textAnchor="end">GPIO22 (YELLOW LED)</text>
              <circle cx="420" cy="211" r="3.5" fill="#eab308" />

              <text x="410" y="250" fill="#ef4444" fontSize="9.5" textAnchor="end">GPIO23 (RED LED)</text>
              <circle cx="420" cy="246" r="3.5" fill="#ef4444" />

              <text x="410" y="290" fill="#22c55e" fontSize="9.5" textAnchor="end">GPIO5 (TRIG)</text>
              <circle cx="420" cy="286" r="3.5" fill="#22c55e" />

              <text x="410" y="325" fill="#38bdf8" fontSize="9.5" textAnchor="end">GPIO18 (ECHO)</text>
              <circle cx="420" cy="321" r="3.5" fill="#38bdf8" />

              {/* BUZZER DRIVER CIRCUIT WITH 2N2222 NPN */}
              <g transform="translate(480, 141)">
                {/* R3 Base Resistor: 1kΩ */}
                <line x1="-60" y1="0" x2="-20" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                <path d="M -20 0 L -16 -4 L -10 4 L -4 -4 L 2 4 L 8 -4 L 14 4 L 18 0" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                <line x1="18" y1="0" x2="35" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                <text x="0" y="-8" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle">R3: 1.0 kΩ</text>

                {/* 2N2222 Transistor Symbol */}
                <circle cx="55" cy="0" r="16" fill="#08142c" stroke="#38bdf8" strokeWidth="1.5" />
                {/* Base bar */}
                <line x1="45" y1="-9" x2="45" y2="9" stroke="#ffffff" strokeWidth="2" />
                <line x1="35" y1="0" x2="45" y2="0" stroke="#ffffff" strokeWidth="1.5" />
                {/* Collector */}
                <line x1="45" y1="-5" x2="65" y2="-12" stroke="#ffffff" strokeWidth="1.5" />
                {/* Emitter with arrow */}
                <line x1="45" y1="5" x2="65" y2="12" stroke="#ffffff" strokeWidth="1.5" />
                <polygon points="65,12 58,9 62,6" fill="#ffffff" />
                <text x="55" y="-22" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">Q1: 2N2222</text>

                {/* Emitter to GND */}
                <line x1="65" y1="12" x2="65" y2="35" stroke="#475569" strokeWidth="1.5" />
                <line x1="57" y1="35" x2="73" y2="35" stroke="#475569" strokeWidth="1.5" />
                <line x1="60" y1="39" x2="70" y2="39" stroke="#475569" strokeWidth="1.2" />

                {/* Collector to Buzzer and Flyback Diode */}
                <line x1="65" y1="-12" x2="65" y2="-50" stroke="#38bdf8" strokeWidth="1.8" />

                {/* 5V Piezo Buzzer */}
                <g transform="translate(65, -80)">
                  <circle cx="0" cy="0" r="15" fill="#18233c" stroke="#f59e0b" strokeWidth="1.8" />
                  <path d="M -8 -8 L -4 -4 M 8 -8 L 4 -4 M -8 8 L -4 4 M 8 8 L 4 4" stroke="#f59e0b" strokeWidth="1.2" />
                  <text x="25" y="4" fill="#f59e0b" fontSize="8.5" fontWeight="bold">5V Piezo Buzzer</text>
                  <line x1="0" y1="-15" x2="0" y2="-30" stroke="#f59e0b" strokeWidth="1.8" />
                  <text x="5" y="-20" fill="#f59e0b" fontSize="8" fontWeight="bold">+5V</text>
                </g>

                {/* Flyback Diode 1N4148 in parallel with Buzzer */}
                <g transform="translate(125, -65)">
                  <line x1="-60" y1="15" x2="-15" y2="15" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="-60" y1="-30" x2="-15" y2="-30" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="-15" y1="15" x2="-15" y2="-5" stroke="#38bdf8" strokeWidth="1.5" />
                  <line x1="-15" y1="-30" x2="-15" y2="-15" stroke="#f59e0b" strokeWidth="1.5" />
                  {/* Diode Symbol pointing UP (Cathode to +5V) */}
                  <polygon points="-21,-5 -9,-5 -15,-15" fill="#e2e8f0" stroke="#e2e8f0" />
                  <line x1="-21" y1="-15" x2="-9" y2="-15" stroke="#e2e8f0" strokeWidth="2" />
                  <text x="3" y="-8" fill="#94a3b8" fontSize="8">D1: 1N4148</text>
                  <text x="3" y="2" fill="#64748b" fontSize="7">Flyback Snubber</text>
                </g>
              </g>

              {/* 3x SAFETY STATUS LEDS */}
              {/* Green LED */}
              <g transform="translate(480, 176)">
                <line x1="-60" y1="0" x2="-10" y2="0" stroke="#22c55e" strokeWidth="1.5" />
                <path d="M -10 0 L -7 -3 L -3 3 L 1 -3 L 5 3 L 9 -3 L 13 3 L 16 0" fill="none" stroke="#22c55e" strokeWidth="1.5" />
                <text x="3" y="-6" fill="#22c55e" fontSize="7.5" fontWeight="bold">220Ω</text>
                <line x1="16" y1="0" x2="30" y2="0" stroke="#22c55e" strokeWidth="1.5" />
                {/* LED symbol */}
                <polygon points="30,-6 30,6 40,0" fill="#22c55e" stroke="#22c55e" />
                <line x1="40" y1="-6" x2="40" y2="6" stroke="#22c55e" strokeWidth="2" />
                {/* Photons */}
                <line x1="38" y1="-7" x2="44" y2="-13" stroke="#22c55e" strokeWidth="1" />
                <line x1="34" y1="-7" x2="40" y2="-13" stroke="#22c55e" strokeWidth="1" />
                <line x1="40" y1="0" x2="55" y2="0" stroke="#475569" strokeWidth="1.5" />
                <text x="65" y="4" fill="#22c55e" fontSize="8" fontWeight="bold">Green (Safe &gt;40cm)</text>
              </g>

              {/* Yellow LED */}
              <g transform="translate(480, 211)">
                <line x1="-60" y1="0" x2="-10" y2="0" stroke="#eab308" strokeWidth="1.5" />
                <path d="M -10 0 L -7 -3 L -3 3 L 1 -3 L 5 3 L 9 -3 L 13 3 L 16 0" fill="none" stroke="#eab308" strokeWidth="1.5" />
                <text x="3" y="-6" fill="#eab308" fontSize="7.5" fontWeight="bold">220Ω</text>
                <line x1="16" y1="0" x2="30" y2="0" stroke="#eab308" strokeWidth="1.5" />
                <polygon points="30,-6 30,6 40,0" fill="#eab308" stroke="#eab308" />
                <line x1="40" y1="-6" x2="40" y2="6" stroke="#eab308" strokeWidth="2" />
                <line x1="40" y1="0" x2="55" y2="0" stroke="#475569" strokeWidth="1.5" />
                <text x="65" y="4" fill="#eab308" fontSize="8" fontWeight="bold">Yellow (Warn 15-40cm)</text>
              </g>

              {/* Red LED */}
              <g transform="translate(480, 246)">
                <line x1="-60" y1="0" x2="-10" y2="0" stroke="#ef4444" strokeWidth="1.5" />
                <path d="M -10 0 L -7 -3 L -3 3 L 1 -3 L 5 3 L 9 -3 L 13 3 L 16 0" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                <text x="3" y="-6" fill="#ef4444" fontSize="7.5" fontWeight="bold">220Ω</text>
                <line x1="16" y1="0" x2="30" y2="0" stroke="#ef4444" strokeWidth="1.5" />
                <polygon points="30,-6 30,6 40,0" fill="#ef4444" stroke="#ef4444" />
                <line x1="40" y1="-6" x2="40" y2="6" stroke="#ef4444" strokeWidth="2" />
                <line x1="40" y1="0" x2="55" y2="0" stroke="#475569" strokeWidth="1.5" />
                <text x="65" y="4" fill="#ef4444" fontSize="8" fontWeight="bold">Red (Critical &lt;15cm)</text>
              </g>

              {/* Common LED cathode ground */}
              <line x1="535" y1="176" x2="535" y2="280" stroke="#475569" strokeWidth="1.5" />
              <line x1="535" y1="280" x2="535" y2="300" stroke="#475569" strokeWidth="1.5" />
              <line x1="527" y1="300" x2="543" y2="300" stroke="#475569" strokeWidth="2" />
              <line x1="530" y1="304" x2="540" y2="304" stroke="#475569" strokeWidth="1.5" />
              <line x1="533" y1="308" x2="537" y2="308" stroke="#475569" strokeWidth="1" />

              {/* HC-SR04 + 1k/2k Divider Connected to GPIO5 (286) & GPIO18 (321) */}
              <path d="M 420 286 L 690 286" fill="none" stroke="#22c55e" strokeWidth="1.8" />
              <circle r="3" fill="#4ade80">
                <animateMotion dur="1.3s" repeatCount="indefinite" path="M 420 286 L 690 286" />
              </circle>
              <path d="M 690 321 L 635 321" fill="none" stroke="#eab308" strokeWidth="1.8" />
              <path d="M 635 321 L 620 316 L 610 326 L 600 316 L 590 326 L 580 321 L 420 321" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              <text x="608" y="311" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">R1: 1kΩ</text>
              <circle cx="560" cy="321" r="3" fill="#38bdf8" />
              <path d="M 560 321 L 560 335 L 555 340 L 565 346 L 555 352 L 565 358 L 560 364 L 560 374" fill="none" stroke="#f59e0b" strokeWidth="1.6" />
              <text x="568" y="355" fill="#f59e0b" fontSize="8" fontWeight="bold">R2: 2kΩ</text>
              <line x1="552" y1="374" x2="568" y2="374" stroke="#475569" strokeWidth="2" />
              <circle r="3" fill="#38bdf8">
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 690 321 L 560 321 L 420 321" />
              </circle>

              <rect x="690" y="255" width="160" height="105" rx="6" fill="#0d1b33" stroke="#22c55e" strokeWidth="1.8" />
              <text x="770" y="274" fill="#4ade80" fontSize="10" fontWeight="bold" textAnchor="middle">HC-SR04 SENSOR</text>
              <text x="702" y="290" fill="#22c55e" fontSize="8.5">TRIG (+5V TRIG)</text>
              <text x="702" y="324" fill="#eab308" fontSize="8.5">ECHO (5V OUT)</text>
              <text x="702" y="344" fill="#f59e0b" fontSize="8">VCC: +5V | GND: 0V</text>

              {/* Bench PSU Left Rail feeding ESP32 */}
              <rect x="30" y="130" width="140" height="110" rx="6" fill="#181308" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="100" y="155" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle">+5V BENCH PSU</text>
              <text x="100" y="172" fill="#94a3b8" fontSize="8" textAnchor="middle">Shared +5V &amp; GND</text>
              <line x1="170" y1="160" x2="230" y2="160" stroke="#ef4444" strokeWidth="2" />
              <line x1="170" y1="205" x2="230" y2="205" stroke="#475569" strokeWidth="2" />
              <text x="200" y="152" fill="#ef4444" fontSize="8" fontWeight="bold">+5V</text>
              <text x="200" y="198" fill="#94a3b8" fontSize="8">GND</text>
            </svg>
          )}

          {projectId === "DC_MOTOR" && (
            <svg
              viewBox="0 0 880 430"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-dc" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="880" height="430" fill="url(#grid-dc)" rx="8" />

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                PROJECT 4: L298N DUAL H-BRIDGE MOTOR DRIVER · FULL SCHEMATIC
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                12V DC Motor + 4x 1N4007 Fast Flyback Diodes + 100nF Spark Suppression + 0.5Ω Current Shunt
              </text>

              {/* L298N Driver IC */}
              <rect x="360" y="90" width="180" height="260" rx="8" fill="#0b1730" stroke="#38bdf8" strokeWidth="2" />
              <rect x="370" y="100" width="160" height="24" rx="4" fill="#0284c7" />
              <text x="450" y="116" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                L298N DRIVER IC
              </text>

              {/* Pins on L298N */}
              <text x="375" y="150" fill="#38bdf8" fontSize="9">ENA (GPIO14 PWM)</text>
              <circle cx="360" cy="146" r="3.5" fill="#38bdf8" />

              <text x="375" y="180" fill="#22c55e" fontSize="9">IN1 (GPIO27 DIR)</text>
              <circle cx="360" cy="176" r="3.5" fill="#22c55e" />

              <text x="375" y="210" fill="#22c55e" fontSize="9">IN2 (GPIO26 DIR)</text>
              <circle cx="360" cy="206" r="3.5" fill="#22c55e" />

              <text x="375" y="260" fill="#f59e0b" fontSize="9">Vs (+12V MOTOR)</text>
              <circle cx="360" cy="256" r="3.5" fill="#f59e0b" />

              <text x="375" y="290" fill="#38bdf8" fontSize="9">Vss (+5V LOGIC)</text>
              <circle cx="360" cy="286" r="3.5" fill="#38bdf8" />

              <text x="375" y="320" fill="#94a3b8" fontSize="9">GND (GROUND)</text>
              <circle cx="360" cy="316" r="3.5" fill="#64748b" />

              {/* Outputs on Right */}
              <text x="525" y="180" fill="#f59e0b" fontSize="10" textAnchor="end">OUT1 (Pin 2)</text>
              <circle cx="540" cy="176" r="4" fill="#f59e0b" />

              <text x="525" y="240" fill="#f59e0b" fontSize="10" textAnchor="end">OUT2 (Pin 3)</text>
              <circle cx="540" cy="236" r="4" fill="#f59e0b" />

              <text x="525" y="310" fill="#94a3b8" fontSize="9" textAnchor="end">Sense A (Pin 1)</text>
              <circle cx="540" cy="306" r="3.5" fill="#94a3b8" />

              {/* Current Sense Shunt Resistor (0.5Ω) */}
              <g transform="translate(580, 306)">
                <line x1="-40" y1="0" x2="-15" y2="0" stroke="#94a3b8" strokeWidth="1.5" />
                <path d="M -15 0 L -12 -5 L -6 5 L 0 -5 L 6 5 L 12 -5 L 15 0" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <line x1="15" y1="0" x2="35" y2="0" stroke="#475569" strokeWidth="1.5" />
                <text x="0" y="-9" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle">R_SENSE: 0.5 Ω (2W)</text>
                {/* GND */}
                <line x1="35" y1="-8" x2="35" y2="8" stroke="#475569" strokeWidth="2" />
                <line x1="39" y1="-5" x2="39" y2="5" stroke="#475569" strokeWidth="1.5" />
                <line x1="43" y1="-2" x2="43" y2="2" stroke="#475569" strokeWidth="1" />
              </g>

              {/* DC MOTOR SYMBOL */}
              <g transform="translate(690, 206)">
                <circle cx="0" cy="0" r="26" fill="#0c1d3b" stroke="#38bdf8" strokeWidth="2.5" />
                <text x="0" y="6" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle">M</text>
                {/* Commutator Brushes */}
                <rect x="-30" y="-5" width="4" height="10" fill="#f59e0b" />
                <rect x="26" y="-5" width="4" height="10" fill="#f59e0b" />

                <line x1="-150" y1="-30" x2="-30" y2="-30" stroke="#f59e0b" strokeWidth="2" />
                <line x1="-30" y1="-30" x2="-30" y2="0" stroke="#f59e0b" strokeWidth="2" />

                <line x1="-150" y1="30" x2="30" y2="30" stroke="#f59e0b" strokeWidth="2" />
                <line x1="30" y1="30" x2="30" y2="0" stroke="#f59e0b" strokeWidth="2" />

                {/* 100nF Ceramic Snubber across Motor Terminals */}
                <g transform="translate(0, 45)">
                  <line x1="-30" y1="-15" x2="-30" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="30" y1="-15" x2="30" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="-30" y1="0" x2="-8" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                  <line x1="30" y1="0" x2="8" y2="0" stroke="#f59e0b" strokeWidth="1.5" />
                  <rect x="-8" y="-7" width="3" height="14" fill="#38bdf8" />
                  <rect x="5" y="-7" width="3" height="14" fill="#38bdf8" />
                  <text x="0" y="16" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">C1: 100nF (EMI)</text>
                </g>
                <text x="0" y="-34" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">12V DC MOTOR</text>
              </g>

              {/* 4x FLYBACK RECOVERY DIODES (1N4007) */}
              <text x="590" y="125" fill="#94a3b8" fontSize="8.5">4x 1N4007 Protective Free-Wheeling Diodes</text>
              <g transform="translate(600, 150)">
                <polygon points="0,-12 10,-12 5,-22" fill="#e2e8f0" stroke="#e2e8f0" />
                <line x1="0" y1="-22" x2="10" y2="-22" stroke="#e2e8f0" strokeWidth="1.5" />
                <polygon points="30,-12 40,-12 35,-22" fill="#e2e8f0" stroke="#e2e8f0" />
                <line x1="30" y1="-22" x2="40" y2="-22" stroke="#e2e8f0" strokeWidth="1.5" />
              </g>

              {/* ESP32 Controller on Left */}
              <rect x="60" y="110" width="180" height="200" rx="8" fill="#0b1329" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="70" y="120" width="160" height="24" rx="4" fill="#0284c7" />
              <text x="150" y="136" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                ESP32 PWM MASTER
              </text>
              <text x="230" y="175" fill="#38bdf8" fontSize="9" textAnchor="end">GPIO14 (ENA)</text>
              <circle cx="240" cy="171" r="3.5" fill="#38bdf8" />
              <text x="230" y="205" fill="#22c55e" fontSize="9" textAnchor="end">GPIO27 (IN1)</text>
              <circle cx="240" cy="201" r="3.5" fill="#22c55e" />
              <text x="230" y="235" fill="#22c55e" fontSize="9" textAnchor="end">GPIO26 (IN2)</text>
              <circle cx="240" cy="231" r="3.5" fill="#22c55e" />

              {/* Connections between ESP32 and L298N */}
              <line x1="240" y1="171" x2="360" y2="146" stroke="#38bdf8" strokeWidth="1.8" />
              <line x1="240" y1="201" x2="360" y2="176" stroke="#22c55e" strokeWidth="1.8" />
              <line x1="240" y1="231" x2="360" y2="206" stroke="#22c55e" strokeWidth="1.8" />
              <circle r="3" fill="#67e8f9">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 240 171 L 360 146" />
              </circle>
              <circle r="3" fill="#fde047">
                <animateMotion dur="1.0s" repeatCount="indefinite" path="M 540 176 L 660 176 L 660 206" />
              </circle>
              <circle r="3" fill="#38bdf8">
                <animateMotion dur="1.0s" repeatCount="indefinite" path="M 720 206 L 720 236 L 540 236" />
              </circle>

              {/* Bench Dual PSU (+12V Motor / +5V Logic / GND) */}
              <rect x="60" y="330" width="180" height="75" rx="6" fill="#181308" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="150" y="352" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle">DUAL BENCH PSU</text>
              <text x="150" y="368" fill="#cbd5e1" fontSize="8.5" textAnchor="middle">+12V Motor · +5V Logic</text>
              <path d="M 240 342 L 300 342 L 300 256 L 360 256" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
              <path d="M 240 364 L 320 364 L 320 286 L 360 286" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              <path d="M 240 386 L 340 386 L 340 316 L 360 316" fill="none" stroke="#475569" strokeWidth="2" />
            </svg>
          )}

          {projectId === "SERVO" && (
            <svg
              viewBox="0 0 880 380"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-sv" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="880" height="380" fill="url(#grid-sv)" rx="8" />

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                PROJECT 3: SG90 MICRO SERVO PWM PRECISION CONTROLLER · FULL SCHEMATIC
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                ESP32 50Hz LEDC PWM + LM7805 5V Regulator + 470µF Stall Buffer + 330Ω Protection Resistor
              </text>

              {/* ESP32 Controller */}
              <rect x="40" y="100" width="160" height="190" rx="8" fill="#0b1329" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="50" y="110" width="140" height="22" rx="4" fill="#0284c7" />
              <text x="120" y="125" fill="#ffffff" fontSize="10.5" fontWeight="bold" textAnchor="middle">ESP32 LEDC MCU</text>
              <text x="190" y="255" fill="#38bdf8" fontSize="9" textAnchor="end">GPIO4 (50Hz PWM)</text>
              <circle cx="200" cy="251" r="3.5" fill="#38bdf8" />
              <text x="190" y="210" fill="#94a3b8" fontSize="9" textAnchor="end">GND (0V)</text>
              <circle cx="200" cy="206" r="3.5" fill="#64748b" />

              {/* Bench PSU +12V */}
              <rect x="40" y="305" width="160" height="50" rx="6" fill="#181308" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="120" y="328" fill="#fbbf24" fontSize="10" fontWeight="bold" textAnchor="middle">+12V BENCH PSU</text>
              <path d="M 200 322 L 235 322 L 235 140 L 260 140" fill="none" stroke="#f59e0b" strokeWidth="1.8" />

              {/* LM7805 Linear Regulator */}
              <rect x="260" y="100" width="140" height="80" rx="6" fill="#1e1b0c" stroke="#f59e0b" strokeWidth="1.5" />
              <text x="330" y="125" fill="#f59e0b" fontSize="11" fontWeight="bold" textAnchor="middle">LM7805</text>
              <text x="330" y="142" fill="#cbd5e1" fontSize="9" textAnchor="middle">5.0V Regulator</text>
              <text x="270" y="144" fill="#f59e0b" fontSize="8">IN</text>
              <text x="392" y="116" fill="#ef4444" fontSize="8" textAnchor="end">+5V OUT</text>

              {/* +5V Regulated Rail into 470uF & Servo Red */}
              <path d="M 400 112 L 580 112" fill="none" stroke="#ef4444" strokeWidth="2" />
              <circle cx="450" cy="112" r="3.5" fill="#ef4444" />
              <circle r="3" fill="#fde047">
                <animateMotion dur="1.4s" repeatCount="indefinite" path="M 235 140 L 260 140 M 400 112 L 580 112" />
              </circle>

              {/* 470µF Reservoir Cap */}
              <g transform="translate(450, 140)">
                <line x1="0" y1="-28" x2="0" y2="-10" stroke="#ef4444" strokeWidth="1.8" />
                <rect x="-10" y="-10" width="20" height="4" fill="#38bdf8" />
                <path d="M -10 2 Q 0 -2 10 2" fill="none" stroke="#64748b" strokeWidth="2.5" />
                <line x1="0" y1="2" x2="0" y2="46" stroke="#475569" strokeWidth="1.5" />
                <line x1="-8" y1="46" x2="8" y2="46" stroke="#475569" strokeWidth="2" />
                <text x="14" y="-2" fill="#38bdf8" fontSize="8.5" fontWeight="bold">C3: 470µF</text>
                <text x="14" y="10" fill="#64748b" fontSize="7.5">Low-ESR Stall Buffer</text>
              </g>

              {/* 330 Ohm Protection Resistor on PWM */}
              <path d="M 200 251 L 340 251" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              <path d="M 340 251 L 344 246 L 352 256 L 360 246 L 368 256 L 376 246 L 380 251" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <text x="360" y="238" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle">R1: 330 Ω</text>
              <path d="M 380 251 L 520 251 L 520 205 L 580 205" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
              <circle r="3" fill="#67e8f9">
                <animateMotion dur="1.1s" repeatCount="indefinite" path="M 200 251 L 520 251 L 520 205 L 580 205" />
              </circle>

              {/* Common GND Bus */}
              <path d="M 200 206 L 330 206 L 330 180 M 330 206 L 545 206 L 545 160 L 580 160" fill="none" stroke="#475569" strokeWidth="1.8" />

              {/* SG90 Servo */}
              <rect x="580" y="90" width="180" height="150" rx="8" fill="#0d1b33" stroke="#38bdf8" strokeWidth="2" />
              <text x="670" y="115" fill="#38bdf8" fontSize="12" fontWeight="bold" textAnchor="middle">
                SG90 9g SERVO
              </text>
              <circle cx="580" cy="112" r="3.5" fill="#ef4444" />
              <circle cx="580" cy="160" r="3.5" fill="#64748b" />
              <circle cx="580" cy="205" r="3.5" fill="#38bdf8" />
              <circle cx="670" cy="165" r="25" fill="#18233c" stroke="#38bdf8" strokeWidth="2" />
              <line x1="670" y1="165" x2="685" y2="145" stroke="#ffffff" strokeWidth="2.5" />
              <text x="670" y="215" fill="#94a3b8" fontSize="8.5" textAnchor="middle">
                Internal Gearbox &amp; Potentiometer
              </text>
            </svg>
          )}

          {projectId === "SMART_HOME" && (
            <svg
              viewBox="0 0 880 430"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-sh" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="880" height="430" fill="url(#grid-sh)" rx="8" />

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                PROJECT 6: 4-CHANNEL OPTOCOUPLED RELAY AUTOMATION BANK · FULL SCHEMATIC
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                5000Vrms PC817 Optocoupler Isolation + BC547 Drivers + 1N4007 Snubbers + 250VAC/10A Relays
              </text>

              {/* Single Channel Detailed Drive Slice */}
              <g transform="translate(40, 100)">
                {/* ESP32 Output */}
                <rect x="0" y="40" width="120" height="70" rx="6" fill="#0b1329" stroke="#0ea5e9" strokeWidth="1.5" />
                <text x="60" y="65" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">ESP32 GPIO16</text>
                <text x="60" y="82" fill="#38bdf8" fontSize="8" textAnchor="middle">3.3V Logic Trigger</text>

                {/* 1k Resistor */}
                <line x1="120" y1="75" x2="160" y2="75" stroke="#38bdf8" strokeWidth="1.5" />
                <path d="M 160 75 L 164 71 L 170 79 L 176 71 L 182 79 L 188 71 L 194 79 L 198 75" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                <text x="179" y="65" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">R1: 1.0 kΩ</text>
                <line x1="198" y1="75" x2="230" y2="75" stroke="#38bdf8" strokeWidth="1.5" />

                {/* PC817 Optocoupler */}
                <rect x="230" y="40" width="110" height="90" rx="6" fill="#18233c" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4 2" />
                <text x="285" y="58" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">PC817 OPTO</text>
                {/* Internal LED */}
                <polygon points="260,70 260,80 270,75" fill="#38bdf8" stroke="#38bdf8" />
                <line x1="270" y1="70" x2="270" y2="80" stroke="#38bdf8" strokeWidth="1.5" />
                {/* Phototransistor */}
                <line x1="300" y1="65" x2="300" y2="85" stroke="#ffffff" strokeWidth="2" />
                <line x1="300" y1="70" x2="320" y2="60" stroke="#ffffff" strokeWidth="1.5" />
                <line x1="300" y1="80" x2="320" y2="90" stroke="#ffffff" strokeWidth="1.5" />

                {/* 5000V Isolation Barrier Callout */}
                <text x="285" y="115" fill="#22c55e" fontSize="7.5" fontWeight="bold" textAnchor="middle">5000V ISOLATION</text>

                {/* BC547 Driver Transistor + Coil Drive */}
                <circle cx="410" cy="115" r="16" fill="#0b1730" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="410" y="90" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">Q1: BC547</text>
                <line x1="320" y1="90" x2="395" y2="115" stroke="#38bdf8" strokeWidth="1.5" />
                {/* Emitter GND */}
                <line x1="410" y1="131" x2="410" y2="155" stroke="#475569" strokeWidth="1.6" />
                <line x1="402" y1="155" x2="418" y2="155" stroke="#475569" strokeWidth="2" />
                {/* Collector -> Relay Coil */}
                <path d="M 426 115 L 480 115 L 480 110 L 530 110" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                {/* +5V -> Relay Coil Right */}
                <path d="M 620 110 L 650 110 L 650 85" fill="none" stroke="#ef4444" strokeWidth="1.8" />
                <text x="650" y="79" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">+5V</text>
                {/* Relay Switch Contact -> Mains Load */}
                <path d="M 670 110 L 710 110" fill="none" stroke="#22c55e" strokeWidth="2.2" />
                <circle r="3" fill="#67e8f9">
                  <animateMotion dur="1.3s" repeatCount="indefinite" path="M 120 75 L 260 75 M 320 90 L 395 115 M 426 115 L 530 110" />
                </circle>
                <circle r="3" fill="#4ade80">
                  <animateMotion dur="0.9s" repeatCount="indefinite" path="M 670 110 L 710 110" />
                </circle>

                {/* Songle 5V Relay */}
                <rect x="500" y="40" width="170" height="150" rx="8" fill="#131c36" stroke="#22c55e" strokeWidth="2" />
                <text x="585" y="65" fill="#22c55e" fontSize="11" fontWeight="bold" textAnchor="middle">SONGLE 5V RELAY</text>
                <text x="585" y="80" fill="#94a3b8" fontSize="8.5" textAnchor="middle">SRD-05VDC-SL-C</text>

                {/* Relay Coil with 1N4007 Diode */}
                <g transform="translate(530, 110)">
                  {/* Coiled turns */}
                  <path d="M 0 0 C 10 -15 20 -15 30 0 C 40 -15 50 -15 60 0 C 70 -15 80 -15 90 0" fill="none" stroke="#f59e0b" strokeWidth="2" />
                  <text x="45" y="-18" fill="#f59e0b" fontSize="8" fontWeight="bold" textAnchor="middle">5V Coil (70mA)</text>
                  {/* Diode 1N4007 across coil */}
                  <line x1="0" y1="0" x2="0" y2="25" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="90" y1="0" x2="90" y2="25" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="0" y1="25" x2="35" y2="25" stroke="#ef4444" strokeWidth="1.5" />
                  <line x1="90" y1="25" x2="55" y2="25" stroke="#ef4444" strokeWidth="1.5" />
                  <polygon points="35,30 35,20 45,25" fill="#ffffff" stroke="#ffffff" />
                  <line x1="45" y1="20" x2="45" y2="30" stroke="#ffffff" strokeWidth="2" />
                  <text x="45" y="42" fill="#ef4444" fontSize="7.5" fontWeight="bold" textAnchor="middle">1N4007 Snubber</text>
                </g>

                {/* 250VAC Mains Contacts */}
                <rect x="710" y="50" width="130" height="130" rx="6" fill="#180e0e" stroke="#ef4444" strokeWidth="1.5" />
                <text x="775" y="75" fill="#ef4444" fontSize="10" fontWeight="bold" textAnchor="middle">250VAC / 10A</text>
                <text x="775" y="92" fill="#fca5a5" fontSize="8.5" textAnchor="middle">Appliance Load</text>
                <text x="775" y="115" fill="#94a3b8" fontSize="8" textAnchor="middle">COM - NO - NC</text>
                <text x="775" y="145" fill="#22c55e" fontSize="8.5" fontWeight="bold" textAnchor="middle">ACTIVE MAINS</text>
              </g>
            </svg>
          )}

          {/* Fully Wired Schematics for Temp Monitor, Irrigation, Smart Car */}
          {(projectId === "TEMP_MONITOR" ||
            projectId === "IRRIGATION" ||
            projectId === "SMART_CAR") && (
            <svg
              viewBox="0 0 880 380"
              className="w-full max-w-4xl h-auto select-none font-mono"
            >
              <defs>
                <pattern id="grid-gen" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#10192e" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="880" height="380" fill="url(#grid-gen)" rx="8" />

              <text x="30" y="32" fill="#38bdf8" fontSize="14" fontWeight="bold">
                {projectId === "TEMP_MONITOR"
                  ? "PROJECT 7: DHT22 / LM35 CLIMATE MONITOR · FULL SCHEMATIC"
                  : projectId === "IRRIGATION"
                  ? "PROJECT 8: SMART AGRICULTURAL IRRIGATION & SOLENOID · FULL SCHEMATIC"
                  : "PROJECT 5: AUTONOMOUS 2WD SMART CAR & SENSORS · FULL SCHEMATIC"}
              </text>
              <text x="30" y="50" fill="#64748b" fontSize="10">
                {projectId === "TEMP_MONITOR"
                  ? "4.7kΩ Open-Drain Pull-Up + LM35 RC Low-Pass Filter (1kΩ/10µF) + 12-Bit SAR ADC Conversion"
                  : projectId === "IRRIGATION"
                  ? "IRLZ44N Logic-Level N-MOSFET (Vgs=3.3V) + 1N5408 3A Snubber + 10kΩ Gate Pull-Down + Solenoid Valve"
                  : "ESP32 Controller + L298N Dual Motor Driver + 2S Li-ion LM2596 Buck Converter + Optical Line Sensors"}
              </text>

              {/* Central Schematic Diagram Layout */}
              <rect x="80" y="90" width="200" height="240" rx="8" fill="#0b1329" stroke="#0ea5e9" strokeWidth="2" />
              <rect x="90" y="100" width="180" height="24" rx="4" fill="#0284c7" />
              <text x="180" y="116" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                ESP32 MASTER MCU
              </text>
              <text x="100" y="158" fill="#ef4444" fontSize="8.5">+5V / +3.3V</text>
              <text x="100" y="182" fill="#94a3b8" fontSize="8.5">GND (0V)</text>

              {projectId === "IRRIGATION" && (
                <>
                  <text x="270" y="164" fill="#38bdf8" fontSize="9" textAnchor="end">GPIO25 (GATE)</text>
                  <circle cx="280" cy="160" r="3.5" fill="#38bdf8" />
                  <text x="270" y="294" fill="#a855f7" fontSize="9" textAnchor="end">GPIO35 (MOIST ADC)</text>
                  <circle cx="280" cy="290" r="3.5" fill="#a855f7" />

                  <g transform="translate(360, 160)">
                    <line x1="-80" y1="0" x2="-20" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                    <path d="M -20 0 L -16 -4 L -10 4 L -4 -4 L 2 4 L 8 -4 L 14 4 L 18 0" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                    <text x="0" y="15" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">R2: 220Ω</text>
                    <line x1="18" y1="0" x2="70" y2="0" stroke="#38bdf8" strokeWidth="1.8" />
                    <circle r="3" fill="#67e8f9">
                      <animateMotion dur="1.1s" repeatCount="indefinite" path="M -80 0 L 70 0" />
                    </circle>

                    {/* R1: 10k Gate Pulldown to GND */}
                    <line x1="40" y1="0" x2="40" y2="40" stroke="#f59e0b" strokeWidth="1.5" />
                    <path d="M 40 40 L 36 44 L 44 48 L 36 52 L 44 56 L 36 60 L 44 64 L 40 68" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                    <text x="52" y="56" fill="#f59e0b" fontSize="8" fontWeight="bold">R1: 10kΩ</text>
                    <line x1="40" y1="68" x2="40" y2="85" stroke="#475569" strokeWidth="1.5" />
                    <line x1="32" y1="85" x2="48" y2="85" stroke="#475569" strokeWidth="2" />

                    {/* IRLZ44N N-MOSFET Symbol */}
                    <rect x="70" y="-25" width="70" height="50" rx="4" fill="#0d1b33" stroke="#22c55e" strokeWidth="1.5" />
                    <text x="105" y="-6" fill="#22c55e" fontSize="8.5" fontWeight="bold" textAnchor="middle">IRLZ44N</text>
                    <text x="105" y="8" fill="#94a3b8" fontSize="7" textAnchor="middle">Logic MOSFET</text>
                    {/* Source -> GND, Drain -> Solenoid */}
                    <line x1="105" y1="25" x2="105" y2="55" stroke="#475569" strokeWidth="1.8" />
                    <line x1="97" y1="55" x2="113" y2="55" stroke="#475569" strokeWidth="2" />
                    <path d="M 140 0 L 190 0" fill="none" stroke="#22c55e" strokeWidth="2" />
                    <circle r="3" fill="#4ade80">
                      <animateMotion dur="1.0s" repeatCount="indefinite" path="M 140 0 L 190 0" />
                    </circle>

                    {/* 12V Solenoid Valve */}
                    <g transform="translate(190, -40)">
                      <rect width="145" height="80" rx="6" fill="#18233c" stroke="#f59e0b" strokeWidth="1.8" />
                      <text x="72" y="24" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">12V SOLENOID</text>
                      <text x="72" y="38" fill="#cbd5e1" fontSize="8" textAnchor="middle">Water Valve Coil</text>
                      <text x="72" y="54" fill="#22c55e" fontSize="8" fontWeight="bold" textAnchor="middle">1N5408 SNUBBER</text>
                      <line x1="72" y1="-22" x2="72" y2="0" stroke="#ef4444" strokeWidth="1.8" />
                      <text x="72" y="-28" fill="#ef4444" fontSize="8.5" fontWeight="bold" textAnchor="middle">+12V PSU</text>
                    </g>

                    {/* Soil Moisture Probe -> GPIO35 */}
                    <g transform="translate(190, 95)">
                      <rect width="145" height="65" rx="6" fill="#0c1d3b" stroke="#a855f7" strokeWidth="1.5" />
                      <text x="72" y="26" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="middle">CAP. SOIL PROBE</text>
                      <text x="72" y="42" fill="#94a3b8" fontSize="7.5" textAnchor="middle">AOUT (0.9–2.8V)</text>
                    </g>
                    <path d="M 190 130 L -80 130" fill="none" stroke="#a855f7" strokeWidth="1.8" />
                    <circle r="3" fill="#c084fc">
                      <animateMotion dur="1.5s" repeatCount="indefinite" path="M 190 130 L -80 130" />
                    </circle>
                  </g>
                </>
              )}

              {projectId === "TEMP_MONITOR" && (
                <>
                  <text x="270" y="159" fill="#38bdf8" fontSize="9" textAnchor="end">GPIO4 (1-WIRE)</text>
                  <circle cx="280" cy="155" r="3.5" fill="#38bdf8" />
                  <text x="270" y="279" fill="#f59e0b" fontSize="9" textAnchor="end">GPIO34 (ADC1)</text>
                  <circle cx="280" cy="275" r="3.5" fill="#f59e0b" />

                  <path d="M 280 155 L 360 155" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                  <circle r="3" fill="#38bdf8">
                    <animateMotion dur="1.2s" repeatCount="indefinite" path="M 360 155 L 280 155" />
                  </circle>
                  <path d="M 280 275 L 360 275" fill="none" stroke="#f59e0b" strokeWidth="1.8" />
                  <circle r="3" fill="#fbbf24">
                    <animateMotion dur="1.5s" repeatCount="indefinite" path="M 360 275 L 280 275" />
                  </circle>

                  <g transform="translate(360, 110)">
                    <rect width="170" height="90" rx="6" fill="#0d1f3b" stroke="#38bdf8" strokeWidth="1.8" />
                    <text x="85" y="26" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">DHT22 SENSOR</text>
                    <text x="85" y="42" fill="#cbd5e1" fontSize="8" textAnchor="middle">Single-Wire Protocol</text>
                    <text x="85" y="62" fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="middle">R1: 4.7kΩ Pull-Up</text>
                    <text x="85" y="78" fill="#94a3b8" fontSize="7.5" textAnchor="middle">C1: 100nF Decoupling</text>
                  </g>

                  <g transform="translate(360, 230)">
                    <rect width="170" height="90" rx="6" fill="#181308" stroke="#f59e0b" strokeWidth="1.8" />
                    <text x="85" y="26" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">LM35DZ SENSOR</text>
                    <text x="85" y="42" fill="#cbd5e1" fontSize="8" textAnchor="middle">10 mV / °C Analog</text>
                    <text x="85" y="62" fill="#22c55e" fontSize="8.5" fontWeight="bold" textAnchor="middle">RC: 1kΩ + 10µF Filter</text>
                    <text x="85" y="78" fill="#94a3b8" fontSize="7.5" textAnchor="middle">Damps ADC 50Hz Hum</text>
                  </g>
                </>
              )}

              {projectId === "SMART_CAR" && (
                <>
                  <text x="270" y="150" fill="#22c55e" fontSize="8.5" textAnchor="end">GPIO12-27 (PWM)</text>
                  <circle cx="280" cy="146" r="3.5" fill="#22c55e" />
                  <text x="270" y="185" fill="#38bdf8" fontSize="8.5" textAnchor="end">GPIO5/18 (SONAR)</text>
                  <circle cx="280" cy="181" r="3.5" fill="#38bdf8" />
                  <text x="270" y="290" fill="#ef4444" fontSize="8.5" textAnchor="end">VIN (+5.0V)</text>
                  <circle cx="280" cy="286" r="3.5" fill="#ef4444" />

                  <path d="M 280 146 L 340 146" fill="none" stroke="#22c55e" strokeWidth="2" />
                  <path d="M 280 181 L 310 181 L 310 265 L 340 265" fill="none" stroke="#38bdf8" strokeWidth="1.8" />
                  <path d="M 560 165 L 510 165" fill="none" stroke="#f59e0b" strokeWidth="2" />
                  <path d="M 640 220 L 640 286 L 280 286" fill="none" stroke="#ef4444" strokeWidth="1.8" />
                  <circle r="3" fill="#4ade80">
                    <animateMotion dur="1.0s" repeatCount="indefinite" path="M 280 146 L 340 146" />
                  </circle>
                  <circle r="3" fill="#fde047">
                    <animateMotion dur="1.3s" repeatCount="indefinite" path="M 560 165 L 510 165" />
                  </circle>

                  <g transform="translate(340, 110)">
                    <rect width="170" height="110" rx="6" fill="#0d1b33" stroke="#22c55e" strokeWidth="1.8" />
                    <text x="85" y="26" fill="#22c55e" fontSize="10" fontWeight="bold" textAnchor="middle">L298N 2WD DRIVER</text>
                    <text x="85" y="45" fill="#cbd5e1" fontSize="8" textAnchor="middle">Left &amp; Right TT Motors</text>
                    <text x="85" y="65" fill="#f59e0b" fontSize="8.5" textAnchor="middle">4x 1N4007 Flyback</text>
                    <text x="85" y="85" fill="#38bdf8" fontSize="8" textAnchor="middle">100nF Spark Chokes</text>
                  </g>

                  <g transform="translate(340, 240)">
                    <rect width="170" height="60" rx="6" fill="#0c1d3b" stroke="#38bdf8" strokeWidth="1.5" />
                    <text x="85" y="24" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle">HC-SR04 NOSE SONAR</text>
                    <text x="85" y="42" fill="#94a3b8" fontSize="7.5" textAnchor="middle">1kΩ/2kΩ Level Shift → GPIO18</text>
                  </g>

                  <g transform="translate(560, 110)">
                    <rect width="160" height="110" rx="6" fill="#1e1809" stroke="#f59e0b" strokeWidth="1.8" />
                    <text x="80" y="26" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">LM2596 BUCK REG</text>
                    <text x="80" y="45" fill="#cbd5e1" fontSize="8" textAnchor="middle">7.4V Li-ion to 5.0V</text>
                    <text x="80" y="65" fill="#38bdf8" fontSize="8" textAnchor="middle">2A Fast-Blow Fuse</text>
                    <text x="80" y="85" fill="#22c55e" fontSize="8" textAnchor="middle">92% Power Efficiency</text>
                  </g>
                </>
              )}
            </svg>
          )}
        </div>

        {/* =========================================================================
            DETAILED BILL OF MATERIALS (BOM) & COMPONENT SPECIFICATIONS TABLE
            ========================================================================= */}
        <div className="space-y-3 pt-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-800">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-white uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Full Hardware Bill of Materials (BOM) &amp; Design Rationale</span>
            </div>
            <span className="text-[11px] font-mono text-cyan-300 font-semibold">
              {bom.length} Essential Circuit Components
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#040814]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0b1329] text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Designator</th>
                  <th className="py-2.5 px-3">Component Name</th>
                  <th className="py-2.5 px-3">Value / Exact Rating</th>
                  <th className="py-2.5 px-3">Package / Footprint</th>
                  <th className="py-2.5 px-3">Hardware Connection Pins</th>
                  <th className="py-2.5 px-3">Electrical Design Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px] text-slate-300">
                {bom.map((item, idx) => (
                  <tr
                    key={item.designator}
                    className={idx % 2 === 0 ? "bg-[#040814]" : "bg-[#080e22]"}
                  >
                    <td className="py-2.5 px-3 font-bold text-cyan-300 whitespace-nowrap">
                      {item.designator}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white whitespace-nowrap">
                      {item.name}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-300 whitespace-nowrap">
                      {item.value}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {item.packageType}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-200 text-[10.5px]">
                      {item.connections}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[10.5px] leading-relaxed">
                      {item.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoboticsSchematicViewer;
