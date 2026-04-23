import { useEffect, useRef, useState } from "react";
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

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Eye, Edit, Search, Trash2, FileDown, Upload, Download, Image as ImageIcon, ChevronDown, ChevronUp, BarChart3, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogDescription } from "@/components/ui/dialog";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
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
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [activeEpisodeId, setActiveEpisodeId] = useState<string | null>(null);
  const [showNewEpisode, setShowNewEpisode] = useState(false);

  // Dialog states
  
  const [showNewFuncEval, setShowNewFuncEval] = useState(false);
  const [showNewAnalEval, setShowNewAnalEval] = useState(false);
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [showNewPlan, setShowNewPlan] = useState(false);
  const [showPlanDetail, setShowPlanDetail] = useState<any>(null);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [deletePlan, setDeletePlan] = useState<any>(null);
  
  const [evalSubTab, setEvalSubTab] = useState("functional");
  const [showUploadFile, setShowUploadFile] = useState(false);
  const [deleteFile, setDeleteFile] = useState<any>(null);

  const fetchPatientBase = async () => {
    if (!id) return;
    const [p, o, ep] = await Promise.all([
      supabase.from("patients").select("*").eq("id", id).single(),
      supabase.from("patient_occupational_profiles").select("*").eq("patient_id", id).single(),
      supabase.from("treatment_episodes").select("*").eq("patient_id", id).eq("is_deleted", false).order("episode_number", { ascending: true }),
    ]);
    setPatient(p.data);
    setOccupational(o.data);
    const eps = ep.data || [];
    setEpisodes(eps);
    // Default to active episode or last one
    const activeEp = eps.find((e: any) => e.status === "active") || eps[eps.length - 1];
    const epId = activeEp?.id || null;
    if (!activeEpisodeId) setActiveEpisodeId(epId);
    return epId;
  };

  const fetchEpisodeData = async (episodeId: string | null) => {
    if (!id) return;
    const apptPromise = supabase.from("appointments").select("*").eq("patient_id", id).order("appointment_date", { ascending: false });
    
    if (!episodeId) {
      // No episode: fallback to patient-level queries
      const [c, s, fe, ae, pl, cf, ap] = await Promise.all([
        supabase.from("patient_clinical_records").select("*").eq("patient_id", id).single(),
        supabase.from("therapy_sessions").select("*").eq("patient_id", id).eq("is_deleted", false).order("session_date", { ascending: false }),
        supabase.from("functional_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
        supabase.from("analytical_evaluations").select("*").eq("patient_id", id).order("evaluation_date", { ascending: false }),
        supabase.from("treatment_plans").select("*").eq("patient_id", id).eq("is_deleted", false).order("created_at", { ascending: false }),
        supabase.from("clinical_files").select("*").eq("patient_id", id).eq("is_deleted", false).order("photo_date", { ascending: false }),
        apptPromise,
      ]);
      setClinical(c.data);
      setSessions(s.data || []);
      setFuncEvals(fe.data || []);
      setAnalEvals(ae.data || []);
      setPlans(pl.data || []);
      setAppointments(ap.data || []);
      const files = cf.data || [];
      setClinicalFiles(files);
      setLoading(false);
      fetchSignedUrls(files);
      return;
    }

    const [c, s, fe, ae, pl, cf, ap] = await Promise.all([
      supabase.from("patient_clinical_records").select("*").eq("patient_id", id).eq("episode_id", episodeId).single(),
      supabase.from("therapy_sessions").select("*").eq("patient_id", id).eq("episode_id", episodeId).eq("is_deleted", false).order("session_date", { ascending: false }),
      supabase.from("functional_evaluations").select("*").eq("patient_id", id).eq("episode_id", episodeId).order("evaluation_date", { ascending: false }),
      supabase.from("analytical_evaluations").select("*").eq("patient_id", id).eq("episode_id", episodeId).order("evaluation_date", { ascending: false }),
      supabase.from("treatment_plans").select("*").eq("patient_id", id).eq("episode_id", episodeId).eq("is_deleted", false).order("created_at", { ascending: false }),
      supabase.from("clinical_files").select("*").eq("patient_id", id).eq("is_deleted", false).order("photo_date", { ascending: false }),
      apptPromise,
    ]);
    setClinical(c.data);
    setSessions(s.data || []);
    setFuncEvals(fe.data || []);
    setAnalEvals(ae.data || []);
    setPlans(pl.data || []);
    setAppointments(ap.data || []);
    const files = cf.data || [];
    setClinicalFiles(files);
    setLoading(false);
    fetchSignedUrls(files);
  };

  const fetchAll = async () => {
    const epId = await fetchPatientBase();
    await fetchEpisodeData(activeEpisodeId || epId || null);
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

  // Re-fetch episode-scoped data when switching episodes
  useEffect(() => {
    if (activeEpisodeId && !loading) {
      fetchEpisodeData(activeEpisodeId);
    }
  }, [activeEpisodeId]);

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
              {(patient.birth_date || patient.phone || patient.address) && (
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  {patient.birth_date && <span>Nac: {format(new Date(patient.birth_date + "T12:00:00"), "dd/MM/yyyy")}</span>}
                  {patient.phone && <span>Tel: {patient.phone}</span>}
                  {patient.address && <span>Dir: {patient.address}</span>}
                </div>
              )}
            </div>
            <StatusBadge status={patient.status} />
          </div>
        </CardContent>
      </Card>

      {/* Episode selector */}
      {episodes.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {episodes.map((ep: any) => (
            <button
              key={ep.id}
              onClick={() => setActiveEpisodeId(ep.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                ep.id === activeEpisodeId
                  ? "bg-teal-600 text-white border-teal-600"
                  : "bg-background text-foreground border-border hover:bg-muted"
              }`}
            >
              Episodio {ep.episode_number}{ep.diagnosis ? ` — ${ep.diagnosis}` : ""} · {format(new Date(ep.admission_date + "T12:00:00"), "dd/MM/yyyy")}
            </button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setShowNewEpisode(true)}>
            <Plus className="h-3 w-3 mr-1" />Nuevo episodio
          </Button>
        </div>
      )}
      {episodes.length <= 1 && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowNewEpisode(true)}>
            <Plus className="h-3 w-3 mr-1" />Nuevo episodio
          </Button>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="resumen">Historia</TabsTrigger>
          <TabsTrigger value="ficha">Ficha</TabsTrigger>
          <TabsTrigger value="sessions">Sesiones</TabsTrigger>
          <TabsTrigger value="evaluations">Evaluaciones</TabsTrigger>
          <TabsTrigger value="plans">Planes</TabsTrigger>
          <TabsTrigger value="appointments">Turnos</TabsTrigger>
          <TabsTrigger value="archivos">Archivos</TabsTrigger>
        </TabsList>

        {/* RESUMEN */}
        <TabsContent value="resumen">
          {(() => {
            const ordinalR = (n: number | null) => {
              if (!n) return "";
              const m: Record<number, string> = {1:"1ra",2:"2da",3:"3ra",4:"4ta",5:"5ta",6:"6ta",7:"7ma",8:"8va",9:"9na",10:"10ma"};
              return m[n] || `${n}ra`;
            };
            const sortedSessions = [...sessions].sort((a, b) => a.session_date.localeCompare(b.session_date));

            return (
              <div className="max-w-3xl mx-auto space-y-0 text-sm text-foreground">
                {/* ENCABEZADO */}
                <div className="pb-4 border-b border-border">
                  <h2 className="text-xl font-bold">{patient.last_name}, {patient.first_name}</h2>
                  <p className="text-muted-foreground mt-1">
                    DNI: {patient.dni} · {age !== null ? `${age} años` : "Edad desconocida"} · {patient.insurance || "Sin obra social"} · Admisión: {format(new Date(patient.admission_date), "dd/MM/yyyy")}
                  </p>
                  {clinical?.diagnosis && (
                    <p className="mt-2 font-semibold text-teal-700">Dx: {clinical.diagnosis}</p>
                  )}
                </div>

                {/* HISTORIAL DE VISITAS */}
                {sortedSessions.length > 0 ? (
                  <div>
                    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase pt-5 pb-2">HISTORIAL DE VISITAS</p>
                    {sortedSessions.map((s) => {
                      const linkedEval = analEvals.find((e: any) => e.session_id === s.id);
                      return (
                        <div key={s.id} className="pt-4 pb-4 border-b border-border/40 last:border-0">
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            <span className="font-semibold">
                              {format(new Date(s.session_date + "T12:00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.session_type === "admission" ? "bg-purple-100 text-purple-700" :
                              s.session_type === "discharge" ? "bg-green-100 text-green-700" :
                              "bg-teal-50 text-teal-700"
                            }`}>
                              {s.session_type === "admission" ? "Admisión" : s.session_type === "discharge" ? "Alta" : "Seguimiento"}
                            </span>
                            {s.session_number && (
                              <span className="text-xs text-muted-foreground">Sesión Nº {s.session_number}</span>
                            )}
                            {s.week_at_session != null && (
                              <span className="text-xs text-muted-foreground">· Semana {s.week_at_session} POP/PL</span>
                            )}
                          </div>

                          {(s.session_number || s.week_at_session != null) && (
                            <p className="italic text-muted-foreground text-xs mb-3">
                              Paciente asiste a {ordinalR(s.session_number)} sesión
                              {s.week_at_session != null ? `, cursando su ${s.week_at_session}ma semana POP/PL` : ""}.
                            </p>
                          )}

                          {(s.general_observations || s.evolution || s.symptom_changes || s.clinical_changes || s.treatment_adjustments) && (
                            <div className="mb-3 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Evolución</p>
                              {s.general_observations && <p className="whitespace-pre-wrap">{s.general_observations}</p>}
                              {s.evolution && <p className="whitespace-pre-wrap">{s.evolution}</p>}
                              {s.symptom_changes && <p><span className="font-medium">Cambios en síntomas:</span> {s.symptom_changes}</p>}
                              {s.clinical_changes && <p><span className="font-medium">Cambios clínicos:</span> {s.clinical_changes}</p>}
                              {s.treatment_adjustments && <p><span className="font-medium">Ajustes:</span> {s.treatment_adjustments}</p>}
                            </div>
                          )}

                          {s.avd_followup && (
                            <div className="mb-3 space-y-1">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">AVD en sesión</p>
                              <p className="whitespace-pre-wrap">{s.avd_followup}</p>
                            </div>
                          )}

                          {linkedEval && (
                            <div className="mb-3 space-y-1">
                              <p className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-2">Mediciones del día</p>
                              <MeasurementsBlock e={linkedEval} />
                            </div>
                          )}

                          {s.interventions && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">En el día de hoy se abordó</p>
                              <p className="whitespace-pre-wrap">{s.interventions}</p>
                            </div>
                          )}

                          {s.home_instructions_sent && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Indicaciones enviadas</p>
                              <p className="whitespace-pre-wrap">{s.home_instructions_sent}</p>
                            </div>
                          )}

                          {s.notes && (
                            <p className="italic text-muted-foreground text-xs mt-2">{s.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-8 text-center text-muted-foreground text-sm">
                    <p>Aún no hay visitas registradas.</p>
                    <p className="text-xs mt-1">Registrá la primera visita desde el tab Sesiones.</p>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* FICHA */}
        <TabsContent value="ficha" className="space-y-4">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base">Datos Clínicos</CardTitle></CardHeader>
            <CardContent>
              {clinical ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Diagnóstico", clinical.diagnosis],
                    ["Tipo de tratamiento", clinical.treatment_type ? ({ conservative: "Conservador", surgery: "Quirúrgico", mixed: "Mixto" } as Record<string, string>)[clinical.treatment_type] || clinical.treatment_type : null],
                    ["Fecha de lesión", clinical.injury_date ? format(new Date(clinical.injury_date + "T12:00:00"), "dd/MM/yyyy") : null],
                    ["Inicio de síntomas", clinical.symptom_start_date ? format(new Date(clinical.symptom_start_date + "T12:00:00"), "dd/MM/yyyy") : null],
                    ["Mecanismo de lesión", clinical.injury_mechanism],
                    ["Tratamiento actual", clinical.current_treatment],
                    ["Semanas post lesión", (() => {
                      const w = clinical.weeks_post_injury; const d = clinical.days_post_injury;
                      if (w == null && d == null) return null;
                      return [w != null ? `${w} semanas` : "", d != null ? `${d} días` : ""].filter(Boolean).join(" ");
                    })()],
                    ["Semanas post cirugía", (() => {
                      const w = clinical.weeks_post_surgery; const d = clinical.days_post_surgery;
                      if (w == null && d == null) return null;
                      return [w != null ? `${w} semanas` : "", d != null ? `${d} días` : ""].filter(Boolean).join(" ");
                    })()],
                    ["Semanas de inmovilización", (() => {
                      const w = clinical.immobilization_weeks; const d = clinical.immobilization_days;
                      if (w == null && d == null) return null;
                      return [w != null ? `${w} semanas` : "", d != null ? `${d} días` : ""].filter(Boolean).join(" ");
                    })()],
                    ["Médico derivante", clinical.doctor_name],
                    ["Próximo OyT", clinical.next_oyt_appointment ? format(new Date(clinical.next_oyt_appointment + "T12:00:00"), "dd/MM/yyyy") : null],
                    ["Estudios", clinical.studies],
                    ["Antecedentes personales", clinical.medical_history],
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
                    ["Lateralidad", occupational.dominance ? ({ right: "Diestro/a", left: "Zurdo/a", ambidextrous: "Ambidiestro/a" } as Record<string, string>)[occupational.dominance] || occupational.dominance : null],
                    ["Red de apoyo", occupational.support_network],
                    ["Educación", occupational.education],
                    ["Trabajo", occupational.job],
                    ["Ocio", occupational.leisure],
                    ["Actividad física", occupational.physical_activity],
                    ["Sueño y descanso", occupational.sleep_rest],
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

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-semibold text-foreground">Historial de visitas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{sessions.length} {sessions.length === 1 ? "visita registrada" : "visitas registradas"}</p>
            </div>
            <Button onClick={() => navigate(`/patients/${id}/sessions/new${activeEpisodeId ? `?episode=${activeEpisodeId}` : ''}`)} size="sm" className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"><Plus className="h-4 w-4 mr-2" />Registrar visita</Button>
          </div>
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-teal-50 flex items-center justify-center mb-4">
                <Activity className="h-8 w-8 text-teal-400" />
              </div>
              <p className="font-medium text-foreground">Sin visitas registradas</p>
              <p className="text-sm text-muted-foreground mt-1">Registrá la primera visita con el botón de arriba</p>
            </div>
          ) : (
            <>
              <SessionTimeline sessions={sessions} analEvals={analEvals} />
              {(() => {
                const dischargeSession = sessions.find(s => s.session_type === "discharge");
                if (!dischargeSession) return null;
                return (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800 font-medium">
                    ✓ Alta otorgada el {format(new Date(dischargeSession.session_date + "T12:00:00"), "dd/MM/yyyy")} — Objetivos de tratamiento cumplidos
                  </div>
                );
              })()}
            </>
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
              </div>
              <AnalEvalList evaluations={analEvals} />
              <p className="text-xs text-muted-foreground text-center mt-2">Las evaluaciones analíticas se registran desde el tab Sesiones</p>
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

      {/* New Episode Dialog */}
      <NewEpisodeDialog open={showNewEpisode} onClose={() => setShowNewEpisode(false)} patientId={id!} userId={user!.id} episodes={episodes} onSaved={async (newEpId: string) => {
        setActiveEpisodeId(newEpId);
        await fetchPatientBase();
        await fetchEpisodeData(newEpId);
      }} />


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
      <UploadFileDialog open={showUploadFile} onClose={() => setShowUploadFile(false)} patientId={id!} userId={user!.id} onSaved={fetchAll} episodeId={activeEpisodeId} />

      {/* Delete File Confirm */}
      <DeleteFileConfirm file={deleteFile} onClose={() => setDeleteFile(null)} onDeleted={(fileId) => {
        setClinicalFiles(prev => prev.filter(f => f.id !== fileId));
        setSignedUrls(prev => { const n = { ...prev }; delete n[fileId]; return n; });
      }} />
    </div>
  );
}

// --- Session Timeline ---

// ---------------------------------------------------------------------------
// MeasurementsBlock — Renders structured "Mediciones del día" with sub-sections
// ---------------------------------------------------------------------------
const TEST_LABELS: Record<string, string> = {
  finkelstein: "Finkelstein",
  phalen: "Phalen",
  froment: "Froment",
  wartenberg: "Wartenberg",
  garra_cubital: "Garra cubital",
  jobe: "Jobe",
  pate: "Pate",
  yocum: "Yocum",
  herber: "Herber",
};

const FINGER_LABELS: Record<string, string> = {
  thumb: "Pulgar",
  index: "Índice",
  middle: "Medio",
  ring: "Anular",
  pinky: "Meñique",
  pulgar: "Pulgar",
  indice: "Índice",
  índice: "Índice",
  medio: "Medio",
  anular: "Anular",
  menique: "Meñique",
  meñique: "Meñique",
};

const SCAR_LABELS: Record<string, string> = {
  location: "Localización",
  localizacion: "Localización",
  length: "Longitud",
  longitud: "Longitud",
  vascularization: "Vascularización",
  vascularizacion: "Vascularización",
  pigmentation: "Pigmentación",
  pigmentacion: "Pigmentación",
  flexibility: "Flexibilidad",
  flexibilidad: "Flexibilidad",
  sensitivity: "Sensibilidad",
  sensibilidad: "Sensibilidad",
  relief: "Relieve",
  relieve: "Relieve",
  temperature: "Temperatura",
  temperatura: "Temperatura",
  observations: "Observaciones",
  observaciones: "Observaciones",
  notes: "Observaciones",
};

const VSS_LABELS: Record<string, string> = {
  pigmentation: "Pigmentación",
  pigmentacion: "Pigmentación",
  vascularization: "Vascularización",
  vascularizacion: "Vascularización",
  pliability: "Flexibilidad",
  flexibility: "Flexibilidad",
  flexibilidad: "Flexibilidad",
  height: "Altura",
  altura: "Altura",
};

const PART_NAMES: Record<string, string> = {
  shoulder: "Hombro",
  elbow: "Codo",
  wrist: "Muñeca",
  hand: "Mano",
  thumb: "Pulgar",
};

function MeasurementsBlock({ e }: { e: any }) {
  const nn = (v: any) => v != null && v !== "";

  const SubSection = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="border-l-2 border-teal-300 pl-3 py-1 space-y-1">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
      <div className="space-y-1 text-sm text-foreground">{children}</div>
    </div>
  );

  const FieldLine = ({ label, value }: { label: string; value: any }) => {
    if (!nn(value)) return null;
    return (
      <p className="text-sm whitespace-pre-wrap"><span className="font-medium text-gray-700">{label}:</span> {value}</p>
    );
  };

  // ---------- DOLOR ----------
  const evaColor = (n: number) =>
    n <= 3 ? "bg-green-100 text-green-700 border-green-200"
    : n <= 6 ? "bg-yellow-100 text-yellow-700 border-yellow-200"
    : "bg-red-100 text-red-700 border-red-200";

  const hasPain = nn(e.pain_score) || nn(e.pain_appearance) || nn(e.pain_location)
    || nn(e.pain_radiation) || nn(e.pain_characteristics) || nn(e.pain_aggravating_factors) || nn(e.pain);

  // ---------- EDEMA ----------
  const hasEdema = nn(e.edema) || nn(e.edema_circummetry) || nn(e.godet_test);

  // ---------- MOVILIDAD ----------
  const renderGonio = () => {
    const g = e.goniometry;
    if (!g || typeof g !== "object") return [];
    const parts: JSX.Element[] = [];
    const renderPart = (which: "pre" | "post", data: any) => {
      if (!data || !data.values || typeof data.values !== "object") return null;
      const vals = Object.entries(data.values).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k} ${v}°`);
      if (vals.length === 0) return null;
      const partLabel = PART_NAMES[data.body_part] || data.body_part || "";
      return (
        <p key={`${which}-${partLabel}`} className="text-sm">
          <span className="font-medium text-gray-700">[{partLabel}]</span>{" "}
          <span className="text-xs font-semibold text-gray-500 uppercase">{which.toUpperCase()}:</span>{" "}
          {vals.join(" · ")}
        </p>
      );
    };
    const pre = renderPart("pre", g.pre);
    const post = renderPart("post", g.post);
    if (pre) parts.push(pre);
    if (post) parts.push(post);
    return parts;
  };
  const gonioParts = renderGonio();
  const hasMobility = gonioParts.length > 0 || nn(e.arom) || nn(e.prom) || nn(e.kapandji);
  // Detect "cierre de puño" inside arom/prom strings (no dedicated column)
  // Render arom/prom as fallback if no jsonb goniometry
  const showAromFallback = gonioParts.length === 0 && (nn(e.arom) || nn(e.prom));

  // ---------- FUERZA ----------
  const renderDppd = () => {
    const f = e.dppd_fingers;
    if (!f || typeof f !== "object") return null;
    const entries = Object.entries(f).filter(([, v]) => nn(v));
    if (entries.length === 0) return null;
    return (
      <p className="text-sm">
        <span className="font-medium text-gray-700">DPPD:</span>{" "}
        {entries.map(([k, v]) => `${FINGER_LABELS[k] || k}: ${v}cm`).join(", ")}
      </p>
    );
  };
  const dppdNode = renderDppd();
  const hasDppdJson = dppdNode !== null;

  const renderNerve = (label: string, raw: string) => {
    try {
      const obj = JSON.parse(raw);
      const entries = Object.entries(obj).filter(([, v]) => nn(v));
      if (entries.length === 0) return null;
      return (
        <p key={label} className="text-sm">
          <span className="font-medium text-gray-700">{label}:</span>{" "}
          {entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ")}
        </p>
      );
    } catch {
      return <p key={label} className="text-sm"><span className="font-medium text-gray-700">{label}:</span> {raw}</p>;
    }
  };
  const hasKendall = nn(e.muscle_strength_median) || nn(e.muscle_strength_cubital) || nn(e.muscle_strength_radial);
  const hasStrength = nn(e.dynamometer_msd) || nn(e.dynamometer_msi) || nn(e.dynamometer_notes)
    || nn(e.muscle_strength) || hasDppdJson || hasKendall;

  // ---------- SENSIBILIDAD ----------
  const epi = {
    tacto: e.sensitivity_tacto_ligero,
    dos: e.sensitivity_dos_puntos,
    pick: e.sensitivity_picking_up,
    sw: e.sensitivity_semmes_weinstein,
  };
  const proto = {
    toco: e.sensitivity_toco_pincho,
    temp: e.sensitivity_temperatura,
  };
  const hasEpi = nn(epi.tacto) || nn(epi.dos) || nn(epi.pick) || nn(epi.sw);
  const hasProto = nn(proto.toco) || nn(proto.temp);
  const hasSensitivity = nn(e.sensitivity_tacto_ligero) || nn(e.sensitivity_dos_puntos)
    || nn(e.sensitivity_picking_up) || nn(e.sensitivity_semmes_weinstein)
    || nn(e.sensitivity_toco_pincho) || nn(e.sensitivity_temperatura)
    || nn(e.sensitivity);

  // ---------- PRUEBAS ESPECÍFICAS ----------
  const renderTests = () => {
    const t = e.specific_tests;
    if (!t || typeof t !== "object") return null;
    const filled = Object.entries(t).filter(([, v]) => v === "positive" || v === "negative");
    if (filled.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5">
        {filled.map(([name, result]) => (
          <span
            key={name}
            className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
              result === "positive"
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-green-100 text-green-700 border-green-200"
            }`}
          >
            {TEST_LABELS[name] || name} {result === "positive" ? "+" : "−"}
          </span>
        ))}
      </div>
    );
  };
  const testsNode = renderTests();
  const hasTests = testsNode !== null;

  // ---------- CICATRIZ ----------
  const renderScar = () => {
    const s = e.scar_evaluation;
    if (!s || typeof s !== "object") return { fields: [] as JSX.Element[], vss: null as JSX.Element | null };
    const fieldOrder = ["location", "localizacion", "length", "longitud", "vascularization", "vascularizacion",
      "pigmentation", "pigmentacion", "flexibility", "flexibilidad", "sensitivity", "sensibilidad",
      "relief", "relieve", "temperature", "temperatura", "observations", "observaciones", "notes"];
    const seen = new Set<string>();
    const fields: JSX.Element[] = [];
    fieldOrder.forEach((k) => {
      const labelKey = SCAR_LABELS[k];
      if (!labelKey || seen.has(labelKey)) return;
      const v = s[k];
      if (!nn(v)) return;
      seen.add(labelKey);
      fields.push(<FieldLine key={k} label={labelKey} value={v} />);
    });

    // VSS sub-scores
    const vssSrc = s.vss || s.vancouver || s;
    const vssParts: string[] = [];
    ["pigmentation", "pigmentacion", "vascularization", "vascularizacion", "pliability", "flexibility", "flexibilidad", "height", "altura"].forEach((k) => {
      const lbl = VSS_LABELS[k];
      if (!lbl) return;
      const v = vssSrc?.[k];
      if (v == null || v === "") return;
      if (vssParts.find(p => p.startsWith(lbl + ":"))) return;
      vssParts.push(`${lbl}: ${v}`);
    });
    const vssNode = vssParts.length > 0
      ? <p className="text-xs text-gray-600">{vssParts.join(" | ")}</p>
      : null;

    return { fields, vss: vssNode };
  };
  const scarRendered = renderScar();
  const hasScar = scarRendered.fields.length > 0 || nn(e.scar) || nn(e.vancouver_score) || scarRendered.vss !== null;

  // ---------- OTROS ----------
  const hasOthers = nn(e.trophic_state) || nn(e.posture) || nn(e.emotional_state);

  const hasAny = hasPain || hasEdema || hasMobility || hasStrength || hasSensitivity
    || hasTests || hasScar || hasOthers || nn(e.osas_score) || nn(e.notes);

  if (!hasAny) return null;

  return (
    <div className="bg-white rounded-lg border border-border/40 p-3 space-y-3">
      {hasPain && (
        <SubSection label="Dolor">
          {nn(e.pain_score) && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">EVA</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${evaColor(Number(e.pain_score))}`}>
                {e.pain_score}/10
              </span>
            </div>
          )}
          <FieldLine label="Aparición" value={e.pain_appearance} />
          <FieldLine label="Localización" value={e.pain_location} />
          <FieldLine label="Irradiación" value={e.pain_radiation} />
          <FieldLine label="Características" value={e.pain_characteristics} />
          <FieldLine label="Agravantes" value={e.pain_aggravating_factors} />
          {nn(e.pain) && <p className="text-sm text-muted-foreground italic">{e.pain}</p>}
        </SubSection>
      )}

      {hasEdema && (
        <SubSection label="Edema">
          <FieldLine label="Observación" value={e.edema} />
          <FieldLine label="Circometría" value={e.edema_circummetry} />
          <FieldLine label="Godet" value={e.godet_test} />
        </SubSection>
      )}

      {hasMobility && (
        <SubSection label="Movilidad">
          {gonioParts.length > 0 && <div className="space-y-0.5">{gonioParts}</div>}
          {showAromFallback && (
            <>
              {nn(e.arom) && <FieldLine label="Goniometría PRE" value={e.arom} />}
              {nn(e.prom) && <FieldLine label="Goniometría POST" value={e.prom} />}
            </>
          )}
          <FieldLine label="Kapandji" value={e.kapandji} />
        </SubSection>
      )}

      {hasStrength && (
        <SubSection label="Fuerza">
          {(nn(e.dynamometer_msd) || nn(e.dynamometer_msi)) && (
            <p className="text-sm">
              <span className="font-medium text-gray-700">Dinamómetro:</span>{" "}
              {nn(e.dynamometer_msd) ? `MSD ${e.dynamometer_msd}kg` : ""}
              {nn(e.dynamometer_msd) && nn(e.dynamometer_msi) ? " / " : ""}
              {nn(e.dynamometer_msi) ? `MSI ${e.dynamometer_msi}kg` : ""}
            </p>
          )}
          <FieldLine label="Nota evaluación" value={e.dynamometer_notes} />
          {!hasDppdJson && <FieldLine label="Fuerza muscular" value={e.muscle_strength} />}
          {dppdNode}
          {hasKendall && (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Kendall</p>
              {nn(e.muscle_strength_median) && renderNerve("N. Mediano", e.muscle_strength_median)}
              {nn(e.muscle_strength_cubital) && renderNerve("N. Cubital", e.muscle_strength_cubital)}
              {nn(e.muscle_strength_radial) && renderNerve("N. Radial", e.muscle_strength_radial)}
            </div>
          )}
          {hasDppdJson && nn(e.muscle_strength) && <FieldLine label="Notas" value={e.muscle_strength} />}
        </SubSection>
      )}

      {hasSensitivity && (
        <SubSection label="Sensibilidad">
          {hasEpi && (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Epicrítica</p>
              <FieldLine label="Tacto ligero" value={epi.tacto} />
              <FieldLine label="Discriminación 2 puntos" value={epi.dos} />
              <FieldLine label="Picking up" value={epi.pick} />
              <FieldLine label="Semmes-Weinstein" value={epi.sw} />
            </div>
          )}
          {hasProto && (
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-gray-500 uppercase">Protopática</p>
              <FieldLine label="Toco-pincho" value={proto.toco} />
              <FieldLine label="Temperatura" value={proto.temp} />
            </div>
          )}
          {nn(e.sensitivity) && <p className="text-sm text-muted-foreground italic">{e.sensitivity}</p>}
        </SubSection>
      )}

      {hasTests && (
        <SubSection label="Pruebas específicas">
          {testsNode}
        </SubSection>
      )}

      {hasScar && (
        <SubSection label="Cicatriz">
          {scarRendered.fields}
          {scarRendered.fields.length === 0 && nn(e.scar) && <p className="text-sm whitespace-pre-wrap">{e.scar}</p>}
          {scarRendered.vss}
          {nn(e.vancouver_score) && (
            <span className="inline-block text-xs px-2 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-200">
              VSS: {e.vancouver_score}/15
            </span>
          )}
        </SubSection>
      )}

      {hasOthers && (
        <SubSection label="Otros">
          <FieldLine label="Estado trófico" value={e.trophic_state} />
          <FieldLine label="Postura" value={e.posture} />
          <FieldLine label="Emotividad" value={e.emotional_state} />
        </SubSection>
      )}

      {nn(e.osas_score) && (
        <p className="text-xs text-muted-foreground">OSAS: {e.osas_score}/60</p>
      )}
      {nn(e.notes) && (
        <p className="text-sm italic text-muted-foreground border-t border-border/30 pt-2">{e.notes}</p>
      )}
    </div>
  );
}

