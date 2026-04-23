import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { differenceInYears, differenceInCalendarDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Loader2,
  ChevronDown,
  Calendar,
  FileText,
  BarChart2,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

// ── Goniometry config by body part ──
const GONIO_PARTS = {
  shoulder: {
    label: "Hombro",
    fields: [
      { key: "flex", label: "Flexión", norm: "180" },
      { key: "ext", label: "Extensión", norm: "60" },
      { key: "add", label: "Aducción", norm: "30" },
      { key: "abd", label: "Abducción", norm: "180" },
      { key: "rot_ext", label: "Rot. Externa", norm: "70" },
      { key: "rot_int", label: "Rot. Interna", norm: "90" },
    ],
  },
  elbow: {
    label: "Codo",
    fields: [
      { key: "flex", label: "Flexión", norm: "150" },
      { key: "ext", label: "Extensión", norm: "0" },
      { key: "prono", label: "Pronación", norm: "80" },
      { key: "supino", label: "Supinación", norm: "80" },
    ],
  },
  wrist: {
    label: "Muñeca",
    fields: [
      { key: "flex", label: "Flexión", norm: "80" },
      { key: "ext", label: "Extensión", norm: "70" },
      { key: "dr", label: "Desv. Radial", norm: "20" },
      { key: "dc", label: "Desv. Cubital", norm: "30" },
      { key: "prono", label: "Pronación", norm: "80" },
      { key: "supino", label: "Supinación", norm: "80" },
    ],
  },
  hand: {
    label: "Mano",
    fields: [
      { key: "mcf_flex", label: "MCF Flexión", norm: "90" },
      { key: "mcf_ext", label: "MCF Extensión", norm: "0-5" },
      { key: "ifp_flex", label: "IFP Flexión", norm: "100" },
      { key: "ifp_ext", label: "IFP Extensión", norm: "0" },
      { key: "ifd_flex", label: "IFD Flexión", norm: "90" },
      { key: "ifd_ext", label: "IFD Extensión", norm: "0" },
    ],
  },
  thumb: {
    label: "Pulgar",
    fields: [
      { key: "mcf_flex", label: "MCF Flexión", norm: "50" },
      { key: "mcf_ext", label: "MCF Extensión", norm: "0" },
      { key: "if_flex", label: "IF Flexión", norm: "80" },
      { key: "if_ext", label: "IF Extensión", norm: "20" },
    ],
  },
} as const;

type GonioPartKey = keyof typeof GONIO_PARTS;

// ── Specific tests ──
const SPECIFIC_TESTS = [
  { key: "finkelstein", label: "Finkelstein" },
  { key: "phalen", label: "Phalen" },
  { key: "froment", label: "Froment" },
  { key: "wartenberg", label: "Wartenberg" },
  { key: "garra_cubital", label: "Garra cubital" },
  { key: "jobe", label: "Jobe" },
  { key: "pate", label: "Pate" },
  { key: "yocum", label: "Yocum" },
  { key: "herber", label: "Herber" },
] as const;

type TestResult = "positive" | "negative" | null;

// ── Daniels muscles by nerve ──
const DANIELS_GRADES = ["0", "1", "2", "3", "4", "5"];
const DANIELS_FULL_GRADES = ["0", "1", "1+", "2-", "2", "2+", "3-", "3", "3+", "4-", "4", "4+", "5"];

const MEDIAN_MUSCLES = [
  "Pronador redondo", "Flexor largo del pulgar", "Flexor superficial dedos",
  "Flexor profundo 1 y 2", "Palmar mayor", "Palmar menor",
  "Abd corto del pulgar", "Oponente del pulgar", "Flexor corto del pulgar",
  "Lumbricales 1 y 2", "Pronador cuadrado",
];
const CUBITAL_MUSCLES = [
  "Aductor del pulgar", "Flexor corto del pulgar", "Abd del meñique",
  "Oponente del meñique", "Flexor del meñique", "Interóseos dorsales",
  "Interóseos palmares", "Lumbricales 3 y 4", "Flexor profundo 3 y 4",
  "Cubital anterior",
];
const RADIAL_MUSCLES = [
  "Extensor largo del pulgar", "Extensor corto del pulgar", "Abd largo del pulgar",
  "Extensor del índice", "Extensor del meñique", "Extensor común dedos",
  "Primer radial externo", "Segundo radial externo",
];

function muscleKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[áéíóú]/g, (m) => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" } as any)[m] || m)
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

// ── Cicatriz: opciones planilla ──
const SCAR_OPTIONS: Record<string, string[]> = {
  localizacion: ["Zona", "Atraviesa articulación"],
  vascularizacion: ["Normal", "Rosa", "Roja", "Púrpura"],
  pigmentacion: ["Normal", "Hipopigmentada", "Pigmentación mixta", "Hiperpigmentada"],
  flexibilidad: ["Flexible", "Semiflexible", "Rígida", "Adherida", "Retráctil", "Brida cicatrizal"],
  sensibilidad: ["Normal", "Hipersensibilidad", "Hiposensibilidad", "Parestesias", "Prurito"],
  relieve: ["Plana", "Levemente elevada", "Invaginada", "Hipertrófica", "Queloide"],
  temperatura: ["Normal", "Alta"],
};

const VSS_OPTIONS = {
  pigmentacion: [
    { v: "0", label: "0 — Normal" },
    { v: "1", label: "1 — Hipopigmentación" },
    { v: "2", label: "2 — Pigmentación mixta" },
    { v: "3", label: "3 — Hiperpigmentación" },
  ],
  vascularizacion: [
    { v: "0", label: "0 — Normal" },
    { v: "1", label: "1 — Rosa" },
    { v: "2", label: "2 — Rojo" },
    { v: "3", label: "3 — Púrpura" },
  ],
  flexibilidad: [
    { v: "0", label: "0 — Normal" },
    { v: "1", label: "1 — Suave, flexible" },
    { v: "2", label: "2 — Cedente" },
    { v: "3", label: "3 — Firme" },
    { v: "4", label: "4 — Cordón" },
    { v: "5", label: "5 — Contractura" },
  ],
  altura: [
    { v: "0", label: "0 — Normal" },
    { v: "1", label: "1 — ≤1mm" },
    { v: "2", label: "2 — >1 a ≤2mm" },
    { v: "3", label: "3 — >2 a ≤4mm" },
    { v: "4", label: "4 — >4mm" },
  ],
};

const SCAR_PLACEHOLDER = "No evaluado";

// ── Reusable wrappers ──
function SectionCard({
  icon: Icon,
  title,
  action,
  children,
  toggle,
}: {
  icon: any;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  toggle?: { checked: boolean; onChange: (v: boolean) => void; label?: string };
}) {
  const isOff = toggle && !toggle.checked;
  return (
    <Card className="rounded-xl shadow-sm border-gray-200 bg-white mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 border-l-4 border-l-teal-500">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>
        <div className="flex items-center gap-3">
          {action}
          {toggle && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{toggle.label || (toggle.checked ? "Incluido" : "Incluir")}</span>
              <Switch checked={toggle.checked} onCheckedChange={toggle.onChange} />
            </div>
          )}
        </div>
      </div>
      {!isOff && <CardContent className="p-6">{children}</CardContent>}
    </Card>
  );
}

