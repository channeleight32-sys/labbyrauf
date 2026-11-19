export interface Esp32PinInfo {
  index: number; // 0..14 per side
  side: "LEFT" | "RIGHT";
  label: string;
  gpio: number | null;
  role: "POWER" | "GND" | "GPIO" | "ADC_IN" | "CTRL";
  capabilities: string[];
  description: string;
  caution?: string;
}

export interface Esp32WiringRow {
  fromPin: string;
  toComponent: string;
  toPin: string;
  wireColor: string;
  signalType: "POWER" | "GND" | "DIGITAL_OUT" | "DIGITAL_IN" | "PWM" | "ANALOG" | "TOUCH" | "COMM";
  notes: string;
}

export type Esp32SimType =
  | "MEET_ESP32"
  | "DUAL_LED"
  | "REED_SWITCH"
  | "WIFI_CONTROL"
  | "BUZZER_SIREN"
  | "TOUCH_PIANO"
  | "RGB_RING"
  | "MOOD_LAMP"
  | "LIGHT_SENSOR"
  | "ULTRASONIC_METER"
  | "DC_MOTOR"
  | "LASER_BARRIER"
  | "BLUETOOTH_COMM"
  | "ESPNOW_COMM"
  | "SMART_PARKING"
  | "WATER_PUMP"
  | "KEYPAD_LOCK"
  | "SOLAR_TRACKING"
  | "ULTRASONIC_RADAR"
  | "PICK_AND_PLACE";

export interface Esp32ExperimentDef {
  id: number;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  durationMin: number;
  category: string;
  summary: string;
  objectives: string[];
  components: string[];
  pinWiring: Esp32WiringRow[];
  explanation: string;
  starterCode: string;
  expectedResults: string[];
  troubleshooting: string[];
  simType: Esp32SimType;
  highlightedPins: string[];
}

export const ESP32_DEVKIT_V1_PINS: Esp32PinInfo[] = [
  // Left Header (Top to Bottom near antenna -> USB)
  { index: 0, side: "LEFT", label: "3V3", gpio: null, role: "POWER", capabilities: ["3.3V Regulated Output"], description: "Onboard AMS1117 3.3V regulator output (max ~600mA). Safe power rail for sensors." },
  { index: 1, side: "LEFT", label: "EN", gpio: null, role: "CTRL", capabilities: ["Chip Enable / Reset"], description: "Active-high enable pin; pull LOW momentarily to reset the ESP32 CPU." },
  { index: 2, side: "LEFT", label: "VP (G36)", gpio: 36, role: "ADC_IN", capabilities: ["ADC1_CH0", "Input Only"], description: "High-impedance analog input pin (12-bit ADC).", caution: "Input-only pin: no internal pull-up/down or output driver." },
  { index: 3, side: "LEFT", label: "VN (G39)", gpio: 39, role: "ADC_IN", capabilities: ["ADC1_CH3", "Input Only"], description: "12-bit analog input channel usable simultaneously with Wi-Fi.", caution: "Input-only pin." },
  { index: 4, side: "LEFT", label: "G34", gpio: 34, role: "ADC_IN", capabilities: ["ADC1_CH6", "Input Only"], description: "Clean 12-bit analog input (0–3.3V) ideal for LDR or moisture sensors.", caution: "Input-only pin: cannot drive LEDs." },
  { index: 5, side: "LEFT", label: "G35", gpio: 35, role: "ADC_IN", capabilities: ["ADC1_CH7", "Input Only"], description: "12-bit ADC1 channel 7 unaffected by Wi-Fi radio activity.", caution: "Input-only pin." },
  { index: 6, side: "LEFT", label: "G32", gpio: 32, role: "GPIO", capabilities: ["ADC1_CH4", "TOUCH9", "PWM"], description: "Full bidirectional GPIO with 12-bit ADC, LEDC PWM, and capacitive touch." },
  { index: 7, side: "LEFT", label: "G33", gpio: 33, role: "GPIO", capabilities: ["ADC1_CH5", "TOUCH8", "PWM"], description: "Bidirectional GPIO supporting analog reads, servo PWM, and capacitive touch." },
  { index: 8, side: "LEFT", label: "G25", gpio: 25, role: "GPIO", capabilities: ["DAC1", "ADC2_CH8", "PWM"], description: "True 8-bit analog DAC1 output + bidirectional digital/PWM I/O." },
  { index: 9, side: "LEFT", label: "G26", gpio: 26, role: "GPIO", capabilities: ["DAC2", "ADC2_CH9", "PWM"], description: "True 8-bit analog DAC2 output + bidirectional digital/PWM I/O." },
  { index: 10, side: "LEFT", label: "G27", gpio: 27, role: "GPIO", capabilities: ["TOUCH7", "ADC2_CH7", "PWM"], description: "General-purpose digital, PWM, and capacitive touch pin." },
  { index: 11, side: "LEFT", label: "G14", gpio: 14, role: "GPIO", capabilities: ["HSPI CLK", "TOUCH6", "PWM"], description: "HSPI clock pin & general PWM/digital output." },
  { index: 12, side: "LEFT", label: "G12", gpio: 12, role: "GPIO", capabilities: ["HSPI MISO", "TOUCH5", "Strapping"], description: "Digital I/O & touch pin.", caution: "Strapping pin: keep LOW during boot so flash runs at 3.3V." },
  { index: 13, side: "LEFT", label: "GND", gpio: null, role: "GND", capabilities: ["0V Reference"], description: "Common system ground rail." },
  { index: 14, side: "LEFT", label: "VIN", gpio: null, role: "POWER", capabilities: ["5V External Supply Input"], description: "Accepts 5V DC from USB or external supply into onboard 3.3V regulator." },

  // Right Header (Top to Bottom near antenna -> USB)
  { index: 0, side: "RIGHT", label: "G23", gpio: 23, role: "GPIO", capabilities: ["VSPI MOSI", "PWM"], description: "Fast digital I/O, WS2812B data output, or VSPI MOSI." },
  { index: 1, side: "RIGHT", label: "G22", gpio: 22, role: "GPIO", capabilities: ["I2C SCL", "PWM"], description: "Default hardware I2C Clock (SCL) and general-purpose PWM/GPIO." },
  { index: 2, side: "RIGHT", label: "TX0 (G1)", gpio: 1, role: "GPIO", capabilities: ["UART0 TX"], description: "Primary USB-Serial transmit line.", caution: "Shares lines with USB Serial Monitor." },
  { index: 3, side: "RIGHT", label: "RX0 (G3)", gpio: 3, role: "GPIO", capabilities: ["UART0 RX"], description: "Primary USB-Serial receive line.", caution: "Avoid pulling LOW during firmware upload." },
  { index: 4, side: "RIGHT", label: "G21", gpio: 21, role: "GPIO", capabilities: ["I2C SDA", "PWM"], description: "Default hardware I2C Data (SDA) and general-purpose PWM/GPIO." },
  { index: 5, side: "RIGHT", label: "G19", gpio: 19, role: "GPIO", capabilities: ["VSPI MISO", "PWM"], description: "VSPI MISO / clean general-purpose digital & PWM pin." },
  { index: 6, side: "RIGHT", label: "G18", gpio: 18, role: "GPIO", capabilities: ["VSPI CLK", "PWM"], description: "VSPI Clock / ultrasonic echo or motor driver control pin." },
  { index: 7, side: "RIGHT", label: "G5", gpio: 5, role: "GPIO", capabilities: ["VSPI CS", "PWM", "Strapping"], description: "Clean general-purpose output / trigger pin.", caution: "Outputs brief PWM pulse on boot." },
  { index: 8, side: "RIGHT", label: "G17", gpio: 17, role: "GPIO", capabilities: ["UART2 TX", "PWM"], description: "Hardware UART2 TX & PWM output." },
  { index: 9, side: "RIGHT", label: "G16", gpio: 16, role: "GPIO", capabilities: ["UART2 RX", "PWM"], description: "Hardware UART2 RX & PWM output." },
  { index: 10, side: "RIGHT", label: "G4", gpio: 4, role: "GPIO", capabilities: ["TOUCH0", "ADC2_CH0", "PWM"], description: "Capacitive Touch 0 & bidirectional PWM/GPIO pin." },
  { index: 11, side: "RIGHT", label: "G2", gpio: 2, role: "GPIO", capabilities: ["Onboard Blue LED", "TOUCH2", "PWM"], description: "Connected directly to onboard blue status LED on DevKit V1." },
  { index: 12, side: "RIGHT", label: "G15", gpio: 15, role: "GPIO", capabilities: ["TOUCH3", "PWM", "Strapping"], description: "Touch 3 & PWM output.", caution: "Must not be held LOW if boot debug logs are needed." },
  { index: 13, side: "RIGHT", label: "GND", gpio: null, role: "GND", capabilities: ["0V Reference"], description: "Common system ground rail." },
  { index: 14, side: "RIGHT", label: "GND", gpio: null, role: "GND", capabilities: ["0V Reference"], description: "Auxiliary system ground return." },
];

