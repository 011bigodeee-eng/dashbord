import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
const base = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";
const browser = await chromium.launch({
  executablePath: await serverChromium.executablePath(),
  args: serverChromium.args,
  headless: true,
});
try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const connectedRequests: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/\/api\/(data|studio|athlete|files|invitations)(\/|\?|$)/.test(r.url()))
      connectedRequests.push(new URL(r.url()).pathname);
  });
  await page.goto(base + "/login");
  await page.waitForURL(base + "/");
  assert.equal(await page.getByLabel("E-mail", { exact: true }).count(), 0);
  assert.equal(await page.getByLabel("Senha", { exact: true }).count(), 0);
  await page.getByRole("heading", { name: "Evolução do negócio" }).waitFor();
  await page
    .getByText("Modo temporário · sem Supabase", { exact: true })
    .waitFor();
  console.log(
    "PASS direct entry, login redirect, no credential form and functional local dashboard",
  );
  await page.goto(base + "/alunos");
  await page
    .getByRole("button", { name: "Novo registro", exact: true })
    .click();
  await page.getByLabel("Nome completo").fill("Aluno fictício temporário");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("exemplo@mdnation.example");
  await page.getByRole("button", { name: "Salvar aluno", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.reload();
  await page.getByText("Aluno fictício temporário", { exact: true }).waitFor();
  await page.goto(base + "/");
  await page.getByRole("heading", { name: "Evolução do negócio" }).waitFor();
  assert.equal(
    (await page.locator(".kpi-value").first().innerText()).trim(),
    "49",
  );
  console.log(
    "PASS browser-local student creation, reload persistence and recalculated KPI",
  );
  for (const route of [
    "treinos",
    "evolucao",
    "avaliacoes",
    "agenda",
    "check-ins",
    "financeiro",
    "planos",
    "comunicacao",
    "relatorios",
    "configuracoes",
    "portal",
  ]) {
    await page.goto(base + "/" + route);
    await page.locator(".page-heading h1").waitFor();
    await page.locator(".skeleton").first().waitFor({ state: "hidden" });
    assert.equal(await page.locator(".error-banner").count(), 0);
  }
  console.log("PASS all Studio routes without database requests");
  await page
    .getByRole("button", { name: "Visualizar como aluno", exact: true })
    .click();
  await page.waitForURL(base + "/athlete");
  await page.getByRole("heading", { name: /Rafael/ }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: "/tmp/md-standalone-athlete.png",
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "Navegação do aluno" })
    .getByRole("link", { name: "Treinos", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Iniciar treino", exact: true })
    .first()
    .click();
  await page.waitForURL(base + "/athlete/executar");
  await page
    .getByRole("button", { name: "Concluir série 1", exact: true })
    .click();
  await page
    .getByText("Progresso salvo neste navegador.", { exact: true })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: "Desmarcar série 1", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Finalizar treino", exact: true })
    .click();
  await page
    .getByLabel("Feedback para o personal", { exact: true })
    .fill("Feedback fictício sem banco.");
  await page
    .getByRole("button", { name: "Confirmar conclusão", exact: true })
    .click();
  await page.getByRole("heading", { name: /Mais um passo/ }).waitFor();
  console.log(
    "PASS local workout persistence, resumption, conclusion and feedback",
  );
  await page.goto(base + "/athlete/agenda");
  await page
    .getByRole("button", { name: "Solicitar reagendamento", exact: true })
    .first()
    .click();
  const date = new Date();
  date.setDate(date.getDate() + 7);
  await page.getByLabel("Nova data").fill(date.toISOString().slice(0, 10));
  await page.getByLabel("Novo horário").fill("17:00");
  await page.getByLabel("Motivo").fill("Ajuste fictício de demonstração.");
  await page
    .getByRole("button", { name: "Solicitar alteração", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.goto(base + "/athlete/perfil");
  await page
    .getByRole("button", { name: "Visualizar como personal", exact: true })
    .click();
  await page.waitForURL(base + "/");
  await page.goto(base + "/portal");
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page.locator(".portal-feedback summary").first().click();
  await page
    .getByText("Feedback fictício sem banco.", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: /Solicitações/ }).click();
  await page
    .getByRole("button", { name: "Aprovar", exact: true })
    .first()
    .click();
  await page.getByText("Aprovado", { exact: true }).waitFor();
  console.log(
    "PASS Studio/Athlete synchronization in the same browser and local reschedule approval",
  );
  assert.deepEqual(connectedRequests, []);
  assert.deepEqual(errors, []);
  console.log(
    "PASS no requests to database-backed APIs or browser runtime errors",
  );
  for (const endpoint of [
    "/api/data",
    "/api/athlete",
    "/api/studio",
    "/api/files",
    "/api/files/nonexistent",
    "/api/invitations/nonexistent",
  ]) {
    const r = await context.request.get(base + endpoint);
    assert.equal(r.status(), 503);
  }
  console.log("PASS direct database-backed routes remain paused");
} finally {
  await browser.close();
}
