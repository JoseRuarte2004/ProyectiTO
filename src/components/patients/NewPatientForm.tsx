import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export function NewPatientForm({ onSuccess, onCancel }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [insurance, setInsurance] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split("T")[0]);

  // Step 2
  const [injuryDate, setInjuryDate] = useState("");
  const [symptomStart, setSymptomStart] = useState("");
  const [injuryMechanism, setInjuryMechanism] = useState("");
  const [currentTreatment, setCurrentTreatment] = useState("");
  const [weeksPostInjury, setWeeksPostInjury] = useState("");
  const [weeksPostSurgery, setWeeksPostSurgery] = useState("");
  const [studies, setStudies] = useState("");
  const [nextOyt, setNextOyt] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [medicalHistory, setMedicalHistory] = useState("");
  const [pharma, setPharma] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");

  // Step 3
  const [supportNetwork, setSupportNetwork] = useState("");
  const [education, setEducation] = useState("");
  const [job, setJob] = useState("");
  const [leisure, setLeisure] = useState("");
  const [physicalActivity, setPhysicalActivity] = useState("");
  const [sleepRest, setSleepRest] = useState("");
  const [occNotes, setOccNotes] = useState("");

  const handleSave = async () => {
    if (!firstName || !lastName || !dni) {
      toast.error("Completá los campos obligatorios del paso 1.");
      setStep(1);
      return;
    }
    setSaving(true);

    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .insert({
        first_name: firstName,
        last_name: lastName,
        dni,
        birth_date: birthDate || null,
        phone: phone || null,
        address: address || null,
        insurance: insurance || null,
        admission_date: admissionDate,
        professional_id: user!.id,
      })
      .select("id")
      .single();

    if (patErr) {
      toast.error("Error al crear paciente", { description: patErr.message });
      setSaving(false);
      return;
    }

    const pid = patient.id;

    await Promise.all([
      supabase.from("patient_clinical_records").insert({
        patient_id: pid,
        injury_date: injuryDate || null,
        symptom_start_date: symptomStart || null,
        injury_mechanism: injuryMechanism || null,
        current_treatment: currentTreatment || null,
        weeks_post_injury: weeksPostInjury ? parseInt(weeksPostInjury) : null,
        weeks_post_surgery: weeksPostSurgery ? parseInt(weeksPostSurgery) : null,
        studies: studies || null,
        next_oyt_appointment: nextOyt || null,
        doctor_name: doctorName || null,
        medical_history: medicalHistory || null,
        pharmacological_treatment: pharma || null,
        notes: clinicalNotes || null,
      }),
      supabase.from("patient_occupational_profiles").insert({
        patient_id: pid,
        support_network: supportNetwork || null,
        education: education || null,
        job: job || null,
        leisure: leisure || null,
        physical_activity: physicalActivity || null,
        sleep_rest: sleepRest || null,
        notes: occNotes || null,
      }),
    ]);

    toast.success("Paciente creado correctamente");
    setSaving(false);
    onSuccess();
  };

  const stepLabels = ["Datos Personales", "Datos Clínicos", "Perfil Ocupacional"];

  return (
    <div className="space-y-6">
      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {stepLabels.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i + 1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}. {label}
            </button>
            {i < 2 && <div className="w-4 h-px bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nombre *</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Apellido *</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>DNI *</Label>
            <Input value={dni} onChange={(e) => setDni(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Fecha de nacimiento</Label>
            <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Domicilio</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Obra Social</Label>
            <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de admisión</Label>
            <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fecha de lesión</Label>
            <Input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Inicio de síntomas</Label>
            <Input type="date" value={symptomStart} onChange={(e) => setSymptomStart(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Mecanismo de lesión</Label>
            <Input value={injuryMechanism} onChange={(e) => setInjuryMechanism(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tratamiento actual</Label>
            <Input value={currentTreatment} onChange={(e) => setCurrentTreatment(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Semanas post lesión</Label>
            <Input type="number" value={weeksPostInjury} onChange={(e) => setWeeksPostInjury(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Semanas post cirugía</Label>
            <Input type="number" value={weeksPostSurgery} onChange={(e) => setWeeksPostSurgery(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Próximo turno OyT</Label>
            <Input type="date" value={nextOyt} onChange={(e) => setNextOyt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Médico derivante</Label>
            <Input value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Estudios realizados</Label>
            <Textarea value={studies} onChange={(e) => setStudies(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Antecedentes personales</Label>
            <Textarea value={medicalHistory} onChange={(e) => setMedicalHistory(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Tratamiento farmacológico</Label>
            <Textarea value={pharma} onChange={(e) => setPharma(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notas clínicas</Label>
            <Textarea value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} rows={2} />
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Red de apoyo</Label>
            <Textarea value={supportNetwork} onChange={(e) => setSupportNetwork(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2">
            <Label>Nivel educativo</Label>
            <Input value={education} onChange={(e) => setEducation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Trabajo / Ocupación</Label>
            <Input value={job} onChange={(e) => setJob(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Ocio y tiempo libre</Label>
            <Textarea value={leisure} onChange={(e) => setLeisure(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Actividad física</Label>
            <Textarea value={physicalActivity} onChange={(e) => setPhysicalActivity(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Sueño y descanso</Label>
            <Textarea value={sleepRest} onChange={(e) => setSleepRest(e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Observaciones</Label>
            <Textarea value={occNotes} onChange={(e) => setOccNotes(e.target.value)} rows={2} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t border-border">
        <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
          {step === 1 ? "Cancelar" : "Anterior"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => {
            if (step === 1 && (!firstName || !lastName || !dni)) {
              toast.error("Completá nombre, apellido y DNI.");
              return;
            }
            setStep(step + 1);
          }}>
            Siguiente
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar Paciente"}
          </Button>
        )}
      </div>
    </div>
  );
}
