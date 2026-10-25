import "dotenv/config";
import { ensureDemoAthlete } from "../lib/portal";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";
import { randomBytes } from "node:crypto";
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const names = [
  "Rafael Martins",
  "Ana Costa",
  "Lucas Almeida",
  "Mariana Santos",
  "Pedro Oliveira",
  "Juliana Lima",
  "Gabriel Souza",
  "Camila Ferreira",
  "Bruno Ribeiro",
  "Beatriz Rocha",
  "Felipe Dias",
  "Larissa Mendes",
  "Thiago Alves",
  "Isabela Carvalho",
  "Matheus Gomes",
  "Amanda Barros",
  "Diego Nunes",
  "Letícia Silva",
  "Gustavo Pereira",
  "Fernanda Melo",
  "Henrique Cardoso",
  "Patrícia Azevedo",
  "Rodrigo Freitas",
  "Carolina Teixeira",
  "Eduardo Castro",
  "Natália Moreira",
  "Vinícius Lopes",
  "Renata Monteiro",
  "André Batista",
  "Luiza Machado",
  "Caio Fernandes",
  "Bianca Correia",
  "Leonardo Pinto",
  "Sofia Duarte",
  "Daniel Campos",
  "Alice Reis",
  "Victor Vieira",
  "Helena Ramos",
  "Samuel Araújo",
  "Clara Farias",
  "Arthur Cunha",
  "Manuela Torres",
  "Davi Cavalcanti",
  "Valentina Moraes",
  "Miguel Tavares",
  "Laura Sales",
  "Bernardo Brito",
  "Cecília Pires",
];
const goals = [
  "Hipertrofia",
  "Emagrecimento",
  "Condicionamento",
  "Saúde e qualidade de vida",
  "Performance esportiva",
];
const now = new Date();
const day = (offset = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
async function main() {
  if (process.env.DEMO_MODE !== "true")
    throw new Error(
      "Seed permitido apenas com DEMO_MODE=true. Use banco separado de produção.",
    );
  const existing = await db.user.findUnique({
    where: { email: "demo@pulse.local" },
  });
  if (existing) {
    await ensureDemoAthlete(db);
    console.log(
      "Demonstração já existe; dados preservados. Portal Athlete preparado.",
    );
    return;
  }
  const user = await db.user.create({
    data: {
      email: "demo@pulse.local",
      name: "Alex Morgan",
      demo: true,
      passwordHash: await hash(
        process.env.DEMO_PASSWORD || randomBytes(32).toString("hex"),
        12,
      ),
    },
  });
  const add = (kind: string, data: object, createdAt?: Date) =>
    db.record.create({ data: { trainerId: user.id, kind, data, createdAt } });
  for (const [i, name] of names.entries()) {
    const s = await add(
      "student",
      {
        name,
        email: `aluno${i + 1}@example.com`,
        phone: "",
        goal: goals[i % 5],
        plan: i % 3 === 0 ? "Consultoria online" : "Personal presencial",
        status: "Ativo",
        notes: "Cadastro fictício para demonstração.",
      },
      new Date(
        now.getFullYear(),
        now.getMonth() - Math.floor((47 - i) / 4),
        Math.min((i % 25) + 1, 28),
      ),
    );
    await add("payment", {
      studentId: s.id,
      service: i % 3 === 0 ? "Consultoria online" : "Personal presencial",
      amount: i < 4 ? 450 : i < 47 ? 390 : 180,
      dueDate: day(i < 4 ? -3 : -7),
      paidDate: i < 4 ? "" : day(-7),
      status: i < 4 ? "Pendente" : "Recebido",
      method: "Pix",
    });
    if (i < 12) {
      for (let month = 5; month >= 0; month--)
        await add("assessment", {
          studentId: s.id,
          date: new Date(now.getFullYear(), now.getMonth() - month, 5)
            .toISOString()
            .slice(0, 10),
          weight:
            Math.round((82 - i * 0.6 - month * (i % 2 ? -0.5 : 0.6)) * 10) / 10,
          height: 175,
          waist: 82 - month * 0.5,
          chest: 100,
          hip: 96,
          fat: 19 + month * 0.4,
          nextDate: day(i < 7 ? -2 : 20),
          notes: "Medidas demonstrativas. Sem diagnóstico automático.",
        });
    }
    if (i < 8)
      await add("training", {
        name: i % 2 ? "Força & movimento" : "Hipertrofia · fase 02",
        studentId: s.id,
        division: "A / B / C",
        exercises: [
          {
            name: "Agachamento livre",
            sets: 4,
            reps: "10–12",
            load: 40 + i * 2,
            rest: 90,
            tempo: "3–1–2",
            notes: "",
          },
          {
            name: "Leg press 45°",
            sets: 3,
            reps: "12",
            load: 120,
            rest: 60,
            tempo: "2–0–2",
            notes: "",
          },
          {
            name: "Cadeira extensora",
            sets: 3,
            reps: "15",
            load: 35,
            rest: 60,
            tempo: "2–1–2",
            notes: "",
          },
        ],
        notes: "Priorizar técnica e amplitude controlada.",
      });
    if (i < 32)
      await add("appointment", {
        studentId: s.id,
        date: day(Math.floor(i / 8)),
        time: `${String(7 + (i % 8)).padStart(2, "0")}:00`,
        duration: 50,
        type:
          i === 1
            ? "Avaliação física"
            : i % 3 === 0
              ? "Funcional"
              : "Musculação",
        status: i < 20 ? "Concluído" : i === 21 ? "Pendente" : "Confirmado",
        notes: "",
      });
    if (i < 20)
      for (let d = 1; d <= (i === 3 ? 1 : 12 - (i % 5)); d++)
        await add("workout", {
          studentId: s.id,
          date: day(-d * 2),
          trainingId: "",
          notes: "Check-in demonstrativo",
        });
  }
  for (let month = 5; month > 0; month--)
    for (let j = 0; j < 12; j++) {
      const date = new Date(now.getFullYear(), now.getMonth() - month, 10)
        .toISOString()
        .slice(0, 10);
      await add("payment", {
        studentId: (
          await db.record.findFirstOrThrow({
            where: { trainerId: user.id, kind: "student" },
          })
        ).id,
        service: "Personal presencial",
        amount: 850 + (5 - month) * 90,
        dueDate: date,
        paidDate: j === 11 ? "" : date,
        status: j === 11 ? "Pendente" : "Recebido",
        method: "Pix",
      });
    }
  for (const [i, name] of [
    "Consultoria online",
    "Personal presencial",
    "Acompanhamento híbrido",
    "Avaliação avulsa",
  ].entries())
    await add("service", {
      name,
      description: "Acompanhamento individual com planejamento personalizado.",
      price: [290, 450, 390, 150][i],
      frequency: i === 3 ? "Avulso" : "3x por semana",
      duration: i === 3 ? "60 minutos" : "Mensal",
      status: "Ativo",
    });
  for (const message of [
    "Pagamento recebido · Rafael Martins",
    "Avaliação registrada · Ana Costa",
    "Treino concluído · Lucas Almeida",
    "Novo aluno · Cecília Pires",
  ])
    await add("activity", { message });
  console.log(
    "Demonstração criada: 48 alunos fictícios. Acesse com o botão de demonstração quando DEMO_MODE=true.",
  );
}
main()
  .then(() => ensureDemoAthlete(db))
  .finally(() => db.$disconnect());
