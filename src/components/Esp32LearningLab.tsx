import React, { useState, useEffect, useMemo } from "react";
import {
  Cpu,
  Play,
  Square,
  RotateCcw,
  Terminal,
  Code2,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Layers,
  Box,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Columns2,
  ListChecks,
  Edit3,
  Eye,
} from "lucide-react";
import {
  ESP32_20_EXPERIMENTS,
  ESP32_DEVKIT_V1_PINS,
  Esp32ExperimentDef,
  Esp32PinInfo,
} from "../data/esp32ExperimentsData";
import Esp32Board3D, { CustomEsp32Wire } from "./Esp32Board3D";
import Esp32InteractiveSchematic from "./Esp32InteractiveSchematic";
import { type KnowledgeCheckRecord } from "../utils/workspaceStore";

interface Esp32LearningLabProps {
  initialLessonId?: number;
  completedLessons: Record<number, boolean>;
  onSelectLesson?: (lessonId: number) => void;
  onToggleLessonComplete: (lessonId: number, completed: boolean) => void;
  knowledgeChecks?: Record<string, KnowledgeCheckRecord>;
  onOpenKnowledgeCheck?: (lessonId: number) => void;
  onLogSimulationActivity?: (
    action: string,
    target: string,
    status?: "PASS" | "INFO" | "WARN"
  ) => void;
}

type VisualMode = "3D" | "SPLIT" | "SCHEMATIC";
type RightPanelTab = "GUIDE" | "CODE" | "SERIAL" | "RESULTS";

const GUIDED_STEPS = [
  { id: 1, label: "1. Inspect 3D Board", hint: "Orbit/zoom 3D bench & click highlighted GPIO pins" },
  { id: 2, label: "2. Review Wiring", hint: "Verify pin-to-component connections in 2D schematic" },
  { id: 3, label: "3. Trace & Upload Code", hint: "Inspect executing firmware lines & edit timing" },
  { id: 4, label: "4. Verify UART & Results", hint: "Interact with 3D sensors & inspect Serial telemetry" },
] as const;

function playToneAudio(freqHz: number, durationSec = 0.14) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.value = freqHz;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationSec);
    window.setTimeout(() => {
      ctx.close().catch(() => {});
    }, durationSec * 1000 + 80);
  } catch {
    // Audio playback skipped cleanly
  }
}

