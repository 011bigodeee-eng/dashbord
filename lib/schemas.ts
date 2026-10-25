import { z } from "zod";
const text = z.string().trim().min(1, "Campo obrigatório").max(500);
const optional = z.string().max(3000).default("");
const money = z.coerce.number().min(0).max(10000000);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data válida")
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Data inválida",
  );
export const schemas = {
  student: z.object({
    name: text,
    email: z.email().or(z.literal("")).default(""),
    phone: optional,
    goal: text,
    plan: optional,
    status: z.enum(["Ativo", "Inativo"]).default("Ativo"),
    notes: optional,
  }),
  training: z.object({
    name: text,
    studentId: text,
    division: text,
    exercises: z
      .array(
        z.object({
          name: text,
          sets: z.coerce.number().min(1).max(30),
          reps: text,
          load: money,
          rest: z.coerce.number().min(0).max(1800),
          tempo: optional,
          notes: optional,
        }),
      )
      .min(1),
    notes: optional,
  }),
  assessment: z.object({
    studentId: text,
    date,
    weight: z.coerce.number().positive().max(500),
    height: z.coerce.number().positive().max(250),
    waist: money,
    chest: money,
    hip: money,
    fat: z.coerce.number().min(0).max(75),
    nextDate: date,
    notes: optional,
  }),
  appointment: z.object({
    studentId: text,
    date,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    duration: z.coerce.number().min(15).max(240),
    type: text,
    status: z.enum([
      "Confirmado",
      "Pendente",
      "Concluído",
      "Ausente",
      "Cancelado",
    ]),
    notes: optional,
  }),
  payment: z
    .object({
      studentId: text,
      service: text,
      amount: money.positive("Informe um valor maior que zero"),
      dueDate: date,
      paidDate: z.union([date, z.literal("")]).default(""),
      status: z.enum(["Recebido", "Pendente"]),
      method: text,
    })
    .refine((d) => d.status !== "Recebido" || !!d.paidDate, {
      message: "Informe a data de recebimento",
      path: ["paidDate"],
    }),
  service: z.object({
    name: text,
    description: optional,
    price: money,
    frequency: text,
    duration: text,
    status: z.enum(["Ativo", "Inativo"]),
  }),
  note: z.object({
    studentId: text,
    message: text,
    reminder: z.string().default(""),
    type: z.enum(["Anotação", "Contato", "Lembrete"]),
  }),
  workout: z.object({
    studentId: text,
    date,
    trainingId: optional,
    notes: optional,
  }),
  profile: z.object({ name: text, specialty: optional, phone: optional }),
};
export type Kind = keyof typeof schemas;
export type Entry = {
  id: string;
  kind: Kind | "activity" | "trainingHistory";
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};
export const currency = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateLabel = (s: string) =>
  new Date(s.slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR");
