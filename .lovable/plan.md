Renombrar el subtítulo "Fuerza" → "Fuerza muscular" en todas las evaluaciones analíticas.

## Cambios

1. `src/components/patients/NewPatientForm.tsx` (línea 1446) — admisión:
   `<SubSection title="Fuerza" ...>` → `title="Fuerza muscular"`

2. `src/pages/PatientProfile.tsx` (línea 1147) — vista de evaluaciones del paciente:
   `<SubSection label="Fuerza">` → `label="Fuerza muscular"`

Nota: en `AnalyticalEvalForm.tsx` el título ya es "Fuerza Muscular" (líneas 207 y 454), así que no requiere cambios. Y los cambios previos en `SessionForm.tsx` (placeholder "Flexores de hombro" y botón "Agregar grupo muscular") se mantienen.