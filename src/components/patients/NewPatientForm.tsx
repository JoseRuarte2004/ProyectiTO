import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, ArrowLeft, User } from "lucide-react";

// ── Section card wrapper ──
function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-xl border-border bg-card mb-6 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-serif text-[15px] font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-xs mb-1.5 block">
      {children}{required && <span className="text-destructive ml-0.5">*</span>}
    </Label>
  );
}

const inputClass = "rounded-md h-10 text-sm";

// ── Obras Sociales autocomplete ──
function ObrasSocialesAutocomplete({ value, onChange, placeholder, className }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ name: string; type: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [rect, setRect] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const lastSelectedRef = useRef<string>("");
  const visibleTypes = Array.from(new Set(results.map((r) => r.type).filter(Boolean)));
  const showTypeGroups = visibleTypes.length > 1;
  const typeLabel = (type: string | null) => {
    if (!type) return "OTRAS";
    const n = type.toLowerCase();
    if (n === "prepaga") return "PREPAGAS";
    if (n === "sindical") return "SINDICALES";
    return type.toUpperCase();
  };

  const updateRect = () => {
    if (wrapperRef.current) {
      const r = wrapperRef.current.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  };

  useEffect(() => {
    const term = value.trim();
    if (term.length < 1) { setResults([]); setOpen(false); return; }
    if (term === lastSelectedRef.current) { setOpen(false); return; }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("obras_sociales")
        .select("name, type")
        .eq("is_active", true)
        .ilike("name_search", `%${term.toLowerCase()}%`)
        .limit(10);
      if (cancelled) return;
      setResults((data as Array<{ name: string; type: string | null }>) || []);
      updateRect();
      setOpen(true);
      setLoading(false);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); setLoading(false); };
  }, [value]);

  useEffect(() => {
    if (!open) return;
    updateRect();
    const onResize = () => updateRect();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => { window.removeEventListener("resize", onResize); window.removeEventListener("scroll", onResize, true); };
  }, [open]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onKey); };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        onChange={(e) => { lastSelectedRef.current = ""; onChange(e.target.value); }}
        onFocus={() => { if (results.length > 0) { updateRect(); setOpen(true); } }}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {loading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      {open && results.length > 0 && createPortal(
        <div
          ref={panelRef}
          style={{ position: "fixed", top: rect.top + rect.height + 4, left: rect.left, width: rect.width, zIndex: 60 }}
          className="max-h-64 overflow-auto rounded-md border bg-popover shadow-md"
        >
          {results.map((r, index) => {
            const previous = results[index - 1];
            const showLabel = showTypeGroups && (!previous || previous.type !== r.type);
            return (
              <div key={`${r.name}-${r.type || "x"}`}>
                {showLabel && (
                  <div className="px-3 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {typeLabel(r.type)}
                  </div>
                )}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { lastSelectedRef.current = r.name; onChange(r.name); setOpen(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  {r.name}
                </button>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

export function NewPatientForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [insurance, setInsurance] = useState("");
  const [insuranceNumber, setInsuranceNumber] = useState("");
  const [address, setAddress] = useState("");
  const [nationality, setNationality] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);

  const or = (v: string) => v.trim() || null;
  const fieldClass = (k: string) => errors[k] ? "border-destructive ring-1 ring-destructive" : "";

  const validate = () => {
    const errs: Record<string, boolean> = {};
    if (!lastName.trim()) errs.lastName = true;
    if (!firstName.trim()) errs.firstName = true;
    if (!dni.trim()) errs.dni = true;
    if (!birthDate) errs.birthDate = true;
    if (!phone.trim()) errs.phone = true;
    if (!admissionDate) errs.admissionDate = true;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error("Completá los campos obligatorios");
      return;
    }
    setSaving(true);
    try {
      const { data: patient, error: patErr } = await supabase
        .from("patients")
        .insert({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          dni: dni.trim(),
          birth_date: or(birthDate),
          phone: or(phone),
          insurance: or(insurance),
          insurance_number: or(insuranceNumber),
          address: or(address),
          nationality: or(nationality),
          admission_date: admissionDate,
          professional_id: user!.id,
        })
        .select("id")
        .single();
      if (patErr) throw patErr;
      const pid = patient.id;

      const { error: epErr } = await supabase.from("treatment_episodes").insert({
        patient_id: pid,
        professional_id: user!.id,
        episode_number: 1,
        admission_date: admissionDate,
        status: "active",
      });
      if (epErr) throw epErr;

      toast.success("Paciente registrado correctamente");
      navigate(`/patients/${pid}`);
    } catch (err: any) {
      toast.error("Error al registrar al paciente", { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const ErrMsg = ({ field }: { field: string }) =>
    errors[field] ? <p className="text-xs text-destructive mt-1" data-field-error>Campo obligatorio</p> : null;

  const display = `${firstName} ${lastName}`.trim() || "Nuevo paciente";

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-50 bg-card border-b border-border h-14">
        <div className="max-w-2xl mx-auto h-full px-6 flex items-center justify-between gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/patients")} className="text-foreground hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 text-center text-sm font-semibold text-foreground truncate">{display}</h1>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/85 rounded-lg">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6">
        <SectionCard icon={User} title="Datos del paciente">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <FieldLabel required>Apellido</FieldLabel>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} className={`${inputClass} ${fieldClass("lastName")}`} />
              <ErrMsg field="lastName" />
            </div>
            <div>
              <FieldLabel required>Nombre</FieldLabel>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={`${inputClass} ${fieldClass("firstName")}`} />
              <ErrMsg field="firstName" />
            </div>
            <div>
              <FieldLabel required>DNI</FieldLabel>
              <Input value={dni} onChange={(e) => setDni(e.target.value)} className={`${inputClass} ${fieldClass("dni")}`} />
              <ErrMsg field="dni" />
            </div>
            <div>
              <FieldLabel required>Fecha de nacimiento</FieldLabel>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={`${inputClass} ${fieldClass("birthDate")}`} />
              <ErrMsg field="birthDate" />
            </div>
            <div>
              <FieldLabel required>Teléfono</FieldLabel>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inputClass} ${fieldClass("phone")}`} />
              <ErrMsg field="phone" />
            </div>
            <div>
              <FieldLabel>Nacionalidad</FieldLabel>
              <Input value={nationality} onChange={(e) => setNationality(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel>Obra social</FieldLabel>
              <ObrasSocialesAutocomplete value={insurance} onChange={setInsurance} placeholder="Buscar obra social…" className={inputClass} />
            </div>
            <div>
              <FieldLabel>N° de afiliado</FieldLabel>
              <Input value={insuranceNumber} onChange={(e) => setInsuranceNumber(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Domicilio</FieldLabel>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <FieldLabel required>Fecha de ingreso</FieldLabel>
              <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={`${inputClass} ${fieldClass("admissionDate")}`} />
              <ErrMsg field="admissionDate" />
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border p-4">
        <div className="max-w-2xl mx-auto flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/85">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar paciente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default NewPatientForm;
