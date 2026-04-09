import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

const stepNames = [
  "Datos del paciente",
  "Datos clínicos",
  "Perfil ocupacional",
  "Evaluación funcional",
  "Evaluación analítica",
  "Admisión",
];

export function NewPatientForm({ onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  // Step 1 — Patient data
  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [insurance, setInsurance] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);

  // Step 2 — Clinical data
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [injuryDate, setInjuryDate] = useState("");
  const [injuryMechanism, setInjuryMechanism] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [weeksPostInjury, setWeeksPostInjury] = useState("");
  const [weeksPostSurgery, setWeeksPostSurgery] = useState("");
  const [immobilizationWeeks, setImmobilizationWeeks] = useState("");
  const [nextOyt, setNextOyt] = useState("");
  const [studies, setStudies] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [pharma, setPharma] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Step 3 — Occupational profile
  const [dominance, setDominance] = useState("");
  const [supportNetwork, setSupportNetwork] = useState("");
  const [education, setEducation] = useState("");
  const [job, setJob] = useState("");
  const [leisure, setLeisure] = useState("");
  const [physicalActivity, setPhysicalActivity] = useState("");
  const [sleepRest, setSleepRest] = useState("");
  const [healthManagement, setHealthManagement] = useState("");
  const [occNotes, setOccNotes] = useState("");

  // Step 4 — Functional evaluation
  const [avd, setAvd] = useState("");
  const [aivd, setAivd] = useState("");
  const [barthelScore, setBarthelScore] = useState("");
  const [dashScore, setDashScore] = useState("");
  const [funcNotes, setFuncNotes] = useState("");

  // Step 5 — Analytical evaluation
  const [painScore, setPainScore] = useState<number | null>(null);
  const [painAppearance, setPainAppearance] = useState("");
  const [painLocation, setPainLocation] = useState("");
  const [painRadiation, setPainRadiation] = useState("");
  const [painCharacteristics, setPainCharacteristics] = useState("");
  const [pain, setPain] = useState("");
  const [painAggravating, setPainAggravating] = useState("");
  const [edema, setEdema] = useState("");
  const [edemaCircummetry, setEdemaCircummetry] = useState("");
  const [godetTest, setGodetTest] = useState("");
  const [arom, setArom] = useState("");
  const [prom, setProm] = useState("");
  const [kapandji, setKapandji] = useState("");
  const [fistClosure, setFistClosure] = useState("");
  const [dynamometerMsd, setDynamometerMsd] = useState("");
  const [dynamometerMsi, setDynamometerMsi] = useState("");
  const [muscleStrength, setMuscleStrength] = useState("");
  const [sensitivityFunctional, setSensitivityFunctional] = useState("");
  const [sensitivityProtective, setSensitivityProtective] = useState("");
  const [trophicState, setTrophicState] = useState("");
  const [scar, setScar] = useState("");
  const [vancouverScore, setVancouverScore] = useState("");
  const [osasScore, setOsasScore] = useState("");
  const [posture, setPosture] = useState("");
  const [emotionalState, setEmotionalState] = useState("");
  const [analNotes, setAnalNotes] = useState("");

  // Step 6 — Admission session
  const [interventions, setInterventions] = useState("");
  const [homeInstructions, setHomeInstructions] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

  const or = (v: string) => v.trim() || null;
  const orNum = (v: string) => (v.trim() ? parseInt(v) : null);
  const orFloat = (v: string) => (v.trim() ? parseFloat(v) : null);

  const validateStep = (s: number): boolean => {
    const errs: Record<string, boolean> = {};
    if (s === 1) {
      if (!lastName.trim()) errs.lastName = true;
      if (!firstName.trim()) errs.firstName = true;
      if (!dni.trim()) errs.dni = true;
      if (!admissionDate) errs.admissionDate = true;
    } else if (s === 2) {
      if (!diagnosis.trim()) errs.diagnosis = true;
      if (!dominance) errs.dominance = true;
    } else if (s === 6) {
      if (!interventions.trim()) errs.interventions = true;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep(step + 1);
  };

  const handleSave = async () => {
    if (!validateStep(6)) return;
    setSaving(true);

    try {
      // 1. Insert patient
      const { data: patient, error: patErr } = await supabase
        .from("patients")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dni: dni.trim(),
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

      // 2. Clinical records
      await supabase.from("patient_clinical_records").insert({
        patient_id: pid,
        diagnosis: or(diagnosis),
        doctor_name: or(doctorName),
        injury_date: or(injuryDate),
        injury_mechanism: or(injuryMechanism),
        treatment_type: or(treatmentType),
        weeks_post_injury: orNum(weeksPostInjury),
        weeks_post_surgery: orNum(weeksPostSurgery),
        immobilization_weeks: orNum(immobilizationWeeks),
        next_oyt_appointment: or(nextOyt),
        studies: or(studies),
        medical_history: or(medicalHistory),
        pharmacological_treatment: or(pharma),
        notes: or(clinicalNotes),
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
        notes: or(occNotes),
      });

      // 4. Functional evaluation (if any field filled)
      const funcFields = [avd, aivd, barthelScore, dashScore, funcNotes];
      if (funcFields.some((f) => f.trim())) {
        await supabase.from("functional_evaluations").insert({
          patient_id: pid,
          professional_id: user!.id,
          evaluation_date: admissionDate,
          dominance: or(dominance) as any,
          avd: or(avd),
          aivd: or(aivd),
          barthel_score: orNum(barthelScore),
          dash_score: orNum(dashScore),
          notes: or(funcNotes),
        });
      }

      // 5. Analytical evaluation (if any field filled)
      const aromFinal = [arom, fistClosure.trim() ? `Cierre de puño: ${fistClosure}` : ""]
        .filter(Boolean)
        .join("\n") || null;

      const analFields = [
        painScore !== null ? String(painScore) : "", painAppearance, painLocation, painRadiation,
        painCharacteristics, pain, painAggravating, edema, edemaCircummetry, godetTest,
        arom, prom, kapandji, fistClosure, dynamometerMsd, dynamometerMsi, muscleStrength,
        sensitivityFunctional, sensitivityProtective, trophicState, scar, vancouverScore,
        osasScore, posture, emotionalState, analNotes,
      ];
      if (analFields.some((f) => f.trim())) {
        await supabase.from("analytical_evaluations").insert({
          patient_id: pid,
          professional_id: user!.id,
          evaluation_date: admissionDate,
          pain_score: painScore,
          pain_appearance: or(painAppearance),
          pain_location: or(painLocation),
          pain_radiation: or(painRadiation),
          pain_characteristics: or(painCharacteristics),
          pain: or(pain),
          pain_aggravating_factors: or(painAggravating),
          edema: or(edema),
          edema_circummetry: or(edemaCircummetry),
          godet_test: or(godetTest),
          arom: aromFinal,
          prom: or(prom),
          kapandji: or(kapandji),
          dynamometer_msd: orFloat(dynamometerMsd),
          dynamometer_msi: orFloat(dynamometerMsi),
          muscle_strength: or(muscleStrength),
          sensitivity_functional: or(sensitivityFunctional),
          sensitivity_protective: or(sensitivityProtective),
          trophic_state: or(trophicState),
          scar: or(scar),
          vancouver_score: orNum(vancouverScore),
          osas_score: orNum(osasScore),
          posture: or(posture),
          emotional_state: or(emotionalState),
          notes: or(analNotes),
        });
      }

      // 6. Admission session (always)
      await supabase.from("therapy_sessions").insert({
        patient_id: pid,
        professional_id: user!.id,
        session_date: admissionDate,
        session_type: "admission",
        session_number: 1,
        interventions: or(interventions),
        home_instructions_sent: or(homeInstructions),
        notes: or(sessionNotes),
        is_deleted: false,
      });

      toast.success("Paciente admitido correctamente");
      onSuccess();
    } catch (err: any) {
      toast.error("Error al registrar la admisión", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const fieldClass = (key: string) =>
    errors[key] ? "border-destructive ring-1 ring-destructive" : "";

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">{stepNames[step - 1]}</span>
          <span className="text-sm text-muted-foreground">Paso {step} de 6</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-teal-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Nueva admisión</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 1 de 6 — Datos personales</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Apellido *</Label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={fieldClass("lastName")} />
                {errors.lastName && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
              <div className="space-y-2">
                <Label>Nombre *</Label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={fieldClass("firstName")} />
                {errors.firstName && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
              <div className="space-y-2">
                <Label>DNI *</Label>
                <Input value={dni} onChange={(e) => setDni(e.target.value)} className={fieldClass("dni")} />
                {errors.dni && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
              <div className="space-y-2">
                <Label>Fecha de nacimiento</Label>
                <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Domicilio</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Obra social</Label>
                <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} placeholder="OSDE, Swiss Medical, PAMI... o 'No posee'" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de admisión *</Label>
                <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={fieldClass("admissionDate")} />
                {errors.admissionDate && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Datos clínicos</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 2 de 6 — Datos clínicos</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Diagnóstico (DX) *</Label>
                <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Ej: Fx distal de radio D°, STC, Reparación tendinosa zona II" className={fieldClass("diagnosis")} />
                {errors.diagnosis && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
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
                {errors.dominance && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Derivado/a por OyT</Label>
                <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} placeholder="Nombre del médico derivante y fecha" />
              </div>
              <div className="space-y-2">
                <Label>Fecha de lesión / inicio de síntomas</Label>
                <Input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Tratamiento</Label>
                <Select value={treatmentType} onValueChange={setTreatmentType}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservador</SelectItem>
                    <SelectItem value="surgery">Quirúrgico</SelectItem>
                    <SelectItem value="mixed">Mixto — conservador y quirúrgico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Mecanismo de lesión</Label>
                <Textarea value={injuryMechanism} onChange={(e) => setInjuryMechanism(e.target.value)} rows={2} placeholder="Ej: Caída de propia altura, accidente de tránsito, accidente laboral..." />
              </div>
              <div className="space-y-2">
                <Label>Semanas post lesión</Label>
                <Input type="number" min={0} value={weeksPostInjury} onChange={(e) => setWeeksPostInjury(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semanas post cirugía</Label>
                <Input type="number" min={0} value={weeksPostSurgery} onChange={(e) => setWeeksPostSurgery(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Semanas de inmovilización</Label>
                <Input type="number" min={0} value={immobilizationWeeks} onChange={(e) => setImmobilizationWeeks(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Próximo turno OyT</Label>
                <Input type="date" value={nextOyt} onChange={(e) => setNextOyt(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Estudios</Label>
                <Textarea value={studies} onChange={(e) => setStudies(e.target.value)} rows={2} placeholder="Ej: Rx muñeca AP y lateral — fractura consolidada. RMN pendiente." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Antecedentes personales</Label>
                <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} placeholder="Enfermedades previas, cirugías anteriores, otras lesiones..." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Tratamiento farmacológico</Label>
                <Input value={pharma} onChange={(e) => setPharma(e.target.value)} placeholder="Ej: Ibuprofeno 400mg, Pregabalina. O 'Ninguno'" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notas clínicas</Label>
                <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Perfil ocupacional</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 3 de 6 — Perfil ocupacional</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Red de apoyo / Con quién vive</Label>
                <Textarea value={supportNetwork} onChange={(e) => setSupportNetwork(e.target.value)} rows={2} placeholder="Ej: Vive con sus padres. Pareja como red de apoyo principal." />
              </div>
              <div className="space-y-2">
                <Label>Educación</Label>
                <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="Ej: Secundario incompleto, Universitario completo" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Trabajo</Label>
                <Textarea value={job} onChange={(e) => setJob(e.target.value)} rows={2} placeholder="Ocupación, situación laboral actual, si está de baja..." />
              </div>
              <div className="space-y-2">
                <Label>Ocio / Tiempo libre</Label>
                <Input value={leisure} onChange={(e) => setLeisure(e.target.value)} placeholder="Ej: Gym, fútbol, lectura, ciclismo" />
              </div>
              <div className="space-y-2">
                <Label>Actividad física</Label>
                <Input value={physicalActivity} onChange={(e) => setPhysicalActivity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Sueño y descanso</Label>
                <Input value={sleepRest} onChange={(e) => setSleepRest(e.target.value)} placeholder="Ej: Sin alteraciones. Insomnio previo a la lesión." />
              </div>
              <div className="space-y-2">
                <Label>Gestión de la salud</Label>
                <Input value={healthManagement} onChange={(e) => setHealthManagement(e.target.value)} placeholder="Ej: Controles médicos regulares. Adherente a turnos." />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notas</Label>
                <Textarea value={occNotes} onChange={(e) => setOccNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Evaluación funcional</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 4 de 6 — Evaluación funcional</p>
              <p className="text-xs text-muted-foreground mt-1">Completá solo los campos relevantes para este paciente</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>AVD — Actividades de la vida diaria</Label>
                <Textarea value={avd} onChange={(e) => setAvd(e.target.value)} rows={3} placeholder="Ej: Dificultad para vestido de tren superior, higiene personal..." />
              </div>
              <div className="space-y-2">
                <Label>AIVD — Actividades instrumentales</Label>
                <Textarea value={aivd} onChange={(e) => setAivd(e.target.value)} rows={3} placeholder="Ej: Dificultad para escurrir trapos, cortar alimentos, cocinar..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Puntaje Barthel (0-100)</Label>
                  <Input type="number" min={0} max={100} value={barthelScore} onChange={(e) => setBarthelScore(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Puntaje DASH (0-100)</Label>
                  <Input type="number" min={0} max={100} value={dashScore} onChange={(e) => setDashScore(e.target.value)} />
                  <p className="text-xs text-muted-foreground">0 = sin discapacidad · 100 = máxima discapacidad</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={funcNotes} onChange={(e) => setFuncNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Evaluación analítica</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 5 de 6 — Evaluación analítica</p>
              <p className="text-xs text-muted-foreground mt-1">Completá solo los campos evaluados en esta visita</p>
            </div>

            {/* Dolor */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Dolor</h3>
              <div className="space-y-2">
                <Label>Intensidad EVA (0-10)</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    min={0} max={10} step={1}
                    value={painScore !== null ? [painScore] : [0]}
                    onValueChange={(v) => setPainScore(v[0])}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold bg-muted px-2 py-1 rounded min-w-[2rem] text-center">
                    {painScore ?? 0}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Input value={painRadiation} onChange={(e) => setPainRadiation(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Características</Label>
                  <Input value={painCharacteristics} onChange={(e) => setPainCharacteristics(e.target.value)} placeholder="punzante, urente, opresivo..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción del dolor</Label>
                <Textarea value={pain} onChange={(e) => setPain(e.target.value)} rows={2} />
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
                <Label>Observación</Label>
                <Textarea value={edema} onChange={(e) => setEdema(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Circometría</Label>
                  <Textarea value={edemaCircummetry} onChange={(e) => setEdemaCircummetry(e.target.value)} rows={2} placeholder="Ej: MSD muñeca 19cm / MSI 17cm" />
                </div>
                <div className="space-y-2">
                  <Label>Test de Godet</Label>
                  <Select value={godetTest} onValueChange={setGodetTest}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="negative">Negativo</SelectItem>
                      <SelectItem value="1+">1+</SelectItem>
                      <SelectItem value="2+">2+</SelectItem>
                      <SelectItem value="3+">3+</SelectItem>
                      <SelectItem value="4+">4+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Movilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Movilidad</h3>
              <div className="space-y-2">
                <Label>AROM</Label>
                <Textarea value={arom} onChange={(e) => setArom(e.target.value)} rows={3} placeholder="Ej: Flex muñeca 45°, Ext 60°, DR 15°, DC 25°. Limitada supinación." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PROM</Label>
                  <Textarea value={prom} onChange={(e) => setProm(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Kapandji</Label>
                  <Input value={kapandji} onChange={(e) => setKapandji(e.target.value)} placeholder="Ej: 8/10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cierre de puño</Label>
                <Input value={fistClosure} onChange={(e) => setFistClosure(e.target.value)} placeholder="Ej: Completo / Incompleto con tirantez por edema" />
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
                <Label>Observaciones de fuerza muscular</Label>
                <Textarea value={muscleStrength} onChange={(e) => setMuscleStrength(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Sensibilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Sensibilidad</h3>
              <div className="space-y-2">
                <Label>Sensibilidad epicrítica (funcional)</Label>
                <Textarea value={sensitivityFunctional} onChange={(e) => setSensitivityFunctional(e.target.value)} rows={2} placeholder="Tacto ligero, discriminación 2 puntos, picking up test..." />
              </div>
              <div className="space-y-2">
                <Label>Sensibilidad protopática (protectora)</Label>
                <Textarea value={sensitivityProtective} onChange={(e) => setSensitivityProtective(e.target.value)} rows={2} placeholder="Toco-pincho, temperatura frío-calor..." />
              </div>
            </div>

            {/* Otros */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Otros</h3>
              <div className="space-y-2">
                <Label>Estado trófico</Label>
                <Textarea value={trophicState} onChange={(e) => setTrophicState(e.target.value)} rows={2} placeholder="Coloración, hidratación, temperatura, turgencia de piel..." />
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
                <Textarea value={posture} onChange={(e) => setPosture(e.target.value)} rows={2} placeholder="Ej: Compensa movimientos con elevación de hombro. Postura antiálgica." />
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
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold text-foreground">Admisión</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Paso 6 de 6 — Admisión</p>
              <p className="text-xs text-muted-foreground mt-1">Registrá lo que se realizó en esta primera visita</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Intervenciones del día *</Label>
                <Textarea value={interventions} onChange={(e) => setInterventions(e.target.value)} rows={6} placeholder="Ej: Se brindan estrategias no farmacológicas para el dolor. Ejercicios de elongación y movilidad en plano horizontal en flexo-extensión." className={fieldClass("interventions")} />
                {errors.interventions && <p className="text-xs text-destructive">Campo obligatorio</p>}
              </div>
              <div className="space-y-2">
                <Label>Indicaciones enviadas</Label>
                <Textarea value={homeInstructions} onChange={(e) => setHomeInstructions(e.target.value)} rows={3} placeholder="Ej: Se envían por WhatsApp ejercicios de movilidad 3 veces al día, 10 repeticiones." />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} rows={2} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 mt-4 border-t border-border flex-shrink-0">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Anterior
          </Button>
        ) : (
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        )}
        {step < 6 ? (
          <Button onClick={goNext}>
            Siguiente <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Guardar admisión
          </Button>
        )}
      </div>
    </div>
  );
}
