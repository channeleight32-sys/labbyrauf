/**
 * Visible Light Communication (VLC) Physical Channel & Modulation Simulation Engine
 * 
 * Implements a physically accurate line-of-sight (LOS) Lambertian optical channel model,
 * PIN photodiode responsivity, ambient optical noise, transimpedance amplifier (TIA) dynamics,
 * Manchester / OOK-NRZ / PWM modulation schemes, Eye Diagram synthesis, and UART asynchronous framing.
 * 
 * Optical Wireless VLC Simulation Workbench - Project 001
 */

export type VlcModulation = "OOK_NRZ" | "MANCHESTER" | "PWM";
export type VlcParity = "NONE" | "EVEN" | "ODD";
export type VlcWavelength = "RED_650" | "GREEN_525" | "BLUE_470" | "WHITE_PHOSPHOR";

export interface VlcTransmitterParams {
  wavelength: VlcWavelength;
  halfPowerAngleDeg: number; // LED semi-angle at half power (Phi_1/2), typ 30 deg
  driveCurrentMa: number;    // LED forward current (5 - 50 mA)
  efficiencyWPerA: number;   // LED radiant efficacy (typ 0.25 W/A)
  baudRate: number;          // 100, 300, 600, 1200, 2400, 4800, 9600 bps
  modulation: VlcModulation;
  parity: VlcParity;
}

export interface VlcChannelParams {
  distanceM: number;         // Link distance in meters (0.1m - 5.0m)
  irradianceAngleDeg: number;// Alignment angle between transmitter normal and receiver (0 - 45 deg)
  incidenceAngleDeg: number; // Angle between receiver normal and line-of-sight (0 - 45 deg)
  ambientLightLux: number;   // Ambient optical background (0 - 10000 lux)
}

export interface VlcReceiverParams {
  photodiodeAreaMm2: number; // Active surface area (typ 7.5 mm^2)
  responsivityAW: number;    // Spectral responsivity (0.35 - 0.65 A/W)
  receiverFovDeg: number;    // Field of View semi-angle (typ 60 deg)
  lensConcentratorGain: number; // Optical concentrator lens gain (1.0 - 5.0x)
  tiaFeedbackResistorOhm: number; // TIA transimpedance gain Rf (10k - 500k ohm)
  acCoupledFilter: boolean;  // High-pass DC rejection of ambient sunlight
  autoThreshold: boolean;    // Dynamic slicing threshold vs manual
  manualThresholdVolts: number; // Manual comparator threshold (0.1V - 3.0V)
}

export interface VlcFrameBit {
  bitIndex: number;
  type: "START" | "DATA" | "PARITY" | "STOP" | "IDLE";
  value: 0 | 1;
  charIndex: number;
  char: string;
}

export interface VlcWaveformSample {
  timeMs: number;
  txDigital: number;           // 0 or 3.3V
  txOpticalPowerMw: number;    // Transmitted optical power (mW)
  rxOpticalPowerUw: number;    // Optical power hitting photodiode (uW)
  rxPhotocurrentUa: number;    // Signal + ambient + noise current (uA)
  rxTiaVolts: number;          // Analog voltage after TIA (0 - 3.3V)
  rxComparatorDigital: number; // Sliced digital 0 or 3.3V
  thresholdVolts: number;      // Slicer reference line
  bitSamplePoint?: boolean;    // True at 50% bit period
}

export interface VlcEyeTracePoint {
  xNorm: number; // 0 to 2.0 (bit periods)
  volts: number; // 0 to 3.3V
}

export interface VlcEyeTrace {
  traceId: number;
  points: VlcEyeTracePoint[];
}

export interface VlcEyeMetrics {
  eyeHeightVolts: number;
  eyeWidthPct: number;
  eyeOpeningStatus: "WIDE_OPEN" | "ACCEPTABLE" | "DEGRADED" | "CLOSED";
  noiseMarginMv: number;
}

