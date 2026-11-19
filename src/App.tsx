import React, { useState, useMemo, useEffect, useRef } from "react";
import { MotionConfig, AnimatePresence, motion } from "motion/react";
import { onAuthStateChanged, type User } from "firebase/auth";
import AcademicProfileGate, { StudentProfile } from "./components/AcademicProfileGate";
import AuthSignInGate, { PENDING_LOGIN_CONSENT_KEY } from "./components/AuthSignInGate";
import AdminLoginGate from "./components/AdminLoginGate";
import AdminDashboardView from "./components/AdminDashboardView";
import PostLabKnowledgeCheckModal from "./components/PostLabKnowledgeCheckModal";
import HomeHub from "./components/HomeHub";
import LabSlideDeckModal from "./components/LabSlideDeckModal";
import CircuitLab from "./components/CircuitLab";
import FundamentalSimulators from "./components/FundamentalSimulators";
import GateLibrary from "./components/GateLibrary";
import KMapSolver from "./components/KMapSolver";
import NumberSystemsLab from "./components/NumberSystemsLab";
import SequentialFSMLab from "./components/SequentialFSMLab";
import MSIAndPLALab from "./components/MSIAndPLALab";
import RLCAnalyzer, { RLCInitialConfig } from "./components/RLCAnalyzer";
import LinearCircuitLab from "./components/LinearCircuitLab";
import PowerElectronicsLab from "./components/PowerElectronicsLab";
import CircuitAndDevicesLab from "./components/CircuitAndDevicesLab";
import ElectronicDevicesLab from "./components/ElectronicDevicesLab";
import VerificationChecklist from "./components/VerificationChecklist";
import DigitalLogicGlossary from "./components/DigitalLogicGlossary";
import CurriculumGuide, { ActiveTabId } from "./components/CurriculumGuide";
import MasterLabWorkbench from "./components/MasterLabWorkbench";
import SeriesParallelBuilder from "./components/SeriesParallelBuilder";
import LearningResourcesCenter from "./components/LearningResourcesCenter";
import EngineerLogoBadge from "./components/EngineerLogoBadge";
import RealisticComponentLibraryBrowser from "./components/RealisticComponentLibraryBrowser";
import RealisticComponentModal from "./components/RealisticComponentModal";
import StudentLearningSystem from "./components/StudentLearningSystem";
import VirtualBreadboard from "./components/VirtualBreadboard";
import LabInstrumentsRack from "./components/LabInstrumentsRack";
import OpticalWirelessLab from "./components/OpticalWirelessLab";
import AdvancedEmbeddedLab from "./components/AdvancedEmbeddedLab";
import WirelessCommunicationLab from "./components/WirelessCommunicationLab";
import RoboticsAutomationLab from "./components/RoboticsAutomationLab";
import BenchmarkCircuitsModal from "./components/BenchmarkCircuitsModal";
import InteractiveCircuitSystem from "./components/InteractiveCircuitSystem";
import ContactUsSection from "./components/ContactUsSection";
import WorkspaceSidebar from "./components/WorkspaceSidebar";
import WorkstationTopBar from "./components/WorkstationTopBar";
import WorkspaceCollectionsView from "./components/WorkspaceCollectionsView";
import Esp32LearningLab from "./components/Esp32LearningLab";
import FocusedInstrumentView from "./components/FocusedInstrumentView";
import CircuitCalculator from "./components/CircuitCalculator";
import {
  SUBJECT_SIMULATIONS_MAP,
  SubjectSimulationLink,
} from "./components/SubjectLeftSidebar";
import {
  MASTER_DOMAINS,
  MASTER_75_LABS,
  MasterDomainId,
  MasterLabItem,
} from "./data/master75Labs";
import {
  type PostLabQuizContext,
  getPostLabQuizByMasterId,
  getPostLabQuizByEsp32Id,
  buildQuizContextForGuidedExperiment,
} from "./data/postLabQuizzes";
import { PresetNodeDef, PresetWireDef } from "./data/logicSpecs";
import {
  DEFAULT_WORKSPACE_STATE,
  WorkspaceState,
  loadWorkspaceState,
  persistWorkspaceState,
  appendRecentWork,
  appendSimulationActivity,
  clearSimulationActivity,
  setEsp32LessonProgress,
  setManualCompletionState,
  recordKnowledgeCheckResult,
  addSavedProjectBookmark,
  removeSavedProjectBookmark,
} from "./utils/workspaceStore";
import {
  DEFAULT_WORKSTATION_SETTINGS,
  WorkstationSettings,
  loadWorkstationSettings,
  saveWorkstationSettings,
} from "./utils/workstationSettings";
import {
  CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY,
  CIRCUITLAB_AUTOSAVE_KEY,
  CIRCUITLAB_SNAPSHOTS_KEY,
  getAutoSavedCircuit,
  getSessionVersionSnapshots,
} from "./utils/circuitAutoSave";
import {
  BUILDER_PROJECTS_STORAGE_KEY,
  UNIFIED_PROJECTS_STORAGE_KEY,
} from "./utils/circuitProjectStore";
import {
  getCircuitPresetForLab,
  getInteractiveProjectIdForLab,
  getBuilderPresetNameForLab,
  getCircuitPresetForBenchmark,
} from "./utils/labCircuitPresets";
import {
  auth,
  checkIsAdminUser,
  deleteCloudProject,
  fetchAllCloudProjects,
  fetchCloudWorkspaceState,
  loadOrCreateUserProfileDoc,
  recordConsentedLoginLog,
  revokeConsentedAdminRecords,
  saveCloudWorkspaceState,
  signInWithGooglePopup,
  signOutFirebaseUser,
  syncStudentProgressToCloud,
  upsertCloudProject,
  type CloudProjectKind,
  type CloudUserProfileDoc,
} from "./firebase";
import {
  getUserScopedKey,
  purgeLegacySharedStorageKeys,
  registerCloudProjectHooks,
  setActiveStorageUser,
} from "./utils/userStorageScope";
import {
  getStoredAdminToken,
  logoutAdminSession,
  verifyExistingAdminSession,
} from "./utils/adminAuthClient";
import {
  Activity,
  Cpu,
  BookOpen,
  Sliders,
  PanelLeftOpen,
  MessageSquare,
} from "lucide-react";

class WorkbenchErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(err: unknown) {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : "Unexpected workspace error",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-[#0B1220] text-[#F1F5FA] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#162338] border border-rose-500/40 rounded-2xl p-6 space-y-4">
            <div className="text-sm font-mono font-bold text-rose-300">
              WORKBENCH RECOVERY
            </div>
            <p className="text-xs text-[#9BAAC0] break-words">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#35BDF2] text-[#0B1220] text-xs font-semibold cursor-pointer"
            >
              Reload Workbench
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const TOP_NAV_ITEMS: { id: ActiveTabId; label: string; navKey: string }[] = [
  { id: "home", label: "Engineering Workbench", navKey: "ws-dashboard" },
  { id: "esp32-lab", label: "ESP32 Lab", navKey: "lab-esp32" },
  { id: "lab", label: "Circuit Designer", navKey: "tool-designer" },
  { id: "multisim", label: "SPICE", navKey: "tool-spice" },
  { id: "vlc", label: "VLC Lab", navKey: "lab-comm" },
  { id: "master-75", label: "75 Manuals", navKey: "learn-manuals" },
  { id: "components", label: "Components", navKey: "tool-comp" },
  { id: "circuit-calculator", label: "Calculator", navKey: "tool-calc" },
  { id: "contact", label: "Contact", navKey: "footer-contact" },
];

const TAB_LABELS: Record<ActiveTabId, { title: string; category: string }> = {
  home: { title: "Engineering Workbench", category: "Dashboard" },
  "my-projects": { title: "My Experiments", category: "My Projects" },
  "recent-work": { title: "Recent Projects", category: "My Projects" },
  "saved-circuits": { title: "Saved Circuits", category: "My Projects" },
  "esp32-lab": { title: "ESP32 Lab", category: "Hardware Labs" },
  lab: { title: "Circuit Designer", category: "Design & Simulate" },
  multisim: { title: "SPICE Simulation", category: "Design & Simulate" },
  "tool-oscilloscope": { title: "Oscilloscope", category: "Instruments" },
  "tool-logic-analyzer": { title: "Logic Analyzer", category: "Instruments" },
  "tool-signal-generator": { title: "Signal Generator", category: "Instruments" },
  "tool-multimeter": { title: "Digital Multimeter", category: "Instruments" },
  "circuit-calculator": { title: "Circuit Calculator", category: "Instruments" },
  components: { title: "Component Library", category: "Design & Simulate" },
  breadboard: { title: "3D Virtual Breadboard", category: "Hardware Labs" },
  instruments: { title: "Measurement Tools", category: "Instruments" },
  "master-75": { title: "Laboratory Manuals", category: "Learning Center" },
  "student-learning": { title: "Practical Experiments", category: "Learning Center" },
  resources: { title: "Project Guides", category: "Learning Center" },
  guide: { title: "Tutorials", category: "Learning Center" },
  vlc: { title: "VLC Communication", category: "Hardware Labs" },
  "embedded-lab": { title: "IoT Projects", category: "Hardware Labs" },
  "wireless-lab": { title: "Wireless Communication", category: "Hardware Labs" },
  "robotics-lab": { title: "Robotics", category: "Hardware Labs" },
  schematics: { title: "Circuit Examples", category: "Design & Simulate" },
  "logic-suite": { title: "Digital Electronics", category: "Hardware Labs" },
  lca: { title: "Analog Electronics", category: "Hardware Labs" },
  rlc: { title: "AC & Bode Analysis", category: "Design & Simulate" },
  power: { title: "Power Electronics", category: "Hardware Labs" },
  cd: { title: "Circuit & Devices", category: "Hardware Labs" },
  edc: { title: "Electronic Devices", category: "Hardware Labs" },
  gates: { title: "Logic Gate Library", category: "Hardware Labs" },
  kmap: { title: "Karnaugh Map Solver", category: "Hardware Labs" },
  numbers: { title: "Number Systems Lab", category: "Hardware Labs" },
  sequential: { title: "Sequential & FSM Studio", category: "Hardware Labs" },
  msi: { title: "MSI & PLA Studio", category: "Hardware Labs" },
  simulators: { title: "Engineering Lessons", category: "Learning Center" },
  checklist: { title: "Verification Checklist", category: "Learning Center" },
  glossary: { title: "Engineering Glossary", category: "Learning Center" },
  contact: { title: "Contact & Suggestions", category: "Support" },
  "admin-dashboard": { title: "Admin & Student Telemetry", category: "Dashboard" },
};

const SUBJECT_BAR_EXCLUDED_TABS = new Set<ActiveTabId>([
  "home",
  "admin-dashboard",
  "lab",
  "esp32-lab",
  "my-projects",
  "recent-work",
  "saved-circuits",
  "tool-oscilloscope",
  "tool-logic-analyzer",
  "tool-signal-generator",
  "tool-multimeter",
  "circuit-calculator",
  "components",
  "instruments",
  "breadboard",
  "contact",
  "vlc",
  "wireless-lab",
  "robotics-lab",
]);

function inferDomainFromTab(tab: ActiveTabId): MasterDomainId | null {
  switch (tab) {
    case "lca":
    case "rlc":
      return "A";
    case "cd":
      return "E";
    case "edc":
    case "vlc":
    case "embedded-lab":
    case "wireless-lab":
    case "robotics-lab":
    case "schematics":
      return "B";
    case "logic-suite":
    case "lab":
    case "gates":
    case "kmap":
    case "numbers":
    case "sequential":
    case "msi":
    case "simulators":
      return "C";
    case "power":
      return "D";
    default:
      return null;
  }
}

function InnerWorkbenchApp() {
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudHydratedUid, setCloudHydratedUid] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(null);
  const [adminSessionChecked, setAdminSessionChecked] = useState<boolean>(false);
  const [cloudProfileDoc, setCloudProfileDoc] = useState<CloudUserProfileDoc | null>(null);
  const [requireConsentPrompt, setRequireConsentPrompt] = useState<boolean>(false);

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [workstationSettings, setWorkstationSettings] = useState<WorkstationSettings>(
    DEFAULT_WORKSTATION_SETTINGS
  );
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>(
    DEFAULT_WORKSPACE_STATE
  );
  const [activeQuizContext, setActiveQuizContext] =
    useState<PostLabQuizContext | null>(null);
  const [completedExperiments, setCompletedExperiments] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTabId>("home");
  const [activeNavKey, setActiveNavKey] = useState<string>("ws-dashboard");
  const [esp32LessonId, setEsp32LessonId] = useState<number>(1);
  const [activeDomain, setActiveDomain] = useState<MasterDomainId | null>("C");
  const [selectedLabId, setSelectedLabId] = useState<string>("A01");
  const [resourceDomainFilter, setResourceDomainFilter] = useState<
    MasterDomainId | "ALL"
  >("ALL");
  const [initialPairCode] = useState<string | null>(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("pair") || "";
      const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
      return /^[A-Z0-9]{6}$/.test(cleaned) ? cleaned : null;
    } catch {
      return null;
    }
  });

  const pairingUserProp = useMemo(
    () =>
      authUser && authUser.emailVerified
        ? {
            uid: authUser.uid,
            displayName:
              studentProfile?.name ||
              authUser.displayName ||
              authUser.email?.split("@")[0] ||
              "Student",
            email: authUser.email || undefined,
          }
        : null,
    [authUser, studentProfile?.name]
  );

  const cloudSyncTimerRef = useRef<number | null>(null);
  const loginLoggedUidRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void verifyExistingAdminSession()
      .then((token) => {
        if (!active) return;
        setAdminSessionToken(token);
        if (token) {
          setActiveTab("admin-dashboard");
          setActiveNavKey("ws-admin");
        }
      })
      .finally(() => {
        if (active) setAdminSessionChecked(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Strict per-user auth & cloud workspace lifecycle
  useEffect(() => {
    purgeLegacySharedStorageKeys();
    const unsub = onAuthStateChanged(auth, async (user) => {
      // Cancel any pending debounce from previous user
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
        cloudSyncTimerRef.current = null;
      }

      if (!user) {
        setActiveStorageUser(null);
        registerCloudProjectHooks(null, null);
        setAuthUser(null);
        setCloudHydratedUid(null);
        setIsAdminUser(false);
        setCloudProfileDoc(null);
        setRequireConsentPrompt(false);
        loginLoggedUidRef.current = null;
        setStudentProfile(null);
        setWorkspaceState(DEFAULT_WORKSPACE_STATE);
        setWorkstationSettings(DEFAULT_WORKSTATION_SETTINGS);
        setCompletedExperiments([]);
        if (getStoredAdminToken()) {
          setActiveTab("admin-dashboard");
          setActiveNavKey("ws-admin");
        } else {
          setActiveTab("home");
          setActiveNavKey("ws-dashboard");
        }
        setEsp32LessonId(1);
        setSelectedLabId("A01");
        setSynthesizedCircuit(null);
        setActiveQuizContext(null);
        setAuthReady(true);
        return;
      }

      // Immediately isolate storage & reset in-memory session so zero prior-user state leaks
      setActiveStorageUser(user.uid);
      setAuthUser(user);
      setAuthError(null);
      setCloudHydratedUid(null);
      setIsAdminUser(false);
      setCloudProfileDoc(null);
      setRequireConsentPrompt(false);
      loginLoggedUidRef.current = null;
      const hasActiveAdminToken = Boolean(getStoredAdminToken());
      if (!hasActiveAdminToken) {
        if (initialPairCode) {
          setActiveTab("lab");
          setActiveNavKey("tool-designer");
        } else {
          setActiveTab("home");
          setActiveNavKey("ws-dashboard");
        }
      } else {
        setActiveTab("admin-dashboard");
        setActiveNavKey("ws-admin");
      }
      setSelectedLabId("A01");
      setSynthesizedCircuit(null);
      setActiveQuizContext(null);
      setIsFullWindowCanvas(false);
      setIsSlideDeckOpen(false);
      setLabSyncSeq((s) => s + 1);

      let pendingConsent: boolean | undefined;
      try {
        const rawPending = window.sessionStorage.getItem(PENDING_LOGIN_CONSENT_KEY);
        if (rawPending === "true") pendingConsent = true;
        else if (rawPending === "false") pendingConsent = false;
        window.sessionStorage.removeItem(PENDING_LOGIN_CONSENT_KEY);
      } catch {
        // ignore storage errors
      }

      // Register Firestore sync bridge strictly bound to THIS user's UID
      registerCloudProjectHooks(
        (kind, id, payload) => {
          void upsertCloudProject(user.uid, {
            projectId: id,
            kind: kind as CloudProjectKind,
            name: String(payload.name || "Untitled Circuit"),
            labMode: typeof payload.labMode === "string" ? payload.labMode : undefined,
            topology: typeof payload.topology === "string" ? payload.topology : undefined,
            circuitData: (payload.circuitData || {}) as Record<string, unknown>,
            componentCount: Number(payload.componentCount || 0),
            wireCount: Number(payload.wireCount || 0),
          }).catch((err) => console.error("Cloud project upsert failed:", err));
        },
        (id) => {
          void deleteCloudProject(user.uid, id).catch((err) =>
            console.error("Cloud project delete failed:", err)
          );
        }
      );

      try {
        // 1. Ensure user document exists, check admin role, & hydrate profile
        const [profileDoc, adminRole] = await Promise.all([
          loadOrCreateUserProfileDoc(user, {
            bumpLogin: true,
            ...(typeof pendingConsent === "boolean"
              ? { consentGiven: pendingConsent }
              : {}),
          }),
          checkIsAdminUser(user),
        ]);

        if (auth.currentUser?.uid !== user.uid) return;

        setIsAdminUser(adminRole);
        setCloudProfileDoc(profileDoc);

        const resolvedProfile: StudentProfile = {
          name: profileDoc.displayName,
          university: profileDoc.university,
          department: profileDoc.department,
          studentId: profileDoc.studentId,
          semester: profileDoc.semester,
          email: profileDoc.email,
          consentGiven: profileDoc.consentGiven,
        };
        setStudentProfile(resolvedProfile);
        try {
          localStorage.setItem(
            getUserScopedKey("ist_lab_student_profile"),
            JSON.stringify(resolvedProfile)
          );
        } catch {
          // ignore
        }

        if (profileDoc.consentGiven === true) {
          loginLoggedUidRef.current = user.uid;
          void recordConsentedLoginLog(user, profileDoc).catch((err) =>
            console.error("Consented login audit write failed:", err)
          );
        } else if (profileDoc.consentGiven === undefined) {
          setRequireConsentPrompt(true);
          setIsProfileModalOpen(true);
        }

        // 2. Fetch ONLY this user's cloud workspace state & projects
        const [cloudWorkspace, cloudProjects] = await Promise.all([
          fetchCloudWorkspaceState(user.uid),
          fetchAllCloudProjects(user.uid),
        ]);

        if (auth.currentUser?.uid !== user.uid) return;

        if (cloudWorkspace) {
          persistWorkspaceState(cloudWorkspace.workspaceState);
          saveWorkstationSettings(cloudWorkspace.settings);
          setWorkspaceState(cloudWorkspace.workspaceState);
          setWorkstationSettings(cloudWorkspace.settings);
          setCompletedExperiments(cloudWorkspace.completedExperiments);
          setEsp32LessonId(cloudWorkspace.workspaceState.lastEsp32LessonId || 1);
          try {
            localStorage.setItem(
              getUserScopedKey("ist_lab_completed_experiments"),
              JSON.stringify(cloudWorkspace.completedExperiments)
            );
          } catch {
            // ignore
          }
        } else {
          // Returning user without cloud workspace doc yet OR brand-new user -> check scoped local or clean zero
          const scopedWs = loadWorkspaceState();
          const scopedSettings = loadWorkstationSettings();
          setWorkspaceState(scopedWs);
          setWorkstationSettings(scopedSettings);
          setEsp32LessonId(scopedWs.lastEsp32LessonId || 1);
          setCompletedExperiments([]);
        }

        // Hydrate per-user saved circuits / snapshots / builder records into user-scoped localStorage
        if (cloudProjects.length > 0) {
          const unifiedMap: Record<string, unknown> = {};
          const builderMap: Record<string, unknown> = {};
          const snapshots: unknown[] = [];
          const autoSaveByProject: Record<string, unknown> = {};
          let latestAutoSave: { timestamp?: number } | null = null;

          for (const rec of cloudProjects) {
            if (rec.kind === "unified_schematic" && rec.circuitData) {
              const cid = String(rec.circuitData.projectId || rec.projectId);
              unifiedMap[cid] = rec.circuitData;
            } else if (rec.kind === "builder_circuit" && rec.circuitData) {
              const bid = String(rec.circuitData.projectId || rec.projectId);
              builderMap[bid] = rec.circuitData;
            } else if (rec.kind === "designer_snapshot" && rec.circuitData) {
              snapshots.push(rec.circuitData);
            } else if (rec.kind === "autosave_slot" && rec.circuitData) {
              const pid = String(rec.circuitData.projectId || rec.name || "default");
              autoSaveByProject[pid] = rec.circuitData;
              const ts = Number((rec.circuitData as { timestamp?: number }).timestamp || 0);
              if (!latestAutoSave || ts > (latestAutoSave.timestamp || 0)) {
                latestAutoSave = rec.circuitData as { timestamp?: number };
              }
            }
          }

          try {
            if (Object.keys(unifiedMap).length > 0) {
              localStorage.setItem(
                getUserScopedKey(UNIFIED_PROJECTS_STORAGE_KEY),
                JSON.stringify(unifiedMap)
              );
            }
            if (Object.keys(builderMap).length > 0) {
              localStorage.setItem(
                getUserScopedKey(BUILDER_PROJECTS_STORAGE_KEY),
                JSON.stringify(builderMap)
              );
            }
            if (snapshots.length > 0) {
              snapshots.sort(
                (a, b) =>
                  Number((b as { timestamp?: number }).timestamp || 0) -
                  Number((a as { timestamp?: number }).timestamp || 0)
              );
              localStorage.setItem(
                getUserScopedKey(CIRCUITLAB_SNAPSHOTS_KEY),
                JSON.stringify(snapshots.slice(0, 20))
              );
            }
            if (Object.keys(autoSaveByProject).length > 0) {
              localStorage.setItem(
                getUserScopedKey(CIRCUITLAB_AUTOSAVE_BY_PROJECT_KEY),
                JSON.stringify(autoSaveByProject)
              );
              if (latestAutoSave) {
                localStorage.setItem(
                  getUserScopedKey(CIRCUITLAB_AUTOSAVE_KEY),
                  JSON.stringify(latestAutoSave)
                );
              }
            }
          } catch {
            // ignore storage errors
          }
        }

        setCloudHydratedUid(user.uid);
      } catch (err) {
        console.error("Failed to initialize user cloud workspace:", err);
        setAuthError(
          err instanceof Error
            ? err.message
            : "Could not load your private cloud workspace."
        );
      } finally {
        setAuthReady(true);
      }
    });

    return () => {
      unsub();
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, []);

  // Debounced sync of workspaceState + settings + completedExperiments + consented student_progress to Firestore
  useEffect(() => {
    if (!authUser || cloudHydratedUid !== authUser.uid) return;
    if (cloudSyncTimerRef.current) {
      window.clearTimeout(cloudSyncTimerRef.current);
    }
    cloudSyncTimerRef.current = window.setTimeout(() => {
      void saveCloudWorkspaceState(
        authUser.uid,
        workspaceState,
        workstationSettings,
        completedExperiments
      ).catch((err) => console.error("Cloud workspace sync error:", err));

      if (cloudProfileDoc?.consentGiven === true) {
        const totalSaved =
          (getAutoSavedCircuit() ? 1 : 0) +
          getSessionVersionSnapshots().length +
          workspaceState.savedProjects.length;
        void syncStudentProgressToCloud(
          authUser,
          cloudProfileDoc,
          workspaceState,
          totalSaved,
          completedExperiments.length
        ).catch((err) => console.error("Student progress cloud sync error:", err));
      }
    }, 800);
    return () => {
      if (cloudSyncTimerRef.current) {
        window.clearTimeout(cloudSyncTimerRef.current);
      }
    };
  }, [
    authUser,
    cloudHydratedUid,
    cloudProfileDoc,
    workspaceState,
    workstationSettings,
    completedExperiments,
  ]);

  // Desktop left sidebar open by default for 6-category accordion navigation, easily collapsible
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const [dldSubTab, setDldSubTab] = useState<
    "SIMULATOR" | "GATES" | "MASTER_15_DLD" | "GUIDE"
  >("SIMULATOR");
  const [multisimMode, setMultisimMode] = useState<
    "ANALOG_SPICE" | "DIGITAL_SPICE"
  >("ANALOG_SPICE");
  const [synthesizedCircuit, setSynthesizedCircuit] = useState<{
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  } | null>(null);

  // Dedicated Full-Window Canvas Studio & 6-Slide Presentation Page states
  const [slideDeckLabId, setSlideDeckLabId] = useState<string | null>(null);
  const [isSlideDeckOpen, setIsSlideDeckOpen] = useState<boolean>(false);
  const [isFullWindowCanvas, setIsFullWindowCanvas] = useState<boolean>(false);
  const [inspectingComponentId, setInspectingComponentId] = useState<string | null>(null);
  const [isBenchmarkModalOpen, setIsBenchmarkModalOpen] = useState<boolean>(false);

  // Per-lab & per-benchmark synchronized presets across Analog, Breadboard, and Schematic views
  const [labSyncSeq, setLabSyncSeq] = useState<number>(1);
  const [interactiveProjectId, setInteractiveProjectId] = useState<string>("ne555_astable_timer");
  const [builderScenarioName, setBuilderScenarioName] = useState<string | undefined>(undefined);
  const [breadboardPresetName, setBreadboardPresetName] = useState<string | undefined>(undefined);
  const [rlcInitialConfig, setRlcInitialConfig] = useState<RLCInitialConfig | undefined>(undefined);
  const [lcaInitialState, setLcaInitialState] = useState<{
    tab?: "SERIES_PARALLEL_BUILDER" | "NODAL_MESH" | "THEVENIN_MPT" | "TRANSIENT_SUPERPOSITION";
    scenario?: string;
    transientType?: "RC" | "RL";
  }>({});
  const [powerInitialState, setPowerInitialState] = useState<{
    tab?: "CUSTOM_BUILDER" | "DCDC_CONVERTERS" | "SCR_RECTIFIER" | "SPWM_INVERTER";
    scenario?: string;
    topology?: "BUCK" | "BOOST" | "BUCK_BOOST";
    rectType?: "HALF_WAVE" | "FULL_BRIDGE";
  }>({});
  const [cdInitialState, setCdInitialState] = useState<{
    tab?: "CUSTOM_BUILDER" | "DIODE_IV_LOADLINE" | "CLIPPER_CLAMPER" | "ZENER_REGULATOR";
    scenario?: string;
  }>({});
  const [edcInitialState, setEdcInitialState] = useState<{
    tab?: "CUSTOM_BUILDER" | "BJT_CE_AMP" | "MOSFET_CS_AMP" | "OPAMP_LAB";
    scenario?: string;
    opMode?: "INVERTING" | "NON_INVERTING" | "DIFFERENTIAL";
  }>({});

  const handleUpdateWorkstationSettings = (patch: Partial<WorkstationSettings>) => {
    setWorkstationSettings((prev) => {
      const next = { ...prev, ...patch };
      saveWorkstationSettings(next);
      return next;
    });
  };

  const handleOpenSlideDeck = (labId: string, domain?: MasterDomainId) => {
    if (domain) setActiveDomain(domain);
    setSelectedLabId(labId);
    setSlideDeckLabId(labId);
    setIsSlideDeckOpen(true);
  };

  const handleOpenFullWindowCanvas = (circuit?: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => {
    if (circuit) {
      setSynthesizedCircuit(circuit);
    }
    setActiveDomain("C");
    setActiveTab("logic-suite");
    setActiveNavKey("lab-digital");
    setDldSubTab("SIMULATOR");
    setIsFullWindowCanvas(true);
    setIsSlideDeckOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLoadCircuitIntoLab = (circuit: {
    title: string;
    nodes: PresetNodeDef[];
    wires: PresetWireDef[];
  }) => {
    setSynthesizedCircuit(circuit);
    setActiveDomain("C");
    setActiveTab("lab");
    setActiveNavKey("tool-designer");
    setWorkspaceState((prev) =>
      appendSimulationActivity(
        appendRecentWork(prev, {
          id: `circuit-${circuit.title}`,
          title: circuit.title,
          subtitle: `${circuit.nodes.length} components · ${circuit.wires.length} nets`,
          category: "Schematic",
          tab: "lab",
        }),
        {
          action: "Loaded Circuit",
          target: circuit.title,
          status: "INFO",
          tab: "lab",
        }
      )
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navigateTo = (
    tab: ActiveTabId,
    subContext?: { esp32LessonId?: number; navKey?: string }
  ) => {
    setActiveTab(tab);
    if (subContext?.navKey) {
      setActiveNavKey(subContext.navKey);
    } else {
      const topMatch = TOP_NAV_ITEMS.find((i) => i.id === tab);
      setActiveNavKey(topMatch ? topMatch.navKey : "");
    }

    if (subContext?.esp32LessonId) {
      setEsp32LessonId(subContext.esp32LessonId);
      setWorkspaceState((prev) =>
        setEsp32LessonProgress(prev, subContext.esp32LessonId!)
      );
    }

    const inferred = inferDomainFromTab(tab);
    if (inferred) {
      setActiveDomain(inferred);
    }

    if (tab !== "home") {
      const meta = TAB_LABELS[tab] || { title: tab, category: "Lab" };
      setWorkspaceState((prev) =>
        appendRecentWork(prev, {
          id: `tab-${tab}${subContext?.esp32LessonId ? `-esp-${subContext.esp32LessonId}` : ""}`,
          title:
            tab === "esp32-lab" && subContext?.esp32LessonId
              ? `ESP32 Lesson ${subContext.esp32LessonId}`
              : meta.title,
          subtitle: meta.category,
          category: meta.category,
          tab,
        })
      );
    }

    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectSubjectOverview = (domain: MasterDomainId) => {
    setActiveDomain(domain);
    const firstLab = MASTER_75_LABS.find((l) => l.domain === domain);
    if (firstLab) {
      setSelectedLabId(firstLab.id);
    }
    const defaultSim = SUBJECT_SIMULATIONS_MAP[domain][0];
    if (defaultSim) {
      setActiveTab(defaultSim.tab);
      if (defaultSim.dldSubTab) setDldSubTab(defaultSim.dldSubTab);
      if (defaultSim.multisimMode) setMultisimMode(defaultSim.multisimMode);
    } else {
      setActiveTab("master-75");
    }
    setActiveNavKey("");
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSidebarSelectNav = (
    tab: ActiveTabId,
    navKey: string,
    domain?: MasterDomainId,
    subMode?: "TRANSIENT" | "AC" | "BODE"
  ) => {
    if (domain) {
      setActiveDomain(domain);
      const firstLab = MASTER_75_LABS.find((l) => l.domain === domain);
      if (firstLab) setSelectedLabId(firstLab.id);
      setActiveTab("master-75");
      setActiveNavKey(navKey);
      setMobileSidebarOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigateTo(tab, { navKey });
    if (subMode === "TRANSIENT") {
      setLcaInitialState({
        tab: "TRANSIENT_SUPERPOSITION",
        scenario: builderScenarioName,
        transientType: "RC",
      });
      setLabSyncSeq((s) => s + 1);
    } else if (subMode === "AC") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (subMode === "BODE") {
      window.setTimeout(() => {
        document
          .getElementById("d3-bode-plot-section")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 150);
    }
  };

  const handleSelectSimulation = (
    domain: MasterDomainId,
    sim: SubjectSimulationLink
  ) => {
    setActiveDomain(domain);
    setActiveTab(sim.tab);
    setActiveNavKey("");
    if (sim.dldSubTab) {
      setDldSubTab(sim.dldSubTab);
    }
    if (sim.multisimMode) {
      setMultisimMode(sim.multisimMode);
    }
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectLabFromSidebar = (lab: MasterLabItem) => {
    setActiveDomain(lab.domain);
    setSelectedLabId(lab.id);
    setActiveTab("master-75");
    setActiveNavKey("learn-manuals");
    setMobileSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyLabContextToDestination = (labId: string, targetTab: ActiveTabId) => {
    setSelectedLabId(labId);
    const nextSeq = labSyncSeq + 1;
    setLabSyncSeq(nextSeq);
    const scenario = getBuilderPresetNameForLab(labId);
    setBuilderScenarioName(scenario);

    if (targetTab === "schematics") {
      setInteractiveProjectId(getInteractiveProjectIdForLab(labId));
    } else if (targetTab === "rlc") {
      const upper = labId.toUpperCase();
      if (upper === "A05") {
        setRlcInitialConfig({ circuit: "RC", config: "series", outputTap: "C", vin: 10, rVal: 1000, cVal: 1, cUnit: "uF", fVal: 159.15, loadKey: nextSeq });
      } else if (upper === "A06") {
        setRlcInitialConfig({ circuit: "RL", config: "series", outputTap: "R", vin: 10, rVal: 220, lVal: 47, lUnit: "mH", fVal: 745, loadKey: nextSeq });
      } else if (upper === "A08") {
        setRlcInitialConfig({ circuit: "RLC", config: "parallel", outputTap: "C", vin: 12, rVal: 1000, lVal: 10, lUnit: "mH", cVal: 0.1, cUnit: "uF", fVal: 5033, loadKey: nextSeq });
      } else {
        setRlcInitialConfig({ circuit: "RLC", config: "series", outputTap: "C", vin: 10, rVal: 100, lVal: 10, lUnit: "mH", cVal: 1, cUnit: "uF", fVal: 1592, loadKey: nextSeq });
      }
    } else if (targetTab === "lca") {
      if (labId === "A05") {
        setLcaInitialState({ tab: "TRANSIENT_SUPERPOSITION", scenario, transientType: "RC" });
      } else if (labId === "A06") {
        setLcaInitialState({ tab: "TRANSIENT_SUPERPOSITION", scenario, transientType: "RL" });
      } else if (labId === "A09" || labId === "A10") {
        setLcaInitialState({ tab: "THEVENIN_MPT", scenario });
      } else if (labId === "A11" || labId === "A12") {
        setLcaInitialState({ tab: "NODAL_MESH", scenario });
      } else {
        setLcaInitialState({ tab: "SERIES_PARALLEL_BUILDER", scenario });
      }
    } else if (targetTab === "power") {
      if (labId === "D01" || labId === "D02" || labId === "D03") {
        setPowerInitialState({ tab: "SCR_RECTIFIER", scenario, rectType: labId === "D01" ? "HALF_WAVE" : "FULL_BRIDGE" });
      } else if (labId === "D04" || labId === "D05" || labId === "D06") {
        setPowerInitialState({
          tab: "DCDC_CONVERTERS",
          scenario,
          topology: labId === "D05" ? "BOOST" : labId === "D06" ? "BUCK_BOOST" : "BUCK",
        });
      } else if (labId === "D07" || labId === "D08" || labId === "D09") {
        setPowerInitialState({ tab: "SPWM_INVERTER", scenario });
      } else {
        setPowerInitialState({ tab: "CUSTOM_BUILDER", scenario });
      }
    } else if (targetTab === "cd") {
      if (labId === "E01" || labId === "E02") {
        setCdInitialState({ tab: "DIODE_IV_LOADLINE", scenario });
      } else if (labId === "E03") {
        setCdInitialState({ tab: "ZENER_REGULATOR", scenario });
      } else if (labId === "E04") {
        setCdInitialState({ tab: "CLIPPER_CLAMPER", scenario });
      } else {
        setCdInitialState({ tab: "CUSTOM_BUILDER", scenario });
      }
    } else if (targetTab === "edc") {
      if (labId.startsWith("B")) {
        setEdcInitialState({
          tab: "OPAMP_LAB",
          scenario,
          opMode: labId === "B02" ? "NON_INVERTING" : labId === "B04" ? "DIFFERENTIAL" : "INVERTING",
        });
      } else if (labId === "E10" || labId === "E11" || labId === "E12") {
        setEdcInitialState({ tab: "MOSFET_CS_AMP", scenario });
      } else if (labId === "E05" || labId === "E06" || labId === "E07" || labId === "E08" || labId === "E09") {
        setEdcInitialState({ tab: "BJT_CE_AMP", scenario });
      } else {
        setEdcInitialState({ tab: "CUSTOM_BUILDER", scenario });
      }
    } else if (targetTab === "lab" || targetTab === "logic-suite") {
      const preset = getCircuitPresetForLab(labId);
      setSynthesizedCircuit(preset);
    }
  };

  const handleOpenLabInWorkbench = (labId: string, domain: MasterDomainId) => {
    setActiveDomain(domain);
    setSelectedLabId(labId);
    const preset = getCircuitPresetForLab(labId);
    setSynthesizedCircuit(preset);
    setInteractiveProjectId(getInteractiveProjectIdForLab(labId));
    setBuilderScenarioName(getBuilderPresetNameForLab(labId));
    setLabSyncSeq((s) => s + 1);
    navigateTo("lab", { navKey: "tool-designer" });
  };

  const handleRestoreAutoSave = () => {
    const autoSaved = getAutoSavedCircuit();
    if (autoSaved) {
      setSynthesizedCircuit({
        title: autoSaved.title || "Auto-Saved Schematic",
        nodes: autoSaved.nodes as PresetNodeDef[],
        wires: autoSaved.wires as PresetWireDef[],
      });
      setWorkspaceState((prev) =>
        appendSimulationActivity(prev, {
          action: "Restored Auto-Save",
          target: autoSaved.title || "Schematic Draft",
          status: "INFO",
          tab: "lab",
        })
      );
    }
    navigateTo("lab", { navKey: "tool-designer" });
  };

  const handleSelectResourceTab = (
    tab: ActiveTabId,
    domain: MasterDomainId | "ALL" = "ALL"
  ) => {
    if (domain !== "ALL") {
      setActiveDomain(domain);
    }
    setResourceDomainFilter(domain);
    navigateTo(tab);
  };

  const currentDomainInfo = useMemo(
    () => (activeDomain ? MASTER_DOMAINS[activeDomain] : null),
    [activeDomain]
  );

  const currentDomainLabs = useMemo(() => {
    if (!activeDomain) return MASTER_75_LABS;
    return MASTER_75_LABS.filter((l) => l.domain === activeDomain);
  }, [activeDomain]);

  const savedCircuitsCount = useMemo(() => {
    const autoCount = getAutoSavedCircuit() ? 1 : 0;
    const snapCount = getSessionVersionSnapshots().length;
    return autoCount + snapCount + workspaceState.savedProjects.length;
  }, [workspaceState.savedProjects.length]);

  const esp32CompletedCount = useMemo(
    () => Object.values(workspaceState.completedEsp32Lessons).filter(Boolean).length,
    [workspaceState.completedEsp32Lessons]
  );

  const manualsCompletedCount = useMemo(
    () => Object.values(workspaceState.completedManuals).filter(Boolean).length,
    [workspaceState.completedManuals]
  );

  const showSubjectContextBar =
    Boolean(currentDomainInfo) && !SUBJECT_BAR_EXCLUDED_TABS.has(activeTab);

  const currentTabMeta = TAB_LABELS[activeTab] || {
    title: activeTab,
    category: "Workbench",
  };

  const isBackendAdmin = Boolean(adminSessionToken);
  const effectiveIsAdmin = isAdminUser || isBackendAdmin;

  const handleSignOut = async () => {
    try {
      await logoutAdminSession();
      setAdminSessionToken(null);
      if (auth.currentUser) {
        await signOutFirebaseUser();
      }
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      await logoutAdminSession();
      setAdminSessionToken(null);
      if (auth.currentUser) {
        await signOutFirebaseUser();
      }
      await signInWithGooglePopup();
    } catch (err) {
      console.error("Account switch error:", err);
    }
  };

  if (!authReady || !adminSessionChecked) {
    return (
      <div className="min-h-screen w-full bg-[#0B1220] text-[#F1F5FA] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 rounded-full border-2 border-[#35BDF2] border-t-transparent animate-spin mx-auto" />
          <div className="text-xs font-mono text-[#9BAAC0]">
            Initializing Private Engineering Workspace...
          </div>
        </div>
      </div>
    );
  }

  if (!authUser && !isBackendAdmin) {
    return (
      <AuthSignInGate
        authError={authError}
        onAdminAuthenticated={(token) => {
          setAdminSessionToken(token);
          setActiveTab("admin-dashboard");
          setActiveNavKey("ws-admin");
        }}
      />
    );
  }

  return (
    <MotionConfig
      reducedMotion={workstationSettings.forceReducedMotion ? "always" : "user"}
    >
      <div
        key={authUser?.uid || "admin-session"}
        className="min-h-screen w-full max-w-full overflow-x-clip flex flex-col bg-[#0B1220] text-[#F1F5FA]"
      >
        <WorkstationTopBar
          activeTab={activeTab}
          pageTitle={currentTabMeta.title}
          categoryTitle={currentTabMeta.category}
          sidebarCollapsed={sidebarCollapsed}
          mobileSidebarOpen={mobileSidebarOpen}
          onToggleDesktopSidebar={() => setSidebarCollapsed((v) => !v)}
          onToggleMobileSidebar={() => setMobileSidebarOpen((v) => !v)}
          onNavigateTab={navigateTo}
          onOpenLab={handleOpenLabInWorkbench}
          onOpenComponentModal={(compId) => setInspectingComponentId(compId)}
          studentProfile={studentProfile}
          onOpenProfileModal={() => setIsProfileModalOpen(true)}
          authUserEmail={authUser?.email || (isBackendAdmin ? "Administrator" : null)}
          authUserName={authUser?.displayName || (isBackendAdmin ? "Administrator" : null)}
          onSwitchAccount={() => void handleSwitchAccount()}
          onSignOut={() => void handleSignOut()}
          workspaceState={workspaceState}
          onClearNotifications={() =>
            setWorkspaceState((prev) => clearSimulationActivity(prev))
          }
          settings={workstationSettings}
          onUpdateSettings={handleUpdateWorkstationSettings}
          isAdmin={effectiveIsAdmin}
        />

      {/* Main Workspace Shell: 6-Category Accordion Sidebar + Active Engineering Viewport */}
      <div className="flex-1 flex relative">
        {!sidebarCollapsed ? (
          <div className="hidden lg:block shrink-0 sticky top-14 h-[calc(100vh-56px)]">
            <WorkspaceSidebar
              activeTab={activeTab}
              activeNavKey={activeNavKey}
              activeDomain={activeDomain}
              onSelectNav={handleSidebarSelectNav}
              onOpenBenchmarks={() => setIsBenchmarkModalOpen(true)}
              onCloseSidebar={() => setSidebarCollapsed(true)}
              esp32CompletedCount={esp32CompletedCount}
              manualsCompletedCount={manualsCompletedCount}
              savedCircuitsCount={savedCircuitsCount}
              isAdmin={effectiveIsAdmin}
            />
          </div>
        ) : (
          <div className="hidden lg:flex fixed left-3 bottom-4 z-40">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(false)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#162338] hover:bg-[#1C2B40] text-[#35BDF2] hover:text-[#F1F5FA] border border-[#24344D] shadow-xl text-xs font-mono font-semibold transition-colors cursor-pointer"
              title="Open Navigation Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4 text-[#35BDF2]" />
              <span>Menu</span>
            </button>
          </div>
        )}

        {/* Mobile Slide-Over WorkspaceSidebar Drawer */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 bg-black/70"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "spring", stiffness: 360, damping: 34 }}
                className="relative z-10 h-full overflow-y-auto bg-[#111B2B] shadow-2xl"
              >
                <WorkspaceSidebar
                  activeTab={activeTab}
                  activeNavKey={activeNavKey}
                  activeDomain={activeDomain}
                  onSelectNav={handleSidebarSelectNav}
                  onOpenBenchmarks={() => {
                    setMobileSidebarOpen(false);
                    setIsBenchmarkModalOpen(true);
                  }}
                  onCloseSidebar={() => setMobileSidebarOpen(false)}
                  isMobile={true}
                  esp32CompletedCount={esp32CompletedCount}
                  manualsCompletedCount={manualsCompletedCount}
                  savedCircuitsCount={savedCircuitsCount}
                  isAdmin={effectiveIsAdmin}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Right Active Viewport */}
        <main
          className={`flex-1 min-w-0 py-5 w-full ${
            activeTab === "lab" || activeTab === "logic-suite" || activeTab === "multisim"
              ? "px-2 sm:px-4 max-w-none"
              : "px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto space-y-6"
          }`}
        >
          {/* Unified Subject Context & Mode Bar (Subject pages only) */}
          {showSubjectContextBar && currentDomainInfo && (
            <div className="bg-[#162338] border border-[#24344D] rounded-xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
                    <span className="font-bold">
                      SUBJECT {currentDomainInfo.id} WORKSPACE
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-300">
                      {currentDomainInfo.title}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {currentDomainInfo.subtitle}
                  </p>
                </div>

                {/* 3-Pillar Mode Switcher for Current Subject */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0B1220] p-1 rounded-xl border border-[#24344D]">
                  <button
                    type="button"
                    onClick={() => {
                      const firstSim =
                        SUBJECT_SIMULATIONS_MAP[currentDomainInfo.id][0];
                      if (firstSim)
                        handleSelectSimulation(currentDomainInfo.id, firstSim);
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab !== "master-75" && activeTab !== "resources"
                        ? "bg-cyan-400 text-slate-950 font-bold"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    Subject Simulators (
                    {SUBJECT_SIMULATIONS_MAP[currentDomainInfo.id].length})
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const firstInDom =
                        MASTER_75_LABS.find(
                          (l) =>
                            l.id === selectedLabId &&
                            l.domain === currentDomainInfo.id
                        ) ??
                        MASTER_75_LABS.find(
                          (l) => l.domain === currentDomainInfo.id
                        );
                      if (firstInDom) setSelectedLabId(firstInDom.id);
                      navigateTo("master-75", { navKey: "learn-manuals" });
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "master-75"
                        ? "bg-emerald-400 text-slate-950 font-bold"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    15 Subject Labs ({currentDomainInfo.id}01–
                    {currentDomainInfo.id}15)
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleSelectResourceTab("resources", currentDomainInfo.id)
                    }
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      activeTab === "resources"
                        ? "bg-purple-400 text-slate-950 font-bold"
                        : "text-slate-300 hover:text-white"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    Subject Learning Resources
                  </button>
                </div>
              </div>

              {/* Quick Simulation Ribbon + Subject 15-Lab Slider */}
              <div className="pt-2.5 border-t border-slate-800/80 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-slate-400 mr-1">
                    Simulators:
                  </span>
                  {SUBJECT_SIMULATIONS_MAP[currentDomainInfo.id].map((sim) => {
                    const isCurrent = activeTab === sim.tab;
                    return (
                      <button
                        key={sim.id}
                        type="button"
                        onClick={() =>
                          handleSelectSimulation(currentDomainInfo.id, sim)
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          isCurrent
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 font-semibold"
                            : "bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800"
                        }`}
                      >
                        {sim.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2.5 bg-[#0B1220] border border-[#24344D] rounded-xl px-3 py-1.5 shrink-0">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
                    Lab Slider ({currentDomainInfo.id}01–{currentDomainInfo.id}
                    15):
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={15}
                    step={1}
                    value={
                      currentDomainLabs.find((l) => l.id === selectedLabId)
                        ?.labNumber ?? 1
                    }
                    onChange={(e) => {
                      const num = parseInt(e.target.value, 10);
                      const target = currentDomainLabs.find(
                        (l) => l.labNumber === num
                      );
                      if (target) {
                        handleSelectLabFromSidebar(target);
                      }
                    }}
                    className="w-28 sm:w-36 accent-emerald-400 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const target =
                        currentDomainLabs.find((l) => l.id === selectedLabId) ??
                        currentDomainLabs[0];
                      if (target) handleSelectLabFromSidebar(target);
                    }}
                    className="text-xs font-mono font-bold text-emerald-300 hover:underline whitespace-nowrap cursor-pointer tabular-nums"
                  >
                    {currentDomainLabs.find((l) => l.id === selectedLabId)
                      ?.id ?? `${currentDomainInfo.id}01`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Section Title Header when not on Home, Simulator Workbench, or custom self-headed labs */}
          {activeTab !== "home" && activeTab !== "lab" && activeTab !== "vlc" && (
            <div className="space-y-1 pb-3 border-b border-[#24344D]">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-cyan-400">
                <span>IST Circuit &amp; Logic Lab</span>
                <span aria-hidden="true">·</span>
                <span className="text-slate-400">
                  Department of Electrical Engineering · Virtual Lab Workbench
                </span>
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold text-white tracking-tight"
                style={{ textWrap: "balance" }}
              >
                {activeTab === "esp32-lab" &&
                  "Interactive 3D ESP32 Learning Lab — 20 Guided Hardware & Firmware Experiments"}
                {activeTab === "my-projects" &&
                  "Workspace · My Engineering Projects & Flagship Modules"}
                {activeTab === "recent-work" &&
                  "Workspace · Recent Laboratories, Experiments & Simulation Activity"}
                {activeTab === "saved-circuits" &&
                  "Workspace · Saved Schematic Circuits, Snapshots & Bookmarks"}
                {activeTab === "tool-oscilloscope" &&
                  "Engineering Instrument · Dual-Trace Digital Oscilloscope (Quick Auto-Scale)"}
                {activeTab === "tool-logic-analyzer" &&
                  "Engineering Instrument · Multi-Channel Logic Analyzer & Protocol Decoder"}
                {activeTab === "tool-signal-generator" &&
                  "Engineering Instrument · Precision Function & Arbitrary Signal Generator"}
                {activeTab === "tool-multimeter" &&
                  "Engineering Instrument · Virtual True-RMS Digital Multimeter (XMM1)"}
                {activeTab === "circuit-calculator" &&
                  "Engineering Toolkit · Interactive Electronics & Analog Circuit Calculators"}
                {activeTab === "multisim" &&
                  "NI Multisim Compatible Free Real-Time SPICE & Virtual Instruments Workbench"}
                {activeTab === "master-75" &&
                  "Master Electronics Engineering Lab Workbench — 75 Labs Across All 5 Core Subjects"}
                {activeTab === "logic-suite" &&
                  "Digital Logic Design Lab — Gate Library, Schematic Simulator & 15 DLD Master Labs"}
                {activeTab === "rlc" &&
                  "RLC Circuit Analyzer — Series & Parallel Impedance, Filters & Bode Plots"}
                {activeTab === "lca" &&
                  "Linear Circuit Analysis (LCA) Lab — Nodal, Mesh, Superposition, Thevenin & Transients"}
                {activeTab === "power" &&
                  "Power Electronics Lab — DC-DC Switching Converters, SCR Rectifiers & SPWM Inverters"}
                {activeTab === "cd" &&
                  "Circuit & Devices (CD) Lab — PN Diode Shockley Load-Line, Clippers, Clampers & Zener Regulators"}
                {activeTab === "edc" &&
                  "Electronic Devices & Circuits (EDC) Lab — BJT CE Amplifiers, MOSFET Stages & 741 Op-Amps"}
                {activeTab === "simulators" &&
                  "Fundamental Circuit Simulators & Implementation Architecture"}
                {activeTab === "gates" &&
                  "Primitive Logic Gate Library, Universal Gates & CMOS Networks"}
                {activeTab === "kmap" &&
                  "Karnaugh Map (K-Map) Solver, Quine-McCluskey & Boolean Algebra"}
                {activeTab === "numbers" &&
                  "Number Systems, 2's Complement Arithmetic, Gray Code & Hamming(7,4)"}
                {activeTab === "sequential" &&
                  "Sequential Logic, Flip-Flop Conversions & Mealy/Moore FSM Studio"}
                {activeTab === "msi" &&
                  "Programmable Logic Array (PLA), 4-Bit ALU & Static Timing Analysis"}
                {activeTab === "checklist" &&
                  "Digital Logic Design Verification, Timing, Power & DFT Checklist"}
                {activeTab === "glossary" &&
                  "Comprehensive Digital Logic Design Engineering Glossary"}
                {activeTab === "guide" &&
                  "Complete Digital Logic Design Syllabus & Engineering Reference"}
                {activeTab === "breadboard" &&
                  "Interactive Solderless Breadboard Studio — 830 Tie-Points, Real Topology & SPICE Solver"}
                {activeTab === "instruments" &&
                  "Virtual Laboratory Equipment & Calibration Suite — 26 Real Bench Instruments"}
                {activeTab === "components" &&
                  "14-Category Electronic Component Library & 3D Interactive Datasheets"}
                {activeTab === "student-learning" &&
                  "Guided Practical Laboratory Experiments, Viva Voce & Formal University Lab Reports"}
                {activeTab === "resources" &&
                  "Comprehensive Electronics Engineering Learning Resources, Formulas & Viva Q&A"}
                {activeTab === "schematics" &&
                  "Interactive Student & Course Projects — Synchronized IEEE 315, Hardware & Simulation"}
                {activeTab === "embedded-lab" &&
                  "Embedded Systems & ESP32 / STM32 / Arduino Multi-MCU Studio"}
                {activeTab === "wireless-lab" &&
                  "IoT & Wireless Communication Systems Lab — LoRa SX1278, Wi-Fi, BLE & RF Link Budget"}
                {activeTab === "robotics-lab" &&
                  "Robotics & Mechatronics Automation Lab — Ultrasonic Radar, Servos & Smart Car Arena"}
                {activeTab === "contact" &&
                  "Contact & Suggestions — Direct Feedback to Abdul Rauf"}
                {activeTab === "admin-dashboard" &&
                  "Administrator Dashboard · Consented User Logs & Student Circuit Telemetry"}
              </h1>
            </div>
          )}

          {/* Active Page Viewport */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16, ease: "easeOut" }}
            className={
              activeTab === "lab" || activeTab === "logic-suite" || activeTab === "multisim"
                ? "w-full"
                : "space-y-6"
            }
          >
              {activeTab === "home" && (
            <HomeHub
              studentProfile={studentProfile}
              onNavigateTab={(tab, subContext) => navigateTo(tab, subContext)}
              onSelectSubject={handleSelectSubjectOverview}
              onOpenLab={handleOpenLabInWorkbench}
              onOpenComponentModal={(compId) => setInspectingComponentId(compId)}
              onOpenBenchmarkModal={() => setIsBenchmarkModalOpen(true)}
              workspaceState={workspaceState}
              onRestoreAutoSave={handleRestoreAutoSave}
            />
          )}

          {activeTab === "admin-dashboard" &&
            (!isBackendAdmin ? (
              <div className="py-6">
                <AdminLoginGate
                  title="Administrator Verification Required"
                  subtitle="Enter your administrator username and password to unlock the Instructor & Admin Telemetry Console. No Google login is required."
                  onAuthenticated={(token) => setAdminSessionToken(token)}
                />
              </div>
            ) : (
              <AdminDashboardView
                isBackendAdmin={isBackendAdmin}
                adminSessionToken={adminSessionToken}
                canSyncFirestoreLegacy={isAdminUser}
                onAdminAuthenticated={(token) => setAdminSessionToken(token)}
                currentUserEmail={
                  authUser?.email || (isBackendAdmin ? "Administrator" : null)
                }
              />
            ))}

          {(activeTab === "my-projects" ||
            activeTab === "recent-work" ||
            activeTab === "saved-circuits") && (
            <WorkspaceCollectionsView
              mode={activeTab}
              workspaceState={workspaceState}
              onNavigateTab={(tab) => navigateTo(tab)}
              onRestoreCircuitToLab={handleLoadCircuitIntoLab}
              onOpenUnifiedProject={(projectId) => {
                setInteractiveProjectId(projectId);
                navigateTo("schematics");
              }}
              onOpenBuilderProject={(scenarioName) => {
                setBuilderScenarioName(scenarioName);
                setLabSyncSeq((s) => s + 1);
                navigateTo("lca");
              }}
              onAddBookmark={(bm) =>
                setWorkspaceState((prev) => addSavedProjectBookmark(prev, bm))
              }
              onRemoveBookmark={(id) =>
                setWorkspaceState((prev) => removeSavedProjectBookmark(prev, id))
              }
            />
          )}

          {activeTab === "esp32-lab" && (
            <Esp32LearningLab
              initialLessonId={esp32LessonId}
              completedLessons={workspaceState.completedEsp32Lessons}
              onSelectLesson={(lessonId) => {
                setEsp32LessonId(lessonId);
                setWorkspaceState((prev) => setEsp32LessonProgress(prev, lessonId));
              }}
              onToggleLessonComplete={(lessonId, completed) => {
                setWorkspaceState((prev) =>
                  setEsp32LessonProgress(prev, lessonId, completed)
                );
                if (completed) {
                  const quiz = getPostLabQuizByEsp32Id(lessonId);
                  if (quiz) setActiveQuizContext(quiz);
                }
              }}
              knowledgeChecks={workspaceState.knowledgeChecks}
              onOpenKnowledgeCheck={(lessonId) => {
                const quiz = getPostLabQuizByEsp32Id(lessonId);
                if (quiz) setActiveQuizContext(quiz);
              }}
              onLogSimulationActivity={(action, target, status = "PASS") => {
                setWorkspaceState((prev) =>
                  appendSimulationActivity(prev, {
                    action,
                    target,
                    status,
                    tab: "esp32-lab",
                  })
                );
              }}
            />
          )}

          {(activeTab === "tool-oscilloscope" ||
            activeTab === "tool-logic-analyzer" ||
            activeTab === "tool-signal-generator" ||
            activeTab === "tool-multimeter") && (
            <FocusedInstrumentView
              instrument={activeTab}
              telemetryDecimals={workstationSettings.telemetryDecimals}
              onNavigateTab={(tab) => navigateTo(tab)}
            />
          )}

          {activeTab === "circuit-calculator" && <CircuitCalculator />}

          {activeTab === "logic-suite" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111B2B] border border-[#24344D] rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    {
                      id: "SIMULATOR" as const,
                      label:
                        "01. Interactive Circuit Simulator & Oscilloscope (Drag & Drop)",
                    },
                    {
                      id: "GATES" as const,
                      label:
                        "02. Gate & MSI Chip Library (Search, Pinouts & CMOS)",
                    },
                    {
                      id: "MASTER_15_DLD" as const,
                      label:
                        "03. Domain C: All 15 DLD Master Labs (Gates, Counters, FSM, FPGA)",
                    },
                    {
                      id: "GUIDE" as const,
                      label: "04. Complete DLD Syllabus & Engineering Guide",
                    },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setDldSubTab(sub.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        dldSubTab === sub.id
                          ? "bg-cyan-400 text-slate-950 font-bold"
                          : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
                <span className="text-xs font-mono text-cyan-400 px-2">
                  Digital Logic Design Suite
                </span>
              </div>

              {dldSubTab === "SIMULATOR" && (
                <CircuitLab
                  externalCircuit={synthesizedCircuit}
                  onClearExternalCircuit={() => setSynthesizedCircuit(null)}
                  isFullWindowStudio={isFullWindowCanvas}
                  onToggleFullWindowStudio={() =>
                    setIsFullWindowCanvas((v) => !v)
                  }
                  activeDomain={activeDomain}
                  currentLabId={selectedLabId}
                  preferredGridPitch={workstationSettings.gridPitch}
                  autoSaveEnabled={workstationSettings.autoSaveEnabled}
                  telemetryDecimals={workstationSettings.telemetryDecimals}
                  pairingUser={pairingUserProp}
                  initialPairCode={initialPairCode}
                  onLogSimulationActivity={(action, target, status = "INFO") =>
                    setWorkspaceState((prev) =>
                      appendSimulationActivity(prev, {
                        action,
                        target,
                        status,
                        tab: "logic-suite",
                      })
                    )
                  }
                />
              )}

              {dldSubTab === "GATES" && <GateLibrary />}

              {dldSubTab === "MASTER_15_DLD" && (
                <MasterLabWorkbench
                  fixedDomain="C"
                  externalLabId={selectedLabId}
                  onSelectLab={(id) => setSelectedLabId(id)}
                  onLaunchInteractiveBuilder={(labId) => {
                    const targetId = labId || selectedLabId;
                    setSynthesizedCircuit(getCircuitPresetForLab(targetId));
                    setDldSubTab("SIMULATOR");
                  }}
                  onOpenSchematicProject={(projectId) => {
                    setInteractiveProjectId(projectId);
                    navigateTo("schematics");
                  }}
                  onOpenSlideDeck={handleOpenSlideDeck}
                  onOpenFullCanvas={handleOpenFullWindowCanvas}
                  completedLabsExternal={workspaceState.completedManuals}
                  onToggleLabCompleteExternal={(labId, completed) => {
                    setWorkspaceState((prev) =>
                      setManualCompletionState(prev, labId, completed)
                    );
                    if (completed) {
                      const quiz = getPostLabQuizByMasterId(labId);
                      if (quiz) setActiveQuizContext(quiz);
                    }
                  }}
                  knowledgeChecks={workspaceState.knowledgeChecks}
                  onOpenKnowledgeCheck={(labId) => {
                    const quiz = getPostLabQuizByMasterId(labId);
                    if (quiz) setActiveQuizContext(quiz);
                  }}
                />
              )}

              {dldSubTab === "GUIDE" && (
                <CurriculumGuide onNavigateTab={navigateTo} />
              )}
            </div>
          )}

          {activeTab === "multisim" && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#111B2B] border border-[#24344D] rounded-xl p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMultisimMode("ANALOG_SPICE")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      multisimMode === "ANALOG_SPICE"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                    }`}
                  >
                    01. Analog &amp; Power SPICE Workbench (MNA + XMM1 / XFG1 /
                    XSC1 / XBP1 / XWM1 + .CIR Netlist)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMultisimMode("DIGITAL_SPICE")}
                    className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                      multisimMode === "DIGITAL_SPICE"
                        ? "bg-cyan-400 text-slate-950"
                        : "bg-slate-900 text-slate-300 hover:text-white border border-slate-800"
                    }`}
                  >
                    02. Digital Mixed-Signal &amp; Hierarchical Sub-Circuit
                    Workbench (4-Ch DSO + MSI + ALU)
                  </button>
                </div>
                <span className="text-xs font-mono text-[#48C99A] font-bold px-2">
                  Real-Time Browser SPICE Engine · Modified Nodal Analysis (MNA)
                </span>
              </div>

              {multisimMode === "ANALOG_SPICE" ? (
                <SeriesParallelBuilder
                  labMode="lca"
                  initialScenarioName={builderScenarioName}
                  scenarioSyncKey={labSyncSeq}
                  preferredGridPitch={workstationSettings.gridPitch}
                  telemetryDecimals={workstationSettings.telemetryDecimals}
                  onLogSimulationActivity={(action, target, status = "INFO") =>
                    setWorkspaceState((prev) =>
                      appendSimulationActivity(prev, {
                        action,
                        target,
                        status,
                        tab: "multisim",
                      })
                    )
                  }
                />
              ) : (
                <CircuitLab
                  externalCircuit={synthesizedCircuit}
                  onClearExternalCircuit={() => setSynthesizedCircuit(null)}
                  activeDomain={activeDomain}
                  currentLabId={selectedLabId}
                  preferredGridPitch={workstationSettings.gridPitch}
                  autoSaveEnabled={workstationSettings.autoSaveEnabled}
                  telemetryDecimals={workstationSettings.telemetryDecimals}
                  pairingUser={pairingUserProp}
                  initialPairCode={initialPairCode}
                  onLogSimulationActivity={(action, target, status = "INFO") =>
                    setWorkspaceState((prev) =>
                      appendSimulationActivity(prev, {
                        action,
                        target,
                        status,
                        tab: "multisim",
                      })
                    )
                  }
                />
              )}
            </div>
          )}

          {activeTab === "master-75" && (
            <MasterLabWorkbench
              externalLabId={selectedLabId}
              onSelectLab={(id) => {
                setSelectedLabId(id);
                const found = MASTER_75_LABS.find((l) => l.id === id);
                if (found) setActiveDomain(found.domain);
              }}
              onNavigateTab={(tab, labId) => {
                const targetId = labId || selectedLabId;
                applyLabContextToDestination(targetId, tab);
                navigateTo(tab);
              }}
              onOpenSchematicProject={(projectId) => {
                setInteractiveProjectId(projectId);
                navigateTo("schematics");
              }}
              onLaunchInteractiveBuilder={(labId) => {
                const targetId = labId || selectedLabId;
                setSynthesizedCircuit(getCircuitPresetForLab(targetId));
                navigateTo("lab", { navKey: "tool-designer" });
              }}
              onOpenSlideDeck={handleOpenSlideDeck}
              onOpenFullCanvas={handleOpenFullWindowCanvas}
              completedLabsExternal={workspaceState.completedManuals}
              onToggleLabCompleteExternal={(labId, completed) => {
                setWorkspaceState((prev) =>
                  setManualCompletionState(prev, labId, completed)
                );
                if (completed) {
                  const quiz = getPostLabQuizByMasterId(labId);
                  if (quiz) setActiveQuizContext(quiz);
                }
              }}
              knowledgeChecks={workspaceState.knowledgeChecks}
              onOpenKnowledgeCheck={(labId) => {
                const quiz = getPostLabQuizByMasterId(labId);
                if (quiz) setActiveQuizContext(quiz);
              }}
            />
          )}

          {activeTab === "rlc" && <RLCAnalyzer initialConfig={rlcInitialConfig} />}
          {activeTab === "lca" && (
            <LinearCircuitLab
              initialTab={lcaInitialState.tab}
              initialScenarioName={lcaInitialState.scenario}
              initialTransientType={lcaInitialState.transientType}
              syncKey={labSyncSeq}
            />
          )}
          {activeTab === "power" && (
            <PowerElectronicsLab
              initialTab={powerInitialState.tab}
              initialScenarioName={powerInitialState.scenario}
              initialTopology={powerInitialState.topology}
              initialRectType={powerInitialState.rectType}
              syncKey={labSyncSeq}
            />
          )}
          {activeTab === "cd" && (
            <CircuitAndDevicesLab
              initialTab={cdInitialState.tab}
              initialScenarioName={cdInitialState.scenario}
              syncKey={labSyncSeq}
            />
          )}
          {activeTab === "edc" && (
            <ElectronicDevicesLab
              initialTab={edcInitialState.tab}
              initialScenarioName={edcInitialState.scenario}
              initialOpMode={edcInitialState.opMode}
              syncKey={labSyncSeq}
            />
          )}

          {activeTab === "lab" && (
            <CircuitLab
              externalCircuit={synthesizedCircuit}
              onClearExternalCircuit={() => setSynthesizedCircuit(null)}
              isFullWindowStudio={isFullWindowCanvas}
              onToggleFullWindowStudio={() => setIsFullWindowCanvas((v) => !v)}
              activeDomain={activeDomain}
              currentLabId={selectedLabId}
              preferredGridPitch={workstationSettings.gridPitch}
              autoSaveEnabled={workstationSettings.autoSaveEnabled}
              telemetryDecimals={workstationSettings.telemetryDecimals}
              pairingUser={pairingUserProp}
              initialPairCode={initialPairCode}
              onLogSimulationActivity={(action, target, status = "INFO") =>
                setWorkspaceState((prev) =>
                  appendSimulationActivity(prev, {
                    action,
                    target,
                    status,
                    tab: "lab",
                  })
                )
              }
            />
          )}
          {activeTab === "simulators" && (
            <FundamentalSimulators
              onOpenInSchematicLab={handleLoadCircuitIntoLab}
            />
          )}
          {activeTab === "gates" && (
            <GateLibrary
              onSelectComponentToPlace={(compId) => {
                let nodeType = compId;
                if (compId === "RES_FIXED") nodeType = "RES";
                else if (compId === "POTENTIOMETER") nodeType = "POT";
                else if (compId === "INDUCTOR_AIR" || compId === "INDUCTOR_FERRITE") nodeType = "INDUCTOR";
                else if (compId === "DIODE_RECTIFIER") nodeType = "DIODE_1N4007";
                else if (compId === "LED") nodeType = "LED_RED";
                else if (compId === "BJT_NPN_STD") nodeType = "BJT_NPN";
                else if (compId === "BJT_PNP_STD") nodeType = "BJT_PNP";
                else if (compId === "DC_SOURCE") nodeType = "DC_VOLTAGE_SOURCE";
                else if (compId === "AC_SOURCE") nodeType = "AC_VOLTAGE_SOURCE";
                else if (compId === "GND") nodeType = "GND";

                handleLoadCircuitIntoLab({
                  title: `IEEE Std 315 ${compId} Schematic Workbench`,
                  nodes: [
                    {
                      type: nodeType as any,
                      x: 420,
                      y: 260,
                      label: `${compId} (IEEE Std 315)`,
                    },
                  ],
                  wires: [],
                });
              }}
              onNavigateToBreadboard={() => {
                navigateTo("breadboard");
              }}
            />
          )}
          {activeTab === "kmap" && (
            <KMapSolver onSynthesizeCircuit={handleLoadCircuitIntoLab} />
          )}
          {activeTab === "numbers" && <NumberSystemsLab />}
          {activeTab === "sequential" && <SequentialFSMLab />}
          {activeTab === "msi" && <MSIAndPLALab />}
          {activeTab === "checklist" && <VerificationChecklist />}
          {activeTab === "glossary" && <DigitalLogicGlossary />}
          {activeTab === "guide" && (
            <CurriculumGuide onNavigateTab={navigateTo} />
          )}
          {activeTab === "resources" && (
            <LearningResourcesCenter
              initialDomain={resourceDomainFilter}
              onNavigateTab={navigateTo}
              onOpenLabInWorkbench={handleOpenLabInWorkbench}
            />
          )}
          {activeTab === "breadboard" && (
            <VirtualBreadboard
              initialPresetName={breadboardPresetName}
              presetSyncKey={labSyncSeq}
            />
          )}
          {activeTab === "vlc" && (
            <OpticalWirelessLab onBackToWorkbench={() => navigateTo("home")} />
          )}
          {activeTab === "embedded-lab" && <AdvancedEmbeddedLab />}
          {activeTab === "wireless-lab" && <WirelessCommunicationLab />}
          {activeTab === "robotics-lab" && <RoboticsAutomationLab />}
          {activeTab === "instruments" && (
            <LabInstrumentsRack
              onLaunchBreadboard={() => navigateTo("breadboard")}
              onNavigateTab={navigateTo}
            />
          )}
          {activeTab === "components" && (
            <RealisticComponentLibraryBrowser
              onSelectComponentForInspection={(compId) =>
                setInspectingComponentId(compId)
              }
              onAddCompToWorkbench={(compId) => {
                setWorkspaceState((prev) =>
                  appendSimulationActivity(prev, {
                    action: "Opened Component in Designer",
                    target: compId,
                    status: "INFO",
                    tab: "lab",
                  })
                );
                navigateTo("lab", { navKey: "tool-designer" });
              }}
            />
          )}
          {activeTab === "student-learning" && (
            <StudentLearningSystem
              studentProfile={
                studentProfile || {
                  name: "Guest Researcher",
                  university: "Department of Electrical Engineering",
                }
              }
              onUpdateProfile={(p) => {
                setStudentProfile(p);
                try {
                  localStorage.setItem(
                    getUserScopedKey("ist_lab_student_profile"),
                    JSON.stringify(p)
                  );
                } catch {
                  // ignore
                }
                if (authUser) {
                  void loadOrCreateUserProfileDoc(authUser, {
                    displayName: p.name,
                    university: p.university,
                    department: p.department,
                    studentId: p.studentId,
                    semester: p.semester,
                    consentGiven: p.consentGiven,
                  })
                    .then(async (updatedDoc) => {
                      if (updatedDoc.consentGiven === true) {
                        await syncStudentProgressToCloud(
                          authUser,
                          updatedDoc,
                          workspaceState,
                          savedCircuitsCount,
                          completedExperiments.length
                        );
                      }
                      setCloudProfileDoc(updatedDoc);
                    })
                    .catch((err) => console.error("Profile update failed:", err));
                }
              }}
              onExperimentsChanged={(ids) => setCompletedExperiments(ids)}
              knowledgeChecks={workspaceState.knowledgeChecks}
              onExperimentCompleted={(exp) => {
                setActiveQuizContext(buildQuizContextForGuidedExperiment(exp));
              }}
              onLaunchExperimentCircuit={(tab) => {
                navigateTo(tab);
              }}
            />
          )}
          {activeTab === "schematics" && (
            <InteractiveCircuitSystem
              initialProjectId={interactiveProjectId}
              onNavigateTab={navigateTo}
              onSelectComponentForInspection={(compId) =>
                setInspectingComponentId(compId)
              }
            />
          )}
          {activeTab === "contact" && (
            <ContactUsSection onNavigateTab={navigateTo} />
          )}
          </motion.div>
        </main>
      </div>

      {/* Interactive 6-Slide Presentation Page for any Lab */}
      {isSlideDeckOpen && slideDeckLabId && (
        <LabSlideDeckModal
          labId={slideDeckLabId}
          isOpen={isSlideDeckOpen}
          onClose={() => setIsSlideDeckOpen(false)}
          onSelectLab={(id, domain) => {
            setSelectedLabId(id);
            setSlideDeckLabId(id);
            setActiveDomain(domain);
          }}
          onOpenInFullCanvas={handleOpenFullWindowCanvas}
          onOpenInWorkbench={(id, domain) => {
            setSelectedLabId(id);
            setActiveDomain(domain);
            setActiveTab("master-75");
            setIsSlideDeckOpen(false);
          }}
        />
      )}

      {/* Standalone Full-Window Canvas Studio Mode when opened outside logic-suite */}
      {isFullWindowCanvas && activeTab !== "logic-suite" && (
        <CircuitLab
          externalCircuit={synthesizedCircuit}
          onClearExternalCircuit={() => setSynthesizedCircuit(null)}
          isFullWindowStudio={true}
          onToggleFullWindowStudio={() => setIsFullWindowCanvas(false)}
          activeDomain={activeDomain}
          currentLabId={selectedLabId}
          preferredGridPitch={workstationSettings.gridPitch}
          autoSaveEnabled={workstationSettings.autoSaveEnabled}
          telemetryDecimals={workstationSettings.telemetryDecimals}
          pairingUser={pairingUserProp}
          initialPairCode={initialPairCode}
          onLogSimulationActivity={(action, target, status = "INFO") =>
            setWorkspaceState((prev) =>
              appendSimulationActivity(prev, {
                action,
                target,
                status,
                tab: activeTab,
              })
            )
          }
        />
      )}

      {/* 3D Realistic Electronic Component & Datasheet Modal */}
      {inspectingComponentId && (
        <RealisticComponentModal
          componentId={inspectingComponentId}
          isOpen={true}
          onClose={() => setInspectingComponentId(null)}
        />
      )}

      {/* Automated Benchmark Reference Circuits Testing Suite Modal */}
      <BenchmarkCircuitsModal
        isOpen={isBenchmarkModalOpen}
        onClose={() => setIsBenchmarkModalOpen(false)}
        onLoadCircuit={(targetTab, circuitId) => {
          const nextSeq = labSyncSeq + 1;
          setLabSyncSeq(nextSeq);
          const benchPreset = getCircuitPresetForBenchmark(circuitId);
          setSynthesizedCircuit(benchPreset);

          setWorkspaceState((prev) =>
            appendSimulationActivity(prev, {
              action: "Loaded Benchmark",
              target: circuitId,
              status: "PASS",
              tab: targetTab as ActiveTabId,
            })
          );

          if (targetTab === "breadboard") {
            const bbMap: Record<string, string> = {
              "bench-divider": "04. Resistor Voltage Divider",
              "bench-full-wave-bridge": "05. Full-Wave Bridge Rectifier",
              "bench-zener-regulator": "06. Zener Diode Voltage Regulator",
              "bench-555-astable": "02. NE555 Precision Astable",
              "bench-bjt-switch": "03. BJT BC547 Transistor",
            };
            setBreadboardPresetName(bbMap[circuitId] || "01. Basic DC LED");
            navigateTo("breadboard");
          } else if (circuitId === "bench-rc-charging") {
            setRlcInitialConfig({
              circuit: "RC",
              config: "series",
              outputTap: "C",
              vin: 5,
              rVal: 10000,
              cVal: 100,
              cUnit: "uF",
              fVal: 15.9,
              loadKey: nextSeq,
            });
            navigateTo("rlc");
          } else if (circuitId === "bench-opamp-inverting") {
            setEdcInitialState({
              tab: "OPAMP_LAB",
              scenario: "09. EDC Common-Emitter Amplifier",
              opMode: "INVERTING",
            });
            navigateTo("edc");
          } else if (circuitId === "bench-half-wave") {
            setCdInitialState({
              tab: "DIODE_IV_LOADLINE",
              scenario: "06. Zener Voltage Regulator",
            });
            navigateTo("cd");
          } else if (circuitId === "bench-mosfet-switch") {
            setPowerInitialState({
              tab: "CUSTOM_BUILDER",
              scenario: "07. Power MOSFET Buck Converter Stage",
              topology: "BUCK",
            });
            navigateTo("power");
          } else if (circuitId === "bench-diac-triac") {
            setPowerInitialState({
              tab: "SCR_RECTIFIER",
              scenario: "07. Power MOSFET Buck Converter Stage",
              rectType: "FULL_BRIDGE",
            });
            navigateTo("power");
          } else {
            navigateTo(targetTab as ActiveTabId);
          }
        }}
      />

      {/* Post-Lab Knowledge Check Modal */}
      {activeQuizContext && (
        <PostLabKnowledgeCheckModal
          quiz={activeQuizContext}
          previousRecord={workspaceState.knowledgeChecks[activeQuizContext.labId]}
          onRecordResult={({ score, totalQuestions }) => {
            setWorkspaceState((prev) =>
              recordKnowledgeCheckResult(prev, {
                labId: activeQuizContext.labId,
                labTitle: activeQuizContext.labTitle,
                domain: activeQuizContext.domain,
                score,
                totalQuestions,
                tab: activeTab,
              })
            );
          }}
          onClose={() => setActiveQuizContext(null)}
        />
      )}

      {/* Researcher Profile & Consent Modal */}
      {isProfileModalOpen && (
        <AcademicProfileGate
          initialProfile={studentProfile}
          verifiedEmail={authUser?.email || null}
          requireConsentChoice={requireConsentPrompt}
          workspaceState={workspaceState}
          completedExperimentsCount={completedExperiments.length}
          onComplete={(profile) => {
            setStudentProfile(profile);
            setIsProfileModalOpen(false);
            setRequireConsentPrompt(false);
            if (authUser) {
              void loadOrCreateUserProfileDoc(authUser, {
                displayName: profile.name,
                university: profile.university,
                department: profile.department,
                studentId: profile.studentId,
                semester: profile.semester,
                consentGiven: profile.consentGiven,
              })
                .then(async (updatedDoc) => {
                  if (updatedDoc.consentGiven === true) {
                    if (loginLoggedUidRef.current !== authUser.uid) {
                      loginLoggedUidRef.current = authUser.uid;
                      await recordConsentedLoginLog(authUser, updatedDoc);
                    }
                    await syncStudentProgressToCloud(
                      authUser,
                      updatedDoc,
                      workspaceState,
                      savedCircuitsCount,
                      completedExperiments.length
                    );
                  } else if (updatedDoc.consentGiven === false) {
                    loginLoggedUidRef.current = null;
                    await revokeConsentedAdminRecords(authUser.uid);
                  }
                  setCloudProfileDoc(updatedDoc);
                })
                .catch((err) => console.error("Profile sync failed:", err));
            }
          }}
          onCancel={() => {
            setIsProfileModalOpen(false);
            setRequireConsentPrompt(false);
          }}
        />
      )}

      {/* Clean Footer with Attribution */}
      <footer className="border-t border-[#24344D] py-6 px-6 text-center text-xs text-[#9BAAC0] space-y-2 bg-[#111B2B]">
        <div>
          Built by <strong className="text-[#35BDF2] font-bold">Abdul Rauf</strong> ·
          Electrical Engineering Department · Complete 5-Subject &amp; 75-Lab Electronics Engineering Workbench
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-mono pt-1">
          <button
            type="button"
            onClick={() => navigateTo("contact")}
            className="text-[#35BDF2] hover:underline font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#35BDF2]" />
            <span>Contact Us for Suggestions &amp; Improvement</span>
          </button>
          <span className="text-[#24344D] hidden sm:inline">|</span>
          <a
            href="https://wa.me/923215339417"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#48C99A] hover:underline font-bold flex items-center gap-1 transition-colors"
          >
            <span>WhatsApp: +923215339417</span>
          </a>
          <span className="text-[#24344D] hidden sm:inline">|</span>
          <a
            href="mailto:raufalvi32@gmail.com"
            className="text-[#35BDF2] hover:underline font-bold flex items-center gap-1 transition-colors"
          >
            <span>Email: raufalvi32@gmail.com</span>
          </a>
        </div>
      </footer>
      </div>
    </MotionConfig>
  );
}

export default function App() {
  return (
    <WorkbenchErrorBoundary>
      <InnerWorkbenchApp />
    </WorkbenchErrorBoundary>
  );
}
