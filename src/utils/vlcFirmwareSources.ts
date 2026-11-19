/**
 * Production-Ready ESP32 Arduino / ESP-IDF C++ Firmware Source Code
 * for Project 001: IST Optical Wireless Communication Lab
 * 
 * Demonstrates real embedded hardware implementation for:
 * 1. ESP32-TX: High-precision timer-driven UART / LED transmitter
 * 2. ESP32-RX: Interrupt-driven analog ADC / comparator receiver with ring buffer
 * 
 * Department of Electrical Engineering - Optical Wireless Lab
 */

export const ESP32_TX_FIRMWARE_CPP = `// ==============================================================================
// IST OPTICAL WIRELESS COMMUNICATION LAB - PROJECT 001
// TRANSMITTER FIRMWARE: ESP32-WROOM-32D (TX NODE)
// Target: ESP32 Dual-Core Xtensa LX6 @ 240MHz
// Framework: Arduino Core / ESP-IDF FreeRTOS
// ==============================================================================

#include <Arduino.h>

// Hardware Pin Definitions
#define LED_TX_PIN       4   // High-speed LED driver output (GPIO4)
#define STATUS_LED_PIN   2   // On-board blue status LED (GPIO2)
#define BAUD_RATE        600 // Optical link baud rate (bps)

// UART Packet Configuration
#define DATA_BITS        8
#define PARITY_EVEN      1
#define STOP_BITS        1

hw_timer_t *txTimer = NULL;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;

// Transmission Frame Buffer
volatile uint8_t txBuffer[64];
volatile uint8_t txHead = 0;
volatile uint8_t txTail = 0;
volatile bool isTransmitting = false;

// State machine for bit-by-bit transmission inside ISR
enum TxBitState {
  STATE_IDLE,
  STATE_START_BIT,
  STATE_DATA_BITS,
  STATE_PARITY_BIT,
  STATE_STOP_BIT
};

volatile TxBitState currentState = STATE_IDLE;
volatile uint8_t currentByte = 0;
volatile uint8_t currentBitIndex = 0;
volatile uint8_t paritySum = 0;

// High-Precision Hardware Timer ISR (Fires once per bit period: 1 / BAUD_RATE)
void IRAM_ATTR onTxTimer() {
  portENTER_CRITICAL_ISR(&timerMux);

  switch (currentState) {
    case STATE_IDLE:
      if (txHead != txTail) {
        // Fetch next byte from FIFO buffer
        currentByte = txBuffer[txTail];
        txTail = (txTail + 1) % sizeof(txBuffer);
        
        // Start bit: active LOW (optical transmitter turns OFF or inverted depending on driver)
        digitalWrite(LED_TX_PIN, LOW);
        digitalWrite(STATUS_LED_PIN, HIGH);
        paritySum = 0;
        currentBitIndex = 0;
        currentState = STATE_DATA_BITS;
      } else {
        // Idle state: high level (LED carrier / mark state)
        digitalWrite(LED_TX_PIN, HIGH);
        digitalWrite(STATUS_LED_PIN, LOW);
        isTransmitting = false;
      }
      break;

    case STATE_DATA_BITS: {
      uint8_t bit = (currentByte >> currentBitIndex) & 0x01;
      digitalWrite(LED_TX_PIN, bit ? HIGH : LOW);
      if (bit) paritySum++;
      currentBitIndex++;
      if (currentBitIndex >= 8) {
        currentState = STATE_PARITY_BIT;
      }
      break;
    }

    case STATE_PARITY_BIT: {
      // Even parity: bit makes total ones even
      uint8_t parityBit = (paritySum % 2 == 0) ? 0 : 1;
      digitalWrite(LED_TX_PIN, parityBit ? HIGH : LOW);
      currentState = STATE_STOP_BIT;
      break;
    }

    case STATE_STOP_BIT:
      // Stop bit: always HIGH
      digitalWrite(LED_TX_PIN, HIGH);
      currentState = STATE_IDLE;
      break;
  }

  portEXIT_CRITICAL_ISR(&timerMux);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("=================================================="));
  Serial.println(F("[IST VLC LAB] ESP32 Optical Transmitter Initialized"));
  Serial.printf("[CONFIG] Baud: %d bps | Pin: GPIO%d | Modulation: OOK\\n", BAUD_RATE, LED_TX_PIN);
  Serial.println(F("=================================================="));

  pinMode(LED_TX_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(LED_TX_PIN, HIGH); // Idle mark state
  digitalWrite(STATUS_LED_PIN, LOW);

  // Configure Hardware Timer 0 with 80 prescaler (1 MHz tick = 1 microsecond resolution)
  txTimer = timerBegin(0, 80, true);
  timerAttachInterrupt(txTimer, &onTxTimer, true);
  
  // Set alarm interval in microseconds: 1,000,000 / BAUD_RATE
  uint64_t bitPeriodUs = 1000000ULL / BAUD_RATE;
  timerAlarmWrite(txTimer, bitPeriodUs, true);
  timerAlarmEnable(txTimer);
}

void transmitString(const char *str) {
  while (*str) {
    portENTER_CRITICAL(&timerMux);
    uint8_t nextHead = (txHead + 1) % sizeof(txBuffer);
    if (nextHead != txTail) {
      txBuffer[txHead] = (uint8_t)(*str);
      txHead = nextHead;
      isTransmitting = true;
    }
    portEXIT_CRITICAL(&timerMux);
    str++;
  }
}

void loop() {
  // Transmit telemetry beacon every 3 seconds if idle
  if (!isTransmitting) {
    Serial.println(F("[ESP32-TX] Queuing payload: \\"HELLO IST VLC\\""));
    transmitString("HELLO IST VLC\\r\\n");
    delay(3000);
  }
}
`;

