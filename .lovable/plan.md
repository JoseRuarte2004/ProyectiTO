# Plan — 6 cambios en evaluación analítica

Aplicar todos los puntos en los 4 archivos:
- `src/pages/SessionForm.tsx`
- `src/components/evaluations/AnalyticalEvalForm.tsx`
- `src/components/patients/NewPatientForm.tsx`
- `src/pages/PatientProfile.tsx` (solo display)

DB ya migrada: `edema_circummetry`, `dynamometer_msd`, `dynamometer_msi` son `jsonb`.

---

## 1. Circometría de edema → 4 controles + JSONB

**Formularios** (los 3): eliminar el textarea/inputs actuales de circometría. Reemplazar por:
- Input texto `circ_reference` — placeholder "ej: articulación MCF, tercio distal antebrazo"
- RadioGroup horizontal `circ_side` — opciones "D" / "I"
- Input number step 0.1 `circ_value_cm`
- Switch (o Checkbox) `circ_mano_global`

Guardar:
```
edema_circummetry = (reference || value_cm)
  ? { reference, side, value_cm: Number(value_cm), mano_global }
  : null
```

Lectura: si `ae.edema_circummetry` es objeto → poblar los 4 estados. Si es string (legacy) → dejar vacíos.

En `SessionForm` esto reemplaza los 4 inputs `circ_wrist_msd/msi/global_msd/msi` y la concatenación a `edemaCirc`.
En `AnalyticalEvalForm` reemplaza el `Textarea` línea 153.
En `NewPatientForm` reemplaza el bloque "Circometría" línea 1421.

**PatientProfile** (línea 1134): cambiar `<FieldLine label="Circometría" value={e.edema_circummetry} />` por un render que detecte si es objeto:
- Objeto → `"{reference} ({side}) — {value_cm} cm{mano_global ? ' · Mano global' : ''}"`
- String → mostrarlo tal cual
- Si no hay `reference` ni `value_cm` → no renderizar

---

## 2. Goniometría — selector MSD/MSI

**Formularios**: agregar `<Tabs value={gonio_side}>` con triggers `MSD` / `MSI` al inicio de la subsección Movilidad, antes del selector de parte corporal. Estructura de estado por lado:
```
{ MSD: { shoulder:{}, elbow:{}, ... }, MSI: { ... } }
```
Análogo para POST.

Persistencia `goniometry`:
```
{ MSD: { pre: [...], post: [...] }, MSI: { pre: [...], post: [...] } }
```
Construir con el helper existente por lado (`buildAllGonioJsonArray(allVals[side])`).

`arom`/`prom` (texto): concatenar prefijo `[MSD]` y `[MSI]` por lado.

Lectura compatible:
- `goniometry.MSD || goniometry.MSI` → cargar nuevo formato
- `goniometry.pre || goniometry.post` (legacy) → cargar bajo MSD, MSI vacío

En `AnalyticalEvalForm`: el estado `gonio` plano se reestructura a `{ MSD: {...}, MSI: {...} }` con tabs.

**PatientProfile** (línea 959 en `goniometry` parser): detectar `g.MSD || g.MSI` y renderizar dos subsecciones tituladas "MSD" / "MSI" reutilizando el render por parte. Si viene legacy → render bajo "MSD".

---

## 3. Dinamometría — 3 mediciones + promedio

**Formularios**: por cada lado, grid de 3 inputs number (Medición 1/2/3) y debajo `<p>Promedio: X.X kgf</p>` calculado en vivo (suma valores no vacíos / cantidad, 1 decimal).

Eliminar:
- "¿Qué evaluaste?" y su Textarea (`strength_notes` en SessionForm; `dynamometerNotes` y su `<Textarea>` en NewPatientForm; `muscle_strength` Textarea en AnalyticalEvalForm si funciona como ese campo — aquí no se elimina porque es el campo "Fuerza general", no "qué evaluaste")
- Cualquier subtítulo/placeholder con "en 5 posiciones" (NewPatientForm líneas 1478 y 1486; verificar SessionForm)

