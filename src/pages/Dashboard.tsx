import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronLeft, ChevronRight, Search, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format, startOfDay, endOfDay, addDays, subDays, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Activo", cls: "status-active" },
    paused: { label: "Pausado", cls: "status-paused" },
    discharged: { label: "Alta", cls: "status-discharged" },
    scheduled: { label: "Programado", cls: "status-scheduled" },
    completed: { label: "Completado", cls: "status-completed" },
    cancelled: { label: "Cancelado", cls: "status-cancelled" },
    confirmed: { label: "Confirmado", cls: "status-completed" },
    pending: { label: "Pendiente", cls: "status-paused" },
  };
  const s = map[status] || { label: status, cls: "" };
  return <Badge variant="outline" className={`${s.cls} text-xs font-medium px-2.5 py-0.5 rounded-full`}>{s.label}</Badge>;
}

export { StatusBadge };

const appointmentTypeMap: Record<string, string> = {
  consultation: "Consulta",
  follow_up: "Seguimiento",
  evaluation: "Evaluación",
  admission: "Admisión",
  discharge: "Alta",
};

const QUOTES = [
  "La rehabilitación efectiva nace de la observación paciente, no del protocolo apresurado.",
  "Cada sesión es una oportunidad para devolver autonomía.",
  "El progreso se mide en funcionalidad recuperada, no solo en grados de movimiento.",
  "La terapia ocupacional transforma limitaciones en posibilidades.",
];