function SubSection({
  title,
  checked,
  onChange,
  children,
  withDivider = true,
  badge,
}: {
  title: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  withDivider?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div className={`space-y-3 ${withDivider ? "pt-5 mt-5 border-t border-gray-100" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-600">{title}</h3>
          {badge}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{checked ? "Incluido" : "Incluir"}</span>
          <Switch checked={checked} onCheckedChange={onChange} />
        </div>
      </div>
      {checked && <div className="space-y-3">{children}</div>}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
      {children}
    </Label>
  );
}

const inputClass =
  "border-gray-200 rounded-lg min-h-[44px] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent focus-visible:ring-offset-0";
const textareaClass =
  "border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent focus-visible:ring-offset-0";

function DanielsTable({
  muscles,
  values,
  onChange,
}: {
  muscles: string[];
  values: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="space-y-1">
      {muscles.map((m) => {
        const k = muscleKey(m);
        return (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs flex-1 min-w-0 truncate">{m}</span>
            <Select value={values[k] || ""} onValueChange={(v) => onChange(k, v)}>
              <SelectTrigger className="h-8 w-16 text-xs border-gray-200 rounded-lg">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent position="popper">
                {DANIELS_GRADES.map((g) => (
                  <SelectItem key={g} value={g}>
                    {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}

export default function SessionForm() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams] = useSearchParams();
  const episodeIdParam = searchParams.get("episode");
  const typeParam = searchParams.get("type");
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [clinical, setClinical] = useState<any>(null);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(episodeIdParam);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [session_date, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [session_type, setSessionType] = useState(typeParam === "admission" ? "admission" : "follow_up");
  const [session_number, setSessionNumber] = useState("");
  const [week_at_session, setWeekAtSession] = useState("");
  const [general_observations, setGeneralObservations] = useState("");
  const [symptom_changes, setSymptomChanges] = useState("");
  const [clinical_changes, setClinicalChanges] = useState("");
  const [discharge_summary, setDischargeSummary] = useState("");
  const [avd_followup, setAvdFollowup] = useState("");

  // Functional eval (admission only)
  const [func_dominance, setFuncDominance] = useState("");
  const [func_avd, setFuncAvd] = useState("");
  const [func_aivd, setFuncAivd] = useState("");
  const [func_sleep, setFuncSleep] = useState("");
  const [func_health, setFuncHealth] = useState("");
  const [func_barthel, setFuncBarthel] = useState("");
  const [func_dash, setFuncDash] = useState("");

  // Analytical evaluation (master toggle)
  const [show_measurements, setShowMeasurements] = useState(false);

  // Per-subsection toggles
  const [showPain, setShowPain] = useState(true);
  const [showEdema, setShowEdema] = useState(false);
  const [showMobility, setShowMobility] = useState(false);
  const [showStrength, setShowStrength] = useState(false);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showCicatriz, setShowCicatriz] = useState(false);
  const [showSpecificTests, setShowSpecificTests] = useState(false);
  const [showOtros, setShowOtros] = useState(false);

  // Pain
  const [pain_touched, setPainTouched] = useState(false);
  const [pain_score, setPainScore] = useState(0);
  const [pain_location, setPainLocation] = useState("");
  const [pain_characteristics, setPainCharacteristics] = useState("");
  const [pain_aggravating_factors, setPainAggravatingFactors] = useState("");
  const [pain_radiates_choice, setPainRadiatesChoice] = useState<"" | "no" | "si">("");
  const [pain_radiation, setPainRadiation] = useState("");
  const [pain_appearance, setPainAppearance] = useState("");
  const [pain_free, setPainFree] = useState("");

  // Edema
  const [edema_obs, setEdemaObs] = useState("");
  const [godet_test, setGodetTest] = useState("");

  // Circummetry
  const [circ_wrist_msd, setCircWristMsd] = useState("");
  const [circ_wrist_msi, setCircWristMsi] = useState("");
  const [circ_global_msd, setCircGlobalMsd] = useState("");
  const [circ_global_msi, setCircGlobalMsi] = useState("");

  // Goniometry PRE/POST with body part selector — nested by part
  const emptyGonio = () =>
    ({ shoulder: {}, elbow: {}, wrist: {}, hand: {}, thumb: {} } as Record<GonioPartKey, Record<string, string>>);
  const [gonio_part, setGonioPart] = useState<GonioPartKey>("wrist");
  const [all_pre_gonio, setAllPreGonio] = useState(emptyGonio);
  const [show_post_gonio, setShowPostGonio] = useState(false);
  const [gonio_part_post, setGonioPartPost] = useState<GonioPartKey>("wrist");
  const [all_post_gonio, setAllPostGonio] = useState(emptyGonio);

  // Fist closure
  const [fist_closure, setFistClosure] = useState("");

  // Strength
  const [dyn_msd, setDynMsd] = useState("");
  const [dyn_msi, setDynMsi] = useState("");
  const [kapandji_val, setKapandjiVal] = useState("");
  const [kapandji_pain, setKapandjiPain] = useState(false);
  const [dppd_pulgar, setDppdPulgar] = useState("");
  const [dppd_indice, setDppdIndice] = useState("");
  const [dppd_medio, setDppdMedio] = useState("");
  const [dppd_anular, setDppdAnular] = useState("");
  const [dppd_menique, setDppdMenique] = useState("");
  const [muscle_strength, setMuscleStrength] = useState("");
  const [strength_notes, setStrengthNotes] = useState("");

  // Daniels by nerve
  const [daniels_median, setDanielsMedian] = useState<Record<string, string>>({});
  const [daniels_cubital, setDanielsCubital] = useState<Record<string, string>>({});
  const [daniels_radial, setDanielsRadial] = useState<Record<string, string>>({});
  const [show_daniels, setShowDaniels] = useState(false);

  // Specific tests
  const [specificTests, setSpecificTests] = useState<Record<string, TestResult>>(
    Object.fromEntries(SPECIFIC_TESTS.map((t) => [t.key, null]))
  );

  // Sensitivity
  const [sensitivity, setSensitivity] = useState("");
  const [sensitivity_tacto_ligero, setSensitivityTactoLigero] = useState("");
  const [sensitivity_dos_puntos, setSensitivityDosPuntos] = useState("");
  const [sensitivity_picking_up, setSensitivityPickingUp] = useState("");
  const [sensitivity_semmes_weinstein, setSensitivitySemmesWeinstein] = useState("");
  const [sensitivity_toco_pincho, setSensitivityTocoPincho] = useState("");
  const [sensitivity_temperatura, setSensitivityTemperatura] = useState("");

  // Trophic & others
  const [trophic_state, setTrophicState] = useState("");
  // Cicatriz — Planilla
  const [scar_localizacion, setScarLocalizacion] = useState("");
  const [scar_longitud, setScarLongitud] = useState("");
  const [scar_vascularizacion, setScarVascularizacion] = useState("");
  const [scar_pigmentacion, setScarPigmentacion] = useState("");
  const [scar_flexibilidad, setScarFlexibilidad] = useState("");
  const [scar_sensibilidad, setScarSensibilidad] = useState("");
  const [scar_relieve, setScarRelieve] = useState("");
  const [scar_temperatura, setScarTemperatura] = useState("");
  const [scar_observaciones, setScarObservaciones] = useState("");
  // Cicatriz — Vancouver VSS
  const [vss_pigmentacion, setVssPigmentacion] = useState("");
  const [vss_vascularizacion, setVssVascularizacion] = useState("");
  const [vss_flexibilidad, setVssFlexibilidad] = useState("");
  const [vss_altura, setVssAltura] = useState("");
  const [posture, setPosture] = useState("");
  const [emotional_state, setEmotionalState] = useState("");

  // Interventions & notes
  const [interventions, setInterventions] = useState("");
  const [home_instructions_sent, setHomeInstructionsSent] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!patientId) return;
    const load = async () => {
      const [p, c, sc] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase.from("patient_clinical_records").select("*").eq("patient_id", patientId).single(),
        supabase
          .from("therapy_sessions")
          .select("id", { count: "exact", head: true })
          .eq("patient_id", patientId)
          .eq("is_deleted", false),
      ]);
      setPatient(p.data);
      setClinical(c.data);
      if (sc.count != null) setSessionNumber(String(sc.count + 1));

      if (!episodeIdParam) {
        const { data: ep } = await supabase
          .from("treatment_episodes")
          .select("id")
          .eq("patient_id", patientId)
          .eq("status", "active")
          .eq("is_deleted", false)
          .order("episode_number", { ascending: false })
          .limit(1)
          .single();
        if (ep) setActiveEpisodeId(ep.id);
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  // Auto-calculate weeks at session from injury date (or symptom start as fallback)
  const weekCalcSource: "injury" | "symptom" | null = clinical?.injury_date
    ? "injury"
    : clinical?.symptom_start_date
    ? "symptom"
    : null;

  useEffect(() => {
    if (!session_date || !clinical) return;
    const refDateStr = clinical.injury_date || clinical.symptom_start_date;
    if (!refDateStr) return;
    const ref = new Date(refDateStr + "T12:00:00");
    const sess = new Date(session_date + "T12:00:00");
    const days = differenceInCalendarDays(sess, ref);
    if (days < 0) return;
    const weeks = Math.floor(days / 7);
    setWeekAtSession(String(weeks));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session_date, clinical]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-[#F9FAFB]">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  if (!patient)
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <p className="text-center text-muted-foreground py-12">Paciente no encontrado.</p>
      </div>
    );

  // ── Gonio helpers ──
  const buildAllGonioText = (allVals: Record<GonioPartKey, Record<string, string>>) => {
    const parts: string[] = [];
    for (const pk of Object.keys(GONIO_PARTS) as GonioPartKey[]) {
      const vals = allVals[pk];
      const fields = GONIO_PARTS[pk].fields;
      const entries = fields.map((f) => (vals[f.key] ? `${f.label}:${vals[f.key]}°` : "")).filter(Boolean);
      if (entries.length > 0) parts.push(`[${GONIO_PARTS[pk].label}] ${entries.join(" ")}`);
    }
    return parts.length > 0 ? parts.join(" ") : null;
  };

  const buildAllGonioJsonArray = (allVals: Record<GonioPartKey, Record<string, string>>) => {
    const arr: { body_part: string; values: Record<string, number> }[] = [];
    for (const pk of Object.keys(GONIO_PARTS) as GonioPartKey[]) {
      const vals = allVals[pk];
      const filled = Object.fromEntries(
        GONIO_PARTS[pk].fields
          .map((f) => [f.key, vals[f.key] ? Number(vals[f.key]) : null])
          .filter(([, v]) => v != null)
      );
      if (Object.keys(filled).length > 0) arr.push({ body_part: pk, values: filled as Record<string, number> });
    }
    return arr.length > 0 ? arr : null;
  };

  const cycleTest = (key: string) => {
    setSpecificTests((prev) => {
      const cur = prev[key];
      const next: TestResult = cur === null ? "positive" : cur === "positive" ? "negative" : null;
      return { ...prev, [key]: next };
    });
  };

  // VSS total (live)
  const vssTotalLive =
    (vss_pigmentacion ? parseInt(vss_pigmentacion) : 0) +
    (vss_vascularizacion ? parseInt(vss_vascularizacion) : 0) +
    (vss_flexibilidad ? parseInt(vss_flexibilidad) : 0) +
    (vss_altura ? parseInt(vss_altura) : 0);

  const handleSave = async () => {
    if (!session_date || !user) return;
    setSaving(true);

    // ── Pain (gated) ──
    const painLocFinal = showPain
      ? [pain_location, pain_radiates_choice === "si" && pain_radiation ? `Irradia a: ${pain_radiation}` : ""]
          .filter(Boolean)
          .join(" — ") || null
      : null;
    const painRadiationFinal = showPain
      ? pain_radiates_choice === "si"
        ? pain_radiation || null
        : pain_radiates_choice === "no"
        ? "No irradia"
        : null
      : null;

    // ── Edema circometry (gated) ──
    const circParts: string[] = [];
    if (showEdema) {
      if (circ_wrist_msd || circ_global_msd)
        circParts.push(`MSD: ${circ_wrist_msd || "-"}cm muñeca / ${circ_global_msd || "-"}cm global`);
      if (circ_wrist_msi || circ_global_msi)
        circParts.push(`MSI: ${circ_wrist_msi || "-"}cm muñeca / ${circ_global_msi || "-"}cm global`);
    }
    const edemaCirc = circParts.length > 0 ? circParts.join(" | ") : null;

    // ── Mobility (gated) ──
    const aromVal = showMobility ? buildAllGonioText(all_pre_gonio) : null;
    const promVal = showMobility && show_post_gonio ? buildAllGonioText(all_post_gonio) : null;
    const preJsonArr = showMobility ? buildAllGonioJsonArray(all_pre_gonio) : null;
    const postJsonArr = showMobility && show_post_gonio ? buildAllGonioJsonArray(all_post_gonio) : null;
    const gonioJsonb = preJsonArr || postJsonArr ? { pre: preJsonArr, post: postJsonArr } : null;
    const kapandjiFinal = showMobility && kapandji_val ? `${kapandji_val}/10${kapandji_pain ? " con dolor" : ""}` : null;

    // ── Strength (gated) ──
    const msParts: string[] = [];
    if (showMobility && fist_closure) msParts.push(`Cierre de puño: ${fist_closure}`);
    if (showStrength && muscle_strength) msParts.push(`Daniels: ${muscle_strength}`);
    if (showStrength && strength_notes) msParts.push(strength_notes);
    const msVal = msParts.length > 0 ? msParts.join(" — ") : null;

    const dppdEntries: [string, string][] = showStrength
      ? ([
          ["pulgar", dppd_pulgar],
          ["indice", dppd_indice],
          ["medio", dppd_medio],
          ["anular", dppd_anular],
          ["menique", dppd_menique],
        ].filter(([, v]) => v && v.trim()) as [string, string][])
      : [];
    const dppdFingersJson =
      dppdEntries.length > 0 ? Object.fromEntries(dppdEntries.map(([k, v]) => [k, parseFloat(v)])) : null;

    const generalObsFinal =
      session_type === "admission"
        ? discharge_summary || general_observations || null
        : [discharge_summary, general_observations].filter(Boolean).join("\n\n") || null;

    // ── Specific tests (gated) ──
    const hasTests = showSpecificTests && Object.values(specificTests).some((v) => v !== null);
    const specificTestsJson = hasTests
      ? Object.fromEntries(Object.entries(specificTests).map(([k, v]) => [k, v]))
      : null;

    // ── Daniels by nerve (gated by sensitivity, where the table lives) ──
    const hasMedian = showSensitivity && Object.values(daniels_median).some((v) => v);
    const hasCubital = showSensitivity && Object.values(daniels_cubital).some((v) => v);
    const hasRadial = showSensitivity && Object.values(daniels_radial).some((v) => v);
    const medianJson = hasMedian ? JSON.stringify(daniels_median) : null;
    const cubitalJson = hasCubital ? JSON.stringify(daniels_cubital) : null;
    const radialJson = hasRadial ? JSON.stringify(daniels_radial) : null;

    // Insert session
    const { data: session, error } = await supabase
      .from("therapy_sessions")
      .insert({
        patient_id: patientId!,
        professional_id: user.id,
        is_deleted: false,
        episode_id: activeEpisodeId,
        session_date,
        session_type: session_type || null,
        session_number: session_number ? parseInt(session_number) : null,
        week_at_session: week_at_session ? parseInt(week_at_session) : null,
        general_observations: generalObsFinal,
        symptom_changes: symptom_changes || null,
        clinical_changes: clinical_changes || null,
        avd_followup: avd_followup || null,
        interventions: interventions || null,
        home_instructions_sent: home_instructions_sent || null,
        notes: notes || null,
      } as any)
      .select()
      .single();

    if (error || !session) {
      setSaving(false);
      toast.error("Error al guardar la sesión");
      return;
    }

    // Functional eval for admission
    if (
      session_type === "admission" &&
      [func_dominance, func_avd, func_aivd, func_sleep, func_health, func_barthel, func_dash].some((v) => v)
    ) {
      const { error: feErr } = await supabase.from("functional_evaluations").insert({
        patient_id: patientId!,
        professional_id: user.id,
        episode_id: activeEpisodeId,
        evaluation_date: session_date,
        dominance: (func_dominance || null) as any,
        avd: func_avd || null,
        aivd: func_aivd || null,
        sleep_rest: func_sleep || null,
        health_management: func_health || null,
        barthel_score: func_barthel ? parseInt(func_barthel) : null,
        dash_score: func_dash ? parseInt(func_dash) : null,
      } as any);
      if (feErr) console.error("Error inserting func eval:", feErr);
    }

    // ── Cicatriz (gated) ──
    const scarPlanillaEntries: [string, string][] = showCicatriz
      ? ([
          ["localizacion", scar_localizacion],
          ["longitud_cm", scar_longitud],
          ["vascularizacion", scar_vascularizacion],
          ["pigmentacion", scar_pigmentacion],
          ["flexibilidad", scar_flexibilidad],
          ["sensibilidad", scar_sensibilidad],
          ["relieve", scar_relieve],
          ["temperatura", scar_temperatura],
        ].filter(([, v]) => v && String(v).trim()) as [string, string][])
      : [];

    const vssObj: Record<string, number> = {};
    if (showCicatriz) {
      if (vss_pigmentacion !== "") vssObj.pigmentacion = parseInt(vss_pigmentacion);
      if (vss_vascularizacion !== "") vssObj.vascularizacion = parseInt(vss_vascularizacion);
      if (vss_flexibilidad !== "") vssObj.flexibilidad = parseInt(vss_flexibilidad);
      if (vss_altura !== "") vssObj.altura = parseInt(vss_altura);
    }
    const vssTotal = Object.values(vssObj).reduce((a, b) => a + b, 0);
    const hasVss = Object.keys(vssObj).length > 0;

    const scarEvalJson =
      scarPlanillaEntries.length > 0 || hasVss
        ? {
            ...Object.fromEntries(scarPlanillaEntries),
            ...(hasVss ? { vss: vssObj } : {}),
          }
        : null;

    // Build a hasMeasurements check based on what's actually present after gating
    const hasMeasurements =
      show_measurements &&
      [
        showPain && pain_touched && pain_score > 0,
        painLocFinal,
        showPain && pain_characteristics,
        showPain && pain_aggravating_factors,
        showPain && pain_appearance,
        showPain && pain_free,
        showEdema && edema_obs,
        showEdema && godet_test,
        edemaCirc,
        aromVal,
        promVal,
        showMobility && fist_closure,
        showStrength && dyn_msd,
        showStrength && dyn_msi,
        kapandjiFinal,
        msVal,
        showSensitivity && sensitivity,
        showSensitivity && sensitivity_tacto_ligero,
        showSensitivity && sensitivity_dos_puntos,
        showSensitivity && sensitivity_picking_up,
        showSensitivity && sensitivity_semmes_weinstein,
        showSensitivity && sensitivity_toco_pincho,
        showSensitivity && sensitivity_temperatura,
        showOtros && trophic_state,
        showOtros && posture,
        showOtros && emotional_state,
        specificTestsJson,
        medianJson,
        cubitalJson,
        radialJson,
        gonioJsonb,
        dppdFingersJson,
        scarEvalJson,
      ].some((v) => v !== "" && v !== null && v !== undefined && v !== false);

    if (hasMeasurements) {
      const { error: aeErr } = await supabase.from("analytical_evaluations").insert({
        patient_id: patientId!,
        professional_id: user.id,
        episode_id: activeEpisodeId,
        session_id: session.id,
        evaluation_date: session_date,
        pain_score: showPain && pain_touched ? pain_score : null,
        pain_appearance: showPain ? pain_appearance || null : null,
        pain_location: painLocFinal,
        pain_radiation: painRadiationFinal,
        pain_characteristics: showPain ? pain_characteristics || null : null,
        pain_aggravating_factors: showPain ? pain_aggravating_factors || null : null,
        pain: showPain ? pain_free || null : null,
        edema: showEdema ? edema_obs || null : null,
        godet_test: showEdema ? godet_test || null : null,
        edema_circummetry: edemaCirc,
        arom: aromVal,
        prom: promVal,
        goniometry: gonioJsonb,
        dynamometer_msd: showStrength && dyn_msd ? parseFloat(dyn_msd) : null,
        dynamometer_msi: showStrength && dyn_msi ? parseFloat(dyn_msi) : null,
        kapandji: kapandjiFinal,
        muscle_strength: msVal,
        muscle_strength_median: medianJson,
        muscle_strength_cubital: cubitalJson,
        muscle_strength_radial: radialJson,
        specific_tests: specificTestsJson,
        dppd_fingers: dppdFingersJson,
        sensitivity: showSensitivity ? sensitivity || null : null,
        sensitivity_functional: null,
        sensitivity_protective: null,
        sensitivity_tacto_ligero: showSensitivity ? sensitivity_tacto_ligero || null : null,
        sensitivity_dos_puntos: showSensitivity ? sensitivity_dos_puntos || null : null,
        sensitivity_picking_up: showSensitivity ? sensitivity_picking_up || null : null,
        sensitivity_semmes_weinstein: showSensitivity ? sensitivity_semmes_weinstein || null : null,
        sensitivity_toco_pincho: showSensitivity ? sensitivity_toco_pincho || null : null,
        sensitivity_temperatura: showSensitivity ? sensitivity_temperatura || null : null,
        trophic_state: showOtros ? trophic_state || null : null,
        scar: showCicatriz ? scar_observaciones || null : null,
        scar_evaluation: scarEvalJson,
        vancouver_score: showCicatriz && hasVss ? vssTotal : null,
        osas_score: null,
        posture: showOtros ? posture || null : null,
        emotional_state: showOtros ? emotional_state || null : null,
      });
      if (aeErr) {
        setSaving(false);
        toast.error("Error al guardar la sesión");
        return;
      }
    }

    setSaving(false);
    toast.success("Sesión registrada correctamente");
    navigate(`/patients/${patientId}`);
  };

  const GonioGrid = ({
    partKey,
    values,
    setValues,
  }: {
    partKey: GonioPartKey;
    values: Record<string, string>;
    setValues: (v: Record<string, string>) => void;
  }) => {
    const fields = GONIO_PARTS[partKey].fields;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fields.map((f) => (
          <div key={f.key}>
            <FieldLabel>{f.label} °</FieldLabel>
            <Input
              key={`${partKey}-${f.key}-${values[f.key] || ""}`}
              type="number"
              placeholder={f.norm}
              defaultValue={values[f.key] || ""}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (values[f.key] || "")) setValues({ ...values, [f.key]: v });
              }}
              className={inputClass}
            />
          </div>
        ))}
      </div>
    );
  };

  const GonioPartSelector = ({
    value,
    onChange,
  }: {
    value: GonioPartKey;
    onChange: (v: GonioPartKey) => void;
  }) => (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {(Object.keys(GONIO_PARTS) as GonioPartKey[]).map((k) => (
        <Button
          key={k}
          type="button"
          size="sm"
          variant={value === k ? "default" : "outline"}
          className={
            value === k
              ? "bg-teal-600 hover:bg-teal-700 text-white h-8 text-xs rounded-full"
              : "h-8 text-xs rounded-full border-gray-200"
          }
          onClick={() => onChange(k)}
        >
          {GONIO_PARTS[k].label}
        </Button>
      ))}
    </div>
  );

  const sessionTitle = `${patient.last_name} — Sesión Nº ${session_number || "—"}`;
  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center px-4">
        <div className="max-w-2xl w-full mx-auto flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/patients/${patientId}`)}
            className="text-gray-600 hover:text-gray-900 -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1 text-center min-w-0">
            <h1 className="text-sm font-semibold text-gray-800 truncate">{sessionTitle}</h1>
            {clinical?.diagnosis && (
              <p className="text-xs text-muted-foreground truncate">{clinical.diagnosis}</p>
            )}
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !session_date}
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
            Guardar
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Card 1: Datos de la sesión */}
        <SectionCard icon={Calendar} title="Datos de la sesión">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Fecha *</FieldLabel>
              <Input
                type="date"
                value={session_date}
                onChange={(e) => setSessionDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Tipo de sesión</FieldLabel>
              <Select value={session_type} onValueChange={setSessionType} disabled={typeParam === "admission"}>
                <SelectTrigger className={inputClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  {typeParam === "admission" && <SelectItem value="admission">Admisión</SelectItem>}
                  <SelectItem value="follow_up">Seguimiento</SelectItem>
                  <SelectItem value="discharge">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Nº de sesión</FieldLabel>
              <Input
                type="number"
                min={1}
                value={session_number}
                onChange={(e) => setSessionNumber(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Semanas POP/PL</FieldLabel>
              <Input
                type="number"
                min={0}
                placeholder="ej: 6"
                value={week_at_session}
                onChange={(e) => setWeekAtSession(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {session_type === "discharge" && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <FieldLabel>Resumen de alta / objetivos cumplidos</FieldLabel>
              <Textarea
                rows={3}
                value={discharge_summary}
                onChange={(e) => setDischargeSummary(e.target.value)}
                placeholder="Motivo del alta, objetivos cumplidos..."
                className={textareaClass}
              />
            </div>
          )}
        </SectionCard>

        {/* Functional eval (admission only) */}
        {session_type === "admission" && (
          <SectionCard icon={ClipboardList} title="Evaluación funcional">
            <div className="space-y-4">
              <div>
                <FieldLabel>Lateralidad</FieldLabel>
                <Select value={func_dominance} onValueChange={setFuncDominance}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    <SelectItem value="right">Diestro/a</SelectItem>
                    <SelectItem value="left">Zurdo/a</SelectItem>
                    <SelectItem value="ambidextrous">Ambidiestro/a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>AVD — Actividades de la vida diaria</FieldLabel>
                <Textarea rows={3} value={func_avd} onChange={(e) => setFuncAvd(e.target.value)} className={textareaClass} />
              </div>
              <div>
                <FieldLabel>AIVD — Actividades instrumentales</FieldLabel>
                <Textarea rows={3} value={func_aivd} onChange={(e) => setFuncAivd(e.target.value)} className={textareaClass} />
              </div>
              <div>
                <FieldLabel>Sueño y descanso</FieldLabel>
                <Textarea rows={2} value={func_sleep} onChange={(e) => setFuncSleep(e.target.value)} className={textareaClass} />
              </div>
              <div>
                <FieldLabel>Gestión de la salud</FieldLabel>
                <Textarea rows={2} value={func_health} onChange={(e) => setFuncHealth(e.target.value)} className={textareaClass} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <FieldLabel>Puntaje Barthel (0-100)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={func_barthel}
                    onChange={(e) => setFuncBarthel(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <FieldLabel>Puntaje DASH (0-100)</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={func_dash}
                    onChange={(e) => setFuncDash(e.target.value)}
                    className={inputClass}
                  />
                  <p className="text-xs text-muted-foreground mt-1">0 = sin discapacidad · 100 = máxima</p>
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Card 2: Evolución */}
        <SectionCard icon={FileText} title="Evolución">
          <div className="space-y-4">
            <div>
              <FieldLabel>Nota general de la sesión</FieldLabel>
              <Textarea
                rows={4}
                placeholder={`Paciente asiste a ${session_number ? session_number + "ra" : "X"} sesión, cursando su ${week_at_session || "X"}ma semana POP/PL...`}
                value={general_observations}
                onChange={(e) => setGeneralObservations(e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <FieldLabel>Cambios en síntomas</FieldLabel>
              <Textarea rows={2} value={symptom_changes} onChange={(e) => setSymptomChanges(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Cambios clínicos</FieldLabel>
              <Textarea rows={2} value={clinical_changes} onChange={(e) => setClinicalChanges(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>AVD — seguimiento</FieldLabel>
              <Textarea
                rows={2}
                placeholder="Baño, vestido, alimentación, traslados..."
                value={avd_followup}
                onChange={(e) => setAvdFollowup(e.target.value)}
                className={textareaClass}
              />
            </div>
          </div>
        </SectionCard>

        {/* Card 3: Evaluación analítica */}
        <SectionCard
          icon={BarChart2}
          title="Evaluación analítica"
          toggle={{ checked: show_measurements, onChange: setShowMeasurements, label: "Incluir evaluación analítica" }}
        >
          {/* Dolor */}
          <SubSection title="Dolor" checked={showPain} onChange={setShowPain} withDivider={false}>
            <div>
              <FieldLabel>Aparición</FieldLabel>
              <Input value={pain_appearance} onChange={(e) => setPainAppearance(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Localización</FieldLabel>
              <Input value={pain_location} onChange={(e) => setPainLocation(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Irradiación</FieldLabel>
              <RadioGroup
                value={pain_radiates_choice}
                onValueChange={(v) => {
                  const val = v as "no" | "si";
                  setPainRadiatesChoice(val);
                  if (val === "no") setPainRadiation("");
                }}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="pain-rad-no-sf" />
                  <Label htmlFor="pain-rad-no-sf" className="font-normal cursor-pointer text-sm">
                    No irradia
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="si" id="pain-rad-si-sf" />
                  <Label htmlFor="pain-rad-si-sf" className="font-normal cursor-pointer text-sm">
                    Sí irradia
                  </Label>
                </div>
              </RadioGroup>
              {pain_radiates_choice === "si" && (
                <div className="mt-2">
                  <FieldLabel>¿Hacia dónde?</FieldLabel>
                  <Input value={pain_radiation} onChange={(e) => setPainRadiation(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>
            <div>
              <FieldLabel>Características</FieldLabel>
              <Input
                value={pain_characteristics}
                onChange={(e) => setPainCharacteristics(e.target.value)}
                placeholder="urente, punzante, etc."
                className={inputClass}
              />
            </div>
            <div>
              <FieldLabel>Intensidad EVA (0-10)</FieldLabel>
              <div className="flex items-center gap-3">
                <Slider
                  min={0}
                  max={10}
                  step={1}
                  value={[pain_score]}
                  onValueChange={([v]) => {
                    setPainScore(v);
                    setPainTouched(true);
                  }}
                  className="flex-1"
                />
                <Badge
                  className={`text-sm font-semibold w-10 justify-center ${
                    pain_score === 0
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-100"
                      : pain_score <= 3
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : pain_score <= 6
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {pain_score}
                </Badge>
              </div>
            </div>
            <div>
              <FieldLabel>Agravantes / Atenuantes</FieldLabel>
              <Textarea
                rows={2}
                value={pain_aggravating_factors}
                onChange={(e) => setPainAggravatingFactors(e.target.value)}
                className={textareaClass}
              />
            </div>
          </SubSection>

          {/* Edema */}
          <SubSection title="Edema" checked={showEdema} onChange={setShowEdema}>
            <div>
              <FieldLabel>Observación</FieldLabel>
              <Textarea rows={2} value={edema_obs} onChange={(e) => setEdemaObs(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Circometría</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Muñeca MSD (cm)</FieldLabel>
                  <Input type="number" step="0.1" value={circ_wrist_msd} onChange={(e) => setCircWristMsd(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Muñeca MSI (cm)</FieldLabel>
                  <Input type="number" step="0.1" value={circ_wrist_msi} onChange={(e) => setCircWristMsi(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Global MSD (cm)</FieldLabel>
                  <Input type="number" step="0.1" value={circ_global_msd} onChange={(e) => setCircGlobalMsd(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Global MSI (cm)</FieldLabel>
                  <Input type="number" step="0.1" value={circ_global_msi} onChange={(e) => setCircGlobalMsi(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>Test de Godet</FieldLabel>
              <Select value={godet_test} onValueChange={setGodetTest}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="No evaluado" />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="not_evaluated">No evaluado</SelectItem>
                  <SelectItem value="negative">Negativo</SelectItem>
                  <SelectItem value="1+">1+</SelectItem>
                  <SelectItem value="2+">2+</SelectItem>
                  <SelectItem value="3+">3+</SelectItem>
                  <SelectItem value="4+">4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SubSection>

          {/* Movilidad */}
          <SubSection title="Movilidad" checked={showMobility} onChange={setShowMobility}>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Goniometría PRE</p>
              <GonioPartSelector value={gonio_part} onChange={setGonioPart} />
              <GonioGrid
                partKey={gonio_part}
                values={all_pre_gonio[gonio_part]}
                setValues={(v) => setAllPreGonio((prev) => ({ ...prev, [gonio_part]: v }))}
              />
            </div>
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-2">
                <Checkbox checked={show_post_gonio} onCheckedChange={(v) => setShowPostGonio(!!v)} id="post-gonio-sf" />
                <Label htmlFor="post-gonio-sf" className="font-normal text-sm cursor-pointer">
                  Registrar goniometría POST
                </Label>
              </div>
              {show_post_gonio && (
                <>
                  <GonioPartSelector value={gonio_part_post} onChange={setGonioPartPost} />
                  <GonioGrid
                    partKey={gonio_part_post}
                    values={all_post_gonio[gonio_part_post]}
                    setValues={(v) => setAllPostGonio((prev) => ({ ...prev, [gonio_part_post]: v }))}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Kapandji (0-10)</FieldLabel>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    value={kapandji_val}
                    onChange={(e) => setKapandjiVal(e.target.value)}
                    className={inputClass}
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <Checkbox checked={kapandji_pain} onCheckedChange={(v) => setKapandjiPain(!!v)} id="kap-pain-sf" />
                    <Label htmlFor="kap-pain-sf" className="font-normal text-sm cursor-pointer">
                      Con dolor
                    </Label>
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Cierre de puño</FieldLabel>
                <Input
                  value={fist_closure}
                  onChange={(e) => setFistClosure(e.target.value)}
                  placeholder="Completo / Incompleto..."
                  className={inputClass}
                />
              </div>
            </div>
          </SubSection>

          {/* Fuerza */}
          <SubSection title="Fuerza" checked={showStrength} onChange={setShowStrength}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Dinamómetro MSD (kg)</FieldLabel>
                <Input type="number" step="0.1" value={dyn_msd} onChange={(e) => setDynMsd(e.target.value)} className={inputClass} />
              </div>
              <div>
                <FieldLabel>Dinamómetro MSI (kg)</FieldLabel>
                <Input type="number" step="0.1" value={dyn_msi} onChange={(e) => setDynMsi(e.target.value)} className={inputClass} />
              </div>
            </div>
            <div>
              <FieldLabel>¿Qué evaluaste?</FieldLabel>
              <Textarea
                rows={2}
                value={strength_notes}
                onChange={(e) => setStrengthNotes(e.target.value)}
                placeholder="Fuerza isométrica de puño en 5 posiciones..."
                className={textareaClass}
              />
            </div>
            <div>
              <FieldLabel>Daniels</FieldLabel>
              <Select value={muscle_strength} onValueChange={setMuscleStrength}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Seleccionar grado" />
                </SelectTrigger>
                <SelectContent position="popper">
                  {DANIELS_FULL_GRADES.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>DPPD (cm) — distancia pulpejo-pliegue distal</FieldLabel>
              <div className="grid grid-cols-5 gap-2">
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase">Pulgar</Label>
                  <Input type="number" step="0.1" value={dppd_pulgar} onChange={(e) => setDppdPulgar(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase">Índice</Label>
                  <Input type="number" step="0.1" value={dppd_indice} onChange={(e) => setDppdIndice(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase">Medio</Label>
                  <Input type="number" step="0.1" value={dppd_medio} onChange={(e) => setDppdMedio(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase">Anular</Label>
                  <Input type="number" step="0.1" value={dppd_anular} onChange={(e) => setDppdAnular(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <Label className="text-[10px] text-gray-500 uppercase">Meñique</Label>
                  <Input type="number" step="0.1" value={dppd_menique} onChange={(e) => setDppdMenique(e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </SubSection>

          {/* Sensibilidad */}
          <SubSection title="Sensibilidad" checked={showSensitivity} onChange={setShowSensitivity}>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Epicrítica (funcional)</p>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Tacto ligero</FieldLabel>
                  <Textarea rows={2} value={sensitivity_tacto_ligero} onChange={(e) => setSensitivityTactoLigero(e.target.value)} className={textareaClass} />
                </div>
                <div>
                  <FieldLabel>Discriminación 2 puntos</FieldLabel>
                  <Textarea rows={2} value={sensitivity_dos_puntos} onChange={(e) => setSensitivityDosPuntos(e.target.value)} className={textareaClass} />
                </div>
                <div>
                  <FieldLabel>Picking up test</FieldLabel>
                  <Textarea rows={2} value={sensitivity_picking_up} onChange={(e) => setSensitivityPickingUp(e.target.value)} className={textareaClass} />
                </div>
                <div>
                  <FieldLabel>Semmes-Weinstein</FieldLabel>
                  <Textarea rows={2} value={sensitivity_semmes_weinstein} onChange={(e) => setSensitivitySemmesWeinstein(e.target.value)} className={textareaClass} />
                </div>
              </div>
            </div>
            <div className="pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Protopática (protectora)</p>
              <div className="space-y-3">
                <div>
                  <FieldLabel>Toco-pincho</FieldLabel>
                  <Textarea rows={2} value={sensitivity_toco_pincho} onChange={(e) => setSensitivityTocoPincho(e.target.value)} className={textareaClass} />
                </div>
                <div>
                  <FieldLabel>Temperatura frío-calor</FieldLabel>
                  <Textarea rows={2} value={sensitivity_temperatura} onChange={(e) => setSensitivityTemperatura(e.target.value)} className={textareaClass} />
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>Observaciones</FieldLabel>
              <Textarea rows={2} value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} className={textareaClass} />
            </div>

            {/* Tabla Kendall */}
            <Collapsible open={show_daniels} onOpenChange={setShowDaniels}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-sm text-gray-700 mt-2 border border-gray-200 rounded-lg">
                  <span className="font-semibold">Tabla Kendall (por nervio)</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${show_daniels ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Tabs defaultValue="median" className="mt-3">
                  <TabsList className="w-full">
                    <TabsTrigger value="median" className="flex-1 text-xs">N. Mediano</TabsTrigger>
                    <TabsTrigger value="cubital" className="flex-1 text-xs">N. Cubital</TabsTrigger>
                    <TabsTrigger value="radial" className="flex-1 text-xs">N. Radial</TabsTrigger>
                  </TabsList>
                  <TabsContent value="median">
                    <DanielsTable muscles={MEDIAN_MUSCLES} values={daniels_median} onChange={(k, v) => setDanielsMedian((p) => ({ ...p, [k]: v }))} />
                  </TabsContent>
                  <TabsContent value="cubital">
                    <DanielsTable muscles={CUBITAL_MUSCLES} values={daniels_cubital} onChange={(k, v) => setDanielsCubital((p) => ({ ...p, [k]: v }))} />
                  </TabsContent>
                  <TabsContent value="radial">
                    <DanielsTable muscles={RADIAL_MUSCLES} values={daniels_radial} onChange={(k, v) => setDanielsRadial((p) => ({ ...p, [k]: v }))} />
                  </TabsContent>
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          </SubSection>

          {/* Cicatriz */}
          <SubSection
            title="Cicatriz"
            checked={showCicatriz}
            onChange={setShowCicatriz}
            badge={
              vssTotalLive > 0 ? (
                <Badge variant="secondary" className="text-[10px]">VSS {vssTotalLive}/15</Badge>
              ) : null
            }
          >
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Planilla</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Localización</FieldLabel>
                  <Input value={scar_localizacion} onChange={(e) => setScarLocalizacion(e.target.value)} placeholder={SCAR_PLACEHOLDER} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Longitud (cm)</FieldLabel>
                  <Input type="number" step="0.1" min={0} value={scar_longitud} onChange={(e) => setScarLongitud(e.target.value)} placeholder={SCAR_PLACEHOLDER} className={inputClass} />
                </div>
                <div>
                  <FieldLabel>Vascularización</FieldLabel>
                  <Select value={scar_vascularizacion} onValueChange={setScarVascularizacion}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.vascularizacion.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Pigmentación</FieldLabel>
                  <Select value={scar_pigmentacion} onValueChange={setScarPigmentacion}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.pigmentacion.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Flexibilidad</FieldLabel>
                  <Select value={scar_flexibilidad} onValueChange={setScarFlexibilidad}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.flexibilidad.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Sensibilidad</FieldLabel>
                  <Select value={scar_sensibilidad} onValueChange={setScarSensibilidad}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.sensibilidad.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Relieve</FieldLabel>
                  <Select value={scar_relieve} onValueChange={setScarRelieve}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.relieve.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Temperatura</FieldLabel>
                  <Select value={scar_temperatura} onValueChange={setScarTemperatura}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {SCAR_OPTIONS.temperatura.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <FieldLabel>Observaciones / Impresión estética</FieldLabel>
                <Textarea rows={2} value={scar_observaciones} onChange={(e) => setScarObservaciones(e.target.value)} className={textareaClass} />
              </div>
            </div>

            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Escala Vancouver VSS</p>
                <Badge variant="secondary">Total: {vssTotalLive}/15</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Pigmentación</FieldLabel>
                  <Select value={vss_pigmentacion} onValueChange={setVssPigmentacion}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {VSS_OPTIONS.pigmentacion.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Vascularización</FieldLabel>
                  <Select value={vss_vascularizacion} onValueChange={setVssVascularizacion}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {VSS_OPTIONS.vascularizacion.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Flexibilidad</FieldLabel>
                  <Select value={vss_flexibilidad} onValueChange={setVssFlexibilidad}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {VSS_OPTIONS.flexibilidad.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Altura</FieldLabel>
                  <Select value={vss_altura} onValueChange={setVssAltura}>
                    <SelectTrigger className={inputClass}><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                    <SelectContent position="popper">
                      {VSS_OPTIONS.altura.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SubSection>

          {/* Pruebas específicas */}
          <SubSection title="Pruebas específicas" checked={showSpecificTests} onChange={setShowSpecificTests}>
            <div className="flex flex-wrap gap-2">
              {SPECIFIC_TESTS.map((t) => {
                const val = specificTests[t.key];
                return (
                  <Button
                    key={t.key}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-9 text-xs gap-1.5 rounded-full border-gray-200 ${
                      val === "positive"
                        ? "border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        : val === "negative"
                        ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                        : ""
                    }`}
                    onClick={() => cycleTest(t.key)}
                  >
                    {t.label}
                    {val === "positive" && <span className="font-bold text-red-600">+</span>}
                    {val === "negative" && <span className="font-bold text-green-600">−</span>}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Clic para alternar: sin evaluar → positivo (+) → negativo (−)</p>
          </SubSection>

          {/* Otros */}
          <SubSection title="Otros" checked={showOtros} onChange={setShowOtros}>
            <div>
              <FieldLabel>Estado trófico</FieldLabel>
              <Textarea rows={2} value={trophic_state} onChange={(e) => setTrophicState(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Postura</FieldLabel>
              <Textarea rows={2} value={posture} onChange={(e) => setPosture(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Emotividad</FieldLabel>
              <Textarea rows={2} value={emotional_state} onChange={(e) => setEmotionalState(e.target.value)} className={textareaClass} />
            </div>
          </SubSection>
        </SectionCard>

        {/* Card 4: Intervenciones */}
        <SectionCard icon={ClipboardList} title="Intervenciones">
          <FieldLabel>En el día de hoy se abordó</FieldLabel>
          <Textarea rows={5} value={interventions} onChange={(e) => setInterventions(e.target.value)} className={textareaClass} />
        </SectionCard>

        {/* Card 5: Indicaciones y notas */}
        <SectionCard icon={MessageSquare} title="Indicaciones y notas">
          <div className="space-y-4">
            <div>
              <FieldLabel>Indicaciones enviadas al paciente</FieldLabel>
              <Textarea rows={3} value={home_instructions_sent} onChange={(e) => setHomeInstructionsSent(e.target.value)} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Notas internas</FieldLabel>
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={textareaClass} />
              <p className="text-xs text-muted-foreground mt-1">Campo interno, no visible en el resumen clínico</p>
            </div>
          </div>
        </SectionCard>
      </main>

      {/* Sticky bottom bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || !session_date}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar sesión
          </Button>
        </div>
      </footer>
    </div>
  );
}