export interface VlcPacketStatistics {
  totalBitsTransmitted: number;
  totalBitErrors: number;
  measuredBer: number;
  theoreticalBer: number;
  snrDb: number;
  receivedPowerUw: number;
  receivedPowerDbm: number;
  ambientCurrentUa: number;
  noiseRmsMv: number;
  packetsSent: number;
  packetsReceived: number;
  packetLossCount: number;
  packetSuccessRatePct: number;
  framingErrors: number;
  parityErrors: number;
  throughputBps: number;
  channelDcGainH0: number;
  effectiveThresholdVolts: number;
}

export interface VlcSimulationResult {
  transmittedBits: VlcFrameBit[];
  receivedRawBits: (0 | 1)[];
  bitMatchStatus: boolean[]; // true = correct bit, false = error
  decodedText: string;
  decodedBytesHex: string[];
  statistics: VlcPacketStatistics;
  waveforms: VlcWaveformSample[];
  eyeTraces: VlcEyeTrace[];
  eyeMetrics: VlcEyeMetrics;
  txSerialLogs: string[];
  rxSerialLogs: string[];
}

// Physical constants
const ELECTRON_CHARGE_Q = 1.602176634e-19; // Coulombs
const BOLTZMANN_K = 1.380649e-23;          // J/K
const ROOM_TEMP_KELVIN = 298.15;           // 25 deg C

/**
 * Encodes ASCII string into UART framed bits (1 Start bit '0', 8 Data bits LSB-first, optional Parity, 1 Stop bit '1')
 */
export function encodeAsciiToUartBits(
  text: string,
  parity: VlcParity
): VlcFrameBit[] {
  const result: VlcFrameBit[] = [];
  let bitCounter = 0;

  const sanitized = text.length > 0 ? text : "HELLO";

  for (let c = 0; c < sanitized.length; c++) {
    const char = sanitized[c];
    const charCode = char.charCodeAt(0) & 0xff;

    // Start bit: always '0' (active low)
    result.push({
      bitIndex: bitCounter++,
      type: "START",
      value: 0,
      charIndex: c,
      char,
    });

    // 8 Data bits: LSB first
    let onesCount = 0;
    for (let b = 0; b < 8; b++) {
      const bitVal = ((charCode >> b) & 1) as 0 | 1;
      if (bitVal === 1) onesCount++;
      result.push({
        bitIndex: bitCounter++,
        type: "DATA",
        value: bitVal,
        charIndex: c,
        char,
      });
    }

    // Optional Parity bit
    if (parity !== "NONE") {
      let parityVal: 0 | 1 = 0;
      if (parity === "EVEN") {
        parityVal = onesCount % 2 === 0 ? 0 : 1;
      } else if (parity === "ODD") {
        parityVal = onesCount % 2 === 1 ? 0 : 1;
      }
      result.push({
        bitIndex: bitCounter++,
        type: "PARITY",
        value: parityVal,
        charIndex: c,
        char,
      });
    }

    // Stop bit: always '1' (idle high mark)
    result.push({
      bitIndex: bitCounter++,
      type: "STOP",
      value: 1,
      charIndex: c,
      char,
    });
  }

  return result;
}

/**
 * Computes Lambertian radiation order m from semi-angle at half power:
 * m = -ln(2) / ln(cos(Phi_1/2))
 */
export function calculateLambertianOrder(halfPowerAngleDeg: number): number {
  const phiRad = Math.max(5, Math.min(85, halfPowerAngleDeg)) * (Math.PI / 180);
  const cosPhi = Math.cos(phiRad);
  return -Math.LN2 / Math.log(cosPhi);
}

/**
 * Computes Line-of-Sight (LOS) optical channel DC gain H(0)
 * H(0) = [(m + 1) * A_pd / (2 * pi * d^2)] * cos^m(phi) * cos(psi) * T_s * g(psi)
 */
