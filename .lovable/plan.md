## Unificar estilo de títulos/labels en sesiones y admisiones

En las **evaluaciones** (`AnalyticalEvalForm.tsx`) los títulos de campo usan `Label className="text-xs"` → texto fino, capitalización normal (ej: "Lateralidad").

En **sesiones** (`SessionForm.tsx`) y **admisiones** (`NewPatientForm.tsx`) los títulos usan la clase `.field-label` → MAYÚSCULAS, tracking ancho, color tenue.

Cambio: que sesiones y admisiones usen el mismo estilo que evaluaciones.

### Archivos a modificar

1. **`src/pages/SessionForm.tsx`** (línea 231-237)
   - En `FieldLabel`, reemplazar `className="field-label mb-1.5 block"` por `className="text-xs mb-1.5 block"`.

2. **`src/components/patients/NewPatientForm.tsx`** (líneas 102-113)
   - En `FieldLabel`, mismo cambio: `field-label` → `text-xs`.
   - Cambiar la constante `subLabel` de `"field-label mb-3"` a `"text-xs mb-3 block"`.

### Notas

- No se toca `.field-label` en `index.css` ni los usos en `PatientProfile.tsx` (visualización del paciente, donde el estilo uppercase sí tiene sentido como micro-label).
- No se modifican los `<Label>` directos que ya usan `text-xs` u otras clases; sólo el componente `FieldLabel` y `subLabel`, que cubren la mayoría de los títulos de campo en los formularios.
