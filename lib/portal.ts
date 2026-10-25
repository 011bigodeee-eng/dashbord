import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { session } from "./auth";
import { today } from "./metrics";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { sharedFields } from "./portal-validation";
export class PortalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Exercise = {
  name: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  load: number;
  rest: number;
  tempo?: string;
  notes?: string;
};
export type Prescription = {
  name: string;
  division: string;
  studentId: string;
  exercises: Exercise[];
  notes: string;
};
export type JsonData = Record<string, any>;
export async function athleteContext() {
  const user = await session();
  if (!user || user.role !== "STUDENT")
    throw new PortalError("Acesso exclusivo do aluno.", 403);
  const access = await db.studentAccess.findUnique({
    where: { userId: user.id },
    include: {
      student: true,
      trainer: { select: { id: true, name: true, demo: true } },
    },
  });
  if (!access?.active || (access.student.data as JsonData).status !== "Ativo")
    throw new PortalError("Acesso desativado. Fale com seu personal.", 403);
  return { user, access };
}
export async function appointmentConflict(
  tx: Prisma.TransactionClient,
  trainerId: string,
  id: string,
  date: string,
  time: string,
  duration: number,
) {
  const list = await tx.record.findMany({
    where: { trainerId, kind: "appointment" },
  });
  const minutes = (s: string) =>
    Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = minutes(time);
  if (
    list.some((r) => {
      const a = r.data as JsonData;
      return (
        r.id !== id &&
        a.date === date &&
        !["Cancelado", "Ausente"].includes(a.status) &&
        start < minutes(a.time) + a.duration &&
        minutes(a.time) < start + duration
      );
    })
  )
    throw new PortalError("Conflito de horário. Escolha outro intervalo.");
}
export async function activity(
  tx: Prisma.TransactionClient,
  trainerId: string,
  studentId: string,
  message: string,
) {
  await tx.record.create({
    data: { trainerId, kind: "activity", data: { studentId, message } },
  });
}
export async function athleteData() {
  const { user, access } = await athleteContext();
  const own = await db.record.findMany({
    where: {
      trainerId: access.trainerId,
      kind: { in: ["training", "assessment", "appointment", "workout"] },
      data: { path: ["studentId"], equals: access.studentId },
    },
    orderBy: { createdAt: "asc" },
    include: { assessmentShare: true },
  });
  const records = own.flatMap((r) => {
    const d = r.data as JsonData;
    if (r.kind === "assessment") {
      if (!r.assessmentShare) return [];
      const allowed = new Set(r.assessmentShare.fields);
      return [
        {
          id: r.id,
          kind: r.kind,
          data: Object.fromEntries(
            Object.entries(d).filter(
              ([k]) =>
                k === "date" ||
                (sharedFields.includes(k as (typeof sharedFields)[number]) &&
                  allowed.has(k)),
            ),
          ),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
      ];
    }
    if (r.kind === "appointment")
      return [
        {
          id: r.id,
          kind: r.kind,
          data: {
            date: d.date,
            time: d.time,
            duration: d.duration,
            type: d.type,
            status: d.status,
          },
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
      ];
    if (r.kind === "workout")
      return [
        {
          id: r.id,
          kind: r.kind,
          data: { date: d.date, trainingId: d.trainingId },
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        },
      ];
    return [
      {
        id: r.id,
        kind: r.kind,
        data: d,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      },
    ];
  });
  const [sessions, messages, requests, photos, profile] = await Promise.all([
    db.workoutSession.findMany({
      where: { accessId: access.id },
      orderBy: { startedAt: "desc" },
    }),
    db.portalMessage.findMany({
      where: { trainerId: access.trainerId, studentId: access.studentId },
      orderBy: { createdAt: "desc" },
    }),
    db.rescheduleRequest.findMany({
      where: { accessId: access.id },
      orderBy: { createdAt: "desc" },
    }),
    db.privateFile.findMany({
      where: {
        trainerId: access.trainerId,
        studentId: access.studentId,
        type: "photo",
        consent: true,
      },
      select: { id: true, date: true },
      orderBy: { date: "asc" },
    }),
    db.record.findFirst({
      where: { trainerId: access.trainerId, kind: "profile" },
    }),
  ]);
  const s = access.student.data as JsonData;
  const p = profile?.data as JsonData | undefined;
  return {
    user,
    student: { id: access.studentId, name: s.name, goal: s.goal },
    trainer: {
      name: p?.name || access.trainer.name,
      specialty: p?.specialty || "Personal trainer",
      phone: p?.phone || "",
    },
    records,
    sessions,
    messages,
    requests,
    photos,
    serverTime: new Date().toISOString(),
  };
}
export async function ensureDemoAthlete(client: PrismaClient = db) {
  if (process.env.DEMO_MODE !== "true")
    throw new PortalError("Demonstração indisponível.", 403);
  const trainer = await client.user.findUnique({
    where: { email: "demo@pulse.local" },
  });
  if (!trainer?.demo || trainer.role !== "TRAINER")
    throw new PortalError("Execute o seed demonstrativo.");
  const student = await client.record.findFirst({
    where: {
      trainerId: trainer.id,
      kind: "student",
      data: { path: ["name"], equals: "Rafael Martins" },
    },
  });
  if (!student) throw new PortalError("Aluno demonstrativo não encontrado.");
  const user = await client.user.upsert({
    where: { email: "athlete-demo@pulse.local" },
    update: {},
    create: {
      email: "athlete-demo@pulse.local",
      name: "Rafael Martins",
      passwordHash: await hash(randomBytes(32).toString("hex"), 12),
      demo: true,
      role: "STUDENT",
    },
  });
  if (!user.demo || user.role !== "STUDENT")
    throw new PortalError("Conta demonstrativa inválida.");
  await client.studentAccess.upsert({
    where: { studentId: student.id },
    update: {},
    create: { userId: user.id, trainerId: trainer.id, studentId: student.id },
  });
  const assessments = await client.record.findMany({
    where: {
      trainerId: trainer.id,
      kind: "assessment",
      data: { path: ["studentId"], equals: student.id },
    },
  });
  for (const a of assessments)
    await client.assessmentShare.upsert({
      where: { assessmentId: a.id },
      update: {},
      create: {
        assessmentId: a.id,
        fields: ["weight", "waist", "chest", "hip", "fat", "nextDate"],
      },
    });
  if (
    !(await client.portalMessage.findFirst({
      where: { trainerId: trainer.id, studentId: student.id },
    }))
  )
    await client.portalMessage.create({
      data: {
        trainerId: trainer.id,
        studentId: student.id,
        title: "Seu próximo nível começa aqui",
        body: "Siga a prescrição com calma, registre suas séries e me conte como foi o treino. Dados deste ambiente são fictícios.",
        category: "GUIDANCE",
      },
    });
  return user;
}