export function calculateOpticalChannelGain(
  transmitter: VlcTransmitterParams,
  channel: VlcChannelParams,
  receiver: VlcReceiverParams
): number {
  const d = Math.max(0.05, channel.distanceM);
  const phiRad = channel.irradianceAngleDeg * (Math.PI / 180);
  const psiRad = channel.incidenceAngleDeg * (Math.PI / 180);
  const fovRad = receiver.receiverFovDeg * (Math.PI / 180);

  // If incident ray falls outside receiver optical Field of View, direct LOS path is 0
  if (psiRad > fovRad) {
    return 0;
  }

  const m = calculateLambertianOrder(transmitter.halfPowerAngleDeg);
  const apdM2 = receiver.photodiodeAreaMm2 * 1e-6; // mm^2 to m^2

  const cosPhi = Math.max(0, Math.cos(phiRad));
  const cosPsi = Math.max(0, Math.cos(psiRad));

  // Geometric Lambertian propagation
  const geometricFactor = ((m + 1) * apdM2) / (2 * Math.PI * Math.pow(d, 2));
  const opticalFilterTs = 0.94; // 94% glass / acrylic window transmittance
  const concentratorGain = Math.max(1.0, receiver.lensConcentratorGain);

  const h0 = geometricFactor * Math.pow(cosPhi, m) * cosPsi * opticalFilterTs * concentratorGain;
  return Math.max(0, h0);
}

/**
 * Deterministic Mulberry32 PRNG for repeatable waveform & noise synthesis
 */
function createSeededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashVlcSeed(
  message: string,
  tx: VlcTransmitterParams,
  ch: VlcChannelParams,
  rx: VlcReceiverParams
): number {
  const signature = [
    message,
    tx.wavelength,
    tx.halfPowerAngleDeg,
    tx.driveCurrentMa,
    tx.efficiencyWPerA,
    tx.baudRate,
    tx.modulation,
    tx.parity,
    ch.distanceM,
    ch.irradianceAngleDeg,
    ch.incidenceAngleDeg,
    ch.ambientLightLux,
    rx.photodiodeAreaMm2,
    rx.responsivityAW,
    rx.receiverFovDeg,
    rx.lensConcentratorGain,
    rx.tiaFeedbackResistorOhm,
    rx.acCoupledFilter ? 1 : 0,
    rx.autoThreshold ? 1 : 0,
    rx.manualThresholdVolts,
  ].join("|");
  let h = 2166136261;
  for (let i = 0; i < signature.length; i++) {
    h ^= signature.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Box-Muller Gaussian random generator
 */
function gaussianRandom(mean = 0, stdev = 1, rng: () => number = Math.random): number {
  const u = Math.max(1e-12, 1 - rng());
  const v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdev;
}

/**
 * Complementary error function erfc(x) for Gaussian tail probabilities
 */
function erfc(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x);
  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);

  return sign === 1 ? 1.0 - y : 1.0 + y;
}

/**
 * Q-function: Q(x) = 0.5 * erfc(x / sqrt(2))
 */
export function qFunction(x: number): number {
  if (x <= 0) return 0.5;
  if (x > 8) return 1e-15;
  return 0.5 * erfc(x / Math.SQRT2);
}

/**
 * Full End-to-End Visible Light Communication Simulation Engine
 */
