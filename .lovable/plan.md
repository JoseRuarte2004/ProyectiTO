## Problema

Al cargar un paciente y poner solo la **Fecha de cirugía**, el campo "Semanas post-operatorio" en la ficha clínica aparece vacío ("Sin registrar") porque actualmente las semanas/días se guardan **manualmente** en campos separados (`weeks_post_surgery`, `days_post_surgery`) y no se calculan a partir de `surgery_date`.

Pasa lo mismo con Fecha de lesión → Semanas post-lesión.

## Solución

Cuando exista `surgery_date` (o `injury_date`) calcular las semanas + días automáticamente al mostrar y al guardar, sin que el profesional tenga que cargarlas a mano.

### Cambios

1. **`src/pages/PatientProfile.tsx`** (vista de Datos clínicos)
   - Agregar helper `weeksFromDate(dateStr)` que calcule semanas y días entre la fecha y hoy.
   - Si hay `clinical.surgery_date` y los campos manuales están vacíos → mostrar el cálculo automático en "Semanas post-operatorio".
   - Igual para `injury_date` → "Semanas post-lesión".
   - Incluir `surgery_date`/`injury_date` en la condición que decide si mostrar la sección (ya está incluida).

2. **`src/components/patients/NewPatientForm.tsx`** (formulario nuevo paciente)
   - Cuando el usuario selecciona `surgeryDate` y los inputs de semanas/días están vacíos, autocompletarlos a partir de la fecha (recálculo en `useEffect` o al `onChange`).
   - Mismo comportamiento para `injuryDate`.
   - El usuario puede sobrescribir manualmente si quiere.

3. **`src/pages/PatientProfile.tsx`** edición de ficha clínica (mismo formulario)
   - Mismo autocompletado al cambiar `surgery_date` / `injury_date` en el form de edición (líneas ~810).

### Detalles técnicos

- Helper:
  ```ts
  const weeksFromDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d + "T12:00:00").getTime()) / 86400000);
    return { weeks: Math.floor(diff / 7), days: diff % 7 };
  };
  ```
- En la vista, si `weeks_post_surgery == null && surgery_date` → usar el cálculo; si el profesional cargó valores manuales, respetarlos.
- No se requieren cambios en la base de datos.
