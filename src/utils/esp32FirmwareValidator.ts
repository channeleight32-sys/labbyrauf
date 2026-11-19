import { CircuitNode, CircuitWire } from "../components/CircuitLab";
import { COMP_SPECS } from "../data/logicSpecs";

export interface Esp32HardwareConfig {
  boardModel: "ESP32_WROOM" | "ESP32_S3" | "ESP32_C3" | "ARDUINO_NANO";
  cpuFreqMhz: 80 | 160 | 240;
  flashSizeMb: 4 | 8 | 16;
  flashMode: "QIO" | "DIO" | "QOUT";
  wifiMode: "OFF" | "STA" | "AP" | "AP_STA";
  wifiSSID: string;
  wifiPass: string;
  bluetoothMode: "OFF" | "BLE_SERVER" | "CLASSIC_SPP";
  baudRate: number;
  adcBits: 9 | 10 | 11 | 12;
  firmwareMode: "BLINK" | "PWM_SERVO" | "UART_ECHO" | "ADC_STREAM" | "CUSTOM";
  customCode: string;
  compilationStatus?: "SUCCESS" | "ERROR" | "IDLE";
  compilationError?: string | null;
  flashedTimestamp?: number;
  simulatedTick?: number;
}

export interface FirmwareValidationResult {
  isValid: boolean;
  errorMessage: string | null;
  activeOutputPins: number[];
  activeInputPins: number[];
  baudRate: number;
  warnings: string[];
  simulatedSerialLogs: string[];
}

export const ESP32_TEMPLATES: Record<string, string> = {
  ESP32_WROOM_BLINK: `// ESP32-WROOM-32D (Dual-Core Xtensa LX6 @ 240MHz)
// Real-world embedded C / Arduino firmware
#include <Arduino.h>

#define LED_PIN 2       // Built-in Blue Indicator on GPIO2
#define STATUS_PIN 4    // Logic Output on GPIO4
#define SENSOR_IN 34    // External Switch / Sensor on GPIO34 (Input-Only)

void setup() {
  Serial.begin(115200);
  Serial.println("[ESP32] Xtensa Dual-Core LX6 initialized.");
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(STATUS_PIN, OUTPUT);
  pinMode(SENSOR_IN, INPUT);
}

void loop() {
  int sensorState = digitalRead(SENSOR_IN);
  
  digitalWrite(LED_PIN, HIGH);
  digitalWrite(STATUS_PIN, sensorState ? HIGH : LOW);
  Serial.println("[ESP32] Heartbeat Tick - GPIO2: HIGH");
  delay(500);

  digitalWrite(LED_PIN, LOW);
  Serial.println("[ESP32] Heartbeat Tick - GPIO2: LOW");
  delay(500);
}`,

  ESP32_S3_AI: `// ESP32-S3-WROOM-1 (Dual-Core LX7 Vector AI & USB-OTG @ 240MHz)
#include <Arduino.h>

#define RGB_STATUS_PIN 38  // Built-in Addressable RGB / Status Pin
#define LOGIC_OUT_PIN 4    // Logic Gate Output Pin
#define ADC_INPUT_PIN 1    // Analog/Logic ADC Input on GPIO1

void setup() {
  Serial.begin(115200);
  Serial.println("[ESP32-S3] AI Vector Hardware Acceleration Engine Ready.");
  
  pinMode(RGB_STATUS_PIN, OUTPUT);
  pinMode(LOGIC_OUT_PIN, OUTPUT);
  pinMode(ADC_INPUT_PIN, INPUT);
}

void loop() {
  digitalWrite(RGB_STATUS_PIN, HIGH);
  digitalWrite(LOGIC_OUT_PIN, HIGH);
  Serial.println("[ESP32-S3] Vector Pipeline active - GPIO4: HIGH");
  delay(300);

  digitalWrite(RGB_STATUS_PIN, LOW);
  digitalWrite(LOGIC_OUT_PIN, LOW);
  Serial.println("[ESP32-S3] Vector Pipeline idle - GPIO4: LOW");
  delay(300);
}`,

  ESP32_C3_RISCV: `// ESP32-C3-Mini (32-bit RISC-V Single-Core @ 160MHz)
#include <Arduino.h>

#define STATUS_LED_PIN 8   // Built-in LED on GPIO8
#define BUS_OUT_PIN 3      // Peripheral Bus Control on GPIO3
#define STRAP_IN_PIN 2     // Boot Strap / Logic In on GPIO2

void setup() {
  Serial.begin(115200);
  Serial.println("[ESP32-C3] 32-bit RISC-V CPU initialized.");
  
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(BUS_OUT_PIN, OUTPUT);
  pinMode(STRAP_IN_PIN, INPUT);
}

void loop() {
  digitalWrite(STATUS_LED_PIN, HIGH);
  digitalWrite(BUS_OUT_PIN, HIGH);
  Serial.println("[ESP32-C3] RISC-V Core Running - GPIO3: HIGH");
  delay(400);

  digitalWrite(STATUS_LED_PIN, LOW);
  digitalWrite(BUS_OUT_PIN, LOW);
  Serial.println("[ESP32-C3] Low-Power Sleep Cycle - GPIO3: LOW");
  delay(400);
}`,
};

