import {
  createLocalDemo,
  type LocalStore,
  type LocalRun,
} from "./local-demo-data";
import { schemas, type Entry, type Kind } from "./schemas";
import {
  athleteAction,
  studioAction,
  sharedFields,
  validateSets,
} from "./portal-validation";
import { standaloneUsers } from "./runtime-mode";
import { workoutClock } from "./workout-clock";
import { today } from "./metrics";
import type { Prescription } from "@/components/athlete/types";
const STORAGE_KEY = "md-nation-standalone-v1";
class LocalError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function read(): LocalStore {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (
        data.version === 1 &&
        Array.isArray(data.records) &&
        Array.isArray(data.sessions) &&
        Array.isArray(data.accesses) &&
        Array.isArray(data.shares) &&
        Array.isArray(data.messages) &&
        Array.isArray(data.requests)
      )
        return data;
    } catch {
      throw new LocalError(
        "Não foi possível ler a demonstração local. Restaure a demonstração nas configurações.",
        409,
      );
    }
  }
  const data = createLocalDemo();
  write(data);
  return data;
}
function write(data: LocalStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    throw new LocalError(
      "O navegador não permitiu salvar. Libere espaço ou permita armazenamento local e tente novamente.",
      507,
    );
  }
}
export function resetLocalDemo() {
  write(createLocalDemo());
}
const uid = () => `local-${crypto.randomUUID()}`;
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
function addActivity(store: LocalStore, message: string, studentId: string) {
  const now = new Date().toISOString();
  store.records.push({
    id: uid(),
    kind: "activity",
    data: { message, studentId },
    createdAt: now,
    updatedAt: now,
  });
}
function student(store: LocalStore, id: string) {
  const s = store.records.find((r) => r.kind === "student" && r.id === id);
  if (!s) throw new LocalError("Aluno demonstrativo não encontrado.", 404);
  return s;
}
function conflict(
  store: LocalStore,
  id: string,
  date: string,
  time: string,
  duration: number,
) {
  const mins = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  const start = mins(time);
  if (
    store.records.some(
      (r) =>
        r.kind === "appointment" &&
        r.id !== id &&
        r.data.date === date &&
        !["Cancelado", "Ausente"].includes(r.data.status) &&
        start < mins(r.data.time) + r.data.duration &&
        mins(r.data.time) < start + duration,
    )
  )
    throw new LocalError(
      "Conflito de horário: já existe uma sessão neste intervalo.",
    );
}
function athleteData(store: LocalStore) {
  const id = "local-student-1";
  if (!store.accesses.some((a) => a.studentId === id && a.active))
    throw new LocalError(
      "O acesso demonstrativo foi desativado no Studio. Reative-o em Portal dos Alunos.",
      409,
    );
  const own = store.records.filter((r) => r.data.studentId === id);
  const s = student(store, id);
  const p = store.records.find((r) => r.kind === "profile")?.data;
  const records = own.flatMap((r) => {
    if (r.kind === "training") return [r];
    if (r.kind === "assessment") {
      const share = store.shares.find((a) => a.assessmentId === r.id);
      if (!share) return [];
      return [
        {
          ...r,
          data: Object.fromEntries(
            Object.entries(r.data).filter(
              ([key]) => key === "date" || share.fields.includes(key),
            ),
          ),
        },
      ];
    }
    if (r.kind === "workout")
      return [
        { ...r, data: { date: r.data.date, trainingId: r.data.trainingId } },
      ];
    if (r.kind === "appointment")
      return [
        {
          ...r,
          data: Object.fromEntries(
            ["date", "time", "type", "duration", "status"].map((k) => [
              k,
              r.data[k],
            ]),
          ),
        },
      ];
    return [];
  });
  return {
    user: standaloneUsers.student,
    student: { id, name: s.data.name, goal: s.data.goal },
    trainer: {
      name: p?.name || standaloneUsers.trainer.name,
      specialty: p?.specialty || "Personal trainer",
      phone: "",
    },
    records,
    sessions: store.sessions
      .filter((r) => r.access.studentId === id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    messages: store.messages
      .filter((m) => m.studentId === id)
      .slice()
      .reverse(),
    requests: store.requests
      .filter((r) => r.access.studentId === id)
      .slice()
      .reverse(),
    photos: [],
    serverTime: new Date().toISOString(),
  };
}
function studioData(store: LocalStore) {
  const completedStudentIds = [
    ...new Set(
      store.sessions
        .filter((s) => s.completedAt?.slice(0, 10) === today())
        .map((s) => s.access.studentId),
    ),
  ];
  return {
    ...store,
    invitations: [],
    sessions: store.sessions.slice().reverse(),
    messages: store.messages.slice().reverse(),
    requests: store.requests.slice().reverse(),
    completedToday: completedStudentIds.length,
    completedStudentIds,
    newInformationToday: new Set([
      ...store.sessions
        .filter((s) => s.updatedAt.slice(0, 10) === today())
        .map((s) => s.access.studentId),
      ...store.requests
        .filter((r) => r.createdAt.slice(0, 10) === today())
        .map((r) => r.access.studentId),
    ]).size,
  };
}
export async function localDemoFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  try {
    const path = new URL(input, window.location.origin).pathname;
    if (path.startsWith("/api/invitations") || path.startsWith("/api/files"))
      return response(
        {
          error:
            "Convites reais e arquivos privados estão pausados no modo sem Supabase.",
        },
        503,
      );
    const store = read();
    const isPost = init?.method === "POST";
    if (!isPost) {
      if (path === "/api/data")
        return response({
          user: standaloneUsers.trainer,
          records: store.records,
        });
      if (path === "/api/studio") return response(studioData(store));
      if (path === "/api/athlete") return response(athleteData(store));
      throw new LocalError("Recurso local indisponível.", 404);
    }
    const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
    if (path === "/api/data") {
      const kind = body.kind as Kind;
      if (!Object.hasOwn(schemas, kind)) throw new LocalError("Tipo inválido");
      const parsed = schemas[kind].safeParse(body.data);
      if (!parsed.success)
        throw new LocalError(
          parsed.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        );
      const data = parsed.data as Entry["data"];
      if (data.studentId) student(store, data.studentId);
      if (kind === "payment" && data.status === "Pendente") data.paidDate = "";
      if (
        kind === "appointment" &&
        !["Cancelado", "Ausente"].includes(data.status)
      )
        conflict(store, body.id || "", data.date, data.time, data.duration);
      if (
        data.trainingId &&
        !store.records.some(
          (r) =>
            r.id === data.trainingId &&
            r.kind === "training" &&
            r.data.studentId === data.studentId,
        )
      )
        throw new LocalError("A ficha precisa pertencer ao aluno selecionado.");
      const now = new Date().toISOString();
      let record: Entry;
      if (body.id) {
        const index = store.records.findIndex(
          (r) => r.id === body.id && r.kind === kind,
        );
        if (index < 0) throw new LocalError("Registro não encontrado.", 404);
        const old = store.records[index];
        if (kind === "training")
          store.records.push({
            id: uid(),
            kind: "trainingHistory",
            data: { trainingId: old.id, ...old.data },
            createdAt: now,
            updatedAt: now,
          });
        record = { ...old, data, updatedAt: now };
        store.records[index] = record;
      } else {
        record = { id: uid(), kind, data, createdAt: now, updatedAt: now };
        store.records.push(record);
      }
      addActivity(
        store,
        "Registro atualizado na demonstração local",
        data.studentId || record.id,
      );
      write(store);
      return response({ record });
    }
    if (path === "/api/studio") {
      const b = studioAction.parse(body);
      if (b.action === "invite")
        throw new LocalError(
          "Convites por e-mail estão temporariamente pausados. Explore o Athlete pelo botão “Visualizar como aluno”.",
          503,
        );
      if (b.action === "access") {
        const access = store.accesses.find((a) => a.id === b.accessId);
        if (!access) throw new LocalError("Acesso não encontrado.");
        access.active = b.active;
      } else if (b.action === "publish") {
        const a = store.records.find(
          (r) => r.id === b.assessmentId && r.kind === "assessment",
        );
        if (!a) throw new LocalError("Avaliação não encontrada.");
        store.shares = store.shares.filter((s) => s.assessmentId !== a.id);
        if (b.fields.length)
          store.shares.push({ assessmentId: a.id, fields: b.fields });
      } else if (b.action === "message") {
        student(store, b.studentId);
        store.messages.push({
          id: uid(),
          studentId: b.studentId,
          title: b.title,
          body: b.body,
          category: b.category,
          createdAt: new Date().toISOString(),
          readAt: null,
        });
      } else if (b.action === "decide") {
        const request = store.requests.find(
          (r) => r.id === b.requestId && r.status === "PENDING",
        );
        if (!request) throw new LocalError("Solicitação já respondida.");
        const appointment = store.records.find(
          (r) => r.id === request.appointmentId && r.kind === "appointment",
        );
        if (!appointment) throw new LocalError("Sessão não encontrada.");
        if (b.approve) {
          if (
            request.date < today() ||
            ["Cancelado", "Concluído", "Ausente"].includes(
              appointment.data.status,
            )
          )
            throw new LocalError("Esta sessão não pode mais ser reagendada.");
          conflict(
            store,
            appointment.id,
            request.date,
            request.time,
            appointment.data.duration,
          );
          appointment.data = {
            ...appointment.data,
            date: request.date,
            time: request.time,
            status: "Confirmado",
          };
          appointment.updatedAt = new Date().toISOString();
        }
        request.status = b.approve ? "APPROVED" : "DECLINED";
        request.response = b.response;
        store.messages.push({
          id: uid(),
          studentId: request.access.studentId,
          title: b.approve
            ? "Reagendamento aprovado"
            : "Solicitação não aprovada",
          body: `${request.date} às ${request.time}. ${b.response}`,
          category: "NOTICE",
          createdAt: new Date().toISOString(),
          readAt: null,
        });
      }
      write(store);
      return response({ ok: true });
    }
    if (path === "/api/athlete") {
      const access = store.accesses.find(
        (a) => a.studentId === "local-student-1",
      );
      if (
        !access?.active ||
        student(store, access.studentId).data.status !== "Ativo"
      )
        throw new LocalError(
          "O acesso demonstrativo foi desativado no Studio. Reative-o em Portal dos Alunos.",
          409,
        );
      const b = athleteAction.parse(body);
      const now = new Date().toISOString();
      let result: LocalRun | undefined;
      if (b.action === "start") {
        const training = store.records.find(
          (r) =>
            r.id === b.trainingId &&
            r.kind === "training" &&
            r.data.studentId === access.studentId,
        );
        if (!training) throw new LocalError("Ficha não encontrada.", 404);
        result = store.sessions.find(
          (s) =>
            s.access.studentId === access.studentId && s.status !== "COMPLETED",
        );
        if (!result) {
          const snapshot = JSON.parse(
            JSON.stringify(training.data),
          ) as Prescription;
          result = {
            id: uid(),
            trainingId: training.id,
            snapshot,
            state: {
              exerciseIndex: 0,
              sets: snapshot.exercises.flatMap((e, exerciseIndex) =>
                Array.from({ length: e.sets }, (_, setIndex) => ({
                  exerciseIndex,
                  setIndex,
                  load: e.load,
                  reps: parseInt(e.reps) || 0,
                  done: false,
                })),
              ),
            },
            status: "IN_PROGRESS",
            activeSeconds: 0,
            startedAt: now,
            updatedAt: now,
            completedAt: null,
            feedback: "",
            difficulty: null,
            access: { studentId: access.studentId },
          };
          store.sessions.push(result);
        }
      } else if (b.action === "read") {
        const m = store.messages.find(
          (m) => m.id === b.messageId && m.studentId === access.studentId,
        );
        if (m) m.readAt = now;
      } else if (b.action === "reschedule") {
        const a = store.records.find(
          (r) =>
            r.id === b.appointmentId &&
            r.kind === "appointment" &&
            r.data.studentId === access.studentId,
        );
        if (!a || ["Cancelado", "Concluído", "Ausente"].includes(a.data.status))
          throw new LocalError("Sessão não disponível.");
        if (b.date < today())
          throw new LocalError("Escolha uma data atual ou futura.");
        if (
          store.requests.some(
            (r) => r.appointmentId === a.id && r.status === "PENDING",
          )
        )
          throw new LocalError("Já existe uma solicitação pendente.");
        store.requests.push({
          id: uid(),
          appointmentId: a.id,
          date: b.date,
          time: b.time,
          reason: b.reason,
          status: "PENDING",
          response: "",
          createdAt: now,
          access: { studentId: access.studentId },
        });
      } else {
        result = store.sessions.find(
          (s) =>
            s.id === b.sessionId && s.access.studentId === access.studentId,
        );
        if (!result) throw new LocalError("Sessão não encontrada.", 404);
        if (b.action === "feedback") {
          if (result.status !== "COMPLETED")
            throw new LocalError("Finalize o treino antes de enviar feedback.");
          result.feedback = b.feedback;
          result.difficulty = b.difficulty;
          result.updatedAt = now;
        } else if (result.status !== "COMPLETED") {
          validateSets(b.state, result.snapshot.exercises);
          if (b.action === "finish" && !b.state.sets.some((s) => s.done))
            throw new LocalError("Conclua ao menos uma série.");
          const timing = workoutClock(
            { ...result, updatedAt: new Date(result.updatedAt) },
            Date.parse(now),
          );
          result.state = {
            ...b.state,
            ...{ clockRemainderMs: timing.remainderMs },
          };
          result.activeSeconds = timing.seconds;
          result.updatedAt = now;
          if (b.action === "pause") result.status = "PAUSED";
          if (b.action === "resume") result.status = "IN_PROGRESS";
          if (b.action === "finish") {
            result.status = "COMPLETED";
            result.completedAt = now;
            result.feedback = b.feedback;
            result.difficulty = b.difficulty || null;
            store.records.push({
              id: uid(),
              kind: "workout",
              data: {
                studentId: access.studentId,
                date: today(),
                trainingId: result.trainingId,
                sessionId: result.id,
                notes: "Sessão fictícia concluída localmente.",
              },
              createdAt: now,
              updatedAt: now,
            });
            addActivity(
              store,
              "Aluno concluiu um treino na demonstração local",
              access.studentId,
            );
          }
        } else if (b.action !== "finish")
          throw new LocalError("Treino já finalizado.");
      }
      write(store);
      return response(result ? { session: result } : { ok: true });
    }
    throw new LocalError("Recurso local indisponível.", 404);
  } catch (e) {
    if (e instanceof LocalError)
      return response({ error: e.message }, e.status);
    if (e && typeof e === "object" && "issues" in e)
      return response({ error: "Confira os campos e tente novamente." }, 400);
    return response(
      {
        error:
          "Não foi possível concluir a operação local. Nenhum dado foi enviado ao banco.",
      },
      400,
    );
  }
}
