import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { checkOrigin, signIn, session } from "@/lib/auth";
import { PortalError, JsonData, activity } from "@/lib/portal";
import { portalFailure } from "@/lib/portal-response";
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
async function invitation(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new PortalError("Convite inválido.", 404);
  const i = await db.portalInvitation.findUnique({
    where: { tokenHash: digest(token) },
  });
  if (!i || i.acceptedAt || i.revokedAt || i.expiresAt < new Date())
    throw new PortalError("Convite expirado ou já utilizado.", 410);
  return i;
}
export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const i = await invitation((await params).token);
    const s = await db.record.findFirst({
      where: { id: i.studentId, trainerId: i.trainerId, kind: "student" },
    });
    if (!s || (s.data as JsonData).status !== "Ativo")
      throw new PortalError("Convite indisponível.", 410);
    return NextResponse.json(
      {
        name: (s.data as JsonData).name,
        email: i.email,
        expiresAt: i.expiresAt,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (e) {
    return portalFailure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    if (await session())
      throw new PortalError("Saia da conta atual antes de aceitar o convite.");
    const parsed = z
      .object({ password: z.string().min(12).max(128) })
      .safeParse(await req.json());
    if (!parsed.success)
      throw new PortalError("Use uma senha entre 12 e 128 caracteres.");
    const i = await invitation((await params).token);
    const passwordHash = await hash(parsed.data.password, 12);
    const user = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${i.trainerId}))`;
      const valid = await tx.portalInvitation.findUnique({
        where: { id: i.id },
      });
      const student = await tx.record.findFirst({
        where: { id: i.studentId, trainerId: i.trainerId, kind: "student" },
      });
      if (
        !valid ||
        valid.acceptedAt ||
        valid.revokedAt ||
        valid.expiresAt < new Date() ||
        !student ||
        (student.data as JsonData).status !== "Ativo"
      )
        throw new PortalError("Convite indisponível.", 410);
      if (
        (await tx.user.findUnique({ where: { email: i.email } })) ||
        (await tx.studentAccess.findUnique({
          where: { studentId: i.studentId },
        }))
      )
        throw new PortalError("Este aluno ou e-mail já possui acesso.");
      const trainer = await tx.user.findUniqueOrThrow({
        where: { id: i.trainerId },
      });
      if (trainer.demo && process.env.DEMO_MODE !== "true")
        throw new PortalError("Convite indisponível.", 410);
      const account = await tx.user.create({
        data: {
          email: i.email,
          name: (student.data as JsonData).name,
          passwordHash,
          role: "STUDENT",
          demo: trainer.demo,
        },
      });
      await tx.studentAccess.create({
        data: {
          trainerId: i.trainerId,
          studentId: i.studentId,
          userId: account.id,
        },
      });
      await tx.portalInvitation.update({
        where: { id: i.id },
        data: { acceptedAt: new Date() },
      });
      await activity(
        tx,
        i.trainerId,
        i.studentId,
        "Aluno ativou a conta Athlete",
      );
      return account;
    });
    await signIn(user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return portalFailure(e);
  }
}
