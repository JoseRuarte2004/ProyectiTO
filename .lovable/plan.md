Voy a ajustar la visualización del perfil del paciente para que muestre correctamente los datos nuevos que ya se cargan en admisión/sesión.

Cambios propuestos:

1. En `src/pages/PatientProfile.tsx`, en el historial de visitas:
   - Vincular cada visita no solo con evaluaciones analíticas por `session_id`, sino también con evaluaciones guardadas en admisión que tienen `episode_id` y la misma fecha de la visita.
   - Esto corrige el caso actual donde la admisión guarda las mediciones, pero no quedan asociadas por `session_id`, entonces no aparecen al visualizar la visita.

2. En la visita expandida, agregar una sección de `Evaluación funcional` cuando exista para esa visita/admisión:
   - Mostrar badge `QuickDASH: XX/100` si hay `quickdash_score`.
   - Mostrar badge `FIM: XX/126` si hay `fim_score`.
   - Mostrar `AVD` y `AIVD` si tienen contenido.

3. Mantener y reforzar la visualización de `Fuerza muscular (Daniels) — Músculos evaluados` dentro de `Evaluación analítica`:
   - Usar el campo `muscle_strength_daniels` ya guardado.
   - Mostrar cada fila como: `[Músculo]: Daniels [grado]`.
   - Asegurar que también aparezca para admisiones donde la evaluación analítica fue creada con `episode_id` y fecha, aunque no tenga `session_id`.

Detalles técnicos:

- No voy a crear columnas nuevas en Supabase.
- No voy a agregar paquetes.
- No voy a tocar el formulario de admisión salvo que sea necesario para compatibilidad mínima.
- El cambio principal será pasar `funcEvals` al componente `SessionTimeline` y mejorar la lógica de matching de evaluaciones por:
  - `session_id`, o
  - misma `episode_id` + misma fecha de la sesión/evaluación.

Resultado esperado:

Al entrar al perfil del paciente y abrir la visita/admisión en “Historial de visitas”, se verán QuickDASH, FIM, AVD/AIVD y Fuerza muscular Daniels cuando esos datos hayan sido cargados.