import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "./Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Eye, Edit, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription } from "@/components/ui/dialog";
import { format, differenceInYears } from "date-fns";

export default function PatientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [patient, setPatient] = useState<any>(null);
  const [clinical, setClinical] = useState<any>(null);
  const [occupational, setOccupational] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [funcEvals, setFuncEvals] = useState<any[]>([]);
  const [analEvals, setAnalEvals] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewFuncEval, setShowNewFuncEval] = useState(false);
  const [showNewAnalEval, setShowNewAnalEval] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState<any>(null);
  const [showSessionDetail, setShowSessionDetail] = useState<any>(null);
  const [evalSubTab, setEvalSubTab] = useState("functional");

  const fetchAll = async () => {
    if (!id) return;
    const [p, c, o, s, fe, ae, pl, ap] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_clinical_records").select("*").eq("patient_id", id).single(),
      supabase.from("patient_occupational_profiles").select("*").eq("patient_id", id).single(),
      supabase.from("therapy_sessions").select("*").eq("patient_id", id).order("session_date", { ascending: false }),
      supabase.from("functional_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
      supabase.from("analytical_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
      supabase.from("treatment_plans").select("*").eq("patient_id", id).order("created_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("patient_id", id).order("appointment_date", { ascending: false }),
    ]);
    setPatient(p.data);
    setClinical(c.data);
    setOccupational(o.data);
    setSessions(s.data || []);
    setFuncEvals(fe.data || []);
    setAnalEvals(ae.data || []);
    setPlans(pl.data || []);
    setAppointments(ap.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!patient) return <p className="text-center text-muted-foreground py-12">Paciente no encontrado.</p>;

  const age = patient.birth_date ? differenceInYears(new Date(), new Date(patient.birth_date)) : null;

  const appointmentTypeMap: Record<string, string> = { consultation: "Consulta", follow_up: "Seguimiento", evaluation: "Evaluación" };

  const planStatusMap: Record<string, string> = { active: "Activo", completed: "Completado", archived: "Archivado" };

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate("/patients")} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" /> Volver
      </Button>

      {/* Header */}
      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{patient.last_name}, {patient.first_name}</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                <span>DNI: {patient.dni}</span>
                {age !== null && <span>{age} años</span>}
                {patient.insurance && <span>{patient.insurance}</span>}
                <span>Admisión: {format(new Date(patient.admission_date), "dd/MM/yyyy")}</span>
              </div>
            </div>
            <StatusBadge status={patient.status} />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="ficha" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="appointments">Turnos</TabsTrigger>
        </TabsList>

        {/* FICHA */}
        <TabsContent value="ficha" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Datos Clínicos</CardTitle></CardHeader>
            <CardContent>
              {clinical ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Fecha de lesión", clinical.injury_date],
                    ["Inicio de síntomas", clinical.symptom_start_date],
                    ["Mecanismo de lesión", clinical.injury_mechanism],
                    ["Tratamiento actual", clinical.current_treatment],
                    ["Semanas post lesión", clinical.weeks_post_injury],
                    ["Semanas post cirugía", clinical.weeks_post_surgery],
                    ["Médico derivante", clinical.doctor_name],
                    ["Próximo OyT", clinical.next_oyt_appointment],
                    ["Estudios", clinical.studies],
                    ["Antecedentes", clinical.medical_history],
                    ["Tratamiento farmacológico", clinical.pharmacological_treatment],
                    ["Notas", clinical.notes],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-muted-foreground text-xs">{label as string}</p>
                      <p className="text-foreground">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">Sin datos clínicos registrados.</p>}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Perfil Ocupacional</CardTitle></CardHeader>
            <CardContent>
              {occupational ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Red de apoyo", occupational.support_network],
                    ["Nivel educativo", occupational.education],
                    ["Trabajo", occupational.job],
                    ["Ocio", occupational.leisure],
                    ["Actividad física", occupational.physical_activity],
                    ["Sueño y descanso", occupational.sleep_rest],
                    ["Notas", occupational.notes],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-muted-foreground text-xs">{label as string}</p>
                      <p className="text-foreground">{(value as string) || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-muted-foreground text-sm">Sin perfil ocupacional.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SESSIONS */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Sesiones de Terapia</h2>
            <Button onClick={() => setShowNewSession(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva Sesión</Button>
          </div>
          {sessions.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin sesiones registradas.</p> : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <Card key={s.id} className="border-border/50 cursor-pointer hover:shadow-sm" onClick={() => setShowSessionDetail(s)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{format(new Date(s.session_date), "dd/MM/yyyy")}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{s.general_observations || "Sin observaciones"}</p>
                    </div>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* EVALUATIONS */}
        <TabsContent value="evaluations" className="space-y-4">
          <div className="flex gap-2 mb-4">
            <Button variant={evalSubTab === "functional" ? "default" : "outline"} size="sm" onClick={() => setEvalSubTab("functional")}>Funcional</Button>
            <Button variant={evalSubTab === "analytical" ? "default" : "outline"} size="sm" onClick={() => setEvalSubTab("analytical")}>Analítica</Button>
          </div>

          {evalSubTab === "functional" && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-foreground">Evaluaciones Funcionales</h2>
                <Button onClick={() => setShowNewFuncEval(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva Evaluación</Button>
              </div>
              {funcEvals.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin evaluaciones funcionales.</p> : (
                <div className="space-y-2">
                  {funcEvals.map((e) => (
                    <Card key={e.id} className="border-border/50">
                      <CardContent className="p-4">
                        <p className="font-medium text-sm">{format(new Date(e.evaluation_date), "dd/MM/yyyy")}</p>
                        <p className="text-xs text-muted-foreground">Barthel: {e.barthel_score ?? "—"} · Lateralidad: {e.dominance === "right" ? "Diestro" : e.dominance === "left" ? "Zurdo" : e.dominance === "ambidextrous" ? "Ambidiestro" : "—"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}

          {evalSubTab === "analytical" && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-foreground">Evaluaciones Analíticas</h2>
                <Button onClick={() => setShowNewAnalEval(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva Evaluación</Button>
              </div>
              {analEvals.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin evaluaciones analíticas.</p> : (
                <div className="space-y-2">
                  {analEvals.map((e) => (
                    <Card key={e.id} className="border-border/50">
                      <CardContent className="p-4">
                        <p className="font-medium text-sm">{format(new Date(e.evaluation_date), "dd/MM/yyyy")}</p>
                        <p className="text-xs text-muted-foreground">Dolor EVA: {e.pain_score ?? "—"}/10 · Edema: {e.edema || "—"}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Planes de Tratamiento</h2>
          </div>
          {plans.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin planes de tratamiento.</p> : (
            <div className="space-y-2">
              {plans.map((p) => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(p.start_date), "dd/MM/yyyy")} {p.end_date ? `— ${format(new Date(p.end_date), "dd/MM/yyyy")}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={p.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* APPOINTMENTS */}
        <TabsContent value="appointments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Turnos</h2>
            <Button onClick={() => setShowNewAppt(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Turno</Button>
          </div>
          {appointments.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin turnos.</p> : (
            <div className="space-y-2">
              {appointments.map((a) => (
                <Card key={a.id} className="border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {format(new Date(a.appointment_date), "dd/MM/yyyy HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">{appointmentTypeMap[a.type] || a.type}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Session Detail Dialog */}
      <Dialog open={!!showSessionDetail} onOpenChange={() => setShowSessionDetail(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Sesión — {showSessionDetail && format(new Date(showSessionDetail.session_date), "dd/MM/yyyy")}</DialogTitle></DialogHeader>
          {showSessionDetail && (
            <div className="space-y-3 text-sm">
              {[
                ["Observaciones generales", showSessionDetail.general_observations],
                ["Evolución", showSessionDetail.evolution],
                ["Cambios en síntomas", showSessionDetail.symptom_changes],
                ["Cambios clínicos", showSessionDetail.clinical_changes],
                ["Ajustes de tratamiento", showSessionDetail.treatment_adjustments],
                ["Próximo turno", showSessionDetail.next_appointment],
                ["Notas", showSessionDetail.notes],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-muted-foreground text-xs font-medium">{label as string}</p>
                  <p className="text-foreground">{(value as string) || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Session Dialog */}
      <NewSessionDialog open={showNewSession} onClose={() => setShowNewSession(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Functional Eval Dialog */}
      <NewFuncEvalDialog open={showNewFuncEval} onClose={() => setShowNewFuncEval(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Analytical Eval Dialog */}
      <NewAnalEvalDialog open={showNewAnalEval} onClose={() => setShowNewAnalEval(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Appointment Dialog */}
      <NewPatientApptDialog open={showNewAppt} onClose={() => setShowNewAppt(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />
    </div>
  );
}

// --- Sub-dialogs ---

function NewSessionDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    session_date: new Date().toISOString().split("T")[0],
    general_observations: "", evolution: "", symptom_changes: "", clinical_changes: "", treatment_adjustments: "", next_appointment: "", notes: "",
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("therapy_sessions").insert({
      patient_id: patientId, professional_id: userId,
      session_date: form.session_date,
      general_observations: form.general_observations || null,
      evolution: form.evolution || null,
      symptom_changes: form.symptom_changes || null,
      clinical_changes: form.clinical_changes || null,
      treatment_adjustments: form.treatment_adjustments || null,
      next_appointment: form.next_appointment || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar sesión"); return; }
    toast.success("Sesión registrada");
    setForm({ session_date: new Date().toISOString().split("T")[0], general_observations: "", evolution: "", symptom_changes: "", clinical_changes: "", treatment_adjustments: "", next_appointment: "", notes: "" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Sesión</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Fecha de sesión</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Observaciones generales</Label><Textarea value={form.general_observations} onChange={(e) => setForm({ ...form, general_observations: e.target.value })} rows={3} /></div>
          <div className="space-y-2"><Label>Evolución</Label><Textarea value={form.evolution} onChange={(e) => setForm({ ...form, evolution: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Cambios en síntomas</Label><Textarea value={form.symptom_changes} onChange={(e) => setForm({ ...form, symptom_changes: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Cambios clínicos</Label><Textarea value={form.clinical_changes} onChange={(e) => setForm({ ...form, clinical_changes: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Ajustes de tratamiento</Label><Textarea value={form.treatment_adjustments} onChange={(e) => setForm({ ...form, treatment_adjustments: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Próximo turno</Label><Input type="date" value={form.next_appointment} onChange={(e) => setForm({ ...form, next_appointment: e.target.value })} /></div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewFuncEvalDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    evaluation_date: new Date().toISOString().split("T")[0],
    barthel_score: "", dominance: "", avd: "", aivd: "", physical_activity: "", sleep_rest: "", notes: "",
  });

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("functional_evaluations").insert({
      patient_id: patientId, professional_id: userId,
      evaluation_date: form.evaluation_date,
      barthel_score: form.barthel_score ? parseInt(form.barthel_score) : null,
      dominance: (form.dominance as any) || null,
      avd: form.avd || null, aivd: form.aivd || null,
      physical_activity: form.physical_activity || null,
      sleep_rest: form.sleep_rest || null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar evaluación"); return; }
    toast.success("Evaluación funcional registrada");
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Evaluación Funcional</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.evaluation_date} onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Score Barthel (0-100)</Label><Input type="number" min={0} max={100} value={form.barthel_score} onChange={(e) => setForm({ ...form, barthel_score: e.target.value })} /></div>
          <div className="space-y-2"><Label>Lateralidad</Label>
            <Select value={form.dominance} onValueChange={(v) => setForm({ ...form, dominance: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="right">Diestro</SelectItem>
                <SelectItem value="left">Zurdo</SelectItem>
                <SelectItem value="ambidextrous">Ambidiestro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>AVD</Label><Textarea value={form.avd} onChange={(e) => setForm({ ...form, avd: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>AIVD</Label><Textarea value={form.aivd} onChange={(e) => setForm({ ...form, aivd: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Actividad física</Label><Textarea value={form.physical_activity} onChange={(e) => setForm({ ...form, physical_activity: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Sueño y descanso</Label><Textarea value={form.sleep_rest} onChange={(e) => setForm({ ...form, sleep_rest: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewAnalEvalDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [painScore, setPainScore] = useState([0]);
  const [form, setForm] = useState({
    evaluation_date: new Date().toISOString().split("T")[0],
    pain: "", edema: "", arom: "", prom: "", kapandji: "", muscle_strength: "", sensitivity: "",
    trophic_state: "", scar: "", posture: "", emotional_state: "", notes: "",
  });

  const painColor = painScore[0] <= 3 ? "text-emerald-600" : painScore[0] <= 6 ? "text-amber-500" : "text-red-600";

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("analytical_evaluations").insert({
      patient_id: patientId, professional_id: userId,
      evaluation_date: form.evaluation_date,
      pain_score: painScore[0],
      pain: form.pain || null, edema: form.edema || null,
      arom: form.arom || null, prom: form.prom || null,
      kapandji: form.kapandji || null, muscle_strength: form.muscle_strength || null,
      sensitivity: form.sensitivity || null, trophic_state: form.trophic_state || null,
      scar: form.scar || null, posture: form.posture || null,
      emotional_state: form.emotional_state || null, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar evaluación"); return; }
    toast.success("Evaluación analítica registrada");
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva Evaluación Analítica</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={form.evaluation_date} onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })} /></div>

          <div className="space-y-2">
            <Label>Dolor EVA: <span className={`font-bold ${painColor}`}>{painScore[0]}/10</span></Label>
            <Slider value={painScore} onValueChange={setPainScore} min={0} max={10} step={1} className="mt-2" />
          </div>

          <div className="space-y-2"><Label>Descripción del dolor</Label><Textarea value={form.pain} onChange={(e) => setForm({ ...form, pain: e.target.value })} rows={2} /></div>

          <div className="space-y-2"><Label>Edema</Label>
            <Select value={form.edema} onValueChange={(v) => setForm({ ...form, edema: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Ausente">Ausente</SelectItem>
                <SelectItem value="Leve">Leve</SelectItem>
                <SelectItem value="Moderado">Moderado</SelectItem>
                <SelectItem value="Severo">Severo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>AROM</Label><Textarea value={form.arom} onChange={(e) => setForm({ ...form, arom: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>PROM</Label><Textarea value={form.prom} onChange={(e) => setForm({ ...form, prom: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Kapandji</Label><Textarea value={form.kapandji} onChange={(e) => setForm({ ...form, kapandji: e.target.value })} rows={2} /></div>

          <div className="space-y-2"><Label>Fuerza muscular</Label>
            <Select value={form.muscle_strength} onValueChange={(v) => setForm({ ...form, muscle_strength: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Buena">Buena</SelectItem>
                <SelectItem value="Regular">Regular</SelectItem>
                <SelectItem value="Escasa">Escasa</SelectItem>
                <SelectItem value="Nula">Nula</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>Sensibilidad</Label>
            <Select value={form.sensitivity} onValueChange={(v) => setForm({ ...form, sensitivity: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Hipersensibilidad">Hipersensibilidad</SelectItem>
                <SelectItem value="Hiposensibilidad">Hiposensibilidad</SelectItem>
                <SelectItem value="Anestesia">Anestesia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2"><Label>Estado trófico</Label><Textarea value={form.trophic_state} onChange={(e) => setForm({ ...form, trophic_state: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Cicatriz</Label><Textarea value={form.scar} onChange={(e) => setForm({ ...form, scar: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Postura</Label><Textarea value={form.posture} onChange={(e) => setForm({ ...form, posture: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Estado emocional</Label><Textarea value={form.emotional_state} onChange={(e) => setForm({ ...form, emotional_state: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewPatientApptDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    appointment_date: "",
    type: "consultation" as "consultation" | "follow_up" | "evaluation",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    notes: "",
  });

  const handleSave = async () => {
    if (!form.appointment_date) { toast.error("Ingresá fecha y hora"); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: patientId, professional_id: userId,
      appointment_date: new Date(form.appointment_date).toISOString(),
      type: form.type, status: form.status, notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al crear turno"); return; }
    toast.success("Turno creado");
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo Turno</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Fecha y hora *</Label><Input type="datetime-local" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} /></div>
          <div className="space-y-2"><Label>Tipo</Label>
            <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consulta</SelectItem>
                <SelectItem value="follow_up">Seguimiento</SelectItem>
                <SelectItem value="evaluation">Evaluación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