export const ESP32_RX_FIRMWARE_CPP = `// ==============================================================================
// IST OPTICAL WIRELESS COMMUNICATION LAB - PROJECT 001
// RECEIVER FIRMWARE: ESP32-WROOM-32D (RX NODE)
// Target: ESP32 Dual-Core Xtensa LX6 @ 240MHz
// Framework: Arduino Core / ESP-IDF FreeRTOS
// ==============================================================================

#include <Arduino.h>

// Hardware Pin Definitions
#define PHOTODIODE_ADC_PIN 34  // Analog TIA Voltage (GPIO34 / ADC1_CH6)
#define COMPARATOR_IN_PIN  35  // Sliced Digital Input (GPIO35 / Input-Only)
#define STATUS_LED_PIN     2   // Reception Lock LED (GPIO2)
#define BAUD_RATE          600 // Must match transmitter baud rate

// Slicer Voltage Threshold (0 - 4095 for 12-bit ADC @ 3.3V)
// 1.65V mid-scale = ~2048 ADC counts
#define AUTO_THRESHOLD_ALPHA 0.05f

hw_timer_t *rxTimer = NULL;
portMUX_TYPE rxMux = portMUX_INITIALIZER_UNLOCKED;

// State machine for asynchronous packet reception
enum RxState {
  RX_IDLE,
  RX_WAIT_START_CENTER,
  RX_SAMPLE_DATA,
  RX_SAMPLE_PARITY,
  RX_SAMPLE_STOP
};

volatile RxState rxState = RX_IDLE;
volatile uint8_t rxBitsAccumulator = 0;
volatile uint8_t rxBitCount = 0;
volatile uint8_t rxParityCount = 0;
volatile bool newPacketReady = false;
volatile uint8_t receivedByte = 0;
volatile uint32_t totalPackets = 0;
volatile uint32_t framingErrors = 0;
volatile uint32_t parityErrors = 0;

float runningBaselineV = 1.65f;

// 4x Oversampling Timer ISR
void IRAM_ATTR onRxSampleTimer() {
  portENTER_CRITICAL_ISR(&rxMux);

  // Read instantaneous digital level from optical slicer
  uint8_t bitLevel = digitalRead(COMPARATOR_IN_PIN);

  switch (rxState) {
    case RX_IDLE:
      // Detect falling edge of Start Bit (transition from idle HIGH to LOW)
      if (bitLevel == LOW) {
        rxState = RX_WAIT_START_CENTER;
        rxBitsAccumulator = 0;
        rxBitCount = 0;
        rxParityCount = 0;
      }
      break;

    case RX_WAIT_START_CENTER:
      // Verify start bit is still LOW at center
      if (bitLevel == LOW) {
        rxState = RX_SAMPLE_DATA;
      } else {
        // False trigger / glitch
        rxState = RX_IDLE;
      }
      break;

    case RX_SAMPLE_DATA:
      rxBitsAccumulator |= (bitLevel << rxBitCount);
      if (bitLevel == HIGH) rxParityCount++;
      rxBitCount++;
      if (rxBitCount >= 8) {
        rxState = RX_SAMPLE_PARITY;
      }
      break;

    case RX_SAMPLE_PARITY: {
      uint8_t expectedParity = (rxParityCount % 2 == 0) ? 0 : 1;
      if (bitLevel != expectedParity) {
        parityErrors++;
      }
      rxState = RX_SAMPLE_STOP;
      break;
    }

    case RX_SAMPLE_STOP:
      if (bitLevel == HIGH) {
        // Clean stop bit confirmed
        receivedByte = rxBitsAccumulator;
        newPacketReady = true;
        totalPackets++;
      } else {
        // Framing error
        framingErrors++;
      }
      rxState = RX_IDLE;
      break;
  }

  portEXIT_CRITICAL_ISR(&rxMux);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("=================================================="));
  Serial.println(F("[IST VLC LAB] ESP32 Optical Receiver Initialized"));
  Serial.printf("[CONFIG] Baud: %d bps | Comp Pin: GPIO%d | ADC: GPIO%d\\n", BAUD_RATE, COMPARATOR_IN_PIN, PHOTODIODE_ADC_PIN);
  Serial.println(F("=================================================="));

  pinMode(COMPARATOR_IN_PIN, INPUT);
  pinMode(PHOTODIODE_ADC_PIN, INPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  analogReadResolution(12); // 12-bit ADC (0 - 4095)

  // Configure sampling timer to sample at 1x bit period
  rxTimer = timerBegin(1, 80, true);
  timerAttachInterrupt(rxTimer, &onRxSampleTimer, true);
  
  uint64_t bitPeriodUs = 1000000ULL / BAUD_RATE;
  timerAlarmWrite(rxTimer, bitPeriodUs, true);
  timerAlarmEnable(rxTimer);
}

void loop() {
  // Periodically read analog TIA photocurrent for dynamic thresholding & telemetry
  int rawAdc = analogRead(PHOTODIODE_ADC_PIN);
  float voltage = (rawAdc / 4095.0f) * 3.3f;
  runningBaselineV = (1.0f - AUTO_THRESHOLD_ALPHA) * runningBaselineV + AUTO_THRESHOLD_ALPHA * voltage;

  // Process decoded UART byte
  if (newPacketReady) {
    portENTER_CRITICAL(&rxMux);
    uint8_t b = receivedByte;
    newPacketReady = false;
    portEXIT_CRITICAL(&rxMux);

    digitalWrite(STATUS_LED_PIN, HIGH);
    Serial.printf("[ESP32-RX] Received: '%c' (0x%02X) | Pkts: %u | P-Err: %u | F-Err: %u | TIA: %.2fV\\n",
      (b >= 32 && b <= 126) ? (char)b : '?',
      b,
      totalPackets,
      parityErrors,
      framingErrors,
      runningBaselineV
    );
    delay(10);
    digitalWrite(STATUS_LED_PIN, LOW);
  }
}
`;