export const ESP32_20_EXPERIMENTS: Esp32ExperimentDef[] = [
  {
    id: 1,
    title: "Meet the ESP32",
    difficulty: "Beginner",
    durationMin: 10,
    category: "Architecture & Digital Output",
    summary: "Explore the ESP32 dual-core Tensilica LX6 board, 30-pin DevKit V1 headers, power rails, and blink the onboard GPIO 2 status LED.",
    objectives: [
      "Identify 3.3V logic rails, GND references, EN reset, and GPIO functions on the 3D ESP32 DevKit V1.",
      "Configure GPIO 2 as a push-pull digital output using pinMode().",
      "Verify deterministic Serial telemetry output alongside LED state toggling."
    ],
    components: ["ESP32 DevKit V1 (30-pin)", "USB Micro-B Data Cable", "Onboard Blue LED (GPIO 2)"],
    pinWiring: [
      { fromPin: "G2", toComponent: "Onboard Blue LED", toPin: "Anode (+)", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Internal series resistor built onto DevKit PCB" },
      { fromPin: "VIN", toComponent: "USB 5V Bus", toPin: "VBUS", wireColor: "Red", signalType: "POWER", notes: "Feeds AMS1117-3.3V LDO regulator" },
      { fromPin: "GND", toComponent: "Common Ground", toPin: "0V", wireColor: "Black", signalType: "GND", notes: "Zero-volt logic return" }
    ],
    explanation: "The ESP32 operates strictly at 3.3V CMOS logic levels. GPIO 2 drives the integrated blue indicator LED through an onboard current-limiting resistor. Calling digitalWrite(2, HIGH) sources 3.3V to illuminate the LED while digitalWrite(2, LOW) sinks it to 0V.",
    starterCode: `// Experiment 1: Meet the ESP32
const int ONBOARD_LED = 2;
const int BLINK_MS = 500;

void setup() {
  Serial.begin(115200);
  pinMode(ONBOARD_LED, OUTPUT);
  Serial.println("ESP32 DevKit V1 Ready - 240MHz Dual Core");
}

void loop() {
  digitalWrite(ONBOARD_LED, HIGH);
  Serial.println("GPIO 2 -> HIGH (LED ON)");
  delay(BLINK_MS);

  digitalWrite(ONBOARD_LED, LOW);
  Serial.println("GPIO 2 -> LOW (LED OFF)");
  delay(BLINK_MS);
}`,
    expectedResults: [
      "Onboard blue LED toggles cleanly at 1 Hz (500ms ON / 500ms OFF).",
      "Serial Monitor prints alternating HIGH/LOW state logs at 115200 baud."
    ],
    troubleshooting: [
      "If upload stalls on 'Connecting...', hold the BOOT button briefly until flashing begins.",
      "Never apply 5V directly to any GPIO pin—ESP32 GPIOs are 3.3V tolerant only."
    ],
    simType: "MEET_ESP32",
    highlightedPins: ["G2", "3V3", "VIN", "GND"]
  },
  {
    id: 2,
    title: "Flash Two LEDs",
    difficulty: "Beginner",
    durationMin: 12,
    category: "Digital Output",
    summary: "Control alternating red and cyan LEDs with 220 Ω current-limiting resistors across GPIO 16 and GPIO 17.",
    objectives: [
      "Wire dual external LEDs using proper 220 Ω current-limiting resistors.",
      "Drive complementary HIGH/LOW phases across two independent GPIO pins.",
      "Modify delay timing in the editor and observe instant cadence updates."
    ],
    components: ["ESP32 DevKit V1", "1x Red 5mm LED", "1x Cyan 5mm LED", "2x 220 Ω Resistors", "Breadboard & Jumper Wires"],
    pinWiring: [
      { fromPin: "G16", toComponent: "Red LED + 220Ω", toPin: "Anode (+)", wireColor: "Red", signalType: "DIGITAL_OUT", notes: "If ~ (3.3V - 2.0V)/220Ω = 5.9 mA" },
      { fromPin: "G17", toComponent: "Cyan LED + 220Ω", toPin: "Anode (+)", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Alternates opposite phase to GPIO 16" },
      { fromPin: "GND", toComponent: "LED Cathodes", toPin: "Cathode (-)", wireColor: "Black", signalType: "GND", notes: "Shared ground bus" }
    ],
    explanation: "Two GPIO pins switch in antiphase: when GPIO 16 sources 3.3V, GPIO 17 sinks to 0V, and vice versa. The 220 Ω resistors clamp LED forward current around 5–6 mA, well within the ESP32 40 mA max pin rating.",
    starterCode: `// Experiment 2: Flash Two LEDs Alternating
const int LED_A = 16;
const int LED_B = 17;
const int STEP_MS = 350;

void setup() {
  Serial.begin(115200);
  pinMode(LED_A, OUTPUT);
  pinMode(LED_B, OUTPUT);
}

void loop() {
  digitalWrite(LED_A, HIGH);
  digitalWrite(LED_B, LOW);
  Serial.println("Phase A: LED_16 ON | LED_17 OFF");
  delay(STEP_MS);

  digitalWrite(LED_A, LOW);
  digitalWrite(LED_B, HIGH);
  Serial.println("Phase B: LED_16 OFF | LED_17 ON");
  delay(STEP_MS);
}`,
    expectedResults: [
      "Red (G16) and Cyan (G17) LEDs alternate smoothly without overlap.",
      "Total GPIO current per pin remains ~6 mA (safe 3.3V operation)."
    ],
    troubleshooting: [
      "LED won't light: verify longer Anode leg points toward the GPIO resistor and flat Cathode side to GND.",
      "Dim glow: confirm resistor is 220 Ω – 330 Ω, not 10 kΩ."
    ],
    simType: "DUAL_LED",
    highlightedPins: ["G16", "G17", "GND"]
  },
  {
    id: 3,
    title: "Reed Switch",
    difficulty: "Beginner",
    durationMin: 15,
    category: "Digital Input & Sensors",
    summary: "Detect magnetic fields using a normally-open glass reed switch with internal INPUT_PULLUP debouncing on GPIO 14.",
    objectives: [
      "Configure INPUT_PULLUP to avoid floating digital input pins.",
      "Detect active-LOW magnetic closure and drive a status indicator LED on GPIO 2.",
      "Observe contact state transitions in real time on the Serial Monitor."
    ],
    components: ["ESP32 DevKit V1", "Glass Magnetic Reed Switch", "Neodymium Magnet", "220 Ω Resistor", "Status LED"],
    pinWiring: [
      { fromPin: "G14", toComponent: "Reed Switch", toPin: "Terminal A", wireColor: "Yellow", signalType: "DIGITAL_IN", notes: "Uses internal ~45kΩ pull-up resistor" },
      { fromPin: "GND", toComponent: "Reed Switch", toPin: "Terminal B", wireColor: "Black", signalType: "GND", notes: "Pulls G14 to 0V when magnet closes contacts" },
      { fromPin: "G2", toComponent: "Indicator LED", toPin: "Anode (+)", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Lights when magnet detected" }
    ],
    explanation: "With INPUT_PULLUP enabled, GPIO 14 rests at 3.3V (HIGH) when no magnet is near. Bringing a magnet within range bends the ferromagnetic reeds together, shorting GPIO 14 directly to GND (LOW) for clean, noise-immune magnetic sensing.",
    starterCode: `// Experiment 3: Magnetic Reed Switch Sensor
const int REED_PIN = 14;
const int ALERT_LED = 2;

void setup() {
  Serial.begin(115200);
  pinMode(REED_PIN, INPUT_PULLUP);
  pinMode(ALERT_LED, OUTPUT);
}

void loop() {
  int closed = (digitalRead(REED_PIN) == LOW);
  digitalWrite(ALERT_LED, closed ? HIGH : LOW);
  Serial.println(closed ? "MAGNET DETECTED -> Door Closed" : "NO MAGNET -> Door Open");
  delay(200);
}`,
    expectedResults: [
      "Bringing the virtual magnet near closes the reed switch and lights the status LED.",
      "Removing the magnet restores HIGH pull-up state cleanly without floating noise."
    ],
    troubleshooting: [
      "Random false triggers: confirm INPUT_PULLUP is set instead of plain INPUT.",
      "Remember logic is active-LOW: closed switch reads LOW (0)."
    ],
    simType: "REED_SWITCH",
    highlightedPins: ["G14", "G2", "GND"]
  },
  {
    id: 4,
    title: "Wi-Fi Control",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Wireless & IoT Web Server",
    summary: "Host an embedded HTTP web dashboard on ESP32 2.4 GHz Wi-Fi to toggle connected loads remotely.",
    objectives: [
      "Initialize ESP32 Wi-Fi station mode and inspect assigned local IPv4 address.",
      "Handle HTTP GET endpoints (/led/on, /led/off) to control GPIO 2 and GPIO 26.",
      "Test live browser-to-ESP32 REST commands and inspect RSSI signal strength."
    ],
    components: ["ESP32 DevKit V1 (Integrated 2.4GHz Wi-Fi)", "2x Status LEDs", "2x 220 Ω Resistors"],
    pinWiring: [
      { fromPin: "G2", toComponent: "Channel 1 Relay/LED", toPin: "Control IN", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Toggled via HTTP GET /ch1" },
      { fromPin: "G26", toComponent: "Channel 2 Load", toPin: "Control IN", wireColor: "Emerald", signalType: "DIGITAL_OUT", notes: "Toggled via HTTP GET /ch2" },
      { fromPin: "GND", toComponent: "Common Return", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Shared ground" }
    ],
    explanation: "The ESP32 integrates an 802.11 b/g/n MAC/baseband radio controlled by Core 0 while your Arduino loop executes on Core 1. A lightweight HTTP socket server parses URL routes and updates GPIO output latches in milliseconds.",
    starterCode: `// Experiment 4: Wi-Fi HTTP Control Server
#include <WiFi.h>
#include <WebServer.h>

const char* SSID = "IST_LAB_NET";
WebServer server(80);
const int CH1_PIN = 2;
const int CH2_PIN = 26;

void setup() {
  Serial.begin(115200);
  pinMode(CH1_PIN, OUTPUT);
  pinMode(CH2_PIN, OUTPUT);
  WiFi.begin(SSID, "ist_password");
  Serial.println("Connected IP: 192.168.4.1 | RSSI: -48 dBm");
  server.begin();
}`,
    expectedResults: [
      "Web toggle switches synchronize immediately with ESP32 GPIO outputs.",
      "HTTP requests log cleanly with client IP and RSSI telemetry in Serial Monitor."
    ],
    troubleshooting: [
      "ESP32 supports 2.4 GHz Wi-Fi only—5 GHz routers will not appear in scan.",
      "Note that ADC2 pins (like G26) work as digital outputs even when Wi-Fi is active; only analogRead on ADC2 conflicts."
    ],
    simType: "WIFI_CONTROL",
    highlightedPins: ["G2", "G26", "GND"]
  },
  {
    id: 5,
    title: "Buzzer Siren",
    difficulty: "Beginner",
    durationMin: 15,
    category: "PWM & Audio Synthesis",
    summary: "Generate swept police/alarm siren frequencies on a passive piezo buzzer using hardware LEDC PWM on GPIO 18.",
    objectives: [
      "Understand the difference between active DC buzzers and frequency-driven passive piezos.",
      "Sweep LEDC PWM tone frequency smoothly between 440 Hz and 1400 Hz.",
      "Listen to real synthesized Web Audio output synchronized with frequency readouts."
    ],
    components: ["ESP32 DevKit V1", "Passive Piezo Buzzer", "100 Ω Series Protection Resistor"],
    pinWiring: [
      { fromPin: "G18", toComponent: "Piezo Buzzer", toPin: "+ Positive", wireColor: "Amber", signalType: "PWM", notes: "LEDC Channel 0, 50% duty square wave" },
      { fromPin: "GND", toComponent: "Piezo Buzzer", toPin: "- Negative", wireColor: "Black", signalType: "GND", notes: "Ground return" }
    ],
    explanation: "The ESP32 LEDC peripheral features 16 independent hardware PWM channels capable of driving accurate audio frequencies without CPU bit-banging delays. Ramping frequency from 500 Hz up to 1300 Hz and back down creates a classic siren modulation.",
    starterCode: `// Experiment 5: Hardware PWM Buzzer Siren
const int BUZZER_PIN = 18;

void setup() {
  Serial.begin(115200);
  ledcAttach(BUZZER_PIN, 1000, 8);
}

void loop() {
  for (int f = 500; f <= 1300; f += 25) {
    ledcWriteTone(BUZZER_PIN, f);
    delay(15);
  }
  for (int f = 1300; f >= 500; f -= 25) {
    ledcWriteTone(BUZZER_PIN, f);
    delay(15);
  }
}`,
    expectedResults: [
      "Buzzer sweeps smoothly up and down across audible frequency band.",
      "PWM pitch indicator displays real-time carrier frequency in Hz."
    ],
    troubleshooting: [
      "No sound or weak click: confirm buzzer is PASSIVE (or test with square wave frequency 1–3 kHz)."
    ],
    simType: "BUZZER_SIREN",
    highlightedPins: ["G18", "GND"]
  },
  {
    id: 6,
    title: "Touch Piano",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Capacitive Touch Peripherals",
    summary: "Build a 5-key musical touch keyboard using ESP32 built-in capacitive touch sensors (T0–T4) and a piezo speaker.",
    objectives: [
      "Measure human body capacitance drop with touchRead() on GPIO 4, 15, 13, 12, 14.",
      "Calibrate baseline vs. touched threshold values reliably.",
      "Map distinct keys to musical scale frequencies (C5, D5, E5, F5, G5)."
    ],
    components: ["ESP32 DevKit V1", "5x Copper Foil Touch Pads", "Passive Piezo Speaker"],
    pinWiring: [
      { fromPin: "G4", toComponent: "Key C5 (T0)", toPin: "Pad 1", wireColor: "Cyan", signalType: "TOUCH", notes: "Baseline ~65 -> Touched <25" },
      { fromPin: "G15", toComponent: "Key D5 (T3)", toPin: "Pad 2", wireColor: "Emerald", signalType: "TOUCH", notes: "587 Hz note" },
      { fromPin: "G14", toComponent: "Key E5 (T6)", toPin: "Pad 3", wireColor: "Amber", signalType: "TOUCH", notes: "659 Hz note" },
      { fromPin: "G27", toComponent: "Key F5 (T7)", toPin: "Pad 4", wireColor: "Purple", signalType: "TOUCH", notes: "698 Hz note" },
      { fromPin: "G32", toComponent: "Key G5 (T9)", toPin: "Pad 5", wireColor: "Sky", signalType: "TOUCH", notes: "784 Hz note" },
      { fromPin: "G18", toComponent: "Piezo Speaker", toPin: "+", wireColor: "Yellow", signalType: "PWM", notes: "Audio note output" }
    ],
    explanation: "The ESP32 has 10 dedicated capacitive sensing GPIOs. Each pad charges and discharges via internal RC circuitry; when your finger approaches, added stray capacitance lowers the touchRead() count sharply below threshold.",
    starterCode: `// Experiment 6: Capacitive Touch Piano
const int TOUCH_PINS[] = {4, 15, 14, 27, 32};
const int NOTES[] = {523, 587, 659, 698, 784};
const int SPK_PIN = 18;
const int THRESH = 28;

void setup() {
  Serial.begin(115200);
  ledcAttach(SPK_PIN, 523, 8);
}

void loop() {
  for (int i = 0; i < 5; i++) {
    if (touchRead(TOUCH_PINS[i]) < THRESH) {
      ledcWriteTone(SPK_PIN, NOTES[i]);
      return;
    }
  }
  ledcWriteTone(SPK_PIN, 0);
}`,
    expectedResults: [
      "Pressing any virtual piano key drops capacitance reading below threshold and sounds the musical tone.",
      "Touch sensor values and active pitch log live in the Serial Monitor."
    ],
    troubleshooting: [
      "Avoid putting high-value pull-up resistors on capacitive touch pads—leave them floating with short wire leads."
    ],
    simType: "TOUCH_PIANO",
    highlightedPins: ["G4", "G15", "G14", "G27", "G32", "G18"]
  },
  {
    id: 7,
    title: "RGB LED Ring",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Addressable LEDs (WS2812B)",
    summary: "Drive a 12-pixel WS2812B NeoPixel ring over a single high-speed 800 kHz data line on GPIO 23.",
    objectives: [
      "Understand single-wire NRZ timing protocol used by WS2812B smart LEDs.",
      "Program chasing comet, rainbow spectrum, and strobe color animations.",
      "Calculate worst-case 5V current draw (~60 mA per full-white pixel)."
    ],
    components: ["ESP32 DevKit V1", "12-Bit WS2812B RGB Ring", "330 Ω Data Series Resistor", "External 5V Supply"],
    pinWiring: [
      { fromPin: "G23", toComponent: "WS2812B Ring", toPin: "DIN", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "800 kHz RMT hardware waveform" },
      { fromPin: "VIN", toComponent: "WS2812B Ring", toPin: "5V VCC", wireColor: "Red", signalType: "POWER", notes: "Up to 720 mA at full white" },
      { fromPin: "GND", toComponent: "WS2812B Ring", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Common data & power reference" }
    ],
    explanation: "Each WS2812B pixel consumes 24 bits (G-R-B) of timing-critical data and passes remaining bits downstream. The ESP32 RMT peripheral generates hardware-accurate sub-microsecond pulses effortlessly.",
    starterCode: `// Experiment 7: 12-LED WS2812B Ring Animation
#include <Adafruit_NeoPixel.h>
#define RING_PIN 23
#define NUM_PIXELS 12

Adafruit_NeoPixel ring(NUM_PIXELS, RING_PIN, NEO_GRB + NEO_KHZ800);

void setup() {
  ring.begin();
  ring.setBrightness(180);
}

void loop() {
  for (int i = 0; i < NUM_PIXELS; i++) {
    ring.clear();
    ring.setPixelColor(i, ring.Color(0, 212, 255));
    ring.show();
    delay(80);
  }
}`,
    expectedResults: [
      "12-LED ring animates smoothly in Chase, Rainbow, or Solid color modes.",
      "Power monitor displays real-time mA draw based on brightness & active LEDs."
    ],
    troubleshooting: [
      "Flickering first LED: add a 330 Ω resistor on DIN and a 470 µF electrolytic cap across 5V and GND."
    ],
    simType: "RGB_RING",
    highlightedPins: ["G23", "VIN", "GND"]
  },
  {
    id: 8,
    title: "Mood Lamp",
    difficulty: "Beginner",
    durationMin: 15,
    category: "Analog PWM Color Mixing",
    summary: "Mix smooth 24-bit RGB ambient lighting using three synchronized 5 kHz LEDC PWM channels.",
    objectives: [
      "Drive Common-Cathode RGB LED channels via GPIO 25 (R), GPIO 26 (G), and GPIO 27 (B).",
      "Adjust R, G, B duty cycles independently or run smooth HSV hue cycling.",
      "Verify balanced forward current across red, green, and blue emitter dies."
    ],
    components: ["ESP32 DevKit V1", "Common-Cathode RGB LED", "3x 220 Ω Resistors", "Diffuser Dome"],
    pinWiring: [
      { fromPin: "G25", toComponent: "RGB LED", toPin: "Red Anode", wireColor: "Red", signalType: "PWM", notes: "LEDC Ch0 · 5kHz PWM" },
      { fromPin: "G26", toComponent: "RGB LED", toPin: "Green Anode", wireColor: "Emerald", signalType: "PWM", notes: "LEDC Ch1 · 5kHz PWM" },
      { fromPin: "G27", toComponent: "RGB LED", toPin: "Blue Anode", wireColor: "Cyan", signalType: "PWM", notes: "LEDC Ch2 · 5kHz PWM" },
      { fromPin: "GND", toComponent: "RGB LED", toPin: "Common Cathode", wireColor: "Black", signalType: "GND", notes: "Common negative return" }
    ],
    explanation: "By switching each color channel at 5 kHz (far above human flicker fusion) with 8-bit duty cycle resolution (0–255), additive color mixing synthesizes over 16 million smooth ambient hues.",
    starterCode: `// Experiment 8: PWM RGB Ambient Mood Lamp
const int PIN_R = 25, PIN_G = 26, PIN_B = 27;

void setup() {
  ledcAttach(PIN_R, 5000, 8);
  ledcAttach(PIN_G, 5000, 8);
  ledcAttach(PIN_B, 5000, 8);
}

void setRGB(int r, int g, int b) {
  ledcWrite(PIN_R, r);
  ledcWrite(PIN_G, g);
  ledcWrite(PIN_B, b);
}`,
    expectedResults: [
      "Virtual RGB diffuser reflects exact mixed Red, Green, and Blue PWM duty ratios.",
      "Auto-cycle mode fades seamlessly around the color wheel."
    ],
    troubleshooting: [
      "If colors appear inverted, check whether your physical module is Common-Anode (tie common to 3.3V and invert 255-val) vs Common-Cathode."
    ],
    simType: "MOOD_LAMP",
    highlightedPins: ["G25", "G26", "G27", "GND"]
  },
  {
    id: 9,
    title: "Light Sensor",
    difficulty: "Beginner",
    durationMin: 15,
    category: "12-Bit ADC & Voltage Dividers",
    summary: "Read ambient illuminance (lux) with a photoresistor (LDR) voltage divider on ADC1 GPIO 34 and auto-trigger night lighting.",
    objectives: [
      "Wire an LDR + 10 kΩ pull-down resistor as an analog voltage divider.",
      "Convert 12-bit ADC raw counts (0–4095) into voltage (0–3.3V) and darkness state.",
      "Implement automatic night-light hysteresis threshold switching on GPIO 2."
    ],
    components: ["ESP32 DevKit V1", "GL5528 Photoresistor (LDR)", "10 kΩ Resistor", "Night Light LED"],
    pinWiring: [
      { fromPin: "3V3", toComponent: "LDR Top Leg", toPin: "Lead 1", wireColor: "Red", signalType: "POWER", notes: "3.3V clean reference" },
      { fromPin: "G34", toComponent: "LDR / 10kΩ Junction", toPin: "V_out", wireColor: "Yellow", signalType: "ANALOG", notes: "ADC1_CH6 (Wi-Fi compatible)" },
      { fromPin: "GND", toComponent: "10 kΩ Pull-down", toPin: "Bottom Lead", wireColor: "Black", signalType: "GND", notes: "Divider ground leg" },
      { fromPin: "G2", toComponent: "Night LED", toPin: "+", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Turns ON in low light" }
    ],
    explanation: "As light decreases, the LDR resistance climbs from ~1 kΩ toward 100 kΩ+, pulling the divider output on GPIO 34 toward 0V. Sampling ADC1 GPIO 34 maps 0–3.3V across 4096 discrete digital steps.",
    starterCode: `// Experiment 9: 12-Bit ADC Light Sensor (LDR)
const int LDR_PIN = 34;
const int LAMP_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LAMP_PIN, OUTPUT);
}

void loop() {
  int raw = analogRead(LDR_PIN); // 0 - 4095
  float volts = (raw / 4095.0) * 3.3;
  digitalWrite(LAMP_PIN, raw < 1400 ? HIGH : LOW);
  Serial.printf("ADC=%d | V=%.2fV\\n", raw, volts);
  delay(250);
}`,
    expectedResults: [
      "Adjusting ambient lux updates 12-bit ADC count and divider voltage accurately.",
      "Night lamp automatically activates below threshold illumination."
    ],
    troubleshooting: [
      "Reading stuck at 0 or 4095: verify you used ADC1 (GPIO 32–39) if Wi-Fi is active, and check resistor ground connection."
    ],
    simType: "LIGHT_SENSOR",
    highlightedPins: ["3V3", "G34", "G2", "GND"]
  },
  {
    id: 10,
    title: "Ultrasonic Distance Meter",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Time-of-Flight & Precision Timing",
    summary: "Measure non-contact object range (2 cm – 400 cm) using an HC-SR04 ultrasonic transceiver with ECHO voltage divider.",
    objectives: [
      "Generate a 10 µs TRIG pulse on GPIO 5 to launch a 40 kHz acoustic burst.",
      "Measure ECHO pulse width in microseconds using pulseIn() on GPIO 18.",
      "Compute distance d = (duration × 0.0343 cm/µs) / 2 and protect ESP32 from 5V ECHO."
    ],
    components: ["ESP32 DevKit V1", "HC-SR04 Ultrasonic Sensor", "1 kΩ + 2 kΩ Divider Resistors"],
    pinWiring: [
      { fromPin: "VIN", toComponent: "HC-SR04", toPin: "VCC", wireColor: "Red", signalType: "POWER", notes: "Sensor requires 5V on VIN" },
      { fromPin: "G5", toComponent: "HC-SR04", toPin: "TRIG", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "10 µs trigger pulse" },
      { fromPin: "G18", toComponent: "HC-SR04 (via 1k/2k)", toPin: "ECHO", wireColor: "Amber", signalType: "DIGITAL_IN", notes: "Step 5V echo down to 3.3V safely" },
      { fromPin: "GND", toComponent: "HC-SR04", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Common ground" }
    ],
    explanation: "The HC-SR04 emits eight 40 kHz ultrasonic pulses when triggered. The ECHO pin stays HIGH for the exact round-trip acoustic flight time. Dividing total time by 2 and multiplying by the speed of sound (343 m/s) yields range in centimeters.",
    starterCode: `// Experiment 10: HC-SR04 Ultrasonic Distance Meter
const int TRIG_PIN = 5;
const int ECHO_PIN = 18;

void setup() {
  Serial.begin(115200);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
}

void loop() {
  digitalWrite(TRIG_PIN, LOW); delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long us = pulseIn(ECHO_PIN, HIGH, 30000);
  float cm = (us * 0.0343) / 2.0;
  Serial.printf("Flight: %ld us | Distance: %.1f cm\\n", us, cm);
  delay(150);
}`,
    expectedResults: [
      "Moving the target barrier updates echo pulse duration (µs) and computed cm distance.",
      "Proximity alert indicator activates when distance falls below 25 cm."
    ],
    troubleshooting: [
      "Always divide ECHO down from 5V to 3.3V with a 1kΩ / 2kΩ voltage divider to protect GPIO 18."
    ],
    simType: "ULTRASONIC_METER",
    highlightedPins: ["VIN", "G5", "G18", "GND"]
  },
  {
    id: 11,
    title: "DC Motor Control",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Power Drivers & H-Bridge",
    summary: "Control speed and bi-directional rotation of a brushed DC motor using an L298N H-Bridge and ESP32 PWM.",
    objectives: [
      "Control motor rotation direction (CW / CCW / Brake) via IN1 (GPIO 26) and IN2 (GPIO 27).",
      "Modulate motor armature speed smoothly using PWM on ENA (GPIO 14).",
      "Isolate high motor current supply from the 3.3V ESP32 logic rail."
    ],
    components: ["ESP32 DevKit V1", "L298N Dual H-Bridge Module", "6V DC Geared Motor", "External Battery Pack"],
    pinWiring: [
      { fromPin: "G14", toComponent: "L298N", toPin: "ENA (PWM)", wireColor: "Cyan", signalType: "PWM", notes: "Speed duty 0–255" },
      { fromPin: "G26", toComponent: "L298N", toPin: "IN1", wireColor: "Emerald", signalType: "DIGITAL_OUT", notes: "Direction A" },
      { fromPin: "G27", toComponent: "L298N", toPin: "IN2", wireColor: "Amber", signalType: "DIGITAL_OUT", notes: "Direction B" },
      { fromPin: "GND", toComponent: "L298N", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Must share common ground with motor supply" }
    ],
    explanation: "Microcontroller pins cannot source inductive motor currents directly. The L298N H-Bridge uses four power switches: setting IN1=HIGH, IN2=LOW drives current forward, reversing them flips polarity, and pulsing ENA scales average motor voltage.",
    starterCode: `// Experiment 11: L298N H-Bridge DC Motor Control
const int ENA = 14, IN1 = 26, IN2 = 27;

void setup() {
  pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
  ledcAttach(ENA, 2000, 8);
}

void driveMotor(bool forward, int speed) {
  digitalWrite(IN1, forward ? HIGH : LOW);
  digitalWrite(IN2, forward ? LOW : HIGH);
  ledcWrite(ENA, speed);
}`,
    expectedResults: [
      "Motor rotor RPM scales proportionally with PWM duty cycle (0–100%).",
      "Direction selector cleanly flips CW/CCW spin and electronic braking."
    ],
    troubleshooting: [
      "Motor hums but fails to spin: raise PWM duty above ~35% to overcome static rotor friction, and ensure common GND."
    ],
    simType: "DC_MOTOR",
    highlightedPins: ["G14", "G26", "G27", "GND"]
  },
  {
    id: 12,
    title: "Laser Barrier",
    difficulty: "Intermediate",
    durationMin: 18,
    category: "Optical Security & Interrupts",
    summary: "Construct an optical laser tripwire alarm that triggers buzzer and alarm LED immediately when the beam breaks.",
    objectives: [
      "Align a 650 nm laser diode emitter (GPIO 19) onto a photodiode/LDR receiver (GPIO 34).",
      "Establish dark vs. illuminated beam threshold detection.",
      "Latch alarm buzzer (GPIO 18) and reset cleanly via pushbutton."
    ],
    components: ["ESP32 DevKit V1", "650nm Laser Diode Module", "LDR Sensor + 10kΩ", "Piezo Buzzer"],
    pinWiring: [
      { fromPin: "G19", toComponent: "650nm Laser Diode", toPin: "SIG (+)", wireColor: "Red", signalType: "DIGITAL_OUT", notes: "Enables optical beam" },
      { fromPin: "G34", toComponent: "Receiver Divider", toPin: "V_rx", wireColor: "Yellow", signalType: "ANALOG", notes: "High when laser hits sensor; drops when obstructed" },
      { fromPin: "G18", toComponent: "Alarm Buzzer", toPin: "+", wireColor: "Amber", signalType: "PWM", notes: "Triggered on beam break" },
      { fromPin: "GND", toComponent: "Common Ground", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Shared 0V reference" }
    ],
    explanation: "When the 650 nm red laser illuminates the receiver LDR continuously, GPIO 34 reads high illuminance (>3000 ADC). Any object crossing the optical path drops received intensity abruptly below threshold, tripping the ESP32 alarm latch.",
    starterCode: `// Experiment 12: Optical Laser Security Barrier
const int LASER_PIN = 19, RX_PIN = 34, ALARM_PIN = 18;
bool armed = true, tripped = false;

void loop() {
  int luxAdc = analogRead(RX_PIN);
  if (armed && luxAdc < 1600) {
    tripped = true;
    ledcWriteTone(ALARM_PIN, 1800);
    Serial.println("ALARM: LASER BEAM INTERRUPTED!");
  }
}`,
    expectedResults: [
      "Interrupting the virtual laser beam drops receiver ADC reading and latches alarm siren.",
      "Pressing Reset clears alarm once beam path is restored."
    ],
    troubleshooting: [
      "False triggers under sunlight: shield the LDR inside an opaque black tube aligned toward the laser."
    ],
    simType: "LASER_BARRIER",
    highlightedPins: ["G19", "G34", "G18", "GND"]
  },
  {
    id: 13,
    title: "Bluetooth Communication",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "BLE & Wireless Serial",
    summary: "Establish bidirectional Bluetooth Low Energy (BLE) / Classic SPP command messaging between smartphone console and ESP32.",
    objectives: [
      "Initialize ESP32 Bluetooth stack and advertise connectable device name.",
      "Send text telemetry packets wirelessly and parse remote ON/OFF commands.",
      "Control onboard GPIO 2 and RGB indicators over Bluetooth link."
    ],
    components: ["ESP32 DevKit V1 (Dual-Mode BT + BLE Radio)", "Status LED (GPIO 2)"],
    pinWiring: [
      { fromPin: "G2", toComponent: "Bluetooth Status LED", toPin: "+", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Solid ON when paired; toggles via BT commands" },
      { fromPin: "3V3", toComponent: "Internal RF Baseband", toPin: "VDD", wireColor: "Red", signalType: "POWER", notes: "Peak TX bursts up to ~180 mA" }
    ],
    explanation: "ESP32 includes integrated Bluetooth v4.2 BR/EDR and BLE transceivers sharing the 2.4 GHz PCB trace antenna. Serial-over-Bluetooth lets mobile consoles transmit ASCII strings directly to the ESP32 UART/GPIO task.",
    starterCode: `// Experiment 13: Bluetooth Serial Command Bridge
#include "BluetoothSerial.h"
BluetoothSerial SerialBT;
const int LED_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  SerialBT.begin("IST_ESP32_LAB");
  Serial.println("BLE/BT Advertising: IST_ESP32_LAB");
}

void loop() {
  if (SerialBT.available()) {
    String cmd = SerialBT.readStringUntil('\\n');
    digitalWrite(LED_PIN, cmd == "ON" ? HIGH : LOW);
    SerialBT.println("ACK: " + cmd);
  }
}`,
    expectedResults: [
      "Sending 'ON', 'OFF', or 'PING' via the BLE terminal receives immediate ESP32 ACK responses.",
      "GPIO 2 state responds immediately to wireless Bluetooth commands."
    ],
    troubleshooting: [
      "Drops out during TX: use a quality USB cable capable of supplying 500 mA RF TX current spikes."
    ],
    simType: "BLUETOOTH_COMM",
    highlightedPins: ["G2", "3V3", "GND"]
  },
  {
    id: 14,
    title: "ESP-NOW Communication",
    difficulty: "Advanced",
    durationMin: 25,
    category: "Peer-to-Peer 2.4GHz Mesh",
    summary: "Transmit ultra-low-latency (<5 ms) encrypted peer-to-peer packets between two ESP32 nodes without a Wi-Fi router.",
    objectives: [
      "Configure ESP-NOW MAC addressing between Transmitter Node A and Receiver Node B.",
      "Transmit structured sensor payloads (temperature, switch status, packet ID).",
      "Observe packet delivery confirmation callbacks and RSSI/latency stats."
    ],
    components: ["2x ESP32 DevKit V1 Boards (Node A TX & Node B RX)", "Pushbutton Trigger"],
    pinWiring: [
      { fromPin: "G4", toComponent: "TX Trigger Button", toPin: "Switch", wireColor: "Yellow", signalType: "DIGITAL_IN", notes: "Triggers immediate peer broadcast" },
      { fromPin: "G2", toComponent: "RX Packet ACK LED", toPin: "+", wireColor: "Emerald", signalType: "DIGITAL_OUT", notes: "Blinks on valid ESP-NOW frame delivery" }
    ],
    explanation: "Developed by Espressif, ESP-NOW bypasses TCP/IP handshakes to send 250-byte action frames directly at the Wi-Fi link layer, achieving sub-5 ms latency and 150 m+ line-of-sight range.",
    starterCode: `// Experiment 14: ESP-NOW Peer-to-Peer Frame
#include <esp_now.h>
#include <WiFi.h>

typedef struct { int nodeId; float tempC; bool alert; } Payload;
Payload msg = { 1, 27.4, false };

void OnDataSent(const uint8_t *mac, esp_now_send_status_t status) {
  Serial.println(status == ESP_NOW_SEND_SUCCESS ? "ESP-NOW ACK OK" : "TX FAIL");
}`,
    expectedResults: [
      "Sending a frame transfers structured payload cleanly from Node A MAC to Node B MAC.",
      "Latency stays under 5 ms with real packet counter and ACK logging."
    ],
    troubleshooting: [
      "Delivery fails: verify both ESP32 boards are initialized on the identical Wi-Fi channel (e.g. Channel 1)."
    ],
    simType: "ESPNOW_COMM",
    highlightedPins: ["G4", "G2", "3V3", "GND"]
  },
  {
    id: 15,
    title: "Smart Parking",
    difficulty: "Intermediate",
    durationMin: 22,
    category: "Multi-Sensor IoT Automation",
    summary: "Automate entry gate servo arm and real-time 2-slot occupancy indicator lights using ultrasonic bay sensors.",
    objectives: [
      "Monitor two parking slots via distance thresholds (< 15 cm = OCCUPIED).",
      "Actuate SG90 entry barrier servo to 90° only when free bays exist.",
      "Display live available bay count and Green/Red slot status LEDs."
    ],
    components: ["ESP32 DevKit V1", "SG90 Micro Servo Gate", "2x Bay Occupancy Sensors", "Red/Green Bay LEDs"],
    pinWiring: [
      { fromPin: "G13", toComponent: "Gate Servo SG90", toPin: "PWM Signal", wireColor: "Amber", signalType: "PWM", notes: "0° Closed / 90° Open" },
      { fromPin: "G5", toComponent: "Slot 1 Sensor", toPin: "TRIG/OUT", wireColor: "Cyan", signalType: "DIGITAL_IN", notes: "Bay 1 presence" },
      { fromPin: "G18", toComponent: "Slot 2 Sensor", toPin: "TRIG/OUT", wireColor: "Emerald", signalType: "DIGITAL_IN", notes: "Bay 2 presence" },
      { fromPin: "G2", toComponent: "Gate Status LED", toPin: "+", wireColor: "Red", signalType: "DIGITAL_OUT", notes: "Indicates lot full" }
    ],
    explanation: "Combining bay sensors with a finite-state entry controller prevents vehicles from entering a full lot. When either bay opens, the SG90 barrier rotates 90° smoothly using 50 Hz servo PWM pulses (1000–2000 µs).",
    starterCode: `// Experiment 15: Smart Automated Parking Lot
bool slot1Occupied = false;
bool slot2Occupied = true;

int freeSlots() { return (!slot1Occupied ? 1 : 0) + (!slot2Occupied ? 1 : 0); }

void handleEntryRequest() {
  if (freeSlots() > 0) {
    gateServo.write(90); // Open Barrier
    Serial.println("GATE OPEN -> Welcome");
  } else {
    gateServo.write(0);  // Keep Closed
    Serial.println("LOT FULL -> Access Denied");
  }
}`,
    expectedResults: [
      "Free bay counter updates dynamically as Slot 1 and Slot 2 toggle occupied/empty.",
      "Requesting entry opens gate only when free bays > 0."
    ],
    troubleshooting: [
      "Servo twitches or resets ESP32: power the SG90 from an external 5V rail rather than the 3.3V regulator."
    ],
    simType: "SMART_PARKING",
    highlightedPins: ["G13", "G5", "G18", "G2", "GND"]
  },
  {
    id: 16,
    title: "Automatic Water Pump",
    difficulty: "Intermediate",
    durationMin: 20,
    category: "Closed-Loop Relay Control",
    summary: "Control a 5V/12V water pump relay with moisture sensing on GPIO 35 and hysteresis anti-chatter protection.",
    objectives: [
      "Read analog capacitive soil/tank moisture percentage on GPIO 35.",
      "Implement two-point hysteresis (Pump ON < 30%, Pump OFF > 70%) to protect relay contacts.",
      "Toggle active-low opto-isolated relay channel cleanly on GPIO 26."
    ],
    components: ["ESP32 DevKit V1", "Capacitive Soil Moisture Sensor", "5V Optocoupler Relay", "Submersible Mini Pump"],
    pinWiring: [
      { fromPin: "G35", toComponent: "Moisture Sensor", toPin: "AOUT", wireColor: "Yellow", signalType: "ANALOG", notes: "12-bit ADC1 read" },
      { fromPin: "G26", toComponent: "Relay Module", toPin: "IN1", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Drives pump contactor" },
      { fromPin: "3V3", toComponent: "Moisture Sensor", toPin: "VCC", wireColor: "Red", signalType: "POWER", notes: "3.3V excitation" },
      { fromPin: "GND", toComponent: "Common Ground", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Shared ground" }
    ],
    explanation: "Without hysteresis, a noisy sensor near the threshold would chatter a mechanical relay dozens of times per second. Using distinct low turn-on (30%) and high turn-off (70%) setpoints creates a clean deadband.",
    starterCode: `// Experiment 16: Hysteresis Water Pump Controller
const int MOIST_PIN = 35, RELAY_PIN = 26;
bool pumpRunning = false;

void loop() {
  int pct = map(analogRead(MOIST_PIN), 3200, 1200, 0, 100);
  if (!pumpRunning && pct < 30) pumpRunning = true;
  if (pumpRunning && pct >= 70) pumpRunning = false;
  digitalWrite(RELAY_PIN, pumpRunning ? HIGH : LOW);
  delay(200);
}`,
    expectedResults: [
      "Dropping moisture below 30% engages the pump relay and increases tank level.",
      "Pump stays ON smoothly until moisture reaches 70% cutoff."
    ],
    troubleshooting: [
      "Add a flyback diode (1N4007) across DC pump terminals to suppress inductive kickback spikes."
    ],
    simType: "WATER_PUMP",
    highlightedPins: ["G35", "G26", "3V3", "GND"]
  },
  {
    id: 17,
    title: "Keypad Door Lock",
    difficulty: "Intermediate",
    durationMin: 25,
    category: "Matrix Scanning & Security",
    summary: "Scan a 4x4 membrane keypad (8 GPIOs), validate a 4-digit PIN code, and actuate a door-lock servo + buzzer.",
    objectives: [
      "Perform row-column matrix scanning across 4 output rows and 4 input pull-up columns.",
      "Compare entered 4-digit buffer against stored passcode ('1234').",
      "Unlock servo bolt on valid PIN or trigger error beep and lockout on wrong attempts."
    ],
    components: ["ESP32 DevKit V1", "4x4 Matrix Keypad", "SG90 Lock Bolt Servo", "Buzzer & Red/Green LEDs"],
    pinWiring: [
      { fromPin: "G13,G12,G14,G27", toComponent: "4x4 Keypad", toPin: "R1–R4 Rows", wireColor: "Cyan", signalType: "DIGITAL_OUT", notes: "Driven LOW sequentially" },
      { fromPin: "G26,G25,G33,G32", toComponent: "4x4 Keypad", toPin: "C1–C4 Cols", wireColor: "Yellow", signalType: "DIGITAL_IN", notes: "INPUT_PULLUP reads" },
      { fromPin: "G15", toComponent: "Door Lock Servo", toPin: "PWM", wireColor: "Emerald", signalType: "PWM", notes: "Rotates bolt open on unlock" }
    ],
    explanation: "A 16-key keypad needs only 8 GPIO wires by arranging switches in a 4×4 crosspoint grid. Driving one row LOW at a time and scanning the four columns identifies the exact row-column coordinate of any pressed key.",
    starterCode: `// Experiment 17: 4x4 Keypad Smart Door Lock
const String MASTER_PIN = "1234";
String entered = "";

void onKeyPress(char key) {
  if (key == '#') {
    bool ok = (entered == MASTER_PIN);
    Serial.println(ok ? "ACCESS GRANTED -> Servo Unlocked" : "INVALID PIN");
    entered = "";
  } else if (key == '*') {
    entered = "";
  } else if (entered.length() < 4) {
    entered += key;
  }
}`,
    expectedResults: [
      "Entering '1234' + '#' unlocks the virtual bolt servo and flashes green status.",
      "Wrong codes log security alert and keep bolt locked."
    ],
    troubleshooting: [
      "Columns reading erratically: remember GPIOs 34–39 have NO internal pull-ups—use GPIO 25, 26, 32, 33 for keypad columns."
    ],
    simType: "KEYPAD_LOCK",
    highlightedPins: ["G13", "G14", "G27", "G26", "G25", "G33", "G32", "G15"]
  },
  {
    id: 18,
    title: "Solar Tracking",
    difficulty: "Advanced",
    durationMin: 25,
    category: "Closed-Loop Feedback & Control",
    summary: "Track simulated sun azimuth (0°–180°) automatically using dual East/West LDR sensors and closed-loop proportional servo steering.",
    objectives: [
      "Compare left (GPIO 34) and right (GPIO 35) LDR analog channels.",
      "Compute differential error (E = East - West) with a noise deadband.",
      "Steer solar panel servo (GPIO 18) continuously to maximize incident irradiance."
    ],
    components: ["ESP32 DevKit V1", "2x LDR Modules", "2x 10kΩ Resistors", "MG90S Servo Mount & PV Panel"],
    pinWiring: [
      { fromPin: "G34", toComponent: "East LDR", toPin: "AOUT", wireColor: "Yellow", signalType: "ANALOG", notes: "ADC1 East light intensity" },
      { fromPin: "G35", toComponent: "West LDR", toPin: "AOUT", wireColor: "Amber", signalType: "ANALOG", notes: "ADC1 West light intensity" },
      { fromPin: "G18", toComponent: "Panel Tilt Servo", toPin: "PWM", wireColor: "Cyan", signalType: "PWM", notes: "0°–180° azimuth position" }
    ],
    explanation: "A single-axis solar tracker aligns the PV panel normal to incoming sunlight by zeroing the illuminance difference between two angled LDR sensors separated by a central shadow fin.",
    starterCode: `// Experiment 18: Closed-Loop Solar Tracker
const int LDR_EAST = 34, LDR_WEST = 35, SERVO_PIN = 18;
int angle = 90;

void loop() {
  int err = analogRead(LDR_EAST) - analogRead(LDR_WEST);
  if (abs(err) > 120) {
    angle = constrain(angle + (err > 0 ? -2 : 2), 10, 170);
    trackerServo.write(angle);
  }
  delay(40);
}`,
    expectedResults: [
      "Dragging the sun azimuth slider causes the PV panel to rotate smoothly to track peak irradiance.",
      "Harvested solar power readout maximizes when panel angle matches sun angle."
    ],
    troubleshooting: [
      "Servo oscillates back and forth: widen the differential deadband threshold (e.g. from 40 to 120 ADC counts)."
    ],
    simType: "SOLAR_TRACKING",
    highlightedPins: ["G34", "G35", "G18", "GND"]
  },
  {
    id: 19,
    title: "Ultrasonic Radar",
    difficulty: "Advanced",
    durationMin: 25,
    category: "Mechatronics & Polar Mapping",
    summary: "Sweep an HC-SR04 mounted atop an SG90 servo across 0°–180° to map live targets on an interactive green radar screen.",
    objectives: [
      "Synchronize servo azimuth stepping (GPIO 13) with ultrasonic time-of-flight pings (GPIO 5/18).",
      "Stream real-time (angle, distance_cm) polar packets over Serial at 115200 baud.",
      "Visualize targets with phosphor decay persistence on a 180° polar radar canvas."
    ],
    components: ["ESP32 DevKit V1", "SG90 Sweep Servo", "HC-SR04 Ultrasonic Sensor", "Pan Bracket"],
    pinWiring: [
      { fromPin: "G13", toComponent: "Radar Pan Servo", toPin: "PWM", wireColor: "Cyan", signalType: "PWM", notes: "Sweeps 0° to 180°" },
      { fromPin: "G5", toComponent: "HC-SR04", toPin: "TRIG", wireColor: "Emerald", signalType: "DIGITAL_OUT", notes: "10µs acoustic trigger" },
      { fromPin: "G18", toComponent: "HC-SR04", toPin: "ECHO", wireColor: "Amber", signalType: "DIGITAL_IN", notes: "Divided 3.3V return pulse" }
    ],
    explanation: "By rotating an ultrasonic transducer smoothly through 180° while triggering acoustic bursts every degree, the ESP32 builds a real-time polar range map identical in principle to naval and automotive radar.",
    starterCode: `// Experiment 19: 180-Degree Ultrasonic Radar
void loop() {
  for (int deg = 15; deg <= 165; deg += 2) {
    radarServo.write(deg);
    delay(25);
    int dist = readUltrasonicCm();
    Serial.printf("%d,%d.\\n", deg, dist);
  }
}`,
    expectedResults: [
      "Radar sweep beam rotates continuously across 0°–180° and highlights virtual obstacles in red.",
      "Polar angle and target distance appear live on screen and in Serial output."
    ],
    troubleshooting: [
      "Ensure mechanical mount doesn't snag jumper wires during full 180° rotation."
    ],
    simType: "ULTRASONIC_RADAR",
    highlightedPins: ["G13", "G5", "G18", "GND"]
  },
  {
    id: 20,
    title: "Pick-and-Place Robotics",
    difficulty: "Advanced",
    durationMin: 30,
    category: "Multi-Axis Kinematics & Robotics",
    summary: "Program coordinated 3-DOF robotic arm trajectories (Base, Shoulder, Gripper servos) for automated pick-and-place cycles.",
    objectives: [
      "Drive three independent 50 Hz servo channels simultaneously via ESP32 LEDC timers.",
      "Interpolate smooth joint angles from Home -> Pick -> Lift -> Rotate -> Place.",
      "Execute automated sequence loops or manual joint teaching."
    ],
    components: ["ESP32 DevKit V1", "3x MG90S Metal Gear Servos (Base, Arm, Claw)", "External 5V 3A BEC Supply"],
    pinWiring: [
      { fromPin: "G13", toComponent: "Servo 1 (Base Rotation)", toPin: "PWM", wireColor: "Cyan", signalType: "PWM", notes: "0° Pick Zone – 180° Drop Zone" },
      { fromPin: "G12", toComponent: "Servo 2 (Shoulder Lift)", toPin: "PWM", wireColor: "Emerald", signalType: "PWM", notes: "Lowers & raises arm" },
      { fromPin: "G14", toComponent: "Servo 3 (End-Effector Gripper)", toPin: "PWM", wireColor: "Amber", signalType: "PWM", notes: "Opens / closes claw" },
      { fromPin: "GND", toComponent: "5V Servo Power Ground", toPin: "GND", wireColor: "Black", signalType: "GND", notes: "Must share common ground with ESP32" }
    ],
    explanation: "Multi-axis robotics relies on coordinated motion keyframes. By interpolating Base, Shoulder, and Gripper angles incrementally over time rather than snapping instantaneously, mechanical jerk is minimized and payload stability improves.",
    starterCode: `// Experiment 20: 3-DOF Pick-and-Place Robotic Arm
void runPickAndPlaceCycle() {
  moveJoints(30, 85, 0);   // 1. Position above part & open claw
  moveJoints(30, 35, 0);   // 2. Lower arm to part
  moveJoints(30, 35, 1);   // 3. Close gripper
  moveJoints(30, 90, 1);   // 4. Lift payload
  moveJoints(145, 90, 1);  // 5. Rotate to drop zone
  moveJoints(145, 35, 0);  // 6. Lower & release
}`,
    expectedResults: [
      "Pressing 'Run Automated Cycle' animates the 3-DOF robotic arm smoothly picking up and transferring the payload.",
      "Manual joint sliders allow full real-time inverse teaching and telemetry logging."
    ],
    troubleshooting: [
      "Brownout resets when multiple servos move together: always power multi-servo rigs from a dedicated 5V 3A power supply, never the ESP32 3V3 pin."
    ],
    simType: "PICK_AND_PLACE",
    highlightedPins: ["G13", "G12", "G14", "GND"]
  }
];
