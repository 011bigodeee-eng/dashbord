import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { db } from "../lib/db";
const base = process.env.PULSE_TEST_BASE_URL || "http://localhost:3000";
const password = randomUUID() + "Aa1";
const users: string[] = [];
async function request(path: string, body?: object, cookie = "") {
  const res = await fetch(base + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      Origin: base,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: res.status,
    data: await res.json(),
    cookie: res.headers.get("set-cookie")?.split(";")[0] || "",
  };
}
try {
  for (let i = 0; i < 2; i++) {
    const u = await db.user.create({
      data: {
        name: "Teste isolado",
        email: `${randomUUID()}@example.com`,
        passwordHash: await hash(password, 10),
      },
    });
    users.push(u.id);
  }
  const one = await db.user.findUniqueOrThrow({ where: { id: users[0] } });
  const two = await db.user.findUniqueOrThrow({ where: { id: users[1] } });
  const loginA = await request("/api/auth", { email: one.email, password });
  assert.equal(loginA.status, 200, JSON.stringify(loginA.data));
  const a = loginA.cookie;
  const b = (await request("/api/auth", { email: two.email, password })).cookie;
  assert.ok(a);
  assert.ok(b);
  assert.equal((await request("/api/data")).status, 401);
  console.log("PASS anonymous access denied");
  let r = await request(
    "/api/data",
    {
      kind: "student",
      data: {
        name: "Aluno de integração",
        goal: "Hipertrofia",
        status: "Ativo",
      },
    },
    a,
  );
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const student = r.data.record;
  r = await request(
    "/api/data",
    {
      kind: "student",
      id: student.id,
      data: { ...student.data, name: "Nome editado" },
    },
    a,
  );
  assert.equal(r.status, 200);
  assert.equal(
    (await request("/api/data", undefined, a)).data.records.filter(
      (r: any) => r.kind === "student",
    )[0].data.name,
    "Nome editado",
  );
  console.log("PASS student create, edit and persistence");
  assert.equal(
    (await request("/api/data", undefined, b)).data.records.length,
    0,
  );
  assert.equal(
    (
      await request(
        "/api/data",
        {
          kind: "student",
          id: student.id,
          data: { ...student.data, name: "Ataque" },
        },
        b,
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/data",
        {
          kind: "workout",
          data: { studentId: student.id, date: "2026-10-25" },
        },
        b,
      )
    ).status,
    400,
  );
  console.log("PASS cross-tenant reads and writes blocked");
  const appointment = {
    studentId: student.id,
    date: "2030-01-10",
    time: "09:00",
    duration: 60,
    type: "Musculação",
    status: "Confirmado",
  };
  const concurrent = await Promise.all([
    request("/api/data", { kind: "appointment", data: appointment }, a),
    request("/api/data", { kind: "appointment", data: appointment }, a),
  ]);
  assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 400]);
  console.log("PASS concurrent appointment conflict detected");
  const session = concurrent.find((r) => r.status === 200)!.data.record;
  assert.equal(
    (
      await request(
        "/api/data",
        {
          kind: "appointment",
          id: session.id,
          data: { ...session.data, status: "Concluído" },
        },
        a,
      )
    ).status,
    200,
  );
  for (const [kind, data] of Object.entries({
    training: {
      name: "Ficha A",
      studentId: student.id,
      division: "A",
      exercises: [{ name: "Supino", sets: 3, reps: "12", load: 20, rest: 60 }],
    },
    assessment: {
      studentId: student.id,
      date: "2026-10-25",
      weight: 75,
      height: 175,
      waist: 80,
      chest: 100,
      hip: 90,
      fat: 15,
      nextDate: "2026-11-25",
    },
    workout: { studentId: student.id, date: "2026-10-25" },
    payment: {
      studentId: student.id,
      service: "Personal",
      amount: 450,
      dueDate: "2026-10-25",
      status: "Pendente",
      method: "Pix",
    },
  })) {
    r = await request("/api/data", { kind, data }, a);
    assert.equal(r.status, 200, JSON.stringify(r.data));
    if (kind === "payment") {
      const p = r.data.record;
      r = await request(
        "/api/data",
        {
          kind,
          id: p.id,
          data: { ...p.data, status: "Recebido", paidDate: "2026-10-25" },
        },
        a,
      );
      assert.equal(r.status, 200);
    }
  }
  console.log(
    "PASS training, assessment, attendance, session completion and payment persisted",
  );
  const data = (await request("/api/data", undefined, a)).data.records;
  assert.equal(
    data.find((r: any) => r.kind === "payment").data.status,
    "Recebido",
  );
  assert.equal(data.filter((r: any) => r.kind === "training").length, 1);
  const invalid = await request(
    "/api/data",
    { kind: "student", data: { name: "", goal: "Hipertrofia" } },
    a,
  );
  assert.equal(invalid.status, 400);
  console.log("PASS server validation");
  const form = new FormData();
  form.set("studentId", student.id);
  form.set("type", "photo");
  form.set("date", "2026-10-25");
  form.set("consent", "true");
  form.set(
    "file",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "test.png",
  );
  const upload = await fetch(base + "/api/files", {
    method: "POST",
    headers: { Cookie: a, Origin: base },
    body: form,
  });
  assert.equal(upload.status, 200, await upload.text());
  const files = await request(
    `/api/files?studentId=${student.id}`,
    undefined,
    a,
  );
  assert.equal(files.data.files.length, 1);
  const fileId = files.data.files[0].id;
  assert.equal(
    (await fetch(base + `/api/files/${fileId}`, { headers: { Cookie: b } }))
      .status,
    404,
  );
  assert.equal(
    (await fetch(base + `/api/files/${fileId}`, { headers: { Cookie: a } }))
      .status,
    200,
  );
  console.log("PASS authorized photo upload and private download isolation");
  console.log("Integration checks completed.");
} finally {
  await db.user.deleteMany({ where: { id: { in: users } } });
  await db.$disconnect();
}
