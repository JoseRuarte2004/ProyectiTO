## Vista de paciente: usar pantalla completa vertical

**Problema:** En `/patients/:id` aparece una franja vacía debajo porque el contenedor calcula su altura como `calc(100vh - 56px)` reservando espacio para el header móvil — pero en desktop ese header no existe (`lg:hidden`), por lo que sobran 56px.

### Cambio

**`src/pages/PatientProfile.tsx`** (línea 190):

Reemplazar:
```tsx
<div className="flex flex-col -m-4 md:-m-6 lg:-m-8 overflow-hidden" style={{ height: "calc(100vh - 56px)" }}>
```

Por:
```tsx
<div className="flex flex-col -m-4 md:-m-6 lg:-m-8 overflow-hidden h-[calc(100vh-56px)] lg:h-screen">
```

Así en mobile/tablet sigue restando los 56px del header, y en desktop (`lg:`, donde el header está oculto) ocupa toda la altura del viewport.

### No se toca

Resto del layout, sidebar, ni los paddings internos.
