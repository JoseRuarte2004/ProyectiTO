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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Eye, Edit, Search, Trash2, FileDown, Upload, Download, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription } from "@/components/ui/dialog";
import { format, differenceInYears } from "date-fns";
import { exportPlanPdf } from "@/components/plans/PlanPdfExport";
import { NewAnalEvalDialog as NewAnalEvalDialogFull, AnalEvalList } from "@/components/evaluations/AnalyticalEvalForm";

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
  const [clinicalFiles, setClinicalFiles] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showNewSession, setShowNewSession] = useState(false);
  const [showNewFuncEval, setShowNewFuncEval] = useState(false);
  const [showNewAnalEval, setShowNewAnalEval] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState<any>(null);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [deletePlan, setDeletePlan] = useState<any>(null);
  const [showSessionDetail, setShowSessionDetail] = useState<any>(null);
  const [evalSubTab, setEvalSubTab] = useState("functional");
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [deleteFile, setDeleteFile] = useState<any>(null);

  const fetchAll = async () => {
    if (!id) return;
    const [p, c, o, s, fe, ae, pl, ap, cf] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_clinical_records").select("*").eq("patient_id", id).single(),
      supabase.from("patient_occupational_profiles").select("*").eq("patient_id", id).single(),
      supabase.from("therapy_sessions").select("*").eq("patient_id", id).order("session_date", { ascending: false }),
      supabase.from("functional_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
      supabase.from("analytical_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
      supabase.from("treatment_plans").select("*").eq("patient_id", id).eq("is_deleted", false).order("created_at", { ascending: false }),
      supabase.from("appointments").select("*").eq("patient_id", id).order("appointment_date", { ascending: false }),
      supabase.from("clinical_files").select("*").eq("patient_id", id).eq("is_deleted", false).order("photo_date", { ascending: false }),
    ]);
    setPatient(p.data);
    setClinical(c.data);
    setOccupational(o.data);
    setSessions(s.data || []);
    setFuncEvals(fe.data || []);
    setAnalEvals(ae.data || []);
    setPlans(pl.data || []);
    setAppointments(ap.data || []);
    const files = cf.data || [];
    setClinicalFiles(files);
    setLoading(false);
    // Fetch signed URLs for all files
    fetchSignedUrls(files);
  };

  const fetchSignedUrls = async (files: any[]) => {
    if (files.length === 0) { setSignedUrls({}); return; }
    setLoadingUrls(true);
    const urls: Record<string, string> = {};
    const results = await Promise.all(
      files.map(f => supabase.storage.from("clinical-files").createSignedUrl(f.file_path, 3600))
    );
    files.forEach((f, i) => {
      if (results[i].data?.signedUrl) urls[f.id] = results[i].data!.signedUrl;
    });
    setSignedUrls(urls);
    setLoadingUrls(false);
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
          <TabsTrigger value="archivos">Archivos</TabsTrigger>
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
                    ["Diagnóstico", clinical.diagnosis],
                    ["Tipo de tratamiento", clinical.treatment_type ? ({ conservative: "Conservador", surgery: "Quirúrgico", mixed: "Mixto" } as Record<string, string>)[clinical.treatment_type] || clinical.treatment_type : null],
                    ["Tratamiento actual", clinical.current_treatment],
                    ["Semanas post lesión", clinical.weeks_post_injury],
                    ["Semanas post cirugía", clinical.weeks_post_surgery],
                    ["Semanas de inmovilización", clinical.immobilization_weeks != null ? `${clinical.immobilization_weeks} semanas` : null],
                    ["Médico derivante", clinical.doctor_name],
                    ["Próximo OyT", clinical.next_oyt_appointment],
                    ["Estudios", clinical.studies],
                    ["Antecedentes", clinical.medical_history],
                    ["Tratamiento farmacológico", clinical.pharmacological_treatment],
                    ["Notas", clinical.notes],
                  ].filter(([, value]) => value != null && value !== "").map(([label, value]) => (
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
                    ["Lateralidad", occupational.dominance ? ({ right: "Derecha", left: "Izquierda", ambidextrous: "Ambidiestro/a" } as Record<string, string>)[occupational.dominance] || occupational.dominance : null],
                    ["Red de apoyo", occupational.support_network],
                    ["Nivel educativo", occupational.education],
                    ["Trabajo", occupational.job],
                    ["AVD", occupational.avd],
                    ["AIVD", occupational.aivd],
                    ["Ocio", occupational.leisure],
                    ["Actividad física", occupational.physical_activity],
                    ["Sueño y descanso", occupational.sleep_rest],
                    ["Gestión de la salud", occupational.health_management],
                    ["Puntaje DASH", occupational.dash_score != null ? `${occupational.dash_score}/100` : null],
                    ["Notas", occupational.notes],
                  ].filter(([, value]) => value != null && value !== "").map(([label, value]) => (
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
              {sessions.map((s) => {
                const typeLabel: Record<string, string> = { admission: "Admisión", follow_up: "Seguimiento", discharge: "Alta" };
                const typeColor: Record<string, string> = { admission: "bg-teal-100 text-teal-800", follow_up: "bg-blue-100 text-blue-800", discharge: "bg-green-100 text-green-800" };
                return (
                  <Card key={s.id} className="border-border/50 cursor-pointer hover:shadow-sm" onClick={() => setShowSessionDetail(s)}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm text-foreground">{format(new Date(s.session_date), "dd/MM/yyyy")}</p>
                        {s.session_type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[s.session_type] || "bg-muted text-muted-foreground"}`}>{typeLabel[s.session_type] || s.session_type}</span>}
                        {s.session_number != null && <span className="text-xs text-muted-foreground">Sesión Nº {s.session_number}</span>}
                        {s.week_at_session != null && <span className="text-xs text-muted-foreground">Semana {s.week_at_session} POP/PL</span>}
                      </div>
                      <Eye className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}
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
                <FuncEvalList evaluations={funcEvals} />
              )}
            </>
          )}

          {evalSubTab === "analytical" && (
            <>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold text-foreground">Evaluaciones Analíticas</h2>
                <Button onClick={() => setShowNewAnalEval(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nueva Evaluación</Button>
              </div>
              <AnalEvalList evaluations={analEvals} />
            </>
          )}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Planes de Tratamiento</h2>
            <Button onClick={() => setShowNewPlan(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Nuevo Plan</Button>
          </div>
          {plans.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Sin planes de tratamiento.</p> : (
            <div className="space-y-2">
              {plans.map((p) => (
                <Card key={p.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-foreground">{p.title}</p>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(p.start_date), "dd/MM/yyyy")} {p.end_date ? `— ${format(new Date(p.end_date), "dd/MM/yyyy")}` : ""}
                        </p>
                        {p.objective && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.objective}</p>}
                      </div>
                    </div>
                    <PlanCardActions plan={p} patient={patient} onDetail={() => setShowPlanDetail(p)} onEdit={() => setEditPlan(p)} onDelete={() => setDeletePlan(p)} />
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

        {/* ARCHIVOS */}
        <TabsContent value="archivos" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-foreground">Archivos Clínicos</h2>
            <Button onClick={() => setShowUploadFile(true)} size="sm"><Plus className="h-4 w-4 mr-1" />Agregar archivo</Button>
          </div>

          {/* Fotos de evolución */}
          <div>
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2"><ImageIcon className="h-4 w-4" />Fotos de evolución</h3>
            {(() => {
              const photos = clinicalFiles.filter(f => f.category === "photo");
              if (photos.length === 0) return <p className="text-muted-foreground text-sm text-center py-6">Sin fotos de evolución. Agregá la primera foto.</p>;
              if (loadingUrls) return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map(p => <Skeleton key={p.id} className="h-48 w-full rounded-lg" />)}
                </div>
              );
              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {photos.map(p => (
                    <div key={p.id} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted">
                      {signedUrls[p.id] ? (
                        <img src={signedUrls[p.id]} alt={p.description || p.file_name} className="w-full h-48 object-cover" />
                      ) : (
                        <div className="w-full h-48 flex items-center justify-center text-muted-foreground text-sm">Sin vista previa</div>
                      )}
                      <button
                        onClick={() => setDeleteFile(p)}
                        className="absolute top-2 right-2 bg-background/80 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <div className="p-2">
                        <p className="font-medium text-sm text-foreground">{format(new Date(p.photo_date), "dd/MM/yyyy")}</p>
                        {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          <div className="border-t border-border/50" />

          {/* Documentos y estudios */}
          <div>
            <h3 className="font-medium text-foreground mb-3">Documentos y estudios</h3>
            {(() => {
              const docs = clinicalFiles.filter(f => f.category === "study" || f.category === "document");
              if (docs.length === 0) return <p className="text-muted-foreground text-sm text-center py-6">Sin documentos ni estudios.</p>;
              return (
                <div className="space-y-2">
                  {docs.map(d => (
                    <Card key={d.id} className="border-border/50">
                      <CardContent className="p-3 flex items-center gap-3">
                        <span className="text-lg flex-shrink-0">{d.category === "study" ? "🔬" : "📄"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{d.file_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.category === "study" ? "bg-blue-100 text-blue-800" : "bg-muted text-muted-foreground"}`}>
                              {d.category === "study" ? "Estudio" : "Documento"}
                            </span>
                            <span className="text-xs text-muted-foreground">{format(new Date(d.photo_date), "dd/MM/yyyy")}</span>
                          </div>
                          {d.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{d.description}</p>}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {signedUrls[d.id] && (
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(signedUrls[d.id], "_blank")}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteFile(d)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      {/* Session Detail Dialog */}
      <SessionDetailDialog session={showSessionDetail} onClose={() => setShowSessionDetail(null)} />

      {/* New Session Dialog */}
      <NewSessionDialog open={showNewSession} onClose={() => setShowNewSession(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Functional Eval Dialog */}
      <NewFuncEvalDialog open={showNewFuncEval} onClose={() => setShowNewFuncEval(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Analytical Eval Dialog */}
      <NewAnalEvalDialogFull open={showNewAnalEval} onClose={() => setShowNewAnalEval(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Appointment Dialog */}
      <NewPatientApptDialog open={showNewAppt} onClose={() => setShowNewAppt(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* New Plan Dialog */}
      <NewPlanDialog open={showNewPlan} onClose={() => setShowNewPlan(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* Plan Detail Dialog */}
      <PlanDetailDialog plan={showPlanDetail} onClose={() => setShowPlanDetail(null)} />

      {/* Edit Plan Dialog */}
      <EditPlanDialog plan={editPlan} onClose={() => setEditPlan(null)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* Delete Plan Confirm */}
      <DeletePlanConfirm plan={deletePlan} onClose={() => setDeletePlan(null)} onSaved={fetchAll} />

      {/* Upload File Dialog */}
      <UploadFileDialog open={showUploadFile} onClose={() => setShowUploadFile(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} />

      {/* Delete File Confirm */}
      <DeleteFileConfirm file={deleteFile} onClose={() => setDeleteFile(null)} onDeleted={(fileId) => {
        setClinicalFiles(prev => prev.filter(f => f.id !== fileId));
        setSignedUrls(prev => { const n = { ...prev }; delete n[fileId]; return n; });
      }} />
    </div>
  );
}

// --- Sub-dialogs ---

function SessionDetailDialog({ session, onClose }: { session: any; onClose: () => void }) {
  if (!session) return null;
  const typeLabel: Record<string, string> = { admission: "Admisión", follow_up: "Seguimiento", discharge: "Alta" };
  const headerParts = [typeLabel[session.session_type] || "", format(new Date(session.session_date), "dd/MM/yyyy")];
  if (session.session_number != null) headerParts.push(`Sesión Nº ${session.session_number}`);
  if (session.week_at_session != null) headerParts.push(`Semana ${session.week_at_session} POP/PL`);

  const Section = ({ title, fields }: { title: string; fields: [string, any][] }) => {
    const visible = fields.filter(([, v]) => v != null && v !== "");
    if (visible.length === 0) return null;
    return (
      <div>
        <h3 className="font-semibold text-foreground mb-2">{title}</h3>
        <div className="space-y-2">
          {visible.map(([label, value]) => (
            <div key={label}><p className="text-muted-foreground text-xs font-medium">{label}</p><p className="whitespace-pre-wrap">{value}</p></div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={!!session} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{headerParts.join(" — ")}</DialogTitle>
          <DialogDescription className="sr-only">Detalle de sesión</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 text-sm">
          <Section title="Encabezado" fields={[
            ["Tipo de sesión", typeLabel[session.session_type] || null],
            ["Nº de sesión", session.session_number],
            ["Semana POP/PL", session.week_at_session],
          ]} />
          <Section title="Evolución" fields={[
            ["Observaciones generales", session.general_observations],
            ["Evolución", session.evolution],
            ["Cambios en síntomas", session.symptom_changes],
            ["Cambios clínicos", session.clinical_changes],
          ]} />
          <Section title="Intervenciones" fields={[
            ["En el día de hoy se abordó", session.interventions],
            ["Ajustes al tratamiento", session.treatment_adjustments],
            ["Indicaciones enviadas", session.home_instructions_sent],
          ]} />
          <Section title="Cierre" fields={[
            ["Próximo turno", session.next_appointment ? format(new Date(session.next_appointment), "dd/MM/yyyy") : null],
            ["Notas adicionales", session.notes],
          ]} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewSessionDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const initForm = () => ({
    session_date: new Date().toISOString().split("T")[0],
    session_type: "follow_up", session_number: "", week_at_session: "",
    general_observations: "", evolution: "", symptom_changes: "", clinical_changes: "",
    interventions: "", treatment_adjustments: "", home_instructions_sent: "",
    next_appointment: "", notes: "",
  });
  const [form, setForm] = useState(initForm());

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("therapy_sessions").insert({
      patient_id: patientId, professional_id: userId, is_deleted: false,
      session_date: form.session_date,
      session_type: form.session_type || null,
      session_number: form.session_number ? parseInt(form.session_number) : null,
      week_at_session: form.week_at_session ? parseInt(form.week_at_session) : null,
      general_observations: form.general_observations || null,
      evolution: form.evolution || null,
      symptom_changes: form.symptom_changes || null,
      clinical_changes: form.clinical_changes || null,
      interventions: form.interventions || null,
      treatment_adjustments: form.treatment_adjustments || null,
      home_instructions_sent: form.home_instructions_sent || null,
      next_appointment: form.next_appointment || null,
      notes: form.notes || null,
    } as any);
    setSaving(false);
    if (error) { toast.error("Error al registrar la sesión"); return; }
    toast.success("Sesión registrada correctamente");
    setForm(initForm());
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setForm(initForm()); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Sesión</DialogTitle>
          <DialogDescription className="sr-only">Formulario de nueva sesión de terapia</DialogDescription>
        </DialogHeader>
        <Accordion type="multiple" defaultValue={["header", "evolution", "interventions", "closure"]} className="w-full">
          <AccordionItem value="header">
            <AccordionTrigger className="text-sm font-semibold">Encabezado de sesión</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Fecha *</Label><Input type="date" value={form.session_date} onChange={(e) => setForm({ ...form, session_date: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Tipo de sesión</Label>
                <Select value={form.session_type} onValueChange={(v) => setForm({ ...form, session_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admission">Admisión</SelectItem>
                    <SelectItem value="follow_up">Seguimiento</SelectItem>
                    <SelectItem value="discharge">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Nº de sesión</Label><Input type="number" min={1} placeholder="Ej: 1 para primera sesión" value={form.session_number} onChange={(e) => setForm({ ...form, session_number: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Semana POP / Post lesión</Label>
                <Input type="number" min={0} value={form.week_at_session} onChange={(e) => setForm({ ...form, week_at_session: e.target.value })} />
                <p className="text-xs text-muted-foreground">Semana al momento de esta sesión</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="evolution">
            <AccordionTrigger className="text-sm font-semibold">Evolución</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Observaciones generales</Label><Textarea rows={3} placeholder="Estado general del paciente al inicio de la sesión..." value={form.general_observations} onChange={(e) => setForm({ ...form, general_observations: e.target.value })} /></div>
              <div className="space-y-2"><Label>Evolución</Label><Textarea rows={3} placeholder="Ej: Paciente refiere mejoría en rangos de flexión respecto a sesión anterior..." value={form.evolution} onChange={(e) => setForm({ ...form, evolution: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cambios en síntomas</Label><Textarea rows={2} placeholder="Dolor, edema, sensibilidad, parestesias..." value={form.symptom_changes} onChange={(e) => setForm({ ...form, symptom_changes: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cambios clínicos</Label><Textarea rows={2} placeholder="Goniometría, fuerza, circometría, Kapandji..." value={form.clinical_changes} onChange={(e) => setForm({ ...form, clinical_changes: e.target.value })} /></div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="interventions">
            <AccordionTrigger className="text-sm font-semibold">Intervenciones</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2"><Label>En el día de hoy se abordó</Label><Textarea rows={5} placeholder="Ej: Ejercicios de movilidad activa de muñeca, elongaciones, baños de contraste..." value={form.interventions} onChange={(e) => setForm({ ...form, interventions: e.target.value })} /></div>
              <div className="space-y-2"><Label>Ajustes al tratamiento</Label><Textarea rows={3} placeholder="Cambios en el plan, nueva indicación médica, modificación de ejercicios..." value={form.treatment_adjustments} onChange={(e) => setForm({ ...form, treatment_adjustments: e.target.value })} /></div>
              <div className="space-y-2"><Label>Indicaciones enviadas (vía telefónica o al alta)</Label><Textarea rows={3} placeholder="Ej: Se envían por WhatsApp ejercicios de movilidad 3 veces al día, 10 repeticiones..." value={form.home_instructions_sent} onChange={(e) => setForm({ ...form, home_instructions_sent: e.target.value })} /></div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="closure">
            <AccordionTrigger className="text-sm font-semibold">Cierre</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Próximo turno</Label><Input type="date" value={form.next_appointment} onChange={(e) => setForm({ ...form, next_appointment: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notas adicionales</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { setForm(initForm()); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.session_date}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewFuncEvalDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    evaluation_date: new Date().toISOString().split("T")[0],
    dominance: "", barthel_score: "", dash_score: "",
    avd: "", aivd: "", work_education: "", leisure: "",
    physical_activity: "", sleep_rest: "", health_management: "",
    observations: "",
  });

  const resetForm = () => setForm({
    evaluation_date: new Date().toISOString().split("T")[0],
    dominance: "", barthel_score: "", dash_score: "",
    avd: "", aivd: "", work_education: "", leisure: "",
    physical_activity: "", sleep_rest: "", health_management: "",
    observations: "",
  });

  const buildNotes = () => {
    const parts: string[] = [];
    if (form.work_education.trim()) parts.push(`Trabajo/Educación: ${form.work_education.trim()}`);
    if (form.leisure.trim()) parts.push(`Ocio: ${form.leisure.trim()}`);
    if (form.observations.trim()) parts.push(`Observaciones: ${form.observations.trim()}`);
    return parts.length > 0 ? parts.join("\n\n") : null;
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("functional_evaluations").insert({
      patient_id: patientId, professional_id: userId,
      evaluation_date: form.evaluation_date,
      dominance: (form.dominance as any) || null,
      barthel_score: form.barthel_score ? parseInt(form.barthel_score) : null,
      dash_score: form.dash_score ? parseInt(form.dash_score) : null,
      avd: form.avd || null, aivd: form.aivd || null,
      physical_activity: form.physical_activity || null,
      sleep_rest: form.sleep_rest || null,
      health_management: form.health_management || null,
      notes: buildNotes(),
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar la evaluación funcional"); return; }
    toast.success("Evaluación funcional registrada correctamente");
    resetForm();
    onSaved(); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Evaluación Funcional</DialogTitle>
          <DialogDescription className="sr-only">Formulario de evaluación funcional</DialogDescription>
        </DialogHeader>
        <Accordion type="multiple" defaultValue={["general", "occupational", "health", "notes"]} className="w-full">
          {/* Section 1 */}
          <AccordionItem value="general">
            <AccordionTrigger className="text-sm font-semibold">Datos Generales</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Fecha de evaluación *</Label>
                <Input type="date" value={form.evaluation_date} onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Lateralidad</Label>
                <Select value={form.dominance} onValueChange={(v) => setForm({ ...form, dominance: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="right">Derecha</SelectItem>
                    <SelectItem value="left">Izquierda</SelectItem>
                    <SelectItem value="ambidextrous">Ambidiestro/a</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Puntaje Barthel (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.barthel_score} onChange={(e) => setForm({ ...form, barthel_score: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Puntaje DASH (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.dash_score} onChange={(e) => setForm({ ...form, dash_score: e.target.value })} />
                <p className="text-xs text-muted-foreground">0 = sin discapacidad, 100 = máxima discapacidad</p>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 2 */}
          <AccordionItem value="occupational">
            <AccordionTrigger className="text-sm font-semibold">Desempeño Ocupacional</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>AVD — Actividades de la vida diaria</Label>
                <Textarea value={form.avd} onChange={(e) => setForm({ ...form, avd: e.target.value })} rows={3} placeholder="Higiene, alimentación, vestido, traslados..." />
              </div>
              <div className="space-y-2">
                <Label>AIVD — Actividades instrumentales</Label>
                <Textarea value={form.aivd} onChange={(e) => setForm({ ...form, aivd: e.target.value })} rows={3} placeholder="Preparación de comidas, manejo de dinero, uso del teléfono, compras..." />
              </div>
              <div className="space-y-2">
                <Label>Trabajo / Educación</Label>
                <Textarea value={form.work_education} onChange={(e) => setForm({ ...form, work_education: e.target.value })} rows={3} placeholder="Situación laboral/educativa actual, limitaciones, objetivos..." />
              </div>
              <div className="space-y-2">
                <Label>Ocio y tiempo libre</Label>
                <Textarea value={form.leisure} onChange={(e) => setForm({ ...form, leisure: e.target.value })} rows={2} />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 3 */}
          <AccordionItem value="health">
            <AccordionTrigger className="text-sm font-semibold">Hábitos de Salud</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Actividad física</Label>
                <Textarea value={form.physical_activity} onChange={(e) => setForm({ ...form, physical_activity: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Descanso y sueño</Label>
                <Textarea value={form.sleep_rest} onChange={(e) => setForm({ ...form, sleep_rest: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Gestión de la salud</Label>
                <Textarea value={form.health_management} onChange={(e) => setForm({ ...form, health_management: e.target.value })} rows={2} placeholder="Adherencia a turnos médicos, automedicación, hábitos preventivos..." />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Section 4 */}
          <AccordionItem value="notes">
            <AccordionTrigger className="text-sm font-semibold">Notas de Evaluación</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Observaciones adicionales</Label>
                <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={3} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !form.evaluation_date}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FuncEvalList({ evaluations }: { evaluations: any[] }) {
  const [detail, setDetail] = useState<any>(null);
  const dominanceMap: Record<string, string> = { right: "Derecha", left: "Izquierda", ambidextrous: "Ambidiestro/a" };

  const ScoreBadge = ({ label, value, max }: { label: string; value: number | null; max: number }) => {
    if (value === null || value === undefined) return null;
    const pct = value / max;
    const color = pct <= 0.33 ? "bg-green-100 text-green-800" : pct <= 0.66 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
    return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{label}: {value}/{max}</span>;
  };

  return (
    <>
      <div className="space-y-2">
        {evaluations.map((e) => (
          <Card key={e.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-sm">{format(new Date(e.evaluation_date), "dd/MM/yyyy")}</p>
                <ScoreBadge label="Barthel" value={e.barthel_score} max={100} />
                <ScoreBadge label="DASH" value={e.dash_score} max={100} />
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDetail(e)}><Eye className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluación Funcional — {detail && format(new Date(detail.evaluation_date), "dd/MM/yyyy")}</DialogTitle>
            <DialogDescription className="sr-only">Detalle de evaluación funcional</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-5 text-sm">
              {/* General */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Datos Generales</h3>
                <div className="grid grid-cols-2 gap-3">
                  {detail.dominance && <div><p className="text-muted-foreground text-xs font-medium">Lateralidad</p><p>{dominanceMap[detail.dominance] || detail.dominance}</p></div>}
                  {detail.barthel_score != null && <div><p className="text-muted-foreground text-xs font-medium">Puntaje Barthel</p><p>{detail.barthel_score}/100</p></div>}
                  {detail.dash_score != null && <div><p className="text-muted-foreground text-xs font-medium">Puntaje DASH</p><p>{detail.dash_score}/100</p></div>}
                </div>
              </div>
              {/* Occupational */}
              {(detail.avd || detail.aivd || (detail.notes && (detail.notes.includes("Trabajo/Educación:") || detail.notes.includes("Ocio:")))) && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Desempeño Ocupacional</h3>
                  <div className="space-y-2">
                    {detail.avd && <div><p className="text-muted-foreground text-xs font-medium">AVD</p><p className="whitespace-pre-wrap">{detail.avd}</p></div>}
                    {detail.aivd && <div><p className="text-muted-foreground text-xs font-medium">AIVD</p><p className="whitespace-pre-wrap">{detail.aivd}</p></div>}
                  </div>
                </div>
              )}
              {/* Health */}
              {(detail.physical_activity || detail.sleep_rest || detail.health_management) && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Hábitos de Salud</h3>
                  <div className="space-y-2">
                    {detail.physical_activity && <div><p className="text-muted-foreground text-xs font-medium">Actividad física</p><p className="whitespace-pre-wrap">{detail.physical_activity}</p></div>}
                    {detail.sleep_rest && <div><p className="text-muted-foreground text-xs font-medium">Descanso y sueño</p><p className="whitespace-pre-wrap">{detail.sleep_rest}</p></div>}
                    {detail.health_management && <div><p className="text-muted-foreground text-xs font-medium">Gestión de la salud</p><p className="whitespace-pre-wrap">{detail.health_management}</p></div>}
                  </div>
                </div>
              )}
              {/* Notes */}
              {detail.notes && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Notas</h3>
                  <p className="whitespace-pre-wrap">{detail.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// NewAnalEvalDialog moved to src/components/evaluations/AnalyticalEvalForm.tsx

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

interface SelectedExercise {
  id: string;
  name: string;
  body_region: string | null;
  repetitions: number | null;
  sets: number | null;
  frequency: string;
  duration: string;
  notes: string;
}

function NewPlanDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "", objective: "", indications: "", skin_care: "",
    joint_protection_guidelines: "", home_item_recommendations: "",
    start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "",
  });
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchEx, setSearchEx] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);

  useEffect(() => {
    if (step === 2 && exercises.length === 0) {
      setLoadingEx(true);
      supabase.from("exercise_library")
        .select("id, name, body_region, default_repetitions, default_sets, default_frequency, default_duration")
        .eq("is_active", true)
        .then(({ data }) => { setExercises(data || []); setLoadingEx(false); });
    }
  }, [step]);

  const resetAndClose = () => {
    setStep(1);
    setForm({ title: "", objective: "", indications: "", skin_care: "", joint_protection_guidelines: "", home_item_recommendations: "", start_date: new Date().toISOString().split("T")[0], end_date: "", notes: "" });
    setSelectedExercises([]);
    setSearchEx("");
    onClose();
  };

  const toggleExercise = (ex: any) => {
    const exists = selectedExercises.find(s => s.id === ex.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter(s => s.id !== ex.id));
    } else {
      setSelectedExercises([...selectedExercises, {
        id: ex.id, name: ex.name, body_region: ex.body_region,
        repetitions: ex.default_repetitions, sets: ex.default_sets,
        frequency: ex.default_frequency || "", duration: ex.default_duration || "", notes: "",
      }]);
    }
  };

  const updateSelected = (id: string, field: string, value: any) => {
    setSelectedExercises(selectedExercises.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    const { data: plan, error } = await supabase.from("treatment_plans").insert({
      patient_id: patientId, professional_id: userId,
      title: form.title, objective: form.objective || null,
      indications: form.indications || null, skin_care: form.skin_care || null,
      joint_protection_guidelines: form.joint_protection_guidelines || null,
      home_item_recommendations: form.home_item_recommendations || null,
      start_date: form.start_date, end_date: form.end_date || null,
      notes: form.notes || null, status: "active" as const,
    }).select().single();

    if (error || !plan) {
      setSaving(false);
      toast.error("Error al crear el plan de tratamiento");
      return;
    }

    if (selectedExercises.length > 0) {
      const { error: exError } = await supabase.from("treatment_plan_exercises").insert(
        selectedExercises.map((ex, i) => ({
          treatment_plan_id: plan.id, exercise_id: ex.id,
          repetitions: ex.repetitions, sets: ex.sets,
          frequency: ex.frequency || null, duration: ex.duration || null,
          notes: ex.notes || null, order_index: i,
        }))
      );
      if (exError) console.error("Error inserting exercises:", exError);
    }

    setSaving(false);
    toast.success("Plan de tratamiento creado correctamente");
    onSaved();
    resetAndClose();
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchEx.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Plan de Tratamiento — Paso {step} de 2</DialogTitle>
          <DialogDescription className="sr-only">Formulario para crear un nuevo plan de tratamiento</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Plan de rehabilitación mano derecha" /></div>
            <div className="space-y-2"><Label>Objetivo terapéutico</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Indicaciones generales</Label><Textarea value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Cuidado de piel</Label><Textarea value={form.skin_care} onChange={(e) => setForm({ ...form, skin_care: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Pautas de protección articular</Label><Textarea value={form.joint_protection_guidelines} onChange={(e) => setForm({ ...form, joint_protection_guidelines: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Recomendaciones para el hogar</Label><Textarea value={form.home_item_recommendations} onChange={(e) => setForm({ ...form, home_item_recommendations: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fecha fin (opcional)</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!form.title.trim()}>Siguiente →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar ejercicio..." value={searchEx} onChange={(e) => setSearchEx(e.target.value)} />
            </div>

            {loadingEx ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredExercises.map((ex) => {
                  const selected = selectedExercises.find(s => s.id === ex.id);
                  return (
                    <div key={ex.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={!!selected} onCheckedChange={() => toggleExercise(ex)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{ex.name}</p>
                          {ex.body_region && <p className="text-xs text-muted-foreground">{ex.body_region}</p>}
                        </div>
                      </div>
                      {selected && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                          <div className="space-y-1">
                            <Label className="text-xs">Repeticiones</Label>
                            <Input type="number" className="h-8 text-xs" value={selected.repetitions ?? ""} onChange={(e) => updateSelected(ex.id, "repetitions", e.target.value ? parseInt(e.target.value) : null)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Series</Label>
                            <Input type="number" className="h-8 text-xs" value={selected.sets ?? ""} onChange={(e) => updateSelected(ex.id, "sets", e.target.value ? parseInt(e.target.value) : null)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Frecuencia</Label>
                            <Input className="h-8 text-xs" value={selected.frequency} onChange={(e) => updateSelected(ex.id, "frequency", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Duración</Label>
                            <Input className="h-8 text-xs" value={selected.duration} onChange={(e) => updateSelected(ex.id, "duration", e.target.value)} />
                          </div>
                          <div className="col-span-2 sm:col-span-4 space-y-1">
                            <Label className="text-xs">Notas</Label>
                            <Input className="h-8 text-xs" value={selected.notes} onChange={(e) => updateSelected(ex.id, "notes", e.target.value)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredExercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No se encontraron ejercicios.</p>}
              </div>
            )}

            {selectedExercises.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedExercises.length} ejercicio(s) seleccionado(s)</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Volver</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Plan"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanDetailDialog({ plan, onClose }: { plan: any; onClose: () => void }) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plan) {
      setLoading(true);
      supabase.from("treatment_plan_exercises")
        .select("*, exercise_library(name, body_region)")
        .eq("treatment_plan_id", plan.id)
        .order("order_index")
        .then(({ data }) => { setExercises(data || []); setLoading(false); });
    } else {
      setExercises([]);
    }
  }, [plan]);

  return (
    <Dialog open={!!plan} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan?.title}</DialogTitle>
          <DialogDescription className="sr-only">Detalle del plan de tratamiento</DialogDescription>
        </DialogHeader>
        {plan && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <StatusBadge status={plan.status} />
              <span className="text-sm text-muted-foreground">
                {format(new Date(plan.start_date), "dd/MM/yyyy")}
                {plan.end_date ? ` — ${format(new Date(plan.end_date), "dd/MM/yyyy")}` : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {[
                ["Objetivo", plan.objective],
                ["Indicaciones", plan.indications],
                ["Cuidado de piel", plan.skin_care],
                ["Protección articular", plan.joint_protection_guidelines],
                ["Recomendaciones hogar", plan.home_item_recommendations],
                ["Notas", plan.notes],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <p className="text-muted-foreground text-xs font-medium">{label as string}</p>
                  <p className="text-foreground">{(value as string) || "—"}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-semibold text-sm mb-2">Ejercicios asignados</h3>
              {loading ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : exercises.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin ejercicios asignados.</p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex) => (
                    <div key={ex.id} className="border rounded-lg p-3 text-sm">
                      <p className="font-medium">{ex.custom_name || ex.exercise_library?.name || "Ejercicio"}</p>
                      {ex.exercise_library?.body_region && <p className="text-xs text-muted-foreground">{ex.exercise_library.body_region}</p>}
                      <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                        {ex.repetitions && <span>Rep: {ex.repetitions}</span>}
                        {ex.sets && <span>Series: {ex.sets}</span>}
                        {ex.frequency && <span>Frec: {ex.frequency}</span>}
                        {ex.duration && <span>Dur: {ex.duration}</span>}
                      </div>
                      {ex.notes && <p className="text-xs text-muted-foreground mt-1">{ex.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditPlanDialog({ plan, onClose, patientId, userId, onSaved }: { plan: any; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: "", objective: "", indications: "", skin_care: "",
    joint_protection_guidelines: "", home_item_recommendations: "",
    start_date: "", end_date: "", notes: "", status: "active" as string,
  });
  const [exercises, setExercises] = useState<any[]>([]);
  const [searchEx, setSearchEx] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>([]);
  const [loadingEx, setLoadingEx] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (plan && !initialized) {
      setForm({
        title: plan.title || "", objective: plan.objective || "",
        indications: plan.indications || "", skin_care: plan.skin_care || "",
        joint_protection_guidelines: plan.joint_protection_guidelines || "",
        home_item_recommendations: plan.home_item_recommendations || "",
        start_date: plan.start_date || "", end_date: plan.end_date || "",
        notes: plan.notes || "", status: plan.status || "active",
      });
      setStep(1);
      setInitialized(true);

      // Load existing exercises for this plan
      supabase.from("treatment_plan_exercises")
        .select("*, exercise_library(name, body_region)")
        .eq("treatment_plan_id", plan.id)
        .order("order_index")
        .then(({ data }) => {
          if (data) {
            setSelectedExercises(data.map((ex: any) => ({
              id: ex.exercise_id,
              name: ex.custom_name || ex.exercise_library?.name || "",
              body_region: ex.exercise_library?.body_region || null,
              repetitions: ex.repetitions, sets: ex.sets,
              frequency: ex.frequency || "", duration: ex.duration || "", notes: ex.notes || "",
            })));
          }
        });
    }
    if (!plan) { setInitialized(false); setSelectedExercises([]); setExercises([]); setSearchEx(""); }
  }, [plan, initialized]);

  useEffect(() => {
    if (plan && step === 2 && exercises.length === 0) {
      setLoadingEx(true);
      supabase.from("exercise_library")
        .select("id, name, body_region, default_repetitions, default_sets, default_frequency, default_duration")
        .eq("is_active", true)
        .then(({ data }) => { setExercises(data || []); setLoadingEx(false); });
    }
  }, [step, plan]);

  const resetAndClose = () => { setStep(1); setInitialized(false); onClose(); };

  const toggleExercise = (ex: any) => {
    const exists = selectedExercises.find(s => s.id === ex.id);
    if (exists) {
      setSelectedExercises(selectedExercises.filter(s => s.id !== ex.id));
    } else {
      setSelectedExercises([...selectedExercises, {
        id: ex.id, name: ex.name, body_region: ex.body_region,
        repetitions: ex.default_repetitions, sets: ex.default_sets,
        frequency: ex.default_frequency || "", duration: ex.default_duration || "", notes: "",
      }]);
    }
  };

  const updateSelected = (id: string, field: string, value: any) => {
    setSelectedExercises(selectedExercises.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from("treatment_plans").update({
      title: form.title, objective: form.objective || null,
      indications: form.indications || null, skin_care: form.skin_care || null,
      joint_protection_guidelines: form.joint_protection_guidelines || null,
      home_item_recommendations: form.home_item_recommendations || null,
      start_date: form.start_date, end_date: form.end_date || null,
      notes: form.notes || null, status: form.status as any,
    }).eq("id", plan.id);

    if (error) { setSaving(false); toast.error("Error al actualizar el plan"); return; }

    // Replace exercises: delete old, insert new
    await supabase.from("treatment_plan_exercises").delete().eq("treatment_plan_id", plan.id);
    if (selectedExercises.length > 0) {
      await supabase.from("treatment_plan_exercises").insert(
        selectedExercises.map((ex, i) => ({
          treatment_plan_id: plan.id, exercise_id: ex.id,
          repetitions: ex.repetitions, sets: ex.sets,
          frequency: ex.frequency || null, duration: ex.duration || null,
          notes: ex.notes || null, order_index: i,
        }))
      );
    }

    setSaving(false);
    toast.success("Plan actualizado correctamente");
    onSaved();
    resetAndClose();
  };

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(searchEx.toLowerCase())
  );

  return (
    <Dialog open={!!plan} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plan — Paso {step} de 2</DialogTitle>
          <DialogDescription className="sr-only">Formulario para editar plan de tratamiento</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2"><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Objetivo terapéutico</Label><Textarea value={form.objective} onChange={(e) => setForm({ ...form, objective: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Indicaciones generales</Label><Textarea value={form.indications} onChange={(e) => setForm({ ...form, indications: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Cuidado de piel</Label><Textarea value={form.skin_care} onChange={(e) => setForm({ ...form, skin_care: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Pautas de protección articular</Label><Textarea value={form.joint_protection_guidelines} onChange={(e) => setForm({ ...form, joint_protection_guidelines: e.target.value })} rows={2} /></div>
            <div className="space-y-2"><Label>Recomendaciones para el hogar</Label><Textarea value={form.home_item_recommendations} onChange={(e) => setForm({ ...form, home_item_recommendations: e.target.value })} rows={2} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Fecha inicio</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Fecha fin (opcional)</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
              <Button onClick={() => setStep(2)} disabled={!form.title.trim()}>Siguiente →</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar ejercicio..." value={searchEx} onChange={(e) => setSearchEx(e.target.value)} />
            </div>

            {loadingEx ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {filteredExercises.map((ex) => {
                  const selected = selectedExercises.find(s => s.id === ex.id);
                  return (
                    <div key={ex.id} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <Checkbox checked={!!selected} onCheckedChange={() => toggleExercise(ex)} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{ex.name}</p>
                          {ex.body_region && <p className="text-xs text-muted-foreground">{ex.body_region}</p>}
                        </div>
                      </div>
                      {selected && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pl-7">
                          <div className="space-y-1"><Label className="text-xs">Repeticiones</Label><Input type="number" className="h-8 text-xs" value={selected.repetitions ?? ""} onChange={(e) => updateSelected(ex.id, "repetitions", e.target.value ? parseInt(e.target.value) : null)} /></div>
                          <div className="space-y-1"><Label className="text-xs">Series</Label><Input type="number" className="h-8 text-xs" value={selected.sets ?? ""} onChange={(e) => updateSelected(ex.id, "sets", e.target.value ? parseInt(e.target.value) : null)} /></div>
                          <div className="space-y-1"><Label className="text-xs">Frecuencia</Label><Input className="h-8 text-xs" value={selected.frequency} onChange={(e) => updateSelected(ex.id, "frequency", e.target.value)} /></div>
                          <div className="space-y-1"><Label className="text-xs">Duración</Label><Input className="h-8 text-xs" value={selected.duration} onChange={(e) => updateSelected(ex.id, "duration", e.target.value)} /></div>
                          <div className="col-span-2 sm:col-span-4 space-y-1"><Label className="text-xs">Notas</Label><Input className="h-8 text-xs" value={selected.notes} onChange={(e) => updateSelected(ex.id, "notes", e.target.value)} /></div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredExercises.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No se encontraron ejercicios.</p>}
              </div>
            )}

            {selectedExercises.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedExercises.length} ejercicio(s) seleccionado(s)</p>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>← Volver</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Cambios"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeletePlanConfirm({ plan, onClose, onSaved }: { plan: any; onClose: () => void; onSaved: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("treatment_plans").update({ is_deleted: true }).eq("id", plan.id);
    setDeleting(false);
    if (error) { toast.error("Error al eliminar el plan"); return; }
    toast.success("Plan eliminado correctamente");
    onSaved();
    onClose();
  };

  return (
    <AlertDialog open={!!plan} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar plan de tratamiento?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el plan "{plan?.title}". Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function PlanCardActions({ plan, patient, onDetail, onEdit, onDelete }: { plan: any; patient: any; onDetail: () => void; onEdit: () => void; onDelete: () => void }) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPlanPdf(plan, patient);
      toast.success("PDF exportado correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al exportar PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
      <Button variant="default" size="sm" className="flex-1 min-w-0" onClick={onDetail}>
        <Eye className="h-4 w-4 mr-1 shrink-0" /> Detalle
      </Button>
      <Button variant="outline" size="sm" className="flex-1 min-w-0" onClick={onEdit}>
        <Edit className="h-4 w-4 mr-1 shrink-0" /> Editar
      </Button>
      <Button variant="outline" size="sm" className="flex-1 min-w-0" onClick={handleExport} disabled={exporting}>
        {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><FileDown className="h-4 w-4 mr-1 shrink-0" /> PDF</>}
      </Button>
      <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
