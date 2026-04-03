import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Loader2, Dumbbell } from "lucide-react";

const categoryOptions = [
  { value: "general", label: "General" },
  { value: "occupation", label: "Ocupación" },
  { value: "sport", label: "Deporte" },
  { value: "joint_protection", label: "Protección articular" },
  { value: "skin_care", label: "Cuidado de piel" },
] as const;

const categoryMap: Record<string, string> = Object.fromEntries(categoryOptions.map((c) => [c.value, c.label]));

export default function Exercises() {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const fetchExercises = async () => {
    const { data } = await supabase
      .from("exercise_library")
      .select("*, exercise_categories(category)")
      .order("name");
    setExercises(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchExercises(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-foreground">Biblioteca de Ejercicios</h1>
        <Button onClick={() => setShowNew(true)}><Plus className="h-4 w-4 mr-2" />Nuevo Ejercicio</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : exercises.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No hay ejercicios en la biblioteca.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exercises.map((ex) => {
            const cats: string[] = ex.exercise_categories?.map((c: any) => c.category) || [];
            return (
              <Card key={ex.id} className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm text-foreground">{ex.name}</p>
                    </div>
                  </div>
                  {cats.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {cats.map((c) => (
                        <Badge key={c} variant="outline" className="text-xs bg-secondary text-secondary-foreground">
                          {categoryMap[c] || c}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {ex.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{ex.description}</p>}
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {ex.body_region && <p>Región: {ex.body_region}</p>}
                    {ex.default_repetitions && <p>Repeticiones: {ex.default_repetitions}</p>}
                    {ex.default_sets && <p>Series: {ex.default_sets}</p>}
                    {ex.default_frequency && <p>Frecuencia: {ex.default_frequency}</p>}
                    {ex.default_duration && <p>Duración: {ex.default_duration}</p>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewExerciseDialog open={showNew} onClose={() => setShowNew(false)} userId={user!.id} onSaved={fetchExercises} />
    </div>
  );
}

function NewExerciseDialog({ open, onClose, userId, onSaved }: { open: boolean; onClose: () => void; userId: string; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    instructions: "",
    body_region: "",
    default_repetitions: "",
    default_frequency: "",
    default_sets: "",
    default_duration: "",
    video_url: "",
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

    const { data, error } = await supabase.from("exercise_library").insert({
      name: form.name,
      description: form.description || null,
      instructions: form.instructions || null,
      body_region: form.body_region || null,
      default_repetitions: form.default_repetitions ? parseInt(form.default_repetitions) : null,
      default_frequency: form.default_frequency || null,
      default_sets: form.default_sets ? parseInt(form.default_sets) : null,
      default_duration: form.default_duration || null,
      video_url: form.video_url || null,
      professional_id: userId,
      is_active: true,
    }).select("id").single();

    if (error || !data) {
      setSaving(false);
      toast.error("Error al crear ejercicio");
      return;
    }

    // Insert categories
    const catRows = selectedCategories.map((cat) => ({
      exercise_id: data.id,
      category: cat as any,
    }));
    const { error: catError } = await supabase.from("exercise_categories").insert(catRows);
    setSaving(false);

    if (catError) { toast.error("Ejercicio creado pero hubo un error con las categorías"); }
    else { toast.success("Ejercicio creado correctamente"); }

    setForm({ name: "", description: "", instructions: "", body_region: "", default_repetitions: "", default_frequency: "", default_sets: "", default_duration: "", video_url: "" });
    setSelectedCategories([]);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nuevo Ejercicio</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="space-y-2"><Label>Descripción</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="space-y-2"><Label>Instrucciones</Label><Textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} /></div>

          {/* Categories as checkboxes */}
          <div className="space-y-2">
            <Label>Categorías *</Label>
            <div className="space-y-2">
              {categoryOptions.map((cat) => (
                <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedCategories.includes(cat.value)}
                    onCheckedChange={() => toggleCategory(cat.value)}
                  />
                  <span className="text-sm">{cat.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2"><Label>Región corporal</Label><Input value={form.body_region} onChange={(e) => setForm({ ...form, body_region: e.target.value })} /></div>
          <div className="space-y-2"><Label>Repeticiones por defecto</Label><Input type="number" value={form.default_repetitions} onChange={(e) => setForm({ ...form, default_repetitions: e.target.value })} /></div>
          <div className="space-y-2"><Label>Frecuencia por defecto</Label><Input value={form.default_frequency} onChange={(e) => setForm({ ...form, default_frequency: e.target.value })} /></div>
          <div className="space-y-2"><Label>Series por defecto</Label><Input type="number" value={form.default_sets} onChange={(e) => setForm({ ...form, default_sets: e.target.value })} /></div>
          <div className="space-y-2"><Label>Duración por defecto</Label><Input value={form.default_duration} onChange={(e) => setForm({ ...form, default_duration: e.target.value })} placeholder="ej: 30 segundos" /></div>
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
