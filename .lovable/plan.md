
# Rediseño visual del perfil del paciente

Todo lo que no te gusta: avatar genérico, timeline con puntos/líneas, colores y fondos, tipografía sin jerarquía. La distribución de información se mantiene igual (dos paneles, tabs).

---

## 1. Avatar — Eliminar el círculo grande con iniciales

Reemplazar el avatar circular de 88px con iniciales por un bloque más sutil:
- Sin círculo. Solo las iniciales en texto pequeño (14px) dentro de un cuadrado redondeado (40px) con fondo `hsl(var(--muted))` muy sutil
- O directamente eliminarlo y empezar con el nombre del paciente, con el apellido en Playfair Display 24px semibold y el nombre debajo en Inter 16px regular — jerarquía clara sin necesidad de avatar

## 2. Panel izquierdo — Tipografía y colores

- Apellido: Playfair Display, 22px, font-semibold, tracking-tight, color foreground
- Nombre: Inter, 16px, font-normal, color foreground/60
- Edad + DNI: Inter 12px, muted-foreground, separados con " · "
- Badge "Episodio activo": más discreto — sin borde visible, solo un punto verde (6px) + texto "Episodio activo" en 11px semibold verde
- Campos (DIAGNÓSTICO, ADMISIÓN, etc.): `.field-label` sin cambios, pero el valor debajo con 13px en vez de 14px, font-normal, color foreground (no foreground con peso bold)
- Botones: "Nueva sesión" como botón primario más compacto (h-10), "Nuevo turno" como ghost con icono — menos protagonismo

## 3. Fondo y colores

- Panel izquierdo: `#FFFFFF` puro (se mantiene)
- Panel derecho: cambiar de `#F5F3EF` a `hsl(var(--background))` — el mismo crema sutil del fondo general. Sin contraste forzado que se ve artificial
- Cards de sesión en el panel derecho: `#FFFFFF`, borde `hsl(var(--border))` 1px, border-radius 10px
- Eliminar todos los colores `teal-XXX` hardcodeados (teal-200, teal-500, teal-50, teal-100, teal-800) y usar los tokens del design system: `primary`, `primary/10`, `primary/20`

## 4. Timeline de sesiones — Eliminar completamente

Reemplazar la timeline con puntos y línea vertical por una lista simple de cards:
- Eliminar la línea vertical `bg-teal-200`
- Eliminar los puntos circulares (`bg-teal-500 ring-4`)
- Eliminar el `pl-12` y `pb-8` del padding de timeline
- Cada sesión es simplemente una card blanca con:
  - Fecha en 13px font-medium
  - Badge de tipo (Admisión/Seguimiento/Alta) como pill sutil
  - Número de sesión en texto muted
  - Badge "Con mediciones" si aplica
  - Botones editar/eliminar a la derecha
  - Separadas por `gap-3` en un `space-y-3`
- Eliminar el `border-l-[3px]` de color por tipo — eso también se ve "plantilla"
- El card expandido: fondo blanco (no `bg-gray-50/30`), borde top sutil

## 5. Tab bar

- Mantener el estilo underline actual pero ajustar: texto 13px, tracking ligeramente más amplio, color muted-foreground para inactivo, foreground para activo con borde-bottom de 2px primary
- Agregar un poco más de padding vertical (py-3)

## Archivos a editar

| Archivo | Cambios |
|---------|---------|
| `src/pages/PatientProfile.tsx` | Avatar, panel izquierdo, SessionTimeline (quitar timeline, hacer cards simples), colores hardcodeados, tab styling, botón "Registrar visita" |
| `src/index.css` | Ajustar `.patient-content` background, limpiar reglas de patient-content cards |
