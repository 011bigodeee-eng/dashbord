import "dotenv/config";
import { chromium } from "@playwright/test";
import serverChromium from "@sparticuz/chromium";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
const password = randomUUID();
const user = await db.user.create({
  data: {
    email: `${randomUUID()}@example.com`,
    name: "Teste de interface",
    passwordHash: await hash(password, 10),
  },
});
const browser = await chromium.launch({
  executablePath: await serverChromium.executablePath(),
  args: serverChromium.args,
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";
try {
  await page.goto(base + "/login");
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar no workspace" }).click();
  await page.waitForURL(base + "/");
  await page.getByRole("heading", { name: "Evolução do negócio" }).waitFor();
  await page.goto(base + "/alunos");
  await page
    .getByRole("button", { name: "Novo registro", exact: true })
    .click();
  await page.getByLabel("Nome completo").fill("Aluno do navegador");
  await page.getByLabel("E-mail", { exact: true }).fill("aluno@example.com");
  await page.getByRole("button", { name: "Salvar aluno", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByText("Aluno do navegador", { exact: true }).waitFor();
  await page.reload();
  await page.getByText("Aluno do navegador", { exact: true }).waitFor();
  assert.equal(
    await page.getByText("Aluno do navegador", { exact: true }).count(),
    1,
  );
  console.log("PASS UI student create and reload persistence");
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
  ]) {
    await page.goto(base + "/" + route);
    await page.locator(".page-heading h1").waitFor();
    await page.locator(".skeleton").first().waitFor({ state: "hidden" });
    assert.equal(
      await page.locator("main").getByText("Application error").count(),
      0,
    );
    console.log("PASS route", route);
  }
  await page.goto(base + "/treinos");
  await page
    .getByRole("button", { name: "Novo registro", exact: true })
    .click();
  await page
    .getByLabel("Aluno", { exact: true })
    .selectOption({ label: "Aluno do navegador" });
  await page.getByLabel("Nome da ficha").fill("Ficha de teste");
  await page
    .getByRole("button", { name: "Salvar treino", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("heading", { name: "Ficha de teste" }).waitFor();
  console.log("PASS UI workout prescription");
  await page.goto(base + "/financeiro");
  await page
    .getByRole("button", { name: "Novo registro", exact: true })
    .click();
  await page
    .getByLabel("Aluno", { exact: true })
    .selectOption({ label: "Aluno do navegador" });
  await page.getByLabel("Valor (R$)").fill("500");
  await page
    .getByRole("button", { name: "Salvar pagamento", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.ok(
    (await page.locator(".kpi-value").first().innerText()).includes("500"),
  );
  console.log("PASS UI payment updates KPI");
  await page.goto(base + "/");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Evolução do negócio" }).waitFor();
  await page.waitForTimeout(500);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page.locator('nav a[href="/alunos"]').click();
  await page.waitForURL(base + "/alunos");
  console.log("PASS mobile menu and no page overflow");
  assert.deepEqual(errors, []);
  console.log("PASS no browser runtime errors");
} finally {
  await browser.close();
  await db.user.delete({ where: { id: user.id } });
  await db.$disconnect();
}
