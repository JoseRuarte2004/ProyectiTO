## Diagnóstico

El error al borrar la sesión no es del botón, sino de permisos RLS de Supabase:

```text
new row violates row-level security policy for table "therapy_sessions"
```

La app borra sesiones con soft delete:

```ts
update({ is_deleted: true })
```

Pero la política actual de `therapy_sessions` exige también en el `WITH CHECK`:

```sql
is_my_patient(patient_id)
```

y `is_my_patient` solo considera pacientes/sesiones visibles si `is_deleted = false`. Al cambiar la sesión a `is_deleted = true`, la fila nueva deja de cumplir la política y Supabase rechaza el PATCH con 403.

Además, si se elimina una sesión de tipo `discharge` (alta), hay que recalcular el estado del paciente para que vuelva a `active` si ya no queda ninguna otra alta activa.

## Plan de cambio

1. **Ajustar la política RLS de actualización de `therapy_sessions`**
   - Crear una migración que reemplace la policy `therapy_sessions: editar`.
   - Mantener la seguridad por profesional: solo el profesional dueño puede editar sesiones de sus pacientes.
   - Permitir específicamente el soft delete (`is_deleted: true`) sin romper RLS.
   - Evitar abrir acceso a otros profesionales o a pacientes eliminados.

2. **Completar la lógica del botón “Eliminar sesión”**
   - En `PatientProfile.tsx`, después de marcar una sesión como eliminada:
     - Si la sesión eliminada era de alta (`session_type === "discharge"`), consultar si queda otra alta no eliminada para ese paciente/episodio.
     - Si no queda otra alta, actualizar:
       - `patients.status` a `active`
       - `treatment_episodes.status` a `active`
       - `treatment_episodes.discharge_date` a `null`
   - Mantener bloqueado el borrado de la sesión de admisión.

3. **Mejorar el mensaje de error**
   - Si Supabase devuelve error al eliminar, mostrar un toast más claro y registrar el detalle en consola para depuración.

## Archivos/DB a tocar

- `supabase/migrations/...sql`
  - Actualización de RLS para `therapy_sessions`.
- `src/pages/PatientProfile.tsx`
  - Sincronización del estado del paciente/episodio al borrar sesiones de alta.

## Resultado esperado

- El botón de eliminar sesión dejará de devolver 403.
- Las sesiones no se borrarán físicamente: quedarán ocultas mediante `is_deleted = true`, como ya estaba diseñado.
- Si eliminás una sesión de alta y no queda otra alta activa, el paciente volverá a aparecer como `Activo`.