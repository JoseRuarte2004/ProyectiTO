import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInYears } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ArrowLeft, Loader2, ChevronDown } from "lucide-react";
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
const DANIELS_GRADES = ["0","1","1+","2","2-","2+","3","3-","3+","4","4-","4+","5"];

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
  return name.toLowerCase().replace(/[áéíóú]/g, m => ({ á: "a", é: "e", í: "i", ó: "o", ú: "u" } as any)[m] || m).replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

function DanielsTable({ muscles, values, onChange }: { muscles: string[]; values: Record<string, string>; onChange: (k: string, v: string) => void }) {
  return (
    <div className="space-y-1">
      {muscles.map(m => {
        const k = muscleKey(m);
        return (
          <div key={k} className="flex items-center gap-2">
            <span className="text-xs flex-1 min-w-0 truncate">{m}</span>
            <Select value={values[k] || ""} onValueChange={v => onChange(k, v)}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {DANIELS_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
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

  // Measurements toggle
  const [show_measurements, setShowMeasurements] = useState(false);

  // Pain
  const [pain_touched, setPainTouched] = useState(false);
  const [pain_score, setPainScore] = useState(0);
  const [pain_location, setPainLocation] = useState("");
  const [pain_characteristics, setPainCharacteristics] = useState("");
  const [pain_aggravating_factors, setPainAggravatingFactors] = useState("");
  const [pain_radiates, setPainRadiates] = useState(false);
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
  const emptyGonio = () => ({ shoulder: {}, elbow: {}, wrist: {}, hand: {}, thumb: {} } as Record<GonioPartKey, Record<string, string>>);
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
  const [dppd, setDppd] = useState("");
  const [muscle_strength, setMuscleStrength] = useState("");

  // Daniels by nerve
  const [daniels_median, setDanielsMedian] = useState<Record<string, string>>({});
  const [daniels_cubital, setDanielsCubital] = useState<Record<string, string>>({});
  const [daniels_radial, setDanielsRadial] = useState<Record<string, string>>({});
  const [show_daniels, setShowDaniels] = useState(false);

  // Specific tests
  const [specificTests, setSpecificTests] = useState<Record<string, TestResult>>(
    Object.fromEntries(SPECIFIC_TESTS.map(t => [t.key, null]))
  );

  // Sensitivity
  const [sensitivity, setSensitivity] = useState("");
  const [sensitivity_functional, setSensitivityFunctional] = useState("");
  const [sensitivity_protective, setSensitivityProtective] = useState("");

  // Trophic & others
  const [trophic_state, setTrophicState] = useState("");
  const [scar, setScar] = useState("");
  const [vancouver_score, setVancouverScore] = useState("");
  const [osas_score, setOsasScore] = useState("");
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
        supabase.from("therapy_sessions").select("id", { count: "exact", head: true }).eq("patient_id", patientId).eq("is_deleted", false),
      ]);
      setPatient(p.data);
      setClinical(c.data);
      if (sc.count != null) setSessionNumber(String(sc.count + 1));

      if (!episodeIdParam) {
        const { data: ep } = await supabase
          .from("treatment_episodes").select("id")
          .eq("patient_id", patientId).eq("status", "active").eq("is_deleted", false)
          .order("episode_number", { ascending: false }).limit(1).single();
        if (ep) setActiveEpisodeId(ep.id);
      }
      setLoading(false);
    };
    load();
  }, [patientId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <p className="text-center text-muted-foreground py-12">Paciente no encontrado.</p>;

  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  // ── Gonio helpers (nested per-part) ──
  const buildAllGonioText = (allVals: Record<GonioPartKey, Record<string, string>>) => {
    const parts: string[] = [];
    for (const pk of Object.keys(GONIO_PARTS) as GonioPartKey[]) {
      const vals = allVals[pk];
      const fields = GONIO_PARTS[pk].fields;
      const entries = fields.map(f => vals[f.key] ? `${f.label}:${vals[f.key]}°` : "").filter(Boolean);
      if (entries.length > 0) parts.push(`[${GONIO_PARTS[pk].label}] ${entries.join(" ")}`);
    }
    return parts.length > 0 ? parts.join(" ") : null;
  };

  const buildAllGonioJsonArray = (allVals: Record<GonioPartKey, Record<string, string>>) => {
    const arr: { body_part: string; values: Record<string, number> }[] = [];
    for (const pk of Object.keys(GONIO_PARTS) as GonioPartKey[]) {
      const vals = allVals[pk];
      const filled = Object.fromEntries(
        GONIO_PARTS[pk].fields.map(f => [f.key, vals[f.key] ? Number(vals[f.key]) : null]).filter(([, v]) => v != null)
      );
      if (Object.keys(filled).length > 0) arr.push({ body_part: pk, values: filled as Record<string, number> });
    }
    return arr.length > 0 ? arr : null;
  };

  const cycleTest = (key: string) => {
    setSpecificTests(prev => {
      const cur = prev[key];
      const next: TestResult = cur === null ? "positive" : cur === "positive" ? "negative" : null;
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    if (!session_date || !user) return;
    setSaving(true);

    // Build derived values
    const painLocFinal = [pain_location, pain_radiates && pain_radiation ? `Irradia a: ${pain_radiation}` : ""].filter(Boolean).join(" — ") || null;

    const circParts: string[] = [];
    if (circ_wrist_msd || circ_global_msd) circParts.push(`MSD: ${circ_wrist_msd || "-"}cm muñeca / ${circ_global_msd || "-"}cm global`);
    if (circ_wrist_msi || circ_global_msi) circParts.push(`MSI: ${circ_wrist_msi || "-"}cm muñeca / ${circ_global_msi || "-"}cm global`);
    const edemaCirc = circParts.length > 0 ? circParts.join(" | ") : null;

    const aromVal = buildAllGonioText(all_pre_gonio);
    const promVal = show_post_gonio ? buildAllGonioText(all_post_gonio) : null;

    const preJsonArr = buildAllGonioJsonArray(all_pre_gonio);
    const postJsonArr = show_post_gonio ? buildAllGonioJsonArray(all_post_gonio) : null;
    const gonioJsonb = preJsonArr || postJsonArr ? { pre: preJsonArr, post: postJsonArr } : null;

    const kapandjiFinal = kapandji_val ? `${kapandji_val}/10${kapandji_pain ? " con dolor" : ""}` : null;

    const msParts: string[] = [];
    if (fist_closure) msParts.push(`Cierre de puño: ${fist_closure}`);
    if (dppd) msParts.push(`DPPD: ${dppd}cm`);
    if (muscle_strength) msParts.push(muscle_strength);
    const msVal = msParts.length > 0 ? msParts.join(" — ") : null;

    const generalObsFinal = session_type === "admission"
      ? discharge_summary || general_observations || null
      : [discharge_summary, general_observations].filter(Boolean).join("\n\n") || null;

    // Specific tests JSONB
    const hasTests = Object.values(specificTests).some(v => v !== null);
    const specificTestsJson = hasTests ? Object.fromEntries(
      Object.entries(specificTests).map(([k, v]) => [k, v])
    ) : null;

    // Daniels by nerve
    const hasMedian = Object.values(daniels_median).some(v => v);
    const hasCubital = Object.values(daniels_cubital).some(v => v);
    const hasRadial = Object.values(daniels_radial).some(v => v);
    const medianJson = hasMedian ? JSON.stringify(daniels_median) : null;
    const cubitalJson = hasCubital ? JSON.stringify(daniels_cubital) : null;
    const radialJson = hasRadial ? JSON.stringify(daniels_radial) : null;

    // Insert session
    const { data: session, error } = await supabase.from("therapy_sessions").insert({
      patient_id: patientId!, professional_id: user.id, is_deleted: false,
      episode_id: activeEpisodeId,
      session_date, session_type: session_type || null,
      session_number: session_number ? parseInt(session_number) : null,
      week_at_session: week_at_session ? parseInt(week_at_session) : null,
      general_observations: generalObsFinal,
      symptom_changes: symptom_changes || null,
      clinical_changes: clinical_changes || null,
      avd_followup: avd_followup || null,
      interventions: interventions || null,
      home_instructions_sent: home_instructions_sent || null,
      notes: notes || null,
    } as any).select().single();

    if (error || !session) { setSaving(false); toast.error("Error al guardar la sesión"); return; }

    // Functional eval for admission
    if (session_type === "admission" && [func_dominance, func_avd, func_aivd, func_sleep, func_health, func_barthel, func_dash].some(v => v)) {
      const { error: feErr } = await supabase.from("functional_evaluations").insert({
        patient_id: patientId!, professional_id: user.id,
        episode_id: activeEpisodeId,
        evaluation_date: session_date,
        dominance: (func_dominance || null) as any,
        avd: func_avd || null, aivd: func_aivd || null,
        sleep_rest: func_sleep || null, health_management: func_health || null,
        barthel_score: func_barthel ? parseInt(func_barthel) : null,
        dash_score: func_dash ? parseInt(func_dash) : null,
      } as any);
      if (feErr) console.error("Error inserting func eval:", feErr);
    }

    // Analytical eval if measurements
    const hasMeasurements = show_measurements && [
      pain_touched && pain_score > 0, painLocFinal, pain_characteristics,
      pain_aggravating_factors, pain_appearance, pain_free, edema_obs, godet_test,
      edemaCirc, aromVal, promVal, fist_closure,
      dyn_msd, dyn_msi, kapandjiFinal, msVal,
      sensitivity, sensitivity_functional, sensitivity_protective,
      trophic_state, scar, vancouver_score, osas_score,
      posture, emotional_state,
      specificTestsJson, medianJson, cubitalJson, radialJson, gonioJsonb,
    ].some(v => v !== "" && v !== null && v !== undefined && v !== false);

    if (hasMeasurements) {
      const { error: aeErr } = await supabase.from("analytical_evaluations").insert({
        patient_id: patientId!, professional_id: user.id,
        episode_id: activeEpisodeId,
        session_id: session.id, evaluation_date: session_date,
        pain_score: pain_touched ? pain_score : null,
        pain_appearance: pain_appearance || null,
        pain_location: painLocFinal,
        pain_characteristics: pain_characteristics || null,
        pain_aggravating_factors: pain_aggravating_factors || null,
        pain: pain_free || null,
        edema: edema_obs || null,
        godet_test: godet_test || null,
        edema_circummetry: edemaCirc,
        arom: aromVal, prom: promVal,
        goniometry: gonioJsonb,
        dynamometer_msd: dyn_msd ? parseFloat(dyn_msd) : null,
        dynamometer_msi: dyn_msi ? parseFloat(dyn_msi) : null,
        kapandji: kapandjiFinal,
        muscle_strength: msVal,
        muscle_strength_median: medianJson,
        muscle_strength_cubital: cubitalJson,
        muscle_strength_radial: radialJson,
        specific_tests: specificTestsJson,
        sensitivity: sensitivity || null,
        sensitivity_functional: sensitivity_functional || null,
        sensitivity_protective: sensitivity_protective || null,
        trophic_state: trophic_state || null,
        scar: scar || null,
        vancouver_score: vancouver_score ? parseInt(vancouver_score) : null,
        osas_score: osas_score ? parseInt(osas_score) : null,
        posture: posture || null,
        emotional_state: emotional_state || null,
      });
      if (aeErr) { setSaving(false); toast.error("Error al guardar la sesión"); return; }
    }

    setSaving(false);
    toast.success("Sesión registrada correctamente");
    navigate(`/patients/${patientId}`);
  };

  const GonioGrid = ({ partKey, values, setValues }: { partKey: GonioPartKey; values: Record<string, string>; setValues: (v: Record<string, string>) => void }) => {
    const fields = GONIO_PARTS[partKey].fields;
    return (
      <div className="grid grid-cols-3 gap-3">
        {fields.map(f => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{f.label} °</Label>
            <Input type="number" placeholder={f.norm} value={values[f.key] || ""} onChange={e => setValues({ ...values, [f.key]: e.target.value })} />
          </div>
        ))}
      </div>
    );
  };

  const GonioPartSelector = ({ value, onChange }: { value: GonioPartKey; onChange: (v: GonioPartKey) => void }) => (
    <div className="flex flex-wrap gap-1 mb-3">
      {(Object.keys(GONIO_PARTS) as GonioPartKey[]).map(k => (
        <Button key={k} type="button" size="sm" variant={value === k ? "default" : "outline"}
          className={value === k ? "bg-teal-600 hover:bg-teal-700 text-white h-7 text-xs" : "h-7 text-xs"}
          onClick={() => onChange(k)}>
          {GONIO_PARTS[k].label}
        </Button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/patients/${patientId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {patient.last_name}, {patient.first_name}
        </Button>
        {clinical?.diagnosis && (
          <span className="text-xs px-3 py-1 rounded-full bg-teal-50 text-teal-700 font-medium hidden sm:inline-block">
            {clinical.diagnosis}
          </span>
        )}
        <Button onClick={handleSave} disabled={saving || !session_date} className="bg-teal-600 hover:bg-teal-700 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Guardar sesión
        </Button>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Section 1: Session Data */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos de la sesión</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={session_date} onChange={e => setSessionDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Tipo de sesión</Label>
                <Select value={session_type} onValueChange={setSessionType} disabled={typeParam === "admission"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {typeParam === "admission" && <SelectItem value="admission">Admisión</SelectItem>}
                    <SelectItem value="follow_up">Seguimiento</SelectItem>
                    <SelectItem value="discharge">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº de sesión</Label>
                <Input type="number" min={1} value={session_number} onChange={e => setSessionNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semanas POP/PL</Label>
                <Input type="number" min={0} placeholder="ej: 6" value={week_at_session} onChange={e => setWeekAtSession(e.target.value)} />
              </div>
            </div>
            {session_type === "discharge" && (
              <div className="space-y-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Label className="text-green-800">Resumen de alta / objetivos cumplidos</Label>
                <Textarea rows={3} value={discharge_summary} onChange={e => setDischargeSummary(e.target.value)} placeholder="Motivo del alta, objetivos cumplidos..." />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Functional Eval (admission only) */}
        {session_type === "admission" && (
          <Card>
            <CardHeader><CardTitle className="text-base">Evaluación Funcional</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lateralidad</Label>
                <Select value={func_dominance} onValueChange={setFuncDominance}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Diestro/a</SelectItem>
                    <SelectItem value="left">Zurdo/a</SelectItem>
                    <SelectItem value="ambidextrous">Ambidiestro/a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AVD — Actividades de la vida diaria</Label>
                <Textarea rows={3} value={func_avd} onChange={e => setFuncAvd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>AIVD — Actividades instrumentales</Label>
                <Textarea rows={3} value={func_aivd} onChange={e => setFuncAivd(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sueño y descanso</Label>
                <Textarea rows={2} value={func_sleep} onChange={e => setFuncSleep(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Gestión de la salud</Label>
                <Textarea rows={2} value={func_health} onChange={e => setFuncHealth(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puntaje Barthel (0-100)</Label>
                  <Input type="number" min={0} max={100} value={func_barthel} onChange={e => setFuncBarthel(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Puntaje DASH (0-100)</Label>
                  <Input type="number" min={0} max={100} value={func_dash} onChange={e => setFuncDash(e.target.value)} />
                  <p className="text-xs text-muted-foreground">0 = sin discapacidad · 100 = máxima discapacidad</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 3: Evolution (follow_up or discharge) */}
        {(session_type === "follow_up" || session_type === "discharge") && (
          <Card>
            <CardHeader><CardTitle className="text-base">Evolución</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nota de evolución</Label>
                <Textarea rows={4} placeholder={`Paciente asiste a ${session_number ? session_number + "ra" : "X"} sesión, cursando su ${week_at_session || "X"}ma semana POP/PL...`} value={general_observations} onChange={e => setGeneralObservations(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cambios en síntomas</Label>
                <Textarea rows={2} value={symptom_changes} onChange={e => setSymptomChanges(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cambios clínicos</Label>
                <Textarea rows={2} value={clinical_changes} onChange={e => setClinicalChanges(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>AVD — ¿Cómo está realizando las actividades de la vida diaria?</Label>
                <Textarea rows={2} placeholder="Preguntarle al paciente sobre baño, vestido, alimentación, traslados..." value={avd_followup} onChange={e => setAvdFollowup(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 4: Measurements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Mediciones del día</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="meas-toggle" className="text-sm font-normal text-muted-foreground">Registrar mediciones</Label>
                <Switch id="meas-toggle" checked={show_measurements} onCheckedChange={setShowMeasurements} />
              </div>
            </div>
          </CardHeader>
          {show_measurements && (
            <CardContent className="space-y-6">
              {/* Pain */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Dolor EVA</h4>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={10} step={1} value={[pain_score]} onValueChange={([v]) => { setPainScore(v); setPainTouched(true); }} className="flex-1" />
                  <Badge variant="outline" className="text-sm font-semibold w-8 justify-center">{pain_score}</Badge>
                </div>
                <div className="space-y-2"><Label>Aparición</Label><Input value={pain_appearance} onChange={e => setPainAppearance(e.target.value)} /></div>
                <div className="space-y-2"><Label>Localización</Label><Input value={pain_location} onChange={e => setPainLocation(e.target.value)} /></div>
                <div className="space-y-2"><Label>Características (urente, punzante, etc.)</Label><Input value={pain_characteristics} onChange={e => setPainCharacteristics(e.target.value)} /></div>
                <div className="space-y-2"><Label>Agravantes / atenuantes</Label><Textarea rows={2} value={pain_aggravating_factors} onChange={e => setPainAggravatingFactors(e.target.value)} /></div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={pain_radiates} onCheckedChange={v => setPainRadiates(!!v)} />
                  <Label className="font-normal">Irradia</Label>
                </div>
                {pain_radiates && (
                  <div className="space-y-2"><Label>¿Hacia dónde?</Label><Input value={pain_radiation} onChange={e => setPainRadiation(e.target.value)} /></div>
                )}
                <div className="space-y-2"><Label>Descripción libre del dolor</Label><Textarea rows={2} value={pain_free} onChange={e => setPainFree(e.target.value)} /></div>
              </div>

              {/* Edema */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Edema</h4>
                <div className="space-y-2"><Label>Observación de edema</Label><Textarea rows={2} value={edema_obs} onChange={e => setEdemaObs(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Test de Godet</Label>
                  <Select value={godet_test} onValueChange={setGodetTest}>
                    <SelectTrigger><SelectValue placeholder="No evaluado" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_evaluated">No evaluado</SelectItem>
                      <SelectItem value="negative">Negativo</SelectItem>
                      <SelectItem value="1+">1+</SelectItem>
                      <SelectItem value="2+">2+</SelectItem>
                      <SelectItem value="3+">3+</SelectItem>
                      <SelectItem value="4+">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Circummetry */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Circometría</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Muñeca MSD (cm)</Label><Input type="number" step="0.1" value={circ_wrist_msd} onChange={e => setCircWristMsd(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Muñeca MSI (cm)</Label><Input type="number" step="0.1" value={circ_wrist_msi} onChange={e => setCircWristMsi(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Global MSD (cm)</Label><Input type="number" step="0.1" value={circ_global_msd} onChange={e => setCircGlobalMsd(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Global MSI (cm)</Label><Input type="number" step="0.1" value={circ_global_msi} onChange={e => setCircGlobalMsi(e.target.value)} /></div>
                </div>
              </div>

              {/* Goniometry PRE */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Goniometría PRE tratamiento</h4>
                <GonioPartSelector value={gonio_part} onChange={setGonioPart} />
                <GonioGrid partKey={gonio_part} values={all_pre_gonio[gonio_part]} setValues={v => setAllPreGonio(prev => ({ ...prev, [gonio_part]: v }))} />
              </div>

              {/* Goniometry POST */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={show_post_gonio} onCheckedChange={v => setShowPostGonio(!!v)} />
                  <Label className="font-normal">Registrar goniometría post-tratamiento</Label>
                </div>
                {show_post_gonio && (
                  <>
                    <GonioPartSelector value={gonio_part_post} onChange={setGonioPartPost} />
                    <GonioGrid partKey={gonio_part_post} values={all_post_gonio[gonio_part_post]} setValues={v => setAllPostGonio(prev => ({ ...prev, [gonio_part_post]: v }))} />
                  </>
                )}
              </div>

              {/* Fist closure */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Movilidad complementaria</h4>
                <div className="space-y-2">
                  <Label>Cierre de puño</Label>
                  <Input value={fist_closure} onChange={e => setFistClosure(e.target.value)} placeholder="Completo / Incompleto con tirantez por edema" />
                </div>
              </div>

              {/* Strength & Kapandji */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Fuerza y Kapandji</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Dinamómetro MSD (kg)</Label><Input type="number" step="0.1" value={dyn_msd} onChange={e => setDynMsd(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Dinamómetro MSI (kg)</Label><Input type="number" step="0.1" value={dyn_msi} onChange={e => setDynMsi(e.target.value)} /></div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="space-y-2 flex-1"><Label>Kapandji (0-10)</Label><Input type="number" min={0} max={10} value={kapandji_val} onChange={e => setKapandjiVal(e.target.value)} /></div>
                  <div className="flex items-center gap-2 pb-2">
                    <Checkbox checked={kapandji_pain} onCheckedChange={v => setKapandjiPain(!!v)} />
                    <Label className="font-normal text-sm">Con dolor</Label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>DPPD (cm)</Label><Input type="number" step="0.1" value={dppd} onChange={e => setDppd(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Fuerza muscular obs.</Label><Input value={muscle_strength} onChange={e => setMuscleStrength(e.target.value)} /></div>
                </div>

                {/* Daniels by nerve */}
                <Collapsible open={show_daniels} onOpenChange={setShowDaniels}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground mt-2">
                      Fuerza muscular por nervio (Daniels)
                      <ChevronDown className={`h-4 w-4 transition-transform ${show_daniels ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Tabs defaultValue="median" className="mt-2">
                      <TabsList className="w-full">
                        <TabsTrigger value="median" className="flex-1 text-xs">N. Mediano</TabsTrigger>
                        <TabsTrigger value="cubital" className="flex-1 text-xs">N. Cubital</TabsTrigger>
                        <TabsTrigger value="radial" className="flex-1 text-xs">N. Radial</TabsTrigger>
                      </TabsList>
                      <TabsContent value="median">
                        <DanielsTable muscles={MEDIAN_MUSCLES} values={daniels_median} onChange={(k, v) => setDanielsMedian(p => ({ ...p, [k]: v }))} />
                      </TabsContent>
                      <TabsContent value="cubital">
                        <DanielsTable muscles={CUBITAL_MUSCLES} values={daniels_cubital} onChange={(k, v) => setDanielsCubital(p => ({ ...p, [k]: v }))} />
                      </TabsContent>
                      <TabsContent value="radial">
                        <DanielsTable muscles={RADIAL_MUSCLES} values={daniels_radial} onChange={(k, v) => setDanielsRadial(p => ({ ...p, [k]: v }))} />
                      </TabsContent>
                    </Tabs>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* Specific tests */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Pruebas específicas</h4>
                <div className="flex flex-wrap gap-2">
                  {SPECIFIC_TESTS.map(t => {
                    const val = specificTests[t.key];
                    return (
                      <Button key={t.key} type="button" variant="outline" size="sm"
                        className={`h-8 text-xs gap-1.5 ${val === "positive" ? "border-red-300 bg-red-50 text-red-700" : val === "negative" ? "border-green-300 bg-green-50 text-green-700" : ""}`}
                        onClick={() => cycleTest(t.key)}>
                        {t.label}
                        {val === "positive" && <span className="font-bold text-red-600">+</span>}
                        {val === "negative" && <span className="font-bold text-green-600">−</span>}
                      </Button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">Clic para alternar: sin evaluar → positivo (+) → negativo (−)</p>
              </div>

              {/* Sensitivity */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Sensibilidad</h4>
                <div className="space-y-2"><Label>Sensibilidad epicrítica (funcional)</Label><Textarea rows={2} placeholder="Tacto ligero, discriminación 2 puntos, picking up test..." value={sensitivity_functional} onChange={e => setSensitivityFunctional(e.target.value)} /></div>
                <div className="space-y-2"><Label>Sensibilidad protopática (protectora)</Label><Textarea rows={2} placeholder="Toco-pincho, temperatura frío-calor..." value={sensitivity_protective} onChange={e => setSensitivityProtective(e.target.value)} /></div>
                <div className="space-y-2"><Label>Observaciones de sensibilidad</Label><Textarea rows={2} value={sensitivity} onChange={e => setSensitivity(e.target.value)} /></div>
              </div>

              {/* Trophic & others */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Estado trófico y otros</h4>
                <div className="space-y-2"><Label>Estado trófico</Label><Textarea rows={2} value={trophic_state} onChange={e => setTrophicState(e.target.value)} /></div>
                <div className="space-y-2"><Label>Cicatriz</Label><Textarea rows={2} value={scar} onChange={e => setScar(e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Vancouver VSS (0-15)</Label><Input type="number" min={0} max={15} value={vancouver_score} onChange={e => setVancouverScore(e.target.value)} /></div>
                  <div className="space-y-2"><Label>OSAS (0-60)</Label><Input type="number" min={0} max={60} value={osas_score} onChange={e => setOsasScore(e.target.value)} /></div>
                </div>
                <div className="space-y-2"><Label>Postura</Label><Textarea rows={2} value={posture} onChange={e => setPosture(e.target.value)} /></div>
                <div className="space-y-2"><Label>Emotividad</Label><Textarea rows={2} value={emotional_state} onChange={e => setEmotionalState(e.target.value)} /></div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Section 5: Interventions */}
        <Card>
          <CardHeader><CardTitle className="text-base">Intervenciones</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label>En el día de hoy se abordó</Label>
              <Textarea rows={5} value={interventions} onChange={e => setInterventions(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Instructions & Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Indicaciones y notas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Indicaciones enviadas al paciente</Label>
              <Textarea rows={3} value={home_instructions_sent} onChange={e => setHomeInstructionsSent(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pendientes / notas internas</Label>
              <Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
              <p className="text-xs text-muted-foreground">Campo interno — no se muestra en el resumen clínico</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
