import { isStandaloneMode } from "@/lib/runtime-mode";
import { servicePaused } from "@/lib/service-paused";
import { NextResponse } from "next/server";
import {
  athleteContext,
  athleteData,
  activity,
  PortalError,
  Prescription,
  JsonData,
} from "@/lib/portal";
import { athleteAction, validateSets } from "@/lib/portal-validation";
import { portalFailure } from "@/lib/portal-response";
import { checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { today } from "@/lib/metrics";
import { workoutClock } from "@/lib/workout-clock";
export async function GET() {
  if (isStandaloneMode()) return servicePaused();
  try {
    return NextResponse.json(await athleteData(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return portalFailure(e);
  }
}
export async function POST(req: Request) {
  if (isStandaloneMode()) return servicePaused();
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const { access } = await athleteContext();
    const parsed = athleteAction.safeParse(await req.json());
    if (!parsed.success)
      throw new PortalError(
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    const body = parsed.data;
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${access.trainerId}))`;
      const current = await tx.studentAccess.findUnique({
        where: { id: access.id },
        include: { student: true },
      });
      if (
        !current?.active ||
        (current.student.data as JsonData).status !== "Ativo"
      )
        throw new PortalError("Acesso desativado.", 403);
      if (body.action === "start") {
        const training = await tx.record.findFirst({
          where: {
            id: body.trainingId,
            kind: "training",
            trainerId: access.trainerId,
            data: { path: ["studentId"], equals: access.studentId },
          },
        });
        if (!training) throw new PortalError("Ficha não encontrada.", 404);
        const existing = await tx.workoutSession.findFirst({
          where: { accessId: access.id, status: { not: "COMPLETED" } },
        });
        if (existing) return { session: existing };
        const p = training.data as unknown as Prescription;
        const state = {
          exerciseIndex: 0,
          sets: p.exercises.flatMap((e, exerciseIndex) =>
            Array.from({ length: e.sets }, (_, setIndex) => ({
              exerciseIndex,
              setIndex,
              load: e.load,
              reps: Number.parseInt(e.reps) || 0,
              done: false,
            })),
          ),
        };
        const run = await tx.workoutSession.create({
          data: {
            accessId: access.id,
            trainingId: training.id,
            snapshot: training.data!,
            state,
          },
        });
        await activity(
          tx,
          access.trainerId,
          access.studentId,
          "Aluno iniciou um treino",
        );
        return { session: run };
      }
      if (body.action === "reschedule") {
        const appointment = await tx.record.findFirst({
          where: {
            id: body.appointmentId,
            kind: "appointment",
            trainerId: access.trainerId,
            data: { path: ["studentId"], equals: access.studentId },
          },
        });
        if (
          !appointment ||
          ["Cancelado", "Concluído", "Ausente"].includes(
            (appointment.data as JsonData).status,
          )
        )
          throw new PortalError("Sessão não disponível para reagendamento.");
        if (body.date < today())
          throw new PortalError("Escolha uma data atual ou futura.");
        if (
          await tx.rescheduleRequest.findFirst({
            where: { appointmentId: appointment.id, status: "PENDING" },
          })
        )
          throw new PortalError(
            "Já existe uma solicitação aguardando resposta.",
          );
        await tx.rescheduleRequest.create({
          data: {
            accessId: access.id,
            appointmentId: appointment.id,
            date: body.date,
            time: body.time,
            reason: body.reason,
          },
        });
        await activity(
          tx,
          access.trainerId,
          access.studentId,
          "Aluno solicitou reagendamento",
        );
        return { ok: true };
      }
      if (body.action === "read") {
        const message = await tx.portalMessage.updateMany({
          where: {
            id: body.messageId,
            trainerId: access.trainerId,
            studentId: access.studentId,
            readAt: null,
          },
          data: { readAt: new Date() },
        });
        return { ok: message.count === 1 };
      }
      const run = await tx.workoutSession.findFirst({
        where: { id: body.sessionId, accessId: access.id },
      });
      if (!run) throw new PortalError("Treino não encontrado.", 404);
      if (body.action === "feedback") {
        if (run.status !== "COMPLETED")
          throw new PortalError("Finalize o treino antes do feedback.");
        const saved = await tx.workoutSession.update({
          where: { id: run.id },
          data: { feedback: body.feedback, difficulty: body.difficulty },
        });
        await activity(
          tx,
          access.trainerId,
          access.studentId,
          "Aluno enviou feedback do treino",
        );
        return { session: saved };
      }
      if (run.status === "COMPLETED") {
        if (body.action === "finish") return { session: run };
        throw new PortalError("Este treino já foi finalizado.");
      }
      const prescription = run.snapshot as unknown as Prescription;
      try {
        validateSets(body.state, prescription.exercises);
      } catch (e) {
        throw new PortalError((e as Error).message);
      }
      if (body.action === "finish" && !body.state.sets.some((s) => s.done))
        throw new PortalError("Conclua pelo menos uma série para finalizar.");
      const status =
        body.action === "finish"
          ? "COMPLETED"
          : body.action === "pause"
            ? "PAUSED"
            : body.action === "resume"
              ? "IN_PROGRESS"
              : run.status;
      const savedAt = new Date();
      const timing = workoutClock(run, savedAt.getTime());
      const saved = await tx.workoutSession.update({
        where: { id: run.id },
        data: {
          state: { ...body.state, clockRemainderMs: timing.remainderMs },
          activeSeconds: timing.seconds,
          updatedAt: savedAt,
          status,
          ...(body.action === "finish"
            ? {
                completedAt: new Date(),
                feedback: body.feedback,
                difficulty: body.difficulty ?? null,
              }
            : {}),
        },
      });
      if (body.action === "finish") {
        await tx.record.create({
          data: {
            trainerId: access.trainerId,
            kind: "workout",
            data: {
              studentId: access.studentId,
              date: today(),
              trainingId: run.trainingId,
              sessionId: run.id,
              notes: "Concluído pelo aluno no portal Athlete.",
            },
          },
        });
        await activity(
          tx,
          access.trainerId,
          access.studentId,
          "Aluno concluiu um treino no Athlete",
        );
      }
      return { session: saved };
    });
    return NextResponse.json(result);
  } catch (e) {
    return portalFailure(e);
  }
}
