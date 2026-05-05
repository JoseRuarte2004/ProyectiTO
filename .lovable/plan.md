## Cambio de orden: Cicatriz antes de Pruebas específicas

Mover el bloque "Cicatriz" para que aparezca **arriba** de "Pruebas específicas" en los formularios y visualizaciones.

Orden final de la evaluación analítica:
Dolor → Edema → Movilidad → Fuerza → Sensibilidad → **Cicatriz** → **Pruebas específicas**

### Archivos a modificar

1. **`src/pages/SessionForm.tsx`** (sesión)
   - Intercambiar bloques JSX: mover el `SubSection "Cicatriz"` (líneas ~1577+) para que quede antes del `SubSection "Pruebas específicas"` (línea 1547).

2. **`src/components/patients/NewPatientForm.tsx`** (admisión)
   - Intercambiar bloques JSX: mover `SubSection "Cicatriz"` (línea 1615) antes de `SubSection "Pruebas específicas"` (línea 1592).

3. **`src/pages/PatientProfile.tsx`** (visualización)
   - Intercambiar `SubSection label="Cicatriz"` (línea 1231) y `SubSection label="Pruebas específicas"` (línea 1225) para que Cicatriz se renderice primero.

4. **`src/components/evaluations/AnalyticalEvalForm.tsx`** (form/visualización alterna)
   - Verificar el orden de las secciones de Accordion. Si "Pruebas específicas" aparece antes de "Cicatriz", intercambiarlas tanto en el modo edición como en el modo visualización (línea 623).

### No se toca

Lógica de carga/guardado, contenido de los campos, ni ningún otro orden de secciones.
