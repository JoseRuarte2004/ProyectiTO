
# Aplicar diseño editorial al formulario de admisión y nuevo paciente

El perfil del paciente ya tiene el lenguaje editorial nuevo, pero los formularios de **admisión / nueva sesión** (`SessionForm.tsx`) y **nuevo paciente** (`NewPatientForm.tsx`) siguen con el estilo viejo: borde teal grueso a la izquierda de cada sección, iconos teal, sombras, focus rings teal, labels con clases inline, etc. Hay que llevarlos al mismo idioma visual.

---

## 1. `SectionCard` — quitar el "header con tira teal"

Hoy:
```
border-l-4 border-l-teal-500 + icon teal-600 + shadow-sm + border-gray-200 + bg-white
```
Cambiar a un header limpio, sin tira de color y con tipografía editorial:
- `Card` sin sombra, `border-border`, `rounded-xl`, fondo `bg-card`
- Header: solo padding (`px-6 py-5`), `border-b border-border`, sin `border-l`
- Título: `font-serif text-[17px] font-semibold tracking-tight text-foreground` (en vez de `text-base font-semibold text-gray-800`)
- Icono: `text-muted-foreground` (no teal), tamaño `h-4 w-4`, opcional — más discreto
- Switch del toggle: el label "Incluido / Incluir" baja a `text-[11px] uppercase tracking-wide text-muted-foreground`

## 2. `SubSection` — divisores y títulos más sutiles

- Divisor: `border-t border-border` (en vez de `border-gray-100`)
- Título: `text-[13px] font-semibold text-foreground/70 tracking-tight` (en vez de `text-sm text-gray-600`)
- Texto del switch igual que en SectionCard: `text-[11px] uppercase tracking-wide text-muted-foreground`

## 3. `FieldLabel` — usar el sistema existente

En ambos archivos hoy es:
```tsx
<Label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
```
Reemplazar por la utility ya creada en `index.css`:
```tsx
<Label className="field-label mb-1.5 block">
```
(El asterisco rojo `required` se mantiene en `NewPatientForm`.)

## 4. Inputs y textareas — quitar el teal del focus

Hoy:
```
border-gray-200 ... focus-visible:ring-teal-500
```
Cambiar a:
```
border-input rounded-lg min-h-[44px] focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-transparent focus-visible:ring-offset-0
```
(El radio de 8px y el ring sutil ya están definidos globalmente en `index.css` para inputs, así que en muchos casos basta con quitar las clases hardcodeadas y dejar el default.)

## 5. Botones de acción del header (volver, guardar)

- Botón "Volver" / `ArrowLeft`: `variant="ghost" size="sm"` con `text-muted-foreground`
- Botón "Guardar" principal: `variant="default" size="default"` (ya usa el primary teal del sistema, pero sin clases extra)
- Quitar cualquier `bg-teal-XXX` o `text-teal-XXX` que aparezca inline en estos archivos

## 6. Tabs internas (si existen en SessionForm/NewPatientForm)

Igualar al estilo del PatientProfile:
- `TabsList`: `bg-transparent border-b border-border h-auto p-0 gap-6`
- `TabsTrigger`: `text-[13px] tracking-wide text-muted-foreground data-[state=active]:text-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-0 py-3 bg-transparent shadow-none`

## 7. Encabezado de página (título del formulario)

- Título: `font-serif text-2xl font-semibold tracking-tight text-foreground` (igual que "Mis Pacientes")
- Subtítulo / paciente al que pertenece la sesión: `text-sm text-muted-foreground mt-1`
- Eliminar cualquier badge teal alrededor del nombre del paciente y dejarlo como texto plano con jerarquía

## 8. Limpieza de colores hardcodeados

Búsqueda y reemplazo en `SessionForm.tsx` y `NewPatientForm.tsx`:
- `teal-50/100/200/500/600/700/800` → tokens del sistema (`primary`, `primary/10`, `border`, `muted`, `muted-foreground`)
- `text-gray-500/600/800`, `border-gray-100/200`, `bg-gray-50` → tokens equivalentes (`text-muted-foreground`, `text-foreground`, `border-border`, `bg-muted/40`)
- `shadow-sm` en cards → eliminar (ya está neutralizado globalmente, pero conviene quitarlo del markup)

## 9. Constantes a actualizar

En cada archivo se redefinen al inicio:
```ts
const inputClass = "rounded-lg min-h-[44px]";
const textareaClass = "rounded-lg";
const subDivider = "pt-5 mt-5 border-t border-border";
const subLabel = "text-[13px] font-semibold text-foreground/70 mb-3 tracking-tight";
```

---

## Archivos a editar

| Archivo | Cambios |
|---------|---------|
| `src/pages/SessionForm.tsx` | `SectionCard`, `SubSection`, `FieldLabel`, `inputClass`, `textareaClass`, header de página, eliminación masiva de `teal-*` y `gray-*` hardcodeados, tabs internas |
| `src/components/patients/NewPatientForm.tsx` | Mismos componentes locales (`SectionCard`, `SubSection`, `FieldLabel`, `inputClass`, `textareaClass`, `subDivider`, `subLabel`), header, autocompletes de CIE-10 y Obras Sociales (popover usa `border` y `bg-popover` ya OK), eliminación de teal/gray |

No se tocan `index.css`, `tailwind.config.ts` ni el `PatientProfile`: ya tienen el lenguaje correcto, solo hay que aplicarlo aquí.

---

## Resultado esperado

El formulario de admisión va a verse como una continuación del perfil del paciente: cards blancas limpias, sin tiras teal a la izquierda, títulos en Playfair Display, labels uppercase finitas (`.field-label`), inputs sin acento de color, y la misma paleta cálida del resto de la app.
