import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Mail,
  Phone,
  Send,
  Sparkles,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  User,
  GraduationCap,
  Building2,
  Lightbulb,
  Bug,
  Cpu,
  Layers,
  Clock,
  ThumbsUp,
  FileText,
  AlertCircle,
  HelpCircle,
  ArrowRight,
} from "lucide-react";
import { ActiveTabId } from "./CurriculumGuide";
import IstEmblemIcon from "./IstEmblemIcon";
import raufAvatarDefault from "../assets/images/rauf_engineer_avatar_1793894567147.jpg";
import { getUserScopedKey } from "../utils/userStorageScope";

interface ContactUsSectionProps {
  onNavigateTab?: (tab: ActiveTabId) => void;
  defaultCategory?: string;
}

export interface FeedbackSubmission {
  id: string;
  name: string;
  institution: string;
  contactMethod: "whatsapp" | "email" | "other";
  contactDetail: string;
  category: string;
  subjectDomain: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  message: string;
  timestamp: number;
}

export default function ContactUsSection({
  onNavigateTab,
  defaultCategory = "FEATURE_IMPROVEMENT",
}: ContactUsSectionProps) {
  // Creator Info
  const engineerName = "Abdul Rauf";
  const whatsappNumber = "+923215339417";
  const rawWhatsapp = "923215339417";
  const emailAddress = "raufalvi32@gmail.com";
  const institution = "Electrical & Electronics Engineering Workbench";
  const department = "Electrical Engineering Department";

  // Form State
  const [name, setName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("ist_lab_student_profile"));
      if (saved) {
        const p = JSON.parse(saved);
        if (p.name) return p.name;
      }
    } catch {
      // ignore
    }
    return "";
  });

  const [institutionName, setInstitutionName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(getUserScopedKey("ist_lab_student_profile"));
      if (saved) {
        const p = JSON.parse(saved);
        if (p.university) return p.university;
      }
    } catch {
      // ignore
    }
    return "";
  });

  const [senderContact, setSenderContact] = useState<string>("");
  const [category, setCategory] = useState<string>(defaultCategory);
  const [subjectDomain, setSubjectDomain] = useState<string>("ALL");
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [message, setMessage] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [lastSubmissionId, setLastSubmissionId] = useState<string | null>(null);

  const [submissionsList, setSubmissionsList] = useState<FeedbackSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(
        getUserScopedKey("ist_lab_user_feedback_history")
      );
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const copyToClipboard = (text: string, fieldName: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {
      // fallback
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newSub: FeedbackSubmission = {
      id: `FB-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim() || "Anonymous Student / Researcher",
      institution: institutionName.trim() || "Independent Scholar",
      contactMethod: senderContact.includes("@") ? "email" : "whatsapp",
      contactDetail: senderContact.trim() || "Direct Portal Submission",
      category,
      subjectDomain,
      priority,
      message: message.trim(),
      timestamp: Date.now(),
    };

    const updated = [newSub, ...submissionsList];
    setSubmissionsList(updated);
    try {
      localStorage.setItem(
        getUserScopedKey("ist_lab_user_feedback_history"),
        JSON.stringify(updated.slice(0, 20))
      );
    } catch {
      // ignore
    }

    setLastSubmissionId(newSub.id);
    setIsSubmitted(true);
  };

  const resetForm = () => {
    setMessage("");
    setIsSubmitted(false);
    setLastSubmissionId(null);
  };

  // Build Pre-formatted WhatsApp Message
  const buildWhatsAppUrl = () => {
    const text = encodeURIComponent(
      `Hello Engr. Abdul Rauf,\n\nI am contacting you regarding IST Circuit & Logic Lab workbench suggestions:\n\n*Name:* ${
        name.trim() || "Student / Engineer"
      }\n*Institution:* ${
        institutionName.trim() || "Engineering University"
      }\n*Category:* ${category}\n*Module/Domain:* ${subjectDomain}\n*Priority:* ${priority}\n\n*Suggestion / Improvement Details:*\n${
        message.trim() || "(I would like to share suggestions for workbench improvements and curriculum simulations)"
      }\n\nThank you!`
    );
    return `https://wa.me/${rawWhatsapp}?text=${text}`;
  };

  // Build Pre-formatted Mailto URL
  const buildMailtoUrl = () => {
    const subject = encodeURIComponent(
      `[IST Circuit Lab Suggestion] ${category} - from ${name.trim() || "User"}`
    );
    const body = encodeURIComponent(
      `Dear Engr. Abdul Rauf,\n\nI am submitting a suggestion/improvement for the IST Circuit & Logic Lab Virtual Workbench.\n\nSender Information:\n- Name: ${
        name.trim() || "Not specified"
      }\n- Institution/University: ${
        institutionName.trim() || "Not specified"
      }\n- Category: ${category}\n- Engineering Domain: ${subjectDomain}\n- Priority: ${priority}\n\nSuggestion Details:\n${
        message.trim() || "(Enter details of suggested improvement or new simulation requirement)"
      }\n\nBest regards,\n${name.trim() || "Engineering Student / Faculty"}`
    );
    return `mailto:${emailAddress}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#0c1326] via-[#101b33] to-[#0a0f1d] border border-cyan-500/30 p-6 sm:p-10 shadow-2xl overflow-hidden">
        {/* Cyber Background Glow Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-bold tracking-wide">
              <Sparkles className="w-3.5 h-3.5" />
              DIRECT ENGINEERING COLLABORATION CHANNEL
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Contact Us for Suggestions &amp; Workbench Improvement
            </h1>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
              Have an idea for a new circuit experiment, curriculum lab manual, hardware instrument feature,
              or calculation refinement? Connect directly with Lead Engineer{" "}
              <strong className="text-cyan-300 font-semibold">{engineerName}</strong>.
              Your suggestions directly shape future software updates.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={buildWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat on WhatsApp ({whatsappNumber})</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </a>

              <a
                href={buildMailtoUrl()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-[#13203c] hover:bg-[#1a2b50] border border-cyan-500/40 text-cyan-200 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-cyan-400" />
                <span>Email ({emailAddress})</span>
              </a>
            </div>
          </div>

          {/* Engineer Profile Card */}
          <div className="w-full lg:w-auto shrink-0 bg-[#090e1a]/90 backdrop-blur-md border border-cyan-500/40 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center gap-5">
            {/* Medallion Avatar with Rotating Border */}
            <div className="relative w-24 h-24 shrink-0 [perspective:600px]">
              <div className="absolute inset-0 rounded-full border-2 border-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.5)] overflow-hidden bg-slate-900">
                <img
                  src={raufAvatarDefault}
                  alt={engineerName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center pointer-events-none"
                />
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#090e1a] shadow-[0_0_8px_#34d399]" />
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <h3 className="text-lg font-bold text-white">{engineerName}</h3>
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-xs font-mono text-cyan-300">{department}</p>
              <p className="text-xs text-slate-300 font-sans">{institution}</p>

              <div className="pt-2 flex flex-col gap-1 text-[11px] font-mono text-slate-300">
                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-emerald-400 font-bold">WhatsApp:</span>
                  <span className="text-white font-semibold">{whatsappNumber}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(whatsappNumber, "whatsapp")}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy WhatsApp number"
                  >
                    {copiedField === "whatsapp" ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 justify-center sm:justify-start">
                  <span className="text-cyan-400 font-bold">Email:</span>
                  <span className="text-white font-semibold">{emailAddress}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(emailAddress, "email")}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy Email address"
                  >
                    {copiedField === "email" ? (
                      <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Form & Channels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Suggestion Form (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-[#0b101e] border border-[#202e4c] rounded-2xl p-6 sm:p-7 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Submit Suggestions or Report Improvements
                  </h2>
                  <p className="text-xs text-slate-400 font-sans">
                    All suggestions are reviewed for integration into upcoming virtual lab manuals.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                ACTIVE INTAKE
              </span>
            </div>

            {isSubmitted ? (
              <div className="p-6 rounded-2xl bg-[#091a14] border border-emerald-500/40 text-center space-y-4 animate-in fade-in">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">
                    Thank You! Suggestion Logged Successfully
                  </h3>
                  <p className="text-xs text-emerald-300 font-mono">
                    Tracking ID: <span className="text-white font-bold">{lastSubmissionId}</span>
                  </p>
                  <p className="text-xs text-slate-300 font-sans max-w-md mx-auto pt-1">
                    Your feedback has been saved locally and is prepared for direct transmission.
                    You can also send this exact text directly to Engr. Abdul Rauf via WhatsApp or Email:
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Send Message on WhatsApp</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  <a
                    href={buildMailtoUrl()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Send via Email</span>
                  </a>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl text-xs font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    Submit Another Suggestion
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-4">
                {/* Name & Institution Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Your Name / Contributor:</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Sameer Ahmed (or Student ID)"
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                      <span>University / Institute:</span>
                    </label>
                    <input
                      type="text"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="e.g. Your University or Engineering Institute..."
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Sender Email / WhatsApp & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Your WhatsApp or Email (Optional):</span>
                    </label>
                    <input
                      type="text"
                      value={senderContact}
                      onChange={(e) => setSenderContact(e.target.value)}
                      placeholder="e.g. +92300... or student@university.edu"
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Suggestion Priority:</span>
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 outline-none transition-colors cursor-pointer"
                    >
                      <option value="LOW">Nice to Have (Creative Suggestion)</option>
                      <option value="MEDIUM">Important (Curriculum / Usability Enhancement)</option>
                      <option value="HIGH">Critical (Simulation / Calculation Correction)</option>
                    </select>
                  </div>
                </div>

                {/* Category & Subject Domain Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Feedback Category:</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 outline-none transition-colors cursor-pointer"
                    >
                      <option value="NEW_CIRCUIT_REQUEST">New Circuit or Schematic Request</option>
                      <option value="FEATURE_IMPROVEMENT">Workbench Feature Improvement</option>
                      <option value="CALCULATION_ACCURACY">SPICE Math / Solver Calculation Feedback</option>
                      <option value="LAB_MANUAL_ENHANCEMENT">75 Lab Manual Content &amp; Viva Questions</option>
                      <option value="VIRTUAL_BREADBOARD">Virtual Breadboard &amp; Instrument Probes</option>
                      <option value="BUG_REPORT">Bug Report or Unexpected Behavior</option>
                      <option value="ACADEMIC_COLLABORATION">Faculty &amp; University Syllabus Collaboration</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Applicable Engineering Domain:</span>
                    </label>
                    <select
                      value={subjectDomain}
                      onChange={(e) => setSubjectDomain(e.target.value)}
                      className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-400 outline-none transition-colors cursor-pointer"
                    >
                      <option value="ALL">All Subjects / General Workbench</option>
                      <option value="Domain A: LCA">Domain A · Linear Circuit Analysis (LCA)</option>
                      <option value="Domain B: EDC">Domain B · Electronic Devices &amp; Circuits (EDC)</option>
                      <option value="Domain C: DLD">Domain C · Digital Logic Design (DLD)</option>
                      <option value="Domain D: PEES">Domain D · Power Electronics &amp; Energy Systems</option>
                      <option value="Domain E: CD">Domain E · Circuit &amp; Devices (CD)</option>
                      <option value="VLC: Optical Wireless">Optical Wireless VLC &amp; Free-Space Transceiver</option>
                      <option value="Embedded: ESP32">Embedded &amp; ESP32 Studio</option>
                      <option value="Robotics & Automation">Robotics &amp; Automation Lab</option>
                    </select>
                  </div>
                </div>

                {/* Message Textarea */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Detailed Suggestion / Improvement Description:</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-sans">
                      Be as specific as possible
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your suggestion in detail: e.g. 'Can we add a 555-timer monostable one-shot preset to the circuit lab?' or 'I noticed in Lab B04 that the BJT collector saturation voltage equation could show Vce(sat) = 0.2V on the DMM...'"
                    required
                    className="w-full bg-[#070b14] border border-[#202e4c] rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-400 outline-none transition-colors resize-y leading-relaxed font-sans"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-400 font-sans">
                    Direct inquiries:{" "}
                    <strong className="text-slate-300">WhatsApp (+923215339417)</strong> or{" "}
                    <strong className="text-slate-300">Email (raufalvi32@gmail.com)</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={!message.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-mono font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(6,182,212,0.35)]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Suggestion</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Past Submissions History Viewer if available */}
          {submissionsList.length > 0 && (
            <div className="bg-[#0b101e] border border-[#202e4c] rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Your Logged Suggestions ({submissionsList.length})</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(
                      getUserScopedKey("ist_lab_user_feedback_history")
                    );
                    setSubmissionsList([]);
                  }}
                  className="text-[10px] font-mono text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  Clear History
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {submissionsList.slice(0, 5).map((sub) => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl bg-[#070b14] border border-[#1a253d] text-xs font-mono space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">{sub.id}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(sub.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-sans line-clamp-2">
                      {sub.message}
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/40">
                        {sub.category.replace(/_/g, " ")}
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Logged for Review</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Direct Channels, Office Hours & Verified Credentials (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Direct Communication Cards */}
          <div className="space-y-4">
            {/* WhatsApp Card */}
            <div className="bg-[#0b141d] border border-emerald-500/30 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">WhatsApp Direct Chat</h4>
                    <span className="text-[10px] font-mono text-emerald-400">
                      INSTANT MESSAGING &amp; SCREENSHOTS
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Fastest Response
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Send schematic screenshots, circuit photos, custom simulation requests, or voice notes
                directly to Lead Engineer Abdul Rauf on WhatsApp.
              </p>

              <div className="p-3 rounded-xl bg-[#061017] border border-emerald-500/20 flex items-center justify-between">
                <span className="font-mono text-sm font-bold text-emerald-300">
                  {whatsappNumber}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(whatsappNumber, "card_wa")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy number"
                  >
                    {copiedField === "card_wa" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={buildWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open Chat</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-[#0b1222] border border-cyan-500/30 rounded-2xl p-5 shadow-xl space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Official Email Inbox</h4>
                    <span className="text-[10px] font-mono text-cyan-400">
                      FORMAL PROPOSALS &amp; LAB SYLLABI
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  Verified
                </span>
              </div>

              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Ideal for university faculty, course instructors, ABET accreditation coordinators,
                and students sharing detailed PDF lab manuals or experiment suggestions.
              </p>

              <div className="p-3 rounded-xl bg-[#060c18] border border-cyan-500/20 flex items-center justify-between">
                <span className="font-mono text-xs sm:text-sm font-bold text-cyan-200 truncate mr-2">
                  {emailAddress}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyToClipboard(emailAddress, "card_email")}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                    title="Copy email address"
                  >
                    {copiedField === "card_email" ? (
                      <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={buildMailtoUrl()}
                    className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-cyan-400 hover:bg-cyan-300 text-slate-950 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Send Mail</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Academic Affiliation & Creator Accreditation */}
          <div className="bg-[#0b101e] border border-[#202e4c] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <IstEmblemIcon size="md" glow />
              <div>
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white">
                  <GraduationCap className="w-4 h-4 text-cyan-400" />
                  <span>Accredited Engineering Workbench</span>
                </div>
                <div className="text-[11px] font-mono text-cyan-300 mt-0.5">
                  Electrical &amp; Electronics Engineering Curriculum
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-300 font-sans leading-relaxed">
              <p>
                Designed for university electrical, electronics, embedded systems, and logic
                design courses with real-time SPICE simulation and interactive instrumentation.
              </p>
              <p className="text-slate-400">
                This comprehensive virtual laboratory workbench covers all 5 core undergraduate electrical
                and electronics engineering domains across 75 structured lab manuals aligned with HEC,
                ABET, and IEEE guidelines.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-[#1a253d]">
                <div className="text-cyan-400 font-bold">Standards</div>
                <div className="text-slate-200 mt-0.5">HEC · ABET · IEEE</div>
              </div>
              <div className="p-2.5 rounded-lg bg-[#070b14] border border-[#1a253d]">
                <div className="text-emerald-400 font-bold">Curriculum</div>
                <div className="text-slate-200 mt-0.5">75 Lab Manuals</div>
              </div>
            </div>
          </div>

          {/* Recently Incorporated Suggestions Showcase */}
          <div className="bg-[#0b101e] border border-[#202e4c] rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ThumbsUp className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-mono font-bold text-white">
                  Recently Implemented Community Suggestions
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400">v4.2 Live</span>
            </div>

            <div className="space-y-2.5 text-xs font-sans">
              {[
                {
                  title: "Visual Short-Circuit & Floating Node Pulsing Glow",
                  desc: "Wires on direct short-circuit or floating paths now illuminate with high-intensity pulsing red or amber glow with instant fault markers.",
                  source: "Suggested by EE Lab Instructors",
                },
                {
                  title: "Double-Click Breadboard Component Settings Drawer",
                  desc: "Single-click now strictly moves/positions parts on the breadboard without opening popups, while double-click views settings.",
                  source: "Suggested by Undergraduate Students",
                },
                {
                  title: "Full Power Source & Ground Loops for All Interactive Projects",
                  desc: "NE555, LM741, Buck Converter, and BJT amplifier circuits upgraded with explicit voltage sources, common ground rails, and animated current flow.",
                  source: "Suggested by Multisim SPICE Evaluators",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#070b14] border border-[#1a253d] space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-xs">{item.title}</span>
                    <span className="text-[9.5px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/30">
                      Completed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                    {item.desc}
                  </p>
                  <div className="text-[10px] font-mono text-slate-500 pt-0.5">
                    {item.source}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
