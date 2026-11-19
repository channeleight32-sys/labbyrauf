import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Compass,
  Radio,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Thermometer,
  Droplets,
  Home,
  Navigation,
  Copy,
  Check,
  Code2,
  BookOpen,
  ArrowRight,
  Sparkles,
  Gauge,
  Terminal,
  Volume2,
  Wind,
  Lightbulb,
  ShieldAlert,
} from "lucide-react";
import RoboticsSchematicViewer from "./RoboticsSchematicViewer";
import RoboticsStage3D from "./RoboticsStage3D";

export type RoboticsProjectId =
  | "RADAR"
  | "ULTRASONIC"
  | "SERVO"
  | "DC_MOTOR"
  | "SMART_CAR"
  | "SMART_HOME"
  | "TEMP_MONITOR"
  | "IRRIGATION";

interface ProjectMeta {
  id: RoboticsProjectId;
  name: string;
  tagline: string;
  category: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

const ROBOTICS_PROJECTS: ProjectMeta[] = [
  {
    id: "RADAR",
    name: "1. ESP32 Ultrasonic Radar Scanner",
    tagline: "Rotating SG90 servo motor sweeping HC-SR04 sensor with 180° polar PPI radar display.",
    category: "Sensors & Mechatronics",
    difficulty: "Intermediate",
  },
  {
    id: "ULTRASONIC",
    name: "2. Ultrasonic Distance & Hazard Warning",
    tagline: "HC-SR04 time-of-flight acoustic pulse ranging with 3-tier distance safety zones.",
    category: "Sensors & Measurement",
    difficulty: "Beginner",
  },
  {
    id: "SERVO",
    name: "3. SG90 Micro Servo PWM Precision Controller",
    tagline: "High-precision 50Hz PWM pulse-width angle control (1.0ms to 2.0ms, 0° to 180°).",
    category: "Actuators & Motion",
    difficulty: "Beginner",
  },
  {
    id: "DC_MOTOR",
    name: "4. L298N Dual H-Bridge DC Motor Driver",
    tagline: "Bi-directional PWM speed and torque control with back-EMF and coil current telemetry.",
    category: "Power Drivers & Motors",
    difficulty: "Intermediate",
  },
  {
    id: "SMART_CAR",
    name: "5. Autonomous Smart Robot Car (2WD)",
    tagline: "Differential drive obstacle avoidance mobile robot with 2D arena collision simulation.",
    category: "Autonomous Robotics",
    difficulty: "Advanced",
  },
  {
    id: "SMART_HOME",
    name: "6. Smart Home Automation Relay Controller",
    tagline: "4-channel optocoupled relay bank controlling lighting, fan, alarm and PIR motion triggers.",
    category: "IoT Automation",
    difficulty: "Intermediate",
  },
  {
    id: "TEMP_MONITOR",
    name: "7. DHT22 / LM35 Environmental Climate Monitor",
    tagline: "High-accuracy temperature and relative humidity sensing with dew point and heat index.",
    category: "Environmental Sensing",
    difficulty: "Beginner",
  },
  {
    id: "IRRIGATION",
    name: "8. Smart Automatic Agricultural Irrigation",
    tagline: "Capacitive soil moisture sensing with automated hysteresis solenoid valve control.",
    category: "Agri-Tech & IoT",
    difficulty: "Intermediate",
  },
];

export const RoboticsAutomationLab: React.FC = () => {
  const [activeProjectId, setActiveProjectId] = useState<RoboticsProjectId>("RADAR");
  const [projectViewMode, setProjectViewMode] = useState<"FLOWING_OUTPUT" | "SCHEMATIC" | "FIRMWARE">("FLOWING_OUTPUT");
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // --- PROJECT 1: RADAR STATE ---
  const [radarAngle, setRadarAngle] = useState<number>(90);
  const [radarDir, setRadarDir] = useState<number>(1);
  const [radarObstacles, setRadarObstacles] = useState<{ angle: number; distCm: number }[]>([
    { angle: 45, distCm: 28 },
    { angle: 120, distCm: 18 },
    { angle: 160, distCm: 35 },
  ]);
  const [radarTelemetryLogs, setRadarTelemetryLogs] = useState<string[]>([
    "$RADAR,ANG=88,DIST=180,TOF=10495us,STATUS=CLEAR",
    "$RADAR,ANG=90,DIST=180,TOF=10495us,STATUS=CLEAR",
  ]);

  // Radar sweep animation
  useEffect(() => {
    if (activeProjectId !== "RADAR" || !isRunning) return;
    const interval = window.setInterval(() => {
      setRadarAngle((prev) => {
        let next = prev + radarDir * 2;
        if (next >= 180) {
          next = 180;
          setRadarDir(-1);
        } else if (next <= 0) {
          next = 0;
          setRadarDir(1);
        }
        return next;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [activeProjectId, isRunning, radarDir]);

  // Current radar distance reading at current angle
  const currentRadarDistCm = useMemo(() => {
    const match = radarObstacles.find((o) => Math.abs(o.angle - radarAngle) <= 12);
    if (match) {
      return match.distCm + Math.round((Math.random() - 0.5) * 1.5);
    }
    return 180;
  }, [radarAngle, radarObstacles]);

  // Log streaming telemetry
  useEffect(() => {
    if (activeProjectId !== "RADAR" || !isRunning) return;
    const tof = Math.round((currentRadarDistCm * 2) / 0.0343);
    const status = currentRadarDistCm < 40 ? "LOCKED" : "CLEAR";
    const logStr = `$RADAR,ANG=${radarAngle},DIST=${currentRadarDistCm}cm,TOF=${tof}us,STATUS=${status}`;
    setRadarTelemetryLogs((prev) => [logStr, ...prev.slice(0, 12)]);
  }, [radarAngle, currentRadarDistCm, activeProjectId, isRunning]);

  // --- PROJECT 2: ULTRASONIC STATE ---
  const [ultrasonicDistCm, setUltrasonicDistCm] = useState<number>(24);

  // --- PROJECT 3: SERVO CONTROLLER STATE ---
  const [servoAngleDeg, setServoAngleDeg] = useState<number>(90);

  // --- PROJECT 4: DC MOTOR DRIVER STATE ---
  const [motorDirection, setMotorDirection] = useState<"CW" | "CCW" | "BRAKE">("CW");
  const [motorPwmDuty, setMotorPwmDuty] = useState<number>(75);

  // --- PROJECT 5: SMART CAR STATE ---
  const [carX, setCarX] = useState<number>(150);
  const [carY, setCarY] = useState<number>(100);
  const [carHeadingDeg, setCarHeadingDeg] = useState<number>(45);
  const [isAutonomousCar, setIsAutonomousCar] = useState<boolean>(true);
  const [carObstacleDetected, setCarObstacleDetected] = useState<boolean>(false);

  // Car animation loop
  useEffect(() => {
    if (activeProjectId !== "SMART_CAR" || !isRunning) return;
    const interval = window.setInterval(() => {
      if (isAutonomousCar) {
        setCarX((x) => {
          let nextX = x + Math.cos((carHeadingDeg * Math.PI) / 180) * 2;
          if (nextX > 270 || nextX < 30) {
            setCarHeadingDeg((h) => (h + 90) % 360);
            setCarObstacleDetected(true);
            setTimeout(() => setCarObstacleDetected(false), 300);
            return Math.max(35, Math.min(265, nextX));
          }
          return nextX;
        });
        setCarY((y) => {
          let nextY = y + Math.sin((carHeadingDeg * Math.PI) / 180) * 2;
          if (nextY > 170 || nextY < 30) {
            setCarHeadingDeg((h) => (h + 90) % 360);
            setCarObstacleDetected(true);
            setTimeout(() => setCarObstacleDetected(false), 300);
            return Math.max(35, Math.min(165, nextY));
          }
          return nextY;
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [activeProjectId, isRunning, isAutonomousCar, carHeadingDeg]);

  // --- PROJECT 6: SMART HOME STATE ---
  const [relayChannels, setRelayChannels] = useState<{ id: number; name: string; on: boolean; load: string }[]>([
    { id: 1, name: "Living Room Chandelier", on: true, load: "60W LED (220VAC)" },
    { id: 2, name: "Ceiling Exhaust Fan", on: true, load: "85W AC Motor" },
    { id: 3, name: "Fresh Water Booster Pump", on: false, load: "0.5 HP Inductive" },
    { id: 4, name: "Intruder Perimeter Siren", on: false, load: "12V Piezo Horn" },
  ]);
  const [pirMotionDetected, setPirMotionDetected] = useState<boolean>(false);

  // --- PROJECT 7: TEMPERATURE MONITOR STATE ---
  const [tempCelsius, setTempCelsius] = useState<number>(26.4);
  const [relativeHumidityPct, setRelativeHumidityPct] = useState<number>(55);

  // --- PROJECT 8: SMART IRRIGATION STATE ---
  const [soilMoisturePct, setSoilMoisturePct] = useState<number>(28);

  const toggleRelay = (id: number) => {
    setRelayChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, on: !ch.on } : ch))
    );
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Firmware snippets for all 8 projects
  const getProjectFirmware = (id: RoboticsProjectId): string => {
    switch (id) {
      case "RADAR":
        return `// ESP32 Ultrasonic Radar with SG90 Servo & HC-SR04
#include <ESP32Servo.h>

#define TRIG_PIN 5
#define ECHO_PIN 18
#define SERVO_PIN 4

Servo radarServo;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  radarServo.attach(SERVO_PIN);
}

void loop() {
  for (int angle = 0; angle <= 180; angle += 2) {
    radarServo.write(angle);
    delay(30);
    int dist = getDistance();
    Serial.printf("$RADAR,ANG=%d,DIST=%dcm\\n", angle, dist);
  }
  for (int angle = 180; angle >= 0; angle -= 2) {
    radarServo.write(angle);
    delay(30);
    int dist = getDistance();
    Serial.printf("$RADAR,ANG=%d,DIST=%dcm\\n", angle, dist);
  }
}

int getDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long dur = pulseIn(ECHO_PIN, HIGH, 30000);
  return dur > 0 ? (dur * 0.0343 / 2) : 180;
}`;

      case "ULTRASONIC":
        return `// HC-SR04 Ultrasonic Distance Sensor with Hazard Warning
#define TRIG_PIN 5
#define ECHO_PIN 18
#define BUZZER_PIN 19
#define LED_GREEN 21
#define LED_RED 22

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 35000);
  float distanceCm = duration * 0.0343 / 2.0;

  if (distanceCm < 15.0) {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, LOW);
    tone(BUZZER_PIN, 1000); // Continuous Alarm
  } else if (distanceCm < 40.0) {
    digitalWrite(LED_RED, HIGH);
    digitalWrite(LED_GREEN, HIGH);
    tone(BUZZER_PIN, 600, 100); // Intermittent Beep
  } else {
    digitalWrite(LED_RED, LOW);
    digitalWrite(LED_GREEN, HIGH);
    noTone(BUZZER_PIN);
  }
  delay(100);
}`;

      case "SERVO":
        return `// SG90 Micro Servo 50Hz PWM Angle Control
#include <ESP32Servo.h>

#define SERVO_PIN 4
Servo myservo;

void setup() {
  Serial.begin(115200);
  myservo.setPeriodHertz(50); // Standard 50Hz servo
  myservo.attach(SERVO_PIN, 1000, 2000); // 1.0ms to 2.0ms
}

void loop() {
  // Sweep from 0 to 180 degrees
  for (int pos = 0; pos <= 180; pos += 1) {
    myservo.write(pos);
    delay(15);
  }
  for (int pos = 180; pos >= 0; pos -= 1) {
    myservo.write(pos);
    delay(15);
  }
}`;

      case "DC_MOTOR":
        return `// L298N Dual H-Bridge Motor Driver with PWM Speed Control
#define ENA_PIN 25  // PWM Speed pin
#define IN1_PIN 26  // Direction Input 1
#define IN2_PIN 27  // Direction Input 2

void setup() {
  pinMode(IN1_PIN, OUTPUT);
  pinMode(IN2_PIN, OUTPUT);
  ledcAttach(ENA_PIN, 5000, 8); // 5 kHz PWM, 8-bit (0-255)
}

void setMotor(int speed, bool forward) {
  if (forward) {
    digitalWrite(IN1_PIN, HIGH);
    digitalWrite(IN2_PIN, LOW);
  } else {
    digitalWrite(IN1_PIN, LOW);
    digitalWrite(IN2_PIN, HIGH);
  }
  ledcWrite(ENA_PIN, constrain(speed, 0, 255));
}

void loop() {
  setMotor(200, true);  // Forward at ~78% speed
  delay(3000);
  setMotor(0, true);    // Coast
  delay(500);
  setMotor(200, false); // Reverse
  delay(3000);
}`;

      case "SMART_CAR":
        return `// 2WD Autonomous Obstacle Avoidance Smart Car
#include <ESP32Servo.h>

#define TRIG_PIN 5
#define ECHO_PIN 18
#define LEFT_MOTOR_FWD 25
#define LEFT_MOTOR_REV 26
#define RIGHT_MOTOR_FWD 27
#define RIGHT_MOTOR_REV 14

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LEFT_MOTOR_FWD, OUTPUT);
  pinMode(LEFT_MOTOR_REV, OUTPUT);
  pinMode(RIGHT_MOTOR_FWD, OUTPUT);
  pinMode(RIGHT_MOTOR_REV, OUTPUT);
}

void loop() {
  int dist = readUltrasonic();
  if (dist < 25) { // Obstacle ahead!
    stopCar();
    delay(200);
    reverseCar();
    delay(400);
    turnRight();
    delay(450);
  } else {
    driveForward();
  }
}

int readUltrasonic() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  return pulseIn(ECHO_PIN, HIGH, 30000) * 0.0343 / 2.0;
}

void driveForward() {
  digitalWrite(LEFT_MOTOR_FWD, HIGH);
  digitalWrite(LEFT_MOTOR_REV, LOW);
  digitalWrite(RIGHT_MOTOR_FWD, HIGH);
  digitalWrite(RIGHT_MOTOR_REV, LOW);
}

void turnRight() {
  digitalWrite(LEFT_MOTOR_FWD, HIGH);
  digitalWrite(LEFT_MOTOR_REV, LOW);
  digitalWrite(RIGHT_MOTOR_FWD, LOW);
  digitalWrite(RIGHT_MOTOR_REV, HIGH);
}

void reverseCar() {
  digitalWrite(LEFT_MOTOR_FWD, LOW);
  digitalWrite(LEFT_MOTOR_REV, HIGH);
  digitalWrite(RIGHT_MOTOR_FWD, LOW);
  digitalWrite(RIGHT_MOTOR_REV, HIGH);
}

void stopCar() {
  digitalWrite(LEFT_MOTOR_FWD, LOW);
  digitalWrite(LEFT_MOTOR_REV, LOW);
  digitalWrite(RIGHT_MOTOR_FWD, LOW);
  digitalWrite(RIGHT_MOTOR_REV, LOW);
}`;

      case "SMART_HOME":
        return `// 4-Channel Relay Controller with PIR Motion Sensor
#define RELAY1_PIN 19 // Living Room Chandelier
#define RELAY2_PIN 21 // Exhaust Fan
#define RELAY3_PIN 22 // Water Booster Pump
#define RELAY4_PIN 23 // Perimeter Alarm Siren
#define PIR_PIN    18 // PIR Motion Sensor Input

void setup() {
  Serial.begin(115200);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);
  pinMode(RELAY4_PIN, OUTPUT);
  pinMode(PIR_PIN, INPUT);

  // Relay boards are active LOW
  digitalWrite(RELAY1_PIN, HIGH);
  digitalWrite(RELAY2_PIN, HIGH);
  digitalWrite(RELAY3_PIN, HIGH);
  digitalWrite(RELAY4_PIN, HIGH);
}

void loop() {
  bool motion = digitalRead(PIR_PIN);
  if (motion) {
    digitalWrite(RELAY4_PIN, LOW); // Trigger Alarm
    digitalWrite(RELAY1_PIN, LOW); // Turn on lights
    Serial.println("PIR INTRUDER ALERT: RELAYS ENGAGED");
  }
  delay(100);
}`;

      case "TEMP_MONITOR":
        return `// DHT22 High-Precision Climate Monitor
#include "DHT.h"

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
}

void loop() {
  delay(2000);
  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (isnan(h) || isnan(t)) {
    Serial.println("DHT22 Sensor Read Error");
    return;
  }

  float hic = dht.computeHeatIndex(t, h, false);
  float dewPoint = t - ((100 - h) / 5);

  Serial.printf("Temp: %.1f C | Humidity: %.1f %% | DewPoint: %.1f C | HeatIndex: %.1f C\\n",
                t, h, dewPoint, hic);
}`;

      case "IRRIGATION":
        return `// Smart Agricultural Soil Moisture Irrigation with Hysteresis
#define SOIL_PIN 34    // Capacitive Analog Sensor
#define VALVE_PIN 23   // 12V Solenoid Valve via N-MOSFET (IRF540N)

const int DRY_THRESHOLD = 35;  // Turn ON below 35%
const int WET_THRESHOLD = 60;  // Turn OFF above 60%
bool isWatering = false;

void setup() {
  Serial.begin(115200);
  pinMode(VALVE_PIN, OUTPUT);
  digitalWrite(VALVE_PIN, LOW);
}

void loop() {
  int raw = analogRead(SOIL_PIN);
  int moisturePct = map(raw, 3200, 1400, 0, 100);
  moisturePct = constrain(moisturePct, 0, 100);

  // Hysteresis Controller
  if (!isWatering && moisturePct < DRY_THRESHOLD) {
    isWatering = true;
    digitalWrite(VALVE_PIN, HIGH); // Open Solenoid Valve
    Serial.println("VALVE ENGAGED: Commencing Drip Irrigation");
  } else if (isWatering && moisturePct >= WET_THRESHOLD) {
    isWatering = false;
    digitalWrite(VALVE_PIN, LOW);  // Close Solenoid Valve
    Serial.println("SOIL SATURATED: Valve Closed");
  }
  delay(1000);
}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0c1a36] via-[#091326] to-[#040814] border border-cyan-500/30 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
                MODULE 4 · ROBOTICS &amp; AUTOMATION MECHATRONICS LAB
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                8 PRODUCTION PROJECTS · REAL-TIME TELEMETRY &amp; SCHEMATICS
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Interactive Robotics &amp; Industrial Automation Laboratory
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Comprehensive mechatronics engineering testbench featuring dynamic actuators, acoustic radar ranging,
              differential drive autonomous robots, H-Bridge motor drivers, industrial optocoupled relay banks,
              and precision environmental sensors.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold transition shadow-lg cursor-pointer ${
                isRunning
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400"
                  : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/20"
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
              <span>{isRunning ? "Pause Simulation" : "Resume Simulation"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Selector Ribbon */}
      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 px-1">
          <span className="font-bold text-cyan-300">SELECT ROBOTICS &amp; MECHATRONICS PROJECT:</span>
          <span>8 Complete Curriculum Projects Available</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {ROBOTICS_PROJECTS.map((proj) => {
            const isSelected = activeProjectId === proj.id;
            return (
              <button
                key={proj.id}
                type="button"
                onClick={() => setActiveProjectId(proj.id)}
                className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                  isSelected
                    ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-950/40"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="text-[10px] font-mono text-cyan-400 font-bold">{proj.category.split(" ")[0]}</div>
                <div className="text-xs font-bold truncate text-white">{proj.name.split(". ")[1]}</div>
                <div className="text-[9px] font-mono text-slate-500">{proj.difficulty}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Way Project View Mode Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080d19] border border-cyan-500/30 rounded-xl p-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white uppercase px-2">
            {ROBOTICS_PROJECTS.find((p) => p.id === activeProjectId)?.name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setProjectViewMode("FLOWING_OUTPUT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
              projectViewMode === "FLOWING_OUTPUT"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>⚡ Live Flowing Output &amp; Telemetry</span>
          </button>
          <button
            type="button"
            onClick={() => setProjectViewMode("SCHEMATIC")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
              projectViewMode === "SCHEMATIC"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📐 Complete Circuit Schematic &amp; Detailed BOM</span>
          </button>
          <button
            type="button"
            onClick={() => setProjectViewMode("FIRMWARE")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
              projectViewMode === "FIRMWARE"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Code2 className="w-4 h-4" />
            <span>💻 C++ Firmware &amp; Pinout</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW MODE 1: COMPLETE CIRCUIT SCHEMATIC & DETAILED BOM                     */}
      {/* ========================================================================= */}
      {projectViewMode === "SCHEMATIC" && (
        <RoboticsSchematicViewer projectId={activeProjectId} />
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 2: C++ FIRMWARE CODE & WIRING PINOUT                            */}
      {/* ========================================================================= */}
      {projectViewMode === "FIRMWARE" && (
        <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                Production Embedded C++ Firmware · {ROBOTICS_PROJECTS.find((p) => p.id === activeProjectId)?.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleCopyCode(getProjectFirmware(activeProjectId))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300 hover:text-white hover:border-cyan-400 transition cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? "Code Copied!" : "Copy Firmware"}</span>
            </button>
          </div>

          <div className="bg-[#03060f] border border-slate-800 rounded-lg p-4 font-mono text-xs max-h-[500px] overflow-y-auto text-slate-300 shadow-inner">
            <pre className="leading-relaxed whitespace-pre-wrap">{getProjectFirmware(activeProjectId)}</pre>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: LIVE FLOWING OUTPUT & INTERACTIVE TELEMETRY                  */}
      {/* ========================================================================= */}
      {projectViewMode === "FLOWING_OUTPUT" && (
        <div className="space-y-6">
          <RoboticsStage3D
            projectId={activeProjectId}
            isRunning={isRunning}
            radarAngle={radarAngle}
            radarObstacles={radarObstacles}
            ultrasonicDistCm={ultrasonicDistCm}
            servoAngleDeg={servoAngleDeg}
            motorDirection={motorDirection}
            motorPwmDuty={motorPwmDuty}
            carX={carX}
            carY={carY}
            carHeadingDeg={carHeadingDeg}
            carObstacleDetected={carObstacleDetected}
            relayChannels={relayChannels}
            pirMotionDetected={pirMotionDetected}
            tempCelsius={tempCelsius}
            relativeHumidityPct={relativeHumidityPct}
            soilMoisturePct={soilMoisturePct}
            onToggleRelay={toggleRelay}
            onTogglePir={() => {
              setPirMotionDetected((v) => !v);
              if (!pirMotionDetected) {
                setRelayChannels((prev) =>
                  prev.map((c) => (c.id === 1 || c.id === 4 ? { ...c, on: true } : c))
                );
              }
            }}
          />

          {/* PROJECT 1: ESP32 ULTRASONIC RADAR SCANNER */}
          {activeProjectId === "RADAR" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Radar Screen Canvas Card */}
              <div className="lg:col-span-2 bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      180° Polar PPI Radar Screen (SG90 Servo + HC-SR04)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    BEARING: {radarAngle}° · RANGE: {currentRadarDistCm} cm
                  </span>
                </div>

                {/* Polar Radar SVG Display */}
                <div className="w-full h-80 bg-[#02050c] rounded-lg border border-cyan-500/20 relative overflow-hidden flex items-end justify-center pb-2 select-none shadow-2xl">
                  <svg className="w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet">
                    {/* Polar Range Rings */}
                    {[50, 100, 150, 200].map((r) => (
                      <path
                        key={r}
                        d={`M ${200 - r} 210 A ${r} ${r} 0 0 1 ${200 + r} 210`}
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="0.8"
                        strokeDasharray="3 3"
                        opacity="0.3"
                      />
                    ))}

                    {/* Range Labels */}
                    <text x="200" y="165" fill="#06b6d4" opacity="0.6" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      50 cm
                    </text>
                    <text x="200" y="115" fill="#06b6d4" opacity="0.6" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      100 cm
                    </text>
                    <text x="200" y="65" fill="#06b6d4" opacity="0.6" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      150 cm
                    </text>
                    <text x="200" y="15" fill="#06b6d4" opacity="0.6" fontSize="8" textAnchor="middle" fontFamily="monospace">
                      200 cm
                    </text>

                    {/* Radial Angle Rays */}
                    {[0, 30, 60, 90, 120, 150, 180].map((deg) => {
                      const rad = (deg * Math.PI) / 180;
                      const x = 200 - Math.cos(rad) * 200;
                      const y = 210 - Math.sin(rad) * 200;
                      return (
                        <g key={deg}>
                          <line x1="200" y1="210" x2={x} y2={y} stroke="#06b6d4" strokeWidth="0.6" opacity="0.25" />
                          <text
                            x={200 - Math.cos(rad) * 210}
                            y={210 - Math.sin(rad) * 210 + 3}
                            fill="#06b6d4"
                            opacity="0.7"
                            fontSize="8"
                            textAnchor="middle"
                            fontFamily="monospace"
                          >
                            {deg}°
                          </text>
                        </g>
                      );
                    })}

                    {/* Static Obstacles on Polar Display */}
                    {radarObstacles.map((obs, idx) => {
                      const rad = (obs.angle * Math.PI) / 180;
                      const rPix = (obs.distCm / 200) * 200;
                      const cx = 200 - Math.cos(rad) * rPix;
                      const cy = 210 - Math.sin(rad) * rPix;
                      const isTargetPinging = Math.abs(obs.angle - radarAngle) <= 12;

                      return (
                        <g key={idx}>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isTargetPinging ? "6" : "3.5"}
                            fill={isTargetPinging ? "#f43f5e" : "#06b6d4"}
                            opacity={isTargetPinging ? 1 : 0.6}
                          />
                          {isTargetPinging && (
                            <circle
                              cx={cx}
                              cy={cy}
                              r="12"
                              fill="none"
                              stroke="#f43f5e"
                              strokeWidth="1.5"
                            />
                          )}
                          <text x={cx} y={cy - 8} fill="#f43f5e" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                            T{idx + 1}: {obs.distCm}cm
                          </text>
                        </g>
                      );
                    })}

                    {/* Rotating Radar Sweep Vector Beam */}
                    {(() => {
                      const rad = (radarAngle * Math.PI) / 180;
                      const sweepX = 200 - Math.cos(rad) * 200;
                      const sweepY = 210 - Math.sin(rad) * 200;

                      return (
                        <g>
                          {/* Main sweep needle */}
                          <line x1="200" y1="210" x2={sweepX} y2={sweepY} stroke="#10b981" strokeWidth="2.5" />
                          {/* Center origin sensor head */}
                          <circle cx="200" cy="210" r="14" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                          <circle cx="194" cy="208" r="4" fill="#06b6d4" />
                          <circle cx="206" cy="208" r="4" fill="#06b6d4" />
                        </g>
                      );
                    })()}
                  </svg>
                </div>

                {/* Target Detection Table */}
                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  {radarObstacles.map((obs, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-slate-900/70 border border-slate-800 space-y-1">
                      <div className="text-slate-400 text-[10px]">TARGET #{idx + 1}</div>
                      <div className="text-white font-bold">
                        {obs.distCm} cm @ {obs.angle}°
                      </div>
                      <div className="text-[10px] text-emerald-400 font-semibold">
                        {Math.abs(obs.angle - radarAngle) <= 12 ? "TRACKING ACTIVE" : "IN MEMORY"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Streaming Serial Packet Telemetry Terminal */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Live 115200 Baud Serial Stream
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">STREAMING</span>
                  </div>

                  <div className="bg-[#03060f] border border-slate-800 rounded-lg p-3 font-mono text-xs max-h-72 overflow-y-auto space-y-1.5 text-slate-300 mt-2 shadow-inner">
                    {radarTelemetryLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className={`text-[11px] font-mono ${
                          log.includes("LOCKED") ? "text-rose-400 font-bold" : "text-emerald-300"
                        }`}
                      >
                        {log}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-2 text-xs font-mono">
                    <div className="text-slate-400 font-bold">Sweep Angular Velocity:</div>
                    <div className="text-cyan-300 font-bold">50 deg/sec (2° per 40ms step)</div>
                    <div className="text-slate-400 font-bold pt-1">Time of Flight:</div>
                    <div className="text-amber-300 font-bold">{Math.round((currentRadarDistCm * 2) / 0.0343)} µs</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 text-xs font-mono text-slate-400">
                  Echo Sound Velocity: v = 343 m/s at 20°C (delay = 58.3 µs/cm)
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 2: ULTRASONIC DISTANCE & HAZARD SENSOR */}
          {activeProjectId === "ULTRASONIC" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Interactive Ultrasonic Rangefinder (HC-SR04)
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-bold">{ultrasonicDistCm} cm</span>
                </div>

                {/* Animated Ultrasonic Acoustic Wave Graphic */}
                <div className="w-full h-44 bg-[#03060f] rounded-lg border border-slate-800 relative overflow-hidden flex items-center justify-between px-6 select-none shadow-inner">
                  {/* HC-SR04 Sensor Head */}
                  <div className="flex flex-col items-center z-10">
                    <div className="w-14 h-24 bg-[#0f766e] border border-cyan-400 rounded-lg flex flex-col justify-around items-center p-1.5 shadow-lg">
                      <div className="w-10 h-8 rounded-full bg-slate-300 border-2 border-slate-500 flex items-center justify-center text-[8px] font-bold text-slate-800">
                        TRIG
                      </div>
                      <div className="w-10 h-8 rounded-full bg-slate-300 border-2 border-slate-500 flex items-center justify-center text-[8px] font-bold text-slate-800">
                        ECHO
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 mt-1 font-bold">HC-SR04</span>
                  </div>

                  {/* Flowing Acoustic Waves */}
                  <div className="flex-1 h-full mx-4 relative flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                      {/* Outgoing 40kHz sonic waves (cyan) */}
                      {[25, 55, 85, 115, 145].map((x, idx) => (
                        <path
                          key={idx}
                          d={`M ${x} 20 A 40 40 0 0 1 ${x} 80`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="2"
                          opacity={Math.max(0.2, 1 - idx * 0.18)}
                        />
                      ))}
                      {/* Reflected echo waves (amber) */}
                      {[155, 125, 95, 65, 35].map((x, idx) => (
                        <path
                          key={idx}
                          d={`M ${x} 30 A 30 30 0 0 0 ${x} 70`}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.5"
                          opacity={Math.max(0.15, 0.9 - idx * 0.16)}
                          strokeDasharray="3 3"
                        />
                      ))}
                    </svg>

                    <div className="absolute text-center">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-white font-bold">
                        {ultrasonicDistCm} cm
                      </span>
                    </div>
                  </div>

                  {/* Obstacle Target Wall */}
                  <div className="z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-28 rounded-lg border-2 flex items-center justify-center transition-all ${
                        ultrasonicDistCm < 15
                          ? "bg-rose-500/30 border-rose-500 text-rose-300"
                          : ultrasonicDistCm < 40
                          ? "bg-amber-500/30 border-amber-500 text-amber-300"
                          : "bg-slate-700/50 border-slate-500 text-slate-300"
                      }`}
                    >
                      <span className="text-[9px] font-mono font-bold rotate-90">BARRIER</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Obstacle Distance Slider:</span>
                    <span className="text-cyan-300 font-bold">{ultrasonicDistCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="300"
                    step="1"
                    value={ultrasonicDistCm}
                    onChange={(e) => setUltrasonicDistCm(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">TIME OF FLIGHT:</span>
                    <div className="text-xl font-bold text-cyan-300 mt-1">
                      {Math.round((ultrasonicDistCm * 2) / 0.0343)} µs
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">SAFETY STATUS:</span>
                    <div
                      className={`text-xl font-bold mt-1 ${
                        ultrasonicDistCm < 15
                          ? "text-rose-400"
                          : ultrasonicDistCm < 40
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {ultrasonicDistCm < 15 ? "CRITICAL (COLLISION)" : ultrasonicDistCm < 40 ? "WARNING" : "CLEAR"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span className="text-slate-400 text-[10px]">PIEZO BUZZER:</span>
                    <div className="text-xl font-bold text-white mt-1">
                      {ultrasonicDistCm < 15 ? "1000 Hz SOLID" : ultrasonicDistCm < 40 ? "BEEP 4Hz" : "OFF"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Time of Flight Waveform Trace */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase flex items-center justify-between">
                    <span>Live Ultrasonic Oscilloscope Waveform</span>
                    <span className="text-cyan-400 text-[10px]">TIME BASE: 500 µs/div</span>
                  </div>

                  <div className="bg-[#03060f] p-4 rounded-lg border border-slate-800 mt-3 select-none">
                    <svg viewBox="0 0 320 120" className="w-full h-32">
                      {/* Grid lines */}
                      {[30, 60, 90].map((y) => (
                        <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                      ))}
                      {[40, 80, 120, 160, 200, 240, 280].map((x) => (
                        <line key={x} x1={x} y1="0" x2={x} y2="120" stroke="#1e293b" strokeDasharray="3 3" />
                      ))}

                      {/* TRIG Pulse (10 µs) */}
                      <text x="10" y="25" fill="#38bdf8" fontSize="8" fontWeight="bold">
                        TRIG (Pin 5)
                      </text>
                      <path d="M 10 45 L 30 45 L 30 20 L 40 20 L 40 45 L 310 45" stroke="#38bdf8" strokeWidth="2" fill="none" />

                      {/* Dynamic ECHO Pulse (width proportional to distance) */}
                      <text x="10" y="75" fill="#34d399" fontSize="8" fontWeight="bold">
                        ECHO (Pin 18)
                      </text>
                      {(() => {
                        const pulseWidth = Math.max(10, Math.min(240, (ultrasonicDistCm / 300) * 240));
                        return (
                          <path
                            d={`M 10 105 L 50 105 L 50 70 L ${50 + pulseWidth} 70 L ${50 + pulseWidth} 105 L 310 105`}
                            stroke="#34d399"
                            strokeWidth="2.5"
                            fill="none"
                          />
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="bg-[#03060f] p-3 rounded border border-slate-800 text-cyan-300">
                  Distance = [Time of Flight ({Math.round((ultrasonicDistCm * 2) / 0.0343)} µs) × 0.0343 cm/µs] ÷ 2 = {ultrasonicDistCm} cm
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 3: SG90 MICRO SERVO PWM PRECISION CONTROLLER */}
          {activeProjectId === "SERVO" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    SG90 9g Micro Servo PWM Angle Controller
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-bold">{servoAngleDeg}° Position</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Commanded Angle (0° to 180°):</span>
                    <span className="text-cyan-300 font-bold">{servoAngleDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="1"
                    value={servoAngleDeg}
                    onChange={(e) => setServoAngleDeg(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                {/* Visual Servo Horn Graphic */}
                <div className="w-full h-44 bg-[#03060f] rounded-lg border border-slate-800 flex items-center justify-center relative overflow-hidden shadow-inner">
                  {/* Protractor Arc */}
                  <svg className="absolute w-64 h-36 bottom-2" viewBox="0 0 200 100">
                    <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
                    <text x="20" y="98" fill="#64748b" fontSize="8" textAnchor="middle">0°</text>
                    <text x="100" y="15" fill="#64748b" fontSize="8" textAnchor="middle">90°</text>
                    <text x="180" y="98" fill="#64748b" fontSize="8" textAnchor="middle">180°</text>
                  </svg>

                  <div className="w-28 h-20 bg-[#1e293b] rounded-lg border-2 border-slate-600 flex items-center justify-center relative shadow-2xl">
                    <div
                      className="w-3 h-20 bg-cyan-400 rounded-full origin-bottom transition-transform duration-150 absolute bottom-10 shadow-lg"
                      style={{
                        transform: `rotate(${servoAngleDeg - 90}deg)`,
                      }}
                    />
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-500 z-10 shadow-md" />
                  </div>

                  <div className="absolute bottom-2 text-[10px] font-mono text-slate-400">
                    Pulse Width: {Math.round(1000 + (servoAngleDeg / 180) * 1000)} µs @ 50 Hz Repetition
                  </div>
                </div>
              </div>

              {/* 50Hz PWM Live Waveform Trace */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase flex items-center justify-between">
                    <span>Real-Time 50Hz PWM Waveform</span>
                    <span className="text-cyan-400 text-[10px]">PERIOD: 20 ms (50 Hz)</span>
                  </div>

                  <div className="bg-[#03060f] p-4 rounded-lg border border-slate-800 mt-3 select-none">
                    <svg viewBox="0 0 320 120" className="w-full h-32">
                      {/* Grid */}
                      <line x1="0" y1="60" x2="320" y2="60" stroke="#1e293b" />
                      <line x1="160" y1="0" x2="160" y2="120" stroke="#1e293b" />

                      {/* PWM High Pulse dynamic width */}
                      {(() => {
                        const pulseWidth = Math.max(12, Math.min(80, (1000 + (servoAngleDeg / 180) * 1000) / 25));
                        return (
                          <g>
                            <path
                              d={`M 20 85 L 60 85 L 60 35 L ${60 + pulseWidth} 35 L ${60 + pulseWidth} 85 L 200 85 L 200 35 L ${200 + pulseWidth} 35 L ${200 + pulseWidth} 85 L 300 85`}
                              stroke="#06b6d4"
                              strokeWidth="2.5"
                              fill="none"
                            />
                            <text x={60 + pulseWidth / 2} y="25" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
                              {Math.round(1000 + (servoAngleDeg / 180) * 1000)} µs
                            </text>
                            <text x="130" y="98" fill="#64748b" fontSize="8" textAnchor="middle">
                              ← 20 ms Period (50 Hz) →
                            </text>
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                <div className="space-y-2 text-slate-300 text-[11px]">
                  <div>• Commanded Angle: <strong className="text-cyan-300">{servoAngleDeg}°</strong></div>
                  <div>• High Pulse Duration: <strong className="text-amber-300">{Math.round(1000 + (servoAngleDeg / 180) * 1000)} µs</strong></div>
                  <div>• Motor Current Draw: <strong className="text-emerald-400">120 mA (Holding) / 650 mA (Stall)</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 4: L298N DUAL H-BRIDGE DC MOTOR DRIVER */}
          {activeProjectId === "DC_MOTOR" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    L298N Dual Full-Bridge Motor Controller
                  </span>
                  <span className="text-xs font-mono text-cyan-300 font-bold">{motorDirection} @ {motorPwmDuty}%</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <label className="text-slate-300 block mb-1">Direction Control:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["CW", "CCW", "BRAKE"] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setMotorDirection(dir)}
                        className={`py-2 rounded border font-bold cursor-pointer transition ${
                          motorDirection === dir
                            ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                            : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {dir === "CW" ? "Forward (CW)" : dir === "CCW" ? "Reverse (CCW)" : "Active Brake"}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between text-slate-300">
                      <span>Speed PWM Duty Cycle:</span>
                      <span className="text-amber-300 font-bold">{motorPwmDuty}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={motorPwmDuty}
                      onChange={(e) => setMotorPwmDuty(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Spinning Motor Armature Animation */}
                <div className="w-full h-40 bg-[#03060f] rounded-lg border border-slate-800 flex items-center justify-around px-6 select-none shadow-inner">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full border-4 border-slate-600 bg-[#0f172a] relative flex items-center justify-center shadow-xl">
                      {/* Rotor shaft cross */}
                      <div
                        className="w-16 h-1.5 bg-cyan-400 rounded-full absolute"
                        style={{
                          transform: motorDirection === "BRAKE" ? "none" : `rotate(${Date.now() / 5}deg)`,
                          transition: "transform 0.05s linear",
                        }}
                      />
                      <div
                        className="w-1.5 h-16 bg-cyan-400 rounded-full absolute"
                        style={{
                          transform: motorDirection === "BRAKE" ? "none" : `rotate(${Date.now() / 5}deg)`,
                          transition: "transform 0.05s linear",
                        }}
                      />
                      <div className="w-6 h-6 rounded-full bg-white border border-slate-400 z-10" />
                    </div>
                    <span className="text-[10px] font-mono text-cyan-300 mt-2 font-bold">12V DC MOTOR</span>
                  </div>

                  <div className="space-y-2 text-xs font-mono text-slate-300">
                    <div>SPEED: <strong className="text-cyan-300">{motorDirection === "BRAKE" ? 0 : Math.round((motorPwmDuty / 100) * 280)} RPM</strong></div>
                    <div>VOLTAGE: <strong className="text-white">{((motorPwmDuty / 100) * 12.0).toFixed(1)} V</strong></div>
                    <div>CURRENT: <strong className="text-emerald-400">{motorDirection === "BRAKE" ? "0.0 A" : `${((motorPwmDuty / 100) * 0.85).toFixed(2)} A`}</strong></div>
                  </div>
                </div>
              </div>

              {/* H-Bridge Conducting Flow Diagram */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase">
                    H-Bridge Transistor Conduction State
                  </div>

                  <div className="bg-[#03060f] p-4 rounded-lg border border-slate-800 mt-3 select-none">
                    <svg viewBox="0 0 280 140" className="w-full h-36">
                      {/* Power rails */}
                      <line x1="20" y1="15" x2="260" y2="15" stroke="#f87171" strokeWidth="2" />
                      <text x="20" y="10" fill="#f87171" fontSize="8" fontWeight="bold">+12V V_MOTOR</text>
                      <line x1="20" y1="125" x2="260" y2="125" stroke="#94a3b8" strokeWidth="2" />
                      <text x="20" y="135" fill="#94a3b8" fontSize="8">GND</text>

                      {/* Q1, Q2, Q3, Q4 Transistors */}
                      {/* Q1 Top Left */}
                      <rect x="50" y="25" width="40" height="25" rx="3" fill={motorDirection === "CW" ? "#0284c7" : "#1e293b"} stroke="#38bdf8" />
                      <text x="70" y="41" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">Q1</text>

                      {/* Q2 Top Right */}
                      <rect x="190" y="25" width="40" height="25" rx="3" fill={motorDirection === "CCW" ? "#0284c7" : "#1e293b"} stroke="#38bdf8" />
                      <text x="210" y="41" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">Q2</text>

                      {/* Motor M in Center */}
                      <circle cx="140" cy="70" r="22" fill="#0f172a" stroke="#10b981" strokeWidth="2" />
                      <text x="140" y="74" fill="#ffffff" fontSize="10" fontWeight="bold" textAnchor="middle">M</text>

                      {/* Q3 Bottom Left */}
                      <rect x="50" y="90" width="40" height="25" rx="3" fill={motorDirection === "CCW" ? "#0284c7" : "#1e293b"} stroke="#38bdf8" />
                      <text x="70" y="106" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">Q3</text>

                      {/* Q4 Bottom Right */}
                      <rect x="190" y="90" width="40" height="25" rx="3" fill={motorDirection === "CW" ? "#0284c7" : "#1e293b"} stroke="#38bdf8" />
                      <text x="210" y="106" fill="#ffffff" fontSize="8" textAnchor="middle" fontWeight="bold">Q4</text>

                      {/* Current flow paths */}
                      <line x1="70" y1="50" x2="70" y2="70" stroke={motorDirection === "CW" ? "#34d399" : "#475569"} strokeWidth="2" />
                      <line x1="70" y1="70" x2="118" y2="70" stroke={motorDirection === "CW" ? "#34d399" : "#475569"} strokeWidth="2" />
                      <line x1="162" y1="70" x2="210" y2="70" stroke={motorDirection === "CW" ? "#34d399" : "#475569"} strokeWidth="2" />
                      <line x1="210" y1="70" x2="210" y2="90" stroke={motorDirection === "CW" ? "#34d399" : "#475569"} strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>• Current Path: <strong className="text-cyan-300">{motorDirection === "CW" ? "Q1 → Motor → Q4 (Forward)" : motorDirection === "CCW" ? "Q2 → Motor → Q3 (Reverse)" : "Active Braking"}</strong></div>
                  <div>• Back-EMF Generated: <strong className="text-amber-300">{((motorPwmDuty / 100) * 10.8).toFixed(1)} V</strong></div>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 5: AUTONOMOUS SMART ROBOT CAR (2WD) */}
          {activeProjectId === "SMART_CAR" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    2D Robot Arena Simulation (Differential Drive Kinematics)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAutonomousCar((v) => !v)}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                      isAutonomousCar
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-400"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    {isAutonomousCar ? "AUTONOMOUS MODE: ON" : "MANUAL STOP"}
                  </button>
                </div>

                {/* 2D Arena Canvas */}
                <div className="w-full h-72 bg-[#02050c] rounded-lg border border-cyan-500/20 relative overflow-hidden select-none shadow-2xl">
                  <svg className="w-full h-full" viewBox="0 0 300 200">
                    {/* Arena boundaries */}
                    <rect x="5" y="5" width="290" height="190" fill="none" stroke="#1e293b" strokeWidth="2" />

                    {/* Sensor cone rays projecting from car */}
                    {(() => {
                      const rad = (carHeadingDeg * Math.PI) / 180;
                      const coneLen = 60;
                      const c1X = carX + Math.cos(rad - 0.4) * coneLen;
                      const c1Y = carY + Math.sin(rad - 0.4) * coneLen;
                      const c2X = carX + Math.cos(rad + 0.4) * coneLen;
                      const c2Y = carY + Math.sin(rad + 0.4) * coneLen;

                      return (
                        <polygon
                          points={`${carX},${carY} ${c1X},${c1Y} ${c2X},${c2Y}`}
                          fill={carObstacleDetected ? "#f43f5e" : "#06b6d4"}
                          opacity={carObstacleDetected ? "0.45" : "0.2"}
                        />
                      );
                    })()}

                    {/* Robot Car Body */}
                    <g transform={`translate(${carX}, ${carY}) rotate(${carHeadingDeg})`}>
                      {/* Wheels */}
                      <rect x="-16" y="-14" width="32" height="6" rx="2" fill="#334155" stroke="#64748b" />
                      <rect x="-16" y="8" width="32" height="6" rx="2" fill="#334155" stroke="#64748b" />
                      {/* Chassis */}
                      <rect x="-14" y="-10" width="28" height="20" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="2" />
                      {/* HC-SR04 on Front Bumper */}
                      <circle cx="12" cy="-4" r="2.5" fill="#38bdf8" />
                      <circle cx="12" cy="4" r="2.5" fill="#38bdf8" />
                    </g>
                  </svg>
                </div>
              </div>

              {/* Car Telemetry HUD */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase">
                    Navigation Telemetry
                  </div>

                  <div className="space-y-3 mt-3">
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px]">CURRENT POSITION:</span>
                      <div className="text-lg font-bold text-cyan-300 mt-1">
                        X: {Math.round(carX)} mm · Y: {Math.round(carY)} mm
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px]">COMPASS HEADING:</span>
                      <div className="text-lg font-bold text-amber-300 mt-1">
                        {Math.round(carHeadingDeg)}°
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px]">AVOIDANCE STATUS:</span>
                      <div className={`text-lg font-bold mt-1 ${carObstacleDetected ? "text-rose-400" : "text-emerald-400"}`}>
                        {carObstacleDetected ? "WALL DETECTED: TURNING" : "CRUISING (CLEAR)"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 text-[11px] leading-relaxed pt-3 border-t border-slate-800">
                  Differential Drive Kinematics: Left Motor = 180 RPM, Right Motor = 180 RPM. Reverse pulse triggered at &lt; 25cm.
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 6: SMART HOME RELAY CONTROLLER */}
          {activeProjectId === "SMART_HOME" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    4-Channel Optocoupled Relay Bank
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPirMotionDetected((v) => !v);
                      if (!pirMotionDetected) {
                        setRelayChannels((prev) =>
                          prev.map((c) => (c.id === 1 || c.id === 4 ? { ...c, on: true } : c))
                        );
                      }
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono font-bold border transition cursor-pointer ${
                      pirMotionDetected
                        ? "bg-rose-500/20 text-rose-300 border-rose-400"
                        : "bg-slate-900 text-slate-400 border-slate-700"
                    }`}
                  >
                    {pirMotionDetected ? "PIR MOTION: DETECTED" : "TRIGGER PIR MOTION"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  {relayChannels.map((ch) => (
                    <div
                      key={ch.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        ch.on
                          ? "bg-emerald-500/10 border-emerald-400/60 shadow-lg shadow-emerald-950/30"
                          : "bg-slate-900/60 border-slate-800 text-slate-400"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">CH{ch.id}</span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            ch.on ? "bg-emerald-400 shadow-md shadow-emerald-400" : "bg-slate-700"
                          }`}
                        />
                      </div>
                      <div className="text-xs font-bold text-cyan-300">{ch.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{ch.load}</div>

                      <button
                        type="button"
                        onClick={() => toggleRelay(ch.id)}
                        className={`w-full mt-3 py-1.5 rounded font-bold cursor-pointer transition ${
                          ch.on
                            ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
                            : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        {ch.on ? "TURN OFF" : "TURN ON"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Appliance Flowing Animations */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase flex items-center justify-between">
                    <span>Mains AC 220V Flow &amp; Appliance Status</span>
                    <span className="text-emerald-400 font-bold">50 Hz SINE</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {/* Chandelier Visual */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                      <Lightbulb
                        className={`w-8 h-8 ${
                          relayChannels[0].on ? "text-amber-300 fill-amber-300/40" : "text-slate-600"
                        }`}
                      />
                      <div>
                        <div className="text-white font-bold">Lighting</div>
                        <div className="text-[10px] text-slate-400">{relayChannels[0].on ? "60W Illuminating" : "Dark"}</div>
                      </div>
                    </div>

                    {/* Fan Visual */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                      <Wind
                        className={`w-8 h-8 ${
                          relayChannels[1].on ? "text-cyan-400 animate-spin" : "text-slate-600"
                        }`}
                      />
                      <div>
                        <div className="text-white font-bold">Exhaust Fan</div>
                        <div className="text-[10px] text-slate-400">{relayChannels[1].on ? "1400 RPM Flowing" : "Static"}</div>
                      </div>
                    </div>

                    {/* Water Pump */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                      <Droplets
                        className={`w-8 h-8 ${
                          relayChannels[2].on ? "text-blue-400" : "text-slate-600"
                        }`}
                      />
                      <div>
                        <div className="text-white font-bold">Booster Pump</div>
                        <div className="text-[10px] text-slate-400">{relayChannels[2].on ? "3.2 Bar Pumping" : "Idle"}</div>
                      </div>
                    </div>

                    {/* Alarm Siren */}
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center gap-3">
                      <ShieldAlert
                        className={`w-8 h-8 ${
                          relayChannels[3].on ? "text-rose-400" : "text-slate-600"
                        }`}
                      />
                      <div>
                        <div className="text-white font-bold">Perimeter Siren</div>
                        <div className="text-[10px] text-slate-400">{relayChannels[3].on ? "110 dB Sounding" : "Silent"}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[10px]">
                  Optocoupler EL817 provides 5,000 Vrms galvanic isolation between the low-voltage ESP32 and high-voltage AC mains.
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 7: TEMPERATURE MONITOR */}
          {activeProjectId === "TEMP_MONITOR" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    DHT22 Digital Temperature &amp; Humidity Sensor
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">CALIBRATED</span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Temperature:</span>
                    <span className="text-amber-300 font-bold">{tempCelsius.toFixed(1)} °C ({(tempCelsius * 1.8 + 32).toFixed(1)} °F)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="0.5"
                    value={tempCelsius}
                    onChange={(e) => setTempCelsius(parseFloat(e.target.value))}
                    className="w-full accent-amber-400 cursor-pointer"
                  />

                  <div className="flex justify-between text-slate-300 pt-2">
                    <span>Relative Humidity:</span>
                    <span className="text-cyan-300 font-bold">{relativeHumidityPct}% RH</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="95"
                    step="1"
                    value={relativeHumidityPct}
                    onChange={(e) => setRelativeHumidityPct(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>

              {/* Streaming 40-Bit Pulse Train & Indices */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase flex items-center justify-between">
                    <span>Psychrometric Indices</span>
                    <span className="text-cyan-300 font-bold">40-BIT DIGITAL PROTOCOL</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px]">DEW POINT:</span>
                      <div className="text-xl font-bold text-cyan-300 mt-1">
                        {(tempCelsius - (100 - relativeHumidityPct) / 5).toFixed(1)} °C
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                      <span className="text-slate-400 text-[10px]">HEAT INDEX:</span>
                      <div className="text-xl font-bold text-amber-300 mt-1">
                        {(tempCelsius + 0.33 * (relativeHumidityPct / 100 * 6.105 * Math.exp(17.27 * tempCelsius / (237.7 + tempCelsius))) - 4.0).toFixed(1)} °C
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#03060f] p-3 rounded border border-slate-800 text-slate-400 text-[10px] space-y-1">
                  <div>• Start Signal: Host pulls low for 18ms, releases high for 40µs</div>
                  <div>• Bit 0: 50µs low + 28µs high | Bit 1: 50µs low + 70µs high</div>
                </div>
              </div>
            </div>
          )}

          {/* PROJECT 8: SMART AGRICULTURAL IRRIGATION */}
          {activeProjectId === "IRRIGATION" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    Capacitive Soil Moisture &amp; Solenoid Valve Control
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      soilMoisturePct < 35 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {soilMoisturePct < 35 ? "SOIL DRY: WATERING" : "SOIL MOIST: STANDBY"}
                  </span>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Soil Moisture Level:</span>
                    <span className="text-cyan-300 font-bold">{soilMoisturePct}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    step="1"
                    value={soilMoisturePct}
                    onChange={(e) => setSoilMoisturePct(parseInt(e.target.value, 10))}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-white font-bold text-sm">12V Water Solenoid Valve</div>
                    <div className="text-[10px] text-slate-400">Trigger Threshold: &lt; 35% Moisture</div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded text-xs font-bold ${
                      soilMoisturePct < 35
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {soilMoisturePct < 35 ? "VALVE OPEN (WATERING)" : "VALVE CLOSED"}
                  </span>
                </div>
              </div>

              {/* Dynamic Droplet Flow Animation & Hysteresis */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3 font-mono text-xs flex flex-col justify-between">
                <div>
                  <div className="text-white font-bold pb-2 border-b border-slate-800 uppercase flex items-center justify-between">
                    <span>Active Drip Irrigation Output</span>
                    <span className={soilMoisturePct < 35 ? "text-cyan-400 font-bold" : "text-slate-500"}>
                      {soilMoisturePct < 35 ? "SPRAYING (FLOWING)" : "CLOSED"}
                    </span>
                  </div>

                  <div className="w-full h-36 bg-[#03060f] rounded-lg border border-slate-800 flex flex-col items-center justify-center p-4 mt-3 select-none">
                    {soilMoisturePct < 35 ? (
                      <div className="flex items-center gap-6">
                        <Droplets className="w-10 h-10 text-cyan-400" />
                        <div className="space-y-1">
                          <div className="text-white font-bold text-sm">Water Flow Rate: 2.4 L/min</div>
                          <div className="text-cyan-300 text-[11px]">Solenoid Actuator Coil: 12V / 350mA Engaged</div>
                          <div className="text-emerald-400 text-[10px]">Absorbing into Plant Substrate</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-slate-500">
                        Soil moisture is sufficient ({soilMoisturePct}% &gt; 35%). Valve closed to conserve water.
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed pt-2 border-t border-slate-800">
                  Hysteresis Controller: Turns ON below 35% moisture, remains ON until moisture exceeds 60% to prevent relay chatter.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoboticsAutomationLab;
