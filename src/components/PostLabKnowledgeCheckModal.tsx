import React, { useState, useEffect, useMemo } from "react";
import {
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  X,
  ArrowRight,
  BookCheck,
  AlertTriangle,
} from "lucide-react";
import { type PostLabQuizContext } from "../data/postLabQuizzes";
import { type KnowledgeCheckRecord } from "../utils/workspaceStore";

interface PostLabKnowledgeCheckModalProps {
  quiz: PostLabQuizContext;
  previousRecord?: KnowledgeCheckRecord;
  onRecordResult: (result: {
    score: number;
    totalQuestions: number;
    passed: boolean;
  }) => void;
  onClose: () => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

export default function PostLabKnowledgeCheckModal({
  quiz,
  previousRecord,
  onRecordResult,
  onClose,
}: PostLabKnowledgeCheckModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, number | undefined>
  >({});
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Reset local answers if lab quiz changes
  useEffect(() => {
    setSelectedAnswers({});
    setSubmitted(false);
  }, [quiz.labId]);

  // Escape key dismissal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const answeredCount = useMemo(
    () =>
      quiz.questions.filter((q) => typeof selectedAnswers[q.id] === "number")
        .length,
    [quiz.questions, selectedAnswers]
  );

  const allAnswered = answeredCount === quiz.questions.length;

