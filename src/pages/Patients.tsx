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
import { format } from "date-fns";

type FilterStatus = "all" | "active" | "paused" | "discharged";

export default function Patients() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterStatus>("all");

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="font-serif text-2xl font-semibold text-foreground tracking-tight">Mis Pacientes</h1>
        <Button onClick={() => navigate("/patients/new")}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const initials = `${p.last_name?.[0] || ""}${p.first_name?.[0] || ""}`.toUpperCase();
            return (
              <Link key={p.id} to={`/patients/${p.id}`}>
                <Card className="border-border hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                        <span className="text-sm font-serif font-semibold text-primary">{initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-foreground text-sm">
                            {p.last_name}, {p.first_name}
                          </p>
                          <StatusBadge status={p.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">DNI: {p.dni}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          <span>{p.insurance || "Sin O.S."}</span>
                          <span>Adm. {format(new Date(p.admission_date), "dd/MM/yy")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
