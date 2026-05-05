## Fix: marcar paciente como "Dado de alta" al guardar sesión de alta

**Problema:** Cuando se guarda una sesión con `session_type = "discharge"`, sólo se inserta la sesión en `therapy_sessions`, pero no se actualiza:
- `patients.status` → sigue en `active`
- `treatment_episodes.status` del episodio activo → sigue en `active`

Por eso el paciente no aparece como dado de alta en el listado ni en su ficha.

### Cambio

**`src/pages/SessionForm.tsx`** — en `handleSave`, después del `if (editingAnEval)` block (alrededor de línea 926, antes de `setSaving(false)` y `toast.success`), agregar:

```ts
// Si la sesión es de alta, marcar paciente y episodio como "discharged"
if (session_type === "discharge") {
  await supabase
    .from("patients")
    .update({ status: "discharged" })
    .eq("id", patientId!);

  if (activeEpisodeId) {
    await supabase
      .from("treatment_episodes")
      .update({ status: "discharged", discharge_date: session_date })
      .eq("id", activeEpisodeId);
  }
}
```

El trigger `handle_patient_discharge` ya existe y completa `discharged_at` automáticamente cuando `status` pasa a `discharged`.

### No se toca

- Lógica de creación de admisión / sesiones de seguimiento.
- Visualización en `PatientProfile` (ya detecta `discharge_session` y muestra el banner).
- Filtros del listado (`Patients.tsx` ya tiene la opción `discharged`).
