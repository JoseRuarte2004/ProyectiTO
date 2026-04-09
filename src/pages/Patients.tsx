import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./Dashboard";
import { Plus, Search, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NewPatientForm } from "@/components/patients/NewPatientForm";
import { format } from "date-fns";

type FilterStatus = "all" | "active" | "paused" | "discharged";

export default function Patients() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [showNew, setShowNew] = useState(false);

  const fetchPatients = async () => {
    let query = supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    setPatients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPatients();
  }, [filter]);

  const filtered = patients.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      p.first_name.toLowerCase().includes(term) ||
      p.last_name.toLowerCase().includes(term) ||
      p.dni.toLowerCase().includes(term)
    );
  });

  const filterButtons: { label: string; value: FilterStatus }[] = [
    { label: "Todos", value: "all" },
    { label: "Activos", value: "active" },
    { label: "Pausados", value: "paused" },
    { label: "Alta", value: "discharged" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Mis Pacientes</h1>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {filterButtons.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No se encontraron pacientes.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <Link key={p.id} to={`/patients/${p.id}`}>
              <Card className="border-border/50 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {p.last_name}, {p.first_name}
                      </p>
                      <p className="text-sm text-muted-foreground">DNI: {p.dni}</p>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Obra Social: {p.insurance || "—"}</p>
                    <p>Admisión: {format(new Date(p.admission_date), "dd/MM/yyyy")}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Paciente</DialogTitle>
          </DialogHeader>
          <NewPatientForm
            onSuccess={() => {
              setShowNew(false);
              fetchPatients();
            }}
            onCancel={() => setShowNew(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
