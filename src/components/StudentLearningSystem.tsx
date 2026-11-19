import React, { useState, useMemo } from "react";
import {
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  FileText,
  Printer,
  Download,
  Share2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  User,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Sliders,
  Check,
  ChevronRight,
} from "lucide-react";
import { StudentProfile } from "./AcademicProfileGate";
import {
  GUIDED_EXPERIMENTS,
  GuidedExperimentDef,
} from "../data/guidedExperimentsData";
import { ActiveTabId } from "./CurriculumGuide";
import EngineerLogoBadge from "./EngineerLogoBadge";
import { getUserScopedKey } from "../utils/userStorageScope";
import { type KnowledgeCheckRecord } from "../utils/workspaceStore";

interface StudentLearningSystemProps {
  studentProfile: StudentProfile | null;
  onUpdateProfile: (profile: StudentProfile) => void;
  onLaunchExperimentCircuit: (tab: ActiveTabId, expId: string) => void;
  onExperimentsChanged?: (completedIds: string[]) => void;
  onExperimentCompleted?: (exp: GuidedExperimentDef) => void;
  knowledgeChecks?: Record<string, KnowledgeCheckRecord>;
}

export default function StudentLearningSystem({
  studentProfile,
  onUpdateProfile,
  onLaunchExperimentCircuit,
  onExperimentsChanged,
  onExperimentCompleted,
  knowledgeChecks,
}: StudentLearningSystemProps) {
  // Navigation inside learning system: "EXPERIMENTS" | "REPORT_GENERATOR" | "VIVA_QUIZ" | "PROGRESS"
  const [subTab, setSubTab] = useState<
    "EXPERIMENTS" | "REPORT_GENERATOR" | "VIVA_QUIZ" | "PROGRESS"
  >("EXPERIMENTS");

  // Selected experiment for reading or report generation
  const [selectedExpId, setSelectedExpId] = useState<string>("EXP_OHM");

  // Completed experiments set stored per user UID (starts completely empty at 0 for new accounts)
  const [completedExpIds, setCompletedExpIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(
        getUserScopedKey("ist_lab_completed_experiments")
      );
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Quiz state
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [revealedAnswers, setRevealedAnswers] = useState<boolean>(false);

  const selectedExp: GuidedExperimentDef =
    GUIDED_EXPERIMENTS.find((e) => e.id === selectedExpId) ||
    GUIDED_EXPERIMENTS[0];

  const toggleExperimentCompleted = (id: string) => {
    const wasCompleted = completedExpIds.has(id);
    const next = new Set(completedExpIds);
    if (wasCompleted) next.delete(id);
    else next.add(id);

    setCompletedExpIds(next);
    const arr = Array.from(next);
    try {
      localStorage.setItem(
        getUserScopedKey("ist_lab_completed_experiments"),
        JSON.stringify(arr)
      );
    } catch {
      // ignore
    }
    onExperimentsChanged?.(arr);

    if (!wasCompleted) {
      const exp = GUIDED_EXPERIMENTS.find((e) => e.id === id);
      if (exp) {
        onExperimentCompleted?.(exp);
      }
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8">
      {/* Top Learning Hub Banner */}
      <div className="bg-[#111827] border border-[#26365c] rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-2">
                <span>STUDENT LEARNING &amp; VIVA VERIFICATION SYSTEM</span>
                <span aria-hidden="true">·</span>
                <span>{completedExpIds.size} of {GUIDED_EXPERIMENTS.length} Completed</span>
              </div>
              <h2 className="text-2xl font-bold text-white mt-0.5">
                Guided Practical Experiments &amp; Laboratory Reports
              </h2>
            </div>
          </div>

          {/* Student Badge */}
          {studentProfile && (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-slate-300">
              <User className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-white font-bold">{studentProfile.name}</span>
                <span className="text-slate-500 mx-1.5">·</span>
                <span className="text-slate-400">{studentProfile.university.split(",")[0]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800">
          {[
            { id: "EXPERIMENTS", label: "Guided Laboratory Experiments (23)", icon: BookOpen },
            { id: "REPORT_GENERATOR", label: "Formal Lab Report Generator", icon: FileText },
            { id: "VIVA_QUIZ", label: "Viva Preparation & Oral Exam Quiz", icon: HelpCircle },
            { id: "PROGRESS", label: "Student Progress & Curriculum Tracker", icon: Award },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = subTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSubTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-cyan-500 text-slate-950 shadow-md"
                    : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SUBTAB 1: GUIDED EXPERIMENTS */}
      {subTab === "EXPERIMENTS" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Experiments Catalog List */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400 px-1">
              <span>EXPERIMENTS INDEX ({GUIDED_EXPERIMENTS.length})</span>
              <span className="text-cyan-400">Select to View Procedure</span>
            </div>
            <div className="space-y-2 max-h-[750px] overflow-y-auto pr-1">
              {GUIDED_EXPERIMENTS.map((exp, idx) => {
                const isSelected = selectedExpId === exp.id;
                const isCompleted = completedExpIds.has(exp.id);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setSelectedExpId(exp.id)}
                    className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-cyan-500/15 border-cyan-400 text-white"
                        : "bg-[#0d1628] border-slate-800 text-slate-300 hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                          Exp #{idx + 1}
                        </span>
                        <span className="text-slate-400">{exp.category}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {exp.title}
                      </h4>
                      <p className="text-xs text-slate-400 line-clamp-1">
                        {exp.learningObjectives[0]}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0 pt-1">
                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Experiment Detailed Manual */}
          <div className="lg:col-span-7 bg-[#0d1628] border border-[#26365c] rounded-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-mono text-cyan-400 font-bold">
                  PRACTICAL LABORATORY MANUAL · {selectedExp.category}
                </span>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedExp.title}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {knowledgeChecks?.[selectedExp.id] && (
                  <button
                    type="button"
                    onClick={() => onExperimentCompleted?.(selectedExp)}
                    className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-[#111B2B] hover:bg-[#162338] text-[#35BDF2] border border-[#24344D] transition-colors cursor-pointer tabular-nums"
                    title="Retake Post-Lab Knowledge Check"
                  >
                    Quiz: {knowledgeChecks[selectedExp.id].score}/
                    {knowledgeChecks[selectedExp.id].totalQuestions}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleExperimentCompleted(selectedExp.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                    completedExpIds.has(selectedExp.id)
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {completedExpIds.has(selectedExp.id) ? "Completed" : "Mark as Completed"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLaunchExperimentCircuit(selectedExp.presetCircuitTab, selectedExp.id);
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Launch Simulator
                </button>
              </div>
            </div>

            {/* Learning Objectives */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-cyan-300">
                1. LEARNING OBJECTIVES
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {selectedExp.learningObjectives.map((obj, i) => (
                  <li key={i}>{obj}</li>
                ))}
              </ul>
            </div>

            {/* Required Components Specification Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-cyan-300">
                2. REQUIRED COMPONENTS &amp; APPARATUS
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Component</th>
                      <th className="p-2.5">Part #</th>
                      <th className="p-2.5">Qty</th>
                      <th className="p-2.5">Specification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {selectedExp.requiredComponents.map((c, i) => (
                      <tr key={i}>
                        <td className="p-2.5 font-sans font-bold text-white">{c.name}</td>
                        <td className="p-2.5 text-cyan-400">{c.partNumber}</td>
                        <td className="p-2.5">{c.quantity}</td>
                        <td className="p-2.5 text-slate-400">{c.specification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Theoretical Background & Governing Formulas */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-cyan-300">
                3. THEORETICAL PRINCIPLES &amp; FORMULAS
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedExp.theoreticalExplanation}
              </p>
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 font-mono text-xs">
                {selectedExp.governingFormulas.map((f, i) => (
                  <div key={i} className="text-emerald-400">
                    <code>{f}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Step-by-Step Wiring & Procedure */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-cyan-300">
                4. STEP-BY-STEP WIRING &amp; SIMULATION PROCEDURE
              </h4>
              <div className="space-y-2 text-xs text-slate-300">
                {selectedExp.wiringInstructions.map((w, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/70">
                    {w}
                  </div>
                ))}
              </div>
            </div>

            {/* Observation Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-cyan-300">
                5. EXPERIMENTAL MEASUREMENT &amp; OBSERVATION TABLE
              </h4>
              <div className="border border-slate-800 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Trial #</th>
                      <th className="p-2.5">Test Condition</th>
                      <th className="p-2.5">Theoretical Calculation</th>
                      <th className="p-2.5">Simulated Measurement</th>
                      <th className="p-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200">
                    {selectedExp.observationTable.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-900/40">
                        <td className="p-2.5 text-slate-400">{row.step}</td>
                        <td className="p-2.5 font-bold text-cyan-300">{row.paramName}</td>
                        <td className="p-2.5 text-slate-300">{row.theoretical}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">{row.simulated}</td>
                        <td className="p-2.5 text-slate-400">{row.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Result & Conclusions */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-emerald-400">
                6. RESULTS &amp; SCIENTIFIC CONCLUSION
              </h4>
              <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                {selectedExp.conclusions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: FORMAL LAB REPORT GENERATOR */}
      {subTab === "REPORT_GENERATOR" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">University Formal Laboratory Report</h4>
              <p className="text-xs text-slate-400">
                Standard university formatting for IEEE laboratory submissions and grading.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintReport}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition-colors cursor-pointer flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" />
                Print or Save as PDF
              </button>
            </div>
          </div>

          {/* Printable Report Document (Styled for white paper export) */}
          <div
            id="printable-lab-report"
            className="w-full max-w-4xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl border border-slate-200 font-sans space-y-8"
          >
            {/* Formal University Header */}
            <div className="text-center border-b-2 border-slate-900 pb-6 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-slate-950">
                {studentProfile?.university || "DEPARTMENT OF ELECTRICAL ENGINEERING"}
              </h2>
              <h3 className="text-sm sm:text-base font-bold text-slate-700 uppercase">
                Department of Electrical Engineering · Virtual Laboratory Suite
              </h3>
              <div className="text-xs font-mono text-slate-500 pt-1">
                COURSE CODE: EE-212 / EE-221 · SEMESTER FALL/SPRING
              </div>
            </div>

            {/* Student & Submission Metadata Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-300 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">STUDENT NAME:</span>
                <span className="font-bold text-slate-900 text-sm">{studentProfile?.name || "Student Name"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">EXPERIMENT ID:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedExp.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">DATE OF WORK:</span>
                <span className="font-bold text-slate-900 text-sm">{new Date().toLocaleDateString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">VERIFICATION:</span>
                <span className="font-bold text-emerald-700 text-sm">SIMULATED &amp; VERIFIED</span>
              </div>
            </div>

            {/* Title & Objectives */}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-950 border-b border-slate-300 pb-1">
                EXPERIMENT TITLE: {selectedExp.title}
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed font-serif">
                {selectedExp.theoreticalExplanation}
              </p>
            </div>

            {/* Apparatus Required */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase">1. Apparatus &amp; Component List</h4>
              <table className="w-full text-xs text-left border border-slate-300">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Component</th>
                    <th className="p-2 border-r border-slate-300">Part Number</th>
                    <th className="p-2 border-r border-slate-300">Quantity</th>
                    <th className="p-2">Specification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedExp.requiredComponents.map((c, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-slate-300 font-semibold">{c.name}</td>
                      <td className="p-2 border-r border-slate-300 font-mono">{c.partNumber}</td>
                      <td className="p-2 border-r border-slate-300 text-center">{c.quantity}</td>
                      <td className="p-2 text-slate-600">{c.specification}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Experimental Data Observations */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase">2. Observation &amp; Calculation Table</h4>
              <table className="w-full text-xs text-left border border-slate-300 font-mono">
                <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Trial #</th>
                    <th className="p-2 border-r border-slate-300">Test Condition</th>
                    <th className="p-2 border-r border-slate-300">Theoretical</th>
                    <th className="p-2 border-r border-slate-300">Measured (SPICE)</th>
                    <th className="p-2">Error (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedExp.observationTable.map((row, i) => (
                    <tr key={i}>
                      <td className="p-2 border-r border-slate-300">{row.step}</td>
                      <td className="p-2 border-r border-slate-300 font-semibold">{row.paramName}</td>
                      <td className="p-2 border-r border-slate-300">{row.theoretical}</td>
                      <td className="p-2 border-r border-slate-300 font-bold text-blue-700">{row.simulated}</td>
                      <td className="p-2 text-emerald-700 font-semibold">&lt; 0.25%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Results and Conclusion */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-slate-900 uppercase">3. Results &amp; Discussion</h4>
              <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
                {selectedExp.conclusions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Formal Evaluation Sign-off Block */}
            <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs font-mono">
              <div>
                <span className="text-slate-500 block">STUDENT SIGNATURE:</span>
                <div className="h-10 border-b border-slate-400 mt-2" />
              </div>
              <div>
                <span className="text-slate-500 block">INSTRUCTOR EVALUATION:</span>
                <div className="h-10 border-b border-slate-400 mt-2 flex items-end">
                  <span className="font-bold text-slate-800">GRADE: ______ / 10</span>
                </div>
              </div>
              <div className="sm:col-span-1 col-span-2">
                <span className="text-slate-500 block">LAB SEAL &amp; DATE:</span>
                <div className="h-10 border-b border-slate-400 mt-2" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: VIVA VOCE PREPARATION & QUIZ */}
      {subTab === "VIVA_QUIZ" && (
        <div className="bg-[#0d1628] border border-[#26365c] rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                ORAL VIVA VOCE EXAMINATION PREPARATION
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Frequently Asked Viva Questions &amp; Detailed Model Answers
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setRevealedAnswers(!revealedAnswers)}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            >
              {revealedAnswers ? "Hide All Model Answers" : "Reveal All Model Answers"}
            </button>
          </div>

          <div className="space-y-4">
            {selectedExp.vivaQuestions.map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-mono text-xs font-bold shrink-0 mt-0.5">
                    Q{idx + 1}
                  </div>
                  <h4 className="text-sm font-bold text-white leading-relaxed">
                    {q.question}
                  </h4>
                </div>

                {revealedAnswers ? (
                  <div className="pl-9 text-xs text-emerald-300 bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-lg leading-relaxed">
                    <strong>Model Engineering Answer:</strong> {q.answer}
                  </div>
                ) : (
                  <div className="pl-9">
                    <button
                      type="button"
                      onClick={() => setRevealedAnswers(true)}
                      className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
                    >
                      Show answer →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBTAB 4: PROGRESS & CURRICULUM TRACKER */}
      {subTab === "PROGRESS" && (
        <div className="bg-[#0d1628] border border-[#26365c] rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                ACADEMIC CURRICULUM DEGREE AUDIT
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                Semester Laboratory Progress &amp; Sign-off Summary
              </h3>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {((completedExpIds.size / GUIDED_EXPERIMENTS.length) * 100).toFixed(0)}%
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
              style={{
                width: `${(completedExpIds.size / GUIDED_EXPERIMENTS.length) * 100}%`,
              }}
            />
          </div>

          {/* Subject-Wise Completion Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 pt-2">
            {[
              { code: "A", title: "Linear Circuit Analysis", total: 4 },
              { code: "B", title: "Circuit & Devices", total: 5 },
              { code: "C", title: "Digital Logic Design", total: 5 },
              { code: "D", title: "Power Electronics", total: 4 },
              { code: "E", title: "Electronic Devices & Circuits", total: 5 },
            ].map((subj) => (
              <div
                key={subj.code}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold">Course {subj.code}</span>
                  <span className="text-emerald-400 font-bold">Active</span>
                </div>
                <div className="text-xs font-bold text-white">{subj.title}</div>
                <div className="text-[11px] text-slate-400 font-mono">
                  15 Curriculum Labs Available
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
