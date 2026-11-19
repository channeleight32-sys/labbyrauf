import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Cpu,
  Terminal,
  Play,
  RotateCcw,
  Sliders,
  Activity,
  Zap,
  Wifi,
  Radio,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  RefreshCw,
  Code2,
  ArrowRight,
  Gauge,
  Sparkles,
} from "lucide-react";

export type BoardType =
  | "ESP32_DEVKIT_V1"
  | "ESP32_WROOM"
  | "ESP32_S3"
  | "ESP32_C3"
  | "ARDUINO_UNO"
  | "STM32_BLUEPILL"
  | "RPI_PICO";

interface BoardSpec {
  id: BoardType;
  name: string;
  family: string;
  mcu: string;
  architecture: string;
  clockSpeed: string;
  flash: string;
  sram: string;
  voltage: string;
  digitalPins: number;
  analogPins: number;
  pwmChannels: number;
  hasWifi: boolean;
  hasBle: boolean;
  description: string;
}

const BOARDS_DATABASE: Record<BoardType, BoardSpec> = {
  ESP32_DEVKIT_V1: {
    id: "ESP32_DEVKIT_V1",
    name: "ESP32 DevKit V1 (30-Pin)",
    family: "Espressif Systems",
    mcu: "ESP-WROOM-32",
    architecture: "Xtensa Dual-Core 32-bit LX6",
    clockSpeed: "240 MHz",
    flash: "4 MB SPI",
    sram: "520 KB",
    voltage: "3.3V Logic (5V Vin)",
    digitalPins: 25,
    analogPins: 15,
    pwmChannels: 16,
    hasWifi: true,
    hasBle: true,
    description: "Industry-standard IoT workhorse with built-in 802.11b/g/n Wi-Fi and Bluetooth 4.2 BR/EDR & BLE.",
  },
  ESP32_WROOM: {
    id: "ESP32_WROOM",
    name: "ESP32-WROOM-32 (38-Pin)",
    family: "Espressif Systems",
    mcu: "ESP32-D0WDQ6",
    architecture: "Xtensa Dual-Core 32-bit LX6",
    clockSpeed: "240 MHz",
    flash: "8 MB SPI",
    sram: "520 KB",
    voltage: "3.3V Logic (5V Vin)",
    digitalPins: 32,
    analogPins: 18,
    pwmChannels: 16,
    hasWifi: true,
    hasBle: true,
    description: "Expanded 38-pin development board breaking out all GPIOs, dual DACs, and capacitive touch sensors.",
  },
  ESP32_S3: {
    id: "ESP32_S3",
    name: "ESP32-S3 DevKit",
    family: "Espressif Systems",
    mcu: "ESP32-S3-WROOM-1",
    architecture: "Xtensa Dual-Core 32-bit LX7 (Vector AI)",
    clockSpeed: "240 MHz",
    flash: "8 MB Octal SPI",
    sram: "512 KB SRAM + 8MB PSRAM",
    voltage: "3.3V Logic",
    digitalPins: 36,
    analogPins: 20,
    pwmChannels: 8,
    hasWifi: true,
    hasBle: true,
    description: "Advanced embedded AI processor with hardware vector instructions for TinyML and neural network acceleration.",
  },
  ESP32_C3: {
    id: "ESP32_C3",
    name: "ESP32-C3 RISC-V Mini",
    family: "Espressif Systems",
    mcu: "ESP32-C3FN4",
    architecture: "32-bit RISC-V Single-Core (RV32IMC)",
    clockSpeed: "160 MHz",
    flash: "4 MB Embedded",
    sram: "400 KB",
    voltage: "3.3V Logic",
    digitalPins: 15,
    analogPins: 6,
    pwmChannels: 6,
    hasWifi: true,
    hasBle: true,
    description: "Ultra-low-power, open-standard RISC-V architecture IoT microcontroller with hardware cryptographic accelerators.",
  },
  ARDUINO_UNO: {
    id: "ARDUINO_UNO",
    name: "Arduino Uno R3",
    family: "Arduino / Microchip",
    mcu: "ATmega328P",
    architecture: "8-bit AVR RISC",
    clockSpeed: "16 MHz",
    flash: "32 KB",
    sram: "2 KB",
    voltage: "5.0V Logic",
    digitalPins: 14,
    analogPins: 6,
    pwmChannels: 6,
    hasWifi: false,
    hasBle: false,
    description: "The classic foundational university engineering board featuring 5V robust I/O, UART bootloader, and standard shields.",
  },
  STM32_BLUEPILL: {
    id: "STM32_BLUEPILL",
    name: "STM32 BluePill (F103C8T6)",
    family: "STMicroelectronics",
    mcu: "STM32F103C8T6",
    architecture: "ARM 32-bit Cortex-M3",
    clockSpeed: "72 MHz",
    flash: "64 KB",
    sram: "20 KB",
    voltage: "3.3V Logic (5V Tolerant)",
    digitalPins: 32,
    analogPins: 10,
    pwmChannels: 12,
    hasWifi: false,
    hasBle: false,
    description: "Industrial ARM Cortex-M3 microcontroller widely utilized for robotics, CAN bus, and real-time control systems.",
  },
  RPI_PICO: {
    id: "RPI_PICO",
    name: "Raspberry Pi Pico (RP2040)",
    family: "Raspberry Pi Foundation",
    mcu: "RP2040",
    architecture: "Dual-Core ARM Cortex-M0+",
    clockSpeed: "133 MHz",
    flash: "2 MB QSPI",
    sram: "264 KB",
    voltage: "3.3V Logic",
    digitalPins: 26,
    analogPins: 3,
    pwmChannels: 16,
    hasWifi: false,
    hasBle: false,
    description: "High-performance dual Cortex-M0+ chip with unique Programmable I/O (PIO) state machines for custom hardware protocols.",
  },
};

