import { ESP32_20_EXPERIMENTS, type Esp32ExperimentDef } from "./esp32ExperimentsData";
import { type GuidedExperimentDef } from "./guidedExperimentsData";
import { MASTER_75_LABS, MASTER_DOMAINS, type MasterLabItem } from "./master75Labs";

export interface PostLabMcq {
  id: string;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface PostLabQuizContext {
  labId: string;
  labTitle: string;
  domain: string;
  category: string;
  questions: [PostLabMcq, PostLabMcq, PostLabMcq];
}

type RawQ = [
  question: string,
  options: [string, string, string, string],
  correctIndex: 0 | 1 | 2 | 3,
  explanation: string,
];

function toMcqs(prefix: string, items: [RawQ, RawQ, RawQ]): [PostLabMcq, PostLabMcq, PostLabMcq] {
  return [
    { id: `${prefix}-q1`, question: items[0][0], options: items[0][1], correctIndex: items[0][2], explanation: items[0][3] },
    { id: `${prefix}-q2`, question: items[1][0], options: items[1][1], correctIndex: items[1][2], explanation: items[1][3] },
    { id: `${prefix}-q3`, question: items[2][0], options: items[2][1], correctIndex: items[2][2], explanation: items[2][3] },
  ];
}

// ============================================================================
// 1. ESP32 LEARNING LAB (20 EXPERIMENTS)
// ============================================================================
const ESP32_QUIZ_BANK: Record<number, [RawQ, RawQ, RawQ]> = {
  1: [
    [
      "What logic voltage level do ESP32 DevKit V1 GPIO pins operate at?",
      ["5.0 V TTL only", "3.3 V CMOS logic", "1.8 V core-only external I/O", "12 V industrial logic"],
      1,
      "ESP32 GPIOs are strictly 3.3 V CMOS logic; applying 5 V directly to a GPIO pin can permanently damage the silicon.",
    ],
    [
      "Which GPIO is wired to the onboard blue status LED on a standard 30-pin ESP32 DevKit V1?",
      ["GPIO 2", "GPIO 34", "GPIO 0", "GPIO 39"],
      0,
      "GPIO 2 drives the onboard blue indicator LED on standard ESP32 DevKit V1 boards.",
    ],
    [
      "What is the role of the onboard AMS1117 regulator connected to the VIN / USB 5V rail?",
      ["Boosts 3.3 V up to 5 V for USB", "Steps down 5 V input to a regulated 3.3 V rail", "Converts analog sensor voltages into PWM", "Isolates Wi-Fi RF signals from ground"],
      1,
      "The AMS1117-3.3 LDO steps down the 5 V USB/VIN input to the regulated 3.3 V required by the ESP32.",
    ],
  ],
  2: [
    [
      "Why is a 220 Ω resistor placed in series with each external LED driven by GPIO 16 and GPIO 17?",
      ["To raise the LED forward voltage above 5 V", "To limit current so neither the LED nor the GPIO driver is overstressed", "To convert AC to DC across the cathode", "To enable PWM dimming automatically"],
      1,
      "With a 3.3 V GPIO and ~2.0 V LED drop, 220 Ω limits current to roughly (3.3 − 2.0) / 220 ≈ 5.9 mA, safely within ESP32 pin limits.",
    ],
    [
      "If GPIO 16 is HIGH (3.3 V) and GPIO 17 is LOW (0 V) in an alternating blink loop, which LED lights up (assuming common-cathode to GND)?",
      ["Only the LED on GPIO 17", "Only the LED on GPIO 16", "Both LEDs equally", "Neither LED conducts"],
      1,
      "A common-cathode LED illuminates when its anode GPIO sources HIGH (3.3 V) relative to GND.",
    ],
    [
      "What happens if you install a 5 mm LED backwards (anode to GND, cathode toward GPIO resistor)?",
      ["It blinks twice as fast", "It remains reverse-biased and does not emit light", "It turns into a Zener regulator at 1.2 V", "It shorts the 3.3 V regulator immediately"],
      1,
      "Diodes conduct significantly only in forward bias; reversed polarity blocks current so the LED stays dark.",
    ],
  ],
  3: [
    [
      "Why is GPIO 14 configured with INPUT_PULLUP instead of plain INPUT for the reed switch?",
      ["To double the switch contact current", "To hold the pin at a defined 3.3 V HIGH state when the switch is open", "To generate an internal PWM carrier", "To invert the hardware ADC gain"],
      1,
      "Without a pull-up resistor, an open switch leaves the CMOS input floating and susceptible to random noise triggers.",
    ],
    [
      "When the magnet closes the reed switch wired between GPIO 14 and GND, what does digitalRead(14) return?",
      ["LOW (0)", "HIGH (1)", "2048 analog counts", "Undefined high-impedance"],
      0,
      "Closing the switch connects GPIO 14 directly to GND, producing an active-LOW (0) reading.",
    ],
    [
      "Which ESP32 pins lack internal pull-up/pull-down resistors and therefore require external pull resistors if used with switches?",
      ["GPIO 16–17", "GPIO 34–39 (input-only pins)", "GPIO 25–26", "GPIO 2 and 4"],
      1,
      "Input-only pins GPIO 34, 35, 36, and 39 have no internal pull-up or pull-down circuitry.",
    ],
  ],
  4: [
    [
      "Which Wi-Fi frequency band is supported by the ESP32 DevKit V1 radio?",
      ["Dual-band 2.4 GHz and 5 GHz", "2.4 GHz (802.11 b/g/n) only", "5 GHz (802.11 ac) only", "Sub-GHz 915 MHz ISM"],
      1,
      "The ESP32 integrates an 802.11 b/g/n 2.4 GHz Wi-Fi transceiver and cannot connect to 5 GHz-only networks.",
    ],
    [
      "Which ADC peripheral conflicts with active Wi-Fi radio usage on the ESP32?",
      ["ADC1 (GPIO 32–39)", "ADC2 (e.g., GPIO 25, 26, 27, 4)", "LEDC PWM channels", "UART0 serial port"],
      1,
      "The Wi-Fi driver shares hardware resources with ADC2, preventing reliable analogRead() on ADC2 pins while Wi-Fi is active.",
    ],
    [
      "How does a client browser toggle an ESP32 GPIO load in the HTTP WebServer lab?",
      ["By flashing new firmware over JTAG on each click", "By sending HTTP GET route requests (e.g., /led/on) parsed by the server", "By pulsing the EN reset pin over USB", "By varying the AMS1117 input voltage"],
      1,
      "The embedded HTTP server listens on port 80 and maps URL paths like /led/on to digitalWrite() GPIO actions.",
    ],
  ],
  5: [
    [
      "Why must a passive piezo buzzer be driven by a variable-frequency PWM signal rather than steady DC?",
      ["A passive piezo has no internal oscillator and needs AC/square-wave excitation to vibrate at audible pitch", "Steady DC reverses the piezo polarity permanently", "Passive buzzers require 12 V DC minimum", "Steady DC draws zero voltage on GPIO 18"],
      0,
      "Active buzzers contain a built-in oscillator, whereas passive piezos act as transducers that vibrate at the driven PWM frequency.",
    ],
    [
      "Which ESP32 hardware peripheral generates accurate frequency sweeps on GPIO 18 without blocking CPU loops?",
      ["DAC1", "LEDC PWM controller", "I2C bus", "Brownout detector"],
      1,
      "The ESP32 LEDC peripheral offers 16 hardware PWM channels capable of driving precise tone frequencies.",
    ],
    [
      "In the siren sweep from 500 Hz to 1300 Hz, what determines the musical pitch heard from the buzzer?",
      ["The UART baud rate", "The PWM carrier frequency in Hz", "The USB cable length", "The flash memory size"],
      1,
      "Audio pitch corresponds directly to the fundamental frequency (Hz) of the PWM square wave.",
    ],
  ],
  6: [
    [
      "What physical change happens to touchRead() when a human finger touches an ESP32 capacitive touch pad?",
      ["Added human body capacitance lowers the touchRead() count sharply below threshold", "Body resistance raises touchRead() to 4095", "The GPIO switches automatically to 5 V output", "UART0 stops transmitting"],
      0,
      "Touching a pad increases its RC charging time, reducing the measured oscillation count below the calibrated threshold.",
    ],
    [
      "Why should high-value pull-up resistors NOT be added to capacitive touch pads?",
      ["They short 3.3 V to VIN", "They interfere with the internal RC charge/discharge measurement cycle", "They force the ESP32 into deep sleep", "They convert touch pins into SPI clock lines"],
      1,
      "ESP32 capacitive touch sensing relies on controlled internal current charging of the pad capacitance; external pull resistors skew readings.",
    ],
    [
      "Which GPIO in Experiment 6 produces the synthesized piano audio tone?",
      ["GPIO 34 (input-only)", "GPIO 18 (LEDC PWM output)", "GPIO 1 (TX0)", "EN pin"],
      1,
      "GPIO 18 outputs the LEDC PWM square-wave note frequencies (C5–G5) to the piezo speaker.",
    ],
  ],
  7: [
    [
      "What data protocol timing does a WS2812B NeoPixel RGB ring require on its DIN pin?",
      ["Standard 9600 baud UART", "Single-wire 800 kHz NRZ pulse-width protocol", "100 kHz I2C with pull-ups", "Differential RS-485"],
      1,
      "WS2812B LEDs use a timing-critical 800 kHz single-wire NRZ protocol (24 G-R-B bits per LED), driven cleanly via the ESP32 RMT peripheral.",
    ],
    [
      "If all 12 WS2812B LEDs are driven at full white (~60 mA each), what is the approximate worst-case current draw?",
      ["12 mA", "72 mA", "720 mA", "7.2 A"],
      2,
      "12 pixels × 60 mA per full-white pixel equals ~720 mA, which exceeds the onboard 3.3 V regulator limit and requires 5 V VIN/external power.",
    ],
    [
      "Why is a 330 Ω resistor recommended in series with the WS2812B DIN data line?",
      ["To limit current into the first pixel input and damp signal ringing", "To step 5 V power down to 1.2 V", "To double the refresh frame rate", "To provide I2C clock stretching"],
      0,
      "A 330 Ω series resistor suppresses high-frequency edge ringing and protects the first LED's DIN input.",
    ],
  ],
  8: [
    [
      "Why are the Red, Green, and Blue PWM channels switched at 5 kHz rather than 20 Hz?",
      ["20 Hz would produce visible LED flicker, whereas 5 kHz is well above human flicker fusion", "5 kHz doubles the LED forward voltage", "20 Hz cannot be generated by 8-bit timers", "5 kHz eliminates the need for resistors"],
      0,
      "Switching at 5 kHz produces smooth, flicker-free perceived brightness proportional to duty cycle.",
    ],
    [
      "For an 8-bit LEDC PWM channel (0–255), what duty value produces 50% average brightness on a common-cathode RGB LED?",
      ["64", "127 or 128", "255", "1023"],
      1,
      "With 8-bit resolution (0–255), half duty cycle corresponds to ~128.",
    ],
    [
      "If you accidentally connect a Common-Anode RGB LED (common to 3.3 V) using Common-Cathode PWM values, what happens?",
      ["Brightness behaves inverted (0 is full ON, 255 is OFF)", "Only the blue die conducts", "The ESP32 enters bootloader mode", "PWM frequency drops to 1 Hz"],
      0,
      "In Common-Anode wiring, LEDs turn ON when the GPIO sinks LOW, inverting duty cycle behavior (255 − val).",
    ],
  ],
  9: [
    [
      "In the LDR + 10 kΩ pull-down voltage divider wired to GPIO 34, how does divider voltage behave as ambient light gets darker?",
      ["LDR resistance rises sharply, pulling GPIO 34 voltage down toward 0 V", "LDR resistance drops to 0 Ω, pulling GPIO 34 to 5 V", "Divider voltage stays locked at 1.65 V", "Current flows backward into ADC1"],
      0,
      "With the LDR connected to 3.3 V and the 10 kΩ resistor to GND, higher dark LDR resistance drops more voltage across the LDR, lowering V_out.",
    ],
    [
      "What is the numeric output range of the ESP32 12-bit ADC (analogRead)?",
      ["0 to 255", "0 to 1023", "0 to 4095", "0 to 65535"],
      2,
      "A 12-bit ADC resolves analog voltage into 2¹² = 4096 steps from 0 to 4095.",
    ],
    [
      "Why is GPIO 34 (ADC1_CH6) preferred over an ADC2 pin for reading the LDR in IoT projects?",
      ["GPIO 34 outputs 5 V PWM", "ADC1 remains unaffected when Wi-Fi is active", "GPIO 34 has a built-in 10 kΩ resistor", "ADC2 only supports 4-bit resolution"],
      1,
      "ADC1 channels (GPIO 32–39) operate reliably alongside Wi-Fi, unlike ADC2 channels.",
    ],
  ],
  10: [
    [
      "Why must the HC-SR04 ECHO output (5 V) pass through a 1 kΩ / 2 kΩ resistor divider before entering ESP32 GPIO 18?",
      ["To amplify 5 V up to 10 V", "To step 5 V logic safely down to ~3.3 V for the 3.3 V-tolerant ESP32 GPIO", "To convert ultrasonic sound into I2C data", "To invert the trigger pulse"],
      1,
      "A 1 kΩ (top) and 2 kΩ (bottom) divider scales 5 V × 2/(1+2) ≈ 3.33 V, protecting GPIO 18 from 5 V overvoltage.",
    ],
    [
      "In d = (duration × 0.0343 cm/µs) / 2, why do we divide the measured echo flight time by 2?",
      ["Because sound travels at half speed in air", "Because the ECHO pulse measures the round-trip time (to the target and back)", "Because the ESP32 clock runs at 2 MHz", "To convert centimeters into meters"],
      1,
      "The acoustic burst travels to the obstacle and reflects back, so one-way distance equals half the total flight time.",
    ],
    [
      "How long should the TRIG pin be pulsed HIGH to initiate an HC-SR04 ranging burst?",
      ["10 µs", "10 seconds", "1 ms continuous DC", "100 ns"],
      0,
      "The HC-SR04 datasheet specifies a 10 µs HIGH pulse on TRIG to launch eight 40 kHz ultrasonic cycles.",
    ],
  ],
  11: [
    [
      "Why do we use an L298N H-Bridge driver instead of wiring a 6 V DC motor directly to ESP32 GPIOs?",
      ["GPIOs cannot supply motor stall/running current or safely absorb inductive back-EMF", "H-bridges convert DC motors into stepper servos", "ESP32 GPIOs only output AC voltage", "Motors require 800 kHz NRZ signals"],
      0,
      "ESP32 pins are limited to low milliamps at 3.3 V; an H-bridge switches external motor power and isolates back-EMF.",
    ],
    [
      "What happens in Experiment 11 when you swap IN1 and IN2 states (HIGH/LOW -> LOW/HIGH) while keeping ENA PWM active?",
      ["Motor rotation direction reverses", "Motor enters thermal shutdown", "PWM frequency doubles", "Supply voltage drops to 0 V"],
      0,
      "Swapping IN1 and IN2 reverses polarity across the motor armature inside the H-bridge, reversing spin direction.",
    ],
    [
      "Why must the L298N ground and external battery negative terminal be tied to ESP32 GND?",
      ["To provide a common 0 V voltage reference for logic control signals", "To increase battery voltage by 3.3 V", "To bypass PWM duty limits", "To disable Wi-Fi interference"],
      0,
      "Without a shared ground reference, the L298N logic inputs cannot reliably interpret HIGH/LOW voltages from the ESP32.",
    ],
  ],
  12: [
    [
      "How does the ESP32 detect an intruder crossing the 650 nm laser barrier?",
      ["Receiver ADC reading drops sharply below the illuminated threshold", "Laser diode resistance increases to 10 MΩ", "Buzzer emits a 40 kHz trigger pulse", "GPIO 19 switches into UART RX mode"],
      0,
      "Obstructing the beam cuts light falling on the LDR/photodiode, dropping the voltage divider ADC reading below threshold.",
    ],
    [
      "How can ambient room sunlight false triggers be minimized in a physical laser barrier setup?",
      ["Shroud the LDR receiver inside an opaque dark tube aligned toward the laser beam", "Remove the 10 kΩ divider resistor", "Connect the LDR directly to VIN", "Run the buzzer continuously"],
      0,
      "A dark collimating tube blocks off-axis ambient light while admitting the aligned 650 nm laser beam.",
    ],
    [
      "Why is the alarm condition latched in firmware once tripped?",
      ["So the alert remains active even after a fast-moving object passes out of the beam", "To prevent the ADC from sampling above 4095", "To discharge the USB capacitor", "To turn off GPIO 2 permanently"],
      0,
      "Latching ensures brief beam interruptions aren't missed and stay alarmed until an operator resets the system.",
    ],
  ],
  13: [
    [
      "Which wireless capabilities are integrated on the ESP32 silicon in Experiment 13?",
      ["Bluetooth Classic (BR/EDR) and Bluetooth Low Energy (BLE) alongside 2.4 GHz Wi-Fi", "Zigbee 802.15.4 only", "LoRa 433 MHz chirp spread spectrum", "Cellular LTE Cat-M1"],
      0,
      "The ESP32 integrates dual-mode Bluetooth (Classic SPP + BLE) and 2.4 GHz Wi-Fi sharing its RF front-end.",
    ],
    [
      "In the Bluetooth command bridge, how does the ESP32 act on incoming smartphone messages like 'ON'?",
      ["Reads the SerialBT stream, updates digitalWrite(LED_PIN, ...), and returns an ACK string", "Writes the string directly to EEPROM without executing", "Resets the Wi-Fi MAC address", "Halts Core 1 indefinitely"],
      0,
      "SerialBT exposes incoming wireless bytes just like a UART stream, allowing immediate command parsing and acknowledgment.",
    ],
    [
      "Why can a weak USB cable cause ESP32 brownouts when enabling Bluetooth or Wi-Fi TX?",
      ["RF transmit bursts draw current spikes (~180–300 mA+) that drop voltage across thin cable resistance", "Bluetooth requires 12 V USB PD negotiation", "Thin cables invert RX0 and TX0", "Wi-Fi disables the AMS1117 regulator"],
      0,
      "High-resistance cables cause voltage sag during RF TX current peaks, triggering the ESP32 brownout reset detector.",
    ],
  ],
  14: [
    [
      "What is a primary advantage of ESP-NOW over standard Wi-Fi TCP/IP HTTP requests?",
      ["Sub-5 ms connectionless peer-to-peer delivery without needing a Wi-Fi router", "Unlimited 100 MB payload size per packet", "Long-range satellite communication at 12 GHz", "Automatic 5 V logic translation"],
      0,
      "ESP-NOW sends 250-byte link-layer action frames directly between MAC addresses without router association or TCP overhead.",
    ],
    [
      "What critical condition must both ESP32 boards satisfy for reliable ESP-NOW frame exchange?",
      ["Both boards must operate on the same Wi-Fi channel and target the receiver MAC address", "Both boards must be plugged into the same USB hub", "Both boards must use different baud rates", "Receiver must have ADC2 disabled"],
      0,
      "Transmitter and receiver radios must share the same 2.4 GHz Wi-Fi channel and valid peer MAC registration.",
    ],
    [
      "What is the maximum payload size per standard ESP-NOW v1.0 packet?",
      ["8 bytes", "250 bytes", "64 kilobytes", "1500 bytes"],
      1,
      "Standard ESP-NOW action frames support payloads up to 250 bytes, ideal for compact sensor structs and control flags.",
    ],
  ],
  15: [
    [
      "In the Smart Parking gate logic, when should the SG90 barrier servo rotate to 90° (open)?",
      ["Only when at least one parking bay reports free (available bays > 0)", "Whenever both bays are occupied", "Continuously every 500 ms", "Only when GPIO 2 is pulled LOW externally"],
      0,
      "The finite-state entry controller grants barrier access only while freeSlots() > 0.",
    ],
    [
      "What standard PWM frequency drives hobby servos like the SG90?",
      ["50 Hz (20 ms period, 1–2 ms pulse width)", "800 kHz", "5 kHz", "1 Hz"],
      0,
      "Standard analog/digital RC servos expect a 50 Hz (20 ms) frame with 1.0–2.0 ms HIGH pulse width encoding 0°–180°.",
    ],
    [
      "Why should an SG90 servo be powered from an external 5 V supply rather than the ESP32 3V3 pin?",
      ["3.3 V is below SG90 nominal 4.8–6 V and servo stall currents can brown out the ESP32 regulator", "SG90 servos require AC mains voltage", "3V3 pin is an analog input only", "Servos invert PWM polarity at 3.3 V"],
      0,
      "Powering inductive servo motors from a separate 5 V supply (with shared GND) prevents voltage dips and ESP32 resets.",
    ],
  ],
  16: [
    [
      "Why does the Automatic Water Pump controller use hysteresis (ON < 30%, OFF >= 70%) instead of a single 50% threshold?",
      ["To create a deadband that prevents rapid relay chattering near the threshold", "To increase pump RPM by 40%", "To double ADC bit depth", "To avoid needing a flyback diode"],
      0,
      "A hysteresis band eliminates rapid ON/OFF oscillation caused by sensor noise or water splashing around a single setpoint.",
    ],
    [
      "What protects the relay driver transistor or contacts against inductive voltage spikes when turning off a DC water pump?",
      ["A reverse-biased flyback diode (e.g., 1N4007) across the motor/coil terminals", "Removing the common ground wire", "Lowering ADC sampling rate to 1 Hz", "Replacing the pump with an LDR"],
      0,
      "A flyback diode provides a safe circulating current path for inductive kickback energy (L·di/dt) on turn-off.",
    ],
    [
      "Why is a capacitive soil moisture sensor often preferred over a bare resistive probe?",
      ["Capacitive probes avoid exposed copper electrolysis corrosion in wet soil", "Capacitive probes output 12 V AC directly", "Resistive probes cannot work with 12-bit ADCs", "Capacitive probes require zero calibration"],
      0,
      "Electrodes covered by solder mask prevent electrochemical oxidation and drift over long deployments.",
    ],
  ],
  17: [
    [
      "How does a 4×4 matrix keypad read 16 distinct keys using only 8 ESP32 GPIOs?",
      ["By driving 4 rows LOW sequentially and reading 4 pull-up columns to locate the active intersection", "By encoding all 16 keys as binary voltages on one ADC pin", "By using 16 separate I2C expanders", "By pulsing all 8 pins at 800 kHz"],
      0,
      "Row-column multiplexing scans one row at a time and checks which column is pulled LOW when a key bridges them.",
    ],
    [
      "Why does Experiment 17 use GPIOs 25, 26, 32, and 33 for keypad columns instead of GPIOs 34–39?",
      ["GPIOs 34–39 lack internal pull-up resistors needed for clean column scanning", "GPIOs 25–33 output 5 V directly", "GPIOs 34–39 are reserved for the SG90 servo", "GPIOs 25–33 are input-only"],
      0,
      "Keypad columns rely on INPUT_PULLUP, which is supported on GPIOs 25, 26, 32, and 33 but absent on 34–39.",
    ],
    [
      "What happens when the entered 4-digit buffer matches MASTER_PIN upon pressing '#'?",
      ["The door-lock servo rotates to the unlocked angle and logs Access Granted", "The keypad clears its row resistors permanently", "The ESP32 enters Wi-Fi AP mode", "All 4 rows remain shorted to 3.3 V"],
      0,
      "Matching the passcode triggers servo actuation and visual/serial confirmation before resetting the input buffer.",
    ],
  ],
  18: [
    [
      "How does the single-axis Solar Tracker determine which way to rotate the PV panel?",
      ["By computing the differential error (East LDR − West LDR) across two ADC1 channels", "By measuring battery current in the SG90 servo", "By polling NTP sunrise time over Bluetooth", "By sweeping randomly every 10 seconds"],
      0,
      "Comparing East and West LDR readings reveals uneven shading so the servo rotates until both sensors receive equal irradiance.",
    ],
    [
      "What problem occurs if the differential deadband (|err| > threshold) is set too small (e.g., 5 ADC counts)?",
      ["Sensor noise causes constant servo hunting/oscillation and wasted power", "The solar panel produces negative voltage", "GPIO 34 switches to output mode", "The servo rotates past 360°"],
      0,
      "A properly sized deadband (~100–150 ADC counts) prevents jittering when the panel is already aligned with peak sunlight.",
    ],
    [
      "Why are GPIO 34 and GPIO 35 ideal for dual LDR analog sampling?",
      ["Both are clean 12-bit ADC1 inputs unaffected by Wi-Fi telemetry", "Both include internal 5 V boost converters", "Both support hardware H-bridge motor drive", "Both act as 8-bit DAC outputs"],
      0,
      "ADC1 channels 6 and 7 (GPIO 34/35) provide independent 12-bit analog conversions even during Wi-Fi telemetry.",
    ],
  ],
  19: [
    [
      "What polar coordinate pair does the ESP32 transmit over Serial while sweeping the Ultrasonic Radar?",
      ["Servo azimuth angle (degrees) and measured target range (cm)", "Voltage (V) and current (mA)", "MAC address and RSSI (dBm)", "Red, Green, and Blue PWM values"],
      0,
      "Each step pairs the current servo azimuth angle with the HC-SR04 echo distance for polar canvas plotting.",
    ],
    [
      "Why is a short settling delay (~25 ms) placed after commanding the servo to each new angle before pinging?",
      ["To let the mechanical servo arm reach the target angle before taking an acoustic measurement", "To charge the ultrasonic crystal to 24 V", "To flush the Wi-Fi MAC table", "To cool the AMS1117 regulator"],
      0,
      "Allowing the servo to settle ensures the distance echo corresponds accurately to the reported azimuth angle.",
    ],
    [
      "What happens if the ultrasonic sensor echoes off an obstacle 34.3 cm away (speed of sound 0.0343 cm/µs)?",
      ["ECHO stays HIGH for approximately 2000 µs (round-trip)", "ECHO stays HIGH for 50 µs", "TRIG pulls GPIO 18 permanently LOW", "Servo reverses immediately"],
      0,
      "Round-trip distance is 2 × 34.3 = 68.6 cm; 68.6 / 0.0343 = 2000 µs.",
    ],
  ],
  20: [
    [
      "Why does the 3-DOF Pick-and-Place robotic arm interpolate joint angles incrementally rather than snapping instantly?",
      ["Smooth trajectory interpolation reduces mechanical jerk, current spikes, and payload slip", "ESP32 servos cannot rotate more than 1° per second", "Instant snapping disables LEDC timers", "Interpolation converts 5 V servos to 3.3 V"],
      0,
      "Incremental motion profiling prevents violent inertial shocks and keeps multi-servo peak current draw manageable.",
    ],
    [
      "Why does Experiment 20 require an external 5 V 3 A BEC supply for the three MG90S metal-gear servos?",
      ["Three simultaneous metal-gear servos can pull over 1.5–2.5 A, causing severe brownout resets if drawn from USB/3V3", "MG90S servos operate on 3-phase AC", "BEC supplies encode UART serial packets", "USB cables block 50 Hz PWM signals"],
      0,
      "High-torque servos draw large surge currents when accelerating under load; a dedicated 5 V rail isolates the ESP32 logic supply.",
    ],
    [
      "In the pick-and-place state sequence, what must happen before lifting and rotating the payload to the drop zone?",
      ["The arm lowers to the part and the gripper servo closes securely around the payload", "All three servos are detached from PWM", "GPIO 13 is switched to ADC input", "The base rotates 180° before lowering"],
      0,
      "Proper grasp ordering—Position -> Lower -> Close Claw -> Lift -> Rotate -> Release—prevents collisions and dropped payloads.",
    ],
  ],
};

// ============================================================================
// 2. GUIDED PRACTICAL EXPERIMENTS (StudentLearningSystem)
// ============================================================================
const GUIDED_QUIZ_BANK: Record<string, [RawQ, RawQ, RawQ]> = {
  EXP_OHM: [
    [
      "For an ohmic 1.0 kΩ resistor, what current flows when 10.0 V DC is applied across its terminals?",
      ["1.00 mA", "10.00 mA", "100.0 mA", "0.10 mA"],
      1,
      "By Ohm's Law, I = V / R = 10.0 V / 1000 Ω = 0.010 A = 10.00 mA.",
    ],
    [
      "Why must an ammeter be wired in series while a voltmeter is wired in parallel?",
      ["Ammeters have very low burden resistance and voltmeters have very high input impedance", "Voltmeters short the supply if placed in parallel", "Ammeters measure potential difference across open circuits", "Series wiring doubles resistor power rating"],
      0,
      "Low-impedance ammeters pass loop current without dropping voltage; high-impedance voltmeters sense potential without loading the node.",
    ],
    [
      "Which electronic device violates Ohm's linear constant-resistance law?",
      ["Carbon film resistor", "Metal film precision resistor", "Silicon PN junction diode", "Copper jumper wire at constant temperature"],
      2,
      "Semiconductor diodes exhibit an exponential I-V curve rather than linear proportionality.",
    ],
  ],
  EXP_KVL_KCL: [
    [
      "Kirchhoff's Current Law (Σ I_node = 0) is a direct circuit consequence of which fundamental physical law?",
      ["Conservation of magnetic flux", "Conservation of electric charge", "Faraday's law of induction", "Planck-Einstein quantization"],
      1,
      "Charge cannot accumulate at a lumped circuit node, so incoming current must equal outgoing current.",
    ],
    [
      "Kirchhoff's Voltage Law (Σ V_loop = 0) expresses conservation of what physical quantity around any closed loop?",
      ["Electric energy / potential work per unit charge", "Thermal conductivity", "Capacitance per unit length", "Magnetic reluctance"],
      0,
      "Moving a charge completely around a closed path returns it to the same potential, yielding zero net energy change.",
    ],
    [
      "In the 12 V divider with R1 = 1 kΩ in series with parallel R2 = 2.2 kΩ and R3 = 3.3 kΩ, if I1 = 5.16 mA and I2 = 3.11 mA, what must I3 equal by KCL?",
      ["8.27 mA", "2.05 mA", "5.16 mA", "1.05 mA"],
      1,
      "By KCL at Node A, I3 = I1 − I2 = 5.16 mA − 3.11 mA = 2.05 mA.",
    ],
  ],
  EXP_DIODE_CHAR: [
    [
      "Approximately what forward knee voltage (barrier potential) does a 1N4007 silicon PN diode exhibit at room temperature?",
      ["0.2 V", "0.65 V – 0.72 V", "3.3 V", "5.1 V"],
      1,
      "Silicon PN junctions begin conducting strongly near ~0.65–0.72 V due to silicon's 1.12 eV bandgap.",
    ],
    [
      "How does dynamic AC resistance r_d = n·V_t / I_d change as DC forward diode current I_d increases?",
      ["r_d decreases inversely with I_d", "r_d increases exponentially", "r_d stays fixed at 1 kΩ", "r_d becomes negative"],
      0,
      "Dynamic resistance is inversely proportional to forward bias current: higher I_d lowers r_d.",
    ],
    [
      "What does the Peak Inverse Voltage (PIV = 1000 V) rating of a 1N4007 specify?",
      ["Its maximum safe forward voltage drop", "The maximum reverse-bias voltage it withstands without avalanche breakdown", "Its switching frequency limit in kHz", "The minimum voltage needed to turn ON"],
      1,
      "PIV is the maximum reverse voltage a rectifier diode can block safely without breaking down.",
    ],
  ],
  EXP_ZENER_REG: [
    [
      "In a Zener shunt voltage regulator, how must the 1N4733A (5.1 V) diode be biased across the load?",
      ["Forward-biased with cathode to GND", "Reverse-biased (cathode to positive rail, anode to GND)", "In series with the AC transformer primary", "Shorted directly across VIN without a series resistor"],
      1,
      "Zener voltage regulation operates in controlled reverse breakdown, so the cathode connects to the positive output node.",
    ],
    [
      "Why is series resistor R_s essential in a Zener shunt regulator?",
      ["To drop excess input voltage (V_in − V_z) and limit Zener current", "To boost V_out above V_in", "To rectify AC into pulsing DC", "To block DC load current"],
      0,
      "Without R_s, connecting a Zener across a voltage source above V_z causes destructive overcurrent.",
    ],
    [
      "Under what condition does a 5.1 V Zener regulator lose regulation?",
      ["When V_in drops below V_z or load current starves Zener current I_z to zero", "Whenever V_in rises from 9 V to 12 V within power limits", "When load resistance RL increases toward open circuit (above minimum I_z)", "When ambient temperature stays at 25°C"],
      0,
      "If V_in < V_z or I_L > I_s, the Zener drops out of reverse breakdown and V_out falls below 5.1 V.",
    ],
  ],
  EXP_BRIDGE_RECT: [
    [
      "With a 50 Hz AC mains input, what is the fundamental ripple frequency at the output of a full-wave bridge rectifier?",
      ["25 Hz", "50 Hz", "100 Hz", "200 Hz"],
      2,
      "Full-wave rectification folds both half-cycles positive, doubling the ripple frequency to 2 × 50 Hz = 100 Hz.",
    ],
    [
      "If the transformer secondary peak voltage is V_m = 16.97 V, why is the filtered DC peak ~15.57 V in a silicon bridge rectifier?",
      ["Two series diodes conduct per half-cycle, dropping ~2 × 0.7 V = 1.4 V", "The capacitor absorbs 1.4 V permanently", "Bridge rectifiers invert 10% of the sine wave", "Transformer turns ratio changes under DC load"],
      0,
      "Each half-cycle sends current through two forward-biased silicon diodes in series, subtracting ~1.4 V.",
    ],
    [
      "According to V_r_pp = I_dc / (2 · f · C), how does increasing the filter capacitor C affect peak-to-peak output ripple?",
      ["Ripple voltage decreases inversely with C", "Ripple voltage increases linearly with C", "Ripple frequency drops to 50 Hz", "Diode PIV doubles"],
      0,
      "Larger reservoir capacitance stores more charge between peaks, reducing ripple amplitude V_r_pp.",
    ],
  ],
  EXP_BJT_CE: [
    [
      "Why is there a 180° phase inversion between input V_in at the Base and output V_out at the Collector in a Common-Emitter amplifier?",
      ["Rising base current increases collector current, increasing drop across R_c and pulling collector voltage down", "Coupling capacitors invert AC sine waves by 180°", "Emitter resistor R_e reverses transistor doping", "The DC power supply oscillates out of phase"],
      0,
      "As v_in rises, i_C increases so v_C = V_CC − i_C·R_c moves downward, producing inverting amplification.",
    ],
    [
      "What is the purpose of emitter bypass capacitor C_e in parallel with R_e?",
      ["To short AC emitter degeneration to ground for high AC gain while preserving DC Q-point stability", "To block DC current from entering the collector", "To double the input impedance to infinity", "To convert Class-A operation into Class-C"],
      0,
      "C_e keeps R_e active at DC for thermal stability while bypassing R_e at AC signal frequencies to boost |A_v|.",
    ],
    [
      "In the voltage-divider bias calculation, if V_e = 1.46 V across R_e = 470 Ω, what is the approximate emitter/collector current?",
      ["0.31 mA", "3.11 mA", "31.1 mA", "14.6 mA"],
      1,
      "I_C ≈ I_E = V_e / R_e = 1.46 V / 470 Ω ≈ 3.11 mA.",
    ],
  ],
  EXP_TRIAC_DIMMER: [
    [
      "What is the primary role of the DB3 DIAC in a BT136 TRIAC AC lamp dimmer?",
      ["To ensure symmetrical gate breakover triggering (~±32 V) on both positive and negative AC half-cycles", "To rectify 230 V AC into pure 5 V DC", "To step down mains frequency from 50 Hz to 10 Hz", "To replace the resistive lamp load"],
      0,
      "The symmetrical DB3 breakover prevents unequal positive/negative triggering, avoiding DC offset and flicker.",
    ],
    [
      "As you increase the dimmer potentiometer R_pot, what happens to the RC charging time and firing angle α?",
      ["RC time constant increases, delaying firing angle α and dimming the lamp", "Firing angle drops toward 0°, making the lamp brighter", "TRIAC stays latched ON permanently", "Mains frequency doubles"],
      0,
      "Larger R slows capacitor charging to ±32 V, increasing delay α and lowering RMS voltage delivered to the load.",
    ],
    [
      "When does a triggered TRIAC naturally turn OFF during an AC half-cycle?",
      ["When the AC load current crosses zero and falls below the TRIAC holding current", "Immediately 10 µs after the DIAC pulse ends", "Only when the physical power plug is pulled", "Every time V_pot exceeds 1 kΩ"],
      0,
      "A TRIAC latches ON after gate triggering until main-terminal current drops below its holding current at the AC zero crossing.",
    ],
  ],
  EXP_555_ASTABLE: [
    [
      "Between what two internal comparator voltage thresholds does the timing capacitor C oscillate in an NE555 astable multivibrator?",
      ["0 V and V_cc", "1/3 V_cc and 2/3 V_cc", "0.7 V and 5.0 V", "1/2 V_cc and V_cc"],
      1,
      "The internal resistive divider sets comparator thresholds at 1/3 V_cc (Trigger Pin 2) and 2/3 V_cc (Threshold Pin 6).",
    ],
    [
      "Why is the standard NE555 astable duty cycle always strictly greater than 50%?",
      ["Capacitor C charges through (R_a + R_b) but discharges only through R_b", "Pin 3 can only sink current, never source", "Pin 5 doubles discharge time automatically", "Because 0.693 × R_b × C exceeds t_high"],
      0,
      "Since R_a + R_b > R_b for any positive R_a, charging time t_high always exceeds discharging time t_low.",
    ],
    [
      "How can you modify the standard NE555 astable circuit to obtain a 50% (or <50%) duty cycle?",
      ["Place a signal diode in parallel with R_b so charging bypasses R_b directly through R_a", "Short Pin 7 directly to V_cc", "Remove the ground wire from Pin 1", "Connect Pin 4 to GND"],
      0,
      "A steering diode across R_b lets C charge only through R_a (if R_a = R_b, t_high ≈ t_low -> ~50% duty cycle).",
    ],
  ],
};

// ============================================================================
// 3. MASTER 75 LABS (DOMAINS A, B, C, D, E)
// ============================================================================
const MASTER_75_QUIZ_BANK: Record<string, [RawQ, RawQ, RawQ]> = {
  // DOMAIN A — Network Analysis
  A01: [
    ["According to Kirchhoff's Voltage Law (KVL), what is the algebraic sum of all voltages around any closed mesh?", ["Equals supply current", "Always zero (Σ V_loop = 0)", "Equals total resistance", "Always positive"], 1, "KVL states that around any closed loop, total potential rises equal total potential drops (Σ V = 0)."],
    ["At a central node where I1 enters and splits into branches I2 and I3, which KCL relation holds?", ["I1 + I2 + I3 = V_s", "I1 = I2 + I3", "I1 = I2 × I3", "I2 = I1 + I3"], 1, "Conservation of charge (KCL) requires incoming current I1 to equal total outgoing current I2 + I3."],
    ["If V = 12 V across R1 = 100 Ω in series with (200 Ω || 300 Ω = 120 Ω), what is total current I1?", ["54.5 mA", "120 mA", "20 mA", "100 mA"], 0, "Total resistance is 100 + 120 = 220 Ω, so I1 = 12 V / 220 Ω = 54.5 mA."],
  ],
  A02: [
    ["When applying the Superposition Theorem to find a single source's contribution, how must other independent voltage sources be deactivated?", ["Replaced by open circuits", "Replaced by short circuits (0 V)", "Doubled in magnitude", "Replaced by 1 kΩ resistors"], 1, "Deactivating an independent voltage source sets V = 0, which corresponds to an ideal short circuit."],
    ["How are independent current sources deactivated during Superposition analysis?", ["Replaced by short circuits", "Replaced by open circuits (0 A)", "Grounded through a diode", "Inverted in polarity"], 1, "Setting an independent current source to I = 0 means zero branch current—an open circuit."],
    ["Why does Superposition NOT apply directly to calculating total resistor power (P ≠ P' + P'')?", ["Because power P = I²R is quadratic (nonlinear) rather than linear", "Because resistors change value with two sources", "Because KCL fails in multi-source circuits", "Because power is measured in Volts"], 0, "Superposition holds only for linear responses (voltage and current), not quadratic quantities like power."],
  ],
  A03: [
    ["How is the Thevenin equivalent resistance R_th determined across load terminals A–B?", ["Divide V_oc by I_sc or look into A–B with all independent sources deactivated", "Add all circuit resistances regardless of topology", "Measure voltage with load connected", "Short terminals A–B and measure V_ab"], 0, "With independent sources turned off (voltage shorted, current opened), R_th is the equivalent resistance seen looking into A–B."],
    ["What relationship converts between a Thevenin equivalent (V_th, R_th) and a Norton equivalent (I_N, R_N)?", ["I_N = V_th / R_th and R_N = R_th", "I_N = V_th × R_th and R_N = 1/R_th", "V_th = I_N / R_th", "R_N = 2 × R_th"], 0, "Source transformation preserves terminal behavior via V_th = I_N · R_th and identical internal resistance R_N = R_th."],
    ["What does the open-circuit voltage V_oc measured across terminals A–B directly equal?", ["Norton current I_N", "Thevenin voltage V_th", "Load power P_L", "Short-circuit current"], 1, "With zero load current drawn across A–B, no voltage drops across R_th, so V_oc = V_th."],
  ],
  A04: [
    ["For a resistive DC Thevenin source (V_th, R_th), what load resistance R_L achieves Maximum Power Transfer?", ["R_L = 0 Ω", "R_L = R_th", "R_L = ∞", "R_L = 0.5 × R_th"], 1, "Maximum power P_max = V_th² / (4 R_th) occurs when load resistance matches source resistance (R_L = R_th)."],
    ["At the Maximum Power Transfer condition (R_L = R_th), what is the power transfer efficiency η?", ["100%", "75%", "50%", "25%"], 2, "Equal resistance in source and load dissipates equal power in each, giving exactly 50% efficiency."],
    ["In an AC circuit with complex source impedance Z_th = R_th + jX_th, what load impedance Z_L maximizes real power transfer?", ["Z_L = R_th + jX_th", "Z_L = R_th − jX_th (complex conjugate match)", "Z_L = 0", "Z_L = jX_th"], 1, "Complex conjugate matching (X_L = −X_th, R_L = R_th) cancels net reactance and maximizes real load power."],
  ],
  A05: [
    ["What is the time constant τ of a series RC circuit?", ["τ = R / C", "τ = R × C", "τ = 1 / (R × C)", "τ = C / R"], 1, "In an RC network, τ = R · C seconds; larger R or C slows capacitor voltage transition."],
    ["Approximately what percentage of its final steady-state value does an RC capacitor reach after 1 time constant (t = τ) from 0 V?", ["36.8%", "50.0%", "63.2%", "99.3%"], 2, "1 − e⁻¹ ≈ 0.6321, meaning 63.2% of the step change occurs in one time constant."],
    ["What is the time constant τ of a series RL circuit?", ["τ = R × L", "τ = L / R", "τ = R / L", "τ = √(LC)"], 1, "Inductor current changes with time constant τ = L / R seconds."],
  ],
  A06: [
    ["In a series RLC transient step response, what determines whether the circuit is underdamped, critically damped, or overdamped?", ["Comparison between damping factor α = R/(2L) and resonant frequency ω₀ = 1/√(LC)", "Only the DC battery voltage", "Only the capacitance unit", "Whether the resistor is carbon or wirewound"], 0, "α < ω₀ gives underdamped ringing, α = ω₀ gives fastest non-oscillatory critical damping, and α > ω₀ is overdamped."],
    [
      "When α = ω₀ in a series RLC circuit, what is the critical damping resistance R_crit?",
      ["R_crit = 2 · √(L / C)", "R_crit = √(L · C)", "R_crit = L / (2C)", "R_crit = 0 Ω"],
      0,
      "Setting R/(2L) = 1/√(LC) yields R_crit = 2√(L/C).",
    ],
    ["At steady-state DC (t → ∞), how do ideal inductors and capacitors behave?", ["Inductor acts as a short circuit; capacitor acts as an open circuit", "Both act as short circuits", "Inductor opens; capacitor shorts", "Both dissipate real power I²R"], 0, "In DC steady state (di/dt = 0, dv/dt = 0), V_L = 0 (short) and I_C = 0 (open)."],
  ],
  A07: [
    ["What is the resonant frequency f₀ of a series or ideal parallel RLC circuit?", ["f₀ = 1 / (2π√(LC))", "f₀ = 2π√(LC)", "f₀ = R / (2πL)", "f₀ = 1 / (2πRC)"], 0, "Resonance occurs when inductive and capacitive reactances cancel (ωL = 1/ωC), giving f₀ = 1/(2π√(LC))."],
    ["At series RLC resonance (f = f₀), what is the net circuit impedance Z and phase angle?", ["Z = R (minimum impedance, purely resistive, 0° phase)", "Z = ∞ (open circuit)", "Z = jωL (90° lagging)", "Z = 1/(jωC) (-90° leading)"], 0, "X_L and X_C cancel completely at f₀, leaving pure real resistance R with unity power factor."],
    ["How are resonant frequency f₀, Quality Factor Q, and -3 dB Bandwidth BW related?", ["BW = f₀ / Q", "BW = f₀ × Q", "Q = BW / f₀", "BW = Q² × f₀"], 0, "Higher Q yields a sharper, narrower frequency passband: BW = f₀ / Q."],
  ],
  A08: [
    ["In Two-Port Z-parameters (Open-Circuit Impedance parameters), how are Z11 and Z21 measured?", ["With output port 2 open-circuited (I2 = 0)", "With output port 2 short-circuited (V2 = 0)", "With input port 1 shorted (V1 = 0)", "With both ports terminated in 50 Ω"], 0, "Z-parameters define V1 = Z11·I1 + Z12·I2 and V2 = Z21·I1 + Z22·I2, so I2 = 0 isolates Z11 and Z21."],
    ["Which condition characterizes a reciprocal two-port passive RLC network in Z-parameters?", ["Z12 = Z21", "Z11 = 0", "Z22 = −Z11", "Z12 = 1/Z21"], 0, "Passive bilateral networks obey reciprocity, giving Z12 = Z21 (and Y12 = Y21)."],
    ["In Y-parameters (Short-Circuit Admittance), what terminal condition is enforced on the opposing port?", ["Short circuit (V = 0)", "Open circuit (I = 0)", "Infinite voltage", "10 A constant current"], 0, "Admittance parameters I = Y·V require shorting the opposite port to zero out its voltage term."],
  ],
  A09: [
    ["In a passive resistive T or Pi attenuator pad, what unit commonly expresses power/voltage attenuation ratio?", ["Decibels (dB) or Nepers (Np)", "Farads (F)", "Henries (H)", "Tesla (T)"], 0, "Attenuation is quantified logarithmically in decibels (20 log₁₀(V_in/V_out)) or Nepers."],
    ["Why are T and Pi attenuator pads designed to match a characteristic impedance Z₀ (e.g., 50 Ω)?", ["To attenuate signal amplitude without introducing impedance mismatch reflections", "To amplify DC gain above 100", "To convert analog waves to binary", "To create infinite bandwidth at resonance"], 0, "Matched pads present Z₀ looking into both ports while delivering exact specified dB attenuation."],
    ["In a symmetric T-pad (series arms R1, shunt arm R2), increasing shunt resistance R2 toward infinity does what to attenuation?", ["Decreases attenuation toward 0 dB (less signal shunted to ground)", "Increases attenuation to infinity", "Shorts the input to ground", "Converts the T-pad into a transformer"], 0, "Removing the shunt path leaves only series elements, reducing signal division."],
  ],
  A10: [
    ["What condition indicates a Wheatstone Bridge is perfectly balanced (zero galvanometer/detector voltage V_ab = 0)?", ["R1 · R4 = R2 · R3 (opposite arm products are equal)", "R1 + R2 = R3 + R4", "All resistors must equal 0 Ω", "Supply voltage is zero"], 0, "Equal divider ratios R1/R2 = R3/R4 ensure identical node potentials across the bridge detector."],
    ["Which bridge topology is specifically suited for measuring audio frequencies or forming an RC sine-wave oscillator?", ["Wien Bridge", "Wheatstone DC resistive bridge", "Kelvin double bridge", "Schottky diode bridge"], 0, "The Wien bridge balances frequency-dependent series-RC and parallel-RC arms at f = 1/(2πRC)."],
    ["Why is a balanced Wheatstone Bridge ideal for reading small ΔR changes from strain gauges?", ["Null-balance eliminates common-mode supply drift and isolates tiny ΔR imbalance linearly", "It operates without any power supply", "It steps up voltage by 1000× passively", "It blocks DC currents completely"], 0, "Bridge differential output starts at 0 V at balance, giving high sensitivity to small ΔR perturbations."],
  ],
  A11: [
    ["What does Millman's Theorem allow you to collapse directly in a parallel-branch circuit?", ["Multiple parallel voltage sources with series impedances into a single equivalent voltage source", "Series inductors into a single diode", "Nonlinear transistors into linear transformers", "Three-phase delta loads into DC batteries"], 0, "Millman's theorem computes the common parallel node voltage V_m = Σ(V_k·Y_k) / Σ(Y_k) in one step."],
    ["What does the Compensation Theorem quantify when a branch resistance R changes by ΔR?", ["The resulting incremental change in every circuit current/voltage via a single compensating voltage source ΔV = I · ΔR", "Maximum AC power efficiency", "Thermocouple Seebeck drift", "Inductive mutual coupling"], 0, "Replacing ΔR with a compensating source I·ΔR isolates exact sensitivity of the network to element tolerances."],
    ["By Millman's theorem, if two equal 10 V sources with identical 100 Ω series resistances are wired in parallel, what is the open-circuit Millman voltage?", ["20 V", "10 V", "5 V", "0 V"], 1, "(10/100 + 10/100) / (1/100 + 1/100) = 10 V, with equivalent resistance 50 Ω."],
  ],
  A12: [
    ["How is the coupling coefficient k related to mutual inductance M and self-inductances L1, L2?", ["k = M / √(L1 · L2) with 0 ≤ k ≤ 1", "k = √(L1 · L2) / M", "k = M · (L1 + L2)", "k = L1 / L2"], 0, "The dimensionless coupling factor k ranges from 0 (no flux linkage) to 1 (ideal tight magnetic coupling)."],
    ["In dot-convention mesh analysis of coupled coils, if currents enter the dotted terminals of both L1 and L2, what is the sign of the induced mutual voltage jωMI relative to self-inductance jωLI?", ["Positive (aiding mutual flux)", "Negative (opposing flux)", "Zero regardless of k", "Purely resistive"], 0, "Currents both entering (or both leaving) dotted terminals produce aiding magnetic fluxes and positive mutual terms."],
    ["An ideal transformer (k = 1) with turns ratio N1:N2 = 1:5 steps a 10 V AC primary voltage to what secondary voltage?", ["2 V AC", "50 V AC", "10 V AC", "250 V AC"], 1, "V2 / V1 = N2 / N1 -> V2 = 10 × 5 = 50 V AC."],
  ],
  A13: [
    ["Which two-port parameter representation is simplest for finding the overall matrix of two cascaded networks (Port 2 of A into Port 1 of B)?", ["ABCD (Transmission) parameters — simply multiply matrices [T] = [T_A] · [T_B]", "Z-parameters — multiply Z matrices", "Y-parameters — invert every term", "h-parameters — subtract matrices"], 0, "Transmission [ABCD] parameters map input (V1, I1) directly to output (V2, −I2), so cascading corresponds to matrix multiplication."],
    ["To combine two two-port networks in parallel-parallel connection, which parameter matrices add element-wise?", ["Y-parameters ([Y_total] = [Y_A] + [Y_B])", "Z-parameters", "ABCD parameters", "Thermal impedance parameters"], 0, "Parallel ports share common voltages and sum terminal currents, so Y-matrices add directly."],
    ["To combine two two-port networks in series-series connection, which parameter matrices add directly?", ["Z-parameters ([Z_total] = [Z_A] + [Z_B])", "Y-parameters", "ABCD parameters", "S-parameters"], 0, "Series-connected ports share common currents and sum port voltages, so Z-matrices add directly."],
  ],
  A14: [
    ["Which SPICE simulation directive computes the DC steady-state node voltages and branch currents of a linear network?", [".op (Operating Point)", ".tran (Transient)", ".ac (AC Frequency Sweep)", ".noise"], 0, "`.op` solves Modified Nodal Analysis (MNA) at DC to report every node voltage and source current."],
    ["In LTSpice/Multisim, what error occurs if a circuit schematic has no Ground (node 0) reference?", ["Singular matrix / floating circuit error — MNA solver requires node 0 reference", "Resistors automatically change to 0 Ω", "AC frequency doubles", "Capacitors turn into inductors"], 0, "SPICE nodal matrices define all potentials relative to reference node 0 (GND); omitting GND makes the matrix singular."],
    ["Which SPICE directive sweeps an input voltage source VS1 from 0 V to 20 V in 2 V steps?", [".dc VS1 0 20 2", ".ac dec 10 1 1k", ".tran 10ms", ".step temp 0 50"], 0, "`.dc <source> <start> <stop> <step>` steps a DC source and logs the transfer curve."],
  ],
  A15: [
    ["In frequency-domain pole-zero analysis of a transfer function H(s), what guarantees a linear circuit is BIBO stable?", ["All poles lie strictly in the Left Half of the s-plane (Re(s) < 0)", "All zeros lie on the right half-plane", "At least one pole lies at s = +5", "Poles outnumber zeros by three"], 0, "Poles with negative real parts produce decaying exponentials e^(−σt), ensuring bounded-input bounded-output stability."],
    ["In a Bode magnitude plot, what is the asymptotic high-frequency roll-off slope of a single-pole first-order low-pass filter?", ["−20 dB/decade (−6 dB/octave)", "−40 dB/decade", "+20 dB/decade", "0 dB/decade"], 0, "Each single real pole contributes −20 dB/decade slope above its cutoff frequency ω_c."],
    ["What is the phase shift of a first-order RC low-pass filter exactly at its −3 dB cutoff frequency f_c = 1/(2πRC)?", ["0°", "−45°", "−90°", "−180°"], 1, "At ω = 1/(RC), angle(1 / (1 + j1)) = −arctan(1) = −45°."],
  ],

  // DOMAIN B — Linear Integrated Circuits (Op-Amps & Timers)
  B01: [
    ["What is the closed-loop voltage gain of an ideal Inverting Op-Amp with R_in = 10 kΩ and R_f = 100 kΩ?", ["+10", "−10", "+11", "−11"], 1, "Inverting gain A_v = −R_f / R_in = −100k / 10k = −10."],
    ["What is the closed-loop voltage gain of a Non-Inverting Op-Amp with R1 = 10 kΩ (to GND) and R_f = 90 kΩ?", ["+9", "+10", "−9", "+1"], 1, "Non-inverting gain A_v = 1 + R_f / R1 = 1 + 90k / 10k = +10."],
    ["What makes a Voltage Follower (unity-gain buffer) valuable when interfacing high-impedance sensors?", ["Very high input impedance (~MΩ–TΩ) and very low output impedance with A_v = +1", "It amplifies sensor voltage by 100×", "It inverts phase by 180°", "It eliminates DC offset completely"], 0, "A unity-gain buffer prevents sensor loading while driving downstream low-impedance stages cleanly."],
  ],
  B02: [
    ["In an inverting op-amp summing amplifier (all input resistors equal to R_f), what is V_out for inputs V1, V2, V3?", ["V_out = V1 + V2 + V3", "V_out = −(V1 + V2 + V3)", "V_out = (V1 + V2 + V3)/3", "V_out = V1 − V2"], 1, "Because the inverting node sits at virtual ground, branch currents sum cleanly: V_out = −(V1 + V2 + V3)."],
    ["How does an op-amp Difference (Subtractor) Amplifier reject common-mode noise present equally on both inputs?", ["By using matched resistor ratios so V_out ∝ (V2 − V1)", "By rectifying the noise with a Zener diode", "By shorting non-inverting input to −15 V", "By operating open-loop without feedback"], 0, "When R_f/R_in ratios match on both inputs, equal voltages cancel out (high CMRR)."],
    ["What happens to op-amp output voltage if the computed ideal output exceeds the ±15 V supply rails?", ["The output saturates/clips near ±(V_supply − 1 to 2 V)", "The output rises linearly to ±50 V", "The feedback resistor changes value", "Input virtual ground rises to +15 V"], 0, "Active amplifier output swing is bounded by its DC power supply rails."],
  ],
  B03: [
    ["If a constant positive DC voltage is applied to an ideal inverting op-amp Integrator, what waveform appears at the output?", ["A negative-going linear voltage ramp (until saturation)", "A high-frequency sine wave", "Zero volts DC", "Positive exponential spikes"], 0, "Integrating a positive constant −(1/RC)∫V_in dt produces a linear negative slope −(V_in/(RC))·t."],
    ["Why is a large bleed resistor R_f placed in parallel with the feedback capacitor in a practical op-amp integrator?", ["To limit DC gain and prevent tiny input offset voltage from driving the output into saturation", "To turn the integrator into a comparator", "To double the integration frequency", "To eliminate the input resistor"], 0, "Without DC feedback via R_f, capacitor impedance approaches ∞ at DC, integrating tiny offset currents until saturation."],
    ["What output waveform is produced when a symmetric triangle wave enters an op-amp Differentiator?", ["Square wave", "Sine wave", "Sawtooth ramp", "Flat DC zero"], 0, "The derivative of constant positive and negative linear slopes is alternating negative and positive constant levels—a square wave."],
  ],
  B04: [
    ["Why is a 3-Op-Amp Instrumentation Amplifier preferred over a single-op-amp subtractor for strain gauges or ECG sensors?", ["It provides ultra-high, matched input impedance on BOTH differential inputs and single-resistor gain adjustment (R_G)", "It requires no power supply", "It converts analog millivolts into USB packets", "It eliminates all need for CMRR"], 0, "Two input buffer op-amps prevent unequal loading of sensitive bridge sensors while preserving high CMRR."],
    ["In the standard 3-op-amp instrumentation amplifier, increasing gain resistor R_G toward infinity does what to the gain?", ["Reduces the first-stage differential gain toward unity (1)", "Drives gain toward infinity", "Inverts output polarity", "Shorts both inputs together"], 0, "Differential gain is A_v = (1 + 2R1/R_G)·(R3/R2), so larger R_G lowers gain."],
    ["What does a high Common-Mode Rejection Ratio (CMRR) measure in an instrumentation amplifier?", ["Its ability to amplify tiny differential signals while rejecting 50/60 Hz interference common to both leads", "Its maximum output current in amperes", "Its slew rate in V/µs", "Its supply voltage ripple"], 0, "CMRR = 20 log₁₀(A_d / A_cm) quantifies rejection of common-mode interference."],
  ],
  B05: [
    ["How does a Sallen-Key second-order active low-pass filter improve on a simple single-stage RC filter?", ["It achieves −40 dB/decade stopband roll-off and programmable Q peaking without bulky inductors", "It operates passively without op-amp power", "It amplifies DC by 1000× automatically", "It converts low-pass to notch automatically"], 0, "Two reactive RC stages plus positive feedback create a sharp 2nd-order −40 dB/dec Butterworth/Chebyshev response."],
    ["What type of active filter selectively attenuates a single narrow interference band (e.g., 50 Hz mains hum) while passing all other frequencies?", ["Notch (Band-Reject) Filter", "All-Pass Filter", "High-Pass Filter", "Unity Buffer"], 0, "A Twin-T or state-variable notch filter produces a deep attenuation dip at f_notch."],
    ["What limits the maximum useful cutoff frequency of an op-amp active filter?", ["The op-amp's Gain-Bandwidth Product (GBW) and Slew Rate", "Only the resistor tolerance", "The breadboard color", "DC offset voltage alone"], 0, "At high frequencies approaching GBW, finite open-loop op-amp gain distorts the filter pole locations."],
  ],
  B06: [
    ["Why cannot a standard passive 1N4007 diode rectify a 100 mV peak AC sensor signal?", ["The 100 mV signal is below the ~0.7 V silicon diode forward threshold", "1N4007 blocks positive voltages", "Passive diodes only work above 1 MHz", "Resistors cancel 100 mV signals"], 0, "A passive silicon diode remains cutoff for |V_in| < 0.7 V; placing it inside an op-amp feedback loop reduces effective threshold to 0.7V / A_OL ≈ µV."],
    ["In a precision half-wave op-amp rectifier, where is the diode placed to eliminate the 0.7 V dead-zone?", ["Inside the op-amp's negative feedback loop", "Directly across the ±15 V power pins", "In series with the non-inverting input", "Connected to Pin 5 offset null"], 0, "High open-loop op-amp gain drives its output +0.7 V ahead instantaneously to cancel the diode drop at the load node."],
    ["What happens on the non-conducting half-cycle in an improved 2-diode precision half-wave rectifier?", ["A second clamp diode keeps the op-amp feedback closed so the op-amp never saturates, enabling faster recovery", "The op-amp enters thermal shutdown", "Output jumps to +15 V", "Both diodes conduct simultaneously"], 0, "Preventing op-amp rail saturation removes slew-rate recovery glitches at higher frequencies."],
  ],
  B07: [
    ["How does a series or shunt diode Clipper (limiter) circuit shape an AC waveform?", ["It slices off signal excursions above or below a preset DC/diode reference threshold", "It shifts the entire AC waveform vertically without changing peak-to-peak amplitude", "It converts square waves into pure sine waves", "It doubles input RMS voltage"], 0, "Clippers truncate peaks beyond ±V_ref while passing the rest of the signal."],
    ["What distinguishes a Clamper (DC restorer) circuit from a Clipper?", ["A Clamper uses a series capacitor + shunt diode to shift the DC baseline while preserving full peak-to-peak shape", "A Clamper removes all AC components completely", "A Clamper uses an inductor to double frequency", "A Clamper requires an op-amp comparator"], 0, "The capacitor charges to peak voltage and offsets the entire waveform up or down (e.g., clamping negative peak to 0 V)."],
    ["In a Peak Detector circuit, what keeps the holding capacitor from discharging rapidly between signal peaks?", ["The unidirectional diode blocks reverse discharge into the source, backed by a high-impedance buffer", "A 10 Ω bleed resistor across the capacitor", "A short circuit to ground", "AC transformer coupling"], 0, "The diode allows charging on positive peaks and isolates the capacitor afterward so it holds peak voltage."],
  ],
  B08: [
    ["Why is positive feedback (hysteresis) added to convert a plain Zero-Crossing Detector into a Schmitt Trigger?", ["To prevent noisy input chatter near the threshold from causing multiple false output transitions", "To make output transitions 10× slower", "To reduce op-amp gain to 0.5", "To convert square waves to DC"], 0, "Separate Upper (V_UTP) and Lower (V_LTP) trigger thresholds make the comparator immune to noise smaller than the hysteresis band."],
    ["In an inverting op-amp Schmitt Trigger powered by ±12 V (V_sat = ±11 V) with R1 = 10 kΩ to GND and R2 = 100 kΩ feedback, what are ±V_TH?", ["±1.0 V", "±11.0 V", "±5.5 V", "±0.1 V"], 0, "V_TH = ±V_sat · R1 / (R1 + R2) = ±11 · 10k / 110k = ±1.0 V."],
    ["What causes an op-amp used as an open-loop comparator to behave sluggishly compared to a dedicated comparator IC like LM311?", ["Internal frequency compensation capacitor limits op-amp slew rate and rail-recovery speed", "Op-amps lack differential inputs", "LM311 operates without a ground pin", "Op-amps have higher input resistance"], 0, "General-purpose op-amps (like 741) have internal Miller compensation (~0.5 V/µs slew rate), making them slower than uncompensated comparators."],
  ],
  B09: [
    ["Which two op-amp building blocks cascade in a closed loop to synthesize simultaneous Square and Triangle waves?", ["A Schmitt Trigger (comparator with hysteresis) driving an Integrator", "A Voltage Follower driving a Notch Filter", "Two Inverting Amplifiers in parallel", "A Precision Rectifier driving a Differentiator"], 0, "The Schmitt Trigger outputs a constant square level, which the Integrator converts into a linear triangle ramp back to the trigger thresholds."],
    ["In a Square/Triangle waveform generator, how does decreasing the integrator RC time constant affect oscillation frequency?", ["Frequency increases proportionally (1 / (RC))", "Frequency decreases to zero", "Triangle amplitude doubles", "Square wave becomes sinusoidal"], 0, "Smaller RC charges the integrator faster between hysteresis thresholds, shortening period T and raising frequency."],
    ["What sets the peak-to-peak amplitude of the Triangle wave output in this 2-op-amp generator?", ["The Schmitt Trigger upper and lower hysteresis thresholds (±V_UTP / V_LTP)", "Only the input capacitor ESR", "The 741 pin-5 offset potentiometer", "The oscilloscope timebase"], 0, "As soon as the triangle ramp hits ±V_TH, the comparator flips sign and reverses the ramp direction."],
  ],
  B10: [
    ["What two Barkhausen Criteria must be satisfied for sustained sinusoidal oscillation?", ["Loop gain |Aβ| = 1 and total loop phase shift = 0° (or 360°n)", "Loop gain = 0 and phase = 90°", "Open-loop gain = 1 and phase = 180°", "Negative input resistance only"], 0, "Unity loop gain with integer-2π phase shift sustains steady oscillation without growing into clipping or decaying."],
    ["What is the oscillation frequency of a Wien Bridge oscillator using matched R and C arms?", ["f₀ = 1 / (2πRC)", "f₀ = 1 / (2π√6 RC)", "f₀ = 1.44 / (3RC)", "f₀ = R / (2πL)"], 0, "At f₀ = 1/(2πRC), the Wien lead-lag network exhibits 0° phase shift and β = 1/3 (requiring non-inverting gain 3)."],
    ["Why does a 3-stage RC Phase Shift oscillator require an inverting amplifier with minimum gain |A_v| ≥ 29?", ["Each RC section shifts 60° (total 180° + 180° inverter = 360°) with total attenuation β = 1/29", "Because 29 is the silicon breakdown voltage", "Because 3 RC stages multiply voltage by 29", "To match a 29 Ω loudspeaker"], 0, "At f = 1/(2π√6 RC), the 3-rung RC ladder has β = 1/29, so |A_v| = 29 satisfies |Aβ| = 1."],
  ],
  B11: [
    ["What are the three core functional blocks inside an LM565 Phase-Locked Loop (PLL)?", ["Phase Detector, Low-Pass Loop Filter, and Voltage-Controlled Oscillator (VCO)", "Half-wave Rectifier, Transformer, and Zener Diode", "ALU, Program Counter, and SRAM", "Step-Up Inductor, MOSFET, and Flyback Diode"], 0, "The phase detector compares input vs. VCO phase, the LPF extracts DC error voltage, and the error steers VCO frequency until locked."],
    ["What defines the 'Lock Range' versus the 'Capture Range' of a PLL?", ["Lock Range is the frequency band over which an already-locked PLL tracks input drift; Capture Range is the narrower band where an unlocked PLL can acquire lock", "Capture Range is always wider than Lock Range", "Both terms refer to supply voltage limits", "Lock Range applies only to DC signals"], 0, "Loop filter attenuation narrows the Capture Range inside the wider Lock Range."],
    ["How does a PLL perform FM demodulation cleanly?", ["The LPF control voltage driving the VCO tracks instantaneous input frequency variations directly as the demodulated signal", "It clips the FM carrier into a DC battery", "It converts FM into I2C serial frames", "It blocks all frequencies above 10 Hz"], 0, "When locked, VCO control voltage is linearly proportional to input carrier frequency deviation."],
  ],
  B12: [
    ["What internal voltage reference does an LM723 precision voltage regulator IC typically provide?", ["~7.15 V temperature-compensated Zener reference", "1.00 V", "15.0 V", "0.70 V"], 0, "The LM723 includes an accurate ~7.15 V internal V_ref and error amplifier supporting programmable series pass regulation."],
    ["In an op-amp series voltage regulator, what role does the external NPN pass transistor play?", ["Boosts output load current capacity beyond the op-amp's ~20 mA limit inside the feedback loop", "Replaces the Zener reference", "Rectifies AC mains directly", "Oscillates at 100 kHz"], 0, "Placed inside the op-amp feedback loop, the pass transistor supplies amperes of load current while V_out stays regulated."],
    ["In an NE555 Monostable (one-shot) timer, what triggers the fixed output pulse of width T = 1.1 · R · C?", ["A brief negative-going pulse dropping Pin 2 (Trigger) below 1/3 V_cc", "Connecting Pin 6 to GND permanently", "Raising Pin 8 above 25 V", "Removing the timing capacitor"], 0, "Pulling Pin 2 below 1/3 V_cc sets the internal flip-flop HIGH until C charges up to 2/3 V_cc."],
  ],
  B13: [
    ["Which semiconductor relationship enables an op-amp Logarithmic Amplifier (diode/BJT in feedback)?", ["Exponential Shockley/Ebers-Moll relation I_c ≈ I_s · e^(V_be / V_T)", "Ohm's linear law V = I·R", "Capacitive charge Q = C·V", "Inductive flux Φ = L·I"], 0, "Placing a BJT/diode in feedback solves V_out = −V_T·ln(V_in / (I_s·R_in))."],
    ["How can two Log Amplifiers, a Summing Amplifier, and an Antilog Amplifier multiply two analog voltages V_x · V_y?", ["Because log(V_x · V_y) = log(V_x) + log(V_y), and taking the antilog yields the product", "By connecting two resistors in parallel", "By dividing V_x by frequency", "By cascading two voltage followers"], 0, "Log-sum-antilog architecture converts multiplication into simple analog addition."],
    ["Why is a matched dual transistor array (or temperature compensation resistor) critical in practical log/antilog circuits?", ["Because both I_s and thermal voltage V_T = kT/q drift strongly with temperature", "To double supply voltage to ±30 V", "To reduce input resistance below 1 Ω", "To convert DC to AC"], 0, "Reverse saturation current I_s roughly doubles every 10°C, requiring matched-pair cancellation."],
  ],
  B14: [
    ["In NI Multisim / SPICE, which virtual instrument plots gain (dB) and phase (degrees) versus logarithmic frequency for an active filter?", ["Bode Plotter (XBP1) via AC Analysis", "DC Digital Multimeter", "Word Generator", "Wattmeter"], 0, "The Bode Plotter sweeps frequency logarithmically to reveal cutoff (−3 dB), passband ripple, and phase shift."],
    ["For a 2nd-order Butterworth low-pass filter, what is the passband response and roll-off rate?", ["Maximally flat passband magnitude and −40 dB/decade roll-off", "Deep notch at cutoff and −6 dB/decade", "3 dB passband ripple and −20 dB/decade", "Gain rises infinitely at f_c"], 0, "Butterworth poles yield maximally flat magnitude in the passband with 20n = 40 dB/dec attenuation."],
    ["When verifying a filter cutoff frequency f_c in Multisim AC sweep, what magnitude drop defines f_c relative to passband gain?", ["−3.01 dB (0.707 × passband voltage)", "−20 dB (0.1 × passband voltage)", "−60 dB", "0 dB"], 0, "Half-power cutoff occurs where voltage gain drops by 1/√2 ≈ −3.01 dB."],
  ],
  B15: [
    ["How is an op-amp's Slew Rate (SR = ΔV_out / Δt) measured on a transient step response?", ["Drive a large fast input step in unity-gain follower mode and measure the maximum slope (V/µs) of the output edge", "Apply a 1 mV DC voltage and read the current", "Measure phase margin at 1 Hz", "Short output to ground"], 0, "Large-signal step excitation forces internal stage current-limiting, exposing the linear slew-rate ramp."],
    ["In a Bode stability test, what defines an op-amp feedback circuit's Phase Margin?", ["180° + phase angle of loop gain Aβ at the unity-gain crossover frequency (|Aβ| = 0 dB)", "Total DC supply voltage", "Ratio of R_f to R_in", "Cutoff frequency minus 50 Hz"], 0, "Positive phase margin (typically > 45°) guarantees stable, non-oscillatory closed-loop step response."],
    ["What happens to a unity-gain op-amp follower when a heavy capacitive load reduces Phase Margin near 0°?", ["Severe overshoot/ringing or sustained high-frequency oscillation", "Output drops cleanly to 0 V DC", "Slew rate increases by 10×", "Input bias current becomes zero"], 0, "Load capacitance adds an extra lag pole with op-amp R_out, eroding phase margin toward instability."],
  ],

  // DOMAIN C — Digital Logic Design (DLD)
  C01: [
    ["Which pair of logic gates are known as Universal Gates because any Boolean function can be built solely from either one?", ["AND and OR", "NAND and NOR", "XOR and XNOR", "Buffer and NOT"], 1, "Both NAND and NOR are functionally complete; inverters, ANDs, and ORs can all be synthesized from them."],
    ["For a 2-input XOR gate, when is the output HIGH (1)?", ["Whenever both inputs are identical", "Whenever the two inputs differ (A ≠ B)", "Only when both inputs are 1", "Only when A = 0 and B = 0"], 1, "XOR computes A ⊕ B = A'B + AB', outputting 1 strictly for odd parity (differing inputs)."],
    ["According to De Morgan's First Theorem, (A · B)' is logically equivalent to:", ["A' · B'", "A' + B'", "A + B", "(A + B)'"], 1, "Breaking the bar over an AND gate flips it to an OR of inverted inputs: (AB)' = A' + B'."],
  ],
  C02: [
    ["What two gates form a standard Half Adder with inputs A and B?", ["XOR gate for Sum (A ⊕ B) and AND gate for Carry (A · B)", "OR gate for Sum and NAND for Carry", "XNOR for Sum and NOR for Carry", "AND for Sum and XOR for Carry"], 0, "A Half Adder produces Sum = A ⊕ B and Carry = A·B without a carry-in input."],
    ["How many inputs and outputs does a 1-bit Full Adder have?", ["2 inputs, 1 output", "3 inputs (A, B, C_in) and 2 outputs (Sum, C_out)", "4 inputs, 4 outputs", "3 inputs, 1 output"], 1, "A Full Adder adds A + B + C_in to produce Sum and C_out."],
    ["In a Half Subtractor computing (A − B), what Boolean expression gives the Borrow-out?", ["A · B", "A' · B", "A ⊕ B", "A + B'"], 1, "Borrow is needed only when subtracting 1 from 0 (A = 0, B = 1), giving Borrow = A'·B."],
  ],
  C03: [
    ["How does a 4-bit Binary Adder/Subtractor (using 74LS83 + XOR gates) switch from Addition (A + B) to Subtraction (A − B)?", ["By asserting control line M = 1 to invert B via XOR gates and setting C_in = 1 (forming 2's complement)", "By grounding all B inputs", "By swapping Sum outputs with C_in", "By disconnecting VCC from the adder"], 0, "Setting M = 1 computes B ⊕ 1 = B' and adds C_in = 1, yielding A + B' + 1 = A − B."],
    ["In a 4-bit BCD Adder, when must correction value 0110 (+6) be added to the 4-bit binary sum?", ["Whenever the binary sum exceeds 9 (1001) or produces a Carry-out (K = 1)", "Whenever the sum is even", "Always on every clock cycle", "Only when both inputs are zero"], 0, "Invalid BCD codes 10–15 and carry-out sums 16–19 skip the 6 unused 4-bit states by adding 6 (0110)."],
    ["What limits the speed of a multi-bit Ripple-Carry Adder compared to a Carry-Lookahead Adder?", ["Each stage must wait for the carry bit to propagate sequentially from LSB to MSB", "Ripple adders use analog op-amps", "Carry-Lookahead adders have no XOR gates", "Ripple adders cannot add odd numbers"], 0, "Carry propagation delay scales linearly O(n) in a ripple-carry chain."],
  ],
  C04: [
    ["What key property makes Gray Code essential for rotary encoders and clock-domain crossings?", ["Adjacent numbers differ in only ONE bit position, preventing multi-bit transition glitches", "It represents negative numbers directly", "Each digit takes 8 bits", "It automatically corrects double-bit errors"], 0, "Single-bit adjacency ensures a misaligned read between adjacent states only yields one of the two neighboring values."],
    ["How do you convert a Binary number B₃B₂B₁B₀ into Gray Code G₃G₂G₁G₀?", ["G₃ = B₃, and G_i = B_{i+1} ⊕ B_i for lower bits", "Add 0011 to every nibble", "Invert all bits and add 1", "Reverse the bit order"], 0, "Each Gray bit (except MSB) is the XOR of adjacent binary bits."],
    ["How is an 8421 BCD digit converted into Excess-3 code?", ["Add binary 0011 (decimal 3) to the BCD digit", "Subtract 3 from each bit", "XOR with 1111", "Shift left by two bits"], 0, "Excess-3 shifts BCD codes up by +3, making the code self-complementing for 9's complement arithmetic."],
  ],
  C05: [
    ["How many select lines does a 16-to-1 Multiplexer (MUX) require?", ["2 select lines", "4 select lines (2⁴ = 16)", "8 select lines", "16 select lines"], 1, "n select lines address 2ⁿ data inputs; 2⁴ = 16 requires 4 select inputs."],
    ["What is the key advantage of a Priority Encoder over a standard binary encoder?", ["If multiple inputs are active simultaneously, it encodes the highest-priority active input cleanly", "It amplifies analog voltages", "It stores 8 bits in flip-flops", "It converts Gray code to BCD"], 0, "Standard encoders fail on simultaneous active inputs, whereas priority encoders assign a deterministic precedence order."],
    ["How can a 3-to-8 Decoder + OR gate implement any 3-variable Boolean SOP function?", ["OR together the decoder minterm outputs corresponding to the function's 1s", "Wire all outputs to GND", "Replace the OR gate with an XOR of VCC", "Leave enable pins floating"], 0, "An n-to-2ⁿ active-HIGH decoder generates all 2ⁿ minterms directly."],
  ],
  C06: [
    ["In a 1-bit Magnitude Comparator, what Boolean expression asserts A = B?", ["A ⊕ B (XOR)", "(A ⊕ B)' (XNOR: A·B + A'·B')", "A · B'", "A + B"], 1, "Two single bits are equal when both are 0 or both are 1, which is the XNOR operation."],
    ["When cascading 4-bit comparators (e.g., 74LS85) to build an 8-bit comparator, where do the outputs of the lower 4-bit stage connect?", ["To the cascade inputs (A>B_in, A=B_in, A<B_in) of the upper 4-bit comparator", "To the clock input", "To VCC directly", "To the MSB data pins"], 0, "Higher-order bits dominate comparison unless equal, in which case the upper chip forwards the lower chip's cascade inputs."],
    ["For 2-bit numbers A = 10₂ and B = 01₂, which comparator output is HIGH?", ["A > B (2 > 1)", "A = B", "A < B", "Both A > B and A = B"], 0, "Comparing from MSB downward: A₁ = 1 > B₁ = 0 immediately resolves A > B."],
  ],
  C07: [
    ["What forbidden input condition exists in an active-HIGH SR latch/flip-flop, and how does JK flip-flop resolve it?", ["S = 1, R = 1 is invalid; J = 1, K = 1 cleanly toggles Q on the clock edge", "S = 0, R = 0 is invalid", "D = 1 is invalid", "Clock = 1 destroys the latch"], 0, "Cross-coupled feedback in a JK flip-flop turns the indeterminate 1,1 state into deterministic toggling (Q_next = Q')."],
    ["What is the characteristic equation of a D Flip-Flop?", ["Q_next = D", "Q_next = D'", "Q_next = D ⊕ Q", "Q_next = Q + D"], 0, "A D (Data/Delay) flip-flop transfers input D directly to Q on the active clock edge."],
    ["In a T (Toggle) flip-flop excitation table, what T input is needed to transition from Q = 1 to Q_next = 0?", ["T = 0", "T = 1", "T = X (don't care)", "T = Clock"], 1, "Since output changes state (1 -> 0), toggle must be asserted (T = 1)."],
  ],
  C08: [
    ["What distinguishes a Synchronous Counter from an Asynchronous (Ripple) Counter?", ["All flip-flops in a synchronous counter share a common clock edge simultaneously, eliminating cumulative ripple skew", "Synchronous counters need no flip-flops", "Asynchronous counters count faster with zero delay", "Synchronous counters only count up to 3"], 0, "Common clocking avoids ripple propagation accumulation and decoding glitches."],
    ["How many flip-flops are minimum required to construct a Mod-10 (Decade) counter?", ["3 flip-flops (max 8 states)", "4 flip-flops (2⁴ = 16 ≥ 10)", "5 flip-flops", "10 flip-flops"], 1, "n flip-flops support up to 2ⁿ states; 2³ = 8 < 10, so 4 flip-flops are needed."],
    ["If a 16 MHz clock feeds a 4-bit binary counter (Mod-16), what is the frequency at the MSB output Q₃?", ["8 MHz", "4 MHz", "1 MHz", "16 kHz"], 2, "Each flip-flop stage divides frequency by 2; 4 stages divide by 2⁴ = 16 -> 16 MHz / 16 = 1 MHz."],
  ],
  C09: [
    ["Which shift register mode accepts serial bits one per clock cycle and outputs all N bits simultaneously once loaded?", ["SIPO (Serial-In, Parallel-Out)", "SISO", "PISO", "PIPO"], 0, "SIPO is widely used for serial-to-parallel I/O expansion (e.g., 74HC595 driving LEDs)."],
    ["How many clock pulses are needed to serially shift an 8-bit byte completely into an 8-bit SISO shift register?", ["1 clock pulse", "4 clock pulses", "8 clock pulses", "16 clock pulses"], 2, "Each clock edge shifts data one flip-flop position, requiring 8 clocks for 8 bits."],
    ["Which control capabilities must a 4-bit Universal Shift Register (like 74LS194) support?", ["Hold, Shift Left, Shift Right, and Parallel Load", "Addition and Multiplication only", "Analog integration", "I2C clock stretching"], 0, "Two mode select inputs (S1, S0) choose among all 4 register operations."],
  ],
  C10: [
    ["With 4 flip-flops, how many unique states does a standard Ring Counter have versus a Johnson (Twisted-Ring) Counter?", ["Ring = 4 states; Johnson = 8 states (2n)", "Ring = 16 states; Johnson = 4 states", "Both have 16 states", "Ring = 8 states; Johnson = 4 states"], 0, "A Ring counter circulates a single 1 across n stages (n states); a Johnson counter feeds Q'_last back to D₀ (2n states)."],
    ["Why are Johnson counter outputs easy to decode with simple 2-input AND gates without glitches?", ["Adjacent states differ in only 1 bit (Gray-like unit-distance sequence)", "They run asynchronously without clocks", "They use floating-point arithmetic", "All flip-flops toggle every cycle"], 0, "Only one bit flips per clock edge, guaranteeing glitch-free 2-input state decoding."],
    ["What happens if a Ring Counter powers up in the all-zeros state (0000) without self-correcting preset logic?", ["It stays locked in 0000 forever unless initialized or self-corrected", "It immediately jumps to 1111", "It counts down normally", "It doubles clock frequency"], 0, "Shifting 0 into a closed ring of 0s produces no 1s unless Preset/Clear or NOR feedback initializes a bit."],
  ],
  C11: [
    ["What is the fundamental difference between a Moore FSM and a Mealy FSM?", ["Moore outputs depend ONLY on current state; Mealy outputs depend on BOTH current state and current inputs", "Mealy machines have no flip-flops", "Moore machines cannot detect sequences", "Mealy outputs can never glitch on input changes"], 0, "Because Mealy outputs depend directly on inputs, they can react in the same cycle and often use fewer states."],
    ["When designing an overlapping '1011' sequence detector, what happens immediately after '1011' is detected?", ["The trailing '1' is reused as the potential first bit of the next '1011' sequence", "The machine ignores the next 4 bits", "The clock stops", "The output stays permanently 1"], 0, "Overlapping FSMs transition to the partial-match state matching the suffix just observed."],
    ["For a 6-state FSM encoded in compact binary, how many state flip-flops are required?", ["2 flip-flops", "3 flip-flops (2³ = 8 ≥ 6)", "6 flip-flops (for compact binary)", "1 flip-flop"], 1, "Binary encoding requires ⌈log₂(6)⌉ = 3 flip-flops (whereas one-hot would use 6)."],
  ],
  C12: [
    ["In a 4-bit ALU (like 74181), what signals select between arithmetic operations (ADD/SUB) and logic operations (AND/OR/XOR)?", ["Mode input M and function select lines S₃..S₀", "Only VCC and GND", "An external 555 timer", "The carry-out flag C4"], 0, "Mode bit M disables internal carry chains for pure bitwise logic or enables them for arithmetic."],
    ["What is the primary distinction between RAM and ROM in digital systems?", ["RAM is volatile read/write working memory; ROM is non-volatile read-only storage retaining firmware without power", "ROM is faster and loses data when unplugged", "RAM cannot store binary addresses", "ROM requires constant refresh every millisecond"], 0, "SRAM/DRAM retain data only while powered, whereas ROM preserves boot/lookup contents across power cycles."],
    ["How many address lines are needed to address a 4K × 8 memory chip (4096 bytes)?", ["8 address lines", "10 address lines", "12 address lines (2¹² = 4096)", "16 address lines"], 2, "2¹² = 4096 unique memory locations require 12 address bits (A₀–A₁₁)."],
  ],
  C13: [
    ["In an R-2R Ladder DAC, why are only two resistor values (R and 2R) used instead of binary-weighted resistors?", ["It avoids huge precision resistor ratios for higher bit counts (e.g., 8–16 bits) and keeps consistent output impedance", "It converts digital bits into AC frequency", "It requires zero reference voltage", "It eliminates op-amp buffering completely"], 0, "Binary-weighted DACs require 2ⁿ:1 resistor spreads that drift thermally; R-2R ladders scale cleanly with matched R/2R pairs."],
    ["For an 8-bit DAC with V_ref = 5.0 V, what is the LSB step resolution (1 LSB)?", ["5.0 V / 256 ≈ 19.53 mV", "5.0 V / 8 = 0.625 V", "5.0 V / 4096 ≈ 1.22 mV", "1.0 V"], 0, "Resolution per code step is V_ref / 2ⁿ (or V_FS / (2ⁿ − 1)) ≈ 19.5–19.6 mV."],
    ["Which ADC architecture uses a binary-search DAC loop to complete an N-bit conversion in exactly N clock cycles?", ["Successive Approximation Register (SAR) ADC", "Flash (Parallel) ADC", "Dual-Slope Integrating ADC", "Delta-Sigma 1-bit oversampling ADC"], 0, "A SAR ADC resolves one bit per clock from MSB to LSB via binary search."],
  ],
  C14: [
    ["In Verilog HDL, what is the crucial difference between `assign` (continuous) and `always @(*)` combinational vs. `always @(posedge clk)`?", ["`always @(posedge clk)` infers edge-triggered flip-flops; `assign` and `always @(*)` describe combinational logic", "Verilog cannot synthesize flip-flops", "`assign` delays every signal by 10 clock cycles", "`always @(posedge clk)` removes all wires"], 0, "Edge-sensitive `always` blocks synthesize sequential registers, whereas continuous/combinational blocks map to LUTs."],
    ["In FPGA synthesis (Xilinx Vivado / Altera Quartus), what hardware primitive inside a CLB implements combinational Boolean functions?", ["Look-Up Table (LUT)", "Electrolytic Capacitor", "Linear 741 Op-Amp", "2N2222 BJT"], 0, "FPGAs map arbitrary n-input combinational logic into fast SRAM-based Look-Up Tables (e.g., 6-input LUTs)."],
    ["What is the purpose of an XDC/UCF constraint file during FPGA implementation?", ["To map Verilog top-level ports to physical FPGA I/O pins and define clock timing constraints", "To write testbench stimulus loops", "To power the board over Bluetooth", "To convert Verilog into Python"], 0, "Constraints bind logical port names to physical package pins, I/O voltage standards (LVCMOS33), and clock frequencies."],
  ],
  C15: [
    ["When coding a Traffic Light or Elevator Controller FSM in Verilog, why should synchronous reset and non-blocking assignments (`<=`) be used inside `always @(posedge clk)`?", ["Non-blocking `<=` updates all flip-flops simultaneously at the clock edge, avoiding race conditions between sequential registers", "Blocking `=` prevents FPGA pin routing", "Non-blocking slows the clock to 1 Hz", "Reset pins only accept analog voltages"], 0, "Using `<=` in sequential blocks accurately models parallel hardware flip-flop transfers."],
    ["What happens in Verilog if a `case` statement inside a combinational `always @(*)` block misses a state or omits a `default` assignment?", ["Synthesis infers an unwanted transparent latch to hold the unassigned value", "Synthesis automatically converts it into an ADC", "The FPGA deletes the clock net", "Pin voltage doubles to 6.6 V"], 0, "Incomplete combinational assignments imply memory, causing unintended level-sensitive latches."],
    ["Why do FPGA designs divide a 100 MHz board oscillator down to ~1–2 Hz using a counter before driving human-visible Traffic Light LEDs?", ["100 MHz transitions are billions of times faster than human perception; a clock-enable/divider counter times real-second intervals", "LEDs burn out above 10 Hz", "Verilog only simulates at 1 Hz", "FPGAs turn off above 1 kHz"], 0, "Counting 100,000,000 cycles of a 100 MHz clock creates an exact 1-second tick for real-time state timers."],
  ],

  // DOMAIN D — Power Electronics
  D01: [
    ["What two current thresholds define an SCR (Thyristor) turning ON and staying ON without continuous gate drive?", ["Latching current I_L (minimum to lock ON) and Holding current I_H (minimum to remain ON, where I_L > I_H)", "Base current I_B and Emitter voltage", "Zener current and Ripple factor", "Gate charge and Slew rate"], 0, "Once anode current exceeds I_L, gate pulse can be removed; the SCR turns OFF only when anode current drops below I_H."],
    ["Which power semiconductor combines an insulated MOS gate (easy voltage drive) with bipolar low on-state conduction loss at high voltage/current?", ["IGBT (Insulated Gate Bipolar Transistor)", "1N4007 Diode", "DB3 DIAC", "2N2222 Small-Signal BJT"], 0, "IGBTs pair MOSFET gate drive simplicity with BJT conductivity modulation for medium/high power converters."],
    ["In which quadrant(s) can a TRIAC conduct load current compared to a standard SCR?", ["Both positive and negative AC half-cycles (bidirectional)", "Positive half-cycle only", "DC reverse breakdown only", "Zero current at all times"], 0, "A TRIAC acts like antiparallel SCRs sharing one gate, enabling bidirectional AC phase control."],
  ],
  D02: [
    ["Why is pulse/UJT triggering or transformer-isolated triggering preferred over simple resistive DC gate drive for SCRs?", ["It reduces gate power dissipation, isolates high-voltage mains from control logic, and narrows firing jitter", "Resistors cannot carry gate microamps", "UJT eliminates the need for an AC source", "Pulse triggering makes the SCR conduct permanently"], 0, "Sharp high-peak trigger pulses turn the SCR on swiftly without overheating the gate or risking common-ground shock."],
    ["In an RC SCR triggering circuit, what is the maximum theoretical firing angle achievable with pure resistive (R-only) vs. RC firing?", ["Pure R firing is limited to 0°–90°, whereas RC firing extends control across 0°–180°", "Pure R reaches 360°", "RC firing is limited to 15°", "Both are fixed at 45°"], 0, "Phase lag from the RC capacitor lets firing occur past the 90° AC peak up to 180°."],
    ["Why do cosine-modified ramp triggering schemes linearize average DC output voltage vs. control voltage?", ["Because V_dc ∝ (1 + cos α), so matching control voltage to a cosine wave makes V_dc linear with V_ctrl", "Because cosine waves have zero frequency", "Because SCRs only trigger at 90°", "Because cos(0°) = 0"], 0, "Solving α = arccos(V_ctrl) cancels the nonlinear cosine dependency in controlled rectifier output."],
  ],
  D03: [
    ["What is the average DC output voltage V_dc of an uncontrolled single-phase Half-Wave rectifier with resistive load and peak V_m?", ["V_m / π ≈ 0.318 V_m", "2 V_m / π ≈ 0.637 V_m", "V_m / √2", "V_m"], 0, "Integrating V_m sin(ωt) over 0 to π and dividing by 2π yields V_m / π."],
    ["What is the average DC output voltage V_dc of an uncontrolled single-phase Full-Wave Bridge rectifier with resistive load?", ["V_m / π", "2 V_m / π ≈ 0.637 V_m", "3√3 V_m / π", "0.5 V_m"], 1, "Both half-cycles deliver positive pulses to the load, doubling average output to 2V_m / π."],
    ["With a highly inductive RL load and NO freewheeling diode, what happens to the output voltage waveform in a half-wave rectifier?", ["Inductor energy forces diode conduction past π into the negative half-cycle until current decays to zero", "Output current drops instantaneously to zero at 180°", "Diode voltage reverses to +1000 V", "Inductance doubles average DC voltage"], 0, "Stored magnetic energy ½LI² maintains forward current through the negative supply portion until i_L reaches zero."],
  ],
  D04: [
    ["For a 1-phase Full-Wave Controlled Bridge Rectifier with resistive load and firing angle α, what is V_dc?", ["V_dc = (V_m / π) · (1 + cos α)", "V_dc = (2 V_m / π) · cos α", "V_dc = V_m · sin α", "V_dc = 0"], 0, "With R load, conduction ends at π, giving (1/π)∫_α^π V_m sin θ dθ = (V_m/π)(1 + cos α)."],
    ["With a large inductive load (continuous current, no freewheeling diode), when does a 1-phase fully controlled bridge operate in regeneration/inversion mode (V_dc < 0)?", ["For firing angles 90° < α < 180°", "For 0° < α < 30°", "Only at α = 0°", "Never"], 0, "Since V_dc = (2V_m/π)cos α in continuous conduction, α > 90° yields negative average DC voltage, returning energy to AC mains."],
    ["In an RLE (DC motor) load, why can firing the SCR at α < θ₁ (where V_m sin θ₁ = E_back) fail to turn it on?", ["Because supply voltage is still below back-EMF E, reverse-biasing the SCR", "Because the inductor shorts the gate", "Because R = 0", "Because firing angle must exceed 180°"], 0, "An SCR cannot forward-conduct unless anode potential exceeds cathode back-EMF E during the gate pulse."],
  ],
  D05: [
    ["How many controlled SCR pulses occur per mains cycle in a 3-Phase Full-Wave (6-pulse) Controlled Bridge Rectifier?", ["2 pulses per cycle", "3 pulses per cycle", "6 pulses per cycle (every 60°)", "12 pulses per cycle"], 2, "Three-phase full-bridge commutation switches every 60°, yielding 300 Hz ripple on 50 Hz mains."],
    ["At what reference angle is α = 0° defined in a 3-phase controlled rectifier?", ["The natural commutation crossover point where the incoming phase voltage becomes more positive than the outgoing phase (30° from phase zero)", "At 0° of Phase A only", "At 180° of Phase C", "At random instants"], 0, "Firing delay α is measured from the earliest point a diode would naturally take over conduction."],
    ["With continuous load current, what is the average DC output voltage of a 3-phase 6-pulse controlled bridge?", ["V_dc = (3 V_mL / π) · cos α (where V_mL is peak line-to-line voltage)", "V_dc = (V_m / π) · cos α", "V_dc = 0.5 · V_mL", "V_dc = V_mL · sin α"], 0, "Integrating line-to-line voltage over a 60° segment gives (3 V_mL / π) cos α."],
  ],
  D06: [
    ["What major benefit does adding a Freewheeling Diode across an inductive RL load provide in a controlled rectifier?", ["Prevents negative output voltage excursions, provides a path for inductive current at zero crossing, and improves power factor", "Doubles peak reverse voltage on SCRs", "Eliminates all AC ripple to 0 mV", "Forces the rectifier into regenerative inversion"], 0, "The freewheeling diode clamps load voltage ≥ 0 V and relieves the main SCRs during negative supply swings."],
    ["What effect does nonzero AC Source Inductance L_s have on rectifier commutation?", ["Causes a commutation overlap angle μ during which both incoming and outgoing SCRs conduct, slightly reducing V_dc", "Increases V_dc above ideal no-load peak", "Eliminates overlap completely", "Turns the SCR into a TRIAC"], 0, "Current in inductive source lines cannot jump instantaneously, creating overlap interval μ and voltage drop (overlap loss)."],
    ["How does source inductance overlap affect the output voltage waveform during commutation?", ["Notches/drops output voltage to the average of the two commuting phases during angle μ", "Doubles line frequency", "Creates a square wave at 1 MHz", "Inverts DC output polarity permanently"], 0, "Two phases briefly short through the conducting SCRs during overlap, pulling output voltage to half their sum."],
  ],
  D07: [
    ["How does a 1-phase AC Voltage Controller regulate RMS power to an AC load?", ["By varying firing delay α of antiparallel SCRs (or a TRIAC) each half-cycle via phase-angle or integral-cycle control", "By converting AC to DC permanently", "By stepping frequency up to 5 kHz", "By inserting a 10 H choke in parallel"], 0, "Delayed phase firing chops each AC half-cycle, smoothly scaling V_rms from full line down to zero."],
    ["What happens in an RL-load AC controller if firing angle α is set LESS than the load phase angle φ = arctan(ωL/R)?", ["Continuous conduction occurs without regulation (acts like an uncontrolled closed switch) unless wide/high-frequency gate pulses are used", "Output voltage doubles", "Current flows backward forever", "Both SCRs blow simultaneously at α = 0"], 0, "Because inductive current lags past α, the prior SCR is still conducting when the next pulse arrives if α < φ."],
    ["Compared to phase-angle control, why does Integral-Cycle (On/Off burst) control produce lower switching EMI?", ["It switches SCRs on and off cleanly at natural AC zero crossings for whole cycles", "It switches at 200 kHz", "It uses no semiconductors", "It relies on PWM carriers"], 0, "Zero-voltage/zero-current switching eliminates sharp step di/dt edges—ideal for high-inertia thermal heaters."],
  ],
  D08: [
    ["In Continuous Conduction Mode (CCM), what is the ideal voltage conversion ratio V_out / V_in of a Buck (Step-Down) DC-DC Chopper at duty ratio D?", ["V_out / V_in = D (always ≤ V_in)", "V_out / V_in = 1 / (1 − D)", "V_out / V_in = −D / (1 − D)", "V_out / V_in = D²"], 0, "Volt-second balance on the Buck inductor gives V_out = D · V_in."],
    ["What is the ideal CCM voltage conversion ratio of a Boost (Step-Up) Converter?", ["V_out / V_in = D", "V_out / V_in = 1 / (1 − D) (always ≥ V_in)", "V_out / V_in = 1 − D", "V_out / V_in = D / 2"], 1, "Inductor volt-second balance gives V_in·D = (V_out − V_in)(1 − D), yielding V_out = V_in / (1 − D)."],
    ["What distinguishes an inverting Buck-Boost converter's output polarity from basic Buck and Boost topologies?", ["Its output voltage V_out = −V_in · D / (1 − D) is inverted relative to the input ground", "It outputs AC sine waves", "It cannot step down voltage when D < 0.5", "It uses no inductor"], 0, "Reversed diode/inductor arrangement produces negative regulated output voltage whose magnitude can be below or above V_in."],
  ],
  D09: [
    ["What is the fundamental RMS output voltage of a single-phase Full-Bridge square-wave inverter versus a Half-Bridge inverter (for DC link V_dc)?", ["Full-bridge outputs 4·V_dc/(π√2) fundamental (twice the Half-bridge amplitude 2·V_dc/(π√2))", "Half-bridge outputs twice Full-bridge voltage", "Both output identical peak V_dc", "Full-bridge outputs zero fundamental"], 0, "Full-bridge applies ±V_dc across the load, whereas half-bridge applies only ±V_dc/2."],
    ["What harmonic order is completely eliminated in a single-phase Quasi-Square Wave inverter when pulse width equals 120° (d = 2π/3)?", ["The 3rd harmonic (and all triplen multiples)", "The fundamental component", "The 2nd harmonic only", "All frequencies above 50 Hz"], 0, "Since sin(3 × 60°) = 0, a 120° conduction pulse nulls the dominant 3rd harmonic cleanly."],
    ["Why must antiparallel feedback diodes be placed across each MOSFET/IGBT switch in a voltage-source inverter?", ["To provide a return path for inductive load current when switches turn OFF", "To double DC link voltage", "To generate 50 Hz trigger clocks", "To convert square waves into DC"], 0, "With lagging RL loads, load current polarity temporarily opposes switch voltage, requiring reverse freewheeling diodes."],
  ],
  D10: [
    ["In Sinusoidal PWM (SPWM), how are inverter gate pulses generated?", ["By comparing a high-frequency triangular carrier wave against a 50/60 Hz sinusoidal modulating reference", "By comparing two DC batteries", "By dividing 230 V AC with resistors", "By running a 555 timer in monostable mode"], 0, "SPWM shifts switching harmonics up near the high carrier frequency, making output LC filtering compact and low-THD."],
    ["In linear SPWM modulation (m_a ≤ 1), what is the maximum peak fundamental line-to-line output voltage compared to Space Vector PWM (SVPWM)?", ["SVPWM achieves ~15.47% higher fundamental line-to-line voltage (2/√3 × SPWM) from the same DC bus", "SPWM outputs 50% more voltage than SVPWM", "Both produce identical maximum linear bus utilization", "SVPWM only works in single-phase half-bridges"], 0, "SVPWM naturally injects triplen common-mode centering, raising linear bus utilization by 15.47%."],
    ["What happens in SPWM if modulation index m_a exceeds 1.0 (overmodulation)?", ["Low-order odd harmonics reappear as pulse dropping moves output toward square-wave", "Inverter switches turn completely OFF", "Switching frequency drops to 1 Hz", "Output voltage drops to 0 V"], 0, "Overmodulation sacrifices pure sinusoidal linearity for extra fundamental amplitude at the cost of increased low-order THD."],
  ],
  D11: [
    ["What power conversion function does a Cycloconverter perform directly without an intermediate DC link?", ["Single-stage AC-to-AC frequency step-down (e.g., 50 Hz mains to variable 0–20 Hz)", "DC-to-DC voltage step-up", "Single-phase AC to regulated 5 V DC", "PWM audio synthesis"], 0, "Cycloconverters synthesize a lower-frequency AC waveform directly from mains AC segments via phase-controlled converters."],
    ["What enables a Dual Converter (two antiparallel controlled bridges) to achieve full 4-quadrant DC motor control?", ["Bridge 1 handles forward motoring/braking; Bridge 2 handles reverse motoring/braking with bidirectional current and voltage", "It removes the motor armature", "It operates purely with uncontrolled diodes", "It doubles line frequency to 100 Hz"], 0, "Dual bridges reverse both load current polarity and average DC voltage for smooth four-quadrant drives."],
    ["In a circulating-current-free Dual Converter, what prevents a catastrophic line-to-line short between Bridge 1 and Bridge 2?", ["Interlock deadtime logic ensures one bridge current decays to zero before gating the opposite bridge", "Connecting both bridges without chokes simultaneously", "Setting α₁ = α₂ = 0°", "Removing the AC supply"], 0, "Zero-current detection and blanking delay prevent opposing bridges from shorting the DC bus."],
  ],
  D12: [
    ["What is the core objective of Zero-Voltage Switching (ZVS) and Zero-Current Switching (ZCS) in resonant converters?", ["Switch turns ON/OFF when voltage or current crosses zero, drastically cutting switching loss (V×I overlap) and EMI", "Keep switch V×I product maximum at every edge", "Eliminate all inductors and capacitors", "Restrict converter operation below 50 Hz"], 0, "Soft switching eliminates hard-switching V·I overlap, permitting high-frequency compact power supplies."],
    ["Which parasitic elements are intentionally harnessed in a ZVS quasi-resonant buck converter?", ["Switch output capacitance C_oss (with an LC tank) to ring switch voltage to zero before turn-on", "Winding DC resistance only", "Breadboard contact bounce", "Gate driver battery discharge"], 0, "Resonant LC shaping brings V_ds to zero before the gate fires, eliminating capacitive turn-on dump losses."],
    ["Why does a ZCS resonant switch typically use a series inductor to shape switch current into a half-sinusoid?", ["So current naturally rings back to zero, allowing zero-current turn-off without tail-current losses", "To raise switching loss", "To block DC current permanently", "To lower output power to zero"], 0, "When resonant switch current returns to zero, the switch/thyristor turns off effortlessly."],
  ],
  D13: [
    ["In a separately excited DC motor, how does armature voltage control (via DC chopper duty D) regulate speed below base speed?", ["Steady-state speed ω ∝ (V_a − I_a·R_a) / K_φ scales linearly with average armature voltage D·V_dc", "Speed increases as armature voltage drops to zero", "Field flux drops to zero", "Armature frequency controls speed"], 0, "Varying chopper duty D adjusts average armature voltage, giving smooth torque-constant speed control from 0 to rated RPM."],
    ["How does a 2-quadrant (Class-C) DC chopper enable regenerative braking of a DC motor?", ["By switching the lower/upper pair as a boost-like stage returning motor kinetic energy back into the DC supply", "By disconnecting the armature from the circuit", "By shorting the DC battery", "By reversing AC mains frequency"], 0, "Reversing armature current direction returns braking power from motor back-EMF to the DC bus."],
    ["Why is a freewheeling diode critical across a chopper-fed DC motor armature?", ["It sustains continuous smooth armature current during the chopper OFF interval and protects the switch", "It reverses motor spin direction automatically", "It doubles supply voltage", "It replaces the field winding"], 0, "Motor armature inductance forces current to continue flowing during switch OFF time via the freewheeling path."],
  ],
  D14: [
    ["Why does Variable Frequency Drive (VFD) speed control of a 3-phase Induction Motor maintain a constant V/f (Volts-per-Hertz) ratio below base speed?", ["To keep air-gap magnetic flux Φ ∝ V/f constant, preventing core saturation at low f and torque loss at high f", "To double stator copper losses", "To turn the induction motor into a synchronous DC motor", "To keep rotor slip at 100%"], 0, "Keeping V/f constant maintains rated magnetic flux and full breakaway/running torque across speeds."],
    ["Why is an AC Voltage Controller (stator voltage reduction) generally restricted to low-power fan/pump induction motor speed control?", ["Slip losses (I²R rotor heat) rise sharply at lower speeds because frequency stays fixed at 50/60 Hz", "AC voltage controllers reverse phase sequence", "Induction motors have zero stator resistance", "Fans require 1000 Hz AC"], 0, "Lowering voltage at constant frequency increases slip, making V/f inverter drives far more efficient for wide-range torque loads."],
    ["How do you reverse the rotation direction of a 3-phase induction motor driven by an SPWM inverter?", ["Swap the gating phase sequence of any two output phases (e.g., B and C)", "Lower DC link voltage by 10%", "Increase carrier frequency from 5 kHz to 10 kHz", "Short the neutral line"], 0, "Reversing phase sequence flips the rotating stator magnetic field direction."],
  ],
  D15: [
    ["What does Total Harmonic Distortion (THD) quantify in a power converter's current or voltage waveform?", ["The ratio of the RMS sum of all harmonic components above the fundamental to the RMS fundamental component", "DC average value divided by peak value", "Peak switching temperature in °C", "Maximum diode reverse recovery time"], 0, "THD = √(Σ_{n=2}^∞ I_n²) / I₁ measures waveform distortion against an ideal pure sinusoid."],
    ["In PSIM / Simulink FFT analysis of a 1-phase full-bridge diode rectifier with pure R load (square-wave input current), what are the dominant odd harmonics?", ["3rd, 5th, 7th, 9th... with amplitude I_n = I₁ / n (THD ≈ 48.3%)", "2nd, 4th, 6th even harmonics only", "Zero harmonics (0% THD)", "100th harmonic only"], 0, "Symmetric odd-harmonic square input current contains every odd multiple of mains frequency."],
    ["How does increasing SPWM switching carrier frequency (e.g., from 1 kHz to 10 kHz) affect output filter size and THD?", ["Pushes sideband harmonics higher in frequency so a much smaller LC filter achieves very low THD", "Drops fundamental frequency to 5 Hz", "Increases 3rd harmonic amplitude", "Eliminates DC link capacitors"], 0, "Higher carrier frequencies separate switching ripple cleanly from the 50 Hz fundamental."],
  ],

  // DOMAIN E — Electronic Devices & Circuits (EDC)
  E01: [
    ["In the Shockley diode equation I_D = I_S(e^(V_D / (n·V_T)) − 1), approximately what is thermal voltage V_T at room temperature (300 K)?", ["25.9 mV (≈ 26 mV)", "0.70 V", "1.12 V", "5.00 V"], 0, "V_T = kT/q evaluates to ~25.86 mV near 27°C (300 K)."],
    ["How does a standard silicon rectifier diode behave differently from a Zener diode in reverse bias?", ["Standard diodes aren't designed for sustained reverse breakdown; Zener diodes are doped to regulate at a sharp, predictable V_z", "Zener diodes never conduct in forward bias", "Standard diodes conduct at 0.1 V reverse", "Zeners have zero capacitance"], 0, "Zener diodes are engineered with controlled doping to sustain continuous reverse breakdown power safely."],
    ["As junction temperature rises, how does a silicon diode's forward voltage V_F (at constant current) change?", ["Decreases by roughly −2 mV/°C", "Increases by +50 mV/°C", "Remains mathematically invariant", "Jumps to +5 V"], 0, "Rising thermal carrier generation lowers the forward barrier voltage by approximately −2 mV per °C."],
  ],
  E02: [
    ["In a Zener voltage regulator, what happens to Zener current I_Z if load resistance R_L decreases (load draws MORE current) while V_in is fixed?", ["I_Z decreases by the amount I_L increases, since total series current I_S = (V_in − V_z)/R_s stays constant", "I_Z increases proportionally", "V_z doubles", "R_s decreases"], 0, "By KCL, I_S = I_Z + I_L; heavier load current diverts current away from the Zener shunt branch."],
    ["What differentiates a positive biased Clipper from a negative Clamper?", ["A Clipper removes waveform tops above a bias threshold; a Clamper shifts the waveform's DC level downward", "A Clipper uses a capacitor; a Clamper uses an inductor", "Both always output pure DC", "Clampers amplify peak-to-peak swing by 10×"], 0, "Clippers truncate peaks whereas clampers shift the entire waveform's DC offset."],
    ["If V_in = 12 V, V_z = 5.1 V, and R_s = 470 Ω with no load attached, what current flows through the Zener diode?", ["~14.7 mA", "~25.5 mA", "~10.9 mA", "~1.0 mA"], 0, "I_Z = I_S = (12 − 5.1) / 470 = 6.9 / 470 ≈ 14.68 mA."],
  ],
  E03: [
    ["What is the theoretical Ripple Factor γ = V_r(rms) / V_dc of an UNFILTERED half-wave rectifier versus a full-wave rectifier?", ["Half-wave γ = 1.21; Full-wave γ = 0.482", "Half-wave γ = 0.482; Full-wave γ = 1.21", "Both equal 0.05", "Both equal 1.0"], 0, "Full-wave rectification cuts RMS ripple variation drastically from 121% down to 48.2% even before filtering."],
    ["What is the Peak Inverse Voltage (PIV) across each non-conducting diode in a Center-Tapped 2-diode Full-Wave rectifier?", ["V_m", "2 · V_m (twice the secondary half-winding peak)", "0.5 · V_m", "0.7 V"], 1, "Both secondary halves add across the reverse-biased diode, doubling PIV to 2·V_m compared to V_m in a 4-diode bridge."],
    ["For a capacitor-filtered rectifier, what happens to diode conduction angle as filter capacitor C is made very large?", ["Diodes conduct in short, high-amplitude current spikes near AC peaks", "Diodes conduct continuously for all 360°", "Peak diode current drops to zero", "Transformer frequency doubles"], 0, "To replenish load charge in a brief window near peak V_m, peak surge current i_peak spikes sharply."],
  ],
  E04: [
    ["How are current gains α (Common Base) and β (Common Emitter) mathematically related for a BJT?", ["α = β / (β + 1) and β = α / (1 − α)", "α = β + 1", "β = α / 2", "α · β = 1"], 0, "Since I_E = I_C + I_B, common-base gain α = I_C/I_E is always slightly less than 1 while β = I_C/I_B can be 100–400."],
    ["Which BJT configuration provides high current gain (~β+1), voltage gain near unity (~1), high input impedance, and low output impedance?", ["Common-Collector (Emitter Follower)", "Common-Base", "Common-Emitter", "Diode-connected BJT"], 0, "The Emitter Follower excels as an impedance-matching current buffer without phase inversion."],
    ["In the active forward region of an NPN silicon BJT, how are the Base-Emitter and Base-Collector junctions biased?", ["B-E forward-biased (~0.7 V) and B-C reverse-biased", "Both junctions forward-biased", "Both junctions reverse-biased", "B-E reverse-biased and B-C forward-biased"], 0, "Forward B-E injects carriers while reverse B-C sweeps them into the collector for linear amplification."],
  ],
  E05: [
    ["Why is Voltage-Divider Bias (with emitter resistor R_E) far superior to simple Fixed Base Bias?", ["R_E provides negative DC feedback stabilizing I_C and the Q-point against wide transistor β and temperature variations", "Fixed bias requires 4 transistors", "Voltage-divider bias eliminates DC power supplies", "R_E doubles β to infinity"], 0, "Emitter degeneration keeps I_C ≈ (V_B − 0.7)/R_E nearly independent of β."],
    ["Where on the DC load line should the quiescent Q-point be placed for maximum symmetrical Class-A AC output swing?", ["Near the center of the active load line (V_CEQ ≈ V_CC / 2)", "At saturation (V_CEQ ≈ 0.2 V)", "At cutoff (I_CQ ≈ 0 mA)", "Beyond V_CE(max) breakdown"], 0, "Centering the Q-point provides equal headroom toward both cutoff and saturation before clipping."],
    ["What happens on an amplifier's output sine wave if the Q-point sits too close to saturation (high I_CQ, low V_CEQ)?", ["The negative output half-cycle clips prematurely (saturation clipping) for an inverting CE stage", "The positive peak clips first", "Output gain doubles symmetrically", "Frequency shifts by 50%"], 0, "When collector voltage tries to swing below V_CE(sat) ≈ 0.2 V, the bottom of the waveform flattens."],
  ],
  E06: [
    ["Why is an Enhancement-mode MOSFET (EMOSFET) normally OFF at V_GS = 0 V while a JFET/DMOSFET conducts?", ["An EMOSFET has no built-in channel until V_GS exceeds threshold V_th to invert/induce a channel", "JFETs have an insulated oxide gate", "EMOSFETs require forward gate-to-source current", "JFETs operate only in reverse supply polarity"], 0, "EMOSFETs need V_GS > V_th to form the conductive inversion layer; JFETs have a preexisting channel pinched off by reverse V_GS."],
    ["In the saturation (active pinch-off) region of an n-channel MOSFET, what equation governs drain current I_D?", ["I_D = K_n · (V_GS − V_th)²", "I_D = V_GS / R_DS", "I_D = I_DSS · e^(V_GS)", "I_D = β · I_G"], 0, "MOSFETs obey a square-law transconductance relationship with essentially zero DC gate current."],
    ["For a JFET with I_DSS = 10 mA and V_P = −4 V, what is drain current I_D at V_GS = −2 V?", ["2.5 mA", "5.0 mA", "10.0 mA", "0 mA"], 0, "By Shockley's JFET law, I_D = 10·(1 − (−2)/(−4))² = 10 × (0.5)² = 2.5 mA."],
  ],
  E07: [
    ["How does an n-channel MOSFET act as a Voltage-Variable Resistor (VVR) in analog AGC or switch circuits?", ["When operated in the deep triode/ohmic region (small V_DS), channel resistance R_DS varies smoothly with V_GS", "By biasing in saturation with V_DS = 20 V", "By forward-biasing the body diode", "By floating the Source terminal"], 0, "At small V_DS, I_D is linear in V_DS with slope controlled by (V_GS − V_th)."],
    ["In JFET Self-Bias (grounded gate through R_G, source resistor R_S to GND), how does negative V_GS develop from a single positive V_DD supply?", ["Source current I_D raises V_S = I_D·R_S above 0 V while V_G = 0 V, so V_GS = V_G − V_S = −I_D·R_S", "Gate current drops voltage across R_G", "A hidden battery sits inside the JFET", "R_D pulls V_G negative"], 0, "Zero gate current keeps V_G at 0 V, automatically making V_GS negative as source voltage rises."],
    ["What advantage does a MOSFET have over a BJT when used as a high-speed digital power switch?", ["Voltage-controlled high-impedance gate (negligible steady-state gate current) and no minority-carrier storage delay", "Higher gate current requirement", "Lower input resistance (~1 kΩ)", "Fixed 0.7 V saturation drop"], 0, "Unipolar majority-carrier conduction avoids BJT base-charge storage lag."],
  ],
  E08: [
    ["What components cause gain roll-off at LOW frequencies versus HIGH frequencies in an RC-coupled CE amplifier?", ["External coupling & bypass capacitors cause low-frequency roll-off; internal BJT junction & stray capacitances cause high-frequency roll-off", "Supply voltage drops at 1 kHz", "Collector resistor R_c sets low-frequency cutoff alone", "High frequencies are blocked by coupling caps"], 0, "Coupling/bypass caps act as open circuits near DC, while pF-level C_be/C_bc (amplified by Miller effect) shunt high frequencies."],
    ["How does the Miller Effect reduce high-frequency bandwidth in an inverting Common-Emitter stage?", ["Feedback capacitance C_bc appears multiplied at the input by (1 + |A_v|), creating a lower input pole", "It divides C_bc by 100", "It doubles midband voltage gain", "It removes R_E"], 0, "Large inverting voltage swing across C_bc amplifies effective input Miller capacitance C_M = C_bc(1 − A_v)."],
    ["What defines an amplifier's −3 dB Bandwidth (BW)?", ["f_H − f_L, where midband voltage gain drops to 0.707 (−3 dB) at both ends", "f_H + f_L", "Midband gain multiplied by R_c", "Only the DC operating frequency"], 0, "Bandwidth spans between the lower and upper half-power (−3 dB) cutoff frequencies."],
  ],
  E09: [
    ["Why does a Cascode Amplifier (CE stage driving a CB stage) achieve much wider high-frequency bandwidth than a single CE stage?", ["The CB stage keeps CE voltage gain near −1, eliminating the Miller capacitance multiplication at the input", "It removes all supply capacitors", "It increases Miller effect by 100×", "It turns NPN transistors into diodes"], 0, "Suppressing voltage gain at the input stage collector prevents Miller multiplication of C_bc while the CB stage delivers full load gain."],
    ["When two identical RC-coupled amplifier stages with individual gain A_v are cascaded (accounting for loading), what happens to overall midband gain and bandwidth?", ["Overall gain multiplies (A_v1 · A_v2), while overall bandwidth shrinks slightly narrower than a single stage", "Gain adds and bandwidth doubles", "Gain stays A_v1 and phase becomes 0°", "Bandwidth becomes infinite"], 0, "Cascading multiplies gain in dB (adds dB) while cascading poles narrows the −3 dB passband."],
    ["What is the total phase shift of a two-stage inverting Common-Emitter amplifier in the midband?", ["0° (360°: two 180° inversions cancel)", "90°", "180°", "270°"], 0, "Two inverting stages produce 180° + 180° = 360° (in-phase output)."],
  ],
  E10: [
    ["What is the approximate overall current gain β_total and base-emitter turn-on voltage V_BE(total) of a two-transistor NPN Darlington Pair?", ["β_total ≈ β₁ · β₂ and V_BE(total) ≈ 1.4 V (two silicon junctions in series)", "β_total = β₁ + β₂ and V_BE = 0.7 V", "β_total = 1 and V_BE = 0.2 V", "β_total = β₁ / β₂"], 0, "Emitter current of Q1 feeds Q2's base directly, multiplying current gains while stacking two B-E drops (~1.4 V)."],
    ["How does Voltage-Series Negative Feedback affect an amplifier's input impedance Z_in and output impedance Z_out?", ["Increases Z_in (by 1+Aβ) and decreases Z_out (by 1+Aβ)—ideal for a Voltage Amplifier", "Decreases Z_in and increases Z_out", "Decreases both to zero", "Changes neither impedance"], 0, "Series input mixing raises Z_in while shunt output sampling lowers Z_out."],
    ["What trade-off does Negative Feedback make when stabilizing gain A_f = A / (1 + Aβ)?", ["Gain decreases by factor (1 + Aβ), while bandwidth increases by (1 + Aβ) and distortion/noise drop", "Gain and bandwidth both decrease together", "Distortion triples", "Input becomes unstable at DC"], 0, "Negative feedback trades excess open-loop gain for wider bandwidth, flatter linearity, and gain stability."],
  ],
  E11: [
    ["What is the maximum theoretical collector efficiency of a resistively loaded Class-A power amplifier vs. an ideal Class-B push-pull amplifier?", ["Class-A max = 25% (50% transformer-coupled); Class-B max = 78.5% (π/4)", "Class-A = 90%; Class-B = 25%", "Both equal 50%", "Class-B = 100%"], 0, "Class-A burns continuous quiescent DC power even with zero signal, whereas Class-B conducts only on half-cycles up to 78.5%."],
    ["What distortion defect appears around the zero crossing of a pure Class-B complementary push-pull amplifier, and how does Class-AB fix it?", ["Crossover distortion (dead-zone from ±0.7 V V_BE); Class-AB biases both transistors slightly ON with two diodes/V_BE multiplier", "Thermal runaway only; fixed by removing heat sinks", "Phase inversion; fixed by a bridge rectifier", "Clipping at supply rails; fixed by lowering V_CC"], 0, "Pre-biasing both bases apart by ~1.4 V eliminates the zero-crossing dead zone."],
    ["Why should bias diodes in a Class-AB output stage be thermally coupled to the output power transistor heatsink?", ["So diode forward drop tracks output transistor V_BE drift (~−2 mV/°C), preventing thermal runaway", "To cool the speaker voice coil", "To block positive half-cycles", "To convert Class-AB into Class-C"], 0, "Thermal tracking prevents quiescent bias current from climbing uncontrollably as output transistors warm up."],
  ],
  E12: [
    ["Which region of a Unijunction Transistor (UJT) emitter characteristic enables it to build a relaxation oscillator?", ["The Negative Resistance region between Peak voltage V_P and Valley voltage V_V", "Forward saturation only", "Reverse breakdown at 100 V", "Pure linear ohmic resistance"], 0, "Once emitter voltage hits V_P = η·V_BB + 0.7 V, emitter resistance collapses negatively, rapidly discharging timing capacitor C."],
    ["What does the UJT Intrinsic Stand-off Ratio η (typically 0.5–0.85) determine?", ["The fraction of interbase voltage V_BB setting the trigger peak point V_P = η·V_BB + V_D", "The maximum frequency of a 555 timer", "The collector current gain β", "The Zener voltage of the base"], 0, "Internal voltage division R_B1/(R_B1+R_B2) defines η and sets capacitor peak trigger voltage."],
    ["Why are UJT relaxation oscillators widely used to generate sharp trigger pulses across resistor R1 at Base-1?", ["Rapid capacitor discharge through R_B1 and R1 creates a steep positive pulse ideal for firing SCR gates", "UJT outputs pure 1 kW sine waves", "R1 filters out all AC above 1 Hz", "UJT requires no capacitor"], 0, "Fast capacitive dump produces crisp, high-dV/dt trigger spikes for thyristor control."],
  ],
  E13: [
    ["In an SCR half-wave controlled rectifier, how does increasing the firing angle α from 30° to 120° affect average DC load voltage?", ["Average DC load voltage decreases because the SCR conducts for a smaller fraction of each positive half-cycle", "DC voltage increases toward peak V_m", "Load voltage reverses negative on R load", "Ripple frequency doubles to 100 Hz"], 0, "Delaying gate firing past peak reduces the integrated area under the positive half-sine."],
    ["Once an SCR conducts in a DC circuit, can you turn it OFF simply by grounding its gate terminal?", ["No—once latched above I_L, the gate loses control until anode current drops below holding current I_H", "Yes—pulling the gate LOW turns it off instantly", "Yes—reversing gate voltage turns it into an open switch immediately", "Only if V_AK exceeds 1000 V"], 0, "Standard SCRs lack turn-off gate capability (unlike GTOs or MOSFETs) and require natural AC zero-crossing or forced commutation."],
    ["What dangerous turn-on failure can occur if anode-to-cathode voltage rises too rapidly (high dV/dt) across an off-state SCR?", ["False dV/dt triggering via internal junction capacitance charging the gate, prevented with an RC snubber", "Permanent short of the gate resistor", "Frequency drops to 0 Hz", "Holding current rises to 100 A"], 0, "A fast voltage step drives i = C_j·dV/dt into the gate junction; an RC snubber limits dV/dt safely."],
  ],
  E14: [
    ["In LTSpice, which analysis command sweeps V_CE from 0 V to 12 V across stepped values of base current I_B to plot BJT output curves?", [".dc VCE 0 12 0.1 IB 10u 50u 10u (nested DC sweep)", ".tran 1ms", ".ac oct 10 10 100k", ".op"], 0, "A nested `.dc` sweep steps both V_CE and I_B to generate the full I_C-vs-V_CE characteristic family."],
    ["Which SPICE `.model` parameter directly specifies the forward common-emitter DC current gain of a BJT (e.g., 2N2222 or BC547)?", ["BF (Ideal maximum forward beta)", "VTO", "IS_ZENER", "L_COIL"], 0, "`BF` defines forward beta in the Gummel-Poon BJT SPICE model (while `VTO` sets MOSFET threshold voltage)."],
    ["In a small-signal `.ac` frequency simulation of a CE amplifier in LTSpice, how do you verify phase inversion across the midband?", ["Plot V(out)/V(in) magnitude in dB and observe the phase trace sitting at ±180°", "Check transient temperature at 0s", "Measure resistor color bands", "Disable coupling capacitors"], 0, "AC Bode plotting simultaneously displays midband gain in dB and 180° phase shift."],
  ],
  E15: [
    ["During PCB layout of a regulated power supply, why should high-current power traces (rectifier/regulator loops) be routed wider than signal traces?", ["To minimize trace resistance I²R heating, voltage drop, and parasitic inductance", "Because narrow traces block DC current completely", "To increase capacitive coupling between AC mains and ground", "To make etching take 10× longer"], 0, "Trace width determines ampacity and voltage drop (IPC-2221 standards) for safe thermal operation."],
    ["What is the critical safety spacing rule when routing high-voltage AC mains tracks alongside low-voltage DC regulator tracks on a PCB?", ["Maintain sufficient clearance/creepage distance (or milled isolation slots) to prevent arcing and shock hazards", "Route AC mains directly underneath the DC ground plane at 0.1 mm spacing", "Connect Earth GND directly to AC Live", "Omit the fuse before the transformer"], 0, "Adequate creepage and clearance prevent dielectric breakdown and meet electrical safety standards."],
    ["Why should decoupling capacitors (e.g., 100 nF ceramic) be placed physically as close as possible to IC supply/ground pins on the PCB?", ["To minimize trace loop inductance so high-frequency current transients are shunted cleanly at the IC pins", "To look symmetrical on silkscreen", "To increase output ripple voltage", "To replace the bridge rectifier"], 0, "Long traces add inductance (nH/mm) that undermines high-frequency bypassing."],
  ],
};

function buildGenericDomainFallback(
  labId: string,
  title: string,
  domainLabel: string,
  objective?: string,
  formula?: string
): [PostLabMcq, PostLabMcq, PostLabMcq] {
  const formulaSnippet = formula ? formula.split("|")[0].trim() : "circuit conservation laws";
  return toMcqs(labId, [
    [
      `What is the primary engineering objective verified in "${title}" (${labId})?`,
      [
        objective ? objective.slice(0, 115) : `Experimental & simulated verification of ${title}`,
        "Eliminating ground references from all SPICE netlists",
        "Operating semiconductor junctions beyond maximum thermal breakdown",
        "Replacing all passive impedances with open circuits",
      ],
      0,
      objective || `This laboratory verifies the core behavior, measurements, and theory of ${title}.`,
    ],
    [
      `Which governing relation or analytical framework directly applies to "${title}"?`,
      [
        "Only 800 kHz WS2812B LED timing",
        formulaSnippet,
        "Zero-bias reverse diode insulation only",
        "Mechanical gear-ratio kinematics",
      ],
      1,
      `Calculations and measurements in ${labId} center on ${formulaSnippet}.`,
    ],
    [
      `In ${domainLabel}, what is best engineering practice before energizing or concluding verification on "${title}"?`,
      [
        "Cross-check theoretical calculations against simulated waveforms/measurements and verify common ground & safe ratings",
        "Remove current-limiting protection and short supply rails together",
        "Ignore unit scaling (mV vs. V, µF vs. F) in observation tables",
        "Leave digital/analog probe references floating",
      ],
      0,
      "Comparing analytical predictions with simulated/bench measurements under verified ground and safe limits confirms experiment accuracy.",
    ],
  ]);
}

export function buildQuizContextForMasterLab(lab: MasterLabItem): PostLabQuizContext {
  const domainInfo = MASTER_DOMAINS[lab.domain];
  const domainLabel = domainInfo ? `${domainInfo.title}` : `Domain ${lab.domain}`;
  const raw = MASTER_75_QUIZ_BANK[lab.id];
  const questions = raw
    ? toMcqs(lab.id, raw)
    : buildGenericDomainFallback(lab.id, lab.title, domainLabel, lab.objective, lab.formula);

  return {
    labId: lab.id,
    labTitle: lab.title,
    domain: domainLabel,
    category: lab.category,
    questions,
  };
}

export function buildQuizContextForEsp32(exp: Esp32ExperimentDef): PostLabQuizContext {
  const labId = `ESP32-${exp.id}`;
  const raw = ESP32_QUIZ_BANK[exp.id];
  const questions = raw
    ? toMcqs(labId, raw)
    : buildGenericDomainFallback(labId, exp.title, "ESP32 Embedded Lab", exp.summary, exp.explanation);

  return {
    labId,
    labTitle: `Exp #${exp.id}: ${exp.title}`,
    domain: "ESP32 Embedded Systems",
    category: exp.category,
    questions,
  };
}

export function buildQuizContextForGuidedExperiment(exp: GuidedExperimentDef): PostLabQuizContext {
  const raw = GUIDED_QUIZ_BANK[exp.id];
  const questions = raw
    ? toMcqs(exp.id, raw)
    : buildGenericDomainFallback(
        exp.id,
        exp.title,
        `Course ${exp.courseDomain} · ${exp.category}`,
        exp.learningObjectives[0],
        exp.governingFormulas[0]
      );

  return {
    labId: exp.id,
    labTitle: exp.title,
    domain: `${exp.category} (Course ${exp.courseDomain})`,
    category: "Practical Laboratory Experiment",
    questions,
  };
}

export function getPostLabQuizByMasterId(labId: string): PostLabQuizContext | null {
  const lab = MASTER_75_LABS.find((item) => item.id === labId);
  return lab ? buildQuizContextForMasterLab(lab) : null;
}

export function getPostLabQuizByEsp32Id(lessonId: number): PostLabQuizContext | null {
  const exp = ESP32_20_EXPERIMENTS.find((item) => item.id === lessonId);
  return exp ? buildQuizContextForEsp32(exp) : null;
}
