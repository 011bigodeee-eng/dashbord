import test from "node:test";
import assert from "node:assert/strict";
import { metrics } from "../lib/metrics";
import { schemas, Entry } from "../lib/schemas";
const entry = (kind: string, data: object, id = "record"): Entry => ({
  id,
  kind: kind as Entry["kind"],
  data,
  createdAt: "2026-10-01T12:00:00Z",
  updatedAt: "2026-10-01T12:00:00Z",
});
test("financial metrics reflect receipt and pending status without counting other months", () => {
  const data = [
    entry("student", { status: "Ativo" }),
    entry("payment", {
      status: "Recebido",
      amount: 450,
      paidDate: "2026-10-10",
      dueDate: "2026-10-10",
    }),
    entry("payment", {
      status: "Pendente",
      amount: 290,
      paidDate: "",
      dueDate: "2026-10-10",
    }),
    entry("payment", {
      status: "Recebido",
      amount: 1000,
      paidDate: "2026-09-10",
      dueDate: "2026-09-10",
    }),
  ];
  const before = metrics(data, new Date("2026-10-20T12:00:00Z"));
  assert.equal(before.received, 450);
  assert.equal(before.pendingTotal, 290);
  assert.equal(before.active.length, 1);
  data[2].data = {
    ...data[2].data,
    status: "Recebido",
    paidDate: "2026-10-20",
  };
  const after = metrics(data, new Date("2026-10-20T12:00:00Z"));
  assert.equal(after.received, 740);
  assert.equal(after.pendingTotal, 0);
});
test("presence excludes sessions whose outcome has not been recorded", () => {
  const data = [
    entry("appointment", { date: "2026-10-20", status: "Concluído" }),
    entry("appointment", { date: "2026-10-20", status: "Ausente" }),
    entry("appointment", { date: "2026-10-20", status: "Confirmado" }),
  ];
  const result = metrics(data, new Date("2026-10-20T12:00:00Z"));
  assert.equal(result.presence, 50);
  assert.equal(result.completed, 1);
  assert.equal(result.appointments.length, 3);
});
test("validators reject empty students and invalid workout prescriptions", () => {
  assert.equal(
    schemas.student.safeParse({ name: "", goal: "Hipertrofia" }).success,
    false,
  );
  assert.equal(
    schemas.training.safeParse({
      name: "Treino",
      studentId: "123",
      division: "A",
      exercises: [{ name: "Supino", sets: 0, reps: "12", load: -5, rest: 60 }],
    }).success,
    false,
  );
  assert.equal(
    schemas.student.safeParse({ name: "Ana Costa", goal: "Hipertrofia" })
      .success,
    true,
  );
});
test("empty account has finite zero metrics", () => {
  const result = metrics([], new Date("2026-10-20"));
  assert.equal(result.received, 0);
  assert.equal(result.presence, 0);
  assert.equal(result.pendingTotal, 0);
  assert.equal(result.growth.length, 12);
});
