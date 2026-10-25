"use client";
import { appFetch } from "@/lib/app-fetch";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  Home,
  LogOut,
  MessageSquare,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  UserRound,
  WifiOff,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { GrowthChart } from "@/components/charts";
import { brand } from "@/lib/brand";
import {
  StandaloneNotice,
  useStandaloneMode,
} from "@/components/runtime-provider";
import { today } from "@/lib/metrics";
import { dateLabel } from "@/lib/schemas";
import WorkoutRunner from "./workout-runner";
import type { AthleteData, AthleteRecord, Run } from "./types";
const tabs = [
  ["inicio", "Início", Home],
  ["treinos", "Treinos", Dumbbell],
  ["evolucao", "Evolução", ChartNoAxesCombined],
  ["agenda", "Agenda", CalendarDays],
  ["perfil", "Perfil", UserRound],
] as const;
const statusLabel: Record<string, string> = {
  PENDING: "Aguardando personal",
  APPROVED: "Aprovado",
  DECLINED: "Não aprovado",
};
const fieldLabels: Record<string, string> = {
  weight: "Peso",
  waist: "Cintura",
  chest: "Tórax",
  hip: "Quadril",
  fat: "Gordura informada",
};
function Heading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="athlete-section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </div>
  );
}
function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="athlete-empty">
      <Activity size={25} />
      <h3>{title}</h3>
      <p>{body}</p>
    </div>
  );
}
export default function Athlete({ page }: { page: string }) {
  const standalone = useStandaloneMode();
  const router = useRouter();
  const [data, setData] = useState<AthleteData | null>(null);
  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const [period, setPeriod] = useState(90);
  const [measure, setMeasure] = useState("weight");
  const [loadExercise, setLoadExercise] = useState("");
  const [reschedule, setReschedule] = useState<AthleteRecord | null>(null);
  const [feedbackRun, setFeedbackRun] = useState<Run | null>(null);
  const [notice, setNotice] = useState("");
  const [photoLeft, setPhotoLeft] = useState("");
  const [photoRight, setPhotoRight] = useState("");
  const [photoSlider, setPhotoSlider] = useState(50);
  const [agendaFilter, setAgendaFilter] = useState("Próximas");
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker
        .register("/athlete-sw.js", { scope: "/athlete" })
        .catch(() => {});
    const capture = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);
  const load = useCallback(async () => {
    try {
      const r = await appFetch("/api/athlete", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        if (r.status === 403 || r.status === 401)
          window.location.assign("/login");
        throw new Error(d.error);
      }
      setData(d);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = setInterval(() => {
      if (!document.hidden && navigator.onLine) void load();
    }, 30000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  async function action(body: object) {
    const r = await appFetch("/api/athlete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error);
    return result;
  }
  async function start(id: string) {
    setBusy(true);
    try {
      await action({ action: "start", trainingId: id });
      await load();
      router.push("/athlete/executar");
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const workouts = data?.records.filter((r) => r.kind === "workout") || [];
  const trainings = data?.records.filter((r) => r.kind === "training") || [];
  const sessions = data?.sessions || [];
  const finished = sessions.filter((s) => s.status === "COMPLETED");
  const active = sessions.find((s) => s.status !== "COMPLETED");
  const dates = [...new Set(workouts.map((w) => w.data.date as string))]
    .sort()
    .reverse();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const startDate = weekStart.toISOString().slice(0, 10);
  const weekly = workouts.filter(
    (w) => w.data.date >= startDate && w.data.date <= today(),
  ).length;
  const monthly = workouts.filter((w) =>
    w.data.date.startsWith(today().slice(0, 7)),
  ).length;
  let streak = 0;
  let cursor = new Date(today() + "T12:00:00");
  if (!dates.includes(today())) cursor.setDate(cursor.getDate() - 1);
  while (dates.includes(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  const frequency = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const date = d.toISOString().slice(0, 10);
    return {
      date,
      label: d
        .toLocaleDateString("pt-BR", { weekday: "short" })
        .replace(".", ""),
      count: workouts.filter((w) => w.data.date === date).length,
    };
  });
  const appointments =
    data?.records
      .filter((r) => r.kind === "appointment")
      .sort((a, b) =>
        (a.data.date + a.data.time).localeCompare(b.data.date + b.data.time),
      ) || [];
  const upcoming = appointments.filter(
    (a) =>
      a.data.date >= today() &&
      !["Concluído", "Ausente", "Cancelado"].includes(a.data.status),
  );
  const next = upcoming[0];
  const chosen =
    trainings.find((t) => t.id !== finished[0]?.trainingId) || trainings[0];
  const unread = data?.messages.filter((m) => !m.readAt).length || 0;
  const from = new Date();
  from.setDate(from.getDate() - period);
  const since = from.toISOString().slice(0, 10);
  const assessments =
    data?.records
      .filter((r) => r.kind === "assessment" && r.data.date >= since)
      .sort((a, b) => a.data.date.localeCompare(b.data.date)) || [];
  const exerciseNames = [
    ...new Set(
      finished.flatMap((r) => r.snapshot.exercises.map((e) => e.name)),
    ),
  ];
  const loadName = loadExercise || exerciseNames[0];
  const loadData = finished
    .filter((r) => (r.completedAt || "") >= since)
    .slice()
    .reverse()
    .flatMap((r) => {
      const indices = r.snapshot.exercises.flatMap((e, i) =>
        e.name === loadName ? [i] : [],
      );
      const sets = r.state.sets.filter(
        (s) => s.done && indices.includes(s.exerciseIndex),
      );
      return sets.length
        ? [
            {
              label: dateLabel(r.completedAt!),
              value: Math.max(...sets.map((s) => s.load)),
            },
          ]
        : [];
    });
  const photoA = photoLeft || data?.photos[0]?.id;
  const photoB = photoRight || data?.photos.at(-1)?.id;
  const greeting =
    new Date().getHours() < 12
      ? "Bom dia"
      : new Date().getHours() < 18
        ? "Boa tarde"
        : "Boa noite";
  return (
    <div className="athlete-shell">
      <aside className="athlete-sidebar">
        <Link href="/athlete" className="athlete-wordmark">
          {brand.wordmark}
          <span>ATHLETE</span>
        </Link>
        <p>O SEU PRÓXIMO NÍVEL.</p>
        <nav>
          {tabs.map(([slug, label, Icon]) => (
            <Link
              key={slug}
              href={slug === "inicio" ? "/athlete" : `/athlete/${slug}`}
              className={
                page === slug || (page === "executar" && slug === "treinos")
                  ? "active"
                  : ""
              }
            >
              <Icon size={19} />
              {label}
              <ChevronRight size={14} />
            </Link>
          ))}
        </nav>
        <div className="athlete-sidebar-bottom">
          <ShieldCheck size={20} />
          <span>
            SEU ESPAÇO DE EVOLUÇÃO<small>Acompanhamento individual.</small>
          </span>
        </div>
      </aside>
      <div className="athlete-main">
        <header className="athlete-header">
          <Link href="/athlete" className="athlete-wordmark">
            {brand.wordmark}
            <span>ATHLETE</span>
          </Link>
          <div>
            {data?.user.demo && (
              <span className="athlete-demo-tag">DEMONSTRAÇÃO</span>
            )}
            <Link
              href="/athlete/perfil"
              aria-label="Avisos e orientações"
              className="athlete-bell"
            >
              <Bell size={20} />
              {unread > 0 && <i>{unread}</i>}
            </Link>
            <Link
              href="/athlete/perfil"
              className="athlete-avatar"
              aria-label="Meu perfil"
            >
              {data?.student.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("") || "MD"}
            </Link>
          </div>
        </header>
        <main className="athlete-content">
          <StandaloneNotice />
          {!online && (
            <div className="athlete-offline" role="status">
              <WifiOff size={17} />
              Você está sem conexão. Novos registros precisam de internet;
              alterações não confirmadas ainda não foram sincronizadas.
            </div>
          )}
          {error && (
            <div className="athlete-error" role="alert">
              {error}
              <Button variant="outline" size="sm" onClick={() => void load()}>
                Tentar novamente
              </Button>
            </div>
          )}
          {!data && !error ? (
            <div className="athlete-skeleton">
              <div className="skeleton" />
              <div className="skeleton" />
              <div className="skeleton" />
            </div>
          ) : (
            data && (
              <>
                {page === "inicio" && (
                  <>
                    <Heading
                      eyebrow="SEU MOVIMENTO DE HOJE"
                      title={`${greeting}, ${data.student.name.split(" ")[0]}.`}
                      subtitle="Mais um treino. Mais perto do seu objetivo."
                    />
                    <section className="athlete-hero">
                      <div className="athlete-hero-image" />
                      <div>
                        <span className="eyebrow">
                          <span className="live-dot" /> SUA MELHOR VERSÃO ESTÁ
                          EM CONSTRUÇÃO
                        </span>
                        <h2>
                          UM DIA.
                          <br />
                          UM TREINO.
                          <br />
                          <em>MAIS FORTE.</em>
                        </h2>
                        <p>Seu objetivo: {data.student.goal}</p>
                        <Link
                          href="/athlete/treinos"
                          className="button primary"
                        >
                          Vamos treinar
                          <ArrowUpRight size={18} />
                        </Link>
                      </div>
                      <div className="hero-athlete-index">MD / ATHLETE</div>
                    </section>
                    <div className="athlete-summary-grid">
                      <div>
                        <Dumbbell size={19} />
                        <b>
                          {weekly}
                          <small>treinos</small>
                        </b>
                        <span>Nesta semana</span>
                      </div>
                      <div>
                        <Target size={19} />
                        <b>
                          {monthly}
                          <small>registros</small>
                        </b>
                        <span>Frequência no mês</span>
                      </div>
                      <div>
                        <Flame size={19} />
                        <b>
                          {streak}
                          <small>dias</small>
                        </b>
                        <span>Sequência diária</span>
                      </div>
                    </div>
                    <div className="athlete-two-columns">
                      <section className="athlete-panel today-workout">
                        <div className="athlete-panel-title">
                          <h3>
                            {active
                              ? "Sua sessão continua aqui"
                              : "Seu próximo treino"}
                          </h3>
                          <span className="athlete-chip">
                            {active ? "EM ANDAMENTO" : "PRESCRITO PARA VOCÊ"}
                          </span>
                        </div>
                        {active || chosen ? (
                          <>
                            <div className="today-workout-title">
                              <span className="workout-division">
                                {active?.snapshot.division ||
                                  chosen.data.division}
                              </span>
                              <div>
                                <h2>
                                  {active?.snapshot.name || chosen.data.name}
                                </h2>
                                <p>
                                  {
                                    (
                                      active?.snapshot.exercises ||
                                      chosen.data.exercises
                                    ).length
                                  }{" "}
                                  exercícios ·{" "}
                                  {estimate(
                                    active?.snapshot.exercises ||
                                      chosen.data.exercises,
                                  )}{" "}
                                  min estimados
                                </p>
                              </div>
                            </div>
                            <p className="coach-note">
                              {active?.snapshot.notes ||
                                chosen?.data.notes ||
                                "Siga as orientações do seu personal e registre cada série."}
                            </p>
                            <Button
                              disabled={busy || !online}
                              onClick={() =>
                                active
                                  ? router.push("/athlete/executar")
                                  : void start(chosen.id)
                              }
                            >
                              <Play size={18} />
                              {active ? "Retomar treino" : "Iniciar treino"}
                              <ArrowRight size={17} />
                            </Button>
                          </>
                        ) : (
                          <Empty
                            title="Seu plano está a caminho"
                            body="As fichas atribuídas pelo seu personal aparecerão aqui."
                          />
                        )}
                      </section>
                      <section className="athlete-panel">
                        <div className="athlete-panel-title">
                          <h3>Ritmo da semana</h3>
                          <span className="muted">SEG — DOM</span>
                        </div>
                        <div className="weekly-bars">
                          {frequency.map((d) => (
                            <div
                              key={d.date}
                              className={d.date === today() ? "today" : ""}
                            >
                              <b>{d.count || "—"}</b>
                              <div>
                                <span
                                  style={{
                                    height: d.count
                                      ? `${Math.min(100, 30 + d.count * 25)}%`
                                      : "4px",
                                  }}
                                />
                              </div>
                              <small>{d.label}</small>
                            </div>
                          ))}
                        </div>
                        <div className="athlete-panel-foot">
                          <Flame size={15} />
                          {weekly
                            ? "Consistência se constrói um treino por vez."
                            : "Seu primeiro treino da semana começa com uma decisão."}
                        </div>
                      </section>
                    </div>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Seu próximo encontro</h3>
                        <Link href="/athlete/agenda">
                          Ver agenda
                          <ArrowUpRight size={14} />
                        </Link>
                      </div>
                      {next ? (
                        <div className="athlete-next-session">
                          <div className="athlete-calendar-icon">
                            <b>{Number(next.data.date.slice(-2))}</b>
                            <small>
                              {new Date(
                                next.data.date + "T12:00:00",
                              ).toLocaleDateString("pt-BR", { month: "short" })}
                            </small>
                          </div>
                          <div>
                            <h3>{next.data.type}</h3>
                            <p>
                              {dateLabel(next.data.date)} · {next.data.time} ·{" "}
                              {next.data.duration} min
                            </p>
                            <small>Com {data.trainer.name}</small>
                          </div>
                          <span className="athlete-chip">
                            {next.data.status}
                          </span>
                        </div>
                      ) : (
                        <Empty
                          title="Agenda livre por enquanto"
                          body="Seu personal publicará seus próximos encontros aqui."
                        />
                      )}
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Da sua equipe, para você</h3>
                        <MessageSquare size={18} />
                      </div>
                      {data.messages[0] ? (
                        <div className="athlete-guidance">
                          <b>{data.messages[0].title}</b>
                          <p>{data.messages[0].body}</p>
                          <small>
                            {data.trainer.name} ·{" "}
                            {dateLabel(data.messages[0].createdAt)}
                          </small>
                        </div>
                      ) : (
                        <Empty
                          title="Estamos juntos nessa"
                          body="Orientações compartilhadas pelo personal aparecerão neste espaço."
                        />
                      )}
                    </section>
                  </>
                )}
                {page === "treinos" && (
                  <>
                    <Heading
                      eyebrow="PRESCRIÇÃO COM PROPÓSITO"
                      title="Seus treinos."
                      subtitle="Planejados pelo seu personal. Executados por você."
                    />
                    {active && (
                      <Link href="/athlete/executar" className="athlete-resume">
                        <Play size={21} />
                        <div>
                          <b>Você tem um treino em andamento</b>
                          <small>
                            {active.snapshot.name} · progresso salvo
                          </small>
                        </div>
                        <ArrowRight size={18} />
                      </Link>
                    )}
                    <div className="athlete-training-grid">
                      {trainings.map((t, i) => (
                        <section
                          key={t.id}
                          className="athlete-panel training-tile"
                        >
                          <div className="training-tile-top">
                            <span className="workout-division">
                              {t.data.division}
                            </span>
                            <span className="eyebrow">
                              FICHA {String(i + 1).padStart(2, "0")}
                            </span>
                            <Dumbbell size={23} />
                          </div>
                          <h2>{t.data.name}</h2>
                          <small className="training-updated">
                            {[
                              ...new Set(
                                t.data.exercises
                                  .map(
                                    (e: { muscleGroup?: string }) =>
                                      e.muscleGroup,
                                  )
                                  .filter(Boolean),
                              ),
                            ].join(" · ") || "Grupos musculares não informados"}
                          </small>
                          <p>
                            {t.data.exercises.length} exercícios ·{" "}
                            {estimate(t.data.exercises)} min estimados
                          </p>
                          <details>
                            <summary>
                              Ver prescrição
                              <ChevronRight size={15} />
                            </summary>
                            <div className="athlete-exercise-list">
                              {t.data.exercises.map((ex: any, n: number) => (
                                <div key={n}>
                                  <span>{String(n + 1).padStart(2, "0")}</span>
                                  <div>
                                    <b>{ex.name}</b>
                                    <small>
                                      {ex.sets} × {ex.reps} · {ex.load} kg ·
                                      descanso {ex.rest}s
                                    </small>
                                    {ex.notes && <small>{ex.notes}</small>}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {t.data.notes && (
                              <p className="coach-note">{t.data.notes}</p>
                            )}
                          </details>
                          <Button
                            disabled={busy || !online}
                            onClick={() => void start(t.id)}
                          >
                            <Play size={17} />
                            {active
                              ? "Continuar sessão ativa"
                              : "Iniciar treino"}
                            <ArrowRight size={16} />
                          </Button>
                          <small className="training-updated">
                            Atualizado em {dateLabel(t.updatedAt)} · prescrição
                            somente leitura
                          </small>
                        </section>
                      ))}
                    </div>
                    {!trainings.length && (
                      <Empty
                        title="Seu plano está sendo preparado"
                        body="Converse com seu personal para receber sua primeira ficha."
                      />
                    )}
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Sua história de esforço</h3>
                        <span>
                          {finished.length} sessões concluídas no portal
                        </span>
                      </div>
                      {finished.length ? (
                        finished.map((r) => (
                          <div className="athlete-history-row" key={r.id}>
                            <span className="history-check">
                              <Check size={17} />
                            </span>
                            <div>
                              <b>{r.snapshot.name}</b>
                              <small>
                                {dateLabel(r.completedAt!)} ·{" "}
                                {r.state.sets.filter((s) => s.done).length}{" "}
                                séries · {Math.floor(r.activeSeconds / 60)} min
                              </small>
                            </div>
                            <button
                              className="text-link"
                              onClick={() => setFeedbackRun(r)}
                            >
                              Feedback
                              <MessageSquare size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <Empty
                          title="Toda jornada tem um primeiro treino"
                          body="Suas sessões finalizadas aparecerão aqui, com a prescrição original."
                        />
                      )}
                    </section>
                  </>
                )}
                {page === "executar" &&
                  (active || sessions[0] ? (
                    <WorkoutRunner
                      key={(active || sessions[0]).id}
                      run={active || sessions[0]}
                      onUpdate={load}
                    />
                  ) : (
                    <Empty
                      title="Vamos começar?"
                      body="Escolha uma ficha na aba Treinos para iniciar sua sessão."
                    />
                  ))}
                {page === "evolucao" && (
                  <>
                    <Heading
                      eyebrow="DADOS REAIS. SUA TRAJETÓRIA."
                      title="Minha evolução."
                      subtitle="Cada registro conta uma parte da sua história."
                    />
                    <div className="athlete-periods">
                      {[30, 90, 180, 365].map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriod(p)}
                          className={period === p ? "active" : ""}
                        >
                          {p === 365 ? "1 ano" : `${p} dias`}
                        </button>
                      ))}
                    </div>
                    <div className="athlete-two-columns">
                      <section className="athlete-panel">
                        <div className="athlete-panel-title">
                          <h3>Medidas compartilhadas</h3>
                          <select
                            aria-label="Medida corporal"
                            value={measure}
                            onChange={(e) => setMeasure(e.target.value)}
                          >
                            {Object.entries(fieldLabels).map(([k, v]) => (
                              <option key={k} value={k}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                        {assessments.some(
                          (a) => a.data[measure] !== undefined,
                        ) ? (
                          <GrowthChart
                            data={assessments
                              .filter((a) => a.data[measure] !== undefined)
                              .map((a) => ({
                                label: dateLabel(a.data.date),
                                value: a.data[measure],
                              }))}
                            unit={
                              measure === "weight"
                                ? "kg"
                                : measure === "fat"
                                  ? "%"
                                  : "cm"
                            }
                          />
                        ) : (
                          <Empty
                            title="Essa medida ainda não foi compartilhada"
                            body="Seu personal escolhe quais dados da avaliação ficam disponíveis para você."
                          />
                        )}
                      </section>
                      <section className="athlete-panel">
                        <div className="athlete-panel-title">
                          <h3>Evolução de cargas</h3>
                          {exerciseNames.length > 0 && (
                            <select
                              aria-label="Exercício para comparar cargas"
                              value={loadName}
                              onChange={(e) => setLoadExercise(e.target.value)}
                            >
                              {exerciseNames.map((n) => (
                                <option key={n}>{n}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        {loadData.length ? (
                          <GrowthChart data={loadData} unit="kg" />
                        ) : (
                          <Empty
                            title="Sua força começa a deixar registros"
                            body="Conclua séries com cargas registradas para acompanhar esse histórico."
                          />
                        )}
                        <p className="athlete-chart-note">
                          Maior carga registrada por sessão no exercício
                          selecionado. Carga isolada não representa avaliação de
                          saúde.
                        </p>
                      </section>
                    </div>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Frequência no período</h3>
                        <Activity size={17} />
                      </div>
                      <GrowthChart
                        data={Array.from(
                          {
                            length:
                              period <= 30 ? period : Math.ceil(period / 7),
                          },
                          (_, i) => {
                            const step = period <= 30 ? 1 : 7;
                            const start = new Date(today() + "T12:00:00");
                            start.setDate(
                              start.getDate() - (period - 1) + i * step,
                            );
                            const end = new Date(start);
                            end.setDate(end.getDate() + step);
                            const a = start.toISOString().slice(0, 10),
                              b = end.toISOString().slice(0, 10);
                            return {
                              label: dateLabel(a).slice(0, 5),
                              value: workouts.filter(
                                (w) =>
                                  w.data.date >= a &&
                                  w.data.date < b &&
                                  w.data.date <= today(),
                              ).length,
                            };
                          },
                        )}
                        unit="treinos"
                      />
                      <p className="athlete-chart-note">
                        {period <= 30
                          ? "Registros por dia"
                          : "Registros agrupados por semana"}{" "}
                        · últimos {period} dias.
                      </p>
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Avaliações e marcos</h3>
                        <Target size={18} />
                      </div>
                      {assessments.length ? (
                        assessments.map((a) => (
                          <div className="athlete-assessment-row" key={a.id}>
                            <span className="timeline-dot" />
                            <div>
                              <b>Avaliação · {dateLabel(a.data.date)}</b>
                              <div>
                                {Object.entries(fieldLabels)
                                  .filter(([key]) => a.data[key] !== undefined)
                                  .map(([key, label]) => (
                                    <span key={key}>
                                      {label}:{" "}
                                      <strong>
                                        {a.data[key]}{" "}
                                        {key === "weight"
                                          ? "kg"
                                          : key === "fat"
                                            ? "%"
                                            : "cm"}
                                      </strong>
                                    </span>
                                  ))}
                              </div>
                              {a.data.nextDate && (
                                <small>
                                  Próxima avaliação:{" "}
                                  {dateLabel(a.data.nextDate)}
                                </small>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <Empty
                          title="Seu histórico é construído com cuidado"
                          body="Somente avaliações e campos publicados pelo seu personal aparecem aqui."
                        />
                      )}
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Registros autorizados</h3>
                        <ShieldCheck size={18} />
                      </div>
                      {data.photos.length > 0 ? (
                        <>
                          <div className="photo-selectors">
                            <label>
                              Registro inicial
                              <select
                                value={photoA}
                                onChange={(e) => setPhotoLeft(e.target.value)}
                              >
                                {data.photos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {dateLabel(p.date)}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Comparação
                              <select
                                value={photoB}
                                onChange={(e) => setPhotoRight(e.target.value)}
                              >
                                {data.photos.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {dateLabel(p.date)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <div className="photo-comparison">
                            <img
                              src={`/api/files/${photoB}`}
                              alt="Registro físico autorizado de comparação"
                            />
                            <div
                              className="photo-before"
                              style={{
                                clipPath: `inset(0 ${100 - photoSlider}% 0 0)`,
                              }}
                            >
                              <img
                                src={`/api/files/${photoA}`}
                                alt="Registro físico inicial autorizado"
                              />
                            </div>
                            <div
                              className="photo-divider"
                              style={{ left: `${photoSlider}%` }}
                            />
                          </div>
                          <input
                            className="photo-slider"
                            type="range"
                            min="0"
                            max="100"
                            value={photoSlider}
                            onChange={(e) =>
                              setPhotoSlider(Number(e.target.value))
                            }
                            aria-label="Comparar fotos autorizadas"
                          />
                        </>
                      ) : (
                        <Empty
                          title="Sua privacidade vem primeiro"
                          body="Fotos só aparecem quando fornecidas e autorizadas por você, com registro pelo personal."
                        />
                      )}
                    </section>
                  </>
                )}
                {page === "agenda" && (
                  <>
                    <Heading
                      eyebrow="TEMPO BEM INVESTIDO"
                      title="Minha agenda."
                      subtitle="Seus próximos encontros e compromissos."
                    />
                    <div className="athlete-periods">
                      {["Próximas", "Histórico", "Solicitações"].map((s) => (
                        <button
                          key={s}
                          className={agendaFilter === s ? "active" : ""}
                          onClick={() => setAgendaFilter(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {agendaFilter === "Solicitações" ? (
                      data.requests.length ? (
                        data.requests.map((r) => (
                          <section key={r.id} className="athlete-panel">
                            <div className="athlete-panel-title">
                              <h3>
                                {dateLabel(r.date)} · {r.time}
                              </h3>
                              <span className="athlete-chip">
                                {statusLabel[r.status]}
                              </span>
                            </div>
                            <p className="coach-note">{r.reason}</p>
                            {r.response && (
                              <p className="coach-note">
                                Resposta do personal: {r.response}
                              </p>
                            )}
                            <small className="muted">
                              A sessão só muda após aprovação.
                            </small>
                          </section>
                        ))
                      ) : (
                        <Empty
                          title="Nenhuma solicitação"
                          body="Caso precise, solicite uma nova data em uma sessão agendada."
                        />
                      )
                    ) : (
                      (agendaFilter === "Próximas"
                        ? upcoming
                        : appointments.filter(
                            (a) =>
                              a.data.date < today() ||
                              ["Concluído", "Ausente", "Cancelado"].includes(
                                a.data.status,
                              ),
                          )
                      ).map((a) => (
                        <section key={a.id} className="athlete-panel">
                          <div className="athlete-next-session">
                            <div className="athlete-calendar-icon">
                              <b>{Number(a.data.date.slice(-2))}</b>
                              <small>
                                {new Date(
                                  a.data.date + "T12:00:00",
                                ).toLocaleDateString("pt-BR", {
                                  month: "short",
                                })}
                              </small>
                            </div>
                            <div>
                              <h3>{a.data.type}</h3>
                              <p>
                                {dateLabel(a.data.date)} · {a.data.time} ·{" "}
                                {a.data.duration} min
                              </p>
                              <span className="athlete-chip">
                                {a.data.status}
                              </span>
                            </div>
                          </div>
                          {agendaFilter === "Próximas" && (
                            <div className="athlete-agenda-action">
                              {data.requests.some(
                                (r) =>
                                  r.appointmentId === a.id &&
                                  r.status === "PENDING",
                              ) ? (
                                <p className="muted">
                                  Reagendamento aguardando resposta do personal.
                                </p>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setReschedule(a)}
                                >
                                  Solicitar reagendamento
                                  <ArrowUpRight size={14} />
                                </Button>
                              )}
                            </div>
                          )}
                        </section>
                      ))
                    )}
                    {agendaFilter === "Próximas" && !upcoming.length && (
                      <Empty
                        title="Sem sessões agendadas"
                        body="Seus próximos atendimentos aparecerão aqui."
                      />
                    )}
                    {assessments.filter((a) => a.data.nextDate >= today())
                      .length > 0 && (
                      <section className="athlete-panel">
                        <h3>Próximas avaliações compartilhadas</h3>
                        {assessments
                          .filter((a) => a.data.nextDate >= today())
                          .slice(-1)
                          .map((a) => (
                            <p className="coach-note" key={a.id}>
                              <CalendarDays size={15} />
                              {dateLabel(a.data.nextDate)} · confirme o horário
                              com seu personal.
                            </p>
                          ))}
                      </section>
                    )}
                  </>
                )}
                {page === "perfil" && (
                  <>
                    <Heading eyebrow="VOCÊ NO CENTRO" title="Meu espaço." />
                    <section className="athlete-panel athlete-profile">
                      <div className="athlete-avatar large">
                        {data.student.name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <h2>{data.student.name}</h2>
                      <p>{data.student.goal}</p>
                      <small>{data.user.email}</small>
                      {data.user.demo && (
                        <p className="athlete-demo-note">
                          Conta compartilhada de demonstração. Utilize somente
                          informações fictícias.
                        </p>
                      )}
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Seu personal</h3>
                        <ShieldCheck size={18} />
                      </div>
                      <h2>{data.trainer.name}</h2>
                      <p className="coach-note">{data.trainer.specialty}</p>
                      {data.trainer.phone.replace(/\D/g, "").length >= 10 ? (
                        <a
                          className="button outline"
                          href={`https://wa.me/${data.trainer.phone.replace(/\D/g, "").startsWith("55") ? "" : "55"}${data.trainer.phone.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Gostaria de conversar sobre meu acompanhamento.")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Conversar no WhatsApp
                          <ArrowUpRight size={16} />
                        </a>
                      ) : (
                        <p className="muted">
                          Seu personal ainda não compartilhou um WhatsApp.
                        </p>
                      )}
                      <small className="athlete-chart-note">
                        O WhatsApp será aberto por sua ação. Nenhuma mensagem é
                        enviada automaticamente.
                      </small>
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Orientações e avisos</h3>
                        <span>{unread} não lidos</span>
                      </div>
                      {data.messages.length ? (
                        data.messages.map((m) => (
                          <article
                            className={`athlete-message ${!m.readAt ? "unread" : ""}`}
                            key={m.id}
                          >
                            <div>
                              <span className="eyebrow">
                                {m.category === "GUIDANCE"
                                  ? "ORIENTAÇÃO"
                                  : m.category === "REMINDER"
                                    ? "LEMBRETE"
                                    : "AVISO"}
                              </span>
                              <small>{dateLabel(m.createdAt)}</small>
                            </div>
                            <h3>{m.title}</h3>
                            <p>{m.body}</p>
                            {!m.readAt && (
                              <button
                                className="text-link"
                                onClick={() =>
                                  void action({
                                    action: "read",
                                    messageId: m.id,
                                  })
                                    .then(load)
                                    .catch((e) => setNotice(e.message))
                                }
                              >
                                <Check size={14} />
                                Marcar como lido
                              </button>
                            )}
                          </article>
                        ))
                      ) : (
                        <Empty
                          title="Sem avisos por enquanto"
                          body="Acompanhe aqui as mensagens do seu personal."
                        />
                      )}
                    </section>
                    <section className="athlete-panel">
                      <div className="athlete-panel-title">
                        <h3>Seu treino, à mão</h3>
                        <Dumbbell size={18} />
                      </div>
                      <p className="coach-note">
                        {standalone
                          ? "Adicione o Athlete à tela inicial pelo menu do navegador. Abrir novas telas ainda pode exigir internet; não há suporte offline completo."
                          : "Adicione o Athlete à tela inicial pelo menu do navegador. O acesso aos registros continua exigindo internet."}
                      </p>
                      {installPrompt && (
                        <Button
                          variant="outline"
                          onClick={async () => {
                            await installPrompt.prompt();
                            await installPrompt.userChoice;
                            setInstallPrompt(null);
                          }}
                        >
                          Adicionar à tela inicial
                        </Button>
                      )}
                    </section>
                    <section className="athlete-panel athlete-privacy">
                      <ShieldCheck size={19} />
                      <p>
                        {standalone
                          ? "Modo temporário: somente dados fictícios armazenados neste navegador. Sem contas reais ou sincronização entre dispositivos."
                          : "Este espaço mostra somente seus treinos, agenda e dados compartilhados. Não há suporte offline completo; registros exigem conexão e confirmação do servidor."}
                      </p>
                    </section>
                    {data.user.demo && (
                      <Button
                        variant="outline"
                        onClick={async () => {
                          const r = await appFetch("/api/auth", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              demo: true,
                              demoRole: "trainer",
                            }),
                          });
                          if (r.ok) window.location.assign("/");
                          else setNotice("Demonstração indisponível.");
                        }}
                      >
                        Visualizar como personal
                        <ArrowUpRight size={16} />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={async () => {
                        await appFetch("/api/auth", { method: "DELETE" });
                        window.location.assign(standalone ? "/" : "/login");
                      }}
                    >
                      <LogOut size={16} />
                      {standalone ? "Voltar ao Studio" : "Sair da conta"}
                    </Button>
                  </>
                )}
              </>
            )
          )}
          <footer className="athlete-footer">
            {brand.name} <span>ATHLETE / SUA EVOLUÇÃO, TODOS OS DIAS.</span>
          </footer>
        </main>
      </div>
      <nav className="athlete-bottom-nav" aria-label="Navegação do aluno">
        {tabs.map(([slug, label, Icon]) => (
          <Link
            href={slug === "inicio" ? "/athlete" : `/athlete/${slug}`}
            key={slug}
            className={
              page === slug || (page === "executar" && slug === "treinos")
                ? "active"
                : ""
            }
          >
            <Icon size={21} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <Dialog
        open={!!reschedule}
        onOpenChange={(v) => {
          if (!v) setReschedule(null);
        }}
        title="Solicitar reagendamento"
        description="Seu personal precisará aprovar a nova data. A sessão atual permanece confirmada até a resposta."
      >
        {reschedule && (
          <RequestForm
            onSubmit={async (values) => {
              await action({
                action: "reschedule",
                appointmentId: reschedule.id,
                ...values,
              });
              setReschedule(null);
              await load();
              setNotice(
                "Solicitação enviada ao personal. Aguarde a aprovação.",
              );
            }}
          />
        )}
      </Dialog>
      <Dialog
        open={!!feedbackRun}
        onOpenChange={(v) => {
          if (!v) setFeedbackRun(null);
        }}
        title="Seu feedback conta"
        description="Conte ao personal como foi sua sessão."
      >
        {feedbackRun && (
          <FeedbackForm
            run={feedbackRun}
            onSubmit={async (values) => {
              await action({
                action: "feedback",
                sessionId: feedbackRun.id,
                ...values,
              });
              setFeedbackRun(null);
              await load();
              setNotice("Feedback compartilhado com o personal.");
            }}
          />
        )}
      </Dialog>
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button onClick={() => setNotice("")} aria-label="Fechar aviso">
            ×
          </button>
        </div>
      )}
    </div>
  );
}
function estimate(exercises: { sets: number; rest: number }[]) {
  return Math.max(
    1,
    Math.round(exercises.reduce((s, e) => s + e.sets * (45 + e.rest), 0) / 60),
  );
}
function RequestForm({
  onSubmit,
}: {
  onSubmit: (values: {
    date: string;
    time: string;
    reason: string;
  }) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          await onSubmit({
            date: String(f.get("date")),
            time: String(f.get("time")),
            reason: String(f.get("reason")),
          });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-grid">
        <label>
          Nova data
          <input type="date" name="date" min={today()} required />
        </label>
        <label>
          Novo horário
          <input type="time" name="time" required />
        </label>
        <label className="full">
          Motivo
          <textarea name="reason" required minLength={3} maxLength={1000} />
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button disabled={busy} type="submit">
          Solicitar alteração
          <ArrowRight size={15} />
        </Button>
      </div>
    </form>
  );
}
function FeedbackForm({
  run,
  onSubmit,
}: {
  run: Run;
  onSubmit: (values: { feedback: string; difficulty: number }) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState(run.feedback);
  const [difficulty, setDifficulty] = useState(run.difficulty || 5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className="record-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit({ feedback, difficulty });
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Esforço percebido · {difficulty}/10
        <input
          type="range"
          min="1"
          max="10"
          value={difficulty}
          onChange={(e) => setDifficulty(Number(e.target.value))}
        />
      </label>
      <label>
        Seu feedback
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          minLength={1}
          maxLength={2000}
          required
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit" disabled={busy}>
          Enviar feedback
        </Button>
      </div>
    </form>
  );
}
