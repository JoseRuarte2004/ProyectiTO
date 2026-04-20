

## Fix dropdown clipping in Obra social autocomplete

**Problem**: In the screenshot, the "OSDE" suggestion appears cut off / barely visible below the input. The cause is that the parent `SectionCard` wrapper uses `overflow-hidden` (line 40 of `NewPatientForm.tsx`), which clips the absolutely-positioned dropdown panel whenever it extends past the card's boundary. The same issue affects the CIE-10 autocomplete (`Cie10Autocomplete`) when the diagnosis field sits near the bottom of its card.

## Change (single file: `src/components/patients/NewPatientForm.tsx`)

Switch the dropdown rendering strategy from "absolutely-positioned div inside the card" to a portal-based floating panel anchored to the input, so it can escape the card's `overflow-hidden`.

The simplest, no-new-package fix: use the existing shadcn `Popover` primitive (already in the project, used elsewhere) which uses Radix Portal under the hood, OR render the dropdown via `createPortal` to `document.body` and position it using `getBoundingClientRect()` of the input.

**Approach chosen**: keep behaviour identical (free typing in the `Input`, dropdown shows results, click-outside / Escape close, fallback free text), but render the results panel via `ReactDOM.createPortal` to `document.body` with fixed positioning anchored to the input's bounding rect. This avoids touching `SectionCard` (`overflow-hidden` is intentional for the rounded teal-border accent) and avoids restructuring with `Popover` which would change focus/typing behaviour.

Steps applied to BOTH `ObrasSocialesAutocomplete` (lines 173-243) and `Cie10Autocomplete` (lines ~100-171):

1. Import `createPortal` from `react-dom`.
2. Add a `rect` state `{ top, left, width }` updated:
   - when `open` becomes true,
   - on window `resize` and `scroll` (capture phase) while open.
3. Replace the inline `<div className="absolute z-50 mt-1 w-full ...">` with a portal:
   ```tsx
   {open && results.length > 0 && createPortal(
     <div
       style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 60 }}
       className="max-h-64 overflow-auto rounded-md border bg-popover shadow-md"
     >
       {/* same buttons as before */}
     </div>,
     document.body
   )}
   ```
4. Click-outside handler: extend the existing `mousedown` listener to also ignore clicks inside the portal panel (track with a second `panelRef`).
5. No visual changes — same `bg-popover`, `shadow-md`, `text-sm`, hover styles. Same Spanish labels. Same Supabase query.

## Hard constraints respected

- Only `src/components/patients/NewPatientForm.tsx` is modified.
- No new packages (`react-dom` already present).
- No Supabase column or schema changes.
- No state variable, field name, or save-logic changes.
- All labels stay in Spanish.

