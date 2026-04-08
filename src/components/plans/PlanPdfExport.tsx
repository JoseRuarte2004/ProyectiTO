import jsPDF from "jspdf";
import { format, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

const statusMap: Record<string, string> = {
  active: "Activo",
  completed: "Completado",
  archived: "Archivado",
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function exportPlanPdf(plan: any, patient: any) {
  // Fetch exercises
  const { data: exercises } = await supabase
    .from("treatment_plan_exercises")
    .select("*, exercise_library(name, description, body_region, instructions, default_repetitions, default_sets, default_frequency, default_duration)")
    .eq("treatment_plan_id", plan.id)
    .order("order_index");

  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;
  let pageNum = 1;

  const addFooter = () => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
    doc.text(`Página ${pageNum}`, pageW / 2, pageH - 8, { align: "center" });
    doc.setTextColor(0);
  };

  const addPage = () => {
    addFooter();
    doc.addPage();
    pageNum++;
    y = margin;
  };

  const checkSpace = (needed: number) => {
    if (y + needed > pageH - 20) {
      addPage();
    }
  };

  // ── HEADER ──
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("RehabOT", margin, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(format(new Date(), "dd/MM/yyyy", { locale: es }), pageW - margin, y, { align: "right" });
  y += 4;
  doc.setDrawColor(180);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── PATIENT ──
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(`${patient.last_name}, ${patient.first_name}`, margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const patientDetails: string[] = [];
  patientDetails.push(`DNI: ${patient.dni}`);
  if (patient.birth_date) {
    const age = differenceInYears(new Date(), new Date(patient.birth_date));
    patientDetails.push(`${age} años`);
  }
  if (patient.insurance) patientDetails.push(`OS: ${patient.insurance}`);
  patientDetails.push(`Admisión: ${format(new Date(patient.admission_date), "dd/MM/yyyy")}`);
  doc.text(patientDetails.join("  ·  "), margin, y);
  y += 10;

  // ── PLAN ──
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(plan.title, margin, y);
  y += 8;

  const fields: [string, string | null | undefined][] = [
    ["Objetivo", plan.objective],
    ["Indicaciones generales", plan.indications],
    ["Cuidado de piel", plan.skin_care],
    ["Pautas de protección articular", plan.joint_protection_guidelines],
    ["Recomendaciones para el hogar", plan.home_item_recommendations],
    ["Estado", statusMap[plan.status] || plan.status],
    ["Fecha de inicio", plan.start_date ? format(new Date(plan.start_date), "dd/MM/yyyy") : null],
    ["Fecha de fin", plan.end_date ? format(new Date(plan.end_date), "dd/MM/yyyy") : null],
    ["Notas", plan.notes],
  ];

  for (const [label, value] of fields) {
    if (!value) continue;
    checkSpace(12);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value), contentW - 2);
    const labelWidth = doc.getTextWidth(`${label}: `);
    if (lines.length === 1 && labelWidth + doc.getTextWidth(lines[0]) < contentW) {
      doc.text(lines[0], margin + labelWidth, y);
      y += 5;
    } else {
      y += 4;
      lines.forEach((line: string) => {
        checkSpace(5);
        doc.text(line, margin + 2, y);
        y += 4;
      });
      y += 1;
    }
  }

  // ── EXERCISES ──
  const exList = exercises || [];
  if (exList.length > 0) {
    y += 4;
    checkSpace(15);
    doc.setDrawColor(180);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ejercicios asignados", margin, y);
    y += 8;

    exList.forEach((ex: any, idx: number) => {
      checkSpace(25);
      const lib = ex.exercise_library;
      const name = ex.custom_name || lib?.name || "Ejercicio";

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`${idx + 1}. ${name}`, margin, y);
      y += 5;

      if (lib?.body_region) {
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text(`Región: ${lib.body_region}`, margin + 2, y);
        y += 4;
      }

      if (lib?.instructions) {
        checkSpace(10);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const instLines = doc.splitTextToSize(lib.instructions, contentW - 4);
        instLines.forEach((line: string) => {
          checkSpace(4);
          doc.text(line, margin + 2, y);
          y += 3.5;
        });
        y += 1;
      }

      // Params
      const params: string[] = [];
      const rep = ex.repetitions ?? lib?.default_repetitions;
      const sets = ex.sets ?? lib?.default_sets;
      const freq = ex.frequency || lib?.default_frequency;
      const dur = ex.duration || lib?.default_duration;
      if (rep) params.push(`${rep} rep`);
      if (sets) params.push(`${sets} series`);
      if (freq) params.push(`Frec: ${freq}`);
      if (dur) params.push(`Dur: ${dur}`);
      if (params.length > 0) {
        doc.setFontSize(8);
        doc.text(params.join("  ·  "), margin + 2, y);
        y += 4;
      }

      if (ex.notes) {
        checkSpace(8);
        doc.setFontSize(8);
        doc.setFont("helvetica", "italic");
        const noteLines = doc.splitTextToSize(`Nota: ${ex.notes}`, contentW - 4);
        noteLines.forEach((line: string) => {
          checkSpace(4);
          doc.text(line, margin + 2, y);
          y += 3.5;
        });
        doc.setFont("helvetica", "normal");
        y += 1;
      }

      // separator
      y += 2;
      checkSpace(4);
      doc.setDrawColor(220);
      doc.line(margin + 2, y, pageW - margin - 2, y);
      y += 5;
    });
  }

  // Final footer
  addFooter();

  const fileName = `plan-${slugify(patient.last_name)}-${slugify(plan.title)}.pdf`;
  doc.save(fileName);
}
