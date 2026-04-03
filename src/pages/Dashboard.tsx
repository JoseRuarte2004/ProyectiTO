import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Activity, Calendar, UserCheck, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Stats {
  activePatients: number;
  sessionsThisMonth: number;
  upcomingAppointments: number;
  dischargedThisMonth: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: "Activo", cls: "status-active" },
    paused: { label: "Pausado", cls: "status-paused" },
    discharged: { label: "Alta", cls: "status-discharged" },
    scheduled: { label: "Programado", cls: "status-scheduled" },
    completed: { label: "Completado", cls: "status-completed" },
    cancelled: { label: "Cancelado", cls: "status-cancelled" },
  };
  const s = map[status] || { label: status, cls: "" };
  return <Badge variant="outline" className={`${s.cls} text-xs`}>{s.label}</Badge>;
}

export { StatusBadge };

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<Stats>({ activePatients: 0, sessionsThisMonth: 0, upcomingAppointments: 0, dischargedThisMonth: 0 });
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [weekAppointments, setWeekAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const [pActive, sessions, appts, discharged, recent, weekAppts] = await Promise.all([
      supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("therapy_sessions").select("id", { count: "exact", head: true }).gte("session_date", monthStart.split("T")[0]),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "scheduled").gte("appointment_date", now.toISOString()),
      supabase.from("patients").select("id", { count: "exact", head: true }).eq("status", "discharged").gte("discharged_at", monthStart),
      supabase.from("patients").select("id, first_name, last_name, dni, insurance, status, created_at").order("created_at", { ascending: false }).limit(5),
      supabase.from("appointments").select("id, appointment_date, type, status, patients(first_name, last_name)").eq("status", "scheduled").gte("appointment_date", now.toISOString()).lte("appointment_date", weekEnd).order("appointment_date").limit(5),
    ]);

    setStats({
      activePatients: pActive.count || 0,
      sessionsThisMonth: sessions.count || 0,
      upcomingAppointments: appts.count || 0,
      dischargedThisMonth: discharged.count || 0,
    });
    setRecentPatients(recent.data || []);
    setWeekAppointments(weekAppts.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: "Pacientes activos", value: stats.activePatients, icon: Users, color: "text-primary" },
    { label: "Sesiones este mes", value: stats.sessionsThisMonth, icon: Activity, color: "text-emerald-600" },
    { label: "Turnos próximos", value: stats.upcomingAppointments, icon: Calendar, color: "text-blue-600" },
    { label: "Altas este mes", value: stats.dischargedThisMonth, icon: UserCheck, color: "text-amber-600" },
  ];

  const appointmentTypeMap: Record<string, string> = {
    consultation: "Consulta",
    follow_up: "Seguimiento",
    evaluation: "Evaluación",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          ¡Hola, {profile?.full_name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground mt-1">Resumen de tu actividad</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{s.value}</p>
                </div>
                <s.icon className={`h-10 w-10 ${s.color} opacity-30`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Pacientes recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPatients.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No hay pacientes.</p>
            ) : (
              <div className="divide-y divide-border">
                {recentPatients.map((p) => (
                  <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-medium text-sm text-foreground">{p.last_name}, {p.first_name}</p>
                      <p className="text-xs text-muted-foreground">DNI: {p.dni} · {p.insurance || "Sin obra social"}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Turnos esta semana</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {weekAppointments.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No hay turnos programados.</p>
            ) : (
              <div className="divide-y divide-border">
                {weekAppointments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {a.patients?.last_name}, {a.patients?.first_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(a.appointment_date), "EEE d MMM, HH:mm", { locale: es })} · {appointmentTypeMap[a.type] || a.type}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
