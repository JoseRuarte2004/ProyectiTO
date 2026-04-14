import { useState } from "react";
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
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

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
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [insurance, setInsurance] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);

  // Card 2 — Clinical data
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [injuryDate, setInjuryDate] = useState("");
  const [injuryMechanism, setInjuryMechanism] = useState("");
  const [treatmentType, setTreatmentType] = useState("");
  const [weeksPostInjury, setWeeksPostInjury] = useState("");
  const [daysPostInjury, setDaysPostInjury] = useState("");
  const [weeksPostSurgery, setWeeksPostSurgery] = useState("");
  const [daysPostSurgery, setDaysPostSurgery] = useState("");
  const [immobilizationWeeks, setImmobilizationWeeks] = useState("");
  const [immobilizationDays, setImmobilizationDays] = useState("");
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

  // Card 6 — Admission session
  const [interventions, setInterventions] = useState("");
  const [homeInstructions, setHomeInstructions] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");

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

      // 5. Analytical evaluation
      const aromFinal = [arom, fistClosure.trim() ? `Cierre de puño: ${fistClosure}` : ""]
        .filter(Boolean)
        .join("\n") || null;

      const analFields = [
        evaTouched ? String(painScore) : "", painAppearance, painLocation, painRadiation,
        painCharacteristics, painAggravating, edema, edemaCircummetry, godetTest,
        arom, prom, kapandji, fistClosure, dynamometerMsd, dynamometerMsi, muscleStrength,
        sensitivityFunctional, sensitivityProtective, trophicState, scar, vancouverScore,
        osasScore, posture, emotionalState, analNotes,
      ];
      if (analFields.some((f) => f.trim())) {
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
                  <Textarea value={edemaCircummetry} onChange={(e) => setEdemaCircummetry(e.target.value)} rows={2} placeholder="MSD muñeca 19cm / MSI muñeca 17cm / Global MSD 48cm / Global MSI 44cm" />
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
              </div>
            </div>

            {/* Movilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Movilidad</h3>
              <div className="space-y-2">
                <Label>AROM</Label>
                <Textarea value={arom} onChange={(e) => setArom(e.target.value)} rows={2} placeholder="Flex 30° Ext 20° DR 5° DC 15° Prono 60° Supino 50°" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>PROM</Label>
                  <Textarea value={prom} onChange={(e) => setProm(e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>Kapandji</Label>
                  <Input value={kapandji} onChange={(e) => setKapandji(e.target.value)} placeholder="5/10 con dolor" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cierre de puño</Label>
                <Input value={fistClosure} onChange={(e) => setFistClosure(e.target.value)} placeholder="Completo / Incompleto con tirantez" />
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
                <Label>Fuerza muscular observaciones</Label>
                <Textarea value={muscleStrength} onChange={(e) => setMuscleStrength(e.target.value)} rows={2} />
              </div>
            </div>

            {/* Sensibilidad */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">▸ Sensibilidad</h3>
              <div className="space-y-2">
                <Label>Sensibilidad epicrítica/funcional</Label>
                <Textarea value={sensitivityFunctional} onChange={(e) => setSensitivityFunctional(e.target.value)} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Sensibilidad protopática/protectora</Label>
                <Textarea value={sensitivityProtective} onChange={(e) => setSensitivityProtective(e.target.value)} rows={2} />
              </div>
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
