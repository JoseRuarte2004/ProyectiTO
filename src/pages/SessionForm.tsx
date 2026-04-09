import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SessionForm() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [patient, setPatient] = useState<any>(null);
  const [clinical, setClinical] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [session_date, setSessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [session_type, setSessionType] = useState("follow_up");
  const [session_number, setSessionNumber] = useState("");
  const [week_at_session, setWeekAtSession] = useState("");
  const [general_observations, setGeneralObservations] = useState("");
  const [symptom_changes, setSymptomChanges] = useState("");
  const [clinical_changes, setClinicalChanges] = useState("");
  const [discharge_summary, setDischargeSummary] = useState("");

  // Functional eval (admission only)
  const [func_dominance, setFuncDominance] = useState("");
  const [func_avd, setFuncAvd] = useState("");
  const [func_aivd, setFuncAivd] = useState("");
  const [func_sleep, setFuncSleep] = useState("");
  const [func_health, setFuncHealth] = useState("");

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

  // Circummetry
  const [circ_wrist_msd, setCircWristMsd] = useState("");
  const [circ_wrist_msi, setCircWristMsi] = useState("");
  const [circ_global_msd, setCircGlobalMsd] = useState("");
  const [circ_global_msi, setCircGlobalMsi] = useState("");

  // Goniometry PRE
  const [pre_flex, setPreFlex] = useState("");
  const [pre_ext, setPreExt] = useState("");
  const [pre_dc, setPreDc] = useState("");
  const [pre_dr, setPreDr] = useState("");
  const [pre_prono, setPreProno] = useState("");
  const [pre_supino, setPreSupino] = useState("");

  // Goniometry POST
  const [show_post_gonio, setShowPostGonio] = useState(false);
  const [post_flex, setPostFlex] = useState("");
  const [post_ext, setPostExt] = useState("");
  const [post_dc, setPostDc] = useState("");
  const [post_dr, setPostDr] = useState("");
  const [post_prono, setPostProno] = useState("");
  const [post_supino, setPostSupino] = useState("");

  // Strength
  const [dyn_msd, setDynMsd] = useState("");
  const [dyn_msi, setDynMsi] = useState("");
  const [kapandji_val, setKapandjiVal] = useState("");
  const [kapandji_pain, setKapandjiPain] = useState(false);
  const [dppd, setDppd] = useState("");
  const [muscle_strength, setMuscleStrength] = useState("");

  // Sensitivity & trophic
  const [sensitivity, setSensitivity] = useState("");
  const [trophic_state, setTrophicState] = useState("");
  const [scar, setScar] = useState("");
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
      setLoading(false);
    };
    load();
  }, [patientId]);

  if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <p className="text-center text-muted-foreground py-12">Paciente no encontrado.</p>;

  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  const handleSave = async () => {
    if (!session_date || !user) return;
    setSaving(true);

    // Build derived values
    const painLocFinal = [pain_location, pain_radiates && pain_radiation ? `Irradia a: ${pain_radiation}` : ""].filter(Boolean).join(" — ") || null;

    const circParts: string[] = [];
    if (circ_wrist_msd || circ_global_msd) circParts.push(`MSD: ${circ_wrist_msd || "-"}cm muñeca / ${circ_global_msd || "-"}cm global`);
    if (circ_wrist_msi || circ_global_msi) circParts.push(`MSI: ${circ_wrist_msi || "-"}cm muñeca / ${circ_global_msi || "-"}cm global`);
    const edemaCirc = circParts.length > 0 ? circParts.join(" | ") : null;

    const gonioLabels = ["Flex", "Ext", "DC", "DR", "Prono", "Supino"];
    const preVals = [pre_flex, pre_ext, pre_dc, pre_dr, pre_prono, pre_supino];
    const aromVal = preVals.some(v => v !== "") ? preVals.map((v, i) => v ? `${gonioLabels[i]}:${v}°` : "").filter(Boolean).join(" ") : null;

    const postVals = [post_flex, post_ext, post_dc, post_dr, post_prono, post_supino];
    const promVal = show_post_gonio && postVals.some(v => v !== "") ? postVals.map((v, i) => v ? `${gonioLabels[i]}:${v}°` : "").filter(Boolean).join(" ") : null;

    const kapandjiFinal = kapandji_val ? `${kapandji_val}/10${kapandji_pain ? " con dolor" : ""}` : null;

    const msParts: string[] = [];
    if (dppd) msParts.push(`DPPD: ${dppd}cm`);
    if (muscle_strength) msParts.push(muscle_strength);
    const msVal = msParts.length > 0 ? msParts.join(" — ") : null;

    const generalObsFinal = session_type === "admission"
      ? discharge_summary || general_observations || null
      : [discharge_summary, general_observations].filter(Boolean).join("\n\n") || null;

    // Step 2: Insert session
    const { data: session, error } = await supabase.from("therapy_sessions").insert({
      patient_id: patientId!, professional_id: user.id, is_deleted: false,
      session_date, session_type: session_type || null,
      session_number: session_number ? parseInt(session_number) : null,
      week_at_session: week_at_session ? parseInt(week_at_session) : null,
      general_observations: generalObsFinal,
      symptom_changes: symptom_changes || null,
      clinical_changes: clinical_changes || null,
      interventions: interventions || null,
      home_instructions_sent: home_instructions_sent || null,
      notes: notes || null,
    } as any).select().single();

    if (error || !session) { setSaving(false); toast.error("Error al guardar la sesión"); return; }

    // Step 3: Functional eval for admission
    if (session_type === "admission" && [func_dominance, func_avd, func_aivd, func_sleep, func_health].some(v => v)) {
      const { error: feErr } = await supabase.from("functional_evaluations").insert({
        patient_id: patientId!, professional_id: user.id,
        evaluation_date: session_date,
        dominance: (func_dominance || null) as any,
        avd: func_avd || null, aivd: func_aivd || null,
        sleep_rest: func_sleep || null, health_management: func_health || null,
      } as any);
      if (feErr) console.error("Error inserting func eval:", feErr);
    }

    // Step 4: Analytical eval if measurements
    const hasMeasurements = show_measurements && [
      pain_touched && pain_score > 0, painLocFinal, pain_characteristics,
      pain_aggravating_factors, edemaCirc, aromVal, promVal,
      dyn_msd, dyn_msi, kapandjiFinal, msVal,
      sensitivity, trophic_state, scar, posture, emotional_state,
    ].some(v => v !== "" && v !== null && v !== undefined && v !== false);

    if (hasMeasurements) {
      const { error: aeErr } = await supabase.from("analytical_evaluations").insert({
        patient_id: patientId!, professional_id: user.id,
        session_id: session.id, evaluation_date: session_date,
        pain_score: pain_touched ? pain_score : null,
        pain_location: painLocFinal,
        pain_characteristics: pain_characteristics || null,
        pain_aggravating_factors: pain_aggravating_factors || null,
        edema_circummetry: edemaCirc,
        arom: aromVal, prom: promVal,
        dynamometer_msd: dyn_msd ? parseFloat(dyn_msd) : null,
        dynamometer_msi: dyn_msi ? parseFloat(dyn_msi) : null,
        kapandji: kapandjiFinal,
        muscle_strength: msVal,
        sensitivity: sensitivity || null,
        trophic_state: trophic_state || null,
        scar: scar || null,
        posture: posture || null,
        emotional_state: emotional_state || null,
      });
      if (aeErr) { setSaving(false); toast.error("Error al guardar la sesión"); return; }
    }

    setSaving(false);
    toast.success("Sesión registrada correctamente");
    navigate(`/patients/${patientId}`);
  };

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
                <Select value={session_type} onValueChange={setSessionType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admission">Admisión</SelectItem>
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
                <h4 className="text-sm font-medium text-foreground">Dolor END</h4>
                <div className="flex items-center gap-3">
                  <Slider min={0} max={10} step={1} value={[pain_score]} onValueChange={([v]) => { setPainScore(v); setPainTouched(true); }} className="flex-1" />
                  <Badge variant="outline" className="text-sm font-semibold w-8 justify-center">{pain_score}</Badge>
                </div>
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
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Flex °</Label><Input type="number" value={pre_flex} onChange={e => setPreFlex(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Ext °</Label><Input type="number" value={pre_ext} onChange={e => setPreExt(e.target.value)} /></div>
                  <div className="space-y-2"><Label>DC °</Label><Input type="number" value={pre_dc} onChange={e => setPreDc(e.target.value)} /></div>
                  <div className="space-y-2"><Label>DR °</Label><Input type="number" value={pre_dr} onChange={e => setPreDr(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Prono °</Label><Input type="number" value={pre_prono} onChange={e => setPreProno(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Supino °</Label><Input type="number" value={pre_supino} onChange={e => setPreSupino(e.target.value)} /></div>
                </div>
              </div>

              {/* Goniometry POST */}
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={show_post_gonio} onCheckedChange={v => setShowPostGonio(!!v)} />
                  <Label className="font-normal">Registrar goniometría post-tratamiento</Label>
                </div>
                {show_post_gonio && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Flex °</Label><Input type="number" value={post_flex} onChange={e => setPostFlex(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Ext °</Label><Input type="number" value={post_ext} onChange={e => setPostExt(e.target.value)} /></div>
                    <div className="space-y-2"><Label>DC °</Label><Input type="number" value={post_dc} onChange={e => setPostDc(e.target.value)} /></div>
                    <div className="space-y-2"><Label>DR °</Label><Input type="number" value={post_dr} onChange={e => setPostDr(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Prono °</Label><Input type="number" value={post_prono} onChange={e => setPostProno(e.target.value)} /></div>
                    <div className="space-y-2"><Label>Supino °</Label><Input type="number" value={post_supino} onChange={e => setPostSupino(e.target.value)} /></div>
                  </div>
                )}
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
              </div>

              {/* Sensitivity & trophic */}
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-foreground">Sensibilidad y estado trófico</h4>
                <div className="space-y-2"><Label>Sensibilidad</Label><Textarea rows={2} value={sensitivity} onChange={e => setSensitivity(e.target.value)} /></div>
                <div className="space-y-2"><Label>Estado trófico</Label><Textarea rows={2} value={trophic_state} onChange={e => setTrophicState(e.target.value)} /></div>
                <div className="space-y-2"><Label>Cicatriz</Label><Textarea rows={2} value={scar} onChange={e => setScar(e.target.value)} /></div>
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
