Perfecto. Ajusto el enfoque a lo que proponés: no vamos a editar evaluaciones funcionales/analíticas desde la pestaña Evaluaciones. La modificación de esas evaluaciones se hará únicamente entrando a editar la sesión correspondiente, porque ahí ya está el contexto clínico correcto.

1. Editar ficha del paciente
   - Agregar un botón “Editar ficha” en la pestaña Ficha.
   - El formulario permitirá modificar los datos que se ven ahí y también los datos personales principales:
     - Nombre
     - Apellido
     - DNI
     - Fecha de nacimiento
     - Teléfono
     - Dirección
     - Obra social / cobertura si está cargada
     - Fecha de admisión si corresponde
     - Diagnóstico
     - Tipo de tratamiento
     - Fechas clínicas: lesión, inicio de síntomas, cirugía/inmovilización si están en la ficha
     - Médico, antecedentes, estudios, tratamiento actual, notas
     - Datos ocupacionales visibles en ficha: lateralidad, trabajo, educación, red de apoyo, ocio, actividad física, sueño/descanso, notas
   - Al guardar actualizará:
     - `patients`
     - `patient_clinical_records`
     - `patient_occupational_profiles`
   - Se mantendrá el filtro por episodio activo para los datos clínicos cuando aplique.

2. Editar sesiones desde el historial de sesiones
   - Agregar un botón “Editar” en cada sesión del historial.
   - Crear una ruta de edición, por ejemplo:
     - `/patients/:patientId/sessions/:sessionId/edit`
   - Reutilizar `SessionForm` para que funcione tanto para crear como para editar.
   - Al abrir una sesión existente, el formulario se precargará con:
     - Fecha
     - Tipo de sesión: admisión, seguimiento o alta
     - Nº de sesión
     - Semana POP/PL
     - Evolución / observaciones
     - Cambios en síntomas
     - Cambios clínicos
     - AVD seguimiento
     - Intervenciones
     - Indicaciones enviadas
     - Notas

3. Editar la evaluación funcional únicamente desde la sesión
   - Si la sesión es de admisión y tiene evaluación funcional asociada, se precargarán sus datos dentro del formulario de sesión:
     - Lateralidad
     - AVD
     - AIVD
     - Sueño/descanso
     - Gestión de salud
     - QuickDASH completo
     - FIM completo
   - Al guardar la sesión:
     - Si ya existe una `functional_evaluations` con ese `session_id`, se actualizará.
     - Si no existe y se completan datos funcionales, se creará asociada a esa sesión.
   - La pestaña Evaluaciones seguirá siendo de visualización, no de edición directa.

4. Editar la evaluación analítica únicamente desde la sesión
   - Si la sesión tiene evaluación analítica asociada, se precargarán sus mediciones dentro de `SessionForm`:
     - Dolor/EVA
     - Edema
     - Circometría
     - Movilidad/goniometría PRE y POST
     - Kapandji
     - Dinamometría
     - Fuerza Daniels por músculos
     - DPPD
     - Sensibilidad
     - Pruebas específicas
     - Cicatriz/Vancouver
     - Estado trófico
     - Postura
     - Estado emocional
   - Al guardar:
     - Si ya existe una `analytical_evaluations` con ese `session_id`, se actualizará.
     - Si no existe y se cargan mediciones, se creará asociada a esa sesión.
   - Esto mantiene la lógica clínica ordenada: cada evaluación queda atada a su sesión real.

5. Mantener la pestaña Evaluaciones como lectura
   - No agregar botones de edición en “Evaluaciones Funcionales” ni “Evaluaciones Analíticas”.
   - Esa pestaña seguirá mostrando los datos cargados para consulta.
   - Para modificar algo, el flujo será: ir a Sesiones > abrir la sesión correspondiente > Editar.

6. Seguridad y base de datos
   - No se necesitan cambios de estructura en Supabase.
   - Se usarán `update` sobre tablas existentes.
   - Se mantendrá el alcance profesional actual:
     - datos del paciente filtrados por el profesional autenticado
     - sesiones no eliminadas con `is_deleted=false`
     - evaluaciones asociadas por `session_id`

Archivos a modificar:
- `src/pages/PatientProfile.tsx`
- `src/pages/SessionForm.tsx`
- `src/App.tsx`

No voy a tocar la edición directa desde `AnalyticalEvalForm.tsx` salvo que haga falta ajustar la visualización. La edición clínica quedará centralizada en sesiones, como proponés.