export default function Esp32LearningLab({
  initialLessonId = 1,
  completedLessons,
  onSelectLesson,
  onToggleLessonComplete,
  knowledgeChecks,
  onOpenKnowledgeCheck,
  onLogSimulationActivity,
}: Esp32LearningLabProps) {
  const [selectedId, setSelectedId] = useState<number>(initialLessonId);
  const [visualMode, setVisualMode] = useState<VisualMode>("SPLIT");
  const [rightTab, setRightTab] = useState<RightPanelTab>("GUIDE");
  const [codeViewMode, setCodeViewMode] = useState<"TRACE" | "EDIT">("TRACE");
  const [splitCodeSerial, setSplitCodeSerial] = useState<boolean>(true);
  const [serialTxInput, setSerialTxInput] = useState<string>("");
  const [activeStep, setActiveStep] = useState<number>(1);
  const [selectedPin, setSelectedPin] = useState<Esp32PinInfo | null>(
    ESP32_DEVKIT_V1_PINS.find((p) => p.label === "G2") ?? ESP32_DEVKIT_V1_PINS[0]
  );
  const [focusPinTrigger, setFocusPinTrigger] = useState<{ pinLabel: string; seq: number } | null>(null);
  const [customWires, setCustomWires] = useState<CustomEsp32Wire[]>([]);

  const activeExp: Esp32ExperimentDef = useMemo(
    () =>
      ESP32_20_EXPERIMENTS.find((e) => e.id === selectedId) ??
      ESP32_20_EXPERIMENTS[0],
    [selectedId]
  );

  const [codeText, setCodeText] = useState<string>(activeExp.starterCode);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [serialLines, setSerialLines] = useState<string[]>([
    "[115200] ESP32 DevKit V1 initialized.",
  ]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);

  // Interactive Experiment Controls State
  const [tick, setTick] = useState<number>(0);
  const [magnetNear, setMagnetNear] = useState<boolean>(false);
  const [wifiCh1, setWifiCh1] = useState<boolean>(true);
  const [wifiCh2, setWifiCh2] = useState<boolean>(false);
  const [activePianoNote, setActivePianoNote] = useState<{ key: string; freq: number } | null>(null);
  const [ringMode, setRingMode] = useState<"CHASE" | "RAINBOW" | "CYAN">("CHASE");
  const [moodRgb, setMoodRgb] = useState<{ r: number; g: number; b: number; auto: boolean }>({
    r: 34,
    g: 211,
    b: 238,
    auto: true,
  });
  const [ambientLux, setAmbientLux] = useState<number>(420);
  const [targetDistanceCm, setTargetDistanceCm] = useState<number>(48);
  const [motorState, setMotorState] = useState<{ dir: "CW" | "CCW" | "STOP"; pwm: number }>({
    dir: "CW",
    pwm: 180,
  });
  const [beamBroken, setBeamBroken] = useState<boolean>(false);
  const [alarmLatched, setAlarmLatched] = useState<boolean>(false);
  const [btInput, setBtInput] = useState<string>("ON");
  const [espNowCount, setEspNowCount] = useState<number>(0);
  const [parkingSlots, setParkingSlots] = useState<{ s1: boolean; s2: boolean; gateOpen: boolean }>({
    s1: false,
    s2: true,
    gateOpen: false,
  });
  const [moisturePct, setMoisturePct] = useState<number>(55);
  const [pumpOn, setPumpOn] = useState<boolean>(false);
  const [keypadBuffer, setKeypadBuffer] = useState<string>("");
  const [doorUnlocked, setDoorUnlocked] = useState<boolean>(false);
  const [sunAngle, setSunAngle] = useState<number>(65);
  const [armJoints, setArmJoints] = useState<{ base: number; shoulder: number; grip: number; auto: boolean }>({
    base: 30,
    shoulder: 75,
    grip: 0,
    auto: false,
  });

  const appendSerial = (line: string) => {
    const ts = new Date().toLocaleTimeString([], {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setSerialLines((prev) => [`[${ts}] ${line}`, ...prev].slice(0, 40));
  };

  // Sync experiment switches
  useEffect(() => {
    setSelectedId(initialLessonId);
  }, [initialLessonId]);

  useEffect(() => {
    setCodeText(activeExp.starterCode);
    setSerialLines([
      `[BOOT] Loaded Experiment #${activeExp.id}: ${activeExp.title}`,
      `[GPIO] Highlighted pins: ${activeExp.highlightedPins.join(", ")}`,
    ]);
    setIsRunning(true);
    setAlarmLatched(false);
    setBeamBroken(false);
    setDoorUnlocked(false);
    setKeypadBuffer("");
    if (onSelectLesson) onSelectLesson(activeExp.id);
  }, [activeExp.id]);

  // Parse delay/blink/Serial/GPIO directives directly from user-edited Arduino code
  const parsedCodeDirectives = useMemo(() => {
    const constMatch = codeText.match(/(?:BLINK_MS|STEP_MS)\s*=\s*(\d+)/);
    const delayMatch = codeText.match(/delay\s*\(\s*(\d+)\s*\)/);
    const intervalMs = constMatch
      ? Math.max(100, Math.min(2500, parseInt(constMatch[1], 10)))
      : delayMatch
      ? Math.max(100, Math.min(2500, parseInt(delayMatch[1], 10)))
      : 450;

    const serialPrintMatches = Array.from(codeText.matchAll(/Serial\.println\s*\(\s*"([^"]+)"\s*\)/g)).map(
      (m) => m[1]
    );
    const servoMatch = codeText.match(/servo\.write\s*\(\s*(\d+)\s*\)/i);
    const forceHigh2 = /digitalWrite\s*\(\s*(?:2|ONBOARD_LED)\s*,\s*HIGH\s*\)/.test(codeText) &&
      !/digitalWrite\s*\(\s*(?:2|ONBOARD_LED)\s*,\s*LOW\s*\)/.test(codeText);

    return {
      intervalMs,
      serialPrints: serialPrintMatches,
      servoDeg: servoMatch ? Math.min(180, Math.max(0, parseInt(servoMatch[1], 10))) : null,
      forceGpio2High: forceHigh2,
    };
  }, [codeText]);

  const parsedIntervalMs = parsedCodeDirectives.intervalMs;

  // Simulation runtime loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = activeExp.simType === "DUAL_LED" || activeExp.simType === "MEET_ESP32"
      ? parsedIntervalMs
      : 220;

    const timer = window.setInterval(() => {
      setTick((t) => t + 1);

      if (activeExp.simType === "MEET_ESP32") {
        setSerialLines((prev) => {
          const customMsgs = parsedCodeDirectives.serialPrints;
          if (customMsgs.length > 0 && tick % 2 === 0) {
            const msg = customMsgs[(Math.floor(tick / 2)) % customMsgs.length];
            return [`[UART] ${msg}`, ...prev].slice(0, 35);
          }
          const nextState = prev.length % 2 === 0 ? "HIGH (3.3V)" : "LOW (0V)";
          return [`GPIO 2 -> ${nextState}`, ...prev].slice(0, 35);
        });
      }

      if (activeExp.simType === "BUZZER_SIREN" && audioEnabled) {
        const phase = (tick % 16) / 16;
        const freq = 500 + Math.round(Math.sin(phase * Math.PI) * 750);
        playToneAudio(freq, 0.12);
      }

      if (activeExp.simType === "WATER_PUMP") {
        setMoisturePct((m) => {
          let nextPump = pumpOn;
          if (!pumpOn && m < 30) nextPump = true;
          if (pumpOn && m >= 70) nextPump = false;
          if (nextPump !== pumpOn) setPumpOn(nextPump);
          if (nextPump) return Math.min(80, m + 3);
          return Math.max(15, m - 1);
        });
      }

      if (activeExp.simType === "PICK_AND_PLACE" && armJoints.auto) {
        const phase = tick % 6;
        const poses = [
          { base: 30, shoulder: 80, grip: 0 },
          { base: 30, shoulder: 35, grip: 0 },
          { base: 30, shoulder: 35, grip: 1 },
          { base: 30, shoulder: 85, grip: 1 },
          { base: 145, shoulder: 85, grip: 1 },
          { base: 145, shoulder: 35, grip: 0 },
        ];
        setArmJoints((prev) => ({ ...prev, ...poses[phase] }));
      }
    }, interval);

    return () => window.clearInterval(timer);
  }, [isRunning, activeExp.simType, parsedIntervalMs, audioEnabled, pumpOn, armJoints.auto, tick]);

  // Derived Hardware Indicators for 3D ESP32 Board
  const boardLedState = useMemo(() => {
    const phase = tick % 2 === 0;
    let gpio2Lit = false;
    let extRedLit = false;
    let extCyanLit = false;

    if (!isRunning) {
      return { gpio2Lit: false, extRedLit: false, extCyanLit: false };
    }

    switch (activeExp.simType) {
      case "MEET_ESP32":
        gpio2Lit = phase;
        break;
      case "DUAL_LED":
        extRedLit = phase;
        extCyanLit = !phase;
        gpio2Lit = phase;
        break;
      case "REED_SWITCH":
        gpio2Lit = magnetNear;
        extCyanLit = magnetNear;
        break;
      case "WIFI_CONTROL":
        gpio2Lit = wifiCh1;
        extCyanLit = wifiCh2;
        break;
      case "LIGHT_SENSOR":
        gpio2Lit = ambientLux < 250;
        break;
      case "LASER_BARRIER":
        extRedLit = !beamBroken;
        gpio2Lit = alarmLatched;
        break;
      case "SMART_PARKING":
        gpio2Lit = parkingSlots.s1 && parkingSlots.s2;
        extCyanLit = parkingSlots.gateOpen;
        break;
      case "WATER_PUMP":
        gpio2Lit = pumpOn;
        break;
      case "KEYPAD_LOCK":
        gpio2Lit = doorUnlocked;
        extCyanLit = doorUnlocked;
        break;
      default:
        gpio2Lit = phase;
    }

    if (parsedCodeDirectives.forceGpio2High) {
      gpio2Lit = true;
    }

    return { gpio2Lit, extRedLit, extCyanLit };
  }, [
    isRunning,
    tick,
    activeExp.simType,
    parsedCodeDirectives.forceGpio2High,
    magnetNear,
    wifiCh1,
    wifiCh2,
    ambientLux,
    beamBroken,
    alarmLatched,
    parkingSlots,
    pumpOn,
    doorUnlocked,
  ]);

  const completedCount = Object.values(completedLessons).filter(Boolean).length;
  const isCurrentCompleted = Boolean(completedLessons[activeExp.id]);

  // Radar canvas sweep angle for Exp 19
  const radarAngleDeg = 15 + ((tick * 12) % 150);
  const radarEchoCm = useMemo(() => {
    // Virtual obstacle cluster at 55° (62 cm) and 120° (95 cm)
    if (Math.abs(radarAngleDeg - 55) < 12) return 62;
    if (Math.abs(radarAngleDeg - 120) < 12) return 95;
    return targetDistanceCm > 130 ? 180 : 165;
  }, [radarAngleDeg, targetDistanceCm]);

  const codeLines = useMemo(() => codeText.split("\n"), [codeText]);
  const activeExecutionLine = useMemo(() => {
    if (!isRunning || codeLines.length === 0) return -1;
    const loopIdx = codeLines.findIndex((l) => /void\s+loop\s*\(/.test(l));
    const startIdx = loopIdx >= 0 ? loopIdx + 1 : 0;
    const execCandidates: number[] = [];
    for (let i = startIdx; i < codeLines.length; i++) {
      const t = codeLines[i].trim();
      if (
        t &&
        !t.startsWith("//") &&
        !t.startsWith("{") &&
        !t.startsWith("}") &&
        /(digitalWrite|ledcWrite|analogRead|Serial\.|servo|pixels|esp_now|delay|tone|trigger|pulseIn|digitalRead)/i.test(t)
      ) {
        execCandidates.push(i);
      }
    }
    if (execCandidates.length === 0) return Math.min(codeLines.length - 1, startIdx + (tick % Math.max(1, codeLines.length - startIdx)));
    return execCandidates[tick % execCandidates.length];
  }, [codeLines, isRunning, tick]);

  const handleGuidedStepClick = (stepId: number) => {
    setActiveStep(stepId);
    if (stepId === 1) {
      setVisualMode("3D");
      setRightTab("GUIDE");
    } else if (stepId === 2) {
      setVisualMode("SPLIT");
      setRightTab("GUIDE");
    } else if (stepId === 3) {
      setRightTab("CODE");
      setCodeViewMode("TRACE");
    } else if (stepId === 4) {
      setRightTab("SERIAL");
    }
  };

  const handlePressKeypad = (k: string) => {
    if (k === "*") {
      setKeypadBuffer("");
      setDoorUnlocked(false);
      appendSerial("KEYPAD * -> Buffer cleared, lock engaged");
    } else if (k === "#") {
      const ok = keypadBuffer === "1234";
      setDoorUnlocked(ok);
      appendSerial(ok ? "PIN 1234 VALID -> Bolt Servo UNLOCKED" : `INVALID PIN "${keypadBuffer}"`);
      setKeypadBuffer("");
    } else {
      setKeypadBuffer((b) => (b + k).slice(0, 4));
      appendSerial(`KEYPAD KEY '${k}' pressed`);
    }
  };

  const handleSendSerialTx = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = serialTxInput.trim();
    if (!cmd) return;
    appendSerial(`TX > ${cmd}`);
    const upper = cmd.toUpperCase();
    if (upper === "HELP") {
      appendSerial("ESP32 SHELL: Commands -> STATUS, ON, OFF, RESET, PING");
    } else if (upper === "PING") {
      appendSerial(`PONG (ticks=${tick}, clk=240MHz, heap=284KB)`);
    } else if (upper === "STATUS") {
      appendSerial(
        `EXP #${activeExp.id} (${activeExp.simType}) | running=${isRunning} | pins=[${activeExp.highlightedPins.join(",")}]`
      );
    } else if (upper === "ON") {
      setWifiCh1(true);
      setPumpOn(true);
      appendSerial("RX ACK: Output channel energized HIGH (3.3V)");
    } else if (upper === "OFF") {
      setWifiCh1(false);
      setPumpOn(false);
      setAlarmLatched(false);
      appendSerial("RX ACK: Output channel set LOW (0V)");
    } else if (upper === "RESET") {
      setBeamBroken(false);
      setAlarmLatched(false);
      setDoorUnlocked(false);
      setKeypadBuffer("");
      appendSerial("SW_CPU_RESET -> Peripherals re-armed");
    } else {
      appendSerial(`UART0 ECHO <- "${cmd}" (${cmd.length} bytes received)`);
    }
    setSerialTxInput("");
  };

  const handleRunCode = () => {
    setIsRunning(true);
    appendSerial(`Compiled & flashed Exp #${activeExp.id} (${activeExp.title}) -> OK (${parsedIntervalMs} ms cadence)`);
    if (parsedCodeDirectives.serialPrints.length > 0) {
      appendSerial(`[SKETCH] Loaded ${parsedCodeDirectives.serialPrints.length} Serial.println() statement(s)`);
    }
    if (onLogSimulationActivity) {
      onLogSimulationActivity(
        `Ran ESP32 Exp #${activeExp.id}: ${activeExp.title}`,
        `ESP32 Learning Lab (${activeExp.highlightedPins.join(", ")})`,
        "PASS"
      );
    }
  };

  const handleResetMcu = () => {
    setTick(0);
    setAlarmLatched(false);
    setDoorUnlocked(false);
    setKeypadBuffer("");
    appendSerial("ets Jun 8 2016 00:22:57 | rst:0x1 (POWERON_RESET) -> EN Pin Pressed");
  };

  const handleBootPress = () => {
    appendSerial("rst:0x1 (DOWNLOAD_BOOT_GPIO0) -> Entering ROM Flash Mode...");
    window.setTimeout(() => {
      appendSerial("Flash verify 100% -> Hard resetting via RTS pin...");
    }, 350);
  };

  return (
    <div className="space-y-5">
      {/* TOP BAR: EXPERIMENT SELECTOR & EXECUTION CONTROLS */}
      <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
              <Cpu className="w-4 h-4" />
              <span className="font-bold">ESP32 LEARNING LAB</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-300 tabular-nums">
                Experiment {activeExp.id} of 20 · {activeExp.difficulty}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-emerald-400 tabular-nums">
                {completedCount}/20 Completed
              </span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
              {activeExp.id}. {activeExp.title}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={activeExp.id <= 1}
              onClick={() => setSelectedId((id) => Math.max(1, id - 1))}
              className="p-2 rounded-lg bg-[#080d18] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Previous Experiment"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={activeExp.id >= 20}
              onClick={() => setSelectedId((id) => Math.min(20, id + 1))}
              className="p-2 rounded-lg bg-[#080d18] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
              title="Next Experiment"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsRunning((r) => !r)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                isRunning
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                  : "bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" /> Pause Sim
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" /> Run Sim
                </>
              )}
            </button>

            {knowledgeChecks?.[`ESP32-${activeExp.id}`] && onOpenKnowledgeCheck && (
              <button
                type="button"
                onClick={() => onOpenKnowledgeCheck(activeExp.id)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-semibold bg-[#0B1220] hover:bg-[#162338] text-[#35BDF2] border border-[#24344D] cursor-pointer transition-colors tabular-nums"
                title="Retake Post-Lab Knowledge Check"
              >
                Quiz: {knowledgeChecks[`ESP32-${activeExp.id}`].score}/
                {knowledgeChecks[`ESP32-${activeExp.id}`].totalQuestions}
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                onToggleLessonComplete(activeExp.id, !isCurrentCompleted)
              }
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-colors ${
                isCurrentCompleted
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-400/50"
                  : "bg-[#080d18] text-slate-200 border-slate-700 hover:border-emerald-400"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isCurrentCompleted ? "Completed" : "Mark Complete"}
            </button>
          </div>
        </div>

        {/* Horizontal 20-Experiment Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 pt-1 border-t border-slate-800/80">
          {ESP32_20_EXPERIMENTS.map((exp) => {
            const active = exp.id === activeExp.id;
            const done = Boolean(completedLessons[exp.id]);
            return (
              <button
                key={exp.id}
                type="button"
                onClick={() => setSelectedId(exp.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors flex items-center gap-1.5 ${
                  active
                    ? "bg-cyan-400 text-slate-950 font-bold"
                    : done
                    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/35"
                    : "bg-[#080d18] text-slate-300 hover:text-white border border-slate-800"
                }`}
              >
                <span className="font-mono text-[11px] tabular-nums">{exp.id}.</span>
                <span>{exp.title}</span>
              </button>
            );
          })}
        </div>

        {/* 4-Step Guided Learning Stepper */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1 border-t border-slate-800/70">
          {GUIDED_STEPS.map((st) => {
            const current = activeStep === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => handleGuidedStepClick(st.id)}
                className={`text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer ${
                  current
                    ? "bg-cyan-500/15 border-cyan-400/60 text-white"
                    : "bg-[#080d18] border-slate-800/90 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-cyan-300">
                  <ListChecks className="w-3.5 h-3.5 shrink-0" />
                  <span>{st.label}</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5 truncate">{st.hint}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN SPLIT WORKBENCH: LEFT 3D HARDWARE + PERIPHERAL SIM | RIGHT LESSON + CODE + SERIAL */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7 cols): 3D ESP32 Board / Split / 2D Schematic + Selected Pin + Interactive Hardware */}
        <div className="xl:col-span-7 space-y-4">
          {/* View Toggle: 3D ESP32 vs Split vs 2D Pinout Schematic */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center bg-[#080d18] border border-[#1e2d4a] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setVisualMode("3D")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  visualMode === "3D"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                3D Board
              </button>
              <button
                type="button"
                onClick={() => setVisualMode("SPLIT")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  visualMode === "SPLIT"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                3D + Schematic
              </button>
              <button
                type="button"
                onClick={() => setVisualMode("SCHEMATIC")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                  visualMode === "SCHEMATIC"
                    ? "bg-cyan-400 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Schematic
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Active Pins:{" "}
              <span className="text-emerald-400 font-semibold">
                {activeExp.highlightedPins.join(", ")}
              </span>
            </div>
          </div>

          {/* 3D ESP32 Canvas AND/OR 2D Pinout Explorer */}
          <div
            className={
              visualMode === "SPLIT"
                ? "grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch"
                : "space-y-4"
            }
          >
            {(visualMode === "3D" || visualMode === "SPLIT") && (
              <div className={visualMode === "SPLIT" ? "lg:col-span-7" : ""}>
                <Esp32Board3D
                  selectedPinLabel={selectedPin?.label ?? null}
                  highlightedPins={activeExp.highlightedPins}
                  pinWiring={activeExp.pinWiring}
                  simType={activeExp.simType}
                  isRunning={isRunning}
                  gpio2Lit={boardLedState.gpio2Lit}
                  externalLedRedLit={boardLedState.extRedLit}
                  externalLedCyanLit={boardLedState.extCyanLit}
                  motorSpeedNorm={
                    activeExp.simType === "DC_MOTOR"
                      ? motorState.dir === "STOP"
                        ? 0
                        : (motorState.dir === "CW" ? 1 : -1) * (motorState.pwm / 255)
                      : activeExp.simType === "WATER_PUMP" && pumpOn
                      ? 0.75
                      : 0
                  }
                  servoAngleDeg={
                    activeExp.simType === "SMART_PARKING"
                      ? parkingSlots.gateOpen
                        ? 90
                        : 0
                      : activeExp.simType === "KEYPAD_LOCK"
                      ? doorUnlocked
                        ? 90
                        : 0
                      : activeExp.simType === "SOLAR_TRACKING"
                      ? sunAngle
                      : activeExp.simType === "ULTRASONIC_RADAR"
                      ? radarAngleDeg
                      : activeExp.simType === "PICK_AND_PLACE"
                      ? armJoints.base
                      : 45
                  }
                  ultrasonicCm={
                    activeExp.simType === "ULTRASONIC_RADAR"
                      ? radarEchoCm
                      : targetDistanceCm
                  }
                  activeColorHex={
                    activeExp.simType === "MOOD_LAMP"
                      ? `rgb(${
                          moodRgb.auto
                            ? Math.round(127 + 127 * Math.sin(tick * 0.25))
                            : moodRgb.r
                        },${
                          moodRgb.auto
                            ? Math.round(127 + 127 * Math.sin(tick * 0.25 + 2.1))
                            : moodRgb.g
                        },${
                          moodRgb.auto
                            ? Math.round(127 + 127 * Math.sin(tick * 0.25 + 4.2))
                            : moodRgb.b
                        })`
                      : "#22d3ee"
                  }
                  tick={tick}
                  magnetNear={magnetNear}
                  wifiCh1={wifiCh1}
                  wifiCh2={wifiCh2}
                  activePianoKey={activePianoNote?.key ?? null}
                  ringMode={ringMode}
                  ambientLux={ambientLux}
                  beamBroken={beamBroken}
                  alarmLatched={alarmLatched}
                  espNowCount={espNowCount}
                  parkingSlots={parkingSlots}
                  moisturePct={moisturePct}
                  pumpOn={pumpOn}
                  doorUnlocked={doorUnlocked}
                  enteredPin={keypadBuffer}
                  sunAngle={sunAngle}
                  radarAngleDeg={radarAngleDeg}
                  radarEchoCm={radarEchoCm}
                  armJoints={armJoints}
                  focusPinTrigger={focusPinTrigger}
                  customWires={customWires}
                  onAddCustomWire={(fromPinLabel, targetSocketIdx) => {
                    const palette = ["#22d3ee", "#f59e0b", "#10b981", "#a855f7", "#ef4444"];
                    setCustomWires((prev) => [
                      ...prev,
                      {
                        id: `cw_${Date.now()}_${prev.length}`,
                        fromPinLabel,
                        targetSocketIdx,
                        colorHex: palette[prev.length % palette.length],
                      },
                    ]);
                    appendSerial(`3D WIRE ADDED: ${fromPinLabel} -> Bench Terminal #${targetSocketIdx + 1}`);
                  }}
                  onRemoveCustomWire={(wireId) => {
                    setCustomWires((prev) => prev.filter((w) => w.id !== wireId));
                    appendSerial("3D WIRE REMOVED");
                  }}
                  onResetBoard={handleResetMcu}
                  onBootPress={handleBootPress}
                  onSelectPin={(pin) => setSelectedPin(pin)}
                  onToggleMagnet={() => {
                    const next = !magnetNear;
                    setMagnetNear(next);
                    appendSerial(next ? "3D MAGNET DETECTED -> Door Closed" : "3D MAGNET REMOVED -> Door Open");
                  }}
                  onPressPianoKey={(key, freq) => {
                    setActivePianoNote({ key, freq });
                    if (audioEnabled) playToneAudio(freq, 0.25);
                    appendSerial(`3D CAPACITIVE PAD ${key} (${freq} Hz) triggered`);
                  }}
                  onToggleBeam={() => {
                    const next = !beamBroken;
                    setBeamBroken(next);
                    if (next) {
                      setAlarmLatched(true);
                      appendSerial("3D BEAM INTERRUPTED -> ALARM LATCHED");
                    } else {
                      appendSerial("3D OPTICAL LINK RESTORED");
                    }
                  }}
                  onPressKeypadKey={handlePressKeypad}
                  onToggleParkingSlot={(slot) => {
                    setParkingSlots((p) => {
                      const updated = { ...p, [slot]: !p[slot] };
                      const free = (!updated.s1 ? 1 : 0) + (!updated.s2 ? 1 : 0);
                      appendSerial(
                        `3D BAY ${slot.toUpperCase()} -> ${updated[slot] ? "OCCUPIED" : "FREE"} (${free} open)`
                      );
                      return updated;
                    });
                  }}
                  onToggleWifiChannel={(ch) => {
                    if (ch === 1) {
                      const next = !wifiCh1;
                      setWifiCh1(next);
                      appendSerial(`3D RELAY CH1 (GPIO 2) -> ${next ? "ON" : "OFF"}`);
                    } else {
                      const next = !wifiCh2;
                      setWifiCh2(next);
                      appendSerial(`3D RELAY CH2 (GPIO 26) -> ${next ? "ON" : "OFF"}`);
                    }
                  }}
                />
              </div>
            )}

            {(visualMode === "SCHEMATIC" || visualMode === "SPLIT") && (
              <div className={visualMode === "SPLIT" ? "lg:col-span-5" : ""}>
                <Esp32InteractiveSchematic
                  experiment={activeExp}
                  selectedPinLabel={selectedPin?.label ?? null}
                  isRunning={isRunning}
                  gpio2Lit={boardLedState.gpio2Lit}
                  externalLedRedLit={boardLedState.extRedLit}
                  externalLedCyanLit={boardLedState.extCyanLit}
                  motorSpeedNorm={
                    activeExp.simType === "DC_MOTOR"
                      ? motorState.dir === "STOP"
                        ? 0
                        : (motorState.dir === "CW" ? 1 : -1) * (motorState.pwm / 255)
                      : 0
                  }
                  servoAngleDeg={
                    activeExp.simType === "SMART_PARKING"
                      ? parkingSlots.gateOpen
                        ? 90
                        : 0
                      : activeExp.simType === "KEYPAD_LOCK"
                      ? doorUnlocked
                        ? 90
                        : 0
                      : activeExp.simType === "SOLAR_TRACKING"
                      ? sunAngle
                      : activeExp.simType === "ULTRASONIC_RADAR"
                      ? radarAngleDeg
                      : 45
                  }
                  ultrasonicCm={targetDistanceCm}
                  activeColorHex="#22d3ee"
                  magnetNear={magnetNear}
                  wifiCh1={wifiCh1}
                  wifiCh2={wifiCh2}
                  beamBroken={beamBroken}
                  alarmLatched={alarmLatched}
                  pumpOn={pumpOn}
                  doorUnlocked={doorUnlocked}
                  onSelectPin={(pin) => setSelectedPin(pin)}
                  onFocusPin3D={(pinLabel) =>
                    setFocusPinTrigger((prev) => ({ pinLabel, seq: (prev?.seq ?? 0) + 1 }))
                  }
                />
              </div>
            )}
          </div>

          {/* Selected Pin GPIO Explanation Bar */}
          {selectedPin && (
            <div className="bg-[#0d1424] border border-[#1e2d4a] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="text-cyan-400 font-bold">{selectedPin.label}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-emerald-400">
                    {selectedPin.capabilities.join(" · ")}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{selectedPin.description}</p>
                {selectedPin.caution && (
                  <p className="text-[11px] font-mono text-amber-300 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    {selectedPin.caution}
                  </p>
                )}
              </div>
              <div className="font-mono text-[11px] text-slate-400 shrink-0">
                3.3V Logic
              </div>
            </div>
          )}

          {/* LIVE INTERACTIVE EXPERIMENT SIMULATOR STAGE */}
          <div className="bg-[#0d1424] border border-cyan-500/35 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                INTERACTIVE HARDWARE PERIPHERAL STAGE — EXP #{activeExp.id}
              </div>
              {(activeExp.simType === "BUZZER_SIREN" || activeExp.simType === "TOUCH_PIANO") && (
                <button
                  type="button"
                  onClick={() => setAudioEnabled((v) => !v)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#080d18] border border-slate-700 text-slate-200 cursor-pointer"
                >
                  {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
                  {audioEnabled ? "Audio On" : "Enable Tone Audio"}
                </button>
              )}
            </div>

            {/* 1 & 2. LED Experiments */}
            {(activeExp.simType === "MEET_ESP32" || activeExp.simType === "DUAL_LED") && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-around gap-6">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full border-2 transition-all ${
                      boardLedState.gpio2Lit
                        ? "bg-cyan-400 border-cyan-200 shadow-[0_0_24px_#22d3ee]"
                        : "bg-slate-900 border-slate-700"
                    }`}
                  />
                  <span className="text-xs font-mono text-slate-300">GPIO 2 (Onboard)</span>
                </div>
                {activeExp.simType === "DUAL_LED" && (
                  <>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          boardLedState.extRedLit
                            ? "bg-rose-500 border-rose-200 shadow-[0_0_24px_#f43f5e]"
                            : "bg-slate-900 border-slate-700"
                        }`}
                      />
                      <span className="text-xs font-mono text-slate-300">GPIO 16 (Red LED)</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          boardLedState.extCyanLit
                            ? "bg-cyan-400 border-cyan-200 shadow-[0_0_24px_#22d3ee]"
                            : "bg-slate-900 border-slate-700"
                        }`}
                      />
                      <span className="text-xs font-mono text-slate-300">GPIO 17 (Cyan LED)</span>
                    </div>
                  </>
                )}
                <div className="text-xs font-mono text-slate-400">
                  Cadence parsed from code:{" "}
                  <strong className="text-cyan-300 tabular-nums">{parsedIntervalMs} ms</strong>
                </div>
              </div>
            )}

            {/* 3. Reed Switch */}
            {activeExp.simType === "REED_SWITCH" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    Reed Contact State:{" "}
                    <span className={magnetNear ? "text-emerald-400" : "text-amber-300"}>
                      {magnetNear ? "CLOSED (GPIO 14 = LOW)" : "OPEN (GPIO 14 = HIGH via Pull-Up)"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Click to move neodymium magnet near or away from glass reed switch.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !magnetNear;
                    setMagnetNear(next);
                    appendSerial(next ? "MAGNET DETECTED -> Door Closed" : "NO MAGNET -> Door Open");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    magnetNear
                      ? "bg-emerald-400 text-slate-950"
                      : "bg-slate-800 text-cyan-300 border border-cyan-500/40"
                  }`}
                >
                  {magnetNear ? "Remove Magnet" : "Bring Magnet Near"}
                </button>
              </div>
            )}

            {/* 4. Wi-Fi Control */}
            {activeExp.simType === "WIFI_CONTROL" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
                  <span>ESP32 SOFT-AP WEB DASHBOARD · http://192.168.4.1</span>
                  <span className="text-emerald-400">RSSI: -48 dBm</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !wifiCh1;
                      setWifiCh1(next);
                      appendSerial(`HTTP GET /ch1/${next ? "on" : "off"} -> GPIO 2 = ${next ? "HIGH" : "LOW"}`);
                    }}
                    className={`p-3 rounded-xl text-xs font-bold border cursor-pointer ${
                      wifiCh1
                        ? "bg-cyan-500/20 border-cyan-400 text-cyan-300"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}
                  >
                    Channel 1 (GPIO 2): {wifiCh1 ? "ON" : "OFF"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !wifiCh2;
                      setWifiCh2(next);
                      appendSerial(`HTTP GET /ch2/${next ? "on" : "off"} -> GPIO 26 = ${next ? "HIGH" : "LOW"}`);
                    }}
                    className={`p-3 rounded-xl text-xs font-bold border cursor-pointer ${
                      wifiCh2
                        ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                        : "bg-slate-900 border-slate-700 text-slate-400"
                    }`}
                  >
                    Channel 2 (GPIO 26): {wifiCh2 ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            )}

            {/* 5. Buzzer Siren */}
            {activeExp.simType === "BUZZER_SIREN" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-2">
                {(() => {
                  const freq = 500 + Math.round(Math.sin(((tick % 16) / 16) * Math.PI) * 750);
                  const pct = Math.round(((freq - 500) / 750) * 100);
                  return (
                    <>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">LEDC GPIO 18 Carrier Frequency</span>
                        <span className="text-amber-300 font-bold tabular-nums">{freq} Hz</span>
                      </div>
                      <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                        <div className="h-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 6. Touch Piano */}
            {activeExp.simType === "TOUCH_PIANO" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: "C5", pin: "T0 (G4)", freq: 523 },
                    { key: "D5", pin: "T3 (G15)", freq: 587 },
                    { key: "E5", pin: "T6 (G14)", freq: 659 },
                    { key: "F5", pin: "T7 (G27)", freq: 698 },
                    { key: "G5", pin: "T9 (G32)", freq: 784 },
                  ].map((note) => {
                    const active = activePianoNote?.key === note.key;
                    return (
                      <button
                        key={note.key}
                        type="button"
                        onClick={() => {
                          setActivePianoNote(note);
                          if (audioEnabled) playToneAudio(note.freq, 0.25);
                          appendSerial(`TOUCH ${note.pin} < 28 -> Note ${note.key} (${note.freq} Hz)`);
                        }}
                        className={`py-4 rounded-xl border text-center cursor-pointer transition-colors ${
                          active
                            ? "bg-cyan-400 text-slate-950 border-cyan-200 font-bold"
                            : "bg-slate-900 hover:bg-slate-800 text-white border-slate-700"
                        }`}
                      >
                        <div className="text-sm font-bold">{note.key}</div>
                        <div className="text-[10px] font-mono opacity-80">{note.pin}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-mono text-slate-400">
                  Last active note: <span className="text-cyan-300">{activePianoNote ? `${activePianoNote.key} (${activePianoNote.freq} Hz)` : "Tap any capacitive pad"}</span>
                </div>
              </div>
            )}

            {/* 7. RGB LED Ring */}
            {activeExp.simType === "RGB_RING" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <svg viewBox="-70 -70 140 140" className="w-32 h-32">
                  <circle cx={0} cy={0} r={54} fill="none" stroke="#1e293b" strokeWidth={12} />
                  {Array.from({ length: 12 }).map((_, i) => {
                    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
                    const x = Math.cos(angle) * 54;
                    const y = Math.sin(angle) * 54;
                    const activeIdx = tick % 12;
                    let fill = "#0f172a";
                    if (ringMode === "CYAN") fill = "#22d3ee";
                    else if (ringMode === "RAINBOW") fill = `hsl(${((i * 30 + tick * 20) % 360)}, 90%, 55%)`;
                    else if (i === activeIdx) fill = "#22d3ee";
                    else if ((i + 1) % 12 === activeIdx) fill = "#0284c7";
                    return <circle key={i} cx={x} cy={y} r={6} fill={fill} />;
                  })}
                </svg>
                <div className="space-y-2 flex-1">
                  <div className="text-xs font-mono text-slate-300">WS2812B 12-Pixel Animation Mode (GPIO 23)</div>
                  <div className="flex flex-wrap gap-2">
                    {(["CHASE", "RAINBOW", "CYAN"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setRingMode(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          ringMode === m ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 8. Mood Lamp */}
            {activeExp.simType === "MOOD_LAMP" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {(() => {
                  const r = moodRgb.auto ? Math.round(127 + 127 * Math.sin(tick * 0.25)) : moodRgb.r;
                  const g = moodRgb.auto ? Math.round(127 + 127 * Math.sin(tick * 0.25 + 2.1)) : moodRgb.g;
                  const b = moodRgb.auto ? Math.round(127 + 127 * Math.sin(tick * 0.25 + 4.2)) : moodRgb.b;
                  return (
                    <>
                      <div className="sm:col-span-4 flex flex-col items-center gap-2">
                        <div
                          className="w-20 h-20 rounded-full border border-white/20"
                          style={{
                            backgroundColor: `rgb(${r},${g},${b})`,
                            boxShadow: `0 0 36px rgba(${r},${g},${b},0.65)`,
                          }}
                        />
                        <span className="text-[11px] font-mono text-slate-300 tabular-nums">
                          RGB({r}, {g}, {b})
                        </span>
                      </div>
                      <div className="sm:col-span-8 space-y-2 text-xs font-mono">
                        <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={moodRgb.auto}
                            onChange={(e) => setMoodRgb((p) => ({ ...p, auto: e.target.checked }))}
                          />
                          Auto-Cycle Smooth Color Spectrum
                        </label>
                        {!moodRgb.auto && (
                          <div className="space-y-1.5">
                            {(["r", "g", "b"] as const).map((ch) => (
                              <input
                                key={ch}
                                type="range"
                                min={0}
                                max={255}
                                value={moodRgb[ch]}
                                onChange={(e) =>
                                  setMoodRgb((p) => ({ ...p, [ch]: parseInt(e.target.value, 10) }))
                                }
                                className="w-full cursor-pointer"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 9. Light Sensor */}
            {activeExp.simType === "LIGHT_SENSOR" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-3">
                {(() => {
                  const adc = Math.round((ambientLux / 1000) * 4095);
                  const volts = (adc / 4095) * 3.3;
                  return (
                    <>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Ambient Illumination</span>
                        <span className="text-amber-300 font-bold tabular-nums">{ambientLux} lux</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={1000}
                        step={10}
                        value={ambientLux}
                        onChange={(e) => setAmbientLux(parseInt(e.target.value, 10))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">ADC1 (G34)</div>
                          <div className="text-white font-bold tabular-nums">{adc}</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">V_out</div>
                          <div className="text-cyan-300 font-bold tabular-nums">{volts.toFixed(2)} V</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">Night Lamp</div>
                          <div className={ambientLux < 250 ? "text-emerald-400 font-bold" : "text-slate-400"}>
                            {ambientLux < 250 ? "ON (Dark)" : "OFF"}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 10. Ultrasonic Distance Meter */}
            {activeExp.simType === "ULTRASONIC_METER" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-3">
                {(() => {
                  const flightUs = Math.round((targetDistanceCm * 2) / 0.0343);
                  return (
                    <>
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-300">Target Object Distance</span>
                        <span className="text-cyan-300 font-bold tabular-nums">{targetDistanceCm} cm</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={250}
                        value={targetDistanceCm}
                        onChange={(e) => {
                          const d = parseInt(e.target.value, 10);
                          setTargetDistanceCm(d);
                          appendSerial(`Flight: ${Math.round((d * 2) / 0.0343)} us | Distance: ${d}.0 cm`);
                        }}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">ECHO PULSE</div>
                          <div className="text-white font-bold tabular-nums">{flightUs} µs</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">DISTANCE</div>
                          <div className="text-cyan-300 font-bold tabular-nums">{targetDistanceCm} cm</div>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-2.5">
                          <div className="text-[10px] text-slate-400">PROXIMITY</div>
                          <div className={targetDistanceCm < 25 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                            {targetDistanceCm < 25 ? "ALERT (<25cm)" : "CLEAR"}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* 11. DC Motor Control */}
            {activeExp.simType === "DC_MOTOR" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    {(["CW", "CCW", "STOP"] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setMotorState((p) => ({ ...p, dir: d }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                          motorState.dir === d ? "bg-cyan-400 text-slate-950" : "bg-slate-900 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs font-mono text-emerald-400 tabular-nums">
                    {motorState.dir === "STOP" ? "0 RPM (Braked)" : `${Math.round((motorState.pwm / 255) * 3200)} RPM (${motorState.dir})`}
                  </div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={255}
                  value={motorState.pwm}
                  onChange={(e) => setMotorState((p) => ({ ...p, pwm: parseInt(e.target.value, 10) }))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
              </div>
            )}

            {/* 12. Laser Barrier */}
            {activeExp.simType === "LASER_BARRIER" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-bold text-white">
                    Optical Link:{" "}
                    <span className={beamBroken ? "text-rose-400" : "text-emerald-400"}>
                      {beamBroken ? "BEAM INTERRUPTED (ADC=210)" : "650nm LASER LOCKED (ADC=3450)"}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-400">
                    Alarm Latch: {alarmLatched ? "TRIPPED SIREN ON" : "ARMED"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = !beamBroken;
                      setBeamBroken(next);
                      if (next) {
                        setAlarmLatched(true);
                        appendSerial("ALARM: LASER BEAM INTERRUPTED!");
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 cursor-pointer"
                  >
                    {beamBroken ? "Restore Beam" : "Break Laser Beam"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBeamBroken(false);
                      setAlarmLatched(false);
                      appendSerial("Barrier reset -> ARMED");
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-white cursor-pointer"
                  >
                    Reset Latch
                  </button>
                </div>
              </div>
            )}

            {/* 13. Bluetooth Communication */}
            {activeExp.simType === "BLUETOOTH_COMM" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={btInput}
                  onChange={(e) => setBtInput(e.target.value)}
                  placeholder="Send BLE command (e.g. ON, OFF, PING)..."
                  className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white"
                />
                <button
                  type="button"
                  onClick={() => appendSerial(`BLE RX <- "${btInput}" | ESP32 ACK OK`)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> Send BLE Packet
                </button>
              </div>
            )}

            {/* 14. ESP-NOW Communication */}
            {activeExp.simType === "ESPNOW_COMM" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs font-mono text-slate-300">
                  Node A (24:6F:28:A1) → Node B (24:6F:28:B9) · Packets Acked:{" "}
                  <strong className="text-emerald-400 tabular-nums">{espNowCount}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const n = espNowCount + 1;
                    setEspNowCount(n);
                    appendSerial(`ESP-NOW TX #${n} -> Delivery ACK OK (3.2 ms latency)`);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 text-slate-950 cursor-pointer"
                >
                  Broadcast ESP-NOW Frame
                </button>
              </div>
            )}

            {/* 15. Smart Parking */}
            {activeExp.simType === "SMART_PARKING" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setParkingSlots((p) => ({ ...p, s1: !p.s1 }))}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                      parkingSlots.s1 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    Slot 1: {parkingSlots.s1 ? "OCCUPIED" : "FREE"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setParkingSlots((p) => ({ ...p, s2: !p.s2 }))}
                    className={`px-3 py-2 rounded-lg text-xs font-mono font-bold cursor-pointer ${
                      parkingSlots.s2 ? "bg-rose-500/20 text-rose-300 border border-rose-500/40" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                    }`}
                  >
                    Slot 2: {parkingSlots.s2 ? "OCCUPIED" : "FREE"}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const free = (!parkingSlots.s1 ? 1 : 0) + (!parkingSlots.s2 ? 1 : 0);
                    setParkingSlots((p) => ({ ...p, gateOpen: free > 0 }));
                    appendSerial(free > 0 ? `GATE SERVO -> 90 deg OPEN (${free} free)` : "LOT FULL -> GATE LOCKED");
                  }}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold bg-cyan-400 text-slate-950 cursor-pointer"
                >
                  Request Gate Entry ({parkingSlots.gateOpen ? "90° OPEN" : "0° CLOSED"})
                </button>
              </div>
            )}

            {/* 16. Automatic Water Pump */}
            {activeExp.simType === "WATER_PUMP" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Soil Moisture (GPIO 35)</span>
                  <span className="text-cyan-300 font-bold tabular-nums">
                    {moisturePct}% · Pump Relay: {pumpOn ? "RUNNING" : "IDLE"}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={moisturePct}
                  onChange={(e) => setMoisturePct(parseInt(e.target.value, 10))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            )}

            {/* 17. Keypad Door Lock */}
            {activeExp.simType === "KEYPAD_LOCK" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="grid grid-cols-4 gap-1.5">
                  {["1","2","3","A","4","5","6","B","7","8","9","C","*","0","#","D"].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => handlePressKeypad(k)}
                      className="w-9 h-9 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-white cursor-pointer"
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5 font-mono text-xs">
                  <div className="text-slate-400">Default PIN: 1234 · Press # to submit</div>
                  <div className="text-lg font-bold text-cyan-300 tabular-nums">
                    Buffer: {keypadBuffer.padEnd(4, "_")}
                  </div>
                  <div className={doorUnlocked ? "text-emerald-400 font-bold" : "text-amber-300"}>
                    Bolt Status: {doorUnlocked ? "UNLOCKED (90°)" : "LOCKED (0°)"}
                  </div>
                </div>
              </div>
            )}

            {/* 18. Solar Tracking */}
            {activeExp.simType === "SOLAR_TRACKING" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-300">Sun Azimuth Angle</span>
                  <span className="text-amber-300 font-bold tabular-nums">
                    Sun: {sunAngle}° · Panel Servo: {sunAngle}° (Peak Yield)
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={165}
                  value={sunAngle}
                  onChange={(e) => setSunAngle(parseInt(e.target.value, 10))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>
            )}

            {/* 19. Ultrasonic Radar */}
            {activeExp.simType === "ULTRASONIC_RADAR" && (
              <div className="bg-[#040810] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <svg viewBox="-120 -120 240 130" className="w-64 h-36">
                  {[35, 70, 105].map((r) => (
                    <path
                      key={r}
                      d={`M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0`}
                      fill="none"
                      stroke="#134e4a"
                      strokeWidth="1"
                    />
                  ))}
                  {(() => {
                    const rad = ((180 - radarAngleDeg) * Math.PI) / 180;
                    const x2 = Math.cos(rad) * 105;
                    const y2 = -Math.sin(rad) * 105;
                    const hitDist = Math.min(105, (radarEchoCm / 150) * 105);
                    const hx = Math.cos(rad) * hitDist;
                    const hy = -Math.sin(rad) * hitDist;
                    return (
                      <>
                        <line x1={0} y1={0} x2={x2} y2={y2} stroke="#10b981" strokeWidth="2" />
                        {radarEchoCm < 140 && (
                          <circle cx={hx} cy={hy} r={4} fill="#f43f5e" />
                        )}
                      </>
                    );
                  })()}
                </svg>
                <div className="text-xs font-mono space-y-1">
                  <div className="text-emerald-400 font-bold">
                    Azimuth: {radarAngleDeg}°
                  </div>
                  <div className="text-cyan-300 tabular-nums">
                    Range: {radarEchoCm < 140 ? `${radarEchoCm} cm (TARGET)` : "Clear >150 cm"}
                  </div>
                </div>
              </div>
            )}

            {/* 20. Pick-and-Place Robotics */}
            {activeExp.simType === "PICK_AND_PLACE" && (
              <div className="bg-[#080d18] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs font-mono">
                  <div className="text-white font-bold">
                    Base: {armJoints.base}° · Shoulder: {armJoints.shoulder}° · Gripper:{" "}
                    <span className="text-cyan-300">{armJoints.grip ? "CLOSED" : "OPEN"}</span>
                  </div>
                  <div className="text-slate-400">
                    PWM Servo Channels: G13, G12, G14 (50 Hz)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !armJoints.auto;
                    setArmJoints((p) => ({ ...p, auto: next }));
                    appendSerial(next ? "3-DOF Pick-and-Place automated cycle STARTED" : "Robot cycle PAUSED");
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                    armJoints.auto ? "bg-amber-400 text-slate-950" : "bg-cyan-400 text-slate-950"
                  }`}
                >
                  {armJoints.auto ? "Stop Auto Cycle" : "Run Pick & Place Cycle"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): LESSON GUIDE, ARDUINO CODE EDITOR, SERIAL MONITOR, EXPECTED & DEBUG */}
        <div className="xl:col-span-5 bg-[#0d1424] border border-[#1e2d4a] rounded-2xl overflow-hidden flex flex-col">
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-[#1e2d4a] bg-[#080d18] text-xs font-mono">
            {(
              [
                { id: "GUIDE", label: "Guide", icon: BookOpen },
                { id: "CODE", label: "Code", icon: Code2 },
                { id: "SERIAL", label: "Serial", icon: Terminal },
                { id: "RESULTS", label: "Results", icon: CheckCircle2 },
              ] as { id: RightPanelTab; label: string; icon: React.ComponentType<{ className?: string }> }[]
            ).map((tab) => {
              const Icon = tab.icon;
              const active = rightTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRightTab(tab.id)}
                  className={`py-3 px-2 flex items-center justify-center gap-1.5 cursor-pointer border-b-2 transition-colors ${
                    active
                      ? "border-cyan-400 text-cyan-300 font-bold bg-[#0d1424]"
                      : "border-transparent text-slate-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-5 max-h-[680px] overflow-y-auto">
            {rightTab === "GUIDE" && (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeExp.summary}
                </p>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-cyan-400">
                    LEARNING OBJECTIVES
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {activeExp.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-emerald-400">
                    REQUIRED COMPONENTS
                  </h4>
                  <ul className="space-y-1 text-xs text-slate-300 list-disc pl-4">
                    {activeExp.components.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-cyan-400">
                    PIN-BY-PIN WIRING TABLE
                  </h4>
                  <div className="overflow-x-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-[11px] font-mono text-left">
                      <thead className="bg-[#080d18] text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="p-2">ESP32 Pin</th>
                          <th className="p-2">Component</th>
                          <th className="p-2">Wire</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeExp.pinWiring.map((w, i) => (
                          <tr key={i} className="border-b border-slate-800/60 text-slate-200">
                            <td className="p-2 text-cyan-300 font-bold">{w.fromPin}</td>
                            <td className="p-2">
                              {w.toComponent} ({w.toPin})
                            </td>
                            <td className="p-2 text-slate-400">{w.wireColor}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-amber-300">
                    HOW IT WORKS
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {activeExp.explanation}
                  </p>
                </div>
              </div>
            )}

            {rightTab === "CODE" && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-cyan-400">
                    Arduino C++ (.ino) · Live Trace &amp; Timing Editor
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSplitCodeSerial((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                        splitCodeSerial
                          ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200"
                          : "bg-[#080d18] border-slate-700 text-slate-300"
                      }`}
                    >
                      <Terminal className="w-3 h-3" /> {splitCodeSerial ? "Synced Serial" : "Code Only"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setCodeViewMode((m) => (m === "TRACE" ? "EDIT" : "TRACE"))
                      }
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-[#080d18] border border-slate-700 text-cyan-300 hover:border-cyan-400 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      {codeViewMode === "TRACE" ? (
                        <>
                          <Edit3 className="w-3 h-3" /> Edit Sketch
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" /> Live Trace
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCodeText(activeExp.starterCode)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-800 text-slate-300 hover:text-white cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleRunCode}
                      className="px-3 py-1 rounded-lg text-[11px] font-mono font-bold bg-emerald-400 text-slate-950 hover:bg-emerald-300 cursor-pointer flex items-center gap-1 whitespace-nowrap"
                    >
                      <Play className="w-3 h-3 fill-current" /> Upload &amp; Run
                    </button>
                  </div>
                </div>

                {codeViewMode === "TRACE" ? (
                  <div className="w-full h-64 overflow-y-auto p-3 rounded-xl bg-[#060a14] border border-slate-800 text-[11px] font-mono leading-relaxed">
                    {codeLines.map((line, idx) => {
                      const isActiveLine = idx === activeExecutionLine;
                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-2 px-2 py-0.5 rounded transition-colors ${
                            isActiveLine
                              ? "bg-cyan-500/20 border-l-2 border-cyan-400 text-white"
                              : "text-cyan-100/85 border-l-2 border-transparent"
                          }`}
                        >
                          <span className="w-6 shrink-0 text-right text-slate-500 select-none tabular-nums">
                            {idx + 1}
                          </span>
                          <span className="whitespace-pre-wrap break-all flex-1">
                            {line || " "}
                          </span>
                          {isActiveLine && (
                            <span className="text-[9px] font-bold text-cyan-300 shrink-0 px-1.5 py-0.2 bg-cyan-500/20 rounded">
                              EXEC
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value)}
                    spellCheck={false}
                    className="w-full h-64 p-3.5 rounded-xl bg-[#060a14] border border-slate-800 focus:border-cyan-400 text-xs font-mono text-cyan-100 leading-relaxed focus:outline-none resize-y"
                  />
                )}

                {splitCodeSerial && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold">
                        UART0 SERIAL MONITOR · 115200 BAUD
                      </span>
                      <button
                        type="button"
                        onClick={() => setSerialLines([])}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="h-36 overflow-y-auto p-3 rounded-xl bg-[#04070e] border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-1">
                      {serialLines.length === 0 ? (
                        <div className="text-slate-500">Waiting for UART telemetry...</div>
                      ) : (
                        serialLines.map((line, i) => <div key={i}>{line}</div>)
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {rightTab === "SERIAL" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-emerald-400 font-bold">
                    UART0 SERIAL MONITOR · 115200 BAUD
                  </span>
                  <button
                    type="button"
                    onClick={() => setSerialLines([])}
                    className="text-slate-400 hover:text-white cursor-pointer"
                  >
                    Clear Log
                  </button>
                </div>
                <div className="h-72 overflow-y-auto p-3.5 rounded-xl bg-[#04070e] border border-slate-800 font-mono text-[11px] text-emerald-300 space-y-1">
                  {serialLines.length === 0 ? (
                    <div className="text-slate-500">Waiting for UART telemetry...</div>
                  ) : (
                    serialLines.map((line, i) => <div key={i}>{line}</div>)
                  )}
                </div>
                <form onSubmit={handleSendSerialTx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={serialTxInput}
                    onChange={(e) => setSerialTxInput(e.target.value)}
                    placeholder="Send UART command (HELP, STATUS, PING, ON, OFF, RESET)..."
                    className="flex-1 px-3 py-2 rounded-lg bg-[#060a14] border border-slate-700 focus:border-cyan-400 focus:outline-none text-xs font-mono text-white"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-lg text-xs font-mono font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" /> Send
                  </button>
                </form>
              </div>
            )}

            {rightTab === "RESULTS" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-mono font-bold text-emerald-400">
                    EXPECTED RESULTS
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                    {activeExp.expectedResults.map((res, i) => (
                      <li key={i}>{res}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  <h4 className="text-xs font-mono font-bold text-amber-300">
                    TROUBLESHOOTING GUIDE
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4">
                    {activeExp.troubleshooting.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
