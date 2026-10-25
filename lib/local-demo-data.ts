import type { Entry } from "./schemas";
import type { Run } from "@/components/athlete/types";
export type LocalAccess = {
  id: string;
  studentId: string;
  active: boolean;
  user: { email: string; name: string };
};
export type LocalRequest = {
  id: string;
  appointmentId: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  response: string;
  createdAt: string;
  access: { studentId: string };
};
export type LocalMessage = {
  id: string;
  studentId: string;
  title: string;
  body: string;
  category: string;
  readAt: string | null;
  createdAt: string;
};
export type LocalRun = Run & { access: { studentId: string } };
export type LocalStore = {
  version: 1;
  records: Entry[];
  accesses: LocalAccess[];
  sessions: LocalRun[];
  requests: LocalRequest[];
  messages: LocalMessage[];
  shares: { assessmentId: string; fields: string[] }[];
};
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
export function createLocalDemo(now = new Date()): LocalStore {
  const records: Entry[] = [];
  const date = (offset = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const add = (
    kind: Entry["kind"],
    id: string,
    data: Entry["data"],
    createdAt = now.toISOString(),
  ) => {
    records.push({ id, kind, data, createdAt, updatedAt: createdAt });
  };
  const goals = [
    "Hipertrofia",
    "Emagrecimento",
    "Condicionamento",
    "Saúde e qualidade de vida",
    "Performance esportiva",
  ];
  names.forEach((name, i) => {
    const id = `local-student-${i + 1}`;
    add(
      "student",
      id,
      {
        name,
        email: `aluno${i + 1}@mdnation.example`,
        phone: "",
        goal: goals[i % 5],
        plan: i % 3 === 0 ? "Consultoria online" : "Personal presencial",
        status: "Ativo",
        notes: "Cadastro fictício. Demonstração local, sem conexão com banco.",
      },
      new Date(
        now.getFullYear(),
        now.getMonth() - Math.floor((47 - i) / 4),
        Math.min((i % 20) + 1, now.getDate()),
      ).toISOString(),
    );
    add("payment", `local-payment-${i}`, {
      studentId: id,
      service: "Personal presencial",
      amount: i === 47 ? 1980 : 390,
      dueDate: date(-5),
      paidDate: i < 4 ? "" : date(-5),
      status: i < 4 ? "Pendente" : "Recebido",
      method: "Pix",
    });
    if (i < 8)
      add("training", `local-training-${i + 1}`, {
        studentId: id,
        name: i % 2 ? "Força & movimento" : "Hipertrofia · fase 02",
        division: "A / B / C",
        exercises: [
          {
            name: "Agachamento livre",
            muscleGroup: "Pernas",
            sets: 3,
            reps: "10–12",
            load: 40 + i * 2,
            rest: 90,
            tempo: "3–1–2",
            notes: "Mantenha a execução controlada.",
          },
          {
            name: "Leg press 45°",
            muscleGroup: "Pernas",
            sets: 3,
            reps: "12",
            load: 120,
            rest: 60,
            tempo: "2–0–2",
            notes: "",
          },
          {
            name: "Cadeira extensora",
            muscleGroup: "Pernas",
            sets: 3,
            reps: "15",
            load: 35,
            rest: 60,
            tempo: "2–1–2",
            notes: "",
          },
        ],
        notes: "Priorize técnica e amplitude confortável.",
      });
    if (i < 12)
      for (let month = 5; month >= 0; month--)
        add("assessment", `local-assessment-${i}-${month}`, {
          studentId: id,
          date: new Date(
            now.getFullYear(),
            now.getMonth() - month,
            Math.min(5, now.getDate()),
          )
            .toISOString()
            .slice(0, 10),
          weight: Math.round((82 - i * 0.6 + month * 0.5) * 10) / 10,
          height: 175,
          waist: 82 + month * 0.4,
          chest: 100,
          hip: 96,
          fat: 19 + month * 0.4,
          nextDate: date(i < 7 ? -2 : 20),
          notes: "Medidas fictícias para demonstração, sem diagnóstico.",
        });
    if (i < 32)
      add("appointment", `local-appointment-${i}`, {
        studentId: id,
        date: date(Math.floor(i / 8) - 2),
        time: `${String(7 + (i % 8)).padStart(2, "0")}:00`,
        duration: 50,
        type:
          i === 1
            ? "Avaliação física"
            : i % 3 === 0
              ? "Funcional"
              : "Musculação",
        status:
          i < 18
            ? "Concluído"
            : i < 20
              ? "Ausente"
              : i === 21
                ? "Pendente"
                : "Confirmado",
        notes: "",
      });
    if (i < 20)
      for (let d = 1; d <= 12 - (i % 5); d++)
        add("workout", `local-workout-${i}-${d}`, {
          studentId: id,
          date: date(-d * 2),
          trainingId: i < 8 ? `local-training-${i + 1}` : "",
          notes: "Registro fictício local.",
        });
  });
  add("appointment", "local-appointment-rafael-next", {
    studentId: "local-student-1",
    date: date(1),
    time: "16:00",
    duration: 50,
    type: "Musculação",
    status: "Confirmado",
    notes: "",
  });
  for (let month = 5; month > 0; month--) {
    const d = new Date(now.getFullYear(), now.getMonth() - month, 10)
      .toISOString()
      .slice(0, 10);
    add("payment", `local-history-revenue-${month}`, {
      studentId: "local-student-1",
      service: "Personal presencial",
      amount: 10000 + (5 - month) * 1300,
      dueDate: d,
      paidDate: d,
      status: "Recebido",
      method: "Pix",
    });
  }
  [
    "Consultoria online",
    "Personal presencial",
    "Acompanhamento híbrido",
    "Avaliação avulsa",
  ].forEach((name, i) =>
    add("service", `local-service-${i}`, {
      name,
      description: "Acompanhamento individual com planejamento personalizado.",
      price: [290, 450, 390, 150][i],
      frequency: "3x por semana",
      duration: "Mensal",
      status: "Ativo",
    }),
  );
  [
    "Novo aluno cadastrado · Cecília Pires",
    "Avaliação registrada · Ana Costa",
    "Treino concluído · Lucas Almeida",
    "Pagamento recebido · Rafael Martins",
  ].forEach((message, i) =>
    add("activity", `local-activity-${i}`, {
      message,
      studentId: `local-student-${i + 1}`,
    }),
  );
  return {
    version: 1,
    records,
    accesses: [
      {
        id: "local-access-1",
        studentId: "local-student-1",
        active: true,
        user: { email: "aluno@mdnation.example", name: "Rafael Martins" },
      },
    ],
    sessions: [],
    requests: [],
    messages: [
      {
        id: "local-message-1",
        studentId: "local-student-1",
        title: "Seu próximo nível começa aqui",
        body: "Explore os treinos e registre suas séries. Este ambiente usa somente dados fictícios, salvos neste navegador.",
        category: "GUIDANCE",
        createdAt: now.toISOString(),
        readAt: null,
      },
    ],
    shares: records
      .filter(
        (r) =>
          r.kind === "assessment" && r.data.studentId === "local-student-1",
      )
      .map((r) => ({
        assessmentId: r.id,
        fields: ["weight", "waist", "chest", "hip", "fat", "nextDate"],
      })),
  };
}
