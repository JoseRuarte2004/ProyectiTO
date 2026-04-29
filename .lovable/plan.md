Voy a corregir dos problemas de visualización relacionados con Daniels:

1. En la línea de tiempo de sesiones
   - Ajustar el vínculo entre una sesión y su evaluación analítica para que priorice estrictamente `session_id`.
   - Si una evaluación tiene `session_id`, solo se mostrará en esa sesión exacta.
   - El fallback por misma fecha/episodio quedará limitado a evaluaciones antiguas que no tengan `session_id`, evitando que la evaluación de admisión se repita en sesiones posteriores del mismo día o episodio.

2. En la pestaña de evaluaciones analíticas
   - Agregar la visualización de `muscle_strength_daniels` dentro del bloque de Fuerza Muscular.
   - Mostrar los músculos cargados y su grado Daniels, igual que ya se ve correctamente dentro de sesiones.

3. Mantener compatibilidad con datos previos
   - Las evaluaciones antiguas sin `session_id` seguirán pudiendo asociarse por fecha y episodio como respaldo.
   - Las evaluaciones nuevas, incluida la admisión y las sesiones posteriores, se mostrarán asociadas por su `session_id` real.

Archivos a modificar:
- `src/pages/PatientProfile.tsx`
- `src/components/evaluations/AnalyticalEvalForm.tsx`

No voy a tocar la base de datos ni cambiar el guardado, salvo que luego encontremos datos históricos ya guardados incorrectamente que requieran una migración aparte.