  const grading = useMemo(() => {
    let score = 0;
    for (const q of quiz.questions) {
      if (selectedAnswers[q.id] === q.correctIndex) {
        score += 1;
      }
    }
    const total = quiz.questions.length;
    const passed = score >= 2;
    const percent = Math.round((score / total) * 100);
    return { score, total, passed, percent };
  }, [quiz.questions, selectedAnswers]);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    if (submitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAnswered || submitted) return;
    setSubmitted(true);
    onRecordResult({
      score: grading.score,
      totalQuestions: grading.total,
      passed: grading.passed,
    });
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setSubmitted(false);
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-[#0B1220]/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-lab-quiz-title"
    >
      <div className="relative w-full max-w-2xl my-auto bg-[#162338] border border-[#24344D] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-[#24344D] bg-[#111B2B] flex items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#35BDF2]">
              <BookCheck className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Post-Lab Knowledge Check</span>
              <span className="text-[#9BAAC0]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#9BAAC0] truncate">{quiz.labId}</span>
              <span className="text-[#9BAAC0]" aria-hidden="true">
                ·
              </span>
              <span className="text-[#9BAAC0] truncate">{quiz.domain}</span>
            </div>

            <h2
              id="post-lab-quiz-title"
              className="font-display text-lg sm:text-xl font-bold text-[#F1F5FA] tracking-tight"
            >
              {quiz.labTitle}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#9BAAC0] tabular-nums">
              <span>
                3 multiple-choice questions to reinforce lab concepts and record score in your profile.
              </span>
              {previousRecord && !submitted && (
                <span className="font-mono text-[#48C99A]">
                  Prior best: {previousRecord.score}/{previousRecord.totalQuestions} (
                  {previousRecord.attempts} attempt{previousRecord.attempts === 1 ? "" : "s"})
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Post-Lab Knowledge Check"
            className="p-2 rounded-lg bg-[#162338] hover:bg-[#1C2B40] text-[#9BAAC0] hover:text-[#F1F5FA] border border-[#24344D] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Submission Result Summary Banner */}
        {submitted && (
          <div
            className={`px-6 py-4 border-b border-[#24344D] flex flex-wrap items-center justify-between gap-3 ${
              grading.passed ? "bg-emerald-950/35" : "bg-amber-950/35"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                  grading.passed
                    ? "bg-[#48C99A]/15 border-[#48C99A]/40 text-[#48C99A]"
                    : "bg-[#F1B65B]/15 border-[#F1B65B]/40 text-[#F1B65B]"
                }`}
              >
                {grading.passed ? (
                  <Award className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#F1F5FA]">
                  <span>
                    {grading.passed ? "Knowledge Check Passed" : "Review Recommended"}
                  </span>
                  <span className="text-[#9BAAC0]" aria-hidden="true">
                    ·
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      grading.passed ? "text-[#48C99A]" : "text-[#F1B65B]"
                    }`}
                  >
                    {grading.score} / {grading.total} ({grading.percent}%)
                  </span>
                </div>
                <div className="text-xs text-[#9BAAC0]">
                  Score saved to your student profile and learning progress record.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Questions Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
          {quiz.questions.map((q, qIdx) => {
            const chosenIdx = selectedAnswers[q.id];
            const isCorrect = submitted && chosenIdx === q.correctIndex;
            const isWrong = submitted && chosenIdx !== q.correctIndex;

            return (
              <div
                key={q.id}
                className="bg-[#111B2B] border border-[#24344D] rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="font-mono text-xs font-bold text-[#35BDF2] mt-0.5 shrink-0 tabular-nums">
                      Q{qIdx + 1}.
                    </span>
                    <p className="text-sm font-semibold text-[#F1F5FA] leading-snug">
                      {q.question}
                    </p>
                  </div>

                  {submitted && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-mono font-semibold shrink-0 ${
                        isCorrect ? "text-[#48C99A]" : "text-[#F07474]"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Incorrect</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosenIdx === optIdx;
                    const isCorrectOption = q.correctIndex === optIdx;

                    let cardCls =
                      "bg-[#0B1220]/70 border-[#24344D] text-[#F1F5FA] hover:border-[#35BDF2]/60 hover:bg-[#162338]";
                    if (!submitted && isSelected) {
                      cardCls =
                        "bg-[#35BDF2]/15 border-[#35BDF2] text-[#F1F5FA]";
                    } else if (submitted && isCorrectOption) {
                      cardCls =
                        "bg-[#48C99A]/15 border-[#48C99A]/70 text-[#F1F5FA]";
                    } else if (submitted && isSelected && !isCorrectOption) {
                      cardCls =
                        "bg-[#F07474]/15 border-[#F07474]/70 text-[#F1F5FA]";
                    } else if (submitted) {
                      cardCls =
                        "bg-[#0B1220]/50 border-[#24344D] text-[#9BAAC0]";
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        aria-pressed={isSelected}
                        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-lg border text-left text-xs sm:text-sm transition-colors flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35BDF2] ${
                          submitted ? "cursor-default" : "cursor-pointer"
                        } ${cardCls}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-md border font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                            submitted && isCorrectOption
                              ? "border-[#48C99A] bg-[#48C99A] text-[#0B1220]"
                              : submitted && isSelected && !isCorrectOption
                                ? "border-[#F07474] bg-[#F07474] text-[#0B1220]"
                                : isSelected
                                  ? "border-[#35BDF2] bg-[#35BDF2] text-[#0B1220]"
                                  : "border-[#24344D] bg-[#162338] text-[#9BAAC0]"
                          }`}
                        >
                          {OPTION_LETTERS[optIdx]}
                        </span>
                        <span className="flex-1 leading-snug">{opt}</span>
                        {submitted && isCorrectOption && (
                          <CheckCircle2 className="w-4 h-4 text-[#48C99A] shrink-0" />
                        )}
                        {submitted && isSelected && !isCorrectOption && (
                          <XCircle className="w-4 h-4 text-[#F07474] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div
                    className={`rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${
                      isWrong
                        ? "bg-[#162338] border-[#24344D] text-[#9BAAC0]"
                        : "bg-[#162338] border-[#24344D] text-[#9BAAC0]"
                    }`}
                  >
                    <span className="font-mono font-semibold text-[#35BDF2] mr-1.5">
                      Explanation:
                    </span>
                    <span className="text-[#F1F5FA]/90">{q.explanation}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Footer Controls */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#24344D]">
            <div className="text-xs font-mono text-[#9BAAC0] tabular-nums">
              {submitted
                ? `Final Result: ${grading.score}/${grading.total} · ${grading.passed ? "Passed" : "Needs Review"}`
                : `${answeredCount} of ${quiz.questions.length} answered`}
            </div>

            <div className="flex items-center gap-2.5">
              {!submitted ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs font-medium text-[#9BAAC0] hover:text-[#F1F5FA] transition-colors cursor-pointer"
                  >
                    Skip for Now
                  </button>
                  <button
                    type="submit"
                    disabled={!allAnswered}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#35BDF2] hover:bg-[#52C8F5] disabled:bg-[#24344D] disabled:text-[#9BAAC0] text-xs font-semibold text-[#0B1220] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    <span>Submit &amp; Record Score</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#111B2B] hover:bg-[#1C2B40] border border-[#24344D] text-xs font-medium text-[#F1F5FA] transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#35BDF2]" />
                    <span>Retake Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#48C99A] hover:bg-[#5ED4A8] text-xs font-semibold text-[#0B1220] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done &amp; Continue</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
