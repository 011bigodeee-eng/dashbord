import { isStandaloneMode } from "@/lib/runtime-mode";
import { servicePaused } from "@/lib/service-paused";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkOrigin, trainerSession } from "@/lib/auth";
import { schemas, Kind } from "@/lib/schemas";
export async function GET() {
  if (isStandaloneMode()) return servicePaused();
  const user = await trainerSession();
  if (!user)
    return NextResponse.json(
      { error: "Faça login para continuar." },
      { status: 401 },
    );
  const records = await db.record.findMany({
    where: { trainerId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(
    { user, records },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(req: Request) {
  if (isStandaloneMode()) return servicePaused();
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const user = await trainerSession();
  if (!user)
    return NextResponse.json(
      { error: "Acesso não autorizado" },
      { status: 401 },
    );
  try {
    const body = await req.json();
    const kind = body.kind as Kind;
    if (!Object.hasOwn(schemas, kind))
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    const parsed = schemas[kind].safeParse(body.data);
    if (!parsed.success)
      return NextResponse.json(
        {
          error: parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        { status: 400 },
      );
    const data = parsed.data as Record<string, any>;
    if (kind === "payment" && data.status === "Pendente") data.paidDate = "";
    const record = await db.$transaction(async (tx) => {
      // Serialize writes for a trainer so concurrent appointments cannot bypass conflicts.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
      if (body.id) {
        const own = await tx.record.findFirst({
          where: { id: body.id, trainerId: user.id, kind },
        });
        if (!own) throw new Error("Registro não encontrado");
        if (kind === "training")
          await tx.record.create({
            data: {
              trainerId: user.id,
              kind: "trainingHistory",
              data: { trainingId: own.id, ...(own.data as object) },
            },
          });
      }
      if (data.studentId) {
        const student = await tx.record.findFirst({
          where: { id: data.studentId, kind: "student", trainerId: user.id },
        });
        if (!student) throw new Error("Aluno não encontrado");
      }
      if (data.trainingId) {
        const training = await tx.record.findFirst({
          where: { id: data.trainingId, kind: "training", trainerId: user.id },
        });
        if (!training || (training.data as any).studentId !== data.studentId)
          throw new Error("O treino precisa pertencer ao aluno selecionado.");
      }
      if (
        kind === "appointment" &&
        !["Cancelado", "Ausente"].includes(data.status)
      ) {
        const list = await tx.record.findMany({
          where: { trainerId: user.id, kind: "appointment" },
        });
        const start =
          Number(data.time.slice(0, 2)) * 60 + Number(data.time.slice(3));
        if (
          list.some((r) => {
            const a = r.data as any;
            const t = Number(a.time.slice(0, 2)) * 60 + Number(a.time.slice(3));
            return (
              r.id !== body.id &&
              a.date === data.date &&
              !["Cancelado", "Ausente"].includes(a.status) &&
              start < t + a.duration &&
              t < start + data.duration
            );
          })
        )
          throw new Error(
            "Conflito de horário: já existe uma sessão neste intervalo.",
          );
      }
      const result = body.id
        ? await tx.record.update({ where: { id: body.id }, data: { data } })
        : await tx.record.create({ data: { trainerId: user.id, kind, data } });
      await tx.record.create({
        data: {
          trainerId: user.id,
          kind: "activity",
          data: {
            message: `${body.id ? "Atualização" : "Novo registro"} · ${{ student: "Aluno", training: "Treino", assessment: "Avaliação", appointment: "Sessão", payment: "Pagamento", service: "Plano", note: "Contato", workout: "Check-in", profile: "Perfil" }[kind]}`,
            studentId: data.studentId ?? result.id,
          },
        },
      });
      return result;
    });
    return NextResponse.json({ record });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Não foi possível salvar" },
      { status: 400 },
    );
  }
}