interface CodePreset {
  id: string;
  name: string;
  desc: string;
  codeCpp: string;
  codePy: string;
}

const FIRMWARE_PRESETS: CodePreset[] = [
  {
    id: "blink",
    name: "1. GPIO Heartbeat Blink",
    desc: "Toggles on-board status LED (GPIO2) at 1 Hz with serial telemetry output.",
    codeCpp: `// ESP32 Heartbeat Blink & Serial Telemetry
#define LED_PIN 2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  Serial.println("[SYSTEM] Core 1 initialized. Timer ready.");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  Serial.println("[TICK] GPIO2 Status LED = HIGH (3.3V)");
  delay(500);

  digitalWrite(LED_PIN, LOW);
  Serial.println("[TICK] GPIO2 Status LED = LOW (0.0V)");
  delay(500);
}`,
    codePy: `# MicroPython GPIO Blink
from machine import Pin
import time

led = Pin(2, Pin.OUT)
print("[MICROPYTHON] REPL active. Starting 1Hz blink loop.")

while True:
    led.value(1)
    print("LED: ON (3.3V)")
    time.sleep_ms(500)
    led.value(0)
    print("LED: OFF (0.0V)")
    time.sleep_ms(500)`,
  },
  {
    id: "adc",
    name: "2. ADC 12-Bit Analog Sampling",
    desc: "Reads analog voltage on GPIO34 (0-3.3V) and converts raw 12-bit ADC counts to millivolts.",
    codeCpp: `// ESP32 12-bit ADC Analog Sampler
#define POT_PIN 34

void setup() {
  Serial.begin(115200);
  analogReadResolution(12); // 0 - 4095 counts
  pinMode(POT_PIN, INPUT);
  Serial.println("[ADC] Successive Approximation ADC initialized on GPIO34");
}

void loop() {
  int raw = analogRead(POT_PIN);
  float volts = (raw / 4095.0f) * 3.3f;
  Serial.printf("[ADC-CH6] Raw: %4d | Volts: %.3f V\\n", raw, volts);
  delay(200);
}`,
    codePy: `# MicroPython 12-bit ADC
from machine import ADC, Pin
import time

adc = ADC(Pin(34))
adc.width(ADC.WIDTH_12BIT)
adc.atten(ADC.ATTN_11DB) # 0 - 3.3V range

print("[ADC] Continuous analog sampling active on Pin 34")
while True:
    raw = adc.read()
    volts = (raw / 4095.0) * 3.3
    print("Raw: {} | Voltage: {:.3f} V".format(raw, volts))
    time.sleep_ms(200)`,
  },
  {
    id: "pwm",
    name: "3. High-Speed PWM Controller",
    desc: "Configures 16-channel LEDC hardware PWM generator at 5 kHz for motor/servo control.",
    codeCpp: `// ESP32 Hardware LEDC PWM Generator
#define PWM_PIN 4
#define PWM_CHANNEL 0
#define PWM_FREQ 5000
#define PWM_RES 8

void setup() {
  Serial.begin(115200);
  ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RES);
  ledcAttachPin(PWM_PIN, PWM_CHANNEL);
  Serial.println("[PWM] LEDC Channel 0 attached to GPIO4 @ 5kHz (8-bit resolution)");
}

void loop() {
  // Duty cycle ramp up & down
  for (int duty = 0; duty <= 255; duty += 15) {
    ledcWrite(PWM_CHANNEL, duty);
    Serial.printf("[PWM] Duty Cycle: %d / 255 (%.1f%%)\\n", duty, (duty/255.0)*100);
    delay(50);
  }
}`,
    codePy: `# MicroPython PWM Generator
from machine import Pin, PWM
import time

pwm = PWM(Pin(4), freq=5000, duty=512)
print("[PWM] 5kHz PWM active on Pin 4")

while True:
    for duty in range(0, 1024, 64):
        pwm.duty(duty)
        print("PWM Duty: {} / 1023".format(duty))
        time.sleep_ms(50)`,
  },
  {
    id: "wifi",
    name: "4. Wi-Fi Station & WebServer",
    desc: "Connects to 802.11b/g/n wireless network, binds DHCP IP, and starts embedded HTTP server.",
    codeCpp: `// ESP32 Wi-Fi HTTP Telemetry Server
#include <WiFi.h>

const char* ssid = "University_IoT_Lab";
const char* password = "Engineering2026";
WiFiServer server(80);

void setup() {
  Serial.begin(115200);
  Serial.print("[WIFI] Connecting to SSID: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  // Simulation: instantaneous connect
  Serial.println("[WIFI] Connected! Assigned IP: 192.168.1.142");
  server.begin();
  Serial.println("[HTTP] Web server listening on port 80.");
}

void loop() {
  WiFiClient client = server.available();
  if (client) {
    Serial.println("[HTTP] Client GET /telemetry HTTP/1.1 200 OK");
    client.println("HTTP/1.1 200 OK\\r\\nContent-Type: application/json\\r\\n\\r\\n{\\"status\\":\\"online\\",\\"temp\\":24.5}");
    client.stop();
  }
  delay(1000);
}`,
    codePy: `# MicroPython WLAN Station
import network
import socket
import time

wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect("University_IoT_Lab", "Engineering2026")

print("[WIFI] Station active. IP: 192.168.1.142")
s = socket.socket()
s.bind(('', 80))
s.listen(5)
print("[HTTP] Server listening on port 80")`,
  },
];

