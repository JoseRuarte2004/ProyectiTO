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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Loader2, Search, CalendarIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

type FilterStatus = "all" | "scheduled" | "completed" | "cancelled";

export default function Appointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("scheduled");
  const [showNew, setShowNew] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [rescheduleAppt, setRescheduleAppt] = useState<any | null>(null);

  const fetchAppointments = async () => {
    setLoading(true);
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

  const handleComplete = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "completed" as const }).eq("id", id);
    if (error) { toast.error("Error al actualizar turno"); return; }
    toast.success("Turno marcado como completado");
    fetchAppointments();
  };

  const handleCancel = async () => {
    if (!cancelId) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled" as const }).eq("id", cancelId);
    setCancelId(null);
    if (error) { toast.error("Error al cancelar turno"); return; }
    toast.success("Turno cancelado correctamente");
    fetchAppointments();
  };

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "Todos", value: "all" },
    { label: "Programados", value: "scheduled" },
    { label: "Completados", value: "completed" },
    { label: "Cancelados", value: "cancelled" },
  ];

  const typeMap: Record<string, string> = { consultation: "Consulta", follow_up: "Seguimiento", evaluation: "Evaluación" };

  const formatApptTime = (a: any) => {
    const start = format(new Date(a.appointment_date), "EEE d MMM yyyy, HH:mm", { locale: es });
    if (a.appointment_end) {
      const end = format(new Date(a.appointment_end), "HH:mm");
      return `${start} — ${end}`;
    }
    return start;
  };

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
          <TooltipProvider>
            {appointments.map((a: any) => (
              <Card key={a.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">
                      {a.patients?.last_name}, {a.patients?.first_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatApptTime(a)} · {typeMap[a.type] || a.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={a.status} />
                    {a.status === "scheduled" && (
                      <div className="flex gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleComplete(a.id)}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Completado</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50" onClick={() => setCancelId(a.id)}>
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Cancelar</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setRescheduleAppt(a)}>
                              <Clock className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reprogramar</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TooltipProvider>
        </div>
      )}

      <NewAppointmentDialog open={showNew} onClose={() => setShowNew(false)} userId={user!.id} onSaved={fetchAppointments} />

      <AlertDialog open={!!cancelId} onOpenChange={(open) => { if (!open) setCancelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar turno?</AlertDialogTitle>
            <AlertDialogDescription>¿Estás seguro que querés cancelar este turno? Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancelar turno</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {rescheduleAppt && (
        <RescheduleDialog appt={rescheduleAppt} onClose={() => setRescheduleAppt(null)} onSaved={fetchAppointments} />
      )}
    </div>
  );
}

/* ────────────────────── Reschedule Dialog ────────────────────── */

function RescheduleDialog({ appt, onClose, onSaved }: { appt: any; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(appt.appointment_date ? format(new Date(appt.appointment_date), "yyyy-MM-dd'T'HH:mm") : "");
  const [notes, setNotes] = useState(appt.notes || "");

  const handleSave = async () => {
    if (!date) { toast.error("Seleccioná una fecha"); return; }
    setSaving(true);
    const { error } = await supabase.from("appointments").update({
      appointment_date: new Date(date).toISOString(),
      notes: notes || null,
    }).eq("id", appt.id);
    setSaving(false);
    if (error) { toast.error("Error al reprogramar turno"); return; }
    toast.success("Turno reprogramado correctamente");
    onSaved();
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Reprogramar Turno</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nueva fecha y hora</Label><Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Notas</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ────────────────────── New Appointment Dialog ────────────────────── */

function NewAppointmentDialog({ open, onClose, userId, onSaved }: { open: boolean; onClose: () => void; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [selectedEndSlot, setSelectedEndSlot] = useState<string | null>(null);
  const [existingAppts, setExistingAppts] = useState<any[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [form, setForm] = useState({
    type: "consultation" as "consultation" | "follow_up" | "evaluation",
    status: "scheduled" as "scheduled" | "completed" | "cancelled",
    notes: "",
  });

  // Generate 30-min slots from 07:00 to 21:00
  const allSlots: string[] = [];
  for (let h = 7; h <= 20; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }
  allSlots.push("21:00");

  const startSlots = allSlots.filter((s) => s !== "21:00"); // can't start at 21:00

  const slotToMinutes = (slot: string) => {
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m;
  };

  const fetchExistingAppointments = async (date: Date) => {
    setLoadingSlots(true);
    const dayStr = format(date, "yyyy-MM-dd");
    const { data } = await supabase
      .from("appointments")
      .select("*, patients(first_name, last_name)")
      .eq("status", "scheduled")
      .gte("appointment_date", `${dayStr}T00:00:00`)
      .lt("appointment_date", `${dayStr}T23:59:59`);
    setExistingAppts(data || []);
    setLoadingSlots(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSelectedEndSlot(null);
    if (date) fetchExistingAppointments(date);
  };

  // Check if a slot overlaps with any existing appointment
  const isSlotOccupied = (slotTime: string): { occupied: boolean; patientName?: string } => {
    const slotMin = slotToMinutes(slotTime);
    for (const a of existingAppts) {
      const startMin = slotToMinutes(format(new Date(a.appointment_date), "HH:mm"));
      const endMin = a.appointment_end
        ? slotToMinutes(format(new Date(a.appointment_end), "HH:mm"))
        : startMin + 30; // assume 30 min if no end
      if (slotMin >= startMin && slotMin < endMin) {
        return { occupied: true, patientName: `${a.patients?.last_name}, ${a.patients?.first_name}` };
      }
    }
    return { occupied: false };
  };

  // For end time grid: check if a range [selectedSlot, endSlot) conflicts
  const isEndSlotConflicting = (endSlotTime: string): { conflicting: boolean; patientName?: string } => {
    if (!selectedSlot) return { conflicting: false };
    const selStart = slotToMinutes(selectedSlot);
    const selEnd = slotToMinutes(endSlotTime);
    for (const a of existingAppts) {
      const aStart = slotToMinutes(format(new Date(a.appointment_date), "HH:mm"));
      const aEnd = a.appointment_end
        ? slotToMinutes(format(new Date(a.appointment_end), "HH:mm"))
        : aStart + 30;
      // overlap: aStart < selEnd AND aEnd > selStart
      if (aStart < selEnd && aEnd > selStart) {
        return { conflicting: true, patientName: `${a.patients?.last_name}, ${a.patients?.first_name}` };
      }
    }
    return { conflicting: false };
  };

  const endSlots = selectedSlot
    ? allSlots.filter((s) => slotToMinutes(s) >= slotToMinutes(selectedSlot) + 30)
    : [];

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
    if (!selectedPatient || !selectedDate || !selectedSlot || !selectedEndSlot) {
      toast.error("Seleccioná un paciente, fecha, horario de inicio y fin.");
      return;
    }
    setSaving(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const appointmentDate = new Date(`${dateStr}T${selectedSlot}:00`).toISOString();
    const appointmentEnd = new Date(`${dateStr}T${selectedEndSlot}:00`).toISOString();
    const { error } = await supabase.from("appointments").insert({
      patient_id: selectedPatient.id,
      professional_id: userId,
      appointment_date: appointmentDate,
      appointment_end: appointmentEnd,
      type: form.type,
      status: form.status,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) { toast.error("Error al crear turno"); return; }
    toast.success("Turno agendado correctamente");
    setSelectedPatient(null);
    setSearchTerm("");
    setSelectedDate(undefined);
    setSelectedSlot(null);
    setSelectedEndSlot(null);
    setForm({ type: "consultation", status: "scheduled", notes: "" });
    onSaved();
    onClose();
  };

  const canSave = !!selectedPatient && !!selectedDate && !!selectedSlot && !!selectedEndSlot;

  const renderSlotGrid = (
    slots: string[],
    selected: string | null,
    onSelect: (s: string) => void,
    checkOccupied: (s: string) => { occupied: boolean; patientName?: string },
  ) => (
    <TooltipProvider>
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
        {slots.map((slot) => {
          const { occupied, patientName } = checkOccupied(slot);
          const isSelected = selected === slot;
          if (occupied) {
            return (
              <Tooltip key={slot}>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => toast.warning(`Este horario ya está ocupado por ${patientName}`)}
                    className="rounded-md px-2 py-1.5 text-xs font-medium bg-red-100 text-red-400 cursor-not-allowed border border-red-200">
                    {slot}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{patientName}</TooltipContent>
              </Tooltip>
            );
          }
          return (
            <button key={slot} type="button" onClick={() => onSelect(slot)}
              className={cn(
                "rounded-md px-2 py-1.5 text-xs font-medium border transition-colors",
                isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-accent"
              )}>
              {slot}
            </button>
          );
        })}
      </div>
    </TooltipProvider>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo Turno</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Patient selector */}
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

          {/* Date picker */}
          <div className="space-y-2">
            <Label>Fecha *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={handleDateSelect} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} className="p-3 pointer-events-auto" locale={es} />
              </PopoverContent>
            </Popover>
          </div>

          {/* Start time grid */}
          {selectedDate && (
            <div className="space-y-2">
              <Label>Hora de inicio *</Label>
              {loadingSlots ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : (
                renderSlotGrid(startSlots, selectedSlot, (s) => { setSelectedSlot(s); setSelectedEndSlot(null); }, isSlotOccupied)
              )}
            </div>
          )}

          {/* End time grid */}
          {selectedSlot && endSlots.length > 0 && (
            <div className="space-y-2">
              <Label>Hora de finalización *</Label>
              {renderSlotGrid(endSlots, selectedEndSlot, setSelectedEndSlot, (slot) => {
                const { conflicting, patientName } = isEndSlotConflicting(slot);
                return { occupied: conflicting, patientName };
              })}
            </div>
          )}

          {/* Type */}
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

          {/* Status */}
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

          {/* Notes */}
          <div className="space-y-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
