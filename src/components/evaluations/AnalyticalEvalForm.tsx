import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Eye } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";

// --- Constants ---

const GONIOMETRY_GROUPS = [
  { label: "Hombro", fields: ["flexion", "extension", "abduccion", "aduccion", "rot_ext", "rot_int"] },
  { label: "Codo", fields: ["flexion", "extension", "pronacion", "supinacion"] },
  { label: "Muñeca", fields: ["flexion", "extension", "desv_radial", "desv_cubital"] },
  { label: "Mano MCF", fields: ["mcf_flex", "mcf_ext", "mcf2_flex", "mcf2_ext", "mcf3_flex", "mcf3_ext", "mcf4_flex", "mcf4_ext"] },
  { label: "Mano IFP", fields: ["ifp_flex", "ifp_ext"] },
  { label: "Mano IFD", fields: ["ifd_flex", "ifd_ext"] },
  { label: "Pulgar MCF", fields: ["pulgar_mcf_flex", "pulgar_mcf_ext"] },
  { label: "Pulgar IF", fields: ["pulgar_if_flex", "pulgar_if_ext"] },
];

const fieldLabel = (f: string) => {
  const map: Record<string, string> = {
    flexion: "Flex°", extension: "Ext°", abduccion: "Abd°", aduccion: "Add°",
    rot_ext: "RE°", rot_int: "RI°", pronacion: "Pron°", supinacion: "Sup°",
    desv_radial: "DR°", desv_cubital: "DC°",
    mcf_flex: "MCF1 Flex°", mcf_ext: "MCF1 Ext°",
    mcf2_flex: "MCF2 Flex°", mcf2_ext: "MCF2 Ext°",
    mcf3_flex: "MCF3 Flex°", mcf3_ext: "MCF3 Ext°",
    mcf4_flex: "MCF4 Flex°", mcf4_ext: "MCF4 Ext°",
    ifp_flex: "IFP Flex°", ifp_ext: "IFP Ext°",
    ifd_flex: "IFD Flex°", ifd_ext: "IFD Ext°",
    pulgar_mcf_flex: "Flex°", pulgar_mcf_ext: "Ext°",
    pulgar_if_flex: "Flex°", pulgar_if_ext: "Ext°",
  };
  return map[f] || f;
};

const SPECIFIC_TESTS = [
  "Finkelstein", "Phalen", "Froment", "Wartenberg",
  "Garra cubital", "Jobe", "Pate", "Yocum", "Herber",
];

const testKey = (t: string) => t.toLowerCase().replace(/\s+/g, "_");

type TestResult = "positive" | "negative" | "not_performed" | null;

// --- New Eval Dialog ---

