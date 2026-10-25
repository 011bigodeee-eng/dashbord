import "dotenv/config";
import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import assert from "node:assert/strict";
import { db } from "../lib/db";
const base = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";
const password = randomUUID() + "Aa1";
const ids: string[] = [];
let coachBrowser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const browser = await chromium.launch({
  executablePath: await serverChromium.executablePath(),
  args: serverChromium.args,
  headless: true,
});
try {
  const trainer = await db.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      name: "Personal da interface",
      passwordHash: await hash(password, 10),
    },
  });
  ids.push(trainer.id);
  const student = await db.record.create({
    data: {
      trainerId: trainer.id,
      kind: "student",
      data: {
        name: "Rafael da interface",
        goal: "Hipertrofia",
        status: "Ativo",
        notes: "Privado",
      },
    },
  });
  const athlete = await db.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      name: "Rafael da interface",
      passwordHash: await hash(password, 10),
      role: "STUDENT",
    },
  });
  ids.push(athlete.id);
  await db.studentAccess.create({
    data: { trainerId: trainer.id, studentId: student.id, userId: athlete.id },
  });
  await db.record.create({
    data: {
      trainerId: trainer.id,
      kind: "training",
      data: {
        name: "Força · superior",
        studentId: student.id,
        division: "A",
        exercises: [
          {
            name: "Supino reto",
            sets: 2,
            reps: "12",
            load: 40,
            rest: 60,
            notes: "Controle a descida.",
            tempo: "2–1–2",
          },
        ],
        notes: "Uma série de cada vez.",
      },
    },
  });
  await db.record.create({
    data: {
      trainerId: trainer.id,
      kind: "appointment",
      data: {
        studentId: student.id,
        date: "2035-01-10",
        time: "10:00",
        duration: 60,
        type: "Musculação",
        status: "Confirmado",
        notes: "Privado",
      },
    },
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base + "/login");
  await page.getByLabel("E-mail", { exact: true }).fill(athlete.email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await page.waitForURL(base + "/athlete");
  await page.getByRole("heading", { name: /Rafael/ }).waitFor();
  assert.match(await page.title(), /Athlete/);
  await page.screenshot({
    path: "/tmp/md-athlete-home-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log("PASS Athlete login, mobile home and no overflow");
  const nav = page.getByRole("navigation", { name: "Navegação do aluno" });
  await nav.getByRole("link", { name: "Treinos", exact: true }).click();
  await page.getByRole("heading", { name: "Seus treinos." }).waitFor();
  await page
    .getByRole("button", { name: "Iniciar treino", exact: true })
    .click();
  await page.waitForURL(base + "/athlete/executar");
  await page
    .getByRole("heading", { name: "Supino reto", exact: true })
    .waitFor();
  await page.getByLabel("Carga série 1", { exact: true }).fill("45");
  await page.getByLabel("Repetições série 1", { exact: true }).fill("10");
  await page
    .getByRole("button", { name: "Concluir série 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Desmarcar série 1", exact: true })
    .waitFor();
  await page
    .getByText("Progresso salvo no seu histórico.", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Desmarcar série 1", exact: true })
    .waitFor();
  assert.equal(
    await page.getByLabel("Carga série 1", { exact: true }).inputValue(),
    "45",
  );
  console.log("PASS series execution, load/reps and reload resume");
  await page
    .getByRole("button", { name: "Pausar treino", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Retomar treino", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Retomar treino", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pausar treino", exact: true })
    .waitFor();
  await page.screenshot({
    path: "/tmp/md-athlete-workout-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finalizar treino", exact: true })
    .click();
  await page
    .getByLabel("Feedback para o personal", { exact: true })
    .fill("Carga confortável, execução controlada.");
  await page
    .getByRole("button", { name: "Confirmar conclusão", exact: true })
    .click();
  await page.getByRole("heading", { name: /Mais um passo/ }).waitFor();
  console.log("PASS pause, resume, finish and completion summary");
  await nav.getByRole("link", { name: "Evolução", exact: true }).click();
  await page.getByRole("heading", { name: "Minha evolução." }).waitFor();
  await nav.getByRole("link", { name: "Agenda", exact: true }).click();
  await page.getByRole("heading", { name: "Minha agenda." }).waitFor();
  await page
    .getByRole("button", { name: "Solicitar reagendamento", exact: true })
    .click();
  await page.getByLabel("Nova data").fill("2035-01-11");
  await page.getByLabel("Novo horário").fill("09:00");
  await page.getByLabel("Motivo").fill("Preciso ajustar meu horário.");
  await page
    .getByRole("button", { name: "Solicitar alteração", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByText("Reagendamento aguardando resposta do personal.")
    .waitFor();
  console.log("PASS evolution and student reschedule request");
  // Sparticuz runs Chromium with --single-process; use separate browser processes
  // for separate identities so renderer cookie stores cannot bleed across contexts.
  coachBrowser = await chromium.launch({
    executablePath: await serverChromium.executablePath(),
    args: serverChromium.args,
    headless: true,
  });
  const coachContext = await coachBrowser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const coach = await coachContext.newPage();
  coach.on("pageerror", (e) => errors.push(e.message));
  const teacherLogin = await coachContext.request.post(base + "/api/auth", {
    data: { email: trainer.email, password },
  });
  assert.equal(teacherLogin.status(), 200);
  const teacherAuth = await coachContext.request.get(base + "/api/auth");
  assert.equal((await teacherAuth.json()).user?.role, "TRAINER");
  await coach.goto(base + "/portal");
  await coach.getByRole("heading", { name: "Portal dos Alunos." }).waitFor();
  const coachAjax = await coach.evaluate(async () => {
    const a = await fetch("/api/auth").then((r) => r.json());
    const d = await fetch("/api/data", { cache: "no-store" }).then((r) =>
      r.json(),
    );
    return { role: a.user?.role, error: d.error, count: d.records?.length };
  });
  assert.equal(coachAjax.role, "TRAINER", JSON.stringify(coachAjax));
  assert.equal(coachAjax.error, undefined, JSON.stringify(coachAjax));
  await coach.getByRole("button", { name: /Solicitações/ }).click();
  await coach.getByRole("button", { name: "Aprovar", exact: true }).click();
  await coach.getByText("Aprovado", { exact: true }).waitFor();
  await coach.getByRole("button", { name: "Feedback", exact: true }).click();
  await coach.locator(".portal-feedback summary").first().click();
  await coach
    .getByText("Carga confortável, execução controlada.", { exact: true })
    .waitFor();
  await coach.screenshot({ path: "/tmp/md-studio-portal.png", fullPage: true });
  console.log("PASS trainer approval and athlete feedback visible in Studio");
  await page.reload();
  await page.getByText("09:00", { exact: false }).first().waitFor();
  await nav.getByRole("link", { name: "Perfil", exact: true }).click();
  await page.getByRole("heading", { name: "Meu espaço." }).waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS all Athlete tabs and no browser errors");
  const manifest = await page.request.get(base + "/manifest.webmanifest");
  assert.equal(manifest.status(), 200);
  const icon = await page.request.get(base + "/athlete/pwa-icon/192");
  assert.equal(icon.status(), 200);
  console.log("PASS PWA manifest and text app icon");
} catch (e) {
  for (const [i, p] of browser
    .contexts()
    .flatMap((c) => c.pages())
    .entries()) {
    console.log("PAGE", i, p.url());
    await p.screenshot({
      path: `/tmp/portal-ui-error-${i}.png`,
      fullPage: true,
    });
    const auth = await p.request.get(base + "/api/auth");
    const d = await auth.json();
    console.log("ROLE", d.user?.role || "anonymous");
  }
  throw e;
} finally {
  await coachBrowser?.close();
  await browser.close();
  await db.workoutSession.deleteMany({
    where: { access: { trainerId: { in: ids } } },
  });
  await db.studentAccess.deleteMany({ where: { trainerId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