Persistencia (jsonb):
```
dynamometer_msd = vals.some(v=>v!=="") ? { values:[a,b,c], average } : null
```
Igual para `_msi`. `average` redondeado a 1 decimal.

Lectura compatible: si viene `number` (legacy) → `[String(n),"",""]`. Si es objeto → cargar `values`.

**PatientProfile** (líneas 1154–1162):
- Eliminar render de `dynamometer_notes` (línea 1162) — el campo `dynamometer_notes` desaparece.
- Render dinamómetro: si es objeto con `values`/`average` → `"MSD: 18 / 20 / 19 kgf → Promedio: 19.0 kgf"`. Si es número → display anterior `"MSD 18kg"`.

---

## 4. Reordenar secciones colapsables

Orden final en los 3 formularios:
1. Dolor → 2. Edema → 3. Movilidad → 4. Fuerza → 5. Sensibilidad → 6. Pruebas específicas → 7. Cicatriz → (Otros al final si existe)

Sólo mover el bloque JSX de Cicatriz para que quede después de Pruebas específicas (en SessionForm está antes; mismo ajuste donde aplique).

---

## 5. Cicatriz — limpiar UI

En los 3 formularios, dentro de la subsección Cicatriz:
- Eliminar `<h4>Planilla</h4>` y cualquier label/título "Cicatriz" suelto duplicado.
- Eliminar campos: Vascularización, Pigmentación, Flexibilidad, Relieve (UI + entradas en `scarPlanillaEntries` del payload). Estados pueden quedar como variables muertas o se borran.

Dejar en este orden:
1. Localización (Input)
2. Longitud cm (Input number)
3. Sensibilidad (Select)
4. Temperatura (Select)
5. Observaciones (Textarea)
6. Escala Vancouver VSS (sin cambios, total automático)

**PatientProfile**: en el render de `scar_evaluation` (líneas 892–900, 1066–1085) eliminar las claves `vascularizacion`, `pigmentacion`, `flexibilidad`, `relieve` del `LABELS`/`fieldOrder` para que no se muestren aunque vengan en datos viejos. Mantener Vancouver/VSS.

---

## 6. Sensibilidad — quitar Tabla Kendall

En los 3 formularios: eliminar el bloque `<Collapsible>` "Tabla Kendall" completo (SessionForm 1546–1572; NewPatientForm 1572–1597; en AnalyticalEvalForm eliminar los 3 Textareas de `muscle_strength_median/cubital/radial` línea 214–216).

Mantener intacto: Epicrítica, Protopática, Observaciones.

Al guardar, forzar:
```
muscle_strength_median: null
muscle_strength_cubital: null
muscle_strength_radial: null
```
en los payloads de los 3 formularios (no leer ni cargar al editar).

**PatientProfile**:
- En el render de Sensibilidad (líneas 1393–1406) eliminar la subsección que muestra `muscle_strength_median/cubital/radial` (la función `renderNerve` allí).
- En la sección Fuerza (líneas 1165–1199) eliminar el bloque `hasKendall` y su tarjeta "Kendall / Daniels" basada en muscle_strength_*. Mantener la tabla Daniels real (`muscle_strength_daniels` jsonb), que es separada.
- Quitar `hasKendall` del cómputo `hasStrength` (línea 1032–1033).

---

## Detalles técnicos

- Constantes a remover si quedan huérfanas: `MEDIAN_MUSCLES`, `CUBITAL_MUSCLES`, `RADIAL_MUSCLES` y `DanielsTable` (en NewPatientForm y SessionForm) si sólo se usaban para la Tabla Kendall.
- Lectura legacy preservada en todos los puntos para no romper datos existentes.
- Sin cambios de DB, sin tocar otros componentes (ej. PDF exports, plans).
- El campo "Fuerza general" (`muscle_strength` Textarea) en `AnalyticalEvalForm` no se toca; el cliente sólo pide eliminar el campo "¿Qué evaluaste?", que en `SessionForm` corresponde a `strength_notes` y en `NewPatientForm` a `dynamometerNotes`.
