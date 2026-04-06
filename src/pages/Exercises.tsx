import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Loader2, Dumbbell, Search, Video, Eye, Pencil, Trash2, Repeat, Timer, CalendarDays, FileDown, Settings } from "lucide-react";
import { exportExercisesPdf } from "@/components/exercises/ExercisePdfExport";
import CategoryManager from "@/components/exercises/CategoryManager";

const systemCategoryOptions = [
  { value: "general", label: "General" },
  { value: "occupation", label: "Ocupación" },
  { value: "sport", label: "Deporte" },
  { value: "joint_protection", label: "Protección articular" },
  { value: "skin_care", label: "Cuidado de piel" },
] as const;

const systemEnumValues = new Set(systemCategoryOptions.map((c) => c.value));

const categoryMap: Record<string, string> = Object.fromEntries(
  systemCategoryOptions.map((c) => [c.value, c.label])
);

type Exercise = any;
type CustomCategory = { id: string; name: string };

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [detailEx, setDetailEx] = useState<Exercise | null>(null);
  const [editEx, setEditEx] = useState<Exercise | null>(null);
  const [showPdfSelect, setShowPdfSelect] = useState(false);
  const [pdfSelected, setPdfSelected] = useState<Set<string>>(new Set());
  const [deleteEx, setDeleteEx] = useState<Exercise | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from("exercise_library")
      .select("*, exercise_categories(category)")
      .order("name");
    setExercises(data || []);
    setLoading(false);
  };

  const fetchCustomCategories = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("exercise_custom_categories")
      .select("id, name")
      .eq("professional_id", user.id)
      .order("name");
    setCustomCategories(data || []);
  };

  useEffect(() => {
    fetchExercises();
    fetchCustomCategories();
  }, []);

  const filtered = useMemo(() => {
    let list = exercises;
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((ex) =>
        ex.name?.toLowerCase().includes(s) || ex.body_region?.toLowerCase().includes(s)
      );
    }
    if (catFilter !== "all") {
      list = list.filter((ex) =>
        ex.exercise_categories?.some((c: any) => c.category === catFilter)
      );
    }
    return list;
  }, [exercises, search, catFilter]);

  const handleOpenPdfSelect = () => {
    setPdfSelected(new Set(filtered.map((ex) => ex.id)));
    setShowPdfSelect(true);
  };

  const togglePdfSelect = (id: string) => {
    setPdfSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExportPdf = () => {
    const selected = filtered.filter((ex) => pdfSelected.has(ex.id));
    if (selected.length === 0) { toast.error("Seleccioná al menos un ejercicio"); return; }
    exportExercisesPdf(selected);
    setShowPdfSelect(false);
    toast.success(`PDF exportado con ${selected.length} ejercicio(s)`);
  };

  const handleDelete = async () => {
    if (!deleteEx) return;
    // Delete categories first, then exercise
    await supabase.from("exercise_categories").delete().eq("exercise_id", deleteEx.id);
    const { error } = await supabase.from("exercise_library").delete().eq("id", deleteEx.id);
    setDeleteEx(null);
    if (error) {
      if (error.code === "23503") {
        toast.error("No se puede eliminar este ejercicio porque está asignado a un plan terapéutico. Podés desactivarlo en su lugar.");
      } else {
        toast.error("Error al eliminar ejercicio");
      }
      return;
    }
    toast.success("Ejercicio eliminado correctamente");
    fetchExercises();
  };

  // Build combined filter options (system + custom)
  const allFilterOptions = [
    ...systemCategoryOptions,
    ...customCategories.map((c) => ({ value: c.name, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Biblioteca de Ejercicios</h1>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowCategoryManager(true)}>
            <Settings className="h-4 w-4 mr-2" />Gestionar categorías
          </Button>
          <Button variant="outline" onClick={handleOpenPdfSelect} disabled={filtered.length === 0}>
            <FileDown className="h-4 w-4 mr-2" />Exportar PDF
          </Button>
          <Button onClick={() => setShowNew(true)}>
            <Plus className="h-4 w-4 mr-2" />Nuevo Ejercicio
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre o región corporal..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={catFilter === "all" ? "default" : "outline"} size="sm" onClick={() => setCatFilter("all")}>Todos</Button>
        {allFilterOptions.map((c) => (
          <Button key={c.value} variant={catFilter === c.value ? "default" : "outline"} size="sm" onClick={() => setCatFilter(c.value)}>
            {c.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 && exercises.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <Dumbbell className="h-12 w-12 text-muted-foreground/40 mx-auto" />
          <p className="text-muted-foreground">Todavía no tenés ejercicios en tu biblioteca.</p>
          <p className="text-muted-foreground text-sm">Creá el primero con el botón <span className="font-semibold text-primary">Nuevo Ejercicio</span>.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No se encontraron ejercicios con esos filtros.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ex) => {
            const cats: string[] = ex.exercise_categories?.map((c: any) => c.category) || [];
            return (
              <Card key={ex.id} className="border-border/50 flex flex-col">
                <CardContent className="p-5 flex flex-col flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                      <p className="font-semibold text-foreground truncate">{ex.name}</p>
                    </div>
                    {ex.video_url && (
                      <button onClick={() => window.open(ex.video_url, "_blank")} className="text-primary hover:text-primary/80 shrink-0 ml-2" title="Ver video">
                        <Video className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Categories */}
                  {cats.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cats.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs bg-secondary text-secondary-foreground">
                          {categoryMap[c] || c}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {ex.body_region && <p className="text-xs text-muted-foreground mb-2">Región: {ex.body_region}</p>}
                  {ex.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{ex.description}</p>}

                  {/* Execution params */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-4">
                    {ex.default_repetitions && <span className="flex items-center gap-1"><Repeat className="h-3 w-3" />{ex.default_repetitions} rep.</span>}
                    {ex.default_sets && <span className="flex items-center gap-1"><Dumbbell className="h-3 w-3" />{ex.default_sets} series</span>}
                    {ex.default_duration && <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{ex.default_duration}</span>}
                    {ex.default_frequency && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{ex.default_frequency}</span>}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
                    <Button variant="default" size="sm" className="flex-1 text-xs" onClick={() => setDetailEx(ex)}>
                      <Eye className="h-3 w-3 mr-1" />Ver detalle
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setEditEx(ex)}>
                      <Pencil className="h-3 w-3 mr-1" />Editar
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteEx(ex)} title="Eliminar">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <ExerciseFormDialog open={showNew} onClose={() => setShowNew(false)} userId={user!.id} onSaved={() => { fetchExercises(); fetchCustomCategories(); }} customCategories={customCategories} />
      {editEx && <ExerciseFormDialog open onClose={() => setEditEx(null)} userId={user!.id} onSaved={() => { fetchExercises(); fetchCustomCategories(); }} exercise={editEx} customCategories={customCategories} />}
      {detailEx && <ExerciseDetailDialog exercise={detailEx} onClose={() => setDetailEx(null)} />}
      <CategoryManager open={showCategoryManager} onClose={() => setShowCategoryManager(false)} userId={user!.id} onChanged={fetchCustomCategories} />

      {/* PDF selection dialog */}
      <Dialog open={showPdfSelect} onOpenChange={setShowPdfSelect}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Seleccioná ejercicios para exportar</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{pdfSelected.size} de {filtered.length} seleccionados</p>
              <Button variant="ghost" size="sm" onClick={() => {
                if (pdfSelected.size === filtered.length) setPdfSelected(new Set());
                else setPdfSelected(new Set(filtered.map((ex) => ex.id)));
              }}>
                {pdfSelected.size === filtered.length ? "Deseleccionar todos" : "Seleccionar todos"}
              </Button>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {filtered.map((ex) => (
                <label key={ex.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer">
                  <Checkbox checked={pdfSelected.has(ex.id)} onCheckedChange={() => togglePdfSelect(ex.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    {ex.body_region && <p className="text-xs text-muted-foreground">{ex.body_region}</p>}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowPdfSelect(false)}>Cancelar</Button>
              <Button onClick={handleExportPdf} disabled={pdfSelected.size === 0}>
                <FileDown className="h-4 w-4 mr-1" />Exportar ({pdfSelected.size})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deleteEx} onOpenChange={(open) => { if (!open) setDeleteEx(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este ejercicio permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ────────── Detail Dialog ────────── */

function ExerciseDetailDialog({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const cats: string[] = exercise.exercise_categories?.map((c: any) => c.category) || [];
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" />{exercise.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 text-sm">
          {cats.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {cats.map((c) => <Badge key={c} variant="outline" className="bg-secondary text-secondary-foreground">{categoryMap[c] || c}</Badge>)}
            </div>
          )}
          {exercise.body_region && <Field label="Región corporal" value={exercise.body_region} />}
          {exercise.description && <Field label="Descripción" value={exercise.description} />}
          {exercise.instructions && <Field label="Instrucciones" value={exercise.instructions} />}
          {exercise.default_repetitions && <Field label="Repeticiones por serie" value={String(exercise.default_repetitions)} />}
          {exercise.default_sets && <Field label="Series" value={String(exercise.default_sets)} />}
          {exercise.default_duration && <Field label="Pausa entre series" value={exercise.default_duration} />}
          {exercise.default_frequency && <Field label="Frecuencia diaria" value={exercise.default_frequency} />}
          {exercise.video_url && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Video</p>
              <a href={exercise.video_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs break-all">{exercise.video_url}</a>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-0.5">{label}</p>
      <p className="text-foreground whitespace-pre-wrap">{value}</p>
    </div>
  );
}

/* ────────── Create / Edit Dialog ────────── */

function ExerciseFormDialog({ open, onClose, userId, onSaved, exercise, customCategories }: {
  open: boolean; onClose: () => void; userId: string; onSaved: () => void; exercise?: Exercise; customCategories: CustomCategory[];
}) {
  const isEdit = !!exercise;
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    exercise?.exercise_categories?.map((c: any) => c.category) || []
  );
  const [form, setForm] = useState({
    name: exercise?.name || "",
    description: exercise?.description || "",
    instructions: exercise?.instructions || "",
    body_region: exercise?.body_region || "",
    default_repetitions: exercise?.default_repetitions ? String(exercise.default_repetitions) : "",
    default_sets: exercise?.default_sets ? String(exercise.default_sets) : "",
    default_duration: exercise?.default_duration || "",
    default_frequency: exercise?.default_frequency || "",
    video_url: exercise?.video_url || "",
  });

  const toggleCategory = (val: string) => {
    setSelectedCategories((prev) =>
      prev.includes(val) ? prev.filter((c) => c !== val) : [...prev, val]
    );
  };

  const canSave = form.name.trim() !== "" && selectedCategories.length > 0;

  const handleSave = async () => {
    if (!canSave) { toast.error("Completá el nombre y seleccioná al menos una categoría"); return; }
    setSaving(true);

    const payload = {
      name: form.name,
      description: form.description || null,
      instructions: form.instructions || null,
      body_region: form.body_region || null,
      default_repetitions: form.default_repetitions ? parseInt(form.default_repetitions) : null,
      default_sets: form.default_sets ? parseInt(form.default_sets) : null,
      default_duration: form.default_duration || null,
      default_frequency: form.default_frequency || null,
      video_url: form.video_url || null,
    };

    let exerciseId: string;

    if (isEdit) {
      const { error } = await supabase.from("exercise_library").update(payload).eq("id", exercise.id);
      if (error) { setSaving(false); toast.error("Error al actualizar ejercicio"); return; }
      exerciseId = exercise.id;
      await supabase.from("exercise_categories").delete().eq("exercise_id", exerciseId);
    } else {
      const { data, error } = await supabase.from("exercise_library").insert({
        ...payload,
        professional_id: userId,
        is_active: true,
      }).select("id").single();
      if (error || !data) { setSaving(false); toast.error("Error al crear ejercicio"); return; }
      exerciseId = data.id;
    }

    // Insert categories
    const catRows = selectedCategories.map((cat) => ({
      exercise_id: exerciseId,
      category: cat as any,
    }));
    const { error: catError } = await supabase.from("exercise_categories").insert(catRows);
    setSaving(false);

    if (catError) { toast.error(isEdit ? "Ejercicio actualizado pero hubo un error con las categorías" : "Ejercicio creado pero hubo un error con las categorías"); }
    else { toast.success(isEdit ? "Ejercicio actualizado correctamente" : "Ejercicio creado correctamente"); }

    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? "Editar Ejercicio" : "Nuevo Ejercicio"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Instrucciones</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} /></div>

          {/* System categories */}
          <div className="space-y-2">
            <Label>Categorías del sistema *</Label>
            <div className="space-y-2">
              {systemCategoryOptions.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={selectedCategories.includes(cat.value)} onCheckedChange={() => toggleCategory(cat.value)} />
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom categories */}
          {customCategories.length > 0 && (
            <div className="space-y-2">
              <Label>Categorías personalizadas</Label>
              <div className="space-y-2">
                {customCategories.map((cat) => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox checked={selectedCategories.includes(cat.name)} onCheckedChange={() => toggleCategory(cat.name)} />
                    <span className="text-sm">{cat.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2"><Label>Región corporal</Label><Input value={form.body_region} onChange={(e) => setForm({ ...form, body_region: e.target.value })} /></div>
          <div className="space-y-2"><Label>Repeticiones por serie</Label><Input type="number" value={form.default_repetitions} onChange={(e) => setForm({ ...form, default_repetitions: e.target.value })} /></div>
          <div className="space-y-2"><Label>Series</Label><Input type="number" value={form.default_sets} onChange={(e) => setForm({ ...form, default_sets: e.target.value })} /></div>
          <div className="space-y-2"><Label>Pausa entre series</Label><Input value={form.default_duration} onChange={(e) => setForm({ ...form, default_duration: e.target.value })} placeholder="ej: 30 segundos, 1 minuto" /></div>
          <div className="space-y-2"><Label>Frecuencia diaria</Label><Input value={form.default_frequency} onChange={(e) => setForm({ ...form, default_frequency: e.target.value })} placeholder="ej: 2 veces por día, cada 8 horas" /></div>
          <div className="space-y-2"><Label>URL de video</Label><Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="ej: https://youtube.com/..." /></div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !canSave}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