export const DEFAULT_ESP32_CONFIG: Esp32HardwareConfig = {
  boardModel: "ESP32_WROOM",
  cpuFreqMhz: 240,
  flashSizeMb: 4,
  flashMode: "QIO",
  wifiMode: "STA",
  wifiSSID: "UniLab_IoT_Network",
  wifiPass: "Engineering2026",
  bluetoothMode: "BLE_SERVER",
  baudRate: 115200,
  adcBits: 12,
  firmwareMode: "BLINK",
  customCode: ESP32_TEMPLATES.ESP32_WROOM_BLINK,
  compilationStatus: "IDLE",
  compilationError: null,
};

/**
 * Validates C / C++ firmware code integrity for ESP32 and checks connection alignment
 * against real hardware silicon constraints and circuit schematic wiring nets.
 */
export function validateEsp32Firmware(
  code: string,
  boardModel: string,
  connectedWires: CircuitWire[],
  nodes: CircuitNode[],
  espNodeId: number
): FirmwareValidationResult {
  const warnings: string[] = [];
  const activeOutputPins: number[] = [];
  const activeInputPins: number[] = [];
  let baudRate = 115200;

  if (!code || code.trim().length === 0) {
    return {
      isValid: false,
      errorMessage: "No C code provided. Write or load your embedded firmware code to begin verification.",
      activeOutputPins: [],
      activeInputPins: [],
      baudRate: 115200,
      warnings: [],
      simulatedSerialLogs: [],
    };
  }

  // Pre-strip /* ... */ block comments (preserving line numbers) and string/char literals
  const codeWithoutBlockComments = code.replace(/\/\*[\s\S]*?\*\//g, (m) =>
    m.replace(/[^\n]/g, " ")
  );
  const codeForAnalysis = codeWithoutBlockComments
    .replace(/\/\/.*$/gm, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''");

  // 1. Structure Check: must define setup() and loop() or app_main()
  const hasSetup = /\bvoid\s+setup\s*\(\s*\)/.test(codeForAnalysis);
  const hasLoop = /\bvoid\s+loop\s*\(\s*\)/.test(codeForAnalysis);
  const hasAppMain = /\bvoid\s+app_main\s*\(\s*(?:void)?\s*\)/.test(codeForAnalysis);

  if (!hasAppMain && (!hasSetup || !hasLoop)) {
    let missing = "";
    if (!hasSetup && !hasLoop) missing = "'void setup()' and 'void loop()'";
    else if (!hasSetup) missing = "'void setup()'";
    else missing = "'void loop()'";

    return {
      isValid: false,
      errorMessage: `Firmware Integrity Error: Missing required entry function ${missing}. Embedded C code must define setup() and loop() or app_main().`,
      activeOutputPins: [],
      activeInputPins: [],
      baudRate: 115200,
      warnings: [],
      simulatedSerialLogs: [],
    };
  }

  // 2. Delimiter Integrity (balanced braces and parentheses)
  let braceCount = 0;
  let parenCount = 0;
  const lines = codeForAnalysis.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i];

    for (const char of stripped) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
    }

    if (braceCount < 0) {
      return {
        isValid: false,
        errorMessage: `Syntax Error at line ${i + 1}: Unexpected closing brace '}' without matching opening brace.`,
        activeOutputPins: [],
        activeInputPins: [],
        baudRate: 115200,
        warnings: [],
        simulatedSerialLogs: [],
      };
    }
  }

  if (braceCount !== 0) {
    return {
      isValid: false,
      errorMessage: `Syntax Error: Unclosed block! ${braceCount} unclosed opening brace(s) '{' detected in C code.`,
      activeOutputPins: [],
      activeInputPins: [],
      baudRate: 115200,
      warnings: [],
      simulatedSerialLogs: [],
    };
  }

  if (parenCount !== 0) {
    return {
      isValid: false,
      errorMessage: `Syntax Error: Unclosed parenthesis! ${Math.abs(parenCount)} unmatched '(' or ')' in C code.`,
      activeOutputPins: [],
      activeInputPins: [],
      baudRate: 115200,
      warnings: [],
      simulatedSerialLogs: [],
    };
  }

  // 3. Extract Serial.begin(baudRate)
  const baudMatch = codeForAnalysis.match(/Serial\.begin\s*\(\s*(\d+)\s*\)/);
  if (baudMatch) {
    baudRate = parseInt(baudMatch[1], 10);
  }

  // 4. Pin Assignment & Silicon Constraint Verification
  // Extract pinMode(pin, OUTPUT)
  const outputPinRegex = /(?:pinMode\s*\(\s*(\w+)\s*,\s*OUTPUT\s*\)|gpio_set_direction\s*\(\s*(?:GPIO_NUM_)?(\w+)\s*,\s*GPIO_MODE_OUTPUT\s*\))/g;
  let match: RegExpExecArray | null;

  // Resolve symbolic definitions e.g. #define LED_PIN 2, const int LED_PIN = 2, constexpr uint8_t LED_PIN = 2
  const defineMap = new Map<string, number>();
  const defineRegex = /#define\s+(\w+)\s+(\d+)/g;
  while ((match = defineRegex.exec(codeForAnalysis)) !== null) {
    defineMap.set(match[1], parseInt(match[2], 10));
  }
  const constPinRegex = /\b(?:static\s+)?(?:const|constexpr)\s+(?:unsigned\s+)?(?:int|uint8_t|uint16_t|byte|gpio_num_t)\s+(\w+)\s*=\s*(?:GPIO_NUM_)?(\d+)\s*;/g;
  while ((match = constPinRegex.exec(codeForAnalysis)) !== null) {
    defineMap.set(match[1], parseInt(match[2], 10));
  }

  while ((match = outputPinRegex.exec(codeForAnalysis)) !== null) {
    const rawPin = match[1] || match[2];
    let pinNum = parseInt(rawPin, 10);
    if (isNaN(pinNum) && defineMap.has(rawPin)) {
      pinNum = defineMap.get(rawPin)!;
    }

    if (!isNaN(pinNum)) {
      if (!activeOutputPins.includes(pinNum)) {
        activeOutputPins.push(pinNum);
      }
    }
  }

  // Extract pinMode(pin, INPUT)
  const inputPinRegex = /(?:pinMode\s*\(\s*(\w+)\s*,\s*INPUT(?:_PULLUP|_PULLDOWN)?\s*\)|gpio_set_direction\s*\(\s*(?:GPIO_NUM_)?(\w+)\s*,\s*GPIO_MODE_INPUT\s*\))/g;
  while ((match = inputPinRegex.exec(codeForAnalysis)) !== null) {
    const rawPin = match[1] || match[2];
    let pinNum = parseInt(rawPin, 10);
    if (isNaN(pinNum) && defineMap.has(rawPin)) {
      pinNum = defineMap.get(rawPin)!;
    }

    if (!isNaN(pinNum)) {
      if (!activeInputPins.includes(pinNum)) {
        activeInputPins.push(pinNum);
      }
    }
  }

  // Check ESP32 Input-Only Pins (GPIO 34, 35, 36, 39 on ESP32-WROOM)
  const inputOnlyPins = [34, 35, 36, 39];
  for (const pin of activeOutputPins) {
    if (boardModel.includes("ESP32") && inputOnlyPins.includes(pin)) {
      return {
        isValid: false,
        errorMessage: `Hardware Silicon Violation: GPIO ${pin} is physically an INPUT-ONLY pin on the ESP32 silicon die (no push-pull driver or internal pull-up). It CANNOT be configured as OUTPUT in pinMode(${pin}, OUTPUT)!`,
        activeOutputPins,
        activeInputPins,
        baudRate,
        warnings,
        simulatedSerialLogs: [],
      };
    }
  }

  // 5. Check Schematic Pin Connection Alignment
  // Find all wires connected to this ESP32 node
  const espWires = connectedWires.filter(
    (w) => w.from.node === espNodeId || w.to.node === espNodeId
  );

  // Check if output pins driven in code have wires attached
  const specKey = boardModel === "ESP32_WROOM" ? "ESP32" : boardModel;
  const spec = COMP_SPECS[specKey] || COMP_SPECS.ESP32;
  if (spec && activeOutputPins.length > 0) {
    activeOutputPins.forEach((pinNum) => {
      // Find output port index that corresponds to this pin
      const portIdx = spec.outputs.findIndex((out) =>
        out.name.toUpperCase().includes(`GPIO${pinNum}`) ||
        out.name.toUpperCase().includes(`_${pinNum}`) ||
        (pinNum === 2 && out.name.includes("LED"))
      );

      if (portIdx !== -1) {
        const isWired = espWires.some(
          (w) =>
            (w.from.node === espNodeId && (w.from.dir || "out") === "out" && w.from.port === portIdx) ||
            (w.to.node === espNodeId && w.to.dir === "out" && w.to.port === portIdx)
        );
        if (!isWired && pinNum !== 2) {
          // If not built-in LED (GPIO2), advise student to wire output pin
          warnings.push(
            `GPIO ${pinNum} is actively driven in your C code, but Pin '${spec.outputs[portIdx].name}' is currently unwired on the schematic canvas.`
          );
        }
      }
    });
  }

  // Simulated Serial Logs generated by firmware execution
  const logs: string[] = [
    `[BOOT] ESP-IDF v5.1.2-dirty · CPU: ${boardModel}`,
    `[FLASH] 4MB SPI Flash detected (Mode: QIO, Freq: 80MHz)`,
    `[UART] Serial console initialized at ${baudRate} baud`,
    `[GPIO] Configured ${activeOutputPins.length} output pins: [${activeOutputPins.join(", ")}]`,
    `[GPIO] Configured ${activeInputPins.length} input pins: [${activeInputPins.join(", ")}]`,
    `[FIRMWARE] Setup() complete. Entering FreeRTOS main loop at tick 1000Hz.`,
    `[ESP32] Core 1: Heartbeat active · GPIO2 LED output = HIGH`,
    `[ESP32] Core 0: Wi-Fi stack initialized in Station mode.`,
  ];

  return {
    isValid: true,
    errorMessage: null,
    activeOutputPins,
    activeInputPins,
    baudRate,
    warnings,
    simulatedSerialLogs: logs,
  };
}
