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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ChevronDown, User, FileText, Briefcase, Activity, BarChart2, ClipboardList } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import { useRef } from "react";

// ── Section card wrapper ──
function SectionCard({ icon: Icon, title, action, children }: { icon: any; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl shadow-sm border-gray-200 bg-white mb-6 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 border-l-4 border-l-teal-500">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-teal-600" />
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>
        {action}
      </div>
      <CardContent className="p-6">{children}</CardContent>
    </Card>
  );
}

// ── Reusable label with optional required asterisk ──
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

const inputClass = "border-gray-200 rounded-lg min-h-[44px] focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent focus-visible:ring-offset-0";
const textareaClass = "border-gray-200 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:border-transparent focus-visible:ring-offset-0";
const subDivider = "pt-5 mt-5 border-t border-gray-100";
const subLabel = "text-sm font-semibold text-gray-600 mb-3";

// ── Cie10 autocomplete (inline) ──
function Cie10Autocomplete({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ code: string; description: string }>>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) { setResults([]); setOpen(false); return; }
    const searchTerm = term.toLowerCase();
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("cie10")
        .select("code, description")
        .or(`code.ilike.%${searchTerm}%,description_search.ilike.%${searchTerm}%`)
        .limit(10);
      if (cancelled) return;
      setResults(data || []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); setLoading(false); };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => { onChange(`${r.code} — ${r.description}`); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <span className="font-medium">{r.code}</span> — {r.description}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Obras Sociales autocomplete (inline) ──
function ObrasSocialesAutocomplete({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastSelectedRef = useRef<string>("");

  useEffect(() => {
    const term = value.trim();
    if (term.length < 1) { setResults([]); setOpen(false); return; }
    if (term === lastSelectedRef.current) { setOpen(false); return; }
    const searchTerm = term.toLowerCase();
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("obras_sociales")
        .select("name")
        .ilike("name_search", `%${searchTerm}%`)
        .limit(10);
      if (cancelled) return;
      setResults((data as Array<{ name: string }>) || []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); setLoading(false); };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { lastSelectedRef.current = ""; onChange(e.target.value); }}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && (
        <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-auto rounded-md border bg-popover shadow-md">
          {results.map((r) => (
            <button
              key={r.name}
              type="button"
              onClick={() => { lastSelectedRef.current = r.name; onChange(r.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  const [painRadiationChoice, setPainRadiationChoice] = useState<"" | "no" | "si">("");
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
  const [dynamometerNotes, setDynamometerNotes] = useState("");
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

      const kapandjiFinal = kapandjiVal ? `${kapandjiVal}/10${kapandjiPain ? " con dolor" : ""}` : "";

      // Build scar_evaluation JSONB
      const scarPlanillaEntries: [string, string][] = [
        ["localizacion", scarLocalizacion],
        ["longitud_cm", scarLongitud],
        ["vascularizacion", scarVascularizacion],
        ["pigmentacion", scarPigmentacion],
        ["flexibilidad", scarFlexibilidad],
        ["sensibilidad", scarSensibilidad],
        ["relieve", scarRelieve],
        ["temperatura", scarTemperatura],
      ].filter(([, v]) => v && String(v).trim()) as [string, string][];

      const vssObj: Record<string, number> = {};
      if (vssPigmentacion !== "") vssObj.pigmentacion = parseInt(vssPigmentacion);
      if (vssVascularizacion !== "") vssObj.vascularizacion = parseInt(vssVascularizacion);
      if (vssFlexibilidad !== "") vssObj.flexibilidad = parseInt(vssFlexibilidad);
      if (vssAltura !== "") vssObj.altura = parseInt(vssAltura);
      const vssTotal = Object.values(vssObj).reduce((a, b) => a + b, 0);
      const hasVss = Object.keys(vssObj).length > 0;
      const scarEvalJson =
        scarPlanillaEntries.length > 0 || hasVss
          ? {
              ...Object.fromEntries(scarPlanillaEntries),
              ...(hasVss ? { vss: vssObj } : {}),
            }
          : null;

      const analFields = [
        evaTouched ? String(painScore) : "", painAppearance, painLocation, painRadiation,
        painCharacteristics, painAggravating, painFree, edema, godetTest,
        kapandjiFinal, fistClosure, dynamometerMsd, dynamometerMsi, muscleStrength,
        sensitivityTactoLigero, sensitivityDosPuntos, sensitivityPickingUp, sensitivitySemmesWeinstein,
        sensitivityTocoPincho, sensitivityTemperatura,
        sensitivity, trophicState, scarObservaciones,
        posture, emotionalState, analNotes,
        dppdPulgar, dppdIndice, dppdMedio, dppdAnular, dppdMenique,
        scarLocalizacion, scarLongitud, scarVascularizacion, scarPigmentacion,
        scarFlexibilidad, scarSensibilidad, scarRelieve, scarTemperatura,
        vssPigmentacion, vssVascularizacion, vssFlexibilidad, vssAltura,
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
          pain_location: (() => {
            const base = painLocation || "";
            const extra = painRadiationChoice === "si" && painRadiation ? `Irradia a: ${painRadiation}` : "";
            const joined = [base, extra].filter(Boolean).join(" — ");
            return joined || null;
          })(),
          pain_radiation: painRadiationChoice === "si"
            ? (painRadiation || null)
            : painRadiationChoice === "no"
              ? "No irradia"
              : null,
          pain_characteristics: or(painCharacteristics),
          pain_aggravating_factors: or(painAggravating),
          pain: or(painFree),
          edema: or(edema),
          edema_circummetry: edemaCirc,
          godet_test: or(godetTest),
          arom: aromVal,
          prom: promVal,
          goniometry: gonioJsonb,
          kapandji: or(kapandjiFinal),
          dynamometer_msd: orFloat(dynamometerMsd),
          dynamometer_msi: orFloat(dynamometerMsi),
          dynamometer_notes: or(dynamometerNotes),
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
          scar: or(scarObservaciones),
          scar_evaluation: scarEvalJson,
          vancouver_score: hasVss ? vssTotal : null,
          osas_score: null,
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
            <Input
              key={`${partKey}-${f.key}-${values[f.key] || ""}`}
              type="number"
              placeholder={f.norm}
              defaultValue={values[f.key] || ""}
              onBlur={e => {
                const v = e.target.value;
                if (v !== (values[f.key] || "")) setValues({ ...values, [f.key]: v });
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  const GonioPartSelector = ({ value, onChange }: { value: GonioPartKey; onChange: (v: GonioPartKey) => void }) => (
    <div className="flex flex-wrap gap-2 mb-3">
      {(Object.keys(GONIO_PARTS) as GonioPartKey[]).map(k => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            value === k
              ? "bg-teal-600 text-white border border-teal-600"
              : "border border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
          }`}
        >
          {GONIO_PARTS[k].label}
        </button>
      ))}
    </div>
  );

  const patientDisplay = `${firstName} ${lastName}`.trim() || "Nueva admisión";

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-24">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 h-14">
        <div className="max-w-2xl mx-auto h-full px-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} className="text-gray-700 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-sm font-semibold text-gray-800 truncate">
            {patientDisplay}
          </h1>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar admisión
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Card 1 — Datos del paciente */}
        <SectionCard icon={User} title="Datos del paciente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Apellido</FieldLabel>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputClass} ${fieldClass("lastName")}`} />
              <ErrMsg field="lastName" />
            </div>
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputClass} ${fieldClass("firstName")}`} />
              <ErrMsg field="firstName" />
            </div>
            <div>
              <FieldLabel required>DNI</FieldLabel>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} className={`${inputClass} ${fieldClass("dni")}`} />
              <ErrMsg field="dni" />
            </div>
            <div>
              <FieldLabel>Nacionalidad</FieldLabel>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="Argentina, Uruguaya..." className={inputClass} />
            </div>
            <div>
              <FieldLabel>Fecha de nacimiento</FieldLabel>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Teléfono</FieldLabel>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Domicilio</FieldLabel>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Obra social</FieldLabel>
              <ObrasSocialesAutocomplete value={insurance} onChange={setInsurance} placeholder="OSDE, Swiss Medical, PAMI..." className={inputClass} />
            </div>
            <div>
              <FieldLabel required>Fecha de admisión</FieldLabel>
              <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={`${inputClass} ${fieldClass("admissionDate")}`} />
              <ErrMsg field="admissionDate" />
            </div>
          </div>
        </SectionCard>

        {/* Card 2 — Datos clínicos */}
        <SectionCard icon={FileText} title="Datos clínicos">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <FieldLabel required>Diagnóstico</FieldLabel>
              <Cie10Autocomplete value={diagnosis} onChange={setDiagnosis} placeholder="Buscar por código o descripción CIE-10…" className={`${inputClass} ${fieldClass("diagnosis")}`} />
              <ErrMsg field="diagnosis" />
            </div>
            <div>
              <FieldLabel>Médico derivante</FieldLabel>
              <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Fecha de lesión</FieldLabel>
              <Input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Fecha de cirugía</FieldLabel>
              <Input type="date" value={surgeryDate} onChange={(e) => setSurgeryDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Tratamiento</FieldLabel>
              <Select value={treatmentType} onValueChange={setTreatmentType}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservador</SelectItem>
                  <SelectItem value="surgery">Quirúrgico</SelectItem>
                  <SelectItem value="mixed">Mixto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Mecanismo de lesión</FieldLabel>
              <Textarea value={injuryMechanism} onChange={(e) => setInjuryMechanism(e.target.value)} rows={2} placeholder="Caída, accidente laboral..." className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Semanas post lesión + Días</FieldLabel>
              <div className="flex gap-2">
                <Input type="number" min={0} value={weeksPostInjury} onChange={(e) => setWeeksPostInjury(e.target.value)} placeholder="Sem." className={`${inputClass} flex-1`} />
                <Input type="number" min={0} max={6} value={daysPostInjury} onChange={(e) => setDaysPostInjury(e.target.value)} placeholder="Días" className={`${inputClass} w-20`} />
              </div>
            </div>
            <div>
              <FieldLabel>Semanas post cirugía + Días</FieldLabel>
              <div className="flex gap-2">
                <Input type="number" min={0} value={weeksPostSurgery} onChange={(e) => setWeeksPostSurgery(e.target.value)} placeholder="Sem." className={`${inputClass} flex-1`} />
                <Input type="number" min={0} max={6} value={daysPostSurgery} onChange={(e) => setDaysPostSurgery(e.target.value)} placeholder="Días" className={`${inputClass} w-20`} />
              </div>
            </div>
            <div>
              <FieldLabel>Inmovilización + Días</FieldLabel>
              <div className="flex gap-2">
                <Input type="number" min={0} value={immobilizationWeeks} onChange={(e) => setImmobilizationWeeks(e.target.value)} placeholder="Sem." className={`${inputClass} flex-1`} />
                <Input type="number" min={0} max={6} value={immobilizationDays} onChange={(e) => setImmobilizationDays(e.target.value)} placeholder="Días" className={`${inputClass} w-20`} />
              </div>
            </div>
            <div>
              <FieldLabel>Tipo de inmovilización</FieldLabel>
              <Input value={immobilizationType} onChange={(e) => setImmobilizationType(e.target.value)} placeholder="Yeso, férula, vendaje..." className={inputClass} />
            </div>
            <div>
              <FieldLabel>Próx. turno OyT</FieldLabel>
              <Input type="date" value={nextOyt} onChange={(e) => setNextOyt(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Estudios</FieldLabel>
              <Textarea value={studies} onChange={(e) => setStudies(e.target.value)} rows={2} placeholder="Rx, RMN..." className={textareaClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Antecedentes personales</FieldLabel>
              <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} className={textareaClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Tto farmacológico</FieldLabel>
              <Textarea value={pharma} onChange={(e) => setPharma(e.target.value)} rows={2} className={textareaClass} />
            </div>
          </div>
        </SectionCard>

        {/* Card 3 — Perfil ocupacional */}
        <SectionCard icon={Briefcase} title="Perfil ocupacional">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Lateralidad</FieldLabel>
              <Select value={dominance} onValueChange={setDominance}>
                <SelectTrigger className={`${inputClass} ${fieldClass("dominance")}`}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="right">Diestro/a</SelectItem>
                  <SelectItem value="left">Zurdo/a</SelectItem>
                  <SelectItem value="ambidextrous">Ambidiestro/a</SelectItem>
                </SelectContent>
              </Select>
              <ErrMsg field="dominance" />
            </div>
            <div>
              <FieldLabel>Red de apoyo</FieldLabel>
              <Input value={supportNetwork} onChange={(e) => setSupportNetwork(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Educación</FieldLabel>
              <Select value={education} onValueChange={setEducation}>
                <SelectTrigger className={inputClass}><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="primario_incompleto">Primario incompleto</SelectItem>
                  <SelectItem value="primario_completo">Primario completo</SelectItem>
                  <SelectItem value="secundario_incompleto">Secundario incompleto</SelectItem>
                  <SelectItem value="secundario_completo">Secundario completo</SelectItem>
                  <SelectItem value="terciario_universitario">Terciario/Universitario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Trabajo</FieldLabel>
              <Input value={job} onChange={(e) => setJob(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Ocio</FieldLabel>
              <Input value={leisure} onChange={(e) => setLeisure(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Actividad física</FieldLabel>
              <Input value={physicalActivity} onChange={(e) => setPhysicalActivity(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Sueño y descanso</FieldLabel>
              <Input value={sleepRest} onChange={(e) => setSleepRest(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Gestión de la salud</FieldLabel>
              <Input value={healthManagement} onChange={(e) => setHealthManagement(e.target.value)} className={inputClass} />
            </div>
          </div>
        </SectionCard>

        {/* Card 4 — Evaluación funcional */}
        <SectionCard icon={Activity} title="Evaluación funcional">
          <div className="space-y-4">
            <div>
              <FieldLabel required>AVD — Actividades de la vida diaria</FieldLabel>
              <Textarea value={avd} onChange={(e) => setAvd(e.target.value)} rows={3} placeholder="Dificultad para vestido, higiene personal..." className={`${textareaClass} ${fieldClass("avd")}`} />
              <ErrMsg field="avd" />
            </div>
            <div>
              <FieldLabel>AIVD — Actividades instrumentales</FieldLabel>
              <Textarea value={aivd} onChange={(e) => setAivd(e.target.value)} rows={3} placeholder="Dificultad para cocinar, escurrir trapos..." className={textareaClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel>Barthel (0-100)</FieldLabel>
                <Input type="number" min={0} max={100} value={barthelScore} onChange={(e) => setBarthelScore(e.target.value)} className={inputClass} />
              </div>
              <div>
                <FieldLabel>DASH (0-100)</FieldLabel>
                <Input type="number" min={0} max={100} value={dashScore} onChange={(e) => setDashScore(e.target.value)} className={inputClass} />
                <p className="text-xs text-muted-foreground mt-1">0 = sin discapacidad · 100 = máxima discapacidad</p>
              </div>
            </div>
            <div>
              <FieldLabel>Notas</FieldLabel>
              <Textarea value={funcNotes} onChange={(e) => setFuncNotes(e.target.value)} rows={2} className={textareaClass} />
            </div>
          </div>
        </SectionCard>

        {/* Card 5 — Evaluación analítica */}
        <SectionCard
          icon={BarChart2}
          title="Evaluación analítica"
          action={(() => {
            const total =
              (vssPigmentacion ? parseInt(vssPigmentacion) : 0) +
              (vssVascularizacion ? parseInt(vssVascularizacion) : 0) +
              (vssFlexibilidad ? parseInt(vssFlexibilidad) : 0) +
              (vssAltura ? parseInt(vssAltura) : 0);
            return total > 0 ? (
              <Badge className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-50">
                VSS: {total}/15
              </Badge>
            ) : null;
          })()}
        >
          <div className="space-y-0">
            {/* Dolor */}
            <div className="space-y-3">
              <h3 className={subLabel}>Dolor</h3>
              <div className="space-y-2">
                <Label>Aparición</Label>
                <Input value={painAppearance} onChange={(e) => setPainAppearance(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Localización</Label>
                <Input value={painLocation} onChange={(e) => setPainLocation(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Irradiación</Label>
                <RadioGroup
                  value={painRadiationChoice}
                  onValueChange={(v) => {
                    const val = v as "no" | "si";
                    setPainRadiationChoice(val);
                    if (val === "no") setPainRadiation("");
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="no" id="pain-rad-no-np" />
                    <Label htmlFor="pain-rad-no-np" className="font-normal cursor-pointer">No irradia</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="si" id="pain-rad-si-np" />
                    <Label htmlFor="pain-rad-si-np" className="font-normal cursor-pointer">Sí irradia</Label>
                  </div>
                </RadioGroup>
                {painRadiationChoice === "si" && (
                  <div className="space-y-1 mt-2">
                    <Label className="font-normal">¿Hacia dónde?</Label>
                    <Input value={painRadiation} onChange={(e) => setPainRadiation(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Características</Label>
                <Input value={painCharacteristics} onChange={(e) => setPainCharacteristics(e.target.value)} placeholder="punzante, urente, opresivo..." />
              </div>
              <div className="space-y-2">
                <FieldLabel required>Intensidad EVA (0-10)</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="relative flex-1 py-2">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 pointer-events-none" />
                    <Slider
                      min={0} max={10} step={1}
                      value={[painScore]}
                      onValueChange={(v) => { setPainScore(v[0]); setEvaTouched(true); }}
                      className={`relative [&_[data-orientation=horizontal]]:bg-transparent [&_[role=slider]]:border-teal-600 [&_[role=slider]]:bg-white [&>span:first-child>span]:bg-transparent ${fieldClass("painScore")}`}
                    />
                  </div>
                  <span className={`text-sm font-bold rounded-md min-w-[2.5rem] text-center px-2 py-1 ${
                    painScore <= 3 ? "bg-green-100 text-green-700" :
                    painScore <= 6 ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{painScore}</span>
                </div>
                <ErrMsg field="painScore" />
              </div>
              <div className="space-y-2">
                <Label>Agravantes / Atenuantes</Label>
                <Textarea value={painAggravating} onChange={(e) => setPainAggravating(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Edema */}
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Edema</h3>
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
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Movilidad</h3>
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
                  <Label>Kapandji (0-10)</Label>
                  <div className="flex items-end gap-3">
                    <Input className="flex-1" type="number" min={0} max={10} value={kapandjiVal} onChange={(e) => setKapandjiVal(e.target.value)} />
                    <div className="flex items-center gap-2 pb-2">
                      <Checkbox checked={kapandjiPain} onCheckedChange={(v) => setKapandjiPain(!!v)} />
                      <Label className="font-normal text-sm">Con dolor</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Cierre de puño</Label>
                  <Input value={fistClosure} onChange={(e) => setFistClosure(e.target.value)} placeholder="Completo / Incompleto con tirantez" />
                </div>
              </div>
            </div>

            {/* Fuerza */}
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Fuerza</h3>
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
              <p className="text-xs text-muted-foreground">
                Evalúa: fuerza de puño isométrica en 5 posiciones (se toma 3 veces y se promedia). Primera evaluación: comparar con MS sano (10% más de FM). Mediciones siguientes: comparar con MS afectado.
              </p>
              <div className="space-y-2">
                <Label>¿Qué evaluaste?</Label>
                <Textarea
                  rows={2}
                  value={dynamometerNotes}
                  onChange={(e) => setDynamometerNotes(e.target.value)}
                  placeholder="Ej: Fuerza de puño en 5 posiciones, se tomó 3 veces y se promedió..."
                />
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
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Sensibilidad</h3>
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
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Pruebas específicas</h3>
              <div className="flex flex-wrap gap-2">
                {SPECIFIC_TESTS.map(t => {
                  const val = specificTests[t.key];
                  const base = "h-9 px-3 text-xs font-medium rounded-lg border transition-colors inline-flex items-center gap-1.5";
                  const cls = val === "positive"
                    ? "bg-red-50 border-red-400 text-red-700 hover:bg-red-100"
                    : val === "negative"
                      ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100"
                      : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50";
                  return (
                    <button key={t.key} type="button" className={`${base} ${cls}`} onClick={() => cycleTest(t.key)}>
                      {t.label}
                      {val === "positive" && <span className="font-bold">+</span>}
                      {val === "negative" && <span className="font-bold">−</span>}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Clic para alternar: sin evaluar → positivo (+) → negativo (−)</p>
            </div>

            {/* Otros */}
            <div className={`space-y-3 ${subDivider}`}>
              <h3 className={subLabel}>Otros</h3>
              <div className="space-y-2">
                <Label>Estado trófico</Label>
                <Textarea value={trophicState} onChange={(e) => setTrophicState(e.target.value)} rows={2} />
              </div>
              {/* Cicatriz estructurada */}
              <div className="space-y-4 rounded-md border border-border p-3">
                <h4 className="text-sm font-semibold text-foreground">Cicatriz</h4>

                {/* Sub-sección A — Planilla */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">Planilla</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Localización</Label>
                      <Input value={scarLocalizacion} onChange={(e) => setScarLocalizacion(e.target.value)} placeholder={SCAR_PLACEHOLDER} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Longitud (cm)</Label>
                      <Input type="number" step="0.1" min={0} value={scarLongitud} onChange={(e) => setScarLongitud(e.target.value)} placeholder={SCAR_PLACEHOLDER} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vascularización</Label>
                      <Select value={scarVascularizacion} onValueChange={setScarVascularizacion}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.vascularizacion.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Pigmentación</Label>
                      <Select value={scarPigmentacion} onValueChange={setScarPigmentacion}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.pigmentacion.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Flexibilidad</Label>
                      <Select value={scarFlexibilidad} onValueChange={setScarFlexibilidad}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.flexibilidad.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Sensibilidad</Label>
                      <Select value={scarSensibilidad} onValueChange={setScarSensibilidad}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.sensibilidad.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Relieve</Label>
                      <Select value={scarRelieve} onValueChange={setScarRelieve}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.relieve.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Temperatura</Label>
                      <Select value={scarTemperatura} onValueChange={setScarTemperatura}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {SCAR_OPTIONS.temperatura.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observaciones / Impresión estética</Label>
                    <Textarea rows={2} value={scarObservaciones} onChange={(e) => setScarObservaciones(e.target.value)} />
                  </div>
                </div>

                {/* Sub-sección B — Vancouver VSS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Escala Vancouver VSS</p>
                    <Badge variant="secondary">
                      Total VSS: {
                        (vssPigmentacion ? parseInt(vssPigmentacion) : 0) +
                        (vssVascularizacion ? parseInt(vssVascularizacion) : 0) +
                        (vssFlexibilidad ? parseInt(vssFlexibilidad) : 0) +
                        (vssAltura ? parseInt(vssAltura) : 0)
                      }/15
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Pigmentación</Label>
                      <Select value={vssPigmentacion} onValueChange={setVssPigmentacion}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {VSS_OPTIONS.pigmentacion.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vascularización</Label>
                      <Select value={vssVascularizacion} onValueChange={setVssVascularizacion}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {VSS_OPTIONS.vascularizacion.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Flexibilidad</Label>
                      <Select value={vssFlexibilidad} onValueChange={setVssFlexibilidad}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {VSS_OPTIONS.flexibilidad.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Altura</Label>
                      <Select value={vssAltura} onValueChange={setVssAltura}>
                        <SelectTrigger><SelectValue placeholder={SCAR_PLACEHOLDER} /></SelectTrigger>
                        <SelectContent>
                          {VSS_OPTIONS.altura.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
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
          </div>
        </SectionCard>

        {/* Card 6 — Intervenciones de admisión */}
        <SectionCard icon={ClipboardList} title="Intervenciones de admisión">
          <div className="space-y-4">
            <div>
              <FieldLabel required>Intervenciones</FieldLabel>
              <Textarea value={interventions} onChange={(e) => setInterventions(e.target.value)} rows={5} placeholder="Se brindan estrategias no farmacológicas para el dolor..." className={`${textareaClass} ${fieldClass("interventions")}`} />
              <ErrMsg field="interventions" />
            </div>
            <div>
              <FieldLabel>Indicaciones enviadas al paciente</FieldLabel>
              <Textarea value={homeInstructions} onChange={(e) => setHomeInstructions(e.target.value)} rows={3} className={textareaClass} />
            </div>
            <div>
              <FieldLabel>Notas internas</FieldLabel>
              <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={2} className={textareaClass} />
              <p className="text-xs text-muted-foreground mt-1">Campo interno — no se muestra en el resumen clínico</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 py-4 px-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => navigate("/patients")} className="text-gray-600 hover:bg-gray-100">
            Descartar
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-6">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar admisión
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewPatientForm;