export const AdvancedEmbeddedLab: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<BoardType>("ESP32_DEVKIT_V1");
  const [activeCodeLang, setActiveCodeLang] = useState<"CPP" | "PYTHON">("CPP");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("blink");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    "[SYSTEM] Embedded Microcontroller Studio initialized.",
    "[BOOT] Ready to compile and run firmware.",
  ]);
  const [customInputCmd, setCustomInputCmd] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Live Peripheral Simulator States
  const [gpioStates, setGpioStates] = useState<Record<number, boolean>>({
    2: false,
    4: true,
    5: false,
    18: false,
    19: true,
    21: false,
    22: false,
    23: true,
  });
  const [adcInputVolts, setAdcInputVolts] = useState<number>(1.65);
  const [pwmDutyCycle, setPwmDutyCycle] = useState<number>(65);
  const [pwmFrequencyHz, setPwmFrequencyHz] = useState<number>(5000);
  const [wifiState, setWifiState] = useState<"DISCONNECTED" | "CONNECTING" | "CONNECTED">("CONNECTED");
  const [bleAdvertising, setBleAdvertising] = useState<boolean>(true);

  const activeSpec = BOARDS_DATABASE[selectedBoard];
  const activePreset = FIRMWARE_PRESETS.find((p) => p.id === selectedPresetId) || FIRMWARE_PRESETS[0];

  // Execution Interval
  const runIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isRunning) {
      if (runIntervalRef.current) clearInterval(runIntervalRef.current);
      return;
    }

    const interval = window.setInterval(() => {
      // Toggle LED on GPIO2 if blink
      if (selectedPresetId === "blink") {
        setGpioStates((prev) => {
          const nextState = !prev[2];
          setConsoleLogs((l) => [
            ...l.slice(-40),
            `[TICK] GPIO2 Status LED = ${nextState ? "HIGH (3.3V)" : "LOW (0.0V)"}`,
          ]);
          return { ...prev, 2: nextState };
        });
      } else if (selectedPresetId === "adc") {
        const counts = Math.round((adcInputVolts / 3.3) * 4095);
        setConsoleLogs((l) => [
          ...l.slice(-40),
          `[ADC-GPIO34] Raw: ${counts} counts | Voltage: ${adcInputVolts.toFixed(3)} V`,
        ]);
      } else if (selectedPresetId === "pwm") {
        setConsoleLogs((l) => [
          ...l.slice(-40),
          `[PWM-LEDC] Freq: ${pwmFrequencyHz}Hz | Duty: ${pwmDutyCycle}% | V_avg: ${(
            (pwmDutyCycle / 100) *
            3.3
          ).toFixed(2)}V`,
        ]);
      } else if (selectedPresetId === "wifi") {
        setConsoleLogs((l) => [
          ...l.slice(-40),
          `[WIFI-HTTP] 192.168.1.142:80 - Client Request received. 200 OK.`,
        ]);
      }
    }, 600);

    runIntervalRef.current = interval;

    return () => {
      if (runIntervalRef.current) clearInterval(runIntervalRef.current);
    };
  }, [isRunning, selectedPresetId, adcInputVolts, pwmDutyCycle, pwmFrequencyHz]);

  const handleStartCode = () => {
    setIsRunning(true);
    setConsoleLogs((l) => [
      ...l,
      `[FLASH] Uploading firmware to ${activeSpec.name} flash memory...`,
      `[BOOT] Xtensa LX6 Core 0 & Core 1 running at ${activeSpec.clockSpeed}.`,
      `[FIRMWARE] Setup() complete. Entering main loop.`,
    ]);
  };

  const handleStopCode = () => {
    setIsRunning(false);
    setConsoleLogs((l) => [...l, `[STOP] Microcontroller execution halted by user.`]);
  };

  const handleReset = () => {
    setIsRunning(false);
    setConsoleLogs([
      `[HARDWARE RESET] Board EN line asserted LOW.`,
      `[BOOT] Booting ${activeSpec.name} (${activeSpec.mcu})...`,
    ]);
  };

  const handleSendSerial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInputCmd.trim()) return;
    setConsoleLogs((l) => [
      ...l,
      `> ${customInputCmd}`,
      `[ECHO] Received ${customInputCmd.length} bytes: "${customInputCmd}"`,
    ]);
    setCustomInputCmd("");
  };

  const handleCopyCode = () => {
    const code = activeCodeLang === "CPP" ? activePreset.codeCpp : activePreset.codePy;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0c1938] via-[#091329] to-[#060b18] border border-cyan-500/30 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
                MODULE 1 · EMBEDDED SYSTEMS &amp; IOT LABORATORY
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LIVE MICROCONTROLLER EMULATOR
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Advanced ESP32 &amp; Embedded Microcontroller Studio
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Interactive university development workbench supporting real hardware behavior for the{" "}
              <strong>ESP32 DevKit V1, ESP32-WROOM, ESP32-S3, ESP32-C3 RISC-V, Arduino Uno R3, STM32 BluePill, and Raspberry Pi Pico RP2040</strong>.
              Features live dual-language C++/MicroPython editors, interactive GPIO pin matrix, 12-bit ADC, PWM, I2C/SPI bus activity, and Wi-Fi/Bluetooth stack simulation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Hardware EN Reset</span>
            </button>
            {!isRunning ? (
              <button
                type="button"
                onClick={handleStartCode}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950 hover:opacity-95 transition shadow-lg shadow-emerald-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Flash &amp; Run Firmware</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopCode}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-mono font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 transition cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Halt Execution</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Board Selector Tabs */}
      <div className="bg-[#0b1122] border border-slate-800 rounded-xl p-3 shadow-lg">
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2 px-1">
          <span className="font-bold text-cyan-300">SELECT TARGET HARDWARE SILICON ARCHITECTURE:</span>
          <span>{Object.keys(BOARDS_DATABASE).length} Production Development Boards Supported</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {(Object.keys(BOARDS_DATABASE) as BoardType[]).map((boardId) => {
            const b = BOARDS_DATABASE[boardId];
            const isSelected = selectedBoard === boardId;
            return (
              <button
                key={boardId}
                type="button"
                onClick={() => setSelectedBoard(boardId)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? "bg-cyan-500/15 border-cyan-400 text-white shadow-lg shadow-cyan-950/40"
                    : "bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-cyan-400">{b.mcu}</span>
                  {b.hasWifi && <Wifi className="w-3 h-3 text-cyan-300" />}
                </div>
                <div className="text-xs font-bold truncate text-white">{b.name.split("(")[0]}</div>
                <div className="text-[9px] font-mono text-slate-400 truncate">{b.architecture}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Board Hardware Specs & Pinout + Code Editor + Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Board Hardware Spec & Live GPIO Pinout */}
        <div className="space-y-6">
          {/* Hardware Silicon Specs Card */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Hardware Silicon Specification
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                {activeSpec.clockSpeed}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300">
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Architecture:</span>
                <span className="text-cyan-300 font-bold">{activeSpec.architecture}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Flash / SRAM:</span>
                <span className="text-white">
                  {activeSpec.flash} / {activeSpec.sram}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Operating Voltage:</span>
                <span className="text-emerald-400 font-bold">{activeSpec.voltage}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">I/O Capabilities:</span>
                <span className="text-amber-300">
                  {activeSpec.digitalPins} GPIOs · {activeSpec.analogPins} ADCs · {activeSpec.pwmChannels} PWM
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400">Wireless Radios:</span>
                <span className="text-white">
                  {activeSpec.hasWifi ? "802.11 b/g/n Wi-Fi + " : "No Wi-Fi / "}
                  {activeSpec.hasBle ? "BLE 5.0" : "No BLE"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans bg-slate-900/40 p-3 rounded-lg border border-slate-800">
              {activeSpec.description}
            </p>
          </div>

          {/* Interactive Live GPIO Pin Monitor */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Live GPIO Pin States &amp; Bus Monitor
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Click Pin to Toggle</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              {[
                { pin: 2, label: "GPIO2 (Built-in LED)", type: "OUT" },
                { pin: 4, label: "GPIO4 (PWM/TX)", type: "OUT" },
                { pin: 5, label: "GPIO5 (SPI CS)", type: "OUT" },
                { pin: 18, label: "GPIO18 (SCK)", type: "BUS" },
                { pin: 19, label: "GPIO19 (MISO)", type: "BUS" },
                { pin: 21, label: "GPIO21 (I2C SDA)", type: "BUS" },
                { pin: 22, label: "GPIO22 (I2C SCL)", type: "BUS" },
                { pin: 23, label: "GPIO23 (MOSI)", type: "BUS" },
              ].map((item) => {
                const isHi = gpioStates[item.pin] ?? false;
                return (
                  <button
                    key={item.pin}
                    type="button"
                    onClick={() =>
                      setGpioStates((prev) => ({
                        ...prev,
                        [item.pin]: !prev[item.pin],
                      }))
                    }
                    className={`p-2.5 rounded-lg border text-left transition cursor-pointer flex items-center justify-between ${
                      isHi
                        ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 shadow-sm"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[11px] text-white">{item.label}</div>
                      <div className="text-[9px] text-slate-400">{item.type}</div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isHi ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {isHi ? "HIGH (3.3V)" : "LOW (0V)"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Peripheral Controls (ADC & PWM) */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-xs font-mono font-bold text-white uppercase">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>Interactive Peripheral Emulation</span>
            </div>

            {/* ADC Potentiometer Slider */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>ADC Channel (GPIO34 Analog Input):</span>
                <span className="text-cyan-300 font-bold">
                  {adcInputVolts.toFixed(2)} V ({Math.round((adcInputVolts / 3.3) * 4095)} counts)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="3.3"
                step="0.05"
                value={adcInputVolts}
                onChange={(e) => setAdcInputVolts(parseFloat(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* PWM Duty Cycle Slider */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-slate-300">
                <span>LEDC PWM Duty Cycle (GPIO4):</span>
                <span className="text-amber-300 font-bold">
                  {pwmDutyCycle}% (V_avg: {((pwmDutyCycle / 100) * 3.3).toFixed(2)}V)
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pwmDutyCycle}
                onChange={(e) => setPwmDutyCycle(parseInt(e.target.value, 10))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Wireless Stack Status */}
            {activeSpec.hasWifi && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Wi-Fi Stack:</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  STA Connected (192.168.1.142)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Column: Dual-Language Code Editor + Live Serial Terminal */}
        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
          {/* Embedded Code Editor */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-white font-mono">
                  Embedded Firmware Source Code
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Language Switcher */}
                <div className="flex items-center bg-[#060a14] p-1 rounded-lg border border-slate-800 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setActiveCodeLang("CPP")}
                    className={`px-3 py-1 rounded transition cursor-pointer ${
                      activeCodeLang === "CPP"
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Arduino C++ (.ino)
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveCodeLang("PYTHON")}
                    className={`px-3 py-1 rounded transition cursor-pointer ${
                      activeCodeLang === "PYTHON"
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    MicroPython (.py)
                  </button>
                </div>

                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy Code"}</span>
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="text-slate-400 font-semibold">Load Firmware Example:</span>
              {FIRMWARE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`px-2.5 py-1 rounded border transition cursor-pointer ${
                    selectedPresetId === preset.id
                      ? "bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                  title={preset.desc}
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Code Box */}
            <div className="bg-[#03060f] border border-slate-800 rounded-lg p-4 font-mono text-xs max-h-[380px] overflow-y-auto text-slate-300 shadow-inner">
              <pre className="leading-relaxed">
                {activeCodeLang === "CPP" ? activePreset.codeCpp : activePreset.codePy}
              </pre>
            </div>
          </div>

          {/* Real-Time Serial Monitor & Console */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Hardware UART Serial Monitor (115200 Baud · 8N1)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRunning ? "bg-emerald-400 animate-pulse" : "bg-slate-600"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setConsoleLogs([])}
                  className="text-[10px] font-mono text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear Console
                </button>
              </div>
            </div>

            {/* Serial Output Screen */}
            <div className="bg-[#03060f] border border-slate-800 rounded-lg p-3 font-mono text-xs h-48 overflow-y-auto space-y-1 text-slate-300 shadow-inner">
              {consoleLogs.map((log, i) => (
                <div
                  key={i}
                  className={`leading-relaxed ${
                    log.startsWith(">")
                      ? "text-cyan-400 font-bold"
                      : log.includes("ERROR")
                      ? "text-rose-400 font-bold"
                      : log.includes("HIGH")
                      ? "text-emerald-300"
                      : "text-slate-300"
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>

            {/* Serial Send Bar */}
            <form onSubmit={handleSendSerial} className="flex gap-2 font-mono text-xs">
              <input
                type="text"
                placeholder="Send command to microcontroller (e.g. AT+PING, STATUS, RESET)..."
                value={customInputCmd}
                onChange={(e) => setCustomInputCmd(e.target.value)}
                className="flex-1 bg-[#060a14] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400 shadow-inner"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition cursor-pointer"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedEmbeddedLab;