export default function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agendaDate, setAgendaDate] = useState(new Date());
  const [dayAppointments, setDayAppointments] = useState<any[]>([]);

  useEffect(() => {
    fetchAgenda(agendaDate);
  }, []);

  useEffect(() => {
    fetchAgenda(agendaDate);
  }, [agendaDate]);

  const fetchAgenda = async (date: Date) => {
    const dayStart = startOfDay(date).toISOString();
    const dayEnd = endOfDay(date).toISOString();

    const { data } = await supabase
      .from("appointments")
      .select("id, appointment_date, duration_minutes, type, status, notes, patients(id, first_name, last_name, date_of_birth)")
      .gte("appointment_date", dayStart)
      .lte("appointment_date", dayEnd)
      .order("appointment_date");

    setDayAppointments(data || []);
    setLoading(false);
  };

  const fetchWeekStats = async () => {
    const now = new Date();
    const weekStart = startOfDay(subDays(now, now.getDay())).toISOString();
    const weekEnd = endOfDay(addDays(now, 6 - now.getDay())).toISOString();

    const [sessionsRes, evolsRes] = await Promise.all([
      supabase.from("therapy_sessions").select("id", { count: "exact", head: true }).gte("session_date", weekStart.split("T")[0]).lte("session_date", weekEnd.split("T")[0]),
      supabase.from("therapy_sessions").select("id", { count: "exact", head: true }).gte("session_date", weekStart.split("T")[0]).lte("session_date", weekEnd.split("T")[0]).not("notes", "is", null),
    ]);

    const total = sessionsRes.count || 0;
    setWeekStats({
      sessionsCompleted: total,
      sessionsTotal: total + 4,
      evolsRegistered: evolsRes.count || 0,
      evolsTotal: total,
    });
  };

  const fetchPending = async () => {
    const { data } = await supabase
      .from("therapy_sessions")
      .select("id, session_date, session_number, patients(id, first_name, last_name)")
      .is("notes", null)
      .order("session_date", { ascending: false })
      .limit(5);

    setPendingItems((data || []).map((s: any) => ({
      id: s.patients?.id,
      name: `${s.patients?.last_name}, ${s.patients?.first_name}`,
      detail: `Evolución pendiente — sesión ${format(new Date(s.session_date + "T12:00:00"), "dd/MM")}`,
    })));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const now = new Date();
  const dateStr = format(now, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  const totalMinutes = dayAppointments.reduce((sum, a) => sum + (a.duration_minutes || 30), 0);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  const nextAppt = dayAppointments.find(a => new Date(a.appointment_date) >= now && a.status !== "cancelled");
  const nextTime = nextAppt ? format(new Date(nextAppt.appointment_date), "HH:mm") : null;
  const nextPatient = nextAppt?.patients ? `${nextAppt.patients.first_name} ${nextAppt.patients.last_name}` : null;

  const quote = QUOTES[now.getDate() % QUOTES.length];

  return (
    <div className="space-y-8">
      {/* Header editorial */}
      <div>
        <p className="field-label mb-2" style={{ fontSize: '0.7rem', letterSpacing: '0.1em' }}>{dateStr}</p>
        <h1 className="text-[2.5rem] font-normal text-foreground leading-tight">
          <span className="font-accent">Buenos días,</span> <em className="font-accent font-semibold not-italic">{firstName}</em>
        </h1>
        <p className="text-muted-foreground mt-2 text-[15px]">
          Tenés <span className="font-bold text-foreground">{dayAppointments.length} turno{dayAppointments.length !== 1 ? "s" : ""}</span> hoy
          {nextTime && (
            <> · próximo a las <span className="font-bold text-foreground">{nextTime}</span> con {nextPatient}</>
          )}
          .
        </p>
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/patients")}>
          <Search className="h-4 w-4" /> Buscar
        </Button>
        <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate("/appointments")}>
          <Plus className="h-4 w-4" /> Nuevo turno
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Agenda principal */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Agenda de hoy</h2>
              <p className="text-sm text-muted-foreground">
                {dayAppointments.length} turno{dayAppointments.length !== 1 ? "s" : ""}
                {totalMinutes > 0 && <> · {hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}min ` : ""}en consultorio</>}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setAgendaDate(d => subDays(d, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <button onClick={() => setAgendaDate(d => addDays(d, 1))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {dayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">Sin turnos para este día.</p>
          ) : (
            <div className="divide-y divide-border">
              {dayAppointments.map((a) => {
                const time = format(new Date(a.appointment_date), "HH:mm");
                const dur = a.duration_minutes || 30;
                const patient = a.patients;
                const age = patient?.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null;
                const typeName = appointmentTypeMap[a.type] || a.type;
                const isNow = Math.abs(new Date(a.appointment_date).getTime() - now.getTime()) < 30 * 60 * 1000 && a.status !== "cancelled";
                const isCancelled = a.status === "cancelled";

                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-6 py-4 ${isNow ? "border-l-[3px] border-l-primary pl-5 -ml-6 bg-primary/[0.02]" : ""} ${isCancelled ? "opacity-50" : ""}`}
                  >
                    <div className="w-16 shrink-0">
                      <p className={`text-base font-bold tabular-nums font-mono ${isCancelled ? "line-through text-muted-foreground" : "text-foreground"}`}>{time}</p>
                      <p className="text-[11px] text-muted-foreground">{dur} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      {patient ? (
                        <Link to={`/patients/${patient.id}`} className="hover:text-primary transition-colors">
                          <p className="font-normal text-sm text-foreground">{patient.last_name}, {patient.first_name}</p>
                          <p className="text-xs text-muted-foreground italic">
                            {age !== null ? `${age} años` : ""}{age !== null && typeName ? " · " : ""}{typeName}
                          </p>
                        </Link>
                      ) : (
                        <p className="text-sm text-muted-foreground">Paciente no asignado</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isNow && <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Ahora</span>}
                      <StatusBadge status={a.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="space-y-6">
          {/* Cita */}
          <div className="bg-accent/50 rounded-xl border border-border/50 p-5">
            <div className="flex gap-3">
              <span className="text-3xl text-label/30 font-serif leading-none">"</span>
              <div>
                <p className="text-sm italic text-foreground/80 leading-relaxed">{quote}</p>
                <p className="text-[10px] uppercase tracking-widest text-label mt-3">— Recordatorio del equipo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
