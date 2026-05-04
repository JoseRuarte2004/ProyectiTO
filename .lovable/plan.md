## Objetivo

Igualar el aspecto visual del formulario de **sesiones** al de **admisión** (que ya quedó pulido) y permitir incluir la **Evaluación funcional** en cualquier sesión, no solo en la de admisión.

## Cambios en `src/pages/SessionForm.tsx`

### 1. Evaluación funcional disponible en toda sesión

Hoy el bloque `Evaluación funcional` está condicionado a `session_type === "admission"` (línea 1126). Se va a:

- Mostrarlo siempre, dentro de un `SectionCard` con `toggle` (igual que en admisión, línea 1278 de `NewPatientForm.tsx`).
- Agregar un nuevo estado `showFunctional` (default: `true` cuando `session_type === "admission"`, `false` en seguimientos / alta — así no aparece de más en seguimientos pero queda a un click).
- Cuando el toggle está apagado, **no** se guarda nada en `functional_evaluations` (la lógica de save en línea 790–820 ya chequea si hay datos; se sumará la condición `showFunctional`).
- Al cargar una sesión existente que ya tiene `functional_evaluations`, se enciende `showFunctional` automáticamente.

Estado por defecto:
- `admission` → `true`
- `follow_up` / `discharge` → `false`, pero el usuario lo puede activar.

### 2. Igualar el estilo visual de la "Evaluación analítica" al de admisión

La diferencia clave entre los dos formularios es que en sesiones se usó `FieldLabel` (clase `field-label`: minúsculas → MAYÚSCULAS muy chicas) en muchos sub-campos de la analítica, mientras que en admisión se usa `<Label>` normal (texto más legible, no uppercase). Eso hace que la analítica de sesiones se vea más "apretada / técnica" que la de admisión.

Acciones (solo dentro de la card "Evaluación analítica", líneas 1199–1748):

- Reemplazar `<FieldLabel>…</FieldLabel>` por `<Label>…</Label>` en los campos de Dolor, Edema, Movilidad, Fuerza muscular, Sensibilidad, Pruebas específicas, Cicatriz y Otros — replicando exactamente cómo están en `NewPatientForm.tsx` (líneas 1315–1730).
- Mantener `FieldLabel` solo en las cards "Datos de la sesión", "Evaluación funcional" y "Evolución", donde sí queda bien (son campos de cabecera, igual que en admisión).
- Para los mini-labels de DPPD ("Pulgar", "Índice", …) usar `Label className="text-xs"` como en admisión (líneas 1472–1476), no `text-[10px] uppercase`.
- Para los subtítulos internos ("Circometría", "Goniometría PRE", "Epicrítica (funcional)") usar `<h4 className="text-xs font-medium text-muted-foreground">` (estilo admisión, línea 1401), no `<p className="text-xs font-semibold text-muted-foreground">`.
- Quitar el `inputClass` (alto h-10) en los inputs internos donde admisión usa el alto por defecto, para que la densidad coincida.

### 3. Sin cambios

- Estructura de cards, headers, sticky bar y botón de guardar (ya coinciden).
- Lógica de guardado/carga (solo se le suma la condición del toggle funcional).
- `SubSection` ya idéntico entre ambos formularios.

## Resultado esperado

- La pantalla de sesión se ve indistinguible en estilo de la de admisión (mismas etiquetas, misma densidad, mismos subtítulos).
- En cualquier sesión (seguimiento, alta) el usuario ve un nuevo bloque "Evaluación funcional" con switch "Incluir" para sumar QuickDASH / FIM / Barthel / AVD / AIVD / sueño / gestión de salud cuando lo necesite.
