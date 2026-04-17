import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ChevronDown } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

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
const DANIELS_GRADES = ["0","1","2","3","4","5"];
const DANIELS_FULL_GRADES = ["0","1","1+","2-","2","2+","3-","3","3+","4-","4","4+","5"];

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

// ── Vancouver VSS: opciones por dimensión ──
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
    { v: "1", label: "1 — Suave, flexible con mínima resistencia" },
    { v: "2", label: "2 — Cedente, cede a la presión" },
    { v: "3", label: "3 — Firme, inflexible, resistente a la presión manual" },
    { v: "4", label: "4 — Cordón: tejido tipo soga que se blanquea al extender" },
    { v: "5", label: "5 — Contractura: acortamiento permanente que produce deformidad" },
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

export function NewPatientForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [evaTouched, setEvaTouched] = useState(false);

  // Card 1 — Patient data
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dni, setDni] = useState("");
  const [nationality, setNationality] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [insurance, setInsurance] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);

  // Card 2 — Clinical data
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [injuryDate, setInjuryDate] = useState("");
  const [surgeryDate, setSurgeryDate] = useState("");
  const [injuryMechanism, setInjuryMechanism] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [weeksPostInjury, setWeeksPostInjury] = useState("");
  const [daysPostInjury, setDaysPostInjury] = useState("");
  const [weeksPostSurgery, setWeeksPostSurgery] = useState("");
  const [daysPostSurgery, setDaysPostSurgery] = useState("");
  const [immobilizationWeeks, setImmobilizationWeeks] = useState("");
  const [immobilizationDays, setImmobilizationDays] = useState("");
  const [immobilizationType, setImmobilizationType] = useState("");
  const [nextOyt, setNextOyt] = useState("");
  const [studies, setStudies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [pharma, setPharma] = useState("");

  // Card 3 — Occupational profile
  const [dominance, setDominance] = useState("");
  const [supportNetwork, setSupportNetwork] = useState("");
  const [education, setEducation] = useState("");
  const [job, setJob] = useState("");
  const [leisure, setLeisure] = useState("");
  const [physicalActivity, setPhysicalActivity] = useState("");
  const [sleepRest, setSleepRest] = useState("");
  const [healthManagement, setHealthManagement] = useState("");

  // Card 4 — Functional evaluation
  const [avd, setAvd] = useState("");
  const [aivd, setAivd] = useState("");
  const [barthelScore, setBarthelScore] = useState("");
  const [dashScore, setDashScore] = useState("");
  const [funcNotes, setFuncNotes] = useState("");

  // Card 5 — Analytical evaluation
  const [painScore, setPainScore] = useState<number>(0);
  const [painAppearance, setPainAppearance] = useState("");
  const [painLocation, setPainLocation] = useState("");
  const [painRadiation, setPainRadiation] = useState("");
  const [painCharacteristics, setPainCharacteristics] = useState("");
  const [painAggravating, setPainAggravating] = useState("");
  const [painFree, setPainFree] = useState("");
  const [edema, setEdema] = useState("");
  const [godetTest, setGodetTest] = useState("");
  const [kapandjiVal, setKapandjiVal] = useState("");
  const [kapandjiPain, setKapandjiPain] = useState(false);
  const [fistClosure, setFistClosure] = useState("");
  const [dynamometerMsd, setDynamometerMsd] = useState("");
  const [dynamometerMsi, setDynamometerMsi] = useState("");
  const [muscleStrength, setMuscleStrength] = useState("");
  const [sensitivityTactoLigero, setSensitivityTactoLigero] = useState("");
  const [sensitivityDosPuntos, setSensitivityDosPuntos] = useState("");
  const [sensitivityPickingUp, setSensitivityPickingUp] = useState("");
  const [sensitivitySemmesWeinstein, setSensitivitySemmesWeinstein] = useState("");
  const [sensitivityTocoPincho, setSensitivityTocoPincho] = useState("");
  const [sensitivityTemperatura, setSensitivityTemperatura] = useState("");
  const [sensitivity, setSensitivity] = useState("");
  // DPPD 5 fingers
  const [dppdPulgar, setDppdPulgar] = useState("");
  const [dppdIndice, setDppdIndice] = useState("");
  const [dppdMedio, setDppdMedio] = useState("");
  const [dppdAnular, setDppdAnular] = useState("");
  const [dppdMenique, setDppdMenique] = useState("");
  const [trophicState, setTrophicState] = useState("");
  // Cicatriz — Planilla
  const [scarLocalizacion, setScarLocalizacion] = useState("");
  const [scarLongitud, setScarLongitud] = useState("");
  const [scarVascularizacion, setScarVascularizacion] = useState("");
  const [scarPigmentacion, setScarPigmentacion] = useState("");
  const [scarFlexibilidad, setScarFlexibilidad] = useState("");
  const [scarSensibilidad, setScarSensibilidad] = useState("");
  const [scarRelieve, setScarRelieve] = useState("");
  const [scarTemperatura, setScarTemperatura] = useState("");
  const [scarObservaciones, setScarObservaciones] = useState("");
  // Cicatriz — Vancouver VSS
  const [vssPigmentacion, setVssPigmentacion] = useState("");
  const [vssVascularizacion, setVssVascularizacion] = useState("");
  const [vssFlexibilidad, setVssFlexibilidad] = useState("");
  const [vssAltura, setVssAltura] = useState("");
  const [posture, setPosture] = useState("");
  const [emotionalState, setEmotionalState] = useState("");
  const [analNotes, setAnalNotes] = useState("");

  // Structured goniometry — nested by body part
  const emptyGonio = () => ({ shoulder: {}, elbow: {}, wrist: {}, hand: {}, thumb: {} } as Record<GonioPartKey, Record<string, string>>);
  const [gonioPart, setGonioPart] = useState<GonioPartKey>("wrist");
  const [allPreGonio, setAllPreGonio] = useState(emptyGonio);
  const [showPostGonio, setShowPostGonio] = useState(false);
  const [gonioPartPost, setGonioPartPost] = useState<GonioPartKey>("wrist");
  const [allPostGonio, setAllPostGonio] = useState(emptyGonio);

  // Circummetry grid
  const [circWristMsd, setCircWristMsd] = useState("");
  const [circWristMsi, setCircWristMsi] = useState("");
  const [circGlobalMsd, setCircGlobalMsd] = useState("");
  const [circGlobalMsi, setCircGlobalMsi] = useState("");

  // Specific tests
  const [specificTests, setSpecificTests] = useState<Record<string, TestResult>>(
    Object.fromEntries(SPECIFIC_TESTS.map(t => [t.key, null]))
  );

  // Daniels
  const [danielsMedian, setDanielsMedian] = useState<Record<string, string>>({});
  const [danielsCubital, setDanielsCubital] = useState<Record<string, string>>({});
  const [danielsRadial, setDanielsRadial] = useState<Record<string, string>>({});
  const [showDaniels, setShowDaniels] = useState(false);

  // Card 6 — Admission session
  const [interventions, setInterventions] = useState("");
  const [homeInstructions, setHomeInstructions] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  // ── Auto week calculation ──
  useEffect(() => {
    if (injuryDate && admissionDate) {
      const days = differenceInCalendarDays(new Date(admissionDate), new Date(injuryDate));
      if (days >= 0) {
        setWeeksPostInjury(String(Math.floor(days / 7)));
        setDaysPostInjury(String(days % 7));
      }
    } else if (!injuryDate) {
      setWeeksPostInjury("");
      setDaysPostInjury("");
    }
  }, [injuryDate, admissionDate]);

  useEffect(() => {
    if (surgeryDate && admissionDate) {
      const days = differenceInCalendarDays(new Date(admissionDate), new Date(surgeryDate));
      if (days >= 0) {
        setWeeksPostSurgery(String(Math.floor(days / 7)));
        setDaysPostSurgery(String(days % 7));
      }
    } else if (!surgeryDate) {
      setWeeksPostSurgery("");
      setDaysPostSurgery("");
    }
  }, [surgeryDate, admissionDate]);

  const or = (v: string) => v.trim() || null;
  const orNum = (v: string) => (v.trim() ? parseInt(v) : null);
  const orFloat = (v: string) => (v.trim() ? parseFloat(v) : null);

  const fieldClass = (key: string) =>
    errors[key] ? "border-destructive ring-1 ring-destructive" : "";

  const validate = (): boolean => {
    const errs: Record<string, boolean> = {};
    if (!lastName.trim()) errs.lastName = true;
    if (!firstName.trim()) errs.firstName = true;
    if (!dni.trim()) errs.dni = true;
    if (!admissionDate) errs.admissionDate = true;
    if (!diagnosis.trim()) errs.diagnosis = true;
    if (!dominance) errs.dominance = true;
    if (!avd.trim()) errs.avd = true;
    if (!evaTouched) errs.painScore = true;
    if (!interventions.trim()) errs.interventions = true;
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = document.querySelector("[data-field-error]");
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return Object.keys(errs).length === 0;
  };

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
    if (!validate()) return;
    setSaving(true);

    try {
      // 1. Insert patient
      const { data: patient, error: patErr } = await supabase
        .from("patients")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dni: dni.trim(),
          nationality: or(nationality),
          birth_date: or(birthDate),
          phone: or(phone),
          address: or(address),
          insurance: or(insurance),
          admission_date: admissionDate,
          professional_id: user!.id,
        })
        .select("id")
        .single();

      if (patErr) throw patErr;
      const pid = patient.id;

      // 1b. Insert treatment episode
      const { data: episode, error: epErr } = await supabase
        .from("treatment_episodes")
        .insert({
          patient_id: pid,
          professional_id: user!.id,
          episode_number: 1,
          admission_date: admissionDate,
          status: "active",
          diagnosis: or(diagnosis),
        })
        .select("id")
        .single();

      if (epErr) throw epErr;
      const episodeId = episode.id;

      // 2. Clinical records
      await supabase.from("patient_clinical_records").insert({
        patient_id: pid,
        episode_id: episodeId,
        diagnosis: or(diagnosis),
        doctor_name: or(doctorName),
        injury_date: or(injuryDate),
        injury_mechanism: or(injuryMechanism),
        treatment_type: or(treatmentType),
        weeks_post_injury: orNum(weeksPostInjury),
        days_post_injury: orNum(daysPostInjury),
        weeks_post_surgery: orNum(weeksPostSurgery),
        days_post_surgery: orNum(daysPostSurgery),
        immobilization_weeks: orNum(immobilizationWeeks),
        immobilization_days: orNum(immobilizationDays),
        immobilization_type: or(immobilizationType),
        next_oyt_appointment: or(nextOyt),
        studies: or(studies),
        medical_history: or(medicalHistory),
        pharmacological_treatment: or(pharma),
      });

      // 3. Occupational profile
      await supabase.from("patient_occupational_profiles").insert({
        patient_id: pid,
        dominance: or(dominance),
        support_network: or(supportNetwork),
        education: or(education),
        job: or(job),
        leisure: or(leisure),
        physical_activity: or(physicalActivity),
        sleep_rest: or(sleepRest),
        health_management: or(healthManagement),
      });

      // 4. Functional evaluation
      const funcFields = [avd, aivd, barthelScore, dashScore, funcNotes];
      if (funcFields.some((f) => f.trim())) {
        await supabase.from("functional_evaluations").insert({
          patient_id: pid,
          professional_id: user!.id,
          episode_id: episodeId,
          evaluation_date: admissionDate,
          dominance: or(dominance) as any,
          avd: or(avd),
          aivd: or(aivd),
          barthel_score: orNum(barthelScore),
          dash_score: orNum(dashScore),
          notes: or(funcNotes),
        });
      }

      // 5. Analytical evaluation — build structured fields
      const aromVal = buildAllGonioText(allPreGonio);
      const promVal = showPostGonio ? buildAllGonioText(allPostGonio) : null;
      const preJsonArr = buildAllGonioJsonArray(allPreGonio);
      const postJsonArr = showPostGonio ? buildAllGonioJsonArray(allPostGonio) : null;
      const gonioJsonb = preJsonArr || postJsonArr ? { pre: preJsonArr, post: postJsonArr } : null;

      const circParts: string[] = [];
      if (circWristMsd || circGlobalMsd) circParts.push(`MSD: ${circWristMsd || "-"}cm muñeca / ${circGlobalMsd || "-"}cm global`);
      if (circWristMsi || circGlobalMsi) circParts.push(`MSI: ${circWristMsi || "-"}cm muñeca / ${circGlobalMsi || "-"}cm global`);
      const edemaCirc = circParts.length > 0 ? circParts.join(" | ") : null;

      const hasTests = Object.values(specificTests).some(v => v !== null);
      const specificTestsJson = hasTests ? Object.fromEntries(Object.entries(specificTests).map(([k, v]) => [k, v])) : null;

      const hasMedian = Object.values(danielsMedian).some(v => v);
      const hasCubital = Object.values(danielsCubital).some(v => v);
      const hasRadial = Object.values(danielsRadial).some(v => v);
      const medianJson = hasMedian ? JSON.stringify(danielsMedian) : null;
      const cubitalJson = hasCubital ? JSON.stringify(danielsCubital) : null;
      const radialJson = hasRadial ? JSON.stringify(danielsRadial) : null;

      const msParts: string[] = [];
      if (fistClosure.trim()) msParts.push(`Cierre de puño: ${fistClosure}`);
      if (muscleStrength.trim()) msParts.push(muscleStrength);
      const msVal = msParts.length > 0 ? msParts.join(" — ") : null;

      const analFields = [
        evaTouched ? String(painScore) : "", painAppearance, painLocation, painRadiation,
        painCharacteristics, painAggravating, painFree, edema, godetTest,
        kapandji, fistClosure, dynamometerMsd, dynamometerMsi, muscleStrength,
        sensitivityTactoLigero, sensitivityDosPuntos, sensitivityPickingUp, sensitivitySemmesWeinstein,
        sensitivityTocoPincho, sensitivityTemperatura,
        sensitivity, trophicState, scar, vancouverScore,
        osasScore, posture, emotionalState, analNotes,
        dppdPulgar, dppdIndice, dppdMedio, dppdAnular, dppdMenique,
      ];

      // DPPD fingers JSONB
      const dppdEntries: [string, string][] = [
        ["pulgar", dppdPulgar], ["indice", dppdIndice], ["medio", dppdMedio],
        ["anular", dppdAnular], ["menique", dppdMenique],
      ].filter(([, v]) => v && v.trim()) as [string, string][];
      const dppdFingersJson = dppdEntries.length > 0
        ? Object.fromEntries(dppdEntries.map(([k, v]) => [k, parseFloat(v)]))
        : null;

      const hasStructured = aromVal || promVal || gonioJsonb || edemaCirc || specificTestsJson || medianJson || cubitalJson || radialJson || dppdFingersJson;
      if (analFields.some((f) => f.trim()) || hasStructured) {
        await supabase.from("analytical_evaluations").insert({
          patient_id: pid,
          professional_id: user!.id,
          episode_id: episodeId,
          evaluation_date: admissionDate,
          pain_score: evaTouched ? painScore : null,
          pain_appearance: or(painAppearance),
          pain_location: or(painLocation),
          pain_radiation: or(painRadiation),
          pain_characteristics: or(painCharacteristics),
          pain_aggravating_factors: or(painAggravating),
          pain: or(painFree),
          edema: or(edema),
          edema_circummetry: edemaCirc,
          godet_test: or(godetTest),
          arom: aromVal,
          prom: promVal,
          goniometry: gonioJsonb,
          kapandji: or(kapandji),
          dynamometer_msd: orFloat(dynamometerMsd),
          dynamometer_msi: orFloat(dynamometerMsi),
          muscle_strength: msVal,
          muscle_strength_median: medianJson,
          muscle_strength_cubital: cubitalJson,
          muscle_strength_radial: radialJson,
          specific_tests: specificTestsJson,
          dppd_fingers: dppdFingersJson,
          sensitivity: or(sensitivity),
          sensitivity_functional: null,
          sensitivity_protective: null,
          sensitivity_tacto_ligero: or(sensitivityTactoLigero),
          sensitivity_dos_puntos: or(sensitivityDosPuntos),
          sensitivity_picking_up: or(sensitivityPickingUp),
          sensitivity_semmes_weinstein: or(sensitivitySemmesWeinstein),
          sensitivity_toco_pincho: or(sensitivityTocoPincho),
          sensitivity_temperatura: or(sensitivityTemperatura),
          trophic_state: or(trophicState),
          scar: or(scar),
          vancouver_score: orNum(vancouverScore),
          osas_score: orNum(osasScore),
          posture: or(posture),
          emotional_state: or(emotionalState),
          notes: or(analNotes),
        });
      }

      // 6. Admission session
      await supabase.from("therapy_sessions").insert({
        patient_id: pid,
        professional_id: user!.id,
        episode_id: episodeId,
        session_date: admissionDate,
        session_type: "admission",
        session_number: 1,
        interventions: or(interventions),
        home_instructions_sent: or(homeInstructions),
        notes: or(sessionNotes),
        is_deleted: false,
      });

      toast.success("Paciente admitido correctamente");
      navigate(`/patients/${pid}`);
    } catch (err: any) {
      toast.error("Error al registrar la admisión", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive" data-field-error>Campo obligatorio</p> : null;

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
      {/* Sticky header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/patients")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Nueva admisión
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar admisión
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Card 1 — Datos del paciente */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Datos del paciente</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Apellido *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass("lastName")} />
              <ErrMsg field="lastName" />
            </div>
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass("firstName")} />
              <ErrMsg field="firstName" />
            </div>
            <div className="space-y-2">
              <Label>DNI *</Label>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} className={fieldClass("dni")} />
              <ErrMsg field="dni" />
            </div>
            <div className="space-y-2">
              <Label>Nacionalidad</Label>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Argentina, Uruguaya..." />
            </div>
            <div className="space-y-2">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Domicilio</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Obra social</Label>
              <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="OSDE, Swiss Medical, PAMI..." />
            </div>
            <div className="space-y-2">
              <Label>Fecha de admisión *</Label>
              <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={fieldClass("admissionDate")} />
              <ErrMsg field="admissionDate" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2 — Datos clínicos */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Datos clínicos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Diagnóstico *</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Ej: Fx distal de radio D°, STC" className={fieldClass("diagnosis")} />
                <ErrMsg field="diagnosis" />
              </div>
              <div className="space-y-2">
                <Label>Médico derivante</Label>
                <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de lesión</Label>
                <Input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fecha de cirugía</Label>
                <Input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Mecanismo de lesión</Label>
                <Textarea value={injuryMechanism} onChange={(e) => setInjuryMechanism(e.target.value)} rows={2} placeholder="Caída, accidente laboral..." />
              </div>
              <div className="space-y-2">
                <Label>Tratamiento</Label>
                <Select value={treatmentType} onValueChange={setTreatmentType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservador</SelectItem>
                    <SelectItem value="surgery">Quirúrgico</SelectItem>
                    <SelectItem value="mixed">Mixto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Semanas post lesión + Días</Label>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={weeksPostInjury} onChange={(e) => setWeeksPostInjury(e.target.value)} placeholder="Sem." className="flex-1" />
                  <Input type="number" min={0} max={6} value={daysPostInjury} onChange={(e) => setDaysPostInjury(e.target.value)} placeholder="Días" className="w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Semanas post cirugía + Días</Label>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={weeksPostSurgery} onChange={(e) => setWeeksPostSurgery(e.target.value)} placeholder="Sem." className="flex-1" />
                  <Input type="number" min={0} max={6} value={daysPostSurgery} onChange={(e) => setDaysPostSurgery(e.target.value)} placeholder="Días" className="w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Semanas de inmovilización + Días</Label>
                <div className="flex gap-2">
                  <Input type="number" min={0} value={immobilizationWeeks} onChange={(e) => setImmobilizationWeeks(e.target.value)} placeholder="Sem." className="flex-1" />
                  <Input type="number" min={0} max={6} value={immobilizationDays} onChange={(e) => setImmobilizationDays(e.target.value)} placeholder="Días" className="w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de inmovilización</Label>
                <Input value={immobilizationType} onChange={(e) => setImmobilizationType(e.target.value)} placeholder="Yeso, férula, vendaje..." />
              </div>
              <div className="space-y-2">
                <Label>Próx. turno OyT</Label>
                <Input type="date" value={nextOyt} onChange={(e) => setNextOyt(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estudios</Label>
              <Textarea value={studies} onChange={(e) => setStudies(e.target.value)} rows={2} placeholder="Rx, RMN..." />
            </div>
            <div className="space-y-2">
              <Label>Antecedentes personales</Label>
              <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Tto farmacológico</Label>
              <Textarea value={pharma} onChange={(e) => setPharma(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Card 3 — Perfil ocupacional */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Perfil ocupacional</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lateralidad *</Label>
              <Select value={dominance} onValueChange={setDominance}>
                <SelectTrigger className={fieldClass("dominance")}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Diestro/a</SelectItem>
                  <SelectItem value="left">Zurdo/a</SelectItem>
                  <SelectItem value="ambidextrous">Ambidiestro/a</SelectItem>
                </SelectContent>
              </Select>
              <ErrMsg field="dominance" />
            </div>
            <div className="space-y-2">
              <Label>Red de apoyo</Label>
              <Input value={supportNetwork} onChange={(e) => setSupportNetwork(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Educación</Label>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primario_incompleto">Primario incompleto</SelectItem>
                  <SelectItem value="primario_completo">Primario completo</SelectItem>
                  <SelectItem value="secundario_incompleto">Secundario incompleto</SelectItem>
                  <SelectItem value="secundario_completo">Secundario completo</SelectItem>
                  <SelectItem value="terciario_universitario">Terciario/Universitario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Trabajo</Label>
              <Input value={job} onChange={(e) => setJob(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Ocio</Label>
              <Input value={leisure} onChange={(e) => setLeisure(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Actividad física</Label>
              <Input value={physicalActivity} onChange={(e) => setPhysicalActivity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Sueño y descanso</Label>
              <Input value={sleepRest} onChange={(e) => setSleepRest(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gestión de la salud</Label>
              <Input value={healthManagement} onChange={(e) => setHealthManagement(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Card 4 — Evaluación funcional */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Evaluación funcional</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>AVD — Actividades de la vida diaria *</Label>
              <Textarea value={avd} onChange={(e) => setAvd(e.target.value)} rows={3} placeholder="Dificultad para vestido, higiene personal..." className={fieldClass("avd")} />
              <ErrMsg field="avd" />
            </div>
            <div className="space-y-2">
              <Label>AIVD — Actividades instrumentales</Label>
              <Textarea value={aivd} onChange={(e) => setAivd(e.target.value)} rows={3} placeholder="Dificultad para cocinar, escurrir trapos..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Barthel (0-100)</Label>
                <Input type="number" min={0} max={100} value={barthelScore} onChange={(e) => setBarthelScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>DASH (0-100)</Label>
                <Input type="number" min={0} max={100} value={dashScore} onChange={(e) => setDashScore(e.target.value)} />
                <p className="text-xs text-muted-foreground">0 = sin discapacidad · 100 = máxima discapacidad</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={funcNotes} onChange={(e) => setFuncNotes(e.target.value)} rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Card 5 — Evaluación analítica */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Evaluación analítica</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            {/* Dolor */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Dolor</h3>
              <div className="space-y-2">
                <Label>Aparición</Label>
                <Input value={painAppearance} onChange={(e) => setPainAppearance(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Localización</Label>
                <Input value={painLocation} onChange={(e) => setPainLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox checked={!!painRadiation || painRadiation === ""} onCheckedChange={() => {}} className="hidden" />
                  <Label className="font-normal">Irradiación</Label>
                </div>
                <Input placeholder="¿Hacia dónde?" value={painRadiation} onChange={(e) => setPainRadiation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Características</Label>
                <Input value={painCharacteristics} onChange={(e) => setPainCharacteristics(e.target.value)} placeholder="punzante, urente, opresivo..." />
              </div>
              <div className="space-y-2">
                <Label>Intensidad EVA (0-10) *</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    min={0} max={10} step={1}
                    value={[painScore]}
                    onValueChange={(v) => { setPainScore(v[0]); setEvaTouched(true); }}
                    className={`flex-1 ${fieldClass("painScore")}`}
                  />
                  <span className="text-sm font-bold bg-muted px-2 py-1 rounded min-w-[2rem] text-center">{painScore}</span>
                </div>
                <ErrMsg field="painScore" />
              </div>
              <div className="space-y-2">
                <Label>Agravantes / Atenuantes</Label>
                <Textarea value={painAggravating} onChange={(e) => setPainAggravating(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Edema */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Edema</h3>
              <div className="space-y-2">
                <Label>Observación de edema</Label>
                <Textarea value={edema} onChange={(e) => setEdema(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Test de Godet</Label>
                <Select value={godetTest} onValueChange={setGodetTest}>
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
              <h4 className="text-xs font-medium text-muted-foreground mt-2">Circometría</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Muñeca MSD (cm)</Label><Input type="number" step="0.1" value={circWristMsd} onChange={e => setCircWristMsd(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Muñeca MSI (cm)</Label><Input type="number" step="0.1" value={circWristMsi} onChange={e => setCircWristMsi(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Global MSD (cm)</Label><Input type="number" step="0.1" value={circGlobalMsd} onChange={e => setCircGlobalMsd(e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Global MSI (cm)</Label><Input type="number" step="0.1" value={circGlobalMsi} onChange={e => setCircGlobalMsi(e.target.value)} /></div>
              </div>
            </div>

            {/* Movilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Movilidad</h3>
              <h4 className="text-xs font-medium text-muted-foreground">Goniometría PRE</h4>
              <GonioPartSelector value={gonioPart} onChange={setGonioPart} />
              <GonioGrid partKey={gonioPart} values={allPreGonio[gonioPart]} setValues={v => setAllPreGonio(prev => ({ ...prev, [gonioPart]: v }))} />

              <div className="flex items-center gap-2 mt-3">
                <Checkbox checked={showPostGonio} onCheckedChange={v => setShowPostGonio(!!v)} />
                <Label className="font-normal text-sm">Registrar goniometría POST</Label>
              </div>
              {showPostGonio && (
                <>
                  <GonioPartSelector value={gonioPartPost} onChange={setGonioPartPost} />
                  <GonioGrid partKey={gonioPartPost} values={allPostGonio[gonioPartPost]} setValues={v => setAllPostGonio(prev => ({ ...prev, [gonioPartPost]: v }))} />
                </>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <Label>Kapandji</Label>
                  <Input value={kapandji} onChange={(e) => setKapandji(e.target.value)} placeholder="5/10 con dolor" />
                </div>
                <div className="space-y-2">
                  <Label>Cierre de puño</Label>
                  <Input value={fistClosure} onChange={(e) => setFistClosure(e.target.value)} placeholder="Completo / Incompleto con tirantez" />
                </div>
              </div>
            </div>

            {/* Fuerza */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Fuerza</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dinamómetro MSD (kgf)</Label>
                  <Input type="number" step={0.1} value={dynamometerMsd} onChange={(e) => setDynamometerMsd(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Dinamómetro MSI (kgf)</Label>
                  <Input type="number" step={0.1} value={dynamometerMsi} onChange={(e) => setDynamometerMsi(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>DPPD (cm) — distancia pulpejo-pliegue distal</Label>
                <div className="grid grid-cols-5 gap-2">
                  <div className="space-y-1"><Label className="text-xs">Pulgar</Label><Input type="number" step="0.1" value={dppdPulgar} onChange={e => setDppdPulgar(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Índice</Label><Input type="number" step="0.1" value={dppdIndice} onChange={e => setDppdIndice(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Medio</Label><Input type="number" step="0.1" value={dppdMedio} onChange={e => setDppdMedio(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Anular</Label><Input type="number" step="0.1" value={dppdAnular} onChange={e => setDppdAnular(e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs">Meñique</Label><Input type="number" step="0.1" value={dppdMenique} onChange={e => setDppdMenique(e.target.value)} /></div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fuerza muscular (Daniels)</Label>
                <Select value={muscleStrength} onValueChange={setMuscleStrength}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar grado" /></SelectTrigger>
                  <SelectContent>
                    {DANIELS_FULL_GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sensibilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Sensibilidad</h3>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Epicrítica (funcional)</p>
                <div className="space-y-2"><Label className="text-xs">Tacto ligero</Label><Textarea rows={2} value={sensitivityTactoLigero} onChange={(e) => setSensitivityTactoLigero(e.target.value)} /></div>
                <div className="space-y-2"><Label className="text-xs">Discriminación 2 puntos</Label><Textarea rows={2} value={sensitivityDosPuntos} onChange={(e) => setSensitivityDosPuntos(e.target.value)} /></div>
                <div className="space-y-2"><Label className="text-xs">Picking up test</Label><Textarea rows={2} value={sensitivityPickingUp} onChange={(e) => setSensitivityPickingUp(e.target.value)} /></div>
                <div className="space-y-2"><Label className="text-xs">Semmes-Weinstein</Label><Textarea rows={2} value={sensitivitySemmesWeinstein} onChange={(e) => setSensitivitySemmesWeinstein(e.target.value)} /></div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Protopática (protectora)</p>
                <div className="space-y-2"><Label className="text-xs">Toco-pincho</Label><Textarea rows={2} value={sensitivityTocoPincho} onChange={(e) => setSensitivityTocoPincho(e.target.value)} /></div>
                <div className="space-y-2"><Label className="text-xs">Temperatura frío-calor</Label><Textarea rows={2} value={sensitivityTemperatura} onChange={(e) => setSensitivityTemperatura(e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <Label>Observaciones de sensibilidad</Label>
                <Textarea value={sensitivity} onChange={(e) => setSensitivity(e.target.value)} rows={2} />
              </div>

              {/* Tabla Kendall */}
              <Collapsible open={showDaniels} onOpenChange={setShowDaniels}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between text-xs text-muted-foreground mt-2">
                    Tabla Kendall
                    <ChevronDown className={`h-4 w-4 transition-transform ${showDaniels ? "rotate-180" : ""}`} />
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
                      <DanielsTable muscles={MEDIAN_MUSCLES} values={danielsMedian} onChange={(k, v) => setDanielsMedian(p => ({ ...p, [k]: v }))} />
                    </TabsContent>
                    <TabsContent value="cubital">
                      <DanielsTable muscles={CUBITAL_MUSCLES} values={danielsCubital} onChange={(k, v) => setDanielsCubital(p => ({ ...p, [k]: v }))} />
                    </TabsContent>
                    <TabsContent value="radial">
                      <DanielsTable muscles={RADIAL_MUSCLES} values={danielsRadial} onChange={(k, v) => setDanielsRadial(p => ({ ...p, [k]: v }))} />
                    </TabsContent>
                  </Tabs>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Pruebas específicas */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Pruebas específicas</h3>
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

            {/* Otros */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Otros</h3>
              <div className="space-y-2">
                <Label>Estado trófico</Label>
                <Textarea value={trophicState} onChange={(e) => setTrophicState(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Cicatriz</Label>
                <Textarea value={scar} onChange={(e) => setScar(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vancouver VSS (0-15)</Label>
                  <Input type="number" min={0} max={15} value={vancouverScore} onChange={(e) => setVancouverScore(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>OSAS (0-60)</Label>
                  <Input type="number" min={0} max={60} value={osasScore} onChange={(e) => setOsasScore(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Postura</Label>
                <Textarea value={posture} onChange={(e) => setPosture(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Emotividad</Label>
                <Textarea value={emotionalState} onChange={(e) => setEmotionalState(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={analNotes} onChange={(e) => setAnalNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 6 — Intervenciones de admisión */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Intervenciones de admisión</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Intervenciones *</Label>
              <Textarea value={interventions} onChange={(e) => setInterventions(e.target.value)} rows={5} placeholder="Se brindan estrategias no farmacológicas para el dolor..." className={fieldClass("interventions")} />
              <ErrMsg field="interventions" />
            </div>
            <div className="space-y-2">
              <Label>Indicaciones enviadas al paciente</Label>
              <Textarea value={homeInstructions} onChange={(e) => setHomeInstructions(e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={2} />
              <p className="text-xs text-muted-foreground">Campo interno — no se muestra en el resumen clínico</p>
            </div>
          </CardContent>
        </Card>

        {/* Bottom save button */}
        <div className="flex justify-end pb-8">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar admisión
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewPatientForm;
