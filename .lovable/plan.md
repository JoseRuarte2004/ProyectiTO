Voy a hacer un cambio mínimo en `src/pages/SessionForm.tsx`.

Plan:
1. Mantener/verificar `SelectContent position="popper"` dentro de `danielsRows.map(...)`.
   - Ya está presente en la sección `Daniels — Músculos evaluados`, así que no requiere cambio ahí salvo confirmar que quede igual.

2. Mantener/verificar que `onValueChange` actualice la fila correcta.
   - La lógica actual también está bien: usa `idx` y actualiza `grade` solo para esa fila.

3. Corregir el motivo probable por el cual “no se guarda como debería”.
   - Hoy `muscle_strength_daniels` se arma antes del cálculo de `hasMeasurements`, pero `hasMeasurements` no incluye `danielsJson`.
   - Resultado: si cargás solo Daniels y no otros campos de fuerza/mediciones, no se inserta la evaluación analítica, entonces Daniels no queda guardado.
   - Voy a agregar `danielsJson` al array que calcula `hasMeasurements`, sin cambiar el resto del flujo.

Cambio técnico esperado:
```ts
const hasMeasurements =
  show_measurements &&
  [
    ...,
    msVal,
    danielsJson,
    ...
  ].some((v) => v !== "" && v !== null && v !== undefined && v !== false);
```

No voy a cambiar la estructura de la tabla, ni otros campos, ni el diseño del formulario.