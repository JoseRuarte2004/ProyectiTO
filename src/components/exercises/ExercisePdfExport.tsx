import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const categoryMap: Record<string, string> = {
  general: "General",
  occupation: "Ocupación",
  sport: "Deporte",
  joint_protection: "Protección articular",
  skin_care: "Cuidado de piel",
};

export function exportExercisesPdf(exercises: any[]) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const addPage = () => {
    doc.addPage();
    y = margin;
  };

  const checkSpace = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      addPage();
    }
  };

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Biblioteca de Ejercicios — RehabOT", margin, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy", { locale: es })}`, margin, y);
  y += 4;
  doc.text(`Total: ${exercises.length} ejercicios`, margin, y);
  y += 10;
  doc.setDrawColor(200);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  exercises.forEach((ex, idx) => {
    checkSpace(40);

    // Name
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${idx + 1}. ${ex.name}`, margin, y);
    y += 6;

    // Categories
    const cats: string[] = ex.exercise_categories?.map((c: any) => c.category) || [];
    if (cats.length > 0) {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Categorías: ${cats.map((c) => categoryMap[c] || c).join(", ")}`, margin, y);
      y += 5;
    }

    // Body region
    if (ex.body_region) {
      doc.setFontSize(9);
      doc.text(`Región corporal: ${ex.body_region}`, margin, y);
      y += 5;
    }

    // Execution params
    const params: string[] = [];
    if (ex.default_repetitions) params.push(`${ex.default_repetitions} rep/serie`);
    if (ex.default_sets) params.push(`${ex.default_sets} series`);
    if (ex.default_duration) params.push(`Pausa: ${ex.default_duration}`);
    if (ex.default_frequency) params.push(`Frecuencia: ${ex.default_frequency}`);
    if (params.length > 0) {
      doc.setFontSize(9);
      doc.text(params.join("  ·  "), margin, y);
      y += 5;
    }

    // Description
    if (ex.description) {
      checkSpace(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Descripción:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const descLines = doc.splitTextToSize(ex.description, contentW);
      descLines.forEach((line: string) => {
        checkSpace(5);
        doc.text(line, margin, y);
        y += 4;
      });
      y += 2;
    }

    // Instructions
    if (ex.instructions) {
      checkSpace(15);
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("Instrucciones:", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      const instLines = doc.splitTextToSize(ex.instructions, contentW);
      instLines.forEach((line: string) => {
        checkSpace(5);
        doc.text(line, margin, y);
        y += 4;
      });
      y += 2;
    }

    // Video URL
    if (ex.video_url) {
      checkSpace(8);
      doc.setFontSize(9);
      doc.text(`Video: ${ex.video_url}`, margin, y);
      y += 5;
    }

    // Separator
    y += 3;
    checkSpace(5);
    doc.setDrawColor(220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;
  });

  const dateStr = format(new Date(), "yyyy-MM-dd");
  doc.save(`biblioteca-ejercicios-${dateStr}.pdf`);
}
