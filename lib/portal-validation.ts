import { z } from "zod";
export const portalDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s,
    "Data inválida",
  );
export const portalTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
export const sharedFields = [
  "weight",
  "height",
  "waist",
  "chest",
  "hip",
  "fat",
  "nextDate",
] as const;
export const workoutState = z.object({
  exerciseIndex: z.number().int().min(0).max(100),
  sets: z
    .array(
      z.object({
        exerciseIndex: z.number().int().min(0).max(100),
        setIndex: z.number().int().min(0).max(29),
        load: z.number().min(0).max(2000),
        reps: z.number().int().min(0).max(1000),
        done: z.boolean(),
      }),
    )
    .max(500),
});
export type WorkoutState = z.infer<typeof workoutState>;
export const athleteAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), trainingId: z.string().min(1) }),
  z.object({
    action: z.enum(["save", "pause", "resume", "finish"]),
    sessionId: z.string().min(1),
    state: workoutState,
    feedback: z.string().max(2000).default(""),
    difficulty: z.number().int().min(1).max(10).optional(),
  }),
  z.object({
    action: z.literal("feedback"),
    sessionId: z.string().min(1),
    feedback: z.string().trim().min(1).max(2000),
    difficulty: z.number().int().min(1).max(10),
  }),
  z.object({
    action: z.literal("reschedule"),
    appointmentId: z.string().min(1),
    date: portalDate,
    time: portalTime,
    reason: z.string().trim().min(3).max(1000),
  }),
  z.object({ action: z.literal("read"), messageId: z.string().min(1) }),
]);
export const studioAction = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("invite"),
    studentId: z.string().min(1),
    email: z.email(),
  }),
  z.object({
    action: z.literal("access"),
    accessId: z.string().min(1),
    active: z.boolean(),
  }),
  z.object({
    action: z.literal("publish"),
    assessmentId: z.string().min(1),
    fields: z.array(z.enum(sharedFields)),
  }),
  z.object({
    action: z.literal("message"),
    studentId: z.string().min(1),
    title: z.string().trim().min(1).max(100),
    body: z.string().trim().min(1).max(3000),
    category: z.enum(["GUIDANCE", "NOTICE", "REMINDER"]),
  }),
  z.object({
    action: z.literal("decide"),
    requestId: z.string().min(1),
    approve: z.boolean(),
    response: z.string().max(1000).default(""),
  }),
]);
export function validateSets(
  state: WorkoutState,
  exercises: { sets: number }[],
) {
  if (state.exerciseIndex >= exercises.length)
    throw new Error("Exercício inválido.");
  const seen = new Set<string>();
  for (const set of state.sets) {
    const key = `${set.exerciseIndex}:${set.setIndex}`;
    if (
      !exercises[set.exerciseIndex] ||
      set.setIndex >= exercises[set.exerciseIndex].sets ||
      seen.has(key)
    )
      throw new Error("Séries incompatíveis com a prescrição.");
    seen.add(key);
  }
}
