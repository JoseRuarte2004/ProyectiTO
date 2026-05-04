## Problema

En las evaluaciones funcionales (FIM y Barthel), las etiquetas de cada ítem (Alimentación, Aseo personal, Vestido tren superior, Uso del baño…) aparecen recortadas verticalmente a 1-2 letras porque el `<select>` tiene ancho fijo (`w-48` / `w-56`) y la columna de la izquierda no tiene espacio.

## Solución

Cambiar el layout de cada ítem en `src/components/evaluations/FunctionalScales.tsx` para que en pantallas angostas la etiqueta y el select se apilen verticalmente, y en pantallas más anchas se mantengan en fila pero con el select sin reducir más la columna del label.

### Cambios en `FunctionalScales.tsx`

1. **FIM (función `FimGroup`, ~línea 229-243)**: 
   - Cambiar el contenedor de cada ítem de `flex items-center justify-between gap-2` a `flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3`.
   - Label: agregar `sm:pr-2` y `title={item.label}` para tooltip; permitir wrap (sin `truncate`).
   - Select: `w-full sm:w-56 sm:flex-shrink-0` para que ocupe todo el ancho cuando se apila.

2. **Barthel (línea 376-389)**:
   - Mismo tratamiento: contenedor `flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3`.
   - Label con `title` y wrap natural.
   - Select `w-full sm:w-64 sm:flex-shrink-0` (un poco más ancho porque las opciones de Barthel son más largas).

Sin cambios de lógica ni de datos, solo presentación.