function SessionTimeline({ sessions, analEvals }: { sessions: any[]; analEvals: any[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const typeLabel: Record<string, string> = { admission: "Admisión", follow_up: "Seguimiento", discharge: "Alta" };
  const typeColor: Record<string, string> = { admission: "bg-purple-100 text-purple-700", follow_up: "bg-teal-50 text-teal-700", discharge: "bg-green-100 text-green-700" };

  const ordinal = (n: number) => {
    if (n === 1) return "1ra";
    if (n === 2) return "2da";
    if (n === 3) return "3ra";
    if (n === 4) return "4ta";
    if (n === 5) return "5ta";
    return `${n}ma`;
  };

  const SectionHeading = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">{children}</p>
  );

  const Line = ({ children }: { children: React.ReactNode }) => (
    <p className="text-sm text-foreground whitespace-pre-wrap">{children}</p>
  );

  const nn = (v: any) => v != null && v !== "";

  const partNames: Record<string, string> = { shoulder: "Hombro", elbow: "Codo", wrist: "Muñeca", hand: "Mano", thumb: "Pulgar" };

  const renderGonioJsonb = (g: any) => {
    if (!g || typeof g !== "object") return null;
    const renderPart = (label: string, data: any) => {
      if (!data || !data.values || typeof data.values !== "object") return null;
      const vals = Object.entries(data.values).filter(([,v]) => v != null).map(([k,v]) => `${k}: ${v}°`);
      if (vals.length === 0) return null;
      return <Line key={label}>{label} ({partNames[data.body_part] || data.body_part}): {vals.join(" · ")}</Line>;
    };
    return <>{renderPart("Goniometría PRE", g.pre)}{renderPart("Goniometría POST", g.post)}</>;
  };

  const renderSpecificTests = (tests: any) => {
    if (!tests || typeof tests !== "object") return null;
    const filled = Object.entries(tests).filter(([, v]) => nn(v));
    if (filled.length === 0) return null;
    return (
      <div>
        <span className="font-medium text-sm">Pruebas específicas: </span>
        {filled.map(([name, result]) => (
          <span key={name} className={`inline-block text-xs px-1.5 py-0.5 rounded mr-1 mb-0.5 ${result === "positive" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
            {name} {result === "positive" ? "+" : "−"}
          </span>
        ))}
      </div>
    );
  };

  const renderNerveStrength = (e: any) => {
    const hasAny = nn(e.muscle_strength_median) || nn(e.muscle_strength_cubital) || nn(e.muscle_strength_radial);
    if (!hasAny) return null;
    const renderNerve = (label: string, raw: string) => {
      try {
        const obj = JSON.parse(raw);
        const entries = Object.entries(obj).filter(([,v]) => v);
        if (entries.length === 0) return null;
        return <Line key={label}>{label}: {entries.map(([k,v]) => `${k.replace(/_/g," ")}: ${v}`).join(", ")}</Line>;
      } catch { return <Line>{label}: {raw}</Line>; }
    };
    return <>
      {nn(e.muscle_strength_median) && renderNerve("N. Mediano", e.muscle_strength_median)}
      {nn(e.muscle_strength_cubital) && renderNerve("N. Cubital", e.muscle_strength_cubital)}
      {nn(e.muscle_strength_radial) && renderNerve("N. Radial", e.muscle_strength_radial)}
    </>;
  };

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-teal-200" />
      {sessions.map((s) => {
        const isOpen = expanded === s.id;
        const linkedEval = analEvals.find(e => e.session_id === s.id);

        return (
          <div key={s.id} className="relative pl-12 pb-8">
            <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white border-2 border-teal-500" />
            <div className="bg-white rounded-xl border border-border/50 shadow-sm hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : s.id)}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{format(new Date(s.session_date), "dd/MM/yyyy")}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {s.session_type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor[s.session_type] || "bg-muted text-muted-foreground"}`}>{typeLabel[s.session_type] || s.session_type}</span>}
                    {s.session_number != null && <span className="text-xs text-muted-foreground">Sesión Nº {s.session_number}</span>}
                    {s.week_at_session != null && <span className="text-xs text-muted-foreground">· Semana {s.week_at_session} POP/PL</span>}
                  </div>
                  {linkedEval && (
                    <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100 mt-1.5">
                      📊 Con mediciones
                    </span>
                  )}
                </div>
                <div className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Expanded clinical note */}
              {isOpen && (
                <div className="border-t border-border/30 px-5 py-4 space-y-5 bg-gray-50/50 font-sans text-sm text-foreground">
                  {/* Header line */}
                  <p className="italic text-muted-foreground mb-3">
                    {s.session_number != null
                      ? `Paciente asiste a ${ordinal(s.session_number)} sesión`
                      : "Paciente asiste a sesión"}
                    {s.week_at_session != null && (
                      `, cursando su ${s.week_at_session} semana ${
                        s.session_type === "admission" ? "de admisión" :
                        s.session_type === "discharge" ? "de alta" : "POP/PL"
                      }`
                    )}
                    {s.week_at_session == null && s.session_type === "admission" && " de admisión"}
                    {s.week_at_session == null && s.session_type === "discharge" && " de alta"}
                    .
                  </p>

                  {/* EVOLUCIÓN */}
                  {(nn(s.general_observations) || nn(s.evolution) || nn(s.symptom_changes) || nn(s.clinical_changes) || nn(s.treatment_adjustments)) && (
                    <div className="space-y-2">
                      <SectionHeading>Evolución</SectionHeading>
                      {nn(s.general_observations) && <Line>{s.general_observations}</Line>}
                      {nn(s.evolution) && <Line>{s.evolution}</Line>}
                      {nn(s.symptom_changes) && <Line>Cambios en síntomas: {s.symptom_changes}</Line>}
                      {nn(s.clinical_changes) && <Line>Cambios clínicos: {s.clinical_changes}</Line>}
                      {nn(s.treatment_adjustments) && <Line>Ajustes al tratamiento: {s.treatment_adjustments}</Line>}
                    </div>
                  )}

                  {/* MEDICIONES DEL DÍA */}
                  {linkedEval && (
                    <div className="space-y-2">
                      <SectionHeading>Mediciones del día</SectionHeading>
                      <MeasurementsBlock e={linkedEval} />
                      {nn(s.avd_followup) && (
                        <p className="text-sm pl-1"><span className="font-medium text-gray-700">AVD en sesión:</span> {s.avd_followup}</p>
                      )}
                    </div>
                  )}

                  {/* EN EL DÍA DE HOY SE ABORDÓ */}
                  {nn(s.interventions) && (
                    <div>
                      <SectionHeading>En el día de hoy se abordó</SectionHeading>
                      <Line>{s.interventions}</Line>
                    </div>
                  )}

                  {/* INDICACIONES ENVIADAS */}
                  {nn(s.home_instructions_sent) && (
                    <div>
                      <SectionHeading>Indicaciones enviadas</SectionHeading>
                      <Line>{s.home_instructions_sent}</Line>
                    </div>
                  )}

                  {/* NOTAS */}
                  {nn(s.notes) && (
                    <div>
                      <SectionHeading>Notas</SectionHeading>
                      <Line>{s.notes}</Line>
                    </div>
                  )}

                  {/* Closing date */}
                  <p className="text-right text-xs text-muted-foreground pt-2 border-t border-border/20">
                    {format(new Date(s.session_date), "dd/MM/yyyy")}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


function NewFuncEvalDialog({ open, onClose, patientId, userId, onSaved }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    evaluation_date: new Date().toISOString().split("T")[0],
    barthel_score: "", dash_score: "",
    avd: "", aivd: "", work_education: "", leisure: "",
    physical_activity: "", sleep_rest: "", health_management: "",
    observations: "",
  });

  const resetForm = () => setForm({
    evaluation_date: new Date().toISOString().split("T")[0],
    barthel_score: "", dash_score: "",
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
          {detail && (() => {
            const Field = ({ label, value }: { label: string; value: any }) => {
              if (value == null || value === "") return null;
              return (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                  <p className="text-sm whitespace-pre-wrap">{value}</p>
                </div>
              );
            };
            const hasOccup = detail.avd || detail.aivd || detail.barthel_score != null || detail.dash_score != null;
            const hasHealth = detail.physical_activity || detail.sleep_rest || detail.health_management;
            return (
              <div className="space-y-5 text-sm">
                {/* General */}
                {detail.dominance && (
                  <div className="border-l-2 border-teal-300 pl-3 py-1">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Lateralidad</p>
                    <p>{dominanceMap[detail.dominance] || detail.dominance}</p>
                  </div>
                )}

                {/* Desempeño + scores */}
                {hasOccup && (
                  <div className="border-l-2 border-teal-300 pl-3 py-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Desempeño Ocupacional</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="AVD" value={detail.avd} />
                      <Field label="AIVD" value={detail.aivd} />
                      <Field label="Puntaje Barthel" value={detail.barthel_score != null ? `${detail.barthel_score}/100` : null} />
                      <Field label="Puntaje DASH" value={detail.dash_score != null ? `${detail.dash_score}/100` : null} />
                    </div>
                  </div>
                )}

                {/* Health */}
                {hasHealth && (
                  <div className="border-l-2 border-teal-300 pl-3 py-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Hábitos de Salud</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Actividad física" value={detail.physical_activity} />
                      <Field label="Descanso y sueño" value={detail.sleep_rest} />
                      <Field label="Gestión de la salud" value={detail.health_management} />
                    </div>
                  </div>
                )}

                {/* Notes */}
                {detail.notes && (
                  <div className="border-l-2 border-teal-300 pl-3 py-1">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Notas</p>
                    <p className="whitespace-pre-wrap text-sm">{detail.notes}</p>
                  </div>
                )}
              </div>
            );
          })()}
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

function UploadFileDialog({ open, onClose, patientId, userId, onSaved, episodeId }: { open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void; episodeId: string | null }) {
  const [category, setCategory] = useState<string>("");
  const [photoDate, setPhotoDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  const resetAndClose = () => {
    setCategory(""); setPhotoDate(new Date().toISOString().split("T")[0]); setDescription(""); setFile(null); setFileError(""); onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > 50 * 1024 * 1024) { setFileError("El archivo supera los 50MB permitidos."); setFile(null); return; }
    setFile(f);
  };

  const handleSave = async () => {
    if (!category || !file) return;
    setSaving(true);
    const path = `${userId}/${patientId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from("clinical-files").upload(path, file, { contentType: file.type });
    if (upErr) { toast.error("Error al subir el archivo"); setSaving(false); return; }
    const { error } = await supabase.from("clinical_files").insert({
      patient_id: patientId, uploaded_by: userId, file_name: file.name,
      file_path: path, file_type: file.type, category: category as any,
      description: description || null, photo_date: photoDate, is_deleted: false,
      episode_id: episodeId ?? null,
    });
    setSaving(false);
    if (error) { toast.error("Error al guardar el archivo"); return; }
    toast.success("Archivo guardado correctamente");
    resetAndClose();
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar archivo</DialogTitle>
          <DialogDescription>Subí fotos de evolución, estudios o documentos del paciente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="photo">Foto de evolución</SelectItem>
                <SelectItem value="study">Estudio (Rx, RMN, eco...)</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha</Label>
            <Input type="date" value={photoDate} onChange={(e) => setPhotoDate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Podés cambiar la fecha si la foto es de otro día</p>
          </div>
          <div className="space-y-2">
            <Label>Descripción (opcional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Semana 3 post-cirugía, dorso de mano..." />
          </div>
          <div className="space-y-2">
            <Label>Archivo *</Label>
            <Input type="file" accept="image/*,application/pdf,video/mp4,video/quicktime" onChange={handleFileChange} />
            {fileError && <p className="text-xs text-destructive">{fileError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={resetAndClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !category || !file}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Subir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteFileConfirm({ file, onClose, onDeleted }: { file: any; onClose: () => void; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from("clinical_files").update({ is_deleted: true }).eq("id", file.id);
    setDeleting(false);
    if (error) { toast.error("Error al eliminar el archivo"); return; }
    toast.success("Archivo eliminado");
    onDeleted(file.id);
    onClose();
  };

  return (
    <AlertDialog open={!!file} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar archivo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará "{file?.file_name}". Esta acción no se puede deshacer.
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

function Cie10AutocompleteInline({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ code: string; description: string }>>([]);
  const [loading, setLoading] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = value.trim();
    if (term.length < 2) { setResults([]); setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc('search_cie10', {
        search_input: term,
        max_results: 10
      });
      if (cancelled) return;
      setResults(data || []);
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); setLoading(false); };
  }, [value]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapper} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (results.length > 0) setOpen(true); }}
        placeholder={placeholder}
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

function NewEpisodeDialog({ open, onClose, patientId, userId, episodes, onSaved }: {
  open: boolean; onClose: () => void; patientId: string; userId: string; episodes: any[]; onSaved: (newEpId: string) => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    admission_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    treatment_type: "",
    doctor_name: "",
    injury_mechanism: "",
    weeks_post_injury: "",
  });

  const resetForm = () => setForm({
    admission_date: new Date().toISOString().split("T")[0],
    diagnosis: "", treatment_type: "", doctor_name: "", injury_mechanism: "", weeks_post_injury: "",
  });

  const handleSave = async () => {
    if (!form.diagnosis.trim()) return;
    setSaving(true);
    try {
      const maxEpNum = Math.max(...episodes.map((e: any) => e.episode_number), 0);

      // 1. Insert new episode
      const { data: newEp, error: epErr } = await supabase
        .from("treatment_episodes")
        .insert({
          patient_id: patientId,
          professional_id: userId,
          episode_number: maxEpNum + 1,
          admission_date: form.admission_date,
          status: "active",
          diagnosis: form.diagnosis.trim(),
        })
        .select("id")
        .single();

      if (epErr || !newEp) throw epErr || new Error("Failed to create episode");

      // 2. Insert clinical record for this episode
      await supabase.from("patient_clinical_records").insert({
        patient_id: patientId,
        episode_id: newEp.id,
        diagnosis: form.diagnosis.trim(),
        treatment_type: form.treatment_type || null,
        doctor_name: form.doctor_name || null,
        injury_mechanism: form.injury_mechanism || null,
        weeks_post_injury: form.weeks_post_injury ? parseInt(form.weeks_post_injury) : null,
      });

      // 3. Set previous active episodes to discharged
      const activeEps = episodes.filter((e: any) => e.status === "active");
      for (const ep of activeEps) {
        await supabase.from("treatment_episodes").update({ status: "discharged", discharge_date: form.admission_date }).eq("id", ep.id);
      }

      toast.success("Nuevo episodio creado correctamente");
      onSaved(newEp.id);
      navigate(`/patients/${patientId}/sessions/new?episode=${newEp.id}&type=admission`);
    } catch (err: any) {
      toast.error("Error al crear el episodio", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Episodio de Tratamiento</DialogTitle>
          <DialogDescription className="sr-only">Crear un nuevo episodio de tratamiento</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Fecha de admisión *</Label>
            <Input type="date" value={form.admission_date} onChange={e => setForm({ ...form, admission_date: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Diagnóstico *</Label>
            <Cie10AutocompleteInline value={form.diagnosis} onChange={(v) => setForm({ ...form, diagnosis: v })} placeholder="Buscar por código o descripción CIE-10…" />
          </div>
          <div className="space-y-2">
            <Label>Tipo de tratamiento</Label>
            <Select value={form.treatment_type} onValueChange={v => setForm({ ...form, treatment_type: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="conservative">Conservador</SelectItem>
                <SelectItem value="surgery">Quirúrgico</SelectItem>
                <SelectItem value="mixed">Mixto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Médico derivante</Label>
            <Input value={form.doctor_name} onChange={e => setForm({ ...form, doctor_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Mecanismo de lesión</Label>
            <Input value={form.injury_mechanism} onChange={e => setForm({ ...form, injury_mechanism: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Semanas post lesión</Label>
            <Input type="number" min={0} value={form.weeks_post_injury} onChange={e => setForm({ ...form, weeks_post_injury: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetForm(); onClose(); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !form.diagnosis.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Crear episodio"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
