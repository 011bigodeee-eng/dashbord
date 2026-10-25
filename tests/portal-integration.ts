import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
const base = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";
const password = randomUUID() + "Aa1";
const ids: string[] = [];
async function api(path: string, cookie = "", body?: object) {
  const response = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      Origin: base,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
async function ok(path: string, cookie: string, body?: object) {
  const r = await api(path, cookie, body);
  assert.equal(r.status, 200, JSON.stringify(r.data));
  return r;
}
const checks: string[] = [];
function passed(s: string) {
  checks.push(s);
  console.log("PASS", s);
}
try {
  const trainers = await Promise.all(
    [0, 1].map(async () =>
      db.user.create({
        data: {
          name: "Personal de teste",
          email: `${randomUUID()}@example.com`,
          passwordHash: await hash(password, 10),
        },
      }),
    ),
  );
  ids.push(...trainers.map((t) => t.id));
  const a = (await ok("/api/auth", "", { email: trainers[0].email, password }))
    .cookie;
  const b = (await ok("/api/auth", "", { email: trainers[1].email, password }))
    .cookie;
  const record = async (kind: string, data: object, trainer = 0) =>
    db.record.create({ data: { trainerId: trainers[trainer].id, kind, data } });
  const student1 = await record("student", {
    name: "Atleta um",
    goal: "Força",
    status: "Ativo",
    notes: "PRIVADO DO PERSONAL",
  });
  const student2 = await record("student", {
    name: "Atleta dois",
    goal: "Força",
    status: "Ativo",
    notes: "OUTRO ALUNO",
  });
  const training = await record("training", {
    studentId: student1.id,
    name: "Força A",
    division: "A",
    exercises: [
      {
        name: "Supino reto",
        sets: 2,
        reps: "12",
        load: 40,
        rest: 60,
        tempo: "2–1–2",
        notes: "Controle a execução.",
      },
    ],
    notes: "Orientação compartilhada.",
  });
  const training2 = await record("training", {
    studentId: student2.id,
    name: "Treino de outro aluno",
    division: "B",
    exercises: [
      { name: "Agachamento", sets: 2, reps: "12", load: 30, rest: 60 },
    ],
    notes: "",
  });
  const assessment = await record("assessment", {
    studentId: student1.id,
    date: "2026-10-25",
    weight: 77,
    height: 175,
    waist: 80,
    chest: 100,
    hip: 90,
    fat: 18,
    nextDate: "2026-11-25",
    notes: "AVALIAÇÃO PRIVADA",
  });
  const payment = await record("payment", {
    studentId: student1.id,
    amount: 450,
    status: "Pendente",
    dueDate: "2026-10-25",
  });
  const cookies: string[] = [];
  for (const s of [student1, student2]) {
    const email = `${randomUUID()}@example.com`;
    const invite = await ok("/api/studio", a, {
      action: "invite",
      studentId: s.id,
      email,
    });
    assert.ok(invite.data.path);
    const token = invite.data.path.split("/").at(-1);
    const saved = await db.portalInvitation.findFirstOrThrow({
      where: { studentId: s.id },
    });
    assert.notEqual(saved.tokenHash, token);
    assert.equal(
      (
        await api("/api/studio", b, {
          action: "invite",
          studentId: s.id,
          email: `${randomUUID()}@example.com`,
        })
      ).status,
      404,
    );
    const accepted = await ok(`/api/invitations/${token}`, "", { password });
    cookies.push(accepted.cookie);
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    ids.push(user.id);
    assert.equal(user.role, "STUDENT");
    assert.equal(
      (await api(`/api/invitations/${token}`, "", { password })).status,
      410,
    );
  }
  const [s1, s2] = cookies;
  passed(
    "convites com token hash, escopo por personal, conta STUDENT e consumo único",
  );
  const studentView = (await ok("/api/athlete", s1)).data;
  assert.equal(studentView.student.id, student1.id);
  assert.equal(
    studentView.records.some(
      (r: any) =>
        r.id === training2.id || r.id === assessment.id || r.id === payment.id,
    ),
    false,
  );
  assert.equal(
    JSON.stringify(studentView).includes("PRIVADO DO PERSONAL"),
    false,
  );
  for (const path of ["/api/data", "/api/studio"])
    assert.ok([401, 403].includes((await api(path, s1)).status));
  assert.ok(
    [401, 403].includes(
      (
        await api("/api/data", s1, {
          kind: "training",
          id: training.id,
          data: training.data,
        })
      ).status,
    ),
  );
  assert.equal((await api("/api/athlete", a)).status, 403);
  assert.equal(
    (
      await api("/api/athlete", s2, {
        action: "start",
        trainingId: training.id,
      })
    ).status,
    404,
  );
  passed("segregação TRAINER/STUDENT, privacidade e isolamento entre alunos");
  await ok("/api/studio", a, {
    action: "publish",
    assessmentId: assessment.id,
    fields: ["weight"],
  });
  const view = (await ok("/api/athlete", s1)).data;
  const shared = view.records.find((r: any) => r.id === assessment.id);
  assert.deepEqual(Object.keys(shared.data).sort(), ["date", "weight"]);
  assert.equal(shared.data.weight, 77);
  await ok("/api/studio", a, {
    action: "publish",
    assessmentId: assessment.id,
    fields: [],
  });
  assert.equal(
    (await ok("/api/athlete", s1)).data.records.some(
      (r: any) => r.id === assessment.id,
    ),
    false,
  );
  passed("avaliação privada por padrão, publicação seletiva e revogação");
  const started = await ok("/api/athlete", s1, {
    action: "start",
    trainingId: training.id,
  });
  const run = started.data.session;
  assert.equal(run.snapshot.exercises[0].load, 40);
  await ok("/api/data", a, {
    kind: "training",
    id: training.id,
    data: {
      ...(training.data as object),
      exercises: [
        { name: "Supino reto", sets: 2, reps: "12", load: 50, rest: 60 },
      ],
      notes: "Nova versão",
    },
  });
  const state = {
    ...run.state,
    sets: run.state.sets.map((s: any, i: number) => ({
      ...s,
      done: i === 0,
      load: i === 0 ? 45 : s.load,
    })),
  };
  await ok("/api/athlete", s1, { action: "pause", sessionId: run.id, state });
  let saved = (await ok("/api/athlete", s1)).data.sessions[0];
  assert.equal(saved.status, "PAUSED");
  assert.equal(saved.state.sets[0].load, 45);
  assert.equal(saved.snapshot.exercises[0].load, 40);
  assert.equal(
    (
      await api("/api/athlete", s2, {
        action: "resume",
        sessionId: run.id,
        state,
      })
    ).status,
    404,
  );
  await ok("/api/athlete", s1, { action: "resume", sessionId: run.id, state });
  await ok("/api/athlete", s1, {
    action: "finish",
    sessionId: run.id,
    state,
    feedback: "Treino consistente",
    difficulty: 7,
  });
  await ok("/api/athlete", s1, { action: "finish", sessionId: run.id, state });
  const logs = await db.record.findMany({
    where: {
      trainerId: trainers[0].id,
      kind: "workout",
      data: { path: ["sessionId"], equals: run.id },
    },
  });
  assert.equal(logs.length, 1);
  const studio = (await ok("/api/studio", a)).data;
  assert.equal(
    studio.sessions.find((s: any) => s.id === run.id).feedback,
    "Treino consistente",
  );
  assert.equal(studio.completedToday, 1);
  passed(
    "execução persistida, pausa/retomada, snapshot de prescrição, feedback e conclusão idempotente",
  );
  const appointment = await record("appointment", {
    studentId: student1.id,
    date: "2035-01-10",
    time: "10:00",
    duration: 60,
    type: "Musculação",
    status: "Confirmado",
    notes: "NOTA PRIVADA DA AGENDA",
  });
  await record("appointment", {
    studentId: student2.id,
    date: "2035-01-10",
    time: "12:00",
    duration: 60,
    type: "Musculação",
    status: "Confirmado",
    notes: "",
  });
  await ok("/api/athlete", s1, {
    action: "reschedule",
    appointmentId: appointment.id,
    date: "2035-01-10",
    time: "12:00",
    reason: "Preciso de outro horário",
  });
  let request = (await ok("/api/studio", a)).data.requests[0];
  assert.equal(
    (
      await api("/api/studio", a, {
        action: "decide",
        requestId: request.id,
        approve: true,
        response: "",
      })
    ).status,
    400,
  );
  assert.equal(
    (await db.record.findUniqueOrThrow({ where: { id: appointment.id } }))
      .data &&
      (
        (await db.record.findUniqueOrThrow({ where: { id: appointment.id } }))
          .data as any
      ).time,
    "10:00",
  );
  await ok("/api/studio", a, {
    action: "decide",
    requestId: request.id,
    approve: false,
    response: "Esse horário está ocupado.",
  });
  await ok("/api/athlete", s1, {
    action: "reschedule",
    appointmentId: appointment.id,
    date: "2035-01-10",
    time: "09:00",
    reason: "Outro horário disponível",
  });
  request = (await ok("/api/studio", a)).data.requests.find(
    (r: any) => r.status === "PENDING",
  );
  assert.equal(
    (
      await api("/api/studio", b, {
        action: "decide",
        requestId: request.id,
        approve: true,
        response: "",
      })
    ).status,
    400,
  );
  await ok("/api/studio", a, {
    action: "decide",
    requestId: request.id,
    approve: true,
    response: "Combinado.",
  });
  const athlete = (await ok("/api/athlete", s1)).data;
  assert.equal(
    athlete.records.find((r: any) => r.id === appointment.id).data.time,
    "09:00",
  );
  assert.equal(
    JSON.stringify(athlete).includes("NOTA PRIVADA DA AGENDA"),
    false,
  );
  passed("reagendamento só com aprovação, recusa e bloqueio de conflito");
  const f = await db.privateFile.create({
    data: {
      trainerId: trainers[0].id,
      studentId: student1.id,
      type: "photo",
      name: "autorizada.png",
      mime: "image/png",
      date: "2026-10-25",
      consent: true,
      bytes: Buffer.from([137, 80, 78, 71]),
    },
  });
  assert.equal(
    (await fetch(base + `/api/files/${f.id}`, { headers: { Cookie: s1 } }))
      .status,
    200,
  );
  assert.equal(
    (await fetch(base + `/api/files/${f.id}`, { headers: { Cookie: s2 } }))
      .status,
    404,
  );
  const access = await db.studentAccess.findUniqueOrThrow({
    where: { studentId: student1.id },
  });
  await ok("/api/studio", a, {
    action: "access",
    accessId: access.id,
    active: false,
  });
  assert.equal((await api("/api/athlete", s1)).status, 403);
  await ok("/api/studio", a, {
    action: "access",
    accessId: access.id,
    active: true,
  });
  await ok("/api/athlete", s1);
  passed(
    "fotos autorizadas por aluno e bloqueio imediato de sessão desativada",
  );
  console.log(`${checks.length} grupos de verificações do portal passaram.`);
} finally {
  await db.workoutSession.deleteMany({
    where: { access: { trainerId: { in: ids } } },
  });
  await db.privateFile.deleteMany({ where: { trainerId: { in: ids } } });
  await db.studentAccess.deleteMany({ where: { trainerId: { in: ids } } });
  await db.user.deleteMany({ where: { id: { in: ids } } });
  await db.$disconnect();
}