export function runVlcSimulation(
  message: string,
  transmitter: VlcTransmitterParams,
  channel: VlcChannelParams,
  receiver: VlcReceiverParams
): VlcSimulationResult {
  // Sanitize message
  const safeMessage = message.trim().length > 0 ? message : "HELLO";
  const txBits = encodeAsciiToUartBits(safeMessage, transmitter.parity);
  const seededRng = createSeededRng(hashVlcSeed(safeMessage, transmitter, channel, receiver));

  // 1. Transmitter Optical Power
  // P_opt = I_led * eta_optical
  const ledCurrentA = transmitter.driveCurrentMa * 1e-3;
  const maxTxOpticalPowerW = ledCurrentA * transmitter.efficiencyWPerA;
  const maxTxOpticalPowerMw = maxTxOpticalPowerW * 1000;

  // 2. Optical Channel Propagation
  const h0 = calculateOpticalChannelGain(transmitter, channel, receiver);
  const rxOpticalPowerPeakW = maxTxOpticalPowerW * h0;
  const rxOpticalPowerPeakUw = rxOpticalPowerPeakW * 1e6;

  // 3. Ambient Light Conversion (Lux to Irradiance)
  // Standard CIE daylight efficacy ~ 116 lm/W -> E_e (W/m^2) = E_v (lux) / 116
  const ambientIrradianceWPerM2 = channel.ambientLightLux / 116;
  const apdM2 = receiver.photodiodeAreaMm2 * 1e-6;
  const ambientOpticalPowerW = ambientIrradianceWPerM2 * apdM2;
  const ambientPhotocurrentA = ambientOpticalPowerW * receiver.responsivityAW;
  const ambientPhotocurrentUa = ambientPhotocurrentA * 1e6;

  // 4. Noise Physics Calculations
  const bandwidthHz = Math.max(1000, transmitter.baudRate * 5); // Receiver front-end bandwidth
  const darkCurrentA = 2e-9; // 2 nA typical for silicon PIN diode

  // Signal peak current
  const signalPhotocurrentPeakA = rxOpticalPowerPeakW * receiver.responsivityAW;

  // Shot noise variance: sigma_shot^2 = 2 * q * (I_sig + I_amb + I_dark) * B
  const totalDCCurrentA = signalPhotocurrentPeakA * 0.5 + ambientPhotocurrentA + darkCurrentA;
  const shotNoiseVar = 2 * ELECTRON_CHARGE_Q * totalDCCurrentA * bandwidthHz;

  // Thermal noise variance: sigma_thermal^2 = (4 * k_B * T / R_f) * B
  const thermalNoiseVar = (4 * BOLTZMANN_K * ROOM_TEMP_KELVIN / Math.max(1000, receiver.tiaFeedbackResistorOhm)) * bandwidthHz;
  const totalNoiseCurrentRmsA = Math.sqrt(shotNoiseVar + thermalNoiseVar);
  const totalNoiseVoltageRmsV = totalNoiseCurrentRmsA * receiver.tiaFeedbackResistorOhm;

  // 5. TIA Signal Amplitude & DC Offset
  const peakSignalVoltageV = signalPhotocurrentPeakA * receiver.tiaFeedbackResistorOhm;
  const ambientVoltageOffsetV = receiver.acCoupledFilter
    ? 0.05 // AC coupled has near-zero residual DC offset
    : Math.min(3.0, ambientPhotocurrentA * receiver.tiaFeedbackResistorOhm);

  // 6. Slicing Decision Threshold
  let effectiveThresholdVolts: number;
  if (receiver.autoThreshold) {
    // Optimum adaptive mid-point slicing threshold
    effectiveThresholdVolts = ambientVoltageOffsetV + (peakSignalVoltageV / 2);
  } else {
    effectiveThresholdVolts = receiver.manualThresholdVolts;
  }
  // Clamp threshold within safe operating voltage window (0.05V - 3.2V)
  effectiveThresholdVolts = Math.max(0.05, Math.min(3.2, effectiveThresholdVolts));

  // 7. SNR & Theoretical Bit Error Rate
  // For unipolar OOK: SNR = (V_sig,peak / (2 * sigma_v))^2
  const snrLinear = totalNoiseVoltageRmsV > 1e-9
    ? Math.pow(peakSignalVoltageV / (2 * totalNoiseVoltageRmsV), 2)
    : 1e5;
  const snrDb = 10 * Math.log10(Math.max(0.01, snrLinear));
  // Standard theoretical BER for unipolar OOK is Q(sqrt(SNR))
  const theoreticalBer = qFunction(Math.sqrt(Math.max(0, snrLinear)));

  // Received optical power in dBm
  const rxPowerMw = rxOpticalPowerPeakW * 1000;
  const receivedPowerDbm = rxPowerMw > 1e-12
    ? 10 * Math.log10(rxPowerMw)
    : -120;

  // 8. Bit-by-Bit Physical Simulation & Waveform Generation
  const receivedRawBits: (0 | 1)[] = [];
  const bitMatchStatus: boolean[] = [];
  const waveforms: VlcWaveformSample[] = [];

  const SAMPLES_PER_BIT = 8;
  const bitDurationSec = 1 / transmitter.baudRate;
  const sampleDurationSec = bitDurationSec / SAMPLES_PER_BIT;
  const sampleDurationMs = sampleDurationSec * 1000;

  let totalErrors = 0;
  let currentTimeMs = 0;

  // Add 2 idle bits at start for clean oscilloscope trigger
  const idleLeadBits = 2;
  for (let b = 0; b < idleLeadBits; b++) {
    for (let s = 0; s < SAMPLES_PER_BIT; s++) {
      const instantNoiseV = gaussianRandom(0, totalNoiseVoltageRmsV, seededRng);
      const tiaVolts = Math.min(3.3, Math.max(0, ambientVoltageOffsetV + peakSignalVoltageV + instantNoiseV));
      waveforms.push({
        timeMs: Number(currentTimeMs.toFixed(3)),
        txDigital: 3.3,
        txOpticalPowerMw: maxTxOpticalPowerMw,
        rxOpticalPowerUw: rxOpticalPowerPeakUw,
        rxPhotocurrentUa: (signalPhotocurrentPeakA + ambientPhotocurrentA) * 1e6,
        rxTiaVolts: Number(tiaVolts.toFixed(3)),
        rxComparatorDigital: 3.3,
        thresholdVolts: Number(effectiveThresholdVolts.toFixed(3)),
      });
      currentTimeMs += sampleDurationMs;
    }
  }

  // Iterate over each framed bit
  for (let i = 0; i < txBits.length; i++) {
    const bit = txBits[i];
    const isHigh = bit.value === 1;

    let sampledVoltageAtMid = 0;
    let firstHalfVoltageSum = 0;
    let secondHalfVoltageSum = 0;

    for (let s = 0; s < SAMPLES_PER_BIT; s++) {
      const isMidSample = s === Math.floor(SAMPLES_PER_BIT / 2);

      // Modulation-dependent physical optical output
      let opticalDriveRatio = 0;
      if (transmitter.modulation === "OOK_NRZ") {
        opticalDriveRatio = isHigh ? 1.0 : 0.0;
      } else if (transmitter.modulation === "MANCHESTER") {
        // Manchester: '1' = High then Low; '0' = Low then High
        const isFirstHalf = s < SAMPLES_PER_BIT / 2;
        opticalDriveRatio = isHigh
          ? (isFirstHalf ? 1.0 : 0.0)
          : (isFirstHalf ? 0.0 : 1.0);
      } else if (transmitter.modulation === "PWM") {
        // PWM: '1' = 75% duty cycle, '0' = 25% duty cycle
        const dutyThreshold = isHigh ? SAMPLES_PER_BIT * 0.75 : SAMPLES_PER_BIT * 0.25;
        opticalDriveRatio = s < dutyThreshold ? 1.0 : 0.0;
      }

      const txDigital = opticalDriveRatio > 0.5 ? 3.3 : 0.0;
      const txPowerMw = maxTxOpticalPowerMw * opticalDriveRatio;
      const rxPowerUw = rxOpticalPowerPeakUw * opticalDriveRatio;
      const sigCurrentA = signalPhotocurrentPeakA * opticalDriveRatio;

      // Realistic noise on this sample
      const instantNoiseV = gaussianRandom(0, totalNoiseVoltageRmsV, seededRng);
      const rawTiaVolts = ambientVoltageOffsetV + (sigCurrentA * receiver.tiaFeedbackResistorOhm) + instantNoiseV;
      const clampedTiaVolts = Math.min(3.3, Math.max(0, rawTiaVolts));

      const comparatorOut = clampedTiaVolts >= effectiveThresholdVolts ? 3.3 : 0.0;

      if (isMidSample) {
        sampledVoltageAtMid = clampedTiaVolts;
      }

      if (s < SAMPLES_PER_BIT / 2) {
        firstHalfVoltageSum += clampedTiaVolts;
      } else {
        secondHalfVoltageSum += clampedTiaVolts;
      }

      if (waveforms.length < 2400) {
        waveforms.push({
          timeMs: Number(currentTimeMs.toFixed(3)),
          txDigital,
          txOpticalPowerMw: Number(txPowerMw.toFixed(3)),
          rxOpticalPowerUw: Number(rxPowerUw.toFixed(4)),
          rxPhotocurrentUa: Number(((sigCurrentA + ambientPhotocurrentA) * 1e6).toFixed(3)),
          rxTiaVolts: Number(clampedTiaVolts.toFixed(3)),
          rxComparatorDigital: comparatorOut,
          thresholdVolts: Number(effectiveThresholdVolts.toFixed(3)),
          bitSamplePoint: isMidSample,
        });
      }

      currentTimeMs += sampleDurationMs;
    }

    // Demodulation & Decision Slicer
    let decodedBitVal: 0 | 1 = 0;
    if (transmitter.modulation === "OOK_NRZ") {
      decodedBitVal = sampledVoltageAtMid >= effectiveThresholdVolts ? 1 : 0;
    } else if (transmitter.modulation === "MANCHESTER") {
      // Differential Manchester slicing: compares first half to second half
      // '1' has first half > second half; '0' has second half > first half
      decodedBitVal = firstHalfVoltageSum > secondHalfVoltageSum ? 1 : 0;
    } else if (transmitter.modulation === "PWM") {
      // PWM: sample at 50% bit mark. '1' is still high (75% duty), '0' is already low (25% duty)
      decodedBitVal = sampledVoltageAtMid >= effectiveThresholdVolts ? 1 : 0;
    }

    receivedRawBits.push(decodedBitVal);
    const matches = decodedBitVal === bit.value;
    bitMatchStatus.push(matches);
    if (!matches) totalErrors++;
  }

  // 9. Eye Diagram Trace Extraction (2 Bit Period Windows)
  const eyeTraces: VlcEyeTrace[] = [];
  const samplesPer2Bits = SAMPLES_PER_BIT * 2;
  const numEyeWindows = Math.min(30, Math.floor(waveforms.length / samplesPer2Bits));

  for (let w = 0; w < numEyeWindows; w++) {
    const startIndex = w * samplesPer2Bits;
    const windowPoints: VlcEyeTracePoint[] = [];

    for (let s = 0; s < samplesPer2Bits; s++) {
      const idx = startIndex + s;
      if (idx < waveforms.length) {
        const xNorm = s / SAMPLES_PER_BIT; // 0 to 2.0
        windowPoints.push({
          xNorm: Number(xNorm.toFixed(2)),
          volts: waveforms[idx].rxTiaVolts,
        });
      }
    }

    if (windowPoints.length === samplesPer2Bits) {
      eyeTraces.push({
        traceId: w,
        points: windowPoints,
      });
    }
  }

  // Eye Metrics calculation
  // Find eye opening height around center: xNorm in [0.4, 0.6] and [1.4, 1.6]
  const centerSamplesHigh: number[] = [];
  const centerSamplesLow: number[] = [];
  
  for (const trace of eyeTraces) {
    for (const pt of trace.points) {
      if ((pt.xNorm >= 0.4 && pt.xNorm <= 0.6) || (pt.xNorm >= 1.4 && pt.xNorm <= 1.6)) {
        if (pt.volts >= effectiveThresholdVolts) {
          centerSamplesHigh.push(pt.volts);
        } else {
          centerSamplesLow.push(pt.volts);
        }
      }
    }
  }

  const minHigh = centerSamplesHigh.length > 0 ? Math.min(...centerSamplesHigh) : effectiveThresholdVolts;
  const maxLow = centerSamplesLow.length > 0 ? Math.max(...centerSamplesLow) : effectiveThresholdVolts;
  const rawEyeHeight = Math.max(0, minHigh - maxLow);
  const eyeHeightVolts = Number(rawEyeHeight.toFixed(2));
  const noiseMarginMv = Math.round(rawEyeHeight * 500);

  let eyeOpeningStatus: VlcEyeMetrics["eyeOpeningStatus"] = "WIDE_OPEN";
  let eyeWidthPct = 85;

  if (snrDb >= 16 && eyeHeightVolts > 0.4) {
    eyeOpeningStatus = "WIDE_OPEN";
    eyeWidthPct = 88;
  } else if (snrDb >= 9 && eyeHeightVolts > 0.15) {
    eyeOpeningStatus = "ACCEPTABLE";
    eyeWidthPct = 65;
  } else if (snrDb >= 4) {
    eyeOpeningStatus = "DEGRADED";
    eyeWidthPct = 40;
  } else {
    eyeOpeningStatus = "CLOSED";
    eyeWidthPct = 12;
  }

  const eyeMetrics: VlcEyeMetrics = {
    eyeHeightVolts,
    eyeWidthPct,
    eyeOpeningStatus,
    noiseMarginMv,
  };

  // 10. Reconstruct Decoded Message from UART Packets
  const decodedChars: string[] = [];
  const decodedBytesHex: string[] = [];
  let framingErrors = 0;
  let parityErrors = 0;
  let packetsReceived = 0;

  const bitsPerChar = 1 + 8 + (transmitter.parity !== "NONE" ? 1 : 0) + 1; // Start + 8 + Parity + Stop
  const numPackets = Math.floor(receivedRawBits.length / bitsPerChar);

  for (let p = 0; p < numPackets; p++) {
    const offset = p * bitsPerChar;
    const startBit = receivedRawBits[offset];
    const dataBits = receivedRawBits.slice(offset + 1, offset + 9);
    
    let parityBit: (0 | 1) | null = null;
    let stopBitIndex = offset + 9;
    if (transmitter.parity !== "NONE") {
      parityBit = receivedRawBits[offset + 9];
      stopBitIndex = offset + 10;
    }
    const stopBit = receivedRawBits[stopBitIndex];

    // Framing verification
    let isFrameValid = true;
    if (startBit !== 0) {
      framingErrors++;
      isFrameValid = false;
    }
    if (stopBit !== 1) {
      framingErrors++;
      isFrameValid = false;
    }

    // Parity verification
    if (transmitter.parity !== "NONE" && parityBit !== null) {
      const onesCount = dataBits.reduce((acc: number, b: number) => acc + b, 0);
      let expectedParity = 0;
      if (transmitter.parity === "EVEN") {
        expectedParity = onesCount % 2 === 0 ? 0 : 1;
      } else if (transmitter.parity === "ODD") {
        expectedParity = onesCount % 2 === 1 ? 0 : 1;
      }
      if (parityBit !== expectedParity) {
        parityErrors++;
        isFrameValid = false;
      }
    }

    // Reconstruct byte (LSB-first)
    let charCode = 0;
    for (let b = 0; b < 8; b++) {
      if (dataBits[b] === 1) {
        charCode |= (1 << b);
      }
    }

    const hexStr = "0x" + charCode.toString(16).toUpperCase().padStart(2, "0");
    decodedBytesHex.push(hexStr);

    if (isFrameValid) {
      packetsReceived++;
      if (charCode >= 32 && charCode <= 126) {
        decodedChars.push(String.fromCharCode(charCode));
      } else {
        decodedChars.push(`[${hexStr}]`);
      }
    } else {
      decodedChars.push(""); // Corrupted byte replacement
    }
  }

  // 11. Serial Telemetry Logs
  const txSerialLogs: string[] = [
    `[ESP32-TX] UART0 initialized at ${transmitter.baudRate} bps (Bit Period: ${(1000 / transmitter.baudRate).toFixed(2)} ms).`,
    `[ESP32-TX] Modulation: ${transmitter.modulation} | Framing: 1 Start, 8 Data, Parity=${transmitter.parity}, 1 Stop.`,
    `[ESP32-TX] LED Emitter: ${transmitter.wavelength} | Drive Current: ${transmitter.driveCurrentMa} mA | Efficacy: ${transmitter.efficiencyWPerA} W/A.`,
    `[ESP32-TX] Transmitting payload: "${safeMessage}" (${safeMessage.length} characters, ${txBits.length} bits).`,
    `[ESP32-TX] Peak Radiant Power: ${maxTxOpticalPowerMw.toFixed(2)} mW | Semi-Angle: ${transmitter.halfPowerAngleDeg}°.`,
    `[ESP32-TX] Hardware Timer 0 ISR queued ${txBits.length} bit events successfully.`,
  ];

  const rxSerialLogs: string[] = [
    `[ESP32-RX] Optical Receiver ISR active. Sampling rate: ${transmitter.baudRate * SAMPLES_PER_BIT} Hz.`,
    `[ESP32-RX] TIA Gain: ${(receiver.tiaFeedbackResistorOhm / 1000).toFixed(0)} kΩ | Concentrator Lens: ${receiver.lensConcentratorGain}x.`,
    `[ESP32-RX] Slicer Threshold: ${effectiveThresholdVolts.toFixed(3)} V (${receiver.autoThreshold ? "Auto-Adaptive" : "Manual Fixed"}).`,
    `[ESP32-RX] Link Distance: ${channel.distanceM.toFixed(2)} m | Ambient Light: ${channel.ambientLightLux} lux (${receiver.acCoupledFilter ? "AC Filtered" : "DC Direct"}).`,
    `[ESP32-RX] Peak Received Optical Power: ${rxOpticalPowerPeakUw.toFixed(4)} µW (${receivedPowerDbm.toFixed(1)} dBm).`,
    `[ESP32-RX] Link SNR: ${snrDb.toFixed(2)} dB | Noise RMS: ${(totalNoiseVoltageRmsV * 1000).toFixed(2)} mV | BER: ${(totalErrors / Math.max(1, txBits.length)).toExponential(2)}.`,
    `[ESP32-RX] Reconstructed Message: "${decodedChars.join("")}" (${packetsReceived}/${safeMessage.length} packets clean).`,
  ];

  const measuredBer = txBits.length > 0 ? totalErrors / txBits.length : 0;
  const packetSuccessRatePct = safeMessage.length > 0
    ? Math.max(0, Math.min(100, (packetsReceived / safeMessage.length) * 100))
    : 100;
  const throughputBps = packetSuccessRatePct > 0
    ? (packetsReceived * 8) / (currentTimeMs / 1000)
    : 0;

  const statistics: VlcPacketStatistics = {
    totalBitsTransmitted: txBits.length,
    totalBitErrors: totalErrors,
    measuredBer,
    theoreticalBer,
    snrDb: Number(snrDb.toFixed(2)),
    receivedPowerUw: Number(rxOpticalPowerPeakUw.toFixed(4)),
    receivedPowerDbm: Number(receivedPowerDbm.toFixed(1)),
    ambientCurrentUa: Number(ambientPhotocurrentUa.toFixed(3)),
    noiseRmsMv: Number((totalNoiseVoltageRmsV * 1000).toFixed(2)),
    packetsSent: safeMessage.length,
    packetsReceived,
    packetLossCount: safeMessage.length - packetsReceived,
    packetSuccessRatePct: Number(packetSuccessRatePct.toFixed(1)),
    framingErrors,
    parityErrors,
    throughputBps: Math.round(throughputBps),
    channelDcGainH0: Number(h0.toExponential(4)),
    effectiveThresholdVolts: Number(effectiveThresholdVolts.toFixed(3)),
  };

  return {
    transmittedBits: txBits,
    receivedRawBits,
    bitMatchStatus,
    decodedText: decodedChars.join(""),
    decodedBytesHex,
    statistics,
    waveforms,
    eyeTraces,
    eyeMetrics,
    txSerialLogs,
    rxSerialLogs,
  };
}
