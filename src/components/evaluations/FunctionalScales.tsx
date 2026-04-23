import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

// ── QuickDASH definition ──
const QD_SCALE_1 = ["Ninguna dificultad", "Dificultad leve", "Dificultad moderada", "Mucha dificultad", "Incapaz de realizarla"];
const QD_SCALE_7 = ["Absolutamente nada", "Un poco", "Moderadamente", "Bastante", "Muchísimo"];
const QD_SCALE_8 = ["Absolutamente nada", "Un poco", "Moderadamente", "Bastante limitado/a", "Incapaz de realizar"];
const QD_SCALE_PAIN = ["Ninguna", "Leve", "Moderada", "Intensa", "Muy intensa"];
const QD_SCALE_11 = ["Ninguna dificultad", "Dificultad leve", "Dificultad moderada", "Mucha dificultad", "Incapaz de realizar"];

export const QUICKDASH_QUESTIONS: Array<{ q: string; scale: string[] }> = [
  { q: "Abrir un frasco nuevo o con tapa muy apretada", scale: QD_SCALE_1 },
  { q: "Realizar tareas pesadas de la casa (ej. lavar el piso, paredes)", scale: QD_SCALE_1 },
  { q: "Llevar una bolsa del supermercado o un maletín", scale: QD_SCALE_1 },
  { q: "Lavarse la espalda", scale: QD_SCALE_1 },
  { q: "Usar un cuchillo para cortar la comida", scale: QD_SCALE_1 },
  { q: "Actividades recreativas que requieren esfuerzo o impacto para brazo, hombro o mano", scale: QD_SCALE_1 },
  { q: "¿En qué medida ha interferido su problema en sus actividades sociales normales?", scale: QD_SCALE_7 },
  { q: "¿Ha estado limitado/a para realizar su trabajo u otras actividades cotidianas?", scale: QD_SCALE_8 },
  { q: "Dolor en el brazo, hombro o mano", scale: QD_SCALE_PAIN },
  { q: "Sensación de hormigueo (pinchazos) en su brazo, hombro o mano", scale: QD_SCALE_PAIN },
  { q: "¿Cuánta dificultad ha tenido para dormir debido a dolor en brazo, hombro o mano?", scale: QD_SCALE_11 },
];

export function calcQuickDashScore(items: (number | null)[]): number | null {
  const answered = items.filter((v): v is number => v !== null && v !== undefined);
  if (answered.length < items.length) return null;
  const sum = answered.reduce((a, b) => a + b, 0);
  const score = ((sum / 11) - 1) * 25;
  return Math.round(score * 10) / 10;
}

// Partial preview score (only counts answered, but only meaningful if all answered)
export function calcQuickDashPartial(items: (number | null)[]): number | null {
  const answered = items.filter((v): v is number => v !== null && v !== undefined);
  if (answered.length === 0) return null;
  const sum = answered.reduce((a, b) => a + b, 0);
  const score = ((sum / answered.length) - 1) * 25;
  return Math.round(score * 10) / 10;
}

export function emptyQuickDash(): (number | null)[] {
  return Array(11).fill(null);
}