export function NewAnalEvalDialog({ open, onClose, patientId, userId, onSaved }: {
  open: boolean; onClose: () => void; patientId: string; userId: string; onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [painScore, setPainScore] = useState([0]);
  const [gonio, setGonio] = useState<Record<string, string>>({});
  const [tests, setTests] = useState<Record<string, TestResult>>({});
  const [form, setForm] = useState({
    evaluation_date: new Date().toISOString().split("T")[0],
    pain_appearance: "", pain_location: "", pain_radiation: "",
    pain_characteristics: "", pain: "", pain_aggravating_factors: "",
    edema: "", edema_circummetry: "", godet_test: "",
    arom: "", prom: "", kapandji: "",
    dynamometer_msd: "", dynamometer_msi: "",
    muscle_strength: "", muscle_strength_median: "",
    muscle_strength_cubital: "", muscle_strength_radial: "",
    sensitivity_functional: "", sensitivity_protective: "", sensitivity: "",
    trophic_state: "", scar: "", vancouver_score: "", osas_score: "",
    posture: "", emotional_state: "", notes: "",
  });

  const u = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));
  const painColor = painScore[0] <= 3 ? "text-emerald-600" : painScore[0] <= 6 ? "text-amber-500" : "text-red-600";

  const handleSave = async () => {
    setSaving(true);
    const gonioHasValues = Object.values(gonio).some(v => v !== "");
    const testsHasValues = Object.values(tests).some(v => v !== null);

    const insertData: any = {
      patient_id: patientId, professional_id: userId,
      evaluation_date: form.evaluation_date,
      pain_score: painScore[0],
      goniometry: gonioHasValues ? gonio : null,
      specific_tests: testsHasValues ? tests : null,
    };

    const textFields = [
      "pain_appearance", "pain_location", "pain_radiation", "pain_characteristics",
      "pain", "pain_aggravating_factors", "edema", "edema_circummetry", "godet_test",
      "arom", "prom", "kapandji", "muscle_strength", "muscle_strength_median",
      "muscle_strength_cubital", "muscle_strength_radial",
      "sensitivity_functional", "sensitivity_protective", "sensitivity",
      "trophic_state", "scar", "posture", "emotional_state", "notes",
    ];
    textFields.forEach(f => { insertData[f] = (form as any)[f] || null; });

    insertData.dynamometer_msd = form.dynamometer_msd ? parseFloat(form.dynamometer_msd) : null;
    insertData.dynamometer_msi = form.dynamometer_msi ? parseFloat(form.dynamometer_msi) : null;
    insertData.vancouver_score = form.vancouver_score ? parseInt(form.vancouver_score) : null;
    insertData.osas_score = form.osas_score ? parseInt(form.osas_score) : null;

    const { error } = await supabase.from("analytical_evaluations").insert(insertData);
    setSaving(false);
    if (error) { toast.error("Error al guardar la evaluación analítica"); return; }
    toast.success("Evaluación analítica registrada correctamente");
    onSaved(); onClose();
  };

  const allSections = ["dolor", "edema", "movilidad", "fuerza", "sensibilidad", "pruebas", "trofico", "postura"];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Evaluación Analítica</DialogTitle>
          <DialogDescription className="sr-only">Formulario completo de evaluación analítica</DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={allSections} className="w-full">
          {/* SECTION 1: Dolor */}
          <AccordionItem value="dolor">
            <AccordionTrigger className="text-sm font-semibold">Dolor — Método ALICIA</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Fecha de evaluación *</Label>
                <Input type="date" value={form.evaluation_date} onChange={e => u("evaluation_date", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Intensidad EVA: <span className={`font-bold ${painColor}`}>{painScore[0]}/10</span></Label>
                <Slider value={painScore} onValueChange={setPainScore} min={0} max={10} step={1} />
              </div>
              <div className="space-y-1"><Label className="text-xs">Aparición</Label><Textarea value={form.pain_appearance} onChange={e => u("pain_appearance", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Localización</Label><Input value={form.pain_location} onChange={e => u("pain_location", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Irradiación</Label><Input value={form.pain_radiation} onChange={e => u("pain_radiation", e.target.value)} /></div>
              <div className="space-y-1"><Label className="text-xs">Características</Label><Input value={form.pain_characteristics} onChange={e => u("pain_characteristics", e.target.value)} placeholder="punzante, urente, opresivo..." /></div>
              <div className="space-y-1"><Label className="text-xs">Descripción general del dolor</Label><Textarea value={form.pain} onChange={e => u("pain", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Agravantes / Atenuantes</Label><Textarea value={form.pain_aggravating_factors} onChange={e => u("pain_aggravating_factors", e.target.value)} rows={2} /></div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 2: Edema */}
          <AccordionItem value="edema">
            <AccordionTrigger className="text-sm font-semibold">Edema</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1"><Label className="text-xs">Observación</Label><Textarea value={form.edema} onChange={e => u("edema", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Circometría</Label><Textarea value={form.edema_circummetry} onChange={e => u("edema_circummetry", e.target.value)} rows={2} placeholder="Ej: Muñeca: MSD 18cm / MSI 16cm" /></div>
              <div className="space-y-1"><Label className="text-xs">Test de Godet</Label>
                <Select value={form.godet_test} onValueChange={v => u("godet_test", v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="negative">Negativo</SelectItem>
                    <SelectItem value="1+">1+</SelectItem>
                    <SelectItem value="2+">2+</SelectItem>
                    <SelectItem value="3+">3+</SelectItem>
                    <SelectItem value="4+">4+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 3: Movilidad */}
          <AccordionItem value="movilidad">
            <AccordionTrigger className="text-sm font-semibold">Movilidad</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1"><Label className="text-xs">AROM (texto libre)</Label><Textarea value={form.arom} onChange={e => u("arom", e.target.value)} rows={2} placeholder="Rangos activos por articulación..." /></div>
              <div className="space-y-1"><Label className="text-xs">PROM (texto libre)</Label><Textarea value={form.prom} onChange={e => u("prom", e.target.value)} rows={2} placeholder="Rangos pasivos por articulación..." /></div>
              <div className="space-y-1"><Label className="text-xs">Kapandji</Label><Input value={form.kapandji} onChange={e => u("kapandji", e.target.value)} placeholder="Ej: 8/10, distancia al pliegue 2cm" /></div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold">Goniometría estructurada</Label>
                {GONIOMETRY_GROUPS.map(group => (
                  <div key={group.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {group.fields.map(f => {
                        const key = `${group.label.toLowerCase().replace(/\s+/g, "_")}_${f}`;
                        return (
                          <div key={key} className="space-y-0.5">
                            <Label className="text-[10px] text-muted-foreground">{fieldLabel(f)}</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs"
                              placeholder="°"
                              value={gonio[key] || ""}
                              onChange={e => setGonio(prev => ({ ...prev, [key]: e.target.value }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 4: Fuerza Muscular */}
          <AccordionItem value="fuerza">
            <AccordionTrigger className="text-sm font-semibold">Fuerza Muscular</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Dinamómetro MSD (kgf)</Label><Input type="number" step="0.1" value={form.dynamometer_msd} onChange={e => u("dynamometer_msd", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Dinamómetro MSI (kgf)</Label><Input type="number" step="0.1" value={form.dynamometer_msi} onChange={e => u("dynamometer_msi", e.target.value)} /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Fuerza general (texto libre)</Label><Textarea value={form.muscle_strength} onChange={e => u("muscle_strength", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Nervio Mediano — Escala Daniels</Label><Textarea value={form.muscle_strength_median} onChange={e => u("muscle_strength_median", e.target.value)} rows={2} placeholder="Pronador redondo /5, Flexor largo del pulgar /5..." /></div>
              <div className="space-y-1"><Label className="text-xs">Nervio Cubital — Escala Daniels</Label><Textarea value={form.muscle_strength_cubital} onChange={e => u("muscle_strength_cubital", e.target.value)} rows={2} placeholder="Add pulgar /5, Flexor corto del pulgar /5..." /></div>
              <div className="space-y-1"><Label className="text-xs">Nervio Radial — Escala Daniels</Label><Textarea value={form.muscle_strength_radial} onChange={e => u("muscle_strength_radial", e.target.value)} rows={2} placeholder="Extensor largo del pulgar /5, Extensor del índice /5..." /></div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 5: Sensibilidad */}
          <AccordionItem value="sensibilidad">
            <AccordionTrigger className="text-sm font-semibold">Sensibilidad</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1"><Label className="text-xs">Sensibilidad epicrítica (funcional)</Label><Textarea value={form.sensitivity_functional} onChange={e => u("sensitivity_functional", e.target.value)} rows={2} placeholder="Tacto ligero, discriminación 2 puntos, picking up test..." /></div>
              <div className="space-y-1"><Label className="text-xs">Sensibilidad protopática (protectora)</Label><Textarea value={form.sensitivity_protective} onChange={e => u("sensitivity_protective", e.target.value)} rows={2} placeholder="Toco-pincho, temperatura frío-calor..." /></div>
              <div className="space-y-1"><Label className="text-xs">Sensibilidad general</Label><Textarea value={form.sensitivity} onChange={e => u("sensitivity", e.target.value)} rows={2} /></div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 6: Pruebas Específicas */}
          <AccordionItem value="pruebas">
            <AccordionTrigger className="text-sm font-semibold">Pruebas Específicas</AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              {SPECIFIC_TESTS.map(test => {
                const key = testKey(test);
                const val = tests[key] || null;
                return (
                  <div key={key} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm">{test}</span>
                    <div className="flex gap-1">
                      {([
                        { v: "positive" as TestResult, label: "+", cls: "bg-primary text-primary-foreground" },
                        { v: "negative" as TestResult, label: "−", cls: "bg-muted-foreground/20 text-foreground" },
                        { v: "not_performed" as TestResult, label: "N/R", cls: "bg-muted text-muted-foreground" },
                      ]).map(opt => (
                        <button
                          key={opt.v}
                          type="button"
                          className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${val === opt.v ? opt.cls : "bg-muted/50 text-muted-foreground/60 hover:bg-muted"}`}
                          onClick={() => setTests(prev => ({ ...prev, [key]: val === opt.v ? null : opt.v }))}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 7: Estado Trófico y Cicatriz */}
          <AccordionItem value="trofico">
            <AccordionTrigger className="text-sm font-semibold">Estado Trófico y Cicatriz</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1"><Label className="text-xs">Estado trófico</Label><Textarea value={form.trophic_state} onChange={e => u("trophic_state", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Cicatriz (descripción general)</Label><Textarea value={form.scar} onChange={e => u("scar", e.target.value)} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Escala Vancouver VSS (0-15)</Label><Input type="number" min={0} max={15} value={form.vancouver_score} onChange={e => u("vancouver_score", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Escala OSAS observador (0-60)</Label><Input type="number" min={0} max={60} value={form.osas_score} onChange={e => u("osas_score", e.target.value)} /></div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* SECTION 8: Postura y Emotividad */}
          <AccordionItem value="postura">
            <AccordionTrigger className="text-sm font-semibold">Postura y Emotividad</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="space-y-1"><Label className="text-xs">Postura</Label><Textarea value={form.posture} onChange={e => u("posture", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Emotividad / estado emocional</Label><Textarea value={form.emotional_state} onChange={e => u("emotional_state", e.target.value)} rows={2} /></div>
              <div className="space-y-1"><Label className="text-xs">Notas adicionales</Label><Textarea value={form.notes} onChange={e => u("notes", e.target.value)} rows={2} /></div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Pain Score Badge ---

function PainBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score <= 3 ? "bg-emerald-100 text-emerald-700" : score <= 6 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>EVA {score}/10</span>;
}

// --- Detail Dialog ---

const testResultLabel: Record<string, string> = {
  positive: "Positivo (+)",
  negative: "Negativo (−)",
  not_performed: "No realizado",
};

export function AnalEvalDetailDialog({ evaluation, onClose }: { evaluation: any; onClose: () => void }) {
  if (!evaluation) return null;
  const e = evaluation;

  const gonioData: Record<string, string> | null = typeof e.goniometry === "string" ? JSON.parse(e.goniometry) : e.goniometry;
  const testsData: Record<string, string> | null = typeof e.specific_tests === "string" ? JSON.parse(e.specific_tests) : e.specific_tests;

  const Row = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div>
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        <p className="text-foreground text-sm">{String(value)}</p>
      </div>
    );
  };

  return (
    <Dialog open={!!evaluation} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Evaluación Analítica — {format(new Date(e.evaluation_date), "dd/MM/yyyy")}</DialogTitle>
          <DialogDescription className="sr-only">Detalle de evaluación analítica</DialogDescription>
        </DialogHeader>

        <Accordion type="multiple" defaultValue={["dolor", "edema", "movilidad", "fuerza", "sensibilidad", "pruebas", "trofico", "postura"]} className="w-full">
          <AccordionItem value="dolor">
            <AccordionTrigger className="text-sm font-semibold">Dolor</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div><p className="text-muted-foreground text-xs font-medium">Intensidad EVA</p><PainBadge score={e.pain_score} /></div>
              <Row label="Aparición" value={e.pain_appearance} />
              <Row label="Localización" value={e.pain_location} />
              <Row label="Irradiación" value={e.pain_radiation} />
              <Row label="Características" value={e.pain_characteristics} />
              <Row label="Descripción general" value={e.pain} />
              <Row label="Agravantes / Atenuantes" value={e.pain_aggravating_factors} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="edema">
            <AccordionTrigger className="text-sm font-semibold">Edema</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Row label="Observación" value={e.edema} />
              <Row label="Circometría" value={e.edema_circummetry} />
              <Row label="Test de Godet" value={e.godet_test} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="movilidad">
            <AccordionTrigger className="text-sm font-semibold">Movilidad</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Row label="AROM" value={e.arom} />
                <Row label="PROM" value={e.prom} />
                <Row label="Kapandji" value={e.kapandji} />
              </div>
              {(() => {
                // Helper to render structured goniometry
                const renderGonio = (data: any, label: string) => {
                  if (!data || !data.body_part) return null;
                  const partMap: Record<string, string> = {
                    shoulder: "Hombro",
                    elbow: "Codo",
                    wrist: "Muñeca",
                    hand: "Mano",
                    thumb: "Pulgar",
                  };
                  const partName = partMap[data.body_part] || data.body_part;
                  const values = data.values || {};
                  const entries = Object.entries(values).filter(([, v]) => v !== "" && v != null);
                  if (entries.length === 0) return null;
                  const valuesStr = entries.map(([k, v]) => `${k}: ${v}°`).join(" · ");
                  return (
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">{label} — {partName}</p>
                      <p className="text-sm">{valuesStr}</p>
                    </div>
                  );
                };

                // Check if new format (has pre/post)
                const hasPre = gonioData && "pre" in gonioData && gonioData.pre;
                const hasPost = gonioData && "post" in gonioData && gonioData.post;

                if (hasPre || hasPost) {
                  return (
                    <div className="space-y-3">
                      {renderGonio(gonioData?.pre, "Goniometría PRE")}
                      {renderGonio(gonioData?.post, "Goniometría POST")}
                    </div>
                  );
                }

                // Fallback to old flat format
                if (gonioData && Object.values(gonioData).some(v => v !== "" && v != null)) {
                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Goniometría</p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {Object.entries(gonioData).filter(([, v]) => v !== "" && v != null).map(([key, val]) => (
                          <div key={key} className="bg-muted/50 rounded px-2 py-1">
                            <p className="text-[10px] text-muted-foreground">{key}</p>
                            <p className="text-xs font-medium">{val}°</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="fuerza">
            <AccordionTrigger className="text-sm font-semibold">Fuerza Muscular</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Row label="Dinamómetro MSD" value={e.dynamometer_msd != null ? `${e.dynamometer_msd} kgf` : null} />
              <Row label="Dinamómetro MSI" value={e.dynamometer_msi != null ? `${e.dynamometer_msi} kgf` : null} />
              <Row label="Fuerza general" value={e.muscle_strength} />
              <Row label="N. Mediano (Daniels)" value={e.muscle_strength_median} />
              <Row label="N. Cubital (Daniels)" value={e.muscle_strength_cubital} />
              <Row label="N. Radial (Daniels)" value={e.muscle_strength_radial} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sensibilidad">
            <AccordionTrigger className="text-sm font-semibold">Sensibilidad</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Row label="Epicrítica (funcional)" value={e.sensitivity_functional} />
              <Row label="Protopática (protectora)" value={e.sensitivity_protective} />
              <Row label="General" value={e.sensitivity} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="pruebas">
            <AccordionTrigger className="text-sm font-semibold">Pruebas Específicas</AccordionTrigger>
            <AccordionContent className="space-y-1 pt-2">
              {testsData ? (
                Object.entries(testsData).filter(([, v]) => v).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                    <span className="text-sm capitalize">{key.replace(/_/g, " ")}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${val === "positive" ? "bg-primary/10 text-primary" : val === "negative" ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                      {testResultLabel[val as string] || val}
                    </span>
                  </div>
                ))
              ) : <p className="text-sm text-muted-foreground">No se registraron pruebas.</p>}
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="trofico">
            <AccordionTrigger className="text-sm font-semibold">Estado Trófico y Cicatriz</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Row label="Estado trófico" value={e.trophic_state} />
              <Row label="Cicatriz" value={e.scar} />
              <Row label="Vancouver VSS" value={e.vancouver_score != null ? `${e.vancouver_score}/15` : null} />
              <Row label="OSAS observador" value={e.osas_score != null ? `${e.osas_score}/60` : null} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="postura">
            <AccordionTrigger className="text-sm font-semibold">Postura y Emotividad</AccordionTrigger>
            <AccordionContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Row label="Postura" value={e.posture} />
              <Row label="Estado emocional" value={e.emotional_state} />
              <Row label="Notas" value={e.notes} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </DialogContent>
    </Dialog>
  );
}

// --- List with detail ---

export function AnalEvalList({ evaluations }: { evaluations: any[] }) {
  const [detail, setDetail] = useState<any>(null);

  if (evaluations.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-8">Sin evaluaciones analíticas.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {evaluations.map(e => (
          <Card key={e.id} className="border-border/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="font-medium text-sm">{format(new Date(e.evaluation_date), "dd/MM/yyyy")}</p>
                <PainBadge score={e.pain_score} />
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetail(e)}>
                <Eye className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <AnalEvalDetailDialog evaluation={detail} onClose={() => setDetail(null)} />
    </>
  );
}
