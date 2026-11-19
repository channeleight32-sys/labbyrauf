import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Radio,
  Wifi,
  Activity,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Terminal,
  Send,
  ArrowRight,
  TrendingUp,
  Gauge,
  Sparkles,
  Info,
} from "lucide-react";
import WirelessSchematicViewer, { WirelessCircuitId } from "./WirelessSchematicViewer";
import WirelessBench3D from "./WirelessBench3D";

export const WirelessCommunicationLab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"LORA" | "WIFI_BLE" | "RF_FRIIS">("LORA");
  const [viewMode, setViewMode] = useState<"OUTPUT" | "SCHEMATIC">("OUTPUT");

  // --- 1. LORA SX1278 SIMULATOR STATE ---
  const [loraFreqMhz, setLoraFreqMhz] = useState<number>(433);
  const [loraSpreadingFactor, setLoraSpreadingFactor] = useState<number>(7); // SF7 - SF12
  const [loraBandwidthKhz, setLoraBandwidthKhz] = useState<number>(125); // 125, 250, 500
  const [loraCodingRate, setLoraCodingRate] = useState<string>("4/5");
  const [loraTxPowerDbm, setLoraTxPowerDbm] = useState<number>(14); // +2 to +20 dBm
  const [loraDistanceKm, setLoraDistanceKm] = useState<number>(2.4); // 0.1 to 15.0 km
  const [loraPayload, setLoraPayload] = useState<string>("IST_SATELLITE_BEACON_OK");
  const [loraPacketsSent, setLoraPacketsSent] = useState<number>(24);
  const [loraPacketsReceived, setLoraPacketsReceived] = useState<number>(23);
  const [isLoraAutoTransmitting, setIsLoraAutoTransmitting] = useState<boolean>(false);
  const [loraPacketLogs, setLoraPacketLogs] = useState<
    { id: number; timestamp: string; payload: string; rssiDbm: number; snrDb: number; status: "OK" | "CRC_ERR" }[]
  >([
    { id: 1, timestamp: "06:14:02", payload: "IST_TELEMETRY_PACKET_01", rssiDbm: -92, snrDb: 9.4, status: "OK" },
    { id: 2, timestamp: "06:14:05", payload: "TEMP=24.5C;HUM=52%;BAT=4.1V", rssiDbm: -94, snrDb: 8.8, status: "OK" },
  ]);

  // Derived LoRa Calculations
  const loraCalculations = useMemo(() => {
    // Symbol Rate Rs = BW / (2^SF)
    const symbolRate = (loraBandwidthKhz * 1000) / Math.pow(2, loraSpreadingFactor);
    // Symbol Duration Ts = 1 / Rs (in ms)
    const tsMs = (1 / symbolRate) * 1000;
    
    // Time on Air (ToA) estimation: Preamble (8 symbols) + payload symbols
    const payloadBytes = Math.max(1, loraPayload.length);
    const payloadSymbols = 8 + Math.max(0, Math.ceil((8 * payloadBytes - 4 * loraSpreadingFactor + 28) / (4 * loraSpreadingFactor)) * 5);
    const timeOnAirMs = Math.round(payloadSymbols * tsMs);

    // Free Space Path Loss (FSPL) in dB: 20*log10(d) + 20*log10(f) + 32.44
    const dKm = Math.max(0.05, loraDistanceKm);
    const fsplDb = 20 * Math.log10(dKm) + 20 * Math.log10(loraFreqMhz) + 32.44;

    // Received RSSI = P_tx + G_tx + G_rx - FSPL - fade margin (approx 8 dB)
    const rssiDbm = Math.round(loraTxPowerDbm + 2.15 + 2.15 - fsplDb - 6);

    // Receiver sensitivity floor by SF (SF7: -123dBm, SF12: -137dBm)
    const sensitivityFloorDbm = -123 - (loraSpreadingFactor - 7) * 2.8;
    const linkMarginDb = Math.round(rssiDbm - sensitivityFloorDbm);

    // Estimated SNR in dB
    const snrDb = Number((Math.min(15, Math.max(-20, (rssiDbm - sensitivityFloorDbm) - 5))).toFixed(1));
    const isPacketLost = rssiDbm < sensitivityFloorDbm || snrDb < -15;

    return {
      symbolRate: Math.round(symbolRate),
      tsMs: Number(tsMs.toFixed(2)),
      timeOnAirMs,
      fsplDb: Math.round(fsplDb),
      rssiDbm,
      sensitivityFloorDbm: Math.round(sensitivityFloorDbm),
      linkMarginDb,
      snrDb,
      isPacketLost,
    };
  }, [loraFreqMhz, loraSpreadingFactor, loraBandwidthKhz, loraCodingRate, loraTxPowerDbm, loraDistanceKm, loraPayload]);

  const handleSendLoraPacket = () => {
    setLoraPacketsSent((c) => c + 1);
    const isLost = loraCalculations.isPacketLost;
    if (!isLost) {
      setLoraPacketsReceived((c) => c + 1);
    }
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];
    setLoraPacketLogs((prev) => [
      {
        id: prev.length + 1,
        timestamp: timeStr,
        payload: loraPayload,
        rssiDbm: loraCalculations.rssiDbm,
        snrDb: loraCalculations.snrDb,
        status: isLost ? "CRC_ERR" : "OK",
      },
      ...prev.slice(0, 15),
    ]);
  };

  // LoRa Auto-Transmitter Interval
  const loraTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!isLoraAutoTransmitting) {
      if (loraTimerRef.current) clearInterval(loraTimerRef.current);
      return;
    }
    loraTimerRef.current = window.setInterval(() => {
      handleSendLoraPacket();
    }, 2500);
    return () => {
      if (loraTimerRef.current) clearInterval(loraTimerRef.current);
    };
  }, [isLoraAutoTransmitting, loraPayload, loraCalculations]);

  // --- 2. WI-FI & BLE EMBEDDED STACK STATE ---
  const [wifiMode, setWifiMode] = useState<"STA" | "AP">("STA");
  const [wifiSsid, setWifiSsid] = useState<string>("IST_Campus_IoT_WLAN");
  const [clientIp, setClientIp] = useState<string>("192.168.4.15");
  const [bleDeviceName, setBleDeviceName] = useState<string>("ESP32_TELEMETRY_NODE");
  const [bleHeartRateBpm, setBleHeartRateBpm] = useState<number>(74);

  // --- 3. RF FRIIS PROPAGATION CALCULATOR STATE ---
  const [rfCarrierGhz, setRfCarrierGhz] = useState<number>(2.4);
  const [rfTxPowerDbm, setRfTxPowerDbm] = useState<number>(20);
  const [rfTxGainDbi, setRfTxGainDbi] = useState<number>(3.0);
  const [rfRxGainDbi, setRfRxGainDbi] = useState<number>(3.0);
  const [rfDistanceMeters, setRfDistanceMeters] = useState<number>(50);
  const [rfEnvironmentExponent, setRfEnvironmentExponent] = useState<number>(2.2); // Free space=2, Urban=3.2

  const friisCalculations = useMemo(() => {
    const d = Math.max(1, rfDistanceMeters);
    const fMhz = rfCarrierGhz * 1000;
    // Path Loss = 20*log10(4*pi*d*f/c) + 10*n*log10(d)
    const fsplDb = 20 * Math.log10(d) + 20 * Math.log10(fMhz) - 27.55;
    const actualLossDb = fsplDb + (rfEnvironmentExponent - 2.0) * 15 * Math.log10(d);
    const prxDbm = rfTxPowerDbm + rfTxGainDbi + rfRxGainDbi - actualLossDb;
    const noiseFloorDbm = -100;
    const snrDb = prxDbm - noiseFloorDbm;

    return {
      pathLossDb: Math.round(actualLossDb),
      prxDbm: Number(prxDbm.toFixed(1)),
      snrDb: Number(snrDb.toFixed(1)),
      rxPowerNw: Number((Math.pow(10, prxDbm / 10) * 1e6).toFixed(3)),
    };
  }, [rfCarrierGhz, rfTxPowerDbm, rfTxGainDbi, rfRxGainDbi, rfDistanceMeters, rfEnvironmentExponent]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-[#0b1a38] via-[#081226] to-[#050914] border border-cyan-500/30 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[11px] font-mono font-bold">
                MODULE 3 · WIRELESS &amp; RF COMMUNICATION LABORATORY
              </span>
              <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                LORA SX1278 · WI-FI · BLE · FRIIS RF ENGINE
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
              Interactive Wireless &amp; RF Communication Laboratory
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
              Complete high-frequency wireless communications testbench featuring a functional{" "}
              <strong>Semtech LoRa SX1278 sub-GHz transceiver simulator</strong>, embedded ESP32 Wi-Fi / Bluetooth BLE stack,
              and a physical <strong>Friis free-space path loss and RF link budget calculator</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#060a14] p-1.5 rounded-xl border border-slate-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveSubTab("LORA")}
              className={`px-4 py-2 rounded-lg transition cursor-pointer font-bold ${
                activeSubTab === "LORA"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              LoRa SX1278 Transceiver
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("WIFI_BLE")}
              className={`px-4 py-2 rounded-lg transition cursor-pointer font-bold ${
                activeSubTab === "WIFI_BLE"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              ESP32 Wi-Fi &amp; BLE Stack
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab("RF_FRIIS")}
              className={`px-4 py-2 rounded-lg transition cursor-pointer font-bold ${
                activeSubTab === "RF_FRIIS"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Friis RF Link Budget
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Switcher: Live Flowing Signals vs Complete Circuit Schematic */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#080d19] border border-cyan-500/30 rounded-xl p-2.5 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-white uppercase px-2">
            {activeSubTab === "LORA" && "1. LoRa SX1278 Sub-GHz Chirp Spread Spectrum Transceiver"}
            {activeSubTab === "WIFI_BLE" && "2. ESP32 Wi-Fi (802.11 b/g/n) & Bluetooth BLE 5.0 RF Frontend"}
            {activeSubTab === "RF_FRIIS" && "3. Friis Free-Space RF Electromagnetic Wave Link Budget"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("OUTPUT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
              viewMode === "OUTPUT"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>⚡ Live Flowing Signals & Spectrogram</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("SCHEMATIC")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition cursor-pointer ${
              viewMode === "SCHEMATIC"
                ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📐 Complete Circuit Schematic & Detailed BOM</span>
          </button>
        </div>
      </div>

      {viewMode === "SCHEMATIC" ? (
        <WirelessSchematicViewer
          circuitId={
            activeSubTab === "LORA"
              ? "LORA_SX1278"
              : activeSubTab === "WIFI_BLE"
              ? "WIFI_BLE_RF"
              : "FRIIS_PROPAGATION"
          }
        />
      ) : (
        <>
          <WirelessBench3D
            mode={activeSubTab}
            freqLabel={
              activeSubTab === "LORA"
                ? `${loraFreqMhz} MHz (SF${loraSpreadingFactor})`
                : activeSubTab === "WIFI_BLE"
                ? wifiMode === "STA"
                  ? "2.4 GHz STA + BLE"
                  : "2.4 GHz SoftAP"
                : `${rfCarrierGhz.toFixed(2)} GHz`
            }
            txPowerDbm={activeSubTab === "RF_FRIIS" ? rfTxPowerDbm : loraTxPowerDbm}
            rssiDbm={
              activeSubTab === "RF_FRIIS"
                ? Math.round(friisCalculations.prxDbm)
                : activeSubTab === "WIFI_BLE"
                ? -54
                : loraCalculations.rssiDbm
            }
            snrDb={
              activeSubTab === "RF_FRIIS"
                ? friisCalculations.snrDb
                : activeSubTab === "WIFI_BLE"
                ? 24.5
                : loraCalculations.snrDb
            }
            distanceRatio={
              activeSubTab === "LORA"
                ? Math.min(1, loraDistanceKm / 15)
                : activeSubTab === "RF_FRIIS"
                ? Math.min(1, rfDistanceMeters / 300)
                : 0.35
            }
            isLinkHealthy={
              activeSubTab === "LORA"
                ? !loraCalculations.isPacketLost
                : activeSubTab === "RF_FRIIS"
                ? friisCalculations.snrDb > 5
                : true
            }
            packetPulseKey={loraPacketsSent}
            onTriggerTransmit={handleSendLoraPacket}
          />

          {/* SUB-TAB 1: LORA SX1278 SUB-GHZ TRANSCEIVER */}
          {activeSubTab === "LORA" && (
            <div className="space-y-6">
              {/* LIVE FLOWING CHIRP SPECTROGRAM & RF WAVE PROPAGATION DISPLAY */}
              <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Live Flowing Chirp Spread Spectrum (CSS) Spectrogram &amp; Over-the-Air Wavefront
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-slate-400">
                      BW: <strong className="text-cyan-300">{loraBandwidthKhz} kHz</strong>
                    </span>
                    <span className="text-slate-400">
                      SF: <strong className="text-amber-300">SF{loraSpreadingFactor}</strong>
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      AIRBORNE RF EMISSION
                    </span>
                  </div>
                </div>

                {/* Animated CSS Chirp Waterfall & Node Propagation SVG */}
                <div className="w-full bg-[#02050c] rounded-lg border border-cyan-500/20 p-3 select-none overflow-hidden relative">
                  <svg viewBox="0 0 920 220" className="w-full h-52">
                    <defs>
                      <linearGradient id="chirpGrad" x1="0" y1="1" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                      <linearGradient id="rfWaveGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
                      </linearGradient>
                    </defs>

                    {/* Section 1: Spectrogram (Left 420px) */}
                    <rect x="10" y="10" width="410" height="195" rx="4" fill="#030712" stroke="#1e293b" />
                    <text x="20" y="28" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                      CHIRP SPECTROGRAM: FREQUENCY vs TIME WATERFALL
                    </text>
                    <text x="360" y="28" fill="#64748b" fontSize="8" fontFamily="monospace">
                      f(t) = f0 + (BW/Ts)·t
                    </text>

                    {/* Frequency Axis Grid */}
                    <line x1="45" y1="40" x2="45" y2="190" stroke="#334155" strokeWidth="1" />
                    <line x1="45" y1="190" x2="405" y2="190" stroke="#334155" strokeWidth="1" />
                    <text x="40" y="50" fill="#64748b" fontSize="7.5" textAnchor="end" fontFamily="monospace">
                      +BW/2
                    </text>
                    <text x="40" y="115" fill="#38bdf8" fontSize="7.5" textAnchor="end" fontFamily="monospace">
                      f0
                    </text>
                    <text x="40" y="185" fill="#64748b" fontSize="7.5" textAnchor="end" fontFamily="monospace">
                      -BW/2
                    </text>
                    <text x="225" y="202" fill="#64748b" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                      Time Slot Progression (t) $\to$
                    </text>

                    {/* Animated Cascading Up-Chirps and Down-Chirps */}
                    {[
                      { x1: 55, x2: 105, y1: 175, y2: 50, type: "PREAMBLE" },
                      { x1: 110, x2: 160, y1: 175, y2: 50, type: "PREAMBLE" },
                      { x1: 165, x2: 215, y1: 175, y2: 50, type: "PREAMBLE" },
                      { x1: 220, x2: 270, y1: 50, y2: 175, type: "SYNC_DOWN" },
                      { x1: 275, x2: 325, y1: 50, y2: 175, type: "SYNC_DOWN" },
                      { x1: 330, x2: 360, y1: 120, y2: 50, type: "DATA" },
                      { x1: 360, x2: 400, y1: 175, y2: 100, type: "DATA" },
                    ].map((chirp, idx) => (
                      <g key={idx}>
                        <line
                          x1={chirp.x1}
                          y1={chirp.y1}
                          x2={chirp.x2}
                          y2={chirp.y2}
                          stroke={chirp.type === "SYNC_DOWN" ? "#f43f5e" : chirp.type === "PREAMBLE" ? "#06b6d4" : "#10b981"}
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          className="animate-pulse"
                        />
                        {/* Glow shadow */}
                        <line
                          x1={chirp.x1}
                          y1={chirp.y1}
                          x2={chirp.x2}
                          y2={chirp.y2}
                          stroke={chirp.type === "SYNC_DOWN" ? "#f43f5e" : "#06b6d4"}
                          strokeWidth="6"
                          strokeLinecap="round"
                          opacity="0.3"
                        />
                      </g>
                    ))}

                    {/* Section 2: Over-The-Air RF Propagation (Right 470px) */}
                    <g transform="translate(435, 10)">
                      <rect x="0" y="0" width="475" height="195" rx="4" fill="#030712" stroke="#1e293b" />
                      <text x="15" y="24" fill="#38bdf8" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        OVER-THE-AIR LINK: TRANSMITTER NODE $\to$ RECEIVER GATEWAY
                      </text>
                      <text x="460" y="24" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="monospace">
                        Distance: {loraDistanceKm} km
                      </text>

                      {/* Node A (TX) */}
                      <g transform="translate(30, 80)">
                        <rect x="0" y="0" width="60" height="50" rx="4" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="30" y="22" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          TX NODE
                        </text>
                        <text x="30" y="36" fill="#38bdf8" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                          SX1278
                        </text>
                        {/* Antenna Rod */}
                        <line x1="30" y1="0" x2="30" y2="-25" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="30" cy="-25" r="3" fill="#f59e0b" />
                      </g>

                      {/* Concentric Flowing Radio Waves */}
                      {[30, 60, 95, 130, 170, 215, 260].map((radius, idx) => (
                        <path
                          key={idx}
                          d={`M 60 ${105 - radius * 0.4} A ${radius} ${radius} 0 0 1 60 ${105 + radius * 0.4}`}
                          fill="none"
                          stroke="#06b6d4"
                          strokeWidth="1.5"
                          opacity={Math.max(0.12, 1 - idx * 0.14)}
                          strokeDasharray={idx % 2 === 0 ? "none" : "3 3"}
                        />
                      ))}

                      {/* Airborne Moving Packet Animation */}
                      <g transform="translate(230, 95)" className="animate-pulse">
                        <rect x="-35" y="-12" width="70" height="24" rx="4" fill="#0c172e" stroke="#38bdf8" strokeWidth="1.5" />
                        <text x="0" y="4" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          LORA PKT
                        </text>
                      </g>

                      {/* Node B (RX Gateway) */}
                      <g transform="translate(390, 80)">
                        <rect x="0" y="0" width="65" height="50" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                        <text x="32" y="22" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                          RX GATEWAY
                        </text>
                        <text x="32" y="36" fill="#10b981" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
                          {loraCalculations.rssiDbm} dBm
                        </text>
                        {/* Antenna Rod */}
                        <line x1="32" y1="0" x2="32" y2="-25" stroke="#f59e0b" strokeWidth="2.5" />
                        <circle cx="32" cy="-25" r="3" fill="#f59e0b" />
                      </g>

                      {/* Status Legend at bottom */}
                      <text x="240" y="180" fill="#94a3b8" fontSize="8.5" textAnchor="middle" fontFamily="monospace">
                        FSPL: -{loraCalculations.fsplDb} dB · SNR: {loraCalculations.snrDb} dB · ToA: {loraCalculations.timeOnAirMs} ms · Margin: +{loraCalculations.linkMarginDb} dB
                      </text>
                    </g>
                  </svg>
                </div>
              </div>

              {/* Top Parameters & Link Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Column 1: LoRa Radio Parameters */}
                <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        LoRa SX1278 Modulation Controls
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {loraFreqMhz} MHz ISM
                    </span>
                  </div>

              {/* Carrier Frequency */}
              <div className="space-y-1 font-mono text-xs">
                <label className="text-slate-400">Carrier Frequency Band:</label>
                <select
                  value={loraFreqMhz}
                  onChange={(e) => setLoraFreqMhz(Number(e.target.value))}
                  className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 cursor-pointer"
                >
                  <option value={433}>433 MHz (Asia / Europe ISM)</option>
                  <option value={868}>868 MHz (Europe SRD)</option>
                  <option value={915}>915 MHz (Americas ISM)</option>
                </select>
              </div>

              {/* Spreading Factor */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Spreading Factor (SF):</span>
                  <span className="text-cyan-300 font-bold">SF{loraSpreadingFactor} (2^{loraSpreadingFactor} chips/sym)</span>
                </div>
                <input
                  type="range"
                  min="7"
                  max="12"
                  step="1"
                  value={loraSpreadingFactor}
                  onChange={(e) => setLoraSpreadingFactor(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Bandwidth & Coding Rate */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Bandwidth (BW):</label>
                  <select
                    value={loraBandwidthKhz}
                    onChange={(e) => setLoraBandwidthKhz(Number(e.target.value))}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2 py-1.5 text-cyan-300 cursor-pointer"
                  >
                    <option value={125}>125 kHz (Standard)</option>
                    <option value={250}>250 kHz (High-Speed)</option>
                    <option value={500}>500 kHz (Wideband)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Coding Rate (CR):</label>
                  <select
                    value={loraCodingRate}
                    onChange={(e) => setLoraCodingRate(e.target.value)}
                    className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-2 py-1.5 text-cyan-300 cursor-pointer"
                  >
                    <option value="4/5">4/5 (Standard FEC)</option>
                    <option value="4/6">4/6 (Medium FEC)</option>
                    <option value="4/7">4/7 (High FEC)</option>
                    <option value="4/8">4/8 (Max Robustness)</option>
                  </select>
                </div>
              </div>

              {/* Transmit Power Slider */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Tx Power (PA_BOOST):</span>
                  <span className="text-amber-300 font-bold">+{loraTxPowerDbm} dBm ({Math.round(Math.pow(10, loraTxPowerDbm / 10))} mW)</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  step="1"
                  value={loraTxPowerDbm}
                  onChange={(e) => setLoraTxPowerDbm(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Link Distance Slider */}
              <div className="space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Ground Link Distance:</span>
                  <span className="text-emerald-300 font-bold">{loraDistanceKm.toFixed(1)} km</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="15.0"
                  step="0.1"
                  value={loraDistanceKm}
                  onChange={(e) => setLoraDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            </div>

            {/* Column 2: Physical Link Budget & Time-on-Air Telemetry */}
            <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-mono font-bold text-white uppercase">
                    RF Link Budget &amp; Sensitivity Telemetry
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    !loraCalculations.isPacketLost
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {!loraCalculations.isPacketLost ? "LINK LOCKED (100% OK)" : "OUT OF RANGE (PACKET LOSS)"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px]">RECEIVED RSSI:</span>
                  <div className="text-xl font-bold text-cyan-300">
                    {loraCalculations.rssiDbm} <span className="text-xs font-normal text-slate-400">dBm</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Sensitivity Floor: {loraCalculations.sensitivityFloorDbm} dBm
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px]">LINK SNR:</span>
                  <div
                    className={`text-xl font-bold ${
                      loraCalculations.snrDb >= 0 ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {loraCalculations.snrDb} <span className="text-xs font-normal text-slate-400">dB</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Margin: +{loraCalculations.linkMarginDb} dB
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px]">TIME ON AIR (ToA):</span>
                  <div className="text-xl font-bold text-white">
                    {loraCalculations.timeOnAirMs} <span className="text-xs font-normal text-slate-400">ms</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Symbol Period: {loraCalculations.tsMs} ms
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                  <span className="text-slate-400 text-[10px]">PATH LOSS (FSPL):</span>
                  <div className="text-xl font-bold text-amber-300">
                    -{loraCalculations.fsplDb} <span className="text-xs font-normal text-slate-400">dB</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Over {loraDistanceKm} km line-of-sight
                  </div>
                </div>
              </div>

              {/* Packet Success Progress Bar */}
              <div className="space-y-1.5 font-mono text-xs">
                <div className="flex justify-between text-slate-300">
                  <span>Packet Success Rate:</span>
                  <span className="text-emerald-400 font-bold">
                    {loraPacketsSent > 0 ? Math.round((loraPacketsReceived / loraPacketsSent) * 100) : 100}% (
                    {loraPacketsReceived} / {loraPacketsSent} clean)
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{
                      width: `${loraPacketsSent > 0 ? (loraPacketsReceived / loraPacketsSent) * 100 : 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Column 3: Packet Transmitter Console & Injector */}
            <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      LoRa Packet Injector
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">SPI FIFO Buffer</span>
                </div>

                <div className="space-y-3 mt-3">
                  <div>
                    <label className="text-xs font-mono text-slate-300 block mb-1">
                      Payload String:
                    </label>
                    <input
                      type="text"
                      value={loraPayload}
                      maxLength={40}
                      onChange={(e) => setLoraPayload(e.target.value.toUpperCase())}
                      className="w-full bg-[#060a14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
                    <span className="text-[10px] text-slate-500">Quick Test:</span>
                    {["IST_BEACON", "GPS:33.72,73.09", "TEMP=24.5C", "ALARM_ACK"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setLoraPayload(s)}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-cyan-400/50 cursor-pointer text-[10px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleSendLoraPacket}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-xs hover:bg-cyan-400 transition cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Transmit LoRa Packet</span>
                </button>

                <label className="flex items-center gap-2 text-xs font-mono text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isLoraAutoTransmitting}
                    onChange={(e) => setIsLoraAutoTransmitting(e.target.checked)}
                    className="accent-cyan-400 rounded"
                  />
                  <span>Periodic Beacon</span>
                </label>
              </div>
            </div>
          </div>

          {/* LoRa Packet Sniffer & Traffic Log */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Live LoRa RF Gateway Packet Sniffer Log (SX1278 SPI ISR)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                CRC Checking Enabled · Header Explicit Mode
              </span>
            </div>

            <div className="bg-[#03060f] border border-slate-800 rounded-lg p-3 font-mono text-xs max-h-56 overflow-y-auto space-y-2 text-slate-300 shadow-inner">
              {loraPacketLogs.map((pkt) => (
                <div
                  key={pkt.id}
                  className="p-2 rounded bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-slate-500">[{pkt.timestamp}]</span>
                    <span className="text-white font-bold">PAYLOAD: &quot;{pkt.payload}&quot;</span>
                  </div>
                  <div className="flex items-center gap-4 text-slate-400">
                    <span>
                      RSSI: <strong className="text-cyan-300">{pkt.rssiDbm} dBm</strong>
                    </span>
                    <span>
                      SNR: <strong className="text-emerald-400">{pkt.snrDb} dB</strong>
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                        pkt.status === "OK"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                          : "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      }`}
                    >
                      {pkt.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ESP32 WI-FI & BLE EMBEDDED STACK */}
      {activeSubTab === "WIFI_BLE" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Wi-Fi Stack Console */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  ESP32 802.11 b/g/n Wi-Fi Transceiver
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                WIFI_CONNECTED
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Wi-Fi Operating Mode:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWifiMode("STA")}
                    className={`py-1.5 px-3 rounded-lg border text-center transition cursor-pointer font-bold ${
                      wifiMode === "STA"
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Station Mode (STA)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWifiMode("AP")}
                    className={`py-1.5 px-3 rounded-lg border text-center transition cursor-pointer font-bold ${
                      wifiMode === "AP"
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-200"
                        : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}
                  >
                    Access Point (SoftAP)
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">SSID:</span>
                  <span className="text-white font-bold">{wifiSsid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned IP Address:</span>
                  <span className="text-cyan-300 font-bold">{wifiMode === "STA" ? "192.168.1.142" : "192.168.4.1"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Gateway:</span>
                  <span className="text-slate-300">192.168.1.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">MAC Address:</span>
                  <span className="text-slate-300 font-mono">24:0A:C4:8B:E3:4A</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#040711] border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-emerald-400 font-bold">[HTTP SERVER ACTIVE on Port 80]</div>
                <div>GET /api/v1/sensors $\to$ 200 OK (54 bytes JSON)</div>
                <div>WebSocket ws://192.168.1.142:81 $\to$ Telemetry Streaming 20Hz</div>
              </div>
            </div>
          </div>

          {/* Bluetooth Low Energy (BLE 5.0) Console */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Bluetooth 5.0 Low Energy (BLE) GATT Server
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                BLE_ADVERTISING
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Advertised Device Name:</span>
                  <span className="text-white font-bold">{bleDeviceName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Primary GATT Service:</span>
                  <span className="text-cyan-300 font-mono">0x180D (Heart Rate Service)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Characteristic UUID:</span>
                  <span className="text-slate-300 font-mono">0x2A37 (Notify, Read)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Live Heart Rate Telemetry:</span>
                  <span className="text-rose-400 font-bold text-sm">{bleHeartRateBpm} BPM</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#040711] border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                <div className="text-cyan-400 font-bold">[BLE PACKET TRACE]</div>
                <div>ADV_IND packet transmitted @ 2.402 GHz (Channel 37)</div>
                <div>TX Power: 0 dBm · Interval: 100 ms · Connectable Undirected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: FRIIS RF PATH LOSS & LINK BUDGET CALCULATOR */}
      {activeSubTab === "RF_FRIIS" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Friis Parameters Controls */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Friis Free-Space RF Propagation Model
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">P_rx = P_tx + G_tx + G_rx - FSPL</span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* Carrier Frequency Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>RF Carrier Frequency:</span>
                  <span className="text-cyan-300 font-bold">{rfCarrierGhz.toFixed(2)} GHz</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="5.8"
                  step="0.1"
                  value={rfCarrierGhz}
                  onChange={(e) => setRfCarrierGhz(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              {/* Tx Power Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Transmitter Power (P_tx):</span>
                  <span className="text-amber-300 font-bold">+{rfTxPowerDbm} dBm (100 mW)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={rfTxPowerDbm}
                  onChange={(e) => setRfTxPowerDbm(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              {/* Antenna Gains */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-slate-400 block">Tx Antenna Gain (G_tx):</span>
                  <span className="text-cyan-300 font-bold">{rfTxGainDbi} dBi (Dipole)</span>
                </div>
                <div className="space-y-1">
                  <span className="text-slate-400 block">Rx Antenna Gain (G_rx):</span>
                  <span className="text-cyan-300 font-bold">{rfRxGainDbi} dBi (Patch)</span>
                </div>
              </div>

              {/* Distance Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Link Separation Distance:</span>
                  <span className="text-emerald-300 font-bold">{rfDistanceMeters} meters</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="500"
                  step="5"
                  value={rfDistanceMeters}
                  onChange={(e) => setRfDistanceMeters(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>

              {/* Environment Path Loss Exponent */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Environment Exponent (n):</span>
                  <span className="text-white font-bold">
                    n = {rfEnvironmentExponent} ({rfEnvironmentExponent <= 2 ? "Free Space" : "Urban Multipath"})
                  </span>
                </div>
                <input
                  type="range"
                  min="2.0"
                  max="4.0"
                  step="0.1"
                  value={rfEnvironmentExponent}
                  onChange={(e) => setRfEnvironmentExponent(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Friis Calculations & Link Analysis */}
          <div className="bg-[#0b1122] border border-cyan-500/30 rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-bold text-white uppercase">
                  Calculated RF Power &amp; Link Margin
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">SOLVER READY</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">TOTAL PATH LOSS:</span>
                <div className="text-2xl font-bold text-amber-300">
                  -{friisCalculations.pathLossDb} <span className="text-xs font-normal text-slate-400">dB</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">RECEIVED POWER (P_rx):</span>
                <div className="text-2xl font-bold text-cyan-300">
                  {friisCalculations.prxDbm} <span className="text-xs font-normal text-slate-400">dBm</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Equivalent: {friisCalculations.rxPowerNw} nW
                </div>
              </div>

              <div className="col-span-2 p-3 rounded-lg bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px]">ESTIMATED SNR (Noise Floor -100 dBm):</span>
                <div className="text-2xl font-bold text-emerald-400">
                  +{friisCalculations.snrDb} <span className="text-xs font-normal text-slate-400">dB</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 text-[11px] font-mono text-slate-300 leading-relaxed space-y-1.5">
              <div className="font-bold text-white">Friis Free Space Transmission Equation:</div>
              <div className="bg-[#03060f] p-2 rounded border border-slate-800 text-cyan-300">
                P_rx = P_tx · G_tx · G_rx · (λ / 4πd)²
              </div>
              <p className="text-slate-400 text-[10px]">
                Where λ = c / f = (3×10⁸ m/s) / ({(rfCarrierGhz * 1e9).toExponential(2)} Hz) ={" "}
                {((3e8 / (rfCarrierGhz * 1e9)) * 100).toFixed(1)} cm.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )}
</div>
  );
};

export default WirelessCommunicationLab;
