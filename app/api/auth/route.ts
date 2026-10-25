import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";
import { ensureDemoAthlete } from "@/lib/portal";
import { checkOrigin, session, signIn } from "@/lib/auth";
const attempts = new Map<string, { count: number; until: number }>();
export async function GET() {
  const user = await session();
  return NextResponse.json({ user });
}
export async function POST(req: Request) {
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  try {
    const body = await req.json();
    if (body.demo === true && process.env.DEMO_MODE === "true") {
      const demo =
        body.demoRole === "student"
          ? await ensureDemoAthlete()
          : await db.user.findUnique({ where: { email: "demo@pulse.local" } });
      if (demo?.demo) {
        await signIn(demo.id);
        return NextResponse.json({
          ok: true,
          redirect: demo.role === "STUDENT" ? "/athlete" : "/",
        });
      }
    }
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const key = email;
    const limit = attempts.get(key);
    if (limit && limit.until > Date.now() && limit.count >= 10)
      return NextResponse.json(
        { error: "Muitas tentativas. Aguarde 15 minutos." },
        { status: 429 },
      );
    const user = await db.user.findUnique({ where: { email } });
    if (
      !user ||
      !(await compare(String(body.password ?? ""), user.passwordHash))
    ) {
      attempts.set(key, {
        count: (limit && limit.until > Date.now() ? limit.count : 0) + 1,
        until: Date.now() + 900000,
      });
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 },
      );
    }
    if (user.role === "ADMIN" && process.env.ADMIN_ACCESS_ENABLED !== "true")
      return NextResponse.json(
        { error: "Acesso indisponível." },
        { status: 403 },
      );
    if (user.role === "STUDENT") {
      const access = await db.studentAccess.findUnique({
        where: { userId: user.id },
        include: { student: true, trainer: { select: { demo: true } } },
      });
      if (
        !access?.active ||
        (access.trainer.demo && process.env.DEMO_MODE !== "true") ||
        (access.student.data as { status: string }).status !== "Ativo"
      )
        return NextResponse.json(
          { error: "Acesso desativado. Fale com seu personal." },
          { status: 403 },
        );
    }
    if (user.demo && process.env.DEMO_MODE !== "true")
      return NextResponse.json(
        { error: "Demonstração indisponível." },
        { status: 403 },
      );
    attempts.delete(key);
    await signIn(user.id);
    return NextResponse.json({
      ok: true,
      redirect: user.role === "STUDENT" ? "/athlete" : "/",
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível entrar." },
      { status: 500 },
    );
  }
}
export async function DELETE(req: Request) {
  if (!checkOrigin(req))
    return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  (await cookies()).delete("pulse-session");
  return NextResponse.json({ ok: true });
}