export function QuickDashSection({
  items,
  onChange,
}: {
  items: (number | null)[];
  onChange: (items: (number | null)[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const score = calcQuickDashPartial(items);
  const allAnswered = items.every((v) => v !== null);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-gray-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">QuickDASH</span>
          {score !== null && (
            <Badge className={`${allAnswered ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-gray-100 text-gray-600 border-gray-200"} hover:bg-transparent border`}>
              QuickDASH: {score}/100{!allAnswered && " (parcial)"}
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">Responda cada ítem según su capacidad en la última semana.</p>
        {QUICKDASH_QUESTIONS.map((item, idx) => {
          const value = items[idx];
          return (
            <div key={idx} className="rounded-md border border-gray-100 p-3 bg-gray-50/50">
              <p className="text-sm font-medium text-gray-700 mb-2">
                <span className="text-teal-600 mr-1">{idx + 1}.</span>{item.q}
              </p>
              <RadioGroup
                value={value !== null && value !== undefined ? String(value) : ""}
                onValueChange={(v) => {
                  const next = [...items];
                  next[idx] = parseInt(v);
                  onChange(next);
                }}
                className="grid grid-cols-1 sm:grid-cols-5 gap-2"
              >
                {item.scale.map((label, i) => {
                  const val = i + 1;
                  const id = `qd-${idx}-${val}`;
                  return (
                    <Label
                      key={val}
                      htmlFor={id}
                      className={`flex items-start gap-2 cursor-pointer rounded-md border px-2 py-1.5 text-xs leading-tight transition-colors ${
                        value === val
                          ? "border-teal-500 bg-teal-50 text-teal-800"
                          : "border-gray-200 bg-white hover:border-teal-200"
                      }`}
                    >
                      <RadioGroupItem value={String(val)} id={id} className="mt-0.5" />
                      <span><span className="font-semibold">{val}.</span> {label}</span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── FIM definition ──
export const FIM_MOTOR: Array<{ key: string; label: string }> = [
  { key: "alimentacion", label: "Alimentación" },
  { key: "aseo_personal", label: "Aseo personal" },
  { key: "bano", label: "Baño" },
  { key: "vestido_tren_superior", label: "Vestido tren superior" },
  { key: "vestido_tren_inferior", label: "Vestido tren inferior" },
  { key: "uso_del_bano", label: "Uso del baño" },
  { key: "control_de_intestino", label: "Control de intestino" },
  { key: "control_de_vejiga", label: "Control de vejiga" },
  { key: "transferencia_cama_silla", label: "Transferencia cama-silla" },
  { key: "transferencia_al_bano", label: "Transferencia al baño" },
  { key: "transferencia_ducha_banera", label: "Transferencia ducha-bañera" },
  { key: "marcha_o_silla_de_ruedas", label: "Marcha o silla de ruedas" },
  { key: "escaleras", label: "Escaleras" },
];

export const FIM_COGNITIVE: Array<{ key: string; label: string }> = [
  { key: "comprension", label: "Comprensión" },
  { key: "expresion", label: "Expresión" },
  { key: "interaccion_social", label: "Interacción social" },
  { key: "resolucion_de_problemas", label: "Resolución de problemas" },
  { key: "memoria", label: "Memoria" },
];

export const FIM_ALL = [...FIM_MOTOR, ...FIM_COGNITIVE];

export function emptyFim(): Record<string, number | null> {
  return Object.fromEntries(FIM_ALL.map((i) => [i.key, null]));
}

export function calcFimTotal(items: Record<string, number | null>): number | null {
  const vals = FIM_ALL.map((i) => items[i.key]).filter((v): v is number => v !== null && v !== undefined);
  if (vals.length === 0) return null;
  return vals.reduce((a, b) => a + b, 0);
}

function FimItemRow({
  item,
  value,
  onChange,
}: {
  item: { key: string; label: string };
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-700 flex-1 min-w-0">{item.label}</span>
      <Select
        value={value !== null && value !== undefined ? String(value) : ""}
        onValueChange={(v) => onChange(v ? parseInt(v) : null)}
      >
        <SelectTrigger className="h-8 w-16 text-xs border-gray-200 rounded-md">
          <SelectValue placeholder="—" />
        </SelectTrigger>
        <SelectContent position="popper">
          {[1, 2, 3, 4, 5, 6, 7].map((n) => (
            <SelectItem key={n} value={String(n)}>{n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function FimSection({
  items,
  onChange,
}: {
  items: Record<string, number | null>;
  onChange: (items: Record<string, number | null>) => void;
}) {
  const [open, setOpen] = useState(false);
  const total = calcFimTotal(items);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-gray-200 bg-white">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">FIM — Medida de Independencia Funcional</span>
          {total !== null && (
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-50">
              FIM: {total}/126
            </Badge>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4 space-y-4">
        <p className="text-xs text-muted-foreground">
          Escala 1–7: 1 = Asistencia total · 4 = Asistencia mínima · 6 = Supervisión · 7 = Independencia completa
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">Motor (13 ítems)</p>
            <div>
              {FIM_MOTOR.map((item) => (
                <FimItemRow
                  key={item.key}
                  item={item}
                  value={items[item.key] ?? null}
                  onChange={(v) => onChange({ ...items, [item.key]: v })}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-teal-700 uppercase tracking-wide mb-2">Cognitivo (5 ítems)</p>
            <div>
              {FIM_COGNITIVE.map((item) => (
                <FimItemRow
                  key={item.key}
                  item={item}
                  value={items[item.key] ?? null}
                  onChange={(v) => onChange({ ...items, [item.key]: v })}
                />
              ))}
            </div>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
