
# Rediseño visual: estilo profesional tipo "Maia"

Analicé tu prototipo en detalle. No voy a cambiar datos ni campos, solo el estilo visual. Estos son los cambios clave que identifico:

## 1. Tipografía y jerarquía de texto

El prototipo usa una combinación tipográfica más refinada:
- **Headings grandes** con serif/itálica para el nombre del profesional ("Buenos días, *José*") - da calidez y profesionalismo
- **Labels de datos** en MAYÚSCULAS, letra muy pequeña, color dorado/ocre apagado (tipo `#8B7355`) con tracking amplio
- **Valores de datos** en negro/gris oscuro, peso normal, tamaño más grande que el label
- La app actual usa Plus Jakarta Sans para todo, lo cual es correcto, pero falta la jerarquía label/valor del prototipo

**Cambios:**
- Agregar una fuente serif (Playfair Display o similar) solo para acentos como el saludo del dashboard
- Crear clases utilitarias para los "field labels" en mayúscula dorada
- Ajustar el color de labels a un tono ocre/dorado (`~#9A8C72`)

## 2. Paleta de colores

El prototipo tiene una paleta más cálida y sofisticada:
- **Fondo general**: crema muy suave (`~#FAF8F5` en lugar del gris azulado actual)
- **Cards**: blanco puro con bordes muy sutiles
- **Sidebar**: fondo blanco, texto activo en teal/azul profundo, iconos finos
- **Acentos**: dorado/ocre para labels, teal oscuro para acciones principales
- **Badges de status**: bordes redondeados, fondo neutro, outline fino

**Cambios en CSS variables:**
- `--background` de gris azulado a crema suave
- Agregar variable `--label` para el color ocre de los labels
- Sidebar más limpia con separadores sutiles

## 3. Sidebar

El prototipo muestra:
- Logo "Maia" con ícono circular + subtítulo "CLÍNICA · TO" en tracking amplio
- Sección "TRABAJO" como group label en mayúsculas pequeñas
- Ítems con tipografía limpia, el activo usa color teal + dot indicator
- Footer con avatar del profesional + rol

**Cambios en `AppSidebar.tsx`:**
- Renombrar a "RehabOT" con subtítulo "CLÍNICA · TO" (o lo que prefieras)
- Agregar group label "TRABAJO" arriba de los nav items
- Active state con punto indicador (dot) en lugar de fondo completo

## 4. Dashboard

El prototipo muestra un diseño mucho más editorial:
- Saludo grande con fecha arriba en mayúsculas tracking amplio
- Resumen en texto natural ("Tenés **7 turnos** hoy · próximo a las **10:30**...")
- Agenda del día como lista limpia (hora en bold monospace, nombre, edad, tipo)
- Panel lateral "Pendientes" y "Esta semana" con contadores
- Cita motivacional al final

**Cambios en `Dashboard.tsx`:**
- Reemplazar los 4 stat cards por el saludo editorial + resumen en texto
- Agenda del día como componente principal (tabla limpia sin cards)
- Panel lateral con pendientes y métricas semanales
- Quitar los íconos grandes de las stat cards

## 5. Perfil del paciente

El prototipo muestra:
- Layout de 2 columnas: sidebar izquierda con foto/datos + contenido principal a la derecha
- Tabs: Sesiones | Ficha clínica | Evaluaciones | Documentos
- **Sidebar del paciente**: avatar grande con iniciales, nombre en serif, edad + DNI, badge de episodio, datos en formato label/valor vertical
- **Timeline de sesiones**: con línea vertical, íconos de tipo, badges de áreas trabajadas, score de dolor
- **Ficha clínica**: secciones con headers (Episodio activo, Datos clínicos) y datos en grid 2 columnas con labels en mayúscula dorada

**Cambios en `PatientProfile.tsx`:**
- Reestructurar layout a 2 columnas (sidebar fija + contenido scrollable)
- Mejorar la presentación de datos clínicos con el patrón label-mayúscula/valor
- Timeline visual para sesiones
- Tabs más limpios (underline style en lugar de pills)

## 6. Componentes globales

- **Tabs**: cambiar de pills/contenedor a underline style (línea bajo el tab activo)
- **Buttons primarios**: teal sólido con bordes redondeados, hover más oscuro
- **Cards**: sombra mínima o ninguna, bordes muy sutiles, padding generoso
- **Badges**: más refinados, bordes redondeados pill, tipografía pequeña

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/index.css` | Nueva paleta, variables de color, clase de labels, fuente serif |
| `tailwind.config.ts` | Font serif, color label |
| `src/components/AppSidebar.tsx` | Rediseño visual completo |
| `src/pages/Dashboard.tsx` | Layout editorial con agenda y paneles |
| `src/pages/PatientProfile.tsx` | Layout 2 columnas, timeline, labels |
| `src/pages/Patients.tsx` | Ajustes menores de estilo |
| `index.html` | Agregar Google Font serif |

No se agregan dependencias nuevas ni columnas de base de datos. Los datos y la lógica permanecen intactos.
