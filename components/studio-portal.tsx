"use client";
import { appFetch } from "@/lib/app-fetch";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Check,
  CheckCheck,
  ClipboardCheck,
  Copy,
  Dumbbell,
  Eye,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "./ui/button";
import { useStandaloneMode } from "./runtime-provider";
import { Dialog } from "./ui/dialog";
import { Entry, dateLabel } from "@/lib/schemas";
import type { Run } from "./athlete/types";
type StudioData = {
  accesses: {
    id: string;
    studentId: string;
    active: boolean;
    user: { email: string; name: string };
  }[];
  invitations: {
    id: string;
    studentId: string;
    email: string;
    expiresAt: string;
  }[];
  sessions: (Run & { access: { studentId: string } })[];
  requests: {
    id: string;
    appointmentId: string;
    date: string;
    time: string;
    reason: string;
    status: string;
    response: string;
    createdAt: string;
    access: { studentId: string };
  }[];
  messages: {
    id: string;
    studentId: string;
    title: string;
    body: string;
    category: string;
    readAt: string | null;
    createdAt: string;
  }[];
  shares: { assessmentId: string; fields: string[] }[];
  completedToday: number;
  completedStudentIds: string[];
  newInformationToday: number;
};
const fields = [
  ["weight", "Peso"],
  ["height", "Altura"],
  ["waist", "Cintura"],
  ["chest", "Tórax"],
  ["hip", "Quadril"],
  ["fat", "Gordura informada"],
  ["nextDate", "Próxima avaliação"],
] as const;
export default function StudioPortal({
  records,
  overview = false,
  onTraining,
}: {
  records: Entry[];
  overview?: boolean;
  onTraining?: (entry?: Entry, studentId?: string) => void;
}) {
  const standalone = useStandaloneMode();
  const [data, setData] = useState<StudioData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("Acessos");
  const students = records.filter((r) => r.kind === "student");
  const [selected, setSelected] = useState("");
  const id = selected || students[0]?.id || "";
  const [inviting, setInviting] = useState<Entry | null>(null);
  const [invitation, setInvitation] = useState<{
    url: string;
    delivery: string;
  } | null>(null);
  const [toast, setToast] = useState("");
  const load = useCallback(async () => {
    try {
      const r = await appFetch("/api/studio", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(() => {
      if (!document.hidden) void load();
    }, 30000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  async function action(body: object) {
    const r = await appFetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);
    await load();
    return d;
  }
  const name = (id: string) =>
    students.find((s) => s.id === id)?.data.name || "Aluno";
  if (overview)
    return (
      <section className="panel studio-overview">
        <div className="panel-heading">
          <div>
            <h3>Atividade dos alunos hoje</h3>
            <p>Studio + Athlete · atualização a cada 30 segundos</p>
          </div>
          <Link className="text-link" href="/portal">
            Portal dos alunos
            <ArrowUpRight size={13} />
          </Link>
        </div>
        {data ? (
          <>
            <div className="portal-overview-metrics">
              <div>
                <CheckCheck size={17} />
                <b>{data.completedToday}</b>
                <span>Treinaram no portal</span>
              </div>
              <div>
                <Dumbbell size={17} />
                <b>
                  {
                    data.accesses.filter(
                      (a) =>
                        a.active &&
                        records.some(
                          (r) =>
                            r.kind === "training" &&
                            r.data.studentId === a.studentId,
                        ) &&
                        !data.completedStudentIds.includes(a.studentId),
                    ).length
                  }
                </b>
                <span>Com ficha, sem treino hoje</span>
              </div>
              <div>
                <MessageSquare size={17} />
                <b>{data.newInformationToday}</b>
                <span>Enviaram informações</span>
              </div>
              <div>
                <CalendarIcon />
                <b>
                  {data.requests.filter((r) => r.status === "PENDING").length}
                </b>
                <span>Solicitações pendentes</span>
              </div>
            </div>
            <div className="portal-live-feed">
              {data.sessions.slice(0, 3).map((s) => (
                <div key={s.id}>
                  <Activity size={14} />
                  <b>{name(s.access.studentId)}</b>
                  <span>
                    {s.status === "COMPLETED"
                      ? "concluiu"
                      : s.status === "PAUSED"
                        ? "pausou"
                        : "iniciou"}{" "}
                    · {s.snapshot.name}
                  </span>
                  <small>
                    {new Date(s.updatedAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </div>
              ))}
              {!data.sessions.length && (
                <p className="padded muted">
                  Os treinos registrados pelos alunos aparecerão aqui.
                </p>
              )}
            </div>
          </>
        ) : (
          <p className="padded muted">{error || "Carregando atividade…"}</p>
        )}
      </section>
    );
  return (
    <>
      <div className="portal-intro">
        <div className="portal-symbol">
          <Users size={26} />
        </div>
        <div>
          <span className="eyebrow">MD NATION / STUDIO + ATHLETE</span>
          <h2>Seu acompanhamento não termina na academia.</h2>
          <p>
            Convide, oriente e acompanhe seus alunos em um espaço conectado ao
            seu.
          </p>
        </div>
        <span className="portal-sync">
          <i className="live-dot" />
          Sincronização a cada 30s
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <Button size="sm" onClick={() => void load()}>
            Tentar novamente
          </Button>
        </div>
      )}
      <div className="tabs">
        {[
          "Acessos",
          "Fichas e avaliações",
          "Mensagens",
          "Solicitações",
          "Feedback",
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Solicitações" &&
              !!data?.requests.filter((r) => r.status === "PENDING").length && (
                <span className="tab-count">
                  {data.requests.filter((r) => r.status === "PENDING").length}
                </span>
              )}
          </button>
        ))}
      </div>
      {!data ? (
        <div className="skeleton" />
      ) : (
        <>
          {tab === "Acessos" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Acesso individual ao Athlete</h3>
                  <p>
                    Desativar o acesso bloqueia inclusive sessões já abertas.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => void load()}>
                  <RefreshCw size={13} />
                  Atualizar
                </Button>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>E-mail do portal</th>
                      <th>Acesso</th>
                      <th>Último treino no portal</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const access = data.accesses.find(
                        (a) => a.studentId === s.id,
                      );
                      const invite = data.invitations.find(
                        (i) => i.studentId === s.id,
                      );
                      const last = data.sessions.find(
                        (r) =>
                          r.access.studentId === s.id &&
                          r.status === "COMPLETED",
                      );
                      return (
                        <tr key={s.id}>
                          <td>
                            <Link href={`/alunos/${s.id}`}>{s.data.name}</Link>
                          </td>
                          <td>
                            {access?.user.email ||
                              invite?.email ||
                              s.data.email ||
                              "Não definido"}
                          </td>
                          <td>
                            <span
                              className={`badge ${access?.active ? "green" : "gray"}`}
                            >
                              {access
                                ? access.active
                                  ? "Ativo"
                                  : "Desativado"
                                : invite
                                  ? "Convite pendente"
                                  : "Não convidado"}
                            </span>
                          </td>
                          <td>
                            {last
                              ? dateLabel(last.completedAt!)
                              : "Sem registro"}
                          </td>
                          <td>
                            {access ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void action({
                                    action: "access",
                                    accessId: access.id,
                                    active: !access.active,
                                  })
                                    .then(() =>
                                      setToast(
                                        access.active
                                          ? "Acesso desativado."
                                          : "Acesso ativado.",
                                      ),
                                    )
                                    .catch((e) => setToast(e.message))
                                }
                              >
                                {access.active ? "Desativar" : "Ativar"} acesso
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                  standalone || s.data.status !== "Ativo"
                                }
                                title={
                                  standalone
                                    ? "Convites reais estão pausados neste modo"
                                    : undefined
                                }
                                onClick={() => {
                                  setInvitation(null);
                                  setInviting(s);
                                }}
                              >
                                <Mail size={14} />
                                {invite
                                  ? "Renovar convite"
                                  : "Convidar por e-mail"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!students.length && (
                  <p className="padded muted">
                    Cadastre um aluno para criar seu primeiro convite.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === "Fichas e avaliações" && (
            <>
              <div className="table-toolbar standalone">
                <label>
                  Aluno
                  <select
                    value={id}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.data.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button
                  size="sm"
                  disabled={!id}
                  onClick={() => onTraining?.(undefined, id)}
                >
                  <Plus size={14} />
                  Atribuir ficha
                </Button>
                <p className="muted">
                  As fichas atribuídas aparecem automaticamente no Athlete.
                </p>
              </div>
              <div className="two-columns">
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Fichas disponíveis ao aluno</h3>
                      <p>
                        Uma nova execução usa a versão atual. O histórico mantém
                        a anterior.
                      </p>
                    </div>
                  </div>
                  {records
                    .filter(
                      (r) => r.kind === "training" && r.data.studentId === id,
                    )
                    .map((r) => (
                      <div className="portal-training-row" key={r.id}>
                        <Dumbbell size={19} />
                        <div>
                          <b>{r.data.name}</b>
                          <small>
                            {r.data.division} · {r.data.exercises.length}{" "}
                            exercícios
                          </small>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onTraining?.(r)}
                        >
                          Editar
                        </Button>
                      </div>
                    ))}
                  {!records.some(
                    (r) => r.kind === "training" && r.data.studentId === id,
                  ) && (
                    <p className="padded muted">
                      Nenhuma ficha atribuída a este aluno.
                    </p>
                  )}
                </section>
                <section className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Publicar avaliações</h3>
                      <p>
                        Selecione os campos compartilhados. Observações privadas
                        nunca são publicadas.
                      </p>
                    </div>
                  </div>
                  {records
                    .filter(
                      (r) => r.kind === "assessment" && r.data.studentId === id,
                    )
                    .slice()
                    .reverse()
                    .map((a) => (
                      <PublishAssessment
                        key={
                          a.id +
                          data.shares
                            .find((s) => s.assessmentId === a.id)
                            ?.fields.join()
                        }
                        assessment={a}
                        fields={
                          data.shares.find((s) => s.assessmentId === a.id)
                            ?.fields || []
                        }
                        onSave={async (selected) => {
                          await action({
                            action: "publish",
                            assessmentId: a.id,
                            fields: selected,
                          });
                          setToast("Compartilhamento atualizado.");
                        }}
                      />
                    ))}
                  {!records.some(
                    (r) => r.kind === "assessment" && r.data.studentId === id,
                  ) && (
                    <p className="padded muted">
                      Registre uma avaliação antes de publicar.
                    </p>
                  )}
                </section>
              </div>
            </>
          )}
          {tab === "Mensagens" && (
            <div className="two-columns">
              <section className="panel">
                <div className="panel-heading">
                  <div>
                    <h3>Orientar é estar presente</h3>
                    <p>
                      Publicação no portal. Não envia WhatsApp ou e-mail
                      automaticamente.
                    </p>
                  </div>
                </div>
                <form
                  className="record-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const f = new FormData(form);
                    try {
                      await action({
                        action: "message",
                        studentId: String(f.get("studentId")),
                        category: String(f.get("category")),
                        title: String(f.get("title")),
                        body: String(f.get("body")),
                      });
                      form.reset();
                      setToast("Conteúdo publicado no portal do aluno.");
                    } catch (e) {
                      setToast((e as Error).message);
                    }
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Aluno
                      <select name="studentId" required>
                        {students.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.data.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tipo
                      <select name="category">
                        <option value="GUIDANCE">Orientação</option>
                        <option value="NOTICE">Aviso</option>
                        <option value="REMINDER">Lembrete</option>
                      </select>
                    </label>
                    <label className="full">
                      Título
                      <input name="title" maxLength={100} required />
                    </label>
                    <label className="full">
                      Conteúdo
                      <textarea
                        name="body"
                        maxLength={3000}
                        required
                        rows={5}
                      />
                    </label>
                  </div>
                  <div className="form-actions">
                    <Button type="submit" disabled={!students.length}>
                      <Send size={15} />
                      Publicar no Athlete
                    </Button>
                  </div>
                </form>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h3>Publicações recentes</h3>
                </div>
                {data.messages.map((m) => (
                  <article className="portal-message" key={m.id}>
                    <div>
                      <b>{name(m.studentId)}</b>
                      <span className={`badge ${m.readAt ? "green" : "gray"}`}>
                        {m.readAt ? "Lido" : "Não lido"}
                      </span>
                    </div>
                    <h3>{m.title}</h3>
                    <p>{m.body}</p>
                    <small>{dateLabel(m.createdAt)}</small>
                  </article>
                ))}
                {!data.messages.length && (
                  <p className="padded muted">
                    Publique sua primeira orientação.
                  </p>
                )}
              </section>
            </div>
          )}
          {tab === "Solicitações" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>Reagendamentos sob seu controle</h3>
                  <p>
                    A agenda só é alterada após aprovação, com verificação de
                    conflitos.
                  </p>
                </div>
              </div>
              {data.requests.map((r) => (
                <RequestDecision
                  key={r.id}
                  request={r}
                  name={name(r.access.studentId)}
                  onDecide={async (approve, response) => {
                    await action({
                      action: "decide",
                      requestId: r.id,
                      approve,
                      response,
                    });
                    setToast(
                      approve
                        ? "Reagendamento aprovado."
                        : "Solicitação recusada.",
                    );
                  }}
                />
              ))}
              {!data.requests.length && (
                <p className="padded muted">
                  Nenhuma solicitação de reagendamento.
                </p>
              )}
            </section>
          )}
          {tab === "Feedback" && (
            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h3>O esforço, pela perspectiva de quem treina</h3>
                  <p>Histórico real de execução e feedback do aluno.</p>
                </div>
              </div>
              {data.sessions.map((s) => (
                <details className="portal-feedback" key={s.id}>
                  <summary>
                    <div>
                      <b>{name(s.access.studentId)}</b>
                      <small>
                        {s.snapshot.name} · {dateLabel(s.startedAt)}
                      </small>
                    </div>
                    <span className="badge gray">
                      {s.status === "COMPLETED"
                        ? "Concluído"
                        : s.status === "PAUSED"
                          ? "Pausado"
                          : "Em andamento"}
                    </span>
                    <ArrowUpRight size={15} />
                  </summary>
                  <div className="portal-feedback-body">
                    <div className="portal-feedback-stats">
                      <span>
                        {s.state.sets.filter((set) => set.done).length} séries
                        concluídas
                      </span>
                      <span>{Math.floor(s.activeSeconds / 60)} min ativos</span>
                      <span>
                        Esforço{" "}
                        {s.difficulty ? `${s.difficulty}/10` : "não informado"}
                      </span>
                    </div>
                    <p>
                      {s.feedback || "O aluno ainda não enviou um comentário."}
                    </p>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Exercício</th>
                            <th>Série</th>
                            <th>Carga usada</th>
                            <th>Repetições</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.state.sets.map((set, i) => (
                            <tr key={i}>
                              <td>
                                {s.snapshot.exercises[set.exerciseIndex]?.name}
                              </td>
                              <td>{set.setIndex + 1}</td>
                              <td>{set.load} kg</td>
                              <td>{set.reps}</td>
                              <td>
                                {set.done ? "Concluída" : "Não concluída"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </details>
              ))}
              {!data.sessions.length && (
                <p className="padded muted">
                  Os registros de execução dos alunos aparecerão aqui.
                </p>
              )}
            </section>
          )}
        </>
      )}
      <Dialog
        open={!!inviting}
        onOpenChange={(v) => {
          if (!v) setInviting(null);
        }}
        title="Convidar para o Athlete"
        description="Convite individual, válido por 72 horas. O aluno define a própria senha."
      >
        {inviting && (
          <form
            className="record-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const result = await action({
                  action: "invite",
                  studentId: inviting.id,
                  email: String(f.get("email")),
                });
                setInvitation({
                  url: new URL(result.path, window.location.origin).href,
                  delivery: result.delivery,
                });
              } catch (e) {
                setToast((e as Error).message);
              }
            }}
          >
            <p className="muted">{inviting.data.name}</p>
            <label>
              E-mail do aluno
              <input
                type="email"
                name="email"
                defaultValue={inviting.data.email}
                required
              />
            </label>
            {!invitation ? (
              <div className="form-actions">
                <Button type="submit">
                  <Mail size={15} />
                  Gerar convite
                </Button>
              </div>
            ) : (
              <div className="invitation-result">
                <ShieldCheck size={22} />
                <h3>Convite criado</h3>
                <p>
                  {invitation.delivery === "provider_accepted"
                    ? "O provedor de e-mail aceitou o envio do convite. Isso não confirma a entrega."
                    : invitation.delivery === "failed"
                      ? "O envio por e-mail falhou. Você pode compartilhar o link abaixo."
                      : "Envio por e-mail não configurado. Compartilhe este link diretamente com o aluno."}
                </p>
                <input
                  aria-label="Link do convite"
                  value={invitation.url}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(invitation.url)
                      .then(() => setToast("Link copiado."))
                      .catch(() =>
                        setToast("Selecione e copie o link manualmente."),
                      )
                  }
                >
                  <Copy size={15} />
                  Copiar convite
                </Button>
              </div>
            )}
          </form>
        )}
      </Dialog>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button aria-label="Fechar aviso" onClick={() => setToast("")}>
            <X size={14} />
          </button>
        </div>
      )}
    </>
  );
}
function CalendarIcon() {
  return <ClipboardCheck size={17} />;
}
function PublishAssessment({
  assessment,
  fields: selected,
  onSave,
}: {
  assessment: Entry;
  fields: string[];
  onSave: (fields: string[]) => Promise<void>;
}) {
  const [selectedFields, setSelectedFields] = useState(selected);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="publish-assessment"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave(selectedFields);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Avaliação de {dateLabel(assessment.data.date)}</h3>
      <div>
        {fields.map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={selectedFields.includes(key)}
              onChange={(e) =>
                setSelectedFields((old) =>
                  e.target.checked
                    ? [...old, key]
                    : old.filter((k) => k !== key),
                )
              }
            />
            {label}
          </label>
        ))}
      </div>
      <Button variant="outline" size="sm" disabled={busy} type="submit">
        <Eye size={14} />
        Salvar campos compartilhados
      </Button>
      {!selectedFields.length && (
        <small>Nenhum campo selecionado: avaliação oculta para o aluno.</small>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
function RequestDecision({
  request: r,
  name,
  onDecide,
}: {
  request: StudioData["requests"][number];
  name: string;
  onDecide: (approve: boolean, response: string) => Promise<void>;
}) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="request-decision">
      <div>
        <b>{name}</b>
        <span className="badge gray">
          {r.status === "PENDING"
            ? "Pendente"
            : r.status === "APPROVED"
              ? "Aprovado"
              : "Recusado"}
        </span>
      </div>
      <h3>
        {dateLabel(r.date)} às {r.time}
      </h3>
      <p>{r.reason}</p>
      {r.status === "PENDING" ? (
        <>
          <label>
            Resposta ao aluno
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              maxLength={1000}
            />
          </label>
          <div className="row-actions">
            <Button
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onDecide(true, response);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={14} />
              Aprovar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await onDecide(false, response);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <X size={14} />
              Recusar
            </Button>
          </div>
        </>
      ) : (
        <p>{r.response}</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
