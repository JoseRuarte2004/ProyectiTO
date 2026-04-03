import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { StatusBadge } from "./Dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Calendar, Search } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type FilterStatus = "all" | "scheduled" | "completed" | "cancelled";

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showNew, setShowNew] = useState(false);

  const fetchAppointments = async () => {
    let q = supabase
      .from("appointments")
      .select("*, patients(first_name, last_name)")
      .order("appointment_date", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAppointments(); }, [filter]);

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "Todos", value: "all" },
    { label: "Programados", value: "scheduled" },
    { label: "Completados", value: "completed" },
    { label: "Cancelados", value: "cancelled" },
  ];

  const typeMap: Record<string, string> = { consultation: "Consulta", follow_up: "Seguimiento", evaluation: "Evaluación" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Turnos</h1>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Turno</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filterButtons.map((f) => (
          <Button key={f.value} variant={filter === f.value ? "default" : "outline"} size="sm" onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : appointments.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No hay turnos.</p>
      ) : (
        <div className="space-y-2">
          {appointments.map((a: any) => (
            <Card key={a.id} className="border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-foreground">
                    {a.patients?.last_name}, {a.patients?.first_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(a.appointment_date), "EEE d MMM yyyy, HH:mm", { locale: es })} · {typeMap[a.type] || a.type}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewAppointmentDialog open={showNew} onClose={() => setShowNew(false)} userId={user!.id} onSaved={() => { fetchAppointments(); }} />
    </div>
  );
}

function NewAppointmentDialog({ open, onClose, userId, onSaved }: { open: boolean; onClose: () => void; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [form, setForm] = useState({
    appointment_date: "",
    type: "consultation" as "consultation" | "follow_up" | "evaluation",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    notes: "",
  });

  const searchPatients = async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setPatients([]); return; }
    const { data } = await supabase
      .from("patients")
      .select("id, first_name, last_name, dni")
      .or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,dni.ilike.%${term}%`)
      .limit(10);
    setPatients(data || []);
  };

  const handleSave = async () => {
    if (!selectedPatient || !form.appointment_date) {
      toast.error("Seleccioná un paciente y una fecha.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("appointments").insert({
      patient_id: selectedPatient.id,
      professional_id: userId,
      appointment_date: new Date(form.appointment_date).toISOString(),
      type: form.type,
      status: form.status,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al crear turno"); return; }
    toast.success("Turno creado");
    setSelectedPatient(null);
    setSearchTerm("");
    setForm({ appointment_date: "", type: "consultation", status: "scheduled", notes: "" });
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuevo Turno</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Paciente *</Label>
            {selectedPatient ? (
              <div className="flex items-center justify-between bg-muted p-2 rounded-md">
                <span className="text-sm">{selectedPatient.last_name}, {selectedPatient.first_name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Cambiar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar paciente..." value={searchTerm} onChange={(e) => searchPatients(e.target.value)} className="pl-10" />
                </div>
                {patients.length > 0 && (
                  <div className="border border-border rounded-md divide-y divide-border max-h-40 overflow-y-auto">
                    {patients.map((p) => (
                      <button key={p.id} onClick={() => { setSelectedPatient(p); setPatients([]); setSearchTerm(""); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors">
                        {p.last_name}, {p.first_name} — DNI: {p.dni}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
          <div className="space-y-2"><Label>Estado</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Programado</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
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
