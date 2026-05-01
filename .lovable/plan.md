
# Rediseño visual — Clínica editorial

Objetivo: transformar la estética de "plantilla IA" a una app médica premium con identidad propia, más respiración entre elementos y jerarquía visual clara.

---

## 1. Paleta y tokens de diseño (`index.css`, `tailwind.config.ts`)

**Paleta refinada** — mantener la base cálida pero con mayor sofisticación:
- Background: `#FAF9F7` (crema más sutil)
- Card: `#FFFFFF`
- Primario: cambiar de teal genérico a un verde-azulado más oscuro y sobrio: `hsl(192, 35%, 30%)` — más institucional, menos "startup"
- Texto principal: `hsl(220, 15%, 18%)` — casi negro azulado en vez de marrón
- Muted: ajustar para mejor contraste
- Bordes: más sutiles, `hsl(30, 10%, 90%)`

**Tipografía editorial**:
- Reemplazar Plus Jakarta Sans por **Inter** para body (más profesional, mejor legibilidad a tamaños chicos)
- Mantener Playfair Display para títulos principales (buen contraste editorial)
- Quitar Lora — redundante con Playfair. Usar Inter medium para donde se usaba `.font-accent`

**Nuevos tokens CSS**:
- `--spacing-section: 2.5rem` (40px entre secciones, actualmente ~24px)
- `--spacing-card-padding: 1.5rem` (24px dentro de cards)
- Sutil `border-radius: 12px` en cards (en vez de 10px)
- Inputs con `border-radius: 8px`

## 2. Sidebar de navegación (`AppSidebar.tsx`)

- Fondo: blanco puro, borde derecho sutil
- Logo: tipografía más limpia, sin el circulito con letra — usar solo texto "RehabOT" con un separador fino y "Clínica · TO" debajo
- Items de navegación: más padding vertical (py-3), iconos más finos (strokeWidth 1.5), indicador activo como barra izquierda sólida de 3px
- Footer: avatar y nombre con más espacio, estilo más limpio

## 3. Dashboard (`Dashboard.tsx`)

- Saludo: tipografía Playfair Display a 2.25rem, peso normal, nombre en bold — más editorial
- Subtítulo de turnos: más separado del título (mt-3)
- Cards de agenda: padding 28px, más espacio entre items del listado (py-5 en vez de py-4)
- Panel lateral: gap de 28px entre cards
- Quote card: bordes más sutiles, padding generoso, tipografía itálica más grande
- Botones de acción: más separados del header

## 4. Lista de pacientes (`Patients.tsx`)

- Título: Playfair Display, tamaño mayor
- Cards de paciente: padding 24px (en vez de 20px), gap entre cards 20px
- Avatar: ligeramente más grande (44px), con borde más sutil
- Nombre del paciente: un poco más grande, usar font-medium en vez de font-semibold
- Más espacio entre la barra de búsqueda/filtros y la grilla

## 5. Perfil del paciente (`PatientProfile.tsx`)

- **Panel izquierdo**: padding 28px, gap entre secciones 28px. Avatar de 88px. Nombre con Playfair Display. Campos con más espacio vertical (space-y-4 en vez de space-y-3)
- **Panel derecho**: padding 28px. Tab content con más espacio arriba (mt-6)
- **Cards de sesión**: padding 24px, border-radius 12px, gap entre cards 16px
- **Ficha clínica**: grid de campos con gap-y-5 en vez de gap-y-4

## 6. Login (`Login.tsx`)

- Card más amplia (max-w-sm -> max-w-md queda bien), más padding interno
- Logo: solo texto "RehabOT" con Playfair Display, sin el cuadradito con letra
- Inputs con más height (h-12 en vez de h-10)
- Botón de login con más height y border-radius suave

## 7. Componentes globales

**Botones** (`button.tsx`):
- Border-radius: 8px
- Tamaño default: h-11 (en vez de h-10), px-5
- Primary: el nuevo color más oscuro
- Outline: borde más sutil

**Cards** (`card.tsx` y CSS global):
- Border-radius: 12px
- Padding default más generoso
- Borde 1px solid con color más sutil

**Inputs** (`input.tsx` y CSS):
- Height: 44px
- Border-radius: 8px
- Padding interno más generoso

## Resumen de archivos a editar

| Archivo | Cambio |
|---------|--------|
| `src/index.css` | Paleta, tipografía, espaciado, clases utilitarias |
| `tailwind.config.ts` | Fuentes, colores |
| `src/components/AppSidebar.tsx` | Layout sidebar editorial |
| `src/components/ui/button.tsx` | Tamaños y radii |
| `src/components/ui/card.tsx` | Border-radius |
| `src/pages/Login.tsx` | Diseño editorial |
| `src/pages/Dashboard.tsx` | Espaciado y tipografía |
| `src/pages/Patients.tsx` | Espaciado cards y tipografía |
| `src/pages/PatientProfile.tsx` | Espaciado paneles |

No se modifica ninguna funcionalidad ni lógica de datos.
