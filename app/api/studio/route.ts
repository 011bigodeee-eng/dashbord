import { NextResponse } from "next/server";
import { randomBytes, createHash } from "node:crypto";
import { trainerSession, checkOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { studioAction } from "@/lib/portal-validation";
import {
  activity,
  appointmentConflict,
  PortalError,
  JsonData,
} from "@/lib/portal";
import { portalFailure } from "@/lib/portal-response";
import { today } from "@/lib/metrics";
import { brand } from "@/lib/brand";
export async function GET() {
  try {
    const user = await trainerSession();
    if (!user)
      return NextResponse.json(
        { error: "Acesso exclusivo do profissional." },
        { status: 403 },
      );
    const [accesses, invitations, sessions, requests, messages, shares] =
      await Promise.all([
        db.studentAccess.findMany({
          where: { trainerId: user.id },
          include: { user: { select: { email: true, name: true } } },
        }),
        db.portalInvitation.findMany({
          where: {
            trainerId: user.id,
            acceptedAt: null,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          select: { id: true, studentId: true, email: true, expiresAt: true },
        }),
        db.workoutSession.findMany({
          where: { access: { trainerId: user.id } },
          include: { access: { select: { studentId: true } } },
          orderBy: { startedAt: "desc" },
          take: 100,
        }),
        db.rescheduleRequest.findMany({
          where: { access: { trainerId: user.id } },
          include: { access: { select: { studentId: true } } },
          orderBy: { createdAt: "desc" },
        }),
        db.portalMessage.findMany({
          where: { trainerId: user.id },
          orderBy: { createdAt: "desc" },
        }),
        db.assessmentShare.findMany({
          where: { assessment: { trainerId: user.id } },
        }),
      ]);
    const dayStart = new Date(`${today()}T00:00:00-03:00`);
    const [completedRuns, updatedRuns] = await Promise.all([
      db.workoutSession.findMany({
        where: {
          access: { trainerId: user.id },
          completedAt: { gte: dayStart },
        },
        select: { access: { select: { studentId: true } } },
      }),
      db.workoutSession.findMany({
        where: { access: { trainerId: user.id }, updatedAt: { gte: dayStart } },
        select: { access: { select: { studentId: true } } },
      }),
    ]);
    const completedStudentIds = [
      ...new Set(completedRuns.map((s) => s.access.studentId)),
    ];
    const completedToday = completedStudentIds.length;
    const newInformationToday = new Set([
      ...updatedRuns.map((s) => s.access.studentId),
      ...requests
        .filter((r) => r.createdAt >= dayStart)
        .map((r) => r.access.studentId),
    ]).size;
    return NextResponse.json(
      {
        accesses,
        invitations,
        sessions,
        requests,
        messages,
        shares,
        completedToday,
        completedStudentIds,
        newInformationToday,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return portalFailure(e);
  }
}
export async function POST(req: Request) {
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const user = await trainerSession();
  if (!user)
    return NextResponse.json(
      { error: "Acesso exclusivo do profissional." },
      { status: 403 },
    );
  try {
    const parsed = studioAction.safeParse(await req.json());
    if (!parsed.success)
      throw new PortalError(
        parsed.error.issues.map((i) => i.message).join("; "),
      );
    const b = parsed.data;
    const token = b.action === "invite" ? randomBytes(32).toString("hex") : "";
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      if (b.action === "invite" || b.action === "message") {
        const student = await tx.record.findFirst({
          where: { id: b.studentId, kind: "student", trainerId: user.id },
        });
        if (!student) throw new PortalError("Aluno não encontrado.", 404);
        if (b.action === "message") {
          await tx.portalMessage.create({
            data: {
              trainerId: user.id,
              studentId: b.studentId,
              title: b.title,
              body: b.body,
              category: b.category,
            },
          });
          await activity(
            tx,
            user.id,
            b.studentId,
            "Orientação publicada no portal",
          );
          return { ok: true };
        }
        if ((student.data as JsonData).status !== "Ativo")
          throw new PortalError("Reative o aluno antes de convidá-lo.");
        if (
          await tx.studentAccess.findUnique({
            where: { studentId: b.studentId },
          })
        )
          throw new PortalError(
            "O aluno já possui acesso. Use o controle de ativação.",
          );
        if (
          await tx.user.findUnique({ where: { email: b.email.toLowerCase() } })
        )
          throw new PortalError(
            "Este e-mail já possui uma conta. Use outro e-mail para o convite.",
          );
        await tx.portalInvitation.updateMany({
          where: {
            trainerId: user.id,
            studentId: b.studentId,
            acceptedAt: null,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
        await tx.portalInvitation.create({
          data: {
            trainerId: user.id,
            studentId: b.studentId,
            email: b.email.toLowerCase(),
            tokenHash: createHash("sha256").update(token).digest("hex"),
            expiresAt: new Date(Date.now() + 72 * 3600000),
          },
        });
        return { ok: true, path: `/convite/${token}`, delivery: "link" };
      }
      if (b.action === "access") {
        const access = await tx.studentAccess.findFirst({
          where: { id: b.accessId, trainerId: user.id },
        });
        if (!access) throw new PortalError("Acesso não encontrado.", 404);
        await tx.studentAccess.update({
          where: { id: access.id },
          data: { active: b.active },
        });
        await activity(
          tx,
          user.id,
          access.studentId,
          b.active ? "Acesso ao portal ativado" : "Acesso ao portal desativado",
        );
        return { ok: true };
      }
      if (b.action === "publish") {
        const a = await tx.record.findFirst({
          where: { id: b.assessmentId, kind: "assessment", trainerId: user.id },
        });
        if (!a) throw new PortalError("Avaliação não encontrada.", 404);
        if (!b.fields.length)
          await tx.assessmentShare.deleteMany({
            where: { assessmentId: a.id },
          });
        else
          await tx.assessmentShare.upsert({
            where: { assessmentId: a.id },
            create: { assessmentId: a.id, fields: b.fields },
            update: { fields: b.fields },
          });
        await activity(
          tx,
          user.id,
          (a.data as JsonData).studentId,
          "Compartilhamento de avaliação atualizado",
        );
        return { ok: true };
      }
      const request = await tx.rescheduleRequest.findFirst({
        where: { id: b.requestId, access: { trainerId: user.id } },
        include: { access: true },
      });
      if (!request || request.status !== "PENDING")
        throw new PortalError("Solicitação não encontrada ou já respondida.");
      const appointment = await tx.record.findFirst({
        where: {
          id: request.appointmentId,
          trainerId: user.id,
          kind: "appointment",
          data: { path: ["studentId"], equals: request.access.studentId },
        },
      });
      if (!appointment) throw new PortalError("Sessão não encontrada.");
      if (b.approve) {
        const d = appointment.data as JsonData;
        if (
          ["Cancelado", "Concluído", "Ausente"].includes(d.status) ||
          request.date < today()
        )
          throw new PortalError("Esta sessão não pode mais ser reagendada.");
        await appointmentConflict(
          tx,
          user.id,
          appointment.id,
          request.date,
          request.time,
          d.duration,
        );
        await tx.record.update({
          where: { id: appointment.id },
          data: {
            data: {
              ...d,
              date: request.date,
              time: request.time,
              status: "Confirmado",
            },
          },
        });
      }
      await tx.rescheduleRequest.update({
        where: { id: request.id },
        data: {
          status: b.approve ? "APPROVED" : "DECLINED",
          response: b.response,
          decidedAt: new Date(),
        },
      });
      await tx.portalMessage.create({
        data: {
          trainerId: user.id,
          studentId: request.access.studentId,
          title: b.approve
            ? "Reagendamento aprovado"
            : "Solicitação não aprovada",
          body: `${request.date} às ${request.time}. ${b.response}`,
          category: "NOTICE",
        },
      });
      await activity(
        tx,
        user.id,
        request.access.studentId,
        b.approve
          ? "Reagendamento aprovado pelo personal"
          : "Reagendamento recusado pelo personal",
      );
      return { ok: true };
    });
    if (b.action === "invite" && "path" in result) {
      let delivery = "link";
      if (
        !user.demo &&
        process.env.RESEND_API_KEY &&
        process.env.EMAIL_FROM &&
        process.env.APP_URL?.startsWith("https://")
      ) {
        try {
          const link = new URL(result.path!, process.env.APP_URL).href;
          const sent = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM,
              to: b.email,
              subject: `Seu convite para ${brand.name} Athlete`,
              text: `Você foi convidado para o portal do aluno ${brand.name}. Defina sua senha pelo link (válido por 72 horas): ${link}`,
            }),
            signal: AbortSignal.timeout(10000),
          });
          delivery = sent.ok ? "provider_accepted" : "failed";
        } catch {
          delivery = "failed";
        }
      }
      return NextResponse.json({ ...result, delivery });
    }
    return NextResponse.json(result);
  } catch (e) {
    return portalFailure(e);
  }
}
