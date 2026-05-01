## Problem

The "Fecha de cirugía" input exists in the new patient form UI (line 1159) but references `surgeryDate` / `setSurgeryDate` which are **never declared as state**. Additionally, `surgery_date` is **missing from the insert payload** to `patient_clinical_records` (lines 784-803). The field renders but the value is silently lost.

## Plan

**File: `src/components/patients/NewPatientForm.tsx`**

1. Add state declaration near the other clinical fields (~line 537):
   ```tsx
   const [surgeryDate, setSurgeryDate] = useState("");
   ```

2. Add `surgery_date` to the `patient_clinical_records` insert payload (~line 789, after `injury_date`):
   ```tsx
   surgery_date: or(surgeryDate),
   ```

No database or RLS changes needed — the column already exists and the existing ALL policy covers inserts.
