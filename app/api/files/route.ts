import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trainerSession, checkOrigin } from "@/lib/auth";
export async function GET(req: Request) {
  const user = await trainerSession();
  if (!user)
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  const studentId = new URL(req.url).searchParams.get("studentId") || "";
  return NextResponse.json({
    files: await db.privateFile.findMany({
      where: { trainerId: user.id, studentId },
      select: { id: true, name: true, type: true, date: true, consent: true },
      orderBy: { date: "asc" },
    }),
  });
}
export async function POST(req: Request) {
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const user = await trainerSession();
  if (!user)
    return NextResponse.json({ error: "Acesso negado" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("file");
    const studentId = String(form.get("studentId") || "");
    const type = String(form.get("type"));
    const date = String(form.get("date"));
    const consent = form.get("consent") === "true";
    if (!(file instanceof File) || file.size > 5242880 || file.size === 0)
      throw new Error("Selecione um arquivo de até 5 MB.");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !["photo", "document"].includes(type)
    )
      throw new Error("Data ou tipo inválido.");
    if (type === "photo" && !consent)
      throw new Error("Confirme a autorização do aluno.");
    const student = await db.record.findFirst({
      where: { id: studentId, trainerId: user.id, kind: "student" },
    });
    if (!student) throw new Error("Aluno não encontrado.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const header = bytes.subarray(0, 12);
    const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
    const png = header
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const webp =
      header.subarray(0, 4).toString() === "RIFF" &&
      header.subarray(8, 12).toString() === "WEBP";
    const pdf = header.subarray(0, 5).toString() === "%PDF-";
    const mime = jpeg
      ? "image/jpeg"
      : png
        ? "image/png"
        : webp
          ? "image/webp"
          : pdf
            ? "application/pdf"
            : "";
    if (!mime || (type === "photo" && pdf))
      throw new Error(
        "Formato não permitido. Utilize JPEG, PNG, WebP ou PDF para anexos.",
      );
    await db.privateFile.create({
      data: {
        trainerId: user.id,
        studentId,
        type,
        name: file.name.slice(0, 200),
        date,
        consent,
        mime,
        bytes,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no upload" },
      { status: 400 },
    );
  }
}
